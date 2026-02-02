# Research Report: Local Audio Streaming Proxy with Real-Time Volume Control for Cast

## TL;DR

**Recommended Architecture: Node.js PCM Pipeline**

Use Node.js to:
1. Fetch audio from Audiobookshelf
2. Decode to PCM (via ffmpeg)
3. Apply volume via Transform stream (real-time adjustable)
4. Re-encode to MP3 (via ffmpeg)
5. Serve to Cast device via HTTP

**Why:** Full control in Node.js, battle-tested approach, latency (~2-4s) acceptable for fade-out use case.

---

## Architecture

```
┌─────────────────┐    ┌─────────┐    ┌────────────────┐    ┌─────────┐    ┌──────────┐
│ Audiobookshelf  │ → │ ffmpeg  │ → │ VolumeTransform │ → │ ffmpeg  │ → │ HTTP Res │
│   (MP3/M4B)     │    │ decode  │    │    (PCM)       │    │ encode  │    │ (Cast)   │
└─────────────────┘    └─────────┘    └────────────────┘    └─────────┘    └──────────┘
                                              ↑
                                       setVolume(0.8)
                                       setVolume(0.5)
                                       setVolume(0.0)
```

## Why This Approach

**Problem:** Cast device volume commands trigger audible "bloop" sounds — unacceptable for sleep fade-out.

**Solution:** Control volume in the audio stream itself, before it reaches the Cast device. Cast device stays at constant volume.

**Why not just switch streams?** Cast devices don't seamlessly switch — there's always a gap/interruption.

---

## Implementation

### VolumeTransform (PCM Processing)

```typescript
import { Transform } from 'stream';

class VolumeTransform extends Transform {
  private volume = 1.0;
  
  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1.5, v));
  }

  _transform(chunk: Buffer, encoding: string, callback: Function) {
    // Assumes 16-bit signed LE stereo PCM
    const output = Buffer.alloc(chunk.length);
    for (let i = 0; i < chunk.length; i += 2) {
      let sample = chunk.readInt16LE(i);
      sample = Math.round(sample * this.volume);
      sample = Math.max(-32768, Math.min(32767, sample)); // clamp
      output.writeInt16LE(sample, i);
    }
    callback(null, output);
  }
}
```

### FFmpeg Decode/Encode

```typescript
import { spawn } from 'child_process';

// Decode: MP3 → PCM
const decoder = spawn('ffmpeg', [
  '-i', 'pipe:0',           // input from stdin
  '-f', 's16le',            // output format: signed 16-bit LE
  '-acodec', 'pcm_s16le',
  '-ar', '44100',           // sample rate
  '-ac', '2',               // stereo
  'pipe:1'                  // output to stdout
]);

// Encode: PCM → MP3
const encoder = spawn('ffmpeg', [
  '-f', 's16le',
  '-ar', '44100',
  '-ac', '2',
  '-i', 'pipe:0',
  '-acodec', 'libmp3lame',
  '-b:a', '192k',
  '-f', 'mp3',
  'pipe:1'
]);
```

### Fade Implementation

```typescript
const fadeOut = (volumeControl: VolumeTransform, durationMs: number) => {
  const steps = 30;
  const interval = durationMs / steps;
  let step = 0;
  
  const timer = setInterval(() => {
    step++;
    volumeControl.setVolume(1 - (step / steps));
    if (step >= steps) clearInterval(timer);
  }, interval);
};
```

### HTTP Server

```typescript
import http from 'http';

const server = http.createServer(async (req, res) => {
  if (req.url?.startsWith('/stream')) {
    res.writeHead(200, {
      'Content-Type': 'audio/mpeg',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    });
    
    // Set up decode → volume → encode pipeline
    const pipeline = createAudioPipeline(bookId, startPosition);
    pipeline.output.pipe(res);
  }
});
```

---

## Position Tracking

Track bytes streamed to calculate position:

```typescript
let bytesStreamed = 0;
const bitrate = 192000; // 192kbps

encoder.stdout.on('data', (chunk) => {
  bytesStreamed += chunk.length;
});

const currentPositionSec = startOffset + (bytesStreamed * 8) / bitrate;
```

---

## Deployment

### Requirements

1. **Persistent service** — must run continuously during playback
2. **Local network access** — Cast device needs HTTP access to proxy
3. **ffmpeg** — must be installed on host
4. **Optional: Reverse proxy** — for HTTPS or nicer URLs

### Example: systemd

```ini
[Unit]
Description=Audiobookshelf Cast Proxy
After=network.target

[Service]
Type=simple
User=moltbot
ExecStart=/usr/bin/node /path/to/abs-proxy-server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

### Example: nginx upstream

```nginx
upstream abs-proxy {
    server 127.0.0.1:8765;
}

server {
    location /audiobook-stream/ {
        proxy_pass http://abs-proxy/;
        proxy_http_version 1.1;
        proxy_buffering off;
    }
}
```

---

## Latency

| Component | Typical Latency |
|-----------|-----------------|
| ffmpeg decode buffer | 50-200ms |
| PCM processing | <10ms |
| ffmpeg encode buffer | 50-200ms |
| HTTP/TCP buffer | 50-100ms |
| Cast device buffer | 1-3 seconds |

**Total:** ~2-4 seconds from volume change to audible change

**Mitigation:** Start fade slightly early (acceptable for sleep timer use case).

---

## Alternatives Considered

### FFmpeg ZMQ (Rejected)

Could use ffmpeg's `azmq` filter for runtime volume control, but:
- Requires ffmpeg compiled with `--enable-libzmq` (non-standard)
- Additional `zmqsend` tool dependency
- More complex error handling

### Pre-generate Faded Segment (Rejected)

Could pre-render faded audio segment and switch, but:
- Cast devices don't seamlessly switch streams
- Gap/interruption defeats the purpose

---

## Risks

| Risk | Mitigation |
|------|------------|
| Service dies = playback dies | Acceptable for sleep timer use case |
| 2-4s latency | Start fade slightly early |
| Position desync | Track bytes + verify with Cast status |
| ffmpeg not installed | Document dependency, check at startup |

---

*Research completed: 2026-02-02*
