/**
 * Recorrência das rotinas. `daily=1` na tarefa continua significando "é uma rotina"; o tipo vem de
 * `recur` ('daily' | 'weekly' | 'monthly') e os dias de `recur_days`:
 *  - semanal: dias da semana separados por vírgula, 0 = domingo … 6 = sábado ("1,3,5");
 *  - mensal: um dia do mês (1–31). Em meses mais curtos vale o último dia ("31" cai no dia 28/29/30).
 */
export type RecurKind='daily'|'weekly'|'monthly';
export type Recurrence={kind:RecurKind;days:number[]};
export const DAILY:Recurrence={kind:'daily',days:[]};
export const WEEKDAY_SHORT=['dom','seg','ter','qua','qui','sex','sáb'];
export const WEEKDAY_LETTER=['D','S','T','Q','Q','S','S'];
export const WEEKDAY_LONG=['domingo','segunda','terça','quarta','quinta','sexta','sábado'];

export function parseRecurrence(kind?:string|null,days?:string|null):Recurrence{
  const list=(days??'').split(',').map(x=>parseInt(x,10)).filter(n=>Number.isFinite(n));
  if(kind==='weekly'){
    const set=[...new Set(list.filter(n=>n>=0&&n<=6))].sort((a,b)=>a-b);
    return set.length?{kind:'weekly',days:set}:DAILY;
  }
  if(kind==='monthly'){
    const day=list.find(n=>n>=1&&n<=31);
    return day?{kind:'monthly',days:[day]}:DAILY;
  }
  return DAILY;
}
export const serializeDays=(r:Recurrence)=>r.kind==='daily'?'':r.days.join(',');
export const lastDayOfMonth=(year:number,month:number)=>new Date(year,month+1,0).getDate();

/** A rotina aparece (e vale lembrete) neste dia? */
export function occursOn(r:Recurrence,date:Date):boolean{
  if(r.kind==='weekly')return r.days.includes(date.getDay());
  if(r.kind==='monthly')return Math.min(r.days[0],lastDayOfMonth(date.getFullYear(),date.getMonth()))===date.getDate();
  return true;
}
/** Próximas `count` datas (à meia-noite) em que a rotina ocorre, a partir de `from` (inclusive). */
export function upcomingDays(r:Recurrence,from:Date,count:number,limitDays=400):Date[]{
  const out:Date[]=[];
  const day=new Date(from.getFullYear(),from.getMonth(),from.getDate());
  for(let i=0;i<limitDays&&out.length<count;i++){
    if(occursOn(r,day))out.push(new Date(day));
    day.setDate(day.getDate()+1);
  }
  return out;
}
/** Texto curto: "↻ diária", "↻ seg, qua e sex", "↻ todo dia 15". */
export function recurrenceLabel(r:Recurrence):string{
  if(r.kind==='weekly'){
    if(r.days.length===7)return 'diária';
    const names=r.days.map(d=>WEEKDAY_SHORT[d]);
    return names.length===1?`toda ${WEEKDAY_LONG[r.days[0]]}`.replace('toda domingo','todo domingo').replace('toda sábado','todo sábado'):names.length===2?`${names[0]} e ${names[1]}`:`${names.slice(0,-1).join(', ')} e ${names[names.length-1]}`;
  }
  if(r.kind==='monthly')return `todo dia ${r.days[0]}`;
  return 'diária';
}
export const recurrenceKindLabel=(r:Recurrence)=>r.kind==='weekly'?'semanal':r.kind==='monthly'?'mensal':'diária';
