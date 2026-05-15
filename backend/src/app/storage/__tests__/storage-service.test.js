// Contopia — Storage Service Unit Tests
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockState = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockGetSignedUrl: vi.fn(),
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({ send: mockState.mockSend })),
  PutObjectCommand: vi.fn(function (input) { this.input = input; }),
  GetObjectCommand: vi.fn(function (input) { this.input = input; }),
  DeleteObjectCommand: vi.fn(function (input) { this.input = input; }),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockState.mockGetSignedUrl,
}));

vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

import { putObject, getSignedUrl as getSvcSignedUrl, deleteObject } from '../storage-service.js';

describe('Storage Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('putObject should create PutObjectCommand and send it', async () => {
    mockState.mockSend.mockResolvedValue({});
    await putObject('users/1/books/2/assets/3.png', Buffer.from('data'), 'image/png');
    expect(mockState.mockSend).toHaveBeenCalledTimes(1);
    const cmd = mockState.mockSend.mock.calls[0][0];
    expect(cmd.input.Bucket).toBeDefined();
    expect(cmd.input.Key).toBe('users/1/books/2/assets/3.png');
    expect(cmd.input.Body.toString()).toBe('data');
    expect(cmd.input.ContentType).toBe('image/png');
  });

  it('getSignedUrl should create GetObjectCommand and return presigned URL', async () => {
    mockState.mockGetSignedUrl.mockResolvedValue('https://minio.example.com/presigned');
    const url = await getSvcSignedUrl('users/1/books/2/assets/3.png', 7200);
    expect(mockState.mockGetSignedUrl).toHaveBeenCalledTimes(1);
    const cmd = mockState.mockGetSignedUrl.mock.calls[0][1];
    expect(cmd.input.Key).toBe('users/1/books/2/assets/3.png');
    expect(url).toBe('https://minio.example.com/presigned');
  });

  it('deleteObject should create DeleteObjectCommand and send it', async () => {
    mockState.mockSend.mockResolvedValue({});
    await deleteObject('users/1/books/2/assets/3.png');
    expect(mockState.mockSend).toHaveBeenCalledTimes(1);
    const cmd = mockState.mockSend.mock.calls[0][0];
    expect(cmd.input.Key).toBe('users/1/books/2/assets/3.png');
  });

  it('putObject should propagate errors', async () => {
    mockState.mockSend.mockRejectedValue(new Error('S3 down'));
    await expect(putObject('key', Buffer.from('x'), 'image/png')).rejects.toThrow('S3 down');
  });

  it('getSignedUrl should propagate errors', async () => {
    mockState.mockGetSignedUrl.mockRejectedValue(new Error('sign failed'));
    await expect(getSvcSignedUrl('key')).rejects.toThrow('sign failed');
  });

  it('deleteObject should propagate errors', async () => {
    mockState.mockSend.mockRejectedValue(new Error('S3 down'));
    await expect(deleteObject('key')).rejects.toThrow('S3 down');
  });
});
