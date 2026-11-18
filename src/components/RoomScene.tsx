import React,{forwardRef,useCallback,useEffect,useImperativeHandle,useRef,useState} from 'react';
import {View,Text,Pressable,StyleSheet} from 'react-native';
import Animated,{Easing,cancelAnimation,interpolate,useAnimatedStyle,useSharedValue,withDelay,withRepeat,withSequence,withSpring,withTiming} from 'react-native-reanimated';
import Svg,{Defs,RadialGradient,Stop,Rect,Circle} from 'react-native-svg';
import {PingFace,PING_SIZE,type PingFaceHandle} from './PingFace';
import {ITEM_ART,ROOM_W,ROOM_H,FEET_Y,WINDOW,SLOT_SPOT,ROOM_PALETTE,RoomBackground,WindowFrame,Cloud,dayPart,type DayPart} from './RoomArt';
export {ItemThumb} from './RoomArt';
import type {NotificationPersonality} from '../preferences';
import {getMeta,setMeta} from '../preferences';
import type {SlotId} from '../shop';
import {itemById,isPingSlot,outfitOf} from '../shop';
import type {Appearance} from '../appearance';
import {roomLine,itemLine,type RoomSituation} from '../room-lines';
import {spring} from '../motion';
import {playSound,playTap,stopSound} from '../ping-sounds';
import {tapLight,tapSuccess} from '../haptics';

const ORDER:SlotId[]=['wall','corner','table','floor','seat'];
/** O Ping no quarto fica menor que na aba Hoje, para caber com os móveis. */
const PING_ROOM_SCALE=0.7;
const NAP_MS=40000;
type Tone='irritado'|'debochado'|'leve'|'festa'|'neutro'|'cansado';
const TONES:Record<Tone,{chip:string;glyph:string;text:string}>={
  irritado:{chip:'#C9382E',glyph:'!',text:'#B3261E'},
  debochado:{chip:'#A46E1D',glyph:'?',text:'#242A22'},
  leve:{chip:'#4aa37e',glyph:'♪',text:'#242A22'},
  festa:{chip:'#6f9a1e',glyph:'✓',text:'#242A22'},
  neutro:{chip:'#242A22',glyph:'!',text:'#242A22'},
  cansado:{chip:'#5f7488',glyph:'…',text:'#3f5062'},
};
const baseTone=(p:NotificationPersonality):Tone=>p==='debochado'?'debochado':p==='semPaciencia'?'irritado':'leve';

export type RoomHandle={
  /** O usuário está provando um item: o Ping vai até lá e comenta. */
  preview:(itemId:string)=>void;
  /** Comprou ou colocou um item no quarto: festa curta. */
  placed:(itemId:string,bought:boolean)=>void;
  noCoins:()=>void;
};
type Props={
  width:number;
  equipped:Partial<Record<SlotId,string>>;
  preview?:{id:string;slot:SlotId}|null;
  appearance:Appearance;
  personality:NotificationPersonality;
  /** Tela visível e animações ligadas: só assim há loops e passeios. */
  active:boolean;
  motion:boolean;
};

