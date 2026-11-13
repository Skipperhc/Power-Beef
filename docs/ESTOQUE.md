# Estoque de pacotes

Cada documento da coleção `pacotes` representa um pacote físico, equivalente a uma unidade. O lote não é único: vários pacotes podem compartilhar o mesmo lote.

## Campos

| Campo | Descrição |
| --- | --- |
| `_id` | Identificador automático do pacote |
| `tipo` | brasileirinho, picante, churrasco ou original |
| `dataFabricacao` | Data obrigatória de fabricação |
| `validade` | Data obrigatória, igual ou posterior à fabricação |
| `lote` | Identificação obrigatória do lote |
| `status` | em_estoque (padrão), vendido ou descartado |
| `observacoes` | Texto opcional |
| `createdAt`, `updatedAt` | Datas de criação e última atualização, automáticas |

Para datas de calendário, enviar `YYYY-MM-DD`; o Mongoose armazena como Date em UTC. Na apresentação, preservar o dia UTC para evitar deslocamento por fuso horário.

Validade não altera status automaticamente. O total físico usa `status: 'em_estoque'`; pacotes vencidos devem ser separados ao calcular o estoque apto para venda.

## MongoDB Atlas

1. Criar um cluster e um usuário de banco com acesso ao banco `power_beef`.
2. Autorizar o IP do backend na configuração de acesso de rede do Atlas.
3. Copiar `backend/.env.example` para `backend/.env` e preencher a URI fornecida pelo Atlas, incluindo o banco. Codificar caracteres especiais de usuário/senha na URI.
4. Executar `npm run dev` no backend. A API só começa a atender depois da conexão.

O `.env` é ignorado pelo Git. Não colocar a URI no frontend. A rota `/api/health` retorna 503 quando a conexão não está disponível.

## Uso do modelo

Com a conexão aberta pela classe `MongoConnection`:

```js
import { Pacote } from './src/models/Pacote.js';

const pacote = await Pacote.create({
  tipo: 'brasileirinho',
  dataFabricacao: '2026-11-01',
  validade: '2027-05-01',
  lote: 'PB-20261101',
});

const quantidade = await Pacote.countDocuments({ status: 'em_estoque' });
const porSabor = await Pacote.aggregate([
  { $match: { status: 'em_estoque' } },
  { $group: { _id: '$tipo', quantidade: { $sum: 1 } } },
]);
```

Para alterar datas, carregar o documento, atribuir os campos e chamar `save()`, preservando a validação conjunta de fabricação e validade. Não usar atualizações diretas para essas alterações.

## Endpoints

## Navegação da aplicação

As listagens de pacotes e vendas são paginadas no frontend, após aplicar os filtros. O padrão é 10 registros por página, com opções 25, 50 e 100, controles de primeira/anterior/próxima/última página e intervalo exibido. Alterar ou limpar filtros e mudar o tamanho retorna à primeira página. Se os dados diminuírem, a página atual é limitada à última disponível. Os cartões de estoque e o total vendido continuam considerando todos os resultados correspondentes, não apenas a página visível. A API ainda carrega a coleção completa.

Menu recolhível na lateral direita: fechado ocupa apenas o botão de seta para a esquerda; aberto apresenta Dashboard (`/`), Adicionar pacotes (`/pacotes/adicionar`), Adicionar vendas (`/vendas/adicionar`) e Listar pacotes (`/pacotes`). Cada função possui sua própria página. A listagem preserva filtros, edição e exclusão; o formulário de edição aparece ao clicar em Editar. Em telas pequenas o menu expandido se sobrepõe ao conteúdo para preservar a largura dos formulários.

### Venda por quantidade

A home lista os pacotes vendidos agrupados por dia, sabor e lote, somando a quantidade. Não representa pedidos individuais: duas operações com os mesmos dia, sabor e lote aparecem juntas. Pacotes antigos sem data aparecem como “Sem data registrada”.

As tabelas de vendas e pacotes mostram quantidade de linhas exibidas e total antes dos filtros. A tabela de vendas também soma as unidades vendidas dos resultados. Os filtros combinam condições por coluna: sabor/status/quantidade por valores únicos, lote/observações por texto sem distinção de acentos ou maiúsculas e datas por intervalo inclusivo (com um ou ambos os limites). Na coluna sabor/lote há controles separados para cada informação. Datas ausentes não entram em um intervalo ativo; sem filtro continuam visíveis. Limpar filtros restaura a listagem completa. Os filtros não alteram o total dos cartões de estoque.

`POST /api/pacotes/venda` recebe `{ "tipo": "original", "quantidade": 10, "dataVenda": "2026-11-13" }`. Seleciona somente pacotes em estoque do sabor informado, fabricados até a data da venda, priorizando menor validade. Usa transação para atualizar exatamente a quantidade solicitada ou não atualizar nada. Estoque insuficiente retorna 409. Cada pacote selecionado recebe status `vendido` e `dataVenda`. Quantidade aceita: 1 a 1000. A data da venda aparece na listagem. Pacotes vendidos antes desta funcionalidade podem não ter data registrada. O fluxo mantém a regra atual de estoque físico (não exclui vencidos automaticamente).

| Método | Caminho | Resultado |
| --- | --- | --- |
| GET | /api/pacotes | Lista todos os pacotes, mais recentes primeiro |
| GET | /api/pacotes/:id | Consulta um pacote |
| POST | /api/pacotes | Cria pacote (201) |
| PUT | /api/pacotes/:id | Atualiza os campos enviados usando save() |
| DELETE | /api/pacotes/:id | Exclui permanentemente (204) |

POST e PUT recebem JSON com os campos do modelo, sem `_id`, `createdAt` ou `updatedAt`. Datas devem usar YYYY-MM-DD. Erros de entrada retornam 400, registro inexistente 404 e conexão indisponível 503. A exclusão remove o registro: para registrar uma venda ou descarte preservando os dados, editar o status.

No POST, o campo opcional `quantidade` aceita um inteiro entre 1 e 1000. Quando informado, cria essa quantidade de documentos individuais com os mesmos dados, em uma transação no Atlas, retornando `{ quantidade, pacotes }`. Sem o campo, mantém o cadastro unitário e a resposta de um documento. A quantidade não é armazenada no pacote e não é aceita no PUT: a edição continua individual. O formulário inicia em 1 e permite informar a quantidade ao adicionar pacotes. O dashboard conta todas as unidades criadas normalmente.

O frontend contém formulário, listagem, edição, confirmação de exclusão e total físico em estoque. O comando `npm start` do frontend encaminha `/api/**` ao backend na porta 3001. Para hospedagem futura, configurar o mesmo encaminhamento no servidor web.

A home (`/`) é o dashboard central: apresenta o total físico e a quantidade dos sabores brasileirinho, picante, churrasco e original, incluindo zero quando não há unidades. A contagem considera somente `status: em_estoque`, sem descontar vencidos automaticamente. O CRUD fica em `/pacotes`, acessível pelo menu. O resumo consulta a API ao abrir a home e ao clicar em Atualizar; falhas de consulta mostram erro em vez de estoque zero.

Os testes validam o modelo e o fluxo HTTP com armazenamento em memória, sem gravar no Atlas. A API em execução exige sessão para estoque e vendas; consulte `LOGIN.md` para cadastro, login e configuração do Google.
