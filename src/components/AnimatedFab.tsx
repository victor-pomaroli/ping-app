import React,{useEffect} from 'react';
import {Pressable,type StyleProp,type ViewStyle} from 'react-native';
import Animated,{cancelAnimation,useAnimatedStyle,useSharedValue,withDelay,withRepeat,withSequence,withSpring,withTiming} from 'react-native-reanimated';
import {spring,useMotionEnabled} from '../motion';

const AnimatedPressable=Animated.createAnimatedComponent(Pressable);

type Props={
  style:StyleProp<ViewStyle>;
  accessibilityLabel:string;
  onPress:()=>void;
  /** Dia em branco: o botão chacoalha de leve, de tempos em tempos, convidando a criar a primeira tarefa. */
  invite:boolean;
  children:React.ReactNode;
};

/** Botão "+" que afunda ao toque (squash) e volta com mola; no dia em branco dá um convite discreto. */
export function AnimatedFab({style,accessibilityLabel,onPress,invite,children}:Props){
  const motion=useMotionEnabled();
  const press=useSharedValue(1);
  const wiggle=useSharedValue(0);
  useEffect(()=>{
    cancelAnimation(wiggle);
    wiggle.value=0;
    if(!invite||!motion)return;
    // Espera um pouco antes do primeiro convite e depois repete com uma pausa longa entre eles.
    wiggle.value=withDelay(4000,withRepeat(withSequence(
      withTiming(-12,{duration:80}),withTiming(10,{duration:110}),withTiming(-7,{duration:100}),withTiming(4,{duration:90}),withTiming(0,{duration:80}),
      withDelay(7000,withTiming(0,{duration:1})),
    ),-1,false));
    return()=>cancelAnimation(wiggle);
  },[invite,motion]);
  const motionStyle=useAnimatedStyle(()=>({transform:[{scale:press.value},{rotate:`${wiggle.value}deg`}]}));
  return <AnimatedPressable accessibilityLabel={accessibilityLabel} style={[style,motionStyle]} onPress={onPress}
    onPressIn={()=>{if(motion)press.value=withTiming(0.9,{duration:80});}}
    onPressOut={()=>{if(motion)press.value=withSpring(1,spring.pop);}}>
    {children}
  </AnimatedPressable>;
}
