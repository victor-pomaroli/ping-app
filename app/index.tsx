import React,{useCallback,useRef,useState} from 'react';
import {View,Text,ScrollView,Pressable,StyleSheet,AppState,StatusBar,Dimensions,Animated,TextStyle,RefreshControl} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {localDay,Task,listTasks,listTaskPage,archiveOldCompletedTasks,completeTask,deleteTask,taskRecurrence} from '../src/store';
import {recurrenceLabel} from '../src/recurrence';
import {categories,TaskCategory} from '../src/templates';
import {useAppTheme,ThemeColors,categoryColors,priorityColors,isDarkAppearance} from '../src/theme';
import {PingDialog} from '../src/components/PingDialog';
import {CalendarScreen} from '../src/components/CalendarScreen';
import {SummaryNote} from '../src/components/SummaryNote';
import {RewardsBar} from '../src/components/RewardsBar';
import {noteTouch} from '../src/ping-activity';
import {TaskTitle} from '../src/components/TaskTitle';
import {sortTasks,sectionTasks} from '../src/task-order';
import {EventCard} from '../src/components/EventCard';
import {Confetti} from '../src/components/Confetti';
import Reanimated,{LinearTransition,FadeOut,FadeInDown} from 'react-native-reanimated';
import {AnimatedCheck} from '../src/components/AnimatedCheck';
import {AnimatedFab} from '../src/components/AnimatedFab';
import {AttentionPulse} from '../src/components/AttentionPulse';
import {SonarPing} from '../src/components/SonarPing';
import {COMPLETE_SETTLE,STAGGER,useMotionEnabled} from '../src/motion';
import {takePendingHighlight,onHighlightRequest} from '../src/highlight';
import {getMeta,setMeta,getPreferences,type NotificationPersonality} from '../src/preferences';

