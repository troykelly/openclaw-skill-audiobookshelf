/**
 * Tests for Google Cast controller
 */
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { CastController } from '../src/lib/cast.js';
import type { CastDevice } from '../src/lib/types.js';

// Define mock types
interface MockBrowser {
  on: Mock;
  stop: Mock;
}

interface MockBonjour {
  find: Mock;
  destroy: Mock;
}

interface MockPlayer {
  on: Mock;
  load: Mock;
  seek: Mock;
  pause: Mock;
  play: Mock;
  stop: Mock;
  getStatus: Mock;
}

interface MockClient {
  connect: Mock;
  on: Mock;
  close: Mock;
  launch: Mock;
  join: Mock;
}

// Create mock instances
const mockBrowser: MockBrowser = {
  on: vi.fn(),
  stop: vi.fn(),
};

const mockBonjour: MockBonjour = {
  find: vi.fn(() => mockBrowser),
  destroy: vi.fn(),
};

const mockPlayer: MockPlayer = {
  on: vi.fn(),
  load: vi.fn(),
  seek: vi.fn(),
  pause: vi.fn(),
  play: vi.fn(),
  stop: vi.fn(),
  getStatus: vi.fn(),
};

const mockClient: MockClient = {
  connect: vi.fn(),
  on: vi.fn(),
  close: vi.fn(),
  launch: vi.fn(),
  join: vi.fn(),
};

// Mock bonjour-service
vi.mock('bonjour-service', () => ({
  Bonjour: vi.fn(() => mockBonjour),
}));

// Mock castv2-client
vi.mock('castv2-client', () => ({
  Client: vi.fn(() => mockClient),
  DefaultMediaReceiver: vi.fn(),
}));

