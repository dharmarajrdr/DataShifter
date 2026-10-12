package com.datashifter.udf.validation;

import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.udf.sdk.DataShifterUdf;
import com.datashifter.udf.sdk.Row;
import org.junit.jupiter.api.Test;
import org.objectweb.asm.AnnotationVisitor;
import org.objectweb.asm.ClassWriter;
import org.objectweb.asm.MethodVisitor;
import org.objectweb.asm.Opcodes;
import org.objectweb.asm.Type;
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
    void discoversPublicStaticAnnotatedMethods() throws Exception {
        MockMultipartFile file = jarFor(ValidFixture.class);

        List<UdfFunctionDiscovery.DiscoveredFunction> functions = discovery.discover(file);

        assertEquals(1, functions.size());
        UdfFunctionDiscovery.DiscoveredFunction function = functions.get(0);
        assertEquals("age-eligibility", function.functionName());
        assertEquals("eligible", function.methodName());
        assertEquals(List.of("com.datashifter.udf.sdk.Row"), function.parameterTypes());
        assertEquals("boolean", function.returnType());
        assertTrue(function.staticMethod());
    }

    @Test
    void rejectsJarWithoutAnnotatedPublicStaticMethods() throws Exception {
        DatashifterException error = assertThrows(DatashifterException.class, () -> discovery.discover(jarFor(InvalidFixture.class)));
        assertEquals("No public static methods annotated with @DataShifterUdf were found", error.getMessage());
    }

    @Test
    void rejectsInstanceMethodAnnotatedWithDataShifterUdf() throws Exception {
        ClassWriter cw = new ClassWriter(0);
        cw.visit(Opcodes.V17, Opcodes.ACC_PUBLIC, "com/datashifter/fixtures/InstanceMethodFixture", null, "java/lang/Object", null);
        MethodVisitor mv = cw.visitMethod(
                Opcodes.ACC_PUBLIC, // non-static (instance method)
                "normalizeEmail",
                "(Lcom/datashifter/udf/sdk/Row;)Ljava/lang/String;",
                null,
                null
        );
        AnnotationVisitor av = mv.visitAnnotation(Type.getDescriptor(DataShifterUdf.class), true);
        av.visit("name", "normalize-email");
        av.visitEnd();
        mv.visitInsn(Opcodes.ACONST_NULL);
        mv.visitInsn(Opcodes.ARETURN);
        mv.visitMaxs(1, 2);
        mv.visitEnd();
        cw.visitEnd();

        ByteArrayOutputStream output = new ByteArrayOutputStream();
        try (JarOutputStream jar = new JarOutputStream(output)) {
            jar.putNextEntry(new JarEntry("com/datashifter/fixtures/InstanceMethodFixture.class"));
            jar.write(cw.toByteArray());
            jar.closeEntry();
        }
        MockMultipartFile file = new MockMultipartFile("file", "instance-udf.jar", "application/java-archive", output.toByteArray());

        DatashifterException error = assertThrows(DatashifterException.class, () -> discovery.discover(file));
        assertEquals(
                "Method normalizeEmail in com.datashifter.fixtures.InstanceMethodFixture annotated with @DataShifterUdf must be 'public static'",
                error.getMessage()
        );
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
        public static boolean eligible(Row row) {
            Integer age = row.get("age", Integer.class);
            return age != null && age >= 18;
        }

        public static String unannotatedHelper(Row row) {
            return "helper";
        }
    }

    static class InvalidFixture {
        public static String helper(String value) {
            return value;
        }
    }
}
