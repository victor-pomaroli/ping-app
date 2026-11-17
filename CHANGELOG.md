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

### Adicionado
- **Moedas, amizade e conquistas** (base): concluir uma tarefa rende moedas (teto diário e bônus de consistência semanal), alimenta a amizade com o Ping (5 níveis) e desbloqueia 10 conquistas. Tela "Progresso com o Ping" em Ajustes. Nada é punido e criar, editar e concluir tarefas continuam como sempre.
- **Backup e restauração** por arquivo em Ajustes, grátis e sem nuvem: tarefas, rotinas, moedas e conquistas. Usa `expo-sharing` e `expo-document-picker` (**exige novo build nativo**).
- **Cantinho do Ping**: quartinho opcional (atalho em Progresso) para decorar com moedas: 6 itens cosméticos em 5 espaços, compra com confirmação, usar e remover. Todos os itens são grátis; nenhum dá vantagem.
- **Atalhos na aba Hoje**: saldo de moedas (com o ícone) e botões para o Cantinho e as Conquistas. O Cantinho ganhou quarto maior, itens com miniatura, "provar" antes de comprar e filtro por espaço. Em Ajustes, "Ferramentas de teste" para ganhar moedas sem concluir tarefas (desligue em `TEST_TOOLS` antes de publicar).
- **Cantinho vivo**: quarto redesenhado com janela (céu de dia, fim de tarde e noite com estrelas), sol entrando, piso de madeira e cortinas no tom do tema. O Ping mora lá: passeia, olha os móveis, comenta, cochila, senta no sofá e dança no tapete. Toque nos itens para ele reagir; a luminária acende e o rádio toca. 5 itens novos (cacto, pôster do Ping, tapete redondo, rádio retrô e pufe) e uma lojinha com descrição e prévia.
- Estrutura interna do Ping Pro com o paywall desligado: nada muda para quem usa o app hoje.

### Alterado
- Concluir tarefa ficou mais ágil: a gravação corre junto com a animação, a lista se atualiza na hora e lembretes, bandeja, conquistas e widget esperam a lista recarregar antes de rodar. Arquivar concluídas antigas passou a ser uma vez por dia.

## [1.9.1] — 2026-11-17

### Alterado
- **Sequência redesenhada:** vira um post-it acima do seletor de mês, com o número grande (Baloo 2), recorde, quanto falta para o próximo marco e os últimos 7 dias. O papel acompanha o tema (lima, manteiga, rosa e ciano).
- **Ícones próprios no lugar dos emojis:** uma chama em três estados, acesa e colorida (tudo feito), pela metade (parte) e apagada tracejada (nada). Vale no post-it, no calendário e na legenda.
- Legenda do calendário em uma linha só.

## [1.9.0] — 2026-11-17

### Adicionado
- **Sequência:** dias seguidos com tudo feito. Um dia conta quando todas as rotinas que ocorrem nele e todas as tarefas com prazo nele foram concluídas até o fim do próprio dia (eventos não entram; dia vazio não conta nem quebra). Concluir depois do dia quebra a sequência.
- **Calendário com ícones:** dias passados mostram 🔥 (tudo feito), 🌓 (parcial) ou 🌧️ (nada feito) no lugar do pontinho de tarefa; o ponto azul de evento continua. Faixa no topo do mês com "N dias seguidos" e a melhor sequência.
- **Ping reage à sequência:** comemora marcos de 3, 7, 14, 30 e 100 dias, comenta com calma quando uma sequência de 3+ dias acaba, e o aviso das 20h cita a sequência ("falta 1 pra manter") quando ela está em risco.
- **Resumo da manhã:** um aviso por dia (padrão 8h, escolha 7 a 10h em Ajustes) com tarefas, rotinas, eventos, a primeira tarefa, atrasadas e a sequência. Dias sem nada não avisam; segue a personalidade e o humor do Ping.

### Alterado
- Rotinas que não foram abertas no app em dias de ocorrência passam a registrar o dia como não feito (histórico da sequência).

## [1.8.0] — 2026-11-17

### Adicionado
- **Rotinas semanais e mensais**, além das diárias. Em "Repetir" (tela de criar/editar) escolha *Todo dia*, *Semana* (os dias da semana que quiser, ex.: seg, qua e sex) ou *Mês* (um dia do mês; dia 29, 30 ou 31 vale o último dia nos meses mais curtos).
- A rotina só aparece em Hoje, Tarefas, no Calendário e no widget nos dias em que repete, e só avisa nesses dias. Em "Minhas rotinas" aparece a próxima data das rotinas semanais e mensais.
- Notificações semanais usam um aviso repetido por dia marcado; as mensais agendam as próximas datas e o app reabastece ao abrir.

