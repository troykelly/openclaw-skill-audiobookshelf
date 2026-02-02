# Native Google Cast Support

This document describes the native Google Cast implementation for Audiobookshelf playback.

## Overview

The skill uses native Cast protocol via `castv2-client` and `bonjour-service` instead of Home Assistant media player integration. This provides:

- **Direct device control** — No intermediary required
- **Low-light mode** — Uses `AUDIOBOOK_CHAPTER` metadata type (4) for Nest Hub displays
- **Silent volume fades** — PCM volume control via audio proxy, no Cast "bloop" sounds
- **Position tracking** — Real-time sync back to Audiobookshelf

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                         OpenClaw                                │
│  ┌──────────────┐   ┌─────────────┐   ┌────────────────────┐  │
│  │ CLI/Skill    │──▶│ Cast Client │──▶│ Audio Proxy Server │  │
│  │ Commands     │   │ (castv2)    │   │ (HTTP + PCM vol)   │  │
│  └──────────────┘   └──────┬──────┘   └─────────┬──────────┘  │
│                            │                     │             │
└────────────────────────────┼─────────────────────┼─────────────┘
                             │                     │
                    Cast V2  │          Audio      │
                    Protocol │          Stream     │
                             ▼                     ▼
                      ┌──────────────┐   ┌────────────────┐
                      │ Google Cast  │◀──│ Audiobookshelf │
                      │ Device       │   │ Server         │
                      └──────────────┘   └────────────────┘
```

## Device Discovery

Devices are discovered via mDNS (Bonjour) on the local network:

```typescript
import { DeviceDiscovery } from 'openclaw-skill-audiobookshelf';

const discovery = new DeviceDiscovery({ cacheTtlMs: 30000 });

// Discover all devices
const devices = await discovery.discoverDevices({ timeout: 5000 });

// Find by name (fuzzy matching)
const device = await discovery.findDeviceByName('Living Room');

// Find by Cast ID
const device = await discovery.findDeviceById('abc123def456');

// Clear cache for fresh scan
discovery.clearCache();
```

### Device Information

Each discovered device includes:

| Field | Description |
|-------|-------------|
| `name` | Friendly name (e.g., "Living Room Speaker") |
| `host` | IP address |
| `port` | Cast port (usually 8009) |
| `id` | Cast device ID from mDNS TXT record |

## Cast Client

The Cast client connects to devices and controls media playback:

```typescript
import { CastClient, type MediaLoadOptions } from 'openclaw-skill-audiobookshelf';

const client = new CastClient();

// Connect to device
await client.connect(device);

// Load media with AUDIOBOOK_CHAPTER metadata
await client.loadMedia({
  url: 'http://abs-server/stream/book-123',
  contentType: 'audio/mpeg',
  title: 'Project Hail Mary',
  author: 'Andy Weir',
  chapterTitle: 'Chapter 1',
  chapterNumber: 1,
  coverUrl: 'http://abs-server/cover/book-123',
  resumePosition: 1234.5, // seconds
  duration: 36000, // seconds
});

// Playback control
await client.pause();
await client.play();
await client.stop();
await client.seek(1500); // seconds

// Get status
const status = await client.getStatus();
console.log(status?.currentTime); // seconds
console.log(status?.playerState); // PLAYING, PAUSED, IDLE, etc.

// Disconnect
client.disconnect();
```

### Metadata Type

The client uses `metadataType: 4` (AUDIOBOOK_CHAPTER) which tells Nest Hub displays to:

- Enter low-light mode (dim display, simple UI)
- Show audiobook-specific controls
- Display chapter information

## Position Tracking

Position tracking polls the Cast device and syncs to Audiobookshelf:

```typescript
import { PositionTracker } from 'openclaw-skill-audiobookshelf';

const tracker = new PositionTracker(player, syncCallback, {
  pollIntervalMs: 10000, // 10 seconds
  positionThreshold: 1, // minimum change to sync
  onPlaybackFinished: (position) => console.log('Finished at', position),
  onPlaybackError: (position) => console.log('Error at', position),
});

