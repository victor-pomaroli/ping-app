/**
 * Backup e restauração locais (issue #28), grátis. Lógica pura sobre o banco: gera um JSON com tudo o que é
 * do usuário (tarefas, histórico, preferências, moedas, conquistas) e restaura de forma atômica.
 * Fora do backup, de propósito: `task_notifications` (ids de notificações do aparelho, derivados; quem restaura
 * deve chamar o reagendamento) e `meta:pro` (o direito do Pro vem da loja, nunca de um arquivo).
 * Sem imports de runtime: roda nos testes do Node.
 */
import type {RewardDb} from './rewards.ts';

export const BACKUP_FORMAT='ping-backup';
export const BACKUP_VERSION=1;
/** Ordem importa na restauração (eventos antes das transações que apontam para eles). */
export const BACKUP_TABLES=['tasks','daily_history','day_scores','app_preferences','reward_events','wallet_transactions','achievements_unlocked','inventory','room_slots'] as const;
/** Tabelas que backups antigos (antes da loja) não trazem: ficam vazias em vez de recusar o arquivo. */
const OPTIONAL_TABLES:readonly string[]=['inventory','room_slots'];
const SKIP_PREFERENCES=['meta:pro'];
export type Backup={format:string;version:number;createdAt:number;appVersion:string;tables:Record<string,Record<string,unknown>[]>};
export type RestoreSummary={tasks:number;coinsBalance:number;achievements:number};

const PREFS_DDL='CREATE TABLE IF NOT EXISTS app_preferences (key TEXT PRIMARY KEY,value TEXT NOT NULL)';
async function columnsOf(db:RewardDb,table:string):Promise<string[]>{
  return (await db.getAllAsync<{name:string}>(`PRAGMA table_info(${table})`)).map(c=>c.name);
}
export async function createBackup(db:RewardDb,appVersion:string,now=Date.now()):Promise<Backup>{
  await db.execAsync(PREFS_DDL); // criada sob demanda pelo app; pode ainda não existir
  const tables:Backup['tables']={};
  for(const t of BACKUP_TABLES){
    let rows=await db.getAllAsync<Record<string,unknown>>(`SELECT * FROM ${t}`);
    if(t==='app_preferences')rows=rows.filter(r=>!SKIP_PREFERENCES.includes(String(r.key)));
    tables[t]=rows;
  }
  return {format:BACKUP_FORMAT,version:BACKUP_VERSION,createdAt:now,appVersion,tables};
}
/** Valida o arquivo antes de tocar no banco. Devolve o backup tipado ou lança com mensagem para o usuário. */
export function parseBackup(text:string):Backup{
  let data:any;
  try{data=JSON.parse(text);}catch{throw new Error('Este arquivo não é um backup do Ping.');}
  if(!data||data.format!==BACKUP_FORMAT)throw new Error('Este arquivo não é um backup do Ping.');
  if(typeof data.version!=='number'||data.version>BACKUP_VERSION)throw new Error('Este backup é de uma versão mais nova do Ping. Atualize o app e tente de novo.');
  if(!data.tables||typeof data.tables!=='object')throw new Error('O backup está incompleto.');
  for(const t of BACKUP_TABLES){
    if(data.tables[t]===undefined&&OPTIONAL_TABLES.includes(t))data.tables[t]=[];
    if(!Array.isArray(data.tables[t]))throw new Error(`O backup está incompleto (faltou ${t}).`);
  }
  return data as Backup;
}
/**
 * Substitui os dados atuais pelos do backup, numa transação: se algo falhar, nada muda.
 * Colunas desconhecidas do arquivo são rejeitadas (nomes de coluna entram no SQL, então só passam os que o banco tem);
 * colunas que o backup não traz ficam com o DEFAULT do banco (backups antigos continuam valendo).
 */
export async function restoreBackup(db:RewardDb,backup:Backup):Promise<RestoreSummary>{
  await db.execAsync(PREFS_DDL);
  const known:Record<string,string[]>={};
  for(const t of BACKUP_TABLES)known[t]=await columnsOf(db,t);
  for(const t of BACKUP_TABLES)for(const row of backup.tables[t]){
    if(!row||typeof row!=='object')throw new Error('O backup tem dados inválidos.');
    for(const col of Object.keys(row))if(!known[t].includes(col))throw new Error(`O backup tem uma coluna desconhecida (${t}.${col}).`);
  }
  await db.withTransactionAsync(async()=>{
    for(const t of [...BACKUP_TABLES].reverse()){
      if(t==='app_preferences'){
        await db.runAsync(`DELETE FROM app_preferences WHERE key NOT IN (${SKIP_PREFERENCES.map(()=>'?').join(',')})`,...SKIP_PREFERENCES);
      }else await db.runAsync(`DELETE FROM ${t}`);
    }
    await db.runAsync('DELETE FROM task_notifications');
    for(const t of BACKUP_TABLES)for(const row of backup.tables[t]){
      if(t==='app_preferences'&&SKIP_PREFERENCES.includes(String(row.key)))continue;
      const cols=Object.keys(row);
      if(!cols.length)continue;
      await db.runAsync(`INSERT OR REPLACE INTO ${t}(${cols.join(',')}) VALUES(${cols.map(()=>'?').join(',')})`,...cols.map(c=>row[c] as any));
    }
  });
  const bal=await db.getFirstAsync<{b:number}>('SELECT COALESCE(SUM(amount),0) AS b FROM wallet_transactions');
  const tasks=await db.getFirstAsync<{n:number}>('SELECT COUNT(*) AS n FROM tasks');
  const ach=await db.getFirstAsync<{n:number}>('SELECT COUNT(*) AS n FROM achievements_unlocked');
  return {tasks:tasks?.n??0,coinsBalance:bal?.b??0,achievements:ach?.n??0};
}
