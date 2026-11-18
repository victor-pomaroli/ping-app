import React from 'react';
import Svg,{Circle,Ellipse,G,Line,Path,Rect,Polygon} from 'react-native-svg';

/** Acessórios do Ping, no mesmo quadro 200×200 do PingFace (pino em 100,38; olhos em 75/125,106; borda em y=164). */
export type OutfitSlot='ping_head'|'ping_face'|'ping_neck';
export type Outfit=Partial<Record<OutfitSlot,string>>;
const OUT='#141414';
const heart=(cx:number,cy:number)=>`M${cx} ${cy+11}C${cx-16} ${cy} ${cx-14} ${cy-12} ${cx-6} ${cy-12}C${cx-2} ${cy-12} ${cx} ${cy-9} ${cx} ${cy-6}C${cx} ${cy-9} ${cx+2} ${cy-12} ${cx+6} ${cy-12}C${cx+14} ${cy-12} ${cx+16} ${cy} ${cx} ${cy+11}Z`;

export const OUTFIT_ART:Record<string,()=>React.ReactElement>={
  chapeu_festa:()=><G transform="rotate(10 100 40)">
    <Polygon points="76,52 124,52 102,2" fill="#FF6FA8" stroke={OUT} strokeWidth={4} strokeLinejoin="round"/>
    <Path d="M84 38 L116 30 M90 22 L110 18" stroke="#FFD166" strokeWidth={5} strokeLinecap="round"/>
    <Circle cx={102} cy={2} r={7} fill="#FFD166" stroke={OUT} strokeWidth={3}/>
    <Path d="M76 52 Q100 58 124 52" stroke={OUT} strokeWidth={4} fill="none"/>
  </G>,
  coroa:()=><G>
    <Path d="M70 50 L70 18 L86 32 L100 10 L114 32 L130 18 L130 50 Z" fill="#FFC83D" stroke={OUT} strokeWidth={4} strokeLinejoin="round"/>
    <Rect x={70} y={42} width={60} height={9} fill="#F2A900" stroke={OUT} strokeWidth={3}/>
    <Circle cx={100} cy={30} r={5} fill="#E8455A" stroke={OUT} strokeWidth={2}/>
    <Circle cx={80} cy={46} r={3} fill="#4FA3FF"/><Circle cx={120} cy={46} r={3} fill="#4FA3FF"/>
  </G>,
  bone:()=><G>
    <Path d="M126 58 Q166 50 182 64 Q154 70 124 66 Z" fill="#2E5E99" stroke={OUT} strokeWidth={4} strokeLinejoin="round"/>
    <Path d="M58 62 Q62 20 100 18 Q138 20 142 62 Z" fill="#3F78BC" stroke={OUT} strokeWidth={4} strokeLinejoin="round"/>
    <Path d="M100 18 L100 62 M78 26 Q74 44 76 62" stroke="#2E5E99" strokeWidth={3} fill="none"/>
    <Circle cx={100} cy={18} r={5} fill="#FFD166" stroke={OUT} strokeWidth={2.5}/>
  </G>,
  laco:()=><G>
    <Path d="M100 34 C78 12 62 26 70 40 C76 52 92 44 100 34Z" fill="#FF5C7A" stroke={OUT} strokeWidth={4} strokeLinejoin="round"/>
    <Path d="M100 34 C122 12 138 26 130 40 C124 52 108 44 100 34Z" fill="#FF5C7A" stroke={OUT} strokeWidth={4} strokeLinejoin="round"/>
    <Circle cx={100} cy={35} r={7} fill="#E8455A" stroke={OUT} strokeWidth={3.5}/>
    <Path d="M80 28 Q84 34 90 36 M120 28 Q116 34 110 36" stroke="#FFB3C2" strokeWidth={3} strokeLinecap="round" fill="none"/>
  </G>,
  fones:()=><G>
    <Path d="M52 100 C48 40 72 22 100 22 C128 22 152 40 148 100" stroke="#2B2B2B" strokeWidth={9} fill="none" strokeLinecap="round"/>
    <Rect x={36} y={86} width={22} height={38} rx={9} fill="#E86A5C" stroke={OUT} strokeWidth={4}/>
    <Rect x={142} y={86} width={22} height={38} rx={9} fill="#E86A5C" stroke={OUT} strokeWidth={4}/>
    <Rect x={42} y={94} width={6} height={22} rx={3} fill="#F7A399"/><Rect x={152} y={94} width={6} height={22} rx={3} fill="#F7A399"/>
  </G>,
  oculos_escuros:()=><G>
    <Rect x={56} y={93} width={38} height={26} rx={10} fill="#141414"/>
    <Rect x={106} y={93} width={38} height={26} rx={10} fill="#141414"/>
    <Path d="M94 102 Q100 97 106 102" stroke="#141414" strokeWidth={5} fill="none"/>
    <Path d="M62 100 L72 98 M112 100 L122 98" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" opacity={0.7}/>
  </G>,
  oculos_coracao:()=><G>
    <Path d={heart(75,106)} fill="#FF4D7E" stroke={OUT} strokeWidth={3.5} strokeLinejoin="round" transform="scale(1.25) translate(-15 -21)"/>
    <Path d={heart(125,106)} fill="#FF4D7E" stroke={OUT} strokeWidth={3.5} strokeLinejoin="round" transform="scale(1.25) translate(-25 -21)"/>
    <Path d="M92 101 Q100 96 108 101" stroke={OUT} strokeWidth={4} fill="none"/>
  </G>,
  oculos_nerd:()=><G>
    <Circle cx={75} cy={106} r={16} fill="#FFFFFF" fillOpacity={0.18} stroke={OUT} strokeWidth={4.5}/>
    <Circle cx={125} cy={106} r={16} fill="#FFFFFF" fillOpacity={0.18} stroke={OUT} strokeWidth={4.5}/>
    <Path d="M91 104 Q100 98 109 104" stroke={OUT} strokeWidth={4.5} fill="none"/>
    <Path d="M66 98 Q70 94 76 94" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" opacity={0.8} fill="none"/>
  </G>,
  gravata:()=><G>
    <Polygon points="100,158 76,146 76,172" fill="#C9382E" stroke={OUT} strokeWidth={3.5} strokeLinejoin="round"/>
    <Polygon points="100,158 124,146 124,172" fill="#C9382E" stroke={OUT} strokeWidth={3.5} strokeLinejoin="round"/>
    <Rect x={93} y={151} width={14} height={14} rx={4} fill="#E8455A" stroke={OUT} strokeWidth={3.5}/>
  </G>,
  cachecol:()=><G>
    <Path d="M30 146 Q100 168 170 146 L174 160 Q100 182 26 160 Z" fill="#E07A5F" stroke={OUT} strokeWidth={4} strokeLinejoin="round"/>
    <Path d="M60 156 L64 168 M90 160 L92 174 M120 160 L118 174 M148 154 L144 168" stroke="#F2CC8F" strokeWidth={4}/>
    <Path d="M136 162 L150 194 L132 196 L124 164 Z" fill="#E07A5F" stroke={OUT} strokeWidth={4} strokeLinejoin="round"/>
    <Line x1={134} y1={194} x2={150} y2={192} stroke="#F2CC8F" strokeWidth={3}/>
  </G>,
  medalha:()=><G>
    <Polygon points="116,150 126,150 134,168 126,170" fill="#4F8FD6" stroke={OUT} strokeWidth={3}/>
    <Polygon points="140,150 130,150 128,170 136,168" fill="#E8455A" stroke={OUT} strokeWidth={3}/>
    <Circle cx={131} cy={178} r={11} fill="#FFC83D" stroke={OUT} strokeWidth={3.5}/>
    <Path d="M131 172 l2 4 4 .5 -3 3 1 4 -4 -2 -4 2 1 -4 -3 -3 4 -.5z" fill="#F2A900"/>
  </G>,
};
/** Camada dos acessórios: chapéu por cima do pino, óculos sobre os olhos, pescoço na borda do sino. */
export function OutfitLayer({outfit,size}:{outfit?:Outfit;size:number}){
  if(!outfit)return null;
  const ids=(['ping_neck','ping_face','ping_head'] as OutfitSlot[]).map(s=>outfit[s]).filter((id):id is string=>!!id&&!!OUTFIT_ART[id]);
  if(!ids.length)return null;
  return <Svg pointerEvents="none" width={size} height={size} viewBox="0 0 200 200" style={{position:'absolute',left:0,top:0}}>{ids.map(id=><G key={id}>{OUTFIT_ART[id]()}</G>)}</Svg>;
}
/** Miniatura da loja: um Ping simples vestindo o acessório. */
export function OutfitThumb({id,size=64,color='#b9e83c'}:{id:string;size?:number;color?:string}){
  const art=OUTFIT_ART[id];
  return <Svg width={size} height={size} viewBox="18 -4 164 200">
    <Circle cx={100} cy={38} r={12} fill={color} stroke={OUT} strokeWidth={5}/>
    <Path d="M26 150C43 142 51 124 53 98C55 62 76 46 100 46C124 46 145 62 147 98C149 124 157 142 174 150C183 156 177 164 165 164L35 164C23 164 17 156 26 150Z" fill={color} stroke={OUT} strokeWidth={6} strokeLinejoin="round"/>
    <Ellipse cx={100} cy={178} rx={12.5} ry={10.5} fill={color} stroke={OUT} strokeWidth={5}/>
    <Ellipse cx={75} cy={106} rx={6} ry={7.2} fill={OUT}/><Ellipse cx={125} cy={106} rx={6} ry={7.2} fill={OUT}/>
    <Path d="M86 130 Q100 142 114 130" stroke={OUT} strokeWidth={4.5} fill="none" strokeLinecap="round"/>
    {art?art():null}
  </Svg>;
}
