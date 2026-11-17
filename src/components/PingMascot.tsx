import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import Animated,{Easing,cancelAnimation,interpolate,useAnimatedStyle,useSharedValue,withDelay,withRepeat,withSequence,withSpring,withTiming,type SharedValue} from 'react-native-reanimated';
import {PingFace,PING_SIZE,type PingFaceHandle} from './PingFace';
import type {FaceMoment} from '../faces';
import type {NotificationPersonality} from '../preferences';
import {dayMood,pickLine,type Situation} from '../ping-lines';
import {spring,useMotionEnabled} from '../motion';
import {tapLight,tapSuccess} from '../haptics';
import {useAppTheme} from '../theme';

export {PING_SIZE};
/** Coluna reservada ao Ping, ao lado do post-it: nada do balão passa daqui para cima do papel. */
export const PING_COLUMN=118;
/** Folga à direita da coluna que o balão pode usar (é a margem da tela). */
const COLUMN_BLEED=6;
const PING_LEFT=4;
/** Quanto o balão fica na tela depois de aparecer (ms) e quanto dura o "digitando…" (ms). */
const BUBBLE_MS=4600;
const TYPING_MS=620;

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

/** O tom da fala decide o selo do balão: irritado, debochado, leve, festa, vazio ou neutro. */
type Tone='irritado'|'debochado'|'leve'|'festa'|'vazio'|'neutro';
const TONES:Record<Tone,{chip:string;glyph:string;text:string}>={
  irritado:{chip:'#C9382E',glyph:'!',text:'#B3261E'},
  debochado:{chip:'#A46E1D',glyph:'?',text:'#242A22'},
  leve:{chip:'#4aa37e',glyph:'♪',text:'#242A22'},
  festa:{chip:'#6f9a1e',glyph:'✓',text:'#242A22'},
  vazio:{chip:'#8a9285',glyph:'z',text:'#656D60'},
  neutro:{chip:'#242A22',glyph:'!',text:'#242A22'},
};
function toneOf(personality:NotificationPersonality,moment:FaceMoment,situation:Situation):Tone{
  if(situation==='vazio')return 'vazio';
  if(personality==='semPaciencia'&&(situation==='devendo'||situation==='toque'||(moment!=='no_horario'&&situation!=='concluiu'&&situation!=='cumprida')))return 'irritado';
  if(situation==='concluiu'||situation==='cumprida')return 'festa';
  if(personality==='debochado')return 'debochado';
  if(personality==='deBoa')return 'leve';
  return 'neutro';
}

/**
 * O Ping ao lado do post-it do resumo. O rosto (vetorial, em camadas) troca com o humor do dia
 * (no horário → +1 h → +3 h, como nas notificações), cada personalidade tem seu jeito parado, ele pisca,
 * olha, mexe a boca e as sobrancelhas, reage a concluir tarefas e à comemoração, e responde com um balão
 * curto (no máximo duas linhas) quando é cutucado. Tudo roda em Reanimated (thread de UI) e desliga com
 * "Animações do Ping" ou com movimento reduzido no Android.
 */
