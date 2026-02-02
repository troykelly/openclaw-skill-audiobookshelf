/**
 * Google Cast controller
 *
 * Provides discovery and playback control for Google Cast devices.
 * Uses bonjour-service for mDNS discovery and castv2-client for Cast protocol.
 * Resolves .local hostnames when addresses are not provided (common for Cast groups).
 */
import type { CastDevice } from './types.js';
/**
 * Options for device discovery
 */
interface DiscoveryOptions {
    /** Discovery timeout in milliseconds (default: 5000) */
    timeout?: number;
}
/**
 * Metadata for cast stream
 */
interface StreamMetadata {
    title?: string;
    artist?: string;
    coverUrl?: string;
}
/**
 * Controller for Google Cast devices
 */
export declare class CastController {
    private currentDevice;
    private client;
    private player;
    private bonjour;
    /**
     * Discover Cast devices on the network
     * @param options - Discovery options
     * @returns Array of discovered Cast devices
     */
    discoverDevices(options?: DiscoveryOptions): Promise<CastDevice[]>;
    /**
     * Convert services to devices, resolving .local hostnames as needed
     */
    private resolveDevices;
    /**
     * Resolve a .local mDNS hostname to an IP address
     *
     * @param hostname - The .local hostname to resolve
     * @returns The resolved IP address, or the original hostname if resolution fails
     */
    private resolveLocalHostname;
    /**
     * Connect to a Cast device
     * @param device - The device to connect to
     */
    connect(device: CastDevice): Promise<void>;
    /**
     * Cast audio stream to connected device
     * @param streamUrl - URL of the audio stream
     * @param metadata - Optional metadata for the stream
     */
    castStream(streamUrl: string, metadata?: StreamMetadata): Promise<void>;
    /**
     * Seek to position in current stream
     * @param seconds - Position in seconds
     */
    seek(seconds: number): Promise<void>;
    /**
     * Pause current playback
     */
    pause(): Promise<void>;
    /**
     * Resume playback
     */
    resume(): Promise<void>;
    /**
     * Stop playback and disconnect
     */
    stop(): Promise<void>;
    /**
     * Get current playback position
     * @returns Current position in seconds, or 0 if not playing
     */
    getCurrentTime(): Promise<number>;
    /**
     * Get connected device info
     * @returns The connected device or null if not connected
     */
    getConnectedDevice(): CastDevice | null;
    /**
     * Disconnect from current device
     */
    private disconnect;
    /**
     * Handle disconnection cleanup
     */
    private handleDisconnect;
}
export {};
//# sourceMappingURL=cast.d.ts.map