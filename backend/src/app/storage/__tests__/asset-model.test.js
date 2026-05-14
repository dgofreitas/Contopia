// Contopia — Asset Model re-export test
import { describe, it, expect } from 'vitest';
import { Asset } from '../asset-model.js';

describe('Asset Model (re-export)', () => {
  it('should export Asset', () => {
    expect(Asset).toBeDefined();
    expect(Asset.modelName).toBe('Asset');
  });
});
