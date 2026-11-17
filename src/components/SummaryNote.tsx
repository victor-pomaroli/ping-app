import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {View,Text,StyleSheet,Animated,Easing,type StyleProp,type TextStyle} from 'react-native';
import Reanimated,{Easing as REasing,useAnimatedStyle,useSharedValue,withDelay,withSequence,withSpring,withTiming} from 'react-native-reanimated';
import {spring,useMotionEnabled} from '../motion';
import {isDarkAppearance,type Appearance} from '../theme';
import type {NotificationPersonality} from '../preferences';
import {dayMood,type DayMood} from '../ping-lines';
import {PingMascot,PING_COLUMN,PING_SIZE} from './PingMascot';

/**
 * "O resumo da ópera" da aba Hoje. Cada tema tem um papel diferente, desenhado só com Views:
 * - temas escuros (original e azul): folha de bloco arrancada (faixa da espiral com furos) presa por fita;
 * - temas claros (suave e rosa): post-it quadrado clássico com tachinha e a ponta de baixo levantando.
 * As cores de cada tema ficam em `binderColors`/`postitColors`; o desenho e a animação são os mesmos.
 */
type Props={
  appearance:Appearance;page:string;left:number;overdue:number;today:number;done:number;celebrateKey?:number;
  /** Ping ao lado do papel: personalidade, aba Hoje na tela e contador de tarefas concluídas. */
  personality?:NotificationPersonality;active?:boolean;completeKey?:number;refreshKey?:number;
};

/** Quanto do Ping desce sobre o papel (px, medido do topo do post-it até a base do desenho). */
const PING_PERCH=66;

const pad=(n:number)=>String(n).padStart(2,'0');
const plural=(n:number,one:string,many:string)=>`${n} ${n===1?one:many}`;
/** Rótulo que muda com o estado do dia, em vez de um título fixo. */
const MOOD_LABELS:Record<DayMood,string>={devendo:'TÁ DEVENDO',falta_pouco:'FALTA POUCO',ainda_hoje:'AINDA HOJE',cumprida:'MISSÃO CUMPRIDA',vazio:'DIA EM BRANCO'};
const moodLabel=(left:number,overdue:number,done:number)=>MOOD_LABELS[dayMood(left,overdue,done)];

export function SummaryNote({appearance,page,left,overdue,today,done,celebrateKey=0,personality='debochado',active=true,completeKey=0,refreshKey=0}:Props){
  const binder=isDarkAppearance(appearance);
  const bc=binderColors[appearance]??binderColors.dark;
  const pc=postitColors[appearance]??postitColors.softLight;
  const look=binder?{...dark,...bc}:{...light,...pc};
  const total=left+done;
  // Comemoração: o papel dá um pulinho e balança preso na fita/tachinha, amortecendo até parar.
  const wobble=useRef(new Animated.Value(0)).current;
  const lift=useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    if(celebrateKey<=0)return;
    wobble.setValue(0);lift.setValue(0);
    const swing=(to:number,duration:number)=>Animated.timing(wobble,{toValue:to,duration,easing:Easing.inOut(Easing.sin),useNativeDriver:true});
    const animation=Animated.parallel([
      Animated.sequence([
        Animated.timing(lift,{toValue:1,duration:160,easing:Easing.out(Easing.quad),useNativeDriver:true}),
        Animated.spring(lift,{toValue:0,friction:4,tension:120,useNativeDriver:true}),
      ]),
      Animated.sequence([swing(1,140),swing(-0.85,180),swing(0.6,170),swing(-0.4,160),swing(0.2,150),swing(0,140)]),
    ]);
    animation.start();
    return()=>animation.stop();
  },[celebrateKey]);
  const motion={transform:[
    {translateY:lift.interpolate({inputRange:[0,1],outputRange:[0,-10]})},
    {scale:lift.interpolate({inputRange:[0,1],outputRange:[1,1.04]})},
    {rotate:wobble.interpolate({inputRange:[-1,1],outputRange:['-5deg','5deg']})},
  ]};
  return <View>
  <Animated.View style={[look.wrap,motion]}>
    {binder?<View pointerEvents="none" style={[dark.tape,{backgroundColor:bc.tape}]}/>:null}
    <View style={[look.sheet,binder&&{backgroundColor:look.paper}]}>
      {binder
        ?<View style={[dark.binding,{backgroundColor:bc.binding}]}><View style={dark.holes}>{[0,1,2,3,4].map(i=><View key={i} style={[dark.hole,{backgroundColor:page}]}><View style={[dark.ring,{backgroundColor:page}]}/></View>)}</View></View>
        :<LiftedPaper colors={pc}/>}
      <Text style={[base.label,{color:look.ink}]}>{moodLabel(left,overdue,done)}</Text>
      <View style={base.numbers}>
        <RollingNumber value={left} style={[base.big,{color:look.ink}]}/>
        <View style={base.side}>
          <Text style={[base.sideBig,{color:look.ink}]}>{plural(overdue,'atrasada','atrasadas')}</Text>
          <Text style={[base.sideSmall,{color:look.ink}]}>{today} pra hoje</Text>
        </View>
      </View>
      <View style={[base.done,{borderTopColor:look.rule}]}>
        <StampSlam value={done}><View style={[base.stamp,{borderColor:look.ink}]}><Text style={[base.stampText,{color:look.ink}]}>✓ {pad(done)} {done===1?'FEITA':'FEITAS'}</Text></View></StampSlam>
        <Progress done={done} total={total} ink={look.ink} empty={look.rule}/>
        <Text style={[base.frac,{color:look.ink}]}>{done}/{total}</Text>
      </View>
      {!binder?<View pointerEvents="none" style={[light.pin,{backgroundColor:pc.pin}]}><View style={light.pinShine}/></View>:null}
    </View>
  </Animated.View>
  {/* O Ping fica por cima do post-it, no canto superior direito (onde o papel está vazio): o papel mantém o tamanho de antes. */}
  <View pointerEvents="box-none" style={{position:'absolute',right:-6,top:-(PING_SIZE-PING_PERCH),width:PING_COLUMN,height:PING_SIZE,zIndex:10,overflow:'visible'}}>
    <PingMascot personality={personality} left={left} overdue={overdue} done={done} active={active} celebrateKey={celebrateKey} completeKey={completeKey} refreshKey={refreshKey}/>
  </View>
  </View>;
}

