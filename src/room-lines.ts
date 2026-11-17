import type {NotificationPersonality} from './preferences';

/**
 * Falas do Ping no Cantinho. Mesmas três personalidades da aba Hoje, frases curtas (duas linhas no balão).
 * Situações do quarto e uma lista por item: o Ping comenta o que você toca, o que você está provando e o que comprou.
 */
export type RoomSituation='entrar'|'vazio'|'toque'|'cansado'|'ocioso'|'soneca'|'acordou'|'provando'|'comprou'|'semMoeda'|'sino'|'noite';
export type ItemLines={toque:string[];provando:string[];comprou:string[]};

const ROOM:Record<NotificationPersonality,Record<RoomSituation,string[]>>={
  debochado:{
    entrar:['Bem-vindo ao meu humilde palácio.','Limpa os pés. Brincadeira. Ou não.','Veio me visitar? Que honra.'],
    vazio:['Minimalista. Por falta de opção.','Um quarto vazio. Tipo sua agenda.','Eco, eco. Compra um sofá aí.'],
    toque:['Toca nas coisas, não em mim.','Sim, eu moro aqui. E aí?','Tá me cutucando de novo?'],
    cansado:['Chega. Vou pedir medida protetiva.','Três cutucões. Recorde seu.'],
    ocioso:['Vou ficar aqui, decorativo.','Bonito, né? Graças a mim.','Tô pensando em redecorar. Com seu dinheiro.'],
    soneca:['Opa. Eu não tava dormindo.','Só descansando os olhos.'],
    acordou:['Ai! Que susto.','Acordei. Infelizmente.'],
    provando:['Hum. Combina comigo?','Prova à vontade, provar é grátis.','Já tô me acostumando.'],
    comprou:['Gastou bem. Pela primeira vez.','Agora sim, um lar.','Obrigado. Eu mereço.'],
    semMoeda:['Faltou moeda. Vai concluir tarefa.','Tá caro? Não, tá pobre.'],
    sino:['DING. Tô vivo.','Isso foi alto até pra mim.'],
    noite:['Tá escuro aqui. Acende a luz?','De noite eu fico misterioso.'],
  },
  semPaciencia:{
    entrar:['Entrou. Agora não bagunça.','Rápido, tenho coisas a fazer.','Veio ver ou veio comprar?'],
    vazio:['Quarto vazio. Tarefas, já!','Sem móvel, sem conforto. Trabalha.'],
    toque:['Para de me tocar.','Que foi? Fala logo.','Toque inútil detectado.'],
    cansado:['CHEGA.','Mais um e eu me mudo.'],
    ocioso:['Tá parado por quê?','Isso aqui não conclui tarefa.','Visita rápida, tá?'],
    soneca:['Eu NÃO tava dormindo.','Pausa técnica. Acabou.'],
    acordou:['Me acordou. Ótimo.','Pronto, acordado. Satisfeito?'],
    provando:['Decide logo.','Gostou? Compra. Não? Próximo.'],
    comprou:['Finalmente.','Comprado. Agora volta pras tarefas.'],
    semMoeda:['Sem moeda. Sabe o que fazer.','Conclui tarefa e volta.'],
    sino:['DING! Satisfeito?','Barulho resolvido.'],
    noite:['Tá escuro. Liga a luz.'],
  },
  deBoa:{
    entrar:['Oi! Que bom te ver aqui.','Fica à vontade, a casa é nossa.','Chegou visita! Que alegria.'],
    vazio:['Tá vazinho, mas tem potencial.','Um dia isso aqui vai ficar lindo.'],
    toque:['Hehe, cócegas.','Oi oi! Tô aqui.','Gosto da sua companhia.'],
    cansado:['Ufa, muito carinho por hoje.','Vou só respirar um pouquinho.'],
    ocioso:['Que paz esse cantinho.','Dá pra ouvir o silêncio.','Tô curtindo o momento.'],
    soneca:['Cochilei um tiquinho.','Que soninho bom.'],
    acordou:['Oi! Tava sonhando com tarefas.','Acordei feliz.'],
    provando:['Ficou fofo, né?','Gostei desse aí!','Imagina isso aqui todo dia.'],
    comprou:['Amei! Obrigado!','Ficou a nossa cara.','Que capricho, valeu!'],
    semMoeda:['Sem pressa, a gente junta.','Umas tarefinhas e é nosso.'],
    sino:['Ding-dong! Hehe.','Sininho alegre.'],
    noite:['Já é noite. Que tal a luzinha?'],
  },
};
const ITEMS:Record<string,Record<NotificationPersonality,ItemLines>>={
  planta:{
    debochado:{toque:['Rego toda semana. Mentira.','Ela me entende mais que você.'],provando:['Verde combina com meu ego.'],comprou:['Uma planta. Agora sou responsável.']},
    semPaciencia:{toque:['Não arranca folha.','Planta não se toca.'],provando:['Planta é útil. Compra.'],comprou:['Ok, oxigênio garantido.']},
    deBoa:{toque:['Oi, plantinha!','Ela tá crescendo, viu?'],provando:['Um verdinho faz bem.'],comprou:['Bem-vinda, plantinha!']},
  },
  cacto:{
    debochado:{toque:['Cuidado, ele é tipo eu.','Espinhoso. Me identifico.'],provando:['Zero manutenção. Igual você.'],comprou:['Um amigo espinhento.']},
    semPaciencia:{toque:['Espinho. Não toca.','Ai. Avisei.'],provando:['Não precisa regar. Gosto.'],comprou:['Prático. Aprovado.']},
    deBoa:{toque:['Ele floresceu pra você!','Abraço não, só carinho de longe.'],provando:['Florzinha no cacto, que lindo.'],comprou:['O cactinho chegou!']},
  },
  quadro_sol:{
    debochado:{toque:['Arte contemporânea. De mim.','Sim, é original. Ou quase.'],provando:['Um solzinho pra iluminar seu atraso.'],comprou:['Agora tenho uma galeria.']},
    semPaciencia:{toque:['Não entorta o quadro.','É um sol. Pronto.'],provando:['Bonito. Decide.'],comprou:['Pendurado. Próximo.']},
    deBoa:{toque:['Esse sol me deixa feliz.','Parece um dia de folga.'],provando:['Que quentinho!'],comprou:['Ficou tão alegre!']},
  },
  quadro_lua:{
    debochado:{toque:['A lua, igual minhas noites em claro.','Romântico, né? Eu sei.'],provando:['Clima de quem procrastina.'],comprou:['Noite garantida na parede.']},
    semPaciencia:{toque:['É a lua. Volta pras tarefas.'],provando:['Escuro. Mas ok.'],comprou:['Lua instalada.']},
    deBoa:{toque:['Boa noite, lua.','Dá vontade de deitar.'],provando:['Tão calminho.'],comprou:['Agora tem céu aqui dentro.']},
  },
  poster_ping:{
    debochado:{toque:['Meu melhor ângulo.','Autógrafo custa extra.'],provando:['Um pôster de mim. Óbvio.'],comprou:['Finalmente, meu fã-clube.']},
    semPaciencia:{toque:['Sou eu. Faça acontecer.','Leu? Agora faz.'],provando:['Motivacional. Compra.'],comprou:['Lembrete na parede. Ótimo.']},
    deBoa:{toque:['Olha eu ali! Hehe.','Ficou bonito, né?'],provando:['Que vergonhinha.'],comprou:['Me sinto famoso!']},
  },
  tapete:{
    debochado:{toque:['Pisa com estilo.','Embaixo dele: suas desculpas.'],provando:['Listrado. Ousado.'],comprou:['Pronto, agora tem chão.']},
    semPaciencia:{toque:['É tapete. Pisa.','Não escorrega.'],provando:['Serve. Compra.'],comprou:['Chão resolvido.']},
    deBoa:{toque:['Fofinho no pé!','Bom pra dançar.'],provando:['Aconchegante!'],comprou:['Pé quentinho, eba!']},
  },
  tapete_redondo:{
    debochado:{toque:['Redondo, igual seu planejamento.','Gira, gira.'],provando:['Chique demais pra você? Talvez.'],comprou:['Agora sim, um tapete de respeito.']},
    semPaciencia:{toque:['Redondo. E daí?'],provando:['Decide.'],comprou:['Instalado.']},
    deBoa:{toque:['Parece um abraço no chão.','Que macio!'],provando:['Esse é tão bonito.'],comprou:['Ficou um charme!']},
  },
  luminaria:{
    debochado:{toque:['Clique. Iluminado. Você não.','Liga, desliga. Isso é poder.'],provando:['Ilumina até suas ideias ruins.'],comprou:['Finalmente, luz própria.']},
    semPaciencia:{toque:['Luz. Pronto.','Não fica brincando com o interruptor.'],provando:['Útil. Compra.'],comprou:['Iluminação resolvida.']},
    deBoa:{toque:['Clique! Que clima gostoso.','Luzinha amarela, amo.'],provando:['Ficou aconchegante.'],comprou:['Luz de leitura, que delícia.']},
  },
  radio:{
    debochado:{toque:['Toca a playlist da procrastinação.','Rádio? Sou vintage.'],provando:['Música pra fingir foco.'],comprou:['Agora tem trilha sonora.']},
    semPaciencia:{toque:['Música. Dois minutos.','Desliga quando for trabalhar.'],provando:['Ok. Compra.'],comprou:['Som instalado.']},
    deBoa:{toque:['Bora dançar!','Essa é das boas.'],provando:['Imagina uma musiquinha aqui.'],comprou:['Festa no Cantinho!']},
  },
  sofa:{
    debochado:{toque:['Meu trono. Pode olhar.','Sentar é minha especialidade.'],provando:['Confortável demais pra produtividade.'],comprou:['Agora eu tenho onde não fazer nada.']},
    semPaciencia:{toque:['Sentei. Cinco minutos.','Não acostuma.'],provando:['Confortável. Compra logo.'],comprou:['Sofá. Merecido. Agora trabalha.']},
    deBoa:{toque:['Aaah, que gostoso.','Senta aqui comigo?'],provando:['Dá pra cochilar nesse.'],comprou:['O sofá dos sonhos!']},
  },
  pufe:{
    debochado:{toque:['Afunda tipo minha motivação.','Pufe: sofá de quem tá começando.'],provando:['Fofo. Igual eu.'],comprou:['Afundar com estilo.']},
    semPaciencia:{toque:['Afundei. Pronto.','Sem preguiça, tá?'],provando:['Serve.'],comprou:['Pufe ok.']},
    deBoa:{toque:['Ploft! Hehe.','Parece uma nuvem.'],provando:['Que molenga!'],comprou:['Nuvem particular, eba!']},
  },
};
function pick(list:string[],last?:number):{text:string;index:number}{
  if(list.length===1)return {text:list[0],index:0};
  let i=Math.floor(Math.random()*list.length);
  if(i===last)i=(i+1)%list.length;
  return {text:list[i],index:i};
}
export function roomLine(p:NotificationPersonality,s:RoomSituation,last?:number){return pick(ROOM[p][s],last);}
export function itemLine(p:NotificationPersonality,itemId:string,kind:keyof ItemLines,last?:number){
  const set=ITEMS[itemId]?.[p];
  return set?pick(set[kind],last):roomLine(p,kind==='comprou'?'comprou':kind==='provando'?'provando':'toque',last);
}
export const ITEM_LINE_IDS=Object.keys(ITEMS);
