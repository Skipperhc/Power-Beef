import mongoose from 'mongoose';
import { mongoConnection } from './MongoConnection.js';

try {
  await mongoConnection.connect();
  await mongoose.connection.db.command({ ping: 1 });
  console.log('Atlas conectado; ping OK; banco:', mongoose.connection.name);
} catch (error) {
  console.error('Falha ao conectar ao Atlas. Tipo:', error.name,
    'Código:', error.code ?? error.cause?.code ?? 'indisponível');
  process.exitCode = 1;
} finally {
  await mongoConnection.disconnect();
}
