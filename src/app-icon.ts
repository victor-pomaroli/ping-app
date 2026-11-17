import {Platform} from 'react-native';
import {requireOptionalNativeModule} from 'expo';
import type {NotificationPersonality} from './preferences';

/**
 * Ícone do app por personalidade (Android). O módulo local modules/ping-app-icon liga o activity-alias
 * da personalidade e desliga os outros. Falhas são silenciosas: sem o módulo (ex.: Expo Go) fica o ícone atual.
 */
type NativeAppIcon={getIcon():string;setIcon(key:string):void};
const native=Platform.OS==='android'?requireOptionalNativeModule<NativeAppIcon>('PingAppIcon'):null;
const ICON_KEY:Record<NotificationPersonality,string>={debochado:'debochado',deBoa:'deboa',semPaciencia:'sempaciencia'};

/** Aplica o ícone da personalidade se for diferente do atual. Chamar com o app indo para o fundo: alguns launchers piscam ao trocar. */
export function syncAppIcon(personality:NotificationPersonality){
  if(!native)return;
  try{
    const key=ICON_KEY[personality];
    if(native.getIcon()!==key)native.setIcon(key);
  }catch(error){console.warn('syncAppIcon',error);}
}
