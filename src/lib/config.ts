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
function getConfigPath(): string {
  const configHome = process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), '.config');
  return path.join(configHome, 'abs', 'config.json');
}

/**
 * Redact API key for display
 */
function redactApiKey(apiKey: string | undefined): string {
  if (!apiKey) return '';
  if (apiKey.length <= 4) return '*'.repeat(apiKey.length);
  return '*'.repeat(apiKey.length - 4) + apiKey.slice(-4);
}

/**
 * Validate configuration
 */
function validate(config: AppConfig): ValidationResult {
  const errors: string[] = [];

  if (!config.url) {
    errors.push('url is required');
  } else {
    try {
      new URL(config.url);
    } catch {
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
function merge(base: AppConfig, override: Partial<AppConfig>): AppConfig {
  const result: AppConfig = { ...base };

  for (const key of Object.keys(override) as (keyof AppConfig)[]) {
    const value = override[key];
    if (value !== undefined) {
      // Use type assertion to handle the union type
      (result as Record<string, unknown>)[key] = value;
    }
  }

  return result;
}

/**
 * Format config for display (with redacted API key)
 */
function formatForDisplay(config: AppConfig): string {
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
export async function loadConfig(): Promise<AppConfig> {
  // Start with empty config
  let fileConfig: AppConfig = {};

  // Try to load from config file
  const configPath = getConfigPath();
  try {
    await fs.access(configPath);
    const content = await fs.readFile(configPath, 'utf-8');
    fileConfig = JSON.parse(content) as AppConfig;
  } catch {
    // File doesn't exist or is invalid, use defaults
  }

  // Load from environment variables (higher priority)
  const envConfig: AppConfig = {};

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

  // Merge: file first, then env vars override
  return merge(fileConfig, envConfig);
}

/**
 * Save configuration to file
 */
export async function saveConfig(config: AppConfig): Promise<void> {
  const configPath = getConfigPath();
  const configDir = path.dirname(configPath);

  // Ensure directory exists
  await fs.mkdir(configDir, { recursive: true });

  // Write config file
  const content = JSON.stringify(config, null, 2);
  await fs.writeFile(configPath, content, 'utf-8');
}
