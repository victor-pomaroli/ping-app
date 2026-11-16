import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import Animated,{Easing,FadeIn,FadeOut,cancelAnimation,interpolate,useAnimatedStyle,useSharedValue,withDelay,withRepeat,withSequence,withSpring,withTiming} from 'react-native-reanimated';
import {FACE_IMAGES,type FaceMoment} from '../faces';
import type {NotificationPersonality} from '../preferences';
import {dayMood,pickLine,type Situation} from '../ping-lines';
import {spring,useMotionEnabled} from '../motion';
import {tapLight,tapSuccess} from '../haptics';
import {useAppTheme} from '../theme';

export const PING_SIZE=80;
/** Inclinação fixa: o Ping fica "encostado" no post-it, como um adesivo. */
const LEAN=5;
const BUBBLE_MS=3600;

type Props={
  personality:NotificationPersonality;
  left:number;overdue:number;done:number;
  /** A aba Hoje está na tela? Fora dela o Ping fica quieto (sem loops e sem falar). */
  active:boolean;
  /** Muda quando o dia é zerado (mesmo gatilho do confete). */
  celebrateKey:number;
  /** Muda a cada tarefa concluída pelo usuário. */
  completeKey:number;
  /** Muda quando o usuário puxa para atualizar e a lista termina de recarregar. */
  refreshKey?:number;
};

/**
 * O Ping ao lado do post-it do resumo. O rosto troca com o humor do dia (no horário → +1 h → +3 h,
 * como nas notificações), cada personalidade tem seu jeito parado, reage a concluir tarefas e à
 * comemoração, e responde com um balão curto quando é cutucado. Tudo é Reanimated (thread de UI)
 * e desliga com "Animações do Ping" ou com movimento reduzido no Android.
 */
