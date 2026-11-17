import React,{useCallback,useState} from 'react';
import {View,Text,ScrollView} from 'react-native';
import {useFocusEffect} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {showError} from '../src/components/PingDialog';
import {getProgress,type ProgressView} from '../src/store';
import {useAppTheme} from '../src/theme';

/** Progresso: moedas, amizade com o Ping e conquistas. Tela opcional: nada aqui bloqueia tarefas. */
export default function Progress(){
  const {colors:c}=useAppTheme();
  const insets=useSafeAreaInsets();
  const [view,setView]=useState<ProgressView|null>(null);
  useFocusEffect(useCallback(()=>{getProgress().then(setView).catch(e=>showError('Erro ao carregar o progresso',e));},[]));
  if(!view)return <View style={{flex:1,backgroundColor:c.background}}/>;
  const f=view.friendship;
  const done=view.achievements.filter(a=>a.unlocked).length;
  return <ScrollView style={{flex:1,backgroundColor:c.background}} contentContainerStyle={{paddingHorizontal:22,paddingTop:18,paddingBottom:insets.bottom+40}}>
    <Text style={{fontSize:31,fontWeight:'900',color:c.text,marginBottom:6}}>Progresso.</Text>
    <Text style={{color:c.muted,marginBottom:18}}>Concluir tarefas rende moedas e amizade. Dia sem usar não tira nada.</Text>
    <View accessible accessibilityLabel={`${view.balance} moedas`} style={{padding:17,backgroundColor:c.surface,borderRadius:10,borderWidth:1,borderColor:c.border}}>
      <Text style={{color:c.muted,fontSize:12,fontWeight:'800'}}>MOEDAS</Text>
      <Text style={{color:c.text,fontSize:34,fontWeight:'900'}}>{view.balance}</Text>
    </View>
    <View accessible accessibilityLabel={`Amizade nível ${f.level}, ${f.name}`} style={{marginTop:12,padding:17,backgroundColor:c.surface,borderRadius:10,borderWidth:1,borderColor:c.border}}>
      <Text style={{color:c.muted,fontSize:12,fontWeight:'800'}}>AMIZADE · NÍVEL {f.level}</Text>
      <Text style={{color:c.text,fontSize:22,fontWeight:'900',marginTop:2}}>{f.name}</Text>
      <Text style={{color:c.muted,marginTop:4}}>{f.message}</Text>
      <View style={{height:8,borderRadius:4,backgroundColor:c.border,marginTop:12,overflow:'hidden'}}>
        <View style={{height:8,width:`${Math.round(f.progress*100)}%`,backgroundColor:c.accent}}/>
      </View>
      <Text style={{color:c.muted,fontSize:12,marginTop:6}}>{f.nextXp===null?'Nível máximo':`${f.xp} / ${f.nextXp} de amizade`}</Text>
    </View>
    <Text style={{color:c.text,fontSize:18,fontWeight:'900',marginTop:24,marginBottom:6}}>Conquistas · {done}/{view.achievements.length}</Text>
    {view.achievements.map(a=><View key={a.id} accessible accessibilityLabel={`${a.title}, ${a.unlocked?'conquistada':'bloqueada'}. ${a.description}`}
      style={{borderBottomWidth:1,borderColor:c.border,paddingVertical:14,opacity:a.unlocked?1:0.5}}>
      <Text style={{color:c.text,fontSize:16,fontWeight:'800'}}>{a.unlocked?'✓  ':'○  '}{a.title}</Text>
      <Text style={{color:c.muted,fontSize:12,marginTop:3}}>{a.description}</Text>
    </View>)}
  </ScrollView>;
}
