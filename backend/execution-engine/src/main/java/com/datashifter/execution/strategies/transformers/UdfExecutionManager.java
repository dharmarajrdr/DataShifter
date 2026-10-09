package com.datashifter.execution.strategies.transformers;

import com.datashifter.common.enums.ErrorType;
import com.datashifter.common.enums.UdfFailurePolicy;
import com.datashifter.common.events.KafkaTopics;
import com.datashifter.common.events.PipelineEvents.ErrorEvent;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.models.UdfDefinition;
import com.datashifter.common.repositories.UdfDefinitionRepository;
import com.datashifter.execution.contexts.TransformationExecutionContext;
import com.datashifter.execution.contexts.TransformationExecutionContextHolder;
import com.datashifter.execution.exceptions.UdfExecutionException;
import com.datashifter.execution.exceptions.UdfFailChunkException;
import com.datashifter.execution.exceptions.UdfSkipRowException;
import com.datashifter.execution.exceptions.UdfStopPipelineException;
import com.datashifter.execution.exceptions.UdfTimeoutException;
import com.datashifter.udf.sdk.DirectRow;
import com.datashifter.udf.sdk.Row;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.io.File;
import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.LongAdder;

@Service
@Slf4j
public class UdfExecutionManager {

    private final Path storageRoot;
    private final long defaultTimeoutMs;
    private final UdfDefinitionRepository udfDefinitionRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final ObjectMapper objectMapper;

    // Cache: storageKey -> LoadedUdfClass
    private final Map<String, LoadedUdfClass> classCache = new ConcurrentHashMap<>();
    // Cache: udfId -> storageKey
    private final Map<String, String> udfIdToStorageKey = new ConcurrentHashMap<>();
    // Cache: args JSON -> PreparedUdf
    private final Map<String, PreparedUdf> preparedCache = new ConcurrentHashMap<>();

    // Metrics (striped LongAdder to eliminate cross-thread CPU cache contention)
    private final LongAdder totalExecutions = new LongAdder();
    private final LongAdder totalExecutionTimeNanos = new LongAdder();
    private final LongAdder totalFailures = new LongAdder();

    // Zero-allocation row wrapper per worker thread
    private final ThreadLocal<DirectRow> threadRow = ThreadLocal.withInitial(DirectRow::new);

    // High-performance thread watchdog (0 allocations & 0 map operations on hot path)
    public static class WatchdogSlot {
        final Thread thread;
        volatile long startTimeMs = 0L;

        WatchdogSlot(Thread thread) {
            this.thread = thread;
        }
    }

    private final List<WatchdogSlot> registeredSlots = new CopyOnWriteArrayList<>();
    private final ThreadLocal<WatchdogSlot> threadWatchdogSlot = ThreadLocal.withInitial(() -> {
        WatchdogSlot slot = new WatchdogSlot(Thread.currentThread());
        registeredSlots.add(slot);
        return slot;
    });

