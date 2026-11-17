import {getMeta,setMeta} from './preferences';

/**
 * Quanto tempo o app ficou sem ser aberto (para o Ping reclamar da saudade). `markOpened` registra a abertura
 * e guarda a ausência anterior quando passou de 30 min; `awayMsOnce` entrega esse valor uma vez só.
 */
let lastOpen=0;
let awayMs=0;
let opening:Promise<void>=Promise.resolve();
export function markOpened(){
  opening=opening.then(async()=>{
    const now=Date.now();
    if(!lastOpen){const saved=await getMeta('lastOpenAt');lastOpen=saved?Number(saved)||0:0;}
    const gap=lastOpen?now-lastOpen:0;
    if(gap>=30*60000)awayMs=gap;
    lastOpen=now;
    await setMeta('lastOpenAt',String(now));
  }).catch(console.warn);
  return opening;
}
export async function awayMsOnce(){
  await opening;
  const value=awayMs;awayMs=0;return value;
}
