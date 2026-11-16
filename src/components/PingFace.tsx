import React,{forwardRef,useEffect,useImperativeHandle} from 'react';
import {StyleSheet,View} from 'react-native';
import Animated,{Easing,cancelAnimation,interpolate,useAnimatedProps,useAnimatedStyle,useFrameCallback,useSharedValue,withDelay,withRepeat,withSequence,withTiming} from 'react-native-reanimated';
import Svg,{Circle,Ellipse,Line,Path} from 'react-native-svg';
import type {NotificationPersonality} from '../preferences';
import type {FaceMoment} from '../faces';

/**
 * O Ping em vetor, em camadas, para animar por dentro: pisca, olha para os lados, pisca com um olho só,
 * mexe a boca ao falar, mexe as sobrancelhas e balança o corpo com o badalo atrasando como um pêndulo.
 * A arte é SVG (estática); cada parte que se mexe fica em uma Animated.View e a física roda na thread de UI
 * (useFrameCallback), então nada disso passa pela thread de JS. Coordenadas em um quadro de 200×200.
 */
export const PING_SIZE=104;
const K=PING_SIZE/200;
const u=(n:number)=>{'worklet';return n*K;};
const OUT='#141414';

const COLORS:Record<NotificationPersonality,Record<FaceMoment,string>>={
  deBoa:{no_horario:'#8fe6c6',atraso_1h:'#8ecbf2',atraso_3h:'#aebcf0'},
  debochado:{no_horario:'#b9e83c',atraso_1h:'#f7c733',atraso_3h:'#f6962b'},
  semPaciencia:{no_horario:'#fcd534',atraso_1h:'#f46d3b',atraso_3h:'#ea423b'},
};
type Mouth={w:number;c:number;o:number;sk?:number};
type Brow={cy:number;ang:number;arch?:boolean};
type Extra='sparks'|'note'|'drop'|'steam'|'rage'|null;
type Face={eyes:'dot'|'wink'|'half'|'happy'|'sleep';brow:Brow|null;mouth:Mouth;cheeks?:boolean;extra:Extra};
const FACES:Record<NotificationPersonality,Record<FaceMoment,Face>>={
  deBoa:{
    no_horario:{eyes:'happy',brow:null,mouth:{w:12,c:12,o:0},cheeks:true,extra:'sparks'},
    atraso_1h:{eyes:'happy',brow:null,mouth:{w:11,c:10,o:0},extra:'note'},
    atraso_3h:{eyes:'dot',brow:{cy:91,ang:-17},mouth:{w:8,c:-7,o:0},extra:'drop'},
  },
  debochado:{
    no_horario:{eyes:'wink',brow:{cy:87,ang:0,arch:true},mouth:{w:13,c:10,o:0,sk:-2},extra:'sparks'},
    atraso_1h:{eyes:'half',brow:{cy:86,ang:0,arch:true},mouth:{w:11,c:-3,o:0,sk:-4},extra:null},
    atraso_3h:{eyes:'half',brow:{cy:86,ang:0,arch:true},mouth:{w:13,c:11,o:0},extra:'drop'},
  },
  semPaciencia:{
    no_horario:{eyes:'dot',brow:{cy:89,ang:10},mouth:{w:13,c:9,o:0.55},extra:'sparks'},
    atraso_1h:{eyes:'dot',brow:{cy:88,ang:24},mouth:{w:12,c:-10,o:0},extra:'steam'},
    atraso_3h:{eyes:'dot',brow:{cy:87,ang:30},mouth:{w:13,c:-5,o:0.8},extra:'rage'},
  },
};
const SLEEP_FACE:Face={eyes:'sleep',brow:null,mouth:{w:6,c:3,o:0},extra:null};
const BODY='M26 150C43 142 51 124 53 98C55 62 76 46 100 46C124 46 145 62 147 98C149 124 157 142 174 150C183 156 177 164 165 164L35 164C23 164 17 156 26 150Z';
const PERS_INDEX:Record<NotificationPersonality,number>={deBoa:0,debochado:1,semPaciencia:2};

