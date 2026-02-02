/**
 * Audio Proxy Server
 *
 * HTTP server that proxies audio from Audiobookshelf with real-time volume control.
 * Cast devices stream from this server, enabling silent volume fades.
 */
import { createServer } from 'http';
import { EventEmitter } from 'events';
import { AudioPipeline } from './audio-pipeline.js';
/**
 * Audio proxy server with real-time volume control
 */
export class ProxyServer extends EventEmitter {
    server;
    sessions = new Map();
    port;
    host;
    absUrl;
    absToken;
    constructor(options) {
        super();
        this.port = options.port ?? 8765;
        this.host = options.host ?? '0.0.0.0';
        this.absUrl = options.audiobookshelfUrl;
        this.absToken = options.audiobookshelfToken;
    }
    /**
     * Start the proxy server
     */
    async start() {
        return new Promise((resolve, reject) => {
            this.server = createServer((req, res) => {
                this.handleRequest(req, res);
            });
            this.server.on('error', (err) => {
                this.emit('error', err);
                reject(err);
            });
            this.server.listen(this.port, this.host, () => {
                this.emit('listening', { port: this.port, host: this.host });
                resolve();
            });
        });
    }
    /**
     * Stop the proxy server
     */
    async stop() {
        // Stop all active sessions
        for (const [sessionId, session] of this.sessions) {
            session.pipeline.stop();
            this.sessions.delete(sessionId);
        }
        return new Promise((resolve) => {
            if (!this.server) {
                resolve();
                return;
            }
            this.server.close(() => {
                this.server = undefined;
                this.emit('closed');
                resolve();
            });
        });
    }
    /**
     * Get active session by ID
     */
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    /**
     * Get all active sessions
     */
    getAllSessions() {
        return Array.from(this.sessions.values());
    }
    /**
     * Set volume for a session
     */
    setSessionVolume(sessionId, volume) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return false;
        }
        session.pipeline.setVolume(volume);
        return true;
    }
    /**
     * Get current position for a session
     */
    getSessionPosition(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return null;
        }
        return session.pipeline.getCurrentPosition();
    }
    /**
     * Stop a specific session
     */
    stopSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return false;
        }
        session.pipeline.stop();
        this.sessions.delete(sessionId);
        return true;
    }
    /**
     * Get the server URL for clients to connect to
     */
    getServerUrl() {
        return `http://${this.host === '0.0.0.0' ? '127.0.0.1' : this.host}:${String(this.port)}`;
    }
    /**
     * Handle incoming HTTP request
     */
    handleRequest(req, res) {
        const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
        // Route: GET /stream/:bookId
        const streamRegex = /^\/stream\/([^/]+)$/;
        const streamMatch = streamRegex.exec(url.pathname);
        if (streamMatch && req.method === 'GET') {
            const bookId = streamMatch[1];
            const startPosition = parseFloat(url.searchParams.get('start') ?? '0');
            this.handleStreamRequest(res, bookId, startPosition);
            return;
        }
        // Route: POST /volume/:sessionId
        const volumeRegex = /^\/volume\/([^/]+)$/;
        const volumeMatch = volumeRegex.exec(url.pathname);
        if (volumeMatch && req.method === 'POST') {
            const sessionId = volumeMatch[1];
            this.handleVolumeRequest(req, res, sessionId);
            return;
        }
        // Route: GET /status/:sessionId
        const statusRegex = /^\/status\/([^/]+)$/;
        const statusMatch = statusRegex.exec(url.pathname);
        if (statusMatch && req.method === 'GET') {
            const sessionId = statusMatch[1];
            this.handleStatusRequest(res, sessionId);
            return;
        }
        // Route: DELETE /session/:sessionId
        const deleteRegex = /^\/session\/([^/]+)$/;
        const deleteMatch = deleteRegex.exec(url.pathname);
        if (deleteMatch && req.method === 'DELETE') {
            const sessionId = deleteMatch[1];
            this.handleDeleteRequest(res, sessionId);
            return;
        }
        // Route: GET /health
        if (url.pathname === '/health' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', sessions: this.sessions.size }));
            return;
        }
        // 404 for everything else
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
    /**
     * Handle stream request
     */
    handleStreamRequest(res, bookId, startPosition) {
        // Generate session ID
        const sessionId = `${bookId}-${String(Date.now())}`;
        // Build Audiobookshelf stream URL
        const streamUrl = `${this.absUrl}/api/items/${bookId}/play`;
        // Create pipeline
        const pipelineOptions = {
            inputUrl: streamUrl,
            startPosition,
            authHeader: `Bearer ${this.absToken}`,
        };
        const pipeline = new AudioPipeline(pipelineOptions);
        // Store session
        const session = {
            id: sessionId,
            pipeline,
            startTime: Date.now(),
            bookId,
            startPosition,
        };
        this.sessions.set(sessionId, session);
        // Set response headers
        res.writeHead(200, {
            'Content-Type': 'audio/mpeg',
            'Transfer-Encoding': 'chunked',
            'Cache-Control': 'no-cache',
            'X-Session-Id': sessionId,
        });
        // Start pipeline and pipe to response
        pipeline.start();
        const outputStream = pipeline.getOutputStream();
        outputStream.pipe(res);
        // Handle client disconnect
        res.on('close', () => {
            pipeline.stop();
            this.sessions.delete(sessionId);
            this.emit('session-ended', { sessionId, bookId });
        });
        this.emit('session-started', { sessionId, bookId, startPosition });
    }
    /**
     * Handle volume update request
     */
    handleVolumeRequest(req, res, sessionId) {
        let body = '';
        req.on('data', (chunk) => {
            body += String(chunk);
        });
        req.on('end', () => {
            try {
                const { volume } = JSON.parse(body);
                if (typeof volume !== 'number' || volume < 0 || volume > 1.5) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid volume (0.0-1.5)' }));
                    return;
                }
                if (this.setSessionVolume(sessionId, volume)) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, volume }));
                }
                else {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Session not found' }));
                }
            }
            catch {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
    }
    /**
     * Handle status request
     */
    handleStatusRequest(res, sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Session not found' }));
            return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            sessionId,
            bookId: session.bookId,
            volume: session.pipeline.getVolume(),
            position: session.pipeline.getCurrentPosition(),
            running: session.pipeline.isRunning(),
            startTime: session.startTime,
        }));
    }
    /**
     * Handle delete session request
     */
    handleDeleteRequest(res, sessionId) {
        if (this.stopSession(sessionId)) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        }
        else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Session not found' }));
        }
    }
}
//# sourceMappingURL=server.js.map