    private final ScheduledExecutorService watchdog = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "udf-watchdog");
        t.setDaemon(true);
        return t;
    });

    public UdfExecutionManager(
            @Value("${datashifter.udf.storage.root:/var/lib/datashifter/udfs}") String storageRootPath,
            @Value("${datashifter.udf.timeout-ms:5000}") long defaultTimeoutMs,
            UdfDefinitionRepository udfDefinitionRepository,
            KafkaTemplate<String, Object> kafkaTemplate,
            ObjectMapper objectMapper) {
        this.storageRoot = Paths.get(storageRootPath).toAbsolutePath().normalize();
        this.defaultTimeoutMs = defaultTimeoutMs;
        this.udfDefinitionRepository = udfDefinitionRepository;
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;

        // Schedule periodic watchdog to check for infinite loops or stuck executions
        this.watchdog.scheduleWithFixedDelay(this::checkTimeouts, 500, 500, TimeUnit.MILLISECONDS);
    }

    @PreDestroy
    public void shutdown() {
        watchdog.shutdownNow();
    }

    private void checkTimeouts() {
        long now = System.currentTimeMillis();
        for (WatchdogSlot slot : registeredSlots) {
            long start = slot.startTimeMs;
            if (start > 0 && (now - start) > defaultTimeoutMs) {
                log.warn("UDF execution exceeded timeout of {}ms on thread {}. Interrupting.",
                        defaultTimeoutMs, slot.thread.getName());
                slot.thread.interrupt();
            }
        }
    }

    /**
     * Prepares and caches the metadata, classloader, and method for a given UDF argument JSON.
     */
    public PreparedUdf prepare(String args) {
        return preparedCache.computeIfAbsent(args, a -> {
            try {
                UdfConfig config = objectMapper.readValue(a, UdfConfig.class);
                return prepare(config);
            } catch (Exception e) {
                throw new DatashifterException("Failed to prepare UDF from args: " + a, e);
            }
        });
    }

    /**
     * Prepares and caches the metadata, classloader, and method for a given UdfConfig.
     */
    public PreparedUdf prepare(UdfConfig config) {
        String storageKey = resolveStorageKey(config);
        LoadedUdfClass loadedClass = getOrCreateLoadedClass(storageKey, config.getClassName());
        Method method = loadedClass.getMethod(config.getMethodName());
        method.setAccessible(true);
        return new PreparedUdf(config, loadedClass, method);
    }

    /**
     * Fast-path execution for pre-compiled UDF metadata.
     * Zero map allocations, zero map copies, and zero concurrent map synchronization overhead.
     */
    public Object executePrepared(PreparedUdf prepared, Object input, Map<String, Object> sourceRecord, String targetColumn) {
        long startNanos = System.nanoTime();
        totalExecutions.increment();

        DirectRow row = threadRow.get().reset(sourceRecord, targetColumn, input);
        Object instance = prepared.getInstance();
        Method method = prepared.getMethod();

        WatchdogSlot slot = threadWatchdogSlot.get();
        slot.startTimeMs = System.currentTimeMillis();

        Object result;
        Thread currentThread = slot.thread;
        try {
            Object invokedResult = method.invoke(instance, row);
            if (!prepared.isVoidReturn()) {
                result = invokedResult;
            } else if (targetColumn != null && row.has(targetColumn)) {
                result = row.get(targetColumn);
            } else {
                result = input;
            }
        } catch (InvocationTargetException ite) {
            totalFailures.increment();
            long elapsedMs = (System.nanoTime() - startNanos) / 1_000_000;
            Throwable cause = ite.getCause() != null ? ite.getCause() : ite;
            if (cause instanceof InterruptedException || currentThread.isInterrupted()) {
                Thread.interrupted(); // clear interrupted status
                return handleFailure(prepared.getConfig(), new UdfTimeoutException(String.format(
                        "UDF execution timed out after %d ms for method %s.%s",
                        defaultTimeoutMs, prepared.getConfig().getClassName(), prepared.getConfig().getMethodName()), cause),
                        sourceRecord, targetColumn, elapsedMs);
            }
            return handleFailure(prepared.getConfig(), new UdfExecutionException("UDF invocation error: " + cause.getMessage(), cause),
                    sourceRecord, targetColumn, elapsedMs);
        } catch (Exception e) {
            totalFailures.increment();
            long elapsedMs = (System.nanoTime() - startNanos) / 1_000_000;
            if (e instanceof InterruptedException || currentThread.isInterrupted()) {
                Thread.interrupted(); // clear interrupted status
                return handleFailure(prepared.getConfig(), new UdfTimeoutException(String.format(
                        "UDF execution timed out after %d ms for method %s.%s",
                        defaultTimeoutMs, prepared.getConfig().getClassName(), prepared.getConfig().getMethodName()), e),
                        sourceRecord, targetColumn, elapsedMs);
            }
            return handleFailure(prepared.getConfig(), e, sourceRecord, targetColumn, elapsedMs);
        } finally {
            slot.startTimeMs = 0L;
        }

        long elapsedNanos = System.nanoTime() - startNanos;
        totalExecutionTimeNanos.add(elapsedNanos);
        return result;
    }

    /**
     * Executes a UDF for a single record row context in-memory.
     *
     * @param config       parsed UDF configuration
     * @param input        current column input value
     * @param sourceRecord entire source record map
     * @param targetColumn target column name being transformed
     * @return transformed value for target column
     */
    public Object execute(UdfConfig config, Object input, Map<String, Object> sourceRecord, String targetColumn) {
        PreparedUdf prepared = prepare(config);
        return executePrepared(prepared, input, sourceRecord, targetColumn);
    }

    /**
     * Executes UDF for a batch of records.
     */
    public List<Object> executeBatch(UdfConfig config, List<Map<String, Object>> sourceRecords, String targetColumn) {
        PreparedUdf prepared = prepare(config);
        List<Object> results = new ArrayList<>(sourceRecords.size());
        for (Map<String, Object> sourceRecord : sourceRecords) {
            Object inputVal = sourceRecord != null && targetColumn != null ? sourceRecord.get(targetColumn) : null;
            results.add(executePrepared(prepared, inputVal, sourceRecord, targetColumn));
        }
        return results;
    }

    private Object handleFailure(UdfConfig config, Exception error, Map<String, Object> sourceRecord,
                                  String targetColumn, long latencyMs) {
        UdfFailurePolicy policy = config.getFailurePolicy() != null
                ? config.getFailurePolicy()
                : UdfFailurePolicy.SKIP_ROW;

        String errorMessage = String.format("UDF %s.%s failed: %s (Policy: %s, Latency: %dms)",
                config.getClassName(), config.getMethodName(), error.getMessage(), policy, latencyMs);

        log.error("UDF Failure on target {}: {}", targetColumn, errorMessage, error);

        // Publish error event to monitoring / Kafka
        publishErrorEvent(config, errorMessage, sourceRecord, policy == UdfFailurePolicy.STOP_PIPELINE);

        return switch (policy) {
            case DEFAULT_VALUE -> {
                log.info("UDF policy DEFAULT_VALUE applied for target column {}: returning defaultValue='{}'",
                        targetColumn, config.getDefaultValue());
                yield config.getDefaultValue();
            }
            case SKIP_ROW -> throw new UdfSkipRowException(errorMessage, error);
            case FAIL_CHUNK -> throw new UdfFailChunkException(errorMessage, error);
            case STOP_PIPELINE -> throw new UdfStopPipelineException(errorMessage, error);
        };
    }

    private void publishErrorEvent(UdfConfig config, String errorMessage, Map<String, Object> sourceRecord, boolean stopping) {
        TransformationExecutionContext ctx = TransformationExecutionContextHolder.get();
        if (ctx == null) {
            return;
        }

        String sourceRowJson = null;
        if (sourceRecord != null) {
            try {
                sourceRowJson = objectMapper.writeValueAsString(sourceRecord);
            } catch (Exception ignored) {}
        }

        ErrorEvent event = ErrorEvent.builder()
                .pipelineId(ctx.getPipelineId())
                .executionLogId(ctx.getExecutionLogId())
                .errorType(ErrorType.TRANSFORMATION_FAILED)
                .sourceTable(ctx.getSourceTable())
                .targetTable(ctx.getTargetTable())
                .chunkNumber(ctx.getChunkNumber())
                .errorMessage(errorMessage)
                .sourceRowData(sourceRowJson)
                .pipelineStopped(stopping)
                .timestamp(Instant.now())
                .build();

        try {
            kafkaTemplate.send(KafkaTopics.PIPELINE_ERRORS, event);
        } catch (Exception e) {
            log.warn("Failed to publish UDF error event to Kafka: {}", e.getMessage());
        }
    }

    private String resolveStorageKey(UdfConfig config) {
        if (config.getStorageKey() != null && !config.getStorageKey().isBlank()) {
            return config.getStorageKey();
        }

        if (config.getUdfId() != null) {
            String cachedKey = udfIdToStorageKey.get(config.getUdfId());
            if (cachedKey != null) {
                return cachedKey;
            }

            Optional<UdfDefinition> defOpt = udfDefinitionRepository.findById(config.getUdfId());
            if (defOpt.isPresent()) {
                String key = defOpt.get().getStorageKey();
                udfIdToStorageKey.put(config.getUdfId(), key);
                return key;
            }
        }

        throw new DatashifterException("Unable to resolve storage key for UDF: " + config.getUdfName() + " (" + config.getUdfId() + ")");
    }

    private LoadedUdfClass getOrCreateLoadedClass(String storageKey, String className) {
        String cacheKey = storageKey + "::" + className;
        return classCache.computeIfAbsent(cacheKey, k -> {
            Path jarPath = resolveJarPath(storageKey);
            if (!jarPath.toFile().exists()) {
                throw new DatashifterException("UDF JAR file not found at: " + jarPath);
            }

            try {
                URLClassLoader classLoader = new URLClassLoader(
                        new URL[]{jarPath.toUri().toURL()},
                        getClass().getClassLoader()
                );
                Class<?> clazz = classLoader.loadClass(className);
                Constructor<?> constructor = clazz.getDeclaredConstructor();
                constructor.setAccessible(true);
                return new LoadedUdfClass(classLoader, clazz, constructor);
            } catch (Exception e) {
                throw new DatashifterException("Failed to load UDF class " + className + " from " + jarPath + ": " + e.getMessage(), e);
            }
        });
    }

    private Path resolveJarPath(String storageKey) {
        Path resolved = storageRoot.resolve(storageKey).normalize();
        if (resolved.toFile().exists()) {
            return resolved;
        }

        // Fallbacks for local / dev environments
        Path tmpPath = Paths.get(System.getProperty("java.io.tmpdir"), "datashifter", "udfs", storageKey);
        if (tmpPath.toFile().exists()) {
            return tmpPath;
        }

        Path localPath = Paths.get("udf-storage", storageKey);
        if (localPath.toFile().exists()) {
            return localPath;
        }

        return resolved;
    }

    public double getAverageLatencyMicros() {
        long executions = totalExecutions.sum();
        return executions == 0 ? 0.0 : (double) totalExecutionTimeNanos.sum() / executions / 1000.0;
    }

    public long getTotalExecutions() {
        return totalExecutions.sum();
    }

    public long getTotalFailures() {
        return totalFailures.sum();
    }

    /**
     * Holds cached reflection metadata and thread-local instances for a loaded UDF class.
     */
    static class LoadedUdfClass {
        private final ClassLoader classLoader;
        private final Class<?> clazz;
        private final Constructor<?> constructor;
        private final Map<String, Method> methodCache = new ConcurrentHashMap<>();
        private final ThreadLocal<Object> instanceThreadLocal;

        public LoadedUdfClass(ClassLoader classLoader, Class<?> clazz, Constructor<?> constructor) {
            this.classLoader = classLoader;
            this.clazz = clazz;
            this.constructor = constructor;
            this.instanceThreadLocal = ThreadLocal.withInitial(() -> {
                try {
                    return constructor.newInstance();
                } catch (Exception e) {
                    throw new DatashifterException("Failed to instantiate UDF class " + clazz.getName(), e);
                }
            });
        }

        public Object getInstance() {
            return instanceThreadLocal.get();
        }

        public Method getMethod(String methodName) {
            return methodCache.computeIfAbsent(methodName, mName -> {
                for (Method m : clazz.getDeclaredMethods()) {
                    if (m.getName().equals(mName) && m.getParameterCount() == 1
                            && m.getParameterTypes()[0].getName().equals("com.datashifter.udf.sdk.Row")) {
                        m.setAccessible(true);
                        return m;
                    }
                }
                throw new DatashifterException(String.format(
                        "Method '%s(Row)' not found in UDF class '%s'", mName, clazz.getName()));
            });
        }
    }
}