export type PingFaceHandle={
  /** O sino chacoalha: corpo e badalo reagem, com um pulinho curto. */
  ring:()=>void;
  /** Pulo com squash & stretch (força 1 = pulo normal). */
  hop:(power:number)=>void;
  /** Mexe a boca (e as sobrancelhas) por `seconds` segundos, como quem fala. */
  talk:(seconds:number)=>void;
};
type Props={personality:NotificationPersonality;moment:FaceMoment;sleeping:boolean;/** Loops ligados (aba na tela e animações ativas). */running:boolean};

const AnimatedPath=Animated.createAnimatedComponent(Path);

/** Caminho da boca (aberta ou fechada) a partir do quanto está aberta. Worklet: roda na thread de UI. */
function mouthGeometry(open:number,w:number,c:number,sk:number){
  'worklet';
  const cx=100,cy=130,x1=cx-w,x2=cx+w,y1=cy,y2=cy+sk;
  const depth=open*11,top=cy+c*0.9,low=top+depth*2.1;
  const d=`M${x1} ${y1}Q${cx} ${top} ${x2} ${y2}Q${cx} ${low} ${x1} ${y1}Z`;
  // língua: lente dentro da boca, entre a curva de baixo e uma curva 55% mais acima
  const t0=0.22,t1=0.78;
  const qx=(t:number)=>(1-t)*(1-t)*x1+2*t*(1-t)*cx+t*t*x2;
  const qy=(t:number)=>(1-t)*(1-t)*y1+2*t*(1-t)*low+t*t*y2;
  const ax=qx(t0),ay=qy(t0),bx=qx(t1),by=qy(t1);
  const lcx=(1-t0)*(1-t1)*x1+((1-t0)*t1+t0*(1-t1))*cx+t0*t1*x2;
  const lcy=(1-t0)*(1-t1)*y1+((1-t0)*t1+t0*(1-t1))*low+t0*t1*y2;
  const lowMid=(ay+2*lcy+by)/4;
  const ucy=(4*(lowMid-depth*0.55)-ay-by)/2;
  const tongue=`M${ax} ${ay}Q${lcx} ${lcy} ${bx} ${by}Q${(ax+bx)/2} ${ucy} ${ax} ${ay}Z`;
  return {d,tongue};
}

