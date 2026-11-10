import * as SQLite from 'expo-sqlite';
import {getPreferences,getMeta,setMeta} from './preferences';
import {reminderOffsets} from './templates';
import {TaskCategory} from './templates';
import {SNOOZE_STAGE,cancelOrphanNotifications,cancelTaskReminders,scheduleTaskReminders,scheduleSnoozeReminder,scheduleEventAlerts,scheduleEventSnooze,dismissTaskNotifications,dismissAllTaskNotifications,ScheduledReminder} from './notifications';
export type Task={id:number;title:string;description:string;due_at:number;priority:'low'|'medium'|'high';category:TaskCategory;completed:number;completed_at:number|null;archived_at:number|null;notification_id:string|null;parent_id:number|null;daily:number;daily_active:number;daily_day:string|null;no_due:number;kind:TaskKind;ends_at:number|null;location:string;alert_offsets:string};
/** `kind`: 'task' (tarefa) ou 'event' (evento com hora marcada, avisado antes de acontecer). */
export type TaskKind='task'|'event';
/** `no_due`: 1 = tarefa sem data ("quando?" opcional), não agenda lembretes. */
export type TaskInput=Pick<Task,'title'|'description'|'due_at'|'priority'|'category'>&{no_due?:number;kind?:TaskKind;ends_at?:number|null;location?:string;alert_offsets?:number[]};
/** Antecedências (minutos antes do início) escolhidas para um evento. */
export function eventOffsets(task:Pick<Task,'alert_offsets'>|null|undefined):number[]{
  try{const value=JSON.parse(task?.alert_offsets||'[]');return Array.isArray(value)?value.map(Number).filter(n=>Number.isFinite(n)&&n>=0):[];}catch{return [];}
}
export type ChildInput={id?:number;title:string};
const dbPromise=SQLite.openDatabaseAsync('tasks.db');
const ready=(async()=>{
  const db=await dbPromise;
  await db.execAsync(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',due_at INTEGER NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',completed INTEGER NOT NULL DEFAULT 0,
    notification_id TEXT,category TEXT NOT NULL DEFAULT 'general'
  );
  CREATE TABLE IF NOT EXISTS task_notifications (
    notification_id TEXT PRIMARY KEY,task_id INTEGER NOT NULL,
    stage INTEGER NOT NULL,scheduled_at INTEGER NOT NULL,
    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_task_notifications_task ON task_notifications(task_id);`);
  const cols=await db.getAllAsync<{name:string}>('PRAGMA table_info(tasks)');
  if(!cols.some(c=>c.name==='category'))await db.execAsync("ALTER TABLE tasks ADD COLUMN category TEXT NOT NULL DEFAULT 'general'");
  if(!cols.some(c=>c.name==='completed_at'))await db.execAsync('ALTER TABLE tasks ADD COLUMN completed_at INTEGER');
  if(!cols.some(c=>c.name==='parent_id'))await db.execAsync('ALTER TABLE tasks ADD COLUMN parent_id INTEGER');
  if(!cols.some(c=>c.name==='archived_at'))await db.execAsync('ALTER TABLE tasks ADD COLUMN archived_at INTEGER');
  if(!cols.some(c=>c.name==='daily'))await db.execAsync('ALTER TABLE tasks ADD COLUMN daily INTEGER NOT NULL DEFAULT 0');
  if(!cols.some(c=>c.name==='daily_active'))await db.execAsync('ALTER TABLE tasks ADD COLUMN daily_active INTEGER NOT NULL DEFAULT 1');
  if(!cols.some(c=>c.name==='daily_day'))await db.execAsync('ALTER TABLE tasks ADD COLUMN daily_day TEXT');
  if(!cols.some(c=>c.name==='kind'))await db.execAsync("ALTER TABLE tasks ADD COLUMN kind TEXT NOT NULL DEFAULT 'task'");
  if(!cols.some(c=>c.name==='ends_at'))await db.execAsync('ALTER TABLE tasks ADD COLUMN ends_at INTEGER');
  if(!cols.some(c=>c.name==='location'))await db.execAsync("ALTER TABLE tasks ADD COLUMN location TEXT NOT NULL DEFAULT ''");
  if(!cols.some(c=>c.name==='alert_offsets'))await db.execAsync("ALTER TABLE tasks ADD COLUMN alert_offsets TEXT NOT NULL DEFAULT '[]'");
  if(!cols.some(c=>c.name==='no_due'))await db.execAsync('ALTER TABLE tasks ADD COLUMN no_due INTEGER NOT NULL DEFAULT 0');
  await db.execAsync('CREATE TABLE IF NOT EXISTS daily_history(task_id INTEGER NOT NULL,day TEXT NOT NULL,completed INTEGER NOT NULL,PRIMARY KEY(task_id,day))');
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id)');
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(completed,due_at)');
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_tasks_archive ON tasks(archived_at,completed_at)');
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_tasks_active_category ON tasks(archived_at,category,completed,due_at,id)');
  await db.runAsync('UPDATE tasks SET completed_at=due_at WHERE completed=1 AND completed_at IS NULL');
  await db.runAsync('UPDATE tasks SET archived_at=completed_at+2592000000 WHERE completed=1 AND archived_at IS NULL AND completed_at<=?',Date.now()-2592000000);
  return db;
})();
export async function initDB(){await ready;}
async function refreshWidget(){try{const {Platform}=await import('react-native');if(Platform.OS==='android')await (await import('./widget/sync')).refreshPingWidget();}catch(e){console.warn('[widget] Refresh failed:',e);}}
/** Concluídas antes de hoje e eventos que terminaram antes de hoje saem da Home/Tarefas (continuam no Calendário). Rotinas resetam todo dia. */
const startOfToday=()=>{const d=new Date();d.setHours(0,0,0,0);return d.getTime();};
const HIDE_DONE_BEFORE_TODAY="NOT ((daily=0 AND completed=1 AND completed_at IS NOT NULL AND completed_at<?1) OR (kind='event' AND COALESCE(ends_at,due_at)<?1))";
export async function listTasks(){await syncDailyTasks();const db=await ready;const cut=startOfToday();return db.getAllAsync<Task>(`SELECT * FROM tasks WHERE archived_at IS NULL AND (daily=0 OR daily_active=1) AND (parent_id IS NULL OR parent_id NOT IN (SELECT id FROM tasks WHERE daily=1 AND daily_active<>1)) AND (parent_id IS NOT NULL OR ${HIDE_DONE_BEFORE_TODAY}) AND (parent_id IS NULL OR parent_id NOT IN (SELECT id FROM tasks WHERE parent_id IS NULL AND NOT ${HIDE_DONE_BEFORE_TODAY})) ORDER BY completed ASC,no_due ASC,due_at ASC`,cut);}
// Page by root tasks, then fetch all children of those roots in the same result.
export async function listTaskPage(limit=50,offset=0,category?:TaskCategory,kind?:TaskKind){
  await syncDailyTasks();
  const db=await ready;
  const roots=kind
    ?await db.getAllAsync<Task>(`SELECT * FROM tasks WHERE parent_id IS NULL AND archived_at IS NULL AND (daily=0 OR daily_active=1) AND ${HIDE_DONE_BEFORE_TODAY} AND kind=?2 ORDER BY completed ASC,daily DESC,no_due ASC,due_at ASC,id ASC LIMIT ?3 OFFSET ?4`,startOfToday(),kind,limit,offset)
    :category
    ?await db.getAllAsync<Task>(`SELECT * FROM tasks WHERE parent_id IS NULL AND archived_at IS NULL AND (daily=0 OR daily_active=1) AND ${HIDE_DONE_BEFORE_TODAY} AND category=? ORDER BY completed ASC,daily DESC,no_due ASC,CASE WHEN no_due=1 THEN (CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END) ELSE due_at END ASC,id ASC LIMIT ? OFFSET ?`,startOfToday(),category,limit,offset)
    :await db.getAllAsync<Task>(`SELECT * FROM tasks WHERE parent_id IS NULL AND archived_at IS NULL AND (daily=0 OR daily_active=1) AND ${HIDE_DONE_BEFORE_TODAY} ORDER BY completed ASC,daily DESC,no_due ASC,CASE WHEN no_due=1 THEN (CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END) ELSE due_at END ASC,id ASC LIMIT ? OFFSET ?`,startOfToday(),limit,offset);
  if(!roots.length)return [];
  const ids=roots.map(root=>root.id);
  const children=await db.getAllAsync<Task>(`SELECT * FROM tasks WHERE parent_id IN (${ids.map(()=>'?').join(',')}) AND archived_at IS NULL ORDER BY id ASC`,...ids);
  const byParent=new Map<number,Task[]>();
  for(const child of children){const group=byParent.get(child.parent_id!)??[];group.push(child);byParent.set(child.parent_id!,group);}
  return roots.flatMap(root=>[root,...(byParent.get(root.id)??[])]);
}
// Calendar queries: indexed timestamp ranges, root tasks only, no N+1 lookups.
/** `total`/`completed` contam tarefas; `events` conta eventos (bolinha de outra cor). */
export type CalendarDaySummary={day:string;total:number;completed:number;events:number};
export type CalendarSubtask={task:Task;completed:boolean};
export type CalendarEntry={task:Task;occurrenceDay:string;completed:boolean;routine:boolean;event:boolean;subtasks:CalendarSubtask[]};
function calendarKey(timestamp:number){return localDay(new Date(timestamp));}
/** Resumo do mês para as bolinhas: tarefas com data e eventos. Rotinas diárias ficam de fora para as datas se destacarem. */
export async function listCalendarMonth(start:number,end:number):Promise<CalendarDaySummary[]>{
  const db=await ready;
  const ordinary=await db.getAllAsync<{due_at:number;completed:number;kind:TaskKind}>(
    'SELECT due_at,completed,kind FROM tasks WHERE parent_id IS NULL AND daily=0 AND no_due=0 AND archived_at IS NULL AND due_at>=? AND due_at<?',
    start,end);
  const summaries=new Map<string,CalendarDaySummary>();
  for(const task of ordinary){
    const day=calendarKey(task.due_at);const row=summaries.get(day)??{day,total:0,completed:0,events:0};
    if(task.kind==='event')row.events++;else{row.total++;if(task.completed)row.completed++;}
    summaries.set(day,row);
  }
  return [...summaries.values()];
}
export async function listCalendarDay(start:number,end:number):Promise<CalendarEntry[]>{
  await syncDailyTasks();
  const db=await ready;
  const day=calendarKey(start);
  const ordinary=await db.getAllAsync<Task>(
    'SELECT * FROM tasks WHERE parent_id IS NULL AND daily=0 AND no_due=0 AND archived_at IS NULL AND due_at>=? AND due_at<? ORDER BY due_at ASC,id ASC',
    start,end);
  const routines=await db.getAllAsync<Task>(
    'SELECT * FROM tasks WHERE parent_id IS NULL AND daily=1 AND daily_active=1 AND archived_at IS NULL ORDER BY due_at ASC,id ASC');
  const history=day<localDay()?await db.getAllAsync<{task_id:number;completed:number}>(
    'SELECT task_id,completed FROM daily_history WHERE day=?',day):[];
  const byId=new Map(history.map(x=>[x.task_id,!!x.completed]));
  const entries:CalendarEntry[]=ordinary.map(task=>({task,occurrenceDay:day,completed:!!task.completed,routine:false,event:task.kind==='event',subtasks:[]}));
  for(const task of routines){
    if(day>localDay() || day===localDay() || byId.has(task.id)){
      entries.push({task,occurrenceDay:day,completed:day===localDay()?!!task.completed:byId.get(task.id)??false,routine:true,event:false,subtasks:[]});
    }
  }
  // Subtarefas aparecem sob a principal. Em outros dias de uma rotina não há histórico por
  // subtarefa: elas seguem o estado da principal naquele dia.
  const parents=entries.filter(e=>!e.event);
  if(parents.length){
    const children=await db.getAllAsync<Task>(`SELECT * FROM tasks WHERE parent_id IN (${parents.map(()=>'?').join(',')}) AND archived_at IS NULL ORDER BY id ASC`,...parents.map(e=>e.task.id));
    const byParent=new Map<number,Task[]>();
    for(const child of children){const group=byParent.get(child.parent_id!)??[];group.push(child);byParent.set(child.parent_id!,group);}
    for(const entry of parents){
      const otherDay=entry.routine&&day!==localDay();
      entry.subtasks=(byParent.get(entry.task.id)??[]).map(task=>({task,completed:otherDay?entry.completed:!!task.completed}));
    }
  }
  const minutes=(t:Task)=>{if(t.no_due)return -1;const d=new Date(t.due_at);return d.getHours()*60+d.getMinutes();};
  entries.sort((a,b)=>Number(a.completed)-Number(b.completed)||minutes(a.task)-minutes(b.task));
  return entries;
}
export async function listArchivedTasks(limit=50,offset=0){const db=await ready;return db.getAllAsync<Task>('SELECT * FROM tasks WHERE parent_id IS NULL AND archived_at IS NOT NULL ORDER BY archived_at DESC LIMIT ? OFFSET ?',limit,offset);}
export async function archiveTask(id:number){const db=await ready;await db.runAsync('UPDATE tasks SET archived_at=? WHERE (id=? OR parent_id=?) AND completed=1',Date.now(),id,id);await refreshWidget();}
export async function restoreArchivedTask(id:number){const db=await ready;await db.runAsync('UPDATE tasks SET archived_at=NULL WHERE id=? OR parent_id=?',id,id);await refreshWidget();}
export async function archiveOldCompletedTasks(){const db=await ready;await db.runAsync('UPDATE tasks SET archived_at=? WHERE daily=0 AND completed=1 AND archived_at IS NULL AND completed_at IS NOT NULL AND completed_at<=?',Date.now(),Date.now()-2592000000);}
/** Tarefas principais pendentes (próximas 5) e concluídas hoje (mais recentes primeiro) para o widget. */
export async function listWidgetTasks(){
  await syncDailyTasks();
  const db=await ready;const startOfDay=new Date();startOfDay.setHours(0,0,0,0);
  // Eventos não têm caixa de concluir, então ficam fora do widget de tarefas.
  const visible="parent_id IS NULL AND kind<>'event' AND (daily=0 OR daily_active=1) AND archived_at IS NULL";
  const [pending,done]=await Promise.all([
    db.getAllAsync<Task>(`SELECT * FROM tasks WHERE ${visible} AND completed=0 ORDER BY no_due ASC,due_at ASC,id ASC LIMIT 5`),
    db.getAllAsync<Task>(`SELECT * FROM tasks WHERE ${visible} AND completed=1 AND completed_at>=? ORDER BY completed_at DESC,id DESC LIMIT 5`,startOfDay.getTime()),
  ]);
  return {pending,done};
}
export async function getTask(id:number){const db=await ready;return db.getFirstAsync<Task>('SELECT * FROM tasks WHERE id=?',id);}
async function reminderIds(id:number){
  const db=await ready;
  const rows=await db.getAllAsync<{notification_id:string}>('SELECT notification_id FROM task_notifications WHERE task_id=?',id);
  return rows.map(r=>r.notification_id);
}
async function replaceReminders(id:number,task:Pick<TaskInput,'title'|'due_at'|'category'>,completed:boolean){
  const db=await ready;
  const old=await reminderIds(id);
  // Cancel first to avoid duplicated reminders; reconciliation restores any missing future ones.
  await cancelTaskReminders(old);
  await db.runAsync('DELETE FROM task_notifications WHERE task_id=?',id);
  await db.runAsync('UPDATE tasks SET notification_id=NULL WHERE id=?',id);
  const current=await getTask(id);
  if(current?.parent_id || current?.no_due || (current?.daily && !current.daily_active) || (completed && !current?.daily))return;
  const scheduled=current?.kind==='event'
    ?await scheduleEventAlerts({id,title:current.title,due_at:current.due_at,category:current.category,location:current.location,offsets:eventOffsets(current)})
    :await scheduleTaskReminders({id,title:task.title,due_at:task.due_at,category:task.category,daily:!!current?.daily,subtasks:await subtaskProgress(id)});
  try{
    for(const item of scheduled)await db.runAsync(
      'INSERT INTO task_notifications(notification_id,task_id,stage,scheduled_at) VALUES(?,?,?,?)',
      item.notification_id,id,item.stage,item.scheduled_at);
    await db.runAsync('UPDATE tasks SET notification_id=? WHERE id=?',scheduled[0]?.notification_id??null,id);
  }catch(e){await cancelTaskReminders(scheduled.map(x=>x.notification_id));throw e;}
}
/** Quantas subtarefas da tarefa ainda estão pendentes (para o texto do aviso da principal). */
async function subtaskProgress(parentId:number){
  const db=await ready;
  const row=await db.getFirstAsync<{total:number;pending:number}>('SELECT COUNT(*) AS total,COALESCE(SUM(completed=0),0) AS pending FROM tasks WHERE parent_id=? AND archived_at IS NULL',parentId);
  return row&&row.total?{total:row.total,pending:row.pending}:undefined;
}
export async function listChildren(parentId:number){const db=await ready;return db.getAllAsync<Task>('SELECT * FROM tasks WHERE parent_id=? ORDER BY id ASC',parentId);}
export async function saveTaskGroup(task:TaskInput,children:ChildInput[],id?:number,daily=false){
  const db=await ready;
  // Só um nível: uma subtarefa não recebe subtarefas nem vira rotina.
  const before=id!==undefined?await getTask(id):null;
  if(before?.parent_id){children=[];daily=false;}
  // Eventos não têm tarefas associadas, não são associados a nada e não viram rotina.
  if(task.kind==='event'){
    if(before?.parent_id)throw new Error('Uma tarefa associada não pode virar evento.');
    if(children.some(child=>child.title.trim())||(id!==undefined&&(await listChildren(id)).length))throw new Error('Eventos não têm tarefas associadas. Remova as etapas antes de transformar em evento.');
    children=[];daily=false;task={...task,no_due:0};
  }
  const clean=children.map(child=>({id:child.id,title:child.title.trim()})).filter(child=>child.title.length>0);
  const submittedIds=clean.filter(child=>child.id!==undefined).map(child=>child.id!);
  if(new Set(submittedIds).size!==submittedIds.length)throw new Error('Subtarefas duplicadas no formulário.');
  if(id!==undefined){
    const existing=await listChildren(id);
    const validIds=new Set(existing.map(child=>child.id));
    if(submittedIds.some(childId=>!validIds.has(childId)))throw new Error('Subtarefa não pertence a esta tarefa.');
  }else if(submittedIds.length)throw new Error('Uma tarefa nova não pode reutilizar subtarefas antigas.');
  if(id!==undefined)await db.runAsync('UPDATE tasks SET daily=?,daily_active=1,daily_day=? WHERE id=?',daily?1:0,daily?localDay():null,id);
  const parent=await saveTask(task,id);
  if(id===undefined){
    await db.runAsync('UPDATE tasks SET daily=?,daily_active=1,daily_day=? WHERE id=?',daily?1:0,daily?localDay():null,parent.id);
    if(daily)await replaceReminders(parent.id,task,false);
  }
  const existing=id?await listChildren(parent.id):[];
  const retained=new Set(submittedIds);
  const parentTask=await getTask(parent.id);
  // Stable database IDs preserve completion state when a child is deleted or reordered.
  await db.withTransactionAsync(async()=>{
    for(const child of clean){
      if(child.id!==undefined)await db.runAsync('UPDATE tasks SET title=? WHERE id=? AND parent_id=?',child.title,child.id,parent.id);
      else await db.runAsync('INSERT INTO tasks(title,description,due_at,priority,category,parent_id,completed,completed_at) VALUES(?,?,?,?,?,?,?,?)',child.title,'',task.due_at,task.priority,task.category,parent.id,parentTask?.completed?1:0,parentTask?.completed?Date.now():null);
    }
    for(const old of existing)if(!retained.has(old.id)){
      await db.runAsync('DELETE FROM task_notifications WHERE task_id=?',old.id);
      await db.runAsync('DELETE FROM daily_history WHERE task_id=?',old.id);
      await db.runAsync('DELETE FROM tasks WHERE id=? AND parent_id=?',old.id,parent.id);
    }
  });
  // Os avisos da principal citam quantas subtarefas faltam: reagenda com a lista nova.
  if(!before?.parent_id&&task.kind!=='event'&&(clean.length||existing.length)){
    const fresh=await getTask(parent.id);
    if(fresh)try{await replaceReminders(fresh.id,fresh,!!fresh.completed);}catch(e){console.warn(e);return {...parent,reminderError:true};}
  }
  await refreshWidget();
  return parent;
}
/** Colunas de evento; para tarefas comuns ficam vazias. */
function eventColumns(task:TaskInput):[TaskKind,number|null,string,string]{
  if(task.kind!=='event')return ['task',null,'','[]'];
  const offsets=[...new Set((task.alert_offsets??[]).filter(n=>Number.isFinite(n)&&n>=0))].sort((a,b)=>b-a).slice(0,3);
  const ends=task.ends_at&&task.ends_at>task.due_at?task.ends_at:null;
  return ['event',ends,(task.location??'').trim().slice(0,120),JSON.stringify(offsets)];
}
export async function saveTask(task:TaskInput,id?:number){
  const db=await ready;
  let taskId=id;
  if(id!==undefined){
    await db.runAsync('UPDATE tasks SET title=?,description=?,due_at=?,priority=?,category=?,no_due=?,kind=?,ends_at=?,location=?,alert_offsets=? WHERE id=?',
      task.title,task.description,task.due_at,task.priority,task.category,task.no_due?1:0,...eventColumns(task),id);
  }else{
    const result=await db.runAsync('INSERT INTO tasks(title,description,due_at,priority,category,no_due,kind,ends_at,location,alert_offsets) VALUES(?,?,?,?,?,?,?,?,?,?)',
      task.title,task.description,task.due_at,task.priority,task.category,task.no_due?1:0,...eventColumns(task));
    taskId=result.lastInsertRowId;
  }
  const current=await getTask(taskId!);
  let reminderError=false;
  try{await replaceReminders(taskId!,task,!!current?.completed);}catch(e){reminderError=true;console.warn(e);}
  await refreshWidget();
  return {id:taskId!,reminderError};
}
/**
 * Só grava o novo estado no banco (rápido): a tarefa, o histórico da rotina diária e,
 * se for uma tarefa principal, as subtarefas em cascata. Retorna a tarefa ou null.
 */
export async function setTaskCompleted(id:number,completed:boolean){
  await syncDailyTasks();
  const db=await ready;const task=await getTask(id);
  if(!task)return null;
  await db.runAsync('UPDATE tasks SET completed=?,completed_at=?,archived_at=NULL WHERE id=?',completed?1:0,completed?Date.now():null,id);
  if(task.daily)await db.runAsync('INSERT OR REPLACE INTO daily_history(task_id,day,completed) VALUES(?,?,?)',id,localDay(),completed?1:0);
  if(!task.parent_id)await db.runAsync('UPDATE tasks SET completed=?,completed_at=?,archived_at=NULL WHERE parent_id=?',completed?1:0,completed?Date.now():null,id);
  else await syncParentCompletion(task.parent_id);
  return task;
}
/**
 * Subtarefa mudou: a principal fica concluída quando todas as subtarefas estão concluídas
 * e volta a pendente quando alguma é reaberta.
 */
async function syncParentCompletion(parentId:number){
  const db=await ready;const parent=await getTask(parentId);
  const progress=await subtaskProgress(parentId);
  if(!parent||!progress)return;
  const done=progress.pending===0;
  if(done===!!parent.completed)return;
  await db.runAsync('UPDATE tasks SET completed=?,completed_at=?,archived_at=NULL WHERE id=?',done?1:0,done?Date.now():null,parentId);
  if(parent.daily)await db.runAsync('INSERT OR REPLACE INTO daily_history(task_id,day,completed) VALUES(?,?,?)',parentId,localDay(),done?1:0);
}
/** Efeitos lentos da conclusão: cancela/reagenda lembretes e limpa a bandeja. */
export async function syncTaskCompletion(task:Task,completed:boolean){
  if(task.parent_id){
    // Subtarefas não têm avisos próprios: quem muda é a principal (contagem ou conclusão).
    const parent=await getTask(task.parent_id);
    if(!parent)return;
    await replaceReminders(parent.id,parent,!!parent.completed);
    if(parent.completed)await dismissTaskNotifications(parent.id);
    return;
  }
  await replaceReminders(task.id,task,completed);
  if(completed)await dismissTaskNotifications(task.id);
}
export async function completeTask(id:number,completed:boolean){
  const task=await setTaskCompleted(id,completed);
  if(!task)return;
  await syncTaskCompletion(task,completed);
  await refreshWidget();
}
/** Botão "Adiar": tira o aviso da bandeja e agenda um novo daqui a alguns minutos. */
export async function snoozeTask(id:number){
  const db=await ready;const task=await getTask(id);
  if(!task||task.completed)return;
  await dismissTaskNotifications(id);
  // Substitui um adiamento anterior em vez de acumular vários.
  const previous=await db.getAllAsync<{notification_id:string}>('SELECT notification_id FROM task_notifications WHERE task_id=? AND stage=?',id,SNOOZE_STAGE);
  await cancelTaskReminders(previous.map(r=>r.notification_id));
  await db.runAsync('DELETE FROM task_notifications WHERE task_id=? AND stage=?',id,SNOOZE_STAGE);
  const snoozed=task.kind==='event'
    ?await scheduleEventSnooze({id,title:task.title,due_at:task.due_at,category:task.category,location:task.location,offsets:[]})
    :await scheduleSnoozeReminder({id,title:task.title,due_at:task.due_at,category:task.category,subtasks:await subtaskProgress(id)});
  if(snoozed)await db.runAsync('INSERT INTO task_notifications(notification_id,task_id,stage,scheduled_at) VALUES(?,?,?,?)',snoozed.notification_id,id,snoozed.stage,snoozed.scheduled_at);
}
export async function deleteTask(id:number,parentGoing=false){
  const db=await ready;
  // Subtarefas primeiro: assim elas não reagendam os avisos de uma principal que está sendo apagada.
  const children=await listChildren(id);
  for(const child of children)await deleteTask(child.id,true);
  await cancelTaskReminders(await reminderIds(id));
  await dismissTaskNotifications(id);
  await db.runAsync('DELETE FROM task_notifications WHERE task_id=?',id);
  const removed=parentGoing?null:await getTask(id);
  await db.runAsync('DELETE FROM daily_history WHERE task_id=?',id);
  await db.runAsync('DELETE FROM tasks WHERE id=?',id);
  // Apagar uma subtarefa muda a contagem citada no aviso da principal.
  const parent=removed?.parent_id?await getTask(removed.parent_id):null;
  if(parent)await replaceReminders(parent.id,parent,!!parent.completed).catch(console.warn);
  await refreshWidget();
}
const REMINDER_CONTENT_VERSION='3-icons';
export async function reconcileReminders(){
  await syncDailyTasks();
  const db=await ready;
  await archiveOldCompletedTasks();
  const prefs=await getPreferences();
  if(!prefs.notifications){
    const rows=await db.getAllAsync<{notification_id:string}>('SELECT notification_id FROM task_notifications');
    await cancelTaskReminders(rows.map(row=>row.notification_id));
    await db.runAsync('DELETE FROM task_notifications');
    await db.runAsync('UPDATE tasks SET notification_id=NULL');
    await cancelOrphanNotifications(async()=>new Set()).catch(console.warn);
    return;
  }
  // Conteúdo dos avisos mudou (rostos do Ping): reagenda tudo uma vez após a atualização.
  if(await getMeta('reminderContentVersion')!==REMINDER_CONTENT_VERSION){
    await rescheduleAllReminders();
    await setMeta('reminderContentVersion',REMINDER_CONTENT_VERSION);
  }
  const pending=await (await import('expo-notifications')).getAllScheduledNotificationsAsync();
  const available=new Set(pending.map(n=>n.identifier));
  const tasks=await (await ready).getAllAsync<Task>('SELECT * FROM tasks WHERE parent_id IS NULL AND no_due=0 AND (completed=0 OR daily=1) AND (daily=0 OR daily_active=1) AND archived_at IS NULL ORDER BY due_at ASC');
  const notificationRows=await db.getAllAsync<{task_id:number;notification_id:string;scheduled_at:number}>('SELECT task_id,notification_id,scheduled_at FROM task_notifications');
  const byTask=new Map<number,typeof notificationRows>();
  for(const row of notificationRows){const group=byTask.get(row.task_id)??[];group.push(row);byTask.set(row.task_id,group);}
  const now=Date.now();
  for(const task of tasks){
    const rows=byTask.get(task.id)??[];
    const ids=rows.map(r=>r.notification_id);
    if(task.completed && !task.daily){
      if(ids.length)await replaceReminders(task.id,task,true);
      continue;
    }
    // Rebuild only future occurrences when an expected scheduled ID disappeared.
    const hasFutureStage=task.daily || (task.kind==='event'
      ?eventOffsets(task).some(minutes=>task.due_at-minutes*60000>now)
      :reminderOffsets(task.category).some(minutes=>task.due_at+minutes*60000>now));
    if(rows.some(r=>r.scheduled_at>now&&!available.has(r.notification_id)) ||
       (!rows.length&&hasFutureStage)){
      await replaceReminders(task.id,task,false);
    }
  }
  // Limpa agendamentos que nenhuma tarefa conhece (lembretes antigos que repetiam sem dono).
  await cancelOrphanNotifications(trackedNotificationIds).catch(console.warn);
}
async function trackedNotificationIds(){
  const db=await ready;
  const rows=await db.getAllAsync<{notification_id:string}>('SELECT notification_id FROM task_notifications UNION SELECT notification_id FROM tasks WHERE notification_id IS NOT NULL');
  return new Set(rows.map(r=>r.notification_id));
}

export async function rescheduleAllReminders(){
  await syncDailyTasks();
  const db=await ready;
  const tasks=await db.getAllAsync<Task>('SELECT * FROM tasks WHERE parent_id IS NULL AND no_due=0 AND (completed=0 OR daily=1) AND (daily=0 OR daily_active=1) AND archived_at IS NULL ORDER BY due_at ASC');
  for(const task of tasks)await replaceReminders(task.id,task,!!task.completed);
}
export async function deleteAllTasks(){
  const db=await ready;
  const rows=await db.getAllAsync<{notification_id:string}>('SELECT notification_id FROM task_notifications');
  await cancelTaskReminders(rows.map(row=>row.notification_id));
  await db.runAsync('DELETE FROM task_notifications');
  await db.runAsync('DELETE FROM daily_history');
  await db.runAsync('DELETE FROM tasks');
  await dismissAllTaskNotifications();
  await refreshWidget();
}

export const localDay=(date=new Date())=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
export async function syncDailyTasks(){
  const db=await ready;
  const today=localDay();
  const roots=await db.getAllAsync<Task>('SELECT * FROM tasks WHERE daily=1 AND daily_active=1 AND parent_id IS NULL AND (daily_day IS NULL OR daily_day<>?)',today);
  for(const task of roots){
    if(task.daily_day)await db.runAsync('INSERT OR IGNORE INTO daily_history(task_id,day,completed) VALUES(?,?,?)',task.id,task.daily_day,task.completed?1:0);
    await db.runAsync('UPDATE tasks SET daily_day=?,completed=0,completed_at=NULL WHERE id=?',today,task.id);
    await db.runAsync('UPDATE tasks SET completed=0,completed_at=NULL WHERE parent_id=?',task.id);
  }
  // Keep at most 90 days of lightweight completion records.
  const cutoff=new Date();cutoff.setDate(cutoff.getDate()-90);
  await db.runAsync('DELETE FROM daily_history WHERE day<?',localDay(cutoff));
}
export async function listRoutines(){
  const db=await ready;return db.getAllAsync<Task>('SELECT * FROM tasks WHERE daily=1 AND daily_active>=0 AND parent_id IS NULL ORDER BY daily_active DESC,id DESC');
}
export async function setRoutineActive(id:number,active:boolean){
  const db=await ready;const task=await getTask(id);
  if(!task?.daily)return;
  await db.runAsync('UPDATE tasks SET daily_active=?,daily_day=? WHERE id=?',active?1:0,active?localDay():task.daily_day,id);
  if(active){await db.runAsync('UPDATE tasks SET completed=0,completed_at=NULL WHERE id=? OR parent_id=?',id,id);}
  await replaceReminders(id,task,false);
  await refreshWidget();
}
export async function endRoutine(id:number){
  const db=await ready;const task=await getTask(id);
  if(!task?.daily)return;
  await db.runAsync('UPDATE tasks SET daily_active=-1 WHERE id=?',id);
  await replaceReminders(id,task,true);
  await refreshWidget();
}
export async function routineHistory(id:number,limit=30){
  const db=await ready;return db.getAllAsync<{day:string;completed:number}>('SELECT day,completed FROM daily_history WHERE task_id=? ORDER BY day DESC LIMIT ?',id,limit);
}
