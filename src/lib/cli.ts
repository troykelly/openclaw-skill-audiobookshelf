/**
 * CLI argument parser
 *
 * Provides command-line argument parsing for the abs CLI.
 * Uses a lightweight custom parser - no external dependencies.
 */

/**
 * CLI configuration from environment variables
 */
export interface CLIConfig {
  server?: string;
  token?: string;
  device?: string;
}

/**
 * CLI command arguments
 */
export interface CLIArgs {
  library?: string;
  query?: string;
  id?: string;
  device?: string;
  name?: string;
  minutes?: number;
  [key: string]: string | number | undefined;
}

/**
 * CLI flags
 */
export interface CLIFlags {
  help?: boolean;
  version?: boolean;
  json?: boolean;
  [key: string]: boolean | undefined;
}

/**
 * CLI parsing result
 */
export interface CLIResult {
  command: string;
  subcommand?: string;
  args: CLIArgs;
  flags: CLIFlags;
  config: CLIConfig;
  exitCode: number;
  error?: string;
}

/**
 * Valid commands
 */
const COMMANDS = [
  'library',
  'books',
  'search',
  'play',
  'resume',
  'pause',
  'stop',
  'devices',
  'device',
  'sleep',
  'help',
  'version',
];

/**
 * Parse CLI arguments
 * @param argv - Command line arguments (without node and script name)
 * @returns Parsed CLI result
 */
export function parseCLI(argv: string[]): CLIResult {
  const result: CLIResult = {
    command: 'help',
    args: {},
    flags: {},
    config: {
      server: process.env.ABS_SERVER,
      token: process.env.ABS_TOKEN,
      device: process.env.ABS_DEVICE,
    },
    exitCode: 0,
  };

  // Handle empty args
  if (argv.length === 0) {
    result.command = 'help';
    return result;
  }

  // Parse flags and collect positional args
  const positional: string[] = [];
  let i = 0;

  while (i < argv.length) {
    const arg = argv[i];

    // Global flags
    if (arg === '--help' || arg === '-h') {
      result.flags.help = true;
      result.command = 'help';
      return result;
    }

    if (arg === '--version' || arg === '-v') {
      result.flags.version = true;
      result.command = 'version';
      return result;
    }

    if (arg === '--json') {
      result.flags.json = true;
      i++;
      continue;
    }

    // Flag with value
    if (arg === '--library' || arg === '-l') {
      i++;
      if (i < argv.length) {
        result.args.library = argv[i];
      }
      i++;
      continue;
    }

    if (arg === '--device' || arg === '-d') {
      i++;
      if (i < argv.length) {
        result.args.device = argv[i];
      }
      i++;
      continue;
    }

    // Skip unknown flags
    if (arg.startsWith('-')) {
      i++;
      continue;
    }

    // Positional argument
    positional.push(arg);
    i++;
  }

  // First positional is the command
  if (positional.length === 0) {
    result.command = 'help';
    return result;
  }

  const command = positional[0];

  // Validate command
  if (!COMMANDS.includes(command)) {
    result.error = `Unknown command: ${command}`;
    result.exitCode = 2;
    result.command = command;
    return result;
  }

  result.command = command;

  // Parse command-specific arguments
  switch (command) {
    case 'library':
    case 'books':
    case 'devices':
    case 'pause':
    case 'stop':
    case 'resume':
      // These commands have no required positional args
      break;

    case 'search':
      if (positional.length < 2) {
        result.error = 'search requires a query argument';
        result.exitCode = 2;
      } else {
        result.args.query = positional.slice(1).join(' ');
      }
      break;

    case 'play':
      if (positional.length < 2) {
        result.error = 'play requires a book id argument';
        result.exitCode = 2;
      } else {
        result.args.id = positional[1];
      }
      break;

    case 'device':
      if (positional.length < 2) {
        result.error = 'device requires a subcommand (set)';
        result.exitCode = 2;
      } else if (positional[1] === 'set') {
        result.subcommand = 'set';
        if (positional.length < 3) {
          result.error = 'device set requires a device name';
          result.exitCode = 2;
        } else {
          result.args.name = positional.slice(2).join(' ');
        }
      } else {
        result.error = `Unknown device subcommand: ${positional[1]}`;
        result.exitCode = 2;
      }
      break;

    case 'sleep':
      if (positional.length < 2) {
        result.error = 'sleep requires a duration in minutes, "cancel", or "status"';
        result.exitCode = 2;
      } else if (positional[1] === 'cancel') {
        result.subcommand = 'cancel';
      } else if (positional[1] === 'status') {
        result.subcommand = 'status';
      } else {
        const minutes = parseInt(positional[1], 10);
        if (isNaN(minutes)) {
          result.error = `Invalid sleep duration: ${positional[1]}`;
          result.exitCode = 2;
        } else {
          result.args.minutes = minutes;
        }
      }
      break;
  }

  return result;
}

/**
 * Get help text for all commands
 */
export function getHelpText(): string {
  return `Usage: abs <command> [options]

Commands:
  library                     List libraries
  books [--library <id>]      List books
  search "<query>"            Search library
  play <id> [--device <name>] Start playback
  resume [--device <name>]    Resume last book
  pause                       Pause current playback
  stop                        Stop and sync progress
  devices                     List Cast devices
  device set "<name>"         Set default device
  sleep <minutes>             Set sleep timer
  sleep cancel                Cancel sleep timer
  sleep status                Show timer status

Options:
  -h, --help                  Show this help
  -v, --version               Show version
  --json                      Output as JSON

Environment Variables:
  ABS_SERVER                  Audiobookshelf server URL
  ABS_TOKEN                   API token
  ABS_DEVICE                  Default Cast device name

Exit Codes:
  0  Success
  1  Error
  2  Usage error
`;
}

/**
 * Get version string
 */
export function getVersion(): string {
  return '0.1.0';
}
