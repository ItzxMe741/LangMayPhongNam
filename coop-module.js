/* =====================================================================
   CO-OP P2P BẰNG PEERJS · Làng Mây Phong Nam · tối đa 5 người (1 Host + 4 Guest)
   Mô hình hình sao: mọi Guest chỉ nối với Host; Host chuyển tiếp dữ liệu cho những Guest khác.
   Gắn vào game qua: COOP · CoopNet (createRoom, joinRoom, leave, tick, sleepReq) · coopAct().
   Giao thức (đối tượng gửi qua DataChannel của PeerJS):
     hello     guest→host  {name, look, house}
     snapshot  host→guest  {slot, world, roster:[{slot,name,look,house}]}   bản đồ nông trại + danh sách người
     join      host→guest  {p:{slot,name,look,house}}                        có người mới vào
     leave     host→guest  {slot}
     pos       mọi hướng   {s, m, x, y, d, mv}    (host gắn s = số ô của người gửi rồi chuyển tiếp)
     act       mọi hướng   {s, action, tileX, tileY, cropType, tile, obj}
     clock     host→guest  {time, day, season, year, rain}
     newday    host→guest  {world}
     sleepreq  guest→host  {}
     full / bye
   Số ô (slot): 0 = Host (hai cánh đồng phía Tây + nhà cũ); 1..4 = Guest, mỗi người có nhà và vườn riêng.
   Túi đồ, tiền, kỹ năng và nhiệm vụ của mỗi người là của riêng họ. Host giữ và lưu bản đồ.
   ===================================================================== */
const COOP_MAX=5,COOP_PREFIX='phongnam-',COOP_CHARS='ABCDEFGHJKMNPQRSTUVWXYZ23456789',COOP_KEY='phongnam_coop_map';
const COOP_PLOTS=[null,{x0:44,x1:60,y0:41,y1:51,hx:46,hy:41},{x0:61,x1:76,y0:41,y1:51,hx:63,hy:41},{x0:44,x1:64,y0:3,y1:13,hx:46,hy:3},{x0:44,x1:64,y0:15,y1:25,hx:46,hy:15}];

const COOP={
 on:false,
 role:null,
 slot:-1,
 peer:null,
 conn:null,
 conns:{},
 peers:{},
 code:'',
 status:'idle',
 msg:'',
 inVal:'',
 lastPos:'',
 posT:0,
 clockT:0,
 saveT:0,
 pingT:0,
 fromHost:false,
 joinTimer:null
};

const coopPeerCtor=()=>(typeof window!=='undefined'&&(window.Peer||(window.peerjs&&window.peerjs.Peer)))||null;
const coopPeerOpts=()=>window.PN_PEER_OPTS||{
 config:{
  iceServers:[
   {urls:'stun:stun.l.google.com:19302'},
   {urls:'stun:stun1.l.google.com:19302'},
   {urls:'stun:stun2.l.google.com:19302'},
   {urls:'stun:stun3.l.google.com:19302'},
   {urls:'stun:stun4.l.google.com:19302'},
   {urls:'stun:stun.cloudflare.com:3478'}
  ]
 }
};


function coopPlayerId(){
 let id=localStorage.getItem('coop_pid');

 if(!id){
  id='p'+Math.random().toString(36).slice(2)+Date.now().toString(36);
  localStorage.setItem('coop_pid',id);
 }

 return id;
}


