import type {NotificationPersonality} from './preferences';

/**
 * As falas do Ping nos balões da aba Hoje. Mesmas três personalidades das notificações:
 * 😏 Debochado (ironia na medida), 🔥 Sem Paciência (direto, sem enrolação), 🌿 De Boa (leve).
 * Frases curtas (cabem em duas linhas no balão) e sem repetir os textos que o app já tem.
 */
export type DayMood='devendo'|'falta_pouco'|'ainda_hoje'|'cumprida'|'vazio';
/** Além do humor do dia: logo depois de concluir uma tarefa e quando o Ping é cutucado. */
export type Situation=DayMood|'concluiu'|'toque';

/** Mesmo critério do rótulo do post-it (TÁ DEVENDO, FALTA POUCO, AINDA HOJE, MISSÃO CUMPRIDA, DIA EM BRANCO). */
export function dayMood(left:number,overdue:number,done:number):DayMood{
  if(overdue>0)return 'devendo';
  if(left>0)return done>0&&left<=2?'falta_pouco':'ainda_hoje';
  return done>0?'cumprida':'vazio';
}

const LINES:Record<NotificationPersonality,Record<Situation,string[]>>={
  debochado:{
    devendo:['Ué, o prazo era de enfeite?','Atrasadas. Que surpresa. Não.','Eu avisei. Educadamente.'],
    falta_pouco:['Quase lá. Não se emocione.','Falta pouco. Surpreendente.','Já vi gente desistir bem aqui.'],
    ainda_hoje:['Tem coisa pra hoje. Só avisando.','O dia tá rendendo, hein.','Sem pressa. Quer dizer, um pouco.'],
    cumprida:['Tudo feito. Quem diria.','Posso me gabar por você?','Eu sabia. (Não sabia.)'],
    vazio:['Dia em branco. Ambicioso.','Nada pra hoje. Suspeito.','Toca no + e finge produtividade.'],
    concluiu:['Olha só, funcionou.','Uma a menos. Continue assim.','Gostei. Nem vou comentar.'],
    toque:['Tá me cutucando por quê?','Eu vejo tudo, sabia?','Vai trabalhar, vai.'],
  },
  semPaciencia:{
    devendo:['Atrasou. Resolve agora.','Chega de enrolar.','Isso tá vencido. Anda.'],
    falta_pouco:['Falta pouco. Termina.','Já foi quase. Fecha logo.','Não para agora.'],
    ainda_hoje:['Hoje tem coisa. Começa.','Não deixa pra depois.','Foco. Uma por vez.'],
    cumprida:['Fechou. Ótimo.','Tudo feito. Era isso.','Pronto. Sem drama.'],
    vazio:['Sem tarefa. Cria uma.','Dia vazio. Planeja algo.','Nada aqui. Toca no +.'],
    concluiu:['Uma a menos. Próxima.','Boa. Não para.','Feito. Segue.'],
    toque:['Não é hora de brincar.','Larga o dedo. Trabalha.','Tá fazendo o quê aqui?'],
  },
  deBoa:{
    devendo:['Tem uns atrasos. Sem estresse.','Dá pra resolver no seu ritmo.','Respira. Uma de cada vez.'],
    falta_pouco:['Tá quase, bora devagar.','Falta pouquinho. Você consegue.','Já já termina.'],
    ainda_hoje:['Dia tranquilo pela frente.','Quando der, a gente vai.','Sem correria hoje.'],
    cumprida:['Que dia bom. Tudo feito!','Pode descansar agora.','Aproveita a folga.'],
    vazio:['Dia livre. Que delícia.','Nada pra hoje. Aproveita.','Se quiser criar algo, o + tá aí.'],
    concluiu:['Boa! Mais uma feita.','Isso aí, no seu tempo.','Tranquilo e eficiente.'],
    toque:['Oi! Tá tudo bem por aí?','Cócegas! Hihi.','Tô de olho, mas de boa.'],
  },
};

/** Sorteia uma fala da situação, sem repetir a anterior (`last` é o índice da última dita). */
export function pickLine(personality:NotificationPersonality,situation:Situation,last?:number){
  const options=LINES[personality][situation];
  let index=Math.floor(Math.random()*options.length);
  if(options.length>1&&index===last)index=(index+1)%options.length;
  return {text:options[index],index};
}
