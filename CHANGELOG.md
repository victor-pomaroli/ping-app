# Changelog

Todas as mudanças relevantes do Ping ficam registradas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto usa [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## Como versionar

- **MAJOR** (`2.0.0`): mudança que quebra dados ou hábitos existentes (ex.: migração de banco sem volta, remoção de recurso).
- **MINOR** (`1.2.0`): recurso novo ou mudança visível de comportamento.
- **PATCH** (`1.1.1`): correção ou ajuste pequeno, sem recurso novo.

A cada versão:

1. Mova os itens de **Não lançado** para uma nova seção `## [x.y.z] — AAAA-MM-DD`.
2. Atualize `version` em `package.json` e `expo.version` em `app.json`.
3. Atualize `expo.android.versionCode` em `app.json` para `MAJOR*10000 + MINOR*100 + PATCH` (ex.: `1.2.3` → `10203`). O código precisa sempre subir para o Android aceitar a atualização.
4. Depois do merge na `main`, crie e envie a tag da versão (ex.: `git tag v1.2.0 && git push origin v1.2.0`).

## [Não lançado]

_Nada ainda._

## [1.4.0] — 2026-11-09

### Adicionado
- **Rostos do Ping**: o sino da notificação muda de expressão conforme o atraso (no horário, +1 h, +3 h), em cada personalidade, e a cor do aviso acompanha. Saúde e eventos seguem com o ícone padrão. Os rostos também aparecem na escolha de personalidade em Ajustes.
- Novo ícone de notificação no estilo do logo (sino inclinado com raios). O ícone da barra de status muda com o atraso: sorrindo no horário, sério com 1 h e com exclamação com 3 h.
- Subtarefas na aba Calendário, logo abaixo da tarefa principal, com caixa de concluir e progresso (ex.: `2/3 subtarefas`).
- O aviso da tarefa principal diz quantas subtarefas faltam.

### Alterado
- Concluir todas as subtarefas conclui a tarefa principal; reabrir uma subtarefa reabre a principal e reagenda os avisos.
- Subtarefas não mostram mais horário próprio na edição: os avisos vêm da tarefa principal.
- Na primeira abertura após atualizar, todos os lembretes são reagendados uma vez para ganhar os rostos.

### Corrigido
- Lembretes órfãos (ex.: um "Teste" antigo que continuava chegando) são cancelados ao abrir o app.
- O botão de testar notificação não empilha vários testes.
- Apagar uma tarefa principal não reagenda mais os avisos dela pelas subtarefas.

## [1.3.0] — 2026-11-05

### Adicionado
- Dois temas novos, escolhidos em Ajustes e no onboarding, abaixo dos dois originais:
  - **Rosa chiclete** (claro): fundo rosado, realce framboesa e post-it rosa com tachinha verde-água.
  - **Azul noturno** (escuro): fundo azul-marinho, realce ciano, eventos em lilás e folha de bloco azul com fita rosa.
- Os temas valem para todo o app, inclusive diálogos e o widget.

## [1.2.1] — 2026-11-05

### Corrigido
- Os confetes não saíam ao zerar o dia pela segunda vez (ex.: concluir tudo, criar outra tarefa e concluir de novo, ou reabrir e concluir a mesma). Agora toda vez que Hoje volta a ter algo pendente, a próxima vez que você zerar tem comemoração.
- Eventos do dia não impedem mais a comemoração: só tarefas contam como pendentes.

## [1.2.0] — 2026-11-05

### Adicionado
- O post-it da aba Hoje dá um pulinho e balança junto com os confetes.

### Corrigido
- Os confetes saíam toda vez que você voltava para a aba Hoje. Agora a comemoração acontece uma vez por "tudo cumprido": só se repete se você concluir mais alguma tarefa no mesmo dia. Também não se repete ao reabrir o app.

## [1.1.0] — 2026-11-05

Primeira versão numerada depois do MVP. Reúne os PRs #1 a #4 e #10 a #15.

### Adicionado
- **Eventos:** criação e edição com início, término opcional, local e até 3 avisos antes de começar; cartão com quanto falta; bolinha azul no calendário.
- **Rotinas** diárias com histórico, pausa e encerramento (*Minhas rotinas*).
- **Tarefas associadas** (etapas) dentro de uma tarefa principal.
- **Calendário** mensal com lista do dia; o **+** cria no dia selecionado.
- **Widget Android** com próximas tarefas e concluídas do dia, que conclui ou reabre direto pela caixa.
- **Notificações contextuais** por assunto, com três personalidades (Debochado, Sem Paciência, De Boa), nome e forma de tratamento.
- **Onboarding** de 4 passos e tema claro suave além do escuro.
- Nota de resumo na aba Hoje com rótulo que muda com o estado do dia.
- Confetes ao chegar na aba Hoje com tudo concluído.
- Tocar numa notificação ou numa tarefa do widget abre a aba Hoje com a tarefa destacada.
- `PRODUCT.md` com a visão de produto e este changelog.

### Alterado
- Visual mais limpo em Hoje e Tarefas: sem linhas divisórias, um sinal por cartão, traço de urgência e seções vazias escondidas.
- Aba Tarefas organizada em blocos **Hoje** e **Próximos**, com atalho visível para as rotinas.
- Concluídas antes de hoje saem de Hoje e Tarefas (continuam no Calendário); seções por data e nova ordenação.
- O widget segue o visual e o tema do app e responde mais rápido ao toque.
- Editor de evento sem "Qual o assunto?" e com menos opções de aviso.
- Todos os alertas nativos do Android foram trocados pelo diálogo do Ping.
- Ajustes saiu das abas e foi para o cabeçalho.

### Corrigido
- Widget piscando em branco ao atualizar.
- Build do APK no CI (Linux) e falha ao iniciar relacionada ao WorkManager.

## [1.0.2] — 2026-11-01
### Alterado
- Base do Expo migrada para o SDK 58.

## [1.0.1] — 2026-11-01
### Corrigido
- Dependências nativas do Expo alinhadas ao SDK.

## [1.0.0] — 2026-11-01
### Adicionado
- MVP: lista de tarefas com SQLite local, tema escuro e notificação no vencimento.

[Não lançado]: https://github.com/victor-pomaroli/ping-app/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/victor-pomaroli/ping-app/releases/tag/v1.3.0
[1.2.1]: https://github.com/victor-pomaroli/ping-app/releases/tag/v1.2.1
[1.2.0]: https://github.com/victor-pomaroli/ping-app/releases/tag/v1.2.0
[1.1.0]: https://github.com/victor-pomaroli/ping-app/releases/tag/v1.1.0
