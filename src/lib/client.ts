/**
 * Audiobookshelf API client
 *
 * Implements REST API client for library browsing, search, and playback session management.
 * @see https://api.audiobookshelf.org/
 */

import type { AudiobookshelfConfig } from './config.js';
import type { Book, Library, PlaybackSession, Progress } from './types.js';

/**
 * Options for getStreamUrl
 */
interface StreamUrlOptions {
  /** Include authentication token in URL query string */
  includeToken?: boolean;
}

/**
 * Custom error for API errors
 */
export class AudiobookshelfApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string
  ) {
    super(`API error: ${String(status)} ${statusText}`);
    this.name = 'AudiobookshelfApiError';
  }
}

/**
 * Client for interacting with Audiobookshelf API
 */
export class AudiobookshelfClient {
  private readonly config: AudiobookshelfConfig;

  constructor(config: AudiobookshelfConfig) {
    this.config = config;
  }

  /**
   * Make an authenticated request to the Audiobookshelf API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.url}${endpoint}`;
    const existingHeaders = (options.headers as Record<string, string> | undefined) ?? {};
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      ...existingHeaders,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new AudiobookshelfApiError(response.status, response.statusText);
    }

    return response.json() as Promise<T>;
  }

  /**
   * List all libraries
   */
  async getLibraries(): Promise<Library[]> {
    const response = await this.request<{ libraries: Library[] }>(
      '/api/libraries'
    );
    return response.libraries;
  }

  /**
   * List books in a library
   */
  async getBooks(libraryId: string): Promise<Book[]> {
    interface LibraryItem {
      id: string;
      libraryId: string;
      media: {
        coverPath?: string;
        metadata: {
          title: string;
          authorName?: string;
          narratorName?: string;
        };
        duration: number;
      };
    }

    interface LibraryItemResponse {
      results: LibraryItem[];
    }

    const response = await this.request<LibraryItemResponse>(
      `/api/libraries/${libraryId}/items`
    );

    return response.results.map((item) => ({
      id: item.id,
      libraryId: item.libraryId,
      title: item.media.metadata.title,
      author: item.media.metadata.authorName,
      narrator: item.media.metadata.narratorName,
      duration: item.media.duration,
      coverPath: item.media.coverPath,
    }));
  }

  /**
   * Search within a library
   */
  async search(query: string, libraryId?: string): Promise<Book[]> {
    // If no libraryId provided, search first library
    if (!libraryId) {
      const libraries = await this.getLibraries();
      if (libraries.length === 0) {
        return [];
      }
      libraryId = libraries[0].id;
    }

    interface SearchResultItem {
      libraryItem: {
        id: string;
        libraryId: string;
        media: {
          coverPath?: string;
          metadata: {
            title: string;
            authorName?: string;
            narratorName?: string;
            authors?: { name: string }[];
            narrators?: string[];
          };
          duration: number;
        };
      };
    }

    interface SearchResponse {
      book?: SearchResultItem[];
    }

    const response = await this.request<SearchResponse>(
      `/api/libraries/${libraryId}/search?q=${encodeURIComponent(query)}`
    );

    const books = response.book ?? [];
    return books.map((item) => {
      const metadata = item.libraryItem.media.metadata;
      return {
        id: item.libraryItem.id,
        libraryId: item.libraryItem.libraryId,
        title: metadata.title,
        author: metadata.authorName ?? metadata.authors?.[0]?.name,
        narrator: metadata.narratorName ?? metadata.narrators?.[0],
        duration: item.libraryItem.media.duration,
        coverPath: item.libraryItem.media.coverPath,
      };
    });
  }

  /**
   * Get progress for a book
   */
  async getProgress(bookId: string): Promise<Progress | null> {
    interface ProgressResponse {
      progress: number;
      currentTime: number;
      duration: number;
      isFinished: boolean;
      lastUpdate: number;
    }

    try {
      const response = await this.request<ProgressResponse>(
        `/api/me/progress/${bookId}`
      );

      return {
        bookId,
        currentTime: response.currentTime,
        duration: response.duration,
        progress: response.progress,
        isFinished: response.isFinished,
        lastUpdate: response.lastUpdate,
      };
    } catch (error) {
      if (error instanceof AudiobookshelfApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update progress for a book
   */
  async updateProgress(bookId: string, currentTime: number): Promise<Progress> {
    interface ProgressResponse {
      progress: number;
      currentTime: number;
      duration: number;
      isFinished: boolean;
      lastUpdate: number;
    }

    const response = await this.request<ProgressResponse>(
      `/api/me/progress/${bookId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ currentTime }),
      }
    );

    return {
      bookId,
      currentTime: response.currentTime,
      duration: response.duration,
      progress: response.progress,
      isFinished: response.isFinished,
      lastUpdate: response.lastUpdate,
    };
  }

  /**
   * Start a playback session
   */
  async startSession(bookId: string): Promise<PlaybackSession> {
    interface SessionResponse {
      id: string;
      libraryItemId: string;
      currentTime: number;
      startedAt: number;
      deviceInfo?: {
        deviceId: string;
        deviceName: string;
      };
    }

    const response = await this.request<SessionResponse>(
      `/api/items/${bookId}/play`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      }
    );

    return {
      id: response.id,
      bookId: response.libraryItemId,
      currentTime: response.currentTime,
      startedAt: response.startedAt,
      deviceInfo: response.deviceInfo,
    };
  }

  /**
   * Sync and close a playback session
   * @param sessionId - The session ID to close
   * @param currentTime - Optional current playback time to sync before closing
   */
  async closeSession(sessionId: string, currentTime?: number): Promise<void> {
    const body = currentTime !== undefined ? { currentTime } : {};

    await this.request<Record<string, unknown>>(
      `/api/session/${sessionId}/close`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );
  }

  /**
   * Get audio stream URL for a book
   * @param bookId - The book ID
   * @param options - Optional settings
   * @returns The stream URL
   */
  getStreamUrl(bookId: string, options?: StreamUrlOptions): string {
    const baseUrl = `${this.config.url}/api/items/${bookId}/play`;

    if (options?.includeToken) {
      return `${baseUrl}?token=${this.config.apiKey}`;
    }

    return baseUrl;
  }
}
