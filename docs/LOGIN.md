# Login e cadastro

## Funcionamento

- `/login` permite criar conta com nome, e-mail e senha ou entrar em uma conta existente.
- Senhas de cadastro: 12 a 128 caracteres, armazenadas com scrypt e salt aleatório.
- Login Google cria a conta automaticamente na primeira autenticação; o backend valida o ID token com a biblioteca oficial do Google e verifica o e-mail confirmado.
- Contas locais e Google não são vinculadas automaticamente pelo e-mail. Se já existir conta local, entrar com a senha; a vinculação de contas é uma funcionalidade futura.
- Usuários e sessões ficam nas coleções `usuarios` e `sessoes`. A sessão dura sete dias; o cookie é HttpOnly e SameSite=Lax. Em produção, `NODE_ENV=production` ativa Secure e exige HTTPS.
- Logout invalida a sessão no banco. A expiração também é checada a cada consulta, independentemente da limpeza TTL do MongoDB.
- Todas as telas de gestão exigem sessão; endpoints de estoque e vendas também são protegidos no servidor. Health e configuração pública do Google não exigem login.
- Requisições de alteração enviam o cabeçalho `X-Power-Beef: 1`; o servidor não habilita CORS e rejeita pedidos de navegador identificados como cross-site.
- Há um limite em memória de 30 tentativas de autenticação por IP a cada 15 minutos. Para múltiplas instâncias, centralizar esse limite e configurar o proxy de produção.

## Acesso ao estoque

O cadastro é aberto, com perfil `cliente` por padrão. Apenas administradores gerenciam estoque, vendas, usuários e status de pedidos. Clientes acessam o catálogo, carrinho e seus próprios pedidos. Ainda não há recuperação de senha ou confirmação de e-mail no cadastro local. Consulte `USUARIOS.md` para o primeiro administrador e a gestão de permissões, e `PEDIDOS.md` para compras e reservas.

## Habilitar Google

1. No Google Cloud / Google Auth Platform, selecionar um projeto e configurar a tela de consentimento.
2. Criar um cliente OAuth do tipo **Aplicativo da Web**.
3. Adicionar `http://localhost:4200` em **Origens JavaScript autorizadas**. Se usar outra porta ou host, incluir sua origem exata. Em produção, usar a origem HTTPS da aplicação.
4. Se o aplicativo estiver em modo de teste, cadastrar as contas de teste conforme a configuração de audiência do Google.
5. Copiar o Client ID público para `backend/.env`:

```dotenv
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
```

6. Reiniciar o backend após alterar o `.env` e recarregar a tela de login.

O fluxo usa Google Identity Services com callback JavaScript e ID token: não requer Client Secret nem URI de redirecionamento. O frontend obtém o Client ID pelo endpoint público `/api/auth/config`; nenhum segredo do Google vai para o navegador. Sem o Client ID, o cadastro por e-mail funciona e a tela informa que Google ainda não está configurado.

Referências: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid e https://developers.google.com/identity/gsi/web/guides/verify-google-id-token.

## Endpoints

| Método | Rota | Uso |
| --- | --- | --- |
| POST | /api/auth/register | Nome, e-mail e senha (`nome`, `email`, `senha`) |
| POST | /api/auth/login | E-mail e senha (`email`, `senha`) |
| POST | /api/auth/google | ID token Google (`credential`) |
| GET | /api/auth/me | Usuário da sessão atual |
| POST | /api/auth/logout | Encerrar a sessão |
| GET | /api/auth/config | Client ID público, ou null |

## Validação

Os testes de autenticação usam armazenamento em memória e verificador Google simulado: cobrem cadastro, duplicidade, senha incorreta, sessão expirada, logout, bloqueio sem sessão, rejeição de token e criação de conta Google. Não criam usuários reais no Atlas. O fluxo real do Google exige Client ID e uma conta no navegador.