export const PingFace=forwardRef<PingFaceHandle,Props>(function PingFace({personality,moment,sleeping,running},ref){
  const face=sleeping?SLEEP_FACE:FACES[personality][moment];
  const color=COLORS[personality][moment];
  const persIdx=PERS_INDEX[personality];

  // ── saídas (lidas pelos estilos) ────────────────────────────────────────────
  const rot=useSharedValue(0);const clap=useSharedValue(0);const hopY=useSharedValue(0);const sq=useSharedValue(0);
  const blink=useSharedValue(0);const wink=useSharedValue(0);const lookX=useSharedValue(0);const lookY=useSharedValue(0);
  const mouthOpen=useSharedValue(face.mouth.o);
  const bLy=useSharedValue(0);const bLr=useSharedValue(0);const bRy=useSharedValue(0);const bRr=useSharedValue(0);
  // ── estado interno da física (só a thread de UI escreve) ───────────────────
  const T=useSharedValue(0);const rotV=useSharedValue(0);const clapV=useSharedValue(0);const hopV=useSharedValue(0);const sqV=useSharedValue(0);
  const blinkAt=useSharedValue(1.5);const blinkPhase=useSharedValue(-1);const dbl=useSharedValue(0);
  const lookAt=useSharedValue(2);const lookTX=useSharedValue(0);const lookTY=useSharedValue(0);
  const winkAt=useSharedValue(2.2);const winkP=useSharedValue(-1);const jitterAt=useSharedValue(3);
  const browAt=useSharedValue(1.2);const evKind=useSharedValue(0);const evSide=useSharedValue(0);const evEnd=useSharedValue(0);
  const bLvy=useSharedValue(0);const bLvr=useSharedValue(0);const bRvy=useSharedValue(0);const bRvr=useSharedValue(0);
  const talkUntil=useSharedValue(0);
  // ── entradas (só a thread de JS escreve) ────────────────────────────────────
  const inPers=useSharedValue(persIdx);const inSleep=useSharedValue(sleeping?1:0);const inWink=useSharedValue(face.eyes==='wink'?1:0);
  const inBrows=useSharedValue(face.brow?1:0);const inMouthO=useSharedValue(face.mouth.o);
  const ringKey=useSharedValue(0);const hopKey=useSharedValue(0);const hopPower=useSharedValue(1);const talkKey=useSharedValue(0);const talkDur=useSharedValue(0);
  const seenRing=useSharedValue(0);const seenHop=useSharedValue(0);const seenTalk=useSharedValue(0);

  useEffect(()=>{
    inPers.value=persIdx;inSleep.value=sleeping?1:0;inWink.value=face.eyes==='wink'?1:0;
    inBrows.value=face.brow?1:0;inMouthO.value=face.mouth.o;
  },[persIdx,sleeping,face]);

  useImperativeHandle(ref,()=>({
    ring:()=>{ringKey.value+=1;},
    hop:(power:number)=>{hopPower.value=power;hopKey.value+=1;},
    talk:(seconds:number)=>{talkDur.value=seconds;talkKey.value+=1;},
  }),[]);

  const frame=useFrameCallback((f)=>{
    'worklet';
    const dt=Math.min(0.033,(f.timeSincePreviousFrame??16)/1000);
    if(dt<=0)return;
    T.value+=dt;const t=T.value;
    const pers=inPers.value;const sleepy=inSleep.value===1;

    // gatilhos vindos do JS
    if(ringKey.value!==seenRing.value){seenRing.value=ringKey.value;rotV.value+=(Math.random()<0.5?-1:1)*(pers===2?260:210);hopV.value=-90;sq.value=-0.05;}
    if(hopKey.value!==seenHop.value){seenHop.value=hopKey.value;hopV.value=-260*Math.min(1.4,0.7+hopPower.value*0.3);sqV.value=-4;}
    if(talkKey.value!==seenTalk.value){seenTalk.value=talkKey.value;talkUntil.value=t+talkDur.value;}

    // corpo: mola em direção ao repouso de cada personalidade
    let target=0;
    if(sleepy)target=Math.sin(t*1.0)*1.5+3;
    else if(pers===0)target=Math.sin(t*1.1)*3;
    else if(pers===1)target=-5+Math.sin(t*0.8)*1.2;
    else if(t>jitterAt.value){jitterAt.value=t+2.5+Math.random()*2.5;rotV.value+=(Math.random()<0.5?-1:1)*120;}
    const rotAcc=-60*(rot.value-target)-6.5*rotV.value;
    rotV.value+=rotAcc*dt;rot.value+=rotV.value*dt;
    // badalo: pêndulo em relação ao corpo (reage à aceleração do corpo, então atrasa)
    const clapAcc=-95*clap.value-3.4*clapV.value-rotAcc*0.95;
    clapV.value+=clapAcc*dt;
    clap.value=Math.max(-55,Math.min(55,clap.value+clapV.value*dt));
    // pulo e squash
    hopV.value+=900*dt;hopY.value+=hopV.value*dt;
    if(hopY.value>0){hopY.value=0;if(hopV.value>60)sqV.value=3;hopV.value=0;}
    sqV.value+=(-170*sq.value-11*sqV.value)*dt;sq.value+=sqV.value*dt;

    // piscar (com piscada dupla de vez em quando)
    if(!sleepy){
      if(blinkPhase.value<0&&t>blinkAt.value)blinkPhase.value=0;
      if(blinkPhase.value>=0){
        blinkPhase.value+=dt/0.13;const p=blinkPhase.value;
        blink.value=p<1?p:Math.max(0,2-p);
        if(p>=2){
          blinkPhase.value=-1;blink.value=0;
          if(dbl.value===0&&Math.random()<0.22){dbl.value=1;blinkAt.value=t+0.16;}
          else{dbl.value=0;blinkAt.value=t+2.2+Math.random()*3.2;}
        }
      }
    }else blink.value=0;
    // olhar (o debochado costuma olhar de lado)
    if(t>lookAt.value){
      lookAt.value=t+1.4+Math.random()*2.6;
      const side=pers===1&&Math.random()<0.6;
      lookTX.value=side?(Math.random()<0.5?4.5:-4.5):(Math.random()*6-3);
      lookTY.value=Math.random()*3-1.2;
    }
    lookX.value+=(lookTX.value-lookX.value)*Math.min(1,dt*9);
    lookY.value+=(lookTY.value-lookY.value)*Math.min(1,dt*9);
    const talking=t<talkUntil.value;

    // piscadela periódica do olho direito (debochado no horário)
    if(inWink.value===1){
      if(winkP.value<0&&t>winkAt.value)winkP.value=0;
      if(winkP.value>=0){
        winkP.value+=dt;const w=winkP.value;
        wink.value=w<0.09?w/0.09:w<0.5?1:Math.max(0,1-(w-0.5)/0.14);
        if(w>0.64){winkP.value=-1;wink.value=0;winkAt.value=t+2.6+Math.random()*3.4;}
      }
    }else wink.value=0;

    // sobrancelhas: eventos de expressão + ritmo da fala + mola individual
    if(inBrows.value===1){
      if(t>browAt.value){
        // 1 = uma só, 2 = as duas, 3 = franze, 4 = relance
        const r=Math.random();
        evKind.value=pers===1?(r<0.5?1:r<0.75?2:4):pers===2?(r<0.5?3:r<0.75?4:2):(r<0.34?2:r<0.67?1:4);
        evSide.value=Math.random()<0.5?0:1;
        evEnd.value=t+(evKind.value===4?0.18:0.5+Math.random()*0.5);
        browAt.value=t+1.6+Math.random()*2.4;
      }
      const evOn=t<evEnd.value;const kind=evKind.value;
      const syl=talking?Math.max(0,Math.sin(t*6.5+Math.sin(t*2.3)*1.2)):0;
      for(let i=0;i<2;i++){
        const sg=i===0?1:-1;
        let ty=0,tr=0;
        if(evOn){
          if(kind===2){ty=-5;tr=-6*sg*(pers===2?-1:1);}
          else if(kind===1){if(i===evSide.value){ty=-7;tr=-11*sg;}else{ty=1.5;tr=5*sg;}}
          else if(kind===3){ty=2.5;tr=9*sg;}
          else if(kind===4){ty=-6;tr=-4*sg;}
        }
        ty-=syl*(i===evSide.value?3.2:2.2);tr-=syl*2.5*sg;
        if(sg===-1)ty-=wink.value*3;
        ty+=Math.sin(t*1.7+i*2)*0.5;
        if(i===0){
          bLvy.value+=(-260*(bLy.value-ty)-17*bLvy.value)*dt;bLy.value+=bLvy.value*dt;
          bLvr.value+=(-260*(bLr.value-tr)-17*bLvr.value)*dt;bLr.value+=bLvr.value*dt;
        }else{
          bRvy.value+=(-260*(bRy.value-ty)-17*bRvy.value)*dt;bRy.value+=bRvy.value*dt;
          bRvr.value+=(-260*(bRr.value-tr)-17*bRvr.value)*dt;bRr.value+=bRvr.value*dt;
        }
      }
    }
    // boca: pequena e no ritmo das sílabas
    const base=inMouthO.value;
    if(talking){
      const syl=Math.abs(Math.sin(t*9+Math.sin(t*3.1)*1.5));
      mouthOpen.value=base>0?base*(0.55+0.45*syl):0.12+0.3*syl;
    }else mouthOpen.value=base;
  },false);

  useEffect(()=>{frame.setActive(running);},[running]);

  // ── estilos animados ────────────────────────────────────────────────────────
  const outer=useAnimatedStyle(()=>{
    const sy=1+sq.value*0.5+(hopY.value<-4?0.05:0);const sx=1-sq.value*0.35;
    return {transform:[{translateY:u(hopY.value)},{scaleX:sx},{scaleY:sy}]};
  });
  const sway=useAnimatedStyle(()=>({transform:[{rotate:`${rot.value}deg`}]}));
  const clapStyle=useAnimatedStyle(()=>({transform:[{rotate:`${clap.value}deg`}]}));
  const shadow=useAnimatedStyle(()=>({opacity:0.28*(1+hopY.value/160),transform:[{scaleX:1+hopY.value/260}]}));
  const lookStyle=useAnimatedStyle(()=>({transform:[{translateX:u(lookX.value)},{translateY:u(lookY.value)}]}));
  const lookHalf=useAnimatedStyle(()=>({transform:[{translateX:u(lookX.value*1.2)},{translateY:u(lookY.value*0.4)}]}));
  const blinkDot=useAnimatedStyle(()=>({transform:[{scaleY:Math.max(0.08,1-blink.value*0.92)}]}));
  const blinkWinkDot=useAnimatedStyle(()=>({
    opacity:wink.value>0.6?0:1,
    transform:[{scaleY:Math.min(Math.max(0.08,1-blink.value*0.92),Math.max(0.02,1-wink.value))}],
  }));
  const winkArc=useAnimatedStyle(()=>({opacity:wink.value>0.6?1:0}));
  const lidStyle=useAnimatedStyle(()=>({transform:[{translateY:u(blink.value*9)}]}));
  const browL=useAnimatedStyle(()=>({transform:[{translateY:u(bLy.value)},{rotate:`${bLr.value}deg`}]}));
  const browR=useAnimatedStyle(()=>({transform:[{translateY:u(bRy.value)},{rotate:`${bRr.value}deg`}]}));
  const m=face.mouth;const sk=m.sk??0;
  const lineD=`M${100-m.w} 130Q100 ${130+m.c*1.9} ${100+m.w} ${130+sk}`;
  const lineProps=useAnimatedProps(()=>({opacity:mouthOpen.value<0.08?1:0}));
  const fillProps=useAnimatedProps(()=>({opacity:mouthOpen.value<0.08?0:1,d:mouthGeometry(Math.max(0.08,mouthOpen.value),m.w,m.c,sk).d}),[m.w,m.c,sk]);
  const tongueProps=useAnimatedProps(()=>({opacity:mouthOpen.value*11>2.5?1:0,d:mouthGeometry(Math.max(0.08,mouthOpen.value),m.w,m.c,sk).tongue}),[m.w,m.c,sk]);

  const eye=(cx:number,side:'L'|'R')=>{
    const box={position:'absolute' as const,left:u(cx-16),top:u(106-16),width:u(32),height:u(32)};
    const type=face.eyes==='wink'?(side==='R'?'winkdot':'dot'):face.eyes;
    const art=(children:React.ReactNode)=><Svg width={u(32)} height={u(32)} viewBox="-16 -16 32 32">{children}</Svg>;
    const dot=art(<><Ellipse cx={0} cy={0} rx={6} ry={7.2} fill={OUT}/><Circle cx={2} cy={-2.4} r={2.1} fill="#fff"/></>);
    return <View key={side} pointerEvents="none" style={box}>
      {type==='dot'?<Animated.View style={[StyleSheet.absoluteFill,blinkDot]}><Animated.View style={[StyleSheet.absoluteFill,lookStyle]}>{dot}</Animated.View></Animated.View>:null}
      {type==='winkdot'?<>
        <Animated.View style={[StyleSheet.absoluteFill,blinkWinkDot]}><Animated.View style={[StyleSheet.absoluteFill,lookStyle]}>{dot}</Animated.View></Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill,winkArc]}>{art(<Path d="M-10 3Q0 -10 10 3" stroke={OUT} strokeWidth={4.5} strokeLinecap="round" fill="none"/>)}</Animated.View>
      </>:null}
      {type==='half'?<>
        <View style={StyleSheet.absoluteFill}>{art(<Ellipse cx={0} cy={1} rx={10} ry={8} fill="#fff" stroke={OUT} strokeWidth={3}/>)}</View>
        <Animated.View style={[StyleSheet.absoluteFill,lookHalf]}>{art(<Circle cx={0} cy={2} r={4.4} fill={OUT}/>)}</Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill,lidStyle]}>{art(<>
          <Path d="M-12 -12H12V0C6 -1.5 -6 -1.5 -12 0Z" fill={color}/>
          <Path d="M-12 0C-6 -1.5 6 -1.5 12 0" stroke={OUT} strokeWidth={4} strokeLinecap="round" fill="none"/>
        </>)}</Animated.View>
      </>:null}
      {type==='happy'?art(<Path d="M-10 3Q0 -10 10 3" stroke={OUT} strokeWidth={4.5} strokeLinecap="round" fill="none"/>):null}
      {type==='sleep'?art(<Path d="M-10 -2Q0 8 10 -2" stroke={OUT} strokeWidth={4.5} strokeLinecap="round" fill="none"/>):null}
    </View>;
  };
  const brow=(cx:number,side:'L'|'R')=>{
    const b=face.brow;if(!b)return null;
    const sg=side==='L'?1:-1;const arch=!!b.arch&&side==='R';
    const base=arch?-8:b.ang*sg;
    return <Animated.View key={side} pointerEvents="none" style={[{position:'absolute',left:u(cx-14),top:u(b.cy-8),width:u(28),height:u(16)},side==='L'?browL:browR]}>
      <View style={{flex:1,transform:[{rotate:`${base}deg`}]}}>
        <Svg width={u(28)} height={u(16)} viewBox="-14 -8 28 16">
          <Path d={arch?'M-10 2Q0 -5 10 1':'M-10 0L10 0'} stroke={OUT} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </Svg>
      </View>
    </Animated.View>;
  };

  return <View style={st.slot}>
    <Animated.View pointerEvents="none" style={[st.shadow,shadow]}>
      <Svg width={u(120)} height={u(14)} viewBox="0 0 120 14"><Ellipse cx={60} cy={7} rx={54} ry={5} fill="#000"/></Svg>
    </Animated.View>
    <Animated.View style={[st.fill,{transformOrigin:'50% 82%'},outer]}>
      <Animated.View style={[st.fill,{transformOrigin:'50% 20%'},sway]}>
        {/* badalo (atrás do corpo) */}
        <Animated.View pointerEvents="none" style={[st.fill,{transformOrigin:'50% 76%'},clapStyle]}>
          <Svg width={PING_SIZE} height={PING_SIZE} viewBox="0 0 200 200">
            <Path d="M93 152H107V172H93Z" fill={color} stroke={OUT} strokeWidth={5} strokeLinejoin="round"/>
            <Ellipse cx={100} cy={178} rx={12.5} ry={10.5} fill={color} stroke={OUT} strokeWidth={5}/>
            <Ellipse cx={96} cy={175} rx={3.5} ry={2.5} fill="#fff" opacity={0.5}/>
          </Svg>
        </Animated.View>
        {/* pino, corpo e brilhos */}
        <View pointerEvents="none" style={st.fill}>
          <Svg width={PING_SIZE} height={PING_SIZE} viewBox="0 0 200 200">
            <Circle cx={100} cy={38} r={12} fill={color} stroke={OUT} strokeWidth={5}/>
            <Circle cx={96} cy={35} r={3.5} fill="#fff" opacity={0.55}/>
            <Path d={BODY} fill={color} stroke={OUT} strokeWidth={6} strokeLinejoin="round"/>
            <Path d="M62 104C63 82 72 66 88 57" stroke="#fff" strokeWidth={6} strokeLinecap="round" fill="none" opacity={0.5}/>
            <Path d="M42 152C54 150 66 147 74 143" stroke="#000" strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.08}/>
            {face.cheeks?<><Ellipse cx={60} cy={126} rx={9} ry={5.5} fill="#ff8aa0" opacity={0.8}/><Ellipse cx={140} cy={126} rx={9} ry={5.5} fill="#ff8aa0" opacity={0.8}/></>:null}
          </Svg>
        </View>
        {/* rosto */}
        {eye(75,'L')}{eye(125,'R')}
        {brow(75,'L')}{brow(125,'R')}
        <View pointerEvents="none" style={{position:'absolute',left:u(60),top:u(110),width:u(80),height:u(56)}}>
          <Svg width={u(80)} height={u(56)} viewBox="60 110 80 56">
            <AnimatedPath animatedProps={lineProps} d={lineD} stroke={OUT} strokeWidth={4.5} strokeLinecap="round" fill="none"/>
            <AnimatedPath animatedProps={fillProps} d={mouthGeometry(Math.max(0.08,face.mouth.o),m.w,m.c,sk).d} fill="#2a1414" stroke={OUT} strokeWidth={4} strokeLinejoin="round"/>
            <AnimatedPath animatedProps={tongueProps} d={mouthGeometry(Math.max(0.08,face.mouth.o),m.w,m.c,sk).tongue} fill="#f0707c"/>
          </Svg>
        </View>
        <Extras kind={face.extra} color={color} running={running}/>
      </Animated.View>
    </Animated.View>
  </View>;
});

