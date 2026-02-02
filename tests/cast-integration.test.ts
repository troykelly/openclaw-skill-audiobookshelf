/**
 * Cast Integration Tests
 *
 * These tests require a real Cast device on the network.
 * They are skipped by default and only run when:
 * - CAST_INTEGRATION=true is set
 * - CAST_DEVICE is set to the device name
 *
 * Run with:
 *   CAST_INTEGRATION=true CAST_DEVICE="Living Room" pnpm test:run tests/cast-integration.test.ts
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DeviceDiscovery, CastClient, type CastDevice } from '../src/cast/index.js';

const CAST_INTEGRATION = process.env.CAST_INTEGRATION === 'true';
const CAST_DEVICE = process.env.CAST_DEVICE;

describe.skipIf(!CAST_INTEGRATION)('Cast Integration Tests', () => {
  let discovery: DeviceDiscovery;
  let castClient: CastClient;
  let targetDevice: CastDevice | null = null;

  beforeAll(async () => {
    discovery = new DeviceDiscovery({ cacheTtlMs: 60000 });
    castClient = new CastClient();

    if (CAST_DEVICE) {
      console.log(`Looking for Cast device: ${CAST_DEVICE}`);
      targetDevice = await discovery.findDeviceByName(CAST_DEVICE);
      if (targetDevice) {
        console.log(`Found device: ${targetDevice.name} at ${targetDevice.host}:${String(targetDevice.port)}`);
      } else {
        console.warn(`Device "${CAST_DEVICE}" not found`);
      }
    }
  });

  afterAll(() => {
    if (castClient.isConnected()) {
      castClient.disconnect();
    }
    discovery.clearCache();
  });

  describe('Device Discovery', () => {
    it('should discover Cast devices on the network', async () => {
      const devices = await discovery.discoverDevices({ timeout: 5000 });
      console.log(`Discovered ${String(devices.length)} device(s):`);
      devices.forEach((d) => {
        console.log(`  - ${d.name} [${d.id ?? 'no-id'}] at ${d.host}:${String(d.port)}`);
      });
      expect(devices).toBeDefined();
      expect(Array.isArray(devices)).toBe(true);
    });

    it('should find device by name if CAST_DEVICE is set', () => {
      if (!CAST_DEVICE) {
        console.log('Skipping: CAST_DEVICE not set');
        return;
      }
      expect(targetDevice).not.toBeNull();
      if (targetDevice) {
        expect(targetDevice.name.toLowerCase()).toContain(CAST_DEVICE.toLowerCase());
      }
    });

    it('should use discovery cache for subsequent calls', async () => {
      const devices1 = await discovery.discoverDevices();
      const devices2 = await discovery.discoverDevices();

      // Both should return same devices from cache
      expect(devices1.length).toBe(devices2.length);
    });
  });

  describe.skipIf(!targetDevice)('Cast Client Connection', () => {
    it('should connect to the target device', async () => {
      if (!targetDevice) return;
      await castClient.connect(targetDevice);
      expect(castClient.isConnected()).toBe(true);
      expect(castClient.getConnectedDevice()?.name).toBe(targetDevice.name);
    });

    it('should get status from connected device', async () => {
      const status = await castClient.getStatus();
      console.log('Device status:', status);
      // Status may be null if nothing is playing
      // Just verify we don't throw
    });

    it('should disconnect cleanly', () => {
      castClient.disconnect();
      expect(castClient.isConnected()).toBe(false);
    });
  });

  describe.skipIf(!targetDevice)('Playback Control', () => {
    // Note: These tests require an audio stream to load
    // For full integration tests, you would need:
    // 1. A running Audiobookshelf server
    // 2. A valid audiobook to play
    // These are placeholders for manual testing

    it.skip('should load and play media', async () => {
      // This would require actual media URL
      // await castClient.connect(targetDevice!);
      // await castClient.loadMedia({ url: '...', contentType: 'audio/mpeg', title: 'Test' });
    });

    it.skip('should pause playback', async () => {
      // await castClient.pause();
    });

    it.skip('should resume playback', async () => {
      // await castClient.play();
    });

    it.skip('should stop playback', async () => {
      // await castClient.stop();
    });
  });
});

describe.skipIf(!CAST_INTEGRATION)('Cast Discovery Stress Test', () => {
  it('should handle rapid discovery calls', async () => {
    const discovery = new DeviceDiscovery({ cacheTtlMs: 1000 });

    // Make multiple rapid calls
    const results = await Promise.all([
      discovery.discoverDevices(),
      discovery.discoverDevices(),
      discovery.discoverDevices(),
    ]);

    // All should return the same devices (from cache or concurrent request)
    expect(results[0].length).toBe(results[1].length);
    expect(results[1].length).toBe(results[2].length);

    discovery.clearCache();
  });

  it('should refresh cache when forced', async () => {
    const discovery = new DeviceDiscovery({ cacheTtlMs: 60000 });

    const devices1 = await discovery.discoverDevices();
    const devices2 = await discovery.discoverDevices({ forceRefresh: true });

    // Both should be valid arrays
    expect(Array.isArray(devices1)).toBe(true);
    expect(Array.isArray(devices2)).toBe(true);

    discovery.clearCache();
  });
});
