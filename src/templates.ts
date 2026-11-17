export const categories = {
  study: 'Estudos', work: 'Trabalho', finance: 'Finanças',
  home: 'Casa', health: 'Saúde', general: 'Geral',
} as const;
export type TaskCategory = keyof typeof categories;
/** Um emoji por assunto, todos objetos do mesmo estilo para ficarem alinhados. */
export const categoryEmoji: Record<TaskCategory, string> = {
  study: '🎓', work: '💼', finance: '💰', home: '🏡', health: '🩺', general: '📌',
};
export type ReminderStage = 0 | 1 | 2 | 3;
import type {AddressStyle,NotificationPersonality} from './preferences';
import type {NotificationMood} from './faces';
const templates:Record<TaskCategory,Record<ReminderStage,readonly string[]>>={
 study:{0:['O conhecimento não vai entrar na cabeça por Bluetooth. 📚','Seu cérebro pediu férias, mas a matéria não.'],1:['A matéria segue esperando. Ela tem mais paciência que eu. 👀','15 minutos de atraso. A sabedoria não vem por osmose.'],2:['Uma hora depois e os livros continuam fechados.','A matéria ainda está aí. Surpresa nenhuma.'],3:['Última chamada dos estudos. Vai encarar ou reagendar?']},
 work:{0:['Seu eu do passado marcou um compromisso. Hora de honrar o combinado.','Tem tarefa do trabalho te chamando. E não é reunião que poderia ser e-mail.'],1:['A responsabilidade bateu de novo. Vai atender?','A tarefa continua na agenda, {vocativo}.'],2:['Uma hora depois e essa pendência ainda tem seu nome.','O relógio trabalhou. E essa tarefa?'],3:['Último toque: resolve ou reorganiza o prazo.']},
 finance:{0:['O dinheiro não se organiza sozinho. Infelizmente. 💸','Hora de dar atenção às finanças. O saldo agradece.'],1:['Essa pendência financeira não evaporou, viu? 👀','Seu orçamento pediu cinco minutinhos de atenção.'],2:['Uma hora depois e as contas continuam sabendo seu endereço.'],3:['Última chamada: confere isso ou reagenda.']},
 home:{0:['A casa não se organiza por telepatia. 🏠','A tarefa doméstica está te olhando faz tempo.'],1:['A casa continua esperando, {vocativo}.','A tarefa não ganhou pernas. Ainda é com você.'],2:['Uma hora depois e a bagunça segue fiel.'],3:['Última chamada da casa. Resolve ou reagenda?']},
 health:{0:['Chegou a hora do seu compromisso de saúde. Cuida disso, combinado?'],1:['Confira seu compromisso de saúde.'],2:['Seu compromisso ainda aparece como pendente.'],3:['Confira se precisa atualizar esse lembrete.']},
 general:{0:['Você marcou, eu lembrei. Agora falta a parte em que você faz. 👀','Tem uma tarefa te esperando. Coincidência? Acho que não.'],1:['Seu eu do passado confiou em você. Coragem.','A tarefa continua aqui, {vocativo}.'],2:['Uma hora depois e a pendência segue firme.','O tempo passou, mas a tarefa não se fez sozinha.'],3:['Última chamada, {vocativo}. Vai fazer ou reagendar?']}
};
const personalityTemplates:Record<'semPaciencia'|'deBoa',Record<TaskCategory,Record<ReminderStage,readonly string[]>>>={
 semPaciencia:{
  study:{0:['BORA ESTUDAR! O conteúdo não vai se aprender sozinho. 📚','A matéria chamou. CHEGA DE ENROLAR!'],1:['15 MINUTOS! O caderno não vai abrir sozinho.','A matéria segue aí. Vai começar quando, {vocativo}?'],2:['UMA HORA DEPOIS! Dá pra resolver isso agora ou reagendar?','Os livros continuam esperando. Bora agir!'],3:['ÚLTIMA CHAMADA! Estuda ou assume outro horário de uma vez.']},
  work:{0:['TEM TRABALHO PRA FAZER! Bora tirar isso da frente.','O prazo chegou. CHEGA DE ADIAR!'],1:['15 MINUTOS E A PENDÊNCIA CONTINUA! Bora resolver.','A responsabilidade voltou, {vocativo}. VAI ENCARAR?'],2:['UMA HORA DEPOIS! Essa tarefa ainda está na sua lista.','O relógio não parou. REORGANIZA OU RESOLVE!'],3:['ÚLTIMO AVISO! Resolve ou muda o prazo com consciência.']},
  finance:{0:['ATENÇÃO ÀS FINANÇAS! Esse assunto não se resolve sozinho. 💸','TEM CONTA PRA CONFERIR! Bora cuidar disso.'],1:['15 MINUTOS E NADA? Confere essa pendência financeira!','O orçamento não vai se organizar por mágica.'],2:['UMA HORA DEPOIS! As finanças seguem esperando.'],3:['ÚLTIMO TOQUE! Confere agora ou reagenda.']},
  home:{0:['BORA CUIDAR DA CASA! A tarefa não vai sumir. 🏠','TEM COISA PRA FAZER EM CASA! Mãos à obra.'],1:['15 MINUTOS! A tarefa doméstica ainda está lá.','A casa segue esperando, {vocativo}. BORA!'],2:['UMA HORA DEPOIS! A tarefa não criou pernas.'],3:['ÚLTIMA CHAMADA DA CASA! Resolve ou reagenda.']},
  health:{0:['Seu compromisso de saúde chegou. Confira com calma.'],1:['Confira seu compromisso de saúde.'],2:['Seu compromisso de saúde continua registrado.'],3:['Confira se precisa atualizar seu compromisso de saúde.']},
  general:{0:['EI! VOCÊ MARCOU ESSA TAREFA. BORA FAZER! 👀','CHEGOU A HORA! Nada de empurrar pra depois.'],1:['TÁ ACHANDO QUE A VIDA É UM MORANGO?! 🍓 A PENDÊNCIA CONTINUA TE ESPERANDO!','VAMOS LÁ, {vocativo}! Resolve ou reagenda.'],2:['UMA HORA DEPOIS! A tarefa ainda não se fez sozinha.','O tempo passou. AGORA É DECIDIR O QUE FAZER!'],3:['ÚLTIMA CHAMADA! Faz ou reagenda, sem enrolação.']}
 },
 deBoa:{
  study:{0:['Hora de reservar um tempinho para estudar. 📚','Seu momento de aprender chegou. Vai no seu ritmo.'],1:['A matéria ainda está por aqui. Quando puder, retome.','Um pequeno passo nos estudos já conta.'],2:['Se ainda fizer sentido, vale separar um tempo para estudar.','O conteúdo continua disponível quando você estiver pronto.'],3:['Quer estudar agora ou escolher um horário melhor?']},
  work:{0:['Seu compromisso de trabalho chegou. Vamos com calma.','Uma tarefa de trabalho está na agenda. Você consegue organizar isso.'],1:['Seu compromisso ainda está pendente. Vale dar uma olhada.','Quando puder, confira essa tarefa, {vocativo}.'],2:['A tarefa continua na lista. Talvez seja hora de reorganizar.','Se o dia apertou, você pode ajustar o prazo.'],3:['Um último lembrete: faça quando puder ou reagende.']},
  finance:{0:['Hora de conferir suas finanças com tranquilidade. 💸','Seu lembrete financeiro chegou. Um passo de cada vez.'],1:['Tem um assunto financeiro esperando sua atenção.','Quando puder, confira essa pendência.'],2:['Essa tarefa financeira ainda está na lista. Sem pressa, mas vale revisar.'],3:['Quer conferir agora ou reservar outro momento?']},
  home:{0:['Um lembrete gentil para cuidar da casa. 🏠','Tem uma pequena tarefa da casa esperando.'],1:['A tarefa doméstica continua aqui. Tudo no seu tempo.','Quando puder, dê uma olhada na casa, {vocativo}.'],2:['Se ainda estiver pendente, que tal escolher um momento?'],3:['Último lembrete por hoje. Você pode reagendar.']},
  health:{0:['Chegou a hora do seu compromisso de saúde. Cuide-se.'],1:['Confira seu compromisso de saúde.'],2:['Seu compromisso de saúde continua registrado.'],3:['Confira se precisa atualizar seu compromisso de saúde.']},
  general:{0:['Sua tarefa chegou. Um passo de cada vez. 🌿','Passando para lembrar de algo que você planejou.'],1:['Seu lembrete continua aqui, sem pressão.','Quando puder, confira a tarefa, {vocativo}.'],2:['Se ainda fizer sentido, reserve um tempinho para essa tarefa.','O dia pode mudar. Você pode ajustar o prazo.'],3:['Quer cuidar disso agora ou reagendar com calma?']}
 }
};
export function reminderMessage(category:TaskCategory,stage:ReminderStage,variant=0,displayName='',addressStyle:AddressStyle='neutral',personality:NotificationPersonality='debochado'){
 const bank=personality==='debochado'?templates:personalityTemplates[personality];
 const options=bank[category]?.[stage]??bank.general[stage];
 return personalize(options[Math.abs(variant)%options.length],variant+stage,displayName,addressStyle);
}
/** Troca {vocativo} e encaixa o nome da pessoa em posições alternadas (estável por `seed`). */
function personalize(template:string,seed:number,displayName:string,addressStyle:AddressStyle){
 const vocativo=addressStyle==='masculine'?'campeão':addressStyle==='feminine'?'campeã':'pessoa';
 const name=displayName.trim().slice(0,32);
 // Com nome definido, ele substitui o vocativo em vez de aparecer duas vezes.
 if(name&&template.includes('{vocativo}'))return template.replace(/\{vocativo\}/g,name);
 const message=template.replace(/\{vocativo\}/g,vocativo);
 if(!name)return message;
 // Alterna entre nome no início, no fim e nenhuma menção.
 // A mesma tarefa mantém a escolha em todos os reagendamentos.
 const position=Math.abs(seed)%3;
 if(position===0){
   // Mensagens em CAIXA ALTA mantêm a primeira palavra intacta ("EI!", "BORA").
   const firstWord=message.split(/\s/)[0];
   const shouted=firstWord.length>1&&firstWord===firstWord.toUpperCase()&&firstWord!==firstWord.toLowerCase();
   return name+', '+(shouted?message:message.charAt(0).toLowerCase()+message.slice(1));
 }
 if(position===1){
   // Insere o nome antes da pontuação final e de um emoji final, preservando ambos.
   const match=message.match(/^(.*?)([.!?…]*)((?:\s*\p{Extended_Pictographic}️?)*)$/u);
   if(!match)return message;
   const [,core,punct,emoji]=match;
   return core+', '+name+(punct||'.')+emoji;
 }
 return message;
}
export function reminderOffsets(category: TaskCategory): readonly number[] {
  // Saúde usa um lembrete único por padrão; horários clínicos são definidos pelo usuário.
  return category === 'health' ? [0] : [0,15,60,180];
}

