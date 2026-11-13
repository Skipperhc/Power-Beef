# Power Beef

Base para o sistema de gestão do Power Beef.

## Projetos

- `backend`: Node.js, Mongoose, conexão MongoDB Atlas, modelo de pacotes e rota `GET /api/health`.
- `frontend`: Angular com roteamento e SCSS; estrutura inicial gerada pelo Angular CLI.
- `docs`: espaço para requisitos e decisões.

Requisito: Node.js 24.18 ou mais recente na linha 24.

## Executar

Em um terminal:

```powershell
cd B:\VSCode\power-beef\backend
npm install
Copy-Item .env.example .env
# Preencher MONGODB_URI no .env antes de iniciar.
npm run dev
```

Em outro terminal:

```powershell
cd B:\VSCode\power-beef\frontend
npm install
npm start
```

API: http://localhost:3001/api/health. Frontend: http://localhost:4200.
Se outra aplicação estiver na porta 4200, use `npm start -- --port 4201`.

## Validação

Backend: `npm run check` e `npm test`. Frontend: `npm run build`.

## Escopo

O sistema possui catálogo, carrinho, pedidos, estoque, vendas, dashboard e gestão de usuários com filtros e paginação. Login por e-mail/senha e Google (`GOOGLE_CLIENT_ID`). Clientes enviam e acompanham seus pedidos; administradores avaliam e gerenciam estoque e produção. Configure o primeiro administrador conforme `docs/USUARIOS.md`. Fluxo de pedidos e reservas em `docs/PEDIDOS.md`; demais detalhes em `docs/ESTOQUE.md` e `docs/LOGIN.md`.
