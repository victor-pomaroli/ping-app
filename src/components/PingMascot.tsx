import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {AppState,Pressable,StyleSheet,Text,View} from 'react-native';
import Animated,{Easing,cancelAnimation,interpolate,useAnimatedStyle,useSharedValue,withDelay,withRepeat,withSequence,withSpring,withTiming,type SharedValue} from 'react-native-reanimated';
import {PingFace,PING_SIZE,type PingFaceHandle} from './PingFace';
import type {FaceMoment} from '../faces';
import type {NotificationPersonality} from '../preferences';
import {dayMood,pickLine,type Situation} from '../ping-lines';
import {spring,useMotionEnabled} from '../motion';
import {tapLight,tapSuccess} from '../haptics';
import {useAppTheme} from '../theme';
import {fatigueAt,fatigueStage,tapFatigue} from '../ping-fatigue';
import {playSound,playTap,stopSound} from '../ping-sounds';
import {activity} from '../ping-activity';
import {awayMsOnce} from '../ping-presence';
import {getStreakInfo,getBrokenStreak,localDay} from '../store';
import {STREAK_MILESTONES} from '../streak';
import {getMeta,setMeta} from '../preferences';

export {PING_SIZE};
/** Coluna reservada ao Ping, ao lado do post-it: nada do balão passa daqui para cima do papel. */
export const PING_COLUMN=118;
/** Folga à direita da coluna que o balão pode usar (é a margem da tela). */
const COLUMN_BLEED=6;
const PING_LEFT=4;
/** Quanto o balão fica na tela depois de aparecer (ms) e quanto dura o "digitando…" (ms). */
const BUBBLE_MS=4600;
const TYPING_MS=620;
/** Sem nenhum toque na tela por tanto tempo, o Ping cochila. */
const NAP_MS=20000;
/** Ausência a partir da qual ele fica com saudade (amuado) ao ver você de novo. */
const MISS_YOU_MS=3*24*3600*1000;
/** Muitas atrasadas: a nuvem de chuva aparece. */
const RAIN_OVERDUE=3;

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
type Tone='irritado'|'debochado'|'leve'|'festa'|'vazio'|'neutro'|'cansado'|'tonto';
const TONES:Record<Tone,{chip:string;glyph:string;text:string}>={
  irritado:{chip:'#C9382E',glyph:'!',text:'#B3261E'},
  debochado:{chip:'#A46E1D',glyph:'?',text:'#242A22'},
  leve:{chip:'#4aa37e',glyph:'♪',text:'#242A22'},
  festa:{chip:'#6f9a1e',glyph:'✓',text:'#242A22'},
  vazio:{chip:'#8a9285',glyph:'z',text:'#656D60'},
  neutro:{chip:'#242A22',glyph:'!',text:'#242A22'},
  cansado:{chip:'#5f7488',glyph:'…',text:'#3f5062'},
  tonto:{chip:'#7a5fa0',glyph:'@',text:'#4a3a6b'},
};
function toneOf(personality:NotificationPersonality,moment:FaceMoment,situation:Situation):Tone{
  if(situation==='cansado'||situation==='soneca')return 'cansado';
  if(situation==='tonto')return 'tonto';
  if(situation==='sino'||situation==='sequencia')return 'festa';
  if(situation==='recomeco')return 'cansado';
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
  const rain=overdue>=RAIN_OVERDUE;
  const face=useRef<PingFaceHandle>(null);
  const wrap=useRef<React.ElementRef<typeof View>|null>(null);

  const bubble=useSharedValue(0);
  const shake=useSharedValue(0);
  const [line,setLine]=useState<{text:string;tone:Tone}|null>(null);
  const [typing,setTyping]=useState(false);
  const [bubbleW,setBubbleW]=useState(0);
  const [confettiKey,setConfettiKey]=useState(0);
  const [waveKey,setWaveKey]=useState(0);
  const [napping,setNapping]=useState(false);
  const hideTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const typeTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const lastIndex=useRef<Partial<Record<Situation,number>>>({});
  const lastSpoke=useRef(0);
  /** Há "digitando…" ou balão na tela: toques seguidos só mexem o corpo, sem reiniciar a fala. */
  const busy=useRef(false);
  // cansaço (nível e instante, em segundos), cochilo, segurar e saudade
  const fatigue=useRef({level:0,at:0,lastTap:0});
  const nappingRef=useRef(false);
  const napStarted=useRef(0);
  const lastAct=useRef(Date.now());
  const wasTired=useRef(false);
  const yawnAt=useRef(Date.now()+3000);
  const holdTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const holdOn=useRef(false);
  const holdStart=useRef(0);
  const suppressPress=useRef(false);
  const lastMove=useRef(0);

  const clearTimers=()=>{
    if(hideTimer.current)clearTimeout(hideTimer.current);
    if(typeTimer.current)clearTimeout(typeTimer.current);
  };
  const say=useCallback((situation:Situation,vars?:{n?:number})=>{
    const {text,index}=pickLine(personality,situation,lastIndex.current[situation],vars);
    lastIndex.current[situation]=index;
    lastSpoke.current=Date.now();
    const tone=toneOf(personality,moment,situation);
    clearTimers();
    busy.current=true;
    const show=()=>{
      setTyping(false);setBubbleW(0);
      setLine({text,tone});
      bubble.value=0;
      bubble.value=motion?withSpring(1,spring.pop):1;
      playSound(personality==='debochado'?'say_debochado':personality==='semPaciencia'?'say_semPaciencia':'say_deBoa',{volume:0.55,rate:tone==='cansado'?0.85:1});
      if(motion){
        face.current?.talk(Math.min(2.6,0.55+text.length*0.055));
        if(tone==='irritado'){
          face.current?.ring();
          shake.value=withSequence(withTiming(-3,{duration:60}),withTiming(3,{duration:80}),withTiming(-2,{duration:80}),withTiming(2,{duration:80}),withTiming(0,{duration:60}));
        }else if(tone==='festa')face.current?.hop(1);
      }
      hideTimer.current=setTimeout(()=>{
        bubble.value=motion?withTiming(0,{duration:160}):0;
        hideTimer.current=setTimeout(()=>{setLine(null);busy.current=false;},motion?180:0);
      },BUBBLE_MS);
    };
    if(motion){
      // "digitando…" antes da fala, como numa conversa
      setLine(null);setTyping(true);
      bubble.value=0;bubble.value=withSpring(1,spring.pop);
      typeTimer.current=setTimeout(show,TYPING_MS);
    }else show();
  },[personality,moment,motion]);
  const hideBubbleNow=()=>{
    clearTimers();busy.current=false;
    setTyping(false);setLine(null);bubble.value=0;
  };
  useEffect(()=>()=>{clearTimers();if(holdTimer.current)clearTimeout(holdTimer.current);},[]);

  // Primeira vez na tela: um oi com a fala do humor do dia. Depois de uns dias fora, ele fica amuado.
  const greeted=useRef(false);
  useEffect(()=>{
    if(!active||greeted.current)return;
    greeted.current=true;
    let cancelled=false;
    const timer=setTimeout(async()=>{
      const away=await awayMsOnce().catch(()=>0);
      if(cancelled)return;
      if(away>=MISS_YOU_MS){sulk();return;}
      // Perdeu uma sequência de 3+ dias ontem: comenta uma vez, sem culpa.
      const broken=await getBrokenStreak().catch(()=>0);
      if(cancelled)return;
      if(broken>0&&(await getMeta('brokenSeen').catch(()=>null))!==localDay()){
        await setMeta('brokenSeen',localDay()).catch(()=>{});
        say('recomeco',{n:broken});
        return;
      }
      say(mood);if(mood==='devendo'&&motion)face.current?.ring();
    },900);
    return()=>{cancelled=true;clearTimeout(timer);};
  },[active]);
  // Voltou ao app depois de dias (sem fechar): o mesmo amuo.
  useEffect(()=>{
    const sub=AppState.addEventListener('change',state=>{
      if(state!=='active'||!active)return;
      setTimeout(()=>{awayMsOnce().then(away=>{if(away>=MISS_YOU_MS)sulk();}).catch(()=>{});},700);
    });
    return()=>sub.remove();
  },[active,say,motion]);
  function sulk(){
    if(motion){face.current?.pout(3.6);setTimeout(()=>playSound('pout',{volume:0.6}),300);}
    say('ciumes');
  }

  // O dia mudou de humor (ex.: zerou os atrasos). Não repete se o Ping acabou de falar.
  const prevMood=useRef(mood);
  useEffect(()=>{
    if(prevMood.current===mood)return;
    prevMood.current=mood;
    // Passou da hora: o sino chacoalha uma vez para avisar.
    if(active&&motion&&mood==='devendo')face.current?.ring();
    if(active&&mood!=='cumprida'&&Date.now()-lastSpoke.current>1500)say(mood);
  },[mood]);

  // Chegaram a 3 atrasadas: a nuvem de chuva aparece e ele comenta.
  const prevOverdue=useRef(overdue);
  useEffect(()=>{
    const before=prevOverdue.current;prevOverdue.current=overdue;
    if(before<RAIN_OVERDUE&&overdue>=RAIN_OVERDUE&&active&&before>0&&Date.now()-lastSpoke.current>1500)say('nuvem');
  },[overdue]);

  // O rosto mudou (no horário ↔ atraso): um pulinho curto para chamar atenção.
  const prevMoment=useRef(moment);
  useEffect(()=>{
    if(prevMoment.current===moment)return;
    prevMoment.current=moment;
    if(motion)face.current?.hop(0.6);
  },[moment]);

  // Tarefa concluída pelo usuário: dancinha, confete (três vezes) e a fala de incentivo.
  useEffect(()=>{
    if(completeKey<=0)return;
    lastAct.current=Date.now();
    if(motion){
      face.current?.hop(0.8);face.current?.dance(2.4);
      setConfettiKey(k=>k+1);
      const t1=setTimeout(()=>setConfettiKey(k=>k+1),500),t2=setTimeout(()=>setConfettiKey(k=>k+1),1000);
      if(active)playSound('party',{volume:0.7});
      if(active)say('concluiu');
      checkMilestone();
      return()=>{clearTimeout(t1);clearTimeout(t2);};
    }
    if(active)say('concluiu');
    checkMilestone();
  },[completeKey]);
  // Bateu 3, 7, 14, 30 ou 100 dias seguidos: depois da fala de concluir, ele comemora a sequência (uma vez por marco).
  function checkMilestone(){
    if(!active)return;
    getStreakInfo().then(async info=>{
      if(!info.todayDone||!STREAK_MILESTONES.includes(info.current))return;
      const mark=`${localDay()}:${info.current}`;
      if(await getMeta('streakCelebrated')===mark)return;
      await setMeta('streakCelebrated',mark);
      setTimeout(()=>{
        if(motion){face.current?.hop(1.4);face.current?.dance(2.8);setConfettiKey(k=>k+1);}
        playSound('party',{volume:0.7});
        say('sequencia',{n:info.current});
      },2600);
    }).catch(console.warn);
  }

  // Puxou para atualizar: ele espia (olha para baixo e para os lados) e o sino toca ao terminar.
  useEffect(()=>{
    if(refreshKey<=0)return;
    if(motion){face.current?.ring();face.current?.peek(2.2);}
    if(active){playSound('peek',{volume:0.5});if(!busy.current&&Math.random()<0.5)say('espiar');}
  },[refreshKey]);

  // Dia zerado: pulo grande, sino tocando, batida de háptico e fala de missão cumprida.
  useEffect(()=>{
    if(celebrateKey<=0)return;
    if(motion){face.current?.hop(1.8);face.current?.ring();face.current?.dance(3);}
    tapSuccess();
    say('cumprida');
  },[celebrateKey]);

  // Relógio do Ping (a cada 120 ms só olha valores): olhos seguem o dedo; a cada ~0,5 s confere cansaço, bocejo e cochilo.
  useEffect(()=>{
    if(!active||!motion)return;
    let n=0;
    const timer=setInterval(()=>{
      n+=1;
      const now=Date.now();
      // olhos seguem o dedo
      if(!nappingRef.current&&activity.moveAt!==lastMove.current&&now-activity.moveAt<250){
        lastMove.current=activity.moveAt;
        wrap.current?.measureInWindow((x,y,w,h)=>{
          const nx=Math.max(-1,Math.min(1,(activity.x-(x+w/2))/90));
          const ny=Math.max(-1,Math.min(1,(activity.y-(y+h*0.55))/90));
          face.current?.look(nx,ny);
        });
      }
      if(n%4!==0)return;
      // cochilo: ficou parado; qualquer toque na tela acorda sem susto
      if(nappingRef.current){
        if(activity.lastAt>napStarted.current){nappingRef.current=false;setNapping(false);lastAct.current=now;}
      }else if(!sleeping&&now-Math.max(lastAct.current,activity.lastAt)>NAP_MS){
        nappingRef.current=true;napStarted.current=now;setNapping(true);hideBubbleNow();
      }
      // cansaço: boceja no estágio 2 e avisa quando se recupera
      const level=fatigueAt(fatigue.current.level,fatigue.current.at,now/1000);
      const stage=fatigueStage(level);
      if(stage>=2)wasTired.current=true;
      if(wasTired.current&&level<0.2){
        wasTired.current=false;
        face.current?.hop(0.5);playSound('recover',{volume:0.7});say('recuperou');
      }else if(stage===2&&now>yawnAt.current&&!busy.current&&!nappingRef.current){
        yawnAt.current=now+4000+Math.random()*3000;
        face.current?.yawn();playSound('yawn',{volume:0.6});
      }
    },120);
    return()=>clearInterval(timer);
  },[active,motion,sleeping,say]);
  useEffect(()=>{if(!active||!motion){nappingRef.current=false;setNapping(false);}},[active,motion]);

  /** Acorda do cochilo com um susto. */
  function wake(){
    nappingRef.current=false;setNapping(false);lastAct.current=Date.now();
    if(motion)face.current?.startle();
    playSound('startle',{volume:0.7});
    tapLight();say('soneca');
  }
  /** Toque: o cansaço sobe com toques rápidos; durante uma fala só o corpo reage (a fala não reinicia). */
  function poke(){
    if(nappingRef.current){wake();return;}
    const now=Date.now();
    lastAct.current=now;
    const f=fatigue.current;
    const gap=f.lastTap?(now-f.lastTap)/1000:99;
    const before=fatigueStage(fatigueAt(f.level,f.at,now/1000));
    const next=tapFatigue(fatigueAt(f.level,f.at,now/1000),gap);
    f.level=next;f.at=now/1000;f.lastTap=now;
    face.current?.setFatigue(next);
    const stage=fatigueStage(next);
    if(motion){if(stage<2)face.current?.ring();else face.current?.hop(0.4);}
    playTap(next);
    if(stage===3&&before<3)setTimeout(()=>playSound('dizzy',{volume:0.7}),250);
    tapLight();
    if(stage>before)say(stage===3?'tonto':stage===2?'cansado':'toque');
    else if(!busy.current)say('toque');
  }
  /** Segurou o dedo: depois de 0,25 s ele infla; ao soltar (após 0,55 s) dá um DING grande. */
  function pressIn(){
    if(nappingRef.current){wake();suppressPress.current=true;setTimeout(()=>{suppressPress.current=false;},150);return;}
    holdStart.current=Date.now();
    if(!motion)return;
    holdTimer.current=setTimeout(()=>{holdOn.current=true;face.current?.hold(true);playSound('inflate',{volume:0.5});},250);
  }
  function pressOut(){
    if(holdTimer.current)clearTimeout(holdTimer.current);
    if(!holdOn.current)return;
    holdOn.current=false;face.current?.hold(false);stopSound('inflate');
    if(Date.now()-holdStart.current>550){
      suppressPress.current=true;setTimeout(()=>{suppressPress.current=false;},150);
      lastAct.current=Date.now();
      face.current?.bigRing();playSound('ring',{volume:1});setWaveKey(k=>k+1);tapSuccess();say('sino');
    }
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

  return <View ref={wrap} style={st.column}>
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
    <Pressable style={st.pingArea} accessibilityRole="button" accessibilityLabel="Ping. Toque para ouvir o que ele tem a dizer; segure para ouvir o sino" hitSlop={6}
      onPress={()=>{if(!suppressPress.current)poke();}} onPressIn={pressIn} onPressOut={pressOut}>
      <PingFace ref={face} personality={personality} moment={moment} sleeping={sleeping} running={active&&motion} napping={napping} rain={rain&&motion}/>
    </Pressable>
    {active&&motion&&(sleeping||napping)?<View pointerEvents="none" style={st.pingOverlay}>
      <Zed delay={0} size={11} color={c.muted}/><Zed delay={800} size={14} color={c.muted}/><Zed delay={1600} size={17} color={c.muted}/>
    </View>:null}
    {active&&motion&&mood==='cumprida'?<View pointerEvents="none" style={st.pingOverlay}>
      <Twinkle delay={0} left={-6} top={8} color={c.accent}/><Twinkle delay={500} left={90} top={-4} color={c.accent}/><Twinkle delay={1000} left={94} top={62} color={c.accent}/>
    </View>:null}
    {motion&&confettiKey>0?<View pointerEvents="none" style={st.pingOverlay}><Confetti trigger={confettiKey}/></View>:null}
    {motion&&waveKey>0?<View pointerEvents="none" style={st.pingOverlay}><Waves trigger={waveKey}/></View>:null}
  </View>;
}

/** Ondas do sino (DING grande): dois anéis que crescem e somem. */
function Waves({trigger}:{trigger:number}){
  return <><Wave trigger={trigger} delay={0}/><Wave trigger={trigger} delay={160}/></>;
}
function Wave({trigger,delay}:{trigger:number;delay:number}){
  const p=useSharedValue(0);
  useEffect(()=>{p.value=0;p.value=withDelay(delay,withTiming(1,{duration:650,easing:Easing.out(Easing.quad)}));},[trigger]);
  const size=PING_SIZE*0.46;
  const style=useAnimatedStyle(()=>({opacity:p.value===0?0:0.9*(1-p.value),transform:[{scale:0.5+1.4*p.value}]}));
  return <Animated.View style={[{position:'absolute',left:PING_SIZE/2-size/2,top:PING_SIZE*0.55-size/2,width:size,height:size,borderRadius:size/2,borderWidth:2,borderColor:'#FFFFFF'},style]}/>;
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
  bubbleText:{fontFamily:'Baloo2_700Bold',fontSize:13,lineHeight:15,fontWeight:'normal',includeFontPadding:false,textAlign:'center',maxWidth:110},
  chip:{position:'absolute',left:-8,top:-9,width:21,height:21,borderRadius:11,borderWidth:2,borderColor:'#FFFFFF',alignItems:'center',justifyContent:'center',elevation:7,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.3,shadowRadius:3},
  chipText:{color:'#FFFFFF',fontSize:11,fontWeight:'900',includeFontPadding:false,lineHeight:13},
  tail:{position:'absolute',bottom:-5,width:14,height:14,backgroundColor:'#FFFFFF',borderBottomRightRadius:3,transform:[{rotate:'45deg'}]},
  typing:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:'#FFFFFF',borderRadius:16,paddingHorizontal:12,paddingVertical:10,elevation:6,shadowColor:'#000',shadowOffset:{width:0,height:5},shadowOpacity:0.3,shadowRadius:8},
  dot:{width:6,height:6,borderRadius:3,backgroundColor:'#9AA39C'},
});
