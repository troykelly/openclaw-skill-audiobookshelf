/**
 * Core types for Audiobookshelf integration
 */

/**
 * Audiobookshelf library
 */
export interface Library {
  id: string;
  name: string;
  folders: string[];
  icon: string;
  mediaType: 'book' | 'podcast';
}

/**
 * Audiobook/podcast item
 */
export interface Book {
  id: string;
  libraryId: string;
  title: string;
  author?: string;
  narrator?: string;
  duration: number;
  coverPath?: string;
}

/**
 * User progress for a book
 */
export interface Progress {
  bookId: string;
  currentTime: number;
  duration: number;
  progress: number; // 0-1
  isFinished: boolean;
  lastUpdate: number;
}

/**
 * Active playback session
 */
export interface PlaybackSession {
  id: string;
  bookId: string;
  currentTime: number;
  startedAt: number;
  deviceInfo?: {
    deviceId: string;
    deviceName: string;
  };
}

/**
 * Google Cast device
 */
export interface CastDevice {
  name: string;
  host: string;
  port: number;
  id?: string;
}
