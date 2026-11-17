import React from 'react';
import Svg,{Rect,Circle,Ellipse,Path,G,Line,Polygon,Text as SvgText} from 'react-native-svg';
import type {Appearance} from '../appearance';

/** Desenho do quarto em unidades fixas: 340 x 260, chão a partir de y=150. Tudo escala com a largura da tela. */
export const ROOM_W=340,ROOM_H=260,FLOOR_Y=150,FEET_Y=218;
export type Box=[x:number,y:number,w:number,h:number];

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
export const WINDOW:Box=[132,24,76,80];

/** Parede, chão, rodapé e o céu da janela (sem moldura: a moldura vai por cima das nuvens). */
export function RoomBackground({look,part}:{look:typeof ROOM_PALETTE['dark'];part:DayPart}){
  const stripes=Array.from({length:17},(_,i)=>i*20+6);
  return <>
    <Rect x={0} y={0} width={ROOM_W} height={FLOOR_Y} fill={look.wall}/>
    {stripes.map(x=><Rect key={x} x={x} y={0} width={8} height={FLOOR_Y} fill={look.stripe}/>)}
    <Rect x={0} y={FLOOR_Y} width={ROOM_W} height={ROOM_H-FLOOR_Y} fill={look.floor}/>
    {[[150,170],[170,194],[194,222],[222,252]].map(([top,y],i)=><G key={y}>
      <Line x1={0} y1={y} x2={ROOM_W} y2={y} stroke={look.plank} strokeWidth={2}/>
      {[40,120,200,280].map(x=><Line key={x} x1={x+(i%2)*40} y1={top} x2={x+(i%2)*40} y2={y} stroke={look.plank} strokeWidth={2}/>)}
    </G>)}
    <Rect x={0} y={FLOOR_Y-5} width={ROOM_W} height={8} fill={look.base}/>
    <Rect x={WINDOW[0]+4} y={WINDOW[1]+4} width={WINDOW[2]-8} height={WINDOW[3]-8} fill={SKY[part]}/>
    {part==='day'?<Circle cx={190} cy={44} r={9} fill="#FFE066"/>:null}
    {part==='golden'?<><Circle cx={168} cy={84} r={13} fill="#FF8A4C"/><Rect x={136} y={88} width={68} height={12} fill="#F28F6B"/></>:null}
    {part==='night'?<><Circle cx={188} cy={44} r={9} fill="#FFF3B0"/><Circle cx={192} cy={41} r={8} fill={SKY.night}/></>:null}
    <Path d="M136 100 Q150 86 164 96 Q178 84 204 98 L204 100 Z" fill={part==='night'?'#2C3B6E':'#7BC67B'}/>
    {part==='day'?<Polygon points="136,104 204,104 270,250 70,250" fill="#FFF6C8" opacity={0.13}/>:null}
    {part==='golden'?<Polygon points="136,104 204,104 290,250 90,250" fill="#FFC48A" opacity={0.14}/>:null}
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
export const ITEM_ART:Record<string,{box:Box;draw:()=>React.ReactElement}>={
  planta:{box:[2,90,64,104],draw:()=><G>
    <Ellipse cx={32} cy={192} rx={22} ry={4} fill="#000" opacity={0.18}/>
    <Path d="M30 158 C8 146 4 118 16 104 C26 120 32 138 30 158Z" fill="#2E8B57"/>
    <Path d="M33 158 C40 132 56 120 62 104 C66 128 52 150 33 158Z" fill="#4CAF6A"/>
    <Path d="M31 158 C26 132 30 110 40 94 C46 116 40 140 31 158Z" fill="#7BD389"/>
    <Path d="M16 104 C24 122 29 140 30 156 M62 104 C54 126 44 146 34 156 M40 94 C38 116 34 138 32 156" stroke="#1F6B42" strokeWidth={1.4} fill="none"/>
    <Path d="M14 158 L50 158 L45 190 L19 190 Z" fill="#D9774B"/>
    <Rect x={11} y={154} width={42} height={8} rx={3} fill="#C2613A"/>
    <Path d="M20 172 L44 172" stroke="#E89A72" strokeWidth={2}/>
  </G>},
  cacto:{box:[8,96,52,98],draw:()=><G>
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
  quadro_sol:{box:[38,18,80,76],draw:()=><G>
    <Path d="M56 34 L78 22 L100 34" stroke="#6B5236" strokeWidth={1.4} fill="none"/><Circle cx={78} cy={22} r={2} fill="#8A8A8A"/>
    <Rect x={44} y={34} width={68} height={56} rx={3} fill="#B07A47"/>
    <Rect x={50} y={40} width={56} height={44} fill="#FFE7A8"/>
    <Circle cx={88} cy={54} r={8} fill="#FFB300"/>
    {[0,45,90,135,180,225,270,315].map(a=>{const r=a*Math.PI/180;return <Line key={a} x1={88+Math.cos(r)*11} y1={54+Math.sin(r)*11} x2={88+Math.cos(r)*15} y2={54+Math.sin(r)*15} stroke="#FFB300" strokeWidth={2} strokeLinecap="round"/>;})}
    <Path d="M50 84 Q62 66 76 76 Q88 64 106 78 L106 84 Z" fill="#5FAE63"/>
    <Path d="M50 84 Q66 74 80 82 L80 84 Z" fill="#7BC67B"/>
    <Rect x={44} y={34} width={68} height={56} rx={3} fill="none" stroke="#8C5E33" strokeWidth={2}/>
  </G>},
  quadro_lua:{box:[38,18,80,76],draw:()=><G>
    <Path d="M56 34 L78 22 L100 34" stroke="#4A3B5E" strokeWidth={1.4} fill="none"/><Circle cx={78} cy={22} r={2} fill="#8A8A8A"/>
    <Rect x={44} y={34} width={68} height={56} rx={3} fill="#5E4B7A"/>
    <Rect x={50} y={40} width={56} height={44} fill="#27305F"/>
    <Circle cx={70} cy={60} r={13} fill="#FFF1A8"/><Circle cx={77} cy={55} r={11} fill="#27305F"/>
    {[[90,48,1.6],[98,62,1.2],[86,74,1.4],[60,48,1],[100,46,1]].map(([x,y,r],i)=><Circle key={i} cx={x} cy={y} r={r} fill="#FFFFFF"/>)}
    <Path d="M94 68 l1.5 3 3 1.5 -3 1.5 -1.5 3 -1.5 -3 -3 -1.5 3 -1.5z" fill="#FFF1A8"/>
  </G>},
  poster_ping:{box:[38,20,80,86],draw:()=><G transform="rotate(-3 78 64)">
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
  tapete:{box:[66,186,208,46],draw:()=><G>
    <Ellipse cx={170} cy={209} rx={98} ry={18} fill="#E07A5F"/>
    <Ellipse cx={170} cy={209} rx={82} ry={14} fill="#F2CC8F"/>
    <Ellipse cx={170} cy={209} rx={62} ry={10} fill="#81B29A"/>
    <Ellipse cx={170} cy={209} rx={40} ry={6} fill="#F4F1DE"/>
    {[-6,-2,2,6].map(d=><G key={d}><Line x1={72} y1={209+d} x2={66} y2={209+d*1.3} stroke="#E07A5F" strokeWidth={1.5}/><Line x1={268} y1={209+d} x2={274} y2={209+d*1.3} stroke="#E07A5F" strokeWidth={1.5}/></G>)}
  </G>},
  tapete_redondo:{box:[94,182,152,54],draw:()=><G>
    <Ellipse cx={170} cy={210} rx={72} ry={22} fill="#2F8F89"/>
    <Ellipse cx={170} cy={209} rx={64} ry={19} fill="#3FA7A0"/>
    <Ellipse cx={170} cy={209} rx={50} ry={14} fill="#7ED3C6"/>
    <Ellipse cx={170} cy={209} rx={36} ry={10} fill="none" stroke="#E9FFF9" strokeWidth={2} strokeDasharray="4 4"/>
    <Ellipse cx={170} cy={209} rx={18} ry={5} fill="#F6E27A"/>
  </G>},
  luminaria:{box:[54,96,70,110],draw:()=><G>
    <Table/>
    <Ellipse cx={89} cy={164} rx={10} ry={3.5} fill="#5B4B3E"/>
    <Rect x={87.5} y={124} width={3} height={40} fill="#8A7A6A"/>
    <Polygon points="72,126 106,126 99,102 79,102" fill="#FFCF5A"/>
    <Polygon points="72,126 106,126 104,120 74,120" fill="#F2B83F"/>
    <Ellipse cx={89} cy={126} rx={17} ry={3} fill="#FFE39A"/>
  </G>},
  radio:{box:[54,112,74,94],draw:()=><G>
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
  sofa:{box:[204,100,134,100],draw:()=><G>
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
  pufe:{box:[228,118,100,82],draw:()=><G>
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
};
export function ItemThumb({id,size=64}:{id:string;size?:number}){
  const art=ITEM_ART[id];
  if(!art)return null;
  return <Svg width={size} height={size} viewBox={art.box.join(' ')} preserveAspectRatio="xMidYMid meet">{art.draw()}</Svg>;
}
