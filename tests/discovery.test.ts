/**
 * Tests for Cast device discovery
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

// Create mock classes
class MockBrowser extends EventEmitter {
  stop = vi.fn();
}

class MockBonjour {
  browser: MockBrowser;
  destroyed = false;

  constructor() {
    this.browser = new MockBrowser();
  }

  find = vi.fn(() => {
    return this.browser;
  });

  destroy = vi.fn(() => {
    this.destroyed = true;
  });
}

// Store mock instance for test access
let mockBonjourInstance: MockBonjour | null = null;

// Mock DNS lookup results - keyed by hostname
const mockDnsResults = new Map<string, { address: string; family: number } | Error>();

// Mock bonjour-service before importing discovery
vi.mock('bonjour-service', () => {
  return {
    Bonjour: vi.fn(() => {
      mockBonjourInstance = new MockBonjour();
      return mockBonjourInstance;
    }),
  };
});

// Mock dns/promises for .local hostname resolution
vi.mock('dns/promises', () => {
  return {
    lookup: vi.fn((hostname: string) => {
      const result = mockDnsResults.get(hostname);
      if (result instanceof Error) {
        return Promise.reject(result);
      }
      if (result) {
        return Promise.resolve(result);
      }
      // Default: simulate ENOTFOUND
      const err = new Error(`getaddrinfo ENOTFOUND ${hostname}`);
      (err as NodeJS.ErrnoException).code = 'ENOTFOUND';
      return Promise.reject(err);
    }),
  };
});

import {
  DeviceDiscovery,
  discoverDevices,
  findDeviceByName,
  findDeviceById,
  clearDiscoveryCache,
} from '../src/cast/discovery.js';

describe('DeviceDiscovery', () => {
  let discovery: DeviceDiscovery;

  beforeEach(() => {
    vi.useFakeTimers();
    discovery = new DeviceDiscovery();
    mockBonjourInstance = null;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    clearDiscoveryCache();
  });

  describe('discoverDevices', () => {
    it('should discover Cast devices on the network', async () => {
      const discoverPromise = discovery.discoverDevices({ timeout: 5000 });

      // Wait for Bonjour to be instantiated
      await vi.advanceTimersByTimeAsync(10);

      // Simulate device discovery
      mockBonjourInstance?.browser.emit('up', {
        name: 'Living Room Speaker',
        host: 'living-room.local',
        addresses: ['192.168.1.100'],
        port: 8009,
        txt: { id: 'device-1', md: 'Google Home' },
      });

      // Fast-forward past timeout
      await vi.advanceTimersByTimeAsync(5000);

      const devices = await discoverPromise;
      expect(devices).toHaveLength(1);
      expect(devices[0].name).toBe('Living Room Speaker');
      expect(devices[0].host).toBe('192.168.1.100');
      expect(devices[0].port).toBe(8009);
      expect(devices[0].id).toBe('device-1');
    });

    it('should use default timeout of 10000ms if not specified', async () => {
      const discoverPromise = discovery.discoverDevices();

      // Should NOT resolve after 5000ms
      await vi.advanceTimersByTimeAsync(5000);
      
      // Add a device at 6s - should still be discovered
      mockBonjourInstance?.browser.emit('up', {
        name: 'Late Device',
        addresses: ['192.168.1.150'],
        port: 8009,
        txt: { id: 'late-device' },
      });

      // Should resolve after 10000ms (default)
      await vi.advanceTimersByTimeAsync(5000);

      const devices = await discoverPromise;
      expect(devices).toHaveLength(1);
      expect(devices[0].name).toBe('Late Device');
    });

    it('should return empty array on timeout with no devices', async () => {
      const discoverPromise = discovery.discoverDevices({ timeout: 1000 });

      await vi.advanceTimersByTimeAsync(1000);

      const devices = await discoverPromise;
      expect(devices).toEqual([]);
    });

    it('should deduplicate devices by host and port', async () => {
      const discoverPromise = discovery.discoverDevices({ timeout: 5000 });

      await vi.advanceTimersByTimeAsync(10);

      // Emit same device twice
      mockBonjourInstance?.browser.emit('up', {
        name: 'Living Room Speaker',
        addresses: ['192.168.1.100'],
        port: 8009,
        txt: { id: 'device-1' },
      });
      mockBonjourInstance?.browser.emit('up', {
        name: 'Living Room Speaker',
        addresses: ['192.168.1.100'],
        port: 8009,
        txt: { id: 'device-1' },
      });

      await vi.advanceTimersByTimeAsync(5000);

      const devices = await discoverPromise;
      expect(devices).toHaveLength(1);
    });

    it('should handle devices without addresses array', async () => {
      const discoverPromise = discovery.discoverDevices({ timeout: 5000 });

      await vi.advanceTimersByTimeAsync(10);

      mockBonjourInstance?.browser.emit('up', {
        name: 'Kitchen Display',
        host: 'kitchen.local',
        port: 8009,
        txt: { id: 'device-2' },
      });

      await vi.advanceTimersByTimeAsync(5000);

      const devices = await discoverPromise;
      expect(devices).toHaveLength(1);
      expect(devices[0].host).toBe('kitchen.local');
    });

    it('should stop browser and destroy bonjour after timeout', async () => {
      const discoverPromise = discovery.discoverDevices({ timeout: 1000 });

      await vi.advanceTimersByTimeAsync(1000);
      await discoverPromise;

      expect(mockBonjourInstance?.browser.stop).toHaveBeenCalled();
      expect(mockBonjourInstance?.destroy).toHaveBeenCalled();
    });

    it('should use friendly name (fn) from TXT record when available', async () => {
      const discoverPromise = discovery.discoverDevices({ timeout: 5000 });

      await vi.advanceTimersByTimeAsync(10);

      // Cast groups have long mDNS names but friendly names in TXT fn field
      mockBonjourInstance?.browser.emit('up', {
        name: 'Google-Cast-Group-abc123xyz789def456',
        host: 'upstairs-speakers.local',
        addresses: ['192.168.1.200'],
        port: 8009,
        txt: { id: 'group-1', fn: 'Upstairs Speakers' },
      });

      await vi.advanceTimersByTimeAsync(5000);

      const devices = await discoverPromise;
      expect(devices).toHaveLength(1);
      expect(devices[0].name).toBe('Upstairs Speakers');
      expect(devices[0].id).toBe('group-1');
    });

    it('should fall back to service name when no friendly name in TXT', async () => {
      const discoverPromise = discovery.discoverDevices({ timeout: 5000 });

      await vi.advanceTimersByTimeAsync(10);

      mockBonjourInstance?.browser.emit('up', {
        name: 'Kitchen Nest Hub',
        host: 'kitchen.local',
        addresses: ['192.168.1.201'],
        port: 8009,
        txt: { id: 'device-kitchen' }, // No fn field
      });

      await vi.advanceTimersByTimeAsync(5000);

      const devices = await discoverPromise;
      expect(devices).toHaveLength(1);
      expect(devices[0].name).toBe('Kitchen Nest Hub');
    });
  });

  describe('.local hostname resolution', () => {
    beforeEach(() => {
      mockDnsResults.clear();
    });

    it('should resolve .local hostname when addresses array is empty', async () => {
      // Cast groups often have empty addresses array
      mockDnsResults.set('upstairs-speakers.local', { address: '192.168.1.200', family: 4 });

      const discoverPromise = discovery.discoverDevices({ timeout: 5000 });

      await vi.advanceTimersByTimeAsync(10);

      mockBonjourInstance?.browser.emit('up', {
        name: 'Google-Cast-Group-abc123xyz789',
        host: 'upstairs-speakers.local',
        addresses: [], // Empty addresses - common for Cast groups
        port: 8009,
        txt: { id: 'group-1', fn: 'Upstairs Speakers' },
      });

      await vi.advanceTimersByTimeAsync(5000);

      const devices = await discoverPromise;
      expect(devices).toHaveLength(1);
      expect(devices[0].host).toBe('192.168.1.200');
      expect(devices[0].name).toBe('Upstairs Speakers');
    });

    it('should resolve .local hostname when addresses is undefined', async () => {
      mockDnsResults.set('bedroom-speaker.local', { address: '192.168.1.201', family: 4 });

      const discoverPromise = discovery.discoverDevices({ timeout: 5000 });

      await vi.advanceTimersByTimeAsync(10);

      mockBonjourInstance?.browser.emit('up', {
        name: 'Bedroom Speaker',
        host: 'bedroom-speaker.local',
        // addresses: undefined (not present)
        port: 8009,
        txt: { id: 'device-2' },
      });

      await vi.advanceTimersByTimeAsync(5000);

      const devices = await discoverPromise;
      expect(devices).toHaveLength(1);
      expect(devices[0].host).toBe('192.168.1.201');
    });

    it('should fall back to .local hostname if DNS lookup fails', async () => {
      // No mock result = ENOTFOUND error
      const discoverPromise = discovery.discoverDevices({ timeout: 5000 });

      await vi.advanceTimersByTimeAsync(10);

      mockBonjourInstance?.browser.emit('up', {
        name: 'Unreachable Group',
        host: 'unreachable-group.local',
        addresses: [],
        port: 8009,
        txt: { id: 'group-unreachable', fn: 'Unreachable Group' },
      });

      await vi.advanceTimersByTimeAsync(5000);

      const devices = await discoverPromise;
      expect(devices).toHaveLength(1);
      // Falls back to the .local hostname
      expect(devices[0].host).toBe('unreachable-group.local');
    });

    it('should not attempt DNS lookup for non-.local hostnames', async () => {
      const discoverPromise = discovery.discoverDevices({ timeout: 5000 });

      await vi.advanceTimersByTimeAsync(10);

      // Device with regular hostname (not .local)
      mockBonjourInstance?.browser.emit('up', {
        name: 'Cloud Device',
        host: 'device.example.com',
        addresses: [],
        port: 8009,
        txt: { id: 'cloud-1' },
      });

      await vi.advanceTimersByTimeAsync(5000);

      const devices = await discoverPromise;
      expect(devices).toHaveLength(1);
      // Should use the hostname as-is without DNS lookup attempt
      expect(devices[0].host).toBe('device.example.com');
    });

    it('should prefer addresses array over DNS resolution', async () => {
      // Set up mock DNS result that should NOT be used
      mockDnsResults.set('speaker.local', { address: '10.0.0.99', family: 4 });

      const discoverPromise = discovery.discoverDevices({ timeout: 5000 });

      await vi.advanceTimersByTimeAsync(10);

      mockBonjourInstance?.browser.emit('up', {
        name: 'Living Room',
        host: 'speaker.local',
        addresses: ['192.168.1.100'], // Has address - should use this
        port: 8009,
        txt: { id: 'device-lr' },
      });

      await vi.advanceTimersByTimeAsync(5000);

      const devices = await discoverPromise;
      expect(devices).toHaveLength(1);
      expect(devices[0].host).toBe('192.168.1.100'); // From addresses, not DNS
    });

    it('should handle IPv6 addresses from DNS lookup', async () => {
      mockDnsResults.set('ipv6-device.local', { address: 'fe80::1', family: 6 });

      const discoverPromise = discovery.discoverDevices({ timeout: 5000 });

      await vi.advanceTimersByTimeAsync(10);

      mockBonjourInstance?.browser.emit('up', {
        name: 'IPv6 Device',
        host: 'ipv6-device.local',
        addresses: [],
        port: 8009,
        txt: { id: 'ipv6-1' },
      });

      await vi.advanceTimersByTimeAsync(5000);

      const devices = await discoverPromise;
      expect(devices).toHaveLength(1);
      expect(devices[0].host).toBe('fe80::1');
    });
  });

  describe('caching', () => {
    it('should cache discovery results', async () => {
      // First discovery
      const promise1 = discovery.discoverDevices({ timeout: 1000 });
      await vi.advanceTimersByTimeAsync(10);
      mockBonjourInstance?.browser.emit('up', {
        name: 'Living Room Speaker',
        addresses: ['192.168.1.100'],
        port: 8009,
        txt: { id: 'device-1' },
      });
      await vi.advanceTimersByTimeAsync(1000);
      const devices1 = await promise1;

      // Record the bonjour instance
      const firstBonjour = mockBonjourInstance;

      // Second discovery should return cached results (no new Bonjour instance)
      const devices2 = await discovery.discoverDevices({ timeout: 1000 });

      expect(devices2).toEqual(devices1);
      expect(mockBonjourInstance).toBe(firstBonjour); // Same instance means no new scan
    });

    it('should respect cache TTL', async () => {
      // Discovery with 2s TTL
      discovery = new DeviceDiscovery({ cacheTtlMs: 2000 });

      // First discovery
      const promise1 = discovery.discoverDevices({ timeout: 1000 });
      await vi.advanceTimersByTimeAsync(10);
      mockBonjourInstance?.browser.emit('up', {
        name: 'Device 1',
        addresses: ['192.168.1.100'],
        port: 8009,
        txt: { id: 'device-1' },
      });
      await vi.advanceTimersByTimeAsync(1000);
      const devices1 = await promise1;
      expect(devices1).toHaveLength(1);

      // Advance past cache TTL
      await vi.advanceTimersByTimeAsync(2500);

      // Second discovery should re-scan (new Bonjour instance)
      const promise2 = discovery.discoverDevices({ timeout: 1000 });
      await vi.advanceTimersByTimeAsync(10);
      mockBonjourInstance?.browser.emit('up', {
        name: 'Device 2',
        addresses: ['192.168.1.101'],
        port: 8009,
        txt: { id: 'device-2' },
      });
      await vi.advanceTimersByTimeAsync(1000);
      const devices2 = await promise2;

      // Should have new device from fresh scan
      expect(devices2.some((d) => d.id === 'device-2')).toBe(true);
    });

    it('should allow forcing a fresh scan', async () => {
      // First discovery
      const promise1 = discovery.discoverDevices({ timeout: 1000 });
      await vi.advanceTimersByTimeAsync(10);
      mockBonjourInstance?.browser.emit('up', {
        name: 'Device 1',
        addresses: ['192.168.1.100'],
        port: 8009,
        txt: { id: 'device-1' },
      });
      await vi.advanceTimersByTimeAsync(1000);
      await promise1;

      const firstBonjour = mockBonjourInstance;

      // Force fresh scan
      const promise2 = discovery.discoverDevices({ timeout: 1000, forceRefresh: true });
      await vi.advanceTimersByTimeAsync(10);
      // New instance created
      expect(mockBonjourInstance).not.toBe(firstBonjour);
      await vi.advanceTimersByTimeAsync(1000);
      await promise2;
    });
  });

  describe('findDeviceByName', () => {
    it('should find device by exact name', async () => {
      const discoverPromise = discovery.discoverDevices({ timeout: 1000 });
      await vi.advanceTimersByTimeAsync(10);
      mockBonjourInstance?.browser.emit('up', {
        name: 'Living Room Speaker',
        addresses: ['192.168.1.100'],
        port: 8009,
        txt: { id: 'device-1' },
      });
      await vi.advanceTimersByTimeAsync(1000);
      await discoverPromise;

      const device = await discovery.findDeviceByName('Living Room Speaker');
      expect(device).not.toBeNull();
      expect(device?.name).toBe('Living Room Speaker');
    });

    it('should find device by partial name (case-insensitive)', async () => {
      const discoverPromise = discovery.discoverDevices({ timeout: 1000 });
      await vi.advanceTimersByTimeAsync(10);
      mockBonjourInstance?.browser.emit('up', {
        name: 'Living Room Speaker',
        addresses: ['192.168.1.100'],
        port: 8009,
        txt: { id: 'device-1' },
      });
      await vi.advanceTimersByTimeAsync(1000);
      await discoverPromise;

      const device = await discovery.findDeviceByName('living room');
      expect(device).not.toBeNull();
      expect(device?.name).toBe('Living Room Speaker');
    });

    it('should return null if device not found', async () => {
      // Discovery with no devices
      const discoverPromise = discovery.discoverDevices({ timeout: 1000 });
      await vi.advanceTimersByTimeAsync(1000);
      await discoverPromise;

      // findDeviceByName will use cached (empty) results
      const device = await discovery.findDeviceByName('Nonexistent Device');
      expect(device).toBeNull();
    });
  });

  describe('findDeviceById', () => {
    it('should find device by Cast ID', async () => {
      const discoverPromise = discovery.discoverDevices({ timeout: 1000 });
      await vi.advanceTimersByTimeAsync(10);
      mockBonjourInstance?.browser.emit('up', {
        name: 'Living Room Speaker',
        addresses: ['192.168.1.100'],
        port: 8009,
        txt: { id: 'abc123' },
      });
      await vi.advanceTimersByTimeAsync(1000);
      await discoverPromise;

      const device = await discovery.findDeviceById('abc123');
      expect(device).not.toBeNull();
      expect(device?.id).toBe('abc123');
    });

    it('should return null if ID not found', async () => {
      const discoverPromise = discovery.discoverDevices({ timeout: 1000 });
      await vi.advanceTimersByTimeAsync(1000);
      await discoverPromise;

      const device = await discovery.findDeviceById('nonexistent');
      expect(device).toBeNull();
    });
  });

  describe('clearCache', () => {
    it('should clear cached devices', async () => {
      // First discovery
      const promise1 = discovery.discoverDevices({ timeout: 1000 });
      await vi.advanceTimersByTimeAsync(10);
      mockBonjourInstance?.browser.emit('up', {
        name: 'Device 1',
        addresses: ['192.168.1.100'],
        port: 8009,
        txt: { id: 'device-1' },
      });
      await vi.advanceTimersByTimeAsync(1000);
      await promise1;

      const firstBonjour = mockBonjourInstance;

      // Clear cache
      discovery.clearCache();

      // Next discovery should re-scan
      const promise2 = discovery.discoverDevices({ timeout: 1000 });
      await vi.advanceTimersByTimeAsync(10);
      // Should have new Bonjour instance
      expect(mockBonjourInstance).not.toBe(firstBonjour);
      await vi.advanceTimersByTimeAsync(1000);
      await promise2;
    });
  });

  describe('getCachedDevices', () => {
    it('should return cached devices without triggering scan', async () => {
      // Before any discovery
      expect(discovery.getCachedDevices()).toEqual([]);

      // After discovery
      const discoverPromise = discovery.discoverDevices({ timeout: 1000 });
      await vi.advanceTimersByTimeAsync(10);
      mockBonjourInstance?.browser.emit('up', {
        name: 'Device 1',
        addresses: ['192.168.1.100'],
        port: 8009,
        txt: { id: 'device-1' },
      });
      await vi.advanceTimersByTimeAsync(1000);
      await discoverPromise;

      const cached = discovery.getCachedDevices();
      expect(cached).toHaveLength(1);
      expect(cached[0].name).toBe('Device 1');
    });
  });
});

describe('Standalone functions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearDiscoveryCache();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    clearDiscoveryCache();
  });

  it('discoverDevices should use shared discovery instance', async () => {
    const promise = discoverDevices({ timeout: 1000 });
    await vi.advanceTimersByTimeAsync(1000);
    const devices = await promise;
    expect(Array.isArray(devices)).toBe(true);
  });

  it('findDeviceByName should discover and find', async () => {
    // Start discovery
    const discoverPromise = discoverDevices({ timeout: 1000 });
    await vi.advanceTimersByTimeAsync(10);
    mockBonjourInstance?.browser.emit('up', {
      name: 'Test Speaker',
      addresses: ['192.168.1.100'],
      port: 8009,
      txt: { id: 'test-1' },
    });
    await vi.advanceTimersByTimeAsync(1000);
    await discoverPromise;

    // Now findByName should use cache
    const device = await findDeviceByName('Test Speaker');
    expect(device?.name).toBe('Test Speaker');
  });

  it('findDeviceById should return null for unknown ID', async () => {
    const promise = discoverDevices({ timeout: 1000 });
    await vi.advanceTimersByTimeAsync(1000);
    await promise;

    const device = await findDeviceById('nonexistent');
    expect(device).toBeNull();
  });
});
