# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Native Google Cast support** — Direct Cast protocol via castv2-client (#16)
  - mDNS device discovery with caching
  - AUDIOBOOK_CHAPTER metadata type for Nest Hub low-light mode
  - Device ID display in `abs devices` command

- **Position tracking** — Real-time playback position tracking (#20)
  - Configurable polling interval
  - Automatic sync to Audiobookshelf
  - Handles playback end and errors

- **Volume control and fade** — Silent volume control via audio proxy (#21)
  - PCM volume manipulation (no Cast bloops)
  - Smooth fade with configurable steps
  - VolumeTransform stream for real-time control

- **Sleep timer with fade-out** — Enhanced sleep timer (#22)
  - Integrates with audio proxy for silent fades
  - Configurable fade duration and steps
  - Position tracking during countdown
  - Latency compensation for audio buffer

- **CLI command updates** (#23)
  - Added `abs status` command
  - Added `--fade` / `-f` flag for sleep timer
  - Device IDs shown in `abs devices` output
  - Updated help text

- **Audio proxy server** — HTTP proxy with volume control (#25)
  - Real-time PCM volume transformation
  - ffmpeg-based audio pipeline
  - Session management for multiple streams

- **Integration tests** — Cast integration test suite (#24)
  - Skipped by default (requires real device)
  - Environment variable configuration
  - Device discovery and connection tests

### Changed

- Sleep timer now defaults to 30-second fade
- Device discovery uses mDNS instead of Home Assistant

### Documentation

- Created `docs/cast.md` with detailed Cast documentation
- Updated `README.md` with native Cast features
- Updated `SKILL.md` with new capabilities
- Added troubleshooting guides

## [0.0.1] - 2024-01-XX

### Added

- Initial release
- Audiobookshelf API client
- Basic CLI with library, books, search, play commands
- Simple sleep timer (without fade)
- Configuration via environment variables and config file
- Multi-user support
