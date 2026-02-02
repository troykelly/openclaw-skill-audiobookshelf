# OpenClaw Skill: Audiobookshelf

A complete OpenClaw skill for [Audiobookshelf](https://www.audiobookshelf.org/) with native Google Cast support.

## Features

- 📚 **Library browsing** — List libraries, books, and search
- ▶️ **Playback control** — Start, pause, resume, stop with progress sync
- 📺 **Native Google Cast** — Direct Cast protocol, no Home Assistant required
- 🌙 **Nest Hub low-light mode** — Uses AUDIOBOOK_CHAPTER metadata type
- 😴 **Sleep timer** — Silent volume fade via audio proxy, no Cast bloops
- 📍 **Position tracking** — Real-time sync back to Audiobookshelf
- 👥 **Multi-user** — Per-user API key configuration

## Installation

```bash
# Install globally with pnpm (recommended)
pnpm add -g @openclaw/skill-audiobookshelf

# Or with npm
npm install -g @openclaw/skill-audiobookshelf
```

## Quick Start

1. **Configure your Audiobookshelf server:**

```bash
# Using environment variables
export ABS_SERVER="https://your-audiobookshelf-server.com"
export ABS_TOKEN="your-api-token"

# Or create a config file
mkdir -p ~/.config/abs
cat > ~/.config/abs/config.json << EOF
{
  "url": "https://your-audiobookshelf-server.com",
  "apiKey": "your-api-token",
  "defaultDevice": "Living Room Speaker"
}
EOF
```

2. **List your libraries:**
```bash
abs library
```

3. **Search for a book:**
```bash
abs search "Project Hail Mary"
```

4. **Start playback:**
```bash
abs play <book-id> --device "Living Room"
```

## Command Reference

### Library Commands

```bash
# List all libraries
abs library

# List books in a library
abs books --library <library-id>

# Search across all libraries
abs search "<query>"
```

### Playback Commands

```bash
# Start playback on a Cast device
abs play <book-id> [--device <name>]

# Resume last book
abs resume [--device <name>]

# Pause current playback
abs pause

# Stop and sync progress
abs stop

# Show current playback status
abs status
```

### Device Commands

```bash
# List available Cast devices (with IDs)
abs devices

# Set default device
abs device set "<name>"
```

### Sleep Timer Commands

```bash
# Set sleep timer with volume fade (default: 30s fade)
abs sleep <minutes> [--fade <seconds>]

# Check timer status
abs sleep status

# Cancel timer
abs sleep cancel
```

### Global Options

```bash
# Show help
abs --help

# Show version
abs --version

# Output as JSON (for scripting)
abs library --json
abs devices --json
abs status --json
```

## Native Google Cast

This skill uses native Cast protocol for device control:

- **mDNS discovery** — Automatically finds Cast devices on your network
- **AUDIOBOOK_CHAPTER metadata** — Enables Nest Hub low-light mode
- **Silent volume fades** — PCM volume control via audio proxy
- **Position tracking** — Real-time sync with configurable intervals

For detailed Cast documentation, see [docs/cast.md](./docs/cast.md).

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ABS_SERVER` | Audiobookshelf server URL | - |
| `ABS_TOKEN` | API token | - |
| `ABS_DEVICE` | Default Cast device name | - |
| `ABS_TIMEOUT` | Request timeout (ms) | 10000 |

### Config File

Location: `~/.config/abs/config.json` (or `$XDG_CONFIG_HOME/abs/config.json`)

```json
{
  "url": "https://abs.example.com",
  "apiKey": "your-api-key",
  "defaultDevice": "Living Room",
  "timeout": 10000
}
```

### Priority Order

1. Command-line flags (highest)
2. Environment variables
3. Config file (lowest)

## Sleep Timer with Fade

The sleep timer performs a silent volume fade:

```bash
# 30 minute timer with default 30-second fade
abs sleep 30

# Custom fade duration
abs sleep 30 --fade 60  # 60-second fade
```

The fade happens in the PCM audio stream, not via Cast device volume, so there are no "bloop" sounds.

## Multi-User Setup

For households with multiple Audiobookshelf accounts:

1. Each user creates their own config file with their API key
2. Set `ABS_TOKEN` per-user in shell profile
3. Or use OpenClaw's per-user skill configuration

## Getting Your API Token

1. Log in to your Audiobookshelf server
2. Go to Settings → Users → Your User
3. Click "API Token" to generate/view your token

## Troubleshooting

### "Connection refused" errors

- Verify `ABS_SERVER` URL is correct
- Check that Audiobookshelf is running
- Ensure your API token is valid

### Cast device not found

- Ensure your device is on the same network
- Check that mDNS/Bonjour is enabled
- Run `abs devices` to see available devices
- Try increasing discovery timeout

### Sleep timer not working

- Check that Cast device is still connected
- Verify playback is active with `abs status`
- Ensure audio proxy is running

### No volume fade (instant silence)

- Ensure audio is streaming through the proxy
- Check network connectivity between proxy and Cast device

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Runtime error |
| 2 | Usage/argument error |

## Development

```bash
# Clone the repo
git clone https://github.com/troykelly/openclaw-skill-audiobookshelf

# Install dependencies
pnpm install

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Build
pnpm build

# Lint
pnpm lint

# Type check
pnpm typecheck
```

### Integration Tests

Integration tests require a real Cast device:

```bash
CAST_INTEGRATION=true CAST_DEVICE="Living Room" pnpm test:run tests/cast-integration.test.ts
```

## License

MIT © Troy Kelly

## Links

- [Audiobookshelf](https://www.audiobookshelf.org/)
- [Audiobookshelf API Docs](https://api.audiobookshelf.org/)
- [OpenClaw](https://openclaw.io/)
- [Cast Documentation](./docs/cast.md)
