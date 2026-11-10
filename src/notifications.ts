import * as Notifications from 'expo-notifications';
import {Platform} from 'react-native';
import {getPreferences} from './preferences';
import {faceMoment,notificationFace,FaceMoment} from './faces';
import {reminderMessage,reminderOffsets,TaskCategory,ReminderStage,eventReminderMessage,privateEventMessage} from './templates';

Notifications.setNotificationHandler({
  handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:true,shouldSetBadge:false}),
});
// O canal antigo 'tasks' foi criado sem som/vibração; o Android não deixa mudar isso
// depois de criado, por isso o canal novo tem outro id e o antigo é apagado.
const CHANNEL='tasks-feedback-v2';
const LEGACY_CHANNELS=['tasks'];
export const TASK_CATEGORY='task_due';
export const ACTION_COMPLETE='complete';
export const ACTION_SNOOZE='snooze';
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
export type ReminderTask={id:number;title:string;due_at:number;category:TaskCategory;daily?:boolean;subtasks?:{pending:number;total:number}};
export type EventReminder={id:number;title:string;due_at:number;category:TaskCategory;location:string;offsets:number[]};

/** Cria canal e botões de ação. Não pede permissão: isso acontece após o onboarding. */
export async function setupNotifications(){
  if(Platform.OS==='android')await Promise.all(LEGACY_CHANNELS.map(id=>Notifications.deleteNotificationChannelAsync(id).catch(()=>{})));
  if(Platform.OS==='android') await Notifications.setNotificationChannelAsync(CHANNEL,{
    name:'Lembretes de tarefas',importance:Notifications.AndroidImportance.HIGH,
    sound:'default',enableVibrate:true,vibrationPattern:[0,250,150,250],
  });
  await Notifications.setNotificationCategoryAsync(TASK_CATEGORY,[
    {identifier:ACTION_COMPLETE,buttonTitle:'Concluir',options:{opensAppToForeground:false}},
    {identifier:ACTION_SNOOZE,buttonTitle:`Adiar ${SNOOZE_MINUTES} min`,options:{opensAppToForeground:false}},
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

function subtaskLine(task:ReminderTask){
  const sub=task.subtasks;
  if(!sub||!sub.total||!sub.pending)return '';
  return sub.pending===1?`
Falta 1 de ${sub.total} subtarefas.`:`
Faltam ${sub.pending} de ${sub.total} subtarefas.`;
}
async function buildContent(task:ReminderTask,stage:ReminderStage,variant:number,moment:FaceMoment=faceMoment(stage)):Promise<Notifications.NotificationContentInput>{
  const prefs=await getPreferences();
  // O rosto do sino não revela a tarefa, então aparece também com a prévia privada.
  const face=notificationFace(prefs.personality,moment,task.category);
  return {
    title:prefs.privatePreviews?'Ping · lembrete':task.title,
    body:prefs.privatePreviews?'Você tem uma tarefa esperando. Abra o Ping para conferir.':reminderMessage(task.category,stage,variant,prefs.displayName,prefs.addressStyle,prefs.personality)+subtaskLine(task),
    data:{kind:'task_due',taskId:task.id,stage,...(face?{largeIcon:face.largeIcon,smallIcon:face.smallIcon}:{})},
    categoryIdentifier:TASK_CATEGORY,
    ...(face&&Platform.OS==='android'?{color:face.color}:{}),
  };
}
/**
 * `alarmClock` usa AlarmManager.setAlarmClock(): o Android nunca atrasa (nem em Doze nem por
 * economia de bateria do fabricante), mas mostra o ícone de despertador na barra de status
 * até disparar. Por isso só o aviso do horário da tarefa usa esse modo.
 */
function dateTrigger(at:number,delivery:Notifications.NotificationDelivery='bestEffort'):Notifications.NotificationTriggerInput{
  return {type:Notifications.SchedulableTriggerInputTypes.DATE,date:new Date(at),
    ...(Platform.OS==='android'?{channelId:CHANNEL,delivery}:{})};
}

export async function scheduleTaskReminders(task:ReminderTask):Promise<ScheduledReminder[]>{
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
      const face=notificationFace(prefs.personality,'no_horario',task.category);
      const id=await Notifications.scheduleNotificationAsync({
        content:{title:prefs.privatePreviews?'Ping · lembrete':task.title,body:prefs.privatePreviews?'Você tem uma tarefa esperando. Abra o Ping para conferir.':'Sua rotina diária está te esperando no Ping.',data:{kind:'task_due',taskId:task.id,daily:true,...(face?{largeIcon:face.largeIcon,smallIcon:face.smallIcon}:{})},...(face&&Platform.OS==='android'?{color:face.color}:{})},
        trigger:{type:Notifications.SchedulableTriggerInputTypes.DAILY,hour,minute,...(Platform.OS==='android'?{channelId:CHANNEL}:{})},
      });
      return [{notification_id:id,stage:0,scheduled_at:Date.now()}];
    }
    const offsets=reminderOffsets(task.category);
    for(let stage=0;stage<offsets.length;stage++){
      const at=task.due_at+offsets[stage]*60000;
      if(at<=Date.now())continue;
      const id=await Notifications.scheduleNotificationAsync({
        content:await buildContent(task,stage as ReminderStage,task.id+stage),
        trigger:dateTrigger(at,stage===0?'alarmClock':'bestEffort'),
      });
      result.push({notification_id:id,stage,scheduled_at:at});
    }
    return result;
  }catch(e){await cancelTaskReminders(result.map(x=>x.notification_id));throw e;}
}
async function buildEventContent(ev:EventReminder,minutesBefore:number,variant:number,stage:number):Promise<Notifications.NotificationContentInput>{
  const prefs=await getPreferences();
  const where=ev.location.trim()?`\n📍 ${ev.location.trim()}`:'';
  return {
    title:prefs.privatePreviews?'Ping · evento':ev.title,
    body:prefs.privatePreviews?privateEventMessage:eventReminderMessage(ev.category,minutesBefore,variant,prefs.displayName,prefs.addressStyle,prefs.personality)+where,
    data:{kind:'event_alert',taskId:ev.id,stage},
    categoryIdentifier:EVENT_CATEGORY,
  };
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
      const id=await Notifications.scheduleNotificationAsync({
        content:await buildEventContent(ev,offsets[i],ev.id+i,stage),
        trigger:dateTrigger(at,offsets[i]===closest?'alarmClock':'bestEffort'),
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
  const id=await Notifications.scheduleNotificationAsync({content:await buildEventContent(ev,remaining,ev.id+1,SNOOZE_STAGE),trigger:dateTrigger(at)});
  return {notification_id:id,stage:SNOOZE_STAGE,scheduled_at:at};
}
/** Agenda um único lembrete daqui a SNOOZE_MINUTES (botão "Adiar"). */
export async function scheduleSnoozeReminder(task:ReminderTask):Promise<ScheduledReminder|null>{
  const prefs=await getPreferences();
  if(!prefs.notifications)return null;
  const at=Date.now()+SNOOZE_MINUTES*60000;
  // Etapa 1 = mensagens de "ainda está pendente", adequadas para um adiamento; o rosto já é de atraso.
  const id=await Notifications.scheduleNotificationAsync({content:await buildContent(task,1,task.id+1,'atraso_1h'),trigger:dateTrigger(at)});
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
  const orphans=pending.filter(n=>!known.has(n.identifier)&&n.content.data?.kind!=='test').map(n=>n.identifier);
  if(orphans.length)console.warn('[notifications] cancelling orphan schedules',orphans.length);
  await cancelTaskReminders(orphans);
  return orphans.length;
}
/**
 * Teste em Ajustes: avisos seguidos (a cada 10 s) com o rosto e a mensagem de cada momento
 * da personalidade escolhida — no horário, +1 h e +3 h — e um 4º no formato clássico, para comparar.
 */
export async function testNotification(){
  const permission=await Notifications.getPermissionsAsync();
  if(!permission.granted)throw new Error('Permissão de notificações não concedida.');
  const prefs=await getPreferences();
  // Um teste por vez: tocar várias vezes no botão não empilha avisos.
  const previous=(await Notifications.getAllScheduledNotificationsAsync()).filter(n=>n.content.data?.kind==='test').map(n=>n.identifier);
  await cancelTaskReminders(previous);
  // O 4º aviso usa o formato clássico (rosto só como imagem à direita) para comparar com a conversa.
  const steps:{stage:ReminderStage;moment:FaceMoment;label:string;classic?:boolean}[]=[
    {stage:0,moment:'no_horario',label:'no horário'},
    {stage:2,moment:'atraso_1h',label:'1 h de atraso'},
    {stage:3,moment:'atraso_3h',label:'3 h de atraso'},
    {stage:3,moment:'atraso_3h',label:'formato clássico',classic:true},
  ];
  const ids:string[]=[];
  for(let i=0;i<steps.length;i++){
    const {stage,moment,label,classic}=steps[i];
    const face=notificationFace(prefs.personality,moment);
    ids.push(await Notifications.scheduleNotificationAsync({
      content:{
        title:prefs.privatePreviews?'Ping - lembrete':`Teste do Ping · ${label}`,
        body:prefs.privatePreviews?'Abra o Ping para conferir seu lembrete.':reminderMessage('general',stage,0,prefs.displayName,prefs.addressStyle,prefs.personality),
        data:{kind:'test',...(face?{largeIcon:face.largeIcon,smallIcon:face.smallIcon}:{}),...(classic?{pingStyle:'classic'}:{})},
        ...(face&&Platform.OS==='android'?{color:face.color}:{}),
      },
      trigger:dateTrigger(Date.now()+10000*(i+1)),
    }));
  }
  return ids;
}
