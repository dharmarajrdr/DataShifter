package com.datashifter.udf.sdk;

import javax.annotation.processing.AbstractProcessor;
import javax.annotation.processing.RoundEnvironment;
import javax.annotation.processing.SupportedAnnotationTypes;
import javax.annotation.processing.SupportedSourceVersion;
import javax.lang.model.SourceVersion;
import javax.lang.model.element.Element;
import javax.lang.model.element.ElementKind;
import javax.lang.model.element.ExecutableElement;
import javax.lang.model.element.TypeElement;
import javax.lang.model.element.VariableElement;
import javax.tools.Diagnostic;
import javax.tools.FileObject;
import javax.tools.StandardLocation;
import java.io.IOException;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@SupportedAnnotationTypes("com.datashifter.udf.sdk.DataShifterUdf")
@SupportedSourceVersion(SourceVersion.RELEASE_17)
public class UdfAnnotationProcessor extends AbstractProcessor {

    private final Set<String> discoveredUdfClasses = new HashSet<>();

    @Override
    public boolean process(Set<? extends TypeElement> annotations, RoundEnvironment roundEnv) {
        if (roundEnv.processingOver()) {
            if (!discoveredUdfClasses.isEmpty()) {
                writeIndexFile();
            }
            return true;
        }

        for (TypeElement annotation : annotations) {
            for (Element element : roundEnv.getElementsAnnotatedWith(annotation)) {
                if (element.getKind() != ElementKind.METHOD) {
                    error(element, "@DataShifterUdf can only be applied to methods.");
                    continue;
                }

                ExecutableElement method = (ExecutableElement) element;
                if (!isValidUdfSignature(method)) {
                    error(element, "Method annotated with @DataShifterUdf must take exactly one parameter of type com.datashifter.udf.sdk.Row.");
                    continue;
                }

                TypeElement enclosingClass = (TypeElement) method.getEnclosingElement();
                discoveredUdfClasses.add(enclosingClass.getQualifiedName().toString());
            }
        }
        return true;
    }

    private boolean isValidUdfSignature(ExecutableElement method) {
        List<? extends VariableElement> parameters = method.getParameters();
        if (parameters.size() != 1) {
            return false;
        }
        VariableElement param = parameters.get(0);
        String paramType = param.asType().toString();
        return paramType.equals("com.datashifter.udf.sdk.Row");
    }

    private void writeIndexFile() {
        try {
            FileObject fileObject = processingEnv.getFiler().createResource(
                    StandardLocation.CLASS_OUTPUT, "", "META-INF/datashifter/udfs.list");
            try (OutputStream out = fileObject.openOutputStream();
                 PrintWriter writer = new PrintWriter(out)) {
                for (String className : discoveredUdfClasses) {
                    writer.println(className);
                }
            }
        } catch (IOException e) {
            processingEnv.getMessager().printMessage(Diagnostic.Kind.ERROR, "Failed to write UDF index file: " + e.getMessage());
        }
    }

    private void error(Element e, String msg) {
        processingEnv.getMessager().printMessage(Diagnostic.Kind.ERROR, msg, e);
    }
}
