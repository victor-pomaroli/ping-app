import React,{useState} from 'react';
import {View,Text,StyleSheet,type LayoutChangeEvent} from 'react-native';
import Svg,{Polygon} from 'react-native-svg';
import {FlameIcon,type FlameState} from './FlameIcon';
import {dayResult,STREAK_MILESTONES,type DayResult} from '../streak';
import type {StreakView} from '../store';
import type {Appearance} from '../appearance';
import type {ThemeColors} from '../theme';

const WEEK=['D','S','T','Q','Q','S','S'];
const FOLD=22,LIFT=3;
/** Papel do post-it por tema: lima e ciano seguem o realce; claro suave é amarelo-manteiga; rosa é rosa. */
const PAPER:Record<Appearance,{paper:string;shadow:string;fold:string}>={
  dark:{paper:'#D7FC65',shadow:'#8FA83F',fold:'#A8C94A'},
  softLight:{paper:'#F3D96B',shadow:'#B9983A',fold:'#D9B94C'},
  rose:{paper:'#F7B8CF',shadow:'#C9819F',fold:'#E28FB0'},
  ocean:{paper:'#6FD6FF',shadow:'#3F93B8',fold:'#4BB0DB'},
};
const stateOf=(r:DayResult):FlameState|null=>r==='all'?'on':r==='partial'?'half':r==='none'?'off':null;

/** Post-it da sequência: número grande, recorde/marco e os últimos 7 dias em marcas de tinta. */
export function StreakNote({streak,colors:c,appearance}:{streak:StreakView;colors:ThemeColors;appearance:Appearance}){
  const [size,setSize]=useState({w:0,h:0});
  const look=PAPER[appearance]??PAPER.dark;
  // Tinta: texto escuro do tema (nos temas escuros, o fundo do app).
  const ink=appearance==='dark'||appearance==='ocean'?c.background:c.text;
  const onLayout=(e:LayoutChangeEvent)=>setSize({w:e.nativeEvent.layout.width,h:e.nativeEvent.layout.height});
  const next=STREAK_MILESTONES.find(m=>m>streak.current);
  const sub=streak.current>0
    ?`recorde ${streak.best}${next?` · faltam ${next-streak.current} pro marco`:''}`
    :`recorde ${streak.best} · conclua tudo hoje pra recomeçar`;
  const {w,h}=size;
  const note=`0,0 ${w},0 ${w},${h-FOLD} ${w-FOLD},${h} 0,${h}`;
  return <View style={st.tilt} accessible accessibilityLabel={`${streak.current} ${streak.current===1?'dia seguido':'dias seguidos'}, ${sub}`}>
    <View onLayout={onLayout} style={st.body}>
      {w>0?<Svg width={w} height={h+LIFT} style={StyleSheet.absoluteFill}>
        <Polygon points={note.split(' ').map(p=>{const [x,y]=p.split(',').map(Number);return `${x},${y+LIFT}`;}).join(' ')} fill={look.shadow}/>
        <Polygon points={note} fill={look.paper}/>
        <Polygon points={`${w},${h-FOLD} ${w-FOLD},${h} ${w-FOLD},${h-FOLD}`} fill={look.fold}/>
      </Svg>:null}
      <View style={st.top}>
        <Text style={[st.number,{color:ink}]}>{streak.current}</Text>
        <View style={st.label}>
          <Text style={[st.title,{color:ink}]}>{streak.current===1?'dia seguido':streak.current===0?'sem sequência':'dias seguidos'}</Text>
          <Text style={[st.sub,{color:ink}]}>{sub}</Text>
        </View>
        <View style={st.big}><FlameIcon state={streak.current>0?'on':'off'} size={36} ink={ink}/></View>
      </View>
      <View style={[st.strip,{borderTopColor:ink+'66'}]}>
        {streak.recent.map((day,i)=>{
          const [y,m,d]=day.day.split('-').map(Number);
          const isToday=i===streak.recent.length-1;
          const result=dayResult(day.score);
          const state=stateOf(result);
          // Hoje só vira chama quando tudo está feito; antes disso fica o "hoje" circulado.
          const showFlame=state&&(!isToday||result==='all');
          return <View key={day.day} style={st.cell}>
            {showFlame?<FlameIcon state={state!} size={26} ink={ink}/>
              :isToday?<View style={[st.today,{borderColor:ink}]}><Text style={[st.todayText,{color:ink}]}>hoje</Text></View>
              :<Text style={[st.dash,{color:ink}]}>·</Text>}
            <Text style={[st.week,{color:ink},isToday&&st.weekToday]}>{WEEK[new Date(y,m-1,d).getDay()]}</Text>
          </View>;
        })}
      </View>
    </View>
  </View>;
}
const st=StyleSheet.create({
  tilt:{transform:[{rotate:'-1deg'}],marginBottom:14,marginHorizontal:2},
  body:{paddingTop:12,paddingBottom:14+LIFT,paddingLeft:16,paddingRight:16},
  top:{flexDirection:'row',alignItems:'center',gap:12},
  number:{fontFamily:'Baloo2_700Bold',fontSize:56,lineHeight:62,fontWeight:'normal',includeFontPadding:false},
  label:{flex:1},
  title:{fontFamily:'Baloo2_700Bold',fontSize:17,lineHeight:20,fontWeight:'normal',includeFontPadding:false},
  sub:{fontSize:11,opacity:0.72,marginTop:1},
  big:{marginRight:6},
  strip:{flexDirection:'row',justifyContent:'space-between',marginTop:10,paddingTop:8,paddingRight:14,borderTopWidth:1.5,borderStyle:'dashed'},
  cell:{width:30,alignItems:'center'},
  today:{width:26,height:26,borderWidth:2,borderRadius:13,alignItems:'center',justifyContent:'center'},
  todayText:{fontSize:8,fontWeight:'900'},
  dash:{height:26,lineHeight:26,fontSize:20,opacity:0.4},
  week:{fontSize:10,marginTop:2,opacity:0.7},
  weekToday:{fontWeight:'900',opacity:1},
});