export function PingMascot({personality,left,overdue,done,active,celebrateKey,completeKey,refreshKey=0}:Props){
  const {colors:c}=useAppTheme();
  const motion=useMotionEnabled();
  const mood=dayMood(left,overdue,done);
  const moment:FaceMoment=mood==='devendo'?(overdue>=3?'atraso_3h':'atraso_1h'):'no_horario';

  const idleRot=useSharedValue(0);
  const idleY=useSharedValue(0);
  const ring=useSharedValue(0);
  const lift=useSharedValue(0);
  const sx=useSharedValue(1);
  const sy=useSharedValue(1);
  const bubble=useSharedValue(0);
  const [line,setLine]=useState<string|null>(null);
  const hideTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const lastIndex=useRef<Partial<Record<Situation,number>>>({});
  const lastSpoke=useRef(0);

  const say=useCallback((situation:Situation)=>{
    const {text,index}=pickLine(personality,situation,lastIndex.current[situation]);
    lastIndex.current[situation]=index;
    lastSpoke.current=Date.now();
    if(hideTimer.current)clearTimeout(hideTimer.current);
    setLine(text);
    bubble.value=0;
    bubble.value=motion?withSpring(1,spring.pop):1;
    hideTimer.current=setTimeout(()=>{
      bubble.value=motion?withTiming(0,{duration:160}):0;
      hideTimer.current=setTimeout(()=>setLine(null),motion?180:0);
    },BUBBLE_MS);
  },[personality,motion]);
  useEffect(()=>()=>{if(hideTimer.current)clearTimeout(hideTimer.current);},[]);

  /** Pulo com squash & stretch: agacha, estica no ar, aterra achatando e assenta com mola. */
  function hop(strength:number){
    if(!motion)return;
    sy.value=withSequence(withTiming(0.86,{duration:90}),withTiming(1.1,{duration:150}),withTiming(0.9,{duration:150}),withSpring(1,spring.bounce));
    sx.value=withSequence(withTiming(1.1,{duration:90}),withTiming(0.93,{duration:150}),withTiming(1.07,{duration:150}),withSpring(1,spring.bounce));
    lift.value=withSequence(withDelay(90,withTiming(-14*strength,{duration:150,easing:Easing.out(Easing.quad)})),withTiming(0,{duration:150,easing:Easing.in(Easing.quad)}));
  }
  /** O sino chacoalha e amortece até parar. */
  function ringBell(){
    if(!motion)return;
    ring.value=withSequence(withTiming(12,{duration:90}),withTiming(-10,{duration:130}),withTiming(7,{duration:120}),withTiming(-4,{duration:110}),withTiming(0,{duration:100}));
  }

  // Jeito parado de cada personalidade. Só roda com a aba Hoje na tela e animações ligadas.
  useEffect(()=>{
    cancelAnimation(idleRot);cancelAnimation(idleY);
    idleRot.value=0;idleY.value=0;
    if(!active||!motion)return;
    if(mood==='vazio'){
      // Dia em branco: o Ping cochila, com a cabeça meio caída e respirando devagar (e uns "z" subindo).
      idleRot.value=withTiming(-4,{duration:600});
      idleY.value=withRepeat(withSequence(withTiming(2.5,{duration:2400,easing:Easing.inOut(Easing.sin)}),withTiming(0,{duration:2400,easing:Easing.inOut(Easing.sin)})),-1,true);
      return()=>{cancelAnimation(idleRot);cancelAnimation(idleY);};
    }
    if(personality==='debochado'){
      // Inclina a cabeça de vez em quando, como quem ergue a sobrancelha.
      idleRot.value=withRepeat(withSequence(
        withDelay(3800,withTiming(-9,{duration:260,easing:Easing.out(Easing.cubic)})),
        withDelay(1100,withTiming(0,{duration:320,easing:Easing.inOut(Easing.cubic)})),
      ),-1,false);
    }else if(personality==='semPaciencia'){
      // Sino tremendo de impaciência, em rajadas curtas.
      idleRot.value=withRepeat(withSequence(
        withDelay(3200,withTiming(7,{duration:70})),
        withRepeat(withSequence(withTiming(-7,{duration:90}),withTiming(7,{duration:90})),4,true),
        withTiming(0,{duration:80}),
      ),-1,false);
    }else{
      // De Boa: balanço lento, quase uma respiração.
      idleRot.value=withRepeat(withSequence(withTiming(2.5,{duration:2200,easing:Easing.inOut(Easing.sin)}),withTiming(-2.5,{duration:2200,easing:Easing.inOut(Easing.sin)})),-1,true);
      idleY.value=withRepeat(withSequence(withTiming(-3,{duration:2000,easing:Easing.inOut(Easing.sin)}),withTiming(0,{duration:2000,easing:Easing.inOut(Easing.sin)})),-1,true);
    }
    return()=>{cancelAnimation(idleRot);cancelAnimation(idleY);};
  },[active,motion,personality,mood==='vazio']);

  // Primeira vez na tela: um oi com a fala do humor do dia.
  const greeted=useRef(false);
  useEffect(()=>{
    if(!active||greeted.current)return;
    greeted.current=true;
    const timer=setTimeout(()=>{say(mood);if(mood==='devendo')ringBell();},900);
    return()=>clearTimeout(timer);
  },[active]);

  // O dia mudou de humor (ex.: zerou os atrasos). Não repete se o Ping acabou de falar.
  const prevMood=useRef(mood);
  useEffect(()=>{
    if(prevMood.current===mood)return;
    prevMood.current=mood;
    // Passou da hora: o sino chacoalha uma vez para avisar.
    if(active&&mood==='devendo')ringBell();
    if(active&&mood!=='cumprida'&&Date.now()-lastSpoke.current>1500)say(mood);
  },[mood]);

  // O rosto mudou (no horário ↔ atraso): um pulinho curto para chamar atenção.
  const prevMoment=useRef(moment);
  useEffect(()=>{
    if(prevMoment.current===moment)return;
    prevMoment.current=moment;
    hop(0.6);
  },[moment]);

  // Tarefa concluída pelo usuário.
  useEffect(()=>{
    if(completeKey<=0)return;
    hop(0.8);
    if(active)say('concluiu');
  },[completeKey]);

  // Puxou para atualizar: o sino toca uma vez quando a lista termina de recarregar.
  useEffect(()=>{
    if(refreshKey<=0)return;
    ringBell();
  },[refreshKey]);

  // Dia zerado: pulo grande, sino tocando, batida de háptico e fala de missão cumprida.
  useEffect(()=>{
    if(celebrateKey<=0)return;
    hop(1.8);ringBell();tapSuccess();
    say('cumprida');
  },[celebrateKey]);

  function poke(){
    hop(1);tapLight();say('toque');
  }

  const body=useAnimatedStyle(()=>({transform:[
    {translateY:idleY.value+lift.value},
    {rotate:`${LEAN+idleRot.value+ring.value}deg`},
    {scaleX:sx.value},{scaleY:sy.value},
  ]}));
  const bubbleMotion=useAnimatedStyle(()=>({
    opacity:Math.min(1,bubble.value*1.6),
    transform:[{translateY:(1-bubble.value)*6},{scale:0.7+0.3*bubble.value}],
  }));

  return <View style={st.slot}>
    {line?<Animated.View pointerEvents="none" style={[st.bubbleWrap,bubbleMotion]}>
      <View style={[st.bubble,{backgroundColor:c.surfaceRaised,borderColor:c.border}]}>
        <Text accessibilityLiveRegion="polite" style={[st.bubbleText,{color:c.text}]}>{line}</Text>
      </View>
      <View style={[st.tail,{backgroundColor:c.surfaceRaised,borderColor:c.border}]}/>
    </Animated.View>:null}
    <Pressable accessibilityRole="button" accessibilityLabel="Ping. Toque para ouvir o que ele tem a dizer" hitSlop={6} onPress={poke}>
      <Animated.View style={[st.body,body]}>
        <Animated.Image key={`${personality}-${moment}`} source={FACE_IMAGES[personality][moment]} resizeMode="contain" style={StyleSheet.absoluteFill}
          entering={motion?FadeIn.duration(220):undefined} exiting={motion?FadeOut.duration(220):undefined}/>
      </Animated.View>
    </Pressable>
    {active&&motion&&mood==='vazio'?<View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Zed delay={0} size={11} color={c.muted}/><Zed delay={800} size={14} color={c.muted}/><Zed delay={1600} size={17} color={c.muted}/>
    </View>:null}
    {active&&motion&&mood==='cumprida'?<View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Twinkle delay={0} left={-6} top={8} color={c.accent}/><Twinkle delay={500} left={66} top={-4} color={c.accent}/><Twinkle delay={1000} left={70} top={52} color={c.accent}/>
    </View>:null}
  </View>;
}

