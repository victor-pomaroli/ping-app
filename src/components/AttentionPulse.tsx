import React,{useEffect} from 'react';
import Animated,{useAnimatedStyle,useSharedValue,withDelay,withSequence,withSpring,withTiming} from 'react-native-reanimated';
import {spring,useMotionEnabled} from '../motion';

/**
 * Um único pulso (cresce um pouquinho e assenta) toda vez que `active` fica verdadeiro, ou seja, ao
 * chegar na aba. Usado no título "PASSOU DA HORA": chama atenção uma vez, sem ficar piscando.
 */
export function AttentionPulse({active,children}:{active:boolean;children:React.ReactNode}){
  const motion=useMotionEnabled();
  const scale=useSharedValue(1);
  useEffect(()=>{
    if(!active||!motion)return;
    scale.value=withSequence(withDelay(350,withTiming(1.07,{duration:140})),withSpring(1,spring.bounce));
  },[active]);
  const pulse=useAnimatedStyle(()=>({transform:[{scale:scale.value}]}));
  return <Animated.View style={[{transformOrigin:'0% 50%'},pulse]}>{children}</Animated.View>;
}
