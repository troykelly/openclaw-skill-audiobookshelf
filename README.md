# OpenClaw Skill: Audiobookshelf

A complete OpenClaw skill for [Audiobookshelf](https://www.audiobookshelf.org/) with Google Cast support.

## Features

- 📚 **Library browsing** - List libraries, books, and search
- ▶️ **Playback control** - Start, pause, resume, stop with progress sync
- 📺 **Google Cast** - Discover speakers and cast audio streams
- 😴 **Sleep timer** - Automatic pause with progress sync
- 👥 **Multi-user** - Per-user API key configuration

## Installation

```bash
# Install globally
npm install -g @openclaw/skill-audiobookshelf

# Or with pnpm
pnpm add -g @openclaw/skill-audiobookshelf
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
# Start playback
abs play <book-id> [--device <name>]

# Resume last book
abs resume [--device <name>]

# Pause current playback
abs pause

# Stop and sync progress
abs stop
```

### Device Commands

```bash
# List available Cast devices
abs devices

# Set default device
abs device set "<name>"
```

### Sleep Timer Commands

```bash
# Set sleep timer (pauses and syncs after N minutes)
abs sleep <minutes>

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
```

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `ABS_SERVER` | Audiobookshelf server URL |
| `ABS_TOKEN` | API token |
| `ABS_DEVICE` | Default Cast device name |
| `ABS_TIMEOUT` | Request timeout (ms) |

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
- Check that the device name matches exactly
- Run `abs devices` to see available devices

### Sleep timer not working

- Check that Cast device is still connected
- Verify playback is active with `abs sleep status`

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

# Build
pnpm build

# Lint
pnpm lint
```

## License

MIT © Troy Kelly

## Links

- [Audiobookshelf](https://www.audiobookshelf.org/)
- [Audiobookshelf API Docs](https://api.audiobookshelf.org/)
- [OpenClaw](https://openclaw.io/)