// Start tracking
tracker.start();

// Get current position
const position = tracker.getCurrentPosition();

// Stop tracking (returns final position)
const finalPosition = tracker.stop();
```

## Sleep Timer

The sleep timer integrates with the audio proxy for silent volume fades:

```typescript
import { CastSleepTimer } from 'openclaw-skill-audiobookshelf';

const timer = new CastSleepTimer(castClient, volumeTransform, {
  durationMs: 30 * 60 * 1000, // 30 minutes
  fadeDurationMs: 30 * 1000, // 30 second fade
  fadeSteps: 30,
  latencyCompensationMs: 2000, // account for audio buffer

  onProgress: (remainingMs) => {
    console.log(`${Math.ceil(remainingMs / 60000)} minutes remaining`);
  },

  onPositionSync: async (position) => {
    await audiobookshelf.syncProgress(bookId, position);
  },

  onComplete: (finalPosition) => {
    console.log(`Stopped at ${finalPosition} seconds`);
  },

  onError: (error, position) => {
    console.error('Timer error:', error);
  },
});

// Start timer
await timer.start();

// Check status
const state = timer.getState();
console.log(state.phase); // 'countdown', 'fading', 'completing', 'inactive'
console.log(state.remainingMs);
console.log(state.position);

// Cancel (returns last position)
const position = timer.cancel();
```

### Volume Fade

The fade happens in the PCM audio stream via the proxy server, not on the Cast device volume. This means:

- **No "bloop" sounds** — Cast device volume is never touched
- **Smooth fade** — 30+ steps over configurable duration
- **Latency compensation** — Fade starts early to account for audio buffer

## Audio Proxy

The audio proxy server transcodes audio and applies real-time volume control:

```typescript
import { ProxyServer, VolumeTransform } from 'openclaw-skill-audiobookshelf';

const proxy = new ProxyServer({
  port: 8765,
  bindAddress: '0.0.0.0',
});

await proxy.start();

// Proxy URL format: http://host:port/stream/{sessionId}
const proxyUrl = proxy.createStreamUrl(originalUrl, {
  format: 'pcm', // or 'mp3'
  sampleRate: 48000,
  channels: 2,
});

// Volume control via session
const session = proxy.getSession(sessionId);
session.transform.setVolume(0.5); // 0.0 to 1.5

// Smooth fade
await fadeOut(session.transform, 30000, { steps: 30 });

await proxy.stop();
```

## Known Limitations

1. **Cast session not persisted** — If the CLI exits, Cast session state is lost. Use OpenClaw integration for persistent sessions.

2. **Audio buffer latency** — 2-4 second delay between volume change and audible effect due to audio buffering.

3. **Single stream per proxy** — Each stream requires its own proxy session. For multiple concurrent streams, run the proxy as a service.

4. **Network requirements** — Cast device and proxy must be on the same network with mDNS/multicast enabled.

## Troubleshooting

### Device not discovered

1. Ensure the Cast device is on the same network
2. Check that mDNS/Bonjour is enabled on your network
3. Try a longer discovery timeout: `discoverDevices({ timeout: 10000 })`
4. Verify with `abs devices` command

### "Not a valid media receiver" error

Some Cast devices (e.g., Cast groups) don't support the Default Media Receiver. Use individual devices instead.

### Volume fade has no effect

1. Ensure audio is streaming through the proxy
2. Check that the proxy URL is being used (not direct Audiobookshelf URL)
3. Verify the VolumeTransform is attached to the stream

### Position tracking stops

1. Check Cast device connection with `castClient.isConnected()`
2. Verify the device didn't go to sleep or disconnect
3. Check network stability

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CAST_INTEGRATION` | Enable integration tests | `false` |
| `CAST_DEVICE` | Device name for integration tests | - |
| `ABS_PROXY_PORT` | Audio proxy port | `8765` |
| `ABS_PROXY_BIND` | Audio proxy bind address | `0.0.0.0` |
