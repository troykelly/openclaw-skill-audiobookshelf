/**
 * Type declarations for castv2-client
 * This library doesn't have official TypeScript types.
 */

declare module 'castv2-client' {
  import type { EventEmitter } from 'events';

  export interface ClientOptions {
    host: string;
    port?: number;
  }

  export interface MediaInfo {
    contentId: string;
    contentType: string;
    streamType: string;
    metadata?: {
      type: number;
      metadataType: number;
      title?: string;
      artist?: string;
      images?: { url: string }[];
    };
  }

  export interface LoadOptions {
    autoplay?: boolean;
    currentTime?: number;
  }

  export interface PlayerStatus {
    currentTime?: number;
    playerState?: string;
    media?: MediaInfo;
    volume?: {
      level: number;
      muted: boolean;
    };
  }

  export class DefaultMediaReceiver extends EventEmitter {
    load(
      media: MediaInfo,
      options: LoadOptions,
      callback: (err: Error | null) => void
    ): void;
    seek(time: number, callback: (err: Error | null) => void): void;
    pause(callback: (err: Error | null) => void): void;
    play(callback: (err: Error | null) => void): void;
    stop(callback: (err: Error | null) => void): void;
    getStatus(callback: (err: Error | null, status: PlayerStatus | null) => void): void;
  }

  export type MediaReceiverClass = typeof DefaultMediaReceiver;

  export class Client extends EventEmitter {
    connect(
      options: ClientOptions,
      callback: (err?: Error) => void
    ): void;
    launch<T extends EventEmitter>(
      receiver: new () => T,
      callback: (err: Error | null, player: T) => void
    ): void;
    join<T extends EventEmitter>(
      session: { sessionId: string },
      receiver: new () => T,
      callback: (err: Error | null, player: T) => void
    ): void;
    close(): void;
  }
}

declare module 'bonjour-service' {
  import type { EventEmitter } from 'events';

  export interface Service {
    name: string;
    type: string;
    subtypes: string[];
    protocol: string;
    host: string;
    port: number;
    fqdn: string;
    txt: Record<string, unknown>;
    addresses?: string[];
  }

  export interface FindOptions {
    type: string;
    subtypes?: string[];
    protocol?: string;
  }

  export interface Browser extends EventEmitter {
    on(event: 'up' | 'down', callback: (service: Service) => void): this;
    stop(): void;
  }

  export class Bonjour {
    constructor();
    find(options: FindOptions): Browser;
    findOne(options: FindOptions, callback: (service: Service) => void): Browser;
    publish(options: {
      name: string;
      type: string;
      port: number;
      txt?: Record<string, unknown>;
    }): unknown;
    unpublishAll(): void;
    destroy(): void;
  }
}
