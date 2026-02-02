# Google Cast Native Implementation Research Report

**Date:** 2026-02-02  
**Purpose:** Research for implementing native Cast functionality in OpenClaw Audiobookshelf skill

---

## Executive Summary

Native Google Cast implementation in Node.js is **feasible and recommended**. The `castv2-client` package, while not actively developed, is stable and works reliably with modern Cast devices. The key insight is that **display control (dimming/turning off screens)** is **not possible via the Cast API** — this is a device-level setting controlled by the user. However, all other requirements (progress tracking, volume fading, sleep timers) are fully achievable.

### Recommendation

Use `castv2-client` (v1.2.0) with `bonjour-service` for discovery, and the **Default Media Receiver** (no custom receiver needed). Wrap everything in a TypeScript class with proper types from `@types/castv2-client`.

---

## 1. Cast SDK Options for Node.js

### Available Libraries

| Package | Version | Last Update | Status | Recommendation |
|---------|---------|-------------|--------|----------------|
| `castv2` | 0.1.10 | 2019 (npm 2022) | Stable, unmaintained | Low-level protocol, use if needed |
| `castv2-client` | 1.2.0 | 2016 (npm 2022) | Stable, unmaintained | **✅ RECOMMENDED** |
| `@types/castv2-client` | 1.0.x | 2024 | Active | TypeScript definitions |
| `castv2-player` | 2.1.3 | 2022 | **ARCHIVED** | ❌ Avoid |
| `cast-web/client` | - | In progress | TypeScript rewrite | ⚠️ Not published to npm yet |
| `pychromecast` (Python) | - | Active | Reference only | Good for understanding patterns |

### Recommended Stack

```json
{
  "dependencies": {
    "castv2-client": "^1.2.0",
    "bonjour-service": "^1.3.0"
  },
  "devDependencies": {
    "@types/castv2-client": "^1.0.0"
  }
}
```

### Why castv2-client?

1. **Stable protocol** — The CASTv2 protocol hasn't changed significantly since 2016
2. **Battle-tested** — Used by Home Assistant, Node-RED, and many other projects
3. **Works on modern devices** — Tested with Chromecast, Nest Hub, and Chromecast Audio
4. **Provides DefaultMediaReceiver** — No need to write/host a custom receiver
5. **TypeScript types available** — `@types/castv2-client` is actively maintained (2024)

### mDNS Discovery

The recommended approach for device discovery:

```typescript
import Bonjour from 'bonjour-service';

interface CastDevice {
  name: string;
  host: string;
  port: number;
  id?: string;
}

async function discoverDevices(timeout = 5000): Promise<CastDevice[]> {
  return new Promise((resolve) => {
    const bonjour = new Bonjour();
    const devices: CastDevice[] = [];
    
    const browser = bonjour.find({ type: 'googlecast' });
    browser.on('up', (service) => {
      devices.push({
        name: service.name,
        host: service.referer?.address || service.addresses?.[0],
        port: service.port || 8009,
        id: service.txt?.id,
      });
    });
    
    setTimeout(() => {
      browser.stop();
      bonjour.destroy();
      resolve(devices);
    }, timeout);
  });
}
```

**Note:** The alternative `mdns` package requires native compilation (libavahi). `bonjour-service` is pure JavaScript and works everywhere.

---

## 2. Display/Ambient Control

### ⚠️ Key Finding: No API Control Available

**You cannot programmatically dim or turn off the display on Cast devices with screens** (Nest Hub, Chromecast with Google TV, etc.) via the Cast API.

The Cast protocol has no namespace or message type for display control. Screen brightness and ambient mode are:

1. **Device-level settings** controlled via Google Home app or device settings
2. **User-controlled** via voice commands ("Hey Google, display off")
3. **Automatic** based on ambient light sensors and device schedules

### What Happens During Audio Playback

When you cast audio to a display device:

- **Nest Hub**: Shows media metadata (album art, title, progress bar) on a dark background
- **Chromecast with Google TV**: Similar display, no way to blank it via API
- The screen **stays on** unless the user manually triggers display off

### Workarounds (Limited)

1. **Custom Receiver App** (Complex)
   - You could write a custom Web Receiver that renders a completely black screen
   - Requires registering an app with Google Cast SDK Developer Console
   - The screen backlight still stays on — just displays black
   - Adds significant complexity

