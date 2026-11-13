import test from 'node:test';
import assert from 'node:assert/strict';
import { gerenciarUsuarios, dadosUsuario } from '../src/usuarios.js';

const admin = { id: '000000000000000000000001', email: 'admin@example.com', perfil: 'administrador' };
const id = '000000000000000000000002';

function fixture() {
  const usuarios = []; const admins = []; const sessoesRemovidas = [];
  const query = valor => ({ session: async () => valor, then: resolve => resolve(valor) });
  function documento(dados) {
    const u = { _id: id, ...dados };
    u.save = async () => u;
    u.deleteOne = async () => usuarios.splice(usuarios.indexOf(u), 1);
    return u;
  }
  const Usuarios = {
    db: { transaction: async callback => callback('sessao') },
    find: () => ({ sort: async () => usuarios }),
    findById: chave => query(usuarios.find(u => u._id === chave)),
    create: async dados => dados.map(d => { const u = documento(d); usuarios.push(u); return u; }),
    updateOne: async (filtro, update) => { const u = usuarios.find(u => u.email === filtro.email); if (u) Object.assign(u, update.$set); },
  };
  const Admins = {
    exists: filtro => query(admins.some(a => a.email === filtro.email)),
    create: async dados => dados.map(d => { const a = { _id: id, ...d, deleteOne: async () => admins.splice(admins.indexOf(a), 1) }; admins.push(a); return a; }),
    find: () => ({ sort: () => ({ lean: async () => admins }) }),
    findById: chave => query(admins.find(a => a._id === chave)),
    updateOne: async filtro => { if (!admins.some(a => a.email === filtro.email)) await Admins.create([{ email: filtro.email }]); },
    deleteOne: async filtro => { const i = admins.findIndex(a => a.email === filtro.email); if (i >= 0) admins.splice(i, 1); },
  };
  const Sessoes = { deleteMany: async filtro => sessoesRemovidas.push(filtro.usuario) };
  const chamar = (path, method, dados, usuario = admin) => gerenciarUsuarios({ method }, path, usuario, { Usuarios, Admins, Sessoes, lerJson: async () => dados, hashPassword: async senha => `hash:${senha}` });
  return { chamar, usuarios, admins, sessoesRemovidas, documento };
}
const dados = { nome: 'Cliente', email: 'cliente@example.com', senha: 'senha longa de teste', perfil: 'cliente', ativo: true };

test('CRUD de usuários não expõe credenciais e revoga sessões ao editar/excluir', async () => {
  const f = fixture();
  const criado = await f.chamar('/api/usuarios', 'POST', dados);
  assert.equal(criado.status, 201); assert.equal(criado.body.perfil, 'cliente'); assert.equal(criado.body.senhaHash, undefined);
  assert.equal((await f.chamar('/api/usuarios', 'GET')).body.length, 1);
  assert.equal((await f.chamar(`/api/usuarios/${id}`, 'GET')).status, 200);
  const { senha, ...edicao } = dados;
  assert.equal((await f.chamar(`/api/usuarios/${id}`, 'PUT', { ...edicao, perfil: 'administrador' })).body.perfil, 'administrador');
  assert.equal(f.admins[0].email, dados.email);
  assert.deepEqual(f.sessoesRemovidas, [id]);
  assert.equal((await f.chamar(`/api/usuarios/${id}`, 'DELETE')).status, 204);
  assert.equal(f.usuarios.length, 0); assert.equal(f.admins.length, 0);
  await assert.rejects(f.chamar(`/api/usuarios/${id}`, 'GET'), e => e.status === 404);
});
test('autoriza e revoga administrador por e-mail existente ou futuro', async () => {
  const f = fixture(); await f.chamar('/api/usuarios', 'POST', dados);
  await f.chamar('/api/emails-administradores', 'POST', { email: 'CLIENTE@example.com' });
  assert.equal(f.usuarios[0].perfil, 'administrador');
  await f.chamar(`/api/emails-administradores/${id}`, 'DELETE');
  assert.equal(f.usuarios[0].perfil, 'cliente');
  await f.chamar('/api/emails-administradores', 'POST', { email: 'futuro@example.com' });
  assert.equal(f.admins[0].email, 'futuro@example.com');
});
test('cliente não gerencia usuários e administrador não remove o próprio acesso', async () => {
  const f = fixture();
  await assert.rejects(f.chamar('/api/usuarios', 'GET', undefined, { ...admin, perfil: 'cliente' }), e => e.status === 403);
  await assert.rejects(f.chamar(`/api/usuarios/${admin.id}`, 'DELETE'), e => e.status === 409);
  await assert.rejects(f.chamar(`/api/usuarios/${admin.id}`, 'PUT', {}), e => e.status === 409);
  await f.chamar('/api/emails-administradores', 'POST', { email: admin.email });
  await assert.rejects(f.chamar(`/api/emails-administradores/${id}`, 'DELETE'), e => e.status === 409);
});
test('valida campos e preserva identidade de contas Google', async () => {
  const f = fixture();
  for (const alteracao of [{ perfil: 'outro' }, { email: 'invalido' }, { senha: 'curta' }, { ativo: 'sim' }, { nome: '' }, { googleId: 'ataque' }]) {
    await assert.rejects(f.chamar('/api/usuarios', 'POST', { ...dados, ...alteracao }), e => e.status === 400);
  }
  f.usuarios.push(f.documento({ ...dados, googleId: 'google-sub' }));
  const { senha, ...edicao } = dados;
  await assert.rejects(f.chamar(`/api/usuarios/${id}`, 'PUT', { ...edicao, email: 'outro@example.com' }), e => e.status === 400);
  assert.equal(dadosUsuario(f.usuarios[0]).googleId, undefined);
});
