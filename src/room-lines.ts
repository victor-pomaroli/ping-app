import type {NotificationPersonality} from './preferences';

/**
 * Falas do Ping no Cantinho. Mesmas três personalidades da aba Hoje, frases curtas (duas linhas no balão).
 * Situações do quarto e uma lista por item: o Ping comenta o que você toca, o que você está provando e o que comprou.
 */
export type RoomSituation='noiteSemLuz'|'entrar'|'vazio'|'toque'|'cansado'|'ocioso'|'soneca'|'acordou'|'provando'|'comprou'|'semMoeda'|'sino'|'noite';
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
    noite:['Tá escuro aqui. Acende a luminária?','Luminária apagada de noite? Corajoso.'],
    noiteSemLuz:['Escuro, hein. Uma luz cairia bem.','De noite eu fico misterioso.'],
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
    noite:['Tá escuro. Liga a luminária.'],
    noiteSemLuz:['Sem luz nenhuma. Compra uma.'],
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
    noite:['Já é noite. Acende a luminária?'],
    noiteSemLuz:['Tá escurinho. Uma luz ia ser bom.'],
  },
};
const ITEMS:Record<string,Record<NotificationPersonality,ItemLines>>={
  ventilador:{
    debochado:{toque:['Vento grátis. Diferente da loja.','Gira, gira, igual sua agenda.'],provando:['Um ventinho cairia bem.'],comprou:['Agora sim, clima controlado.']},
    semPaciencia:{toque:['Ventilador. Pronto.','Não fica ligando e desligando.'],provando:['Útil. Compra.'],comprou:['Ar circulando. Trabalha.']},
    deBoa:{toque:['Que ventinho gostoso!','Brisa de fim de tarde.'],provando:['Vai ficar fresquinho.'],comprou:['Que alívio, valeu!']},
  },
  pendente:{
    debochado:{toque:['Luz de cafeteria hipster.','Iluminado. Eu, não você.'],provando:['Chique demais.'],comprou:['Agora parece revista de decoração.']},
    semPaciencia:{toque:['Luz. Funciona.'],provando:['Decide.'],comprou:['Iluminado.']},
    deBoa:{toque:['Que luz bonita.'],provando:['Aconchegante!'],comprou:['Ficou um charme!']},
  },
  luzinhas:{
    debochado:{toque:['Natal o ano todo. Ousado.','Pisca-pisca, igual minha paciência.'],provando:['Brega? Talvez. Amo.'],comprou:['Festa permanente.']},
    semPaciencia:{toque:['Pisca demais.','Bonito. Próximo.'],provando:['Ok.'],comprou:['Luzinhas instaladas.']},
    deBoa:{toque:['Parece céu estrelado!','Que alegria essas luzinhas.'],provando:['Amei!'],comprou:['Ficou mágico!']},
  },
  relogio:{
    debochado:{toque:['O tempo passa. Suas tarefas, não.','Tic-tac. Sabe o que é isso?'],provando:['Pra você ver a hora que perdeu.'],comprou:['Agora não tem desculpa de horário.']},
    semPaciencia:{toque:['Olha a hora. Anda.','Tic-tac.'],provando:['Útil. Compra.'],comprou:['Hora certa, sem desculpa.']},
    deBoa:{toque:['Ainda dá tempo, relaxa.','Tic-tac, sem pressa.'],provando:['Combina com a parede.'],comprou:['Pontualidade, que fofo.']},
  },
  prateleira:{
    debochado:{toque:['Livros que eu juro que li.','O troféu é meu. Óbvio.'],provando:['Ar intelectual.'],comprou:['Agora pareço culto.']},
    semPaciencia:{toque:['Não mexe nos livros.'],provando:['Organizado. Gosto.'],comprou:['Prateleira ok.']},
    deBoa:{toque:['Que coleção bonita!'],provando:['Cheio de histórias.'],comprou:['Cantinho da leitura!']},
  },
  neon:{
    debochado:{toque:['Até em neon eu tenho razão.','Brilha mais que sua motivação.'],provando:['Lema de vida, versão balada.'],comprou:['Agora é oficial: faça acontecer.']},
    semPaciencia:{toque:['Lê. Faz.','Neon ligado. Tarefas também?'],provando:['Motivacional. Compra.'],comprou:['Recado dado.']},
    deBoa:{toque:['Que luz bonita!','Me inspira, viu?'],provando:['Que brilho!'],comprou:['Ficou incrível!']},
  },
  lousa:{
    debochado:{toque:['Duas feitas. A terceira é sua.','Lista bonita. Cumprida? Quase.'],provando:['Combina com quem tem lista.'],comprou:['Agora até a parede te cobra.']},
    semPaciencia:{toque:['Falta uma. Vai.','Risca a última.'],provando:['Útil.'],comprou:['Lista na parede. Sem desculpa.']},
    deBoa:{toque:['Olha quanta coisa feita!'],provando:['Organizadinho.'],comprou:['Lista fofa!']},
  },
  televisao:{
    debochado:{toque:['Só um episódio. Ou dez.','Desliga e vai trabalhar. Brincadeira. Ou não.'],provando:['Maratona à vista.'],comprou:['Agora sim, entretenimento de qualidade: eu.']},
    semPaciencia:{toque:['TV só depois das tarefas.','Cinco minutos. Contados.'],provando:['Tela grande. Ok.'],comprou:['TV instalada. Use com moderação.']},
    deBoa:{toque:['Sessão pipoca!','Vem assistir comigo.'],provando:['Imagina os filmes!'],comprou:['Cineminha particular!']},
  },
  gatinho:{
    debochado:{toque:['Ele dorme mais que você. E rende mais.','Não acorda o chefe da casa.'],provando:['Um colega de quarto que não paga aluguel.'],comprou:['Agora eu tenho um pet. Ele me ignora.']},
    semPaciencia:{toque:['Deixa ele dormir.','Shh.'],provando:['Fofo. Compra.'],comprou:['Gato adotado. Cuida.']},
    deBoa:{toque:['Ele ronrona tão baixinho.','Que soninho bom ele tem.'],provando:['Ai, que gatinho!'],comprou:['Bem-vindo, amiguinho!']},
  },
  aquario:{
    debochado:{toque:['Os peixes têm mais foco que você.','Glub. Tradução: trabalha.'],provando:['Terapia aquática.'],comprou:['Dois novos fãs.']},
    semPaciencia:{toque:['Não bate no vidro.'],provando:['Calmo. Ok.'],comprou:['Peixes ok.']},
    deBoa:{toque:['Olha eles nadando!','Que calma dá ver isso.'],provando:['Que relaxante!'],comprou:['Oi, peixinhos!']},
  },
  violao:{
    debochado:{toque:['Sei três acordes. Todos errados.','Plim. Pronto, show acabou.'],provando:['Combina com meu lado artista.'],comprou:['Turnê mundial começa amanhã.']},
    semPaciencia:{toque:['Toca depois das tarefas.'],provando:['Ok.'],comprou:['Violão. Ensaia no intervalo.']},
    deBoa:{toque:['Bora um sonzinho?','Plim plim!'],provando:['Que lindo!'],comprou:['Luau no Cantinho!']},
  },
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
/** Acessórios do Ping: falas de quem está se vendo no espelho. */
const WEAR:Record<NotificationPersonality,ItemLines>={
  debochado:{toque:['Tô um arraso, admite.','Esse visual? Natural.','Para de me encarar.'],provando:['Hum, ficou bom em mim. Óbvio.','Eu fico bem com tudo.','Experimenta comprar, vai.'],comprou:['Agora sim, um visual à minha altura.','Vou desfilar na aba Hoje.','Elegância custa caro. Você pagou.']},
  semPaciencia:{toque:['Sim, tô bonito. Próximo assunto.','Não mexe no meu visual.'],provando:['Serve. Compra ou tira.','Decide logo.'],comprou:['Pronto. Agora volta pras tarefas.','Visual aprovado.']},
  deBoa:{toque:['Gostou do meu look?','Tô me sentindo lindo!'],provando:['Será que combina comigo?','Ai, que fofo!'],comprou:['Amei! Vou usar sempre!','Obrigado, me sinto especial.']},
};
const COROA:Record<NotificationPersonality,Partial<ItemLines>>={
  debochado:{comprou:['Finalmente reconheceram a realeza.'],toque:['Podem me chamar de Majestade.']},
  semPaciencia:{comprou:['Rei das tarefas. Agora age como tal.']},
  deBoa:{comprou:['Rei por um dia? Por todos!']},
};
function pick(list:string[],last?:number):{text:string;index:number}{
  if(list.length===1)return {text:list[0],index:0};
  let i=Math.floor(Math.random()*list.length);
  if(i===last)i=(i+1)%list.length;
  return {text:list[i],index:i};
}
export function roomLine(p:NotificationPersonality,s:RoomSituation,last?:number){return pick(ROOM[p][s],last);}
export function itemLine(p:NotificationPersonality,itemId:string,kind:keyof ItemLines,last?:number){
  if(WEAR_IDS.has(itemId)){
    const special=itemId==='coroa'?COROA[p][kind]:undefined;
    return pick(special??WEAR[p][kind],last);
  }
  const set=ITEMS[itemId]?.[p];
  return set?pick(set[kind],last):roomLine(p,kind==='comprou'?'comprou':kind==='provando'?'provando':'toque',last);
}
const WEAR_IDS=new Set(['chapeu_festa','laco','bone','fones','coroa','oculos_nerd','oculos_escuros','oculos_coracao','gravata','cachecol','medalha']);
export const ITEM_LINE_IDS=Object.keys(ITEMS);
