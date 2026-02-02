# Audiobookshelf Cast Proxy - Docker Image
#
# Build:
#   docker build -t abs-proxy .
#
# Run:
#   docker run -d \
#     -e ABS_SERVER=https://your-audiobookshelf-server.com \
#     -e ABS_TOKEN=your-api-token \
#     -p 8765:8765 \
#     abs-proxy
#
# With volume for config:
#   docker run -d \
#     -v /path/to/config:/config \
#     -p 8765:8765 \
#     abs-proxy

FROM node:22-alpine

# Install ffmpeg for audio processing
RUN apk add --no-cache ffmpeg

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm && \
    pnpm install --prod --frozen-lockfile

# Copy built application
COPY dist ./dist
COPY SKILL.md README.md LICENSE ./

# Create non-root user
RUN addgroup -g 1001 -S absgroup && \
    adduser -u 1001 -S absuser -G absgroup

USER absuser

# Environment variables (override at runtime)
ENV NODE_ENV=production
ENV ABS_PROXY_PORT=8765
# ABS_SERVER and ABS_TOKEN must be provided at runtime

# Expose proxy port
EXPOSE 8765

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${ABS_PROXY_PORT}/health || exit 1

# Run proxy server
CMD ["node", "dist/bin/abs.js", "service", "run"]
