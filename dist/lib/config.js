/**
 * Configuration module
 *
 * Handles loading, saving, and merging configuration from
 * environment variables and config files.
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
/**
 * Get the path to the config file
 */
function getConfigPath() {
    const configHome = process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), '.config');
    return path.join(configHome, 'abs', 'config.json');
}
/**
 * Redact API key for display
 */
function redactApiKey(apiKey) {
    if (!apiKey)
        return '';
    if (apiKey.length <= 4)
        return '*'.repeat(apiKey.length);
    return '*'.repeat(apiKey.length - 4) + apiKey.slice(-4);
}
/**
 * Validate configuration
 */
function validate(config) {
    const errors = [];
    if (!config.url) {
        errors.push('url is required');
    }
    else {
        try {
            new URL(config.url);
        }
        catch {
            errors.push('url must be a valid URL');
        }
    }
    if (!config.apiKey) {
        errors.push('apiKey is required');
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
/**
 * Merge configs with override priority
 */
function merge(base, override) {
    const result = { ...base };
    for (const key of Object.keys(override)) {
        const value = override[key];
        if (value !== undefined) {
            // Use type assertion to handle the union type
            result[key] = value;
        }
    }
    return result;
}
/**
 * Format config for display (with redacted API key)
 */
function formatForDisplay(config) {
    const displayConfig = {
        ...config,
        apiKey: redactApiKey(config.apiKey),
    };
    return JSON.stringify(displayConfig, null, 2);
}
/**
 * Config utility namespace
 */
export const Config = {
    getConfigPath,
    redactApiKey,
    validate,
    merge,
    formatForDisplay,
};
/**
 * Load configuration from environment and file
 */
export async function loadConfig() {
    // Start with empty config
    let fileConfig = {};
    // Try to load from config file
    const configPath = getConfigPath();
    try {
        await fs.access(configPath);
        const content = await fs.readFile(configPath, 'utf-8');
        fileConfig = JSON.parse(content);
    }
    catch {
        // File doesn't exist or is invalid, use defaults
    }
    // Load from environment variables (higher priority)
    const envConfig = {};
    if (process.env.ABS_SERVER) {
        envConfig.url = process.env.ABS_SERVER;
    }
    if (process.env.ABS_TOKEN) {
        envConfig.apiKey = process.env.ABS_TOKEN;
    }
    if (process.env.ABS_DEVICE) {
        envConfig.defaultDevice = process.env.ABS_DEVICE;
    }
    if (process.env.ABS_TIMEOUT) {
        const timeout = parseInt(process.env.ABS_TIMEOUT, 10);
        if (!isNaN(timeout)) {
            envConfig.timeout = timeout;
        }
    }
    // Proxy configuration from environment
    const proxyConfig = {};
    if (process.env.ABS_LISTEN_PORT) {
        const port = parseInt(process.env.ABS_LISTEN_PORT, 10);
        if (!isNaN(port)) {
            proxyConfig.listenPort = port;
        }
    }
    if (process.env.ABS_LISTEN_HOST) {
        proxyConfig.listenHost = process.env.ABS_LISTEN_HOST;
    }
    if (process.env.ABS_TRUSTED_PROXIES) {
        proxyConfig.trustedProxies = process.env.ABS_TRUSTED_PROXIES.split(',').map(s => s.trim());
    }
    if (process.env.ABS_PUBLIC_URL) {
        proxyConfig.publicUrl = process.env.ABS_PUBLIC_URL;
    }
    if (Object.keys(proxyConfig).length > 0) {
        envConfig.proxy = proxyConfig;
    }
    // Merge: file first, then env vars override
    const merged = merge(fileConfig, envConfig);
    // Deep merge proxy config
    if (fileConfig.proxy || envConfig.proxy) {
        merged.proxy = { ...fileConfig.proxy, ...envConfig.proxy };
    }
    return merged;
}
/**
 * Save configuration to file
 */
export async function saveConfig(config) {
    const configPath = getConfigPath();
    const configDir = path.dirname(configPath);
    // Ensure directory exists
    await fs.mkdir(configDir, { recursive: true });
    // Write config file
    const content = JSON.stringify(config, null, 2);
    await fs.writeFile(configPath, content, 'utf-8');
}
//# sourceMappingURL=config.js.map