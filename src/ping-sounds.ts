import {createAudioPlayer,setAudioModeAsync,type AudioPlayer} from 'expo-audio';

/**
 * Sons do Ping (curtos e sintetizados, sem direitos autorais). Cada som tem seu player, criado na
 * primeira vez e reaproveitado. Respeitam o modo silencioso do celular e o interruptor "Sons do Ping".
 */
const SOURCES={
  tap1:require('../assets/sounds/tap1.wav'),tap2:require('../assets/sounds/tap2.wav'),tap3:require('../assets/sounds/tap3.wav'),
  ring:require('../assets/sounds/ring.wav'),
  say_debochado:require('../assets/sounds/say_debochado.wav'),say_semPaciencia:require('../assets/sounds/say_semPaciencia.wav'),say_deBoa:require('../assets/sounds/say_deBoa.wav'),
  yawn:require('../assets/sounds/yawn.wav'),dizzy:require('../assets/sounds/dizzy.wav'),recover:require('../assets/sounds/recover.wav'),
  startle:require('../assets/sounds/startle.wav'),party:require('../assets/sounds/party.wav'),peek:require('../assets/sounds/peek.wav'),
  pout:require('../assets/sounds/pout.wav'),inflate:require('../assets/sounds/inflate.wav'),
} as const;
export type SoundName=keyof typeof SOURCES;

let enabled=true;
let modeSet=false;
const players:Partial<Record<SoundName,AudioPlayer>>={};
export function setSoundsEnabled(value:boolean){enabled=value;}
export function soundsEnabled(){return enabled;}

function playerFor(name:SoundName){
  let player=players[name];
  if(!player){player=createAudioPlayer(SOURCES[name]);players[name]=player;}
  return player;
}
/** Toca um som do início. `rate` muda o tom/velocidade (0,85 = mais grave e lento). */
export function playSound(name:SoundName,options:{volume?:number;rate?:number}={}){
  if(!enabled)return;
  try{
    if(!modeSet){modeSet=true;setAudioModeAsync({playsInSilentMode:false,interruptionMode:'mixWithOthers'}).catch(()=>{});}
    const player=playerFor(name);
    player.volume=Math.max(0,Math.min(1,options.volume??0.8));
    player.setPlaybackRate(options.rate??1);
    player.seekTo(0).catch(()=>{});
    player.play();
  }catch(e){console.warn('[sounds] falhou',name,e);}
}
export function stopSound(name:SoundName){
  try{players[name]?.pause();}catch{}
}
/** Um dos três "dings" de toque, mais grave e baixo quanto mais cansado o Ping está (`fatigue` de 0 a 1). */
export function playTap(fatigue:number){
  const f=Math.min(1,fatigue);
  playSound((['tap1','tap2','tap3'] as const)[Math.floor(Math.random()*3)],{volume:0.8-0.45*f,rate:1-0.22*f});
}
