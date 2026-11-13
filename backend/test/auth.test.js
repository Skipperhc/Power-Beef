import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { protegerApp, gerarSenha, conferirSenha } from '../src/auth.js';

test('senhas usam salt e hash, com comparação segura', async () => {
  const senha = 'minha senha de teste';
  const a = await gerarSenha(senha); const b = await gerarSenha(senha);
  assert.notEqual(a, b);
  assert.ok(!a.includes(senha));
  assert.equal(await conferirSenha(senha, a), true);
  assert.equal(await conferirSenha('errada', a), false);
});

test('cadastro, login, sessão, logout, proteção HTTP e Google', async t => {
  const usuarios = []; const sessoes = [];
  const Usuarios = {
    updateOne: async (filtro, update) => { const u = usuarios.find(u => u._id === filtro._id); if (u) Object.assign(u, update.$set); },
    exists: async filtro => usuarios.some(u => u.email === filtro.email),
    create: async dados => { const u = { ...dados, _id: String(usuarios.length + 1) }; usuarios.push(u); return u; },
    findOne: filtro => {
      const found = usuarios.find(u => Object.entries(filtro).every(([k, v]) => u[k] === v));
      return { select: async () => found, then: resolve => resolve(found) };
    },
  };
  const Sessoes = {
    create: async dados => sessoes.push(dados),
    deleteOne: async filtro => { const i = sessoes.findIndex(s => s.tokenHash === filtro.tokenHash); if (i >= 0) sessoes.splice(i, 1); },
    findOne: filtro => ({ populate: async () => {
      const s = sessoes.find(s => s.tokenHash === filtro.tokenHash && s.expiraEm > filtro.expiraEm.$gt);
      return s ? { ...s, usuario: usuarios.find(u => u._id === s.usuario) } : null;
    } }),
  };
  const anterior = process.env.GOOGLE_CLIENT_ID; process.env.GOOGLE_CLIENT_ID = 'google-test';
  t.after(() => { if (anterior === undefined) delete process.env.GOOGLE_CLIENT_ID; else process.env.GOOGLE_CLIENT_ID = anterior; });
  const google = { verifyIdToken: async ({ idToken, audience }) => {
    assert.equal(audience, 'google-test');
    if (idToken === 'invalido') throw new Error('token inválido');
    return { getPayload: () => ({ sub: idToken, email: idToken === 'conflito' ? 'teste@example.com' : idToken === 'admin-google' ? 'admin@example.com' : 'google@example.com', name: 'Google', email_verified: true }) };
  } };
  const Admins = { exists: async ({ email }) => email === 'admin@example.com' };
  const server = createServer(protegerApp((req, res) => { res.writeHead(200); res.end('{}'); }, { Usuarios, Sessoes, Admins, google }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (path, method = 'GET', body, cookie) => fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json', 'X-Power-Beef': '1', ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  assert.equal((await request('/api/pacotes')).status, 401);
  assert.equal((await fetch(base + '/api/auth/register', { method: 'POST', body: '{}' })).status, 403);
  const dados = { nome: 'Teste', email: 'TESTE@example.com', senha: 'senha longa de teste' };
  assert.equal((await request('/api/auth/register', 'POST', { ...dados, senha: 'curta' })).status, 400);
  const cadastro = await request('/api/auth/register', 'POST', dados);
  assert.equal(cadastro.status, 201);
  const perfil = await cadastro.json();
  assert.equal(perfil.usuario.email, 'teste@example.com');
  assert.equal(perfil.usuario.senhaHash, undefined);
  const setCookie = cadastro.headers.get('set-cookie');
  assert.match(setCookie, /HttpOnly/); assert.match(setCookie, /SameSite=Lax/);
  const cookie = setCookie.split(';')[0];
  assert.equal(perfil.usuario.perfil, 'cliente');
  assert.equal((await request('/api/pacotes', 'GET', undefined, cookie)).status, 403);
  assert.equal((await request('/api/usuarios', 'GET', undefined, cookie)).status, 403);
  assert.equal((await request('/api/emails-administradores', 'POST', { email: 'outro@example.com' }, cookie)).status, 403);
  assert.equal((await request('/api/auth/register', 'POST', { nome: 'Ataque', email: 'a@example.com', senha: 'senha longa teste', perfil: 'administrador' })).status, 400);
  usuarios[0].perfil = 'administrador';
  assert.equal((await request('/api/pacotes', 'GET', undefined, cookie)).status, 200);
  usuarios[0].ativo = false;
  assert.equal((await request('/api/pacotes', 'GET', undefined, cookie)).status, 401);
  usuarios[0].ativo = true;
  assert.equal((await request('/api/auth/register', 'POST', dados)).status, 409);
  assert.equal((await request('/api/auth/login', 'POST', { ...dados, senha: 'errada' })).status, 401);
  const login = await request('/api/auth/login', 'POST', dados);
  assert.equal(login.status, 200);
  const loginCookie = login.headers.get('set-cookie').split(';')[0];
  assert.equal((await request('/api/auth/me', 'GET', undefined, loginCookie)).status, 200);
  await request('/api/auth/logout', 'POST', {}, loginCookie);
  assert.equal((await request('/api/auth/me', 'GET', undefined, loginCookie)).status, 401);
  assert.equal((await request('/api/auth/google', 'POST', { credential: 'invalido' })).status, 401);
  assert.equal((await request('/api/auth/google', 'POST', { credential: 'conflito' })).status, 409);
  assert.equal((await request('/api/auth/google', 'POST', { credential: 'google-id' })).status, 200);
  assert.equal((await request('/api/auth/google', 'POST', { credential: 'google-id' })).status, 200);
  assert.equal(usuarios.length, 2);
  assert.equal((await request('/api/auth/register', 'POST', { ...dados, email: 'admin@example.com' })).status, 403);
  const adminGoogle = await request('/api/auth/google', 'POST', { credential: 'admin-google' });
  assert.equal(adminGoogle.status, 200);
  assert.equal((await adminGoogle.json()).usuario.perfil, 'administrador');
  for (const sessao of sessoes) sessao.expiraEm = new Date(0);
  assert.equal((await request('/api/pacotes', 'GET', undefined, cookie)).status, 401);
  let limitada = false;
  for (let i = 0; i < 31; i++) {
    if ((await request('/api/auth/login', 'POST', {})).status === 429) { limitada = true; break; }
  }
  assert.equal(limitada, true);
});
