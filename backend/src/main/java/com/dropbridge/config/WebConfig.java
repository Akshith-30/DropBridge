package com.dropbridge.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${dropbridge.frontend.url}")
    private String frontendUrl;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns(
                        frontendUrl,
                        DropBridgeCorsProperties.PRODUCTION_FRONTEND_URL,
                        DropBridgeCorsProperties.VERCEL_PREVIEW_PATTERN,
                        "http://localhost:*",
                        "http://127.0.0.1:*",
                        "https://localhost:*",
                        "https://127.0.0.1:*"
                )
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
