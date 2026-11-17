import React from 'react';
import {View,Text,ScrollView,Pressable} from 'react-native';
import {useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {SettingsScreen} from '../src/components/SettingsScreen';
import {useAppTheme} from '../src/theme';
import {showDialog,showError} from '../src/components/PingDialog';
import {shareBackup,pickAndRestoreBackup} from '../src/backup-io';
import {addTestCoins} from '../src/store';
import {CoinIcon} from '../src/components/CoinIcon';

/** Ferramentas de teste visíveis em Ajustes. Mude para false antes de publicar para o público. */
const TEST_TOOLS=true;

export default function SettingsPage(){
  const {colors:c}=useAppTheme();
  const router=useRouter();
  const insets=useSafeAreaInsets();
  return <ScrollView style={{flex:1,backgroundColor:c.background}} contentContainerStyle={{paddingHorizontal:23,paddingTop:20,paddingBottom:insets.bottom+50}}>
    <SettingsScreen onDataDeleted={()=>router.back()}/>
    <View style={{marginTop:22,padding:17,backgroundColor:c.surface,borderRadius:10,borderWidth:1,borderColor:c.border}}>
      <Text style={{color:c.accent,fontWeight:'900'}}>BACKUP DOS SEUS DADOS</Text>
      <Text style={{color:c.muted,fontSize:12,marginTop:6}}>Tarefas, rotinas, moedas e conquistas num arquivo seu, sem nuvem. Use para trocar de aparelho ou antes de reinstalar.</Text>
      <View style={{flexDirection:'row',gap:10,marginTop:14}}>
        <Pressable accessibilityRole="button" onPress={()=>shareBackup().catch(e=>showError('Não foi possível gerar o backup',e))} style={{flex:1,padding:13,borderRadius:8,borderWidth:1,borderColor:c.accent,alignItems:'center'}}>
          <Text style={{color:c.accent,fontWeight:'900'}}>EXPORTAR</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={()=>showDialog({title:'Restaurar backup?',message:'Isto substitui as tarefas, moedas e conquistas deste aparelho pelas do arquivo. Faça um backup antes se quiser guardar o que existe agora.',confirmLabel:'ESCOLHER ARQUIVO',cancelLabel:'CANCELAR',destructive:true,
          onConfirm:async()=>{try{const r=await pickAndRestoreBackup();if(r)showDialog({title:'Backup restaurado',message:`${r.tasks} tarefas, ${r.coinsBalance} moedas e ${r.achievements} conquistas.`,confirmLabel:'OK'});}catch(e){showError('Não foi possível restaurar',e);}}})}
          style={{flex:1,padding:13,borderRadius:8,borderWidth:1,borderColor:c.border,alignItems:'center'}}>
          <Text style={{color:c.text,fontWeight:'900'}}>RESTAURAR</Text>
        </Pressable>
      </View>
    </View>
    <Pressable accessibilityRole="button" onPress={()=>router.push('/progress')} style={{marginTop:22,padding:17,backgroundColor:c.surface,borderRadius:10,borderWidth:1,borderColor:c.border}}>
      <Text style={{color:c.accent,fontWeight:'900'}}>PROGRESSO COM O PING →</Text>
      <Text style={{color:c.muted,fontSize:12,marginTop:6}}>Moedas, amizade e conquistas.</Text>
    </Pressable>
    {TEST_TOOLS?<View style={{marginTop:22,padding:17,backgroundColor:c.surface,borderRadius:10,borderWidth:1,borderStyle:'dashed',borderColor:c.warning}}>
      <Text style={{color:c.warning,fontWeight:'900'}}>FERRAMENTAS DE TESTE</Text>
      <Text style={{color:c.muted,fontSize:12,marginTop:6}}>Ganhe moedas sem concluir tarefas, só para experimentar a loja. Não rende amizade nem conquistas.</Text>
      <View style={{flexDirection:'row',gap:10,marginTop:14}}>
        {[50,200,500].map(n=><Pressable key={n} accessibilityRole="button" accessibilityLabel={`Ganhar ${n} moedas de teste`} onPress={()=>addTestCoins(n).then(b=>showDialog({title:`+${n} moedas`,message:`Saldo agora: ${b}.`,confirmLabel:'OK'})).catch(e=>showError('Não foi possível',e))} style={{flex:1,minHeight:44,borderRadius:8,borderWidth:1,borderColor:c.warning,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:6}}>
          <CoinIcon size={16}/><Text style={{color:c.text,fontWeight:'900'}}>+{n}</Text>
        </Pressable>)}
      </View>
    </View>:null}
    <Pressable accessibilityRole="button" onPress={()=>router.push('/archive')} style={{marginTop:22,padding:17,backgroundColor:c.surface,borderRadius:10,borderWidth:1,borderColor:c.border}}>
      <Text style={{color:c.accent,fontWeight:'900'}}>HISTÓRICO DE TAREFAS ARQUIVADAS →</Text>
      <Text style={{color:c.muted,fontSize:12,marginTop:6}}>Consulte e restaure tarefas concluídas há mais de 30 dias.</Text>
    </Pressable>
  </ScrollView>;
}