/** Detalhes que acompanham o rosto (brilhinhos, suor, notinha, vapor, raiva), cada um com seu loop. */
function Extras({kind,color,running}:{kind:Extra;color:string;running:boolean}){
  if(!kind)return null;
  const piece=(key:string,box:[number,number,number,number],kindAnim:'spark'|'drop'|'note'|'steam'|'rage',delay:number,children:React.ReactNode)=>
    <Loop key={key} kind={kindAnim} delay={delay} running={running} box={box}>
      <Svg width={u(box[2])} height={u(box[3])} viewBox={`${box[0]} ${box[1]} ${box[2]} ${box[3]}`}>{children}</Svg>
    </Loop>;
  if(kind==='sparks')return <>{[[152,50,174,38],[156,66,180,60],[154,82,176,84]].map((p,i)=>
    piece(`s${i}`,[Math.min(p[0],p[2])-6,Math.min(p[1],p[3])-6,Math.abs(p[2]-p[0])+12,Math.abs(p[3]-p[1])+12],'spark',i*200,
      <Line x1={p[0]} y1={p[1]} x2={p[2]} y2={p[3]} stroke={color} strokeWidth={6} strokeLinecap="round"/>))}</>;
  if(kind==='drop')return piece('d',[132,54,28,36],'drop',0,
    <Path d="M146 62C140 72 138 78 146 84C154 78 152 72 146 62Z" fill="#8fd3ff" stroke={OUT} strokeWidth={3} strokeLinejoin="round"/>);
  if(kind==='note')return piece('n',[130,32,38,52],'note',0,<>
    <Path d="M150 40V70" stroke={OUT} strokeWidth={4} strokeLinecap="round"/>
    <Ellipse cx={143} cy={72} rx={8} ry={6} fill={color} stroke={OUT} strokeWidth={3.5}/>
    <Path d="M150 40Q162 44 160 56" stroke={OUT} strokeWidth={4} fill="none" strokeLinecap="round"/>
  </>);
  if(kind==='steam')return <>{[[34,40,0],[166,40,350]].map(([x,y,delay])=>
    piece(`v${x}`,[x-22,y-18,44,40],'steam',delay,<>
      <Circle cx={x} cy={y} r={9} fill="#fff" stroke={OUT} strokeWidth={2.5}/>
      <Circle cx={x+9} cy={y-4} r={7} fill="#fff" stroke={OUT} strokeWidth={2.5}/>
      <Circle cx={x-8} cy={y-3} r={6} fill="#fff" stroke={OUT} strokeWidth={2.5}/>
    </>))}</>;
  return piece('r',[144,22,34,62],'rage',0,<>
    {[[150,40,166,30],[154,56,172,52],[150,72,168,76]].map((p,i)=><Line key={i} x1={p[0]} y1={p[1]} x2={p[2]} y2={p[3]} stroke="#ffd3d0" strokeWidth={5} strokeLinecap="round"/>)}
  </>);
}