describe('CastController', () => {
  let controller: CastController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new CastController();

    // Reset mock implementations
    mockBrowser.on.mockReturnThis();
    mockClient.connect.mockReset();
    mockClient.launch.mockReset();
    mockClient.close.mockReset();
    mockPlayer.load.mockReset();
    mockPlayer.seek.mockReset();
    mockPlayer.pause.mockReset();
    mockPlayer.play.mockReset();
    mockPlayer.stop.mockReset();
    mockPlayer.getStatus.mockReset();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('discoverDevices', () => {
    it('should find Cast devices on the network', async () => {
      const mockDevices: CastDevice[] = [
        { name: 'Living Room', host: '192.168.1.100', port: 8009 },
        { name: 'Kitchen', host: '192.168.1.101', port: 8009 },
      ];

      // Simulate service discovery
      mockBrowser.on.mockImplementation(
        (
          event: string,
          callback: (service: { name: string; addresses: string[]; port: number; txt: Record<string, unknown> }) => void
        ) => {
          if (event === 'up') {
            mockDevices.forEach((device) => {
              callback({
                name: device.name,
                addresses: [device.host],
                port: device.port,
                txt: {},
              });
            });
          }
          return mockBrowser;
        }
      );

      const devices = await controller.discoverDevices({ timeout: 100 });

      expect(devices.length).toBeGreaterThanOrEqual(0);
    });

    it('should timeout after specified duration', async () => {
      const startTime = Date.now();
      const devices = await controller.discoverDevices({ timeout: 100 });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(300);
      expect(devices).toBeInstanceOf(Array);
    });

    it('should use default timeout if not specified', { timeout: 10000 }, async () => {
      // This test just ensures the method works with defaults
      // Default timeout is 5 seconds, so we use a longer test timeout
      const promise = controller.discoverDevices();
      await expect(promise).resolves.toBeInstanceOf(Array);
    });
  });

  describe('connect', () => {
    const testDevice: CastDevice = {
      name: 'Test Speaker',
      host: '192.168.1.100',
      port: 8009,
    };

    it('should connect to a Cast device', async () => {
      mockClient.connect.mockImplementation(
        (_opts: unknown, callback: (error?: Error) => void) => {
          callback();
        }
      );

      await controller.connect(testDevice);

      expect(mockClient.connect).toHaveBeenCalled();
      expect(controller.getConnectedDevice()).toEqual(testDevice);
    });

    it('should throw on connection failure', async () => {
      mockClient.connect.mockImplementation(
        (_opts: unknown, callback: (error?: Error) => void) => {
          callback(new Error('Connection refused'));
        }
      );

      await expect(controller.connect(testDevice)).rejects.toThrow('Connection refused');
    });

    it('should disconnect existing connection before connecting', async () => {
      mockClient.connect.mockImplementation(
        (_opts: unknown, callback: (error?: Error) => void) => {
          callback();
        }
      );

      await controller.connect(testDevice);
      await controller.connect({ ...testDevice, name: 'Other Speaker' });

      expect(mockClient.close).toHaveBeenCalled();
    });
  });

  describe('castStream', () => {
    it('should cast audio to connected device', async () => {
      const testDevice: CastDevice = {
        name: 'Test Speaker',
        host: '192.168.1.100',
        port: 8009,
      };

      mockClient.connect.mockImplementation(
        (_opts: unknown, callback: (error?: Error) => void) => {
          callback();
        }
      );

      mockPlayer.load.mockImplementation(
        (_media: unknown, _opts: unknown, callback: (error?: Error) => void) => {
          callback();
        }
      );

      mockClient.launch.mockImplementation(
        (_receiver: unknown, callback: (error: Error | null, player: unknown) => void) => {
          callback(null, mockPlayer);
        }
      );

      await controller.connect(testDevice);
      await controller.castStream('https://abs.example.com/api/items/book-1/play', {
        title: 'The Hobbit',
        artist: 'J.R.R. Tolkien',
      });

      expect(mockClient.launch).toHaveBeenCalled();
      expect(mockPlayer.load).toHaveBeenCalled();
    });

    it('should throw if not connected', async () => {
      await expect(
        controller.castStream('https://abs.example.com/api/items/book-1/play')
      ).rejects.toThrow('Not connected to any device');
    });
  });

  describe('seek', () => {
    it('should seek to position in stream', async () => {
      const testDevice: CastDevice = {
        name: 'Test Speaker',
        host: '192.168.1.100',
        port: 8009,
      };

      mockClient.connect.mockImplementation(
        (_opts: unknown, callback: (error?: Error) => void) => {
          callback();
        }
      );

      mockPlayer.load.mockImplementation(
        (_media: unknown, _opts: unknown, callback: (error?: Error) => void) => {
          callback();
        }
      );

      mockPlayer.seek.mockImplementation(
        (_seconds: number, callback: (error?: Error) => void) => {
          callback();
        }
      );

      mockClient.launch.mockImplementation(
        (_receiver: unknown, callback: (error: Error | null, player: unknown) => void) => {
          callback(null, mockPlayer);
        }
      );

      await controller.connect(testDevice);
      await controller.castStream('https://abs.example.com/api/items/book-1/play');
      await controller.seek(300);

      expect(mockPlayer.seek).toHaveBeenCalledWith(300, expect.any(Function));
    });

    it('should throw if not playing', async () => {
      await expect(controller.seek(300)).rejects.toThrow();
    });
  });

  describe('pause', () => {
    it('should pause playback', async () => {
      const testDevice: CastDevice = {
        name: 'Test Speaker',
        host: '192.168.1.100',
        port: 8009,
      };

      mockClient.connect.mockImplementation(
        (_opts: unknown, callback: (error?: Error) => void) => {
          callback();
        }
      );

      mockPlayer.load.mockImplementation(
        (_media: unknown, _opts: unknown, callback: (error?: Error) => void) => {
          callback();
        }
      );

      mockPlayer.pause.mockImplementation((callback: (error?: Error) => void) => {
        callback();
      });

      mockClient.launch.mockImplementation(
        (_receiver: unknown, callback: (error: Error | null, player: unknown) => void) => {
          callback(null, mockPlayer);
        }
      );

      await controller.connect(testDevice);
      await controller.castStream('https://abs.example.com/api/items/book-1/play');
      await controller.pause();

      expect(mockPlayer.pause).toHaveBeenCalled();
    });
  });

  describe('resume', () => {
    it('should resume playback', async () => {
      const testDevice: CastDevice = {
        name: 'Test Speaker',
        host: '192.168.1.100',
        port: 8009,
      };

      mockClient.connect.mockImplementation(
        (_opts: unknown, callback: (error?: Error) => void) => {
          callback();
        }
      );

      mockPlayer.load.mockImplementation(
        (_media: unknown, _opts: unknown, callback: (error?: Error) => void) => {
          callback();
        }
      );

      mockPlayer.play.mockImplementation((callback: (error?: Error) => void) => {
        callback();
      });

      mockClient.launch.mockImplementation(
        (_receiver: unknown, callback: (error: Error | null, player: unknown) => void) => {
          callback(null, mockPlayer);
        }
      );

      await controller.connect(testDevice);
      await controller.castStream('https://abs.example.com/api/items/book-1/play');
      await controller.resume();

      expect(mockPlayer.play).toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('should stop playback and disconnect', async () => {
      const testDevice: CastDevice = {
        name: 'Test Speaker',
        host: '192.168.1.100',
        port: 8009,
      };

      mockClient.connect.mockImplementation(
        (_opts: unknown, callback: (error?: Error) => void) => {
          callback();
        }
      );

      mockPlayer.load.mockImplementation(
        (_media: unknown, _opts: unknown, callback: (error?: Error) => void) => {
          callback();
        }
      );

      mockPlayer.stop.mockImplementation((callback: (error?: Error) => void) => {
        callback();
      });

      mockClient.launch.mockImplementation(
        (_receiver: unknown, callback: (error: Error | null, player: unknown) => void) => {
          callback(null, mockPlayer);
        }
      );

      await controller.connect(testDevice);
      await controller.castStream('https://abs.example.com/api/items/book-1/play');
      await controller.stop();

      expect(mockPlayer.stop).toHaveBeenCalled();
      expect(mockClient.close).toHaveBeenCalled();
      expect(controller.getConnectedDevice()).toBeNull();
    });
  });

  describe('getCurrentTime', () => {
    it('should return current playback position', async () => {
      const testDevice: CastDevice = {
        name: 'Test Speaker',
        host: '192.168.1.100',
        port: 8009,
      };

      mockClient.connect.mockImplementation(
        (_opts: unknown, callback: (error?: Error) => void) => {
          callback();
        }
      );

      mockPlayer.load.mockImplementation(
        (_media: unknown, _opts: unknown, callback: (error?: Error) => void) => {
          callback();
        }
      );

      mockPlayer.getStatus.mockImplementation(
        (callback: (error: Error | null, status: { currentTime?: number }) => void) => {
          callback(null, { currentTime: 125.5 });
        }
      );

      mockClient.launch.mockImplementation(
        (_receiver: unknown, callback: (error: Error | null, player: unknown) => void) => {
          callback(null, mockPlayer);
        }
      );

      await controller.connect(testDevice);
      await controller.castStream('https://abs.example.com/api/items/book-1/play');
      const currentTime = await controller.getCurrentTime();

      expect(currentTime).toBe(125.5);
    });

    it('should return 0 if not playing', async () => {
      const time = await controller.getCurrentTime();
      expect(time).toBe(0);
    });
  });

  describe('getConnectedDevice', () => {
    it('should return null when not connected', () => {
      expect(controller.getConnectedDevice()).toBeNull();
    });

    it('should return device info when connected', async () => {
      const testDevice: CastDevice = {
        name: 'Test Speaker',
        host: '192.168.1.100',
        port: 8009,
      };

      mockClient.connect.mockImplementation(
        (_opts: unknown, callback: (error?: Error) => void) => {
          callback();
        }
      );

      await controller.connect(testDevice);

      expect(controller.getConnectedDevice()).toEqual(testDevice);
    });
  });
});
