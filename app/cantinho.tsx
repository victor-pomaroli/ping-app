import React,{useCallback,useMemo,useState} from 'react';
import {View,Text,ScrollView,Pressable,useWindowDimensions} from 'react-native';
import {useFocusEffect} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {showError,showDialog} from '../src/components/PingDialog';
import {RoomScene,ItemThumb} from '../src/components/RoomScene';
import {CoinIcon} from '../src/components/CoinIcon';
import {getRoomView,buyRoomItem,equipRoomItem,unequipRoomSlot} from '../src/store';
import {getPreferences,type NotificationPersonality} from '../src/preferences';
import {useMotionEnabled} from '../src/motion';
import {useAppTheme} from '../src/theme';
import {SLOTS,type RoomView,type RoomItem,type SlotId} from '../src/shop';

/** Cantinho do Ping: quarto grande fixo no topo; a loja rola embaixo. Opcional: nunca bloqueia as tarefas. */
export default function Cantinho(){
  const {colors:c}=useAppTheme();
  const insets=useSafeAreaInsets();
  const {width}=useWindowDimensions();
  const motion=useMotionEnabled();
  const [room,setRoom]=useState<RoomView|null>(null);
  const [personality,setPersonality]=useState<NotificationPersonality>('debochado');
  const [filter,setFilter]=useState<SlotId|'all'>('all');
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const reload=useCallback(()=>getRoomView().then(setRoom).catch(e=>showError('Erro ao carregar o Cantinho',e)),[]);
  useFocusEffect(useCallback(()=>{reload();getPreferences().then(p=>setPersonality(p.personality)).catch(()=>{});},[reload]));
  const selected=useMemo(()=>room?.items.find(i=>i.id===selectedId)??null,[room,selectedId]);
  if(!room)return <View style={{flex:1,backgroundColor:c.background}}/>;
  const sceneWidth=Math.min(width-24,560);
  const list=room.items.filter(i=>filter==='all'||i.slot===filter);
  const preview=selected&&!selected.owned?{id:selected.id,slot:selected.slot}:null;

  async function buy(item:RoomItem){
    const r=await buyRoomItem(item.id).catch(e=>{showError('Não foi possível comprar',e);return null;});
    if(!r)return;
    if(!r.ok){showDialog({title:r.reason==='insufficient'?'Faltam moedas':'Não deu',message:r.reason==='insufficient'?'Conclua mais tarefas para juntar moedas.':r.reason==='owned'?'Você já tem esse item.':'Item indisponível.',confirmLabel:'OK'});return;}
    await equipRoomItem(item.id);await reload();
  }
  async function toggle(item:RoomItem){
    if(item.equipped)await unequipRoomSlot(item.slot);else await equipRoomItem(item.id);
    await reload();
  }
  const canBuy=!!selected&&!selected.owned&&room.balance>=selected.price;
  return <View style={{flex:1,backgroundColor:c.background}}>
    <View style={{paddingHorizontal:12,paddingTop:10}}>
      <RoomScene width={sceneWidth} equipped={room.equipped} preview={preview} colors={c} personality={personality} running={motion}/>
      <View accessible accessibilityLabel={`${room.balance} moedas`} style={{position:'absolute',top:20,right:22,flexDirection:'row',alignItems:'center',gap:6,backgroundColor:c.background+'DD',borderRadius:16,paddingHorizontal:11,paddingVertical:6,borderWidth:1,borderColor:c.border}}>
        <CoinIcon size={18}/><Text style={{color:c.text,fontWeight:'900',fontSize:15}}>{room.balance}</Text>
      </View>
      {preview?<View style={{position:'absolute',left:22,top:20,backgroundColor:c.accent,borderRadius:12,paddingHorizontal:10,paddingVertical:4}}><Text style={{color:c.background,fontWeight:'900',fontSize:11}}>PROVANDO</Text></View>:null}
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexGrow:0,marginTop:12}} contentContainerStyle={{paddingHorizontal:12,gap:8}}>
      {[{id:'all' as const,name:'Tudo'},...SLOTS].map(s=>{const on=filter===s.id;return <Pressable key={s.id} accessibilityRole="button" accessibilityState={{selected:on}} onPress={()=>setFilter(s.id)} style={{minHeight:40,paddingHorizontal:14,borderRadius:20,justifyContent:'center',backgroundColor:on?c.accentSoft:c.surface,borderWidth:1,borderColor:on?c.accent:c.border}}>
        <Text style={{color:on?c.accent:c.muted,fontWeight:'800'}}>{s.name}</Text></Pressable>;})}
    </ScrollView>
    <ScrollView style={{flex:1}} contentContainerStyle={{padding:12,paddingBottom:(selected?110:24)+insets.bottom,flexDirection:'row',flexWrap:'wrap',gap:10}}>
      {list.map(item=>{
        const on=selected?.id===item.id;
        return <Pressable key={item.id} accessibilityRole="button" accessibilityState={{selected:on}}
          accessibilityLabel={`${item.name}. ${item.equipped?'No quarto':item.owned?'Você tem':`${item.price} moedas`}`}
          onPress={()=>setSelectedId(on?null:item.id)}
          style={{width:(sceneWidth-10)/2,backgroundColor:c.surface,borderRadius:14,borderWidth:on?2:1,borderColor:on?c.accent:c.border,padding:10,alignItems:'center'}}>
          <View style={{height:76,width:'100%',backgroundColor:c.surfaceRaised,borderRadius:10,alignItems:'center',justifyContent:'center'}}><ItemThumb id={item.id} colors={c} size={68}/></View>
          <Text numberOfLines={1} style={{color:c.text,fontWeight:'800',marginTop:8}}>{item.name}</Text>
          {item.owned
            ?<Text style={{color:item.equipped?c.accent:c.muted,fontSize:12,fontWeight:'800',marginTop:3}}>{item.equipped?'✓ NO QUARTO':'VOCÊ TEM'}</Text>
            :<View style={{flexDirection:'row',alignItems:'center',gap:5,marginTop:3,opacity:room.balance<item.price?0.5:1}}><CoinIcon size={14}/><Text style={{color:c.text,fontSize:13,fontWeight:'900'}}>{item.price}</Text></View>}
        </Pressable>;
      })}
    </ScrollView>
    {selected?<View style={{position:'absolute',left:0,right:0,bottom:0,paddingHorizontal:16,paddingTop:12,paddingBottom:insets.bottom+12,backgroundColor:c.surfaceRaised,borderTopWidth:1,borderColor:c.border,flexDirection:'row',alignItems:'center',gap:12}}>
      <View style={{flex:1}}>
        <Text style={{color:c.text,fontSize:16,fontWeight:'900'}}>{selected.name}</Text>
        <Text style={{color:c.muted,fontSize:12,marginTop:2}}>{SLOTS.find(s=>s.id===selected.slot)?.name}{!selected.owned&&!canBuy?' · faltam '+(selected.price-room.balance)+' moedas':''}</Text>
      </View>
      {selected.owned
        ?<Pressable accessibilityRole="button" onPress={()=>toggle(selected)} style={{minHeight:46,paddingHorizontal:22,borderRadius:12,justifyContent:'center',borderWidth:1,borderColor:selected.equipped?c.border:c.accent,backgroundColor:selected.equipped?'transparent':c.accent}}>
          <Text style={{color:selected.equipped?c.text:c.background,fontWeight:'900'}}>{selected.equipped?'REMOVER':'USAR'}</Text></Pressable>
        :<Pressable accessibilityRole="button" accessibilityState={{disabled:!canBuy}} disabled={!canBuy}
          onPress={()=>showDialog({title:`Comprar ${selected.name}?`,message:`Custa ${selected.price} moedas. Você tem ${room.balance}.`,confirmLabel:'COMPRAR',cancelLabel:'AGORA NÃO',onConfirm:()=>buy(selected)})}
          style={{minHeight:46,paddingHorizontal:18,borderRadius:12,flexDirection:'row',alignItems:'center',gap:7,backgroundColor:canBuy?c.accent:c.surface,borderWidth:1,borderColor:canBuy?c.accent:c.border}}>
          <CoinIcon size={16}/><Text style={{color:canBuy?c.background:c.muted,fontWeight:'900'}}>COMPRAR · {selected.price}</Text></Pressable>}
    </View>:null}
  </View>;
}
