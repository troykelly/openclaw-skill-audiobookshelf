/**
 * Tests for Cast client with AUDIOBOOK_CHAPTER metadata
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

// Type for callbacks
type Callback = (err: Error | null, result?: unknown) => void;
type VoidCallback = (err?: Error | null) => void;

// Create mock classes
class MockPlayer extends EventEmitter {
  load = vi.fn(
    (_media: unknown, _options: unknown, callback: Callback): void => {
      setTimeout(() => { callback(null); }, 0);
    }
  );
  play = vi.fn((callback: VoidCallback): void => {
    setTimeout(() => { callback(null); }, 0);
  });
  pause = vi.fn((callback: VoidCallback): void => {
    setTimeout(() => { callback(null); }, 0);
  });
  stop = vi.fn((callback: VoidCallback): void => {
    setTimeout(() => { callback(null); }, 0);
  });
  seek = vi.fn((_time: number, callback: VoidCallback): void => {
    setTimeout(() => { callback(null); }, 0);
  });
  getStatus = vi.fn((callback: Callback): void => {
    setTimeout(
      () =>
        { callback(null, {
          currentTime: 120,
          playerState: 'PLAYING',
          volume: { level: 0.8, muted: false },
        }); },
      0
    );
  });
}

class MockClient extends EventEmitter {
  connected = false;
  player: MockPlayer | null = null;

  connect = vi.fn((_options: unknown, callback: VoidCallback): void => {
    this.connected = true;
    setTimeout(() => { callback(); }, 0);
  });

  launch = vi.fn((_receiver: unknown, callback: Callback): void => {
    this.player = new MockPlayer();
    setTimeout(() => { callback(null, this.player); }, 0);
  });

  close = vi.fn((): void => {
    this.connected = false;
  });

  setVolume = vi.fn((vol: unknown, callback: Callback): void => {
    setTimeout(() => { callback(null, vol); }, 0);
  });

  getVolume = vi.fn((callback: Callback): void => {
    setTimeout(() => { callback(null, { level: 0.8, muted: false }); }, 0);
  });
}

let mockClientInstance: MockClient | null = null;

// Mock castv2-client
vi.mock('castv2-client', () => {
  return {
    Client: vi.fn(() => {
      mockClientInstance = new MockClient();
      return mockClientInstance;
    }),
    DefaultMediaReceiver: vi.fn(),
  };
});

import {
  CastClient,
  type MediaLoadOptions,
} from '../src/cast/client.js';
import { MetadataType } from '../src/cast/types.js';
import type { CastDevice } from '../src/cast/types.js';

describe('CastClient', () => {
  let castClient: CastClient;
  const testDevice: CastDevice = {
    name: 'Living Room Speaker',
    host: '192.168.1.100',
    port: 8009,
    id: 'device-1',
  };

  beforeEach(() => {
    vi.useFakeTimers();
    castClient = new CastClient();
    mockClientInstance = null;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect to a Cast device', async () => {
      const connectPromise = castClient.connect(testDevice);
      await vi.advanceTimersByTimeAsync(10);
      await connectPromise;

      expect(mockClientInstance?.connect).toHaveBeenCalledWith(
        { host: testDevice.host, port: testDevice.port },
        expect.any(Function)
      );
      expect(castClient.isConnected()).toBe(true);
    });

    it('should store connected device info', async () => {
      const connectPromise = castClient.connect(testDevice);
      await vi.advanceTimersByTimeAsync(10);
      await connectPromise;

      expect(castClient.getConnectedDevice()).toEqual(testDevice);
    });

    it('should disconnect existing connection before new connect', async () => {
      // First connection
      const connectPromise1 = castClient.connect(testDevice);
      await vi.advanceTimersByTimeAsync(10);
      await connectPromise1;

      const firstClient = mockClientInstance;

      // Second connection
      const connectPromise2 = castClient.connect({
        ...testDevice,
        host: '192.168.1.101',
      });
      await vi.advanceTimersByTimeAsync(10);
      await connectPromise2;

      expect(firstClient?.close).toHaveBeenCalled();
    });

    it('should handle connection errors via event emitter', async () => {
      // Connect first
      const connectPromise = castClient.connect(testDevice);
      await vi.advanceTimersByTimeAsync(10);
      await connectPromise;

      // Set up error handler
      const errorHandler = vi.fn();
      castClient.on('error', errorHandler);

      // Simulate an error from the Cast client
      mockClientInstance?.emit('error', new Error('Connection lost'));

      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
      expect(castClient.isConnected()).toBe(false);
    });
  });

  describe('loadMedia', () => {
    beforeEach(async () => {
      const connectPromise = castClient.connect(testDevice);
      await vi.advanceTimersByTimeAsync(100);
      await connectPromise;
    });

    it('should load media with AUDIOBOOK_CHAPTER metadata type', async () => {
      const options: MediaLoadOptions = {
        url: 'https://example.com/audio.mp3',
        contentType: 'audio/mpeg',
        title: 'The Hobbit',
        author: 'J.R.R. Tolkien',
        chapterTitle: 'An Unexpected Party',
        chapterNumber: 1,
        coverUrl: 'https://example.com/cover.jpg',
      };

      const loadPromise = castClient.loadMedia(options);
      await vi.advanceTimersByTimeAsync(100);
      await loadPromise;

      expect(mockClientInstance?.player?.load).toHaveBeenCalledWith(
        expect.objectContaining({
          contentId: options.url,
          contentType: 'audio/mpeg',
          streamType: 'BUFFERED',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          metadata: expect.objectContaining({
            metadataType: MetadataType.AUDIOBOOK_CHAPTER, // 4
            title: 'The Hobbit',
            subtitle: 'J.R.R. Tolkien',
            bookTitle: 'The Hobbit',
            chapterTitle: 'An Unexpected Party',
            chapterNumber: 1,
            images: [{ url: 'https://example.com/cover.jpg' }],
          }),
        }),
        expect.objectContaining({ autoplay: true }),
        expect.any(Function)
      );
    });

    it('should resume from position when specified', async () => {
      const options: MediaLoadOptions = {
        url: 'https://example.com/audio.mp3',
        contentType: 'audio/mpeg',
        title: 'The Hobbit',
        resumePosition: 300, // Resume at 5 minutes
      };

      const loadPromise = castClient.loadMedia(options);
      await vi.advanceTimersByTimeAsync(100);
      await loadPromise;

      expect(mockClientInstance?.player?.load).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          autoplay: true,
          currentTime: 300,
        }),
        expect.any(Function)
      );
    });

    it('should handle missing optional metadata', async () => {
      const options: MediaLoadOptions = {
        url: 'https://example.com/audio.mp3',
        contentType: 'audio/mpeg',
        title: 'Simple Audio',
      };

      const loadPromise = castClient.loadMedia(options);
      await vi.advanceTimersByTimeAsync(100);
      await loadPromise;

      expect(mockClientInstance?.player?.load).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          metadata: expect.objectContaining({
            metadataType: MetadataType.AUDIOBOOK_CHAPTER,
            images: [], // Empty when no cover
          }),
        }),
        expect.anything(),
        expect.anything()
      );
    });

    it('should throw if not connected', async () => {
      const disconnectedClient = new CastClient();

      await expect(
        disconnectedClient.loadMedia({
          url: 'https://example.com/audio.mp3',
          contentType: 'audio/mpeg',
          title: 'Test',
        })
      ).rejects.toThrow('Not connected');
    });
  });

  describe('playback controls', () => {
    beforeEach(async () => {
      const connectPromise = castClient.connect(testDevice);
      await vi.advanceTimersByTimeAsync(100);
      await connectPromise;

      const loadPromise = castClient.loadMedia({
        url: 'https://example.com/audio.mp3',
        contentType: 'audio/mpeg',
        title: 'Test',
      });
      await vi.advanceTimersByTimeAsync(100);
      await loadPromise;
    });

    it('should pause playback', async () => {
      const pausePromise = castClient.pause();
      await vi.advanceTimersByTimeAsync(10);
      await pausePromise;

      expect(mockClientInstance?.player?.pause).toHaveBeenCalled();
    });

    it('should resume playback', async () => {
      const playPromise = castClient.play();
      await vi.advanceTimersByTimeAsync(10);
      await playPromise;

      expect(mockClientInstance?.player?.play).toHaveBeenCalled();
    });

    it('should stop playback', async () => {
      const stopPromise = castClient.stop();
      await vi.advanceTimersByTimeAsync(10);
      await stopPromise;

      expect(mockClientInstance?.player?.stop).toHaveBeenCalled();
    });

    it('should seek to position', async () => {
      const seekPromise = castClient.seek(600); // Seek to 10 minutes
      await vi.advanceTimersByTimeAsync(10);
      await seekPromise;

      expect(mockClientInstance?.player?.seek).toHaveBeenCalledWith(
        600,
        expect.any(Function)
      );
    });
  });

  describe('getStatus', () => {
    beforeEach(async () => {
      const connectPromise = castClient.connect(testDevice);
      await vi.advanceTimersByTimeAsync(100);
      await connectPromise;

      const loadPromise = castClient.loadMedia({
        url: 'https://example.com/audio.mp3',
        contentType: 'audio/mpeg',
        title: 'Test',
      });
      await vi.advanceTimersByTimeAsync(100);
      await loadPromise;
    });

    it('should return current playback status', async () => {
      const statusPromise = castClient.getStatus();
      await vi.advanceTimersByTimeAsync(10);
      const status = await statusPromise;

      expect(status).toEqual(
        expect.objectContaining({
          currentTime: 120,
          playerState: 'PLAYING',
        })
      );
    });

    it('should return null when not playing', async () => {
      const disconnectedClient = new CastClient();
      const status = await disconnectedClient.getStatus();
      expect(status).toBeNull();
    });
  });

  describe('disconnect', () => {
    it('should disconnect and clean up state', async () => {
      const connectPromise = castClient.connect(testDevice);
      await vi.advanceTimersByTimeAsync(10);
      await connectPromise;

      castClient.disconnect();

      expect(mockClientInstance?.close).toHaveBeenCalled();
      expect(castClient.isConnected()).toBe(false);
      expect(castClient.getConnectedDevice()).toBeNull();
    });
  });

  describe('connection events', () => {
    it('should emit connected event on successful connection', async () => {
      const connectedHandler = vi.fn();
      castClient.on('connected', connectedHandler);

      const connectPromise = castClient.connect(testDevice);
      await vi.advanceTimersByTimeAsync(10);
      await connectPromise;

      expect(connectedHandler).toHaveBeenCalledWith(testDevice);
    });

    it('should emit disconnected event on disconnect', async () => {
      const connectPromise = castClient.connect(testDevice);
      await vi.advanceTimersByTimeAsync(10);
      await connectPromise;

      const disconnectedHandler = vi.fn();
      castClient.on('disconnected', disconnectedHandler);

      castClient.disconnect();

      expect(disconnectedHandler).toHaveBeenCalled();
    });
  });
});
