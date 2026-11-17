import * as Notifications from 'expo-notifications';
import {Platform} from 'react-native';
import {getPreferences} from './preferences';
import {moodFace,NotificationMood} from './faces';
import {reminderMessage,reminderOffsets,TaskCategory,ReminderStage,eventReminderMessage,privateEventMessage,moodMessage,missYouMessage,cleanDayMessage} from './templates';
import {reminderMood,eventMood,toneOfMood,moodLabel,contextLine,MoodInput,Tone} from './ping-mood';

Notifications.setNotificationHandler({
  handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:true,shouldSetBadge:false}),
});
// O Android não deixa mudar som/vibração de um canal depois de criado. Por isso cada tom do Ping tem o seu canal
// (com o som dentro do app, em res/raw via expo-notifications) e os canais antigos são apagados.
const CHANNELS:Record<Tone,{id:string;name:string;sound:string;vibration:number[]}>={
  normal:{id:'ping-tom-normal-v1',name:'Lembretes · tom normal',sound:'ping_notif_normal.wav',vibration:[0,250,150,250]},
  urgent:{id:'ping-tom-urgente-v1',name:'Lembretes · tom urgente',sound:'ping_notif_urgent.wav',vibration:[0,300,100,300,100,300]},
  calm:{id:'ping-tom-calmo-v1',name:'Lembretes · tom calmo',sound:'ping_notif_calm.wav',vibration:[0,200]},
};
const LEGACY_CHANNELS=['tasks','tasks-feedback-v2'];
export const TASK_CATEGORY='task_due';
export const ACTION_COMPLETE='complete';
export const ACTION_SNOOZE='snooze';
/** Cansado (adiou 2 vezes ou mais): em vez de adiar de novo, o botão leva para mudar o horário. */
export const TIRED_CATEGORY='task_due_tired';
export const ACTION_RESCHEDULE='reschedule';
export const SNOOZE_MINUTES=15;
/** Eventos: categoria própria, sem "Concluir", e "Lembrar de novo" em 10 min. */
export const EVENT_CATEGORY='event_alert';
export const EVENT_SNOOZE_MINUTES=10;
/** Etapas dos avisos de evento começam aqui para não colidir com as de tarefas. */
const EVENT_STAGE_BASE=20;
/** Etapa usada para lembretes adiados pelo botão "Adiar". */
export const SNOOZE_STAGE=9;
export type ScheduledReminder={notification_id:string;stage:number;scheduled_at:number};
/** `subtasks`: quantas subtarefas faltam, para o aviso da principal dizer isso. */
/** O que o Ping sabe na hora de agendar: adiamentos desta tarefa e quantas atrasadas há hoje. */
export type ReminderContext={snoozes:number;overdueToday:number};
const NO_CONTEXT:ReminderContext={snoozes:0,overdueToday:0};
export type ReminderTask={id:number;title:string;due_at:number;category:TaskCategory;daily?:boolean;subtasks?:{pending:number;total:number}};
export type EventReminder={id:number;title:string;due_at:number;category:TaskCategory;location:string;offsets:number[]};

