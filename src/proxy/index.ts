/**
 * Audio Proxy Module
 *
 * Provides a local HTTP audio proxy with real-time volume control.
 * Used for Cast playback with silent volume fades.
 */

export { VolumeTransform, type VolumeTransformOptions } from './volume-transform.js';

export {
  AudioPipeline,
  type AudioPipelineOptions,
} from './audio-pipeline.js';

export {
  ProxyServer,
  type ProxyServerOptions,
  type StreamSession,
} from './server.js';
