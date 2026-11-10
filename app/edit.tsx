import React,{useEffect,useState} from 'react';
import {Text,TextInput,Pressable,ScrollView,StyleSheet,View,Modal} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {getTask,saveTaskGroup,listChildren,ChildInput,eventOffsets} from '../src/store';
import * as Notifications from 'expo-notifications';
import {getPreferences,setPreference} from '../src/preferences';
import {categories,categoryEmoji,TaskCategory,eventAlertOptions} from '../src/templates';
import {useAppTheme,ThemeColors,priorityColors} from '../src/theme';
import {PingDialog,showDialog} from '../src/components/PingDialog';
export default function Edit(){
  const {colors:c}=useAppTheme();
  const s=React.useMemo(()=>createStyles(c),[c]);
  const {id,date,kind:kindParam}=useLocalSearchParams<{id?:string;date?:string;kind?:string}>();
  const router=useRouter();
  const [title,setTitle]=useState('');
  const [children,setChildren]=useState<ChildInput[]>([]);
  const [due,setDue]=useState(new Date(Date.now()+3600000));
  useEffect(()=>{if(id||!date||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date))return;const [year,month,day]=date.split('-').map(Number);setDue(old=>{const next=new Date(year,month-1,day,old.getHours(),old.getMinutes());return next.getFullYear()===year&&next.getMonth()===month-1&&next.getDate()===day?next:old;});},[date,id]);
  const [priority,setPriority]=useState<'low'|'medium'|'high'>('medium');
  const [category,setCategory]=useState<TaskCategory>('general');
  const [completed,setCompleted]=useState(false);
  const [daily,setDaily]=useState(false);
  // "Quando?" é opcional: sem data a tarefa não agenda notificações.
  const [hasDue,setHasDue]=useState(true);
  // Subtarefa não pode ter subtarefas nem virar rotina: só um nível de associação.
  const [isChild,setIsChild]=useState(false);
  // Evento: hora marcada, avisado ANTES; sem tarefas associadas, sem rotina, sem prioridade.
  const [kind,setKind]=useState<'task'|'event'>(kindParam==='event'?'event':'task');
  const isEvent=kind==='event';
  const [location,setLocation]=useState('');
  /** Término do evento em minutos do dia (mesmo dia do início), ou null. */
  const [endMinutes,setEndMinutes]=useState<number|null>(null);
  const [alerts,setAlerts]=useState<number[]>([30]);
  useEffect(()=>{if(!id)getPreferences().then(p=>setAlerts(p.eventAlerts)).catch(console.warn);},[id]);
  const [picker,setPicker]=useState<'date'|'time'|'end'|null>(null);
  const [month,setMonth]=useState(new Date());
  const [hour,setHour]=useState('00');
  const [minute,setMinute]=useState('00');
  function openPicker(mode:'date'|'time'|'end'){
    setMonth(new Date(due.getFullYear(),due.getMonth(),1));
    const base=mode==='end'?(endMinutes??Math.min(23*60+59,due.getHours()*60+due.getMinutes()+60)):due.getHours()*60+due.getMinutes();
    setHour(String(Math.floor(base/60)).padStart(2,'0'));
    setMinute(String(base%60).padStart(2,'0'));
    setPicker(mode);
  }
  function switchKind(next:'task'|'event'){
    if(next===kind)return;
    if(next==='event'&&children.some(child=>child.title.trim())){
      setFeedback({title:'Evento não tem etapas.',message:'Remova as tarefas associadas desta missão antes de transformar em evento.'});return;
    }
    if(next==='event'){setHasDue(true);setDaily(false);setChildren([]);}
    setKind(next);
  }
  function toggleAlert(minutes:number){
    if(alerts.includes(minutes)){setAlerts(old=>old.filter(m=>m!==minutes));return;}
    if(alerts.length>=3){setFeedback({title:'Até 3 avisos.',message:'Tire um dos avisos escolhidos antes de marcar outro.'});return;}
    setAlerts(old=>[...old,minutes].sort((a,b)=>b-a));
  }
  function confirmTime(){
    const h=Number(hour),m=Number(minute);
    if(!/^\d{1,2}$/.test(hour)||!/^\d{1,2}$/.test(minute)||h>23||m>59){
      setFeedback({title:'Horário inválido.',message:'Informe hora de 00 a 23 e minutos de 00 a 59.'});return;
    }
    if(picker==='end'){
      if(h*60+m<=due.getHours()*60+due.getMinutes()){setFeedback({title:'Término antes do início?',message:'O término precisa ser depois do horário de início, no mesmo dia.'});return;}
      setEndMinutes(h*60+m);setPicker(null);return;
    }
    setDue(prev=>{const next=new Date(prev);next.setHours(h,m,0,0);return next;});
    // Mudou o início para depois do término: o término deixa de valer.
    if(endMinutes!==null&&endMinutes<=h*60+m)setEndMinutes(null);
    setPicker(null);
  }
  const [saving,setSaving]=useState(false);
  const [feedback,setFeedback]=useState<{title:string;message:string}|null>(null);
  useEffect(()=>{if(id)getTask(Number(id)).then(t=>{if(t){setTitle(t.title);listChildren(t.id).then(rows=>setChildren(rows.map(row=>({id:row.id,title:row.title})))).catch(console.warn);setDue(new Date(t.due_at));setPriority(t.priority);setCategory(t.category??'general');setCompleted(!!t.completed);setDaily(!!t.daily);setHasDue(!t.no_due);setIsChild(!!t.parent_id);setKind(t.kind==='event'?'event':'task');setLocation(t.location??'');setEndMinutes(t.ends_at?new Date(t.ends_at).getHours()*60+new Date(t.ends_at).getMinutes():null);setAlerts(eventOffsets(t));}}).catch(console.warn);},[id]);
  async function save(){
    if(!title.trim()){setFeedback({title:'Faltou o principal.',message:isEvent?'Dá um nome para esse evento antes de continuar.':'Dá um nome para essa tarefa antes de continuar.'});return;}
    if(saving)return;
    const withDue=isEvent||hasDue;
    let endsAt:number|null=null;
    if(isEvent&&endMinutes!==null){const end=new Date(due);end.setHours(Math.floor(endMinutes/60),endMinutes%60,0,0);endsAt=end.getTime();}
    if(endsAt!==null&&endsAt<=due.getTime()){setFeedback({title:'Término antes do início?',message:'O término precisa ser depois do horário de início.'});return;}
    setSaving(true);
    try{
      const result=await saveTaskGroup({title:title.trim(),description:'',due_at:withDue?due.getTime():Date.now(),priority,category,no_due:withDue?0:1,
        kind,ends_at:endsAt,location:isEvent?location:'',alert_offsets:isEvent?alerts:[]},isChild||isEvent?[]:children,id?Number(id):undefined,isChild||isEvent?false:daily);
      if(isEvent)await setPreference('eventAlerts',alerts).catch(console.warn);
      const prefs=await getPreferences().catch(()=>null);
      const wantsAlerts=withDue&&(!isEvent||alerts.length>0);
      const permission=prefs?.notifications&&wantsAlerts?await Notifications.getPermissionsAsync().catch(()=>null):null;
      const saved=isEvent?'Evento salvo':'Tarefa salva';
      router.back();
      if(result.reminderError)showDialog({eyebrow:'PING / RECADO',title:saved,message:'Não foi possível agendar o lembrete. Confira as notificações em Ajustes.'});
      else if(prefs?.notifications&&wantsAlerts&&!permission?.granted)showDialog({eyebrow:'PING / RECADO',title:saved,message:'As notificações não estão permitidas no Android. Ative a permissão em Ajustes para receber lembretes.'});
    }catch(e){setFeedback({title:'Não deu para salvar.',message:String(e)});}
    finally{setSaving(false);}
  }
  return <>
  <PingDialog visible={!!feedback} eyebrow="PING / RECADO" title={feedback?.title??''} message={feedback?.message} confirmLabel="ENTENDI" onClose={()=>setFeedback(null)} onConfirm={()=>setFeedback(null)}/>
  <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
    <Text style={s.kicker}>PING / ORGANIZAÇÃO</Text>
    <Text style={s.heading}>{id?'Muda os\nplanos.':isEvent?'O que vem\npor aí?':'Qual é a\nmissão?'}</Text>
    <Text style={s.subtitle}>{isEvent?'Marca agora. A gente te avisa antes.':'Anota agora. A gente te cobra depois.'}</Text>
    {!isChild?<View style={[s.row,{marginBottom:4}]}>{([{value:'task',label:'✓  Tarefa'},{value:'event',label:'◷  Evento'}] as const).map(item=>{
      const active=kind===item.value,tint=item.value==='event'?c.event:c.accent;
      return <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{selected:active}} onPress={()=>switchKind(item.value)} style={[s.choice,active&&{borderColor:tint,backgroundColor:c.surfaceRaised}]}>
        <Text style={[s.choiceText,{fontSize:14},active&&{color:tint,fontWeight:'900'}]}>{item.label}</Text>
      </Pressable>;
    })}</View>:null}
    <Text style={s.label}>{isEvent?'01 / QUAL É O EVENTO?':'01 / O QUE PRECISA SER FEITO?'}</Text>
    <TextInput style={s.input} placeholderTextColor={c.muted} value={title} onChangeText={setTitle} placeholder={isEvent?'Ex.: Consulta no dentista':'Ex.: Entregar relatório'} maxLength={120}/>
    {isChild?<Text style={s.helper}>Esta é uma tarefa associada. Ela segue a tarefa principal e não pode ter outras tarefas associadas.</Text>:isEvent?<>
    <Text style={s.label}>02 / ONDE? <Text style={s.labelOptional}>(OPCIONAL)</Text></Text>
    <TextInput style={s.input} placeholderTextColor={c.muted} value={location} onChangeText={setLocation} placeholder="Ex.: Clínica Sorriso, sala 3" maxLength={120}/>
    <Text style={s.helper}>Eventos não têm tarefas associadas e não se repetem.</Text>
    </>:<>
    <Text style={s.label}>02 / TAREFAS ASSOCIADAS</Text>
    <View style={{borderLeftWidth:2,borderLeftColor:c.accent,marginLeft:12,paddingLeft:16,gap:10}}>
      {children.map((value,index)=><View key={value.id??`new-${index}`} style={{flexDirection:'row',alignItems:'center',gap:8}}>
        <Text style={{color:c.accent,fontSize:20}}>↳</Text>
        <TextInput style={[s.input,{flex:1}]} placeholderTextColor={c.muted} placeholder={`Etapa ${index+1}`} value={value.title} onChangeText={text=>setChildren(old=>old.map((item,i)=>i===index?{...item,title:text}:item))} maxLength={120}/>
        <Pressable accessibilityLabel="Remover tarefa associada" onPress={()=>setChildren(old=>old.filter((_,i)=>i!==index))} style={{padding:9}}><Text style={{color:c.danger,fontSize:20}}>×</Text></Pressable>
      </View>)}
      <Pressable accessibilityRole="button" onPress={()=>setChildren(old=>[...old,{title:''}])} style={{borderWidth:1,borderStyle:'dashed',borderColor:c.accent,borderRadius:9,padding:15,flexDirection:'row',alignItems:'center',gap:10,backgroundColor:c.accentSoft}}>
        <Text style={{color:c.accent,fontSize:24,fontWeight:'900'}}>+</Text>
        <Text style={{color:c.accent,fontSize:12,fontWeight:'900'}}>ADICIONAR TAREFA À MISSÃO</Text>
      </Pressable>
    </View>
    <Text style={s.helper}>A primeira tarefa é a principal. Concluí-la também conclui todas as etapas associadas, e concluir todas as etapas conclui a principal.</Text>
    <Pressable accessibilityRole="checkbox" accessibilityState={{checked:daily}} onPress={()=>setDaily(value=>!value)} style={{flexDirection:'row',alignItems:'center',gap:13,backgroundColor:c.surface,borderColor:daily?c.accent:c.border,borderWidth:1,borderRadius:10,padding:16,marginTop:22}}>
      <View style={{width:24,height:24,borderWidth:2,borderRadius:6,borderColor:daily?c.accent:c.muted,backgroundColor:daily?c.accent:'transparent',alignItems:'center',justifyContent:'center'}}><Text style={{color:c.background,fontWeight:'900'}}>{daily?'✓':''}</Text></View>
      <View style={{flex:1}}><Text style={{color:c.text,fontSize:15,fontWeight:'800'}}>Tarefa diária ↻</Text><Text style={{color:c.muted,fontSize:12,marginTop:3}}>Repetir todos os dias, com ou sem horário</Text></View>
    </Pressable>
    </>}
    {isChild?<Text style={[s.helper,{marginTop:18}]}>Subtarefas não têm horário nem aviso próprio: o lembrete da tarefa principal diz quantas faltam, e concluir todas conclui a principal.</Text>:<>
    <Text style={s.label}>03 / QUANDO? {isEvent?null:<Text style={s.labelOptional}>(OPCIONAL)</Text>}</Text>
    {isEvent?null:<View style={[s.row,{marginBottom:12}]}>{([{value:true,label:'Com data'},{value:false,label:'Sem data'}] as const).map(item=>{
      const active=hasDue===item.value,blocked=false;
      return <Pressable key={item.label} accessibilityRole="radio" accessibilityState={{selected:active,disabled:blocked}} disabled={blocked} onPress={()=>setHasDue(item.value)} style={[s.choice,active&&s.selected,blocked&&{opacity:0.4}]}>
        <Text style={[s.choiceText,active&&s.selectedText]}>{item.label}</Text>
      </Pressable>;
    })}</View>}
    {hasDue||isEvent?<>
      <View style={s.scheduleCard}>
        <Pressable style={s.scheduleRow} onPress={()=>openPicker('date')}>
          <Text style={s.scheduleSymbol}>▦</Text>
          <View style={{flex:1}}><Text style={s.scheduleCaption}>{isEvent?'DATA':'DATA DO LEMBRETE'}</Text><Text style={s.scheduleValue}>{due.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}</Text></View>
          <Text style={s.scheduleArrow}>›</Text>
        </Pressable>
        <View style={s.scheduleDivider}/>
        <Pressable style={s.scheduleRow} onPress={()=>openPicker('time')}>
          <Text style={s.scheduleSymbol}>◷</Text>
          <View style={{flex:1}}><Text style={s.scheduleCaption}>{isEvent?'INÍCIO':'HORÁRIO'}</Text><Text style={s.scheduleValue}>{due.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</Text></View>
          <Text style={s.scheduleArrow}>›</Text>
        </Pressable>
        {isEvent?<>
          <View style={s.scheduleDivider}/>
          <Pressable style={s.scheduleRow} onPress={()=>openPicker('end')}>
            <Text style={[s.scheduleSymbol,{color:c.event}]}>◔</Text>
            <View style={{flex:1}}><Text style={s.scheduleCaption}>TÉRMINO (OPCIONAL)</Text><Text style={[s.scheduleValue,endMinutes===null&&{color:c.muted,fontWeight:'700'}]}>{endMinutes===null?'Sem horário de término':`${String(Math.floor(endMinutes/60)).padStart(2,'0')}:${String(endMinutes%60).padStart(2,'0')}`}</Text></View>
            {endMinutes!==null?<Pressable accessibilityLabel="Remover término" hitSlop={10} onPress={()=>setEndMinutes(null)} style={{padding:6}}><Text style={{color:c.danger,fontSize:20}}>×</Text></Pressable>:<Text style={s.scheduleArrow}>›</Text>}
          </Pressable>
        </>:null}
      </View>
      <Text style={s.scheduleCaptionQuick}>ATALHOS RÁPIDOS</Text>
      <View style={s.row}>{([{label:'Hoje',days:0},{label:'Amanhã',days:1},{label:'+7 dias',days:7}] as const).map(item=><Pressable key={item.label} style={s.quickChip} onPress={()=>{const next=new Date();next.setDate(next.getDate()+item.days);next.setHours(due.getHours(),due.getMinutes(),0,0);setDue(next);}}><Text style={s.quickText}>{item.label}</Text></Pressable>)}</View>
    </>:null}
    <Modal visible={picker!==null} transparent animationType="fade" onRequestClose={()=>setPicker(null)}>
      <View style={s.modalOverlay}><View style={s.modalCard}>
        <Text style={s.modalTitle}>{picker==='date'?'ESCOLHA O DIA':picker==='end'?'HORA DO TÉRMINO':'ESCOLHA A HORA'}</Text>
        {picker==='date'?<>
          <View style={s.monthRow}>
            <Pressable style={s.monthArrow} onPress={()=>setMonth(v=>new Date(v.getFullYear(),v.getMonth()-1,1))}><Text style={s.choiceText}>‹</Text></Pressable>
            <Text style={s.monthText}>{month.toLocaleDateString('pt-BR',{month:'long',year:'numeric'}).toUpperCase()}</Text>
            <Pressable style={s.monthArrow} onPress={()=>setMonth(v=>new Date(v.getFullYear(),v.getMonth()+1,1))}><Text style={s.choiceText}>›</Text></Pressable>
          </View>
          <View style={s.calendar}>
            {['D','S','T','Q','Q','S','S'].map((d,i)=><Text key={i} style={s.weekday}>{d}</Text>)}
            {Array.from({length:new Date(month.getFullYear(),month.getMonth(),1).getDay()},(_,i)=><View key={'blank'+i} style={s.dayCell}/>)}
            {Array.from({length:new Date(month.getFullYear(),month.getMonth()+1,0).getDate()},(_,i)=>{
              const day=i+1,selected=due.getFullYear()===month.getFullYear()&&due.getMonth()===month.getMonth()&&due.getDate()===day;
              return <Pressable key={day} style={[s.dayCell,selected&&s.daySelected]} onPress={()=>{setDue(prev=>{const next=new Date(prev);next.setDate(1);next.setFullYear(month.getFullYear(),month.getMonth(),day);return next;});setPicker(null);}}><Text style={[s.dayText,selected&&s.daySelectedText]}>{day}</Text></Pressable>;
            })}
          </View>
        </>:<>
          <View style={s.timeRow}>
            <View style={s.timeField}><Text style={s.timeLabel}>HORA</Text><TextInput value={hour} onChangeText={setHour} keyboardType="number-pad" maxLength={2} selectTextOnFocus style={s.timeInput}/></View>
            <Text style={s.timeColon}>:</Text>
            <View style={s.timeField}><Text style={s.timeLabel}>MINUTO</Text><TextInput value={minute} onChangeText={setMinute} keyboardType="number-pad" maxLength={2} selectTextOnFocus style={s.timeInput}/></View>
          </View>
          <Pressable style={s.button} onPress={confirmTime}><Text style={s.buttonText}>CONFIRMAR HORÁRIO</Text></Pressable>
        </>}
        <Pressable style={s.modalCancel} onPress={()=>setPicker(null)}><Text style={s.choiceText}>CANCELAR</Text></Pressable>
      </View></View>
    </Modal>
    {isEvent?<>
      <Text style={s.label}>04 / QUANDO TE AVISO? <Text style={s.labelOptional}>(ATÉ 3)</Text></Text>
      {/* Poucas opções; um aviso salvo antes com outra antecedência continua aparecendo para poder ser tirado. */}
      <View style={[s.row,{flexWrap:'wrap'}]}>{[...eventAlertOptions,...alerts.filter(m=>!eventAlertOptions.some(o=>o.minutes===m)).map(m=>({minutes:m,label:m>=1440&&m%1440===0?`${m/1440} dias`:m>=60&&m%60===0?`${m/60}h`:`${m} min`}))].sort((a,b)=>a.minutes-b.minutes).map(option=>{const active=alerts.includes(option.minutes);
        return <Pressable key={option.minutes} accessibilityRole="checkbox" accessibilityState={{checked:active}} onPress={()=>toggleAlert(option.minutes)} style={[s.alertChip,active&&{borderColor:c.event,backgroundColor:c.surfaceRaised}]}>
          <Text style={[s.choiceText,active&&{color:c.event,fontWeight:'900'}]}>{active?'🔔 ':''}{option.label}</Text>
        </Pressable>;})}</View>
      {alerts.length?null:<Text style={s.helper}>Sem aviso: o evento só aparece na agenda.</Text>}
    </>:<Text style={s.helper}>{!hasDue?(daily?'Sem horário, sem notificação. A rotina aparece todo dia na sua lista.':'Sem data, sem notificação. A tarefa fica na sua lista até você concluir.'):daily?'Uma notificação por dia, no horário escolhido. Silêncio entre 22h e 7h.':'Lembretes contextuais no horário e, para tarefas comuns, após 15 min, 1h e 3h. Silêncio entre 22h e 7h. Saúde recebe um aviso único.'}</Text>}
    </>}
    {/* Evento não pede assunto: fica com o que já tinha (novo = Geral). */}
    {isEvent?null:<><Text style={s.label}>04 / QUAL O ASSUNTO?</Text>
    <View style={[s.row,{flexWrap:'wrap'}]}>{(Object.keys(categories) as TaskCategory[]).map(key=>{const active=category===key;return <Pressable key={key} accessibilityRole="radio" accessibilityLabel={categories[key]} accessibilityState={{selected:active}} style={[s.choice,s.topic,active&&s.selected]} onPress={()=>setCategory(key)}><Text style={s.topicEmoji}>{categoryEmoji[key]}</Text><Text style={[s.choiceText,active&&s.selectedText]}>{categories[key]}</Text></Pressable>;})}</View></>}
    {isEvent?null:<><Text style={s.label}>05 / QUAL A URGÊNCIA?</Text>
    <View style={s.row}>{(['low','medium','high'] as const).map((p,i)=>{
      const color=priorityColors[p];
      return <Pressable key={p} style={[s.choice,priority===p&&{borderColor:color,backgroundColor:c.surfaceRaised}]} onPress={()=>setPriority(p)}>
        <Text style={s.choiceText}>{['Baixa','Média','Alta'][i]}</Text>
        <View style={[s.urgencyLine,{backgroundColor:color,opacity:priority===p?1:0.75,width:priority===p?46:32}]}/>
      </Pressable>;
    })}</View></>}
    {completed&&!isEvent?<Text style={s.helper}>Esta tarefa já está concluída. Não será agendada uma nova notificação.</Text>:null}
    <Pressable style={[s.button,saving&&{opacity:0.6}]} disabled={saving} onPress={save}><Text style={s.buttonText}>{saving?'SALVANDO...':id?'SALVAR ALTERAÇÕES →':isEvent?'CRIAR EVENTO →':'CRIAR TAREFA →'}</Text></Pressable>
  </ScrollView></>;
}
const createStyles=(c:ThemeColors)=>StyleSheet.create({
  container:{paddingHorizontal:23,paddingTop:28,paddingBottom:80,backgroundColor:c.background,flexGrow:1},
  kicker:{color:c.accent,fontWeight:'900',fontSize:10,letterSpacing:2.5,marginBottom:15},
  heading:{color:c.text,fontSize:47,fontWeight:'900',lineHeight:49,letterSpacing:-2,marginBottom:8},
  subtitle:{color:c.muted,fontSize:14,marginBottom:22},
  labelOptional:{color:c.muted,fontWeight:'800'},
  label:{color:c.accent,fontWeight:'900',marginBottom:12,marginTop:27,fontSize:10,letterSpacing:1.5},
  input:{backgroundColor:c.surface,color:c.text,padding:17,borderRadius:8,fontSize:16,borderWidth:1,borderColor:c.border},
  row:{flexDirection:'row',gap:8},
  choice:{backgroundColor:c.surface,paddingVertical:15,paddingHorizontal:10,borderRadius:7,flex:1,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:c.border},
  choiceText:{color:c.text,fontWeight:'700',fontSize:12},
  topic:{flexBasis:'29%',paddingVertical:13,gap:6},
  topicEmoji:{fontSize:22,lineHeight:28,textAlign:'center'},
  urgencyLine:{height:5,borderRadius:3,marginTop:9},
  selected:{backgroundColor:c.accentSoft,borderColor:c.accent},selectedText:{color:c.accent},
  helper:{color:c.muted,fontSize:12,marginTop:12,lineHeight:19},
  button:{backgroundColor:c.accent,alignItems:'center',padding:20,borderRadius:8,marginTop:32},
  buttonText:{color:c.background,fontWeight:'900',fontSize:14,letterSpacing:1.2},
  scheduleCard:{backgroundColor:c.surface,borderRadius:12,borderWidth:1,borderColor:c.border,padding:15},
  scheduleRow:{flexDirection:'row',alignItems:'center',gap:14,paddingVertical:8},
  scheduleSymbol:{fontSize:27,color:c.accent,backgroundColor:c.accentSoft,overflow:'hidden',borderRadius:9,textAlign:'center',textAlignVertical:'center',width:43,height:43},
  scheduleCaption:{color:c.muted,fontSize:10,fontWeight:'800',letterSpacing:1,marginBottom:5},
  scheduleValue:{color:c.text,fontSize:16,fontWeight:'800',textTransform:'capitalize'},
  scheduleArrow:{color:c.accent,fontSize:26},
  scheduleDivider:{height:1,backgroundColor:c.border,marginVertical:10},
  scheduleCaptionQuick:{color:c.muted,fontSize:10,fontWeight:'800',letterSpacing:1,marginTop:17,marginBottom:10},
  alertChip:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:99,paddingHorizontal:14,paddingVertical:10},
  quickChip:{backgroundColor:c.surfaceRaised,borderWidth:1,borderColor:c.border,borderRadius:99,paddingHorizontal:14,paddingVertical:11,flex:1,alignItems:'center'},
  quickText:{color:c.text,fontWeight:'800',fontSize:12},
  modalOverlay:{flex:1,backgroundColor:'#000000B8',justifyContent:'center',padding:20},
  modalCard:{backgroundColor:c.surfaceRaised,borderRadius:16,padding:20,borderWidth:1,borderColor:c.border},
  modalTitle:{color:c.accent,fontSize:12,fontWeight:'900',letterSpacing:2,marginBottom:22},
  monthRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:18},
  monthArrow:{padding:12,backgroundColor:c.surface,borderRadius:8},
  monthText:{color:c.text,fontSize:13,fontWeight:'900'},
  calendar:{flexDirection:'row',flexWrap:'wrap'},
  weekday:{width:'14.2857%',textAlign:'center',color:c.muted,fontSize:11,marginBottom:12},
  dayCell:{width:'14.2857%',height:43,alignItems:'center',justifyContent:'center',borderRadius:8},
  daySelected:{backgroundColor:c.accent},
  dayText:{color:c.text,fontWeight:'700',fontSize:14},
  daySelectedText:{color:c.background},
  timeRow:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:12,marginVertical:15},
  timeField:{flex:1},
  timeLabel:{color:c.muted,fontSize:11,textAlign:'center',marginBottom:9},
  timeInput:{backgroundColor:c.surface,color:c.text,fontSize:30,fontWeight:'900',textAlign:'center',borderRadius:10,borderWidth:1,borderColor:c.border,padding:12},
  timeColon:{color:c.accent,fontSize:30,marginTop:16},
  modalCancel:{alignItems:'center',padding:15,marginTop:10},
});
