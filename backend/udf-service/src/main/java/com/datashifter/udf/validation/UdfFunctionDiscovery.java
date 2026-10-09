package com.datashifter.udf.validation;

import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.udf.DataShifterUdf;
import org.objectweb.asm.AnnotationVisitor;
import org.objectweb.asm.ClassReader;
import org.objectweb.asm.ClassVisitor;
import org.objectweb.asm.MethodVisitor;
import org.objectweb.asm.Opcodes;
import org.objectweb.asm.Type;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.jar.JarEntry;
import java.util.jar.JarInputStream;

@Component
public class UdfFunctionDiscovery {

    private static final String UDF_DESCRIPTOR = Type.getDescriptor(DataShifterUdf.class);

    public List<DiscoveredFunction> discover(MultipartFile file) {
        List<DiscoveredFunction> functions = new ArrayList<>();
        try (JarInputStream jar = new JarInputStream(file.getInputStream())) {
            JarEntry entry;
            while ((entry = jar.getNextJarEntry()) != null) {
                if (!entry.isDirectory() && entry.getName().endsWith(".class")) {
                    discoverClass(jar.readAllBytes(), functions);
                }
            }
        } catch (IOException e) {
            throw new DatashifterException("Could not inspect UDF classes", e);
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