### Corrigido
- Rotinas não contam mais como "atrasadas" no humor do Ping e nos avisos.
- O histórico de uma rotina semanal ou mensal só registra os dias em que ela ocorreu.

## [1.7.2] — 2026-11-17

### Adicionado
- **Novo ícone do app:** o Ping empoleirado num post-it com checks e raios de som, no lugar do desenho antigo. Há uma versão para cada personalidade (De Boa, Debochado e Sem Paciência) e o ícone do app troca sozinho ao mudar a personalidade em Ajustes. A troca aparece quando você sai do app e depende do launcher (alguns piscam a tela inicial).
- **Novo ícone da barra de status:** silhueta do novo sino com raios e a expressão do sentimento (sorrindo, sério ou exclamação), com arquivos para todas as densidades de tela.

### Alterado
- O ícone adaptativo do Android foi redimensionado para caber na zona segura (círculo, quadrado arredondado e outras máscaras).

### Observação
- O ícone antigo na tela inicial pode sumir depois da atualização; basta arrastar o Ping de novo da gaveta de apps.

## [1.7.1] — 2026-11-16

### Alterado
- Os rostos do Ping nas notificações agora ficam sobre um fundo quadrado arredondado verde, no mesmo formato do ícone do app, em vez de um sino solto sobre fundo transparente.

## [1.7.0] — 2026-11-16

### Adicionado
- **Cansaço do Ping:** tocar várias vezes seguidas o cansa. Ele pesa as pálpebras, sua, boceja e, no extremo, fica tonto (olhos em espiral e estrelinhas); quando você para, descansa, respira fundo e avisa. A fala não reinicia mais a cada toque: durante o balão, os toques só mexem o corpo.
- **Novos comportamentos:** cochila depois de 20 s sem toque na tela (Zzz) e acorda com susto; dança com confete ao concluir tarefas; espia ao puxar para atualizar; fica amuado ao voltar depois de 3 dias; segurar o dedo o infla e solta um DING com ondas; os olhos seguem o dedo; uma nuvem de chuva aparece com 3 ou mais atrasadas.
- **Sons do Ping** (expo-audio): dings de toque que ficam mais graves com o cansaço, piado por personalidade, bocejo, susto, festa, DING grande e mais. Respeitam o modo silencioso e há um interruptor em Ajustes.
- **Sentimento nas notificações:** seis humores (animado, impaciente, irritado, cansado, com saudade, orgulhoso) com rosto, cor, texto, estado no cabeçalho e linha de contexto (atraso, atrasadas hoje, adiamentos, subtarefas). Eventos e rotinas diárias também ganham rosto. Depois do 2º adiamento o botão "Adiar" vira "Reagendar".
- **Avisos de saudade** (3 dias sem abrir o app, com tarefas esperando) e **de dia limpo** (20h), desligáveis em Ajustes.
- **Três tons de som das notificações** (normal, urgente, calmo), cada um em seu canal do Android. O teste em Ajustes manda um aviso de cada sentimento.
- Fonte **Baloo 2 Bold** nos balões do Ping.

### Alterado
- Os 9 rostos das notificações foram refeitos a partir do Ping vetorial e há 9 novos (cansado, saudade, orgulhoso).
- A pálpebra do Ping é recortada no formato do olho: nenhum olho aparece por cima dela e o brilho do corpo não é coberto.

### Corrigido
- O Ping às vezes não respondia ao toque: a parte dele que sobe acima do post-it ficava fora dos limites do componente pai no Android.

### Observação
- Os canais de notificação antigos foram apagados e substituídos pelos três novos; se você tinha mudado som ou vibração do canal, precisa ajustar de novo.

## [1.6.1] — 2026-11-16

### Alterado
- O post-it do resumo voltou ao tamanho e ao formato de antes (largura total), com o Ping por cima, pousado no canto superior direito, onde o papel está vazio. O balão sobe acima do papel e não cobre o texto do resumo.
- O Ping ficou sem a sombra no chão e sem a faixa escura de sombreado na base do sino.
- A barra de rolagem vertical branca das abas deixou de aparecer.

## [1.6.0] — 2026-11-16

### Alterado
- O Ping foi redesenhado em vetor, sem o quadrado de fundo, e fica numa coluna própria ao lado do post-it, sem cobrir nada. O sino ganhou partes que se mexem: pisca (às vezes duas vezes), olha para os lados, mexe a boca ao falar, as sobrancelhas fazem expressões e o corpo balança com o badalo atrasando como um pêndulo. O Debochado no horário dá uma piscadela de tempos em tempos. Tocar no Ping chacoalha o sino.
- Os balões viraram pílulas brancas com um selo no canto (`!` irritado, `?` debochado, `♪` leve, `✓` conclusão, `z` dia vazio) e uma pontinha apontando para a cabeça do Ping. Têm no máximo duas linhas, aparecem depois de um "digitando…", o irritado treme, e concluir uma tarefa solta um confete.
- Dependência nova: `react-native-svg`. Exige gerar um novo build nativo.

