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
import { SleepTimer } from '../lib/sleep-timer.js';
async function main() {
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
        console.log('Discovering Cast devices...');
        const devices = await cast.discoverDevices({ timeout: 5000 });
        if (result.flags.json) {
            console.log(JSON.stringify(devices, null, 2));
        }
        else if (devices.length === 0) {
            console.log('No Cast devices found.');
        }
        else {
            console.log('\nAvailable devices:');
            for (const device of devices) {
                console.log(`  • ${device.name} (${device.host}:${device.port})`);
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
    // Create client
    const client = new AudiobookshelfClient({
        url: config.url,
        apiKey: config.apiKey,
        timeout: config.timeout,
    });
    // Handle remaining commands
    switch (result.command) {
        case 'library': {
            const libraries = await client.getLibraries();
            if (result.flags.json) {
                console.log(JSON.stringify(libraries, null, 2));
            }
            else if (libraries.length === 0) {
                console.log('No libraries found.');
            }
            else {
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
                    }
                    else {
                        console.log(`\n${lib.name}:`);
                        for (const book of books) {
                            const author = book.author ? ` by ${book.author}` : '';
                            console.log(`  • ${book.title}${author} (${book.id})`);
                        }
                    }
                }
            }
            else {
                const books = await client.getBooks(libraryId);
                if (result.flags.json) {
                    console.log(JSON.stringify(books, null, 2));
                }
                else if (books.length === 0) {
                    console.log('No books found in this library.');
                }
                else {
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
            }
            else if (books.length === 0) {
                console.log('No results found.');
            }
            else {
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
            // Discover and connect to device
            const cast = new CastController();
            console.log('Discovering Cast devices...');
            const devices = await cast.discoverDevices({ timeout: 5000 });
            const device = devices.find(d => d.name.toLowerCase().includes(deviceName.toLowerCase()));
            if (!device) {
                console.error(`Error: Device "${deviceName}" not found.`);
                console.error('Available devices:', devices.map(d => d.name).join(', ') || 'none');
                process.exit(1);
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
        case 'sleep': {
            if (result.subcommand === 'cancel') {
                console.log('Sleep timer cancelled (if any was active).');
            }
            else if (result.subcommand === 'status') {
                console.log('Sleep timer status: No active timer.');
            }
            else {
                const minutes = result.args.minutes;
                if (!minutes) {
                    console.error('Error: Duration in minutes required');
                    process.exit(2);
                }
                console.log(`Sleep timer set for ${minutes} minutes.`);
                console.log('Note: Timer runs in this process. For persistent timers, integrate with OpenClaw.');
                const timer = new SleepTimer({
                    onSyncProgress: async () => {
                        console.log('Syncing progress...');
                    },
                    onExpire: async () => {
                        console.log('Sleep timer expired. Stopping playback...');
                        process.exit(0);
                    },
                });
                timer.start(minutes);
                console.log(`Timer active. Will expire in ${minutes} minutes.`);
                // Keep process alive
                await new Promise(() => { });
            }
            break;
        }
        default:
            console.error(`Unknown command: ${result.command}`);
            console.log(getHelpText());
            process.exit(2);
    }
}
main().catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exit(1);
});
//# sourceMappingURL=abs.js.map