function Loop({kind,delay,running,box,children}:{kind:'spark'|'drop'|'note'|'steam'|'rage';delay:number;running:boolean;box:[number,number,number,number];children:React.ReactNode}){
  const p=useSharedValue(0.5);
  useEffect(()=>{
    cancelAnimation(p);
    if(!running){p.value=0.5;return;}
    p.value=0;
    if(kind==='drop')p.value=withDelay(delay,withRepeat(withTiming(1,{duration:2400,easing:Easing.in(Easing.quad)}),-1,false));
    else if(kind==='spark')p.value=withDelay(delay,withRepeat(withSequence(withTiming(1,{duration:700,easing:Easing.inOut(Easing.sin)}),withTiming(0,{duration:700,easing:Easing.inOut(Easing.sin)})),-1,false));
    else if(kind==='note')p.value=withRepeat(withTiming(1,{duration:1200,easing:Easing.inOut(Easing.sin)}),-1,true);
    else if(kind==='steam')p.value=withDelay(delay,withRepeat(withTiming(1,{duration:500,easing:Easing.inOut(Easing.sin)}),-1,true));
    else p.value=withRepeat(withTiming(1,{duration:110}),-1,true);
    return()=>cancelAnimation(p);
  },[running,kind,delay]);
  const style=useAnimatedStyle(()=>{
    const v=p.value;
    if(kind==='spark')return {opacity:interpolate(v,[0,1],[0.25,1]),transform:[{scale:interpolate(v,[0,1],[0.8,1.15])}]};
    if(kind==='drop')return {opacity:interpolate(v,[0,0.15,0.85,1],[0,1,1,0]),transform:[{translateY:u(interpolate(v,[0,0.15,1],[-4,0,16]))},{scale:interpolate(v,[0,0.15],[0.7,1],'clamp')}]};
    if(kind==='note')return {transform:[{translateX:u(3*v)},{translateY:u(-6*v)},{rotate:`${-6+14*v}deg`}]};
    if(kind==='steam')return {opacity:interpolate(v,[0,1],[0.4,1]),transform:[{scale:interpolate(v,[0,1],[0.7,1.1])}]};
    return {transform:[{translateX:u(1.5*v)},{translateY:u(-1*v)}]};
  });
  return <Animated.View pointerEvents="none" style={[{position:'absolute',left:u(box[0]),top:u(box[1]),width:u(box[2]),height:u(box[3])},style]}>{children}</Animated.View>;
}

const st=StyleSheet.create({
  slot:{width:PING_SIZE,height:PING_SIZE,overflow:'visible'},
  fill:{position:'absolute',left:0,right:0,top:0,bottom:0},
  shadow:{position:'absolute',left:u(40),top:u(190),width:u(120),height:u(14)},
});
