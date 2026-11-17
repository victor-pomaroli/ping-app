/**
 * Amizade e conquistas (Fase 2 do plano de gamificação).
 * XP de amizade é permanente: deriva do histórico imutável de recompensas, nunca expira nem regride.
 * Conquistas desbloqueiam uma vez (INSERT OR IGNORE) e não alteram o funcionamento das tarefas.
 * Sem imports de runtime: roda nos testes do Node.
 */
import type {RewardDb} from './rewards.ts';

export const XP_PER_TASK=10;
/** Hipóteses de balanceamento: ajustar com o beta. */
export const FRIENDSHIP_LEVELS=[
  {level:1,name:'Conhecidos',xp:0,message:'O Ping ainda está te estudando.'},
  {level:2,name:'Colegas',xp:50,message:'Já dá pra contar com você.'},
  {level:3,name:'Amigos',xp:150,message:'Agora sim, somos um time.'},
  {level:4,name:'Parceiros',xp:350,message:'Você faz acontecer e o Ping vê.'},
  {level:5,name:'Inseparáveis',xp:700,message:'Nem o Ping acredita no quanto vocês andaram.'},
] as const;
export type FriendshipInfo={level:number;name:string;message:string;xp:number;nextXp:number|null;progress:number};

/** Nível e progresso até o próximo, a partir do XP. progress vai de 0 a 1 (1 no nível máximo). */
export function friendshipLevel(xp:number):FriendshipInfo{
  const safe=Math.max(0,Math.floor(xp));
  let idx=0;
  FRIENDSHIP_LEVELS.forEach((l,i)=>{if(safe>=l.xp)idx=i;});
  const cur=FRIENDSHIP_LEVELS[idx],next=FRIENDSHIP_LEVELS[idx+1];
  return {level:cur.level,name:cur.name,message:cur.message,xp:safe,nextXp:next?next.xp:null,
    progress:next?(safe-cur.xp)/(next.xp-cur.xp):1};
}

export type ProgressStats={tasks:number;routineOccurrences:number;coinsEarned:number;bonusWeeks:number;bestStreak:number;xp:number};
export type Achievement={id:string;title:string;description:string;done:(s:ProgressStats)=>boolean};
export const ACHIEVEMENTS:readonly Achievement[]=[
  {id:'first_task',title:'Primeira vez',description:'Conclua sua primeira tarefa.',done:s=>s.tasks>=1},
  {id:'tasks_10',title:'Pegando o jeito',description:'Conclua 10 tarefas.',done:s=>s.tasks>=10},
  {id:'tasks_50',title:'Máquina de fazer',description:'Conclua 50 tarefas.',done:s=>s.tasks>=50},
  {id:'tasks_100',title:'Centenário',description:'Conclua 100 tarefas.',done:s=>s.tasks>=100},
  {id:'first_routine',title:'Rotina é rotina',description:'Conclua uma rotina.',done:s=>s.routineOccurrences>=1},
  {id:'streak_3',title:'Três seguidos',description:'3 dias de sequência.',done:s=>s.bestStreak>=3},
  {id:'streak_7',title:'Semana inteira',description:'7 dias de sequência.',done:s=>s.bestStreak>=7},
  {id:'streak_30',title:'Mês de fogo',description:'30 dias de sequência.',done:s=>s.bestStreak>=30},
  {id:'week_bonus',title:'Semana consistente',description:'Conclua tarefas em 3 dias da mesma semana.',done:s=>s.bonusWeeks>=1},
  {id:'friend_3',title:'Amigos de verdade',description:'Chegue ao nível 3 de amizade.',done:s=>friendshipLevel(s.xp).level>=3},
];

export async function ensureProgressTables(db:RewardDb){
  await db.execAsync(`CREATE TABLE IF NOT EXISTS achievements_unlocked(id TEXT PRIMARY KEY,unlocked_at INTEGER NOT NULL);`);
}
/** XP e contadores vêm só do histórico de recompensas (imutável). A sequência melhor vem de fora (`streak.ts`). */
export async function loadStats(db:RewardDb,bestStreak:number):Promise<ProgressStats>{
  const row=await db.getFirstAsync<{tasks:number;routines:number;coins:number}>(
    `SELECT COUNT(*) AS tasks,
      COALESCE(SUM(CASE WHEN e.idempotency_key LIKE 'routine:%' THEN 1 ELSE 0 END),0) AS routines,
      COALESCE(SUM(t.amount),0) AS coins
     FROM reward_events e JOIN wallet_transactions t ON t.event_id=e.id
     WHERE e.event_type='task_complete' AND t.amount>0`);
  const weeks=await db.getFirstAsync<{n:number}>("SELECT COUNT(*) AS n FROM reward_events WHERE event_type='week_consistency'");
  const tasks=row?.tasks??0;
  return {tasks,routineOccurrences:row?.routines??0,coinsEarned:row?.coins??0,bonusWeeks:weeks?.n??0,bestStreak,xp:tasks*XP_PER_TASK};
}
/** Desbloqueia o que ficou elegível e devolve só as conquistas novas (para a celebração curta). */
export async function unlockAchievements(db:RewardDb,stats:ProgressStats,now=Date.now()):Promise<Achievement[]>{
  const fresh:Achievement[]=[];
  for(const a of ACHIEVEMENTS){
    if(!a.done(stats))continue;
    const r=await db.runAsync('INSERT OR IGNORE INTO achievements_unlocked(id,unlocked_at) VALUES(?,?)',a.id,now);
    if(r.changes>0)fresh.push(a);
  }
  return fresh;
}
export async function listUnlocked(db:RewardDb):Promise<string[]>{
  const rows=await db.getAllAsync<{id:string}>('SELECT id FROM achievements_unlocked ORDER BY unlocked_at,id');
  return rows.map(r=>r.id);
}
