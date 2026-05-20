package com.dropbridge.storage.service;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

/**
 * Local filesystem storage — used in development.
 * In production, set {@code dropbridge.storage.type=r2} to activate R2StorageService instead.
 */
@Service
@Primary
@ConditionalOnProperty(
        name = "dropbridge.storage.type",
        havingValue = "local",
        matchIfMissing = true   // default: use local storage when property not set
)
public class LocalStorageService implements StorageService {

    @Value("${dropbridge.storage.local-path}")
    private String localPath;

    private Path rootLocation;

    @PostConstruct
    public void init() {
        rootLocation = Paths.get(localPath).toAbsolutePath().normalize();
        try {
            Files.createDirectories(rootLocation);
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory", e);
        }
    }

    @Override
    public String store(MultipartFile file, String subdirectory) {
        try {
            Path targetDir = rootLocation.resolve(subdirectory);
            Files.createDirectories(targetDir);

            // Generate unique filename to avoid collisions
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String storedFilename = UUID.randomUUID() + extension;

            Path targetPath = targetDir.resolve(storedFilename);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            // Return relative path as storage key
            return subdirectory + "/" + storedFilename;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file", e);
        }
    }

    @Override
    public Resource load(String storageKey) {
        try {
            Path filePath = rootLocation.resolve(storageKey).normalize();
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new RuntimeException("File not found: " + storageKey);
            }
        } catch (MalformedURLException e) {
            throw new RuntimeException("File not found: " + storageKey, e);
        }
    }

    @Override
    public void delete(String storageKey) {
        try {
            Path filePath = rootLocation.resolve(storageKey).normalize();
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            throw new RuntimeException("Failed to delete file: " + storageKey, e);
        }
    }
}
