/**
 * Audiobookshelf API client
 *
 * Implements REST API client for library browsing, search, and playback session management.
 * @see https://api.audiobookshelf.org/
 */
/**
 * Custom error for API errors
 */
export class AudiobookshelfApiError extends Error {
    status;
    statusText;
    constructor(status, statusText) {
        super(`API error: ${String(status)} ${statusText}`);
        this.status = status;
        this.statusText = statusText;
        this.name = 'AudiobookshelfApiError';
    }
}
/**
 * Client for interacting with Audiobookshelf API
 */
export class AudiobookshelfClient {
    config;
    constructor(config) {
        this.config = config;
    }
    /**
     * Make an authenticated request to the Audiobookshelf API
     */
    async request(endpoint, options = {}) {
        const url = `${this.config.url}${endpoint}`;
        const existingHeaders = options.headers ?? {};
        const headers = {
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
        return response.json();
    }
    /**
     * List all libraries
     */
    async getLibraries() {
        const response = await this.request('/api/libraries');
        return response.libraries;
    }
    /**
     * List books in a library
     */
    async getBooks(libraryId) {
        const response = await this.request(`/api/libraries/${libraryId}/items`);
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
    async search(query, libraryId) {
        // If no libraryId provided, search first library
        if (!libraryId) {
            const libraries = await this.getLibraries();
            if (libraries.length === 0) {
                return [];
            }
            libraryId = libraries[0].id;
        }
        const response = await this.request(`/api/libraries/${libraryId}/search?q=${encodeURIComponent(query)}`);
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
    async getProgress(bookId) {
        try {
            const response = await this.request(`/api/me/progress/${bookId}`);
            return {
                bookId,
                currentTime: response.currentTime,
                duration: response.duration,
                progress: response.progress,
                isFinished: response.isFinished,
                lastUpdate: response.lastUpdate,
            };
        }
        catch (error) {
            if (error instanceof AudiobookshelfApiError && error.status === 404) {
                return null;
            }
            throw error;
        }
    }
    /**
     * Update progress for a book
     */
    async updateProgress(bookId, currentTime) {
        const response = await this.request(`/api/me/progress/${bookId}`, {
            method: 'PATCH',
            body: JSON.stringify({ currentTime }),
        });
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
    async startSession(bookId) {
        const response = await this.request(`/api/items/${bookId}/play`, {
            method: 'POST',
            body: JSON.stringify({}),
        });
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
    async closeSession(sessionId, currentTime) {
        const body = currentTime !== undefined ? { currentTime } : {};
        await this.request(`/api/session/${sessionId}/close`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }
    /**
     * Get audio stream URL for a book
     * @param bookId - The book ID
     * @param options - Optional settings
     * @returns The stream URL
     */
    getStreamUrl(bookId, options) {
        const baseUrl = `${this.config.url}/api/items/${bookId}/play`;
        if (options?.includeToken) {
            return `${baseUrl}?token=${this.config.apiKey}`;
        }
        return baseUrl;
    }
}
//# sourceMappingURL=client.js.map