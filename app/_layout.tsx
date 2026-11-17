import {Stack,useRouter,useSegments} from 'expo-router';
import {useEffect,useState} from 'react';
import {AppState} from 'react-native';
import {useFonts,Baloo2_700Bold} from '@expo-google-fonts/baloo-2';
import {StatusBar} from 'expo-status-bar';
import {View,ActivityIndicator} from 'react-native';
import * as Notifications from 'expo-notifications';
import {needsOnboarding,getPreferences} from '../src/preferences';
import {setSoundsEnabled} from '../src/ping-sounds';
import {markOpened} from '../src/ping-presence';
import {syncAppIcon} from '../src/app-icon';
import {initDB,reconcileReminders,refreshMoodState} from '../src/store';
import {setupNotifications,ensureNotificationPermission} from '../src/notifications';
import {handleNotificationResponse} from '../src/notification-actions';
import {ThemeProvider,useAppTheme,isDarkAppearance} from '../src/theme';
import {DialogHost} from '../src/components/PingDialog';
import {requestHighlight} from '../src/highlight';
function AppStack(){
  const {colors:theme,appearance}=useAppTheme();
  const router=useRouter();
  const segments=useSegments();
  const [ready,setReady]=useState(false);
  const [needsSetup,setNeedsSetup]=useState(false);
  // Fonte do balão do Ping (Baloo 2 Bold): vem junto do app, então carrega na hora.
  const [fontsLoaded,fontError]=useFonts({Baloo2_700Bold});
  useEffect(()=>{(async()=>{
    await initDB();
    await setupNotifications();
    // Usuários novos recebem o pedido de permissão ao concluir o onboarding.
    if(!(await needsOnboarding()))await ensureNotificationPermission();
    await reconcileReminders();
    await refreshMoodState();
  })().catch(console.warn);},[]);
  // Sons ligados/desligados, registro da abertura (para a saudade) e humor das notificações a cada volta ao app.
  useEffect(()=>{
    getPreferences().then(p=>setSoundsEnabled(p.sounds)).catch(console.warn);
    markOpened();
    const sub=AppState.addEventListener('change',state=>{
      // Troca o ícone do app para o da personalidade só quando o app vai para o fundo (evita piscar na tela).
      if(state==='background'){getPreferences().then(p=>syncAppIcon(p.personality)).catch(console.warn);return;}
      if(state!=='active')return;
      markOpened().then(()=>refreshMoodState()).catch(console.warn);
    });
    return()=>sub.remove();
  },[]);
  // Toque na notificação leva para a aba Hoje com a tarefa destacada (não abre a edição);
  // botões com o app aberto também passam por aqui.
  const lastResponse=Notifications.useLastNotificationResponse();
  useEffect(()=>{
    if(!ready||needsSetup||!lastResponse)return;
    handleNotificationResponse(lastResponse).then(taskId=>{
      if(taskId===null)return;
      requestHighlight(taskId);
      if(router.canDismiss())router.dismissAll();
    }).catch(console.warn).finally(()=>{Notifications.clearLastNotificationResponseAsync().catch(()=>{});});
  },[ready,needsSetup,lastResponse,router]);
  useEffect(()=>{let active=true;initDB().then(needsOnboarding).then(needed=>{if(active){setNeedsSetup(needed);setReady(true);}}).catch(e=>{console.warn(e);if(active)setReady(true);});return()=>{active=false;};},[]);
  useEffect(()=>{if(!ready||segments[0]==='onboarding'||!needsSetup)return;let active=true;needsOnboarding().then(needed=>{if(!active)return;setNeedsSetup(needed);if(needed)router.replace('/onboarding');}).catch(console.warn);return()=>{active=false;};},[ready,needsSetup,segments,router]);
  if(!ready||(!fontsLoaded&&!fontError))return <View style={{flex:1,backgroundColor:theme.background,justifyContent:'center',alignItems:'center'}}><ActivityIndicator color={theme.accent}/></View>;
  return <><StatusBar style={isDarkAppearance(appearance)?"light":"dark"}/><Stack screenOptions={{
    headerStyle:{backgroundColor:theme.background},headerTintColor:theme.text,
    headerShadowVisible:false,contentStyle:{backgroundColor:theme.background},
  }}><Stack.Screen name="index" options={{headerShown:false}}/><Stack.Screen name="onboarding" options={{headerShown:false,gestureEnabled:false}}/><Stack.Screen name="settings" options={{title:"Ajustes"}}/><Stack.Screen name="routines" options={{title:"Minhas rotinas"}}/><Stack.Screen name="archive" options={{title:"Histórico"}}/><Stack.Screen name="progress" options={{title:"Progresso"}}/><Stack.Screen name="edit" options={{title:'Detalhes da tarefa'}}/></Stack><DialogHost/></>;
}
export default function Layout(){return <ThemeProvider><AppStack/></ThemeProvider>;}
