import React from 'react';
import Svg,{Rect,Circle,Ellipse,Path,G,Line,Polygon,Text as SvgText} from 'react-native-svg';
import type {Appearance} from '../appearance';

/** Desenho do quarto em unidades fixas: 340 x 260, chão a partir de y=150. Tudo escala com a largura da tela. */
export const ROOM_W=340,ROOM_H=600,FLOOR_Y=400,FEET_Y=468;
/** As peças desenhadas para o quarto baixo (janela, móveis) descem OFF unidades no quarto alto. */
export const OFF=250;
export type Box=[x:number,y:number,w:number,h:number];
/** Estado ao vivo que alguns itens usam no desenho (ligado, hora do relógio, quadro da TV). */
export type ArtState={on?:boolean;now?:Date;frame?:number};

/** Paredes, chão e cortinas por tema: o quarto acompanha o app, os móveis têm cor própria. */
export const ROOM_PALETTE:Record<Appearance,{wall:string;stripe:string;floor:string;plank:string;base:string;curtain:string;curtainDark:string}>={
  dark:{wall:'#2B3427',stripe:'#323C2D',floor:'#5E4838',plank:'#4D3B2D',base:'#3A2E24',curtain:'#8C6FB3',curtainDark:'#6E5492'},
  softLight:{wall:'#F4ECD9',stripe:'#EBDFC5',floor:'#CDA67E',plank:'#B98F67',base:'#A07A55',curtain:'#E8956F',curtainDark:'#CF7A55'},
  rose:{wall:'#F9DFE8',stripe:'#F2CFDC',floor:'#D9A88F',plank:'#C5937B',base:'#AF7D67',curtain:'#C9628E',curtainDark:'#A84B73'},
  ocean:{wall:'#1E3346',stripe:'#243B50',floor:'#6D5646',plank:'#5B4739',base:'#46372C',curtain:'#3E8BB8',curtainDark:'#2E6E96'},
};
export type DayPart='day'|'golden'|'night';
export function dayPart(hour=new Date().getHours()):DayPart{
  if(hour>=19||hour<6)return 'night';
  return hour>=17?'golden':'day';
}
const SKY:Record<DayPart,string>={day:'#8ED1FC',golden:'#FFB98A',night:'#1E2A55'};
export const WINDOW:Box=[132,24+OFF,76,80];

