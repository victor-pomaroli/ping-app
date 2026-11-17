import React,{useCallback,useState} from 'react';
import {View,Text,ScrollView,Pressable,useWindowDimensions} from 'react-native';
import {useFocusEffect} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {showError,showDialog} from '../src/components/PingDialog';
import {RoomScene} from '../src/components/RoomScene';
import {getRoomView,buyRoomItem,equipRoomItem,unequipRoomSlot} from '../src/store';
import {getPreferences,type NotificationPersonality} from '../src/preferences';
import {useMotionEnabled} from '../src/motion';
import {useAppTheme} from '../src/theme';
import {SLOTS,type RoomView,type RoomItem} from '../src/shop';

/** Cantinho do Ping: quarto opcional, decorado com moedas. Nunca bloqueia nem atrasa as tarefas. */
export default function Cantinho(){
  const {colors:c}=useAppTheme();
  const insets=useSafeAreaInsets();
  const {width}=useWindowDimensions();
  const motion=useMotionEnabled();
  const [room,setRoom]=useState<RoomView|null>(null);
  const [personality,setPersonality]=useState<NotificationPersonality>('debochado');
  const reload=useCallback(()=>getRoomView().then(setRoom).catch(e=>showError('Erro ao carregar o Cantinho',e)),[]);
  useFocusEffect(useCallback(()=>{reload();getPreferences().then(p=>setPersonality(p.personality)).catch(()=>{});},[reload]));
  if(!room)return <View style={{flex:1,backgroundColor:c.background}}/>;
  const sceneWidth=Math.min(width-44,520);
  async function buy(item:RoomItem){
    const r=await buyRoomItem(item.id).catch(e=>{showError('Não foi possível comprar',e);return null;});
    if(!r)return;
    if(!r.ok){showDialog({title:r.reason==='insufficient'?'Faltam moedas':'Não deu',message:r.reason==='insufficient'?'Conclua mais tarefas para juntar moedas.':r.reason==='owned'?'Você já tem esse item.':'Item indisponível.',confirmLabel:'OK'});return;}
    await equipRoomItem(item.id);await reload();
  }
  const confirmBuy=(item:RoomItem)=>showDialog({title:`Comprar ${item.name}?`,message:`Custa ${item.price} moedas. Você tem ${room.balance}.`,confirmLabel:'COMPRAR',cancelLabel:'AGORA NÃO',onConfirm:()=>buy(item)});
  return <ScrollView style={{flex:1,backgroundColor:c.background}} contentContainerStyle={{paddingHorizontal:22,paddingTop:18,paddingBottom:insets.bottom+40}}>
    <Text style={{fontSize:31,fontWeight:'900',color:c.text,marginBottom:6}}>Cantinho.</Text>
    <Text style={{color:c.muted,marginBottom:14}}>O quartinho do Ping. Decore com as moedas que você ganha concluindo tarefas.</Text>
    <RoomScene width={sceneWidth} equipped={room.equipped} colors={c} personality={personality} running={motion}/>
    <Text accessibilityLabel={`${room.balance} moedas`} style={{color:c.text,fontSize:18,fontWeight:'900',marginTop:16}}>{room.balance} moedas</Text>
    {SLOTS.map(slot=>{
      const items=room.items.filter(i=>i.slot===slot.id);
      if(!items.length)return null;
      return <View key={slot.id} style={{marginTop:18}}>
        <Text style={{color:c.muted,fontSize:12,fontWeight:'800',marginBottom:4}}>{slot.name.toUpperCase()}</Text>
        {items.map(item=><View key={item.id} style={{flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderColor:c.border,paddingVertical:13}}>
          <View style={{flex:1}}>
            <Text style={{color:c.text,fontSize:16,fontWeight:'800'}}>{item.name}</Text>
            <Text style={{color:c.muted,fontSize:12,marginTop:2}}>{item.owned?(item.equipped?'No quarto':'Você tem'):`${item.price} moedas`}</Text>
          </View>
          {item.owned
            ?<Pressable accessibilityRole="button" onPress={async()=>{if(item.equipped)await unequipRoomSlot(item.slot);else await equipRoomItem(item.id);await reload();}} style={{paddingVertical:9,paddingHorizontal:14,borderRadius:8,borderWidth:1,borderColor:item.equipped?c.border:c.accent}}>
              <Text style={{color:item.equipped?c.text:c.accent,fontWeight:'900'}}>{item.equipped?'REMOVER':'USAR'}</Text></Pressable>
            :<Pressable accessibilityRole="button" accessibilityState={{disabled:room.balance<item.price}} onPress={()=>confirmBuy(item)} style={{paddingVertical:9,paddingHorizontal:14,borderRadius:8,borderWidth:1,borderColor:c.accent,opacity:room.balance<item.price?0.45:1}}>
              <Text style={{color:c.accent,fontWeight:'900'}}>COMPRAR</Text></Pressable>}
        </View>)}
      </View>;
    })}
  </ScrollView>;
}
