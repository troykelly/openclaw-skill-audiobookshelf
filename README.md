# openclaw-skill-audiobookshelf

OpenClaw skill for Audiobookshelf integration with Google Cast support.

## Features

- **Library browsing** — Browse and search your Audiobookshelf library
- **Resume playback** — Fetch progress and resume from last position
- **Google Cast** — Cast to Google speakers via castv2-client
- **Sleep timer** — Auto-pause after N minutes with progress sync

## Requirements

- [Audiobookshelf](https://www.audiobookshelf.org/) server (v2.26.0+ for API key auth)
- API key per user (Settings → Users → API Keys)
- Google Cast compatible speakers on the same network

## Installation

```bash
# Install via ClawdHub (coming soon)
clawdhub install audiobookshelf

# Or manually
pnpm install
```

## Configuration

Set your Audiobookshelf server URL and API key:

```bash
# Per-user configuration
export AUDIOBOOKSHELF_URL="https://your-server.com"
export AUDIOBOOKSHELF_API_KEY="your-api-key"
```

## Usage

```bash
# Browse library
abs library list

# Search
abs search "project hail mary"

# Resume playback on a speaker
abs play --resume --device "Living Room"

# Set sleep timer
abs sleep 30  # pause in 30 minutes
```

## License

MIT
