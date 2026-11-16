import {useEffect,useState} from 'react';
import {useReducedMotion} from 'react-native-reanimated';
import {getPreferences} from './preferences';

/**
 * Assinatura de movimento do Ping: poucas molas e durações, reaproveitadas em tudo,
 * para o app inteiro ter o mesmo "jeito" (curto, com um pouquinho de overshoot).
 */
export const spring={
  /** Pop rápido com overshoot visível: caixa de concluir, carimbos. */
  pop:{damping:9,stiffness:260,mass:0.6},
  /** Assentamento suave, sem quicar: barras e deslocamentos de layout. */
  soft:{damping:18,stiffness:180,mass:0.8},
  /** Mais elástica, para o mascote. */
  bounce:{damping:7,stiffness:200,mass:0.7},
};
export const duration={fast:120,base:200,slow:320};
/** Atraso entre itens de uma entrada escalonada (ms). */
export const STAGGER=40;
/** Tempo que o cartão espera antes de sair da lista, para o pop e o risco aparecerem (ms). */
export const COMPLETE_SETTLE=280;

// Preferência "Animações do Ping" (Ajustes). Fica em cache no módulo: dezenas de cartões
// usam o hook ao mesmo tempo e não devem ler o banco um por um.
let enabled=true;
let loading:Promise<void>|null=null;
const listeners=new Set<(value:boolean)=>void>();
function load(){
  if(!loading)loading=getPreferences().then(p=>setAnimationsPreference(p.animations)).catch(()=>{});
  return loading;
}
/** Chamado pelos Ajustes ao mudar o interruptor, para a Home reagir na hora. */
export function setAnimationsPreference(value:boolean){
  enabled=value;
  listeners.forEach(listener=>listener(value));
}
/** Falso quando o usuário desligou as animações ou o Android pede movimento reduzido. */
export function useMotionEnabled(){
  const reduced=useReducedMotion();
  const [on,setOn]=useState(enabled);
  useEffect(()=>{
    listeners.add(setOn);
    load().then(()=>setOn(enabled));
    return()=>{listeners.delete(setOn);};
  },[]);
  return on&&!reduced;
}
