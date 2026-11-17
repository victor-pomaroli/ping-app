import React from 'react';
import Svg,{Circle,Path} from 'react-native-svg';

/** Moeda do Ping: dourada, com anel e brilho. Mesmas cores em todos os temas. */
export const COIN={face:'#F7C948',rim:'#C98F12',shine:'#FFF0A6'};
export function CoinIcon({size=18}:{size?:number}){
  return <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
    <Circle cx={12} cy={12} r={10.5} fill={COIN.face} stroke={COIN.rim} strokeWidth={1.8}/>
    <Circle cx={12} cy={12} r={6.6} fill="none" stroke={COIN.rim} strokeWidth={1.4}/>
    <Path d="M8.4 8.6A5 5 0 0 1 12 7" stroke={COIN.shine} strokeWidth={1.6} strokeLinecap="round" fill="none"/>
  </Svg>;
}
