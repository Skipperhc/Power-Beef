import mongoose from 'mongoose';

const erro = (message, status = 400) => Object.assign(new Error(message), { status });
export const dadosUsuario = u => ({
  id: String(u._id), nome: u.nome, email: u.email, perfil: u.perfil || 'cliente', ativo: u.ativo !== false,
  provedor: u.googleId ? 'google' : 'email', createdAt: u.createdAt, updatedAt: u.updatedAt, ultimoLogin: u.ultimoLogin,
});
export function normalizarEmail(valor) {
  const email = typeof valor === 'string' ? valor.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw erro('Informe um e-mail válido.');
  return email;
}
function validar(dados, criar) {
  const permitidos = criar ? ['nome', 'email', 'senha', 'perfil', 'ativo'] : ['nome', 'email', 'perfil', 'ativo'];
  if (Object.keys(dados).some(k => !permitidos.includes(k))) throw erro('Campos inválidos.');
  const nome = typeof dados.nome === 'string' ? dados.nome.trim() : '';
  if (!nome || nome.length > 100) throw erro('Informe um nome de até 100 caracteres.');
  const email = normalizarEmail(dados.email);
  if (!['cliente', 'administrador'].includes(dados.perfil)) throw erro('Perfil inválido.');
  if (typeof dados.ativo !== 'boolean') throw erro('Informe se o usuário está ativo.');
  if (criar && (typeof dados.senha !== 'string' || dados.senha.length < 12 || dados.senha.length > 128)) throw erro('Use senha de 12 a 128 caracteres.');
  return { nome, email, perfil: dados.perfil, ativo: dados.ativo };
}

export async function gerenciarUsuarios(req, path, atual, { Usuarios, Sessoes, Admins, lerJson, hashPassword }) {
  if (atual.perfil !== 'administrador') throw erro('Acesso exclusivo de administradores.', 403);
  const rota = path.match(/^\/api\/(usuarios|emails-administradores)(?:\/([^/]+))?\/?$/);
  if (!rota) throw erro('Rota não encontrada.', 404);
  const [, recurso, id] = rota;
  const metodos = id ? (recurso === 'usuarios' ? ['GET', 'PUT', 'DELETE'] : ['DELETE']) : ['GET', 'POST'];
  if (!metodos.includes(req.method)) throw erro('Método não permitido.', 405);
  if (id && !mongoose.isObjectIdOrHexString(id)) throw erro('ID inválido.');
  if (recurso === 'emails-administradores') {
    if (!id && req.method === 'GET') return { status: 200, body: await Admins.find().sort({ email: 1 }).lean() };
    if (!id) {
      const dados = await lerJson(req);
      if (Object.keys(dados).some(k => k !== 'email')) throw erro('Envie apenas o e-mail.');
      const email = normalizarEmail(dados.email);
      const body = await Usuarios.db.transaction(async session => {
        const [autorizacao] = await Admins.create([{ email }], { session });
        await Usuarios.updateOne({ email }, { $set: { perfil: 'administrador' } }, { session });
        return autorizacao;
      });
      return { status: 201, body };
    }
    await Usuarios.db.transaction(async session => {
      const autorizacao = await Admins.findById(id).session(session);
      if (!autorizacao) throw erro('E-mail não encontrado.', 404);
      if (autorizacao.email === atual.email) throw erro('Você não pode remover seu próprio acesso de administrador.', 409);
      await Usuarios.updateOne({ email: autorizacao.email }, { $set: { perfil: 'cliente' } }, { session });
      await autorizacao.deleteOne({ session });
    });
    return { status: 204 };
  }
  if (!id && req.method === 'GET') return { status: 200, body: (await Usuarios.find().sort({ createdAt: -1 })).map(dadosUsuario) };
  if (!id && req.method === 'POST') {
    const dados = await lerJson(req); const campos = validar(dados, true);
    const senhaHash = await hashPassword(dados.senha);
    const usuario = await Usuarios.db.transaction(async session => {
      if (campos.perfil === 'administrador') await Admins.updateOne({ email: campos.email }, { $setOnInsert: { email: campos.email } }, { upsert: true, session });
      else if (await Admins.exists({ email: campos.email }).session(session)) throw erro('Este e-mail está autorizado como administrador. Remova a autorização antes de cadastrar como cliente.', 409);
      const [u] = await Usuarios.create([{ ...campos, senhaHash }], { session }); return u;
    });
    return { status: 201, body: dadosUsuario(usuario) };
  }
  if (req.method === 'GET') {
    const u = await Usuarios.findById(id);
    if (!u) throw erro('Usuário não encontrado.', 404);
    return { status: 200, body: dadosUsuario(u) };
  }
  if (id === atual.id) throw erro('Altere outros usuários. Seu próprio acesso não pode ser editado ou excluído aqui.', 409);
  const campos = req.method === 'PUT' ? validar(await lerJson(req), false) : null;
  const usuario = await Usuarios.db.transaction(async session => {
    const u = await Usuarios.findById(id).session(session);
    if (!u) throw erro('Usuário não encontrado.', 404);
    if (campos && campos.email !== u.email && u.googleId) throw erro('O e-mail de uma conta Google não pode ser alterado.');
    await Admins.deleteOne({ email: u.email }, { session });
    if (campos) {
      if (campos.email !== u.email && await Admins.exists({ email: campos.email }).session(session)) throw erro('O novo e-mail já possui autorização administrativa.', 409);
      if (campos.perfil === 'administrador') await Admins.updateOne({ email: campos.email }, { $setOnInsert: { email: campos.email } }, { upsert: true, session });
      Object.assign(u, campos); await u.save({ session });
    } else await u.deleteOne({ session });
    await Sessoes.deleteMany({ usuario: u._id }, { session });
    return u;
  });
  return campos ? { status: 200, body: dadosUsuario(usuario) } : { status: 204 };
}