export const RoomScene=forwardRef<RoomHandle,Props>(function RoomScene({width,equipped,preview,appearance,personality,active,motion},ref){
  const s=width/ROOM_W,height=ROOM_H*s;
  const look=ROOM_PALETTE[appearance]??ROOM_PALETTE.dark;
  const [part,setPart]=useState<DayPart>(dayPart());
  const [lampOn,setLampOn]=useState(true);
  const [radioOn,setRadioOn]=useState(false);
  const [napping,setNapping]=useState(false);
  const [line,setLine]=useState<{text:string;tone:Tone}|null>(null);
  const [react,setReact]=useState<{id:string;n:number}|null>(null);
  const shown={...equipped};
  if(preview)shown[preview.slot]=preview.id;

  const face=useRef<PingFaceHandle>(null);
  const px=useSharedValue(SLOT_SPOT.floor.x);
  const py=useSharedValue(0);
  const bob=useSharedValue(0);
  const bubble=useSharedValue(0);
  const bubbleW=useSharedValue(0),bubbleH=useSharedValue(0);
  const pos=useRef({x:SLOT_SPOT.floor.x,dy:0});
  const lastIndex=useRef<Record<string,number>>({});
  const lastAct=useRef(Date.now()),lastSpoke=useRef(0),nextIdle=useRef(Date.now()+9000);
  const hideTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const walkTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const taps=useRef({n:0,at:0});
  const hold=useRef({timer:null as ReturnType<typeof setTimeout>|null,on:false,start:0,suppress:false});
  const napRef=useRef(false);
  const shownRef=useRef(shown);shownRef.current=shown;

  useEffect(()=>{getMeta('room:lamp').then(v=>setLampOn(v!=='0')).catch(()=>{});getMeta('room:radio').then(v=>setRadioOn(v==='1')).catch(()=>{});},[]);
  useEffect(()=>{if(active)setPart(dayPart());},[active]);

  const speak=useCallback((text:string,tone:Tone)=>{
    if(hideTimer.current)clearTimeout(hideTimer.current);
    lastSpoke.current=Date.now();
    bubbleW.value=0;
    setLine({text,tone});
    bubble.value=0;bubble.value=motion?withSpring(1,spring.pop):1;
    playSound(personality==='debochado'?'say_debochado':personality==='semPaciencia'?'say_semPaciencia':'say_deBoa',{volume:0.5});
    if(motion)face.current?.talk(Math.min(2.4,0.5+text.length*0.05));
    hideTimer.current=setTimeout(()=>{bubble.value=motion?withTiming(0,{duration:220}):0;setTimeout(()=>setLine(null),240);},4200);
  },[motion,personality]);
  const sayRoom=useCallback((sit:RoomSituation,tone?:Tone)=>{
    const r=roomLine(personality,sit,lastIndex.current[sit]);lastIndex.current[sit]=r.index;
    speak(r.text,tone??(sit==='comprou'||sit==='sino'?'festa':sit==='soneca'||sit==='acordou'||sit==='cansado'?'cansado':baseTone(personality)));
  },[personality,speak]);
  const sayItem=useCallback((id:string,kind:'toque'|'provando'|'comprou')=>{
    const key=id+kind;const r=itemLine(personality,id,kind,lastIndex.current[key]);lastIndex.current[key]=r.index;
    speak(r.text,kind==='comprou'?'festa':baseTone(personality));
  },[personality,speak]);

  /** Anda até `x` (e sobe `dy` para sentar), com passinhos. Chama `then` ao chegar. */
  const walkTo=useCallback((x:number,dy:number,then?:()=>void)=>{
    if(walkTimer.current)clearTimeout(walkTimer.current);
    const from=pos.current,dist=Math.abs(x-from.x);
    pos.current={x,dy};
    if(!motion){px.value=x;py.value=dy;then?.();return;}
    const standUp=from.dy!==0&&(dy===0||dist>4);
    const delay=standUp?260:0;
    if(standUp){py.value=withSpring(0,spring.soft);face.current?.hop(0.5);}
    const ms=dist<4?0:Math.min(1500,320+dist*6);
    if(ms){
      face.current?.look(x>from.x?0.9:-0.9,0.1);
      px.value=withDelay(delay,withTiming(x,{duration:ms,easing:Easing.inOut(Easing.quad)}));
      const steps=Math.max(1,Math.round(ms/170));
      bob.value=withDelay(delay,withRepeat(withSequence(withTiming(-5,{duration:85}),withTiming(0,{duration:85})),steps,false));
    }
    walkTimer.current=setTimeout(()=>{
      face.current?.look(0,0);
      if(dy!==0){py.value=withSpring(dy,spring.pop);face.current?.hop(0.8);}
      then?.();
    },delay+ms+(dy!==0?80:0));
  },[motion]);

  const wake=useCallback(()=>{
    if(!napRef.current)return false;
    napRef.current=false;setNapping(false);
    if(motion)face.current?.startle();
    playSound('startle',{volume:0.6});tapLight();sayRoom('acordou');
    return true;
  },[motion,sayRoom]);

  function toggleLamp(){const v=!lampOn;setLampOn(v);setMeta('room:lamp',v?'1':'0').catch(()=>{});tapLight();}
  function toggleRadio(){const v=!radioOn;setRadioOn(v);setMeta('room:radio',v?'1':'0').catch(()=>{});tapLight();if(v&&motion)setTimeout(()=>face.current?.dance(3),400);}

  /** Toque num item: o item reage, o Ping vai até ele e comenta. */
  function touchItem(id:string){
    lastAct.current=Date.now();
    if(wake())return;
    const item=itemById(id);
    if(!item)return;
    setReact({id,n:Date.now()});
    if(id==='luminaria')toggleLamp();
    if(id==='radio')toggleRadio();
    const spot=SLOT_SPOT[item.slot];
    walkTo(spot.x,spot.dy,()=>{
      sayItem(id,'toque');
      if(!motion)return;
      if(item.slot==='floor')face.current?.dance(2);
      else if(item.slot==='corner')face.current?.peek(1.4);
      else if(item.slot==='wall')face.current?.look(-0.7,-0.9);
      else if(item.slot==='seat')setTimeout(()=>face.current?.yawn(),900);
    });
  }
  function poke(){
    lastAct.current=Date.now();
    if(hold.current.suppress)return;
    if(wake())return;
    const now=Date.now();
    taps.current=now-taps.current.at<1800?{n:taps.current.n+1,at:now}:{n:1,at:now};
    playTap(Math.min(1.2,taps.current.n*0.25));tapLight();
    if(taps.current.n>=4){if(motion)face.current?.hop(0.4);if(taps.current.n===4)sayRoom('cansado');return;}
    if(motion)face.current?.ring();
    sayRoom('toque');
  }
  function pressIn(){
    hold.current.start=Date.now();
    if(!motion)return;
    hold.current.timer=setTimeout(()=>{hold.current.on=true;face.current?.hold(true);playSound('inflate',{volume:0.5});},250);
  }
  function pressOut(){
    if(hold.current.timer)clearTimeout(hold.current.timer);
    if(!hold.current.on)return;
    hold.current.on=false;face.current?.hold(false);stopSound('inflate');
    if(Date.now()-hold.current.start>550){
      hold.current.suppress=true;setTimeout(()=>{hold.current.suppress=false;},150);
      lastAct.current=Date.now();face.current?.bigRing();playSound('ring',{volume:1});tapSuccess();sayRoom('sino');
    }
  }

  useImperativeHandle(ref,()=>({
    preview:(id)=>{
      lastAct.current=Date.now();wake();const it=itemById(id);if(!it)return;
      if(isPingSlot(it.slot)){if(motion)face.current?.hop(0.6);sayItem(id,'provando');return;}
      const sp=SLOT_SPOT[it.slot];walkTo(sp.x,it.slot==='seat'?0:sp.dy,()=>sayItem(id,'provando'));
    },
    placed:(id,bought)=>{
      lastAct.current=Date.now();wake();const it=itemById(id);if(!it)return;
      setReact({id,n:Date.now()});
      const sp=isPingSlot(it.slot)?{x:pos.current.x,dy:pos.current.dy}:SLOT_SPOT[it.slot];
      walkTo(sp.x,sp.dy,()=>{
        if(bought){playSound('party',{volume:0.7});tapSuccess();if(motion){face.current?.hop(1.2);setTimeout(()=>face.current?.dance(2.4),350);}sayItem(id,'comprou');}
        else sayItem(id,'toque');
      });
    },
    noCoins:()=>{lastAct.current=Date.now();wake();if(motion)face.current?.pout(1.6);playSound('pout',{volume:0.5});sayRoom('semMoeda');},
  }),[walkTo,sayItem,sayRoom,wake,motion]);

  // Ao entrar: cumprimento (ou comentário do quarto vazio / do escuro).
  useEffect(()=>{
    if(!active)return;
    lastAct.current=Date.now();nextIdle.current=Date.now()+9000;
    const t=setTimeout(()=>{
      const hasItems=Object.entries(shownRef.current).some(([slot,id])=>id&&!isPingSlot(slot as SlotId));
      if(!hasItems)sayRoom('vazio');
      else if(dayPart()==='night'&&Math.random()<0.5)sayRoom('noite');
      else sayRoom('entrar');
      if(motion)face.current?.hop(0.7);
    },650);
    return()=>clearTimeout(t);
  },[active]);

  // Vida própria: passeia, olha os móveis, comenta um item, boceja e cochila se ninguém mexer.
  useEffect(()=>{
    if(!active||!motion)return;
    const timer=setInterval(()=>{
      const now=Date.now();
      if(napRef.current)return;
      if(now-lastAct.current>NAP_MS){
        napRef.current=true;face.current?.yawn();playSound('yawn',{volume:0.4});
        setTimeout(()=>{if(napRef.current)setNapping(true);},1400);
        return;
      }
      if(now<nextIdle.current||now-lastSpoke.current<5000)return;
      nextIdle.current=now+8000+Math.random()*7000;
      const items=Object.values(shownRef.current).filter(Boolean) as string[];
      const r=Math.random();
      if(radioOn&&r<0.3){face.current?.dance(2.5);return;}
      if(items.length&&r<0.55){
        const roomItems=items.filter(i=>{const it=itemById(i);return it&&!isPingSlot(it.slot);});
        if(!roomItems.length){face.current?.peek(1);return;}
        const id=roomItems[Math.floor(Math.random()*roomItems.length)];const it=itemById(id)!;const sp=SLOT_SPOT[it.slot];
        walkTo(sp.x,sp.dy,()=>{if(Math.random()<0.6)sayItem(id,'toque');else face.current?.peek(1.2);});
      }else if(r<0.8){
        walkTo(90+Math.random()*160,0,()=>{if(Math.random()<0.35)sayRoom('ocioso');});
      }else face.current?.yawn();
    },1000);
    return()=>clearInterval(timer);
  },[active,motion,radioOn,walkTo,sayItem,sayRoom]);
  useEffect(()=>()=>{if(hideTimer.current)clearTimeout(hideTimer.current);if(walkTimer.current)clearTimeout(walkTimer.current);},[]);
  useEffect(()=>{if(!active&&napRef.current){napRef.current=false;setNapping(false);}},[active]);

  const pingBox=PING_SIZE*PING_ROOM_SCALE*s;
  const pingStyle=useAnimatedStyle(()=>({transform:[{translateX:px.value*s-pingBox/2},{translateY:(FEET_Y+py.value)*s-pingBox+bob.value*s}]}));
  const shadowStyle=useAnimatedStyle(()=>({opacity:py.value<0?0:0.22,transform:[{translateX:px.value*s-pingBox*0.32},{translateY:FEET_Y*s-pingBox*0.06},{scaleX:1+bob.value*0.03}]}));
  const bubbleStyle=useAnimatedStyle(()=>{
    const cx=px.value*s,top=(FEET_Y+py.value)*s-pingBox*0.95+bob.value*s;
    const left=Math.max(4,Math.min(cx-bubbleW.value/2,width-bubbleW.value-4));
    return {opacity:bubbleW.value>0?Math.min(1,bubble.value*1.6):0,transform:[{translateX:left},{translateY:Math.max(2,top-bubbleH.value-8)+(1-bubble.value)*6},{scale:0.75+0.25*bubble.value}]};
  });
  const tailStyle=useAnimatedStyle(()=>{
    const cx=px.value*s;const left=Math.max(4,Math.min(cx-bubbleW.value/2,width-bubbleW.value-4));
    return {left:Math.max(12,Math.min(cx-left-7,bubbleW.value-26))};
  });
  const dark=part==='night'&&!lampOn;
  const tone=line?TONES[line.tone]:TONES.neutro;
  const lampArt=shown.table==='luminaria';

  return <View style={{width,height,borderRadius:16,overflow:'hidden'}}>
    <Svg width={width} height={height} viewBox={`0 0 ${ROOM_W} ${ROOM_H}`} style={StyleSheet.absoluteFill}>
      <RoomBackground look={look} part={part}/>
    </Svg>
    <View pointerEvents="none" style={{position:'absolute',left:(WINDOW[0]+4)*s,top:(WINDOW[1]+4)*s,width:(WINDOW[2]-8)*s,height:(WINDOW[3]-8)*s,overflow:'hidden'}}>
      {part==='night'
        ?[[10,14],[30,8],[52,22],[18,36],[44,40]].map(([x,y],i)=><Star key={i} x={x*s} y={y*s} delay={i*420} on={active&&motion}/>)
        :<><Drift s={s} top={6} dur={16000} delay={0} on={active&&motion}/><Drift s={s} top={26} dur={23000} delay={6000} on={active&&motion} small/></>}
    </View>
    <Svg pointerEvents="none" width={width} height={height} viewBox={`0 0 ${ROOM_W} ${ROOM_H}`} style={StyleSheet.absoluteFill}>
      <WindowFrame look={look}/>
    </Svg>
    {part==='day'&&active&&motion?[0,1,2,3,4].map(i=><Mote key={i} s={s} i={i}/>):null}
    {ORDER.map(slot=>{const id=shown[slot];if(!id||!ITEM_ART[id])return null;
      return <ItemLayer key={slot} id={id} slot={slot} s={s} motion={motion&&active} react={react?.id===id?react.n:0}
        ghost={preview?.id===id} on={id==='luminaria'?lampOn:id==='radio'?radioOn:undefined} onPress={()=>touchItem(id)}/>;})}
    <Animated.View pointerEvents="none" style={[{position:'absolute',left:0,top:0,width:pingBox*0.64,height:pingBox*0.12,borderRadius:pingBox,backgroundColor:'#000'},shadowStyle]}/>
    <Animated.View style={[{position:'absolute',left:0,top:0,width:pingBox,height:pingBox},pingStyle]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Ping. Toque para ele falar; segure para o sino" hitSlop={8}
        onPress={poke} onPressIn={pressIn} onPressOut={pressOut} style={{width:pingBox,height:pingBox}}>
        <View style={{position:'absolute',left:(pingBox-PING_SIZE)/2,top:(pingBox-PING_SIZE)/2,width:PING_SIZE,height:PING_SIZE,transform:[{scale:PING_ROOM_SCALE*s}]}}>
          <PingFace ref={face} personality={personality} moment="no_horario" sleeping={false} running={active&&motion} napping={napping} outfit={outfitOf(shown)}/>
        </View>
      </Pressable>
      {napping&&motion?<View pointerEvents="none" style={StyleSheet.absoluteFill}><Zed delay={0} size={11}/><Zed delay={800} size={14}/><Zed delay={1600} size={17}/></View>:null}
    </Animated.View>
    {radioOn&&shown.table==='radio'&&active&&motion?[0,1,2].map(i=><Note key={i} s={s} i={i}/>):null}
    {part==='night'?<Svg pointerEvents="none" width={width} height={height} viewBox={`0 0 ${ROOM_W} ${ROOM_H}`} style={StyleSheet.absoluteFill}>
      <Defs><RadialGradient id="lampGlow" cx="89" cy="120" r="120" gradientUnits="userSpaceOnUse">
        <Stop offset="0" stopColor="#FFD36B" stopOpacity={lampOn&&lampArt?0.38:0}/><Stop offset="1" stopColor="#FFD36B" stopOpacity={0}/></RadialGradient></Defs>
      <Rect x={0} y={0} width={ROOM_W} height={ROOM_H} fill="#0B1030" opacity={dark||!lampArt?0.34:0.14}/>
      {lampArt?<Circle cx={89} cy={120} r={120} fill="url(#lampGlow)"/>:null}
    </Svg>:lampOn&&lampArt?<Svg pointerEvents="none" width={width} height={height} viewBox={`0 0 ${ROOM_W} ${ROOM_H}`} style={StyleSheet.absoluteFill}>
      <Defs><RadialGradient id="lampDay" cx="89" cy="122" r="60" gradientUnits="userSpaceOnUse"><Stop offset="0" stopColor="#FFE08A" stopOpacity={0.35}/><Stop offset="1" stopColor="#FFE08A" stopOpacity={0}/></RadialGradient></Defs>
      <Circle cx={89} cy={122} r={60} fill="url(#lampDay)"/>
    </Svg>:null}
    {line?<Animated.View pointerEvents="none" style={[st.bubbleWrap,bubbleStyle]}>
      <View style={st.bubble} onLayout={e=>{bubbleW.value=e.nativeEvent.layout.width;bubbleH.value=e.nativeEvent.layout.height;}}>
        <Animated.View style={[st.tail,tailStyle]}/>
        <Text accessibilityLiveRegion="polite" numberOfLines={2} style={[st.bubbleText,{color:tone.text}]}>{line.text}</Text>
        <View style={[st.chip,{backgroundColor:tone.chip}]}><Text style={st.chipText}>{tone.glyph}</Text></View>
      </View>
    </Animated.View>:null}
  </View>;
});

/** Item tocável e animado: balança (plantas), entorta (quadros), afunda (assentos), pula (tapetes), acende (luminária, rádio). */
function ItemLayer({id,slot,s,motion,react,ghost,on,onPress}:{id:string;slot:SlotId;s:number;motion:boolean;react:number;ghost:boolean;on?:boolean;onPress:()=>void}){
  const art=ITEM_ART[id];
  const [x,y,w,h]=art.box;
  const rot=useSharedValue(0),sy=useSharedValue(1),sx=useSharedValue(1),sway=useSharedValue(0);
  useEffect(()=>{
    if(!motion||slot!=='corner'){cancelAnimation(sway);sway.value=0;return;}
    sway.value=withRepeat(withSequence(withTiming(1.6,{duration:1900,easing:Easing.inOut(Easing.sin)}),withTiming(-1.6,{duration:1900,easing:Easing.inOut(Easing.sin)})),-1,true);
    return()=>cancelAnimation(sway);
  },[motion,slot]);
  useEffect(()=>{
    if(!react||!motion)return;
    if(slot==='corner')rot.value=withSequence(withTiming(-8,{duration:90}),withTiming(7,{duration:120}),withTiming(-4,{duration:120}),withSpring(0,spring.soft));
    else if(slot==='wall')rot.value=withSequence(withTiming(6,{duration:110}),withSpring(0,{damping:4,stiffness:120}));
    else if(slot==='seat'){sy.value=withSequence(withTiming(0.88,{duration:120}),withSpring(1,spring.pop));sx.value=withSequence(withTiming(1.06,{duration:120}),withSpring(1,spring.pop));}
    else{sy.value=withSequence(withTiming(1.08,{duration:110}),withSpring(1,spring.pop));sx.value=withSequence(withTiming(1.04,{duration:110}),withSpring(1,spring.pop));}
  },[react]);
  const radioBeat=useSharedValue(1);
  useEffect(()=>{
    if(id==='radio'&&on&&motion){radioBeat.value=withRepeat(withSequence(withTiming(1.04,{duration:240}),withTiming(1,{duration:240})),-1,false);}
    else{cancelAnimation(radioBeat);radioBeat.value=1;}
    return()=>cancelAnimation(radioBeat);
  },[id,on,motion]);
  const style=useAnimatedStyle(()=>({opacity:ghost?0.72:1,transform:[{rotate:`${rot.value+sway.value}deg`},{scaleX:sx.value*radioBeat.value},{scaleY:sy.value*radioBeat.value}]}));
  const name=itemById(id)?.name??'Item';
  return <Pressable accessibilityRole="button" accessibilityLabel={`${name}. Toque para o Ping comentar${on!==undefined?`; ${on?'ligado':'desligado'}`:''}`}
    onPress={onPress} style={{position:'absolute',left:x*s,top:y*s,width:w*s,height:h*s}}>
    <Animated.View style={[{width:w*s,height:h*s,transformOrigin:slot==='wall'?'50% 0%':'50% 100%'},style]}>
      <Svg width={w*s} height={h*s} viewBox={art.box.join(' ')}>{art.draw()}</Svg>
      {id==='luminaria'&&!on?<View pointerEvents="none" style={{position:'absolute',left:(72-x)*s,top:(102-y)*s,width:34*s,height:24*s,backgroundColor:'#00000040',borderRadius:4*s}}/>:null}
    </Animated.View>
  </Pressable>;
}
function Drift({s,top,dur,delay,on,small}:{s:number;top:number;dur:number;delay:number;on:boolean;small?:boolean}){
  const p=useSharedValue(0.3);
  useEffect(()=>{
    if(!on)return;
    p.value=withDelay(delay,withRepeat(withTiming(1,{duration:dur,easing:Easing.linear}),-1,false));
    return()=>cancelAnimation(p);
  },[on]);
  const style=useAnimatedStyle(()=>({transform:[{translateX:interpolate(p.value,[0,1],[-40*s,80*s])}]}));
  return <Animated.View style={[{position:'absolute',top:top*s},style]}><Cloud w={(small?22:32)*s}/></Animated.View>;
}
function Star({x,y,delay,on}:{x:number;y:number;delay:number;on:boolean}){
  const p=useSharedValue(1);
  useEffect(()=>{if(!on)return;p.value=withDelay(delay,withRepeat(withSequence(withTiming(0.25,{duration:900}),withTiming(1,{duration:900})),-1,false));return()=>cancelAnimation(p);},[on]);
  const style=useAnimatedStyle(()=>({opacity:p.value}));
  return <Animated.View style={[{position:'absolute',left:x,top:y,width:3,height:3,borderRadius:2,backgroundColor:'#FFFFFF'},style]}/>;
}
/** Poeirinha dançando na luz da janela. */
function Mote({s,i}:{s:number;i:number}){
  const p=useSharedValue(0);
  useEffect(()=>{p.value=withDelay(i*900,withRepeat(withTiming(1,{duration:5200+i*700,easing:Easing.inOut(Easing.sin)}),-1,true));return()=>cancelAnimation(p);},[]);
  const x0=150+i*14,y0=120+i*20;
  const style=useAnimatedStyle(()=>({opacity:0.25+0.45*Math.sin(p.value*Math.PI),transform:[{translateX:(x0+p.value*24)*s},{translateY:(y0-p.value*30)*s}]}));
  return <Animated.View pointerEvents="none" style={[{position:'absolute',left:0,top:0,width:3,height:3,borderRadius:2,backgroundColor:'#FFF6C8'},style]}/>;
}
/** Notas musicais saindo do rádio. */
function Note({s,i}:{s:number;i:number}){
  const p=useSharedValue(0);
  useEffect(()=>{p.value=withDelay(i*700,withRepeat(withTiming(1,{duration:2100,easing:Easing.out(Easing.quad)}),-1,false));return()=>cancelAnimation(p);},[]);
  const style=useAnimatedStyle(()=>({opacity:interpolate(p.value,[0,0.15,0.8,1],[0,1,1,0]),transform:[{translateX:(96+p.value*(i%2?18:-10))*s},{translateY:(132-p.value*46)*s},{rotate:`${(p.value-0.5)*30}deg`}]}));
  return <Animated.Text pointerEvents="none" style={[{position:'absolute',left:0,top:0,fontSize:14*s,fontWeight:'900',color:['#FFD166','#FF7EB6','#7ED3C6'][i]},style]}>{i===1?'♫':'♪'}</Animated.Text>;
}
function Zed({delay,size}:{delay:number;size:number}){
  const p=useSharedValue(0);
  useEffect(()=>{p.value=withDelay(delay,withRepeat(withTiming(1,{duration:2400,easing:Easing.linear}),-1,false));return()=>cancelAnimation(p);},[]);
  const style=useAnimatedStyle(()=>({opacity:interpolate(p.value,[0,0.2,0.75,1],[0,0.9,0.9,0]),transform:[{translateX:p.value*12},{translateY:-p.value*28},{scale:0.7+0.4*p.value}]}));
  return <Animated.Text style={[{position:'absolute',top:6,right:0,fontSize:size,fontWeight:'900',color:'#FFFFFF'},style]}>z</Animated.Text>;
}
const st=StyleSheet.create({
  bubbleWrap:{position:'absolute',left:0,top:0,zIndex:20},
  bubble:{backgroundColor:'#FFFFFF',borderRadius:16,paddingHorizontal:12,paddingTop:7,paddingBottom:8,maxWidth:170,elevation:6,shadowColor:'#000',shadowOffset:{width:0,height:6},shadowOpacity:0.35,shadowRadius:9},
  bubbleText:{fontFamily:'Baloo2_700Bold',fontSize:13,lineHeight:15,includeFontPadding:false,textAlign:'center'},
  chip:{position:'absolute',left:-8,top:-9,width:21,height:21,borderRadius:11,borderWidth:2,borderColor:'#FFFFFF',alignItems:'center',justifyContent:'center',elevation:7},
  chipText:{color:'#FFFFFF',fontSize:11,fontWeight:'900',includeFontPadding:false,lineHeight:13},
  tail:{position:'absolute',bottom:-5,width:14,height:14,backgroundColor:'#FFFFFF',borderBottomRightRadius:3,transform:[{rotate:'45deg'}]},
});
