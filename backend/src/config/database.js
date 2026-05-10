// Contopia — MongoDB Connection Configuration
import mongoose from 'mongoose';
import pino from 'pino';

const logger = pino({
  name: 'mongodb',
  level: process.env.LOG_LEVEL || 'info',
});

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongodb:27017/estantedigital';

export async function connectDB() {
  try {
    mongoose.connection.on('connected', () => {
      logger.info({ uri: MONGODB_URI.replace(/\/\/.*@/, '//***@') }, 'MongoDB connected');
    });

    mongoose.connection.on('error', (err) => {
      logger.error({ err }, 'MongoDB connection error');
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    return mongoose;
  } catch (err) {
    logger.fatal({ err }, 'Failed to connect to MongoDB');
    process.exit(1);
  }
}

export default mongoose;
