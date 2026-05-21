package com.dropbridge.storage.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.net.URI;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

/**
 * Cloudflare R2 storage implementation (S3-compatible).
 *
 * Activated when {@code STORAGE_TYPE=r2} (set via env var or application-production.yml).
 *
 * Required environment variables:
 *   R2_ACCOUNT_ID       — Cloudflare account ID
 *   R2_ACCESS_KEY_ID    — R2 API token access key
 *   R2_SECRET_ACCESS_KEY— R2 API token secret
 *   R2_BUCKET           — R2 bucket name
 *
 * Render → Environment → add these four vars.
 */
@Service
@Slf4j
@ConditionalOnProperty(name = "dropbridge.storage.type", havingValue = "r2")
public class R2StorageService implements StorageService {

    @Value("${dropbridge.storage.r2.account-id}")
    private String accountId;

    @Value("${dropbridge.storage.r2.access-key-id}")
    private String accessKeyId;

    @Value("${dropbridge.storage.r2.secret-access-key}")
    private String secretAccessKey;

    @Value("${dropbridge.storage.r2.bucket}")
    private String bucket;

    private S3Client s3;
    private S3Presigner presigner;

    @PostConstruct
    public void init() {
        String endpoint = String.format("https://%s.r2.cloudflarestorage.com", accountId);
        StaticCredentialsProvider credentials = StaticCredentialsProvider.create(
                AwsBasicCredentials.create(accessKeyId, secretAccessKey));
        s3 = S3Client.builder()
                .endpointOverride(URI.create(endpoint))
                .region(Region.of("auto"))
                .credentialsProvider(credentials)
                .build();
        presigner = S3Presigner.builder()
                .endpointOverride(URI.create(endpoint))
                .region(Region.of("auto"))
                .credentialsProvider(credentials)
                .build();

        log.info(
                "R2 storage ready — bucket={}, accountId={}, endpoint={}",
                bucket,
                accountId,
                endpoint);
    }

    @PreDestroy
    public void shutdown() {
        if (presigner != null) {
            presigner.close();
        }
        if (s3 != null) {
            s3.close();
        }
    }

    @Override
    public String store(MultipartFile file, String subdirectory) {
        try {
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String key = subdirectory + "/" + UUID.randomUUID() + extension;

            long sizeBytes = file.getSize();
            String contentType = file.getContentType();

            s3.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucket)
                            .key(key)
                            .contentType(contentType)
                            .contentLength(sizeBytes)
                            .build(),
                    RequestBody.fromInputStream(file.getInputStream(), sizeBytes)
            );

            log.info(
                    "R2 PutObject ok — bucket={}, key={}, sizeBytes={}, contentType={}, originalFilename={}",
                    bucket,
                    key,
                    sizeBytes,
                    contentType,
                    originalFilename);

            return key;
        } catch (Exception e) {
            log.error("R2 PutObject failed — bucket={}, subdirectory={}", bucket, subdirectory, e);
            throw new RuntimeException("Failed to upload file to R2", e);
        }
    }

    @Override
    public Resource load(String storageKey) {
        try {
            var response = s3.getObject(
                    GetObjectRequest.builder()
                            .bucket(bucket)
                            .key(storageKey)
                            .build()
            );
            return new InputStreamResource(response);
        } catch (Exception e) {
            throw new RuntimeException("File not found in R2: " + storageKey, e);
        }
    }

    @Override
    public Optional<String> createPresignedDownloadUrl(String storageKey, String filename, Duration ttl) {
        try {
            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                    .bucket(bucket)
                    .key(storageKey)
                    .responseContentDisposition(
                            "attachment; filename=\"" + sanitizeFilename(filename) + "\"")
                    .build();

            PresignedGetObjectRequest presigned = presigner.presignGetObject(
                    GetObjectPresignRequest.builder()
                            .signatureDuration(ttl)
                            .getObjectRequest(getObjectRequest)
                            .build());

            return Optional.of(presigned.url().toString());
        } catch (Exception e) {
            throw new RuntimeException("Failed to create presigned URL for: " + storageKey, e);
        }
    }

    private static String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return "download";
        }
        return filename.replace("\"", "'");
    }

    @Override
    public void delete(String storageKey) {
        try {
            s3.deleteObject(
                    DeleteObjectRequest.builder()
                            .bucket(bucket)
                            .key(storageKey)
                            .build()
            );
            log.info("R2 DeleteObject ok — bucket={}, key={}", bucket, storageKey);
        } catch (Exception e) {
            log.error("R2 DeleteObject failed — bucket={}, key={}", bucket, storageKey, e);
            throw new RuntimeException("Failed to delete file from R2: " + storageKey, e);
        }
    }
}
