import React,{forwardRef,useEffect,useImperativeHandle} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import Animated,{Easing,cancelAnimation,interpolate,useAnimatedProps,useAnimatedStyle,useFrameCallback,useSharedValue,withDelay,withRepeat,withSequence,withTiming} from 'react-native-reanimated';
import Svg,{ClipPath,Circle,Defs,Ellipse,G,Line,Path} from 'react-native-svg';
import {fatigueAt} from '../ping-fatigue';
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
const clamp01=(v:number)=>{'worklet';return Math.max(0,Math.min(1,v));};
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
  /** Cansaço atual (0–1,3) logo depois de um toque; a partir daí ele desce sozinho. */
  setFatigue:(level:number)=>void;
  yawn:()=>void;
  /** Susto de quem acordou do cochilo. */
  startle:()=>void;
  dance:(seconds:number)=>void;
  peek:(seconds:number)=>void;
  pout:(seconds:number)=>void;
  /** Segurando o dedo: infla e treme. */
  hold:(on:boolean)=>void;
  /** DING grande ao soltar depois de segurar. */
  bigRing:()=>void;
  /** Os olhos seguem um ponto (−1…1 em cada eixo, relativo ao Ping). */
  look:(nx:number,ny:number)=>void;
};
type Props={personality:NotificationPersonality;moment:FaceMoment;sleeping:boolean;/** Loops ligados (aba na tela e animações ativas). */running:boolean;/** Cochilando por falta de toque. */napping?:boolean;/** Muitas tarefas atrasadas: nuvem de chuva ao lado. */rain?:boolean};

const AnimatedPath=Animated.createAnimatedComponent(Path);

/** Caminho da boca (aberta ou fechada) a partir do quanto está aberta, do cansaço (`dr`) e do bocejo (`yw`). Worklet: roda na thread de UI. */
function mouthGeometry(open:number,w0:number,c0:number,sk:number,dr:number,yw:number){
  'worklet';
  const cx=100,cy=130;
  const w=w0*(1-0.12*dr)*(1+0.3*yw);const c=c0*(1-dr)-dr*5;
  const x1=cx-w,x2=cx+w,y1=cy,y2=cy+sk;
  const depth=open*11,top=cy+c*0.9,low=top+depth*2.1;
  const d=`M${x1} ${y1}Q${cx} ${top} ${x2} ${y2}Q${cx} ${low} ${x1} ${y1}Z`;
  const line=`M${x1} ${y1}Q${cx} ${cy+c*1.9} ${x2} ${y2}`;
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
  return {d,tongue,line};
}
/** Pálpebra (corpo da cor do sino + traço) deslocada `off` para baixo; sempre alta o bastante para cobrir o olho. */
function lidGeometry(off:number){
  'worklet';
  const body=`M-12 ${-36+off}H12V${off}C6 ${off-1.5} -6 ${off-1.5} -12 ${off}Z`;
  const line=`M-12 ${off}C-6 ${off-1.5} 6 ${off-1.5} 12 ${off}`;
  return {body,line};
}

