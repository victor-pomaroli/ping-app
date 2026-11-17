# Ping — Gamificação: Fase 0 (fluxo atual e decisões)

Plano de origem: `PLANO_IMPLEMENTACAO_PING_GAMIFICACAO.md` (17/11/2026). Este documento fecha a **Fase 0** e registra o que a **Fase 1** implementou. Verificado no código em 2026-11-17 (v1.9.1, árvore de trabalho local).

## Fluxo de conclusão encontrado no código

Toda conclusão passa por **`setTaskCompleted(id, completed)`** em `src/store.ts`. Chamadores confirmados:

| Origem | Arquivo | Caminho |
|---|---|---|
| Aba Hoje / Tarefas | `app/index.tsx` | `completeTask` → `setTaskCompleted` |
| Calendário | `src/components/CalendarScreen.tsx` | `completeTask` → `setTaskCompleted` |
| Botão "Concluir" da notificação | `src/notification-actions.ts` | `completeTask` → `setTaskCompleted` |
| Widget | `src/widget/widget-task-handler.tsx` | `setTaskCompleted` direto |
| Principal fechada pelas subtarefas | `src/store.ts` | `syncParentCompletion` |

Ponto único de integração: `setTaskCompleted` (e `syncParentCompletion` para a principal). Não há outra escrita que conclua tarefa (a única outra, em `syncDailyTasks`, é o reset diário para `completed=0`).

**Identidade da ocorrência:** tarefa comum tem `id` único (AUTOINCREMENT, não reaproveitado). Rotina tem uma linha só e a ocorrência é `(id, dia local)`, a mesma identidade de `daily_history`. `day_scores` **não** é fonte de verdade de cada conclusão: guarda só o placar fechado por dia (planejado x feito). As recompensas têm tabela própria.

**Correção ao plano:** o plano cita uma aba "Atrasos"; o app tem **Hoje, Tarefas e Calendário** (atrasadas aparecem como seção em Hoje).

## Decisões registradas (adotadas as recomendações do plano, seção 12)

| Tema | Decisão |
|---|---|
| Quem recebe | Só tarefa principal (`kind='task'`, sem `parent_id`). Subtarefa e evento não pagam; a principal paga ao ser concluída, inclusive quando fecha pelas subtarefas. |
| Tarefa comum | Paga **uma vez na vida** (`task:{id}`). Desfazer não tira moeda; refazer não paga de novo. |
| Rotina | Paga uma vez por ocorrência (`routine:{id}:{dia}`). |
| Dia | Dia local da conclusão, o mesmo critério de `localDay()`. |
| Teto | 20 moedas/dia vindas de tarefas. Passou do teto, o evento é gravado com 0 moeda e **não paga depois** (evita farm). |
| Consistência | +15 quando há conclusões elegíveis em 3 dias distintos da semana (segunda a domingo), uma vez por semana. |
| Punição | Nenhuma: sem perda de moeda, item ou amizade por dia sem uso. |
| Moedas compradas | Não existem na v1. Sem multiplicador Pro. |
| Persistência | Local (SQLite). Sincronização só se surgir requisito real. |
| Falha | Um erro do motor **nunca** quebra a conclusão: vira aviso no log. |

Valores (`REWARD_CONFIG` em `src/rewards.ts`: 5 moedas, teto 20, bônus 15, 3 dias) são **hipóteses**, a calibrar por simulação e beta.

## Fase 1 implementada

- `src/rewards.ts`: regras puras + camada de banco com `reward_events` (chave de idempotência UNIQUE) e `wallet_transactions` (ledger só de acréscimo; saldo = soma). Crédito e evento na mesma transação.
- `src/store.ts`: cria as tabelas na migração (aditiva) e chama o motor em `setTaskCompleted` e `syncParentCompletion`.
- `tests/rewards.test.mjs` (`npm test`): 9 testes com SQLite real do Node: duplicidade, refazer, rotina por ocorrência, subtarefa/evento, teto, bônus semanal, limites de semana, atomicidade em falha.

## Limites conhecidos (Fase 1)

- **Sem tela ainda:** não há saldo visível nem feedback. Isso é Fase 2 e 3.
- **Concorrência:** o teste de conclusões simultâneas roda num adaptador síncrono do Node e não reproduz o `expo-sqlite` no aparelho. A defesa real é a chave UNIQUE; a transação nesse driver deve ser testada em aparelho.
- **Fuso:** rotina usa o dia local na chave. Mudar o fuso no mesmo dia real pode gerar uma segunda chave; o teto diário limita o estrago. Tarefa comum não depende do dia.
- **Reinstalação / troca de aparelho:** o saldo vive no SQLite local e some junto. Depende da issue de backup (#28) antes de qualquer compra.
- **Migração em aparelho real:** `CREATE TABLE IF NOT EXISTS` é aditivo, mas não foi executado em aparelho nem no `expo-sqlite`.
- **Tarefas já concluídas antes da atualização** não geram moedas retroativas.

## Próximas fases (do plano)

Fase 2 amizade e conquistas · Fase 3 Cantinho e loja · Fase 4 polimento e acessibilidade · Fase 5 beta · Fase 6 Ping Pro (depois da validação).

## Fase 2 implementada (parcial)

- `src/progress.ts`: 5 níveis de amizade (XP 0/50/150/350/700; 10 XP por tarefa paga, sem XP acima do teto diário) e 10 conquistas, desbloqueadas uma vez em `achievements_unlocked`.
- `src/store.ts`: migração cria a tabela; a conclusão desbloqueia conquistas; `getProgress()` alimenta a tela.
- `app/progress.tsx`: tela compacta (moedas, amizade, conquistas), acessada por um atalho nos Ajustes. Opcional: não interfere nas tarefas.
- Falta: celebração curta ao desbloquear, teste em aparelho e calibragem dos valores no beta.
