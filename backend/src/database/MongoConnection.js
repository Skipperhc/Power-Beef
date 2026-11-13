import mongoose from 'mongoose';

export class MongoConnection {
  async connect(uri = process.env.MONGODB_URI) {
    if (!uri) {
      throw new Error('Configure MONGODB_URI no ambiente ou no arquivo .env.');
    }

    await mongoose.connect(uri, {
      dbName: 'power_beef',
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
    });
    return mongoose.connection;
  }

  async disconnect() {
    await mongoose.disconnect();
  }

  get isConnected() {
    return mongoose.connection.readyState === 1;
  }
}

export const mongoConnection = new MongoConnection();
