import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {View,Text,ScrollView,Pressable,useWindowDimensions,StyleSheet} from 'react-native';
import {useFocusEffect} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Animated,{Easing,useAnimatedStyle,useSharedValue,withTiming} from 'react-native-reanimated';
import {ROOM_W,ROOM_H,FEET_Y} from '../src/components/RoomArt';
import {showError,showDialog} from '../src/components/PingDialog';
import {RoomScene,ItemThumb,type RoomHandle} from '../src/components/RoomScene';
import {OutfitThumb} from '../src/components/PingOutfit';
import {CoinIcon} from '../src/components/CoinIcon';
import {getRoomView,buyRoomItem,equipRoomItem,unequipRoomSlot} from '../src/store';
import {getPreferences,type NotificationPersonality} from '../src/preferences';
import {refreshOutfit} from '../src/outfit';
import {useMotionEnabled} from '../src/motion';
import {useAppTheme} from '../src/theme';
import {SLOTS,isPingSlot,type RoomView,type RoomItem} from '../src/shop';

const PAD=16,GAP=12;
const PING_COLOR:Record<NotificationPersonality,string>={debochado:'#b9e83c',semPaciencia:'#fcd534',deBoa:'#8fe6c6'};
type Filter='all'|'ping'|'ceiling'|'walls'|'furniture'|'floor';
const FILTERS:{id:Filter;name:string;slots?:string[]}[]=[
  {id:'all',name:'Tudo'},{id:'ping',name:'Visual do Ping'},{id:'ceiling',name:'Teto',slots:['ceiling']},
  {id:'walls',name:'Paredes',slots:['wall','high','media']},{id:'furniture',name:'Móveis',slots:['table','seat']},
  {id:'floor',name:'Chão e cantos',slots:['floor','corner','front']},
];