/** Um "z" que sobe, cresce e some em ciclo (o Ping dormindo no dia em branco). */
function Zed({delay,size,color}:{delay:number;size:number;color:string}){
  const p=useSharedValue(0);
  useEffect(()=>{
    p.value=withDelay(delay,withRepeat(withTiming(1,{duration:2400,easing:Easing.linear}),-1,false));
    return()=>cancelAnimation(p);
  },[]);
  const style=useAnimatedStyle(()=>({
    opacity:interpolate(p.value,[0,0.2,0.75,1],[0,0.9,0.9,0]),
    transform:[{translateX:p.value*12},{translateY:-p.value*28},{scale:0.7+0.4*p.value}],
  }));
  return <Animated.Text style={[{position:'absolute',top:6,right:2,fontSize:size,fontWeight:'900',color},style]}>z</Animated.Text>;
}

/** Estrelinha que acende e apaga girando (o Ping todo contente com o dia feito). */
function Twinkle({delay,left,top,color}:{delay:number;left:number;top:number;color:string}){
  const p=useSharedValue(0);
  useEffect(()=>{
    p.value=withDelay(delay,withRepeat(withSequence(withTiming(1,{duration:500}),withTiming(0,{duration:700})),-1,false));
    return()=>cancelAnimation(p);
  },[]);
  const style=useAnimatedStyle(()=>({opacity:p.value,transform:[{scale:0.4+0.8*p.value},{rotate:`${p.value*40}deg`}]}));
  return <Animated.Text style={[{position:'absolute',left,top,fontSize:14,color},style]}>✦</Animated.Text>;
}

const st=StyleSheet.create({
  /** Tamanho fixo e sem corte: o balão é absoluto e sai por cima do slot. */
  slot:{width:PING_SIZE,height:PING_SIZE,zIndex:10,overflow:'visible'},
  body:{width:PING_SIZE,height:PING_SIZE,transformOrigin:'50% 100%'},
  bubbleWrap:{position:'absolute',right:-6,bottom:PING_SIZE+2,maxWidth:158,alignItems:'flex-end',transformOrigin:'90% 100%',zIndex:11},
  bubble:{borderWidth:1,borderRadius:12,paddingHorizontal:10,paddingVertical:7},
  bubbleText:{fontSize:12,fontWeight:'700',lineHeight:16},
  tail:{width:9,height:9,marginTop:-5,marginRight:26,borderRightWidth:1,borderBottomWidth:1,transform:[{rotate:'45deg'}]},
});