/** Cria canal e botões de ação. Não pede permissão: isso acontece após o onboarding. */
export async function setupNotifications(){
  if(Platform.OS==='android')await Promise.all(LEGACY_CHANNELS.map(id=>Notifications.deleteNotificationChannelAsync(id).catch(()=>{})));
  if(Platform.OS==='android')await Promise.all((Object.values(CHANNELS)).map(channel=>Notifications.setNotificationChannelAsync(channel.id,{
    name:channel.name,importance:Notifications.AndroidImportance.HIGH,
    sound:channel.sound,enableVibrate:true,vibrationPattern:channel.vibration,
  })));
  await Notifications.setNotificationCategoryAsync(TASK_CATEGORY,[
    {identifier:ACTION_COMPLETE,buttonTitle:'Concluir',options:{opensAppToForeground:false}},
    {identifier:ACTION_SNOOZE,buttonTitle:`Adiar ${SNOOZE_MINUTES} min`,options:{opensAppToForeground:false}},
  ]);
  await Notifications.setNotificationCategoryAsync(TIRED_CATEGORY,[
    {identifier:ACTION_COMPLETE,buttonTitle:'Concluir',options:{opensAppToForeground:false}},
    {identifier:ACTION_RESCHEDULE,buttonTitle:'Reagendar',options:{opensAppToForeground:true}},
  ]);
  await Notifications.setNotificationCategoryAsync(EVENT_CATEGORY,[
    {identifier:ACTION_SNOOZE,buttonTitle:`Lembrar em ${EVENT_SNOOZE_MINUTES} min`,options:{opensAppToForeground:false}},
  ]);
}
/** Pede a permissão de notificações se ainda for possível perguntar. */
export async function ensureNotificationPermission(){
  const current=await Notifications.getPermissionsAsync();
  if(current.granted||!current.canAskAgain)return current.granted;
  return (await Notifications.requestPermissionsAsync()).granted;
}

function subtaskText(task:ReminderTask){
  const sub=task.subtasks;
  if(!sub||!sub.total||!sub.pending)return '';
  return sub.pending===1?`Falta 1 de ${sub.total} subtarefas`:`Faltam ${sub.pending} de ${sub.total} subtarefas`;
}
/**
 * Conteúdo do lembrete segundo o sentimento do Ping: rosto, cor e texto do sentimento, o estado no cabeçalho e uma linha
 * de contexto (atraso, atrasadas do dia, adiamentos, subtarefas). `delayStage` sobrescreve a etapa usada no texto de atraso.
 */
async function buildContent(task:ReminderTask,stage:ReminderStage,variant:number,ctx:ReminderContext=NO_CONTEXT,opts:{mood?:NotificationMood;delayStage?:number}={}):Promise<{content:Notifications.NotificationContentInput;mood:NotificationMood}>{
  const prefs=await getPreferences();
  const input:MoodInput={stage,...ctx};
  const mood=opts.mood??reminderMood(input);
  // O rosto do sino não revela a tarefa, então aparece também com a prévia privada.
  const face=moodFace(prefs.personality,mood,task.category);
  const context=contextLine({...input,stage:opts.delayStage??stage},subtaskText(task));
  const message=moodMessage(task.category,mood,stage,task.id+stage,prefs.displayName,prefs.addressStyle,prefs.personality);
  return {mood,content:{
    title:prefs.privatePreviews?'Ping · lembrete':task.title,
    body:prefs.privatePreviews?'Você tem uma tarefa esperando. Abra o Ping para conferir.':message+(context?'\n'+context:''),
    ...(task.category==='health'||Platform.OS!=='android'?{}:{subtitle:moodLabel(prefs.personality,mood)}),
    data:{kind:'task_due',taskId:task.id,stage,mood,...(face?{largeIcon:face.largeIcon,smallIcon:face.smallIcon}:{})},
    categoryIdentifier:mood==='cansado'?TIRED_CATEGORY:TASK_CATEGORY,
    ...(face&&Platform.OS==='android'?{color:face.color}:{}),
  }};
}
/**
 * `alarmClock` usa AlarmManager.setAlarmClock(): o Android nunca atrasa (nem em Doze nem por
 * economia de bateria do fabricante), mas mostra o ícone de despertador na barra de status
 * até disparar. Por isso só o aviso do horário da tarefa usa esse modo.
 */
function dateTrigger(at:number,delivery:Notifications.NotificationDelivery='bestEffort',tone:Tone='normal'):Notifications.NotificationTriggerInput{
  return {type:Notifications.SchedulableTriggerInputTypes.DATE,date:new Date(at),
    ...(Platform.OS==='android'?{channelId:CHANNELS[tone].id,delivery}:{})};
}

