package com.datashifter.udf.adapters.discovery;

import com.datashifter.adapter.sdk.annotations.AdapterConfigProperties;
import com.datashifter.adapter.sdk.annotations.AdapterConfigProperty;
import com.datashifter.adapter.sdk.annotations.AdapterMode;
import com.datashifter.adapter.sdk.annotations.AdapterType;
import com.datashifter.adapter.sdk.annotations.DataShifterAdapter;
import com.datashifter.common.exceptions.DatashifterException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Builder;
import lombok.Getter;
import lombok.ToString;
import lombok.extern.slf4j.Slf4j;
import org.objectweb.asm.AnnotationVisitor;
import org.objectweb.asm.ClassReader;
import org.objectweb.asm.ClassVisitor;
import org.objectweb.asm.Opcodes;
import org.objectweb.asm.Type;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;

/**
 * Fast bytecode scanner inspecting JAR artifacts for DataShifter adapter declarations
 * and configuration property schemas using ASM ClassReader without classloading.
 */
@Component
@Slf4j
public class AdapterDiscovery {

    private static final String ADAPTER_DESC = Type.getDescriptor(DataShifterAdapter.class);
    private static final String PROPERTY_DESC = Type.getDescriptor(AdapterConfigProperty.class);
    private static final String PROPERTIES_CONTAINER_DESC = Type.getDescriptor(AdapterConfigProperties.class);

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Getter
    @Builder
    @ToString
    public static class DiscoveredAdapter {
        private String adapterKey;
        private String name;
        private String description;
        private AdapterType adapterType;
        private AdapterMode supportedMode;
        private String category;
        private String version;
        private String className;
        private String configSchema;
        private List<PropertyDefinition> properties;
    }

    @Getter
    @Builder
    @ToString
    public static class PropertyDefinition {
        private String name;
        private String label;
        private String type;
        private String description;
        private boolean required;
        private String defaultValue;
    }

