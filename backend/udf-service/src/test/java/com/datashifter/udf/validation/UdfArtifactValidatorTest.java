package com.datashifter.udf.validation;

import com.datashifter.common.exceptions.DatashifterException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.util.jar.JarEntry;
import java.util.jar.JarOutputStream;

import static org.junit.jupiter.api.Assertions.*;

class UdfArtifactValidatorTest {

    private final UdfArtifactValidator validator = new UdfArtifactValidator(1024 * 1024);

    @Test
    void acceptsJarContainingCompiledClass() throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        try (JarOutputStream jar = new JarOutputStream(output)) {
            jar.putNextEntry(new JarEntry("com/example/Eligibility.class"));
            jar.write(new byte[] {0, 1, 2});
            jar.closeEntry();
        }
        MockMultipartFile file = new MockMultipartFile("file", "eligibility.jar", "application/java-archive", output.toByteArray());
        assertDoesNotThrow(() -> validator.validate(file));
    }

    @Test
    void rejectsNonJarFile() {
        MockMultipartFile file = new MockMultipartFile("file", "eligibility.zip", "application/zip", new byte[] {1});
        DatashifterException error = assertThrows(DatashifterException.class, () -> validator.validate(file));
        assertEquals("Only .jar files are accepted", error.getMessage());
    }

    @Test
    void rejectsJarWithoutClasses() throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        try (JarOutputStream jar = new JarOutputStream(output)) {
            jar.putNextEntry(new JarEntry("README.txt"));
            jar.write("not executable".getBytes());
            jar.closeEntry();
        }
        MockMultipartFile file = new MockMultipartFile("file", "empty.jar", "application/java-archive", output.toByteArray());
        DatashifterException error = assertThrows(DatashifterException.class, () -> validator.validate(file));
        assertEquals("The JAR does not contain compiled Java classes", error.getMessage());
    }
}