// Copia os rostos do Ping (assets/ping-faces/*.png) para res/drawable-nodpi e os ícones pequenos
// por atraso (assets/notification-icons/*.png) para res/drawable-xxxhdpi no prebuild.
// A notificação escolhe o rosto pelo nome do recurso (data.largeIcon), lido pelo patch do
// expo-notifications. O keep.xml impede que o encolhimento de recursos apague as imagens,
// já que elas só são referenciadas por nome em tempo de execução.
const fs=require('fs');
const path=require('path');
const {withDangerousMod}=require('expo/config-plugins');

module.exports=function withPingFaces(config){
  return withDangerousMod(config,['android',async cfg=>{
    const source=path.join(cfg.modRequest.projectRoot,'assets','ping-faces');
    const res=path.join(cfg.modRequest.platformProjectRoot,'app','src','main','res');
    const drawable=path.join(res,'drawable-nodpi');
    fs.mkdirSync(drawable,{recursive:true});
    const files=fs.readdirSync(source).filter(name=>/^ping_face_[a-z0-9_]+\.png$/.test(name));
    if(!files.length)throw new Error('[with-ping-faces] nenhum rosto encontrado em assets/ping-faces');
    for(const name of files)fs.copyFileSync(path.join(source,name),path.join(drawable,name));
    // Ícones pequenos (silhueta) por atraso: 96 px = 24 dp em xxxhdpi; o Android reduz nas outras densidades.
    const iconsSource=path.join(cfg.modRequest.projectRoot,'assets','notification-icons');
    const xxxhdpi=path.join(res,'drawable-xxxhdpi');
    fs.mkdirSync(xxxhdpi,{recursive:true});
    const icons=fs.readdirSync(iconsSource).filter(name=>/^ping_notif_[a-z0-9_]+\.png$/.test(name));
    if(!icons.length)throw new Error('[with-ping-faces] nenhum ícone encontrado em assets/notification-icons');
    for(const name of icons)fs.copyFileSync(path.join(iconsSource,name),path.join(xxxhdpi,name));
    const raw=path.join(res,'raw');
    fs.mkdirSync(raw,{recursive:true});
    fs.writeFileSync(path.join(raw,'ping_faces_keep.xml'),
      '<?xml version="1.0" encoding="utf-8"?>\n<resources xmlns:tools="http://schemas.android.com/tools" tools:keep="@drawable/ping_face_*,@drawable/ping_notif_*"/>\n');
    return cfg;
  }]);
};
