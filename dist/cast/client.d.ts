/**
 * Cast client for Google Cast playback
 *
 * Provides media playback control using AUDIOBOOK_CHAPTER metadata type
 * to enable Nest Hub low-light mode during audiobook playback.
 */
import { EventEmitter } from 'events';
import { type CastDevice, type CastMediaStatus } from './types.js';
/**
 * Options for loading media
 */
export interface MediaLoadOptions {
    /** URL of the audio stream */
    url: string;
    /** MIME type (e.g., 'audio/mpeg') */
    contentType: string;
    /** Book/media title */
    title: string;
    /** Author name */
    author?: string;
    /** Chapter title */
    chapterTitle?: string;
    /** Chapter number */
    chapterNumber?: number;
    /** Cover image URL */
    coverUrl?: string;
    /** Resume position in seconds */
    resumePosition?: number;
    /** Duration in seconds (optional, for progress display) */
    duration?: number;
}
/**
 * Cast client events
 */
export interface CastClientEvents {
    connected: (device: CastDevice) => void;
    disconnected: () => void;
    error: (error: Error) => void;
    status: (status: CastMediaStatus) => void;
}
/**
 * Google Cast client with AUDIOBOOK_CHAPTER metadata support
 *
 * Uses metadataType: 4 (AUDIOBOOK_CHAPTER) to enable Nest Hub
 * low-light mode during audiobook playback.
 */
export declare class CastClient extends EventEmitter {
    private client;
    private player;
    private connectedDevice;
    private _isConnected;
    /**
     * Connect to a Cast device
     *
     * @param device - The device to connect to
     * @throws Error if connection fails
     */
    connect(device: CastDevice): Promise<void>;
    /**
     * Load media onto the Cast device
     *
     * Uses AUDIOBOOK_CHAPTER metadata type (metadataType: 4) which
     * enables Nest Hub low-light mode during playback.
     *
     * @param options - Media loading options
     * @throws Error if not connected or load fails
     */
    loadMedia(options: MediaLoadOptions): Promise<void>;
    /**
     * Pause playback
     */
    pause(): Promise<void>;
    /**
     * Resume playback
     */
    play(): Promise<void>;
    /**
     * Stop playback
     */
    stop(): Promise<void>;
    /**
     * Seek to position
     *
     * @param position - Position in seconds
     */
    seek(position: number): Promise<void>;
    /**
     * Get current playback status
     *
     * @returns Current status or null if not playing
     */
    getStatus(): Promise<CastMediaStatus | null>;
    /**
     * Disconnect from the Cast device
     */
    disconnect(): void;
    /**
     * Check if connected to a device
     */
    isConnected(): boolean;
    /**
     * Get the connected device info
     */
    getConnectedDevice(): CastDevice | null;
    /**
     * Set up event listeners on the player
     */
    private setupPlayerListeners;
    /**
     * Handle connection errors
     */
    private handleError;
    /**
     * Clean up state after disconnect
     */
    private cleanup;
}
//# sourceMappingURL=client.d.ts.map