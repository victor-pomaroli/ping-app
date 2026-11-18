import {useCallback,useEffect,useState} from 'react';
import {useFocusEffect} from 'expo-router';
import {getRoomView} from './store';
import {outfitOf} from './shop';
import type {Outfit} from './components/PingOutfit';

/**
 * O que o Ping está vestindo. Vem do quarto (tabela room_slots), então persiste e entra no backup.
 * Cache em memória + avisos: comprar ou trocar no Cantinho atualiza o Ping da aba Hoje na hora.
 */
let current:Outfit={};
const listeners=new Set<(o:Outfit)=>void>();
export async function refreshOutfit():Promise<Outfit>{
  try{current=outfitOf((await getRoomView()).equipped);}catch(e){console.warn('[outfit] load failed',e);}
  listeners.forEach(l=>l(current));
  return current;
}
export function useOutfit():Outfit{
  const [outfit,setOutfit]=useState<Outfit>(current);
  useEffect(()=>{listeners.add(setOutfit);refreshOutfit();return()=>{listeners.delete(setOutfit);};},[]);
  useFocusEffect(useCallback(()=>{refreshOutfit();},[]));
  return outfit;
}
