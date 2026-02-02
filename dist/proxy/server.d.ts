/**
 * Audio Proxy Server
 *
 * HTTP server that proxies audio from Audiobookshelf with real-time volume control.
 * Cast devices stream from this server, enabling silent volume fades.
 */
import { EventEmitter } from 'events';
import { AudioPipeline } from './audio-pipeline.js';
/**
 * Active stream session
 */
export interface StreamSession {
    id: string;
    pipeline: AudioPipeline;
    startTime: number;
    bookId: string;
    startPosition: number;
}
/**
 * Options for ProxyServer
 */
export interface ProxyServerOptions {
    /** Port to listen on (default: 8765) */
    port?: number;
    /** Host to bind to (default: :: for dual-stack IPv6-first) */
    host?: string;
    /** Trusted proxy CIDRs for X-Forwarded-For (default: localhost only) */
    trustedProxies?: string[];
    /** Public URL for Cast devices (required for external access) */
    publicUrl?: string;
    /** Audiobookshelf server URL */
    audiobookshelfUrl: string;
    /** Audiobookshelf API token */
    audiobookshelfToken: string;
}
/**
 * Audio proxy server with real-time volume control
 */
export declare class ProxyServer extends EventEmitter {
    private server?;
    private readonly sessions;
    private readonly port;
    private readonly host;
    private readonly trustedProxies;
    private readonly publicUrl?;
    private readonly absUrl;
    private readonly absToken;
    constructor(options: ProxyServerOptions);
    /**
     * Start the proxy server
     */
    start(): Promise<void>;
    /**
     * Stop the proxy server
     */
    stop(): Promise<void>;
    /**
     * Get active session by ID
     */
    getSession(sessionId: string): StreamSession | undefined;
    /**
     * Get all active sessions
     */
    getAllSessions(): StreamSession[];
    /**
     * Set volume for a session
     */
    setSessionVolume(sessionId: string, volume: number): boolean;
    /**
     * Get current position for a session
     */
    getSessionPosition(sessionId: string): number | null;
    /**
     * Stop a specific session
     */
    stopSession(sessionId: string): boolean;
    /**
     * Get the server URL for clients to connect to
     * Returns publicUrl if configured, otherwise constructs from host:port
     */
    getServerUrl(): string;
    /**
     * Get trusted proxy CIDRs
     */
    getTrustedProxies(): string[];
    /**
     * Handle incoming HTTP request
     */
    private handleRequest;
    /**
     * Handle stream request
     */
    private handleStreamRequest;
    /**
     * Handle volume update request
     */
    private handleVolumeRequest;
    /**
     * Handle status request
     */
    private handleStatusRequest;
    /**
     * Handle delete session request
     */
    private handleDeleteRequest;
}
//# sourceMappingURL=server.d.ts.map