/**
 * Papel do tema claro sem o canto de baixo: corpo + faixa inferior (sem o quadrado do canto),
 * cada um com sua sombra. Assim nem a sombra nem o papel aparecem atrás da ponta levantada;
 * no canto fica só a aba dobrada e a sombrinha que ela projeta.
 */
function LiftedPaper({colors}:{colors:PostitColors}){
  const C=light.corner;
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <View style={[light.piece,{top:4,left:2,right:-2,bottom:C-4,backgroundColor:colors.shadow}]}/>
    <View style={[light.piece,{left:2,bottom:-4,height:C,right:C-2,backgroundColor:colors.shadow}]}/>
    <View style={[light.piece,{top:0,left:0,right:0,bottom:C,backgroundColor:colors.paper,borderTopLeftRadius:2,borderTopRightRadius:2}]}/>
    <View style={[light.piece,{left:0,bottom:0,height:C,right:C,backgroundColor:colors.paper,borderBottomLeftRadius:2}]}/>
    <View style={[light.flap,{right:-3,bottom:-3,borderTopColor:colors.shadow}]}/>
    <View style={[light.flap,{right:0,bottom:0,borderTopColor:colors.curlColor}]}/>
  </View>;
}

/** Segmentos quando cabem (até 8); acima disso, uma barra contínua. */
function Progress({done,total,ink,empty}:{done:number;total:number;ink:string;empty:string}){
  // Quantos já estavam feitos antes desta renderização: os segmentos novos entram em fila a partir dali.
  const before=useRef(done);
  useEffect(()=>{before.current=done;},[done]);
  if(total>0&&total<=8)return <View style={base.track}>{Array.from({length:total},(_,i)=><Segment key={i} filled={i<done} ink={ink} empty={empty} delay={Math.max(0,i-before.current)*70}/>)}</View>;
  return <Bar pct={total?Math.round(done/total*100):0} ink={ink} empty={empty}/>;
}

/** Segmento que se enche da esquerda para a direita com um pop de mola. Na montagem não anima. */
function Segment({filled,ink,empty,delay}:{filled:boolean;ink:string;empty:string;delay:number}){
  const motion=useMotionEnabled();
  const fill=useSharedValue(filled?1:0);
  const pop=useSharedValue(1);
  const mounted=useRef(false);
  useEffect(()=>{
    if(!mounted.current){mounted.current=true;return;}
    if(!motion){fill.value=filled?1:0;return;}
    if(filled){
      fill.value=withDelay(delay,withSpring(1,spring.pop));
      pop.value=withDelay(delay,withSequence(withTiming(1.7,{duration:90}),withSpring(1,spring.pop)));
    }else fill.value=withTiming(0,{duration:140});
  },[filled]);
  const fillStyle=useAnimatedStyle(()=>({transform:[{scaleX:Math.max(0,fill.value)}]}));
  const popStyle=useAnimatedStyle(()=>({transform:[{scaleY:pop.value}]}));
  return <Reanimated.View style={[base.segment,{backgroundColor:empty,overflow:'hidden'},popStyle]}>
    <Reanimated.View style={[StyleSheet.absoluteFill,{backgroundColor:ink,transformOrigin:'0% 50%'},fillStyle]}/>
  </Reanimated.View>;
}

