import {Task,localDay} from './store';
/**
 * Ordem única para Hoje e Tarefas: rotinas (do dia) primeiro (pelo horário), depois as tarefas
 * com data pelo vencimento mais próximo (prioridade não interfere) e, por fim, as sem data,
 * ordenadas por prioridade (alta → baixa). Eventos vêm logo depois das diárias, pelo horário.
 */
const priorityRank={high:0,medium:1,low:2};
const minutesOfDay=(ms:number)=>{const d=new Date(ms);return d.getHours()*60+d.getMinutes();};
function group(t:Task){return t.daily?0:t.kind==='event'?1:t.no_due?3:2;}
export function compareTasks(a:Task,b:Task){
  const ga=group(a),gb=group(b);
  if(ga!==gb)return ga-gb;
  if(ga===0){const ma=a.no_due?-1:minutesOfDay(a.due_at),mb=b.no_due?-1:minutesOfDay(b.due_at);if(ma!==mb)return ma-mb;}
  else if(ga===1||ga===2){if(a.due_at!==b.due_at)return a.due_at-b.due_at;}
  else{const pa=priorityRank[a.priority]??1,pb=priorityRank[b.priority]??1;if(pa!==pb)return pa-pb;}
  return a.id-b.id;
}
export const sortTasks=(tasks:Task[])=>[...tasks].sort(compareTasks);
export type TaskSection={key:string;label:string;tasks:Task[]};
const weekday=['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];
function dayLabel(day:string,today:string,tomorrow:string){
  if(day===today)return 'HOJE';
  if(day===tomorrow)return 'AMANHÃ';
  const [y,m,d]=day.split('-').map(Number);const date=new Date(y,m-1,d);
  const month=date.toLocaleDateString('pt-BR',{month:'short'}).replace('.','').toUpperCase();
  return `${weekday[date.getDay()]} · ${String(d).padStart(2,'0')} ${month}${y!==new Date().getFullYear()?' '+y:''}`;
}
/** Agrupa tarefas principais em seções de data: Diárias, Atrasadas, Hoje, Amanhã, cada dia, Sem data, Concluídas. */
export function sectionTasks(roots:Task[],now=Date.now()):TaskSection[]{
  const today=localDay(new Date(now));const t=new Date(now);t.setDate(t.getDate()+1);const tomorrow=localDay(t);
  const sections=new Map<string,TaskSection>();
  const push=(key:string,label:string,task:Task)=>{const s=sections.get(key)??{key,label,tasks:[]};s.tasks.push(task);sections.set(key,s);};
  const done:Task[]=[];
  for(const task of sortTasks(roots)){
    // Evento fica no dia dele (mesmo já encerrado hoje); nunca vai para atrasadas nem concluídas.
    if(task.kind==='event'){const day=localDay(new Date(task.due_at));push('d'+day,dayLabel(day,today,tomorrow),task);continue;}
    if(task.completed){done.push(task);continue;}
    if(task.daily)push('daily','ROTINAS',task);
    else if(task.no_due)push('nodate','SEM DATA',task);
    else if(task.due_at<now)push('overdue','PASSOU DA HORA',task);
    else{const day=localDay(new Date(task.due_at));push('d'+day,dayLabel(day,today,tomorrow),task);}
  }
  const order=(key:string)=>key==='daily'?0:key==='overdue'?1:key==='nodate'?3:2;
  const result=[...sections.values()].sort((a,b)=>order(a.key)-order(b.key)||a.key.localeCompare(b.key));
  if(done.length)result.push({key:'done',label:'CONCLUÍDAS',tasks:done.sort((a,b)=>(b.completed_at??0)-(a.completed_at??0))});
  return result;
}
