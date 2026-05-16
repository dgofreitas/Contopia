// Contopia — Vitest Global Setup
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';


// Suppress logging in tests
process.env.JWT_SECRET = 'test-secret';
process.env.LOG_LEVEL = 'silent';
process.env.APP_URL = 'http://localhost:8000';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.NODE_ENV = 'test';

// Global in-memory MongoDB instance
let mongoServer;

/**
 * Connect to the in-memory MongoDB instance before all tests.
 * Call this in the top-level `beforeAll` of suites that need a real DB.
 */
export async function connectTestDb() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}

/**
 * Disconnect and stop in-memory MongoDB after all tests.
 * Call this in the top-level `afterAll` of suites that use connectTestDb().
 */
export async function disconnectTestDb() {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
}

/**
 * Clear all collections between tests.
 */
export async function clearTestDb() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}