/** Barra contínua (mais de 8 itens): enche com mola e, quando avança, um brilho passa por ela uma vez. */
function Bar({pct,ink,empty}:{pct:number;ink:string;empty:string}){
  const motion=useMotionEnabled();
  const p=useSharedValue(pct);
  const shine=useSharedValue(0);
  const width=useSharedValue(0);
  const last=useRef(pct);
  useEffect(()=>{
    const grew=pct>last.current;
    last.current=pct;
    if(!motion){p.value=pct;return;}
    p.value=withSpring(pct,spring.soft);
    if(grew){shine.value=0.001;shine.value=withTiming(1,{duration:520,easing:REasing.out(REasing.quad)});}
  },[pct]);
  const fillStyle=useAnimatedStyle(()=>({width:`${Math.min(100,Math.max(0,p.value))}%` as `${number}%`}));
  const shineStyle=useAnimatedStyle(()=>({
    opacity:shine.value>0&&shine.value<1?1:0,
    transform:[{translateX:(shine.value*1.4-0.35)*width.value}],
  }));
  return <View onLayout={event=>{width.value=event.nativeEvent.layout.width;}} style={[base.track,base.bar,{backgroundColor:empty}]}>
    <Reanimated.View style={[base.fill,{backgroundColor:ink,overflow:'hidden'},fillStyle]}>
      <Reanimated.View pointerEvents="none" style={[{position:'absolute',top:0,bottom:0,left:0,width:26,backgroundColor:'rgba(255,255,255,0.45)'},shineStyle]}/>
    </Reanimated.View>
  </View>;
}

/** Número que "rola": o valor antigo sai e o novo entra (de baixo se subiu, de cima se desceu). */
function RollingNumber({value,style}:{value:number;style:StyleProp<TextStyle>}){
  const motion=useMotionEnabled();
  const [prev,setPrev]=useState<number|null>(null);
  const last=useRef(value);
  const t=useSharedValue(1);
  const dir=useSharedValue(1);
  // Layout effect: o `t` volta a 0 antes do primeiro quadro com o valor novo, sem piscar.
  useLayoutEffect(()=>{
    if(last.current===value)return;
    const before=last.current;
    dir.value=value>before?1:-1;
    last.current=value;
    if(!motion)return;
    setPrev(before);
    t.value=0;
    t.value=withTiming(1,{duration:260,easing:REasing.out(REasing.cubic)});
    const timer=setTimeout(()=>setPrev(null),300);
    return()=>clearTimeout(timer);
  },[value]);
  const entering=useAnimatedStyle(()=>({opacity:t.value,transform:[{translateY:(1-t.value)*14*dir.value},{scale:0.92+0.08*t.value}]}));
  const leaving=useAnimatedStyle(()=>({opacity:1-t.value,transform:[{translateY:-t.value*14*dir.value}]}));
  return <View>
    <Reanimated.Text style={[style,entering]}>{pad(value)}</Reanimated.Text>
    {prev!==null?<Reanimated.Text pointerEvents="none" style={[style,{position:'absolute',left:0,top:0},leaving]}>{pad(prev)}</Reanimated.Text>:null}
  </View>;
}

/** O carimbo "✓ 03 FEITAS" bate (cresce e assenta com mola) toda vez que o número de feitas sobe. */
function StampSlam({value,children}:{value:number;children:React.ReactNode}){
  const motion=useMotionEnabled();
  const scale=useSharedValue(1);
  const last=useRef(value);
  useEffect(()=>{
    const up=value>last.current;
    last.current=value;
    if(!up||!motion)return;
    scale.value=1.45;
    scale.value=withSpring(1,{damping:8,stiffness:300,mass:0.5});
  },[value]);
  const slam=useAnimatedStyle(()=>({transform:[{scale:scale.value}]}));
  return <Reanimated.View style={slam}>{children}</Reanimated.View>;
}

