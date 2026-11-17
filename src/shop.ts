/**
 * Loja e Cantinho do Ping (Fase 3 do plano de gamificação). Itens só cosméticos, comprados com moedas.
 * Compra atômica e idempotente: valida saldo e posse, grava o débito no ledger e concede o item na mesma
 * transação; compra interrompida não perde moeda sem entregar o item. Nada aqui bloqueia tarefas.
 * Sem imports de runtime: roda nos testes do Node.
 */
import type {RewardDb} from './rewards.ts';
const getBalance=async(db:RewardDb):Promise<number>=>(await db.getFirstAsync<{b:number}>('SELECT COALESCE(SUM(amount),0) AS b FROM wallet_transactions'))?.b??0;

export type SlotId='wall'|'floor'|'corner'|'table'|'seat';
export type ShopItem={id:string;name:string;slot:SlotId;price:number;description:string;/** Reservado à Fase 6 (Pro): hoje nenhum item é Pro. */proOnly?:boolean};
/** Hipótese de catálogo e preços: calibrar com o beta. */
export const SLOTS:readonly {id:SlotId;name:string}[]=[
  {id:'wall',name:'Parede'},{id:'floor',name:'Chão'},{id:'corner',name:'Canto'},{id:'table',name:'Mesinha'},{id:'seat',name:'Assento'},
];
export const CATALOG:readonly ShopItem[]=[
  {id:'planta',name:'Costela-de-adão',slot:'corner',price:25,description:'Balança com o vento da janela.'},
  {id:'cacto',name:'Cacto florido',slot:'corner',price:35,description:'Zero rega, uma flor rosa.'},
  {id:'quadro_sol',name:'Quadro do sol',slot:'wall',price:40,description:'Um dia de folga emoldurado.'},
  {id:'quadro_lua',name:'Quadro da lua',slot:'wall',price:60,description:'Céu estrelado para a parede.'},
  {id:'poster_ping',name:'Pôster do Ping',slot:'wall',price:75,description:'Faça acontecer, em tamanho A3.'},
  {id:'tapete',name:'Tapete listrado',slot:'floor',price:30,description:'Bom para dançar.'},
  {id:'tapete_redondo',name:'Tapete redondo',slot:'floor',price:55,description:'Macio, felpudo e redondinho.'},
  {id:'luminaria',name:'Luminária',slot:'table',price:35,description:'Toque para acender e apagar.'},
  {id:'radio',name:'Rádio retrô',slot:'table',price:70,description:'Toque para tocar uma música.'},
  {id:'pufe',name:'Pufe',slot:'seat',price:45,description:'Afunda que é uma beleza.'},
  {id:'sofa',name:'Sofá',slot:'seat',price:80,description:'O trono oficial do Ping.'},
];
export const itemById=(id:string)=>CATALOG.find(i=>i.id===id);

export type PurchaseResult={ok:true;balance:number}|{ok:false;reason:'unknown'|'owned'|'insufficient'|'unavailable'};
export type RoomItem=ShopItem&{owned:boolean;equipped:boolean};
export type RoomView={balance:number;items:RoomItem[];equipped:Partial<Record<SlotId,string>>};

export async function ensureShopTables(db:RewardDb){
  await db.execAsync(`CREATE TABLE IF NOT EXISTS inventory(item_id TEXT PRIMARY KEY,purchased_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS room_slots(slot TEXT PRIMARY KEY,item_id TEXT NOT NULL);`);
}
async function owns(db:RewardDb,itemId:string){
  return !!(await db.getFirstAsync('SELECT 1 AS x FROM inventory WHERE item_id=?',itemId));
}
/** `isPro` só importa para itens `proOnly` (Fase 6); hoje nenhum item exige Pro. */
export async function purchaseItem(db:RewardDb,itemId:string,opts:{now?:number;isPro?:boolean}={}):Promise<PurchaseResult>{
  const item=itemById(itemId),now=opts.now??Date.now();
  if(!item)return {ok:false,reason:'unknown'};
  if(item.proOnly&&!opts.isPro)return {ok:false,reason:'unavailable'};
  let result:PurchaseResult={ok:false,reason:'insufficient'};
  await db.withTransactionAsync(async()=>{
    if(await owns(db,itemId)){result={ok:false,reason:'owned'};return;}
    const balance=await getBalance(db);
    if(balance<item.price){result={ok:false,reason:'insufficient'};return;}
    const ev=await db.runAsync(
      "INSERT OR IGNORE INTO reward_events(source_type,source_id,event_type,occurred_at,reward_date,idempotency_key) VALUES('item',NULL,'shop_purchase',?,?,?)",
      now,new Date(now).toISOString().slice(0,10),`purchase:${itemId}`);
    if(ev.changes===0){result={ok:false,reason:'owned'};return;}
    await db.runAsync('INSERT INTO wallet_transactions(event_id,amount,reason,created_at) VALUES(?,?,?,?)',ev.lastInsertRowId,-item.price,`compra:${itemId}`,now);
    await db.runAsync('INSERT INTO inventory(item_id,purchased_at) VALUES(?,?)',itemId,now);
    result={ok:true,balance:balance-item.price};
  });
  return result;
}
/** Equipa um item que o usuário tem; troca o que estava no mesmo espaço. */
export async function equipItem(db:RewardDb,itemId:string):Promise<boolean>{
  const item=itemById(itemId);
  if(!item||!(await owns(db,itemId)))return false;
  await db.runAsync('INSERT OR REPLACE INTO room_slots(slot,item_id) VALUES(?,?)',item.slot,itemId);
  return true;
}
export async function unequipSlot(db:RewardDb,slot:SlotId):Promise<void>{
  await db.runAsync('DELETE FROM room_slots WHERE slot=?',slot);
}
export async function getRoom(db:RewardDb):Promise<RoomView>{
  const owned=new Set((await db.getAllAsync<{item_id:string}>('SELECT item_id FROM inventory')).map(r=>r.item_id));
  const equipped:Partial<Record<SlotId,string>>={};
  for(const r of await db.getAllAsync<{slot:SlotId;item_id:string}>('SELECT slot,item_id FROM room_slots')){
    if(owned.has(r.item_id)&&itemById(r.item_id)?.slot===r.slot)equipped[r.slot]=r.item_id; // ignora linha órfã/adulterada
  }
  return {balance:await getBalance(db),equipped,
    items:CATALOG.map(i=>({...i,owned:owned.has(i.id),equipped:equipped[i.slot]===i.id}))};
}
