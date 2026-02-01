---
name: audiobookshelf
description: Audiobookshelf integration with Google Cast support and sleep timer.
homepage: https://www.audiobookshelf.org
metadata:
  openclaw:
    emoji: '📚'
    requires:
      bins: ['abs']
    install:
      - id: pnpm
        kind: pnpm
        package: openclaw-skill-audiobookshelf
        bins: ['abs']
        label: 'Install audiobookshelf skill (pnpm)'
---

# Audiobookshelf Skill

Control Audiobookshelf playback with Google Cast support.

## Setup

1. Create an API key in Audiobookshelf (Settings → Users → API Keys)
2. Configure the skill:
   ```bash
   export AUDIOBOOKSHELF_URL="https://your-server.com"
   export AUDIOBOOKSHELF_API_KEY="your-api-key"
   ```

## Commands

### Library

- `abs library` — List libraries
- `abs books [--library <id>]` — List books in library
- `abs search "<query>"` — Search across all libraries

### Playback

- `abs play <book-id> [--device <speaker>]` — Start playback
- `abs resume [--device <speaker>]` — Resume last book from saved position
- `abs pause` — Pause current playback
- `abs stop` — Stop and sync progress

### Devices

- `abs devices` — Discover Google Cast speakers
- `abs device set "<name>"` — Set default speaker

### Sleep Timer

- `abs sleep <minutes>` — Set sleep timer
- `abs sleep cancel` — Cancel sleep timer
- `abs sleep status` — Show timer status

## Multi-user

Each user needs their own API key. Configure per-user in OpenClaw agent config:

```yaml
skills:
  audiobookshelf:
    config:
      url: 'https://abs.example.com'
      apiKey: 'user-specific-key'
```

## Notes

- Progress syncs automatically on pause/stop
- Sleep timer syncs progress before pausing
- Speaker discovery uses mDNS (same network required)