/** Teto, parede, chão, rodapé e o céu da janela (sem moldura: a moldura vai por cima das nuvens). */
export function RoomBackground({look,part}:{look:typeof ROOM_PALETTE['dark'];part:DayPart}){
  const stripes=Array.from({length:17},(_,i)=>i*20+6);
  const rows=[400,420,444,472,504,540,578,600];
  return <>
    <Rect x={0} y={0} width={ROOM_W} height={FLOOR_Y} fill={look.wall}/>
    {stripes.map(x=><Rect key={x} x={x} y={36} width={8} height={FLOOR_Y-36} fill={look.stripe}/>)}
    <Rect x={0} y={0} width={ROOM_W} height={36} fill={look.stripe}/>
    <Rect x={0} y={32} width={ROOM_W} height={6} fill={look.base}/>
    <Rect x={0} y={FLOOR_Y} width={ROOM_W} height={ROOM_H-FLOOR_Y} fill={look.floor}/>
    {rows.slice(1).map((y,i)=><G key={y}>
      <Line x1={0} y1={y} x2={ROOM_W} y2={y} stroke={look.plank} strokeWidth={2}/>
      {[40,120,200,280].map(x=><Line key={x} x1={x+(i%2)*40} y1={rows[i]} x2={x+(i%2)*40} y2={y} stroke={look.plank} strokeWidth={2}/>)}
    </G>)}
    <Rect x={0} y={FLOOR_Y-5} width={ROOM_W} height={8} fill={look.base}/>
    <G transform={`translate(0 ${OFF})`}>
      <Rect x={136} y={28} width={68} height={72} fill={SKY[part]}/>
      {part==='day'?<Circle cx={190} cy={44} r={9} fill="#FFE066"/>:null}
      {part==='golden'?<><Circle cx={168} cy={84} r={13} fill="#FF8A4C"/><Rect x={136} y={88} width={68} height={12} fill="#F28F6B"/></>:null}
      {part==='night'?<><Circle cx={188} cy={44} r={9} fill="#FFF3B0"/><Circle cx={192} cy={41} r={8} fill={SKY.night}/></>:null}
      <Path d="M136 100 Q150 86 164 96 Q178 84 204 98 L204 100 Z" fill={part==='night'?'#2C3B6E':'#7BC67B'}/>
      {part==='day'?<Polygon points="136,104 204,104 280,350 60,350" fill="#FFF6C8" opacity={0.12}/>:null}
      {part==='golden'?<Polygon points="136,104 204,104 300,350 80,350" fill="#FFC48A" opacity={0.13}/>:null}
    </G>
  </>;
}
/** Moldura, peitoril e cortinas da janela. */
export function WindowFrame({look}:{look:typeof ROOM_PALETTE['dark']}){
  const [x,y,w,h]=WINDOW;
  return <>
    <Rect x={x} y={y} width={w} height={h} rx={3} fill="none" stroke="#F4EEDC" strokeWidth={6}/>
    <Line x1={x+w/2} y1={y} x2={x+w/2} y2={y+h} stroke="#F4EEDC" strokeWidth={4}/>
    <Line x1={x} y1={y+h/2} x2={x+w} y2={y+h/2} stroke="#F4EEDC" strokeWidth={4}/>
    <Rect x={x-8} y={y+h-2} width={w+16} height={7} rx={2} fill="#E3D6B8"/>
    <Rect x={x-14} y={y-10} width={w+28} height={5} rx={2.5} fill={look.base}/>
    <Path d={`M${x-12} ${y-6} Q${x-2} ${y+30} ${x-10} ${y+h+6} L${x-18} ${y+h+6} Q${x-24} ${y+30} ${x-18} ${y-6} Z`} fill={look.curtain}/>
    <Path d={`M${x-12} ${y-6} Q${x-6} ${y+30} ${x-12} ${y+h+6}`} stroke={look.curtainDark} strokeWidth={2} fill="none"/>
    <Path d={`M${x+w+12} ${y-6} Q${x+w+2} ${y+30} ${x+w+10} ${y+h+6} L${x+w+18} ${y+h+6} Q${x+w+24} ${y+30} ${x+w+18} ${y-6} Z`} fill={look.curtain}/>
    <Path d={`M${x+w+12} ${y-6} Q${x+w+6} ${y+30} ${x+w+12} ${y+h+6}`} stroke={look.curtainDark} strokeWidth={2} fill="none"/>
  </>;
}
export function Cloud({w=34}:{w?:number}){
  return <Svg width={w} height={w*0.5} viewBox="0 0 40 20"><Path d="M8 18 Q0 18 2 12 Q3 6 10 8 Q12 1 20 2 Q28 2 29 9 Q38 8 38 14 Q38 18 32 18 Z" fill="#FFFFFF" opacity={0.92}/></Svg>;
}

