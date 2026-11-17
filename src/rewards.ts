/**
 * Motor de recompensas (Fase 1 do plano de gamificação).
 * Regras: a UI nunca credita moedas; quem credita é este serviço, a partir de eventos de conclusão,
 * numa transação SQLite. Idempotente: o mesmo evento nunca paga duas vezes. Nada é punido: desfazer
 * uma conclusão não tira moedas, e refazê-la não paga de novo.
 * Sem imports de propósito: roda nos testes do Node (tests/rewards.test.mjs) com o banco de teste.
 */
export type RewardDb={
  runAsync(sql:string,...params:any[]):Promise<{changes:number;lastInsertRowId:number}>;
  getFirstAsync<T>(sql:string,...params:any[]):Promise<T|null>;
  getAllAsync<T>(sql:string,...params:any[]):Promise<T[]>;
  execAsync(sql:string):Promise<void>;
  withTransactionAsync(task:()=>Promise<void>):Promise<void>;
};
/** Hipóteses de balanceamento (plano, seção 5): ajustar após simulação e beta, não tratar como definitivas. */
export const REWARD_CONFIG={taskCoins:5,dailyTaskCap:20,weeklyBonus:15,weeklyDaysNeeded:3} as const;
export type RewardTask={id:number;daily:number|boolean;parent_id:number|null;kind:string};
export type RewardResult={duplicate:boolean;ineligible:boolean;coins:number;bonus:number};

export async function ensureRewardTables(db:RewardDb){
  await db.execAsync(`CREATE TABLE IF NOT EXISTS reward_events(
    id INTEGER PRIMARY KEY AUTOINCREMENT,source_type TEXT NOT NULL,source_id INTEGER,event_type TEXT NOT NULL,
    occurred_at INTEGER NOT NULL,reward_date TEXT NOT NULL,idempotency_key TEXT NOT NULL UNIQUE);
  CREATE TABLE IF NOT EXISTS wallet_transactions(
    id INTEGER PRIMARY KEY AUTOINCREMENT,event_id INTEGER NOT NULL,amount INTEGER NOT NULL,reason TEXT NOT NULL,created_at INTEGER NOT NULL,
    FOREIGN KEY(event_id) REFERENCES reward_events(id));
  CREATE INDEX IF NOT EXISTS idx_reward_events_day ON reward_events(reward_date,event_type);
  CREATE INDEX IF NOT EXISTS idx_wallet_event ON wallet_transactions(event_id);`);
}

/** Segunda-feira da semana de 'YYYY-MM-DD' e o domingo dela, sem depender de fuso. */
export function weekBounds(day:string):{start:string;end:string}{
  const [y,m,d]=day.split('-').map(Number);
  const date=new Date(Date.UTC(y,m-1,d));
  const back=(date.getUTCDay()+6)%7;
  const fmt=(t:Date)=>[t.getUTCFullYear(),String(t.getUTCMonth()+1).padStart(2,'0'),String(t.getUTCDate()).padStart(2,'0')].join('-');
  return {start:fmt(new Date(Date.UTC(y,m-1,d-back))),end:fmt(new Date(Date.UTC(y,m-1,d-back+6)))};
}
/** Só tarefa principal conta (subtarefa e evento não), para não dar para multiplicar moedas dividindo tarefas. */
export const isRewardEligible=(t:RewardTask)=>!t.parent_id&&t.kind==='task';
/** Tarefa comum paga uma vez na vida; rotina paga uma vez por ocorrência (dia). */
export const taskRewardKey=(t:RewardTask,day:string)=>t.daily?`routine:${t.id}:${day}`:`task:${t.id}`;
/** Moedas que ainda cabem hoje, dado o que já foi ganho com tarefas no dia. */
export const coinsForTask=(earnedToday:number)=>Math.max(0,Math.min(REWARD_CONFIG.taskCoins,REWARD_CONFIG.dailyTaskCap-earnedToday));

export async function getBalance(db:RewardDb):Promise<number>{
  return (await db.getFirstAsync<{b:number}>('SELECT COALESCE(SUM(amount),0) AS b FROM wallet_transactions'))?.b??0;
}
export async function earnedOnDay(db:RewardDb,day:string):Promise<number>{
  return (await db.getFirstAsync<{b:number}>(
    "SELECT COALESCE(SUM(t.amount),0) AS b FROM wallet_transactions t JOIN reward_events e ON e.id=t.event_id WHERE e.reward_date=? AND e.event_type='task_complete'",day))?.b??0;
}
/**
 * Registra a conclusão e credita as moedas na mesma transação. `day` é o dia local da conclusão.
 * A chave de idempotência (UNIQUE) é a defesa contra duplicidade: reabrir, desfazer e refazer ou
 * reprocessar o evento não paga de novo. Passou do teto diário: o evento é registrado com 0 moeda.
 */
export async function grantTaskReward(db:RewardDb,task:RewardTask,day:string,now=Date.now()):Promise<RewardResult>{
  const result:RewardResult={duplicate:false,ineligible:false,coins:0,bonus:0};
  if(!isRewardEligible(task)){result.ineligible=true;return result;}
  await db.withTransactionAsync(async()=>{
    const ev=await db.runAsync(
      "INSERT OR IGNORE INTO reward_events(source_type,source_id,event_type,occurred_at,reward_date,idempotency_key) VALUES('task',?,'task_complete',?,?,?)",
      task.id,now,day,taskRewardKey(task,day));
    if(!ev.changes){result.duplicate=true;return;}
    result.coins=coinsForTask(await earnedOnDay(db,day));
    if(result.coins>0)await db.runAsync("INSERT INTO wallet_transactions(event_id,amount,reason,created_at) VALUES(?,?,'task_complete',?)",ev.lastInsertRowId,result.coins,now);
    const week=weekBounds(day);
    const days=(await db.getFirstAsync<{n:number}>(
      "SELECT COUNT(DISTINCT reward_date) AS n FROM reward_events WHERE event_type='task_complete' AND reward_date>=? AND reward_date<=?",week.start,week.end))?.n??0;
    if(days>=REWARD_CONFIG.weeklyDaysNeeded){
      const bonus=await db.runAsync(
        "INSERT OR IGNORE INTO reward_events(source_type,source_id,event_type,occurred_at,reward_date,idempotency_key) VALUES('week',NULL,'week_consistency',?,?,?)",
        now,day,`week:${week.start}`);
      if(bonus.changes){
        result.bonus=REWARD_CONFIG.weeklyBonus;
        await db.runAsync("INSERT INTO wallet_transactions(event_id,amount,reason,created_at) VALUES(?,?,'week_consistency',?)",bonus.lastInsertRowId,result.bonus,now);
      }
    }
  });
  return result;
}

/** Ferramenta de teste (Ajustes): credita moedas sem concluir tarefa. Não conta para XP, conquistas, teto nem bônus. */
export async function grantTestCoins(db:RewardDb,amount:number,now=Date.now()):Promise<number>{
  const coins=Math.max(1,Math.min(1000,Math.floor(amount)));
  await db.withTransactionAsync(async()=>{
    const ev=await db.runAsync(
      "INSERT INTO reward_events(source_type,source_id,event_type,occurred_at,reward_date,idempotency_key) VALUES('test',NULL,'test_grant',?,?,?)",
      now,new Date(now).toISOString().slice(0,10),`test:${now}:${Math.random().toString(36).slice(2,8)}`);
    await db.runAsync('INSERT INTO wallet_transactions(event_id,amount,reason,created_at) VALUES(?,?,?,?)',ev.lastInsertRowId,coins,'teste',now);
  });
  return getBalance(db);
}
