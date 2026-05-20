package com.dropbridge.config;

/**
 * Production deploy URLs — keep in sync with frontend/src/lib/runtimeConfig.js
 */
public final class DropBridgeCorsProperties {

    public static final String PRODUCTION_FRONTEND_URL = "https://drop-bridge-theta.vercel.app";
    public static final String VERCEL_PREVIEW_PATTERN = "https://drop-bridge-*.vercel.app";

    private DropBridgeCorsProperties() {}
}
