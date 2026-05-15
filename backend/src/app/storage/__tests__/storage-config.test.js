// Contopia — Storage Config Unit Tests
import { describe, it, expect, vi } from 'vitest';

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(),
}));

import { s3Client, BUCKET_NAME } from '../storage-config.js';

describe('Storage Config', () => {
  it('s3Client should be defined', () => {
    expect(s3Client).toBeDefined();
  });

  it('BUCKET_NAME should be defined', () => {
    expect(BUCKET_NAME).toBeDefined();
    expect(typeof BUCKET_NAME).toBe('string');
  });
});
