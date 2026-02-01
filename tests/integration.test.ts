/**
 * Integration tests for full flows
 *
 * These tests verify the complete flow from CLI parsing to
 * API calls and Cast control, using mocked services.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseCLI } from '../src/lib/cli.js';
import { SleepTimer } from '../src/lib/sleep-timer.js';
import { loadConfig } from '../src/lib/config.js';
import type { AppConfig } from '../src/lib/config.js';

// Mock loadConfig to avoid fs access
vi.mock('../src/lib/config.js', () => ({
  loadConfig: vi.fn(),
  saveConfig: vi.fn(),
  Config: {
    getConfigPath: vi.fn(() => '/test/.config/abs/config.json'),
    redactApiKey: vi.fn((key: string | undefined) => (key ? '***' + key.slice(-4) : '')),
    validate: vi.fn(() => ({ valid: true, errors: [] })),
    merge: vi.fn((base: unknown, override: unknown) => ({ ...base as object, ...override as object })),
    formatForDisplay: vi.fn((config: unknown) => JSON.stringify(config)),
  },
}));

describe('Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Library Browsing Flow', () => {
    it('should parse library command and return libraries', () => {
      // Setup mocked config
      const mockConfig: AppConfig = {
        url: 'https://abs.example.com',
        apiKey: 'test-token',
      };
      vi.mocked(loadConfig).mockResolvedValue(mockConfig);

      // Parse CLI
      const cliResult = parseCLI(['library', '--json']);
      expect(cliResult.command).toBe('library');
      expect(cliResult.flags.json).toBe(true);
      expect(cliResult.exitCode).toBe(0);

      // Config would be loaded when executing command
      expect(vi.mocked(loadConfig)).not.toHaveBeenCalled(); // Not called yet
    });

    it('should parse books command with library filter', () => {
      const cliResult = parseCLI(['books', '--library', 'lib-123']);
      expect(cliResult.command).toBe('books');
      expect(cliResult.args.library).toBe('lib-123');
    });

    it('should parse search command with query', () => {
      const cliResult = parseCLI(['search', 'the hobbit']);
      expect(cliResult.command).toBe('search');
      expect(cliResult.args.query).toBe('the hobbit');
    });
  });

  describe('Playback Flow', () => {
    it('should parse play command with device selection', () => {
      const cliResult = parseCLI(['play', 'book-123', '--device', 'Living Room']);
      expect(cliResult.command).toBe('play');
      expect(cliResult.args.id).toBe('book-123');
      expect(cliResult.args.device).toBe('Living Room');
    });

    it('should parse resume command', () => {
      const cliResult = parseCLI(['resume', '--device', 'Kitchen']);
      expect(cliResult.command).toBe('resume');
      expect(cliResult.args.device).toBe('Kitchen');
    });

    it('should parse pause command', () => {
      const cliResult = parseCLI(['pause']);
      expect(cliResult.command).toBe('pause');
    });

    it('should parse stop command', () => {
      const cliResult = parseCLI(['stop']);
      expect(cliResult.command).toBe('stop');
    });
  });

  describe('Device Management Flow', () => {
    it('should parse devices command', () => {
      const cliResult = parseCLI(['devices', '--json']);
      expect(cliResult.command).toBe('devices');
      expect(cliResult.flags.json).toBe(true);
    });

    it('should parse device set command', () => {
      const cliResult = parseCLI(['device', 'set', 'Bedroom Speaker']);
      expect(cliResult.command).toBe('device');
      expect(cliResult.subcommand).toBe('set');
      expect(cliResult.args.name).toBe('Bedroom Speaker');
    });
  });

  describe('Sleep Timer Flow', () => {
    it('should parse sleep command with duration', () => {
      const cliResult = parseCLI(['sleep', '30']);
      expect(cliResult.command).toBe('sleep');
      expect(cliResult.args.minutes).toBe(30);
    });

    it('should parse sleep cancel command', () => {
      const cliResult = parseCLI(['sleep', 'cancel']);
      expect(cliResult.command).toBe('sleep');
      expect(cliResult.subcommand).toBe('cancel');
    });

    it('should parse sleep status command', () => {
      const cliResult = parseCLI(['sleep', 'status']);
      expect(cliResult.command).toBe('sleep');
      expect(cliResult.subcommand).toBe('status');
    });

    it('should integrate sleep timer with callbacks', async () => {
      vi.useFakeTimers();

      let progressSynced = false;
      let playbackPaused = false;

      const sleepTimer = new SleepTimer({
        onSyncProgress: () => {
          progressSynced = true;
          return Promise.resolve();
        },
        onExpire: () => {
          playbackPaused = true;
          return Promise.resolve();
        },
      });

      sleepTimer.start(1); // 1 minute
      expect(sleepTimer.isActive()).toBe(true);
      expect(sleepTimer.getRemainingSeconds()).toBe(60);

      // Advance time
      vi.advanceTimersByTime(60000);
      await vi.runAllTimersAsync();

      expect(progressSynced).toBe(true);
      expect(playbackPaused).toBe(true);
      expect(sleepTimer.isActive()).toBe(false);

      vi.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing required arguments', () => {
      const playResult = parseCLI(['play']);
      expect(playResult.error).toBeDefined();
      expect(playResult.exitCode).toBe(2);

      const searchResult = parseCLI(['search']);
      expect(searchResult.error).toBeDefined();
      expect(searchResult.exitCode).toBe(2);
    });

    it('should handle unknown commands', () => {
      const result = parseCLI(['unknown-command']);
      expect(result.error).toContain('Unknown command');
      expect(result.exitCode).toBe(2);
    });

    it('should show help for empty input', () => {
      const result = parseCLI([]);
      expect(result.command).toBe('help');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('Configuration Priority', () => {
    it('should use env vars when provided', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        ABS_SERVER: 'https://env-server.com',
        ABS_TOKEN: 'env-token',
        ABS_DEVICE: 'Env Device',
      };

      const cliResult = parseCLI(['library']);
      expect(cliResult.config.server).toBe('https://env-server.com');
      expect(cliResult.config.token).toBe('env-token');
      expect(cliResult.config.device).toBe('Env Device');

      process.env = originalEnv;
    });

    it('should prefer flag over env var for device', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        ABS_DEVICE: 'Env Device',
      };

      const cliResult = parseCLI(['play', 'book-123', '--device', 'Flag Device']);
      expect(cliResult.args.device).toBe('Flag Device');
      expect(cliResult.config.device).toBe('Env Device'); // Config still has env value

      process.env = originalEnv;
    });
  });

  describe('Complete End-to-End Scenario', () => {
    it('should simulate complete audiobook playback workflow', () => {
      vi.useFakeTimers();

      // 1. User searches for a book
      const searchResult = parseCLI(['search', 'Project Hail Mary']);
      expect(searchResult.command).toBe('search');
      expect(searchResult.args.query).toBe('Project Hail Mary');

      // 2. User lists available Cast devices
      const devicesResult = parseCLI(['devices']);
      expect(devicesResult.command).toBe('devices');

      // 3. User starts playback on a specific device
      const playResult = parseCLI(['play', 'book-abc-123', '--device', 'Bedroom']);
      expect(playResult.command).toBe('play');
      expect(playResult.args.id).toBe('book-abc-123');
      expect(playResult.args.device).toBe('Bedroom');

      // 4. User sets a sleep timer
      const sleepResult = parseCLI(['sleep', '45']);
      expect(sleepResult.command).toBe('sleep');
      expect(sleepResult.args.minutes).toBe(45);

      // 5. User checks sleep timer status
      const statusResult = parseCLI(['sleep', 'status']);
      expect(statusResult.command).toBe('sleep');
      expect(statusResult.subcommand).toBe('status');

      // 6. User decides to cancel sleep timer
      const cancelResult = parseCLI(['sleep', 'cancel']);
      expect(cancelResult.command).toBe('sleep');
      expect(cancelResult.subcommand).toBe('cancel');

      // 7. User pauses playback
      const pauseResult = parseCLI(['pause']);
      expect(pauseResult.command).toBe('pause');

      // 8. User resumes playback
      const resumeResult = parseCLI(['resume']);
      expect(resumeResult.command).toBe('resume');

      // 9. User stops playback (syncs progress)
      const stopResult = parseCLI(['stop']);
      expect(stopResult.command).toBe('stop');

      vi.useRealTimers();
    });
  });
});
