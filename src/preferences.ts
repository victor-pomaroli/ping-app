import {normalizeAppearance,type Appearance} from './appearance';
import * as SQLite from 'expo-sqlite';

export type NotificationPersonality='debochado'|'semPaciencia'|'deBoa';
export type AddressStyle='masculine'|'feminine'|'neutral';
export type Preferences={notifications:boolean;privatePreviews:boolean;appearance:Appearance;displayName:string;addressStyle:AddressStyle;personality:NotificationPersonality;eventAlerts:number[];animations:boolean;sounds:boolean;moodNotices:boolean;morningSummary:boolean;morningHour:number};
/** `eventAlerts`: antecedências (min) do último evento salvo; viram o padrão do próximo. `animations`: movimento do Ping e dos cartões. `sounds`: sons do Ping dentro do app. `moodNotices`: avisos de saudade (3 dias sem abrir), de dia limpo e de sequência em risco (20h). `morningSummary`/`morningHour`: resumo do dia na manhã (hora cheia, 6–11). */
const defaults:Preferences={notifications:true,privatePreviews:false,appearance:'dark',displayName:'',addressStyle:'neutral',personality:'debochado',eventAlerts:[30],animations:true,sounds:true,moodNotices:true,morningSummary:true,morningHour:8};
const db=SQLite.openDatabaseAsync('tasks.db');
export async function getPreferences():Promise<Preferences>{
  const conn=await db;
  await conn.execAsync('CREATE TABLE IF NOT EXISTS app_preferences (key TEXT PRIMARY KEY,value TEXT NOT NULL)');
  const rows=await conn.getAllAsync<{key:string;value:string}>('SELECT key,value FROM app_preferences');
  const values=Object.fromEntries(rows.map(row=>[row.key,row.value]));
  return {notifications:values.notifications===undefined?defaults.notifications:values.notifications==='true',privatePreviews:values.privatePreviews==='true',appearance:normalizeAppearance(values.appearance),displayName:values.displayName??'',addressStyle:values.addressStyle==='masculine'||values.addressStyle==='feminine'?values.addressStyle:'neutral',personality:values.personality==='semPaciencia'||values.personality==='deBoa'?values.personality:'debochado',eventAlerts:values.eventAlerts===undefined?defaults.eventAlerts:values.eventAlerts.split(',').filter(Boolean).map(Number).filter(n=>Number.isFinite(n)&&n>=0),animations:values.animations===undefined?defaults.animations:values.animations==='true',sounds:values.sounds===undefined?defaults.sounds:values.sounds==='true',moodNotices:values.moodNotices===undefined?defaults.moodNotices:values.moodNotices==='true',morningSummary:values.morningSummary===undefined?defaults.morningSummary:values.morningSummary==='true',morningHour:(()=>{const h=Number(values.morningHour);return Number.isInteger(h)&&h>=6&&h<=11?h:defaults.morningHour;})()};
}
export async function setPreference<K extends keyof Preferences>(key:K,value:Preferences[K]){
  const conn=await db;
  await conn.execAsync('CREATE TABLE IF NOT EXISTS app_preferences (key TEXT PRIMARY KEY,value TEXT NOT NULL)');
  await conn.runAsync('INSERT OR REPLACE INTO app_preferences(key,value) VALUES(?,?)',key,String(value));
}

export async function needsOnboarding():Promise<boolean>{
  const conn=await db;
  await conn.execAsync('CREATE TABLE IF NOT EXISTS app_preferences (key TEXT PRIMARY KEY,value TEXT NOT NULL)');
  const row=await conn.getFirstAsync<{value:string}>("SELECT value FROM app_preferences WHERE key='onboardingComplete'");
  return row?.value!=='true';
}
export async function completeOnboarding(name:string,addressStyle:AddressStyle,personality:NotificationPersonality):Promise<void>{
  const conn=await db;
  await conn.execAsync('CREATE TABLE IF NOT EXISTS app_preferences (key TEXT PRIMARY KEY,value TEXT NOT NULL)');
  await conn.withTransactionAsync(async()=>{
    await conn.runAsync('INSERT OR REPLACE INTO app_preferences(key,value) VALUES(?,?)','displayName',name.trim().slice(0,32));
    await conn.runAsync('INSERT OR REPLACE INTO app_preferences(key,value) VALUES(?,?)','addressStyle',addressStyle);
    await conn.runAsync('INSERT OR REPLACE INTO app_preferences(key,value) VALUES(?,?)','personality',personality);
    await conn.runAsync('INSERT OR REPLACE INTO app_preferences(key,value) VALUES(?,?)','onboardingComplete','true');
  });
}

/** Valores internos (não são preferências do usuário), na mesma tabela. */
export async function getMeta(key:string):Promise<string|null>{
  const conn=await db;
  await conn.execAsync('CREATE TABLE IF NOT EXISTS app_preferences (key TEXT PRIMARY KEY,value TEXT NOT NULL)');
  const row=await conn.getFirstAsync<{value:string}>('SELECT value FROM app_preferences WHERE key=?','meta:'+key);
  return row?.value??null;
}
export async function setMeta(key:string,value:string){
  const conn=await db;
  await conn.execAsync('CREATE TABLE IF NOT EXISTS app_preferences (key TEXT PRIMARY KEY,value TEXT NOT NULL)');
  await conn.runAsync('INSERT OR REPLACE INTO app_preferences(key,value) VALUES(?,?)','meta:'+key,value);
}