export const PingFace=forwardRef<PingFaceHandle,Props>(function PingFace({personality,moment,sleeping,running,napping=false,rain=false},ref){
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
  // cansaço, cochilo, amuo, inflar, dança, espiar, bocejo (suavizados na thread de UI)
  const droop=useSharedValue(0);const dizzy=useSharedValue(0);const nap=useSharedValue(0);const pout=useSharedValue(0);const holdAmt=useSharedValue(0);
  const danceUntil=useSharedValue(0);const nextHop=useSharedValue(0);const peekUntil=useSharedValue(0);const poutUntil=useSharedValue(0);
  const yawnP=useSharedValue(-1);const yawnAmt=useSharedValue(0);
  const eyeDroop=useSharedValue(0);const eyeSleepy=useSharedValue(0);const mouthDroop=useSharedValue(0);const lidOff=useSharedValue(0);
  // ── entradas (só a thread de JS escreve) ────────────────────────────────────
  const inPers=useSharedValue(persIdx);const inSleep=useSharedValue(sleeping?1:0);const inWink=useSharedValue(face.eyes==='wink'?1:0);
  const inBrows=useSharedValue(face.brow?1:0);const inMouthO=useSharedValue(face.mouth.o);
  const ringKey=useSharedValue(0);const hopKey=useSharedValue(0);const hopPower=useSharedValue(1);const talkKey=useSharedValue(0);const talkDur=useSharedValue(0);
  const seenRing=useSharedValue(0);const seenHop=useSharedValue(0);const seenTalk=useSharedValue(0);
  const inFat=useSharedValue(0);const inFatAt=useSharedValue(0);const inNap=useSharedValue(0);const inHold=useSharedValue(0);
  const inLookX=useSharedValue(0);const inLookY=useSharedValue(0);const inLookAt=useSharedValue(0);
  const yawnKey=useSharedValue(0);const startleKey=useSharedValue(0);const danceKey=useSharedValue(0);const danceDur=useSharedValue(0);
  const peekKey=useSharedValue(0);const peekDur=useSharedValue(0);const poutKey=useSharedValue(0);const poutDur=useSharedValue(0);const bigKey=useSharedValue(0);
  const seenYawn=useSharedValue(0);const seenStartle=useSharedValue(0);const seenDance=useSharedValue(0);const seenPeek=useSharedValue(0);const seenPout=useSharedValue(0);const seenBig=useSharedValue(0);

  useEffect(()=>{
    inPers.value=persIdx;inSleep.value=sleeping?1:0;inWink.value=face.eyes==='wink'?1:0;
    inBrows.value=face.brow?1:0;inMouthO.value=face.mouth.o;
  },[persIdx,sleeping,face]);
  useEffect(()=>{inNap.value=napping?1:0;},[napping]);

  useImperativeHandle(ref,()=>({
    ring:()=>{ringKey.value+=1;},
    hop:(power:number)=>{hopPower.value=power;hopKey.value+=1;},
    talk:(seconds:number)=>{talkDur.value=seconds;talkKey.value+=1;},
    setFatigue:(level:number)=>{inFat.value=level;inFatAt.value=Date.now()/1000;},
    yawn:()=>{yawnKey.value+=1;},
    startle:()=>{startleKey.value+=1;},
    dance:(seconds:number)=>{danceDur.value=seconds;danceKey.value+=1;},
    peek:(seconds:number)=>{peekDur.value=seconds;peekKey.value+=1;},
    pout:(seconds:number)=>{poutDur.value=seconds;poutKey.value+=1;},
    hold:(on:boolean)=>{inHold.value=on?1:0;},
    bigRing:()=>{bigKey.value+=1;},
    look:(nx:number,ny:number)=>{inLookX.value=nx;inLookY.value=ny;inLookAt.value=Date.now()/1000;},
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
    if(yawnKey.value!==seenYawn.value){seenYawn.value=yawnKey.value;yawnP.value=0;}
    if(startleKey.value!==seenStartle.value){seenStartle.value=startleKey.value;hopV.value=-300;sqV.value=-5;rotV.value+=(Math.random()<0.5?-1:1)*420;evKind.value=2;evEnd.value=t+0.9;evSide.value=0;}
    if(danceKey.value!==seenDance.value){seenDance.value=danceKey.value;danceUntil.value=t+danceDur.value;nextHop.value=t+0.3;evKind.value=2;evEnd.value=t+2;}
    if(peekKey.value!==seenPeek.value){seenPeek.value=peekKey.value;peekUntil.value=t+peekDur.value;evKind.value=2;evEnd.value=t+0.6;}
    if(poutKey.value!==seenPout.value){seenPout.value=poutKey.value;poutUntil.value=t+poutDur.value;}
    if(bigKey.value!==seenBig.value){seenBig.value=bigKey.value;rotV.value+=(Math.random()<0.5?-1:1)*520;hopV.value=-330;sqV.value=-5;sq.value=-0.08;}
    // estados suavizados: cansaço (cai sozinho), cochilo, amuo e inflar
    const nowS=Date.now()/1000;
    const fat=fatigueAt(inFat.value,inFatAt.value,nowS);
    droop.value+=(clamp01((fat-0.3)/0.5)-droop.value)*Math.min(1,dt*4);
    dizzy.value+=(clamp01((fat-0.95)/0.2)-dizzy.value)*Math.min(1,dt*5);
    nap.value+=((inNap.value===1&&!sleepy?1:0)-nap.value)*Math.min(1,dt*2.5);
    pout.value+=((t<poutUntil.value?1:0)-pout.value)*Math.min(1,dt*4);
    holdAmt.value=inHold.value===1?Math.min(1,holdAmt.value+dt*1.6):Math.max(0,holdAmt.value-dt*6);
    if(yawnP.value>=0){yawnP.value+=dt;if(yawnP.value>1.7)yawnP.value=-1;}
    yawnAmt.value=yawnP.value>=0?Math.sin(Math.PI*yawnP.value/1.7):0;
    eyeDroop.value=Math.max(droop.value,pout.value*0.6);
    eyeSleepy.value=(droop.value>0.55||nap.value>0.5||pout.value>0.5)?1:0;
    mouthDroop.value=Math.max(droop.value,pout.value*0.9);
    if(t<danceUntil.value&&hopY.value>-1&&t>nextHop.value){hopV.value=-170;sqV.value=2;nextHop.value=t+0.34;}

    // corpo: mola em direção ao repouso de cada personalidade
    let target=0;
    if(sleepy)target=Math.sin(t*1.0)*1.5+3;
    else if(pers===0)target=Math.sin(t*1.1)*3;
    else if(pers===1)target=-5+Math.sin(t*0.8)*1.2;
    else if(t>jitterAt.value){jitterAt.value=t+2.5+Math.random()*2.5;rotV.value+=(Math.random()<0.5?-1:1)*120;}
    target+=nap.value*7-pout.value*9+(t<peekUntil.value?Math.sin(t*4.5)*4:0)+(t<danceUntil.value?Math.sin(t*15)*10:0)+droop.value*7+Math.sin(t*2.4)*7*dizzy.value-yawnAmt.value*6;
    const rotAcc=-60*(rot.value-target)-6.5*rotV.value;
    rotV.value+=rotAcc*dt;rot.value+=rotV.value*dt;
    // badalo: pêndulo em relação ao corpo (reage à aceleração do corpo, então atrasa)
    const clapAcc=-95*clap.value-3.4*clapV.value-rotAcc*0.95+Math.sin(t*7)*55*dizzy.value;
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
        blinkPhase.value+=dt/(0.13*(1+droop.value*1.3));const p=blinkPhase.value;
        blink.value=p<1?p:Math.max(0,2-p);
        if(p>=2){
          blinkPhase.value=-1;blink.value=0;
          if(dbl.value===0&&Math.random()<0.22){dbl.value=1;blinkAt.value=t+0.16;}
          else{dbl.value=0;blinkAt.value=t+(2.2+Math.random()*3.2)*(1-droop.value*0.5);}
        }
      }
    }else blink.value=0;
    if(!sleepy)blink.value=Math.max(blink.value,yawnAmt.value*0.95,nap.value,holdAmt.value*0.55);
    // olhar (o debochado costuma olhar de lado)
    if(t>lookAt.value){
      lookAt.value=t+1.4+Math.random()*2.6;
      const side=pers===1&&Math.random()<0.6;
      lookTX.value=side?(Math.random()<0.5?4.5:-4.5):(Math.random()*6-3);
      lookTY.value=Math.random()*3-1.2;
    }
    if(nowS-inLookAt.value<1.8){lookTX.value=inLookX.value*4.5;lookTY.value=inLookY.value*3.2;}
    if(t<peekUntil.value){lookTY.value=3.2;lookTX.value=Math.sin(t*4.5)*4.5;}
    if(t<poutUntil.value){const away=poutUntil.value-t>1.1;lookTX.value=away?-4.5:0;lookTY.value=away?0.5:0;}
    if(nap.value>0.5){lookTX.value=0;lookTY.value=1;}
    lidOff.value=blink.value*9+eyeDroop.value*5;
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
        ty+=Math.sin(t*1.7+i*2)*0.5+droop.value*3+pout.value*2.5+Math.sin(t*9)*2*dizzy.value-yawnAmt.value*4;
        tr+=droop.value*-9*sg+pout.value*9*sg;
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
    const base=inMouthO.value*(1-droop.value);
    if(yawnP.value>=0)mouthOpen.value=1.5*Math.pow(yawnAmt.value,0.8);
    else if(nap.value>0.5)mouthOpen.value=0.04+0.05*Math.sin(t*1.5);
    else if(t<danceUntil.value)mouthOpen.value=0.9+0.3*Math.sin(t*15);
    else if(talking){
      const syl=Math.abs(Math.sin(t*9+Math.sin(t*3.1)*1.5));
      mouthOpen.value=base>0?base*(0.55+0.45*syl):0.12+0.3*syl;
    }else if(dizzy.value>0.5)mouthOpen.value=0.3+0.12*Math.sin(t*5);
    else mouthOpen.value=base;
  },false);

  useEffect(()=>{frame.setActive(running);},[running]);

  // ── estilos animados ────────────────────────────────────────────────────────
  const outer=useAnimatedStyle(()=>{
    const hs=1+0.2*holdAmt.value;
    const sy=(1+sq.value*0.5+(hopY.value<-4?0.05:0)-0.05*droop.value+Math.sin(T.value*1.6)*0.012*droop.value+Math.sin(T.value*1.5)*0.025*nap.value)*hs;const sx=(1-sq.value*0.35)*hs;
    return {transform:[{translateY:u(hopY.value)},{scaleX:sx},{scaleY:sy}]};
  });
  const sway=useAnimatedStyle(()=>({transform:[{rotate:`${rot.value+Math.sin(T.value*55)*2.5*holdAmt.value}deg`}]}));
  const clapStyle=useAnimatedStyle(()=>({transform:[{rotate:`${clap.value}deg`}]}));
  const lookStyle=useAnimatedStyle(()=>({transform:[{translateX:u(lookX.value)},{translateY:u(lookY.value)}]}));
  const lookHalf=useAnimatedStyle(()=>({transform:[{translateX:u(lookX.value*1.2)},{translateY:u(lookY.value*0.4)}]}));
  const blinkDot=useAnimatedStyle(()=>({transform:[{scaleY:Math.max(0.08,1-blink.value*0.92)}]}));
  const blinkWinkDot=useAnimatedStyle(()=>({
    opacity:wink.value>0.6?0:1,
    transform:[{scaleY:Math.min(Math.max(0.08,1-blink.value*0.92),Math.max(0.02,1-wink.value))}],
  }));
  const winkArc=useAnimatedStyle(()=>({opacity:wink.value>0.6?1:0}));
  const lidHalfProps=useAnimatedProps(()=>({d:lidGeometry(lidOff.value).body}));
  const lidHalfLine=useAnimatedProps(()=>({d:lidGeometry(lidOff.value).line}));
  const lidDotProps=useAnimatedProps(()=>({d:lidGeometry(-9+11*eyeDroop.value).body}));
  const lidDotLine=useAnimatedProps(()=>({d:lidGeometry(-9+11*eyeDroop.value).line}));
  const hapShow=useAnimatedStyle(()=>({opacity:eyeSleepy.value===1?0:1}));
  const altShow=useAnimatedStyle(()=>({opacity:eyeSleepy.value===1?1:0}));
  const eyeVis=useAnimatedStyle(()=>({opacity:dizzy.value>0.5?0:1}));
  const spiralL=useAnimatedStyle(()=>({opacity:dizzy.value>0.5?1:0,transform:[{rotate:`${(T.value*420)%360}deg`}]}));
  const spiralR=useAnimatedStyle(()=>({opacity:dizzy.value>0.5?1:0,transform:[{rotate:`${(-T.value*420)%360}deg`}]}));
  const sweat=useAnimatedStyle(()=>({opacity:droop.value>0.2?Math.min(1,droop.value):0}));
  const starStyle=(i:number)=>useAnimatedStyle(()=>{
    const a=T.value*3.2+i*2.094;
    return {opacity:dizzy.value>0.3?1:0,transform:[{translateX:u(54*Math.cos(a))},{translateY:u(10*Math.sin(a))}]};
  });
  const star0=starStyle(0);const star1=starStyle(1);const star2=starStyle(2);
  const browL=useAnimatedStyle(()=>({transform:[{translateY:u(bLy.value)},{rotate:`${bLr.value}deg`}]}));
  const browR=useAnimatedStyle(()=>({transform:[{translateY:u(bRy.value)},{rotate:`${bRr.value}deg`}]}));
  const m=face.mouth;const sk=m.sk??0;
  const geo=()=>{'worklet';return mouthGeometry(Math.max(0.08,mouthOpen.value),m.w,m.c,sk,mouthDroop.value,yawnAmt.value);};
  const lineProps=useAnimatedProps(()=>({opacity:mouthOpen.value<0.08?1:0,d:geo().line}),[m.w,m.c,sk]);
  const fillProps=useAnimatedProps(()=>({opacity:mouthOpen.value<0.08?0:1,d:geo().d}),[m.w,m.c,sk]);
  const tongueProps=useAnimatedProps(()=>({opacity:mouthOpen.value*11>2.5?1:0,d:geo().tongue}),[m.w,m.c,sk]);

  const eye=(cx:number,side:'L'|'R')=>{
    const box={position:'absolute' as const,left:u(cx-16),top:u(106-16),width:u(32),height:u(32)};
    const type=face.eyes==='wink'?(side==='R'?'winkdot':'dot'):face.eyes;
    const art=(children:React.ReactNode)=><Svg width={u(32)} height={u(32)} viewBox="-16 -16 32 32">{children}</Svg>;
    const dot=art(<><Ellipse cx={0} cy={0} rx={6} ry={7.2} fill={OUT}/><Circle cx={2} cy={-2.4} r={2.1} fill="#fff"/></>);
    // pálpebra recortada ao formato do olho: nunca cobre o brilho do corpo nem deixa o olho aparecer por cima
    const lidDot=art(<><Defs><ClipPath id="clipD"><Ellipse cx={0} cy={0} rx={10.5} ry={10.5}/></ClipPath></Defs><G clipPath="url(#clipD)">
      <AnimatedPath animatedProps={lidDotProps} d={lidGeometry(-9).body} fill={color}/>
      <AnimatedPath animatedProps={lidDotLine} d={lidGeometry(-9).line} stroke={OUT} strokeWidth={3.5} strokeLinecap="round" fill="none"/>
    </G></>);
    const lidHalf=art(<><Defs><ClipPath id="clipH"><Ellipse cx={0} cy={1} rx={12.2} ry={10.6}/></ClipPath></Defs><G clipPath="url(#clipH)">
      <AnimatedPath animatedProps={lidHalfProps} d={lidGeometry(0).body} fill={color}/>
      <AnimatedPath animatedProps={lidHalfLine} d={lidGeometry(0).line} stroke={OUT} strokeWidth={4} strokeLinecap="round" fill="none"/>
    </G></>);
    const spiral=art(<><Circle cx={0} cy={0} r={9.5} fill="#fff" stroke={OUT} strokeWidth={3}/>
      <Path d="M0 0C1.5-1.5 4-1 4 1.5C4 4.5-.5 6-3.5 3.5C-6.5.5-5-5 0-6" stroke={OUT} strokeWidth={2.4} fill="none" strokeLinecap="round"/></>);
    return <View key={side} pointerEvents="none" style={box}>
      <Animated.View style={[StyleSheet.absoluteFill,eyeVis]}>
        {type==='dot'?<Animated.View style={[StyleSheet.absoluteFill,blinkDot]}>
          <Animated.View style={[StyleSheet.absoluteFill,lookStyle]}>{dot}</Animated.View>
          <View style={StyleSheet.absoluteFill}>{lidDot}</View>
        </Animated.View>:null}
        {type==='winkdot'?<>
          <Animated.View style={[StyleSheet.absoluteFill,blinkWinkDot]}>
            <Animated.View style={[StyleSheet.absoluteFill,lookStyle]}>{dot}</Animated.View>
            <View style={StyleSheet.absoluteFill}>{lidDot}</View>
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill,winkArc]}>{art(<Path d="M-10 3Q0 -10 10 3" stroke={OUT} strokeWidth={4.5} strokeLinecap="round" fill="none"/>)}</Animated.View>
        </>:null}
        {type==='half'?<>
          <View style={StyleSheet.absoluteFill}>{art(<Ellipse cx={0} cy={1} rx={10} ry={8} fill="#fff" stroke={OUT} strokeWidth={3}/>)}</View>
          <Animated.View style={[StyleSheet.absoluteFill,lookHalf]}>{art(<Circle cx={0} cy={2} r={4.4} fill={OUT}/>)}</Animated.View>
          <View style={StyleSheet.absoluteFill}>{lidHalf}</View>
        </>:null}
        {type==='happy'?<>
          <Animated.View style={[StyleSheet.absoluteFill,hapShow]}>{art(<Path d="M-10 3Q0 -10 10 3" stroke={OUT} strokeWidth={4.5} strokeLinecap="round" fill="none"/>)}</Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill,altShow]}>{art(<Path d="M-10 -2Q0 8 10 -2" stroke={OUT} strokeWidth={4.5} strokeLinecap="round" fill="none"/>)}</Animated.View>
        </>:null}
        {type==='sleep'?art(<Path d="M-10 -2Q0 8 10 -2" stroke={OUT} strokeWidth={4.5} strokeLinecap="round" fill="none"/>):null}
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill,side==='L'?spiralL:spiralR]}>{spiral}</Animated.View>
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
            {face.cheeks?<><Ellipse cx={60} cy={126} rx={9} ry={5.5} fill="#ff8aa0" opacity={0.8}/><Ellipse cx={140} cy={126} rx={9} ry={5.5} fill="#ff8aa0" opacity={0.8}/></>:null}
          </Svg>
        </View>
        {/* rosto */}
        {eye(75,'L')}{eye(125,'R')}
        {brow(75,'L')}{brow(125,'R')}
        <View pointerEvents="none" style={{position:'absolute',left:u(60),top:u(110),width:u(80),height:u(56)}}>
          <Svg width={u(80)} height={u(56)} viewBox="60 110 80 56">
            <AnimatedPath animatedProps={lineProps} d={mouthGeometry(0.08,m.w,m.c,sk,0,0).line} stroke={OUT} strokeWidth={4.5} strokeLinecap="round" fill="none"/>
            <AnimatedPath animatedProps={fillProps} d={mouthGeometry(Math.max(0.08,face.mouth.o),m.w,m.c,sk,0,0).d} fill="#2a1414" stroke={OUT} strokeWidth={4} strokeLinejoin="round"/>
            <AnimatedPath animatedProps={tongueProps} d={mouthGeometry(Math.max(0.08,face.mouth.o),m.w,m.c,sk,0,0).tongue} fill="#f0707c"/>
          </Svg>
        </View>
        <Extras kind={face.extra} color={color} running={running}/>
        <Animated.View pointerEvents="none" style={[st.fill,sweat]}>
          <Svg width={PING_SIZE} height={PING_SIZE} viewBox="0 0 200 200"><Path d="M52 64C46 74 44 80 52 86C60 80 58 74 52 64Z" fill="#8fd3ff" stroke={OUT} strokeWidth={3} strokeLinejoin="round"/></Svg>
        </Animated.View>
        {[star0,star1,star2].map((sty,i)=><Animated.View key={i} pointerEvents="none" style={[{position:'absolute',left:u(92),top:u(26),width:u(16),height:u(16),alignItems:'center',justifyContent:'center'},sty]}>
          <Text style={{fontSize:u(17),color:'#ffd23f',includeFontPadding:false}}>✦</Text>
        </Animated.View>)}
        {rain?<RainCloud running={running}/>:null}
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

