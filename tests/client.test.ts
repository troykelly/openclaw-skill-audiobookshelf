/**
 * Tests for Audiobookshelf API client
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudiobookshelfClient } from '../src/lib/client.js';
import type { AudiobookshelfConfig } from '../src/lib/config.js';
import type { Library, Book, Progress, PlaybackSession } from '../src/lib/types.js';

// Mock fetch globally
const mockFetch = vi.fn<typeof fetch>();

describe('AudiobookshelfClient', () => {
  let client: AudiobookshelfClient;
  const config: AudiobookshelfConfig = {
    url: 'https://abs.example.com',
    apiKey: 'test-api-key',
    timeout: 5000,
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    client = new AudiobookshelfClient(config);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('getLibraries', () => {
    it('should return a list of libraries', async () => {
      const mockLibraries: Library[] = [
        {
          id: 'lib-1',
          name: 'Audiobooks',
          folders: ['/audiobooks'],
          icon: 'book',
          mediaType: 'book',
        },
        {
          id: 'lib-2',
          name: 'Podcasts',
          folders: ['/podcasts'],
          icon: 'podcast',
          mediaType: 'podcast',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ libraries: mockLibraries }),
      } as Response);

      const result: Library[] = await client.getLibraries();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://abs.example.com/api/libraries',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }) as Record<string, string>,
        })
      );
      expect(result).toEqual(mockLibraries);
    });

    it('should throw on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response);

      await expect(client.getLibraries()).rejects.toThrow('API error: 401 Unauthorized');
    });

    it('should throw on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      await expect(client.getLibraries()).rejects.toThrow('Network failure');
    });
  });

  describe('getBooks', () => {
    it('should return books from a library', async () => {
      const mockBooks: Book[] = [
        {
          id: 'book-1',
          libraryId: 'lib-1',
          title: 'The Hobbit',
          author: 'J.R.R. Tolkien',
          narrator: 'Martin Freeman',
          duration: 39600,
          coverPath: '/covers/hobbit.jpg',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            results: mockBooks.map((b) => ({
              libraryItem: {
                id: b.id,
                media: {
                  metadata: {
                    title: b.title,
                    authorName: b.author,
                    narratorName: b.narrator,
                  },
                  duration: b.duration,
                },
                libraryId: b.libraryId,
                coverPath: b.coverPath,
              },
            })),
          }),
      } as Response);

      const result: Book[] = await client.getBooks('lib-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://abs.example.com/api/libraries/lib-1/items',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }) as Record<string, string>,
        })
      );
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('The Hobbit');
    });

    it('should throw on invalid library ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      await expect(client.getBooks('invalid-id')).rejects.toThrow('API error: 404 Not Found');
    });
  });

  describe('search', () => {
    it('should search across libraries', async () => {
      const mockBooks: Book[] = [
        {
          id: 'book-1',
          libraryId: 'lib-1',
          title: 'Harry Potter',
          author: 'J.K. Rowling',
          duration: 28800,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            book: mockBooks.map((b) => ({
              libraryItem: {
                id: b.id,
                media: {
                  metadata: {
                    title: b.title,
                    authorName: b.author,
                  },
                  duration: b.duration,
                },
                libraryId: b.libraryId,
              },
            })),
          }),
      } as Response);

      const result: Book[] = await client.search('harry');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search') as string,
        expect.anything()
      );
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Harry Potter');
    });

    it('should return empty array for no results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ book: [] }),
      } as Response);

      const result: Book[] = await client.search('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('getProgress', () => {
    it('should return progress for a book', async () => {
      const mockProgress: Progress = {
        bookId: 'book-1',
        currentTime: 1800,
        duration: 39600,
        progress: 0.045,
        isFinished: false,
        lastUpdate: Date.now(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            progress: mockProgress.progress,
            currentTime: mockProgress.currentTime,
            duration: mockProgress.duration,
            isFinished: mockProgress.isFinished,
            lastUpdate: mockProgress.lastUpdate,
          }),
      } as Response);

      const result: Progress | null = await client.getProgress('book-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://abs.example.com/api/me/progress/book-1',
        expect.anything()
      );
      expect(result).not.toBeNull();
      expect(result?.currentTime).toBe(1800);
    });

    it('should return null for no progress', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const result: Progress | null = await client.getProgress('new-book');

      expect(result).toBeNull();
    });
  });

  describe('updateProgress', () => {
    it('should update progress for a book', async () => {
      const mockProgress: Progress = {
        bookId: 'book-1',
        currentTime: 3600,
        duration: 39600,
        progress: 0.09,
        isFinished: false,
        lastUpdate: Date.now(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            progress: mockProgress.progress,
            currentTime: mockProgress.currentTime,
            duration: mockProgress.duration,
            isFinished: mockProgress.isFinished,
            lastUpdate: mockProgress.lastUpdate,
          }),
      } as Response);

      const result: Progress = await client.updateProgress('book-1', 3600);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://abs.example.com/api/me/progress/book-1',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('"currentTime":3600') as string,
        })
      );
      expect(result.currentTime).toBe(3600);
    });
  });

  describe('startSession', () => {
    it('should start a playback session', async () => {
      const mockSession: PlaybackSession = {
        id: 'session-1',
        bookId: 'book-1',
        currentTime: 0,
        startedAt: Date.now(),
        deviceInfo: {
          deviceId: 'device-1',
          deviceName: 'Living Room Speaker',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: mockSession.id,
            libraryItemId: mockSession.bookId,
            currentTime: mockSession.currentTime,
            startedAt: mockSession.startedAt,
            deviceInfo: mockSession.deviceInfo,
          }),
      } as Response);

      const result: PlaybackSession = await client.startSession('book-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://abs.example.com/api/items/book-1/play',
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(result.id).toBe('session-1');
      expect(result.bookId).toBe('book-1');
    });
  });

  describe('closeSession', () => {
    it('should close a playback session', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      await client.closeSession('session-1');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://abs.example.com/api/session/session-1/close',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should sync progress before closing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      await client.closeSession('session-1', 1800);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/close') as string,
        expect.objectContaining({
          body: expect.stringContaining('"currentTime":1800') as string,
        })
      );
    });
  });

  describe('getStreamUrl', () => {
    it('should return the correct stream URL', () => {
      const url: string = client.getStreamUrl('book-1');

      expect(url).toBe('https://abs.example.com/api/items/book-1/play');
    });

    it('should include auth token in URL when requested', () => {
      const url: string = client.getStreamUrl('book-1', { includeToken: true });

      expect(url).toContain('token=');
      expect(url).toContain('test-api-key');
    });
  });

  describe('error handling', () => {
    it('should handle timeout', async () => {
      mockFetch.mockImplementationOnce(
        () =>
          new Promise<Response>((_resolve, reject) => {
            setTimeout(() => {
              reject(new Error('Timeout'));
            }, 100);
          })
      );

      await expect(client.getLibraries()).rejects.toThrow();
    });

    it('should handle malformed JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      } as Response);

      await expect(client.getLibraries()).rejects.toThrow('Invalid JSON');
    });
  });
});