export function PingMascot({personality,left,overdue,done,active,celebrateKey,completeKey,refreshKey=0}:Props){
  const {colors:c}=useAppTheme();
  const motion=useMotionEnabled();
  const mood=dayMood(left,overdue,done);
  const moment:FaceMoment=mood==='devendo'?(overdue>=3?'atraso_3h':'atraso_1h'):'no_horario';
  const sleeping=mood==='vazio';
  const face=useRef<PingFaceHandle>(null);

  const bubble=useSharedValue(0);
  const shake=useSharedValue(0);
  const [line,setLine]=useState<{text:string;tone:Tone}|null>(null);
  const [typing,setTyping]=useState(false);
  const [bubbleW,setBubbleW]=useState(0);
  const [confettiKey,setConfettiKey]=useState(0);
  const hideTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const typeTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const lastIndex=useRef<Partial<Record<Situation,number>>>({});
  const lastSpoke=useRef(0);

  const clearTimers=()=>{
    if(hideTimer.current)clearTimeout(hideTimer.current);
    if(typeTimer.current)clearTimeout(typeTimer.current);
  };
  const say=useCallback((situation:Situation)=>{
    const {text,index}=pickLine(personality,situation,lastIndex.current[situation]);
    lastIndex.current[situation]=index;
    lastSpoke.current=Date.now();
    const tone=toneOf(personality,moment,situation);
    clearTimers();
    const show=()=>{
      setTyping(false);setBubbleW(0);
      setLine({text,tone});
      bubble.value=0;
      bubble.value=motion?withSpring(1,spring.pop):1;
      if(motion){
        face.current?.talk(Math.min(2.6,0.55+text.length*0.055));
        if(tone==='irritado'){
          face.current?.ring();
          shake.value=withSequence(withTiming(-3,{duration:60}),withTiming(3,{duration:80}),withTiming(-2,{duration:80}),withTiming(2,{duration:80}),withTiming(0,{duration:60}));
        }else if(tone==='festa')face.current?.hop(1);
      }
      hideTimer.current=setTimeout(()=>{
        bubble.value=motion?withTiming(0,{duration:160}):0;
        hideTimer.current=setTimeout(()=>setLine(null),motion?180:0);
      },BUBBLE_MS);
    };
    if(motion){
      // "digitando…" antes da fala, como numa conversa
      setLine(null);setTyping(true);
      bubble.value=0;bubble.value=withSpring(1,spring.pop);
      typeTimer.current=setTimeout(show,TYPING_MS);
    }else show();
  },[personality,moment,motion]);
  useEffect(()=>()=>clearTimers(),[]);

  // Primeira vez na tela: um oi com a fala do humor do dia.
  const greeted=useRef(false);
  useEffect(()=>{
    if(!active||greeted.current)return;
    greeted.current=true;
    const timer=setTimeout(()=>{say(mood);if(mood==='devendo'&&motion)face.current?.ring();},900);
    return()=>clearTimeout(timer);
  },[active]);

  // O dia mudou de humor (ex.: zerou os atrasos). Não repete se o Ping acabou de falar.
  const prevMood=useRef(mood);
  useEffect(()=>{
    if(prevMood.current===mood)return;
    prevMood.current=mood;
    // Passou da hora: o sino chacoalha uma vez para avisar.
    if(active&&motion&&mood==='devendo')face.current?.ring();
    if(active&&mood!=='cumprida'&&Date.now()-lastSpoke.current>1500)say(mood);
  },[mood]);

  // O rosto mudou (no horário ↔ atraso): um pulinho curto para chamar atenção.
  const prevMoment=useRef(moment);
  useEffect(()=>{
    if(prevMoment.current===moment)return;
    prevMoment.current=moment;
    if(motion)face.current?.hop(0.6);
  },[moment]);

  // Tarefa concluída pelo usuário: pulinho, confete e a fala de incentivo.
  useEffect(()=>{
    if(completeKey<=0)return;
    if(motion){face.current?.hop(0.8);setConfettiKey(k=>k+1);}
    if(active)say('concluiu');
  },[completeKey]);

  // Puxou para atualizar: o sino toca uma vez quando a lista termina de recarregar.
  useEffect(()=>{
    if(refreshKey<=0)return;
    if(motion)face.current?.ring();
  },[refreshKey]);

  // Dia zerado: pulo grande, sino tocando, batida de háptico e fala de missão cumprida.
  useEffect(()=>{
    if(celebrateKey<=0)return;
    if(motion){face.current?.hop(1.8);face.current?.ring();}
    tapSuccess();
    say('cumprida');
  },[celebrateKey]);

  function poke(){
    if(motion)face.current?.ring();
    tapLight();say('toque');
  }

  // O balão fica centralizado sobre a cabeça do Ping, dentro da coluna (sem passar por cima do post-it).
  const headX=PING_LEFT+PING_SIZE/2;
  const bubbleLeft=bubbleW>0?Math.max(1,Math.min(headX-bubbleW/2,PING_COLUMN+COLUMN_BLEED-bubbleW)):0;
  const tailLeft=Math.max(14,Math.min(headX-bubbleLeft-7,Math.max(14,bubbleW-28)));
  const bubbleMotion=useAnimatedStyle(()=>({
    opacity:Math.min(1,bubble.value*1.6),
    transform:[{translateX:shake.value},{translateY:(1-bubble.value)*6},{scale:0.7+0.3*bubble.value}],
  }));
  const tone=line?TONES[line.tone]:TONES.neutro;

  return <View style={st.column}>
    {typing||line?<Animated.View pointerEvents="none" style={[st.bubbleWrap,{left:typing?headX-26:bubbleLeft},bubbleMotion]}>
      {typing
        ?<View style={st.typing}>
          <View style={[st.tail,{left:20}]}/>
          <Dot delay={0}/><Dot delay={150}/><Dot delay={300}/>
        </View>
        :<View style={[st.bubble,{opacity:bubbleW>0?1:0}]} onLayout={e=>setBubbleW(e.nativeEvent.layout.width)}>
          <View style={[st.tail,{left:tailLeft}]}/>
          <Text accessibilityLiveRegion="polite" numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.875} style={[st.bubbleText,{color:tone.text}]}>{line?.text}</Text>
          <View style={[st.chip,{backgroundColor:tone.chip}]}><Text style={st.chipText}>{tone.glyph}</Text></View>
        </View>}
    </Animated.View>:null}
    <Pressable style={st.pingArea} accessibilityRole="button" accessibilityLabel="Ping. Toque para ouvir o que ele tem a dizer" hitSlop={6} onPress={poke}>
      <PingFace ref={face} personality={personality} moment={moment} sleeping={sleeping} running={active&&motion}/>
    </Pressable>
    {active&&motion&&sleeping?<View pointerEvents="none" style={st.pingOverlay}>
      <Zed delay={0} size={11} color={c.muted}/><Zed delay={800} size={14} color={c.muted}/><Zed delay={1600} size={17} color={c.muted}/>
    </View>:null}
    {active&&motion&&mood==='cumprida'?<View pointerEvents="none" style={st.pingOverlay}>
      <Twinkle delay={0} left={-6} top={8} color={c.accent}/><Twinkle delay={500} left={90} top={-4} color={c.accent}/><Twinkle delay={1000} left={94} top={62} color={c.accent}/>
    </View>:null}
    {motion&&confettiKey>0?<View pointerEvents="none" style={st.pingOverlay}><Confetti trigger={confettiKey}/></View>:null}
  </View>;
}

