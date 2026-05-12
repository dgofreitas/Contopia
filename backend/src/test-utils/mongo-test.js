// Contopia — Test Database Helpers (ReplSet support for migration tests)
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let replSet;

export async function startTestReplSet() {
  if (!replSet) {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  }
  const uri = replSet.getUri();
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  return { uri, replSet };
}

export async function stopTestReplSet() {
  await mongoose.disconnect();
  if (replSet) {
    await replSet.stop();
    replSet = null;
  }
}
