/**
 * Configuration module
 *
 * Handles loading, saving, and merging configuration from
 * environment variables and config files.
 */
/**
 * Application configuration
 */
export interface AppConfig {
    /** Audiobookshelf server URL */
    url?: string;
    /** API key/token */
    apiKey?: string;
    /** Default Cast device name */
    defaultDevice?: string;
    /** Request timeout in milliseconds */
    timeout?: number;
}
/**
 * Audiobookshelf client configuration (required fields)
 */
export interface AudiobookshelfConfig {
    /** Audiobookshelf server URL */
    url: string;
    /** API key/token */
    apiKey: string;
    /** Request timeout in milliseconds (optional) */
    timeout?: number;
}
/**
 * Validation result
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}
/**
 * Get the path to the config file
 */
declare function getConfigPath(): string;
/**
 * Redact API key for display
 */
declare function redactApiKey(apiKey: string | undefined): string;
/**
 * Validate configuration
 */
declare function validate(config: AppConfig): ValidationResult;
/**
 * Merge configs with override priority
 */
declare function merge(base: AppConfig, override: Partial<AppConfig>): AppConfig;
/**
 * Format config for display (with redacted API key)
 */
declare function formatForDisplay(config: AppConfig): string;
/**
 * Config utility namespace
 */
export declare const Config: {
    getConfigPath: typeof getConfigPath;
    redactApiKey: typeof redactApiKey;
    validate: typeof validate;
    merge: typeof merge;
    formatForDisplay: typeof formatForDisplay;
};
/**
 * Load configuration from environment and file
 */
export declare function loadConfig(): Promise<AppConfig>;
/**
 * Save configuration to file
 */
export declare function saveConfig(config: AppConfig): Promise<void>;
export {};
//# sourceMappingURL=config.d.ts.map