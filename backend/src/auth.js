import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { OAuth2Client } from 'google-auth-library';
import { Usuario } from './models/Usuario.js';
import { Sessao } from './models/Sessao.js';
import { EmailAdministrador } from './models/EmailAdministrador.js';
import { gerenciarUsuarios } from './usuarios.js';
import { gerenciarPedidos } from './pedidos.js';

const scrypt = promisify(scryptCallback);
const opcoesScrypt = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const duracao = 7 * 24 * 60 * 60;
const hash = token => createHash('sha256').update(token).digest('hex');
const publico = usuario => ({ id: String(usuario._id), nome: usuario.nome, email: usuario.email, perfil: usuario.perfil || 'cliente' });
const falha = (mensagem, status = 400) => Object.assign(new Error(mensagem), { status });
const responder = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
};

export async function gerarSenha(senha) {
  const salt = randomBytes(16).toString('hex');
  const chave = await scrypt(senha, salt, 64, opcoesScrypt);
  return `${salt}:${chave.toString('hex')}`;
}
export async function conferirSenha(senha, armazenada) {
  const [salt, chave] = (armazenada ?? '').split(':');
  const calculada = await scrypt(senha, salt || 'verificacao-sem-conta', 64, opcoesScrypt);
  const esperada = Buffer.from(chave || '', 'hex');
  return esperada.length === calculada.length && timingSafeEqual(esperada, calculada);
}
async function lerJson(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > 16384) throw falha('Requisição muito grande.', 413);
  }
  let dados;
  try { dados = JSON.parse(body); } catch { throw falha('JSON inválido.'); }
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) throw falha('Dados inválidos.');
  return dados;
}
export function protegerApp(app, { Usuarios = Usuario, Sessoes = Sessao, Admins = EmailAdministrador, google = new OAuth2Client() } = {}) {
  const tentativas = new Map();
  const tokenCookie = req => {
    const token = req.headers.cookie?.split(';').map(c => c.trim()).find(c => c.startsWith('pb_session='))?.slice(11);
    return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
  };
  const cookie = (res, token, idade = duracao) => res.setHeader('Set-Cookie',
    `pb_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${idade}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  async function abrirSessao(req, res, usuario) {
    const anterior = tokenCookie(req);
    if (anterior) await Sessoes.deleteOne({ tokenHash: hash(anterior) });
    const token = randomBytes(32).toString('hex');
    await Sessoes.create({ tokenHash: hash(token), usuario: usuario._id, expiraEm: new Date(Date.now() + duracao * 1000) });
    cookie(res, token);
    return publico(usuario);
  }
  async function atual(req) {
    const token = tokenCookie(req);
    if (!token) return null;
    const sessao = await Sessoes.findOne({ tokenHash: hash(token), expiraEm: { $gt: new Date() } }).populate('usuario');
    return sessao?.usuario && sessao.usuario.ativo !== false ? publico(sessao.usuario) : null;
  }
  return async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    try {
      if (!path.startsWith('/api/')) return app(req, res);
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers['x-power-beef'] !== '1') throw falha('Requisição não autorizada.', 403);
      if (req.headers['sec-fetch-site'] === 'cross-site') throw falha('Origem não autorizada.', 403);
      if (path === '/api/auth/config' && req.method === 'GET') return responder(res, 200, { googleClientId: process.env.GOOGLE_CLIENT_ID || null });
      if (path === '/api/auth/me' && req.method === 'GET') {
        const usuario = await atual(req);
        return responder(res, usuario ? 200 : 401, { usuario });
      }
      if (path === '/api/auth/logout' && req.method === 'POST') {
        const token = tokenCookie(req);
        if (token) await Sessoes.deleteOne({ tokenHash: hash(token) });
        cookie(res, '', 0); return responder(res, 200, { message: 'Sessão encerrada.' });
      }
      if (['/api/auth/register', '/api/auth/login', '/api/auth/google'].includes(path) && req.method === 'POST') {
        const agora = Date.now();
        for (const [ip, item] of tentativas) if (item.ate < agora) tentativas.delete(ip);
        const ip = req.socket.remoteAddress;
        const limite = tentativas.get(ip) || { vezes: 0, ate: agora + 15 * 60 * 1000 };
        if (limite.vezes >= 30) throw falha('Muitas tentativas. Aguarde 15 minutos.', 429);
        limite.vezes++; tentativas.set(ip, limite);
        const dados = await lerJson(req);
        if (Object.keys(dados).some(k => !['nome', 'email', 'senha', 'credential'].includes(k))) throw falha('Campos de autenticação inválidos.');
        let usuario;
        if (path === '/api/auth/google') {
          if (!process.env.GOOGLE_CLIENT_ID) throw falha('Login Google ainda não configurado.', 503);
          if (typeof dados.credential !== 'string') throw falha('Credencial Google inválida.');
          let perfil;
          try { perfil = (await google.verifyIdToken({ idToken: dados.credential, audience: process.env.GOOGLE_CLIENT_ID })).getPayload(); }
          catch { throw falha('Não foi possível validar sua conta Google.', 401); }
          if (!perfil?.sub || !perfil.email || !perfil.email_verified) throw falha('O Google precisa confirmar seu e-mail.', 401);
          usuario = await Usuarios.findOne({ googleId: perfil.sub });
          if (!usuario) {
            if (await Usuarios.exists({ email: perfil.email.toLowerCase() })) throw falha('Já existe uma conta com esse e-mail. Entre com e-mail e senha.', 409);
            const administrador = await Admins.exists({ email: perfil.email.toLowerCase() });
            usuario = await Usuarios.create({ nome: (perfil.name || perfil.email).slice(0, 100), email: perfil.email.toLowerCase(), googleId: perfil.sub, perfil: administrador ? 'administrador' : 'cliente' });
          }
        } else {
          const email = typeof dados.email === 'string' ? dados.email.trim().toLowerCase() : '';
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || typeof dados.senha !== 'string' || dados.senha.length > 128) throw falha('Informe e-mail e senha válidos.');
          if (path === '/api/auth/register') {
            const nome = typeof dados.nome === 'string' ? dados.nome.trim() : '';
            if (!nome || nome.length > 100 || dados.senha.length < 12) throw falha('Informe seu nome e uma senha de 12 a 128 caracteres.');
            if (await Usuarios.exists({ email })) throw falha('Já existe uma conta com esse e-mail.', 409);
            if (await Admins.exists({ email })) throw falha('Este e-mail tem acesso administrativo reservado. Use o Google para confirmar sua identidade ou solicite o cadastro ao administrador.', 403);
            usuario = await Usuarios.create({ nome, email, senhaHash: await gerarSenha(dados.senha) });
          } else {
            usuario = await Usuarios.findOne({ email }).select('+senhaHash');
            const confere = await conferirSenha(dados.senha, usuario?.senhaHash);
            if (!usuario || !confere) throw falha('E-mail ou senha incorretos.', 401);
          }
        }
        if (usuario.ativo === false) throw falha('Conta desativada. Contate o administrador.', 403);
        await Usuarios.updateOne({ _id: usuario._id }, { $set: { ultimoLogin: new Date() } });
        return responder(res, path === '/api/auth/register' ? 201 : 200, { usuario: await abrirSessao(req, res, usuario) });
      }
      if (path.startsWith('/api/auth/')) throw falha('Rota não encontrada.', 404);
      const usuarioAtual = path === '/api/health' ? null : await atual(req);
      if (path !== '/api/health' && !usuarioAtual) throw falha('Entre para acessar a aplicação.', 401);
      if (/^\/api\/pedidos(\/|$)/.test(path)) {
        const resultado = await gerenciarPedidos(req, path, usuarioAtual, lerJson);
        return responder(res, resultado.status, resultado.body);
      }
      if (/^\/api\/(usuarios|emails-administradores)(\/|$)/.test(path)) {
        const resultado = await gerenciarUsuarios(req, path, usuarioAtual, { Usuarios, Sessoes, Admins, lerJson, hashPassword: gerarSenha });
        if (resultado.status === 204) { res.writeHead(204); return res.end(); }
        return responder(res, resultado.status, resultado.body);
      }
      if (/^\/api\/pacotes(\/|$)/.test(path) && usuarioAtual?.perfil !== 'administrador') throw falha('Acesso exclusivo de administradores.', 403);
      res.setHeader('Cache-Control', 'no-store');
      return app(req, res);
    } catch (error) {
      return responder(res, error.code === 11000 ? 409 : error.status || 500,
        { message: error.code === 11000 ? 'Conta já cadastrada.' : error.status ? error.message : 'Não foi possível concluir a autenticação.' });
    }
  };
}
