// Contopia — S3/MinIO Client Configuration
import { S3Client } from '@aws-sdk/client-s3';

const endpoint = process.env.S3_ENDPOINT || process.env.R2_ENDPOINT || 'http://localhost:9000';
const accessKey = process.env.S3_ACCESS_KEY || process.env.R2_ACCESS_KEY;
const secretKey = process.env.S3_SECRET_KEY || process.env.R2_SECRET_KEY;
const region = process.env.S3_REGION || process.env.R2_REGION || 'us-east-1';

export const s3Client = new S3Client({
  endpoint,
  region,
  credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  forcePathStyle: true,
});

export const BUCKET_NAME = process.env.S3_BUCKET || process.env.R2_BUCKET || 'contopia-assets';