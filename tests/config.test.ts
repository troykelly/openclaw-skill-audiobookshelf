/**
 * Tests for Configuration module
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Config, loadConfig, saveConfig, type AppConfig } from '../src/lib/config.js';
import * as fs from 'fs/promises';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  access: vi.fn(),
}));

describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('loadConfig', () => {
    it('should load config from environment variables', async () => {
      process.env.ABS_SERVER = 'https://abs.example.com';
      process.env.ABS_TOKEN = 'test-token';
      process.env.ABS_DEVICE = 'Living Room';

      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

      const config = await loadConfig();

      expect(config.url).toBe('https://abs.example.com');
      expect(config.apiKey).toBe('test-token');
      expect(config.defaultDevice).toBe('Living Room');
    });

    it('should load config from config file', async () => {
      const configContent = JSON.stringify({
        url: 'https://abs-file.example.com',
        apiKey: 'file-token',
        defaultDevice: 'Kitchen',
        timeout: 5000,
      });

      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue(configContent);

      // No env vars
      delete process.env.ABS_SERVER;
      delete process.env.ABS_TOKEN;
      delete process.env.ABS_DEVICE;

      const config = await loadConfig();

      expect(config.url).toBe('https://abs-file.example.com');
      expect(config.apiKey).toBe('file-token');
      expect(config.defaultDevice).toBe('Kitchen');
      expect(config.timeout).toBe(5000);
    });

    it('should prioritize env vars over config file', async () => {
      process.env.ABS_SERVER = 'https://env.example.com';
      process.env.ABS_TOKEN = 'env-token';

      const configContent = JSON.stringify({
        url: 'https://file.example.com',
        apiKey: 'file-token',
        defaultDevice: 'Kitchen',
      });

      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue(configContent);

      const config = await loadConfig();

      expect(config.url).toBe('https://env.example.com');
      expect(config.apiKey).toBe('env-token');
      expect(config.defaultDevice).toBe('Kitchen'); // From file, no env override
    });

    it('should handle missing config file gracefully', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

      delete process.env.ABS_SERVER;
      delete process.env.ABS_TOKEN;

      const config = await loadConfig();

      expect(config.url).toBeUndefined();
      expect(config.apiKey).toBeUndefined();
    });

    it('should handle invalid JSON in config file', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue('invalid json {');

      delete process.env.ABS_SERVER;

      // Should not throw, just use defaults
      const config = await loadConfig();
      expect(config.url).toBeUndefined();
    });
  });

  describe('saveConfig', () => {
    it('should save config to file', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const config: AppConfig = {
        url: 'https://abs.example.com',
        apiKey: 'secret-key',
        defaultDevice: 'Bedroom',
      };

      await saveConfig(config);

      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const savedContent = JSON.parse(writeCall[1] as string) as AppConfig;
      expect(savedContent.url).toBe('https://abs.example.com');
      expect(savedContent.apiKey).toBe('secret-key');
    });

    it('should create config directory if it does not exist', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await saveConfig({ url: 'https://test.com' });

      expect(fs.mkdir).toHaveBeenCalledWith(expect.stringContaining('abs'), { recursive: true });
    });
  });

  describe('Config class', () => {
    describe('getConfigPath', () => {
      it('should return path in user config directory', () => {
        const configPath = Config.getConfigPath();
        expect(configPath).toContain('config.json');
        expect(configPath).toContain('abs');
      });

      it('should use XDG_CONFIG_HOME if set', () => {
        process.env.XDG_CONFIG_HOME = '/custom/config';
        const configPath = Config.getConfigPath();
        expect(configPath).toBe('/custom/config/abs/config.json');
        delete process.env.XDG_CONFIG_HOME;
      });
    });

    describe('redactApiKey', () => {
      it('should redact API key for display', () => {
        const redacted = Config.redactApiKey('super-secret-api-key-12345');
        expect(redacted).not.toContain('super-secret');
        expect(redacted).toMatch(/^\*+.{4}$/); // Ends with last 4 chars
      });

      it('should handle short API keys', () => {
        const redacted = Config.redactApiKey('abc');
        expect(redacted).toBe('***');
      });

      it('should handle empty API key', () => {
        const redacted = Config.redactApiKey('');
        expect(redacted).toBe('');
      });

      it('should handle undefined', () => {
        const redacted = Config.redactApiKey(undefined);
        expect(redacted).toBe('');
      });
    });

    describe('validate', () => {
      it('should validate complete config', () => {
        const config: AppConfig = {
          url: 'https://abs.example.com',
          apiKey: 'test-key',
        };

        const result = Config.validate(config);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should report missing url', () => {
        const config: AppConfig = {
          apiKey: 'test-key',
        };

        const result = Config.validate(config);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('url is required');
      });

      it('should report missing apiKey', () => {
        const config: AppConfig = {
          url: 'https://abs.example.com',
        };

        const result = Config.validate(config);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('apiKey is required');
      });

      it('should report invalid url format', () => {
        const config: AppConfig = {
          url: 'not-a-url',
          apiKey: 'test-key',
        };

        const result = Config.validate(config);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('url'))).toBe(true);
      });
    });

    describe('merge', () => {
      it('should merge configs with priority', () => {
        const base: AppConfig = {
          url: 'https://base.com',
          apiKey: 'base-key',
          defaultDevice: 'Base Device',
          timeout: 5000,
        };

        const override: Partial<AppConfig> = {
          url: 'https://override.com',
          apiKey: 'override-key',
        };

        const merged = Config.merge(base, override);

        expect(merged.url).toBe('https://override.com');
        expect(merged.apiKey).toBe('override-key');
        expect(merged.defaultDevice).toBe('Base Device');
        expect(merged.timeout).toBe(5000);
      });

      it('should not merge undefined values', () => {
        const base: AppConfig = {
          url: 'https://base.com',
          apiKey: 'base-key',
        };

        const override: Partial<AppConfig> = {
          url: undefined,
          defaultDevice: 'New Device',
        };

        const merged = Config.merge(base, override);

        expect(merged.url).toBe('https://base.com');
        expect(merged.defaultDevice).toBe('New Device');
      });
    });

    describe('formatForDisplay', () => {
      it('should format config with redacted API key', () => {
        const config: AppConfig = {
          url: 'https://abs.example.com',
          apiKey: 'super-secret-key',
          defaultDevice: 'Living Room',
        };

        const display = Config.formatForDisplay(config);

        expect(display).toContain('https://abs.example.com');
        expect(display).not.toContain('super-secret-key');
        expect(display).toContain('Living Room');
      });
    });
  });
});
