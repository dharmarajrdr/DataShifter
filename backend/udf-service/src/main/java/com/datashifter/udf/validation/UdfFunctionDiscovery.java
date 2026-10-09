package com.datashifter.udf.validation;

import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.udf.sdk.DataShifterUdf;
import org.objectweb.asm.AnnotationVisitor;
import org.objectweb.asm.ClassReader;
import org.objectweb.asm.ClassVisitor;
import org.objectweb.asm.MethodVisitor;
import org.objectweb.asm.Opcodes;
import org.objectweb.asm.Type;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;

@Component
public class UdfFunctionDiscovery {

    private static final String UDF_DESCRIPTOR = Type.getDescriptor(DataShifterUdf.class);
    private static final String INDEX_FILE_PATH = "META-INF/datashifter/udfs.list";

    public List<DiscoveredFunction> discover(MultipartFile file) {
        List<DiscoveredFunction> functions = new ArrayList<>();
        File tempFile = null;
        try {
            tempFile = Files.createTempFile("udf-", ".jar").toFile();
            file.transferTo(tempFile);
            
            try (JarFile jar = new JarFile(tempFile)) {
                JarEntry listEntry = (JarEntry) jar.getEntry(INDEX_FILE_PATH);
                if (listEntry != null) {
                    List<String> classNames;
                    try (InputStream in = jar.getInputStream(listEntry);
                         BufferedReader reader = new BufferedReader(new InputStreamReader(in))) {
                        classNames = reader.lines().filter(l -> !l.isBlank()).toList();
                    }
                    
                    for (String className : classNames) {
                        String classPath = className.replace('.', '/') + ".class";
                        JarEntry classEntry = (JarEntry) jar.getEntry(classPath);
                        if (classEntry == null) {
                            throw new DatashifterException("Class " + className + " listed in index not found in JAR");
                        }
                        try (InputStream classIn = jar.getInputStream(classEntry)) {
                            discoverClass(classIn.readAllBytes(), functions);
                        }
                    }
                } else {
                    // Fallback: scan all .class entries in the JAR
                    java.util.Enumeration<JarEntry> entries = jar.entries();
                    while (entries.hasMoreElements()) {
                        JarEntry entry = entries.nextElement();
                        if (entry.getName().endsWith(".class") && !entry.isDirectory()) {
                            try (InputStream classIn = jar.getInputStream(entry)) {
                                discoverClass(classIn.readAllBytes(), functions);
                            }
                        }
                    }
                }
            }
        } catch (IOException e) {
            throw new DatashifterException("Could not inspect UDF JAR", e);
        } finally {
            if (tempFile != null) {
                tempFile.delete();
            }
        }
        
        if (functions.isEmpty()) {
            throw new DatashifterException("No public methods annotated with @DataShifterUdf were found");
        }
        return functions;
    }

    private void discoverClass(byte[] classBytes, List<DiscoveredFunction> functions) {
        new ClassReader(classBytes).accept(new ClassVisitor(Opcodes.ASM9) {
            private String className;

            @Override
            public void visit(int version, int access, String name, String signature, String superName, String[] interfaces) {
                className = name.replace('/', '.');
            }

            @Override
            public MethodVisitor visitMethod(int access, String name, String descriptor, String signature, String[] exceptions) {
                if ((access & Opcodes.ACC_PUBLIC) == 0 || (access & (Opcodes.ACC_SYNTHETIC | Opcodes.ACC_BRIDGE)) != 0) {
                    return null;
                }
                return new MethodVisitor(Opcodes.ASM9) {
                    @Override
                    public AnnotationVisitor visitAnnotation(String annotationDescriptor, boolean visible) {
                        if (!UDF_DESCRIPTOR.equals(annotationDescriptor)) return null;

                        return new AnnotationVisitor(Opcodes.ASM9) {
                            private String functionName = name;
                            private String description = "";

                            @Override
                            public void visit(String key, Object value) {
                                if ("name".equals(key) && value instanceof String valueString && !valueString.isBlank()) {
                                    functionName = valueString;
                                } else if ("description".equals(key) && value instanceof String valueString) {
                                    description = valueString;
                                }
                            }

                            @Override
                            public void visitEnd() {
                                Type methodType = Type.getMethodType(descriptor);
                                List<String> parameterTypes = List.of(methodType.getArgumentTypes()).stream()
                                        .map(Type::getClassName).toList();
                                        
                                if (parameterTypes.size() != 1 || !parameterTypes.get(0).equals("com.datashifter.udf.sdk.Row")) {
                                    throw new DatashifterException("Method " + name + " in " + className + " must take exactly one parameter of type com.datashifter.udf.sdk.Row");
                                }
                                        
                                functions.add(new DiscoveredFunction(
                                        className, name, functionName, description, parameterTypes,
                                        methodType.getReturnType().getClassName(), (access & Opcodes.ACC_STATIC) != 0));
                            }
                        };
                    }
                };
            }
        }, ClassReader.SKIP_CODE | ClassReader.SKIP_DEBUG | ClassReader.SKIP_FRAMES);
    }

    public record DiscoveredFunction(String className, String methodName, String functionName,
                                     String description, List<String> parameterTypes,
                                     String returnType, boolean staticMethod) {}
}
