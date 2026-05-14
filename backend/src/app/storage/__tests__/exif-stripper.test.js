// Contopia — EXIF Stripper Unit Tests
// STORY-006: sharp-based EXIF removal
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock sharp to avoid native binary dependency in unit tests
// Use vi.hoisted so the variable exists before vi.mock is hoisted
const mockSharp = vi.hoisted(() => {
  const fn = vi.fn(() => ({
    rotate: vi.fn().mockReturnThis(),
    withMetadata: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('stripped-image-data')),
  }));
  fn.default = fn;
  return fn;
});

vi.mock('sharp', () => ({ default: mockSharp }));

import { stripExif } from '../exif-stripper.js';

describe('EXIF Stripper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should strip EXIF and return a buffer', async () => {
    const inputBuffer = Buffer.from('some-image-data');
    const result = await stripExif(inputBuffer);

    expect(result).toBeDefined();
    expect(mockSharp).toHaveBeenCalledWith(inputBuffer);
  });

  it('should call rotate() then withMetadata() then toBuffer()', async () => {
    const inputBuffer = Buffer.from('some-image-data');
    await stripExif(inputBuffer);

    const chain = mockSharp.mock.results[0].value;
    expect(chain.rotate).toHaveBeenCalled();
    expect(chain.withMetadata).toHaveBeenCalledWith({ exif: {} });
    expect(chain.toBuffer).toHaveBeenCalled();
  });

  it('should throw PROCESSING_ERROR on failure', async () => {
    const mockChain = {
      rotate: vi.fn().mockReturnThis(),
      withMetadata: vi.fn().mockReturnThis(),
      toBuffer: vi.fn().mockRejectedValue(new Error('processing failed')),
    };
    mockSharp.mockReturnValueOnce(mockChain);

    const inputBuffer = Buffer.from('bad-data');
    try {
      await stripExif(inputBuffer);
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err.status).toBe(500);
      expect(err.code).toBe('PROCESSING_ERROR');
      expect(err.message).toBe("We couldn't process your picture. Try again.");
    }
  });
});