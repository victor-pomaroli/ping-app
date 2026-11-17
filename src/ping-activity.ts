/**
 * Sinais de uso para o Ping: último toque na tela (ele cochila depois de um tempo parado) e a posição
 * do dedo (os olhos seguem). É um objeto simples, escrito pelo toque da tela e lido pelo Ping.
 */
export const activity={lastAt:Date.now(),x:0,y:0,moveAt:0};
export function noteTouch(x:number,y:number){
  activity.lastAt=Date.now();activity.x=x;activity.y=y;activity.moveAt=activity.lastAt;
}
