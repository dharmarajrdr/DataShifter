package com.datashifter.execution.strategies.transformers;

import com.datashifter.common.enums.UdfFailurePolicy;
import com.datashifter.common.repositories.UdfDefinitionRepository;
import com.datashifter.udf.sdk.Row;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;

import java.io.File;
import java.io.FileOutputStream;
import java.lang.reflect.Method;
import java.net.URLClassLoader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import java.util.jar.JarEntry;
import java.util.jar.JarOutputStream;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class UdfExecutionManagerTest {

    @Mock
    private UdfDefinitionRepository udfDefinitionRepository;

    @Mock
    private KafkaTemplate<String, Object> kafkaTemplate;

    private ObjectMapper objectMapper = new ObjectMapper();
    private UdfExecutionManager manager;
    private Path tempDir;

    public static class SampleUdf {
        public void maskEmail(Row row) {
            String email = (String) row.get("email");
            if (email != null && email.contains("@")) {
                String[] parts = email.split("@");
                row.set("email", parts[0].charAt(0) + "***@" + parts[1]);
            }
        }

        public String transformPhone(Row row) {
            String phone = (String) row.get("phone");
            return phone != null ? "+1-" + phone : null;
        }
    }

    @BeforeEach
    void setUp() throws Exception {
        tempDir = Files.createTempDirectory("udf-test");
        manager = new UdfExecutionManager(
                tempDir.toString(),
                3000,
                udfDefinitionRepository,
                kafkaTemplate,
                objectMapper
        );
    }

    @Test
    void testDirectExecutionWithPreparedUdf() throws Exception {
        // Construct a LoadedUdfClass directly for unit test
        Method maskMethod = SampleUdf.class.getMethod("maskEmail", Row.class);
        Method phoneMethod = SampleUdf.class.getMethod("transformPhone", Row.class);

        UdfExecutionManager.LoadedUdfClass loadedClass = new UdfExecutionManager.LoadedUdfClass(
                getClass().getClassLoader(),
                SampleUdf.class,
                SampleUdf.class.getDeclaredConstructor()
        );

        UdfConfig configMask = UdfConfig.builder()
                .className(SampleUdf.class.getName())
                .methodName("maskEmail")
                .failurePolicy(UdfFailurePolicy.SKIP_ROW)
                .build();

        PreparedUdf preparedMask = new PreparedUdf(configMask, loadedClass, maskMethod);

        Map<String, Object> record = new HashMap<>();
        record.put("email", "john.doe@example.com");

        Object result = manager.executePrepared(preparedMask, null, record, "email");

        // The void method updates row in-place and returns updated targetColumn
        assertEquals("j***@example.com", result);
        assertEquals("j***@example.com", record.get("email"));

        // Test non-void method
        UdfConfig configPhone = UdfConfig.builder()
                .className(SampleUdf.class.getName())
                .methodName("transformPhone")
                .failurePolicy(UdfFailurePolicy.DEFAULT_VALUE)
                .defaultValue("UNKNOWN")
                .build();

        PreparedUdf preparedPhone = new PreparedUdf(configPhone, loadedClass, phoneMethod);

        Map<String, Object> record2 = new HashMap<>();
        record2.put("phone", "555-1234");

        Object phoneResult = manager.executePrepared(preparedPhone, null, record2, "phone");
        assertEquals("+1-555-1234", phoneResult);

        // Verify metrics
        assertTrue(manager.getTotalExecutions() >= 2);
        assertEquals(0, manager.getTotalFailures());
        assertTrue(manager.getAverageLatencyMicros() >= 0);
    }
}