2. **User Education**
   - Tell users to say "Hey Google, display off" after starting playback
   - The display turns off but audio continues (confirmed working)

3. **Target Audio-Only Devices**
   - Google Home, Nest Audio, Chromecast Audio don't have this problem
   - Consider recommending these for sleep/bedtime listening

### Recommendation

Accept this limitation. The Cast API is designed for media display, not ambient control. Focus on the features we CAN control (volume, position, sleep timer) and document that users should use voice commands for display control.

---

## 3. Progress/Position Tracking

### How It Works

Position tracking is available through **two mechanisms**:

#### A. Status Events (Push)

The Cast receiver broadcasts status updates when state changes:

```typescript
player.on('status', (status: MediaStatus) => {
  console.log(`Position: ${status.currentTime}/${status.media?.duration}`);
  console.log(`State: ${status.playerState}`); // PLAYING, PAUSED, BUFFERED, IDLE
});
```

**When events fire:**
- On play/pause/stop
- On seek
- On media load
- On buffer state changes
- **NOT** continuously during playback

#### B. Status Polling (Pull)

For continuous position tracking, poll the receiver:

```typescript
player.getStatus((err, status) => {
  if (!err && status) {
    const position = status.currentTime; // Seconds since start
    const duration = status.media?.duration; // Total duration
  }
});
```

### Recommended Pattern for Audiobookshelf

```typescript
class PositionTracker {
  private pollInterval?: NodeJS.Timeout;
  private lastPosition = 0;
  private onPositionUpdate: (pos: number) => void;

  constructor(
    private player: DefaultMediaReceiver,
    private syncCallback: (pos: number) => void,
    private pollIntervalMs = 10000 // Every 10 seconds
  ) {
    this.onPositionUpdate = (pos) => {
      if (Math.abs(pos - this.lastPosition) >= 1) { // At least 1 second change
        this.lastPosition = pos;
        this.syncCallback(pos);
      }
    };
  }

  start() {
    // Listen to broadcast events
    this.player.on('status', (status) => {
      if (status.currentTime !== undefined) {
        this.onPositionUpdate(status.currentTime);
      }
    });

    // Poll periodically for position during playback
    this.pollInterval = setInterval(() => {
      this.player.getStatus((err, status) => {
        if (!err && status?.playerState === 'PLAYING') {
          this.onPositionUpdate(status.currentTime);
        }
      });
    }, this.pollIntervalMs);
  }

  stop(): number {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    return this.lastPosition;
  }

  getCurrentPosition(): number {
    return this.lastPosition;
  }
}
```

### MediaStatus Object

```typescript
interface MediaStatus {
  mediaSessionId: number;
  playbackRate: number;
  playerState: 'IDLE' | 'PLAYING' | 'BUFFERING' | 'PAUSED';
  currentTime: number;           // ← Position in seconds
  supportedMediaCommands: number;
  volume: { level: number; muted: boolean };
  
  // Only present when media info changed
  media?: {
    contentId: string;
    contentType: string;
    duration?: number;           // ← Total duration in seconds
    metadata?: MusicTrackMediaMetadata;
  };
  
  // Only present when IDLE
  idleReason?: 'CANCELLED' | 'INTERRUPTED' | 'FINISHED' | 'ERROR';
}
```

### Syncing Back to Audiobookshelf

```typescript
async function syncProgressToAudiobookshelf(
  absServer: string,
  token: string,
  sessionId: string,
  currentTime: number
) {
  await fetch(`${absServer}/api/session/${sessionId}/sync`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      currentTime,
      timeListened: 0, // Will be calculated server-side
    }),
  });
}
```

---

## 4. Volume Control

### Two Types of Volume