// ─── Eventos ─────────────────────────────────────────────────────────────────
// Eventos são avisados ANTES de acontecer. A mensagem depende de quanto falta:
// dias (≥ 1 dia), horas (≥ 1h), minutos (< 1h) ou agora (na hora do evento).
// {tempo} vira "em 2 dias", "em 1h30", "em 10 min"... e {vocativo} segue a regra das tarefas.
export type EventLead='dias'|'horas'|'minutos'|'agora';
/** Opções de antecedência oferecidas no editor (minutos antes do início). */
export const eventAlertOptions:readonly {minutes:number;label:string}[]=[
  {minutes:0,label:'Na hora'},{minutes:15,label:'15 min'},{minutes:30,label:'30 min'},
  {minutes:60,label:'1h'},{minutes:1440,label:'1 dia'},
];
export const eventLead=(minutes:number):EventLead=>minutes<=0?'agora':minutes<60?'minutos':minutes<1440?'horas':'dias';
export function eventLeadText(minutes:number){
  if(minutes<=0)return 'agora';
  if(minutes<60)return `em ${minutes} min`;
  if(minutes<1440){const h=Math.floor(minutes/60),m=minutes%60;return `em ${h}h${m?String(m).padStart(2,'0'):''}`;}
  if(minutes<10080){const d=Math.round(minutes/1440);return `em ${d} dia${d>1?'s':''}`;}
  const w=Math.round(minutes/10080);return `em ${w} semana${w>1?'s':''}`;
}
const eventTemplates:Record<NotificationPersonality,Record<EventLead,readonly string[]>>={
 debochado:{
  dias:['Spoiler do seu calendário: compromisso {tempo}. Depois não diz que ninguém avisou. 📅','Seu eu do passado marcou um evento {tempo}. Só lembrando, sem pressão. Ou com um pouquinho.','Compromisso {tempo}. Dá tempo de se organizar. Dá até tempo de esquecer, por isso eu existo.'],
  horas:['Começa {tempo}. Já pode ir pensando na roupa, {vocativo}. 👀','Seu compromisso é {tempo}. O relógio não negocia, eu já tentei.','Começa {tempo}. Aquele "depois eu vejo" virou "daqui a pouco".'],
  minutos:['Começa {tempo}. Se ainda está de pijama, a hora é essa. 🏃','Seu evento começa {tempo}. Larga o celular. Depois de ler isso, claro.','Contagem regressiva ligada: começa {tempo}, {vocativo}.'],
  agora:['Começou! Se você não está lá, pelo menos finge que está a caminho. 🏃','É agora. O compromisso chegou antes de você, de novo?','Hora do evento, {vocativo}. Pontualidade é um estilo de vida.'],
 },
 semPaciencia:{
  dias:['ANOTA AÍ! Compromisso {tempo}. Nada de esquecer! 📅','TEM EVENTO CHEGANDO! É {tempo}. Já se organiza!','NÃO É PRA DEIXAR PRA DEPOIS! Seu compromisso é {tempo}.'],
  horas:['ATENÇÃO! Começa {tempo}. Vai se arrumando!','O EVENTO É {tempo}! Nada de última hora, {vocativo}.','RELÓGIO CORRENDO! Seu compromisso começa {tempo}.'],
  minutos:['CORRE! Começa {tempo}! 🏃','COMEÇA {tempo}! LARGA TUDO E VAI!','SAI AGORA, {vocativo}! O evento começa {tempo}.'],
  agora:['COMEÇOU! JÁ ERA PRA VOCÊ ESTAR LÁ! 🏃','É AGORA! Nada de "já tô indo"!','HORA DO EVENTO, {vocativo}! VAI!'],
 },
 deBoa:{
  dias:['Só um lembrete gentil: você tem um compromisso {tempo}. 🌿','Seu evento é {tempo}. Dá tempo de se preparar com calma.','Passando pra lembrar do seu compromisso {tempo}. Tudo no seu ritmo.'],
  horas:['Seu compromisso começa {tempo}. Que tal ir se organizando?','Tem evento chegando: começa {tempo}, {vocativo}.','Começa {tempo}. Respira e vai se preparando. 🌿'],
  minutos:['Começa {tempo}. Hora de ir com tranquilidade.','Seu evento está quase aí: começa {tempo}.','Já pode ir saindo, {vocativo}. Começa {tempo}.'],
  agora:['Seu compromisso começou. Aproveite! 🌿','Chegou a hora do seu evento. Vai dar tudo certo.','É agora, {vocativo}. Bom compromisso!'],
 },
};
/** Saúde mantém o tom neutro em todas as personalidades, como nas tarefas. */
const healthEventTemplates:Record<EventLead,readonly string[]>={
  dias:['Seu compromisso de saúde é {tempo}. Confira os detalhes com antecedência.'],
  horas:['Seu compromisso de saúde começa {tempo}.'],
  minutos:['Seu compromisso de saúde começa {tempo}. Confira se está tudo pronto.'],
  agora:['Chegou a hora do seu compromisso de saúde.'],
};
/** Texto mostrado quando a pré-visualização privada está ligada. */
export const privateEventMessage='Você tem um compromisso chegando. Abra o Ping para conferir.';
/** Mensagem de aviso de evento, `minutesBefore` minutos antes do início. */
export function eventReminderMessage(category:TaskCategory,minutesBefore:number,variant=0,displayName='',addressStyle:AddressStyle='neutral',personality:NotificationPersonality='debochado'){
 const lead=eventLead(minutesBefore);
 const options=category==='health'?healthEventTemplates[lead]:eventTemplates[personality][lead];
 // Na personalidade "sem paciência" o tempo também vai em CAIXA ALTA para combinar com o grito.
 const tempo=personality==='semPaciencia'&&category!=='health'?eventLeadText(minutesBefore).toUpperCase():eventLeadText(minutesBefore);
 const template=options[Math.abs(variant)%options.length].replace(/\{tempo\}/g,tempo);
 return personalize(template,variant+minutesBefore,displayName,addressStyle);
}

