import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {ensureRewardTables,grantTaskReward} from '../src/rewards.ts';
import {ensureProgressTables,friendshipLevel,loadStats,unlockAchievements,listUnlocked,ACHIEVEMENTS,FRIENDSHIP_LEVELS,XP_PER_TASK} from '../src/progress.ts';

function makeDb(){
  const raw=new DatabaseSync(':memory:');
  return {
    async runAsync(sql,...p){const r=raw.prepare(sql).run(...p);return {changes:Number(r.changes),lastInsertRowId:Number(r.lastInsertRowid)};},
    async getFirstAsync(sql,...p){return raw.prepare(sql).get(...p)??null;},
    async getAllAsync(sql,...p){return raw.prepare(sql).all(...p);},
    async execAsync(sql){raw.exec(sql);},
    async withTransactionAsync(fn){raw.exec('BEGIN');try{await fn();raw.exec('COMMIT');}catch(e){raw.exec('ROLLBACK');throw e;}},
  };
}
const task=(id,o={})=>({id,daily:0,parent_id:null,kind:'task',...o});
async function fresh(){const db=makeDb();await ensureRewardTables(db);await ensureProgressTables(db);return db;}

test('níveis de amizade: limites, progresso e nível máximo',()=>{
  assert.equal(FRIENDSHIP_LEVELS.length,5);
  assert.equal(friendshipLevel(0).level,1);
  assert.equal(friendshipLevel(49).level,1);
  assert.equal(friendshipLevel(50).level,2);
  assert.equal(friendshipLevel(25).progress,0.5);
  const max=friendshipLevel(99999);
  assert.equal(max.level,5);assert.equal(max.nextXp,null);assert.equal(max.progress,1);
  assert.equal(friendshipLevel(-5).xp,0);
});
test('XP vem das conclusões pagas e só cresce',async()=>{
  const db=await fresh();
  for(let i=1;i<=3;i++)await grantTaskReward(db,task(i),'2026-11-17');
  await grantTaskReward(db,task(1),'2026-11-18'); // duplicada
  let s=await loadStats(db,0);
  assert.equal(s.tasks,3);assert.equal(s.xp,3*XP_PER_TASK);
  await grantTaskReward(db,task(4),'2026-11-18');
  s=await loadStats(db,0);
  assert.equal(s.xp,4*XP_PER_TASK);
});
test('evento acima do teto diário não rende XP (sem farm)',async()=>{
  const db=await fresh();
  for(let i=1;i<=6;i++)await grantTaskReward(db,task(i),'2026-11-17'); // teto 20 = 4 tarefas
  const s=await loadStats(db,0);
  assert.equal(s.tasks,4);
});
test('rotina e semana consistente entram nos contadores',async()=>{
  const db=await fresh();
  for(const d of ['2026-11-16','2026-11-17','2026-11-18'])await grantTaskReward(db,task(9,{daily:1}),d);
  const s=await loadStats(db,0);
  assert.equal(s.routineOccurrences,3);assert.equal(s.bonusWeeks,1);
});
test('conquista desbloqueia uma única vez e devolve só as novas',async()=>{
  const db=await fresh();
  await grantTaskReward(db,task(1),'2026-11-17');
  const first=await unlockAchievements(db,await loadStats(db,0));
  assert.deepEqual(first.map(a=>a.id),['first_task']);
  const again=await unlockAchievements(db,await loadStats(db,0));
  assert.equal(again.length,0);
  for(let i=2;i<=10;i++)await grantTaskReward(db,task(i),`2026-11-${10+i}`);
  const more=await unlockAchievements(db,await loadStats(db,3));
  assert.ok(more.some(a=>a.id==='tasks_10'));assert.ok(more.some(a=>a.id==='streak_3'));
  assert.equal(new Set(await listUnlocked(db)).size,(await listUnlocked(db)).length);
});
test('há 10 conquistas com ids únicos',()=>{
  assert.equal(ACHIEVEMENTS.length,10);
  assert.equal(new Set(ACHIEVEMENTS.map(a=>a.id)).size,10);
});
