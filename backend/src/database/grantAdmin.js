import { mongoConnection } from './MongoConnection.js';
import { Usuario } from '../models/Usuario.js';
import { EmailAdministrador } from '../models/EmailAdministrador.js';
import { normalizarEmail } from '../usuarios.js';

try {
  const email = normalizarEmail(process.argv[2]);
  await mongoConnection.connect();
  await Promise.all([Usuario.init(), EmailAdministrador.init()]);
  await Usuario.db.transaction(async session => {
    await EmailAdministrador.updateOne({ email }, { $setOnInsert: { email } }, { upsert: true, session });
    await Usuario.updateOne({ email }, { $set: { perfil: 'administrador' } }, { session });
  });
  console.log('E-mail autorizado como administrador. Se a conta ainda não existir, entre com Google usando esse e-mail.');
} catch { console.error('Não foi possível autorizar o administrador. Verifique o e-mail e a conexão.'); process.exitCode = 1; }
finally { await mongoConnection.disconnect(); }
