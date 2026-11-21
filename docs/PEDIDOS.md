# Loja e pedidos

## Cliente

No fechamento, novos pedidos exigem nome do destinatário (3–100 caracteres), WhatsApp brasileiro com DDD e nove dígitos, endereço completo (10–500 caracteres) e referência opcional (até 200 caracteres). A API normaliza o telefone para `55DD9XXXXXXXX` e valida DDD e formato; não confirma a existência da conta WhatsApp. O e-mail é sempre o da conta autenticada. Os dados ficam no pedido, não no armazenamento local do endereço, e aparecem em “Dados de entrega” para o titular e administradores. Pedidos antigos continuam consultáveis sem esses campos.

## Aviso por e-mail de pedido aceito

A integração usa a API HTTPS do Resend, sem dependência adicional. A transição para `aceito` grava `emailAceite` na mesma transação do estoque, inclusive na aceitação automática da produção. Um consumidor no backend consulta a fila a cada cinco segundos. Falhas de e-mail não desfazem a aceitação; há até cinco tentativas com espera crescente, registro de envio e chave de idempotência no provedor. Pedidos recusados não são selecionados. Os avisos são apenas de aceite nesta versão; outros status não enviam mensagens.

O recurso vem desativado. Para habilitar depois da publicação:

1. Criar uma conta em https://resend.com e verificar o domínio de envio com os registros DNS indicados pelo provedor. Manter os registros A do site e eventuais registros de e-mail existentes.
2. Criar uma chave restrita a envio e configurá-la somente no `.env` do backend, nunca no Git ou no frontend.
3. Definir `EMAIL_ENABLED=true`, `RESEND_API_KEY`, `EMAIL_FROM=Power Beef <pedidos@powerbeefcwb.com.br>` e `APP_URL=https://powerbeefcwb.com.br`.
4. Reiniciar o serviço com `sudo systemctl restart power-beef` e acompanhar os resultados no painel Resend. A fila persistida é retomada após reiniciar. Avisos pendentes desde a atualização também serão processados quando o envio for ativado.

Pedidos que já estavam aceitos antes desta implementação não ganham avisos retroativos. `emailAceite.estado=enviado` significa aceitação pelo provedor, não entrega garantida na caixa de entrada. A deduplicação do Resend dura 24 horas; após esse período, recuperações de uma tentativa sem confirmação podem duplicar um aviso. Falhas finais permanecem como `falhou` para conferência no banco; não há reenvio manual pela interface nesta versão.

Os testes usam envio simulado e não disparam e-mails reais. Limites atuais: https://resend.com/docs/knowledge-base/account-quotas-and-limits. Chaves de idempotência: https://resend.com/docs/dashboard/emails/idempotency-keys.

### Conferir a configuração e testar o provedor

Dentro de `backend`, execute `npm run email:check` para validar a configuração local. Esse comando não conecta ao banco, não processa a fila, não envia mensagens e não revela a chave. Ele não confirma o DNS nem a validade da chave no provedor.

Depois que o domínio estiver **Verified**, execute `npm run email:check -- --send seu@email.com` para enviar uma única mensagem explicitamente identificada como teste. O teste pode ser feito com `EMAIL_ENABLED=false` para não liberar a fila de pedidos. A resposta informa o ID aceito pelo Resend; a entrega efetiva deve ser conferida no painel do Resend e na caixa do destinatário.

O `EMAIL_FROM` deve usar o domínio verificado. `EMAIL_REPLY_TO` é opcional: configure uma caixa que você acompanha se quiser receber respostas dos clientes; o remetente de envio não cria automaticamente uma caixa postal. Use `APP_URL` com somente a origem HTTPS, sem `/pedidos` ou outros caminhos. Ative `EMAIL_ENABLED=true` apenas depois do teste e reinicie o backend.

## Fluxo de compra

O cliente chega ao catálogo (`/cliente`) com os quatro sabores: Brasileirinho, Picante, Churrasco e Original. Adiciona de 1 a 1000 pacotes de cada sabor ao carrinho (`/carrinho`), altera quantidades, informa a entrega e finaliza. O pedido nasce como `pedido_enviado`, sem baixar estoque. O carrinho apresenta o total promocional estimado; não há cobrança online nesta fase: finalizar significa enviar a solicitação para análise.

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
