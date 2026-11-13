import { createServer } from 'node:http';
import { mongoConnection } from './database/MongoConnection.js';
import { criarApp } from './app.js';
import { protegerApp } from './auth.js';
import { Usuario } from './models/Usuario.js';
import { Sessao } from './models/Sessao.js';
import { EmailAdministrador } from './models/EmailAdministrador.js';
import { Pedido } from './models/Pedido.js';
import { ControleEstoque } from './models/ControleEstoque.js';

const port = Number(process.env.PORT ?? 3001);
const server = createServer(protegerApp(criarApp()));

try {
  await mongoConnection.connect();
  await Promise.all([Usuario.init(), Sessao.init(), EmailAdministrador.init(), Pedido.init(), ControleEstoque.init()]);
  await ControleEstoque.updateOne({ _id: 'principal' }, { $setOnInsert: { versao: 0 } }, { upsert: true });
  server.listen(port, '127.0.0.1', () => {
    console.log(`Power Beef API: http://localhost:${port}`);
  });
} catch {
  console.error('Não foi possível conectar ao MongoDB. Verifique MONGODB_URI, credenciais e acesso de rede no Atlas.');
  await mongoConnection.disconnect();
  process.exitCode = 1;
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    server.close(async () => {
      await mongoConnection.disconnect();
    });
  });
}
