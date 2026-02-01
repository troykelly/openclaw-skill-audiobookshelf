/**
 * OpenClaw Audiobookshelf Skill
 *
 * Provides Audiobookshelf integration with Google Cast support.
 */

export { AudiobookshelfClient, AudiobookshelfApiError } from './lib/client.js';
export { CastController } from './lib/cast.js';
export { SleepTimer } from './lib/sleep-timer.js';

export type { AudiobookshelfConfig } from './lib/config.js';
export type { Book, Library, PlaybackSession, Progress } from './lib/types.js';