## [1.5.0] — 2026-11-16

### Adicionado
- O Ping ao lado direito do resumo da aba Hoje. O rosto muda com o humor do dia (no horário, +1 h, +3 h) e cada personalidade tem seu jeito parado: o Debochado inclina a cabeça, o Sem Paciência treme o sino e o De Boa balança devagar. Ele fala em balões curtos no tom da personalidade e responde a toques.
- O Ping reage a tarefa concluída (pulinho), a dia zerado (pulo grande, sino e vibração), a atrasos (sino chacoalha), a puxar para atualizar (sino) e dorme (Zzz) no dia em branco; ganha estrelinhas na missão cumprida.
- Puxar para atualizar nas três abas, com o spinner nas cores do tema.
- Ajustes › Movimento › **Animações do Ping**: liga e desliga todo o movimento novo. O app também respeita "reduzir movimento" do Android.
- Dependências novas: `react-native-reanimated`, `react-native-worklets` e `expo-haptics`. Exige gerar um novo build nativo (não roda no Expo Go).

### Alterado
- Concluir tarefa: a caixa dá um pop de mola, o ✓ estoura, um "+1" sobe, o risco do título roda na thread de UI e há uma vibração leve. O cartão sai com fade e os de baixo deslizam para fechar o espaço.
- Resumo: o número grande rola ao mudar, os segmentos de progresso se enchem em fila, o carimbo "FEITAS" bate e a barra contínua enche com mola e um brilho.
- Os cartões entram escalonados na primeira carga (e com fade quando surgem depois); "PASSOU DA HORA" pulsa uma vez ao chegar; o botão + afunda ao toque e chacoalha de leve no dia em branco.
- O destaque de uma tarefa vindo da notificação ou do widget ganha ondas de sonar saindo da caixa de concluir.
- Os pontos da barra de navegação acompanham o deslize entre as abas em tempo real.

## [1.4.5] — 2026-11-10

### Alterado
- O teste de notificação manda um 4º aviso no formato clássico (rosto como imagem à direita), para comparar com o formato de conversa no aparelho.

## [1.4.4] — 2026-11-10

### Corrigido
- Na conversa do Ping, a foto aparecia como o ícone do app (duplicado com o selo do canto) e o título virava "Ping". Agora cada tarefa tem seu próprio atalho de conversa, escondido do menu do ícone, com o nome da tarefa e o rosto do momento: a foto já aparece com a notificação recolhida e o título volta a ser a tarefa.

## [1.4.3] — 2026-11-10

### Corrigido
- O rosto do Ping e o formato de conversa não apareciam: a biblioteca de notificações diz que todo aviso local "já tem imagem", e isso desligava o rosto. Agora o rosto é aplicado sempre que o aviso tem um.

## [1.4.2] — 2026-11-10

### Alterado
- Os avisos com rosto agora chegam como uma conversa enviada pelo **Ping**: o rosto do momento aparece como foto à esquerda (com o ícone do app no canto), o título continua sendo a tarefa e a mensagem vem como "Ping: …". Assim o rosto aparece também em aparelhos Samsung (One UI), que trocam o ícone da notificação pelo ícone do app. Os avisos podem aparecer na seção "Conversas" da cortina.

## [1.4.1] — 2026-11-10

### Corrigido
- O teste de notificação em Ajustes agora usa os rostos do Ping: três avisos seguidos (10, 20 e 30 s) mostram o rosto e a mensagem de cada momento da personalidade escolhida (no horário, 1 h e 3 h de atraso). Antes o teste saía sem rosto.

## [1.4.0] — 2026-11-09

### Adicionado
- **Rostos do Ping**: o sino da notificação muda de expressão conforme o atraso (no horário, +1 h, +3 h), em cada personalidade, e a cor do aviso acompanha. Saúde e eventos seguem com o ícone padrão. Os rostos também aparecem na escolha de personalidade em Ajustes.
- Novo ícone do app: o logo do Ping (sino sorridente, checklist e "ping.") sobre fundo verde, ajustado para as máscaras do Android.
- Novo ícone de notificação tirado do sino do logo. O ícone da barra de status muda com o atraso: sorrindo no horário, sério com 1 h e com exclamação com 3 h.
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
