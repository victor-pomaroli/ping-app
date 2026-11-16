/**
 * Háptico opcional: se o `expo-haptics` ainda não estiver instalado/compilado no app, vira um
 * no-op em vez de derrubar a tela. Depois de `npx expo install expo-haptics` funciona sozinho.
 */
let Haptics:any=null;
try{Haptics=require('expo-haptics');}catch{Haptics=null;}

/** Toque seco e curto: concluir uma tarefa. */
export function tapLight(){
  try{Promise.resolve(Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle?.Light)).catch(()=>{});}catch{}
}
/** Batida mais firme: momentos de comemoração. */
export function tapSuccess(){
  try{Promise.resolve(Haptics?.notificationAsync?.(Haptics.NotificationFeedbackType?.Success)).catch(()=>{});}catch{}
}
