package com.datashifter.udf.validation;

import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.udf.sdk.DataShifterUdf;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.jar.JarEntry;
import java.util.jar.JarOutputStream;

import static org.junit.jupiter.api.Assertions.*;

class UdfFunctionDiscoveryTest {

    private final UdfFunctionDiscovery discovery = new UdfFunctionDiscovery();

    @Test
    void discoversOnlyPublicAnnotatedMethods() throws Exception {
        MockMultipartFile file = jarFor(ValidFixture.class);

        List<UdfFunctionDiscovery.DiscoveredFunction> functions = discovery.discover(file);

        assertEquals(1, functions.size());
        UdfFunctionDiscovery.DiscoveredFunction function = functions.get(0);
        assertEquals("age-eligibility", function.functionName());
        assertEquals("eligible", function.methodName());
        assertEquals(List.of("java.lang.Integer"), function.parameterTypes());
        assertEquals("boolean", function.returnType());
        assertTrue(function.staticMethod());
    }

    @Test
    void rejectsJarWithoutAnnotatedPublicMethods() throws Exception {
        DatashifterException error = assertThrows(DatashifterException.class, () -> discovery.discover(jarFor(InvalidFixture.class)));
        assertEquals("No public methods annotated with @DataShifterUdf were found", error.getMessage());
    }

    private MockMultipartFile jarFor(Class<?> fixture) throws IOException {
           String resourceName = fixture.getName().replace('.', '/') + ".class";
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        try (JarOutputStream jar = new JarOutputStream(output);
               InputStream classBytes = fixture.getClassLoader().getResourceAsStream(resourceName)) {
            assertNotNull(classBytes);
            jar.putNextEntry(new JarEntry(fixture.getName().replace('.', '/') + ".class"));
            classBytes.transferTo(jar);
            jar.closeEntry();
        }
        return new MockMultipartFile("file", "fixture.jar", "application/java-archive", output.toByteArray());
    }

    static class ValidFixture {
        @DataShifterUdf(name = "age-eligibility", description = "Returns whether an age is eligible")
        public static boolean eligible(Integer age) {
            return age != null && age >= 18;
        }

        @DataShifterUdf
        private static String hidden(String value) {
            return value;
        }
    }

    static class InvalidFixture {
        public static String helper(String value) {
            return value;
        }
    }
}