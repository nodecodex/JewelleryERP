import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/swarnpro_erp_licensing';

let isConnected = false;

export async function initDatabase() {
  if (isConnected) {
    return;
  }
  console.log('Connecting to MongoDB database...');
  try {
    const db = await mongoose.connect(connectionString);
    isConnected = db.connections[0].readyState === 1;
    console.log('MongoDB connection established successfully.');
  } catch (err) {
    console.error('Failed to initialize MongoDB database:', err);
    throw err;
  }
}

// Export mongoose to replace pool if needed, or simply let server.ts import models directly.
// In our case server.ts will import models.
export default mongoose;
