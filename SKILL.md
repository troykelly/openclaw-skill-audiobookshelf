# Audiobookshelf Skill for OpenClaw

## Overview

Control Audiobookshelf audiobook library with voice commands and Google Cast playback.

## Capabilities

- Browse and search audiobook library
- Play audiobooks on Google Cast devices
- Control playback (pause, resume, stop)
- Sleep timer with automatic progress sync
- Multi-user support

## Voice Commands

### Browsing
- "List my audiobooks"
- "Search for [book title]"
- "What libraries do I have?"

### Playback
- "Play [book title]"
- "Play [book title] on [device name]"
- "Pause audiobook"
- "Resume audiobook"
- "Stop audiobook"

### Devices
- "What speakers are available?"
- "Set default speaker to [device name]"

### Sleep Timer
- "Set sleep timer for 30 minutes"
- "Cancel sleep timer"
- "How much time is left on the sleep timer?"

## Configuration

### Required
- Audiobookshelf server URL
- API token

### Optional
- Default Cast device name
- Request timeout

## Setup

1. Get your API token from Audiobookshelf (Settings → Users → API Token)
2. Configure the skill with your server URL and token
3. Optionally set a default Cast device

## Dependencies

- Audiobookshelf server (v2.0+)
- Network access to Cast devices (for Google Cast feature)