const base=StyleSheet.create({
  label:{fontWeight:'900',letterSpacing:2,fontSize:10},
  numbers:{flexDirection:'row',alignItems:'center',gap:18,marginTop:4},
  big:{fontSize:58,fontWeight:'900',letterSpacing:-4,includeFontPadding:false},
  side:{gap:6},
  sideBig:{fontWeight:'900',fontSize:17},
  sideSmall:{fontWeight:'600',fontSize:14},
  done:{flexDirection:'row',alignItems:'center',gap:10,marginTop:12,paddingTop:12,borderTopWidth:1.5,borderStyle:'dashed'},
  stamp:{borderWidth:2,borderRadius:6,paddingHorizontal:7,paddingVertical:3,transform:[{rotate:'-3deg'}]},
  stampText:{fontSize:11,fontWeight:'900',letterSpacing:1},
  track:{flex:1,flexDirection:'row',gap:4},
  segment:{flex:1,height:7,borderRadius:4},
  bar:{height:7,borderRadius:4,overflow:'hidden'},
  fill:{height:7,borderRadius:4},
  frac:{fontSize:12,fontWeight:'700',fontVariant:['tabular-nums']},
});

type BinderColors={paper:string;ink:string;rule:string;binding:string;tape:string};
type PostitColors={paper:string;ink:string;rule:string;curlColor:string;shadow:string;pin:string};
/** Folha de bloco: papel no tom do realce, faixa um pouco mais escura e fita de cor contrastante. */
const binderColors:Partial<Record<Appearance,BinderColors>>&{dark:BinderColors}={
  dark:{paper:'#D7FC65',ink:'#111310',rule:'rgba(17,19,16,0.25)',binding:'#B5D653',tape:'rgba(125,220,199,0.78)'},
  ocean:{paper:'#6FD6FF',ink:'#0D1424',rule:'rgba(13,20,36,0.25)',binding:'#4DB4E0',tape:'rgba(255,170,214,0.8)'},
};
/** Post-it: papel claro mas destacado do fundo, dobra um tom abaixo e tachinha contrastante. */
const postitColors:Partial<Record<Appearance,PostitColors>>&{softLight:PostitColors}={
  softLight:{paper:'#F3F1A6',ink:'#2B3020',rule:'rgba(43,48,32,0.22)',curlColor:'#D9D681',shadow:'rgba(91,90,42,0.16)',pin:'#D9574A'},
  rose:{paper:'#FFC2DA',ink:'#3A1B2B',rule:'rgba(58,27,43,0.22)',curlColor:'#EC9DBE',shadow:'rgba(120,40,80,0.18)',pin:'#2F8F89'},
};

const dark={
  ...StyleSheet.create({
    wrap:{marginTop:4,marginBottom:12,marginHorizontal:4},
    sheet:{borderRadius:3,paddingHorizontal:22,paddingBottom:20,transform:[{rotate:'-1.4deg'}],elevation:3,shadowColor:'#000',shadowOffset:{width:0,height:3},shadowOpacity:0.2,shadowRadius:6},
    binding:{height:24,marginHorizontal:-22,marginBottom:12,borderTopLeftRadius:3,borderTopRightRadius:3},
    holes:{position:'absolute',top:-7,right:22,flexDirection:'row',gap:16},
    hole:{width:13,height:17,borderRadius:7},
    ring:{position:'absolute',left:5,top:13,width:3,height:9,borderRadius:2},
    tape:{position:'absolute',left:-14,top:-10,width:92,height:28,borderRadius:2,transform:[{rotate:'-24deg'}],zIndex:5,elevation:5},
  }),
};

const light={
  corner:30,
  ...StyleSheet.create({
    wrap:{marginTop:10,marginBottom:12,marginHorizontal:6},
    sheet:{padding:20,paddingTop:22,paddingBottom:24,transform:[{rotate:'1.2deg'}]},
    piece:{position:'absolute'},
    // Aba dobrada: metade de cima-esquerda do quadrado do canto.
    flap:{position:'absolute',width:0,height:0,borderTopWidth:30,borderRightWidth:30,borderRightColor:'transparent'},
    pin:{position:'absolute',top:-9,alignSelf:'center',width:20,height:20,borderRadius:10,elevation:6,shadowColor:'#000',shadowOffset:{width:1,height:2},shadowOpacity:0.3,shadowRadius:2,zIndex:5},
    pinShine:{position:'absolute',top:4,left:5,width:6,height:6,borderRadius:3,backgroundColor:'rgba(255,255,255,0.55)'},
  }),
};
