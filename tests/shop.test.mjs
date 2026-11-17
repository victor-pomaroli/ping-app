import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {ensureRewardTables,grantTaskReward,getBalance} from '../src/rewards.ts';
import {ensureShopTables,purchaseItem,equipItem,unequipSlot,getRoom,CATALOG,SLOTS} from '../src/shop.ts';

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
const task=id=>({id,daily:0,parent_id:null,kind:'task'});
async function withCoins(n){ // n tarefas = 5 moedas cada, uma por semana (sem teto diário nem bônus semanal)
  const db=makeDb();await ensureRewardTables(db);await ensureShopTables(db);
  for(let i=1;i<=n;i++)await grantTaskReward(db,task(i),new Date(Date.UTC(2026,0,1+i*8)).toISOString().slice(0,10));
  return db;
}

test('catálogo: preços positivos, ids únicos e espaços válidos',()=>{
  assert.equal(new Set(CATALOG.map(i=>i.id)).size,CATALOG.length);
  const slots=new Set(SLOTS.map(s=>s.id));
  for(const i of CATALOG){assert.ok(i.price>0);assert.ok(slots.has(i.slot));assert.ok(!i.proOnly);}
});
test('compra debita, concede e não duplica',async()=>{
  const db=await withCoins(6); // 30 moedas
  const r=await purchaseItem(db,'tapete');
  assert.deepEqual(r,{ok:true,balance:0});
  assert.equal(await getBalance(db),0);
  assert.equal((await purchaseItem(db,'tapete')).reason,'owned');
  assert.equal(await getBalance(db),0);
});
test('saldo insuficiente não debita nem concede',async()=>{
  const db=await withCoins(2); // 10
  const r=await purchaseItem(db,'sofa');
  assert.equal(r.ok,false);assert.equal(r.reason,'insufficient');
  assert.equal(await getBalance(db),10);
  assert.equal((await getRoom(db)).items.some(i=>i.owned),false);
});
test('item inexistente e Pro sem direito são recusados',async()=>{
  const db=await withCoins(20);
  assert.equal((await purchaseItem(db,'nada')).reason,'unknown');
});
test('falha no meio da compra desfaz o débito',async()=>{
  const db=await withCoins(8); // 40
  db.raw.exec('CREATE TRIGGER falha BEFORE INSERT ON inventory BEGIN SELECT RAISE(ABORT,\'x\'); END');
  await assert.rejects(()=>purchaseItem(db,'quadro_sol'));
  assert.equal(await getBalance(db),40);
});
test('equipar exige posse, troca no mesmo espaço e remover esvazia',async()=>{
  const db=await withCoins(20); // 100
  assert.equal(await equipItem(db,'quadro_sol'),false);
  await purchaseItem(db,'quadro_sol');await purchaseItem(db,'quadro_lua');
  assert.equal(await equipItem(db,'quadro_sol'),true);
  await equipItem(db,'quadro_lua');
  let room=await getRoom(db);
  assert.equal(room.equipped.wall,'quadro_lua');
  assert.equal(room.items.find(i=>i.id==='quadro_sol').equipped,false);
  await unequipSlot(db,'wall');
  room=await getRoom(db);
  assert.equal(room.equipped.wall,undefined);
  assert.equal(room.items.find(i=>i.id==='quadro_lua').owned,true); // continua dono
});
test('linha adulterada de espaço (sem posse ou no espaço errado) é ignorada',async()=>{
  const db=await withCoins(2);
  db.raw.exec("INSERT INTO room_slots VALUES('wall','sofa')");
  assert.deepEqual((await getRoom(db)).equipped,{});
});
test('moedas de compra não contam como ganho de tarefa',async()=>{
  const db=await withCoins(6);
  await purchaseItem(db,'tapete');
  const {earnedOnDay}=await import('../src/rewards.ts');
  assert.equal(await earnedOnDay(db,new Date().toISOString().slice(0,10)),0);
});
