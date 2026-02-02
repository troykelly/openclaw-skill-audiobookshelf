#!/usr/bin/env node
/**
 * abs - Audiobookshelf CLI
 *
 * Command-line interface for Audiobookshelf with Google Cast support.
 */

import { parseCLI, getHelpText, getVersion } from '../lib/cli.js';
import { loadConfig, saveConfig, Config } from '../lib/config.js';
import { AudiobookshelfClient } from '../lib/client.js';
import { CastController } from '../lib/cast.js';
import type { CastDevice } from '../lib/types.js';
import { SleepTimer } from '../lib/sleep-timer.js';
import { getDeviceCache } from '../cast/device-cache.js';

async function main(): Promise<void> {
  const result = parseCLI(process.argv.slice(2));

  if (result.error) {
    console.error(`Error: ${result.error}`);
    console.error('Run "abs --help" for usage information.');
    process.exit(result.exitCode);
  }

  // Handle special commands first
  if (result.command === 'help' || result.flags.help) {
    console.log(getHelpText());
    process.exit(0);
  }

  if (result.command === 'version' || result.flags.version) {
    console.log(getVersion());
    process.exit(0);
  }

  // Load configuration
  const config = await loadConfig();

  // Commands that don't need full config validation
  if (result.command === 'devices') {
    const cast = new CastController();
    const deviceCache = getDeviceCache();
    
    // Check if we should use cache or force refresh
    const forceRefresh = result.flags.refresh;
    let devices = forceRefresh ? [] : deviceCache.getAll();
    
    if (devices.length === 0 || forceRefresh) {
      console.log('Discovering Cast devices...');
      devices = await cast.discoverDevices({ timeout: 15000 });
      deviceCache.update(devices);
    } else {
      console.log('Using cached devices (use --refresh for fresh scan)');
    }
    
    if (result.flags.json) {
      console.log(JSON.stringify(devices, null, 2));
    } else if (devices.length === 0) {
      console.log('No Cast devices found.');
    } else {
      console.log('\nAvailable devices:');
      for (const device of devices) {
        const id = device.id ? ` [${device.id}]` : '';
        console.log(`  • ${device.name}${id} (${device.host}:${String(device.port)})`);
      }
    }
    process.exit(0);
  }

  if (result.command === 'device' && result.subcommand === 'set') {
    const name = result.args.name;
    if (!name) {
      console.error('Error: Device name required');
      process.exit(2);
    }
    await saveConfig({ ...config, defaultDevice: name });
    console.log(`Default device set to: ${name}`);
    process.exit(0);
  }

  // Validate config for API commands
  const validation = Config.validate(config);
  if (!validation.valid) {
    console.error('Configuration error:');
    for (const error of validation.errors) {
      console.error(`  • ${error}`);
    }
    console.error('\nSet ABS_SERVER and ABS_TOKEN environment variables, or create ~/.config/abs/config.json');
    process.exit(1);
  }

  // Create client - validation above ensures url and apiKey are present
  const url = config.url;
  const apiKey = config.apiKey;
  if (!url || !apiKey) {
    // This should never happen after validation, but TypeScript needs this
    throw new Error('Configuration validation failed: missing url or apiKey');
  }
  const client = new AudiobookshelfClient({
    url,
    apiKey,
    timeout: config.timeout,
  });

  // Handle remaining commands
  switch (result.command) {
    case 'library': {
      const libraries = await client.getLibraries();
      if (result.flags.json) {
        console.log(JSON.stringify(libraries, null, 2));
      } else if (libraries.length === 0) {
        console.log('No libraries found.');
      } else {
        console.log('Libraries:');
        for (const lib of libraries) {
          console.log(`  • ${lib.name} (${lib.id}) - ${lib.mediaType}`);
        }
      }
      break;
    }

    case 'books': {
      const libraryId = result.args.library;
      if (!libraryId) {
        // List all books from all libraries
        const libraries = await client.getLibraries();
        for (const lib of libraries) {
          const books = await client.getBooks(lib.id);
          if (result.flags.json) {
            console.log(JSON.stringify(books, null, 2));
          } else {
            console.log(`\n${lib.name}:`);
            for (const book of books) {
              const author = book.author ? ` by ${book.author}` : '';
              console.log(`  • ${book.title}${author} (${book.id})`);
            }
          }
        }
      } else {
        const books = await client.getBooks(libraryId);
        if (result.flags.json) {
          console.log(JSON.stringify(books, null, 2));
        } else if (books.length === 0) {
          console.log('No books found in this library.');
        } else {
          for (const book of books) {
            const author = book.author ? ` by ${book.author}` : '';
            console.log(`  • ${book.title}${author} (${book.id})`);
          }
        }
      }
      break;
    }

    case 'search': {
      const query = result.args.query;
      if (!query) {
        console.error('Error: Search query required');
        process.exit(2);
      }
      const books = await client.search(query);
      if (result.flags.json) {
        console.log(JSON.stringify(books, null, 2));
      } else if (books.length === 0) {
        console.log('No results found.');
      } else {
        console.log('Search results:');
        for (const book of books) {
          const author = book.author ? ` by ${book.author}` : '';
          console.log(`  • ${book.title}${author} (${book.id})`);
        }
      }
      break;
    }

    case 'play': {
      const bookId = result.args.id;
      if (!bookId) {
        console.error('Error: Book ID required');
        process.exit(2);
      }

      const deviceName = result.args.device ?? config.defaultDevice;
      if (!deviceName) {
        console.error('Error: No device specified. Use --device or set a default device.');
        process.exit(2);
      }

      // Check cache first for the device
      const cast = new CastController();
      const deviceCache = getDeviceCache();
      let device: CastDevice | null = deviceCache.get(deviceName);
      
      if (device) {
        console.log(`Using cached device: ${device.name} (${device.host}:${String(device.port)})`);
      } else {
        // Not in cache - do a full discovery with longer timeout
        console.log('Discovering Cast devices (this may take up to 20s on slow networks)...');
        const devices = await cast.discoverDevices({ timeout: 20000 });
        deviceCache.update(devices);
        device = devices.find(d => d.name.toLowerCase().includes(deviceName.toLowerCase())) ?? null;
        
        if (!device) {
          console.error(`Error: Device "${deviceName}" not found.`);
          console.error('Available devices:', devices.map(d => d.name).join(', ') || 'none');
          process.exit(1);
        }
      }

      console.log(`Connecting to ${device.name}...`);
      await cast.connect(device);

      // Start session and get stream URL
      const session = await client.startSession(bookId);
      const streamUrl = client.getStreamUrl(bookId, { includeToken: true });

      console.log(`Starting playback (session: ${session.id})...`);
      await cast.castStream(streamUrl, {
        title: `Book ${bookId}`,
      });

      console.log(`Now playing on ${device.name}`);
      break;
    }

    case 'pause': {
      console.log('Pause command - Cast controller state not persisted yet.');
      console.log('Use the cast device controls or stop the playback.');
      break;
    }

    case 'resume': {
      console.log('Resume command - Cast controller state not persisted yet.');
      console.log('Use "abs play <book-id>" to start playback.');
      break;
    }

    case 'stop': {
      console.log('Stop command - Cast controller state not persisted yet.');
      console.log('Use the cast device controls to stop playback.');
      break;
    }

    case 'status': {
      // Status shows current playback state
      // This is a placeholder - full implementation needs Cast session persistence
      const statusInfo = {
        playback: {
          active: false,
          device: null,
          book: null,
          position: 0,
          duration: 0,
        },
        sleepTimer: {
          active: false,
          remainingSeconds: 0,
        },
      };
      
      if (result.flags.json) {
        console.log(JSON.stringify(statusInfo, null, 2));
      } else {
        console.log('Playback Status:');
        console.log('  Active: No (Cast session persistence not implemented yet)');
        console.log('\nSleep Timer:');
        console.log('  Active: No');
        console.log('\nNote: Full status requires OpenClaw integration for session persistence.');
      }
      break;
    }

    case 'sleep': {
      if (result.subcommand === 'cancel') {
        console.log('Sleep timer cancelled (if any was active).');
      } else if (result.subcommand === 'status') {
        console.log('Sleep timer status: No active timer.');
      } else {
        const minutes = result.args.minutes;
        const fadeSeconds = result.args.fade ?? 30;
        if (!minutes) {
          console.error('Error: Duration in minutes required');
          process.exit(2);
        }
        console.log(`Sleep timer set for ${String(minutes)} minutes with ${String(fadeSeconds)}s fade.`);
        console.log('Note: Timer runs in this process. For persistent timers, integrate with OpenClaw.');
        
        const timer = new SleepTimer({
          onSyncProgress: () => {
            console.log('Syncing progress...');
            return Promise.resolve();
          },
          onExpire: () => {
            console.log('Sleep timer expired. Fading out and stopping playback...');
            process.exit(0);
            // Note: process.exit never returns, but TypeScript doesn't know this
            return Promise.resolve();
          },
        });
        
        timer.start(minutes);
        console.log(`Timer active. Will expire in ${String(minutes)} minutes.`);
        console.log(`Fade duration: ${String(fadeSeconds)} seconds`);
        
        // Keep process alive - using a never-resolving promise
        await new Promise<never>(() => {
          // Intentionally empty - keeps process alive
        });
      }
      break;
    }

    case 'service': {
      const port = parseInt(process.env.ABS_PROXY_PORT ?? '8765', 10);
      
      switch (result.subcommand) {
        case 'run': {
          // Run proxy server in foreground
          if (!config.url || !config.apiKey) {
            console.error('Error: ABS_SERVER and ABS_TOKEN must be set to run the proxy');
            process.exit(1);
          }

          // Dynamic import to avoid loading proxy dependencies unless needed
          const { ProxyServer } = await import('../proxy/index.js');
          
          const server = new ProxyServer({
            port,
            audiobookshelfUrl: config.url,
            audiobookshelfToken: config.apiKey,
          });

          server.on('listening', () => {
            console.log(`Audio proxy server listening on port ${String(port)}`);
            console.log('Health check: http://localhost:' + String(port) + '/health');
            console.log('Press Ctrl+C to stop');
          });

          server.on('session-started', (info: { sessionId: string; bookId: string }) => {
            console.log(`Session started: ${info.sessionId} (book: ${info.bookId})`);
          });

          server.on('session-ended', (info: { sessionId: string }) => {
            console.log(`Session ended: ${info.sessionId}`);
          });

          server.on('error', (err: Error) => {
            console.error('Server error:', err.message);
          });

          // Handle shutdown
          process.on('SIGINT', () => {
            console.log('\nShutting down...');
            void server.stop().then(() => {
              process.exit(0);
            });
          });

          process.on('SIGTERM', () => {
            void server.stop().then(() => {
              process.exit(0);
            });
          });

          await server.start();

          // Keep process alive
          await new Promise<never>(() => {
            // Intentionally empty - keeps process alive
          });
          break;
        }

        case 'start': {
          console.log('Starting proxy daemon...');
          console.log('Note: For persistent service, use systemd/launchd or Docker.');
          console.log('See deploy/ directory for configuration files.');
          console.log('Or run "abs service run" in a terminal/screen session.');
          break;
        }

        case 'stop': {
          console.log('Stopping proxy daemon...');
          console.log('Note: Use systemctl stop abs-proxy or launchctl unload for managed services.');
          break;
        }

        case 'status': {
          // Check if proxy is running by hitting health endpoint
          try {
            const response = await fetch(`http://localhost:${String(port)}/health`);
            if (response.ok) {
              const health = await response.json() as { status: string; sessions: number };
              if (result.flags.json) {
                console.log(JSON.stringify({ running: true, port, ...health }, null, 2));
              } else {
                console.log(`Proxy Status: Running on port ${String(port)}`);
                console.log(`Active sessions: ${String(health.sessions)}`);
              }
            } else {
              console.log('Proxy Status: Not running or unhealthy');
            }
          } catch {
            if (result.flags.json) {
              console.log(JSON.stringify({ running: false, port }, null, 2));
            } else {
              console.log('Proxy Status: Not running');
            }
          }
          break;
        }

        default:
          console.error('Unknown service subcommand');
          process.exit(2);
      }
      break;
    }

    default:
      console.error(`Unknown command: ${result.command}`);
      console.log(getHelpText());
      process.exit(2);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exit(1);
});
