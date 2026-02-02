# Deployment Files

This directory contains deployment configurations for running the audio proxy as a service.

## Quick Start

### Integrated Mode (CLI)

Run the proxy directly:

```bash
# Run in foreground (Ctrl+C to stop)
abs service run

# Check if proxy is running
abs service status
```

### Docker

The easiest way to run the proxy as a persistent service:

```bash
# Build the image
docker build -t abs-proxy .

# Run with environment variables
docker run -d \
  --name abs-proxy \
  -e ABS_SERVER=https://your-server.com \
  -e ABS_TOKEN=your-token \
  -p 8765:8765 \
  abs-proxy

# Or use docker-compose
cp .env.example .env
# Edit .env with your settings
docker-compose up -d
```

### systemd (Linux)

For Linux servers:

```bash
# Copy the service file
sudo cp deploy/abs-proxy.service /etc/systemd/system/

# Edit the environment variables
sudo systemctl edit abs-proxy
# Or create /etc/abs-proxy.env with ABS_SERVER and ABS_TOKEN

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable abs-proxy
sudo systemctl start abs-proxy

# Check status
sudo systemctl status abs-proxy
journalctl -u abs-proxy -f
```

### launchd (macOS)

For macOS:

```bash
# Copy the plist file
cp deploy/com.openclaw.abs-proxy.plist ~/Library/LaunchAgents/

# Edit the EnvironmentVariables in the plist file
nano ~/Library/LaunchAgents/com.openclaw.abs-proxy.plist

# Load the service
launchctl load ~/Library/LaunchAgents/com.openclaw.abs-proxy.plist

# Check status
launchctl list | grep abs-proxy

# View logs
tail -f /tmp/abs-proxy.log
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ABS_SERVER` | Audiobookshelf server URL | Required |
| `ABS_TOKEN` | API token | Required |
| `ABS_PROXY_PORT` | Proxy listen port | 8765 |

### Health Check

The proxy exposes a health endpoint:

```bash
curl http://localhost:8765/health
# {"status":"ok","sessions":0}
```

## Network Requirements

For Cast device discovery (mDNS), the proxy needs to be on the same network as your Cast devices.

- **Docker bridge mode**: Cast discovery won't work. Use `--network host` or a macvlan network.
- **Docker host mode**: Full Cast discovery works, but port conflicts are possible.
- **Systemd/launchd**: Full Cast discovery works.

## Files

- `abs-proxy.service` - systemd unit file for Linux
- `com.openclaw.abs-proxy.plist` - launchd plist for macOS
- `../Dockerfile` - Docker image definition
- `../docker-compose.yml` - Docker Compose configuration
