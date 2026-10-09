package com.datashifter.udf.services;

import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.udf.sdk.Row;
import com.datashifter.udf.sdk.SimpleRow;
import com.datashifter.udf.storage.UdfArtifactStorage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.Path;
import java.util.Map;
import java.util.concurrent.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class UdfExecutionService {

    private final UdfArtifactStorage storage;
    private final ExecutorService executor = Executors.newCachedThreadPool();

    public Map<String, Object> testFunction(String storageKey, String className, String methodName, Map<String, Object> inputData) {
        Path jarPath = storage.getFilePath(storageKey);
        
        Row inputRow = new SimpleRow(inputData);

        Future<Map<String, Object>> future = executor.submit(() -> {
            try (URLClassLoader classLoader = new URLClassLoader(new URL[]{jarPath.toUri().toURL()}, getClass().getClassLoader())) {
                Class<?> udfClass = classLoader.loadClass(className);
                Object instance = udfClass.getDeclaredConstructor().newInstance();
                
                // Assuming method signature: void methodName(Row row) or Object methodName(Row row)
                java.lang.reflect.Method method = null;
                for (java.lang.reflect.Method m : udfClass.getDeclaredMethods()) {
                    if (m.getName().equals(methodName) && m.getParameterCount() == 1 && m.getParameterTypes()[0].getName().equals("com.datashifter.udf.sdk.Row")) {
                        method = m;
                        break;
                    }
                }
                
                if (method == null) {
                    throw new DatashifterException("Method not found matching signature: " + methodName + "(Row)");
                }
                
                method.invoke(instance, inputRow);
                
                return inputRow.toMap();
            }
        });

        try {
            return future.get(5, TimeUnit.SECONDS); // 5 seconds timeout
        } catch (TimeoutException e) {
            future.cancel(true);
            throw new DatashifterException("UDF execution timed out");
        } catch (Exception e) {
            log.error("Error executing UDF", e);
            throw new DatashifterException("Error executing UDF: " + (e.getCause() != null ? e.getCause().getMessage() : e.getMessage()), e);
        }
    }
}
