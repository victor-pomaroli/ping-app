import React,{useCallback,useEffect,useState} from 'react';
import {View,Text,Pressable,StyleSheet} from 'react-native';
import {useRouter,useFocusEffect} from 'expo-router';
import {CoinIcon} from './CoinIcon';
import {getCoinBalance} from '../store';
import type {ThemeColors} from '../theme';

/** Atalhos da aba Hoje: saldo (com a moeda), Cantinho e Conquistas. Opcional: nada aqui atrasa as tarefas. */
export function RewardsBar({colors:c,refreshKey}:{colors:ThemeColors;refreshKey:unknown}){
  const router=useRouter();
  const [coins,setCoins]=useState<number|null>(null);
  useEffect(()=>{getCoinBalance().then(setCoins).catch(()=>{});},[refreshKey]);
  // Ao voltar do Cantinho ou de Ajustes (compra, moedas de teste), o saldo já aparece certo.
  useFocusEffect(useCallback(()=>{getCoinBalance().then(setCoins).catch(()=>{});},[]));
  const chip={backgroundColor:c.surface,borderColor:c.border};
  return <View style={st.row}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${coins??0} moedas. Abrir Cantinho`} onPress={()=>router.push('/cantinho')} style={[st.coins,chip]}>
      <CoinIcon size={20}/><Text style={[st.coinText,{color:c.text}]}>{coins??'–'}</Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Abrir Cantinho do Ping" onPress={()=>router.push('/cantinho')} style={[st.btn,chip]}>
      <Text style={[st.btnText,{color:c.accent}]}>🏠 Cantinho</Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Abrir conquistas" onPress={()=>router.push('/progress')} style={[st.btn,chip]}>
      <Text style={[st.btnText,{color:c.accent}]}>🏆 Conquistas</Text>
    </Pressable>
  </View>;
}
const st=StyleSheet.create({
  row:{flexDirection:'row',gap:8,marginTop:12,marginBottom:2},
  coins:{flexDirection:'row',alignItems:'center',gap:7,paddingHorizontal:12,minHeight:44,borderRadius:12,borderWidth:1},
  coinText:{fontSize:16,fontWeight:'900'},
  btn:{flex:1,minHeight:44,borderRadius:12,borderWidth:1,alignItems:'center',justifyContent:'center'},
  btnText:{fontSize:13,fontWeight:'900'},
});
