/**
 * Tests for Cast module types and imports
 *
 * Validates that castv2-client and bonjour-service are properly integrated
 * and types are correctly exported.
 */
import { describe, it, expect } from 'vitest';
import {
  // Types
  type CastDevice,
  type AudiobookChapterMetadata,
  type CastMediaInfo,
  type CastMediaStatus,
  type CastLoadOptions,
  type CastVolume,
  type DiscoveryOptions,
  type StreamMetadata,
  type CastConnectionEvent,
  // Enums
  MetadataType,
  StreamType,
  PlayerState,
  IdleReason,
  ConnectionState,
  // Re-exports
  Client,
  DefaultMediaReceiver,
  Bonjour,
} from '../src/cast/index.js';

describe('Cast module', () => {
  describe('type exports', () => {
    it('should export CastDevice type', () => {
      const device: CastDevice = {
        name: 'Living Room Speaker',
        host: '192.168.1.100',
        port: 8009,
        id: 'abc123',
      };
      expect(device.name).toBe('Living Room Speaker');
      expect(device.host).toBe('192.168.1.100');
      expect(device.port).toBe(8009);
    });

    it('should export AudiobookChapterMetadata type', () => {
      const metadata: AudiobookChapterMetadata = {
        metadataType: MetadataType.AUDIOBOOK_CHAPTER,
        title: 'The Hobbit',
        bookTitle: 'The Hobbit',
        chapterTitle: 'Chapter 1: An Unexpected Party',
        chapterNumber: 1,
        images: [{ url: 'https://example.com/cover.jpg' }],
      };
      expect(metadata.metadataType).toBe(4);
      expect(metadata.title).toBe('The Hobbit');
    });

    it('should export CastMediaInfo type', () => {
      const media: CastMediaInfo = {
        contentId: 'https://example.com/audio.mp3',
        contentType: 'audio/mpeg',
        streamType: StreamType.BUFFERED,
        duration: 3600,
        metadata: {
          metadataType: MetadataType.AUDIOBOOK_CHAPTER,
          title: 'Test Book',
        },
      };
      expect(media.contentId).toBe('https://example.com/audio.mp3');
      expect(media.streamType).toBe('BUFFERED');
    });

    it('should export CastMediaStatus type', () => {
      const status: CastMediaStatus = {
        currentTime: 120.5,
        playerState: PlayerState.PLAYING,
        volume: { level: 0.8, muted: false },
      };
      expect(status.currentTime).toBe(120.5);
      expect(status.playerState).toBe('PLAYING');
    });

    it('should export CastLoadOptions type', () => {
      const options: CastLoadOptions = {
        autoplay: true,
        currentTime: 300,
      };
      expect(options.autoplay).toBe(true);
      expect(options.currentTime).toBe(300);
    });

    it('should export CastVolume type', () => {
      const volume: CastVolume = {
        level: 0.5,
        muted: false,
      };
      expect(volume.level).toBe(0.5);
      expect(volume.muted).toBe(false);
    });

    it('should export DiscoveryOptions type', () => {
      const options: DiscoveryOptions = {
        timeout: 10000,
      };
      expect(options.timeout).toBe(10000);
    });

    it('should export StreamMetadata type', () => {
      const metadata: StreamMetadata = {
        title: 'The Lord of the Rings',
        artist: 'J.R.R. Tolkien',
        chapterTitle: 'The Shadow of the Past',
        chapterNumber: 2,
        coverUrl: 'https://example.com/lotr.jpg',
      };
      expect(metadata.title).toBe('The Lord of the Rings');
    });

    it('should export CastConnectionEvent type', () => {
      const event: CastConnectionEvent = {
        state: ConnectionState.CONNECTED,
        device: {
          name: 'Kitchen Display',
          host: '192.168.1.101',
          port: 8009,
        },
      };
      expect(event.state).toBe('CONNECTED');
      expect(event.device?.name).toBe('Kitchen Display');
    });
  });

  describe('enum exports', () => {
    it('should export MetadataType enum with correct values', () => {
      expect(MetadataType.GENERIC).toBe(0);
      expect(MetadataType.MOVIE).toBe(1);
      expect(MetadataType.TV_SHOW).toBe(2);
      expect(MetadataType.MUSIC_TRACK).toBe(3);
      expect(MetadataType.AUDIOBOOK_CHAPTER).toBe(4);
      expect(MetadataType.PHOTO).toBe(5);
    });

    it('should export StreamType enum with correct values', () => {
      expect(StreamType.UNKNOWN).toBe('UNKNOWN');
      expect(StreamType.BUFFERED).toBe('BUFFERED');
      expect(StreamType.LIVE).toBe('LIVE');
    });

    it('should export PlayerState enum with correct values', () => {
      expect(PlayerState.IDLE).toBe('IDLE');
      expect(PlayerState.PLAYING).toBe('PLAYING');
      expect(PlayerState.PAUSED).toBe('PAUSED');
      expect(PlayerState.BUFFERING).toBe('BUFFERING');
    });

    it('should export IdleReason enum with correct values', () => {
      expect(IdleReason.CANCELLED).toBe('CANCELLED');
      expect(IdleReason.INTERRUPTED).toBe('INTERRUPTED');
      expect(IdleReason.FINISHED).toBe('FINISHED');
      expect(IdleReason.ERROR).toBe('ERROR');
    });

    it('should export ConnectionState enum with correct values', () => {
      expect(ConnectionState.DISCONNECTED).toBe('DISCONNECTED');
      expect(ConnectionState.CONNECTING).toBe('CONNECTING');
      expect(ConnectionState.CONNECTED).toBe('CONNECTED');
      expect(ConnectionState.LAUNCHING).toBe('LAUNCHING');
      expect(ConnectionState.PLAYING).toBe('PLAYING');
    });
  });

  describe('castv2-client re-exports', () => {
    it('should export Client class', () => {
      expect(Client).toBeDefined();
      expect(typeof Client).toBe('function');
    });

    it('should export DefaultMediaReceiver class', () => {
      expect(DefaultMediaReceiver).toBeDefined();
      expect(typeof DefaultMediaReceiver).toBe('function');
    });
  });

  describe('bonjour-service re-exports', () => {
    it('should export Bonjour class', () => {
      expect(Bonjour).toBeDefined();
      expect(typeof Bonjour).toBe('function');
    });

    it('should be able to instantiate Bonjour', () => {
      const bonjour = new Bonjour();
      expect(bonjour).toBeDefined();
      // Clean up
      bonjour.destroy();
    });
  });
});