const LIGHTS:[number,number][]=Array.from({length:15},(_,i)=>{const t=i/14;const x=6+t*328;const local=(t<0.5?t*2:(t-0.5)*2);const y=42+(1-Math.pow(2*local-1,2))*26+(t<0.5?0:0);return [x,y];});
const BULB=['#FF5C7A','#FFD166','#7ED3C6','#9B7BEA','#7BC67B'];
function Table(){
  return <G>
    <Ellipse cx={89} cy={201} rx={30} ry={4} fill="#000" opacity={0.18}/>
    <Rect x={66} y={172} width={5} height={28} fill="#7F5839"/><Rect x={107} y={172} width={5} height={28} fill="#7F5839"/>
    <Rect x={64} y={188} width={50} height={4} rx={1} fill="#8E6440"/>
    <Rect x={60} y={165} width={58} height={8} rx={3} fill="#B07A4C"/>
    <Rect x={60} y={165} width={58} height={3} rx={1.5} fill="#C99363"/>
  </G>;
}
/** Arte de cada item, desenhada nas coordenadas do quarto, e o recorte (`box`) onde ela mora. */
export type ItemArt={box:Box;dy?:number;draw:(st:ArtState)=>React.ReactElement;/** Luzes que piscam em dois grupos (luzinhas). */glow?:(group:0|1)=>React.ReactElement};
export const ITEM_ART:Record<string,ItemArt>={
  planta:{dy:OFF,box:[2,90,64,104],draw:()=><G>
    <Ellipse cx={32} cy={192} rx={22} ry={4} fill="#000" opacity={0.18}/>
    <Path d="M30 158 C8 146 4 118 16 104 C26 120 32 138 30 158Z" fill="#2E8B57"/>
    <Path d="M33 158 C40 132 56 120 62 104 C66 128 52 150 33 158Z" fill="#4CAF6A"/>
    <Path d="M31 158 C26 132 30 110 40 94 C46 116 40 140 31 158Z" fill="#7BD389"/>
    <Path d="M16 104 C24 122 29 140 30 156 M62 104 C54 126 44 146 34 156 M40 94 C38 116 34 138 32 156" stroke="#1F6B42" strokeWidth={1.4} fill="none"/>
    <Path d="M14 158 L50 158 L45 190 L19 190 Z" fill="#D9774B"/>
    <Rect x={11} y={154} width={42} height={8} rx={3} fill="#C2613A"/>
    <Path d="M20 172 L44 172" stroke="#E89A72" strokeWidth={2}/>
  </G>},
  cacto:{dy:OFF,box:[8,96,52,98],draw:()=><G>
    <Ellipse cx={32} cy={192} rx={18} ry={3.5} fill="#000" opacity={0.18}/>
    <Rect x={24} y={112} width={16} height={58} rx={8} fill="#5DBB63"/>
    <Path d="M24 146 L16 146 Q12 146 12 140 L12 128 Q12 124 16 124 Q20 124 20 128 L20 138 L24 138Z" fill="#4FA855"/>
    <Path d="M40 136 L46 136 Q50 136 50 130 L50 120 Q50 116 46 116 Q42 116 42 120 L42 128 L40 128Z" fill="#4FA855"/>
    <Path d="M30 118 L30 166 M35 118 L35 166" stroke="#3E8F45" strokeWidth={1.2}/>
    {[122,132,142,152,162].map(y=><G key={y}><Line x1={23} y1={y} x2={20} y2={y-2} stroke="#E9F7D6" strokeWidth={1}/><Line x1={41} y1={y+4} x2={44} y2={y+2} stroke="#E9F7D6" strokeWidth={1}/></G>)}
    <Circle cx={32} cy={110} r={6} fill="#FF7EB6"/><Circle cx={27} cy={108} r={4} fill="#FF9BC8"/><Circle cx={37} cy={108} r={4} fill="#FF9BC8"/><Circle cx={32} cy={109} r={2.4} fill="#FFD166"/>
    <Path d="M18 166 L46 166 L42 190 L22 190 Z" fill="#E8C07A"/>
    <Rect x={16} y={163} width={32} height={6} rx={3} fill="#D4A55A"/>
    <Path d="M24 178 Q32 172 40 178" stroke="#C48F45" strokeWidth={2} fill="none"/>
  </G>},
  quadro_sol:{dy:OFF,box:[38,18,80,76],draw:()=><G>
    <Path d="M56 34 L78 22 L100 34" stroke="#6B5236" strokeWidth={1.4} fill="none"/><Circle cx={78} cy={22} r={2} fill="#8A8A8A"/>
    <Rect x={44} y={34} width={68} height={56} rx={3} fill="#B07A47"/>
    <Rect x={50} y={40} width={56} height={44} fill="#FFE7A8"/>
    <Circle cx={88} cy={54} r={8} fill="#FFB300"/>
    {[0,45,90,135,180,225,270,315].map(a=>{const r=a*Math.PI/180;return <Line key={a} x1={88+Math.cos(r)*11} y1={54+Math.sin(r)*11} x2={88+Math.cos(r)*15} y2={54+Math.sin(r)*15} stroke="#FFB300" strokeWidth={2} strokeLinecap="round"/>;})}
    <Path d="M50 84 Q62 66 76 76 Q88 64 106 78 L106 84 Z" fill="#5FAE63"/>
    <Path d="M50 84 Q66 74 80 82 L80 84 Z" fill="#7BC67B"/>
    <Rect x={44} y={34} width={68} height={56} rx={3} fill="none" stroke="#8C5E33" strokeWidth={2}/>
  </G>},
  quadro_lua:{dy:OFF,box:[38,18,80,76],draw:()=><G>
    <Path d="M56 34 L78 22 L100 34" stroke="#4A3B5E" strokeWidth={1.4} fill="none"/><Circle cx={78} cy={22} r={2} fill="#8A8A8A"/>
    <Rect x={44} y={34} width={68} height={56} rx={3} fill="#5E4B7A"/>
    <Rect x={50} y={40} width={56} height={44} fill="#27305F"/>
    <Circle cx={70} cy={60} r={13} fill="#FFF1A8"/><Circle cx={77} cy={55} r={11} fill="#27305F"/>
    {[[90,48,1.6],[98,62,1.2],[86,74,1.4],[60,48,1],[100,46,1]].map(([x,y,r],i)=><Circle key={i} cx={x} cy={y} r={r} fill="#FFFFFF"/>)}
    <Path d="M94 68 l1.5 3 3 1.5 -3 1.5 -1.5 3 -1.5 -3 -3 -1.5 3 -1.5z" fill="#FFF1A8"/>
  </G>},
  poster_ping:{dy:OFF,box:[38,20,80,86],draw:()=><G transform="rotate(-3 78 64)">
    <Rect x={46} y={28} width={64} height={72} rx={2} fill="#FFF8E7"/>
    <Rect x={50} y={32} width={56} height={46} fill="#2B3427"/>
    <Circle cx={78} cy={56} r={16} fill="#D7FC65" stroke="#111310" strokeWidth={2.4}/>
    <Circle cx={72} cy={53} r={2.4} fill="#111310"/><Circle cx={84} cy={53} r={2.4} fill="#111310"/>
    <Path d="M71 61 Q78 67 85 61" stroke="#111310" strokeWidth={2.2} fill="none" strokeLinecap="round"/>
    <Path d="M78 38 l0 -4" stroke="#D7FC65" strokeWidth={2}/>
    <SvgText x={78} y={88} fontSize={7.5} fontWeight="bold" fill="#242A22" textAnchor="middle">FAÇA</SvgText>
    <SvgText x={78} y={96} fontSize={7.5} fontWeight="bold" fill="#242A22" textAnchor="middle">ACONTECER</SvgText>
    <Rect x={42} y={24} width={14} height={6} fill="#F2D28B" opacity={0.85} transform="rotate(-30 49 27)"/>
    <Rect x={100} y={24} width={14} height={6} fill="#F2D28B" opacity={0.85} transform="rotate(30 107 27)"/>
  </G>},
  tapete:{dy:OFF,box:[66,186,208,46],draw:()=><G>
    <Ellipse cx={170} cy={209} rx={98} ry={18} fill="#E07A5F"/>
    <Ellipse cx={170} cy={209} rx={82} ry={14} fill="#F2CC8F"/>
    <Ellipse cx={170} cy={209} rx={62} ry={10} fill="#81B29A"/>
    <Ellipse cx={170} cy={209} rx={40} ry={6} fill="#F4F1DE"/>
    {[-6,-2,2,6].map(d=><G key={d}><Line x1={72} y1={209+d} x2={66} y2={209+d*1.3} stroke="#E07A5F" strokeWidth={1.5}/><Line x1={268} y1={209+d} x2={274} y2={209+d*1.3} stroke="#E07A5F" strokeWidth={1.5}/></G>)}
  </G>},
  tapete_redondo:{dy:OFF,box:[94,182,152,54],draw:()=><G>
    <Ellipse cx={170} cy={210} rx={72} ry={22} fill="#2F8F89"/>
    <Ellipse cx={170} cy={209} rx={64} ry={19} fill="#3FA7A0"/>
    <Ellipse cx={170} cy={209} rx={50} ry={14} fill="#7ED3C6"/>
    <Ellipse cx={170} cy={209} rx={36} ry={10} fill="none" stroke="#E9FFF9" strokeWidth={2} strokeDasharray="4 4"/>
    <Ellipse cx={170} cy={209} rx={18} ry={5} fill="#F6E27A"/>
  </G>},
  luminaria:{dy:OFF,box:[54,96,70,110],draw:()=><G>
    <Table/>
    <Ellipse cx={89} cy={164} rx={10} ry={3.5} fill="#5B4B3E"/>
    <Rect x={87.5} y={124} width={3} height={40} fill="#8A7A6A"/>
    <Polygon points="72,126 106,126 99,102 79,102" fill="#FFCF5A"/>
    <Polygon points="72,126 106,126 104,120 74,120" fill="#F2B83F"/>
    <Ellipse cx={89} cy={126} rx={17} ry={3} fill="#FFE39A"/>
  </G>},
  radio:{dy:OFF,box:[54,112,74,94],draw:()=><G>
    <Table/>
    <Line x1={104} y1={138} x2={118} y2={116} stroke="#5A5A5A" strokeWidth={2} strokeLinecap="round"/><Circle cx={118} cy={116} r={2} fill="#5A5A5A"/>
    <Path d="M74 138 Q89 126 104 138" stroke="#8C2F28" strokeWidth={3} fill="none"/>
    <Rect x={66} y={136} width={46} height={30} rx={6} fill="#E86A5C"/>
    <Rect x={66} y={136} width={46} height={5} rx={2.5} fill="#F08A7E"/>
    <Circle cx={80} cy={152} r={9} fill="#8C2F28"/>
    {[-4,0,4].map(dx=>[-4,0,4].map(dy=><Circle key={`${dx}${dy}`} cx={80+dx} cy={152+dy} r={1.1} fill="#C9564A"/>))}
    <Rect x={93} y={145} width={14} height={6} rx={2} fill="#FFE6A8"/><Line x1={98} y1={145} x2={98} y2={151} stroke="#E86A5C" strokeWidth={1}/>
    <Circle cx={96} cy={159} r={2.6} fill="#FFE6A8"/><Circle cx={104} cy={159} r={2.6} fill="#FFE6A8"/>
  </G>},
  sofa:{dy:OFF,box:[204,100,134,100],draw:()=><G>
    <Ellipse cx={271} cy={196} rx={66} ry={5} fill="#000" opacity={0.2}/>
    <Rect x={216} y={182} width={6} height={12} fill="#6B4A2F"/><Rect x={320} y={182} width={6} height={12} fill="#6B4A2F"/>
    <Rect x={222} y={114} width={98} height={46} rx={14} fill="#3F78BC"/>
    <Rect x={214} y={150} width={114} height={34} rx={9} fill="#4F8FD6"/>
    <Rect x={228} y={146} width={42} height={14} rx={6} fill="#6AA8F0"/><Rect x={272} y={146} width={42} height={14} rx={6} fill="#6AA8F0"/>
    <Rect x={204} y={134} width={22} height={50} rx={10} fill="#3F78BC"/><Rect x={316} y={134} width={22} height={50} rx={10} fill="#3F78BC"/>
    <Rect x={204} y={134} width={22} height={8} rx={4} fill="#5B9BE0"/><Rect x={316} y={134} width={22} height={8} rx={4} fill="#5B9BE0"/>
    <Rect x={232} y={120} width={24} height={22} rx={6} fill="#FFD166" transform="rotate(-10 244 131)"/>
    <Path d="M236 126 L252 138" stroke="#F2B640" strokeWidth={1.5} transform="rotate(-10 244 131)"/>
    <Line x1={271} y1={118} x2={271} y2={146} stroke="#356AA8" strokeWidth={1.5}/>
  </G>},
  ventilador:{box:[106,30,128,62],draw:()=><G>
    <Rect x={168} y={36} width={4} height={20} fill="#9C9384"/>
    <Ellipse cx={170} cy={60} rx={18} ry={8} fill="#D9D2C3" stroke="#9C9384" strokeWidth={2}/>
    <Rect x={156} y={58} width={28} height={6} rx={3} fill="#C9C1B0"/>
    <Circle cx={170} cy={72} r={6} fill="#FFF3B0" stroke="#D9C27A" strokeWidth={1.5}/>
  </G>},
  pendente:{box:[136,36,68,104],draw:()=><G>
    <Line x1={170} y1={36} x2={170} y2={98} stroke="#444" strokeWidth={2}/>
    <Path d="M144 122 Q146 94 170 92 Q194 94 196 122 Z" fill="#3FA7A0"/>
    <Path d="M152 104 Q160 96 170 96" stroke="#7ED3C6" strokeWidth={3} fill="none" strokeLinecap="round"/>
    <Ellipse cx={170} cy={122} rx={26} ry={4} fill="#2F8F89"/>
    <Circle cx={170} cy={124} r={6} fill="#FFE8A3"/>
  </G>},
  luzinhas:{box:[0,36,340,64],draw:()=><G>
    <Path d="M6 42 Q88 92 170 52 Q252 92 334 42" stroke="#3A3A3A" strokeWidth={1.6} fill="none"/>
    {LIGHTS.map(([x,y],i)=><G key={i}><Rect x={x-2} y={y-6} width={4} height={4} fill="#555"/><Ellipse cx={x} cy={y+2} rx={4} ry={5.5} fill={BULB[i%BULB.length]} opacity={0.55}/></G>)}
  </G>,glow:g=><G>{LIGHTS.map(([x,y],i)=>i%2===g?<G key={i}><Circle cx={x} cy={y+2} r={9} fill={BULB[i%BULB.length]} opacity={0.35}/><Ellipse cx={x} cy={y+2} rx={4} ry={5.5} fill={BULB[i%BULB.length]}/></G>:null)}</G>},
  relogio:{box:[132,150,76,80],draw:({now})=>{const d=now??new Date();const h=(d.getHours()%12+d.getMinutes()/60)*30,m=d.getMinutes()*6;const hand=(deg:number,len:number)=>{const r=(deg-90)*Math.PI/180;return [170+Math.cos(r)*len,190+Math.sin(r)*len];};const [hx,hy]=hand(h,16),[mx,my]=hand(m,25);
    return <G>
      <Circle cx={170} cy={190} r={36} fill="#8C5E33"/><Circle cx={170} cy={190} r={30} fill="#FFF8E7"/>
      {Array.from({length:12},(_,i)=>{const [x1,y1]=hand(i*30,25),[x2,y2]=hand(i*30,i%3===0?20:23);return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#5A3E22" strokeWidth={i%3===0?3:1.5} strokeLinecap="round"/>;})}
      <Line x1={170} y1={190} x2={hx} y2={hy} stroke="#2A2A2A" strokeWidth={4} strokeLinecap="round"/>
      <Line x1={170} y1={190} x2={mx} y2={my} stroke="#2A2A2A" strokeWidth={2.6} strokeLinecap="round"/>
      <Circle cx={170} cy={190} r={3.5} fill="#E8455A"/>
    </G>;}},
  neon:{box:[108,156,124,68],draw:({on})=><G>
    <Rect x={114} y={162} width={112} height={56} rx={12} fill="#16162A" opacity={0.92}/>
    {on?<><SvgText x={170} y={188} fontSize={16} fontWeight="bold" fill="none" stroke="#FF6FD8" strokeWidth={6} opacity={0.35} textAnchor="middle">FAÇA</SvgText>
      <SvgText x={170} y={208} fontSize={12} fontWeight="bold" fill="none" stroke="#6FF7FF" strokeWidth={5} opacity={0.35} textAnchor="middle">ACONTECER</SvgText></>:null}
    <SvgText x={170} y={188} fontSize={16} fontWeight="bold" fill={on?'#FFD1F5':'#6B4A64'} textAnchor="middle">FAÇA</SvgText>
    <SvgText x={170} y={208} fontSize={12} fontWeight="bold" fill={on?'#D9FDFF':'#3F6468'} textAnchor="middle">ACONTECER</SvgText>
  </G>},
  prateleira:{box:[108,168,124,70],draw:()=><G>
    {[[118,190,10,32,'#E8455A'],[129,184,12,38,'#4F8FD6'],[142,194,9,28,'#F7C948'],[152,188,11,34,'#7BC67B']].map(([x,y,w,h,c],i)=><Rect key={i} x={x as number} y={y as number} width={w as number} height={h as number} rx={1.5} fill={c as string}/>)}
    <Rect x={164} y={196} width={10} height={26} rx={1.5} fill="#9B7BEA" transform="rotate(14 169 222)"/>
    <Path d="M184 222 L186 206 L200 206 L202 222 Z" fill="#FFC83D"/><Rect x={190} y={200} width={6} height={6} fill="#FFC83D"/><Circle cx={193} cy={198} r={6} fill="#FFC83D"/>
    <Path d="M208 222 L210 212 L224 212 L226 222 Z" fill="#D9774B"/><Path d="M217 212 C210 204 210 196 214 192 C218 198 219 204 217 212Z M217 212 C224 204 226 198 222 192 C218 200 216 206 217 212Z" fill="#4CAF6A"/>
    <Rect x={112} y={222} width={116} height={7} rx={2} fill="#A0714A"/>
    <Path d="M122 229 L122 238 L130 229 M218 229 L218 238 L210 229" stroke="#6B4A2F" strokeWidth={3} fill="none"/>
  </G>},
  televisao:{box:[216,226,118,90],draw:({on,frame=0})=><G>
    <Rect x={268} y={296} width={14} height={14} fill="#3A3A3A"/>
    <Rect x={222} y={232} width={106} height={66} rx={6} fill="#1A1A1A"/>
    <Rect x={228} y={238} width={94} height={54} rx={2} fill={on?'#2B3467':'#0E0E12'}/>
    {on&&frame%3===0?<G><Rect x={228} y={238} width={94} height={54} fill="#8ED1FC"/><Path d="M228 292 Q256 262 286 280 Q304 268 322 282 L322 292Z" fill="#7BC67B"/><Circle cx={300} cy={254} r={8} fill="#FFE066"/></G>:null}
    {on&&frame%3===1?<G><Rect x={228} y={238} width={94} height={54} fill="#2B3427"/><Circle cx={275} cy={265} r={18} fill="#D7FC65" stroke="#111" strokeWidth={2.5}/><Circle cx={268} cy={262} r={2.6} fill="#111"/><Circle cx={282} cy={262} r={2.6} fill="#111"/><Path d="M266 271 Q275 278 284 271" stroke="#111" strokeWidth={2.4} fill="none"/></G>:null}
    {on&&frame%3===2?<G>{['#FF5C7A','#FFD166','#7BC67B','#7ED3C6','#4F8FD6','#9B7BEA'].map((c,i)=><Rect key={c} x={228+i*15.66} y={238} width={15.7} height={42} fill={c}/>)}<Rect x={228} y={280} width={94} height={12} fill="#222"/></G>:null}
    {on?null:<Path d="M236 246 L262 246 L240 276" stroke="#FFFFFF" strokeWidth={2} opacity={0.12} fill="none"/>}
    <Circle cx={318} cy={295} r={1.6} fill={on?'#7BC67B':'#E8455A'}/>
  </G>},
  lousa:{box:[216,224,118,96],draw:()=><G>
    <Rect x={222} y={230} width={106} height={76} rx={4} fill="#B07A47"/>
    <Rect x={228} y={236} width={94} height={64} fill="#F7F7F2"/>
    <SvgText x={275} y={250} fontSize={9} fontWeight="bold" fill="#2B3467" textAnchor="middle">TAREFAS</SvgText>
    {[262,276,290].map((y,i)=><G key={y}>
      <Rect x={236} y={y-6} width={8} height={8} rx={1.5} fill="none" stroke="#2B3467" strokeWidth={1.4}/>
      {i<2?<Path d={`M237 ${y-2} L240 ${y+1} L245 ${y-6}`} stroke="#3FA34D" strokeWidth={2} fill="none" strokeLinecap="round"/>:null}
      <Line x1={250} y1={y-2} x2={i===1?296:310} y2={y-2} stroke={i<2?'#9AA0B5':'#2B3467'} strokeWidth={2} strokeLinecap="round"/>
    </G>)}
    <Rect x={240} y={306} width={70} height={5} rx={2} fill="#8E6440"/><Rect x={292} y={302} width={14} height={4} rx={2} fill="#E8455A"/>
  </G>},
  gatinho:{box:[14,516,136,74],draw:()=><G>
    <Ellipse cx={80} cy={574} rx={60} ry={14} fill="#000" opacity={0.18}/>
    <Ellipse cx={80} cy={568} rx={58} ry={15} fill="#7E63C9"/><Ellipse cx={80} cy={564} rx={52} ry={12} fill="#9B7BEA"/>
    <Path d="M116 566 Q138 560 126 546 Q120 540 114 548" stroke="#E8924A" strokeWidth={7} fill="none" strokeLinecap="round"/>
    <Ellipse cx={86} cy={552} rx={34} ry={17} fill="#F2A65A"/>
    <Path d="M78 538 Q82 552 78 566 M92 537 Q96 552 92 567 M106 541 Q109 552 106 563" stroke="#D9853D" strokeWidth={3} fill="none"/>
    <Circle cx={56} cy={548} r={14} fill="#F2A65A"/>
    <Polygon points="44,542 46,528 54,537" fill="#F2A65A"/><Polygon points="60,535 68,527 68,541" fill="#F2A65A"/>
    <Polygon points="47,539 48,532 52,537" fill="#FFB8C6"/>
    <Path d="M48 549 Q51 552 54 549 M58 549 Q61 552 64 549" stroke="#5A3A20" strokeWidth={1.6} fill="none" strokeLinecap="round"/>
    <Circle cx={56} cy={554} r={1.6} fill="#E86A8A"/>
  </G>},
  aquario:{box:[22,466,118,124],draw:()=><G>
    <Ellipse cx={80} cy={588} rx={54} ry={4} fill="#000" opacity={0.18}/>
    <Rect x={30} y={548} width={100} height={38} rx={3} fill="#7F5839"/><Rect x={36} y={556} width={88} height={4} fill="#6B4A2F"/>
    <Rect x={32} y={486} width={96} height={62} rx={5} fill="#8ED1FC" opacity={0.8}/>
    <Path d="M32 538 Q60 530 80 538 Q104 546 128 536 L128 548 L32 548Z" fill="#F2CC8F"/>
    <Path d="M46 540 C42 524 50 514 46 500 M52 540 C56 526 50 518 54 506 M112 540 C108 528 116 520 112 508" stroke="#4CAF6A" strokeWidth={3} fill="none" strokeLinecap="round"/>
    <Ellipse cx={74} cy={508} rx={8} ry={5} fill="#FF8A3D"/><Path d="M66 508 L60 503 L60 513Z" fill="#FF8A3D"/><Circle cx={78} cy={507} r={1.2} fill="#111"/>
    <Ellipse cx={102} cy={524} rx={7} ry={4.4} fill="#4F8FD6"/><Path d="M109 524 L114 520 L114 528Z" fill="#4F8FD6"/><Circle cx={98} cy={523} r={1.1} fill="#111"/>
    {[[88,500,2.4],[92,492,1.8],[86,488,1.4]].map(([x,y,r],i)=><Circle key={i} cx={x} cy={y} r={r} fill="none" stroke="#FFFFFF" strokeWidth={1}/>)}
    <Rect x={30} y={482} width={100} height={6} rx={2} fill="#5A5A5A"/>
    <Rect x={32} y={486} width={96} height={62} rx={5} fill="none" stroke="#DDEFF8" strokeWidth={2.5}/>
  </G>},
  violao:{box:[30,428,92,166],draw:()=><G transform="rotate(-14 76 586)">
    <Ellipse cx={76} cy={588} rx={24} ry={4} fill="#000" opacity={0.18}/>
    <Rect x={71} y={444} width={10} height={86} fill="#6B4A2F"/>
    <Rect x={68} y={434} width={16} height={16} rx={3} fill="#4A3221"/>
    {[438,446].map(y=><G key={y}><Circle cx={66} cy={y} r={2} fill="#D9C27A"/><Circle cx={86} cy={y} r={2} fill="#D9C27A"/></G>)}
    <Circle cx={76} cy={560} r={26} fill="#C9803F"/><Circle cx={76} cy={526} r={19} fill="#C9803F"/>
    <Rect x={60} y={526} width={32} height={34} fill="#C9803F"/>
    <Circle cx={76} cy={540} r={8} fill="#3A2614"/>
    <Rect x={66} y={566} width={20} height={4} rx={1} fill="#4A3221"/>
    {[73,75,77,79].map(x=><Line key={x} x1={x} y1={446} x2={x} y2={568} stroke="#F2E6C8" strokeWidth={0.6}/>)}
  </G>},
  pufe:{dy:OFF,box:[228,118,100,82],draw:()=><G>
    <Ellipse cx={278} cy={194} rx={44} ry={6} fill="#000" opacity={0.2}/>
    <Path d="M236 186 Q230 150 256 134 Q278 122 302 134 Q326 150 320 186 Q278 198 236 186Z" fill="#F28FB0"/>
    <Path d="M248 150 Q270 138 292 146" stroke="#F7B3CA" strokeWidth={6} strokeLinecap="round" fill="none"/>
    <Path d="M262 176 Q278 168 296 178" stroke="#D96E93" strokeWidth={2.5} strokeLinecap="round" fill="none"/>
    <Path d="M278 128 Q276 140 280 154" stroke="#D96E93" strokeWidth={2} fill="none"/>
  </G>},
};
/** Onde o Ping para quando vai até um item (x em unidades do quarto; dy sobe para sentar). */
export const SLOT_SPOT:Record<string,{x:number;dy:number}>={
  corner:{x:84,dy:0},wall:{x:96,dy:0},table:{x:136,dy:0},floor:{x:170,dy:0},seat:{x:270,dy:-46},
  ceiling:{x:170,dy:0},high:{x:170,dy:0},media:{x:250,dy:0},front:{x:172,dy:66},
};
export function ItemThumb({id,size=64}:{id:string;size?:number}){
  const art=ITEM_ART[id];
  if(!art)return null;
  return <Svg width={size} height={size} viewBox={art.box.join(' ')} preserveAspectRatio="xMidYMid meet">{art.draw({on:true,now:new Date(2026,0,1,10,10),frame:1})}{art.glow?art.glow(0):null}{art.glow?art.glow(1):null}</Svg>;
}
