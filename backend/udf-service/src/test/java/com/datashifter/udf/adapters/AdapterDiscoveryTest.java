package com.datashifter.udf.adapters;

import com.datashifter.adapter.sdk.annotations.AdapterConfigProperty;
import com.datashifter.adapter.sdk.annotations.AdapterMode;
import com.datashifter.adapter.sdk.annotations.AdapterType;
import com.datashifter.adapter.sdk.annotations.DataShifterAdapter;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.udf.adapters.discovery.AdapterDiscovery;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.objectweb.asm.AnnotationVisitor;
import org.objectweb.asm.ClassWriter;
import org.objectweb.asm.Opcodes;
import org.objectweb.asm.Type;

import java.io.FileOutputStream;
import java.nio.file.Path;
import java.util.List;
import java.util.jar.JarEntry;
import java.util.jar.JarOutputStream;

import static org.junit.jupiter.api.Assertions.*;

class AdapterDiscoveryTest {

    private AdapterDiscovery discovery;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        discovery = new AdapterDiscovery();
    }

    @Test
    void testDiscoverFromClassBytes() {
        byte[] classBytes = createAdapterClassBytes(
                "com/example/MyCustomWriter",
                "my-custom-writer",
                "My Custom Writer",
                "Custom streaming writer",
                AdapterType.WRITER,
                AdapterMode.BOTH,
                "custom",
                "1.5.0"
        );

        AdapterDiscovery.DiscoveredAdapter discovered = discovery.inspectClass(classBytes);

        assertNotNull(discovered);
        assertEquals("my-custom-writer", discovered.getAdapterKey());
        assertEquals("My Custom Writer", discovered.getName());
        assertEquals("Custom streaming writer", discovered.getDescription());
        assertEquals(AdapterType.WRITER, discovered.getAdapterType());
        assertEquals(AdapterMode.BOTH, discovered.getSupportedMode());
        assertEquals("custom", discovered.getCategory());
        assertEquals("1.5.0", discovered.getVersion());
        assertEquals("com.example.MyCustomWriter", discovered.getClassName());
        assertEquals(1, discovered.getProperties().size());

        AdapterDiscovery.PropertyDefinition prop = discovered.getProperties().get(0);
        assertEquals("apiKey", prop.getName());
        assertEquals("API Key", prop.getLabel());
        assertTrue(prop.isRequired());
        assertEquals("secret", prop.getDefaultValue());
        assertTrue(discovered.getConfigSchema().contains("\"name\":\"apiKey\""));
    }

    @Test
    void testDiscoverFromJarFile() throws Exception {
        byte[] adapterClass = createAdapterClassBytes(
                "com/example/TestReader",
                "test-reader",
                "Test Database Reader",
                "Reader for testing",
                AdapterType.READER,
                AdapterMode.BATCH,
                "database",
                "1.0.0"
        );

        Path jarPath = tempDir.resolve("test-adapter.jar");
        try (JarOutputStream jos = new JarOutputStream(new FileOutputStream(jarPath.toFile()))) {
            jos.putNextEntry(new JarEntry("com/example/TestReader.class"));
            jos.write(adapterClass);
            jos.closeEntry();
        }

        List<AdapterDiscovery.DiscoveredAdapter> list = discovery.discover(jarPath.toFile());

        assertEquals(1, list.size());
        AdapterDiscovery.DiscoveredAdapter adapter = list.get(0);
        assertEquals("test-reader", adapter.getAdapterKey());
        assertEquals(AdapterType.READER, adapter.getAdapterType());
        assertEquals(AdapterMode.BATCH, adapter.getSupportedMode());
    }

    @Test
    void testDiscoverEmptyJarThrowsException() throws Exception {
        Path jarPath = tempDir.resolve("empty.jar");
        try (JarOutputStream jos = new JarOutputStream(new FileOutputStream(jarPath.toFile()))) {
            jos.putNextEntry(new JarEntry("com/example/PlainClass.class"));
            ClassWriter cw = new ClassWriter(0);
            cw.visit(Opcodes.V17, Opcodes.ACC_PUBLIC, "com/example/PlainClass", null, "java/lang/Object", null);
            cw.visitEnd();
            jos.write(cw.toByteArray());
            jos.closeEntry();
        }

        assertThrows(DatashifterException.class, () -> discovery.discover(jarPath.toFile()));
    }

    private byte[] createAdapterClassBytes(
            String internalName, String id, String name, String desc,
            AdapterType type, AdapterMode mode, String category, String version) {

        ClassWriter cw = new ClassWriter(0);
        cw.visit(Opcodes.V17, Opcodes.ACC_PUBLIC, internalName, null, "java/lang/Object", null);

        AnnotationVisitor av = cw.visitAnnotation(Type.getDescriptor(DataShifterAdapter.class), true);
        av.visit("id", id);
        av.visit("name", name);
        av.visit("description", desc);
        av.visitEnum("type", Type.getDescriptor(AdapterType.class), type.name());
        av.visitEnum("mode", Type.getDescriptor(AdapterMode.class), mode.name());
        av.visit("category", category);
        av.visit("version", version);
        av.visitEnd();

        AnnotationVisitor pv = cw.visitAnnotation(Type.getDescriptor(AdapterConfigProperty.class), true);
        pv.visit("name", "apiKey");
        pv.visit("label", "API Key");
        pv.visit("type", "string");
        pv.visit("description", "Authentication key");
        pv.visit("required", true);
        pv.visit("defaultValue", "secret");
        pv.visitEnd();

        cw.visitEnd();
        return cw.toByteArray();
    }
}
