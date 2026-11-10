import React,{useEffect,useMemo,useRef,useState} from 'react';
import {View,Text,Pressable,ActivityIndicator,StyleSheet} from 'react-native';
import {useRouter} from 'expo-router';
import {CalendarDaySummary,CalendarEntry,CalendarSubtask,listCalendarDay,listCalendarMonth,completeTask} from '../store';
import {useAppTheme,ThemeColors,priorityColors} from '../theme';
import {categories} from '../templates';
import {TaskTitle} from './TaskTitle';
import {EventCard} from './EventCard';

const key=(d:Date)=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const bounds=(d:Date)=>{const start=new Date(d.getFullYear(),d.getMonth(),d.getDate());const end=new Date(start);end.setDate(end.getDate()+1);return [start.getTime(),end.getTime()] as const;};
const WEEK=['D','S','T','Q','Q','S','S'];

/**
 * Calendário mensal leve: um resumo por dia (bolinha) e a lista do dia escolhido.
 * O cabeçalho da aba fica com a tela principal; aqui é só o mês e o dia.
 * `refreshKey` muda sempre que a lista de tarefas do app recarrega, o que limpa os caches.
 * O dia escolhido mora na tela principal, para o botão + criar a tarefa nesse dia.
 */
export function CalendarScreen({active,refreshKey,selected,onSelect}:{active:boolean;refreshKey?:unknown;selected:Date;onSelect:(day:Date)=>void}){
  const {colors:c,appearance}=useAppTheme();
  const s=useMemo(()=>createStyles(c),[c]);
  const router=useRouter();
  const [revision,setRevision]=useState(0);
  const [summaries,setSummaries]=useState<CalendarDaySummary[]>([]);
  const [entries,setEntries]=useState<CalendarEntry[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const monthCache=useRef(new Map<string,CalendarDaySummary[]>());
  const dayCache=useRef(new Map<string,CalendarEntry[]>());
  const monthRequest=useRef(0),dayRequest=useRef(0);
  const monthId=`${selected.getFullYear()}-${selected.getMonth()}`;
  const dayId=key(selected);
  const todayId=key(new Date());
  const monthStart=useMemo(()=>new Date(selected.getFullYear(),selected.getMonth(),1),[monthId]);
  const monthEnd=useMemo(()=>new Date(selected.getFullYear(),selected.getMonth()+1,1),[monthId]);

  // Qualquer mudança nas tarefas (ou voltar para a aba) invalida o que estava em cache.
  useEffect(()=>{if(!active)return;monthCache.current.clear();dayCache.current.clear();setRevision(x=>x+1);},[active,refreshKey]);

  useEffect(()=>{
    if(!active)return;
    let alive=true;const request=++monthRequest.current;const cached=monthCache.current.get(monthId);
    if(cached){setSummaries(cached);return;}
    listCalendarMonth(monthStart.getTime(),monthEnd.getTime()).then(rows=>{
      if(!alive||request!==monthRequest.current)return;
      monthCache.current.set(monthId,rows);
      if(monthCache.current.size>3)monthCache.current.delete(monthCache.current.keys().next().value!);
      setSummaries(rows);setError('');
    }).catch(e=>{if(alive)setError(String(e));});
    return()=>{alive=false;};
  },[active,monthId,revision]);

  useEffect(()=>{
    if(!active)return;
    let alive=true;const request=++dayRequest.current;const cached=dayCache.current.get(dayId);
    if(cached){setEntries(cached);setLoading(false);return;}
    setLoading(true);
    const [start,end]=bounds(selected);
    listCalendarDay(start,end).then(rows=>{
      if(!alive||request!==dayRequest.current)return;
      dayCache.current.set(dayId,rows);
      if(dayCache.current.size>10)dayCache.current.delete(dayCache.current.keys().next().value!);
      setEntries(rows);setError('');
    }).catch(e=>{if(alive)setError(String(e));}).finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false;};
  },[active,dayId,revision]);

  const changeMonth=(step:number)=>onSelect(new Date(selected.getFullYear(),selected.getMonth()+step,1));
  const first=monthStart.getDay(),count=new Date(selected.getFullYear(),selected.getMonth()+1,0).getDate();
  const cells=Array.from({length:Math.ceil((first+count)/7)*7},(_,i)=>i-first+1);
  const summary=new Map(summaries.map(x=>[x.day,x]));
  const monthLabel=monthStart.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  const taskEntries=entries.filter(e=>!e.event),eventCount=entries.length-taskEntries.length;
  const pendingCount=taskEntries.filter(e=>!e.completed).length;
  const dayMeta=[eventCount?`${eventCount} evento${eventCount===1?'':'s'}`:'',taskEntries.length?`${taskEntries.length} tarefa${taskEntries.length===1?'':'s'} · ${pendingCount} pendente${pendingCount===1?'':'s'}`:''].filter(Boolean).join(' · ');

  async function toggle(entry:CalendarEntry,sub?:CalendarSubtask){
    // Rotina só pode ser marcada no próprio dia; o histórico dos outros dias é só leitura.
    if(entry.routine&&dayId!==todayId)return;
    const target=sub??entry;
    try{await completeTask(target.task.id,!target.completed);monthCache.current.clear();dayCache.current.clear();setRevision(x=>x+1);}
    catch(e){setError(String(e));}
  }

  return <View style={s.root}>
    <View style={s.monthRow}>
      <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" hitSlop={8} onPress={()=>changeMonth(-1)} style={s.arrow}><Text style={s.arrowText}>‹</Text></Pressable>
      <Text style={s.month}>{monthLabel}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Próximo mês" hitSlop={8} onPress={()=>changeMonth(1)} style={s.arrow}><Text style={s.arrowText}>›</Text></Pressable>
    </View>

    <View style={s.grid}>
      {WEEK.map((label,i)=><View key={'w'+i} style={s.weekCell}><Text style={s.weekText}>{label}</Text></View>)}
      {cells.map((d,i)=>{
        const valid=d>0&&d<=count;
        if(!valid)return <View key={i} style={s.cell}/>;
        const date=new Date(selected.getFullYear(),selected.getMonth(),d);const k=key(date);
        const isSelected=k===dayId,isToday=k===todayId;
        const day=summary.get(k);const total=day?.total??0;const events=day?.events??0;const allDone=total>0&&day!.completed===total;
        const label=[total?`${total} tarefa${total===1?'':'s'}`:'',events?`${events} evento${events===1?'':'s'}`:''].filter(Boolean).join(' e ')||'nada marcado';
        return <Pressable key={i} accessibilityRole="button" accessibilityState={{selected:isSelected}} accessibilityLabel={`${d} de ${monthStart.toLocaleDateString('pt-BR',{month:'long'})}, ${label}`} onPress={()=>onSelect(date)} style={[s.cell,isSelected&&s.cellSelected,!isSelected&&isToday&&s.cellToday]}>
          <Text style={[s.dayText,(isSelected||isToday)&&s.dayStrong,isSelected&&{color:c.background}]}>{d}</Text>
          {/* Tarefas: bolinha na cor de realce. Eventos: bolinha azul ao lado. */}
          <View style={s.dots}>
            {total>0?<View style={[s.dot,{backgroundColor:isSelected?c.background:allDone?c.muted:c.accent}]}/>:null}
            {events>0?<View style={[s.dot,{backgroundColor:c.event},isSelected&&{borderWidth:1,borderColor:c.background,width:6,height:6}]}/>:null}
          </View>
        </Pressable>;
      })}
    </View>

    <View style={s.legend}>
      <View style={[s.dot,{backgroundColor:c.accent,marginTop:0}]}/><Text style={s.legendText}>TAREFAS</Text>
      <View style={[s.dot,{backgroundColor:c.event,marginTop:0,marginLeft:10}]}/><Text style={s.legendText}>EVENTOS</Text>
    </View>

    <View style={s.dayHead}>
      <View style={{flex:1}}>
        <Text style={s.dayTitle}>{dayId===todayId?'Hoje, ':''}{selected.toLocaleDateString('pt-BR',{weekday:dayId===todayId?undefined:'long',day:'numeric',month:'long'})}</Text>
        <Text style={s.dayMeta}>{entries.length===0?'Nada marcado':dayMeta}</Text>
      </View>
      {dayId!==todayId?<Pressable accessibilityRole="button" hitSlop={8} onPress={()=>onSelect(new Date())} style={s.todayChip}><Text style={s.todayChipText}>HOJE</Text></Pressable>:null}
    </View>

    {error?<Text style={s.error}>{error}</Text>:null}
    {loading&&!entries.length?<ActivityIndicator color={c.accent} style={{marginTop:18}}/>
    :entries.length===0?<Text style={s.empty}>Dia livre. Toque no + para colocar algo neste dia.</Text>
    :entries.map(entry=>{
      if(entry.event)return <EventCard key={entry.task.id} task={entry.task} now={Date.now()} colors={c} appearance={appearance} onPress={()=>router.push({pathname:'/edit',params:{id:String(entry.task.id)}})}/>;
      const locked=entry.routine&&dayId!==todayId;
      const t=entry.task;
      const time=t.no_due?'Sem horário':new Date(t.due_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
      const subs=entry.subtasks,subsDone=subs.filter(x=>x.completed).length;
      return <View key={t.id}>
      <Pressable onPress={()=>router.push({pathname:'/edit',params:{id:String(t.id)}})} style={s.row}>
        <Pressable accessibilityRole="checkbox" accessibilityLabel={entry.completed?'Marcar como pendente':'Concluir tarefa'} accessibilityState={{checked:entry.completed,disabled:locked}} disabled={locked} hitSlop={8} onPress={()=>toggle(entry)} style={[s.check,entry.completed&&s.checked,locked&&{opacity:0.45}]}>
          <Text style={s.checkText}>{entry.completed?'✓':''}</Text>
        </Pressable>
        <View style={{flex:1,minWidth:0}}>
          <TaskTitle key={`${t.id}-${entry.completed}`} title={t.title} completed={entry.completed} colors={c} numberOfLines={2} style={{fontSize:16,fontWeight:'700',letterSpacing:0}}/>
          <Text style={s.meta}>{entry.routine?'↻ '+time:time} · {categories[t.category]}{subs.length?` · ${subsDone}/${subs.length} subtarefas`:''}</Text>
        </View>
        <View style={[s.priority,{backgroundColor:priorityColors[t.priority]}]}/>
      </Pressable>
      {subs.map(sub=><Pressable key={sub.task.id} onPress={()=>router.push({pathname:'/edit',params:{id:String(sub.task.id)}})} style={s.subRow}>
        <Pressable accessibilityRole="checkbox" accessibilityLabel={sub.completed?'Marcar subtarefa como pendente':'Concluir subtarefa'} accessibilityState={{checked:sub.completed,disabled:locked}} disabled={locked} hitSlop={8} onPress={()=>toggle(entry,sub)} style={[s.check,s.subCheck,sub.completed&&s.checked,locked&&{opacity:0.45}]}>
          <Text style={[s.checkText,{fontSize:12}]}>{sub.completed?'✓':''}</Text>
        </Pressable>
        <View style={{flex:1,minWidth:0}}>
          <TaskTitle key={`${sub.task.id}-${sub.completed}`} title={sub.task.title} completed={sub.completed} colors={c} numberOfLines={2} style={{fontSize:14,fontWeight:'600',letterSpacing:0}}/>
        </View>
      </Pressable>)}
      </View>;
    })}
  </View>;
}

const createStyles=(c:ThemeColors)=>StyleSheet.create({
  root:{paddingBottom:24},
  monthRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:10},
  arrow:{width:40,height:40,borderRadius:10,borderWidth:1,borderColor:c.border,alignItems:'center',justifyContent:'center'},
  arrowText:{color:c.accent,fontSize:24,lineHeight:28,fontWeight:'700'},
  month:{color:c.text,fontWeight:'900',fontSize:17,textTransform:'capitalize'},
  grid:{flexDirection:'row',flexWrap:'wrap',backgroundColor:c.surface,borderRadius:12,borderWidth:1,borderColor:c.border,paddingVertical:8,paddingHorizontal:4},
  weekCell:{width:'14.2857%',alignItems:'center',paddingVertical:6},
  weekText:{color:c.muted,fontWeight:'800',fontSize:11,letterSpacing:1},
  cell:{width:'14.2857%',height:46,alignItems:'center',justifyContent:'center',borderRadius:10},
  cellSelected:{backgroundColor:c.accent},
  cellToday:{borderWidth:1,borderColor:c.accent},
  dayText:{color:c.text,fontWeight:'500',fontSize:14},
  dayStrong:{fontWeight:'900',color:c.accent},
  dots:{flexDirection:'row',gap:3,height:9,alignItems:'center',marginTop:2},
  dot:{width:5,height:5,borderRadius:3},
  legend:{flexDirection:'row',alignItems:'center',gap:5,justifyContent:'flex-end',marginTop:8},
  legendText:{color:c.muted,fontSize:10,fontWeight:'800',letterSpacing:0.8},
  dayHead:{flexDirection:'row',alignItems:'center',gap:10,marginTop:22,marginBottom:2,paddingBottom:6},
  dayTitle:{color:c.text,fontSize:18,fontWeight:'900'},
  dayMeta:{color:c.muted,fontSize:12,marginTop:4},
  todayChip:{borderWidth:1,borderColor:c.border,borderRadius:999,paddingHorizontal:11,paddingVertical:8},
  todayChipText:{color:c.accent,fontSize:11,fontWeight:'900',letterSpacing:0.8},
  error:{color:c.danger,marginVertical:10},
  empty:{color:c.muted,paddingVertical:20,fontSize:14},
  row:{flexDirection:'row',alignItems:'center',gap:13,paddingVertical:12},
  check:{width:24,height:24,borderWidth:2,borderColor:c.muted,borderRadius:6,alignItems:'center',justifyContent:'center'},
  checked:{backgroundColor:c.accent,borderColor:c.accent},
  checkText:{color:c.background,fontWeight:'900',fontSize:14},
  title:{color:c.text,fontSize:16,fontWeight:'700'},
  meta:{color:c.muted,fontSize:12,marginTop:4},
  priority:{width:26,height:5,borderRadius:3},
  subRow:{flexDirection:'row',alignItems:'center',gap:11,marginLeft:11,paddingLeft:24,paddingVertical:7,borderLeftWidth:2,borderLeftColor:c.accentSoft},
  subCheck:{width:20,height:20,borderRadius:5},
});
