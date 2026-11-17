# Ping — Sistema de remuneração

Como o Ping gera renda para o dono. **Hipótese, a validar com dados reais.** Realinhado ao [plano de gamificação](gamificacao-spec.md) em 2026-11-17.

## Linha mestra

1. **Primeiro o produto, depois a cobrança.** O Ping Pro só começa depois da validação em beta da gamificação (Fase 5 do plano). A v1 pública é **gratuita**.
2. **Pro vende variedade de personalização, não vantagem funcional.** Sem multiplicador de moedas e sem venda de moedas.
3. **Nada que já é do usuário vira pago.** O núcleo continua gratuito.

## O que fica sempre grátis

Criar, editar e concluir tarefas, rotinas, eventos, todas as notificações (inclusive cobrança configurável), as 3 personalidades, widget básico, sequência e modo folga, resumo da manhã, **backup e restauração locais**, moedas, amizade e conquistas, o Cantinho básico e os itens gratuitos da loja.

## O que o Pro venderia (Fase 6, depois do beta)

| Item | Flag / mecanismo |
|---|---|
| Coleções cosméticas do Cantinho e acessórios do Ping | itens `pro_only` no catálogo |
| Temas extras (rosa chiclete, azul noturno) | `themes_extra` |
| Pacotes extras do Ping (frases, rostos, sons, ícones) | `packs` |
| Personalização avançada do widget | `widget_plus` |

Tudo cosmético. A tabela é uma lista de possibilidades: o conteúdo mínimo que justifica cobrar é decisão pós-validação (issue #34).

### Guardrails
1. Nunca paywall no núcleo grátis acima.
2. Sem contagem regressiva falsa, culpa ou *confirmshaming*; convite ao Pro nunca vira modal na celebração.
3. Quem comprou mantém o que comprou; o Pro nunca é rebaixado numa atualização.
4. Nenhum dado coletado para monetizar; sem anúncios.
5. Sem punição por dias sem uso; sem rankings competitivos.

## Mudanças em relação ao desenho anterior

| Antes | Agora | Motivo |
|---|---|---|
| Backup/restauração era Pro | **Grátis** | O progresso (moedas, itens) vive só no aparelho; sem backup, reinstalar apaga tudo. |
| Cobrança avançada era Pro | **Grátis** (#21) | O plano mantém notificações gratuitas e proíbe vantagem funcional no Pro. |
| Modo folga era Pro | **Grátis** (#22) | "Não punir dias de descanso" é princípio do plano. |
| Pro na v1 | **Fase 6**, pós-beta | O plano exige validar antes de monetizar. |
| Guarda-roupa do Ping | Coleções do Cantinho (#20) | Itens vivem no catálogo da loja. |

## Pendências (issue #34)

- Assinatura libera o uso enquanto ativa, ou a compra concede itens permanentes? (Hipótese: compra única, quem pagou mantém.)
- Política de itens adquiridos se o Pro deixar de valer.
- Temas rosa/azul no Pro: seguro só antes da primeira publicação.
- Preço e faixa de teste; método de cobrança.

## Estado da implementação

- `src/entitlements.ts`: `getEntitlements`, `isPro`, `hasFeature`, `grantPro`, `restorePurchases` (stub), cache em `meta:pro`. Flags: `themes_extra`, `packs`, `widget_plus`.
- `PRO_GATING_ENABLED = false`: tudo liberado; nada muda no app.
- Falta (Fase 6): biblioteca de cobrança, tela do Pro, restaurar compra, ligar `hasFeature`.
- Opções de biblioteca (pesquisa de 2026-11-17): `react-native-iap`, `expo-iap`, `react-native-purchases`. `react-native-purchases` passa pelo backend do RevenueCat e enfraquece "seus dados são seus".
- APK fora da Play: Pro liberado manualmente com `grantPro('manual')`.

## Premissas financeiras (NÃO são fatos)

| Item | Valor | Origem |
|---|---|---|
| Taxa da Play | 15% sobre os primeiros US$ 1 mi/ano (regra de 2021); há reportagem de política nova com outras alíquotas | Central de Ajuda do Google Play; **confirmar no Play Console** |
| Conta de desenvolvedor | US$ 25, única vez | Documentação consultada em 2026-11-17 |
| Preço, conversão, impostos | **a definir** | Pesquisar concorrentes; contador |

Referências de mercado (pesquisa de 2026-11-17): TickTick Premium R$ 14,90/mês ou R$ 137,90/ano; Todoist Pro R$ 199,90/ano; Streaks e Forest são compra única (US$ 5,99 e US$ 3,99).

## Métricas

Play Console (instalações, retenção D1/D7/D30, conversão, Android vitals). Telemetria própria só opt-in. Do plano: primária = quem continua concluindo tarefas úteis após 7/14 dias; guardrails = tempo no app sem ganho de produtividade e atrasadas.

## Registro de decisões

| Data | Decisão | Motivo | Reavaliar quando |
|---|---|---|---|
| 2026-11-17 | Compra única + gorjeta, sem anúncios nem assinatura (hipótese) | App local sem custo recorrente | Existir sync/nuvem ou retenção baixa |
| 2026-11-17 | Paywall desligado por padrão | Preparar estrutura sem alterar o app | Fase 6 |
| 2026-11-17 | **Realinhamento ao plano:** Pro só cosmético e depois do beta; backup, cobrança configurável e modo folga ficam grátis | O plano proíbe vantagem funcional no Pro e exige validar antes de monetizar | Resultado do beta |
