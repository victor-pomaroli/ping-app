import React,{useCallback,useState} from 'react';
import {View,Text,ScrollView,Pressable,StyleSheet,useWindowDimensions} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg,{Circle} from 'react-native-svg';
import {showError} from '../src/components/PingDialog';
import {getProgress,type ProgressView} from '../src/store';
import {getPreferences,type NotificationPersonality} from '../src/preferences';
import {useAppTheme} from '../src/theme';
import {useMotionEnabled} from '../src/motion';
import {useOutfit} from '../src/outfit';
import {CoinIcon} from '../src/components/CoinIcon';
import {FlameIcon} from '../src/components/FlameIcon';
import {PingFace} from '../src/components/PingFace';
import {FRIENDSHIP_LEVELS} from '../src/progress';

const PAD=16;
/** Anel de progresso da amizade em volta do Ping. */
function Ring({size,progress,track,color}:{size:number;progress:number;track:string;color:string}){
  const r=size/2-6,len=2*Math.PI*r;
  return <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
    <Circle cx={size/2} cy={size/2} r={r} stroke={track} strokeWidth={8} fill="none"/>
    <Circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={8} fill="none" strokeLinecap="round"
      strokeDasharray={`${len*Math.max(0.02,progress)} ${len}`} transform={`rotate(-90 ${size/2} ${size/2})`}/>
  </Svg>;
}

