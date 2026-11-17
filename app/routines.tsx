import React,{useCallback,useState} from 'react';
import {View,Text,ScrollView,Pressable} from 'react-native';
import {showDialog,showError} from '../src/components/PingDialog';
import {useFocusEffect,useRouter} from 'expo-router';
import {listRoutines,setRoutineActive,endRoutine,routineHistory,Task,taskRecurrence} from '../src/store';
import {recurrenceLabel,upcomingDays,WEEKDAY_SHORT} from '../src/recurrence';
/** "Todos os dias", "Seg, qua e sex", "Todo dia 15". */
function routineWhen(t:Task){const r=taskRecurrence(t);if(r.kind==='daily')return 'Todos os dias';const label=recurrenceLabel(r);return label.charAt(0).toUpperCase()+label.slice(1);}
/** Só para semanal/mensal: quando é a próxima vez. */
function nextOccurrence(t:Task){if(!t.daily_active)return '';const r=taskRecurrence(t);if(r.kind==='daily')return '';const [d]=upcomingDays(r,new Date(),1);return d?`Próxima: ${WEEKDAY_SHORT[d.getDay()]}, ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`:'';}
import {useAppTheme} from '../src/theme';
export default function Routines(){
 const {colors:c}=useAppTheme();const router=useRouter();
 const [items,setItems]=useState<Task[]>([]);
 const [history,setHistory]=useState<Record<number,{day:string;completed:number}[]>>({});
 const load=useCallback(async()=>{const rows=await listRoutines();setItems(rows);const records=await Promise.all(rows.map(t=>routineHistory(t.id,7)));setHistory(Object.fromEntries(rows.map((t,i)=>[t.id,records[i]])));},[]);
 useFocusEffect(useCallback(()=>{load().catch(e=>showError('Erro',e));},[load]));
 async function toggle(t:Task){try{await setRoutineActive(t.id,!t.daily_active);await load();}catch(e){showError('Erro',e);}}
 return <ScrollView style={{flex:1,backgroundColor:c.background}} contentContainerStyle={{padding:22,paddingBottom:70,gap:16}}>
 <Text style={{fontSize:31,color:c.text,fontWeight:'900'}}>Minhas rotinas.</Text>
 <Text style={{color:c.muted,lineHeight:20}}>Pause, retome, edite ou encerre tarefas que se repetem todo dia, toda semana ou todo mês. O histórico fica compacto.</Text>
 {items.length===0?<Text style={{color:c.muted,marginTop:30}}>Nenhuma rotina criada. Escolha “Repetir” ao criar uma missão.</Text>:null}
 {items.map(t=><View key={t.id} style={{backgroundColor:c.surface,borderColor:c.border,borderWidth:1,borderRadius:12,padding:16,gap:12}}>
   <View style={{flexDirection:'row',justifyContent:'space-between',gap:10}}><Text style={{color:c.text,fontSize:17,fontWeight:'900',flex:1}}>{t.title}</Text><Text style={{color:t.daily_active?c.accent:c.muted,fontWeight:'800',fontSize:11}}>{t.daily_active?'ATIVA':'PAUSADA'}</Text></View>
   <Text style={{color:c.muted,fontSize:12}}>↻ {routineWhen(t)}{t.no_due?' · sem horário':' · '+new Date(t.due_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</Text>
   {nextOccurrence(t)?<Text style={{color:c.muted,fontSize:12,marginTop:-6}}>{nextOccurrence(t)}</Text>:null}
   <View style={{flexDirection:'row',gap:8}}>
     <Pressable accessibilityRole="button" onPress={()=>toggle(t)} style={{backgroundColor:c.accentSoft,padding:11,borderRadius:7,flex:1,alignItems:'center'}}><Text style={{color:c.accent,fontWeight:'900'}}>{t.daily_active?'PAUSAR':'RETOMAR'}</Text></Pressable>
     <Pressable accessibilityRole="button" onPress={()=>router.push({pathname:'/edit',params:{id:String(t.id)}})} style={{backgroundColor:c.surfaceRaised,padding:11,borderRadius:7,flex:1,alignItems:'center'}}><Text style={{color:c.text,fontWeight:'900'}}>EDITAR</Text></Pressable>
   </View>
   <Pressable accessibilityRole="button" onPress={()=>showDialog({eyebrow:'PING / ROTINA',title:'Encerrar rotina?',message:'A tarefa deixará de se repetir. O histórico será preservado.',cancelLabel:'MANTER',confirmLabel:'ENCERRAR',destructive:true,onConfirm:()=>endRoutine(t.id).then(load).catch(e=>showError('Não foi possível encerrar',e))})}><Text style={{color:c.muted,fontSize:12,textAlign:'center',textDecorationLine:'underline'}}>Encerrar repetição</Text></Pressable>
   <Text style={{color:c.muted,fontSize:11}}>ÚLTIMOS REGISTROS</Text>
   <Text style={{color:c.text,fontSize:12}}>{history[t.id]?.length?history[t.id].map(h=>h.day.slice(5)+' '+(h.completed?'✓':'–')).join('  ·  '):'Nenhuma conclusão registrada ainda'}</Text>
 </View>)}
 </ScrollView>;
}
