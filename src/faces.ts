import type {ImageSourcePropType} from 'react-native';
import type {NotificationPersonality} from './preferences';
import type {TaskCategory} from './templates';

/**
 * Rostos do Ping: o sino muda de expressão conforme o atraso do lembrete.
 * Há três rostos por personalidade (no horário, +1 h, +3 h). O aviso de +15 min ainda usa o
 * rosto "no horário" até existir uma arte própria para ele.
 * Os PNGs ficam em assets/ping-faces e o plugin with-ping-faces os copia para res/drawable-nodpi
 * com o mesmo nome; a notificação aponta para eles por `data.largeIcon`.
 */
export type FaceMoment='no_horario'|'atraso_1h'|'atraso_3h';
const PREFIX:Record<NotificationPersonality,string>={debochado:'debochado',semPaciencia:'sem_paciencia',deBoa:'de_boa'};
/** Cor de destaque da notificação (ícone pequeno e nome do app), tirada de cada sino. */
const COLORS:Record<NotificationPersonality,Record<FaceMoment,string>>={
  debochado:{no_horario:'#9BE82E',atraso_1h:'#FFC92E',atraso_3h:'#FF9426'},
  semPaciencia:{no_horario:'#FFD23A',atraso_1h:'#FF6A3A',atraso_3h:'#FF3B3B'},
  deBoa:{no_horario:'#7EECB0',atraso_1h:'#5FBCF2',atraso_3h:'#98AEF5'},
};
/** Etapas dos lembretes de tarefa: 0 = horário, 1 = +15 min, 2 = +1 h, 3 = +3 h. */
export function faceMoment(stage:number):FaceMoment{
  return stage>=3?'atraso_3h':stage===2?'atraso_1h':'no_horario';
}
/**
 * Recursos Android e cor do aviso. `largeIcon` é o rosto colorido da personalidade; `smallIcon` é a
 * silhueta da barra de status, que muda só com o atraso (sorrindo → sério → exclamação).
 * Saúde não ganha rosto: o tom ali é sempre neutro e usa o ícone padrão.
 */
export function notificationFace(personality:NotificationPersonality,moment:FaceMoment,category?:TaskCategory){
  if(category==='health')return null;
  return {largeIcon:`ping_face_${PREFIX[personality]}_${moment}`,smallIcon:`ping_notif_${moment}`,color:COLORS[personality][moment]};
}

/** As mesmas imagens para mostrar dentro do app (Ajustes, onboarding). */
export const FACE_IMAGES:Record<NotificationPersonality,Record<FaceMoment,ImageSourcePropType>>={
  debochado:{
    no_horario:require('../assets/ping-faces/ping_face_debochado_no_horario.png'),
    atraso_1h:require('../assets/ping-faces/ping_face_debochado_atraso_1h.png'),
    atraso_3h:require('../assets/ping-faces/ping_face_debochado_atraso_3h.png'),
  },
  semPaciencia:{
    no_horario:require('../assets/ping-faces/ping_face_sem_paciencia_no_horario.png'),
    atraso_1h:require('../assets/ping-faces/ping_face_sem_paciencia_atraso_1h.png'),
    atraso_3h:require('../assets/ping-faces/ping_face_sem_paciencia_atraso_3h.png'),
  },
  deBoa:{
    no_horario:require('../assets/ping-faces/ping_face_de_boa_no_horario.png'),
    atraso_1h:require('../assets/ping-faces/ping_face_de_boa_atraso_1h.png'),
    atraso_3h:require('../assets/ping-faces/ping_face_de_boa_atraso_3h.png'),
  },
};