type Tab='home'|'tasks'|'calendar';
const formatDate=(timestamp:number)=>new Date(timestamp).toLocaleString('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
const hhmm=(ms:number)=>new Date(ms).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
const shortDay=(ms:number)=>new Date(ms).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}).replace('.','');
/** "há 21 min", "há 3 h", "há 2 dias": quanto tempo uma tarefa está atrasada. */
function ago(ms:number,now:number){
  const min=Math.max(1,Math.floor((now-ms)/60000));
  if(min<60)return `há ${min} min`;
  const h=Math.floor(min/60);if(h<24)return `há ${h} h`;
  const d=Math.floor(h/24);return `há ${d} ${d===1?'dia':'dias'}`;
}
/** O que o cartão precisa dizer sobre a data: na seção de um dia (ou no Hoje) a data já está implícita. */
type CardContext={dayKnown?:boolean;page?:'home'|'tasks'|'calendar'};
const greetings=['SEGUNDA','TERÇA','QUARTA','QUINTA','SEXTA','SÁBADO','DOMINGO'];
export default function Home(){
  const {colors:c,appearance}=useAppTheme();
  const s=React.useMemo(()=>createStyles(c),[c]);
  const [tasks,setTasks]=useState<Task[]>([]);
  const [loadingPage,setLoadingPage]=useState(false);
  const [tab,setTab]=useState<Tab>('home');
  // 'event' = só eventos; as outras chaves filtram por assunto.
  const [taskCategoryFilter,setTaskCategoryFilter]=useState<'all'|'event'|TaskCategory>('all');
  const [visibleTaskCount,setVisibleTaskCount]=useState(50);
  const pager=useRef<React.ElementRef<typeof Animated.ScrollView>>(null);
  const horizontalX=useRef(new Animated.Value(0)).current;
  const verticalY=useRef({home:new Animated.Value(0),tasks:new Animated.Value(0),calendar:new Animated.Value(0)}).current;
  const [pageWidth,setPageWidth]=useState(Dimensions.get('window').width);
  // Enquanto o dedo está na faixa de filtros, o swipe entre abas fica travado.
  const [filtersTouched,setFiltersTouched]=useState(false);
  const tabs:Tab[]=['home','tasks','calendar'];
  // Dia escolhido no calendário; o botão + cria a tarefa nele quando a aba Calendário está na tela.
  const [calendarDay,setCalendarDay]=useState(()=>new Date());
  // Página real do pager (atualizada a cada frame de rolagem). `tab` só muda no fim do gesto,
  // então o + consulta isto para não criar no calendário estando em Tarefas, ou o contrário.
  const pageRef=useRef(0),pageWidthRef=useRef(Dimensions.get('window').width);
  const opening=useRef(false);
  const goToTab=(next:Tab)=>{setTab(next);pageRef.current=tabs.indexOf(next);pager.current?.scrollTo({x:tabs.indexOf(next)*pageWidth,animated:true});};
  const [now,setNow]=useState(Date.now());
  const [deleteTarget,setDeleteTarget]=useState<Task|null>(null);
  const [busyDelete,setBusyDelete]=useState(false);
  const [feedback,setFeedback]=useState<{title:string;message:string}|null>(null);
  const [showDone,setShowDone]=useState(false);
  // Destaque de tarefa pedido pela notificação/widget: vai para a aba certa, rola até ela e pisca.
  const [highlightRequest,setHighlightRequest]=useState<{id:number;loaded:boolean}|null>(null);
  const [highlight,setHighlight]=useState<{id:number;page:Tab}|null>(null);
  const highlightAnim=useRef(new Animated.Value(0)).current;
  const highlightRef=useRef<React.ElementRef<typeof View>|null>(null);
  const scrollRefs=useRef<Partial<Record<Tab,any>>>({});
  const scrollY=useRef<Record<Tab,number>>({home:0,tasks:0,calendar:0});
  const highlightTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [confettiKey,setConfettiKey]=useState(0);
  const motionOn=useMotionEnabled();
  // Ping ao lado do post-it: personalidade (relida ao voltar dos Ajustes) e gatilho de "concluí uma".
  const [personality,setPersonality]=useState<NotificationPersonality>('debochado');
  const [completeKey,setCompleteKey]=useState(0);
  // Puxar para atualizar: o spinner é o nativo do Android (nas cores do tema) e o Ping toca o sino ao terminar.
  const [refreshing,setRefreshing]=useState(false);
  const [refreshKey,setRefreshKey]=useState(0);
  async function pullRefresh(){
    if(refreshing)return;
    setRefreshing(true);
    try{await refresh();}
    catch(e){console.warn(e);}
    finally{setRefreshing(false);setRefreshKey(k=>k+1);}
  }
  // Estado otimista do concluir/reabrir: a caixa muda na hora e a tarefa só sai da lista depois
  // que o pop e o risco terminam (COMPLETE_SETTLE); a chave some quando o banco já foi atualizado.
  const [flipped,setFlipped]=useState<Record<number,boolean>>({});
  const layoutAnim=motionOn?LinearTransition.springify().damping(20).stiffness(220):undefined;
  const exitAnim=motionOn?FadeOut.duration(150):undefined;
  // Entrada escalonada só na primeira carga: os primeiros cartões sobem um a um. Depois disso, cartão novo
  // (tarefa criada, ou que mudou de seção) só aparece com um fade rápido. Trocar de aba ou recarregar
  // não remonta nada, então nada repete.
  const firstLoad=useRef(true);
  React.useEffect(()=>{
    if(!tasks.length)return;
    const timer=setTimeout(()=>{firstLoad.current=false;},1200);
    return()=>clearTimeout(timer);
  },[tasks.length>0]);
  let enterIndex=0;
  /** Cartão dentro de um container animado: entra com fade, e os de baixo deslizam para fechar o buraco quando um sai. */
  const motionWrap=(id:number,node:React.ReactNode)=>{
    const index=enterIndex++;
    const enter=motionOn?FadeInDown.duration(260).delay(firstLoad.current?Math.min(index,7)*STAGGER:0):undefined;
    return <Reanimated.View key={id} entering={enter} layout={layoutAnim} exiting={exitAnim}>{node}</Reanimated.View>;
  };
  const router=useRouter();
  const insets=useSafeAreaInsets();
  const refresh=useCallback(async()=>{await archiveOldCompletedTasks();const all=await listTasks();setTasks(all);setVisibleTaskCount(50);setNow(Date.now());},[]);
  React.useEffect(()=>{
    const pull=()=>{
      const id=takePendingHighlight();
      if(id===null)return;
      setHighlightRequest({id,loaded:false});
      // Recarrega antes de procurar: o toque pode ter vindo logo após uma mudança no widget.
      refresh().catch(console.warn).finally(()=>setHighlightRequest(r=>r&&r.id===id?{...r,loaded:true}:r));
    };
    pull();
    const off=onHighlightRequest(pull);
    return()=>{off();if(highlightTimer.current)clearTimeout(highlightTimer.current);};
  },[refresh]);
  useFocusEffect(useCallback(()=>{
    opening.current=false;
    refresh().catch(console.warn);
    getPreferences().then(p=>setPersonality(p.personality)).catch(console.warn);
    const sub=AppState.addEventListener('change',state=>{if(state==='active')refresh().catch(console.warn);});
    const interval=setInterval(()=>setNow(Date.now()),30000);
    return ()=>{sub.remove();clearInterval(interval);};
  },[refresh]));
  function openCreate(){
    // Um toque só: evita abrir duas telas de criação com toque duplo.
    if(opening.current)return;
    opening.current=true;
    if(tabs[pageRef.current]==='calendar')router.push({pathname:'/edit',params:{date:localDay(calendarDay)}});
    // Com o filtro "Eventos" ativo em Tarefas, o + já abre o editor em modo evento.
    else if(tabs[pageRef.current]==='tasks'&&taskCategoryFilter==='event')router.push({pathname:'/edit',params:{kind:'event'}});
    else router.push('/edit');
  }
  const filteredTasks=tasks.filter(t=>!t.parent_id&&(taskCategoryFilter==='all'||(taskCategoryFilter==='event'?t.kind==='event':t.category===taskCategoryFilter)));
  const pageArgs=():[TaskCategory|undefined,'event'|undefined]=>taskCategoryFilter==='all'?[undefined,undefined]:taskCategoryFilter==='event'?[undefined,'event']:[taskCategoryFilter,undefined];
  const [filteredPage,setFilteredPage]=useState<Task[]>([]);
  React.useEffect(()=>{let active=true;listTaskPage(50,0,...pageArgs()).then(rows=>{if(active){setFilteredPage(rows);setVisibleTaskCount(50);}}).catch(console.warn);return()=>{active=false;};},[taskCategoryFilter,tasks]);
  async function loadMoreTasks(){if(loadingPage)return;setLoadingPage(true);try{const rows=await listTaskPage(50,filteredPage.filter(t=>!t.parent_id).length,...pageArgs());setFilteredPage(old=>[...old,...rows]);setVisibleTaskCount(n=>n+rows.filter(t=>!t.parent_id).length);}catch(e){setFeedback({title:'Erro ao carregar tarefas',message:String(e)});}finally{setLoadingPage(false);}}
  // Eventos não entram nas contas de pendentes/atrasadas: ficam na AGENDA.
  const roots=tasks.filter(t=>!t.parent_id&&t.kind!=='event');
  const pending=roots.filter(t=>!t.completed);
  // Tarefas sem data nunca ficam atrasadas nem contam como "pra hoje"; aparecem no radar.
  const overdue=pending.filter(t=>!t.daily&&!t.no_due&&t.due_at<now).sort((a,b)=>a.due_at-b.due_at||a.id-b.id);
  // Radar = o que ainda vem hoje: rotinas, tarefas sem data e as que vencem mais tarde hoje.
  // Tarefas de outros dias ficam em Tarefas e no Calendário.
  const isToday=(ms:number)=>new Date(ms).toDateString()===new Date(now).toDateString();
  const upcoming=sortTasks(pending.filter(t=>t.daily||t.no_due||(t.due_at>=now&&isToday(t.due_at))));
  const agenda=tasks.filter(t=>!t.parent_id&&t.kind==='event'&&isToday(t.due_at)).sort((a,b)=>a.due_at-b.due_at||a.id-b.id);
  const today=pending.filter(t=>t.daily||(!t.no_due&&new Date(t.due_at).toDateString()===new Date(now).toDateString()));
  const todayAhead=today.filter(t=>!overdue.includes(t));
  const completedToday=roots.filter(t=>!!t.completed&&t.completed_at!=null&&new Date(t.completed_at).toDateString()===new Date(now).toDateString())
    .sort((a,b)=>(b.completed_at??0)-(a.completed_at??0));
  async function toggle(t:Task){
    if(t.id in flipped)return;
    const next=!t.completed;
    setFlipped(m=>({...m,[t.id]:next}));
    if(next)setCompleteKey(k=>k+1);
    try{
      // A gravação corre junto com a animação do check (antes era uma depois da outra).
      const write=completeTask(t.id,next,true);
      if(motionOn)await Promise.all([write,new Promise<void>(resolve=>setTimeout(resolve,COMPLETE_SETTLE))]);
      else await write;
      // Atualiza a lista na hora, sem esperar a releitura do banco; a releitura vem logo depois e corrige o resto.
      const at=next?Date.now():null;
      setTasks(old=>old.map(x=>x.id===t.id||(!t.parent_id&&x.parent_id===t.id)?{...x,completed:next?1:0,completed_at:at}:x));
      refresh().catch(e=>console.warn('[home] refresh failed',e));
    }
    catch(e){setFeedback({title:'Não deu certo.',message:String(e)});}
    finally{setFlipped(m=>{const {[t.id]:_gone,...rest}=m;return rest;});}
  }
  function remove(t:Task){setDeleteTarget(t);}
  async function confirmDelete(){
    if(!deleteTarget||busyDelete)return;
    setBusyDelete(true);
    try{await deleteTask(deleteTarget.id);setDeleteTarget(null);await refresh();}
    catch(e){setDeleteTarget(null);setFeedback({title:'Não foi possível excluir.',message:String(e)});}
    finally{setBusyDelete(false);}
  }
  /** Cartões das tarefas principais na ordem dada, cada uma seguida das suas subtarefas (buscadas em `pool`). */
  function groupedCards(parents:Task[],pool:Task[]=tasks,ctx:CardContext={}){return parents.filter(t=>!t.parent_id).flatMap(parent=>[card(parent,ctx),...pool.filter(child=>child.parent_id===parent.id).map(child=>card(child,ctx))]);}
  /**
   * Cartão de tarefa enxuto: um só sinal por cartão. Atraso = caixa e horário em vermelho
   * (a seção já diz "passou da hora"); prioridade como o traço colorido do Calendário; o assunto
   * "Geral" (o padrão) não aparece; a data some quando a seção já é daquele dia.
   */
  function card(t:Task,ctx:CardContext={}){
    if(t.parent_id)return subCard(t);
    const lit=!!highlight&&highlight.id===t.id&&highlight.page===ctx.page;
    // Destaque vindo da notificação/widget: o retângulo acende e três ondas de sonar saem da caixa de concluir.
    const glow=lit?<><Animated.View pointerEvents="none" style={[s.highlight,{opacity:highlightAnim}]}/><SonarPing color={c.accent}/></>:null;
    if(t.kind==='event'){
      const event=<EventCard key={t.id} task={t} now={now} colors={c} appearance={appearance} onPress={()=>router.push({pathname:'/edit',params:{id:String(t.id)}})} onLongPress={()=>remove(t)}/>;
      return motionWrap(t.id,lit?<View ref={highlightRef}>{glow}{event}</View>:event);
    }
    const done=flipped[t.id]??!!t.completed;
    const late=!done&&!t.daily&&!t.no_due&&t.due_at<now;
    const topic=categoryColors[appearance][t.category]??categoryColors[appearance].general;
    const when=t.daily?(t.no_due?'↻ '+recurrenceLabel(taskRecurrence(t)):'↻ '+recurrenceLabel(taskRecurrence(t))+' · '+hhmm(t.due_at))
      :t.no_due?(ctx.dayKnown?'':'Sem data')
      :late?`${isToday(t.due_at)?hhmm(t.due_at):shortDay(t.due_at)} · ${ago(t.due_at,now)}`
      :ctx.dayKnown?hhmm(t.due_at):formatDate(t.due_at);
    const showTopic=t.category!=='general'&&!!categories[t.category];
    return motionWrap(t.id,<Pressable ref={lit?highlightRef:undefined} style={s.task} onPress={()=>router.push({pathname:'/edit',params:{id:String(t.id)}})} onLongPress={()=>remove(t)}>
      {glow}
      <AnimatedCheck checked={done} onPress={()=>toggle(t)} accessibilityLabel={done?'Marcar como pendente':'Concluir tarefa'} plusColor={c.accent} boxStyle={[s.check,late?{borderColor:c.danger}:undefined,done?s.checked:undefined]} markStyle={s.checkText}/>
      <View style={{flex:1,gap:4}}>
        <TaskTitle key={`${t.id}-${done}`} title={t.title} completed={done} colors={c}/>
        {t.description?.trim()?<Text style={s.taskDescription} numberOfLines={2}>{t.description.trim()}</Text>:null}
        {showTopic||when?<Text style={s.meta} numberOfLines={1}>
          {showTopic?<Text style={{color:topic.text,fontWeight:'700'}}>{categories[t.category]}{when?' · ':''}</Text>:null}
          {when?<Text style={late?{color:c.danger,fontWeight:'700'}:undefined}>{when}</Text>:null}
        </Text>:null}
      </View>
      <View accessibilityLabel={`Urgência ${({low:'baixa',medium:'média',high:'alta'} as const)[t.priority]}`} style={[s.priorityLine,{backgroundColor:priorityColors[t.priority]}]}/>
    </Pressable>);
  }
  /**
   * Subtarefa em linha compacta: herda assunto, data e urgência da principal, então
   * mostra só a caixa e o título, recuada e sem fundo próprio (antes ficava espremida).
   */
  function subCard(t:Task){
    const done=flipped[t.id]??!!t.completed;
    return motionWrap(t.id,<Pressable style={s.subTask} onPress={()=>router.push({pathname:'/edit',params:{id:String(t.id)}})} onLongPress={()=>remove(t)}>
      <AnimatedCheck checked={done} onPress={()=>toggle(t)} accessibilityLabel={done?'Marcar como pendente':'Concluir tarefa'} plusColor={c.accent} boxStyle={[s.check,s.subCheck,done?s.checked:undefined]} markStyle={[s.checkText,{fontSize:13}]}/>
      <View style={{flex:1}}>
        <TaskTitle key={`${t.id}-${done}`} title={t.title} completed={done} colors={c} style={{fontSize:15,fontWeight:'600'}}/>
      </View>
    </Pressable>);
  }
  const empty=(message:string)=><Text style={s.empty}>{message}</Text>;
  /** Título de seção discreto: rótulo cinza + contagem, sem linha. Só "passou da hora" ganha cor. */
  const sectionHead=(label:string,count:number,color?:string,first?:boolean)=><View style={[s.sectionHead,first?{marginTop:12}:undefined]}>
    <Text style={[s.section,color?{color}:undefined]}>{label}<Text style={s.sectionCount}>{'  ·  '+count}</Text></Text>
  </View>;
  const routineCount=tasks.filter(t=>t.daily&&!t.parent_id).length;
  const todayKey='d'+localDay(new Date(now));
  const taskSections=sectionTasks(filteredPage.filter(t=>!t.parent_id),now);
  // Concluídas hoje ficam dentro do bloco Hoje; concluídas de outros dias (se houver) vão para o fim.
  const doneAll=taskSections.find(x=>x.key==='done')?.tasks??[];
  const doneToday=doneAll.filter(t=>t.completed_at!=null&&isToday(t.completed_at));
  const todayBlock=[
    ...taskSections.filter(x=>x.key==='daily'||x.key==='overdue'||x.key===todayKey).map(x=>x.key===todayKey?{...x,label:'AINDA HOJE'}:x),
    ...(doneToday.length?[{key:'doneToday',label:'CONCLUÍDAS HOJE',tasks:doneToday}]:[]),
  ];
  const laterBlock=taskSections.filter(x=>x.key!=='done'&&!todayBlock.some(y=>y.key===x.key));
  const doneOlder=doneAll.filter(t=>!doneToday.includes(t));
  const doneBlock=doneOlder.length?[{key:'done',label:'CONCLUÍDAS',tasks:doneOlder}]:[];
  const sectionGroup=(section:{key:string;label:string;tasks:Task[]},first:boolean)=><React.Fragment key={section.key}>
    {sectionHead(section.label,section.tasks.length,section.key==='overdue'?c.danger:undefined,first)}
    {groupedCards(section.tasks,filteredPage,{dayKnown:/^d\d/.test(section.key),page:'tasks'})}
  </React.Fragment>;
  const homeHasPending=overdue.length+agenda.length+upcoming.length>0;
  // "Dia em branco": nada pendente e nada concluído. Aí o + convida a criar a primeira tarefa.
  const dayBlank=!homeHasPending&&completedToday.length===0;
  // Comemoração (confete + post-it balançando): toda vez que o dia é zerado. Ao ver alguma tarefa
  // pendente em Hoje, a comemoração é "rearmada"; ao zerar de novo (concluiu uma nova, ou reabriu e
  // concluiu a mesma), solta outra vez. Fica salva no banco com o dia, então trocar de aba ou reabrir
  // o app sem nada novo não repete. Se zerar fora da aba Hoje (widget, notificação, Tarefas),
  // comemora na próxima vez que ela abrir. Eventos não contam: não têm o que concluir.
  const tasksPending=overdue.length+upcoming.length>0;
  const allDone=!tasksPending&&completedToday.length>0;
  const dayStamp=localDay(new Date(now));
  const celebrated=useRef<string|null>(null);
  const [celebratedLoaded,setCelebratedLoaded]=useState(false);
  React.useEffect(()=>{getMeta('celebratedAllDone').then(v=>{celebrated.current=v;}).catch(()=>{}).finally(()=>setCelebratedLoaded(true));},[]);
  React.useEffect(()=>{
    if(!celebratedLoaded)return;
    if(tasksPending){
      // Voltou a ter o que fazer: a próxima vez que zerar merece confete.
      if(celebrated.current){celebrated.current='';setMeta('celebratedAllDone','').catch(console.warn);}
      return;
    }
    if(tab!=='home'||!allDone||celebrated.current===dayStamp)return;
    celebrated.current=dayStamp;
    setMeta('celebratedAllDone',dayStamp).catch(console.warn);
    setConfettiKey(k=>k+1);
  },[tab,tasksPending,allDone,dayStamp,celebratedLoaded]);
  React.useEffect(()=>{
    if(!highlightRequest)return;
    const found=tasks.find(t=>t.id===highlightRequest.id);
    if(!found){
      // Tarefa apagada/arquivada: só leva para a aba Hoje.
      if(highlightRequest.loaded){setHighlightRequest(null);goToTab('home');}
      return;
    }
    const root=found.parent_id?tasks.find(t=>t.id===found.parent_id)??found:found;
    const onHome=[...overdue,...agenda,...upcoming.slice(0,8)].some(t=>t.id===root.id);
    const doneHome=completedToday.some(t=>t.id===root.id);
    const page:Tab=onHome||doneHome?'home':'tasks';
    if(doneHome)setShowDone(true);
    if(page==='tasks')setTaskCategoryFilter('all');
    setHighlightRequest(null);
    setHighlight({id:root.id,page});
    goToTab(page);
    if(highlightTimer.current)clearTimeout(highlightTimer.current);
    // Espera a troca de aba e o desenho do cartão para medir, rolar e piscar.
    highlightTimer.current=setTimeout(()=>{
      highlightRef.current?.measureInWindow((_x:number,y:number)=>{
        const target=scrollY.current[page]+y-Dimensions.get('window').height*0.35;
        scrollRefs.current[page]?.scrollTo({y:Math.max(0,target),animated:true});
      });
      highlightAnim.setValue(0);
      Animated.sequence([
        Animated.delay(250),
        Animated.timing(highlightAnim,{toValue:1,duration:180,useNativeDriver:true}),
        Animated.timing(highlightAnim,{toValue:0.35,duration:260,useNativeDriver:true}),
        Animated.timing(highlightAnim,{toValue:1,duration:260,useNativeDriver:true}),
        Animated.delay(600),
        Animated.timing(highlightAnim,{toValue:0,duration:700,useNativeDriver:true}),
      ]).start(()=>setHighlight(h=>h&&h.id===root.id?null:h));
    },450);
  },[highlightRequest,tasks]);
  return <View style={s.root} onTouchStart={e=>noteTouch(e.nativeEvent.pageX,e.nativeEvent.pageY)} onTouchMove={e=>noteTouch(e.nativeEvent.pageX,e.nativeEvent.pageY)}>
    <PingDialog visible={!!deleteTarget} eyebrow="PING / EXCLUSÃO" title="Vai apagar mesmo?" message={deleteTarget?`“${deleteTarget.title}” será excluída de vez. Essa ação não pode ser desfeita.`:undefined} confirmLabel="EXCLUIR" cancelLabel="MANTER" destructive busy={busyDelete} onClose={()=>{if(!busyDelete)setDeleteTarget(null);}} onConfirm={confirmDelete}/>
    <PingDialog visible={!!feedback} eyebrow="PING / OPS" title={feedback?.title??''} message={feedback?.message} confirmLabel="FECHAR" onClose={()=>setFeedback(null)} onConfirm={()=>setFeedback(null)}/>
    <StatusBar barStyle={isDarkAppearance(appearance)?"light-content":"dark-content"}/>
    <Animated.ScrollView ref={pager} horizontal pagingEnabled directionalLockEnabled showsHorizontalScrollIndicator={false} scrollEnabled={!filtersTouched}
      style={{flex:1}} keyboardShouldPersistTaps="handled" scrollEventThrottle={16}
      onScroll={Animated.event([{nativeEvent:{contentOffset:{x:horizontalX}}}],{useNativeDriver:true,listener:(event:any)=>{const width=pageWidthRef.current;if(width>0)pageRef.current=Math.max(0,Math.min(tabs.length-1,Math.round(event.nativeEvent.contentOffset.x/width)));}})}
      onLayout={event=>{const width=event.nativeEvent.layout.width;if(width>0&&width!==pageWidth){setPageWidth(width);pageWidthRef.current=width;pager.current?.scrollTo({x:tabs.indexOf(tab)*width,animated:false});}}}
      onMomentumScrollEnd={event=>{const index=Math.max(0,Math.min(tabs.length-1,Math.round(event.nativeEvent.contentOffset.x/pageWidth)));pageRef.current=index;setTab(tabs[index]);}}
    >
      {tabs.map((page,index)=><View key={page} style={{width:pageWidth,flex:1}}>
      <Animated.ScrollView ref={(el:any)=>{scrollRefs.current[page]=el;}} showsVerticalScrollIndicator={false} style={{flex:1}} contentContainerStyle={[s.container,{paddingTop:insets.top+89}]} keyboardShouldPersistTaps="handled" scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={pullRefresh} colors={[c.accent]} tintColor={c.accent} progressBackgroundColor={c.surfaceRaised} progressViewOffset={insets.top+60}/>}
        onScroll={Animated.event([{nativeEvent:{contentOffset:{y:verticalY[page]}}}],{useNativeDriver:true,listener:(event:any)=>{scrollY.current[page]=event.nativeEvent.contentOffset.y;}})}>

      <>
      <Text style={s.eyebrow}>{greetings[(new Date(now).getDay()+6)%7]}  /  {new Date(now).toLocaleDateString('pt-BR',{day:'2-digit',month:'long'}).toUpperCase()}</Text>
      {page==='home'?<Text style={s.heading}>{'Seu dia.\nSem desculpas.'}</Text>:page==='calendar'?<Text style={s.heading}>{'Seu tempo.\nSeu ritmo.'}</Text>:null}
      {page==='home'?<>
        <SummaryNote appearance={appearance} page={c.background} left={overdue.length+todayAhead.length} overdue={overdue.length} today={todayAhead.length} done={completedToday.length} celebrateKey={confettiKey} personality={personality} active={tab==='home'} completeKey={completeKey} refreshKey={refreshKey}/>
        <RewardsBar colors={c} refreshKey={tasks}/>
        {/* Ordem de urgência: atrasadas → agenda → radar. Seções vazias não aparecem. */}
        {overdue.length?<><AttentionPulse active={tab==='home'}>{sectionHead('PASSOU DA HORA',overdue.length,c.danger)}</AttentionPulse>{groupedCards(overdue,tasks,{page:'home'})}</>:null}
        {agenda.length?<>{sectionHead('AGENDA DE HOJE',agenda.length)}{groupedCards(agenda,tasks,{dayKnown:true,page:'home'})}</>:null}
        {upcoming.length?<>{sectionHead('NO RADAR',upcoming.length)}{groupedCards(upcoming.slice(0,8),tasks,{dayKnown:true,page:'home'})}</>:null}
        {!homeHasPending?empty(completedToday.length?'Tudo feito por hoje. Que paz suspeita.':'Nada pra hoje. Toque no + para criar uma tarefa.'):null}
        {completedToday.length?<>
          <Pressable accessibilityRole="button" accessibilityState={{expanded:showDone}} onPress={()=>setShowDone(v=>!v)} style={s.doneToggle}>
            <Text style={s.doneToggleText}>✓  {completedToday.length} {completedToday.length===1?'concluída':'concluídas'} hoje</Text>
            <Text style={s.doneToggleText}>{showDone?'⌃':'⌄'}</Text>
          </Pressable>
          {showDone?groupedCards(completedToday,tasks,{page:'home'}):null}
        </>:null}
      </>:page==='calendar'?<CalendarScreen active={tab==='calendar'} refreshKey={tasks} selected={calendarDay} onSelect={setCalendarDay}/>:<>
        {/* Rotinas ganham uma linha própria e sempre visível, antes dos filtros. */}
        <Pressable accessibilityRole="button" accessibilityLabel="Abrir minhas rotinas" onPress={()=>router.push('/routines')} style={s.routinesRow}>
          <Text style={s.routinesTitle}>↻  Minhas rotinas</Text>
          <Text style={s.routinesSub}>{routineCount?`${routineCount} ${routineCount===1?'ativa':'ativas'}  ›`:'criar  ›'}</Text>
        </Pressable>
        <View style={s.filters}><ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={{flexDirection:'row',alignItems:'center',gap:4,paddingVertical:2,paddingRight:4}}
          onTouchStart={()=>setFiltersTouched(true)} onTouchEnd={()=>setFiltersTouched(false)} onTouchCancel={()=>setFiltersTouched(false)} onScrollEndDrag={()=>setFiltersTouched(false)}>{([{key:'all',label:'Todas'},{key:'event',label:'Eventos'},...Object.entries(categories).map(([key,label])=>({key,label}))] as {key:'all'|'event'|TaskCategory;label:string}[]).map(item=>{const active=taskCategoryFilter===item.key;const topic=item.key==='all'?{text:c.accent,surface:c.accentSoft}:item.key==='event'?{text:c.event,surface:c.surfaceRaised}:categoryColors[appearance][item.key];return <Pressable key={item.key} accessibilityRole="button" accessibilityState={{selected:active}} onPress={()=>{setTaskCategoryFilter(item.key);setVisibleTaskCount(50);}} style={[s.chip,active?{backgroundColor:topic.surface}:undefined]}><Text style={[s.chipText,active?{color:topic.text}:undefined]}>{item.label}{active&&item.key==='all'?'  '+filteredTasks.length:''}</Text></Pressable>;})}
        </ScrollView></View>
        {filteredTasks.length?<>
          {/* Bloco "Hoje" (rotinas, atrasadas e o que vence hoje) separado do que vem depois. */}
          <View style={s.block}>
            <Text style={s.blockTitle}>Hoje<Text style={s.blockCount}>{'  '+todayBlock.filter(x=>x.key!=='doneToday').reduce((n,x)=>n+x.tasks.length,0)}</Text></Text>
            {todayBlock.length?todayBlock.map((section,i)=>sectionGroup(section,i===0)):<Text style={[s.empty,{paddingVertical:10}]}>Nada pra hoje neste filtro.</Text>}
          </View>
          {laterBlock.length?<>
            <Text style={[s.blockTitle,{marginTop:34}]}>Próximos<Text style={s.blockCount}>{'  '+laterBlock.reduce((n,x)=>n+x.tasks.length,0)}</Text></Text>
            {laterBlock.map((section,i)=>sectionGroup(section,i===0))}
          </>:null}
          {doneBlock.map(section=>sectionGroup(section,false))}
        </>:empty(taskCategoryFilter==='all'?'Ainda não tem nada aqui. Crie sua primeira tarefa.':taskCategoryFilter==='event'?'Nenhum evento marcado. Toque no + e escolha Evento.':'Nenhuma tarefa neste tópico.')}
      </>}
      {page==='tasks'&&filteredTasks.length>visibleTaskCount?<Pressable accessibilityRole="button" onPress={loadMoreTasks} style={{backgroundColor:c.surface,borderRadius:9,padding:16,alignItems:'center',marginTop:20}}><Text style={{color:c.accent,fontWeight:'800'}}>{loadingPage?'CARREGANDO...':`CARREGAR MAIS (${filteredTasks.length-visibleTaskCount} RESTANTES)`}</Text></Pressable>:null}
      </>
      </Animated.ScrollView>
      <Animated.View pointerEvents="box-none" style={[s.sharedBrand,{
        top:insets.top+18,
        transform:[
          {translateX:Animated.subtract(horizontalX,index*pageWidth)},
          {translateY:verticalY[page].interpolate({inputRange:[0,110],outputRange:[0,-110],extrapolate:'clamp'})}
        ],
        opacity:Animated.multiply(
          verticalY[page].interpolate({inputRange:[0,45,75],outputRange:[1,1,0],extrapolate:'clamp'}),
          horizontalX.interpolate({
            inputRange:[(index-1)*pageWidth,index*pageWidth,(index+1)*pageWidth],
            outputRange:[0,1,0],extrapolate:'clamp'
          })
        )
      }]}>
        <View style={s.brand}><View style={s.brandMark}><Text style={s.brandMarkText}>!</Text></View><Text style={s.brandName}>ping<Text style={{color:c.accent}}>.</Text></Text><View style={{flex:1}}/><Pressable accessibilityRole="button" accessibilityLabel="Abrir ajustes" onPress={()=>router.push("/settings")} style={s.settingsButton}><Text style={s.settingsIcon}>⚙</Text></Pressable>
          <View pointerEvents="none" style={s.brandCaptionWrap}><Text style={s.brandCaption}>FAÇA ACONTECER</Text></View>
        </View>
      </Animated.View>
      </View>)}
    </Animated.ScrollView>
    <AnimatedFab accessibilityLabel={tab==='calendar'?'Criar tarefa em '+calendarDay.toLocaleDateString('pt-BR',{day:'numeric',month:'long'}):'Criar tarefa'} style={[s.add,{bottom:91+insets.bottom}]} onPress={openCreate} invite={tab==='home'&&dayBlank}><Text style={s.plus}>+</Text></AnimatedFab>
    <View style={[s.nav,{paddingBottom:insets.bottom,height:75+insets.bottom}]}>{(['home','tasks','calendar'] as const).map((key,i)=><Pressable key={key} style={[s.navItem,tab===key&&s.navSelected]} onPress={()=>goToTab(key)}>
      <Text style={[s.navText,tab===key&&s.navActive]}>{['HOJE','TAREFAS','CALENDÁRIO'][i]}</Text>
      {/* O ponto acompanha o pager em tempo real: cresce sob a aba que chega e encolhe sob a que sai. */}
      <Animated.View style={[s.dot,{
        opacity:horizontalX.interpolate({inputRange:[(i-1)*pageWidth,i*pageWidth,(i+1)*pageWidth],outputRange:[0,1,0],extrapolate:'clamp'}),
        transform:[{scaleX:horizontalX.interpolate({inputRange:[(i-1)*pageWidth,i*pageWidth,(i+1)*pageWidth],outputRange:[0.2,1,0.2],extrapolate:'clamp'})}],
      }]}/>
    </Pressable>)}</View>
    <Confetti fireKey={confettiKey} colors={[c.accent,c.event,c.warning,c.danger,'#A9B8FF','#7DDCC7','#FFAD91']}/>
  </View>;
}
const createStyles=(c:ThemeColors)=>StyleSheet.create({
  root:{flex:1,backgroundColor:c.background},container:{paddingHorizontal:23,paddingTop:18,paddingBottom:140},
  sharedBrand:{position:'absolute',left:23,right:23,zIndex:2},
  brand:{flexDirection:'row',alignItems:'center',marginBottom:43,gap:9},brandMark:{width:28,height:28,borderRadius:7,backgroundColor:c.accent,alignItems:'center',justifyContent:'center',transform:[{rotate:'-9deg'}]},
  brandMarkText:{fontSize:21,fontWeight:'900',color:c.background},brandName:{color:c.text,fontSize:25,fontWeight:'900',letterSpacing:-1.5},
  brandCaptionWrap:{position:'absolute',left:0,right:0,top:0,bottom:0,alignItems:'center',justifyContent:'center'},
  brandCaption:{color:c.muted,fontSize:9,fontWeight:'800',letterSpacing:1.3},
  settingsButton:{width:38,height:38,borderRadius:10,backgroundColor:c.surface,alignItems:'center',justifyContent:'center',marginLeft:5},
  settingsIcon:{color:c.accent,fontSize:23,fontWeight:'700'},
  eyebrow:{color:c.accent,fontSize:10,fontWeight:'900',letterSpacing:2.5,marginBottom:13},
  heading:{color:c.text,fontSize:30,fontWeight:'900',lineHeight:33,letterSpacing:-1.4,marginBottom:14},
  sectionHead:{marginTop:26,marginBottom:2},
  section:{color:c.muted,fontSize:11,fontWeight:'800',letterSpacing:1.3},sectionCount:{fontWeight:'600'},
  task:{paddingVertical:12,flexDirection:'row',alignItems:'center',gap:14},
  check:{width:27,height:27,borderRadius:6,borderWidth:2,borderColor:c.muted,alignItems:'center',justifyContent:'center'},
  subTask:{flexDirection:'row',alignItems:'center',gap:12,marginLeft:13,paddingLeft:28,paddingRight:4,paddingVertical:8,borderLeftWidth:2,borderLeftColor:c.accentSoft},
  subCheck:{width:22,height:22,borderRadius:5},
  checked:{backgroundColor:c.accent,borderColor:c.accent},checkText:{color:c.background,fontWeight:'900',fontSize:16},
  taskTitle:{color:c.text,fontSize:17,fontWeight:'700',letterSpacing:-0.3},
  taskDescription:{color:c.muted,fontSize:13,lineHeight:18},
  meta:{color:c.muted,fontSize:12},
  priorityLine:{width:26,height:5,borderRadius:3},
  highlight:{position:'absolute',left:-10,right:-10,top:2,bottom:2,borderRadius:12,backgroundColor:c.accentSoft,borderWidth:1.5,borderColor:c.accent},
  empty:{color:c.muted,paddingVertical:23,fontSize:13,lineHeight:20},
  filters:{marginTop:4,marginHorizontal:-8},
  chip:{paddingHorizontal:12,paddingVertical:7,borderRadius:999},
  chipText:{color:c.muted,fontSize:13,fontWeight:'700'},
  routinesRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:10,paddingVertical:9,paddingHorizontal:12,borderRadius:10,backgroundColor:c.accentSoft},
  routinesTitle:{color:c.accent,fontSize:13,fontWeight:'800'},
  routinesSub:{color:c.accent,fontSize:12,fontWeight:'700'},
  block:{marginTop:18,marginHorizontal:-8,paddingHorizontal:16,paddingTop:18,paddingBottom:12,borderRadius:16,backgroundColor:c.surface},
  blockTitle:{color:c.text,fontSize:22,fontWeight:'900',letterSpacing:-0.6,marginBottom:2},
  blockCount:{color:c.muted,fontSize:15,fontWeight:'700'},
  doneToggle:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:26,paddingVertical:12,paddingHorizontal:14,borderRadius:10,backgroundColor:c.surface},
  doneToggleText:{color:c.muted,fontSize:13,fontWeight:'700'},
  add:{position:'absolute',bottom:91,right:23,backgroundColor:c.accent,height:61,width:61,borderRadius:12,alignItems:'center',justifyContent:'center',elevation:7},
  plus:{color:c.background,fontSize:38,fontWeight:'500',lineHeight:47},
  nav:{height:75,backgroundColor:c.surface,flexDirection:'row',paddingHorizontal:12},
  navItem:{flex:1,alignItems:'center',justifyContent:'center',gap:7},navSelected:{},navText:{color:c.muted,fontSize:9,fontWeight:'900',letterSpacing:0.7},
  navActive:{color:c.accent},dot:{width:16,height:3,borderRadius:3,backgroundColor:c.accent},
});