export async function scheduleTaskReminders(task:ReminderTask,ctx:ReminderContext=NO_CONTEXT):Promise<ScheduledReminder[]>{
  const prefs=await getPreferences();
  if(!prefs.notifications)return [];
  const permission=await Notifications.getPermissionsAsync();
  if(!permission.granted){console.warn('[notifications] Permission not granted');return [];}
  const result:ScheduledReminder[]=[];
  try{
    if(task.daily){
      const when=new Date(task.due_at);
      const hour=when.getHours()>=22||when.getHours()<7?7:when.getHours();
      const minute=hour===7 && (when.getHours()>=22||when.getHours()<7)?0:when.getMinutes();
      const face=moodFace(prefs.personality,'animado',task.category);
      const id=await Notifications.scheduleNotificationAsync({
        content:{title:prefs.privatePreviews?'Ping · lembrete':task.title,body:prefs.privatePreviews?'Você tem uma tarefa esperando. Abra o Ping para conferir.':'Sua rotina diária está te esperando no Ping.',data:{kind:'task_due',taskId:task.id,daily:true,...(face?{largeIcon:face.largeIcon,smallIcon:face.smallIcon}:{})},...(face&&Platform.OS==='android'?{color:face.color}:{})},
        trigger:{type:Notifications.SchedulableTriggerInputTypes.DAILY,hour,minute,...(Platform.OS==='android'?{channelId:CHANNELS.normal.id}:{})},
      });
      return [{notification_id:id,stage:0,scheduled_at:Date.now()}];
    }
    const offsets=reminderOffsets(task.category);
    for(let stage=0;stage<offsets.length;stage++){
      const at=task.due_at+offsets[stage]*60000;
      if(at<=Date.now())continue;
      const {content,mood}=await buildContent(task,stage as ReminderStage,task.id+stage,ctx);
      const id=await Notifications.scheduleNotificationAsync({
        content,
        trigger:dateTrigger(at,stage===0?'alarmClock':'bestEffort',toneOfMood(mood)),
      });
      result.push({notification_id:id,stage,scheduled_at:at});
    }
    return result;
  }catch(e){await cancelTaskReminders(result.map(x=>x.notification_id));throw e;}
}
async function buildEventContent(ev:EventReminder,minutesBefore:number,variant:number,stage:number):Promise<{content:Notifications.NotificationContentInput;mood:NotificationMood}>{
  const prefs=await getPreferences();
  const where=ev.location.trim()?`\n📍 ${ev.location.trim()}`:'';
  const mood=eventMood(minutesBefore);
  const face=moodFace(prefs.personality,mood,ev.category);
  return {mood,content:{
    title:prefs.privatePreviews?'Ping · evento':ev.title,
    body:prefs.privatePreviews?privateEventMessage:eventReminderMessage(ev.category,minutesBefore,variant,prefs.displayName,prefs.addressStyle,prefs.personality)+where,
    ...(ev.category==='health'||Platform.OS!=='android'?{}:{subtitle:moodLabel(prefs.personality,mood)}),
    data:{kind:'event_alert',taskId:ev.id,stage,mood,...(face?{largeIcon:face.largeIcon,smallIcon:face.smallIcon}:{})},
    categoryIdentifier:EVENT_CATEGORY,
    ...(face&&Platform.OS==='android'?{color:face.color}:{}),
  }};
}
/**
 * Avisos de evento: um para cada antecedência escolhida (até 3), sempre ANTES do início.
 * Os que já passaram são ignorados. O mais próximo do evento usa `alarmClock` para não atrasar.
 */
