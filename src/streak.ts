/**
 * Sequência (streak): dias seguidos em que tudo o que estava marcado para o dia foi feito.
 * Um dia conta pelo que tinha: rotinas que ocorreram + tarefas com data naquele dia (eventos ficam de fora).
 * Dia sem nada marcado é neutro: não quebra a sequência e não soma. Dia com algo pendente que ficou
 * para trás (parte feita ou nada feito) quebra. Hoje ainda pode ser salvo: só entra na conta quando tudo está feito.
 */
export type DayScore={planned:number;done:number};
export type DayResult='all'|'partial'|'none'|'empty';
export const STREAK_MILESTONES=[3,7,14,30,100];

export function dayResult(score?:DayScore|null):DayResult{
  if(!score||score.planned<=0)return 'empty';
  if(score.done>=score.planned)return 'all';
  return score.done>0?'partial':'none';
}
/** 'YYYY-MM-DD' ± dias, sem depender de fuso. */
export function dayKeyAdd(day:string,delta:number):string{
  const [y,m,d]=day.split('-').map(Number);
  const date=new Date(Date.UTC(y,m-1,d+delta));
  return [date.getUTCFullYear(),String(date.getUTCMonth()+1).padStart(2,'0'),String(date.getUTCDate()).padStart(2,'0')].join('-');
}
export type StreakInfo={current:number;best:number;today:DayScore;todayDone:boolean;remaining:number;atRisk:boolean};
/**
 * `scores`: dias fechados (até ontem). `today`: placar de hoje ao vivo.
 * current = dias seguidos terminando hoje (se hoje está completo) ou ontem (hoje ainda pode ser salvo).
 */
export function streakInfo(scores:Map<string,DayScore>,todayKey:string,today:DayScore):StreakInfo{
  const first=[...scores.keys()].sort()[0]??todayKey;
  const todayRes=dayResult(today);
  let current=0;
  if(todayRes==='all')current++;
  for(let day=dayKeyAdd(todayKey,-1);day>=first;day=dayKeyAdd(day,-1)){
    const r=dayResult(scores.get(day));
    if(r==='all')current++;
    else if(r!=='empty')break;
  }
  let best=0,run=0;
  for(let day=first;day<todayKey;day=dayKeyAdd(day,1)){
    const r=dayResult(scores.get(day));
    if(r==='all'){run++;best=Math.max(best,run);}
    else if(r!=='empty')run=0;
  }
  if(todayRes==='all'){run++;best=Math.max(best,run);}
  const remaining=Math.max(0,today.planned-today.done);
  const streakBefore=current-(todayRes==='all'?1:0);
  return {current,best,today,todayDone:todayRes==='all',remaining,atRisk:todayRes!=='all'&&todayRes!=='empty'&&streakBefore>0};
}
/** O dia anterior quebrou uma sequência que valia pelo menos `min` dias? Devolve o tamanho dela. */
export function brokenStreak(scores:Map<string,DayScore>,todayKey:string,min=3):number{
  const yesterday=dayKeyAdd(todayKey,-1);
  const r=dayResult(scores.get(yesterday));
  if(r==='all'||r==='empty')return 0;
  let run=0;
  const first=[...scores.keys()].sort()[0]??yesterday;
  for(let day=dayKeyAdd(yesterday,-1);day>=first;day=dayKeyAdd(day,-1)){
    const x=dayResult(scores.get(day));
    if(x==='all')run++;
    else if(x!=='empty')break;
  }
  return run>=min?run:0;
}
