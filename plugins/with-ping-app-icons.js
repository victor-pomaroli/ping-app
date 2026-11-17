// Ícone do app por personalidade (Android): cria um activity-alias por ícone (só um habilitado) e
// copia os recursos dos ícones alternativos. O ícone padrão (Debochado) é o do próprio Expo
// (@mipmap/ic_launcher); o módulo local modules/ping-app-icon liga e desliga os aliases.
// O MainActivity perde a categoria LAUNCHER: quem abre o app é sempre o alias habilitado.
const fs=require('fs');
const path=require('path');
const {withAndroidManifest,withDangerousMod}=require('expo/config-plugins');

const ICONS=[
  {key:'debochado',icon:'@mipmap/ic_launcher',round:'@mipmap/ic_launcher_round',enabled:true},
  {key:'deboa',icon:'@mipmap/ping_icon_deboa',enabled:false},
  {key:'sempaciencia',icon:'@mipmap/ping_icon_sempaciencia',enabled:false},
];

function withManifest(config){
  return withAndroidManifest(config,cfg=>{
    const app=cfg.modResults.manifest.application[0];
    const main=(app.activity||[]).find(a=>a.$['android:name']==='.MainActivity');
    if(!main)throw new Error('[with-ping-app-icons] .MainActivity não encontrada no manifest');
    for(const filter of main['intent-filter']||[]){
      if(filter.category)filter.category=filter.category.filter(c=>c.$['android:name']!=='android.intent.category.LAUNCHER');
    }
    app['activity-alias']=(app['activity-alias']||[]).filter(a=>!/^\.PingIcon_/.test(a.$['android:name']));
    for(const item of ICONS){
      const attrs={
        'android:name':`.PingIcon_${item.key}`,
        'android:enabled':String(item.enabled),
        'android:exported':'true',
        'android:targetActivity':'.MainActivity',
        'android:icon':item.icon,
        'android:label':'@string/app_name',
      };
      if(item.round)attrs['android:roundIcon']=item.round;
      app['activity-alias'].push({
        $:attrs,
        'intent-filter':[{
          action:[{$:{'android:name':'android.intent.action.MAIN'}}],
          category:[{$:{'android:name':'android.intent.category.LAUNCHER'}}],
        }],
      });
    }
    return cfg;
  });
}

function withResources(config){
  return withDangerousMod(config,['android',async cfg=>{
    const root=cfg.modRequest.projectRoot;
    const res=path.join(cfg.modRequest.platformProjectRoot,'app','src','main','res');
    const src=path.join(root,'assets','app-icons');
    const put=(from,dirName,toName)=>{
      const dir=path.join(res,dirName);fs.mkdirSync(dir,{recursive:true});
      fs.copyFileSync(path.join(src,from),path.join(dir,toName));
    };
    for(const key of ['deboa','sempaciencia']){
      for(const part of ['fg','bg','legacy']){
        if(!fs.existsSync(path.join(src,`ping_icon_${key}_${part}.png`)))throw new Error(`[with-ping-app-icons] falta assets/app-icons/ping_icon_${key}_${part}.png`);
      }
      put(`ping_icon_${key}_fg.png`,'drawable-nodpi',`ping_icon_fg_${key}.png`);
      put(`ping_icon_${key}_bg.png`,'drawable-nodpi',`ping_icon_bg_${key}.png`);
      // Android 8+: ícone adaptativo; antes disso, o PNG com cantos arredondados.
      put(`ping_icon_${key}_legacy.png`,'mipmap-xxxhdpi',`ping_icon_${key}.png`);
      const anydpi=path.join(res,'mipmap-anydpi-v26');fs.mkdirSync(anydpi,{recursive:true});
      fs.writeFileSync(path.join(anydpi,`ping_icon_${key}.xml`),
        `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n  <background android:drawable="@drawable/ping_icon_bg_${key}"/>\n  <foreground android:drawable="@drawable/ping_icon_fg_${key}"/>\n</adaptive-icon>\n`);
    }
    return cfg;
  }]);
}

module.exports=function withPingAppIcons(config){
  return withResources(withManifest(config));
};
