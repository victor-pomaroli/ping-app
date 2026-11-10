import React,{useEffect,useState} from 'react';
import {View,Text,Switch,Pressable,StyleSheet,Linking,TextInput,Image} from 'react-native';
import {showDialog,showError} from './PingDialog';
import * as Notifications from 'expo-notifications';
import {getPreferences,setPreference,Preferences,AddressStyle,NotificationPersonality} from '../preferences';
import {rescheduleAllReminders,deleteAllTasks} from '../store';
import {testNotification} from '../notifications';
import {FACE_IMAGES,FaceMoment} from '../faces';
import {useAppTheme,ThemeColors,Appearance,palettes,appearances,appearanceNames} from '../theme';

export function SettingsScreen({onDataDeleted}:{onDataDeleted:()=>void}){
 const {colors:c,appearance,changeAppearance}=useAppTheme();
 const s=React.useMemo(()=>createStyles(c),[c]);
 const [prefs,setPrefs]=useState<Preferences>({notifications:true,privatePreviews:false,appearance:'dark',displayName:'',addressStyle:'neutral',personality:'debochado',eventAlerts:[30]});
 const [busy,setBusy]=useState(false);
 const [permission,setPermission]=useState('Verificando...');
 const [themeBusy,setThemeBusy]=useState(false);
 const [scheduledCount,setScheduledCount]=useState<number|null>(null);
 const [testing,setTesting]=useState(false);
 const [nameDraft,setNameDraft]=useState('');
 useEffect(()=>{getPreferences().then(p=>setNameDraft(p.displayName)).catch(console.warn);},[]);
 async function saveProfile(){
   if(busy)return;
   setBusy(true);
   try{
     const name=nameDraft.trim().slice(0,32);
     await setPreference('displayName',name);
     setPrefs(prev=>({...prev,displayName:name}));
     await rescheduleAllReminders();
     showDialog({eyebrow:'PING / RECADO',title:'Salvo',message:'As próximas notificações vão usar seu nome.'});
   }catch(e){showError('Erro ao salvar perfil',e);}
   finally{setBusy(false);}
 }
 async function chooseAddressStyle(value:AddressStyle){
   if(busy)return;
   setBusy(true);
   try{await setPreference('addressStyle',value);setPrefs(prev=>({...prev,addressStyle:value}));await rescheduleAllReminders();}
   catch(e){showError('Erro ao salvar tratamento',e);}
   finally{setBusy(false);}
 }
 async function choosePersonality(value:NotificationPersonality){
   if(busy||prefs.personality===value)return;
   setBusy(true);
   try{
     await setPreference('personality',value);
     setPrefs(prev=>({...prev,personality:value}));
     await rescheduleAllReminders();
     await checkScheduled();
   }catch(e){showError('Não foi possível salvar a personalidade',e);}
   finally{setBusy(false);}
 }
 async function checkScheduled(){
   try{const entries=await Notifications.getAllScheduledNotificationsAsync();setScheduledCount(entries.filter(n=>n.content.data?.kind==='task_due').length);}
   catch(e){showError('Não foi possível consultar',e);}
 }
 async function sendTest(){
   if(testing)return;
   setTesting(true);
   try{await testNotification();showDialog({eyebrow:'PING / RECADO',title:'Teste agendado',message:'O Ping vai mandar três avisos, aos 10, 20 e 30 segundos, com o rosto de cada momento: no horário, 1 h e 3 h de atraso. Bloqueie a tela ou feche o app para ver.'});}
   catch(e){showError('Teste não agendado',e);}
   finally{setTesting(false);}
 }
 async function chooseTheme(next:Appearance){
   if(themeBusy||next===appearance)return;
   setThemeBusy(true);
   try{await changeAppearance(next);}catch(e){showError('Não foi possível salvar o tema',e);}
   finally{setThemeBusy(false);}
 }
 useEffect(()=>{getPreferences().then(setPrefs).catch(console.warn);checkPermission();checkScheduled();},[]);
 async function checkPermission(){
   try{const result=await Notifications.getPermissionsAsync();setPermission(result.granted?'Permitidas':'Não permitidas');}
   catch{setPermission('Não foi possível verificar');}
 }
 async function change(key:keyof Preferences,value:boolean){
   if(busy)return;
   setBusy(true);
   try{
     await setPreference(key,value);
     setPrefs(prev=>({...prev,[key]:value}));
     await rescheduleAllReminders();
   }catch(e){showError('Não foi possível salvar',e);}
   finally{setBusy(false);}
 }
 function confirmDelete(){
   showDialog({eyebrow:'PING / EXCLUSÃO',title:'Apagar todas as tarefas?',message:'Essa ação exclui permanentemente todas as tarefas e cancela seus lembretes. Não é possível desfazer.',cancelLabel:'CANCELAR',confirmLabel:'APAGAR TUDO',destructive:true,onConfirm:async()=>{
     if(busy)return;
     setBusy(true);
     try{await deleteAllTasks();onDataDeleted();showDialog({eyebrow:'PING / RECADO',title:'Pronto',message:'Todas as tarefas foram apagadas.'});}
     catch(e){showError('Não foi possível apagar',e);}
     finally{setBusy(false);}
   }});
 }
 return <View>
   <Text style={s.kicker}>PING / CONTROLE</Text>
   <Text style={s.heading}>Do seu jeito.</Text>
   <Text style={s.subtitle}>Você decide o que aparece, o que toca e o que fica.</Text>
   <Text style={s.section}>APARÊNCIA</Text>
   <Text style={s.detail}>Escolha como o Ping aparece. A preferência fica salva neste aparelho.</Text>
   <View style={s.themeRow}>
     {appearances.map(key=>{
       const palette=palettes[key],selected=appearance===key;
       return <Pressable key={key} accessibilityRole="radio" accessibilityState={{checked:selected}}
         disabled={themeBusy} onPress={()=>chooseTheme(key)} style={[s.themeOption,selected&&s.themeOptionSelected]}>
         <View style={[s.themePreview,{backgroundColor:palette.background,borderColor:palette.border}]}>
           <View style={[s.previewHeader,{backgroundColor:palette.accent}]}/>
           <View style={[s.previewCard,{backgroundColor:palette.surface,borderColor:palette.border}]}>
             <View style={[s.previewLine,{backgroundColor:palette.text,width:'72%'}]}/>
             <View style={[s.previewLine,{backgroundColor:palette.muted,width:'50%',opacity:0.6}]}/>
           </View>
           <View style={[s.previewNav,{backgroundColor:palette.surface,borderColor:palette.border}]}>
             <View style={[s.previewDot,{backgroundColor:palette.accent}]}/>
             <View style={[s.previewDot,{backgroundColor:palette.muted}]}/>
             <View style={[s.previewDot,{backgroundColor:palette.muted}]}/>
           </View>
         </View>
         <Text style={s.themeName}>{appearanceNames[key]}</Text>
         <Text style={s.themeState}>{selected?'✓ SELECIONADO':'TOQUE PARA USAR'}</Text>
       </Pressable>;
     })}
   </View>
   <Text style={s.section}>SEU PERFIL</Text>
   <Text style={s.detail}>Personalize como o Ping fala com você. Tudo fica salvo neste aparelho.</Text>
   <View style={[s.panel,{marginTop:12,paddingVertical:14}]}>
     <Text style={s.title}>Como podemos te chamar?</Text>
     <TextInput accessibilityLabel="Nome para notificações" value={nameDraft} onChangeText={setNameDraft} maxLength={32} placeholder="Seu nome (opcional)" placeholderTextColor={c.muted} style={[s.nameInput,{color:c.text,borderColor:c.border,backgroundColor:c.background}]}/>
     <Pressable accessibilityRole="button" disabled={busy} onPress={saveProfile} style={[s.saveButton,{backgroundColor:c.accent}]}><Text style={{color:c.background,fontWeight:'900'}}>SALVAR NOME</Text></Pressable>
     <Text style={[s.title,{marginTop:18}]}>Como prefere ser tratado?</Text>
     <Text style={s.detail}>Escolha o tom das expressões. Não precisa informar seu gênero.</Text>
     <View style={s.addressRow}>
       {([['masculine','Masculino'],['feminine','Feminino'],['neutral','Neutro']] as [AddressStyle,string][]).map(([key,label])=><Pressable key={key} accessibilityRole="radio" accessibilityState={{checked:prefs.addressStyle===key}} disabled={busy} onPress={()=>chooseAddressStyle(key)} style={[s.addressOption,{borderColor:prefs.addressStyle===key?c.accent:c.border,backgroundColor:prefs.addressStyle===key?c.accentSoft:c.background}]}><Text style={{color:prefs.addressStyle===key?c.text:c.muted,fontWeight:'700',fontSize:11}}>{label}</Text></Pressable>)}
     </View>
   </View>
   <Text style={s.section}>PERSONALIDADE DO PING</Text>
   <Text style={s.detail}>Escolha como o Ping vai cobrar suas tarefas. A preferência fica salva e atualiza os lembretes futuros.</Text>
   <View style={s.personalityList}>
    {([
     ['debochado','😏 Debochado','O Ping original: sarcasmo e ironia.','A responsabilidade bateu de novo. Vai atender?'],
     ['semPaciencia','🔥 Sem Paciência','Mais direto, impaciente e exagerado.','15 MINUTOS E A PENDÊNCIA CONTINUA! Bora resolver.'],
     ['deBoa','🌿 De Boa','Leve, tranquilo e sem pressão.','Seu compromisso ainda está pendente. Vale dar uma olhada.']
    ] as [NotificationPersonality,string,string,string][]).map(([key,label,description,preview])=>{
      const selected=prefs.personality===key;
      return <Pressable key={key} accessibilityRole="radio" accessibilityState={{checked:selected}} disabled={busy} onPress={()=>choosePersonality(key)} style={[s.personalityOption,{borderColor:selected?c.accent:c.border,backgroundColor:c.surface}]}>
        <View style={s.personalityHeading}><Text style={[s.title,{flex:1}]}>{label}</Text><Text style={{color:c.accent,fontWeight:'900'}}>{selected?'✓ ATIVO':'○'}</Text></View>
        <Text style={s.detail}>{description}</Text>
        {/* Como o sino reage conforme o atraso: no horário, +1 h e +3 h. */}
        <View style={s.faceRow} accessible accessibilityLabel={`Rostos do Ping ${label}: no horário, uma hora e três horas de atraso`}>
          {(['no_horario','atraso_1h','atraso_3h'] as FaceMoment[]).map((moment,i)=><View key={moment} style={s.faceCell}>
            <Image source={FACE_IMAGES[key][moment]} style={s.faceImage}/>
            <Text style={{color:c.muted,fontSize:10,fontWeight:'800',letterSpacing:0.6}}>{['NA HORA','+1 H','+3 H'][i]}</Text>
          </View>)}
        </View>
        <View style={[s.personalityPreview,{backgroundColor:c.background,borderColor:c.border}]}><Text style={{color:c.muted,fontSize:11,lineHeight:17}}>{preview}</Text></View>
      </Pressable>;
    })}
   </View>
   <Text style={s.section}>NOTIFICAÇÕES</Text>
   <View style={s.panel}>
     <View style={s.row}><View style={s.copy}><Text style={s.title}>Lembretes ativos</Text><Text style={s.detail}>Ative ou pause os avisos de tarefas.</Text></View><Switch disabled={busy} value={prefs.notifications} onValueChange={v=>change('notifications',v)} trackColor={{false:c.border,true:c.accentSoft}} thumbColor={prefs.notifications?c.accent:c.muted}/></View>
     <View style={s.separator}/>
     <View style={s.row}><View style={s.copy}><Text style={s.title}>Ocultar detalhes</Text><Text style={s.detail}>Não mostrar o nome da tarefa no título ou corpo das novas notificações.</Text></View><Switch disabled={busy} value={prefs.privatePreviews} onValueChange={v=>change('privatePreviews',v)} trackColor={{false:c.border,true:c.accentSoft}} thumbColor={prefs.privatePreviews?c.accent:c.muted}/></View>
     <View style={s.separator}/>
     <Pressable accessibilityRole="button" style={s.row} onPress={checkScheduled}><View style={s.copy}><Text style={s.title}>Lembretes programados ↻</Text><Text style={s.detail}>{scheduledCount===null?'Toque para consultar':scheduledCount+' notificações de tarefas aguardando disparo. Toque para atualizar.'}</Text></View></Pressable>
     <View style={s.separator}/>
     <Pressable accessibilityRole="button" disabled={testing} style={s.row} onPress={sendTest}><View style={s.copy}><Text style={s.title}>Testar notificações com os rostos</Text><Text style={s.detail}>Três avisos em 30 segundos, um para cada rosto da sua personalidade. Funciona com o app fechado.</Text></View></Pressable>
     <View style={s.separator}/>
     <Pressable style={s.row} onPress={()=>Linking.openSettings().catch(e=>showError('Erro',e))}><View style={s.copy}><Text style={s.title}>Permissões do Android ↗</Text><Text style={s.detail}>Status: {permission}. Ajuste sons, alertas e permissões nas configurações do aparelho.</Text></View></Pressable>
   </View>
   <Text style={s.section}>PRIVACIDADE E DADOS</Text>
   <View style={s.panel}>
     <View style={s.row}><View style={s.copy}><Text style={s.title}>Armazenamento local</Text><Text style={s.detail}>As tarefas são salvas no banco SQLite deste dispositivo. Não há conta ou sincronização em nuvem implementada.</Text></View></View>
     <View style={s.separator}/>
     <Pressable disabled={busy} style={s.row} onPress={confirmDelete}><View style={s.copy}><Text style={[s.title,{color:c.danger}]}>Apagar todas as tarefas</Text><Text style={s.detail}>Exclui tarefas e lembretes associados. Não pode ser desfeito.</Text></View></Pressable>
   </View>
   <Text style={s.section}>SOBRE</Text>
   <View style={s.panel}><View style={s.row}><View style={s.copy}><Text style={s.title}>ping.</Text><Text style={s.detail}>Seus lembretes, suas regras. Versão 1.0.2.</Text></View></View></View>
 </View>;
}
const createStyles=(c:ThemeColors)=>StyleSheet.create({
 personalityList:{gap:10,marginTop:13},
 personalityOption:{borderWidth:1.5,borderRadius:12,padding:14},
 personalityHeading:{flexDirection:'row',alignItems:'center'},
 faceRow:{flexDirection:'row',gap:10,marginTop:12},
 faceCell:{alignItems:'center',gap:4},
 faceImage:{width:56,height:56,borderRadius:12},
 personalityPreview:{marginTop:10,padding:11,borderWidth:1,borderRadius:8},
 nameInput:{borderWidth:1,borderRadius:9,paddingHorizontal:12,paddingVertical:12,marginTop:7},
 saveButton:{alignItems:'center',padding:13,borderRadius:9,marginTop:10},
 addressRow:{flexDirection:'row',gap:7,marginTop:12},
 addressOption:{flex:1,alignItems:'center',borderWidth:1,borderRadius:9,paddingVertical:12,paddingHorizontal:3},
 themeRow:{flexDirection:'row',flexWrap:'wrap',gap:12,marginTop:14},
 themeOption:{flexGrow:1,flexBasis:'40%',padding:9,borderRadius:13,borderWidth:1,borderColor:c.border,backgroundColor:c.surface},
 themeOptionSelected:{borderColor:c.accent,borderWidth:2,padding:8},
 themePreview:{height:114,borderRadius:9,borderWidth:1,padding:12,justifyContent:'space-between'},
 previewHeader:{width:36,height:8,borderRadius:5},
 previewCard:{borderRadius:6,borderWidth:1,padding:10,gap:7},
 previewLine:{height:5,borderRadius:4},
 previewNav:{height:18,borderWidth:1,borderRadius:5,flexDirection:'row',justifyContent:'space-evenly',alignItems:'center'},
 previewDot:{height:5,width:13,borderRadius:3},
 themeName:{color:c.text,fontWeight:'800',fontSize:12,marginTop:10},
 themeState:{color:c.accent,fontWeight:'800',fontSize:9,marginTop:5,letterSpacing:0.5},
 kicker:{color:c.accent,fontSize:10,fontWeight:'900',letterSpacing:2,marginBottom:13},
 heading:{color:c.text,fontSize:38,fontWeight:'900',letterSpacing:-1.5,marginBottom:10},
 subtitle:{color:c.muted,fontSize:13,lineHeight:20,marginBottom:15},
 section:{color:c.accent,fontSize:10,fontWeight:'900',letterSpacing:1.5,marginTop:24,marginBottom:12},
 panel:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:12,paddingHorizontal:15},
 row:{flexDirection:'row',alignItems:'center',paddingVertical:17,gap:14},
 copy:{flex:1},title:{color:c.text,fontSize:14,fontWeight:'800',marginBottom:5},
 detail:{color:c.muted,fontSize:12,lineHeight:18},
 separator:{height:1,backgroundColor:c.border}
});
