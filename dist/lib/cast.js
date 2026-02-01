/**
 * Google Cast controller
 *
 * Provides discovery and playback control for Google Cast devices.
 * Uses bonjour-service for mDNS discovery and castv2-client for Cast protocol.
 */
import { Bonjour } from 'bonjour-service';
import { Client, DefaultMediaReceiver } from 'castv2-client';
/**
 * Controller for Google Cast devices
 */
export class CastController {
    currentDevice = null;
    client = null;
    player = null;
    bonjour = null;
    /**
     * Discover Cast devices on the network
     * @param options - Discovery options
     * @returns Array of discovered Cast devices
     */
    discoverDevices(options = {}) {
        const timeout = options.timeout ?? 5000;
        const devices = [];
        return new Promise((resolve) => {
            this.bonjour = new Bonjour();
            const browser = this.bonjour.find({ type: 'googlecast' });
            browser.on('up', (service) => {
                const device = {
                    name: service.name,
                    host: service.addresses?.[0] ?? service.host,
                    port: service.port,
                    id: service.txt.id,
                };
                // Avoid duplicates
                if (!devices.some((d) => d.host === device.host && d.port === device.port)) {
                    devices.push(device);
                }
            });
            // Resolve after timeout
            setTimeout(() => {
                browser.stop();
                this.bonjour?.destroy();
                this.bonjour = null;
                resolve(devices);
            }, timeout);
        });
    }
    /**
     * Connect to a Cast device
     * @param device - The device to connect to
     */
    async connect(device) {
        // Disconnect existing connection
        if (this.client) {
            this.disconnect();
        }
        return new Promise((resolve, reject) => {
            this.client = new Client();
            this.client.on('error', (err) => {
                this.handleDisconnect();
                reject(err);
            });
            this.client.connect({ host: device.host, port: device.port }, (err) => {
                if (err) {
                    this.client = null;
                    reject(err);
                }
                else {
                    this.currentDevice = device;
                    resolve();
                }
            });
        });
    }
    /**
     * Cast audio stream to connected device
     * @param streamUrl - URL of the audio stream
     * @param metadata - Optional metadata for the stream
     */
    castStream(streamUrl, metadata) {
        if (!this.client || !this.currentDevice) {
            return Promise.reject(new Error('Not connected to any device'));
        }
        const client = this.client;
        return new Promise((resolve, reject) => {
            client.launch(DefaultMediaReceiver, (err, player) => {
                if (err) {
                    reject(err);
                    return;
                }
                this.player = player;
                // Set up error handler
                this.player.on('status', () => {
                    // Status updates - could be used for progress tracking
                });
                const media = {
                    contentId: streamUrl,
                    contentType: 'audio/mpeg',
                    streamType: 'BUFFERED',
                    metadata: metadata
                        ? {
                            type: 0,
                            metadataType: 3, // Music track
                            title: metadata.title,
                            artist: metadata.artist,
                            images: metadata.coverUrl ? [{ url: metadata.coverUrl }] : undefined,
                        }
                        : undefined,
                };
                this.player.load(media, { autoplay: true }, (loadErr) => {
                    if (loadErr) {
                        reject(loadErr);
                    }
                    else {
                        resolve();
                    }
                });
            });
        });
    }
    /**
     * Seek to position in current stream
     * @param seconds - Position in seconds
     */
    seek(seconds) {
        if (!this.player) {
            return Promise.reject(new Error('No active playback'));
        }
        const player = this.player;
        return new Promise((resolve, reject) => {
            player.seek(seconds, (err) => {
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
     * Pause current playback
     */
    pause() {
        if (!this.player) {
            return Promise.reject(new Error('No active playback'));
        }
        const player = this.player;
        return new Promise((resolve, reject) => {
            player.pause((err) => {
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
     * Resume playback
     */
    resume() {
        if (!this.player) {
            return Promise.reject(new Error('No active playback'));
        }
        const player = this.player;
        return new Promise((resolve, reject) => {
            player.play((err) => {
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
     * Stop playback and disconnect
     */
    async stop() {
        if (this.player) {
            const player = this.player;
            await new Promise((resolve) => {
                player.stop((_err) => {
                    // Ignore stop errors, continue with disconnect
                    resolve();
                });
            });
        }
        this.disconnect();
    }
    /**
     * Get current playback position
     * @returns Current position in seconds, or 0 if not playing
     */
    getCurrentTime() {
        if (!this.player) {
            return Promise.resolve(0);
        }
        const player = this.player;
        return new Promise((resolve) => {
            player.getStatus((err, status) => {
                if (err || !status) {
                    resolve(0);
                }
                else {
                    resolve(status.currentTime ?? 0);
                }
            });
        });
    }
    /**
     * Get connected device info
     * @returns The connected device or null if not connected
     */
    getConnectedDevice() {
        return this.currentDevice;
    }
    /**
     * Disconnect from current device
     */
    disconnect() {
        if (this.client) {
            this.client.close();
        }
        this.handleDisconnect();
    }
    /**
     * Handle disconnection cleanup
     */
    handleDisconnect() {
        this.client = null;
        this.player = null;
        this.currentDevice = null;
    }
}
//# sourceMappingURL=cast.js.map