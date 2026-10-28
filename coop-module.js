/* =====================================================================
   CO-OP P2P BẰNG PEERJS · Làng Mây Phong Nam · tối đa 6 người (1 Host + 5 Guest)
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
   Số ô (slot): 0 = Host (hai cánh đồng phía Tây + nhà cũ); 1..5 = Guest, dùng chung nhà và toàn bộ các khu vườn.
   Túi đồ, tiền và kỹ năng của mỗi người vẫn riêng. Nhiệm vụ theo Host; mọi người cùng canh tác. Host giữ và lưu bản đồ.
   ===================================================================== */
const COOP_MAX=6,COOP_PREFIX='phongnam-',COOP_CHARS='ABCDEFGHJKMNPQRSTUVWXYZ23456789',COOP_KEY='phongnam_coop_map';
const COOP_PLOTS=[null,{x0:44,x1:60,y0:41,y1:51,hx:46,hy:41},{x0:61,x1:76,y0:41,y1:51,hx:63,hy:41},{x0:44,x1:64,y0:3,y1:13,hx:46,hy:3},{x0:44,x1:64,y0:15,y1:25,hx:46,hy:15},{x0:3,x1:23,y0:3,y1:10,hx:5,hy:3}];
const COOP={on:false,role:null,slot:-1,peer:null,conn:null,conns:{},peers:{},code:'',status:'idle',msg:'',inVal:'',lastPos:'',posT:0,clockT:0,saveT:0,fromHost:false,joinTimer:null};
const coopPeerCtor=()=>(typeof window!=='undefined'&&(window.Peer||(window.peerjs&&window.peerjs.Peer)))||null;
const coopPeerOpts=()=>window.PN_PEER_OPTS||undefined;
/* --- sở hữu đất --- */
const inHostFields=(x,y)=>(x>=3&&x<=37&&y>=42&&y<=77)||(x>=3&&x<=29&&y>=12&&y<=37);
function coopPlotOf(x,y){for(let s=1;s<COOP_MAX;s++){const P=COOP_PLOTS[s];if(x>=P.x0&&x<=P.x1&&y>=P.y0&&y<=P.y1)return s;}return 0;}
const inAnyGuestPlot=(x,y)=>coopPlotOf(x,y)>0;
function coopOwner(x,y){const p=coopPlotOf(x,y);if(p>0)return p;if(inHostFields(x,y))return 0;return null;}
function coopMine(x,y){return true;} // Co-op: mọi người cùng canh tác trên toàn bộ vườn.
function coopOwnerName(x,y){const o=coopOwner(x,y);if(o===0)return COOP.slot===0?'bạn':((COOP.peers[0]&&COOP.peers[0].name)||'Host');return (COOP.peers[o]&&COOP.peers[o].name)||'chủ vườn vắng mặt';}
/* --- làm sạch dữ liệu nhận từ mạng --- */
const coopClean=v=>v==null?null:JSON.parse(JSON.stringify(v));
const coopName=n=>String(n||'Bạn').replace(/[<>&"]/g,'').slice(0,16)||'Bạn';
function coopTile(t){if(!t||typeof t!=='object')return null;const o={w:!!t.w,c:null};if(t.c&&typeof t.c==='object'&&CROPS[t.c.k])o.c={k:t.c.k,a:+t.c.a||0,d:+t.c.d||0};if(typeof t.f==='string'&&t.f.length<14)o.f=t.f;return o;}
function coopObj(o){if(!o||typeof o!=='object'||typeof o.t!=='string'||o.t.length>14)return null;return {t:o.t};}

function coopStoryFlagKeys(){return Array.from(new Set(['awake','act2','worldmap','rod','plow','longmoc','longthuy','longhoa','longkim','longtho','longmach5','ga','license','silkshop','loom','rareshop','casinokey','plaque','processor','yinhatch','amdo','sgEnd','poemSeen','puzInit','silkshop','defWon'].concat(QUESTS.flatMap(q=>Object.keys((q.rw&&q.rw.fl)||{})))));}
function coopProgressKeys(){return ['q','qb','qs','qt','qd','qm','pxp','proj','seals','mines','maxFloor','endings','mounts','recipes','bundles','puzPerm','puzLit','puzDone'];}
function coopSgKeys(){return ['stage','showroom','patent','pent','c','sgEnd'];}
function coopCaptureSoloProgress(){
 if(COOP.soloProgress)return;const data={},flags={},sg={};for(const key of coopProgressKeys().concat(['gold']))data[key]=coopClean(S[key]);for(const key of coopStoryFlagKeys())if(Object.prototype.hasOwnProperty.call(S.flags,key))flags[key]=coopClean(S.flags[key]);for(const key of coopSgKeys())if(S.sg&&Object.prototype.hasOwnProperty.call(S.sg,key))sg[key]=coopClean(S.sg[key]);COOP.soloProgress={data,flags,sg};COOP.soloPxpEarned=0;
}
function coopPackProgress(){
 const data={},flags={},sg={};for(const key of coopProgressKeys())data[key]=coopClean(S[key]);for(const key of coopStoryFlagKeys())if(Object.prototype.hasOwnProperty.call(S.flags,key))flags[key]=coopClean(S.flags[key]);for(const key of coopSgKeys())if(S.sg&&Object.prototype.hasOwnProperty.call(S.sg,key))sg[key]=coopClean(S.sg[key]);return {data,flags,sg};
}
function coopApplyProgress(progress){
 if(!COOP.on||COOP.role!=='guest'||!progress||!progress.data)return;
 for(const key of coopProgressKeys()){if(key==='pxp'){if(Number.isFinite(progress.data.pxp))S.pxp=Math.max(0,progress.data.pxp);continue;}if(Object.prototype.hasOwnProperty.call(progress.data,key)&&progress.data[key]!=null)S[key]=coopClean(progress.data[key]);}
 S.flags=S.flags||{};for(const key of coopStoryFlagKeys()){delete S.flags[key];if(progress.flags&&Object.prototype.hasOwnProperty.call(progress.flags,key))S.flags[key]=coopClean(progress.flags[key]);}
 S.sg=S.sg||{};for(const key of coopSgKeys()){delete S.sg[key];if(progress.sg&&Object.prototype.hasOwnProperty.call(progress.sg,key))S.sg[key]=coopClean(progress.sg[key]);}
 if(typeof recalc==='function')recalc();
}
function coopSoloProgressView(view){
 const backup=COOP.soloProgress;if(!backup)return view;
 for(const key of coopProgressKeys().concat(['gold']))view[key]=coopClean(backup.data[key]);view.pxp=Math.max(0,(Number(backup.data.pxp)||0)+(COOP.soloPxpEarned||0));
 view.flags=Object.assign({},view.flags);for(const key of coopStoryFlagKeys()){delete view.flags[key];if(Object.prototype.hasOwnProperty.call(backup.flags,key))view.flags[key]=coopClean(backup.flags[key]);}
 view.sg=Object.assign({},view.sg);for(const key of coopSgKeys()){delete view.sg[key];if(Object.prototype.hasOwnProperty.call(backup.sg,key))view.sg[key]=coopClean(backup.sg[key]);}return view;
}
function coopRestoreSoloProgress(){if(!COOP.soloProgress)return;Object.assign(S,coopSoloProgressView(Object.assign({},S)));COOP.soloProgress=null;COOP.soloPxpEarned=0;if(typeof recalc==='function')recalc();}
function coopInitGuestMoney(world){if(world&&Number.isFinite(world.gold)&&world.gold>=0)S.gold=Math.floor(world.gold);}

function coopPackQuests(){
 if(!S.q)return null;const goals={};
 for(const q of QUESTS)if(!S.q.done[q.id]&&q.after.every(id=>!!S.q.done[id]))q.goals.forEach((g,i)=>goals[q.id+':'+i]=goalCur(q,g));
 return {done:coopClean(S.q.done),goals,level:plv(),progress:coopPackProgress(),deadlines:coopClean(S.qd||{})};
}
function coopApplyQuests(q){
 if(!COOP.on||COOP.role!=='guest'||!q||typeof q!=='object')return;
 coopApplyProgress(q.progress);
 const done={},goals={},deadlines={};for(const quest of QUESTS){if(q.done&&q.done[quest.id])done[quest.id]=1;quest.goals.forEach((g,i)=>{const key=quest.id+':'+i,v=Number(q.goals&&q.goals[key]);if(Number.isFinite(v)&&v>=0)goals[key]=Math.min(g.n,Math.floor(v));});if(q.deadlines&&Number.isFinite(q.deadlines[quest.id]))deadlines[quest.id]=q.deadlines[quest.id];}
 COOP.quest={done,goals,deadlines,level:Math.max(1,Math.min(100,Number(q.level)||1))};
 if(syncDogQuestSkins())save();
 if(typeof refreshHUD==='function')refreshHUD();if(UI.menu&&MS&&MS.kind==='quest')renderMenu();
}
function coopQuestStat(m,slot){
 if(!COOP.on||COOP.role!=='host'||!COOP.peers[slot])return;
 if(typeof m.k!=='string'||!Number.isSafeInteger(m.n)||m.n<1||m.n>1000)return;
 if(!QUESTS.some(q=>q.goals.some(g=>g.k===m.k)))return;
 S.stats[m.k]=(S.stats[m.k]||0)+m.n;coopSaveSoon();
}


function animalFeedProgress(a){const every=ANIMALS[a.type].every;return a.prod?0:clamp(Number.isFinite(a.feedProgress)?a.feedProgress:(Number(a.age)||0)%every,0,every-1);}
function advanceBarnDay(B){
 if(!B.built||!B.animals.length)return;B.hay=clamp(Number(B.hay)||0,0,80);
 const count=B.animals.length,start=(B.feedCursor||0)%count;
 for(let i=0;i<count;i++){const a=B.animals[(start+i)%count],A=ANIMALS[a.type];a.pet=false;a.fr=clamp(Number(a.fr)||0,0,400);a.feedProgress=animalFeedProgress(a);a.fed=B.hay>0;
  if(!a.fed){a.fr=Math.max(0,a.fr-20);continue;}
  B.hay--;a.age=(Number(a.age)||0)+1;a.fr=Math.min(400,a.fr+3);
  if(!a.prod){a.feedProgress++;if(a.feedProgress>=A.every){a.prod=a.type==='ga'&&a.fr>=400&&Math.random()<.012?'trunghk':A.prod;a.feedProgress=0;}}
 }
 B.feedCursor=(start+1)%count;
}

function coopNewAnimalId(){return 'animal-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);}
function coopBarn(){return COOP.on&&COOP.role==='guest'&&COOP.barn?COOP.barn:S.barn;}
function coopPackBarn(){
 const B=S.barn;for(const a of B.animals)if(!a.id)a.id=coopNewAnimalId();
 return coopClean({built:!!B.built,hay:B.hay,pending:B.pending||[],vetDay:S.flags.vetDay,animals:B.animals.map(a=>({id:a.id,type:a.type,name:a.name,fr:a.fr,pet:!!a.pet,prod:a.prod,age:a.age||0,feedProgress:animalFeedProgress(a),fed:a.fed,x:a.x,y:a.y,face:a.face,mov:!!a.mov}))});
}
function coopApplyBarn(b){
 if(!COOP.on||COOP.role!=='guest'||!b||typeof b!=='object')return;
 const old=COOP.barn&&COOP.barn.animals||[],animals=[];
 for(const a of (Array.isArray(b.animals)?b.animals:[]).slice(0,8)){
  if(!a||!ANIMALS[a.type]||typeof a.id!=='string'||!Number.isFinite(a.x)||!Number.isFinite(a.y))continue;
  const pen=animalPen(a.type),prior=old.find(p=>p.id===a.id),x=clamp(a.x,pen.x0,pen.x1),y=clamp(a.y,pen.y0,pen.y1);
  animals.push({id:a.id.slice(0,100),type:a.type,name:coopName(a.name),fr:clamp(Number(a.fr)||0,0,400),pet:!!a.pet,prod:ITEMS[a.prod]?a.prod:null,age:Math.max(0,Number(a.age)||0),feedProgress:clamp(Number(a.feedProgress)||0,0,ANIMALS[a.type].every-1),fed:typeof a.fed==='boolean'?a.fed:undefined,x:prior?prior.x:x,y:prior?prior.y:y,target:{x,y},face:a.face===-1?-1:1,mov:!!a.mov});
 }
 const previous=COOP.barn;COOP.barn={built:!!b.built,hay:clamp(Number(b.hay)||0,0,80),pending:Array.isArray(b.pending)?b.pending.filter(t=>ANIMALS[t]).slice(0,20):[],vetDay:b.vetDay,animals};
 if(UI.menu&&MS&&['barn','moc','thuy'].includes(MS.kind)){
  const key=v=>JSON.stringify(v&&{built:v.built,hay:v.hay,vetDay:v.vetDay,pending:v.pending,animals:v.animals.map(a=>({id:a.id,prod:a.prod,pet:a.pet,fr:a.fr,feedProgress:a.feedProgress,fed:a.fed,near:S.map==='farm'&&Math.hypot(player.x-(a.target?a.target.x:a.x),player.y-(a.target?a.target.y:a.y))<=32}))});
  if(key(previous)!==key(COOP.barn))renderMenu();
 }
}
function coopBroadcastBarn(){if(!COOP.on||COOP.role!=='host')return;CoopNet.send({type:'barnstate',barn:coopPackBarn()});}
function coopBarnRequest(action,id){
 if(!COOP.on||S.barnPending){if(S.barnPending)toast('Đang chờ xác nhận thao tác chuồng trại.');return;}
 const B=coopBarn(),cost={gold:0,items:{}},n=action==='hay'?Math.min(10,has('cokho'),80-B.hay):0;
 if(action==='hay'){if(!B.built||n<=0){toast(B.hay>=80?'Máng cỏ đã đầy.':'Bạn cần Cỏ Khô và chuồng đã sửa.');return;}cost.items.cokho=n;}
 else if(action==='buy'){const A=ANIMALS[id];if(!A||A.myth||!B.built||B.animals.length>=8)return;cost.gold=A.p;}
 else if(action==='repair'){if(B.built)return;cost.gold=1500;cost.items={da:40,go:20};}
 else if(action==='vet'){if(!B.built||B.vetDay===dayIdx())return;cost.gold=200;}
 else if(action!=='collect'&&action!=='pet')return;
 if(S.gold<cost.gold||Object.entries(cost.items).some(([k,v])=>has(k)<v)){toast('Bạn chưa đủ tiền hoặc vật phẩm.');return;}
 if(COOP.role==='guest'&&!(COOP.conn&&COOP.conn.open&&COOP.home&&COOP.home.id)){toast('Chưa kết nối được với Host.');return;}
 S.gold-=cost.gold;for(const [k,v]of Object.entries(cost.items))S.inv[k]=has(k)-v;
 S.barnPending={token:'barn-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10),homeId:COOP.role==='host'?coopHomeId():COOP.home.id,day:dayIdx(),action,id:id||'',n,cost};save();COOP.barnRetry=0;
 if(COOP.role==='host'){const request=S.barnPending,result=coopBarnAccept(request,0);coopBarnResult(Object.assign({},result,{token:request.token,homeId:request.homeId}));coopBroadcastBarn();}else coopRetryBarn();
 refreshHUD();if(UI.menu&&MS&&['barn','moc','thuy'].includes(MS.kind))renderMenu();
}
function coopBarnAccept(m,slot){
 const fail=message=>({ok:false,message}),peer=slot===0?{name:S.name,map:S.map,tgt:player}:COOP.peers[slot];
 if(!COOP.on||COOP.role!=='host'||!peer||!m||typeof m.token!=='string'||!/^[a-z0-9-]{8,100}$/i.test(m.token)||m.homeId!==coopHomeId())return fail('Không đúng phòng.');
 const ledger=S.barnReceipts||(S.barnReceipts={}),receipt=ledger[m.token];if(receipt)return receipt.name===peer.name?receipt.result:fail('Mã giao dịch không hợp lệ.');
 const B=S.barn;let result;const a=B.animals.find(a=>a.id===m.id);
 if(m.day!==dayIdx())result=fail('Đã sang ngày mới. Bạn nhận lại chi phí đã gửi.');
 else if(m.action==='repair'){if(B.built)result=fail('Chuồng đã được người khác sửa.');else{B.built=true;givePending();result={ok:true,message:'Đã sửa chuồng trại chung!'};}}
 else if(!B.built)result=fail('Chuồng chưa được sửa.');
 else if(m.action==='hay'){
  const n=Number.isSafeInteger(m.n)?clamp(m.n,0,80):0,used=Math.min(n,80-B.hay);
  if(!used||peer.map!=='farm')result=fail('Máng đã đầy hoặc bạn chưa ở nông trại.');else{B.hay+=used;result={ok:true,used,message:'Đã thêm '+used+' Cỏ Khô vào máng chung.'};}
 }else if(m.action==='buy'){
  const A=ANIMALS[m.id];if(!A||A.myth||B.animals.length>=8)result=fail('Chuồng đã đầy hoặc vật nuôi không hợp lệ.');else{const added=addAnimal(m.id);result={ok:true,message:added.name+' đã về chuồng chung!'};}
 }else if(m.action==='vet'){
  if(S.flags.vetDay===dayIdx())result=fail('Hôm nay đàn vật nuôi đã được khám.');else{S.flags.vetDay=dayIdx();for(const animal of B.animals)animal.fr=Math.min(400,(animal.fr||0)+40);result={ok:true,message:'Cả đàn được khám, vui vẻ hơn!'};}
 }else if(m.action==='collect'||m.action==='pet'){
  const pos=peer.tgt||peer.rp;if(!a||!pos||peer.map!=='farm'||Math.hypot(pos.x-a.x,pos.y-a.y)>36)result=fail('Hãy lại gần con vật.');
  else if(m.action==='collect'){if(!a.prod)result=fail('Sản phẩm đã được người khác nhặt.');else{const item=a.prod;a.prod=null;result={ok:true,item,xp:ANIMALS[a.type].myth?12:4,message:'Đã nhặt '+ITEMS[item].n+'.'};}}
  else if(a.pet)result=fail('Hôm nay con vật đã được vuốt ve.');else{a.pet=true;a.fr=Math.min(400,(a.fr||0)+15);result={ok:true,message:'Bạn vuốt ve '+a.name+'. ♥'};}
 }else result=fail('Thao tác không hợp lệ.');
 ledger[m.token]={name:peer.name,result};save();return result;
}
function coopHostBarnRequest(m,slot){
 const result=coopBarnAccept(m,slot),conn=COOP.conns[slot];if(conn&&conn.open){try{conn.send(Object.assign({},result,{type:'barnresult',token:m.token,homeId:coopHomeId()}));}catch(e){}}
 coopBroadcastBarn();
}
function coopBarnResult(m){
 const pending=S.barnPending;if(!COOP.on||!pending||pending.token!==m.token||pending.homeId!==m.homeId)return;
 const cost=pending.cost;if(!m.ok){S.gold+=cost.gold;for(const [id,n]of Object.entries(cost.items))S.inv[id]=has(id)+n;}
 else{
  if(pending.action==='hay'){const refund=Math.max(0,(cost.items.cokho||0)-clamp(Number(m.used)||0,0,80));S.inv.cokho=has('cokho')+refund;}
  if(pending.action==='collect'&&m.item&&ITEMS[m.item]){S.inv[m.item]=has(m.item)+1;if(['trung','trungvang','trunghk'].includes(m.item))bump('eggs');gainXP('nong',Number(m.xp)||4);addPass(1);sfx('pick');}
 }
 delete S.barnPending;save();refreshHUD();toast(m.message||'Đã xử lý thao tác chuồng trại.');
 if(UI.menu&&MS&&['barn','moc','thuy'].includes(MS.kind))renderMenu();
}
function coopRetryBarn(){
 const p=S.barnPending;if(!p||!COOP.on)return;
 if(COOP.role==='host'){if(p.homeId===coopHomeId()){const result=coopBarnAccept(p,0);coopBarnResult(Object.assign({},result,{token:p.token,homeId:p.homeId}));coopBroadcastBarn();}return;}
 if(COOP.role!=='guest'||!(COOP.conn&&COOP.conn.open)||!COOP.home||p.homeId!==COOP.home.id)return;
 const now=Date.now();if(now<(COOP.barnRetry||0))return;COOP.barnRetry=now+2000;CoopNet.send({type:'barnrequest',token:p.token,homeId:p.homeId,day:p.day,action:p.action,id:p.id,n:p.n});
}

function coopOfferable(id){
 const item=ITEMS[id];if(!item||item.quest||item.seed)return false;
 return ['dua','duakl','thanhlong','saurieng','buoi','vai','thotnot','comnam','banh','banhchung','nemchua','banhit'].includes(id)||RECIPES.some(r=>r.id===id&&item.food);
}
function coopHomeId(){if(!S.homeId)S.homeId='home-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12);return S.homeId;}
function coopCleanOfferings(list){return Array.isArray(list)?list.filter(o=>o&&coopOfferable(o.item)).slice(0,3).map((o,i)=>({id:typeof o.id==='string'&&/^[a-z0-9-]{1,100}$/i.test(o.id)?o.id:'legacy-'+i+'-'+o.item,item:o.item,by:coopName(o.by)})):[];}
function coopAcceptOffering(m,slot){
 const fail=reason=>({ok:false,reason});if(!m||!coopOfferable(m.item))return fail('Lễ vật không phù hợp.');
 if(slot>0){
  if(!COOP.on||COOP.role!=='host'||!COOP.peers[slot])return fail('Không còn trong phòng.');
  if(typeof m.token!=='string'||!/^[a-z0-9-]{6,100}$/i.test(m.token)||m.homeId!==coopHomeId())return fail('Không đúng nhà chung.');
  const receipt=(S.homeOfferReceipts||{})[m.token];if(receipt){if(receipt.from===COOP.peers[slot].name&&receipt.item===m.item)return {ok:true};return fail('Mã lễ không hợp lệ.');}
  if(m.day!==dayIdx())return fail('Đã sang ngày mới. Lễ vật được trả lại túi.');
  const peer=COOP.peers[slot],altar=INT.home.furn.find(f=>f.k==='altar'),p=peer.tgt||peer.rp;
  if(peer.map!=='in:home'||!p||!altar)return fail('Bạn cần lại gần bàn thờ.');
  const x=clamp(p.x,altar.x*T,(altar.x+altar.w)*T),y=clamp(p.y-5,altar.y*T,(altar.y+altar.h)*T);if(Math.hypot(p.x-x,p.y-5-y)>24)return fail('Bạn cần lại gần bàn thờ.');
 }else if(!nearHomeAltar())return fail('Bạn cần lại gần bàn thờ.');
 S.homeOfferings=coopCleanOfferings(S.homeOfferings);if(S.homeOfferings.length>=3)return fail('Bàn thờ đã đủ 3 món lễ hôm nay.');
 const by=slot===0?S.name:COOP.peers[slot].name;S.homeOfferings.push({id:m.token||('offer-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10)),item:m.item,by:coopName(by)});
 if(slot>0){S.homeOfferReceipts=S.homeOfferReceipts||{};S.homeOfferReceipts[m.token]={from:by,item:m.item};save();}
 return {ok:true};
}
function coopClearHomeOfferings(ids,slot){
 if(COOP.on&&COOP.role!=='host')return false;
 if(!Array.isArray(ids)||!ids.length||ids.length>3)return false;
 if(slot>0){const peer=COOP.peers[slot],altar=INT.home.furn.find(f=>f.k==='altar'),p=peer&&(peer.tgt||peer.rp);if(!peer||peer.map!=='in:home'||!p||!altar)return false;const x=clamp(p.x,altar.x*T,(altar.x+altar.w)*T),y=clamp(p.y-5,altar.y*T,(altar.y+altar.h)*T);if(Math.hypot(p.x-x,p.y-5-y)>24)return false;}else if(!nearHomeAltar())return false;
 const current=coopCleanOfferings(S.homeOfferings),remaining=current.filter(o=>!ids.includes(o.id));if(current.length===remaining.length){coopBroadcastHome();return false;}
 S.homeOfferings=remaining;save();coopBroadcastHome();if(slot===0){toast('Đã dọn lễ trên bàn thờ.');if(UI.menu&&MS&&MS.kind==='altaroffer')renderMenu();}return true;
}
function coopHostOffering(m,slot){
 const result=coopAcceptOffering(m,slot),conn=COOP.conns[slot];
 if(conn&&conn.open){try{conn.send({type:'homeofferresult',token:m.token,item:m.item,homeId:coopHomeId(),ok:result.ok,reason:result.reason||''});}catch(e){/* Khách sẽ gửi lại cùng mã khi kết nối phục hồi. */}}
 if(result.ok)coopBroadcastHome();
}
function coopOfferingResult(m){
 const pending=S.homeOfferPending;if(!COOP.on||COOP.role!=='guest'||!pending||m.token!==pending.token||m.item!==pending.item||m.homeId!==pending.homeId)return;
 if(m.ok!==true)S.inv[pending.item]=has(pending.item)+1;
 delete S.homeOfferPending;save();refreshHUD();
 toast(m.ok?'Bạn thành kính dâng '+ITEMS[pending.item].n+' lên bàn thờ.':(m.reason||'Chưa đặt được lễ. Vật phẩm đã trả lại túi.'));
 if(UI.menu&&MS&&MS.kind==='altaroffer')renderMenu();
}
function coopRetryOffering(){
 const pending=S.homeOfferPending;if(!pending||!COOP.on||COOP.role!=='guest'||!(COOP.conn&&COOP.conn.open)||!COOP.home||pending.homeId!==COOP.home.id)return;
 const now=Date.now();if(now<(COOP.offerRetry||0))return;COOP.offerRetry=now+2000;CoopNet.send({type:'homeoffer',token:pending.token,item:pending.item,homeId:pending.homeId,day:pending.day});
}

function coopHomeState(){
 if(COOP.on&&COOP.role==='guest'&&COOP.home)return COOP.home;
 return {id:coopHomeId(),offerings:coopCleanOfferings(S.homeOfferings),house:S.house,furn:S.furn||[],flags:{hasKid:!!S.flags.hasKid,spouseRoom:!!S.flags.spouseRoom},kids:S.kids||[],incenseUntil:S.flags.homeIncenseUntil||0,sleepReady:COOP.sleepReady||{}};
}
function coopPackHome(){return coopClean(coopHomeState());}
function coopHomeCozy(){const h=coopHomeState();return h.furn.reduce((sum,id)=>sum+((FURN.find(f=>f.id===id)||{c:0}).c),0)+(HOUSES[h.house]||HOUSES.cap4).c;}
function coopApplyHome(h){
 if(!COOP.on||COOP.role!=='guest'||!h||typeof h!=='object')return;
 const ready={};for(let slot=0;slot<COOP_MAX;slot++)if(h.sleepReady&&h.sleepReady[slot]===true)ready[slot]=true;
 const kids=Array.isArray(h.kids)?h.kids.slice(0,2).filter(k=>k&&typeof k==='object'&&k.look&&typeof k.look==='object'):[];
 COOP.home={id:typeof h.id==='string'?h.id.slice(0,100):'',offerings:coopCleanOfferings(h.offerings),house:HOUSES[h.house]?h.house:'cap4',furn:Array.isArray(h.furn)?h.furn.filter(id=>FURN.some(f=>f.id===id)):[],flags:{hasKid:!!(h.flags&&h.flags.hasKid),spouseRoom:!!(h.flags&&h.flags.spouseRoom)},kids:coopClean(kids),incenseUntil:Number.isFinite(h.incenseUntil)?h.incenseUntil:0,sleepReady:ready};
 if(COOP.peers[0])COOP.peers[0].house=COOP.home.house;
 if(UI.menu&&MS&&((MS.kind==='home'&&!MS.sg)||MS.kind==='altaroffer'))renderMenu();
}
function coopBroadcastHome(){if(!COOP.on||COOP.role!=='host')return;const home=coopPackHome();COOP.homeLast=JSON.stringify(home);CoopNet.send({type:'homestate',home});if(UI.menu&&MS&&MS.kind==='home'&&!MS.sg)renderMenu();}
function coopLightIncense(slot){
 if(COOP.on&&COOP.role!=='host')return false;
 if(slot>0){const peer=COOP.peers[slot],altar=INT.home.furn.find(f=>f.k==='altar');if(!peer||peer.map!=='in:home'||!peer.rp||!altar)return false;const p=peer.tgt||peer.rp,x=clamp(p.x,altar.x*T,(altar.x+altar.w)*T),y=clamp(p.y-5,altar.y*T,(altar.y+altar.h)*T);if(Math.hypot(p.x-x,p.y-5-y)>24)return false;}
 if((S.flags.homeIncenseUntil||0)>Date.now()){coopBroadcastHome();return false;}
 S.flags.homeIncenseUntil=Date.now()+90000;save();coopBroadcastHome();return true;
}
function coopSetSleepReady(ready){
 if(!COOP.on||S.map!=='in:home')return;
 if(COOP.role==='guest'){if(!(COOP.conn&&COOP.conn.open))return;CoopNet.send({type:'sleepready',ready:!!ready});return;}
 COOP.sleepReady=COOP.sleepReady||{};COOP.sleepReady[0]=!!ready;coopBroadcastHome();
}
function coopRecvSleepReady(slot,ready){
 if(COOP.role!=='host'||!COOP.peers[slot])return;
 if(ready&&COOP.peers[slot].map!=='in:home')return;
 COOP.sleepReady=COOP.sleepReady||{};COOP.sleepReady[slot]=!!ready;coopBroadcastHome();
}
function coopSleepHTML(){
 if(!COOP.on)return '';const ready=coopHomeState().sleepReady,slots=[0].concat(Object.keys(COOP.peers).map(Number).filter(s=>s>0));if(COOP.slot>0&&!slots.includes(COOP.slot))slots.push(COOP.slot);slots.sort((a,b)=>a-b);
 const names=slots.map(slot=>{const name=slot===COOP.slot?S.name:((COOP.peers[slot]&&COOP.peers[slot].name)||'Host');return (ready[slot]?'✔ ':'○ ')+esc(name)+(slot===0?' · Host':'');});
 return '<div class="bundle" style="--c:#547e78"><h3>🌙 '+slots.filter(s=>ready[s]).length+'/'+slots.length+' người muốn ngủ</h3><p>'+names.join('<br>')+'</p><div class="bfoot"><small>Host quyết định khi nào sang ngày mới.</small><button class="btn sm" data-a="coopready">'+(ready[COOP.slot]?'Hủy sẵn sàng':'Sẵn sàng ngủ')+'</button></div></div>';
}

function coopPackWorld(){return coopClean({soil:S.soil,objs:S.objs,time:S.time,day:S.day,season:S.season,year:S.year,rain:S.rain,nextRain:S.nextRain,gold:S.gold,quests:coopPackQuests(),home:coopPackHome(),barn:coopPackBarn()});}
function coopApplyWorld(w){if(w.barn)coopApplyBarn(w.barn);if(w.home)coopApplyHome(w.home);if(w.quests)coopApplyQuests(w.quests);const soil={},objs={};for(const k in (w.soil||{})){const t=coopTile(w.soil[k]);if(t)soil[k]=t;}for(const k in (w.objs||{})){const o=coopObj(w.objs[k]);if(o)objs[k]=o;}
 S.soil=soil;S.objs=objs;S.time=+w.time||S.time;S.day=+w.day||1;S.season=+w.season||0;S.year=+w.year||1;S.rain=!!w.rain;S.nextRain=w.nextRain==null?null:!!w.nextRain;if(typeof updClock==='function')updClock(true);}
/* --- một nhà chính dùng chung cho cả phòng; tất cả các khu vườn đều dùng chung --- */
function coopEnsureHouses(){/* Không dựng thêm nhà khách. */}
function coopHouse(slot,on){/* Mọi người cùng dùng nhà chính. */}
function coopHouseSprite(b){
 if(b.id!=='house'){if(!SPR.coopBlank)SPR.coopBlank=mk(1,1,()=>{});return SPR.coopBlank;}
 const st=COOP.on&&COOP.slot!==0?((COOP.peers[0]&&COOP.peers[0].house)||'cap4'):S.house;
 return st==='ruong'?SPR.houseRuong:st==='san'?SPR.houseSan:SPR.house;
}
function coopHouseAct(id){enterInterior('home');}
function coopHomePos(){return [46*T+8,36*T+14];}
function coopHomeInterior(){
 const base=INT.home;if(!COOP.on)return base;
 const hostName=COOP.slot===0?S.name:((COOP.peers[0]&&COOP.peers[0].name)||'Host');
 const furn=base.furn.map(f=>{if(f.k==='bed')return Object.assign({},f,{n:'Giường của '+hostName,coopSlot:0});if(COOP.role==='guest'&&f.flag&&f.act)return Object.assign({},f,{act:()=>toast('Góc gia đình của Host. Bạn có thể dùng giường và bếp chung.')});return f;});
 const slots=Object.keys(COOP.peers).map(Number).filter(slot=>slot>0);
 if(COOP.slot>0&&!slots.includes(COOP.slot))slots.push(COOP.slot);
 slots.sort((a,b)=>a-b);
 for(const slot of slots){const name=slot===COOP.slot?S.name:COOP.peers[slot].name;
 furn.push({k:'bed',x:[4,1,4,1,4][slot-1],y:[2,5,5,8,8][slot-1],w:2,h:2,n:'Giường của '+name,coopSlot:slot,act:()=>openMenu('home')});}
 return Object.assign({},base,{n:'Nhà chung · '+(slots.length+1)+' giường',w:14,h:12,furn});
}

function coopInitPlot(slot){S.coopInit=S.coopInit||{};if(S.coopInit[slot])return;S.coopInit[slot]=1;const r=mulberry(2027+slot*31),z=ZONES.farm,P=COOP_PLOTS[slot];
 for(let y=P.y0;y<=P.y1;y++)for(let x=P.x0;x<=P.x1;x++){if(z.WT[y*z.W+x]!==0||z.OCC[y*z.W+x])continue;const k=x+','+y;if(S.soil[k]||S.objs[k])continue;const v=r();if(v<.2)S.objs[k]={t:'weed'};else if(v<.27)S.objs[k]={t:'stone'};}}
function coopSpawnPlotWeeds(){const z=ZONES.farm;for(const s in COOP.peers){const slot=+s;if(slot<1)continue;const P=COOP_PLOTS[slot];for(let i=0;i<5;i++){const x=P.x0+Math.floor(Math.random()*(P.x1-P.x0+1)),y=P.y0+Math.floor(Math.random()*(P.y1-P.y0+1)),k=x+','+y;if(z.WT[y*z.W+x]===0&&!z.OCC[y*z.W+x]&&!S.soil[k]&&!S.objs[k]&&Math.random()<.5)S.objs[k]={t:'weed'};}}}
/* --- lưu bản đồ phía Host --- */
function coopSaveMap(){if(!COOP.on||COOP.role!=='host')return;try{localStorage.setItem(COOP_KEY,JSON.stringify({t:Date.now(),world:coopPackWorld(),slots:S.coopSlots||{}}));}catch(e){}}
function coopSaveSoon(){COOP.saveT=4;}
function coopSaveView(){const b=Object.assign({},S,{map:'farm'});if(COOP.on&&COOP.role==='guest'&&S.soilSolo){b.soil=S.soilSolo;b.objs=S.objsSolo;}delete b.soilSolo;delete b.objsSolo;return COOP.on&&COOP.role==='guest'?coopSoloProgressView(b):b;}
/* --- gửi/nhận hành động đất đai --- */
function coopAct(action,x,y,extra){if(!COOP.on||S.map!=='farm')return;const k=x+','+y;CoopNet.send(Object.assign({type:'act',s:COOP.slot,action,tileX:x,tileY:y,tile:coopClean(S.soil[k]),obj:coopClean(S.objs[k])},extra||{}));if(COOP.role==='host')coopSaveSoon();}
function coopRecvAct(m){const x=m.tileX|0,y=m.tileY|0;if(x<0||y<0||x>=80||y>=80)return;const k=x+','+y,s=m.s|0;
 if(s<0||s>=COOP_MAX)return;
 if(m.action==='water'){if(S.soil[k])S.soil[k].w=true;if(S.map==='farm')splash(x,y);if(COOP.role==='host')coopSaveSoon();return;}
 const t=coopTile(m.tile);if(t)S.soil[k]=t;else delete S.soil[k];
 const o=coopObj(m.obj);if(o)S.objs[k]=o;else delete S.objs[k];
 if(S.map==='farm'){if(m.action==='water')splash(x,y);else if(m.action==='harvest')burst(x*T+8,y*T+6,['#f2d14a','#7cc85a','#fff'],8);else dust(x,y,m.action==='hoe'?'#8a5a34':'#c9a46e');}
 if(COOP.role==='host')coopSaveSoon();}
/* --- vị trí những người khác --- */
function coopRecvPos(m){const s=m.s|0,P=COOP.peers[s];if(!P||s===COOP.slot)return;const x=+m.x,y=+m.y;if(!isFinite(x)||!isFinite(y))return;P.map=String(m.m||'').slice(0,16);P.tgt={x,y,d:(m.d|0)&3,mv:m.mv?1:0};if(!P.rp)P.rp={x,y,a:0};}
function coopPushPeers(dr){if(!COOP.on||(!ZONES[S.map]&&S.map!=='in:home'))return;for(const s in COOP.peers){const P=COOP.peers[s];if(P.rp&&P.look&&P.map===S.map)dr.push([P.rp.y,()=>drawRemotePeer(P)]);}}
function drawRemotePeer(P){const r=P.rp,t=P.tgt;softShadow(ctx,r.x,r.y,5,.3);outlined(ctx,r.x,r.y,(g,ax,ay)=>drawPerson(g,ax,ay,P.look,t.d,r.a,!!t.mv));coopTag(r.x,r.y,P.name);}
function coopTag(x,y,name){x=Math.round(x);y=Math.round(y);ctx.font='bold 6px "Be Vietnam Pro",sans-serif';ctx.textAlign='center';const w=Math.ceil(ctx.measureText(name).width)+6;P(ctx,Math.round(x-w/2),y-40,w,8,'rgba(30,20,60,.8)');ctx.fillStyle='#fff';ctx.fillText(name,x,y-34);}
/* --- đồng hồ & sang ngày --- */
function coopRecvClock(m){S.time=+m.time||S.time;S.day=+m.day||S.day;S.season=+m.season||0;S.year=+m.year||S.year;S.rain=!!m.rain;if(typeof updClock==='function')updClock(true);}
function coopRecvNewDay(m){COOP.fromHost=true;fadeTo(()=>{try{newDay(false);}finally{COOP.fromHost=false;}coopApplyWorld(m.world);placeAtHome();},500);toast('Host đã đi ngủ: cả phòng sang ngày mới!');}
function newDay(passed,reason,hosp){
 if(COOP.on&&COOP.role==='guest'&&!COOP.fromHost){const keep={time:S.time,day:S.day,season:S.season,year:S.year,rain:S.rain,nextRain:S.nextRain},sv=JSON.stringify({soil:S.soil,objs:S.objs});newDay0(passed,reason,hosp);Object.assign(S,keep);const o=JSON.parse(sv);S.soil=o.soil;S.objs=o.objs;return;}
 newDay0(passed,reason,hosp);
 if(COOP.on&&COOP.role==='host'){COOP.sleepReady={};COOP.homeLast='';coopSpawnPlotWeeds();CoopNet.send({type:'newday',world:coopPackWorld()});coopSaveMap();}}
/* --- vào/ra phòng --- */
function coopAddPeer(p){const slot=p.slot|0;if(slot===COOP.slot||slot<0||slot>=COOP_MAX)return;/* NEW: Tránh trùng peer cùng tên ở slot này */if(COOP.peers[slot]&&COOP.peers[slot].name===coopName(p.name))return;COOP.peers[slot]={slot,name:coopName(p.name),look:peerLook(p.look),house:['ruong','san'].includes(p.house)?p.house:'cap4',map:null,rp:null,tgt:null};if(slot>0)coopHouse(slot,true);}
function coopRemovePeer(slot){if(COOP.sleepReady)delete COOP.sleepReady[slot];const p=COOP.peers[slot];delete COOP.peers[slot];delete S.coopSlots[slot];/* NEW: clean up conn nếu có */if(COOP.conns[slot]){try{COOP.conns[slot].close();}catch(e){}}COOP.conns[slot]=null;if(slot>0)coopHouse(slot,false);}
const coopCount=()=>1+Object.keys(COOP.conns).filter(s=>COOP.conns[s]&&COOP.conns[s].open).length;
function coopStartGuest(m){if(COOP.joinTimer){clearTimeout(COOP.joinTimer);COOP.joinTimer=null;}
 coopCaptureSoloProgress();coopInitGuestMoney(m.world);COOP.slot=m.slot|0;S.soilSolo=S.soil;S.objsSolo=S.objs;COOP.on=true;COOP.peers={};coopEnsureHouses();
 for(const p of (m.roster||[]))coopAddPeer(p);coopHouse(COOP.slot,true);coopApplyWorld(m.world||{});MINE=null;S.map='farm';syncZone();placeAtHome();$('#loc').classList.add('hidden');
 COOP.chatLoading=true;try{for(const message of (Array.isArray(m.chat)?m.chat:[]).slice(-30))coopChatReceive(message);}finally{COOP.chatLoading=false;}
 CoopNet.setStatus('connected');toast(`🤝 Đã vào phòng của ${(COOP.peers[0]&&COOP.peers[0].name)||'Host'} (${Object.keys(COOP.peers).length+1}/${COOP_MAX} người). Cả phòng dùng chung nhà chính. Mọi khu vườn đều có thể cùng làm và phá dọn.`);save();}
function coopTeardown(reason){const wasGuest=COOP.on&&COOP.role==='guest';
 if(COOP.on){coopSaveMap();if(wasGuest&&S.soilSolo){S.soil=S.soilSolo;S.objs=S.objsSolo;delete S.soilSolo;delete S.objsSolo;}for(let s=1;s<COOP_MAX;s++)coopHouse(s,false);}
 try{if(COOP.conn)COOP.conn.close();}catch(e){}for(const s in COOP.conns){try{COOP.conns[s].close();}catch(e){}}try{if(COOP.peer)COOP.peer.destroy();}catch(e){}
 if(wasGuest)coopRestoreSoloProgress();
 if(COOP.joinTimer)clearTimeout(COOP.joinTimer);
 Object.assign(COOP,{soloProgress:null,soloPxpEarned:0,barn:null,barnT:0,barnRetry:0,home:null,homeLast:'',homeT:0,offerRetry:0,sleepReady:{},quest:null,questT:0,questLast:'',status:'idle',on:false,role:null,slot:-1,peer:null,conn:null,conns:{},peers:{},code:'',joinTimer:null});
 coopChatReset();
 if(wasGuest){if(S.map!=='mine')placeAtHome();save();}
 if(reason)toast(reason);}
const coopErr=e=>{const t=e&&e.type;return t==='peer-unavailable'?'Không tìm thấy phòng với mã này. Kiểm tra lại mã hoặc nhờ Host tạo phòng lại.':t==='unavailable-id'?'Mã phòng bị trùng, thử lại.':(t==='network'||t==='server-error'||t==='socket-error'||t==='socket-closed')?'Không kết nối được máy chủ trung gian PeerJS. Kiểm tra mạng. (Khung xem của Claude chặn kết nối ngoài: hãy tải file HTML về mở trên máy.)':t==='browser-incompatible'?'Trình duyệt không hỗ trợ WebRTC.':'Lỗi kết nối: '+((e&&(e.message||e.type))||'không rõ');};
function coopSendAll(m,except){for(const s in COOP.conns){if(+s===except)continue;const c=COOP.conns[s];if(c&&c.open){try{c.send(m);}catch(e){}}}}
const CoopNet={
 ui(){coopChatUI();if(typeof UI!=='undefined'&&UI.menu&&typeof MS!=='undefined'&&MS&&MS.kind==='coop')renderMenu();},
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
  /* NEW: Kiểm tra xem tên này đã có trong phòng chưa (trong mọi slots) */
  const nameTaken=()=>Object.values(COOP.peers).some(p=>p.name===name);
  /* NEW: Kiểm tra xem slot này đang có connection mở không */
  const used=s=>!!(COOP.conns[s]&&COOP.conns[s].open);
  /* NEW: Kiểm tra peer tên này đã tồn tại ở slot này chưa */
  const hasPeer=s=>COOP.peers[s]&&COOP.peers[s].name===name;
  let slot=0;
  /* NEW: Nếu tên đã có trong phòng → không gán slot mới, báo người chơi đã ở phòng */
  if(nameTaken()){try{conn.send({type:'full'});}catch(e){}setTimeout(()=>conn.close(),300);return null;}
  /* NEW: Ưu tiên slot cũ nếu tên khớp và slot rỗng (rejoin case) */
  for(let s=1;s<COOP_MAX&&!slot;s++) 
    if(!used(s)&&!hasPeer(s)) slot=s;
  /* NEW: Slot mới cho tên chưa từng có */
  for(let s=1;s<COOP_MAX&&!slot;s++) 
    if(!used(s)&&!S.coopSlots[s]) slot=s;
  /* NEW: Slot rỗng nhất */
  for(let s=1;s<COOP_MAX&&!slot;s++) 
    if(!used(s)) slot=s;
  if(!slot){try{conn.send({type:'full'});}catch(e){}setTimeout(()=>conn.close(),300);return null;}
  S.coopSlots[slot]=name;COOP.conns[slot]=conn;
  /* NEW: Chỉ gọi coopAddPeer nếu chưa có peer ở slot này */
  if(!COOP.peers[slot])coopAddPeer({slot,name,look:m.look,house:m.house});else{
    /* Cập nhật peer cũ với dữ liệu mới */
    COOP.peers[slot]={slot,name:coopName(m.name),look:m.look,house:m.house,map:null,rp:null,tgt:null};
  }
  coopInitPlot(slot);
  const roster=[{slot:0,name:S.name,look:compactLook(),house:S.house}].concat(Object.keys(COOP.peers).map(s=>COOP.peers[s]).filter(p=>p.slot>0).map(p=>({slot:p.slot,name:p.name,look:compactFromPeer(p),house:p.house})));
  try{conn.send({type:'snapshot',slot,world:coopPackWorld(),roster,chat:(COOP.chatHistory||[]).slice(-30)});}catch(e){}
  coopSendAll({type:'join',p:{slot,name,look:m.look,house:m.house}},slot);
  coopSaveMap();CoopNet.setStatus('connected');toast(`🤝 ${name} đã vào phòng (${CoopNet.count()}/${COOP_MAX}). Cả phòng dùng chung nhà chính.`);save();return slot;},
 dropSlot(slot){const p=COOP.peers[slot];delete COOP.conns[slot];coopRemovePeer(slot);coopSendAll({type:'leave',slot});coopSaveMap();CoopNet.ui();toast(`${p?p.name:'Một người chơi'} đã rời phòng (${CoopNet.count()}/${COOP_MAX}).`);},
 count(){return 1+Object.keys(COOP.conns).filter(s=>COOP.conns[s]&&COOP.conns[s].open).length;},
 joinRoom(code){const P=coopPeerCtor();code=String(code||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');if(!P){CoopNet.setStatus('error','Chưa tải được thư viện PeerJS.');return;}if(code.length<4){CoopNet.setStatus('error','Hãy nhập mã phòng của Host.');return;}
  coopTeardown();COOP.role='guest';CoopNet.setStatus('joining');
  const peer=new P(coopPeerOpts());COOP.peer=peer;
  peer.on('open',()=>{const conn=peer.connect(COOP_PREFIX+code,{reliable:true});COOP.conn=conn;
   conn.on('open',()=>CoopNet.send({type:'hello',name:S.name,look:compactLook(),house:S.house}));
   conn.on('data',coopGuestHandle);
   conn.on('close',()=>{if(COOP.conn===conn){const was=COOP.on;coopTeardown(was?'Mất kết nối với Host. Bạn quay về nông trại của mình.':'');CoopNet.ui();}});
   conn.on('error',e=>CoopNet.fail(coopErr(e)));});
  peer.on('error',e=>CoopNet.fail(coopErr(e)));
  COOP.joinTimer=setTimeout(()=>{if(!COOP.on)CoopNet.fail('Hết thời gian chờ: phòng không phản hồi.');},15000);},
 leave(){CoopNet.send({type:'bye'});setTimeout(()=>{coopTeardown('Đã rời phòng co-op.');CoopNet.setStatus('idle');},120);},
 sleepReq(){coopSetSleepReady(true);CoopNet.send({type:'sleepreq'});toast('Đã báo Host bạn muốn ngủ. Khi Host đi ngủ, cả phòng sang ngày mới.');},
 tick(dt){
  for(const s in COOP.peers){const P=COOP.peers[s];if(P.rp&&P.tgt){const k=Math.min(1,dt*12);P.rp.x+=(P.tgt.x-P.rp.x)*k;P.rp.y+=(P.tgt.y-P.rp.y)*k;if(P.tgt.mv)P.rp.a+=dt*8;}}
  if(!COOP.on)return;
  coopRetryOffering();coopRetryBarn();
  if(COOP.role==='guest'&&!(COOP.conn&&COOP.conn.open))return;
  COOP.posT-=dt;if(COOP.posT<=0){COOP.posT=.1;const m={type:'pos',s:COOP.slot,m:S.map,x:Math.round(player.x),y:Math.round(player.y),d:player.dir,mv:player.mov?1:0},key=m.m+m.x+','+m.y+m.d+m.mv;if(key!==COOP.lastPos||Math.random()<.05){COOP.lastPos=key;CoopNet.send(m);}}
  if(COOP.role==='host'){COOP.barnT=(COOP.barnT||0)-dt;if(COOP.barnT<=0){COOP.barnT=.5;coopBroadcastBarn();}if(COOP.sleepReady&&S.map!=='in:home')COOP.sleepReady[0]=false;COOP.homeT=(COOP.homeT||0)-dt;if(COOP.homeT<=0){COOP.homeT=1;const home=coopPackHome();if(JSON.stringify(home)!==COOP.homeLast)coopBroadcastHome();}COOP.questT=(COOP.questT||0)-dt;if(COOP.questT<=0){COOP.questT=1;const quest=coopPackQuests(),json=JSON.stringify(quest);if(json!==COOP.questLast){COOP.questLast=json;CoopNet.send({type:'quests',quest});}}COOP.clockT-=dt;if(COOP.clockT<=0){COOP.clockT=3;CoopNet.send({type:'clock',time:S.time,day:S.day,season:S.season,year:S.year,rain:S.rain});}
   if(COOP.saveT>0){COOP.saveT-=dt;if(COOP.saveT<=0)coopSaveMap();}}}
};
function compactFromPeer(p){const L=p.look||{};return {k:L.skin,h:L.hair,s:L.shirt,p:L.pants,lg:L.long?1:0,ht:L.hat?1:0,dr:L.dress?1:0,tr:L.trim||'',hg:L.hatGold?1:0};}
function coopHostHandle(m,slot){
 switch(m.type){
  case 'pos':m.s=slot;coopRecvPos(m);if(COOP.sleepReady&&m.m!=='in:home')COOP.sleepReady[slot]=false;coopSendAll(m,slot);break;
  case 'act':m.s=slot;coopRecvAct(m);coopSendAll(m,slot);break;
  case 'chat':{const ok=coopChatHost(m.text,slot,m.clientId),c=COOP.conns[slot];if(!ok&&c&&c.open){try{c.send({type:'chatreject',clientId:m.clientId});}catch(e){}}break;}
  case 'queststat':coopQuestStat(m,slot);break;
  case 'barnrequest':coopHostBarnRequest(m,slot);break;
  case 'homeclear':coopClearHomeOfferings(m.ids,slot);break;
  case 'homeoffer':coopHostOffering(m,slot);break;
  case 'homeincense':coopLightIncense(slot);break;
  case 'sleepready':coopRecvSleepReady(slot,m.ready===true);break;
  case 'sleepreq':{const p=COOP.peers[slot];toast(`🌙 ${p?p.name:'Một người chơi'} muốn đi ngủ. Bạn ngủ ở nhà thì cả phòng sang ngày mới.`);break;}
  case 'bye':{const c=COOP.conns[slot];CoopNet.dropSlot(slot);try{c&&c.close();}catch(e){}break;}
   case 'kick':{const p=COOP.peers[slot];if(p){coopRemovePeer(slot);CoopNet.setStatus('connected');toast(`👢 ${p.name} đã bị kick khỏi phòng.`);}break;}
 }}
function coopGuestHandle(m){if(!m||typeof m!=='object')return;
 switch(m.type){
  case 'snapshot':if(!COOP.on)coopStartGuest(m);break;
  case 'join':if(COOP.on&&m.p){coopAddPeer(m.p);toast(`🤝 ${coopName(m.p.name)} đã vào phòng.`);CoopNet.ui();}break;
  case 'leave':if(COOP.on){const p=COOP.peers[m.slot|0];coopRemovePeer(m.slot|0);toast(`${p?p.name:'Một người chơi'} đã rời phòng.`);CoopNet.ui();}break;
   case 'kick':if(COOP.on){const p=COOP.peers[m.slot|0];if(p){coopRemovePeer(m.slot|0);toast(`👢 Bạn đã被 kick khỏi phòng.`);CoopNet.ui();}}break;
  case 'pos':if(COOP.on)coopRecvPos(m);break;
  case 'act':if(COOP.on)coopRecvAct(m);break;
  case 'barnstate':if(COOP.on)coopApplyBarn(m.barn);break;
  case 'barnresult':if(COOP.on)coopBarnResult(m);break;
  case 'homeofferresult':if(COOP.on)coopOfferingResult(m);break;
  case 'homestate':if(COOP.on)coopApplyHome(m.home);break;
  case 'chatreject':if(COOP.on)coopChatFail(m.clientId,'Tin chưa gửi được. Chờ một chút rồi thử lại.');break;
  case 'chatmsg':if(COOP.on)coopChatReceive(m);break;
  case 'quests':if(COOP.on)coopApplyQuests(m.quest);break;
  case 'clock':if(COOP.on)coopRecvClock(m);break;
  case 'newday':if(COOP.on)coopRecvNewDay(m);break;
  case 'full':CoopNet.fail('Phòng đã đủ '+COOP_MAX+' người.');break;
  case 'bye':coopTeardown('Host đã đóng phòng.');CoopNet.ui();break;
 }}

function coopChatLayout(){
 const panel=document.getElementById('room-chat'),button=document.getElementById('b-roomchat');if(!panel||!button)return;
 const viewport=window.visualViewport,w=viewport?viewport.width:window.innerWidth,h=viewport?viewport.height:window.innerHeight,left=viewport?viewport.offsetLeft:0,top=viewport?viewport.offsetTop:0;
 const margin=10,width=Math.max(0,Math.min(370,w-margin*2)),short=h<450,y=top+(short?margin:108),height=Math.max(0,Math.min(420,top+h-margin-y));
 panel.style.left=(left+w-margin-width)+'px';panel.style.right='auto';panel.style.top=y+'px';panel.style.bottom='auto';panel.style.width=width+'px';panel.style.height=height+'px';panel.classList.toggle('chat-compact',height<240);
 const buttonWidth=Math.max(0,Math.min(160,w-88));button.style.left=(left+w-70-buttonWidth)+'px';button.style.right='auto';button.style.width=buttonWidth+'px';button.style.top=(top+Math.min(64,Math.max(8,h-46)))+'px';
}
function coopChatStatus(text,error){COOP.chatStatus=text;COOP.chatError=!!error;const el=document.getElementById('room-chat-status');if(el){el.textContent=text;el.dataset.error=error?'true':'false';}}
function coopChatUI(){
 coopChatLayout();const get=id=>document.getElementById(id),button=get('b-roomchat'),panel=get('room-chat');if(!button||!panel)return;
 button.classList.toggle('hidden',!COOP.on);panel.classList.toggle('hidden',!COOP.on||!COOP.chatOpen);button.setAttribute('aria-expanded',COOP.on&&COOP.chatOpen?'true':'false');button.textContent='💬 Chat chung'+(COOP.chatUnread?' ('+COOP.chatUnread+')':'');
 const input=get('room-chat-input'),send=get('room-chat-send'),count=get('room-chat-count'),members=get('room-chat-members'),fresh=get('room-chat-new');
 if(input){input.readOnly=!!COOP.chatPending;if(send){send.disabled=!COOP.on||!!COOP.chatPending||!coopChatText(input.value);send.textContent=COOP.chatPending?'Đang gửi…':'Gửi';}if(count)count.textContent=Array.from(input.value).length+'/240';}
 if(members)members.textContent=(1+Object.keys(COOP.peers||{}).length)+' người trong phòng · '+(COOP.role==='host'?'Bạn là Host':'Kết nối qua Host');
 if(fresh){fresh.classList.toggle('hidden',!COOP.chatOpen||!COOP.chatUnread);fresh.textContent=COOP.chatUnread+' tin mới ↓';}
}
function coopChatToggle(open){
 if(!COOP.on)return;COOP.chatOpen=open==null?!COOP.chatOpen:!!open;if(COOP.chatOpen)COOP.chatUnread=0;coopChatUI();
 const input=document.getElementById('room-chat-input');if(input){if(COOP.chatOpen)input.focus();else input.blur();}const log=document.getElementById('room-chat-log');if(log)log.scrollTop=log.scrollHeight;
}
function coopChatText(value){return typeof value==='string'?Array.from(value).map(ch=>ch.charCodeAt(0)<32||ch.charCodeAt(0)===127?' ':ch).join('').trim().slice(0,240):'';}
function coopChatConfirm(m){
 const pending=COOP.chatPending;if(!pending||m.slot!==COOP.slot||m.clientId!==pending.id)return;
 clearTimeout(COOP.chatTimeout);COOP.chatPending=null;COOP.chatRetry=null;const input=document.getElementById('room-chat-input');if(input){input.value='';input.readOnly=false;}coopChatStatus('Đã gửi',false);
}
function coopChatReceive(m){
 if(!COOP.on||!m||!Number.isSafeInteger(m.id)||!Number.isInteger(m.slot)||m.slot<0||m.slot>=COOP_MAX)return;
 const body=coopChatText(m.text);if(!body)return;coopChatConfirm(m);
 COOP.chatSeen=COOP.chatSeen||[];if(COOP.chatSeen.includes(m.id)){coopChatUI();return;}COOP.chatSeen.push(m.id);if(COOP.chatSeen.length>100)COOP.chatSeen.shift();
 COOP.chatHistory=COOP.chatHistory||[];COOP.chatHistory.push(m);if(COOP.chatHistory.length>100)COOP.chatHistory.shift();
 const log=document.getElementById('room-chat-log');let follow=true;if(log){follow=log.scrollHeight-log.scrollTop-log.clientHeight<36;const row=document.createElement('div');row.className='room-chat-row'+(m.slot===COOP.slot?' mine':'');const name=document.createElement('b');name.textContent=coopName(m.name)+(m.slot===0?' · Host':'');const time=document.createElement('time');time.textContent=new Date(Number.isFinite(m.at)?m.at:Date.now()).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Bangkok'});const text=document.createElement('p');text.textContent=body;row.append(name,time,text);log.append(row);while(log.children.length>100)log.firstChild.remove();if(COOP.chatOpen&&(follow||m.slot===COOP.slot))log.scrollTop=log.scrollHeight;}
 if((!COOP.chatOpen||!follow)&&m.slot!==COOP.slot&&!COOP.chatLoading)COOP.chatUnread=Math.min(99,(COOP.chatUnread||0)+1);coopChatUI();
}
function coopChatHost(text,slot,clientId){
 if(!COOP.on||COOP.role!=='host')return false;const peer=slot===0?{name:S.name}:COOP.peers[slot];if(!peer)return false;
 const token=typeof clientId==='string'&&/^[a-z0-9-]{1,100}$/i.test(clientId)?clientId:'';COOP.chatRequests=COOP.chatRequests||{};const key=slot+':'+token;
 if(token&&COOP.chatRequests[key]){const m=COOP.chatRequests[key],conn=COOP.conns[slot];if(slot===0)coopChatReceive(m);else if(conn&&conn.open){try{conn.send(m);}catch(e){}}return true;}
 const body=coopChatText(text);if(!body)return false;const now=Date.now();COOP.chatRates=COOP.chatRates||{};if(now-(COOP.chatRates[slot]||0)<600)return false;COOP.chatRates[slot]=now;
 COOP.chatSeq=(COOP.chatSeq||0)+1;const m={type:'chatmsg',id:COOP.chatSeq,slot,name:coopName(peer.name),text:body,at:now,clientId:token};if(token){COOP.chatRequests[key]=m;const keys=Object.keys(COOP.chatRequests);if(keys.length>256)delete COOP.chatRequests[keys[0]];}
 coopChatReceive(m);coopSendAll(m);return true;
}
function coopChatFail(id,message){
 const pending=COOP.chatPending;if(!pending||pending.id!==id)return;clearTimeout(COOP.chatTimeout);COOP.chatRetry=pending;COOP.chatPending=null;coopChatStatus(message||'Chưa gửi được. Bấm Gửi để thử lại.',true);coopChatUI();
}
function coopChatSubmit(){
 const input=document.getElementById('room-chat-input');if(!input||!COOP.on||COOP.chatPending||COOP.chatComposing)return;
 const text=coopChatText(input.value);if(!text)return;
 if(COOP.role==='guest'&&!(COOP.conn&&COOP.conn.open)){coopChatStatus('Mất kết nối. Nội dung vẫn được giữ lại.',true);return;}
 const retry=COOP.chatRetry,pending=retry&&retry.text===text?retry:{id:'chat-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10),text};COOP.chatPending=pending;coopChatStatus('Đang gửi…',false);coopChatUI();
 COOP.chatTimeout=setTimeout(()=>coopChatFail(pending.id,'Chưa nhận xác nhận. Bấm Gửi để thử lại.'),8000);
 if(COOP.role==='host'){if(!coopChatHost(text,0,pending.id))coopChatFail(pending.id,'Bạn gửi hơi nhanh. Hãy thử lại.');}
 else{try{COOP.conn.send({type:'chat',text,clientId:pending.id});}catch(e){coopChatFail(pending.id,'Gửi chưa thành công. Hãy thử lại.');}}
}
function coopChatReset(){
 clearTimeout(COOP.chatTimeout);COOP.chatPending=null;COOP.chatRetry=null;COOP.chatComposing=false;COOP.chatOpen=false;COOP.chatUnread=0;COOP.chatSeen=[];COOP.chatHistory=[];COOP.chatRequests={};COOP.chatRates={};COOP.chatSeq=0;
 const log=document.getElementById('room-chat-log'),input=document.getElementById('room-chat-input');if(log)log.replaceChildren();if(input){input.readOnly=false;input.blur();}coopChatStatus('Enter để gửi · Esc để đóng',false);coopChatUI();
}

function coopMenuHTML(){
 const lib=!!coopPeerCtor(),st=COOP.status;
 let h=`<div class="note">Chơi chung tối đa <b>${COOP_MAX} người</b> qua mạng ngang hàng (PeerJS, miễn phí, không cần máy chủ của game). Cả phòng dùng <b>nhà chung, vườn chung và nhiệm vụ chung theo Host</b>. Mọi người đều có thể xới đất, trồng, tưới, bón phân, thu hoạch và phá cây trên tất cả khu vườn. Túi đồ riêng; <b>tiền khách lấy theo Host khi vào phòng, sau đó kiếm và tiêu riêng</b>; mọi người cùng đi lại trên một nông trại và thấy nhau làm việc theo thời gian thực. Máy <b>Host</b> giữ và lưu bản đồ; mọi người cùng chăm sóc các khu vườn quanh nông trại.</div>`;
 if(!lib)h+='<div class="note" style="color:#a02a1a"><b>Chưa tải được thư viện PeerJS.</b> Kiểm tra kết nối mạng rồi tải lại trang.</div>';
 if(COOP.on){
  const names=[`${COOP.slot===0?esc(S.name)+' (bạn)':esc((COOP.peers[0]&&COOP.peers[0].name)||'Host')} · Host`].concat(Object.keys(COOP.peers).filter(s=>+s>0).sort().map(s=>`${esc(COOP.peers[s].name)} · vườn ${s}`)).concat(COOP.slot>0?[`${esc(S.name)} (bạn) · vườn ${COOP.slot}`]:[]);
  h+=`<div class="bundle" style="--c:#3a9a5a"><h3>🤝 Phòng co-op · ${COOP.role==='host'?'Bạn là Host':'Bạn là Guest'} <span class="tag g">${names.length}/${COOP_MAX} người</span></h3>${COOP.role==='host'?`<p>Gửi mã này cho bạn bè (còn ${COOP_MAX-names.length} chỗ):</p><div style="display:flex;gap:6px;align-items:center;margin:6px 0"><input id="coop-code" readonly value="${esc(COOP.code)}" style="flex:1;min-width:0;font:800 22px 'Be Vietnam Pro',sans-serif;letter-spacing:4px;text-align:center;padding:8px;border:2px solid var(--lacquer);border-radius:6px;background:var(--chip);color:var(--ink)"><button class="btn sm" data-a="coopcopy">Sao chép</button></div>`:'<p>Đồng hồ và bản đồ theo Host. Muốn sang ngày mới, hãy nhờ Host đi ngủ (bạn bấm Ngủ ở nhà để nhắc Host).</p>'}<p><b>Trong phòng:</b><br>${names.map(n=>'• '+n).join('<br>')}</p><p>Cả phòng dùng chung nhà chính. Bấm 💬 Chat co-op ở phía dưới để nhắn tin.</p><div class="bfoot"><span></span><button class="btn red sm" data-a="coopleave">${COOP.role==='host'?'Đóng phòng':'Rời phòng'}</button></div></div>`;}
 else if(st==='creating'||st==='joining'){h+=`<div class="empty">${st==='creating'?'Đang tạo phòng…':'Đang kết nối tới phòng…'}</div>`;}
 else{h+=`<div class="bundle" style="--c:#3a6ab0"><h3>Tạo Phòng (Host)</h3><p>Bạn là chủ phòng: bản đồ nông trại lưu ở máy bạn. Tối đa ${COOP_MAX} người (bạn + ${COOP_MAX-1} bạn bè).</p><div class="bfoot"><span></span><button class="btn red sm" data-a="coophost" ${lib?'':'disabled'}>Tạo Phòng</button></div></div>
  <div class="bundle" style="--c:#6fa83c"><h3>Vào Phòng (Guest)</h3><p>Nhập mã phòng mà Host gửi cho bạn.</p><div style="display:flex;gap:6px;align-items:center;margin:6px 0"><input id="coop-in" maxlength="8" placeholder="Nhập mã phòng" autocomplete="off" value="${esc(COOP.inVal||'')}" style="flex:1;min-width:0;font:800 18px 'Be Vietnam Pro',sans-serif;letter-spacing:3px;text-transform:uppercase;text-align:center;padding:8px;border:2px solid var(--lacquer);border-radius:6px;background:var(--chip);color:var(--ink)"><button class="btn red sm" data-a="coopjoin" ${lib?'':'disabled'}>Vào Phòng</button></div></div>`;
  if(st==='error')h+=`<div class="note" style="color:#a02a1a">${esc(COOP.msg)}</div>`;}
 return h;}
document.addEventListener('input',e=>{if(e.target&&e.target.id==='coop-in')COOP.inVal=e.target.value;});
