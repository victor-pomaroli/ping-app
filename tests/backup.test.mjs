import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {ensureRewardTables,grantTaskReward,getBalance} from '../src/rewards.ts';
import {ensureProgressTables,unlockAchievements,loadStats} from '../src/progress.ts';
import {createBackup,parseBackup,restoreBackup} from '../src/backup.ts';

function makeDb(){
  const raw=new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys=ON');
  return {
    raw,
    async runAsync(sql,...p){const r=raw.prepare(sql).run(...p);return {changes:Number(r.changes),lastInsertRowId:Number(r.lastInsertRowid)};},
    async getFirstAsync(sql,...p){return raw.prepare(sql).get(...p)??null;},
    async getAllAsync(sql,...p){return raw.prepare(sql).all(...p);},
    async execAsync(sql){raw.exec(sql);},
    async withTransactionAsync(fn){raw.exec('BEGIN');try{await fn();raw.exec('COMMIT');}catch(e){raw.exec('ROLLBACK');throw e;}},
  };
}
async function app(){
  const db=makeDb();
  db.raw.exec(`CREATE TABLE tasks(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,due_at INTEGER NOT NULL,completed INTEGER NOT NULL DEFAULT 0,daily INTEGER NOT NULL DEFAULT 0,parent_id INTEGER,kind TEXT NOT NULL DEFAULT 'task',notification_id TEXT);
  CREATE TABLE task_notifications(notification_id TEXT PRIMARY KEY,task_id INTEGER NOT NULL,stage INTEGER NOT NULL,scheduled_at INTEGER NOT NULL,FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE);
  CREATE TABLE daily_history(task_id INTEGER NOT NULL,day TEXT NOT NULL,completed INTEGER NOT NULL,PRIMARY KEY(task_id,day));
  CREATE TABLE day_scores(day TEXT PRIMARY KEY,planned INTEGER NOT NULL,done INTEGER NOT NULL);`);
  await ensureRewardTables(db);await ensureProgressTables(db);
  return db;
}
async function seed(db){
  db.raw.exec("INSERT INTO tasks(title,due_at,notification_id) VALUES('Pagar conta',1000,'n1'),('Treinar',2000,'n2')");
  db.raw.exec("INSERT INTO task_notifications VALUES('n1',1,0,1000)");
  db.raw.exec("INSERT INTO day_scores VALUES('2026-11-16',2,2)");
  db.raw.exec("CREATE TABLE app_preferences(key TEXT PRIMARY KEY,value TEXT NOT NULL)");
  db.raw.exec("INSERT INTO app_preferences VALUES('theme','rose'),('meta:pro','{\"pro\":true}')");
  await grantTaskReward(db,{id:1,daily:0,parent_id:null,kind:'task'},'2026-11-17');
  await unlockAchievements(db,await loadStats(db,0));
}

test('backup e restauração em outro aparelho preservam tarefas, moedas e conquistas',async()=>{
  const a=await app();await seed(a);
  const file=JSON.stringify(await createBackup(a,'1.9.1'));
  const b=await app();
  const r=await restoreBackup(b,parseBackup(file));
  assert.equal(r.tasks,2);assert.equal(r.coinsBalance,5);assert.equal(r.achievements,1);
  assert.equal(await getBalance(b),5);
  assert.equal(b.raw.prepare("SELECT value FROM app_preferences WHERE key='theme'").get().value,'rose');
});
test('o Pro nunca viaja no arquivo, nem some do aparelho ao restaurar',async()=>{
  const a=await app();await seed(a);
  const backup=await createBackup(a,'1.9.1');
  assert.equal(backup.tables.app_preferences.some(r=>r.key==='meta:pro'),false);
  const b=await app();
  b.raw.exec("CREATE TABLE app_preferences(key TEXT PRIMARY KEY,value TEXT NOT NULL)");
  b.raw.exec("INSERT INTO app_preferences VALUES('meta:pro','{\"pro\":true}'),('theme','dark')");
  await restoreBackup(b,backup);
  assert.equal(b.raw.prepare("SELECT value FROM app_preferences WHERE key='meta:pro'").get().value,'{"pro":true}');
  assert.equal(b.raw.prepare("SELECT value FROM app_preferences WHERE key='theme'").get().value,'rose');
});
test('restaurar substitui os dados atuais e limpa notificações antigas',async()=>{
  const a=await app();await seed(a);
  const backup=await createBackup(a,'1.9.1');
  a.raw.exec("INSERT INTO tasks(title,due_at) VALUES('Lixo',3000)");
  await restoreBackup(a,backup);
  assert.equal(a.raw.prepare('SELECT COUNT(*) n FROM tasks').get().n,2);
  assert.equal(a.raw.prepare('SELECT COUNT(*) n FROM task_notifications').get().n,0);
});
test('arquivo inválido ou de versão futura é recusado sem tocar no banco',async()=>{
  assert.throws(()=>parseBackup('não é json'),/não é um backup/);
  assert.throws(()=>parseBackup('{"format":"outro"}'),/não é um backup/);
  assert.throws(()=>parseBackup(JSON.stringify({format:'ping-backup',version:99,tables:{}})),/mais nova/);
  assert.throws(()=>parseBackup(JSON.stringify({format:'ping-backup',version:1,tables:{tasks:[]}})),/incompleto/);
});
test('coluna desconhecida (possível injeção) é rejeitada e nada muda',async()=>{
  const a=await app();await seed(a);
  const backup=await createBackup(a,'1.9.1');
  backup.tables.tasks[0]['title) VALUES(1); DROP TABLE tasks; --']='x';
  await assert.rejects(()=>restoreBackup(a,backup),/coluna desconhecida/);
  assert.equal(a.raw.prepare('SELECT COUNT(*) n FROM tasks').get().n,2);
});
test('falha no meio da restauração desfaz tudo',async()=>{
  const a=await app();await seed(a);
  const backup=await createBackup(a,'1.9.1');
  backup.tables.tasks[1].title=null; // viola NOT NULL
  await assert.rejects(()=>restoreBackup(a,backup));
  assert.equal(a.raw.prepare('SELECT COUNT(*) n FROM tasks').get().n,2);
  assert.equal(await getBalance(a),5);
});
test('backup antigo sem colunas novas usa o DEFAULT do banco',async()=>{
  const a=await app();await seed(a);
  const backup=await createBackup(a,'1.9.1');
  for(const r of backup.tables.tasks){delete r.kind;delete r.daily;}
  await restoreBackup(a,backup);
  assert.equal(a.raw.prepare("SELECT kind FROM tasks WHERE id=1").get().kind,'task');
});
