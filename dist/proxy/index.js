/**
 * Audio Proxy Module
 *
 * Provides a local HTTP audio proxy with real-time volume control.
 * Used for Cast playback with silent volume fades.
 */
export { VolumeTransform } from './volume-transform.js';
export { AudioPipeline, } from './audio-pipeline.js';
export { ProxyServer, } from './server.js';
export { fadeVolume, fadeOut, fadeIn, FadeAbortedError, } from './fade.js';
//# sourceMappingURL=index.js.map