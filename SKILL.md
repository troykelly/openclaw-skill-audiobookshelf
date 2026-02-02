# Audiobookshelf Skill for OpenClaw

## Overview

Control Audiobookshelf audiobook library with voice commands and Google Cast playback.

## Capabilities

- Browse and search audiobook library
- Play audiobooks on Google Cast devices (native protocol)
- Control playback (pause, resume, stop, seek)
- Sleep timer with silent volume fade
- Position tracking and sync to Audiobookshelf
- Multi-user support with per-user tokens

## Voice Commands

### Browsing

- "List my audiobooks"
- "Search for [book title]"
- "What libraries do I have?"
- "What am I listening to?" (status)

### Playback

- "Play [book title]"
- "Play [book title] on [device name]"
- "Pause audiobook"
- "Resume audiobook"
- "Stop audiobook"
- "Skip forward 30 seconds"
- "Go back 1 minute"

### Devices

- "What speakers are available?"
- "Set default speaker to [device name]"
- "List Cast devices"

### Sleep Timer

- "Set sleep timer for 30 minutes"
- "Set sleep timer for 1 hour with 60 second fade"
- "Cancel sleep timer"
- "How much time is left on the sleep timer?"

## CLI Commands

```bash
# Library
abs library              # List libraries
abs books                # List all books
abs search "<query>"     # Search books

# Playback
abs play <id> [--device] # Start playback
abs resume               # Resume last book
abs pause                # Pause playback
abs stop                 # Stop and sync

# Status
abs status               # Current playback status

# Devices
abs devices              # List Cast devices (with IDs)
abs device set "<name>"  # Set default device

# Sleep Timer
abs sleep <min>          # Set timer
abs sleep 30 --fade 45   # Timer with custom fade
abs sleep status         # Timer status
abs sleep cancel         # Cancel timer
```

## Configuration

### Required

- `ABS_SERVER` — Audiobookshelf server URL
- `ABS_TOKEN` — API token (get from Audiobookshelf settings)

### Optional

- `ABS_DEVICE` — Default Cast device name
- `ABS_TIMEOUT` — Request timeout in milliseconds

## Setup

1. Get your API token from Audiobookshelf (Settings → Users → API Token)
2. Configure the skill with your server URL and token
3. Optionally set a default Cast device

## Technical Details

### Native Cast Support

This skill uses native Google Cast protocol:

- **castv2-client** — Cast protocol communication
- **bonjour-service** — mDNS device discovery
- **AUDIOBOOK_CHAPTER metadata** — Nest Hub low-light mode support

### Position Tracking

Position is tracked during playback and synced to Audiobookshelf:

- Polling interval: 10 seconds (configurable)
- Syncs on pause, stop, and sleep timer expiry
- Handles playback end and errors gracefully

### Sleep Timer

The sleep timer provides:

- Countdown with configurable duration
- Silent volume fade via PCM stream (no Cast bloops)
- Default 30-second fade (configurable)
- Latency compensation for audio buffer
- Position sync before pause

### Audio Proxy

For volume control, audio streams through a local proxy:

- Transcodes to PCM for volume manipulation
- Applies real-time volume changes
- Supports smooth fades

## Dependencies

- Audiobookshelf server (v2.0+)
- Network access to Cast devices
- mDNS/Bonjour enabled on network

## Limitations

- Cast session not persisted across CLI restarts
- Audio buffer causes 2-4 second volume fade latency
- Cast groups may not work (use individual devices)
