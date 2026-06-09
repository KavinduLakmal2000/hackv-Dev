import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/breach';

const options = {
  // Connection pool size — adjust based on server load
  maxPoolSize: 10,
  // Reconnect behaviour
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGO_URI, options);
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('[MongoDB] Connection error:', err.message);
    process.exit(1);
  }
};

// Graceful disconnect (used in tests and shutdown)
export const disconnectDB = async () => {
  await mongoose.disconnect();
  console.log('[MongoDB] Disconnected');
};

// Log slow queries in dev
if (process.env.NODE_ENV !== 'production') {
  mongoose.set('debug', (collectionName, method, query) => {
    console.log(`[Mongoose] ${collectionName}.${method}`, JSON.stringify(query));
  });
}
