/**
 * Cast module exports
 *
 * Native Google Cast control for Audiobookshelf playback.
 * Uses castv2-client for Cast protocol and bonjour-service for mDNS discovery.
 */

// Re-export all types
export * from './types.js';

// Re-export castv2-client types for convenience
export { Client, DefaultMediaReceiver } from 'castv2-client';
export { Bonjour } from 'bonjour-service';