// ─── Sentimento do Ping ──────────────────────────────────────────────────────
// Texto por sentimento e personalidade (Saúde continua neutra e usa os textos acima).
type TaskMood='animado'|'impaciente'|'irritado'|'cansado';
const moodTemplates:Record<NotificationPersonality,Record<TaskMood,readonly string[]>>={
 debochado:{
  animado:['Seu eu do passado marcou isso. Eu só lembrei.','Chegou a hora. Eu lembrei, você faz. Combinado?','Tá na agenda, {vocativo}. Eu não inventei nada.'],
  impaciente:['Uma hora depois. Eu não tô julgando. Tô, sim.','Uma hora e a pendência segue firme. Surpresa nenhuma.','O relógio trabalhou. E essa tarefa?'],
  irritado:['Três horas. Já aprendi a esperar, mas cansei de aprender.','Última chamada, {vocativo}: faz ou reagenda.','Isso já tem mais atraso que desculpa. Resolve?'],
  cansado:['Já adiou várias vezes. Meu sino tá exausto de tocar.','Adiar de novo? Meu sino pede férias.','{vocativo}, a gente podia reagendar de vez, né?'],
 },
 semPaciencia:{
  animado:['É AGORA! Bora tirar isso da frente.','CHEGOU A HORA, {vocativo}! Nada de empurrar.','TEM TAREFA! Faz agora, depois descansa.'],
  impaciente:['UMA HORA! A tarefa ainda tá aí.','UMA HORA DEPOIS! Ela não criou pernas.','O tempo passou. AGORA É DECIDIR!'],
  irritado:['TRÊS HORAS! Faz ou reagenda. SEM ENROLAR.','ÚLTIMO AVISO, {vocativo}! Resolve ou muda o prazo.','ISSO ESTÁ VENCIDO! Anda!'],
  cansado:['Adiou de novo. CANSEI. Decide: faz ou reagenda.','Adiar, adiar... Chega! Faz ou reagenda.','Já adiou demais. Reagenda de vez ou faz.'],
 },
 deBoa:{
  animado:['Chegou a hora, no seu ritmo. Um passo de cada vez. 🌿','Um lembrete gentil: a tarefa chegou.','Passando para lembrar do que você planejou.'],
  impaciente:['Ela continua aqui, sem pressão. Quando puder.','Já faz um tempinho. Que tal um pouquinho agora?','Sem pressa, mas ela continua te esperando.'],
  irritado:['Faz um tempinho. Quer fazer agora ou reagendar com calma?','Se o dia apertou, dá para reagendar sem culpa.','Último lembrete: faz quando puder ou reagenda.'],
  cansado:['Você adiou algumas vezes. Talvez esse horário não sirva. Reagendar?','Que tal um horário melhor para essa tarefa?','Tudo bem adiar. Mas um novo horário ajuda. Reagendar?'],
 },
};
/** Mensagem de lembrete de tarefa conforme o sentimento do Ping (Saúde cai nos textos neutros por etapa). */
export function moodMessage(category:TaskCategory,mood:NotificationMood,stage:ReminderStage,variant=0,displayName='',addressStyle:AddressStyle='neutral',personality:NotificationPersonality='debochado'){
 if(category==='health'||mood==='ciumes'||mood==='festa')return reminderMessage(category,stage,variant,displayName,addressStyle,personality);
 const options=moodTemplates[personality][mood];
 const base=personalize(options[Math.abs(variant)%options.length],variant+stage,displayName,addressStyle);
 // O primeiro aviso leva o emoji do assunto (como os textos antigos); os outros ficam mais secos.
 return mood==='animado'&&category!=='general'?`${base} ${categoryEmoji[category]}`:base;
}
const missTemplates:Record<NotificationPersonality,readonly string[]>={
 debochado:['Sumiu, hein? Tem {n} esperando. Tô bem. Tô ótimo.','{dias} dias sem aparecer. Tem {n} esperando. Sem pressão. Quase.'],
 semPaciencia:['SUMIU {dias} DIAS! Tem {n} esperando. Abre aí.','Tem {n} esperando há {dias} dias. VOLTA AQUI!'],
 deBoa:['Que saudade! Tem {n} esperando, sem pressa.','Faz {dias} dias… tudo bem por aí? Tem {n} esperando.'],
};
const cleanDayTemplates:Record<NotificationPersonality,readonly string[]>={
 debochado:['Tudo feito hoje. Quem diria. Vou me gabar por você. 🔔','Dia limpo. Posso fingir que sempre acreditei.'],
 semPaciencia:['Tudo feito. Pronto. Sem drama.','Dia limpo. Amanhã tem mais. Descansa.'],
 deBoa:['Que dia bom! Tudo feito. Pode descansar. 🌿','Missão cumprida. Aproveita a noite!'],
};
const countText=(n:number)=>n===1?'1 tarefa':`${n} tarefas`;
/** Aviso de saudade: depois de dias sem abrir o app, com tarefas esperando. */
export function missYouMessage(personality:NotificationPersonality,pending:number,days:number,variant=0){
 const options=missTemplates[personality];
 return options[Math.abs(variant)%options.length].replace(/\{n\}/g,countText(pending)).replace(/\{dias\}/g,String(days));
}
/** Aviso opcional das 20h quando o dia terminou sem nada pendente. */
export function cleanDayMessage(personality:NotificationPersonality,variant=0){
 const options=cleanDayTemplates[personality];
 return options[Math.abs(variant)%options.length];
}
