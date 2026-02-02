/**
 * Cast client for Google Cast playback
 *
 * Provides media playback control using AUDIOBOOK_CHAPTER metadata type
 * to enable Nest Hub low-light mode during audiobook playback.
 */
import { EventEmitter } from 'events';
import { Client, DefaultMediaReceiver } from 'castv2-client';
import { MetadataType, StreamType, PlayerState, } from './types.js';
/**
 * Google Cast client with AUDIOBOOK_CHAPTER metadata support
 *
 * Uses metadataType: 4 (AUDIOBOOK_CHAPTER) to enable Nest Hub
 * low-light mode during audiobook playback.
 */
export class CastClient extends EventEmitter {
    client = null;
    player = null;
    connectedDevice = null;
    _isConnected = false;
    /**
     * Connect to a Cast device
     *
     * @param device - The device to connect to
     * @throws Error if connection fails
     */
    async connect(device) {
        // Disconnect any existing connection
        if (this.client) {
            this.disconnect();
        }
        return new Promise((resolve, reject) => {
            this.client = new Client();
            this.client.on('error', (err) => {
                this.handleError(err);
                reject(err);
            });
            this.client.connect({ host: device.host, port: device.port }, (err) => {
                if (err) {
                    this.client = null;
                    reject(err);
                }
                else {
                    this.connectedDevice = device;
                    this._isConnected = true;
                    this.emit('connected', device);
                    resolve();
                }
            });
        });
    }
    /**
     * Load media onto the Cast device
     *
     * Uses AUDIOBOOK_CHAPTER metadata type (metadataType: 4) which
     * enables Nest Hub low-light mode during playback.
     *
     * @param options - Media loading options
     * @throws Error if not connected or load fails
     */
    async loadMedia(options) {
        if (!this.client || !this._isConnected) {
            throw new Error('Not connected to any Cast device');
        }
        const client = this.client;
        // Launch the DefaultMediaReceiver if not already launched
        if (!this.player) {
            await new Promise((resolve, reject) => {
                client.launch(DefaultMediaReceiver, (err, player) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        this.player = player;
                        this.setupPlayerListeners();
                        resolve();
                    }
                });
            });
        }
        const player = this.player;
        if (!player) {
            throw new Error('Failed to launch media receiver');
        }
        // Build media info with AUDIOBOOK_CHAPTER metadata type
        const media = {
            contentId: options.url,
            contentType: options.contentType,
            streamType: StreamType.BUFFERED,
            duration: options.duration,
            metadata: {
                type: 0, // Required by castv2-client
                metadataType: MetadataType.AUDIOBOOK_CHAPTER,
                title: options.title,
                subtitle: options.author,
                artist: options.author,
                bookTitle: options.title,
                chapterTitle: options.chapterTitle,
                chapterNumber: options.chapterNumber,
                images: options.coverUrl ? [{ url: options.coverUrl }] : [],
            },
        };
        // Load options
        const loadOptions = {
            autoplay: true,
        };
        if (options.resumePosition !== undefined && options.resumePosition > 0) {
            loadOptions.currentTime = options.resumePosition;
        }
        return new Promise((resolve, reject) => {
            player.load(media, loadOptions, (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    /**
     * Pause playback
     */
    async pause() {
        if (!this.player) {
            throw new Error('No active playback');
        }
        const player = this.player;
        return new Promise((resolve, reject) => {
            player.pause((err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    /**
     * Resume playback
     */
    async play() {
        if (!this.player) {
            throw new Error('No active playback');
        }
        const player = this.player;
        return new Promise((resolve, reject) => {
            player.play((err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    /**
     * Stop playback
     */
    async stop() {
        if (!this.player) {
            return;
        }
        const player = this.player;
        return new Promise((resolve) => {
            player.stop((_err) => {
                // Ignore stop errors
                resolve();
            });
        });
    }
    /**
     * Seek to position
     *
     * @param position - Position in seconds
     */
    async seek(position) {
        if (!this.player) {
            throw new Error('No active playback');
        }
        const player = this.player;
        return new Promise((resolve, reject) => {
            player.seek(position, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    /**
     * Get current playback status
     *
     * @returns Current status or null if not playing
     */
    async getStatus() {
        if (!this.player) {
            return null;
        }
        const player = this.player;
        return new Promise((resolve) => {
            player.getStatus((err, status) => {
                if (err || !status) {
                    resolve(null);
                }
                else {
                    // Status fields may be undefined at runtime, use defaults
                    const currentTime = status.currentTime ?? 0;
                    const playerState = status.playerState;
                    const volume = status.volume;
                    resolve({
                        currentTime,
                        playerState: playerState ?? PlayerState.IDLE,
                        volume: volume ?? { level: 1, muted: false },
                        media: status.media
                            ? {
                                contentId: status.media.contentId,
                                contentType: status.media.contentType,
                                // Note: duration might be in the media object directly, not in metadata
                                duration: status.media.duration,
                            }
                            : undefined,
                    });
                }
            });
        });
    }
    /**
     * Disconnect from the Cast device
     */
    disconnect() {
        if (this.client) {
            this.client.close();
        }
        this.cleanup();
        this.emit('disconnected');
    }
    /**
     * Check if connected to a device
     */
    isConnected() {
        return this._isConnected;
    }
    /**
     * Get the connected device info
     */
    getConnectedDevice() {
        return this.connectedDevice;
    }
    /**
     * Set up event listeners on the player
     */
    setupPlayerListeners() {
        if (!this.player)
            return;
        this.player.on('status', (status) => {
            // Extract fields with defaults for undefined values
            const currentTime = status.currentTime ?? 0;
            const playerState = status.playerState;
            const volume = status.volume;
            this.emit('status', {
                currentTime,
                playerState: playerState ?? PlayerState.IDLE,
                volume: volume ?? { level: 1, muted: false },
            });
        });
    }
    /**
     * Handle connection errors
     */
    handleError(err) {
        this.emit('error', err);
        this.cleanup();
    }
    /**
     * Clean up state after disconnect
     */
    cleanup() {
        this.client = null;
        this.player = null;
        this.connectedDevice = null;
        this._isConnected = false;
    }
}
//# sourceMappingURL=client.js.map