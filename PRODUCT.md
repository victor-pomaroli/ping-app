# Ping — visão de produto

> **Faça acontecer.** O Ping é um app de tarefas e lembretes para Android que cobra você do jeito que você escolher — com ironia, sem paciência ou de boa.

Versão atual: veja o [CHANGELOG](CHANGELOG.md).

## O que é

O Ping é um organizador pessoal de tarefas, rotinas e eventos que roda inteiro no celular. A proposta não é ser mais uma lista: é ser o amigo chato (no bom sentido) que lembra na hora certa, insiste quando você esquece e comemora quando você termina.

Três ideias guiam o produto:

1. **Lembrar com personalidade.** As notificações falam com você pelo nome, no tratamento que você escolheu, e no tom de uma das três personalidades. O texto muda conforme o assunto da tarefa e quanto tempo ela está atrasada.
2. **Mostrar só o que importa agora.** A tela inicial é o seu dia: o que passou da hora, o que está na agenda e o que ainda vem. O resto fica em Tarefas e no Calendário.
3. **Seus dados são seus.** Tudo fica no aparelho (SQLite local). Não há conta, servidor nem sincronização na nuvem.

## Para quem

Pessoas que usam o celular como central do dia e que já tentaram listas de tarefas "sérias" demais. Quem precisa de um empurrão — e prefere um empurrão com humor — em vez de um painel de produtividade.

## Como funciona

### Abas

| Aba | Para que serve |
|---|---|
| **Hoje** | O dia em uma tela. Uma nota de resumo com quantas tarefas faltam, quantas estão atrasadas e o progresso do dia, com um rótulo que muda com o estado (*Tá devendo*, *Falta pouco*, *Ainda hoje*, *Missão cumprida*, *Dia em branco*). Abaixo, em ordem de urgência: **Passou da hora**, **Agenda de hoje** (eventos) e **No radar**. As concluídas do dia ficam recolhidas numa linha. Seções vazias não aparecem. Com tudo feito, o app solta confetes. O **Ping** fica ao lado do resumo: o rosto, o jeito parado e as falas mudam com o dia e com a personalidade escolhida, e tocar nele rende uma resposta. |
| **Tarefas** | Tudo o que está aberto, com atalho para **Minhas rotinas** e filtros por tipo (Eventos) e assunto. Um bloco **Hoje** (rotinas, atrasadas, ainda hoje e concluídas hoje) separado de **Próximos** (dias seguintes e tarefas sem data). |
| **Calendário** | Mês com bolinhas por dia (tarefas e eventos em cores diferentes) e a lista do dia escolhido. O botão **+** cria a tarefa já no dia selecionado. |

Gestos: tocar num cartão abre a edição; segurar pede confirmação para excluir; arrastar para os lados troca de aba; puxar para baixo atualiza.

### Tipos de item

- **Tarefa** — título, data e hora opcionais, assunto e urgência (baixa, média ou alta, mostrada como um traço colorido). Pode ter **tarefas associadas** (etapas); concluir a principal conclui as etapas.
- **Rotina** — tarefa diária, com ou sem horário. Volta a ficar pendente todo dia e guarda o histórico de dias cumpridos. Pode ser pausada ou encerrada em *Minhas rotinas*.
- **Evento** — compromisso com início, término opcional e local. Não tem caixa de concluir; mostra quanto falta (*em 2 dias*, *em 3h*, *agora*) e avisa com antecedência: na hora, 15 min, 30 min, 1h ou 1 dia antes (até 3 avisos).

Assuntos: Estudos, Trabalho, Finanças, Casa, Saúde e Geral. Cada um tem cor própria e textos de lembrete próprios.

### Lembretes

- **Tarefas comuns:** aviso no horário e novas cobranças após 15 min, 1h e 3h enquanto não forem concluídas. Tarefas de **Saúde** recebem um aviso único.
- **Rotinas:** repetem todo dia, toda semana (nos dias da semana escolhidos) ou todo mês (num dia do mês; em meses curtos vale o último dia). Um aviso em cada dia em que a rotina ocorre, no horário escolhido.
- **Eventos:** os avisos escolhidos antes do início.
- **Silêncio entre 22h e 7h.**
- Botões direto na notificação: **Concluir** e **Adiar 15 min** (eventos: **Lembrar em 10 min**). Depois do 2º adiamento o Ping fica cansado e o segundo botão vira **Reagendar** (abre a tarefa). Tocar na notificação abre o app na aba Hoje com a tarefa destacada.
- **Sentimento do Ping:** o rosto, a cor, o texto, o estado no cabeçalho ("Ping · impaciente") e o som mudam conforme o sentimento: *animado* (na hora), *impaciente* (+1 h), *irritado* (+3 h ou 3+ atrasadas), *cansado* (adiou 2+ vezes), *com saudade* (3 dias sem abrir o app, com tarefas esperando) e *orgulhoso* (aviso das 20h quando o dia fica limpo). Os dois últimos podem ser desligados em Ajustes. Há três tons de som (normal, urgente e calmo), um canal do Android para cada.
- **Personalidades:** 😏 *Debochado* (ironia na medida certa), 🔥 *Sem Paciência* (direto e sem enrolação) e 🌿 *De Boa* (leve e tranquilo).
- **Privacidade:** opção de ocultar o nome da tarefa nas notificações.

### Widget (Android)

Um widget de tela inicial com as próximas tarefas e as concluídas do dia, no mesmo visual e tema do app. Dá para concluir ou reabrir uma tarefa direto pela caixa, sem abrir o app. Tocar numa tarefa abre a aba Hoje com ela destacada, e o botão **+ Nova tarefa** abre a criação.

### Personalização e dados

- **Primeiro uso:** um onboarding de 4 passos (nome, forma de tratamento, personalidade e tema).
- **Temas:** escuro original (verde-limão sobre carvão), claro suave, rosa chiclete (claro) e azul noturno (escuro). Cada um muda o app inteiro, os diálogos, o widget e o papel da nota de resumo.
- **Ajustes:** nome, tratamento, personalidade, tema, animações e sons do Ping, lembretes ativos ou pausados, privacidade, teste de notificação, diagnóstico dos lembretes programados, permissões do Android e "apagar todas as tarefas".
- **Histórico:** concluídas há mais de 30 dias são arquivadas automaticamente e podem ser restauradas.

## Princípios de design

- **Um sinal por cartão.** Vermelho só para atraso, azul só para evento, e o traço colorido para urgência. Nada de repetir a mesma informação em três lugares.
- **Pouca linha, mais respiro.** Separação por espaço, não por divisórias.
- **Tom de voz próprio.** Curto, informal e com humor — inclusive nos estados vazios e nos diálogos.
- **Diálogos do app, não do sistema.** Confirmações e avisos usam o diálogo do Ping, nunca o alerta nativo do Android.

## Fora do escopo (por enquanto)

- Conta, login, sincronização entre aparelhos ou backup na nuvem.
- Compartilhar tarefas ou listas com outras pessoas.
- iOS: o código é Expo/React Native, mas o widget e os testes são só no Android.

## Stack

React Native + Expo (SDK 58), Expo Router, expo-sqlite, expo-notifications, react-native-reanimated e react-native-svg (animações e o Ping em vetor) e react-native-android-widget. O APK é gerado pelo GitHub Actions (workflow *Build Android APK*).
