/**
 * Tests for CLI argument parsing
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseCLI } from '../src/lib/cli.js';

describe('CLI Parser', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('global flags', () => {
    it('should parse --help flag', () => {
      const result = parseCLI(['--help']);
      expect(result.command).toBe('help');
      expect(result.flags.help).toBe(true);
    });

    it('should parse -h flag', () => {
      const result = parseCLI(['-h']);
      expect(result.command).toBe('help');
      expect(result.flags.help).toBe(true);
    });

    it('should parse --version flag', () => {
      const result = parseCLI(['--version']);
      expect(result.command).toBe('version');
      expect(result.flags.version).toBe(true);
    });

    it('should parse -v flag', () => {
      const result = parseCLI(['-v']);
      expect(result.command).toBe('version');
      expect(result.flags.version).toBe(true);
    });

    it('should parse --json flag', () => {
      const result = parseCLI(['library', '--json']);
      expect(result.flags.json).toBe(true);
    });
  });

  describe('library command', () => {
    it('should parse "library" command', () => {
      const result = parseCLI(['library']);
      expect(result.command).toBe('library');
    });

    it('should parse "library" with --json', () => {
      const result = parseCLI(['library', '--json']);
      expect(result.command).toBe('library');
      expect(result.flags.json).toBe(true);
    });
  });

  describe('books command', () => {
    it('should parse "books" command', () => {
      const result = parseCLI(['books']);
      expect(result.command).toBe('books');
    });

    it('should parse "books --library <id>"', () => {
      const result = parseCLI(['books', '--library', 'lib-123']);
      expect(result.command).toBe('books');
      expect(result.args.library).toBe('lib-123');
    });

    it('should parse "books -l <id>"', () => {
      const result = parseCLI(['books', '-l', 'lib-123']);
      expect(result.command).toBe('books');
      expect(result.args.library).toBe('lib-123');
    });
  });

  describe('search command', () => {
    it('should parse "search <query>"', () => {
      const result = parseCLI(['search', 'hobbit']);
      expect(result.command).toBe('search');
      expect(result.args.query).toBe('hobbit');
    });

    it('should parse "search" with quoted query', () => {
      const result = parseCLI(['search', 'the lord of the rings']);
      expect(result.command).toBe('search');
      expect(result.args.query).toBe('the lord of the rings');
    });

    it('should error without query', () => {
      const result = parseCLI(['search']);
      expect(result.error).toBeDefined();
      expect(result.exitCode).toBe(2);
    });
  });

  describe('play command', () => {
    it('should parse "play <id>"', () => {
      const result = parseCLI(['play', 'book-123']);
      expect(result.command).toBe('play');
      expect(result.args.id).toBe('book-123');
    });

    it('should parse "play <id> --device <name>"', () => {
      const result = parseCLI(['play', 'book-123', '--device', 'Living Room']);
      expect(result.command).toBe('play');
      expect(result.args.id).toBe('book-123');
      expect(result.args.device).toBe('Living Room');
    });

    it('should parse "play <id> -d <name>"', () => {
      const result = parseCLI(['play', 'book-123', '-d', 'Kitchen']);
      expect(result.command).toBe('play');
      expect(result.args.id).toBe('book-123');
      expect(result.args.device).toBe('Kitchen');
    });

    it('should error without id', () => {
      const result = parseCLI(['play']);
      expect(result.error).toBeDefined();
      expect(result.exitCode).toBe(2);
    });
  });

  describe('resume command', () => {
    it('should parse "resume"', () => {
      const result = parseCLI(['resume']);
      expect(result.command).toBe('resume');
    });

    it('should parse "resume --device <name>"', () => {
      const result = parseCLI(['resume', '--device', 'Bedroom']);
      expect(result.command).toBe('resume');
      expect(result.args.device).toBe('Bedroom');
    });
  });

  describe('pause command', () => {
    it('should parse "pause"', () => {
      const result = parseCLI(['pause']);
      expect(result.command).toBe('pause');
    });
  });

  describe('stop command', () => {
    it('should parse "stop"', () => {
      const result = parseCLI(['stop']);
      expect(result.command).toBe('stop');
    });
  });

  describe('devices command', () => {
    it('should parse "devices"', () => {
      const result = parseCLI(['devices']);
      expect(result.command).toBe('devices');
    });

    it('should parse "devices --json"', () => {
      const result = parseCLI(['devices', '--json']);
      expect(result.command).toBe('devices');
      expect(result.flags.json).toBe(true);
    });
  });

  describe('device command', () => {
    it('should parse "device set <name>"', () => {
      const result = parseCLI(['device', 'set', 'Living Room']);
      expect(result.command).toBe('device');
      expect(result.subcommand).toBe('set');
      expect(result.args.name).toBe('Living Room');
    });

    it('should error on "device set" without name', () => {
      const result = parseCLI(['device', 'set']);
      expect(result.error).toBeDefined();
      expect(result.exitCode).toBe(2);
    });

    it('should error on "device" without subcommand', () => {
      const result = parseCLI(['device']);
      expect(result.error).toBeDefined();
      expect(result.exitCode).toBe(2);
    });
  });

  describe('sleep command', () => {
    it('should parse "sleep <minutes>"', () => {
      const result = parseCLI(['sleep', '30']);
      expect(result.command).toBe('sleep');
      expect(result.args.minutes).toBe(30);
    });

    it('should parse "sleep cancel"', () => {
      const result = parseCLI(['sleep', 'cancel']);
      expect(result.command).toBe('sleep');
      expect(result.subcommand).toBe('cancel');
    });

    it('should parse "sleep status"', () => {
      const result = parseCLI(['sleep', 'status']);
      expect(result.command).toBe('sleep');
      expect(result.subcommand).toBe('status');
    });

    it('should error on invalid minutes', () => {
      const result = parseCLI(['sleep', 'abc']);
      expect(result.error).toBeDefined();
      expect(result.exitCode).toBe(2);
    });

    it('should error on "sleep" without argument', () => {
      const result = parseCLI(['sleep']);
      expect(result.error).toBeDefined();
      expect(result.exitCode).toBe(2);
    });

    it('should parse "sleep <minutes> --fade <seconds>"', () => {
      const result = parseCLI(['sleep', '30', '--fade', '45']);
      expect(result.command).toBe('sleep');
      expect(result.args.minutes).toBe(30);
      expect(result.args.fade).toBe(45);
    });

    it('should parse "sleep <minutes> -f <seconds>"', () => {
      const result = parseCLI(['sleep', '30', '-f', '60']);
      expect(result.command).toBe('sleep');
      expect(result.args.minutes).toBe(30);
      expect(result.args.fade).toBe(60);
    });

    it('should use default fade of 30 seconds when not specified', () => {
      const result = parseCLI(['sleep', '30']);
      expect(result.args.fade).toBe(30);
    });
  });

  describe('status command', () => {
    it('should parse "status"', () => {
      const result = parseCLI(['status']);
      expect(result.command).toBe('status');
      expect(result.error).toBeUndefined();
      expect(result.exitCode).toBe(0);
    });

    it('should parse "status --json"', () => {
      const result = parseCLI(['status', '--json']);
      expect(result.command).toBe('status');
      expect(result.flags.json).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.exitCode).toBe(0);
    });
  });

  describe('service command', () => {
    it('should parse "service run"', () => {
      const result = parseCLI(['service', 'run']);
      expect(result.command).toBe('service');
      expect(result.subcommand).toBe('run');
      expect(result.error).toBeUndefined();
    });

    it('should parse "service start"', () => {
      const result = parseCLI(['service', 'start']);
      expect(result.command).toBe('service');
      expect(result.subcommand).toBe('start');
    });

    it('should parse "service stop"', () => {
      const result = parseCLI(['service', 'stop']);
      expect(result.command).toBe('service');
      expect(result.subcommand).toBe('stop');
    });

    it('should parse "service status"', () => {
      const result = parseCLI(['service', 'status']);
      expect(result.command).toBe('service');
      expect(result.subcommand).toBe('status');
    });

    it('should error on "service" without subcommand', () => {
      const result = parseCLI(['service']);
      expect(result.error).toBeDefined();
      expect(result.exitCode).toBe(2);
    });

    it('should error on "service invalid"', () => {
      const result = parseCLI(['service', 'invalid']);
      expect(result.error).toBeDefined();
      expect(result.exitCode).toBe(2);
    });
  });

  describe('unknown command', () => {
    it('should error on unknown command', () => {
      const result = parseCLI(['foobar']);
      expect(result.error).toBeDefined();
      expect(result.exitCode).toBe(2);
    });
  });

  describe('no command', () => {
    it('should show help when no command', () => {
      const result = parseCLI([]);
      expect(result.command).toBe('help');
    });
  });

  describe('exit codes', () => {
    it('should return exitCode 0 for valid commands', () => {
      const result = parseCLI(['library']);
      expect(result.exitCode).toBe(0);
    });

    it('should return exitCode 2 for usage errors', () => {
      const result = parseCLI(['play']);
      expect(result.exitCode).toBe(2);
    });
  });

  describe('environment variables', () => {
    it('should use ABS_SERVER from env', () => {
      process.env.ABS_SERVER = 'https://abs.example.com';
      const result = parseCLI(['library']);
      expect(result.config.server).toBe('https://abs.example.com');
    });

    it('should use ABS_TOKEN from env', () => {
      process.env.ABS_TOKEN = 'secret-token';
      const result = parseCLI(['library']);
      expect(result.config.token).toBe('secret-token');
    });

    it('should use ABS_DEVICE from env', () => {
      process.env.ABS_DEVICE = 'Living Room';
      const result = parseCLI(['play', 'book-123']);
      expect(result.config.device).toBe('Living Room');
    });

    it('should prefer flag over env for device', () => {
      process.env.ABS_DEVICE = 'Living Room';
      const result = parseCLI(['play', 'book-123', '--device', 'Kitchen']);
      expect(result.args.device).toBe('Kitchen');
    });
  });
});

describe('CLI result structure', () => {
  it('should have required properties', () => {
    const result = parseCLI(['library']);
    expect(result).toHaveProperty('command');
    expect(result).toHaveProperty('args');
    expect(result).toHaveProperty('flags');
    expect(result).toHaveProperty('config');
    expect(result).toHaveProperty('exitCode');
  });
});
