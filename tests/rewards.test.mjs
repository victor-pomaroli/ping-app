import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {grantTestCoins,ensureRewardTables,grantTaskReward,getBalance,earnedOnDay,weekBounds,coinsForTask,taskRewardKey,REWARD_CONFIG} from '../src/rewards.ts';

/** Adaptador mínimo: expõe o DatabaseSync do Node com a mesma forma do expo-sqlite. */
function makeDb(){
  const raw=new DatabaseSync(':memory:');
  return {
    raw,
    async runAsync(sql,...p){const r=raw.prepare(sql).run(...p);return {changes:Number(r.changes),lastInsertRowId:Number(r.lastInsertRowid)};},
    async getFirstAsync(sql,...p){return raw.prepare(sql).get(...p)??null;},
    async getAllAsync(sql,...p){return raw.prepare(sql).all(...p);},
    async execAsync(sql){raw.exec(sql);},
    async withTransactionAsync(fn){raw.exec('BEGIN');try{await fn();raw.exec('COMMIT');}catch(e){raw.exec('ROLLBACK');throw e;}},
  };
}
const task=(id,o={})=>({id,daily:0,parent_id:null,kind:'task',...o});
async function fresh(){const db=makeDb();await ensureRewardTables(db);return db;}

test('concluir a mesma tarefa várias vezes paga uma vez só',async()=>{
  const db=await fresh();
  const a=await grantTaskReward(db,task(1),'2026-11-17');
  const b=await grantTaskReward(db,task(1),'2026-11-17');
  const c=await grantTaskReward(db,task(1),'2026-11-18'); // desfazer e refazer em outro dia
  assert.equal(a.coins,5);assert.equal(b.duplicate,true);assert.equal(c.duplicate,true);
  assert.equal(await getBalance(db),5);
});
test('rotina paga uma vez por ocorrência, não uma vez na vida',async()=>{
  const db=await fresh();
  await grantTaskReward(db,task(2,{daily:1}),'2026-11-17');
  await grantTaskReward(db,task(2,{daily:1}),'2026-11-17');
  await grantTaskReward(db,task(2,{daily:1}),'2026-11-18');
  assert.equal(await getBalance(db),10);
});
test('subtarefa e evento não pagam',async()=>{
  const db=await fresh();
  assert.equal((await grantTaskReward(db,task(3,{parent_id:1}),'2026-11-17')).ineligible,true);
  assert.equal((await grantTaskReward(db,task(4,{kind:'event'}),'2026-11-17')).ineligible,true);
  assert.equal(await getBalance(db),0);
});
test('teto diário de 20 moedas; o excedente é registrado com 0 e não paga depois',async()=>{
  const db=await fresh();
  for(let i=1;i<=10;i++)await grantTaskReward(db,task(100+i),'2026-11-17');
  assert.equal(await earnedOnDay(db,'2026-11-17'),REWARD_CONFIG.dailyTaskCap);
  assert.equal(await getBalance(db),20);
  const again=await grantTaskReward(db,task(105),'2026-11-17');
  assert.equal(again.duplicate,true);assert.equal(await getBalance(db),20);
});
test('conclusões simultâneas do mesmo evento não duplicam',async()=>{
  const db=await fresh();
  await Promise.all(Array.from({length:8},()=>grantTaskReward(db,task(7),'2026-11-17').catch(()=>null)));
  assert.equal(await getBalance(db),5);
});
test('bônus de consistência: 3 dias distintos na semana, uma vez por semana',async()=>{
  const db=await fresh();
  const r1=await grantTaskReward(db,task(1),'2026-11-16'); // segunda
  const r2=await grantTaskReward(db,task(2),'2026-11-17');
  const r3=await grantTaskReward(db,task(3),'2026-11-18');
  const r4=await grantTaskReward(db,task(4),'2026-11-19');
  assert.equal(r1.bonus+r2.bonus,0);assert.equal(r3.bonus,15);assert.equal(r4.bonus,0);
  assert.equal(await getBalance(db),4*5+15);
  // semana seguinte começa do zero
  const n=await grantTaskReward(db,task(5),'2026-11-23');assert.equal(n.bonus,0);
});
test('limites da semana (segunda a domingo) sem depender de fuso',()=>{
  assert.deepEqual(weekBounds('2026-11-17'),{start:'2026-11-16',end:'2026-11-22'});
  assert.deepEqual(weekBounds('2026-11-22'),{start:'2026-11-16',end:'2026-11-22'});
  assert.deepEqual(weekBounds('2026-11-23'),{start:'2026-11-23',end:'2026-11-29'});
  assert.deepEqual(weekBounds('2026-03-01'),{start:'2026-02-23',end:'2026-03-01'});
});
test('chaves e teto são puros',()=>{
  assert.equal(taskRewardKey(task(9),'2026-11-17'),'task:9');
  assert.equal(taskRewardKey(task(9,{daily:1}),'2026-11-17'),'routine:9:2026-11-17');
  assert.equal(coinsForTask(0),5);assert.equal(coinsForTask(18),2);assert.equal(coinsForTask(20),0);assert.equal(coinsForTask(40),0);
});
test('falha no meio da transação não deixa evento órfão nem moeda sem evento',async()=>{
  const db=await fresh();
  const bad={...db,async runAsync(sql,...p){if(sql.includes('wallet_transactions'))throw new Error('disco cheio');return db.runAsync(sql,...p);}};
  await assert.rejects(grantTaskReward(bad,task(11),'2026-11-17'));
  assert.equal(await getBalance(db),0);
  assert.equal(db.raw.prepare('SELECT COUNT(*) c FROM reward_events').get().c,0);
  assert.equal((await grantTaskReward(db,task(11),'2026-11-17')).coins,5); // pode tentar de novo
});

test('moedas de teste somam ao saldo sem virar ganho de tarefa nem bônus',async()=>{
  const db=await fresh();
  assert.equal(await grantTestCoins(db,50),50);
  assert.equal(await grantTestCoins(db,1e9),1050); // limitado a 1000 por toque
  assert.equal(await earnedOnDay(db,new Date().toISOString().slice(0,10)),0);
  const r=await grantTaskReward(db,task(1),'2026-11-17');
  assert.equal(r.coins,5);assert.equal(await getBalance(db),1055);
});
