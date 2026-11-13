# Loja e pedidos

## Cliente

O cliente chega ao catálogo (`/cliente`) com os quatro sabores: Brasileirinho, Picante, Churrasco e Original. Adiciona de 1 a 1000 pacotes de cada sabor ao carrinho (`/carrinho`), altera quantidades e finaliza. O pedido nasce como `pedido_enviado`, sem baixar estoque. Não há preços definidos nem cobrança online nesta fase: finalizar significa enviar a solicitação para análise.

O carrinho é persistido no navegador e separado por conta. O envio possui uma chave única por conteúdo de carrinho: uma tentativa repetida após falha de rede não cria outro pedido. O servidor valida sabores, quantidades e titularidade, sem confiar em identificadores de cliente enviados pelo navegador.

Em `/pedidos`, o cliente vê somente seus próprios pedidos e respectivos status. Não pode alterar status nem consultar pedidos de outra conta. Administradores veem todos os pedidos com nome e e-mail dos clientes, unidades alocadas e pendentes, histórico, filtros e paginação.

## Fluxos de status

- `pedido_enviado` → `aceito`, se houver todas as unidades; caso contrário retorna 409 sem alterar nenhum pacote.
- `pedido_enviado` → `em_producao`, reservando imediatamente o disponível. Se já houver tudo, fica `aceito`.
- `em_producao` → `aceito` automaticamente quando a reserva ficar completa, ou pela ação administrativa quando houver estoque suficiente.
- `aceito` → `entregue` → `encerrado`, por ação administrativa.

Encerrado é a finalização de um pedido já entregue; cancelamento, reabertura e devolução não fazem parte deste fluxo. Repetir o mesmo status é inofensivo e não baixa estoque novamente.

## Estoque e produção

Cada unidade alocada recebe `status: reservado` e o identificador `pedido`. Portanto, deixa de ser contada como `em_estoque` assim que o administrador aceita ou encaminha à produção. Não pode ser vendida manualmente nem associada a outro pedido. Na entrega, muda para `vendido` e recebe `dataVenda`, entrando no resumo de vendas do dashboard.

Os pacotes com menor validade são escolhidos primeiro. Mantém-se o conceito anterior de estoque físico: vencidos não são excluídos automaticamente. Conferir validade antes da entrega.

Cada cadastro de pacotes e cada edição de unidade livre reavalia a fila de produção, do pedido mais antigo ao mais novo. O estoque disponível é alocado por sabor e o saldo continua pendente. Novos pedidos não ultrapassam pedidos em produção. Ao completar todos os itens, o pedido passa a aceito sem intervenção.

Criação de estoque, distribuição e mudanças de status usam transações no Atlas e um documento de coordenação de estoque, inicializado pelo backend, para serializar reservas concorrentes. Qualquer conflito reverte a operação completa. Unidades vinculadas a pedidos não podem ser editadas ou excluídas individualmente.

## API

| Método | Caminho | Acesso |
| --- | --- | --- |
| POST | /api/pedidos | Usuário logado cria pedido próprio |
| GET | /api/pedidos | Cliente: próprios; administrador: todos |
| GET | /api/pedidos/:id | Dono ou administrador |
| PUT | /api/pedidos/:id | Administrador altera status |

Criação:

```json
{
  "chaveEnvio": "00000000-0000-4000-8000-000000000001",
  "itens": [
    { "tipo": "brasileirinho", "quantidade": 10 },
    { "tipo": "original", "quantidade": 5 }
  ]
}
```

Alteração: `{ "status": "em_producao" }` ou outro status permitido. Exclusão de pedidos não é oferecida para preservar histórico e vínculos de estoque.

Os testes usam banco simulado com rollback para reserva, falta de estoque, produção, prioridade, concorrência, entrega, reenvio e privacidade. Não criam pedidos nem movimentam estoque real no Atlas.
