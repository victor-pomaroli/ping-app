/**
 * Arquivo do backup: gravar/compartilhar e escolher/ler. Usa expo-sharing e expo-document-picker
 * (dependências nativas: exigem `npx expo install expo-sharing expo-document-picker` e novo build).
 */
import {File,Paths} from 'expo-file-system';
import Constants from 'expo-constants';
import {exportBackupText,restoreBackupText} from './store';
import type {RestoreSummary} from './backup';

const stamp=()=>new Date().toISOString().slice(0,10);
/** Gera o arquivo e abre o menu de compartilhar do Android (salvar no Drive, enviar, etc.). */
export async function shareBackup():Promise<void>{
  const text=await exportBackupText(Constants.expoConfig?.version??'?');
  const file=new File(Paths.cache,`ping-backup-${stamp()}.json`);
  if(file.exists)file.delete();
  file.create();
  file.write(text);
  // @ts-ignore módulo instalado com `npx expo install expo-sharing`
  const Sharing=await import('expo-sharing');
  if(!(await Sharing.isAvailableAsync()))throw new Error('Este aparelho não consegue compartilhar arquivos.');
  await Sharing.shareAsync(file.uri,{mimeType:'application/json',dialogTitle:'Salvar backup do Ping',UTI:'public.json'});
}
/** Abre o seletor de arquivos e restaura. Devolve null se o usuário cancelou. */
export async function pickAndRestoreBackup():Promise<RestoreSummary|null>{
  // @ts-ignore módulo instalado com `npx expo install expo-document-picker`
  const Picker=await import('expo-document-picker');
  const res=await Picker.getDocumentAsync({type:['application/json','text/plain','*/*'],copyToCacheDirectory:true,multiple:false});
  if(res.canceled||!res.assets?.length)return null;
  const text=await new File(res.assets[0].uri).text();
  return restoreBackupText(text);
}