/** Ponto do "digitando…": sobe e desce em sequência. */
function Dot({delay}:{delay:number}){
  const p=useSharedValue(0);
  useEffect(()=>{
    p.value=withDelay(delay,withRepeat(withSequence(withTiming(1,{duration:300}),withTiming(0,{duration:300}),withTiming(0,{duration:400})),-1,false));
    return()=>cancelAnimation(p);
  },[]);
  const style=useAnimatedStyle(()=>({opacity:0.5+0.5*p.value,transform:[{translateY:-4*p.value}]}));
  return <Animated.View style={[st.dot,style]}/>;
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
  return <Animated.Text style={[{position:'absolute',top:14,right:-2,fontSize:size,fontWeight:'900',color},style]}>z</Animated.Text>;
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

const CONFETTI_COLORS=['#ffd23f','#7ee081','#ff7b7b','#7cc6ff'];
/** Confete curto saindo da cabeça do Ping quando uma tarefa é concluída. */
function Confetti({trigger}:{trigger:number}){
  const p=useSharedValue(0);
  const pieces=useMemo(()=>Array.from({length:10},(_,i)=>{
    const a=-Math.PI*(0.15+Math.random()*0.7);const dist=(40+Math.random()*34)*0.52;
    const sign=Math.random()<0.5?-1:1;
    return {dx:Math.cos(a)*dist*sign,dy:Math.sin(a)*dist-4,size:3+Math.random()*2.5,color:CONFETTI_COLORS[i%4]};
  }),[trigger]);
  useEffect(()=>{p.value=0;p.value=withTiming(1,{duration:900,easing:Easing.out(Easing.quad)});},[trigger]);
  return <>{pieces.map((piece,i)=><Piece key={i} p={p} {...piece}/>)}</>;
}
function Piece({p,dx,dy,size,color}:{p:SharedValue<number>;dx:number;dy:number;size:number;color:string}){
  const style=useAnimatedStyle(()=>({opacity:interpolate(p.value,[0,0.7,1],[1,1,0]),transform:[{translateX:dx*p.value},{translateY:dy*p.value},{scale:0.3+0.7*p.value}]}));
  return <Animated.View style={[{position:'absolute',left:PING_SIZE/2-size/2,top:PING_SIZE*0.35,width:size*2,height:size*2,borderRadius:size,backgroundColor:color},style]}/>;
}

const st=StyleSheet.create({
  /** Coluna fixa e sem corte: o balão é absoluto e sai por cima, sempre dentro da largura da coluna. */
  column:{width:PING_COLUMN,height:PING_SIZE,zIndex:10,overflow:'visible'},
  pingArea:{position:'absolute',left:PING_LEFT,bottom:0,width:PING_SIZE,height:PING_SIZE,overflow:'visible'},
  pingOverlay:{position:'absolute',left:PING_LEFT,bottom:0,width:PING_SIZE,height:PING_SIZE,overflow:'visible'},
  bubbleWrap:{position:'absolute',bottom:PING_SIZE,zIndex:11,transformOrigin:'50% 100%'},
  bubble:{backgroundColor:'#FFFFFF',borderRadius:16,paddingHorizontal:11,paddingTop:7,paddingBottom:8,maxWidth:132,elevation:6,shadowColor:'#000',shadowOffset:{width:0,height:6},shadowOpacity:0.35,shadowRadius:9},
  bubbleText:{fontSize:12,lineHeight:15,fontWeight:'800',letterSpacing:-0.1,textAlign:'center',maxWidth:110},
  chip:{position:'absolute',left:-8,top:-9,width:21,height:21,borderRadius:11,borderWidth:2,borderColor:'#FFFFFF',alignItems:'center',justifyContent:'center',elevation:7,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.3,shadowRadius:3},
  chipText:{color:'#FFFFFF',fontSize:11,fontWeight:'900',includeFontPadding:false,lineHeight:13},
  tail:{position:'absolute',bottom:-5,width:14,height:14,backgroundColor:'#FFFFFF',borderBottomRightRadius:3,transform:[{rotate:'45deg'}]},
  typing:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:'#FFFFFF',borderRadius:16,paddingHorizontal:12,paddingVertical:10,elevation:6,shadowColor:'#000',shadowOffset:{width:0,height:5},shadowOpacity:0.3,shadowRadius:8},
  dot:{width:6,height:6,borderRadius:3,backgroundColor:'#9AA39C'},
});
