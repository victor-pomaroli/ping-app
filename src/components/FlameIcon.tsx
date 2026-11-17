import React from 'react';
import Svg,{ClipPath,Defs,Path,Rect} from 'react-native-svg';

export type FlameState='on'|'half'|'off';
const OUTER='M12 2C12.7 5.6 18 8 18 14a6 6 0 0 1-12 0c0-2.4 1.2-4.2 2.6-5.4.2 1.5 1 2.6 2.2 3.1C10.6 8.4 10.7 4.8 12 2Z';
const MIDDLE='M12 20a4.2 4.2 0 0 1-4.2-4.2c0-2.1 1.4-3.5 2.6-4.9.4 1.2 1.2 1.9 2.1 2.2.7-1 1.1-2.1 1.1-3.4 1.5 1.3 2.6 3.2 2.6 6.1A4.2 4.2 0 0 1 12 20Z';
const CORE='M12 20a2.6 2.6 0 0 1-2.6-2.6c0-1.2.8-2 1.5-2.8.3.7.7 1.1 1.2 1.3.4-.6.6-1.2.6-2 .8.7 1.9 1.7 1.9 3.5A2.6 2.6 0 0 1 12 20Z';
/** Cores da chama acesa (iguais em todos os temas; o contorno é que acompanha o tema). */
export const FLAME={outer:'#FF7A1A',middle:'#FFB52E',core:'#FFF0A6'};
/**
 * Chama da sequência em três estados: acesa (tudo feito, colorida), pela metade (parte) e apagada (nada, tracejada).
 * `ink` é a cor do contorno; no post-it vem da tinta do tema, no calendário do texto do tema.
 */
export function FlameIcon({state,size=20,ink,faint}:{state:FlameState;size?:number;ink:string;faint?:string}){
  const outline=state==='on'?ink:faint??ink;
  return <Svg width={size} height={size} viewBox="0 0 24 24">
    <Defs><ClipPath id="flameHalf"><Rect x="0" y="13.2" width="24" height="12"/></ClipPath></Defs>
    {state==='on'?<>
      <Path d={OUTER} fill={FLAME.outer} stroke={outline} strokeWidth={1.7} strokeLinejoin="round"/>
      <Path d={MIDDLE} fill={FLAME.middle}/>
      <Path d={CORE} fill={FLAME.core}/>
    </>:null}
    {state==='half'?<>
      <Path d={OUTER} fill={FLAME.outer} clipPath="url(#flameHalf)"/>
      <Path d={OUTER} fill="none" stroke={outline} strokeWidth={1.7} strokeLinejoin="round"/>
    </>:null}
    {state==='off'?<Path d={OUTER} fill="none" stroke={outline} strokeWidth={1.6} strokeLinejoin="round" strokeDasharray="2.2 2.6" opacity={0.6}/>:null}
  </Svg>;
}
