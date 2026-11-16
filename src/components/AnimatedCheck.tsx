import React,{useEffect,useRef} from 'react';
import {Pressable,type StyleProp,type TextStyle,type ViewStyle} from 'react-native';
import Animated,{interpolate,useAnimatedStyle,useSharedValue,withSequence,withSpring,withTiming} from 'react-native-reanimated';
import {spring,useMotionEnabled} from '../motion';
import {tapLight} from '../haptics';

type Props={
  checked:boolean;
  onPress:()=>void;
  /** Estilo da caixa (tamanho, borda, fundo quando marcada): o mesmo que o cartão já usava. */
  boxStyle:StyleProp<ViewStyle>;
  /** Estilo do "✓". */
  markStyle:StyleProp<TextStyle>;
  /** Cor do "+1" que sobe ao concluir. */
  plusColor:string;
  accessibilityLabel:string;
};

/**
 * Caixa de concluir com a resposta que o gesto merece: a caixa dá um pop de mola, o ✓ estoura
 * de dentro para fora e um "+1" sobe e some. Quando as animações estão desligadas (ou o Android
 * pede menos movimento), troca tudo na hora, sem nenhum movimento.
 */
export function AnimatedCheck({checked,onPress,boxStyle,markStyle,plusColor,accessibilityLabel}:Props){
  const motion=useMotionEnabled();
  const scale=useSharedValue(1);
  const mark=useSharedValue(checked?1:0);
  const plus=useSharedValue(0);
  const mounted=useRef(false);
  useEffect(()=>{
    // Na primeira montagem só assenta o estado: tarefas já concluídas não devem "pipocar" ao abrir a tela.
    if(!mounted.current){mounted.current=true;mark.value=checked?1:0;return;}
    if(!motion){mark.value=checked?1:0;return;}
    if(checked){
      scale.value=withSequence(withTiming(0.82,{duration:80}),withSpring(1,spring.pop));
      mark.value=withSpring(1,spring.pop);
    }else{
      mark.value=withTiming(0,{duration:120});
    }
  },[checked]);
  const boxMotion=useAnimatedStyle(()=>({transform:[{scale:scale.value}]}));
  const markMotion=useAnimatedStyle(()=>({opacity:Math.min(1,mark.value*1.4),transform:[{scale:0.4+0.6*mark.value}]}));
  const plusMotion=useAnimatedStyle(()=>({
    opacity:interpolate(plus.value,[0,0.15,0.7,1],[0,1,1,0]),
    transform:[{translateY:interpolate(plus.value,[0,1],[0,-24])}],
  }));
  function handlePress(){
    if(!checked){
      tapLight();
      if(motion){plus.value=0;plus.value=withTiming(1,{duration:650});}
    }
    onPress();
  }
  return <Animated.View style={boxMotion}>
    <Pressable accessibilityRole="checkbox" accessibilityLabel={accessibilityLabel} accessibilityState={{checked}} hitSlop={8} onPress={handlePress} style={boxStyle}>
      <Animated.Text style={[markStyle,markMotion]}>✓</Animated.Text>
    </Pressable>
    <Animated.Text pointerEvents="none" style={[{position:'absolute',left:4,top:-6,fontSize:12,fontWeight:'900',color:plusColor},plusMotion]}>+1</Animated.Text>
  </Animated.View>;
}
