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
    fade?: number;
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
 * Parse CLI arguments
 * @param argv - Command line arguments (without node and script name)
 * @returns Parsed CLI result
 */
export declare function parseCLI(argv: string[]): CLIResult;
/**
 * Get help text for all commands
 */
export declare function getHelpText(): string;
/**
 * Get version string from package.json
 */
export declare function getVersion(): string;
//# sourceMappingURL=cli.d.ts.map