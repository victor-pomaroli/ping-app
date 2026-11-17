import {getMeta,setMeta} from './preferences';

/**
 * Entitlements do Ping Pro (compra única). Única porta de entrada para saber o que está liberado:
 * nenhuma tela consulta a loja diretamente. O estado vive em `meta:pro` (cache local), então tudo
 * funciona offline. Ver docs/remuneracao.md para o modelo, as camadas e as regras.
 */
export type Feature='themes_extra'|'packs'|'widget_plus';
/**
 * Recursos que serão Pro quando a cobrança estiver ligada: só variedade de personalização (plano de gamificação).
 * O núcleo nunca entra aqui: tarefas, notificações (inclusive cobrança configurável), widget básico, sequência, modo folga,
 * backup, moedas, conquistas e o Cantinho básico. Itens Pro do Cantinho ficam no catálogo (`pro_only`), não aqui.
 */
export const PRO_FEATURES:readonly Feature[]=['themes_extra','packs','widget_plus'];
/**
 * Chave-mestra do paywall. Enquanto for `false`, `hasFeature` libera tudo e o app se comporta como hoje.
 * Só vira `true` na Fase 6, depois da validação em beta, junto com a biblioteca de cobrança e o produto no Play Console.
 */
export const PRO_GATING_ENABLED=false;

export type ProSource='none'|'play'|'manual';
export type Entitlements={pro:boolean;source:ProSource;checkedAt:number|null};
const NONE:Entitlements={pro:false,source:'none',checkedAt:null};

function parse(raw:string|null):Entitlements{
  if(!raw)return NONE;
  try{
    const v=JSON.parse(raw);
    const source:ProSource=v?.source==='play'||v?.source==='manual'?v.source:'none';
    return {pro:v?.pro===true&&source!=='none',source,checkedAt:typeof v?.checkedAt==='number'?v.checkedAt:null};
  }catch{return NONE;}
}
export async function getEntitlements():Promise<Entitlements>{return parse(await getMeta('pro'));}
export async function isPro():Promise<boolean>{return (await getEntitlements()).pro;}
/** Sem paywall ligado, tudo está liberado; com ele, só o que o Pro cobre depende da compra. */
export async function hasFeature(feature:Feature):Promise<boolean>{
  if(!PRO_GATING_ENABLED||!PRO_FEATURES.includes(feature))return true;
  return isPro();
}
/** Registra a compra confirmada pela loja (ou liberação manual do dono/testadores em APK fora da Play). */
export async function grantPro(source:Exclude<ProSource,'none'>){
  await setMeta('pro',JSON.stringify({pro:true,source,checkedAt:Date.now()}));
}
/**
 * Revalida com a loja. Ainda não há biblioteca de cobrança no app: devolve `unavailable` e não mexe no estado.
 * Regra para quando existir: em falha de rede, manter o último estado válido (benefício da dúvida); só tirar o Pro se a loja confirmar reembolso/estorno.
 */
export async function restorePurchases():Promise<{ok:boolean;pro:boolean;reason?:'unavailable'}> {
  return {ok:false,pro:await isPro(),reason:'unavailable'};
}
