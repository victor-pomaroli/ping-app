/**
 * Cansaço do Ping: cada toque rápido sobe o nível, e ele desce sozinho quando você para de cutucar.
 * O nível é guardado como (valor, instante) e calculado de novo a cada leitura, então a thread de UI
 * (animação) e a de JS (falas e sons) enxergam sempre o mesmo número sem trocar mensagens.
 * Estágios: 0 descansado, 1 ficando cansado (<0,65), 2 cansado (boceja), 3 tonto (≥1).
 */
export const FATIGUE_GRACE=1.6;
export const FATIGUE_MAX=1.3;
/** Nível de cansaço `now` segundos depois de ter valido `value` em `at` (todos em segundos). */
export function fatigueAt(value:number,at:number,now:number){
  'worklet';
  const d=now-at-1.6;
  if(d<=0)return value;
  if(value>1){
    const toOne=(value-1)/0.17;
    return d<=toOne?value-0.17*d:Math.max(0,1-0.1*(d-toOne));
  }
  return Math.max(0,value-0.1*d);
}
export function fatigueStage(level:number){
  'worklet';
  return level>=1?3:level>=0.65?2:level>=0.35?1:0;
}
/** Acréscimo de um toque: mais forte quando vem logo depois do anterior. */
export function tapFatigue(level:number,gapSeconds:number){
  return Math.min(FATIGUE_MAX,level+(gapSeconds<1.2?0.2:0.1));
}
