import React,{useEffect} from 'react';
import Animated,{Easing,interpolate,useAnimatedStyle,useSharedValue,withDelay,withTiming} from 'react-native-reanimated';
import {useMotionEnabled} from '../motion';

type Props={
  color:string;
  /** Centro horizontal de onde as ondas saem (px a partir da esquerda do cartão). Padrão: o meio da caixa de concluir. */
  centerX?:number;
  size?:number;
  /** Espera antes da primeira onda, para casar com o início do destaque do cartão (ms). */
  startDelay?:number;
};

/** Uma onda: um anel que cresce a partir do centro e some. */
function Ring({delay,color,size,left}:{delay:number;color:string;size:number;left:number}){
  const p=useSharedValue(0);
  useEffect(()=>{p.value=withDelay(delay,withTiming(1,{duration:900,easing:Easing.out(Easing.cubic)}));},[]);
  const style=useAnimatedStyle(()=>({
    opacity:interpolate(p.value,[0,0.1,1],[0,0.55,0]),
    transform:[{scale:1+p.value*3.6}],
  }));
  return <Animated.View pointerEvents="none" style={[{position:'absolute',left,top:'50%',width:size,height:size,marginTop:-size/2,borderRadius:size/2,borderWidth:2,borderColor:color},style]}/>;
}

/**
 * Sonar do Ping: três ondas saem da caixa de concluir quando o cartão é destacado por uma
 * notificação ou pelo widget. É o "ping" do nome. Roda uma vez e some; sem animações, não aparece.
 */
export function SonarPing({color,centerX=13.5,size=27,startDelay=500}:Props){
  const motion=useMotionEnabled();
  if(!motion)return null;
  const left=centerX-size/2;
  return <>{[0,220,440].map(extra=><Ring key={extra} delay={startDelay+extra} color={color} size={size} left={left}/>)}</>;
}