function Loop({kind,delay,running,box,children}:{kind:'spark'|'drop'|'note'|'steam'|'rage'|'rain';delay:number;running:boolean;box:[number,number,number,number];children:React.ReactNode}){
  const p=useSharedValue(0.5);
  useEffect(()=>{
    cancelAnimation(p);
    if(!running){p.value=0.5;return;}
    p.value=0;
    if(kind==='drop')p.value=withDelay(delay,withRepeat(withTiming(1,{duration:2400,easing:Easing.in(Easing.quad)}),-1,false));
    else if(kind==='spark')p.value=withDelay(delay,withRepeat(withSequence(withTiming(1,{duration:700,easing:Easing.inOut(Easing.sin)}),withTiming(0,{duration:700,easing:Easing.inOut(Easing.sin)})),-1,false));
    else if(kind==='rain')p.value=withDelay(delay,withRepeat(withTiming(1,{duration:900,easing:Easing.linear}),-1,false));
    else if(kind==='note')p.value=withRepeat(withTiming(1,{duration:1200,easing:Easing.inOut(Easing.sin)}),-1,true);
    else if(kind==='steam')p.value=withDelay(delay,withRepeat(withTiming(1,{duration:500,easing:Easing.inOut(Easing.sin)}),-1,true));
    else p.value=withRepeat(withTiming(1,{duration:110}),-1,true);
    return()=>cancelAnimation(p);
  },[running,kind,delay]);
  const style=useAnimatedStyle(()=>{
    const v=p.value;
    if(kind==='spark')return {opacity:interpolate(v,[0,1],[0.25,1]),transform:[{scale:interpolate(v,[0,1],[0.8,1.15])}]};
    if(kind==='drop')return {opacity:interpolate(v,[0,0.15,0.85,1],[0,1,1,0]),transform:[{translateY:u(interpolate(v,[0,0.15,1],[-4,0,16]))},{scale:interpolate(v,[0,0.15],[0.7,1],'clamp')}]};
    if(kind==='rain')return {opacity:interpolate(v,[0,0.25,1],[0,1,0]),transform:[{translateY:u(interpolate(v,[0,1],[-3,18]))}]};
    if(kind==='note')return {transform:[{translateX:u(3*v)},{translateY:u(-6*v)},{rotate:`${-6+14*v}deg`}]};
    if(kind==='steam')return {opacity:interpolate(v,[0,1],[0.4,1]),transform:[{scale:interpolate(v,[0,1],[0.7,1.1])}]};
    return {transform:[{translateX:u(1.5*v)},{translateY:u(-1*v)}]};
  });
  return <Animated.View pointerEvents="none" style={[{position:'absolute',left:u(box[0]),top:u(box[1]),width:u(box[2]),height:u(box[3])},style]}>{children}</Animated.View>;
}

/** Nuvem de chuva ao lado do Ping: muitas tarefas atrasadas. */
function RainCloud({running}:{running:boolean}){
  return <>
    <View pointerEvents="none" style={st.fill}>
      <Svg width={PING_SIZE} height={PING_SIZE} viewBox="0 0 200 200">
        <Path d="M20 40C11 40 10 29 19 27C19 16 35 13 41 21C47 13 64 17 62 29C71 29 71 40 62 40Z" fill="#8391a8" stroke={OUT} strokeWidth={3} strokeLinejoin="round"/>
      </Svg>
    </View>
    {[0,1,2].map(i=><Loop key={i} kind="rain" delay={i*300} running={running} box={[22+i*14,44,12,14]}>
      <Svg width={u(12)} height={u(14)} viewBox={`${22+i*14} 44 12 14`}><Path d={`M${28+i*14} 47l-2 7`} stroke="#8fd3ff" strokeWidth={3} strokeLinecap="round"/></Svg>
    </Loop>)}
  </>;
}

const st=StyleSheet.create({
  slot:{width:PING_SIZE,height:PING_SIZE,overflow:'visible'},
  fill:{position:'absolute',left:0,right:0,top:0,bottom:0},
});
