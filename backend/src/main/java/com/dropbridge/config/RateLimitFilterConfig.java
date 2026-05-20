package com.dropbridge.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Configuration
public class RateLimitFilterConfig {

    @Bean
    public FilterRegistrationBean<TransferCreateRateLimitFilter> transferCreateRateLimitFilter(
            ObjectMapper objectMapper,
            @Value("${dropbridge.transfer.create-rate-per-minute:40}") int maxCreatesPerMinute) {

        FilterRegistrationBean<TransferCreateRateLimitFilter> reg = new FilterRegistrationBean<>();
        reg.setFilter(new TransferCreateRateLimitFilter(objectMapper, maxCreatesPerMinute));
        reg.addUrlPatterns("/api/transfers");
        reg.setOrder(Ordered.HIGHEST_PRECEDENCE + 40);
        return reg;
    }

    /**
     * Simple per-IP sliding window for {@code POST /api/transfers} (session creation).
     */
    static final class TransferCreateRateLimitFilter extends OncePerRequestFilter {

        private final ObjectMapper objectMapper;
        private final int maxCreatesPerMinute;
        private final Map<String, Deque<Long>> hitsByClient = new ConcurrentHashMap<>();

        TransferCreateRateLimitFilter(ObjectMapper objectMapper, int maxCreatesPerMinute) {
            this.objectMapper = objectMapper;
            this.maxCreatesPerMinute = Math.max(5, Math.min(200, maxCreatesPerMinute));
        }

        @Override
        protected boolean shouldNotFilter(HttpServletRequest request) {
            return !"POST".equalsIgnoreCase(request.getMethod())
                    || !"/api/transfers".equals(request.getRequestURI());
        }

        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
                throws ServletException, IOException {

            String clientKey = clientKey(request);
            long now = System.currentTimeMillis();
            long windowMs = 60_000L;

            Deque<Long> dq = hitsByClient.computeIfAbsent(clientKey, k -> new ArrayDeque<>());
            synchronized (dq) {
                while (!dq.isEmpty() && now - dq.peekFirst() > windowMs) {
                    dq.pollFirst();
                }
                if (dq.size() >= maxCreatesPerMinute) {
                    writeTooManyRequests(response);
                    return;
                }
                dq.addLast(now);
            }

            filterChain.doFilter(request, response);
        }

        private static String clientKey(HttpServletRequest request) {
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                return forwarded.split(",")[0].trim();
            }
            return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
        }

        private void writeTooManyRequests(HttpServletResponse response) throws IOException {
            response.setStatus(429);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            objectMapper.writeValue(
                    response.getOutputStream(),
                    Map.of("status", 429, "message", "Too many transfer sessions. Try again in a minute.")
            );
        }
    }
}
