/**
 * Configuration for Audiobookshelf skill
 */

export interface AudiobookshelfConfig {
  /**
   * Audiobookshelf server URL (e.g., https://abs.example.com)
   */
  url: string;

  /**
   * API key for authentication
   */
  apiKey: string;

  /**
   * Default Cast device name (optional)
   */
  defaultDevice?: string;

  /**
   * Request timeout in milliseconds (default: 10000)
   */
  timeout?: number;
}

/**
 * Load configuration from environment variables
 */
export function loadConfigFromEnv(): AudiobookshelfConfig {
  const url = process.env['AUDIOBOOKSHELF_URL'];
  const apiKey = process.env['AUDIOBOOKSHELF_API_KEY'];

  if (!url) {
    throw new Error('AUDIOBOOKSHELF_URL environment variable is required');
  }

  if (!apiKey) {
    throw new Error('AUDIOBOOKSHELF_API_KEY environment variable is required');
  }

  return {
    url: url.replace(/\/$/, ''), // Remove trailing slash
    apiKey,
    defaultDevice: process.env['AUDIOBOOKSHELF_DEFAULT_DEVICE'],
    timeout: process.env['AUDIOBOOKSHELF_TIMEOUT']
      ? parseInt(process.env['AUDIOBOOKSHELF_TIMEOUT'], 10)
      : 10000,
  };
}