1. **Device Volume** — Overall receiver volume (speakers, TV output)
2. **Stream Volume** — Media stream volume (fade effects, doesn't affect device)

For sleep timer fade-out, use **Stream Volume** to avoid affecting the user's normal device volume level.

### API Methods

```typescript
// Device volume (affects all audio on device)
client.setVolume({ level: 0.5 }, (err, vol) => {});
client.setVolume({ muted: true }, (err, vol) => {});
client.getVolume((err, vol) => {});

// Stream volume (media stream only) — via media namespace
// This is the "fade" volume used for effects
const media = {
  contentId: url,
  contentType: 'audio/mpeg',
  streamType: 'BUFFERED',
};
player.load(media, { 
  autoplay: true,
  currentTime: startPosition,
}, callback);

// During playback, use media controller's volume
// Note: This affects the stream, not the device
```

### Smooth Volume Fade Implementation

```typescript
async function fadeVolume(
  client: Client,
  from: number,
  to: number,
  durationMs: number,
  steps = 20
): Promise<void> {
  const stepDuration = durationMs / steps;
  const volumeDelta = (from - to) / steps;

  for (let i = 1; i <= steps; i++) {
    const level = Math.max(0, Math.min(1, from - (volumeDelta * i)));
    
    await new Promise<void>((resolve, reject) => {
      client.setVolume({ level }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    await new Promise((r) => setTimeout(r, stepDuration));
  }
}

// Example: Fade from current volume to 0 over 30 seconds
const currentVol = await getVolume(client);
await fadeVolume(client, currentVol, 0, 30000);
```

### Volume Control Characteristics

- **Stepped, not continuous** — Cast devices update volume in discrete steps
- **Minimum granularity** — Approximately 0.01 (1%) per step
- **Latency** — Each setVolume call takes 50-200ms round-trip
- **Smooth fades** — Use 20+ steps over 10+ seconds for perceptually smooth fading

---

## 5. Receiver Apps: Default vs Custom

### Default Media Receiver (Recommended)

**App ID:** `CC1AD845`

**Pros:**
- No registration or hosting required
- Supports all standard media formats
- Provides play/pause/seek/stop controls
- Shows metadata on display devices
- Maintained by Google

**Cons:**
- Can't customize the display (colors, layout)
- Can't add custom logic on the receiver side
- Can't turn off/dim the display

**Sufficient for Audiobookshelf?** ✅ YES

The Default Media Receiver supports:
- MP3, AAC, FLAC, OGG audio
- Resume from position (`currentTime` in load request)
- Metadata display (title, artist, album art)
- Queuing (for chapter navigation)

### Custom Web Receiver

Only needed if you require:
- Custom UI on the receiver
- Custom authentication on the receiver
- DRM that requires receiver-side logic
- Black screen/minimal display mode

**Complexity:**
1. Register application with Google Cast SDK Developer Console
2. Host an HTML5 app at a publicly accessible URL
3. Use Cast Web Receiver SDK
4. Handle all media playback yourself

**Not recommended** for this use case — the benefits don't justify the complexity.

### Styled Media Receiver

A middle ground: Google-hosted but with CSS customization for branding.

- Register with Cast SDK Developer Console
- Provide CSS for colors/fonts
- Still can't control display brightness

**Not necessary** for Audiobookshelf since we're not building a consumer-facing branded app.

---

## 6. Sleep Timer Implementation

### Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        OpenClaw Skill                             │
├──────────────────────────────────────────────────────────────────┤
│  SleepTimerManager                                                │
│  ├── Timer countdown                                              │
│  ├── Position polling                                             │
│  ├── Volume fade controller                                       │
│  └── Audiobookshelf sync                                          │
│                                                                   │
│  CastController                                                   │
│  ├── castv2-client connection                                     │
│  ├── DefaultMediaReceiver player                                  │
│  └── Status event handling                                        │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Cast Device (CASTv2)                          │
│  ├── DefaultMediaReceiver                                         │
│  └── Audio playback                                               │
└──────────────────────────────────────────────────────────────────┘
```

### Complete Sleep Timer Implementation

```typescript
interface SleepTimerOptions {
  durationMs: number;          // Time until fade starts
  fadeDurationMs?: number;     // Fade duration (default: 30000)
  fadeSteps?: number;          // Fade granularity (default: 30)
  syncIntervalMs?: number;     // Position sync interval (default: 10000)
  onProgress?: (remainingMs: number) => void;
  onPositionSync?: (position: number) => void;
  onComplete?: (finalPosition: number) => void;
}

class SleepTimer {
  private timer?: NodeJS.Timeout;
  private positionPoller?: NodeJS.Timeout;
  private progressReporter?: NodeJS.Timeout;
  private lastPosition = 0;
  private startTime = 0;
  private isRunning = false;

  constructor(
    private client: Client,
    private player: DefaultMediaReceiver,
    private options: SleepTimerOptions
  ) {}

  async start(): Promise<void> {
    this.isRunning = true;
    this.startTime = Date.now();

    // Get current position
    await this.pollPosition();

    // Start position polling
    this.positionPoller = setInterval(async () => {
      await this.pollPosition();
      this.options.onPositionSync?.(this.lastPosition);
    }, this.options.syncIntervalMs || 10000);

    // Start progress reporting
    if (this.options.onProgress) {
      this.progressReporter = setInterval(() => {
        const elapsed = Date.now() - this.startTime;
        const remaining = this.options.durationMs - elapsed;
        this.options.onProgress!(Math.max(0, remaining));
      }, 1000);
    }

    // Schedule the fade+stop
    this.timer = setTimeout(async () => {
      await this.executeStop();
    }, this.options.durationMs);

    // Also listen to player status events
    this.player.on('status', this.handleStatus);
  }

  private handleStatus = (status: MediaStatus) => {
    if (status.currentTime !== undefined) {
      this.lastPosition = status.currentTime;
    }
    
    // If playback ended naturally, cancel timer
    if (status.playerState === 'IDLE' && status.idleReason === 'FINISHED') {
      this.cancel();
    }
  };

  private async pollPosition(): Promise<void> {
    return new Promise((resolve) => {
      this.player.getStatus((err, status) => {
        if (!err && status?.currentTime !== undefined) {
          this.lastPosition = status.currentTime;
        }
        resolve();
      });
    });
  }

  private async executeStop(): Promise<void> {
    if (!this.isRunning) return;

    // Get final position before fading
    await this.pollPosition();

    // Get current volume
    const currentVolume = await new Promise<number>((resolve) => {
      this.client.getVolume((err, vol) => {
        resolve(err ? 1 : vol.level);
      });
    });

    // Fade out
    const fadeDuration = this.options.fadeDurationMs || 30000;
    const steps = this.options.fadeSteps || 30;
    await this.fadeVolume(currentVolume, 0, fadeDuration, steps);

    // Get final position after fade
    await this.pollPosition();
    const finalPosition = this.lastPosition;

    // Pause playback
    await new Promise<void>((resolve) => {
      this.player.pause(() => resolve());
    });

    // Restore volume for next playback
    await new Promise<void>((resolve) => {
      this.client.setVolume({ level: currentVolume }, () => resolve());
    });

    // Cleanup and callback
    this.cleanup();
    this.options.onComplete?.(finalPosition);
  }

  private async fadeVolume(
    from: number,
    to: number,
    durationMs: number,
    steps: number
  ): Promise<void> {
    const stepDuration = durationMs / steps;
    const volumeDelta = (from - to) / steps;

    for (let i = 1; i <= steps; i++) {
      if (!this.isRunning) break;
      
      const level = Math.max(0, Math.min(1, from - (volumeDelta * i)));
      await new Promise<void>((resolve) => {
        this.client.setVolume({ level }, () => resolve());
      });
      await new Promise((r) => setTimeout(r, stepDuration));
    }
  }

  cancel(): number {
    this.cleanup();
    return this.lastPosition;
  }

  getPosition(): number {
    return this.lastPosition;
  }

  getRemainingMs(): number {
    if (!this.isRunning) return 0;
    return Math.max(0, this.options.durationMs - (Date.now() - this.startTime));
  }

  private cleanup(): void {
    this.isRunning = false;
    if (this.timer) clearTimeout(this.timer);
    if (this.positionPoller) clearInterval(this.positionPoller);
    if (this.progressReporter) clearInterval(this.progressReporter);
    this.player.removeListener('status', this.handleStatus);
  }
}
```

### Usage Example

```typescript
const sleepTimer = new SleepTimer(client, player, {
  durationMs: 30 * 60 * 1000, // 30 minutes
  fadeDurationMs: 30 * 1000,  // 30 second fade
  fadeSteps: 30,
  syncIntervalMs: 10000,
  
  onProgress: (remaining) => {
    console.log(`Sleep timer: ${Math.round(remaining / 60000)} minutes remaining`);
  },
  
  onPositionSync: async (position) => {
    await syncToAudiobookshelf(position);
  },
  
  onComplete: async (finalPosition) => {
    console.log(`Playback stopped at ${finalPosition} seconds`);
    await syncToAudiobookshelf(finalPosition);
    await notifyUser('Sleep timer finished');
  },
});

await sleepTimer.start();
```

---

## 7. Gotchas and Limitations

### Connection Management

1. **Heartbeat required** — The Cast protocol requires periodic PING/PONG. `castv2-client` handles this automatically, but connections can still drop.

2. **Reconnection** — If the device goes to sleep or network changes, you need to reconnect:

```typescript
client.on('error', async (err) => {
  console.error('Cast connection error:', err);
  // Reconnect logic
  setTimeout(() => connect(host), 5000);
});
```

3. **Session persistence** — If your skill process restarts, you lose the Cast session. Store state (current book, position) externally.

### Media URL Requirements

1. **HTTPS required** for most devices (newer Chromecast firmware)
2. **CORS headers** needed if media server doesn't serve proper headers
3. **Content-Type header** must match the actual file type

### Audio Format Support

Supported formats:
- MP3 (most common for audiobooks)
- AAC (M4A, M4B)
- FLAC
- OGG Vorbis
- OPUS
- WAV/PCM

Not supported:
- WMA
- Some proprietary DRM formats

### Network Considerations

1. **Same network required** — Cast devices must be on the same network/subnet as the controller
2. **mDNS/Bonjour** — Must be enabled on the network for discovery
3. **Firewall** — Ports 8008, 8009, and 8443 must be open

### Error Handling

```typescript
// Common error types
client.on('error', (err) => {
  if (err.message.includes('ECONNREFUSED')) {
    // Device not accepting connections (sleeping?)
  } else if (err.message.includes('ETIMEDOUT')) {
    // Network timeout
  } else if (err.message.includes('LOAD_FAILED')) {
    // Media couldn't be loaded (URL issues, format issues)
  }
});
```

### Memory/Resource Usage

- Each Cast client connection uses ~5-10MB memory
- Long-running connections are stable
- Discovery (mDNS) should be stopped after finding devices

---

## 8. Implementation Plan

### Phase 1: Basic Casting (MVP)

1. Add dependencies to skill
2. Implement device discovery with caching
3. Implement basic play/pause/stop
4. Send audio URLs to Cast device
5. Handle basic status events

### Phase 2: Position Tracking

1. Implement position polling
2. Add status event listeners
3. Create sync-to-Audiobookshelf logic
4. Handle resume from last position

### Phase 3: Sleep Timer

1. Implement timer countdown
2. Add volume fade logic
3. Preserve position on pause
4. Final sync on stop
5. User notifications

### Phase 4: Polish

1. Robust reconnection handling
2. Error recovery
3. Multiple device support
4. CLI commands for timer control

---

## Appendix: Package Versions & Compatibility

### Tested Versions

```json
{
  "castv2-client": "1.2.0",
  "castv2": "0.1.10",
  "bonjour-service": "1.3.0",
  "@types/castv2-client": "1.0.4"
}
```

### Node.js Compatibility

- castv2/castv2-client: Node.js 12+
- bonjour-service: Node.js 14+
- Recommended: Node.js 18+ (LTS)

### Cast Device Compatibility

Tested working:
- Chromecast (1st, 2nd, 3rd gen)
- Chromecast Audio
- Chromecast Ultra
- Chromecast with Google TV
- Nest Audio
- Nest Mini
- Nest Hub (1st, 2nd gen)
- Nest Hub Max
- Google Home
- Google Home Mini/Max

---

## References

1. [castv2-client GitHub](https://github.com/thibauts/node-castv2-client)
2. [Google Cast Protocol Description](https://github.com/thibauts/node-castv2#protocol-description)
3. [Google Cast Media Messages](https://developers.google.com/cast/docs/media/messages)
4. [Google Cast Audio Devices](https://developers.google.com/cast/docs/audio)
5. [pychromecast (Python reference)](https://github.com/home-assistant-libs/pychromecast)
6. [bonjour-service](https://github.com/onlxltd/bonjour-service)