/** Progresso: amizade com o Ping, números e conquistas. Tela opcional: nada aqui bloqueia tarefas. */
export default function Progress(){
  const {colors:c}=useAppTheme();
  const insets=useSafeAreaInsets();
  const router=useRouter();
  const {width}=useWindowDimensions();
  const motion=useMotionEnabled();
  const outfit=useOutfit();
  const [view,setView]=useState<ProgressView|null>(null);
  const [personality,setPersonality]=useState<NotificationPersonality>('debochado');
  const [active,setActive]=useState(false);
  useFocusEffect(useCallback(()=>{
    setActive(true);
    getProgress().then(setView).catch(e=>showError('Erro ao carregar o progresso',e));
    getPreferences().then(p=>setPersonality(p.personality)).catch(()=>{});
    return()=>setActive(false);
  },[]));
  if(!view)return <View style={{flex:1,backgroundColor:c.background}}/>;
  const f=view.friendship;
  const done=view.achievements.filter(a=>a.unlocked).length;
  const next=view.achievements.filter(a=>!a.unlocked).sort((a,b)=>b.current/b.target-a.current/a.target)[0];
  const inner=Math.min(width,640)-PAD*2;
  const cardW=(inner-12)/2;
  const ringSize=132;
  return <ScrollView style={{flex:1,backgroundColor:c.background}} contentContainerStyle={{paddingHorizontal:PAD,paddingTop:16,paddingBottom:insets.bottom+40,alignItems:'center'}}>
    <View style={{width:inner}}>
      {/* Herói: o Ping (com o visual comprado) dentro do anel da amizade */}
      <View style={[st.card,{backgroundColor:c.surface,borderColor:c.border,flexDirection:'row',alignItems:'center',gap:16,padding:16}]}>
        <View style={{width:ringSize,height:ringSize,alignItems:'center',justifyContent:'center'}}>
          <Ring size={ringSize} progress={f.progress} track={c.border} color={c.accent}/>
          <PingFace personality={personality} moment="no_horario" sleeping={false} running={active&&motion} outfit={outfit}/>
        </View>
        <View style={{flex:1}}>
          <Text style={{color:c.accent,fontSize:12,fontWeight:'900',letterSpacing:0.5}}>AMIZADE · NÍVEL {f.level}/{FRIENDSHIP_LEVELS.length}</Text>
          <Text style={{color:c.text,fontSize:24,fontWeight:'900',marginTop:2}}>{f.name}</Text>
          <Text style={{color:c.muted,fontSize:13,marginTop:4,lineHeight:18}}>{f.message}</Text>
          <Text style={{color:c.muted,fontSize:12,marginTop:8,fontWeight:'700'}}>{f.nextXp===null?'Nível máximo!':`Faltam ${f.nextXp-f.xp} de amizade`}</Text>
        </View>
      </View>

      <View style={{flexDirection:'row',gap:12,marginTop:12}}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${view.balance} moedas. Abrir Cantinho`} onPress={()=>router.push('/cantinho')} style={[st.tile,{backgroundColor:c.surface,borderColor:c.border}]}>
          <CoinIcon size={24}/><Text style={[st.tileNum,{color:c.text}]}>{view.balance}</Text><Text style={[st.tileLabel,{color:c.muted}]}>moedas</Text>
        </Pressable>
        <View accessible accessibilityLabel={`${view.stats.tasks} tarefas concluídas`} style={[st.tile,{backgroundColor:c.surface,borderColor:c.border}]}>
          <Text style={{fontSize:20}}>✅</Text><Text style={[st.tileNum,{color:c.text}]}>{view.stats.tasks}</Text><Text style={[st.tileLabel,{color:c.muted}]}>concluídas</Text>
        </View>
        <View accessible accessibilityLabel={`Melhor sequência: ${view.stats.bestStreak} dias`} style={[st.tile,{backgroundColor:c.surface,borderColor:c.border}]}>
          <FlameIcon state={view.stats.bestStreak>0?'on':'off'} size={24} ink={c.text}/><Text style={[st.tileNum,{color:c.text}]}>{view.stats.bestStreak}</Text><Text style={[st.tileLabel,{color:c.muted}]}>recorde</Text>
        </View>
      </View>

      {next?<View style={[st.card,{backgroundColor:c.accentSoft,borderColor:c.accent,marginTop:12,padding:14,flexDirection:'row',alignItems:'center',gap:12}]}>
        <View style={[st.medal,{width:48,height:48,backgroundColor:next.color+'33',borderColor:next.color}]}><Text style={{fontSize:22}}>{next.icon}</Text></View>
        <View style={{flex:1}}>
          <Text style={{color:c.accent,fontSize:11,fontWeight:'900'}}>PRÓXIMA CONQUISTA</Text>
          <Text style={{color:c.text,fontSize:15,fontWeight:'900',marginTop:1}}>{next.title}</Text>
          <View style={[st.bar,{backgroundColor:c.background+'66',marginTop:6}]}><View style={[st.fill,{width:`${Math.round(next.current/next.target*100)}%`,backgroundColor:c.accent}]}/></View>
        </View>
        <Text style={{color:c.text,fontWeight:'900'}}>{next.current}/{next.target}</Text>
      </View>:null}

      <View style={{flexDirection:'row',alignItems:'baseline',marginTop:24,marginBottom:12}}>
        <Text style={{color:c.text,fontSize:22,fontWeight:'900',flex:1}}>Conquistas</Text>
        <Text style={{color:c.muted,fontSize:13,fontWeight:'800'}}>{done} de {view.achievements.length}</Text>
      </View>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>
        {view.achievements.map(a=>{
          const pct=Math.round(a.current/a.target*100);
          return <View key={a.id} accessible accessibilityLabel={`${a.title}. ${a.description} ${a.unlocked?'Conquistada':`Bloqueada, ${a.current} de ${a.target}`}`}
            style={[st.card,{width:cardW,padding:14,alignItems:'center',backgroundColor:c.surface,borderColor:a.unlocked?a.color:c.border}]}>
            <View style={[st.medal,{backgroundColor:a.unlocked?a.color+'33':c.surfaceRaised,borderColor:a.unlocked?a.color:c.border}]}>
              <Text style={{fontSize:30,opacity:a.unlocked?1:0.3}}>{a.icon}</Text>
              {a.unlocked?null:<View style={[st.lock,{backgroundColor:c.background,borderColor:c.border}]}><Text style={{fontSize:11}}>🔒</Text></View>}
            </View>
            <Text numberOfLines={1} style={{color:a.unlocked?c.text:c.muted,fontWeight:'900',fontSize:14,marginTop:10}}>{a.title}</Text>
            <Text numberOfLines={2} style={{color:c.muted,fontSize:11,lineHeight:15,textAlign:'center',marginTop:3,height:30}}>{a.description}</Text>
            {a.unlocked
              ?<Text style={{color:a.color,fontSize:11,fontWeight:'900',marginTop:8}}>✓ {a.unlockedAt?new Date(a.unlockedAt).toLocaleDateString('pt-BR'):'Conquistada'}</Text>
              :<View style={{alignSelf:'stretch',marginTop:8}}>
                <View style={[st.bar,{backgroundColor:c.border}]}><View style={[st.fill,{width:`${pct}%`,backgroundColor:c.muted}]}/></View>
                <Text style={{color:c.muted,fontSize:10,fontWeight:'800',textAlign:'center',marginTop:4}}>{a.current}/{a.target}</Text>
              </View>}
          </View>;
        })}
      </View>

      <Pressable accessibilityRole="button" onPress={()=>router.push('/cantinho')} style={[st.card,{marginTop:20,padding:16,flexDirection:'row',alignItems:'center',backgroundColor:c.surface,borderColor:c.border}]}>
        <Text style={{fontSize:24,marginRight:12}}>🏠</Text>
        <View style={{flex:1}}>
          <Text style={{color:c.text,fontWeight:'900',fontSize:15}}>Cantinho do Ping</Text>
          <Text style={{color:c.muted,fontSize:12,marginTop:2}}>Gaste suas moedas no quarto e no visual do Ping.</Text>
        </View>
        <Text style={{color:c.accent,fontSize:20,fontWeight:'900'}}>›</Text>
      </Pressable>
    </View>
  </ScrollView>;
}
const st=StyleSheet.create({
  card:{borderRadius:18,borderWidth:1},
  tile:{flex:1,borderRadius:16,borderWidth:1,paddingVertical:12,alignItems:'center',gap:2},
  tileNum:{fontSize:20,fontWeight:'900',marginTop:4},
  tileLabel:{fontSize:11,fontWeight:'700'},
  medal:{width:64,height:64,borderRadius:32,borderWidth:2,alignItems:'center',justifyContent:'center'},
  lock:{position:'absolute',right:-4,bottom:-4,width:22,height:22,borderRadius:11,borderWidth:1,alignItems:'center',justifyContent:'center'},
  bar:{height:6,borderRadius:3,overflow:'hidden'},
  fill:{height:6,borderRadius:3},
});
