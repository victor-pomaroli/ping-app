import React,{useCallback,useMemo,useRef,useState} from 'react';
import {View,Text,ScrollView,Pressable,useWindowDimensions,StyleSheet} from 'react-native';
import {useFocusEffect} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {showError,showDialog} from '../src/components/PingDialog';
import {RoomScene,ItemThumb,type RoomHandle} from '../src/components/RoomScene';
import {CoinIcon} from '../src/components/CoinIcon';
import {getRoomView,buyRoomItem,equipRoomItem,unequipRoomSlot} from '../src/store';
import {getPreferences,type NotificationPersonality} from '../src/preferences';
import {useMotionEnabled} from '../src/motion';
import {useAppTheme} from '../src/theme';
import {SLOTS,type RoomView,type RoomItem,type SlotId} from '../src/shop';

/** Cantinho do Ping: quarto vivo no topo, loja embaixo. Opcional: nunca bloqueia nem atrasa as tarefas. */
export default function Cantinho(){
  const {colors:c,appearance}=useAppTheme();
  const insets=useSafeAreaInsets();
  const {width}=useWindowDimensions();
  const motion=useMotionEnabled();
  const room$=useRef<RoomHandle>(null);
  const [room,setRoom]=useState<RoomView|null>(null);
  const [active,setActive]=useState(false);
  const [personality,setPersonality]=useState<NotificationPersonality>('debochado');
  const [filter,setFilter]=useState<SlotId|'all'>('all');
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const reload=useCallback(()=>getRoomView().then(setRoom).catch(e=>showError('Erro ao carregar o Cantinho',e)),[]);
  useFocusEffect(useCallback(()=>{
    setActive(true);reload();getPreferences().then(p=>setPersonality(p.personality)).catch(()=>{});
    return()=>setActive(false);
  },[reload]));
  const selected=useMemo(()=>room?.items.find(i=>i.id===selectedId)??null,[room,selectedId]);
  if(!room)return <View style={{flex:1,backgroundColor:c.background}}/>;
  const sceneWidth=Math.min(width-16,600);
  const list=room.items.filter(i=>filter==='all'||i.slot===filter);
  const preview=selected&&!selected.owned?{id:selected.id,slot:selected.slot}:null;
  const owned=room.items.filter(i=>i.owned).length;

  function select(item:RoomItem){
    if(selectedId===item.id){setSelectedId(null);return;}
    setSelectedId(item.id);
    if(!item.owned)room$.current?.preview(item.id);
  }
  async function buy(item:RoomItem){
    const r=await buyRoomItem(item.id).catch(e=>{showError('Não foi possível comprar',e);return null;});
    if(!r)return;
    if(!r.ok){
      if(r.reason==='insufficient')room$.current?.noCoins();
      else showDialog({title:'Não deu',message:r.reason==='owned'?'Você já tem esse item.':'Item indisponível.',confirmLabel:'OK'});
      return;
    }
    await equipRoomItem(item.id);await reload();
    room$.current?.placed(item.id,true);
  }
  async function toggle(item:RoomItem){
    if(item.equipped)await unequipRoomSlot(item.slot);else await equipRoomItem(item.id);
    await reload();
    if(!item.equipped)room$.current?.placed(item.id,false);
  }
  const canBuy=!!selected&&!selected.owned&&room.balance>=selected.price;
  const cardW=(sceneWidth-12)/2;
  return <View style={{flex:1,backgroundColor:c.background}}>
    <View style={{paddingHorizontal:8,paddingTop:8}}>
      <View style={{borderRadius:18,borderWidth:1,borderColor:c.border,overflow:'hidden'}}>
        <RoomScene ref={room$} width={sceneWidth-2} equipped={room.equipped} preview={preview} appearance={appearance} personality={personality} active={active} motion={motion}/>
      </View>
      <View accessible accessibilityLabel={`${room.balance} moedas`} style={[st.pill,{right:18,backgroundColor:c.background+'E6',borderColor:c.border}]}>
        <CoinIcon size={18}/><Text style={{color:c.text,fontWeight:'900',fontSize:15}}>{room.balance}</Text>
      </View>
      {preview?<View style={[st.pill,{left:18,backgroundColor:c.accent,borderColor:c.accent}]}><Text style={{color:c.background,fontWeight:'900',fontSize:11}}>PROVANDO</Text></View>:null}
    </View>
    <View style={{flexDirection:'row',alignItems:'center',paddingHorizontal:16,marginTop:12}}>
      <Text style={{color:c.text,fontSize:20,fontWeight:'900',flex:1}}>Lojinha</Text>
      <Text style={{color:c.muted,fontSize:12,fontWeight:'700'}}>{owned}/{room.items.length} itens · toque no quarto pra brincar</Text>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexGrow:0,marginTop:8}} contentContainerStyle={{paddingHorizontal:12,gap:8}}>
      {[{id:'all' as const,name:'Tudo'},...SLOTS].map(s=>{const on=filter===s.id;return <Pressable key={s.id} accessibilityRole="button" accessibilityState={{selected:on}} onPress={()=>setFilter(s.id)}
        style={{minHeight:38,paddingHorizontal:14,borderRadius:19,justifyContent:'center',backgroundColor:on?c.accent:c.surface,borderWidth:1,borderColor:on?c.accent:c.border}}>
        <Text style={{color:on?c.background:c.muted,fontWeight:'900',fontSize:13}}>{s.name}</Text></Pressable>;})}
    </ScrollView>
    <ScrollView style={{flex:1}} contentContainerStyle={{padding:12,paddingBottom:(selected?120:24)+insets.bottom,flexDirection:'row',flexWrap:'wrap',gap:12}}>
      {list.map(item=>{
        const on=selected?.id===item.id;
        const short=!item.owned&&room.balance<item.price;
        return <Pressable key={item.id} accessibilityRole="button" accessibilityState={{selected:on}}
          accessibilityLabel={`${item.name}. ${item.description} ${item.equipped?'No quarto':item.owned?'Você tem':`${item.price} moedas`}`}
          onPress={()=>select(item)}
          style={{width:cardW,backgroundColor:c.surface,borderRadius:16,borderWidth:on?2:1,borderColor:on?c.accent:c.border,overflow:'hidden'}}>
          <View style={{height:96,backgroundColor:c.surfaceRaised,alignItems:'center',justifyContent:'center'}}>
            <ItemThumb id={item.id} size={84}/>
            {item.equipped?<View style={[st.tag,{backgroundColor:c.accent}]}><Text style={[st.tagText,{color:c.background}]}>NO QUARTO</Text></View>
              :item.owned?<View style={[st.tag,{backgroundColor:c.border}]}><Text style={[st.tagText,{color:c.text}]}>SEU</Text></View>:null}
          </View>
          <View style={{padding:10}}>
            <Text numberOfLines={1} style={{color:c.text,fontWeight:'900',fontSize:14}}>{item.name}</Text>
            <Text numberOfLines={2} style={{color:c.muted,fontSize:11,marginTop:2,minHeight:28}}>{item.description}</Text>
            {item.owned?null:<View style={{flexDirection:'row',alignItems:'center',gap:5,marginTop:6}}>
              <CoinIcon size={15}/><Text style={{color:short?c.muted:c.text,fontSize:14,fontWeight:'900'}}>{item.price}</Text>
            </View>}
          </View>
        </Pressable>;
      })}
    </ScrollView>
    {selected?<View style={[st.bar,{paddingBottom:insets.bottom+12,backgroundColor:c.surfaceRaised,borderColor:c.border}]}>
      <ItemThumb id={selected.id} size={44}/>
      <View style={{flex:1}}>
        <Text style={{color:c.text,fontSize:16,fontWeight:'900'}} numberOfLines={1}>{selected.name}</Text>
        <Text style={{color:c.muted,fontSize:12,marginTop:2}} numberOfLines={1}>{!selected.owned&&!canBuy?`Faltam ${selected.price-room.balance} moedas`:SLOTS.find(s=>s.id===selected.slot)?.name}</Text>
      </View>
      {selected.owned
        ?<Pressable accessibilityRole="button" onPress={()=>toggle(selected)} style={[st.cta,{borderColor:selected.equipped?c.border:c.accent,backgroundColor:selected.equipped?'transparent':c.accent}]}>
          <Text style={{color:selected.equipped?c.text:c.background,fontWeight:'900'}}>{selected.equipped?'GUARDAR':'COLOCAR'}</Text></Pressable>
        :<Pressable accessibilityRole="button"
          onPress={()=>canBuy?showDialog({title:`Comprar ${selected.name}?`,message:`Custa ${selected.price} moedas. Você tem ${room.balance}.`,confirmLabel:'COMPRAR',cancelLabel:'AGORA NÃO',onConfirm:()=>buy(selected)}):room$.current?.noCoins()}
          style={[st.cta,{flexDirection:'row',gap:7,backgroundColor:canBuy?c.accent:c.surface,borderColor:canBuy?c.accent:c.border}]}>
          <CoinIcon size={16}/><Text style={{color:canBuy?c.background:c.muted,fontWeight:'900'}}>{selected.price}</Text></Pressable>}
    </View>:null}
  </View>;
}
const st=StyleSheet.create({
  pill:{position:'absolute',top:18,flexDirection:'row',alignItems:'center',gap:6,borderRadius:16,paddingHorizontal:11,paddingVertical:6,borderWidth:1},
  tag:{position:'absolute',top:8,right:8,borderRadius:8,paddingHorizontal:7,paddingVertical:3},
  tagText:{fontSize:9,fontWeight:'900'},
  bar:{position:'absolute',left:0,right:0,bottom:0,paddingHorizontal:16,paddingTop:12,borderTopWidth:1,flexDirection:'row',alignItems:'center',gap:12},
  cta:{minHeight:48,paddingHorizontal:20,borderRadius:14,alignItems:'center',justifyContent:'center',borderWidth:1},
});
