package com.datashifter.udf.validation;

import com.datashifter.common.exceptions.DatashifterException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.jar.JarEntry;
import java.util.jar.JarInputStream;

@Component
public class UdfArtifactValidator {

    private final long maxFileSizeBytes;

    public UdfArtifactValidator(@Value("${datashifter.udf.max-file-size-bytes}") long maxFileSizeBytes) {
        this.maxFileSizeBytes = maxFileSizeBytes;
    }

    public void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new DatashifterException("A non-empty Java JAR is required");
        if (file.getSize() > maxFileSizeBytes) throw new DatashifterException("UDF JAR exceeds the maximum upload size");
        String filename = file.getOriginalFilename();
        if (filename == null || !filename.toLowerCase().endsWith(".jar")) throw new DatashifterException("Only .jar files are accepted");

        int classCount = 0;
        try (JarInputStream jar = new JarInputStream(file.getInputStream())) {
            JarEntry entry;
            while ((entry = jar.getNextJarEntry()) != null) {
                if (!entry.isDirectory() && entry.getName().endsWith(".class")) classCount++;
            }
        } catch (IOException e) {
            throw new DatashifterException("The uploaded file is not a readable JAR", e);
        }
        if (classCount == 0) throw new DatashifterException("The JAR does not contain compiled Java classes");
    }
}