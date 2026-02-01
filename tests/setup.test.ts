import { describe, it, expect } from 'vitest';

describe('Project Setup', () => {
  it('should have test framework working', () => {
    expect(true).toBe(true);
  });

  it('should be able to import main exports', async () => {
    const { AudiobookshelfClient, CastController, SleepTimer } = await import('../src/index.js');
    expect(AudiobookshelfClient).toBeDefined();
    expect(CastController).toBeDefined();
    expect(SleepTimer).toBeDefined();
  });
});
