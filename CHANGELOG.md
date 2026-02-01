# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-02-01

### Added

- Initial release
- Audiobookshelf API client
  - Library listing
  - Book listing and search
  - Progress tracking
  - Playback session management
- Google Cast controller
  - mDNS device discovery
  - Audio stream casting with metadata
  - Playback controls (play, pause, seek, stop)
  - Current time tracking
- CLI with comprehensive command set
  - `library` - list libraries
  - `books` - list books with library filter
  - `search` - search across libraries
  - `play` - start playback on Cast device
  - `resume` - resume last book
  - `pause` - pause playback
  - `stop` - stop and sync progress
  - `devices` - list Cast devices
  - `device set` - set default device
  - `sleep` - sleep timer with progress sync
- Sleep timer with automatic progress sync
  - Configurable duration
  - Cancel and status commands
  - Graceful error handling
- Multi-user configuration
  - Config file support (~/.config/abs/config.json)
  - Environment variable support
  - XDG base directory compliance
  - Secure API key handling (redaction in display)
- Full test coverage (140+ tests)
- TypeScript with strict mode
- ESLint with strict rules
- CI/CD pipeline

### Security

- API keys are never logged or displayed in full
- Only last 4 characters shown in config display
