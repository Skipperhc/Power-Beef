# Usuários e perfis

## Primeiro administrador

O primeiro acesso administrativo é concedido pelo operador do backend, nunca pelo cadastro público. Na pasta backend:

```powershell
npm run admin:grant -- seu-email@example.com
```

O comando autoriza esse e-mail e promove a conta existente, se houver. Se ainda não existir conta, fazer o primeiro acesso com Google usando o mesmo e-mail. Não existe administrador ou senha padrão. O comando requer acesso ao `.env` do backend e ao Atlas. Após a promoção, atualizar a página ou entrar novamente.

## Tela Usuários

Menu lateral → Usuários (`/usuarios`), exclusivo para administradores:

- Listar contas criadas por cadastro local ou primeiro acesso Google; inclui nome, e-mail, perfil, ativo, provedor, cadastro e último login.
- Criar usuário por e-mail e senha inicial, escolhendo cliente ou administrador.
- Editar nome, perfil, estado ativo e e-mail de contas locais. O e-mail Google é preservado para não desassociar a identidade.
- Desativar para bloquear o acesso sem apagar a conta; excluir para remover a conta e permitir um cadastro futuro como cliente.
- Autorizar e-mails administradores antes do cadastro. Se a conta já existir, a autorização promove seu perfil imediatamente.
- Remover uma autorização rebaixa a conta correspondente para cliente.

Os formulários não exibem hashes, senhas ou identificadores Google. A listagem tem filtros e paginação. Alterações e exclusões encerram sessões do usuário afetado. A permissão é conferida no banco a cada requisição, inclusive ao revogar uma autorização. O próprio administrador não pode editar/excluir sua conta nem remover sua autorização nesta tela.

## Segurança e cadastro futuro

O cadastro público rejeita campos de privilégio. E-mails administrativos reservados não podem abrir conta por e-mail/senha no cadastro público: precisam autenticar pelo Google, que confirma o e-mail, ou receber conta criada explicitamente por um administrador. Assim, informar um e-mail autorizado sem comprovar sua identidade não concede acesso administrativo.

A coleção `emails_administradores` guarda autorizações por e-mail, enquanto `usuarios.perfil` guarda o perfil efetivo. As alterações que afetam ambos usam transações. Usuários antigos sem perfil são tratados como clientes; nenhum usuário existente é promovido automaticamente sem indicação de um administrador.

## API

Todos os endpoints abaixo exigem administrador; cliente recebe 403 e visitante recebe 401.

| Método | Rota | Ação |
| --- | --- | --- |
| GET | /api/usuarios | Listar usuários |
| GET | /api/usuarios/:id | Consultar usuário |
| POST | /api/usuarios | Criar com nome, email, senha, perfil e ativo |
| PUT | /api/usuarios/:id | Editar nome, email, perfil e ativo |
| DELETE | /api/usuarios/:id | Excluir conta e sessões |
| GET | /api/emails-administradores | Listar autorizações |
| POST | /api/emails-administradores | Autorizar `{ "email": "pessoa@example.com" }` |
| DELETE | /api/emails-administradores/:id | Revogar autorização |

Perfil aceita `administrador` ou `cliente`. `ativo` é booleano. Duplicidades retornam 409. Desativação é recomendada quando for preciso impedir novos acessos: excluir a conta não impede um novo cadastro público futuro.