/** Cantinho do Ping: quarto vivo, depois a lojinha (filtros fixos ao rolar). Opcional: nunca bloqueia as tarefas. */
export default function Cantinho(){
  const {colors:c,appearance}=useAppTheme();
  const insets=useSafeAreaInsets();
  const {width}=useWindowDimensions();
  const motion=useMotionEnabled();
  const room$=useRef<RoomHandle>(null);
  const [shopOpen,setShopOpen]=useState(false);
  const [areaH,setAreaH]=useState(0);
  const [room,setRoom]=useState<RoomView|null>(null);
  const [active,setActive]=useState(false);
  const [personality,setPersonality]=useState<NotificationPersonality>('debochado');
  const [filter,setFilter]=useState<Filter>('all');
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const reload=useCallback(()=>getRoomView().then(setRoom).catch(e=>showError('Erro ao carregar o Cantinho',e)),[]);
  useFocusEffect(useCallback(()=>{
    setActive(true);reload();getPreferences().then(p=>setPersonality(p.personality)).catch(()=>{});
    return()=>setActive(false);
  },[reload]));
  const selected=useMemo(()=>room?.items.find(i=>i.id===selectedId)??null,[room,selectedId]);
  // Quarto alto desenhado em ROOM_W x ROOM_H: sem a loja ele ocupa a tela; com a loja, encolhe e mostra a faixa do Ping.
  const sceneW=Math.min(width,640);
  const sc=sceneW/ROOM_W,fullH=ROOM_H*sc;
  const roomOpenH=Math.min(fullH,areaH);
  const roomOpenTop=Math.max(0,(fullH-roomOpenH)*0.45);
  const roomShopH=Math.min(Math.round(areaH*0.4),300*sc);
  const roomShopTop=Math.min(fullH-roomShopH,Math.max(0,(FEET_Y+44)*sc-roomShopH));
  const h=useSharedValue(0),top=useSharedValue(0);
  useEffect(()=>{
    if(!areaH)return;
    const cfg={duration:340,easing:Easing.out(Easing.cubic)};
    const first=h.value===0,nh=shopOpen?roomShopH:roomOpenH,nt=shopOpen?roomShopTop:roomOpenTop;
    h.value=first?nh:withTiming(nh,cfg);
    top.value=first?nt:withTiming(nt,cfg);
  },[shopOpen,areaH,roomOpenH,roomShopH,roomOpenTop,roomShopTop]);
  const frameStyle=useAnimatedStyle(()=>({height:h.value}));
  const innerStyle=useAnimatedStyle(()=>({transform:[{translateY:-top.value}]}));
  if(!room)return <View style={{flex:1,backgroundColor:c.background}}/>;
  const inner=Math.min(width,640)-PAD*2;
  const cardW=(inner-GAP)/2;
  const slotsOf=FILTERS.find(f=>f.id===filter)?.slots;
  const list=room.items.filter(i=>filter==='all'||(filter==='ping'?isPingSlot(i.slot):!!slotsOf?.includes(i.slot)));
  const preview=selected&&!selected.owned?{id:selected.id,slot:selected.slot}:null;
  const owned=room.items.filter(i=>i.owned).length;

  function select(item:RoomItem){
    if(selectedId===item.id){setSelectedId(null);return;}
    setSelectedId(item.id);
    if(!item.owned)room$.current?.preview(item.id);
  }
  async function afterChange(item:RoomItem,bought:boolean){
    await reload();
    if(isPingSlot(item.slot))refreshOutfit();
    room$.current?.placed(item.id,bought);
  }
  async function buy(item:RoomItem){
    const r=await buyRoomItem(item.id).catch(e=>{showError('Não foi possível comprar',e);return null;});
    if(!r)return;
    if(!r.ok){
      if(r.reason==='insufficient')room$.current?.noCoins();
      else showDialog({title:'Não deu',message:r.reason==='owned'?'Você já tem esse item.':'Item indisponível.',confirmLabel:'OK'});
      return;
    }
    await equipRoomItem(item.id);
    await afterChange(item,true);
  }
  async function toggle(item:RoomItem){
    if(item.equipped){await unequipRoomSlot(item.slot);await reload();if(isPingSlot(item.slot))refreshOutfit();return;}
    await equipRoomItem(item.id);
    await afterChange(item,false);
  }
  const canBuy=!!selected&&!selected.owned&&room.balance>=selected.price;
  const thumb=(item:RoomItem,size:number)=>isPingSlot(item.slot)?<OutfitThumb id={item.id} size={size} color={PING_COLOR[personality]}/>:<ItemThumb id={item.id} size={size}/>;
  const slotName=(item:RoomItem)=>SLOTS.find(s=>s.id===item.slot)?.name??'';

  const openShop=()=>{setShopOpen(true);room$.current?.home();};
  const closeShop=()=>{setShopOpen(false);setSelectedId(null);};
  return <View style={{flex:1,backgroundColor:c.background}} onLayout={e=>setAreaH(e.nativeEvent.layout.height)}>
    <Animated.View style={[{width:sceneW,alignSelf:'center',overflow:'hidden'},frameStyle]}>
      <Animated.View style={innerStyle}>
        <RoomScene ref={room$} width={sceneW} equipped={room.equipped} preview={preview} appearance={appearance} personality={personality} active={active} motion={motion}
          viewTop={shopOpen?roomShopTop:roomOpenTop}/>
      </Animated.View>
      <View accessible accessibilityLabel={`${room.balance} moedas`} style={[st.pill,{right:12,backgroundColor:'#000000AA'}]}>
        <CoinIcon size={16}/><Text style={st.pillText}>{room.balance}</Text>
      </View>
      {preview?<View style={[st.pill,{left:12,backgroundColor:c.accent}]}><Text style={[st.pillText,{color:c.background,fontSize:11}]}>PROVANDO</Text></View>:null}
      {!shopOpen?<View style={{position:'absolute',left:0,right:0,bottom:insets.bottom+20,alignItems:'center'}}>
        <Pressable accessibilityRole="button" accessibilityLabel="Abrir lojinha" onPress={openShop}
          style={{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:22,height:52,borderRadius:26,backgroundColor:c.accent,elevation:6,shadowColor:'#000',shadowOpacity:0.3,shadowRadius:8,shadowOffset:{width:0,height:4}}}>
          <Text style={{fontSize:18}}>🛍️</Text><Text style={{color:c.background,fontWeight:'900',fontSize:16}}>Abrir lojinha</Text>
          <View style={{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:c.background+'33',borderRadius:12,paddingHorizontal:8,paddingVertical:3}}>
            <Text style={{color:c.background,fontWeight:'800',fontSize:12}}>{owned}/{room.items.length}</Text>
          </View>
        </Pressable>
      </View>:null}
    </Animated.View>
    {shopOpen?<View style={{flex:1,borderTopWidth:1,borderColor:c.border}}>
      <View style={{flexDirection:'row',alignItems:'center',paddingHorizontal:PAD,paddingTop:12}}>
        <Text style={{color:c.text,fontSize:22,fontWeight:'900',flex:1}}>Lojinha</Text>
        <Text style={{color:c.muted,fontSize:12,fontWeight:'700',marginRight:12}}>{owned} de {room.items.length}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar lojinha e ver o quarto inteiro" onPress={closeShop} hitSlop={8}
          style={{height:36,paddingHorizontal:14,borderRadius:18,justifyContent:'center',borderWidth:1,borderColor:c.border,backgroundColor:c.surface}}>
          <Text style={{color:c.text,fontWeight:'800',fontSize:13}}>Ver quarto ⤢</Text>
        </Pressable>
      </View>
      <ScrollView stickyHeaderIndices={[0]} contentContainerStyle={{paddingBottom:(selected?104:24)+insets.bottom}}>
        <View style={{backgroundColor:c.background,paddingVertical:10}}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:PAD,gap:8}}>
            {FILTERS.map(f=>{const on=filter===f.id;return <Pressable key={f.id} accessibilityRole="button" accessibilityState={{selected:on}} onPress={()=>setFilter(f.id)}
              style={{height:36,paddingHorizontal:14,borderRadius:18,justifyContent:'center',backgroundColor:on?c.accent:c.surface,borderWidth:1,borderColor:on?c.accent:c.border}}>
              <Text style={{color:on?c.background:c.muted,fontWeight:'800',fontSize:13}}>{f.name}</Text></Pressable>;})}
          </ScrollView>
        </View>
        <View style={{paddingHorizontal:PAD,flexDirection:'row',flexWrap:'wrap',gap:GAP,alignSelf:'center',width:inner+PAD*2}}>
          {list.map(item=>{
            const on=selected?.id===item.id;
            const short=!item.owned&&room.balance<item.price;
            return <Pressable key={item.id} accessibilityRole="button" accessibilityState={{selected:on}}
              accessibilityLabel={`${item.name}. ${item.description} ${item.equipped?'Em uso':item.owned?'Você tem':`${item.price} moedas`}`}
              onPress={()=>select(item)}
              style={{width:cardW,backgroundColor:c.surface,borderRadius:16,borderWidth:on?2:1,borderColor:on?c.accent:c.border,overflow:'hidden'}}>
              <View style={{height:104,backgroundColor:c.surfaceRaised,alignItems:'center',justifyContent:'center'}}>
                {thumb(item,88)}
                {item.equipped?<View style={[st.tag,{backgroundColor:c.accent}]}><Text style={[st.tagText,{color:c.background}]}>{isPingSlot(item.slot)?'VESTINDO':'NO QUARTO'}</Text></View>
                  :item.owned?<View style={[st.tag,{backgroundColor:c.border}]}><Text style={[st.tagText,{color:c.text}]}>SEU</Text></View>:null}
              </View>
              <View style={{paddingHorizontal:12,paddingTop:10,paddingBottom:12,gap:4}}>
                <Text numberOfLines={1} style={{color:c.text,fontWeight:'900',fontSize:14}}>{item.name}</Text>
                <Text numberOfLines={2} style={{color:c.muted,fontSize:12,lineHeight:16,height:32}}>{item.description}</Text>
                <View style={{flexDirection:'row',alignItems:'center',gap:6,marginTop:2,height:18}}>
                  {item.owned?<Text style={{color:c.muted,fontSize:12,fontWeight:'800'}}>{slotName(item)}</Text>
                    :<><CoinIcon size={15}/><Text style={{color:short?c.muted:c.text,fontSize:14,fontWeight:'900'}}>{item.price}</Text></>}
                </View>
              </View>
            </Pressable>;
          })}
        </View>
      </ScrollView>
    </View>:null}
    {selected?<View style={[st.bar,{paddingBottom:insets.bottom+12,backgroundColor:c.surfaceRaised,borderColor:c.border}]}>
      <View style={{width:48,height:48,borderRadius:12,backgroundColor:c.surface,alignItems:'center',justifyContent:'center'}}>{thumb(selected,42)}</View>
      <View style={{flex:1}}>
        <Text style={{color:c.text,fontSize:16,fontWeight:'900'}} numberOfLines={1}>{selected.name}</Text>
        <Text style={{color:c.muted,fontSize:12,marginTop:2}} numberOfLines={1}>{!selected.owned&&!canBuy?`Faltam ${selected.price-room.balance} moedas`:slotName(selected)}</Text>
      </View>
      {selected.owned
        ?<Pressable accessibilityRole="button" onPress={()=>toggle(selected)} style={[st.cta,{borderColor:selected.equipped?c.border:c.accent,backgroundColor:selected.equipped?'transparent':c.accent}]}>
          <Text style={{color:selected.equipped?c.text:c.background,fontWeight:'900'}}>{selected.equipped?(isPingSlot(selected.slot)?'TIRAR':'GUARDAR'):(isPingSlot(selected.slot)?'VESTIR':'COLOCAR')}</Text></Pressable>
        :<Pressable accessibilityRole="button"
          onPress={()=>canBuy?showDialog({title:`Comprar ${selected.name}?`,message:`Custa ${selected.price} moedas. Você tem ${room.balance}.`,confirmLabel:'COMPRAR',cancelLabel:'AGORA NÃO',onConfirm:()=>buy(selected)}):room$.current?.noCoins()}
          style={[st.cta,{flexDirection:'row',gap:7,backgroundColor:canBuy?c.accent:c.surface,borderColor:canBuy?c.accent:c.border}]}>
          <CoinIcon size={16}/><Text style={{color:canBuy?c.background:c.muted,fontWeight:'900'}}>{selected.price}</Text></Pressable>}
    </View>:null}
  </View>;
}
const st=StyleSheet.create({
  pill:{position:'absolute',top:10,flexDirection:'row',alignItems:'center',gap:6,borderRadius:14,paddingHorizontal:10,paddingVertical:5},
  pillText:{color:'#FFFFFF',fontWeight:'900',fontSize:14},
  tag:{position:'absolute',top:8,right:8,borderRadius:8,paddingHorizontal:7,paddingVertical:3},
  tagText:{fontSize:9,fontWeight:'900'},
  bar:{position:'absolute',left:0,right:0,bottom:0,paddingHorizontal:PAD,paddingTop:12,borderTopWidth:1,flexDirection:'row',alignItems:'center',gap:12},
  cta:{minHeight:48,minWidth:96,paddingHorizontal:18,borderRadius:14,alignItems:'center',justifyContent:'center',borderWidth:1},
});
