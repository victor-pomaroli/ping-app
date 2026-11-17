import type {NotificationPersonality} from './preferences';
import type {NotificationMood} from './faces';

/**
 * O sentimento do Ping nas notificações. Em vez de olhar só o atraso da tarefa, junta o que ele "sabe" no momento:
 * etapa do aviso (na hora, +15 min, +1 h, +3 h), quantas vezes você adiou esta tarefa e quantas estão atrasadas hoje.
 */
export type MoodInput={stage:number;snoozes:number;overdueToday:number};
/** Quantas atrasadas bastam para o Ping ficar irritado mesmo numa tarefa que acabou de vencer. */
export const MANY_OVERDUE=3;
/** A partir de quantos adiamentos o Ping fica cansado (e o botão vira "Reagendar"). */
export const TIRED_SNOOZES=2;

export function reminderMood({stage,snoozes,overdueToday}:MoodInput):NotificationMood{
  if(snoozes>=TIRED_SNOOZES)return 'cansado';
  if(stage>=3||(overdueToday>=MANY_OVERDUE&&stage>=1))return 'irritado';
  if(stage>=2)return 'impaciente';
  return 'animado';
}
/** Eventos avisam antes de começar: quanto mais perto, mais pressa. */
export function eventMood(minutesBefore:number):NotificationMood{
  return minutesBefore<=0?'irritado':minutesBefore<60?'impaciente':'animado';
}
/** Tom do som do aviso: urgente só quando está irritado; calmo para cansaço, saudade e dia limpo. */
export type Tone='normal'|'urgent'|'calm';
export function toneOfMood(mood:NotificationMood):Tone{
  return mood==='irritado'?'urgent':mood==='cansado'||mood==='ciumes'||mood==='festa'?'calm':'normal';
}
/** Estado escrito no cabeçalho do aviso ("Ping · impaciente"). */
const LABELS:Record<NotificationPersonality,Record<NotificationMood,string>>={
  debochado:{animado:'animado',impaciente:'impaciente',irritado:'irritado',cansado:'cansado',ciumes:'ressentido',festa:'convencido'},
  semPaciencia:{animado:'pilhado',impaciente:'impaciente',irritado:'furioso',cansado:'exausto',ciumes:'bravo',festa:'satisfeito'},
  deBoa:{animado:'tranquilo',impaciente:'sereno',irritado:'preocupado',cansado:'cansadinho',ciumes:'com saudade',festa:'feliz'},
};
export function moodLabel(personality:NotificationPersonality,mood:NotificationMood){return LABELS[personality][mood];}
const DELAY:Record<number,string>={1:'15 min de atraso',2:'1 h de atraso',3:'3 h de atraso'};
/** Linha de contexto sob a mensagem: atraso, atrasadas do dia, adiamentos e subtarefas. */
export function contextLine({stage,snoozes,overdueToday}:MoodInput,subtasks:string){
  const parts:string[]=[];
  if(DELAY[stage])parts.push(DELAY[stage]);
  if(overdueToday>=MANY_OVERDUE&&stage>=1)parts.push(`${overdueToday} atrasadas hoje`);
  if(snoozes>=TIRED_SNOOZES)parts.push(`Adiada ${snoozes} vezes`);
  if(subtasks)parts.push(subtasks);
  return parts.join(' · ');
}