/* --- sở hữu đất --- */
const inHostFields=(x,y)=>(x>=3&&x<=37&&y>=42&&y<=77)||(x>=3&&x<=29&&y>=12&&y<=37);
function coopPlotOf(x,y){for(let s=1;s<=4;s++){const P=COOP_PLOTS[s];if(x>=P.x0&&x<=P.x1&&y>=P.y0&&y<=P.y1)return s;}return 0;}
const inAnyGuestPlot=(x,y)=>coopPlotOf(x,y)>0;
function coopOwner(x,y){const p=coopPlotOf(x,y);if(p>0)return p;if(inHostFields(x,y))return 0;return null;}
function coopMine(x,y){if(!COOP.on)return true;const o=coopOwner(x,y);return o===null||o===COOP.slot;}
function coopOwnerName(x,y){const o=coopOwner(x,y);if(o===0)return COOP.slot===0?'bạn':((COOP.peers[0]&&COOP.peers[0].name)||'Host');return (COOP.peers[o]&&COOP.peers[o].name)||'chủ vườn vắng mặt';}
/* --- làm sạch dữ liệu nhận từ mạng --- */
const coopClean=v=>v==null?null:JSON.parse(JSON.stringify(v));
const coopName=n=>String(n||'Bạn').replace(/[<>&"]/g,'').slice(0,16)||'Bạn';
function coopTile(t){if(!t||typeof t!=='object')return null;const o={w:!!t.w,c:null};if(t.c&&typeof t.c==='object'&&CROPS[t.c.k])o.c={k:t.c.k,a:+t.c.a||0,d:+t.c.d||0};if(typeof t.f==='string'&&t.f.length<14)o.f=t.f;return o;}
function coopObj(o){if(!o||typeof o!=='object'||typeof o.t!=='string'||o.t.length>14)return null;return {t:o.t};}
function coopPackWorld(){return coopClean({soil:S.soil,objs:S.objs,time:S.time,day:S.day,season:S.season,year:S.year,rain:S.rain,nextRain:S.nextRain});}
function coopApplyWorld(w){const soil={},objs={};for(const k in (w.soil||{})){const t=coopTile(w.soil[k]);if(t)soil[k]=t;}for(const k in (w.objs||{})){const o=coopObj(w.objs[k]);if(o)objs[k]=o;}
 S.soil=soil;S.objs=objs;S.time=+w.time||S.time;S.day=+w.day||1;S.season=+w.season||0;S.year=+w.year||1;S.rain=!!w.rain;S.nextRain=w.nextRain==null?null:!!w.nextRain;if(typeof updClock==='function')updClock(true);}
/* --- nhà + vườn của từng Guest (4 căn dựng sẵn, bật/tắt theo người có mặt) --- */
function coopEnsureHouses(){const z=ZONES.farm;if(z.coopH)return;z.coopH=1;
 for(let s=1;s<=4;s++){const P=COOP_PLOTS[s],b={id:'guesthouse'+s,n:'Nhà của khách',x:P.hx,y:P.hy,w:6,h:4,oy:-8,slot:s,active:false,act:()=>coopHouseAct('guesthouse'+s)};z.BLD.push(b);b.idx=z.BLD.length;if(ZID==='farm')BLD.push(b);}}
function coopHouse(slot,on){coopEnsureHouses();const z=ZONES.farm,b=z.BLD.find(x=>x.id==='guesthouse'+slot);if(!b)return;b.active=on;
 if(on)b.n=slot===COOP.slot?'Nhà của bạn':'Nhà của '+((COOP.peers[slot]&&COOP.peers[slot].name)||'khách');
 for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++){z.OCC[y*z.W+x]=on?b.idx:0;if(on){delete S.soil[x+','+y];delete S.objs[x+','+y];}}}
function coopHouseSprite(b){const slot=b.id==='house'?0:b.slot;if(b.id!=='house'&&!b.active){if(!SPR.coopBlank)SPR.coopBlank=mk(1,1,()=>{});return SPR.coopBlank;}
 const st=slot===COOP.slot||!COOP.on?S.house:((COOP.peers[slot]&&COOP.peers[slot].house)||'cap4');return st==='ruong'?SPR.houseRuong:st==='san'?SPR.houseSan:SPR.house;}
function coopHouseAct(id){const slot=id==='house'?0:+id.replace('guesthouse','');if(!COOP.on||slot===COOP.slot){enterInterior('home');return;}
 say([{who:'Nhà của '+((COOP.peers[slot]&&COOP.peers[slot].name)||'bạn'),text:'Cửa đóng then cài. Mỗi người có một ngôi nhà riêng; bạn không vào nhà của bạn mình được.'}]);}
function coopHomePos(){if(COOP.on&&COOP.slot>0){const P=COOP_PLOTS[COOP.slot];return [(P.hx+3)*T+8,(P.hy+4)*T+14];}return [46*T+8,36*T+14];}
function coopInitPlot(slot){S.coopInit=S.coopInit||{};if(S.coopInit[slot])return;S.coopInit[slot]=1;const r=mulberry(2027+slot*31),z=ZONES.farm,P=COOP_PLOTS[slot];
 for(let y=P.y0;y<=P.y1;y++)for(let x=P.x0;x<=P.x1;x++){if(z.WT[y*z.W+x]!==0||z.OCC[y*z.W+x])continue;const k=x+','+y;if(S.soil[k]||S.objs[k])continue;const v=r();if(v<.2)S.objs[k]={t:'weed'};else if(v<.27)S.objs[k]={t:'stone'};}}
function coopSpawnPlotWeeds(){const z=ZONES.farm;for(const s in COOP.peers){const slot=+s;if(slot<1)continue;const P=COOP_PLOTS[slot];for(let i=0;i<5;i++){const x=P.x0+Math.floor(Math.random()*(P.x1-P.x0+1)),y=P.y0+Math.floor(Math.random()*(P.y1-P.y0+1)),k=x+','+y;if(z.WT[y*z.W+x]===0&&!z.OCC[y*z.W+x]&&!S.soil[k]&&!S.objs[k]&&Math.random()<.5)S.objs[k]={t:'weed'};}}}
/* --- lưu bản đồ phía Host --- */
function coopSaveMap(){if(!COOP.on||COOP.role!=='host')return;try{localStorage.setItem(COOP_KEY,JSON.stringify({t:Date.now(),world:coopPackWorld(),slots:S.coopSlots||{}}));}catch(e){}}
function coopSaveSoon(){COOP.saveT=4;}
function coopSaveView(){const b=Object.assign({},S,{map:'farm'});if(COOP.on&&COOP.role==='guest'&&S.soilSolo){b.soil=S.soilSolo;b.objs=S.objsSolo;}delete b.soilSolo;delete b.objsSolo;return b;}
/* --- gửi/nhận hành động đất đai --- */
function coopAct(action,x,y,extra){if(!COOP.on||S.map!=='farm')return;const k=x+','+y;CoopNet.send(Object.assign({type:'act',s:COOP.slot,action,tileX:x,tileY:y,tile:coopClean(S.soil[k]),obj:coopClean(S.objs[k])},extra||{}));if(COOP.role==='host')coopSaveSoon();}
function coopRecvAct(m){const x=m.tileX|0,y=m.tileY|0;if(x<0||y<0||x>=80||y>=80)return;const k=x+','+y,own=coopOwner(x,y),s=m.s|0;
 if(own!==null&&own!==s&&m.action!=='water')return;
 const t=coopTile(m.tile);if(t)S.soil[k]=t;else delete S.soil[k];
 const o=coopObj(m.obj);if(o)S.objs[k]=o;else delete S.objs[k];
 if(S.map==='farm'){if(m.action==='water')splash(x,y);else if(m.action==='harvest')burst(x*T+8,y*T+6,['#f2d14a','#7cc85a','#fff'],8);else dust(x,y,m.action==='hoe'?'#8a5a34':'#c9a46e');}
 if(COOP.role==='host')coopSaveSoon();}
/* --- vị trí những người khác --- */
function coopRecvPos(m){const s=m.s|0,P=COOP.peers[s];if(!P||s===COOP.slot)return;const x=+m.x,y=+m.y;if(!isFinite(x)||!isFinite(y))return;P.map=String(m.m||'').slice(0,16);P.tgt={x,y,d:(m.d|0)&3,mv:m.mv?1:0};if(!P.rp)P.rp={x,y,a:0};}
function coopPushPeers(dr){if(!COOP.on||!ZONES[S.map])return;for(const s in COOP.peers){const P=COOP.peers[s];if(P.rp&&P.look&&P.map===S.map)dr.push([P.rp.y,()=>drawRemotePeer(P)]);}}
function drawRemotePeer(P){const r=P.rp,t=P.tgt;softShadow(ctx,r.x,r.y,5,.3);outlined(ctx,r.x,r.y,(g,ax,ay)=>drawPerson(g,ax,ay,P.look,t.d,r.a,!!t.mv));coopTag(r.x,r.y,P.name);}
function coopTag(x,y,name){x=Math.round(x);y=Math.round(y);ctx.font='bold 6px "Be Vietnam Pro",sans-serif';ctx.textAlign='center';const w=Math.ceil(ctx.measureText(name).width)+6;P(ctx,Math.round(x-w/2),y-40,w,8,'rgba(30,20,60,.8)');ctx.fillStyle='#fff';ctx.fillText(name,x,y-34);}
/* --- đồng hồ & sang ngày --- */
function coopRecvClock(m){S.time=+m.time||S.time;S.day=+m.day||S.day;S.season=+m.season||0;S.year=+m.year||S.year;S.rain=!!m.rain;if(typeof updClock==='function')updClock(true);}
function coopRecvNewDay(m){COOP.fromHost=true;fadeTo(()=>{try{newDay(false);}finally{COOP.fromHost=false;}coopApplyWorld(m.world);placeAtHome();},500);toast('Host đã đi ngủ: cả phòng sang ngày mới!');}
function newDay(passed,reason,hosp){
 if(COOP.on&&COOP.role==='guest'&&!COOP.fromHost){const keep={time:S.time,day:S.day,season:S.season,year:S.year,rain:S.rain,nextRain:S.nextRain},sv=JSON.stringify({soil:S.soil,objs:S.objs});newDay0(passed,reason,hosp);Object.assign(S,keep);const o=JSON.parse(sv);S.soil=o.soil;S.objs=o.objs;return;}
 newDay0(passed,reason,hosp);
 if(COOP.on&&COOP.role==='host'){coopSpawnPlotWeeds();CoopNet.send({type:'newday',world:coopPackWorld()});coopSaveMap();}}
/* --- vào/ra phòng --- */
function coopAddPeer(p){const slot=p.slot|0;if(slot===COOP.slot||slot<0||slot>4)return;COOP.peers[slot]={slot,name:coopName(p.name),look:peerLook(p.look),house:['ruong','san'].includes(p.house)?p.house:'cap4',map:null,rp:null,tgt:null};if(slot>0)coopHouse(slot,true);}
function coopRemovePeer(slot){delete COOP.peers[slot];if(slot>0)coopHouse(slot,false);}
const coopCount=()=>1+Object.keys(COOP.peers).filter(s=>+s!==COOP.slot||COOP.role==='host').length;
function coopStartGuest(m){if(COOP.joinTimer){clearTimeout(COOP.joinTimer);COOP.joinTimer=null;}
 COOP.slot=m.slot|0;S.soilSolo=S.soil;S.objsSolo=S.objs;COOP.on=true;COOP.peers={};coopEnsureHouses();
 for(const p of (m.roster||[]))coopAddPeer(p);coopHouse(COOP.slot,true);coopApplyWorld(m.world||{});MINE=null;S.map='farm';syncZone();placeAtHome();$('#loc').classList.add('hidden');
 CoopNet.setStatus('connected');toast(`🤝 Đã vào phòng của ${(COOP.peers[0]&&COOP.peers[0].name)||'Host'} (${Object.keys(COOP.peers).length+1}/${COOP_MAX} người). Nhà của bạn ở khu vườn số ${COOP.slot}.`);save();}
function coopTeardown(reason){const wasGuest=COOP.on&&COOP.role==='guest';
 if(COOP.on){coopSaveMap();if(wasGuest&&S.soilSolo){S.soil=S.soilSolo;S.objs=S.objsSolo;delete S.soilSolo;delete S.objsSolo;}for(let s=1;s<=4;s++)coopHouse(s,false);}
 try{if(COOP.conn)COOP.conn.close();}catch(e){}for(const s in COOP.conns){try{COOP.conns[s].close();}catch(e){}}try{if(COOP.peer)COOP.peer.destroy();}catch(e){}
 if(COOP.joinTimer)clearTimeout(COOP.joinTimer);
 Object.assign(COOP,{status:'idle',on:false,role:null,slot:-1,peer:null,conn:null,conns:{},peers:{},code:'',joinTimer:null});
 if(wasGuest){if(S.map!=='mine')placeAtHome();save();}
 if(reason)toast(reason);}
const coopErr=e=>{const t=e&&e.type;return t==='peer-unavailable'?'Không tìm thấy phòng với mã này. Kiểm tra lại mã hoặc nhờ Host tạo phòng lại.':t==='unavailable-id'?'Mã phòng bị trùng, thử lại.':(t==='network'||t==='server-error'||t==='socket-error'||t==='socket-closed')?'Không kết nối được máy chủ trung gian PeerJS. Kiểm tra mạng. (Khung xem của Claude chặn kết nối ngoài: hãy tải file HTML về mở trên máy.)':t==='browser-incompatible'?'Trình duyệt không hỗ trợ WebRTC.':'Lỗi kết nối: '+((e&&(e.message||e.type))||'không rõ');};
function coopSendAll(m,except){for(const s in COOP.conns){if(+s===except)continue;const c=COOP.conns[s];if(c&&c.open){try{c.send(m);}catch(e){}}}}
const CoopNet={
 ui(){if(typeof UI!=='undefined'&&UI.menu&&typeof MS!=='undefined'&&MS&&MS.kind==='coop')renderMenu();},
 setStatus(st,msg){COOP.status=st;COOP.msg=msg||'';CoopNet.ui();},
 fail(msg){coopTeardown();CoopNet.setStatus('error',msg);},
 send(m){if(COOP.role==='host')coopSendAll(m);else{const c=COOP.conn;if(c&&c.open){try{c.send(m);}catch(e){}}}},
 createRoom(){const P=coopPeerCtor();if(!P){CoopNet.setStatus('error','Chưa tải được thư viện PeerJS.');return;}coopTeardown();CoopNet.setStatus('creating');
  const attempt=n=>{let code='';for(let i=0;i<6;i++)code+=COOP_CHARS[Math.floor(Math.random()*COOP_CHARS.length)];
   const peer=new P(COOP_PREFIX+code,coopPeerOpts());COOP.peer=peer;
   peer.on('open',()=>{COOP.code=code;COOP.role='host';COOP.slot=0;COOP.on=true;COOP.peers={};coopEnsureHouses();CoopNet.setStatus('connected');});
   peer.on('connection',conn=>CoopNet.hostAccept(conn));
   peer.on('error',e=>{if(e&&e.type==='unavailable-id'&&n<4){try{peer.destroy();}catch(x){}attempt(n+1);}else CoopNet.fail(coopErr(e));});
   peer.on('disconnected',()=>{try{peer.reconnect();}catch(e){}});};
  attempt(0);},
 hostAccept(conn){let slot=null;
  conn.on('data',m=>{if(!m||typeof m!=='object')return;
   if(slot===null){if(m.type!=='hello')return;slot=CoopNet.assignSlot(conn,m);return;}
   coopHostHandle(m,slot);});
  conn.on('close',()=>{if(slot!==null&&COOP.conns[slot]===conn)CoopNet.dropSlot(slot);});
  conn.on('error',()=>{});},
 assignSlot(conn,m){const name=coopName(m.name);S.coopSlots=S.coopSlots||{};
  const used=s=>!!(COOP.conns[s]&&COOP.conns[s].open);let slot=0;


  for(let s=1;s<=4&&!slot;s++){

 const info=S.coopSlots[s];

 if(
  !used(s) &&
  info &&
  info.pid===m.pid
 ){
  slot=s;
 }

}


  for(let s=1;s<=4&&!slot;s++)if(!used(s)&&!S.coopSlots[s])slot=s;
  for(let s=1;s<=4&&!slot;s++)if(!used(s))slot=s;
  if(!slot){try{conn.send({type:'full'});}catch(e){}setTimeout(()=>conn.close(),300);return null;}

  S.coopSlots[slot]={
 pid:m.pid,
 name:name,
 lastSeen:Date.now()
};
	

COOP.conns[slot]=conn;

  coopAddPeer({slot,name,look:m.look,house:m.house});
	if(COOP.peers[slot]){
 COOP.peers[slot].lastSeen=Date.now();
}




coopInitPlot(slot);
  const roster=[{slot:0,name:S.name,look:compactLook(),house:S.house}].concat(Object.keys(COOP.peers).map(s=>COOP.peers[s]).filter(p=>p.slot>0).map(p=>({slot:p.slot,name:p.name,look:compactFromPeer(p),house:p.house})));
  try{conn.send({type:'snapshot',slot,world:coopPackWorld(),roster});}catch(e){}
  coopSendAll({type:'join',p:{slot,name,look:m.look,house:m.house}},slot);
  coopSaveMap();CoopNet.setStatus('connected');toast(`🤝 ${name} đã vào phòng (${CoopNet.count()}/${COOP_MAX}). Nhà bạn ấy ở khu vườn số ${slot}.`);save();return slot;},
 dropSlot(slot){const p=COOP.peers[slot];delete COOP.conns[slot];coopRemovePeer(slot);coopSendAll({type:'leave',slot});coopSaveMap();CoopNet.ui();toast(`${p?p.name:'Một người chơi'} đã rời phòng (${CoopNet.count()}/${COOP_MAX}).`);},
 count(){return 1+Object.keys(COOP.peers).filter(s=>+s>0||COOP.role==='guest').length;},
 joinRoom(code){const P=coopPeerCtor();code=String(code||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');if(!P){CoopNet.setStatus('error','Chưa tải được thư viện PeerJS.');return;}if(code.length<4){CoopNet.setStatus('error','Hãy nhập mã phòng của Host.');return;}
  coopTeardown();COOP.role='guest';CoopNet.setStatus('joining');
  const peer=new P(coopPeerOpts());COOP.peer=peer;
  peer.on('open',()=>{const conn=peer.connect(COOP_PREFIX+code,{reliable:true});COOP.conn=conn;



   conn.on('open',()=>CoopNet.send({
 type:'hello',
 pid:coopPlayerId(),
 name:S.name,
 look:compactLook(),
 house:S.house
}));




   conn.on('data',coopGuestHandle);
   conn.on('close',()=>{if(COOP.conn===conn){const was=COOP.on;coopTeardown(was?'Mất kết nối với Host. Bạn quay về nông trại của mình.':'');CoopNet.ui();}});
   conn.on('error',e=>CoopNet.fail(coopErr(e)));});
  peer.on('error',e=>CoopNet.fail(coopErr(e)));
  COOP.joinTimer=setTimeout(()=>{if(!COOP.on)CoopNet.fail('Hết thời gian chờ: phòng không phản hồi.');},15000);},
 leave(){CoopNet.send({type:'bye'});setTimeout(()=>{coopTeardown('Đã rời phòng co-op.');CoopNet.setStatus('idle');},120);},
 sleepReq(){CoopNet.send({type:'sleepreq'});toast('Đã báo Host bạn muốn ngủ. Khi Host đi ngủ, cả phòng sang ngày mới.');},
 tick(dt){
  for(const s in COOP.peers){const P=COOP.peers[s];if(P.rp&&P.tgt){const k=Math.min(1,dt*12);P.rp.x+=(P.tgt.x-P.rp.x)*k;P.rp.y+=(P.tgt.y-P.rp.y)*k;if(P.tgt.mv)P.rp.a+=dt*8;}}
  if(!COOP.on)return;




  if(COOP.role==='guest'&&!(COOP.conn&&COOP.conn.open))return;
	COOP.pingT-=dt;

if(COOP.pingT<=0){

 COOP.pingT=5;

 CoopNet.send({
  type:'ping'
 });

}



  COOP.posT-=dt;if(COOP.posT<=0){COOP.posT=.1;const m={type:'pos',s:COOP.slot,m:S.map,x:Math.round(player.x),y:Math.round(player.y),d:player.dir,mv:player.mov?1:0},key=m.m+m.x+','+m.y+m.d+m.mv;if(key!==COOP.lastPos||Math.random()<.05){COOP.lastPos=key;CoopNet.send(m);}}



  if(COOP.role==='host'){

    // AUTO KICK PLAYER TREO
    const now=Date.now();

    for(const s in COOP.peers){

        const slot=+s;

        if(slot===0) continue;

        const p=COOP.peers[slot];

        if(
            p &&
            p.lastSeen &&
            now-p.lastSeen>15000
        ){

            console.log(
                '[COOP] timeout',
                p.name
            );

            const c=COOP.conns[slot];

            CoopNet.dropSlot(slot);

            try{
                c&&c.close();
            }catch(e){}

        }

    }

    // CLOCK CŨ
    COOP.clockT-=dt;

    if(COOP.clockT<=0){
        COOP.clockT=3;

        CoopNet.send({
            type:'clock',
            time:S.time,
            day:S.day,
            season:S.season,
            year:S.year,
            rain:S.rain
        });
    }

    // SAVE CŨ
    if(COOP.saveT>0){
        COOP.saveT-=dt;

        if(COOP.saveT<=0)
            coopSaveMap();
    }

}
 



  if(COOP.saveT>0){COOP.saveT-=dt;if(COOP.saveT<=0)coopSaveMap();}}}
};
function compactFromPeer(p){const L=p.look||{};return {k:L.skin,h:L.hair,s:L.shirt,p:L.pants,lg:L.long?1:0,ht:L.hat?1:0,dr:L.dress?1:0,tr:L.trim||'',hg:L.hatGold?1:0};}
function coopHostHandle(m,slot){
 switch(m.type){


  case 'ping':

 if(COOP.peers[slot]){
  COOP.peers[slot].lastSeen=Date.now();
 }

 break;


  case 'pos':m.s=slot;coopRecvPos(m);coopSendAll(m,slot);break;
  case 'act':m.s=slot;coopRecvAct(m);coopSendAll(m,slot);break;
  case 'sleepreq':{const p=COOP.peers[slot];toast(`🌙 ${p?p.name:'Một người chơi'} muốn đi ngủ. Bạn ngủ ở nhà thì cả phòng sang ngày mới.`);break;}
  case 'bye':{const c=COOP.conns[slot];CoopNet.dropSlot(slot);try{c&&c.close();}catch(e){}break;}
 }}
function coopGuestHandle(m){if(!m||typeof m!=='object')return;
 switch(m.type){
  case 'snapshot':if(!COOP.on)coopStartGuest(m);break;
  case 'join':if(COOP.on&&m.p){coopAddPeer(m.p);toast(`🤝 ${coopName(m.p.name)} đã vào phòng.`);CoopNet.ui();}break;
  case 'leave':if(COOP.on){const p=COOP.peers[m.slot|0];coopRemovePeer(m.slot|0);toast(`${p?p.name:'Một người chơi'} đã rời phòng.`);CoopNet.ui();}break;
  case 'pos':if(COOP.on)coopRecvPos(m);break;
  case 'act':if(COOP.on)coopRecvAct(m);break;
  case 'clock':if(COOP.on)coopRecvClock(m);break;
  case 'newday':if(COOP.on)coopRecvNewDay(m);break;
  case 'full':CoopNet.fail('Phòng đã đủ 5 người.');break;
  case 'bye':coopTeardown('Host đã đóng phòng.');CoopNet.ui();break;
 }}
function coopMenuHTML(){
 const lib=!!coopPeerCtor(),st=COOP.status;
 let h=`<div class="note">Chơi chung tối đa <b>5 người</b> qua mạng ngang hàng (PeerJS, miễn phí, không cần máy chủ của game). Mỗi người có <b>nhà, khu vườn, túi đồ, tiền và nhiệm vụ riêng</b>; mọi người cùng đi lại trên một nông trại và thấy nhau làm việc theo thời gian thực. Máy <b>Host</b> giữ và lưu bản đồ; mỗi Guest có một khu vườn riêng ở phía Đông.</div>`;
 if(!lib)h+='<div class="note" style="color:#a02a1a"><b>Chưa tải được thư viện PeerJS.</b> Kiểm tra kết nối mạng rồi tải lại trang.</div>';
 if(COOP.on){
  const names=[`${COOP.slot===0?esc(S.name)+' (bạn)':esc((COOP.peers[0]&&COOP.peers[0].name)||'Host')} · Host`].concat(Object.keys(COOP.peers).filter(s=>+s>0).sort().map(s=>`${esc(COOP.peers[s].name)} · vườn ${s}`)).concat(COOP.slot>0?[`${esc(S.name)} (bạn) · vườn ${COOP.slot}`]:[]);
  h+=`<div class="bundle" style="--c:#3a9a5a"><h3>🤝 Phòng co-op · ${COOP.role==='host'?'Bạn là Host':'Bạn là Guest'} <span class="tag g">${names.length}/${COOP_MAX} người</span></h3>${COOP.role==='host'?`<p>Gửi mã này cho bạn bè (còn ${COOP_MAX-names.length} chỗ):</p><div style="display:flex;gap:6px;align-items:center;margin:6px 0"><input id="coop-code" readonly value="${esc(COOP.code)}" style="flex:1;min-width:0;font:800 22px 'Be Vietnam Pro',sans-serif;letter-spacing:4px;text-align:center;padding:8px;border:2px solid var(--lacquer);border-radius:6px;background:var(--chip);color:var(--ink)"><button class="btn sm" data-a="coopcopy">Sao chép</button></div>`:'<p>Đồng hồ và bản đồ theo Host. Muốn sang ngày mới, hãy nhờ Host đi ngủ (bạn bấm Ngủ ở nhà để nhắc Host).</p>'}<p><b>Trong phòng:</b><br>${names.map(n=>'• '+n).join('<br>')}</p><p>Chỉ tưới giúp được vườn của nhau; không vào được nhà của nhau.</p><div class="bfoot"><span></span><button class="btn red sm" data-a="coopleave">${COOP.role==='host'?'Đóng phòng':'Rời phòng'}</button></div></div>`;}
 else if(st==='creating'||st==='joining'){h+=`<div class="empty">${st==='creating'?'Đang tạo phòng…':'Đang kết nối tới phòng…'}</div>`;}
 else{h+=`<div class="bundle" style="--c:#3a6ab0"><h3>Tạo Phòng (Host)</h3><p>Bạn là chủ phòng: bản đồ nông trại lưu ở máy bạn. Tối đa 5 người (bạn + 4 bạn bè).</p><div class="bfoot"><span></span><button class="btn red sm" data-a="coophost" ${lib?'':'disabled'}>Tạo Phòng</button></div></div>
  <div class="bundle" style="--c:#6fa83c"><h3>Vào Phòng (Guest)</h3><p>Nhập mã phòng mà Host gửi cho bạn.</p><div style="display:flex;gap:6px;align-items:center;margin:6px 0"><input id="coop-in" maxlength="8" placeholder="Nhập mã phòng" autocomplete="off" value="${esc(COOP.inVal||'')}" style="flex:1;min-width:0;font:800 18px 'Be Vietnam Pro',sans-serif;letter-spacing:3px;text-transform:uppercase;text-align:center;padding:8px;border:2px solid var(--lacquer);border-radius:6px;background:var(--chip);color:var(--ink)"><button class="btn red sm" data-a="coopjoin" ${lib?'':'disabled'}>Vào Phòng</button></div></div>`;
  if(st==='error')h+=`<div class="note" style="color:#a02a1a">${esc(COOP.msg)}</div>`;}
 return h;}
document.addEventListener('input',e=>{if(e.target&&e.target.id==='coop-in')COOP.inVal=e.target.value;});
