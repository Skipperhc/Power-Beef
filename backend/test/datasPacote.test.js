import test from 'node:test';
import assert from 'node:assert/strict';
import { datasPacote } from '../src/datasPacote.js';

test('fabricação usa o dia em São Paulo e validade soma três meses de calendário', () => {
  for (const [agora, fabricacao, validade] of [
    ['2026-11-16T02:30:00Z', '2026-11-15', '2027-02-15'],
    ['2026-11-30T12:00:00Z', '2026-11-30', '2027-02-28'],
    ['2023-11-30T12:00:00Z', '2023-11-30', '2024-02-29'],
    ['2026-01-31T12:00:00Z', '2026-01-31', '2026-04-30'],
    ['2026-12-31T12:00:00Z', '2026-12-31', '2027-03-31'],
  ]) assert.deepEqual(datasPacote(new Date(agora)), { dataFabricacao: fabricacao, validade });
});
