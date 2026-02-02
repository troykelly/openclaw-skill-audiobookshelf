/**
 * Cast-related type definitions
 *
 * Extends and re-exports types from castv2-client with additional types
 * specific to the Audiobookshelf skill.
 */
/**
 * Cast metadata types
 * @see https://developers.google.com/cast/docs/reference/web_receiver/cast.framework.messages.MetadataType
 */
export var MetadataType;
(function (MetadataType) {
    /** Generic media content */
    MetadataType[MetadataType["GENERIC"] = 0] = "GENERIC";
    /** Movie */
    MetadataType[MetadataType["MOVIE"] = 1] = "MOVIE";
    /** TV Show */
    MetadataType[MetadataType["TV_SHOW"] = 2] = "TV_SHOW";
    /** Music Track */
    MetadataType[MetadataType["MUSIC_TRACK"] = 3] = "MUSIC_TRACK";
    /** Audiobook Chapter - enables Nest Hub display-off in low light */
    MetadataType[MetadataType["AUDIOBOOK_CHAPTER"] = 4] = "AUDIOBOOK_CHAPTER";
    /** Photo */
    MetadataType[MetadataType["PHOTO"] = 5] = "PHOTO";
})(MetadataType || (MetadataType = {}));
/**
 * Cast stream types
 */
export var StreamType;
(function (StreamType) {
    /** Unknown stream type */
    StreamType["UNKNOWN"] = "UNKNOWN";
    /** Buffered (finite) content */
    StreamType["BUFFERED"] = "BUFFERED";
    /** Live streaming content */
    StreamType["LIVE"] = "LIVE";
})(StreamType || (StreamType = {}));
/**
 * Cast player states
 */
export var PlayerState;
(function (PlayerState) {
    /** Media is idle */
    PlayerState["IDLE"] = "IDLE";
    /** Media is playing */
    PlayerState["PLAYING"] = "PLAYING";
    /** Media is paused */
    PlayerState["PAUSED"] = "PAUSED";
    /** Media is buffering */
    PlayerState["BUFFERING"] = "BUFFERING";
})(PlayerState || (PlayerState = {}));
/**
 * Cast idle reasons
 */
export var IdleReason;
(function (IdleReason) {
    /** User cancelled playback */
    IdleReason["CANCELLED"] = "CANCELLED";
    /** Playback was interrupted */
    IdleReason["INTERRUPTED"] = "INTERRUPTED";
    /** Media finished playing */
    IdleReason["FINISHED"] = "FINISHED";
    /** An error occurred */
    IdleReason["ERROR"] = "ERROR";
})(IdleReason || (IdleReason = {}));
/**
 * Cast connection state
 */
export var ConnectionState;
(function (ConnectionState) {
    /** Not connected */
    ConnectionState["DISCONNECTED"] = "DISCONNECTED";
    /** Connection in progress */
    ConnectionState["CONNECTING"] = "CONNECTING";
    /** Connected to device */
    ConnectionState["CONNECTED"] = "CONNECTED";
    /** Launching receiver application */
    ConnectionState["LAUNCHING"] = "LAUNCHING";
    /** Connected and playing media */
    ConnectionState["PLAYING"] = "PLAYING";
})(ConnectionState || (ConnectionState = {}));
//# sourceMappingURL=types.js.map