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
export declare class AudiobookshelfApiError extends Error {
    readonly status: number;
    readonly statusText: string;
    constructor(status: number, statusText: string);
}
/**
 * Client for interacting with Audiobookshelf API
 */
export declare class AudiobookshelfClient {
    private readonly config;
    constructor(config: AudiobookshelfConfig);
    /**
     * Make an authenticated request to the Audiobookshelf API
     */
    private request;
    /**
     * List all libraries
     */
    getLibraries(): Promise<Library[]>;
    /**
     * List books in a library
     */
    getBooks(libraryId: string): Promise<Book[]>;
    /**
     * Search across libraries
     */
    search(query: string): Promise<Book[]>;
    /**
     * Get progress for a book
     */
    getProgress(bookId: string): Promise<Progress | null>;
    /**
     * Update progress for a book
     */
    updateProgress(bookId: string, currentTime: number): Promise<Progress>;
    /**
     * Start a playback session
     */
    startSession(bookId: string): Promise<PlaybackSession>;
    /**
     * Sync and close a playback session
     * @param sessionId - The session ID to close
     * @param currentTime - Optional current playback time to sync before closing
     */
    closeSession(sessionId: string, currentTime?: number): Promise<void>;
    /**
     * Get audio stream URL for a book
     * @param bookId - The book ID
     * @param options - Optional settings
     * @returns The stream URL
     */
    getStreamUrl(bookId: string, options?: StreamUrlOptions): string;
}
export {};
//# sourceMappingURL=client.d.ts.map