export async function scheduleEventAlerts(ev:EventReminder):Promise<ScheduledReminder[]>{
  const prefs=await getPreferences();
  if(!prefs.notifications||!ev.offsets.length)return [];
  const permission=await Notifications.getPermissionsAsync();
  if(!permission.granted){console.warn('[notifications] Permission not granted');return [];}
  const offsets=[...new Set(ev.offsets)].sort((a,b)=>b-a);
  const closest=Math.min(...offsets);
  const result:ScheduledReminder[]=[];
  try{
    for(let i=0;i<offsets.length;i++){
      const at=ev.due_at-offsets[i]*60000;
      if(at<=Date.now())continue;
      const stage=EVENT_STAGE_BASE+i;
      const {content,mood}=await buildEventContent(ev,offsets[i],ev.id+i,stage);
      const id=await Notifications.scheduleNotificationAsync({
        content,
        trigger:dateTrigger(at,offsets[i]===closest?'alarmClock':'bestEffort',toneOfMood(mood)),
      });
      result.push({notification_id:id,stage,scheduled_at:at});
    }
    return result;
  }catch(e){await cancelTaskReminders(result.map(x=>x.notification_id));throw e;}
}
/** Botão "Lembrar em 10 min" de um evento: o texto fala de quanto vai faltar nesse momento. */
export async function scheduleEventSnooze(ev:EventReminder):Promise<ScheduledReminder|null>{
  const prefs=await getPreferences();
  if(!prefs.notifications)return null;
  const at=Date.now()+EVENT_SNOOZE_MINUTES*60000;
  const remaining=Math.max(0,Math.round((ev.due_at-at)/60000));
  const {content,mood}=await buildEventContent(ev,remaining,ev.id+1,SNOOZE_STAGE);
  const id=await Notifications.scheduleNotificationAsync({content,trigger:dateTrigger(at,'bestEffort',toneOfMood(mood))});
  return {notification_id:id,stage:SNOOZE_STAGE,scheduled_at:at};
}
/** Agenda um único lembrete daqui a SNOOZE_MINUTES (botão "Adiar"). */
export async function scheduleSnoozeReminder(task:ReminderTask,ctx:ReminderContext=NO_CONTEXT):Promise<ScheduledReminder|null>{
  const prefs=await getPreferences();
  if(!prefs.notifications)return null;
  const at=Date.now()+SNOOZE_MINUTES*60000;
  // Etapa 1 = mensagens de "ainda está pendente", adequadas para um adiamento; o rosto já é de atraso
  // (impaciente) e vira cansado a partir do 2º adiamento. `delayStage` 0: o texto não inventa um atraso.
  const {content,mood}=await buildContent(task,1,task.id+1,ctx,{mood:reminderMood({stage:2,...ctx}),delayStage:0});
  const id=await Notifications.scheduleNotificationAsync({content,trigger:dateTrigger(at,'bestEffort',toneOfMood(mood))});
  return {notification_id:id,stage:SNOOZE_STAGE,scheduled_at:at};
}
export async function cancelTaskReminders(ids:string[]){
  await Promise.all(ids.map(id=>Notifications.cancelScheduledNotificationAsync(id).catch(console.warn)));
}
/** Remove da bandeja as notificações já exibidas de uma tarefa. */
export async function dismissTaskNotifications(taskId:number){
  try{
    const presented=await Notifications.getPresentedNotificationsAsync();
    await Promise.all(presented
      .filter(n=>Number(n.request.content.data?.taskId)===taskId)
      .map(n=>Notifications.dismissNotificationAsync(n.request.identifier).catch(console.warn)));
  }catch(e){console.warn('[notifications] dismiss failed',e);}
}
export async function dismissAllTaskNotifications(){
  await Notifications.dismissAllNotificationsAsync().catch(console.warn);
}
/**
 * Cancela agendamentos que nenhuma tarefa do banco conhece (ex.: lembretes de versões antigas
 * ou de tarefas apagadas). Sem isso, um gatilho diário órfão dispara para sempre.
 * Testes pendentes são mantidos: duram só 10 segundos.
 */
export async function cancelOrphanNotifications(loadKnown:()=>Promise<Set<string>>){
  // Lê os agendamentos antes do banco: um lembrete criado no meio do caminho não vira "órfão".
  const pending=await Notifications.getAllScheduledNotificationsAsync();
  const known=await loadKnown();
  const orphans=pending.filter(n=>!known.has(n.identifier)&&n.content.data?.kind!=='test'&&n.content.data?.kind!=='mood_notice').map(n=>n.identifier);
  if(orphans.length)console.warn('[notifications] cancelling orphan schedules',orphans.length);
  await cancelTaskReminders(orphans);
  return orphans.length;
}
/**
 * Avisos de humor que não são de uma tarefa: saudade (dias sem abrir o app) e dia limpo (20h).
 * `data.kind` 'mood_notice' impede que a limpeza de órfãos os cancele; quem os agenda guarda o id para trocar depois.
 */
