/**
 * Audiobookshelf API client
 */

import type { AudiobookshelfConfig } from './config.js';
import type { Book, Library, PlaybackSession, Progress } from './types.js';

/**
 * Client for interacting with Audiobookshelf API
 */
export class AudiobookshelfClient {
  private readonly config: AudiobookshelfConfig;

  constructor(config: AudiobookshelfConfig) {
    this.config = config;
  }

  /**
   * List all libraries
   */
  async getLibraries(): Promise<Library[]> {
    // TODO: Implement in issue
    throw new Error('Not implemented');
  }

  /**
   * List books in a library
   */
  async getBooks(_libraryId: string): Promise<Book[]> {
    // TODO: Implement in issue
    throw new Error('Not implemented');
  }

  /**
   * Search across libraries
   */
  async search(_query: string): Promise<Book[]> {
    // TODO: Implement in issue
    throw new Error('Not implemented');
  }

  /**
   * Get progress for a book
   */
  async getProgress(_bookId: string): Promise<Progress | null> {
    // TODO: Implement in issue
    throw new Error('Not implemented');
  }

  /**
   * Update progress for a book
   */
  async updateProgress(
    _bookId: string,
    _currentTime: number
  ): Promise<Progress> {
    // TODO: Implement in issue
    throw new Error('Not implemented');
  }

  /**
   * Start a playback session
   */
  async startSession(_bookId: string): Promise<PlaybackSession> {
    // TODO: Implement in issue
    throw new Error('Not implemented');
  }

  /**
   * Sync and close a playback session
   */
  async closeSession(_sessionId: string): Promise<void> {
    // TODO: Implement in issue
    throw new Error('Not implemented');
  }

  /**
   * Get audio stream URL for a book
   */
  getStreamUrl(bookId: string): string {
    return `${this.config.url}/api/items/${bookId}/play`;
  }
}
