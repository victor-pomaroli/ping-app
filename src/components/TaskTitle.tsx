import React,{useEffect,useState} from 'react';
import {View,Text,TextStyle} from 'react-native';
import Animated,{Easing,useAnimatedStyle,useSharedValue,withTiming} from 'react-native-reanimated';
import {ThemeColors} from '../theme';
import {duration,useMotionEnabled} from '../motion';

/**
 * Título com o risco animado de tarefa concluída (mesmo estilo em Home, Tarefas e Calendário).
 * O risco agora roda na thread de UI (Reanimated). Mantém o contrato antigo: quem monta já
 * concluída desenha o risco da esquerda para a direita.
 */
export function TaskTitle({title,completed,colors,style,numberOfLines}:{title:string;completed:boolean;colors:ThemeColors;style?:TextStyle;numberOfLines?:number}){
  const motion=useMotionEnabled();
  const progress=useSharedValue(completed?0:1);
  const width=useSharedValue(0);
  const [measured,setMeasured]=useState(false);
  useEffect(()=>{
    const target=completed?1:0;
    progress.value=motion?withTiming(target,{duration:duration.base+50,easing:Easing.out(Easing.cubic)}):target;
  },[completed,motion]);
  const strike=useAnimatedStyle(()=>({width:progress.value*width.value}));
  return <View style={{alignSelf:'flex-start',maxWidth:'100%'}}>
    <Text numberOfLines={numberOfLines} onLayout={event=>{width.value=event.nativeEvent.layout.width;if(!measured)setMeasured(true);}} style={[{color:completed?colors.muted:colors.text,fontSize:17,fontWeight:'700',letterSpacing:-0.3,opacity:completed?0.82:1},style]}>{title}</Text>
    {completed&&measured?<Animated.View pointerEvents="none" style={[{position:'absolute',left:0,top:'50%',height:2.5,borderRadius:2,backgroundColor:colors.accent},strike]}/>:null}
  </View>;
}
