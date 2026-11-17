import React from 'react';
import {View} from 'react-native';
import Svg,{Rect,Circle,Ellipse,Polygon,Path,G} from 'react-native-svg';
import {PingFace,PING_SIZE} from './PingFace';
import type {NotificationPersonality} from '../preferences';
import type {SlotId} from '../shop';
import type {ThemeColors} from '../theme';

/** O quarto é desenhado em 340x220 e escala com a largura; o Ping fica no centro, sempre por cima do cenário. */
const W=340,H=220,FLOOR=140;

function Item({id,c}:{id:string;c:ThemeColors}){
  switch(id){
    case 'quadro_sol': return <G><Rect x={40} y={34} width={56} height={44} rx={4} fill={c.surfaceRaised} stroke={c.border} strokeWidth={3}/><Circle cx={68} cy={56} r={12} fill={c.warning}/></G>;
    case 'quadro_lua': return <G><Rect x={40} y={34} width={56} height={44} rx={4} fill={c.surfaceRaised} stroke={c.border} strokeWidth={3}/><Circle cx={68} cy={56} r={13} fill={c.event}/><Circle cx={74} cy={52} r={11} fill={c.surfaceRaised}/></G>;
    case 'tapete': return <G><Ellipse cx={170} cy={196} rx={96} ry={16} fill={c.accentSoft}/><Ellipse cx={170} cy={196} rx={70} ry={11} fill="none" stroke={c.accent} strokeWidth={3}/><Ellipse cx={170} cy={196} rx={40} ry={6} fill="none" stroke={c.accent} strokeWidth={3}/></G>;
    case 'planta': return <G><Path d="M22 150 Q10 120 26 104 Q34 128 22 150Z" fill={c.success}/><Path d="M26 150 Q44 126 40 106 Q24 124 26 150Z" fill={c.accent}/><Rect x={12} y={148} width={30} height={26} rx={4} fill={c.danger}/></G>;
    case 'luminaria': return <G><Circle cx={296} cy={92} r={30} fill={c.warning} opacity={0.18}/><Rect x={294} y={104} width={4} height={26} fill={c.muted}/><Polygon points="282,104 310,104 303,84 289,84" fill={c.warning}/><Rect x={276} y={130} width={40} height={44} rx={4} fill={c.surfaceRaised} stroke={c.border} strokeWidth={2}/></G>;
    case 'sofa': return <G><Rect x={206} y={118} width={96} height={30} rx={10} fill={c.accentSoft} stroke={c.accent} strokeWidth={2}/><Rect x={200} y={136} width={108} height={34} rx={10} fill={c.accent}/><Rect x={206} y={168} width={6} height={8} fill={c.border}/><Rect x={296} y={168} width={6} height={8} fill={c.border}/></G>;
    default: return null;
  }
}
/** Ordem de desenho: fundo para frente. */
const ORDER:SlotId[]=['wall','floor','corner','seat','table'];

export function RoomScene({width,equipped,colors:c,personality,running}:{width:number;equipped:Partial<Record<SlotId,string>>;colors:ThemeColors;personality:NotificationPersonality;running:boolean}){
  const scale=width/W,height=H*scale;
  return <View accessible accessibilityLabel="Cantinho do Ping" style={{width,height,borderRadius:12,overflow:'hidden',borderWidth:1,borderColor:c.border}}>
    <Svg width={width} height={height} viewBox={`0 0 ${W} ${H}`}>
      <Rect x={0} y={0} width={W} height={FLOOR} fill={c.surface}/>
      <Rect x={0} y={FLOOR} width={W} height={H-FLOOR} fill={c.surfaceRaised}/>
      <Rect x={0} y={FLOOR} width={W} height={3} fill={c.border}/>
      {ORDER.map(slot=>equipped[slot]?<Item key={slot} id={equipped[slot]!} c={c}/>:null)}
    </Svg>
    <View pointerEvents="none" style={{position:'absolute',left:(width-PING_SIZE)/2,top:FLOOR*scale-PING_SIZE*0.55}}>
      <PingFace personality={personality} moment="no_horario" sleeping={false} running={running}/>
    </View>
  </View>;
}