    public List<DiscoveredAdapter> discover(MultipartFile file) {
        File tempFile = null;
        try {
            tempFile = Files.createTempFile("adapter-upload-", ".jar").toFile();
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, tempFile.toPath(), StandardCopyOption.REPLACE_EXISTING);
            }
            return discover(tempFile);
        } catch (IOException e) {
            throw new DatashifterException("Failed to scan adapter JAR: " + e.getMessage(), e);
        } finally {
            if (tempFile != null && tempFile.exists()) {
                tempFile.delete();
            }
        }
    }

    public List<DiscoveredAdapter> discover(File jarFile) {
        List<DiscoveredAdapter> adapters = new ArrayList<>();
        try (JarFile jar = new JarFile(jarFile)) {
            Enumeration<JarEntry> entries = jar.entries();
            while (entries.hasMoreElements()) {
                JarEntry entry = entries.nextElement();
                if (!entry.isDirectory() && entry.getName().endsWith(".class")) {
                    try (InputStream classStream = jar.getInputStream(entry)) {
                        DiscoveredAdapter adapter = inspectClass(classStream.readAllBytes());
                        if (adapter != null) {
                            adapters.add(adapter);
                        }
                    }
                }
            }
        } catch (IOException e) {
            throw new DatashifterException("Could not read JAR file: " + jarFile.getAbsolutePath(), e);
        }

        if (adapters.isEmpty()) {
            throw new DatashifterException("No classes annotated with @DataShifterAdapter were found in the JAR");
        }
        return adapters;
    }

    public DiscoveredAdapter inspectClass(byte[] classBytes) {
        AdapterClassVisitor visitor = new AdapterClassVisitor();
        new ClassReader(classBytes).accept(visitor, ClassReader.SKIP_CODE | ClassReader.SKIP_DEBUG | ClassReader.SKIP_FRAMES);
        return visitor.toDiscoveredAdapter(objectMapper);
    }

    private static class AdapterClassVisitor extends ClassVisitor {
        private String className;
        private boolean isAdapter = false;
        private String id;
        private String name;
        private String description = "";
        private AdapterType adapterType = AdapterType.WRITER;
        private AdapterMode supportedMode = AdapterMode.BATCH;
        private String category = "custom";
        private String version = "1.0.0";
        private final List<PropertyDefinition> properties = new ArrayList<>();

        public AdapterClassVisitor() {
            super(Opcodes.ASM9);
        }

        @Override
        public void visit(int version, int access, String name, String signature, String superName, String[] interfaces) {
            this.className = name.replace('/', '.');
        }

        @Override
        public AnnotationVisitor visitAnnotation(String descriptor, boolean visible) {
            if (ADAPTER_DESC.equals(descriptor)) {
                this.isAdapter = true;
                return new AnnotationVisitor(Opcodes.ASM9) {
                    @Override
                    public void visit(String fieldName, Object value) {
                        if ("id".equals(fieldName) && value instanceof String s) {
                            id = s;
                        } else if ("name".equals(fieldName) && value instanceof String s) {
                            name = s;
                        } else if ("description".equals(fieldName) && value instanceof String s) {
                            description = s;
                        } else if ("category".equals(fieldName) && value instanceof String s) {
                            category = s;
                        } else if ("version".equals(fieldName) && value instanceof String s) {
                            version = s;
                        }
                    }

                    @Override
                    public void visitEnum(String fieldName, String enumDescriptor, String enumValue) {
                        if ("type".equals(fieldName)) {
                            try {
                                adapterType = AdapterType.valueOf(enumValue);
                            } catch (IllegalArgumentException ignored) {}
                        } else if ("mode".equals(fieldName)) {
                            try {
                                supportedMode = AdapterMode.valueOf(enumValue);
                            } catch (IllegalArgumentException ignored) {}
                        }
                    }
                };
            }

            if (PROPERTY_DESC.equals(descriptor)) {
                return new PropertyAnnotationVisitor(properties);
            }

            if (PROPERTIES_CONTAINER_DESC.equals(descriptor)) {
                return new AnnotationVisitor(Opcodes.ASM9) {
                    @Override
                    public AnnotationVisitor visitArray(String name) {
                        if ("value".equals(name)) {
                            return new AnnotationVisitor(Opcodes.ASM9) {
                                @Override
                                public AnnotationVisitor visitAnnotation(String name, String desc) {
                                    if (PROPERTY_DESC.equals(desc)) {
                                        return new PropertyAnnotationVisitor(properties);
                                    }
                                    return super.visitAnnotation(name, desc);
                                }
                            };
                        }
                        return super.visitArray(name);
                    }
                };
            }

            return null;
        }

        public DiscoveredAdapter toDiscoveredAdapter(ObjectMapper mapper) {
            if (!isAdapter) {
                return null;
            }

            if (id == null || id.isBlank()) {
                id = className.substring(className.lastIndexOf('.') + 1).toLowerCase();
            }
            if (name == null || name.isBlank()) {
                name = id;
            }

            String schemaJson = "{}";
            try {
                Map<String, Object> schemaMap = new LinkedHashMap<>();
                schemaMap.put("properties", properties);
                schemaJson = mapper.writeValueAsString(schemaMap);
            } catch (Exception e) {
                log.warn("Failed to serialize adapter properties to schema JSON: {}", e.getMessage());
            }

            return DiscoveredAdapter.builder()
                    .adapterKey(id)
                    .name(name)
                    .description(description)
                    .adapterType(adapterType)
                    .supportedMode(supportedMode)
                    .category(category)
                    .version(version)
                    .className(className)
                    .configSchema(schemaJson)
                    .properties(new ArrayList<>(properties))
                    .build();
        }
    }

    private static class PropertyAnnotationVisitor extends AnnotationVisitor {
        private final List<PropertyDefinition> targetList;
        private String propName;
        private String propLabel;
        private String propType = "string";
        private String propDescription = "";
        private boolean propRequired = false;
        private String propDefaultValue = "";

        public PropertyAnnotationVisitor(List<PropertyDefinition> targetList) {
            super(Opcodes.ASM9);
            this.targetList = targetList;
        }

        @Override
        public void visit(String key, Object value) {
            if ("name".equals(key) && value instanceof String s) {
                propName = s;
            } else if ("label".equals(key) && value instanceof String s) {
                propLabel = s;
            } else if ("type".equals(key) && value instanceof String s) {
                propType = s;
            } else if ("description".equals(key) && value instanceof String s) {
                propDescription = s;
            } else if ("required".equals(key) && value instanceof Boolean b) {
                propRequired = b;
            } else if ("defaultValue".equals(key) && value instanceof String s) {
                propDefaultValue = s;
            }
        }

        @Override
        public void visitEnd() {
            if (propName != null && !propName.isBlank()) {
                if (propLabel == null || propLabel.isBlank()) {
                    propLabel = propName;
                }
                targetList.add(PropertyDefinition.builder()
                        .name(propName)
                        .label(propLabel)
                        .type(propType)
                        .description(propDescription)
                        .required(propRequired)
                        .defaultValue(propDefaultValue)
                        .build());
            }
        }
    }
}