export async function scheduleMoodNotice(kind:'ciumes'|'festa',at:number,info:{pending:number;days?:number}):Promise<string|null>{
  const prefs=await getPreferences();
  if(!prefs.notifications||!prefs.moodNotices||at<=Date.now())return null;
  const permission=await Notifications.getPermissionsAsync();
  if(!permission.granted)return null;
  const face=moodFace(prefs.personality,kind);
  const variant=Math.floor(at/86400000);
  return Notifications.scheduleNotificationAsync({
    content:{
      title:kind==='ciumes'?'Ping sentiu sua falta':'Dia limpo',
      body:kind==='ciumes'?missYouMessage(prefs.personality,info.pending,info.days??3,variant):cleanDayMessage(prefs.personality,variant),
      ...(Platform.OS==='android'?{subtitle:moodLabel(prefs.personality,kind)}:{}),
      data:{kind:'mood_notice',mood:kind,...(face?{largeIcon:face.largeIcon,smallIcon:face.smallIcon}:{})},
      ...(face&&Platform.OS==='android'?{color:face.color}:{}),
    },
    trigger:dateTrigger(at,'bestEffort','calm'),
  });
}
/**
 * Teste em Ajustes: seis avisos seguidos (a cada 10 s), um por sentimento do Ping na personalidade escolhida:
 * animado, impaciente, irritado, cansado, com saudade e orgulhoso (dia limpo).
 */
export async function testNotification(){
  const permission=await Notifications.getPermissionsAsync();
  if(!permission.granted)throw new Error('Permissão de notificações não concedida.');
  const prefs=await getPreferences();
  // Um teste por vez: tocar várias vezes no botão não empilha avisos.
  const previous=(await Notifications.getAllScheduledNotificationsAsync()).filter(n=>n.content.data?.kind==='test').map(n=>n.identifier);
  await cancelTaskReminders(previous);
  const steps:{mood:NotificationMood;label:string;stage:ReminderStage;snoozes?:number}[]=[
    {mood:'animado',label:'animado',stage:0},
    {mood:'impaciente',label:'impaciente',stage:2},
    {mood:'irritado',label:'irritado',stage:3},
    {mood:'cansado',label:'cansado',stage:1,snoozes:3},
    {mood:'ciumes',label:'com saudade',stage:0},
    {mood:'festa',label:'orgulhoso',stage:0},
  ];
  const ids:string[]=[];
  for(let i=0;i<steps.length;i++){
    const {mood,label,stage,snoozes=0}=steps[i];
    const face=moodFace(prefs.personality,mood);
    const body=mood==='ciumes'?missYouMessage(prefs.personality,4,3,i)
      :mood==='festa'?cleanDayMessage(prefs.personality,i)
      :moodMessage('general',mood,stage as ReminderStage,0,prefs.displayName,prefs.addressStyle,prefs.personality);
    const context=mood==='ciumes'||mood==='festa'?'':contextLine({stage,snoozes,overdueToday:mood==='irritado'?4:0},'');
    ids.push(await Notifications.scheduleNotificationAsync({
      content:{
        title:prefs.privatePreviews?'Ping - lembrete':`Teste do Ping · ${label}`,
        body:prefs.privatePreviews?'Abra o Ping para conferir seu lembrete.':body+(context?'\n'+context:''),
        ...(Platform.OS==='android'?{subtitle:moodLabel(prefs.personality,mood)}:{}),
        data:{kind:'test',mood,...(face?{largeIcon:face.largeIcon,smallIcon:face.smallIcon}:{})},
        ...(face&&Platform.OS==='android'?{color:face.color}:{}),
      },
      trigger:dateTrigger(Date.now()+10000*(i+1),'bestEffort',toneOfMood(mood)),
    }));
  }
  return ids;
}
