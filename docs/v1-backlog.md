# Ping v1 — backlog e auditoria

"v1" = **lançamento público e gratuito** da linha 1.x (hoje 1.9.1). A monetização (Ping Pro) vem **depois** da validação da gamificação em beta. Realinhado ao [plano de gamificação](gamificacao-spec.md) em 2026-11-17. Modelo de receita em [remuneracao.md](remuneracao.md).

## Marcos (milestones no GitHub)

| Marco | Conteúdo |
|---|---|
| **v1 — lançamento público (gratuito)** | Itens de publicação, lembretes confiáveis, backup, tamanho/desempenho e recursos grátis desejáveis |
| **Gamificação (Fases 1–5)** | Motor de recompensas, amizade, conquistas, Cantinho, loja cosmética, beta |
| **Pro — depois da validação (Fase 6)** | Ping Pro cosmético |

## Backlog priorizado

| Issue | Tema | Prioridade | Peso | Marco |
|---|---|---|---|---|
| #29 | `applicationId` real e assinatura | Crítica | 2 | v1 |
| #30 | Política de privacidade e ficha da Play | Crítica | 2 | v1 |
| #31 | Lembretes confiáveis (bateria e alarmes exatos) | Alta | 5 | v1 |
| #28 | Backup e restauração locais (grátis, cobre o progresso da gamificação) | Alta | 5 | v1 |
| #38 | Fase 1: motor de recompensas (implementado local, falta PR e teste em aparelho) | Alta | 8 | Gamificação |
| #42 | Fase 5: beta fechado e validação | Alta | 8 | Gamificação |
| #43 | Decisões pendentes da gamificação | Alta | 1 | Gamificação |
| #39 | Fase 2: amizade e conquistas | Média | 5 | Gamificação |
| #40 | Fase 3: Cantinho e loja | Média | 8 | Gamificação |
| #41 | Fase 4: polimento e acessibilidade | Média | 5 | Gamificação |
| #21 | Cobrança configurável (grátis) | Média | 8 | v1 |
| #22 | Modo folga da sequência (grátis) | Média | 5 | v1 |
| #32 | Reabilitar R8/shrinkResources | Média | 5 | v1 |
| #35 | Cartão de sequência compartilhável | Média | 5 | v1 |
| #33 | Sons em OGG | Baixa | 2 | v1 |
| #36 | Busca de tarefas | Baixa | 5 | v1 |
| #20, #23, #24, #25, #26, #27, #34, #37 | Ping Pro (Fase 6, pós-validação) | Baixa | — | Pro |

Fora de escopo: conta, sincronização, compartilhamento, iOS, rankings, venda de moedas, IA generativa.

**Ordem sugerida:** #29 e #30 (publicação) em paralelo com #28 (backup) → Fase 1 (revisar e testar em aparelho) → Fases 2 e 3 → Fase 4 → Fase 5 (beta) → Fase 6.

### #29 — risco de dados
O aparelho trata o novo `applicationId` como outro app. Quem usa `com.example.ping` perde os dados ao migrar, a menos que exporte antes (#28, que deve cobrir moedas, conquistas e itens).

## Auditoria de desempenho e tamanho (2026-11-17)

### Verificado
- **Tipos:** `tsc --noEmit` passa. Os únicos erros são três pacotes que estão no `package.json` mas faltam no `node_modules` local (`react-native-svg`, `expo-audio`, `@expo-google-fonts/baloo-2`). Rode `npm install`.
- **Banco (teste sintético, SQLite, 8 mil tarefas, 25 rotinas, 2.250 linhas de histórico):** todas as consultas medidas ficam abaixo de 1 ms. O banco não é gargalo.
  - Índice parcial `idx_tasks_routines`: a busca de rotinas em `syncDailyTasks` caiu de 0,62 ms para 0,06 ms (~10x). **Aplicado** em `store.ts` (índice aditivo, sem risco para dados).
  - Índice em `daily_history(day)`: **não vale** (0,47 → 0,73 ms na consulta do `closeDays`). **Descartado.**
- **Escrita em toda leitura:** `syncDailyTasks()` rodava um `DELETE` em `daily_history` a cada chamada, e ela é chamada em quase toda listagem. Escrita custa mais que leitura em SQLite no celular. **Corrigido:** poda uma vez por dia.
- **Peso do repositório:** 8 MB sem `node_modules`. `assets/brand` (2,5 MB) só alimenta scripts de ícone e **não entra no APK**.
- **CI já gera só arm64** (`-PreactNativeArchitectures=arm64-v8a`).

### Não verificado (precisa de build e aparelho)
- Medição real do tamanho do APK e do tempo de abertura: não foi possível compilar nem rodar o app aqui.
- A suavidade das animações (reanimated) e o consumo de bateria dos agendamentos.

### Oportunidades
- **R8/shrinkResources desligados no CI** ("diagnóstico do WorkManager"): o APK de release sai sem minificação. É o maior ganho provável de tamanho, mas o travamento do WorkManager precisa ser resolvido com regras `keep` primeiro. Medir os dois APKs antes e depois (V1-06).
- **Sons:** 18 WAV somam 755 KB; em OGG (Vorbis q3) ficam com 94 KB (−661 KB). Trocar exige conferir as notificações (os canais usam o som) e o `expo-audio` (V1-07).
- **Rostos (PNG 256×256):** ~625 KB somando notificações; em WebP um deles caiu de 27 KB para 5 KB (−80%). Só vale se o código nativo que carrega o rosto aceitar WebP; **não validado**, não mexer sem testar.
- **`rescheduleAllReminders`** reagenda uma tarefa por vez, em sequência. Só pesa com centenas de tarefas ativas; observar antes de otimizar.
- **`listTasks`** repete a subconsulta de rotinas fora do dia. Irrelevante no tamanho de dados atual.
