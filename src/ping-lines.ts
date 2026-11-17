import type {NotificationPersonality} from './preferences';

/**
 * As falas do Ping nos balões da aba Hoje. Mesmas três personalidades das notificações:
 * 😏 Debochado (ironia na medida), 🔥 Sem Paciência (direto, sem enrolação), 🌿 De Boa (leve).
 * Frases curtas (cabem em duas linhas no balão) e sem repetir os textos que o app já tem.
 */
export type DayMood='devendo'|'falta_pouco'|'ainda_hoje'|'cumprida'|'vazio';
/** Além do humor do dia: ao concluir, ao ser cutucado (e cansar), ao acordar, ao atualizar, ao voltar depois de dias, ao tocar o sino e com muitas atrasadas. */
export type Situation=DayMood|'concluiu'|'toque'|'cansado'|'tonto'|'recuperou'|'soneca'|'espiar'|'ciumes'|'sino'|'nuvem';

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
    cansado:['O dedo cansou? Eu já.','Quantos cutucões. Dá um tempo.','Já deu, né?'],
    tonto:['Estrelinhas. Que chique.','Para. Tô girando.'],
    recuperou:['Ok. Voltei. Sem graça.','Respirei. Pode seguir.'],
    soneca:['Eu tava só descansando a vista.','Tava pensando. De olho fechado.'],
    espiar:['Deixa eu ver se tem novidade…','Procurando novidade. Boa sorte.'],
    ciumes:['Olha só quem apareceu.','Sumiu, hein? Tô bem. Tô ótimo.'],
    sino:['DING! Satisfeito?','Quer barulho? Toma.'],
    nuvem:['Tá chovendo atraso aqui.','Nublou. Culpa de quem?'],
  },
  semPaciencia:{
    devendo:['Atrasou. Resolve agora.','Chega de enrolar.','Isso tá vencido. Anda.'],
    falta_pouco:['Falta pouco. Termina.','Já foi quase. Fecha logo.','Não para agora.'],
    ainda_hoje:['Hoje tem coisa. Começa.','Não deixa pra depois.','Foco. Uma por vez.'],
    cumprida:['Fechou. Ótimo.','Tudo feito. Era isso.','Pronto. Sem drama.'],
    vazio:['Sem tarefa. Cria uma.','Dia vazio. Planeja algo.','Nada aqui. Toca no +.'],
    concluiu:['Uma a menos. Próxima.','Boa. Não para.','Feito. Segue.'],
    toque:['Não é hora de brincar.','Larga o dedo. Trabalha.','Tá fazendo o quê aqui?'],
    cansado:['Chega. Cansei.','Para de cutucar.','Isso cansa, sabia?'],
    tonto:['Para. Agora.','Tô tonto. Sério.'],
    recuperou:['Pronto. Não repete.','Voltei. Foco.'],
    soneca:['Ei! Eu tava dormindo!','Que susto! Para!'],
    espiar:['Atualizando. Rápido.','Vamos ver o que sobrou.'],
    ciumes:['Sumiu. Pois é.','Já era hora.'],
    sino:['DING! Alto o bastante?','Escutou? Agora faz.'],
    nuvem:['Chuva de atraso. Resolve.','Isso tá virando tempestade.'],
  },
  deBoa:{
    devendo:['Tem uns atrasos. Sem estresse.','Dá pra resolver no seu ritmo.','Respira. Uma de cada vez.'],
    falta_pouco:['Tá quase, bora devagar.','Falta pouquinho. Você consegue.','Já já termina.'],
    ainda_hoje:['Dia tranquilo pela frente.','Quando der, a gente vai.','Sem correria hoje.'],
    cumprida:['Que dia bom. Tudo feito!','Pode descansar agora.','Aproveita a folga.'],
    vazio:['Dia livre. Que delícia.','Nada pra hoje. Aproveita.','Se quiser criar algo, o + tá aí.'],
    concluiu:['Boa! Mais uma feita.','Isso aí, no seu tempo.','Tranquilo e eficiente.'],
    toque:['Oi! Tá tudo bem por aí?','Cócegas! Hihi.','Tô de olho, mas de boa.'],
    cansado:['Ai, preciso de um respiro…','Calma, tô cansadinho.','Uma pausa, por favor?'],
    tonto:['Tô girando… hihi.','Uau, tudo rodando…'],
    recuperou:['Ahh, melhor. Valeu!','Respirei fundo. Bora.'],
    soneca:['Ai! Que susto… oi!','Hm? Eu cochilei?'],
    espiar:['Vamos ver as novidades?','Buscando… tudo certo!'],
    ciumes:['Ei, que saudade! Hmpf.','Demorou, hein? Senti falta.'],
    sino:['DIIING! Que gostoso!','Bimbalhei! Hihi.'],
    nuvem:['Eita, nublou. Bora limpar?','Uns atrasos chovendo… a gente resolve.'],
  },
};

/** Sorteia uma fala da situação, sem repetir a anterior (`last` é o índice da última dita). */
export function pickLine(personality:NotificationPersonality,situation:Situation,last?:number){
  const options=LINES[personality][situation];
  let index=Math.floor(Math.random()*options.length);
  if(options.length>1&&index===last)index=(index+1)%options.length;
  return {text:options[index],index};
}
