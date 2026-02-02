/**
 * Cast-related type definitions
 *
 * Extends and re-exports types from castv2-client with additional types
 * specific to the Audiobookshelf skill.
 */
/**
 * Discovered Cast device on the network
 */
export interface CastDevice {
    /** Friendly device name (e.g., "Living Room Speaker") */
    name: string;
    /** IP address of the device */
    host: string;
    /** Cast port (typically 8009) */
    port: number;
    /** Unique device identifier from mDNS TXT record */
    id?: string;
}
/**
 * Cast metadata types
 * @see https://developers.google.com/cast/docs/reference/web_receiver/cast.framework.messages.MetadataType
 */
export declare enum MetadataType {
    /** Generic media content */
    GENERIC = 0,
    /** Movie */
    MOVIE = 1,
    /** TV Show */
    TV_SHOW = 2,
    /** Music Track */
    MUSIC_TRACK = 3,
    /** Audiobook Chapter - enables Nest Hub display-off in low light */
    AUDIOBOOK_CHAPTER = 4,
    /** Photo */
    PHOTO = 5
}
/**
 * Cast stream types
 */
export declare enum StreamType {
    /** Unknown stream type */
    UNKNOWN = "UNKNOWN",
    /** Buffered (finite) content */
    BUFFERED = "BUFFERED",
    /** Live streaming content */
    LIVE = "LIVE"
}
/**
 * Cast player states
 */
export declare enum PlayerState {
    /** Media is idle */
    IDLE = "IDLE",
    /** Media is playing */
    PLAYING = "PLAYING",
    /** Media is paused */
    PAUSED = "PAUSED",
    /** Media is buffering */
    BUFFERING = "BUFFERING"
}
/**
 * Cast idle reasons
 */
export declare enum IdleReason {
    /** User cancelled playback */
    CANCELLED = "CANCELLED",
    /** Playback was interrupted */
    INTERRUPTED = "INTERRUPTED",
    /** Media finished playing */
    FINISHED = "FINISHED",
    /** An error occurred */
    ERROR = "ERROR"
}
/**
 * Audiobook chapter metadata for Cast
 * Uses metadataType: 4 to enable Nest Hub display-off in low light
 */
export interface AudiobookChapterMetadata {
    /** Must be 4 for AUDIOBOOK_CHAPTER */
    metadataType: MetadataType.AUDIOBOOK_CHAPTER;
    /** Book title */
    title?: string;
    /** Book subtitle */
    subtitle?: string;
    /** Author name */
    bookTitle?: string;
    /** Chapter title */
    chapterTitle?: string;
    /** Chapter number */
    chapterNumber?: number;
    /** Cover art images */
    images?: {
        url: string;
    }[];
}
/**
 * Media info for casting
 */
export interface CastMediaInfo {
    /** URL of the audio stream */
    contentId: string;
    /** MIME type (e.g., 'audio/mpeg') */
    contentType: string;
    /** Stream type */
    streamType: StreamType;
    /** Optional duration in seconds */
    duration?: number;
    /** Media metadata */
    metadata?: AudiobookChapterMetadata;
}
/**
 * Cast load options
 */
export interface CastLoadOptions {
    /** Auto-play when loaded */
    autoplay?: boolean;
    /** Start position in seconds */
    currentTime?: number;
}
/**
 * Cast media status
 */
export interface CastMediaStatus {
    /** Current playback position in seconds */
    currentTime: number;
    /** Player state */
    playerState: PlayerState;
    /** Idle reason (only when IDLE) */
    idleReason?: IdleReason;
    /** Volume info */
    volume: {
        level: number;
        muted: boolean;
    };
    /** Media info (only when media loaded) */
    media?: {
        contentId: string;
        contentType: string;
        duration?: number;
        metadata?: AudiobookChapterMetadata;
    };
}
/**
 * Volume info
 */
export interface CastVolume {
    /** Volume level 0.0 - 1.0 */
    level: number;
    /** Whether muted */
    muted: boolean;
}
/**
 * Cast connection state
 */
export declare enum ConnectionState {
    /** Not connected */
    DISCONNECTED = "DISCONNECTED",
    /** Connection in progress */
    CONNECTING = "CONNECTING",
    /** Connected to device */
    CONNECTED = "CONNECTED",
    /** Launching receiver application */
    LAUNCHING = "LAUNCHING",
    /** Connected and playing media */
    PLAYING = "PLAYING"
}
/**
 * Cast connection event
 */
export interface CastConnectionEvent {
    /** New connection state */
    state: ConnectionState;
    /** Device info (when connected) */
    device?: CastDevice;
    /** Error (if connection failed) */
    error?: Error;
}
/**
 * Discovery options
 */
export interface DiscoveryOptions {
    /** Discovery timeout in milliseconds (default: 5000) */
    timeout?: number;
}
/**
 * Stream metadata for playback
 */
export interface StreamMetadata {
    /** Book/track title */
    title?: string;
    /** Author/artist name */
    artist?: string;
    /** Chapter title */
    chapterTitle?: string;
    /** Chapter number */
    chapterNumber?: number;
    /** Cover image URL */
    coverUrl?: string;
}
//# sourceMappingURL=types.d.ts.map