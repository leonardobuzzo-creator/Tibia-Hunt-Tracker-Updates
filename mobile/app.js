import{createClient}from'https://esm.sh/@supabase/supabase-js@2.57.4';
const cfg=window.THT_CONFIG,db=createClient(cfg.SUPABASE_URL,cfg.SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
let S={characters:[],characterId:null,hunts:[],sessions:[]};
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const nf=n=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(Number(n||0));
const short=n=>{n=Number(n||0);return Math.abs(n)>=1e6?nf(n/1e6)+'M':Math.abs(n)>=1e3?nf(n/1e3)+'k':nf(n)};
const dur=s=>{s=Number(s||0);return Math.floor(s/3600)+'h'+String(Math.floor((s%3600)/60)).padStart(2,'0')+'m'};
const date=d=>{if(!d)return'';const[y,m,x]=d.split('-');return x+'/'+m+'/'+y};
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const sprite=n=>'https://www.tibiawiki.com.br/wiki/Special:Redirect/file/'+encodeURIComponent(String(n||'').trim().replace(/\s+/g,'_').replace(/(^|_)([a-z])/g,(_,a,b)=>a+b.toUpperCase())+'.gif');

function signed(on){$('#login').classList.toggle('hidden',on);$('#app').classList.toggle('hidden',!on);$('#tabs').classList.toggle('hidden',!on)}
async function boot(){const{data:{session}}=await db.auth.getSession();if(!session)return signed(false);signed(true);await loadCharacters()}
async function loadCharacters(){const{data,error}=await db.from('characters').select('id,name,created_at').order('created_at');if(error)throw error;S.characters=data||[];$('#character').innerHTML=S.characters.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');S.characterId=localStorage.getItem('tht.mobile.character')||S.characters[0]?.id||null;if(S.characterId&&!S.characters.some(x=>x.id===S.characterId))S.characterId=S.characters[0]?.id||null;if(S.characterId)$('#character').value=S.characterId;await loadData()}
async function loadData(){if(!S.characterId){S.hunts=[];S.sessions=[];render();return}$('#syncStatus').textContent='Atualizando...';const[h,s]=await Promise.all([db.from('hunts').select('*').eq('character_id',S.characterId).order('name'),db.from('sessions').select('*').eq('character_id',S.characterId).order('hunt_date',{ascending:false}).order('start_time',{ascending:false}).limit(250)]);if(h.error)throw h.error;if(s.error)throw s.error;S.hunts=h.data||[];S.sessions=s.data||[];localStorage.setItem('tht.mobile.character',S.characterId);render();$('#syncStatus').textContent='Atualizado agora';$('#syncStatus').className='status ok'}
function stat(name){const a=S.sessions.filter(x=>String(x.hunt_name).toLowerCase()===String(name).toLowerCase()),sec=a.reduce((v,x)=>v+Number(x.duration_seconds||0),0),hr=sec/3600,sum=k=>a.reduce((v,x)=>v+Number(x[k]||0),0),d=a.filter(x=>Number(x.damage)>0&&Number(x.duration_seconds)>0),ds=d.reduce((v,x)=>v+Number(x.duration_seconds),0),dv=d.reduce((v,x)=>v+Number(x.damage),0);return{n:a.length,sec,raw:hr?sum('raw_xp')/hr:0,xp:hr?sum('xp')/hr:0,bal:hr?sum('balance')/hr:0,dmg:ds?dv*3600/ds:0}}
function render(){renderHome();renderHunts();renderSessions()}
function renderHome(){
  const sec=S.sessions.reduce((v,x)=>v+Number(x.duration_seconds||0),0),hr=sec/3600,sum=k=>S.sessions.reduce((v,x)=>v+Number(x[k]||0),0);
  const last=S.sessions[0]||null;
  const char=S.characters.find(x=>x.id===S.characterId);
  $('#homeHero').innerHTML=`<small>Visão geral</small><div class="heroTitle">${esc(char?.name||'Personagem')}</div><div class="heroSub">${S.sessions.length?nf(S.sessions.length)+' sessões registradas • '+dur(sec)+' de hunt':'Ainda sem sessões registradas.'}</div>`;

  const k=[['Tempo total',dur(sec)],['Raw XP total',short(sum('raw_xp'))],['Profit total',short(sum('balance'))],['Mobs',short(sum('monsters'))]];
  $('#kpis').innerHTML=k.map(([a,b])=>`<div class="kpi"><span>${a}</span><b>${b}</b></div>`).join('');

  if(last){
    $('#lastSessionTitle').textContent=last.hunt_name;
    $('#lastSessionDate').textContent=date(last.hunt_date)+' • '+String(last.start_time||'').slice(0,5);
    $('#lastSessionBody').innerHTML=`<div class="metrics"><div class="mini"><span>Raw XP/h</span><b>${short(last.raw_xph)}</b></div><div class="mini"><span>Profit</span><b>${short(last.balance)}</b></div><div class="mini"><span>Dano/h</span><b>${Number(last.damageph)>0?short(last.damageph):'—'}</b></div></div><button class="primary openLast" style="width:100%;margin-top:10px">Ver detalhes da sessão</button>`;
    const btn=$('.openLast'); if(btn) btn.onclick=()=>details(last.id);
  }else{
    $('#lastSessionTitle').textContent='Sem sessões';
    $('#lastSessionDate').textContent='—';
    $('#lastSessionBody').innerHTML='<div class="empty">Registre uma hunt no desktop para começar.</div>';
  }

  const cutoff=new Date(); cutoff.setDate(cutoff.getDate()-7); cutoff.setHours(0,0,0,0);
  const recent=S.sessions.filter(x=>{const d=new Date((x.hunt_date||'')+'T00:00:00');return !Number.isNaN(d.getTime())&&d>=cutoff});
  const rsec=recent.reduce((v,x)=>v+Number(x.duration_seconds||0),0),rhr=rsec/3600,rsum=k=>recent.reduce((v,x)=>v+Number(x[k]||0),0);
  const recentCards=[['Sessões',nf(recent.length)],['Tempo',dur(rsec)],['Raw XP/h',short(rhr?rsum('raw_xp')/rhr:0)],['Profit/h',short(rhr?rsum('balance')/rhr:0)]];
  $('#recentStats').innerHTML=recentCards.map(([a,b])=>`<div class="kpi"><span>${a}</span><b>${b}</b></div>`).join('');
}
function renderHunts(){$('#hunts').innerHTML=S.hunts.length?S.hunts.map(h=>{const s=stat(h.name);return`<div class="card hunt"><img src="${esc(h.image_path||'')}" onerror="this.style.visibility='hidden'"><div class="grow"><div class="title">${esc(h.name)}</div><div class="meta">${s.n} sessões • ${dur(s.sec)}</div><div class="metrics"><div class="mini"><span>Raw/h</span><b>${short(s.raw)}</b></div><div class="mini"><span>Profit/h</span><b>${short(s.bal)}</b></div><div class="mini"><span>Dano/h</span><b>${s.dmg?short(s.dmg):'—'}</b></div></div></div></div>`}).join(''):'<div class="empty">Nenhuma hunt cadastrada.</div>'}
function renderSessions(){$('#sessions').innerHTML=S.sessions.length?S.sessions.map(s=>`<button class="session" data-id="${s.id}"><div class="head"><div><div class="title">${esc(s.hunt_name)}</div><div class="meta">${date(s.hunt_date)} • ${esc(String(s.start_time||'').slice(0,5))} • ${dur(s.duration_seconds)}</div></div><span class="pill">${nf(s.monsters)} mobs</span></div><div class="metrics"><div class="mini"><span>Raw/h</span><b>${short(s.raw_xph)}</b></div><div class="mini"><span>Profit</span><b>${short(s.balance)}</b></div><div class="mini"><span>Dano/h</span><b>${Number(s.damageph)>0?short(s.damageph):'—'}</b></div></div></button>`).join(''):'<div class="empty">Nenhuma sessão encontrada.</div>';$$('[data-id]').forEach(b=>b.onclick=()=>details(b.dataset.id))}
function details(id){const s=S.sessions.find(x=>String(x.id)===String(id));if(!s)return;$('#sheetTitle').textContent=s.hunt_name+' • '+date(s.hunt_date);const mobs=Array.isArray(s.monster_details)?[...s.monster_details]:[],total=mobs.reduce((v,x)=>v+Number(x.count||0),0)||Number(s.monsters||0)||1;const metrics=`<div class="grid"><div class="kpi"><span>Raw XP/h</span><b>${short(s.raw_xph)}</b></div><div class="kpi"><span>XP/h</span><b>${short(s.xph)}</b></div><div class="kpi"><span>Profit</span><b>${short(s.balance)}</b></div><div class="kpi"><span>Mobs</span><b>${nf(s.monsters)}</b></div></div>`;const comp=mobs.length?'<div class="card"><h2>Composição</h2>'+mobs.sort((a,b)=>b.count-a.count).map(m=>`<div class="mob"><img src="${sprite(m.name)}" onerror="this.style.visibility='hidden'"><div><div class="title">${esc(m.name)}</div><div class="meta">${nf(m.count)} kills</div></div><div class="pct">${nf(100*Number(m.count||0)/total)}%</div></div>`).join('')+'</div>':'<div class="card"><div class="meta">Esta sessão não possui detalhamento histórico por espécie.</div></div>';$('#sheetBody').innerHTML=metrics+comp;$('#sheet').classList.remove('hidden')}


const RASHID_PLACES=[
  ['Svargrond','Taverna de Dankwart, ao sul do templo'],
  ['Liberty Bay','Taverna de Lyonel, a oeste do depot'],
  ['Port Hope','Taverna de Clyde, ao norte do barco'],
  ['Ankrahmun','Taverna de Arito, acima do correio'],
  ['Darashia','Taverna de Miraia, a oeste do barco'],
  ['Edron','Taverna de Mirabell, acima do depot'],
  ['Carlin','Andar superior do depot']
];
function berlinParts(d=new Date()){
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(d).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  let y=Number(p.year),m=Number(p.month),day=Number(p.day),hour=Number(p.hour);
  let base=new Date(Date.UTC(y,m-1,day,12));
  if(hour<10) base=new Date(base.getTime()-86400000);
  return {date:base,iso:base.toISOString().slice(0,10)};
}
function rashidToday(){
  const x=berlinParts(),weekday=x.date.getUTCDay(),mondayIndex=(weekday+6)%7,[city,detail]=RASHID_PLACES[mondayIndex];
  return {city,detail,day:x.iso};
}
function textOnly(html){const d=document.createElement('div');d.innerHTML=String(html||'');return (d.textContent||'').replace(/\s+/g,' ').trim()}
function parseEventRange(body,published){
  const months={january:0,february:1,march:2,april:3,may:4,june:5,july:6,august:7,september:8,october:9,november:10,december:11};
  const names=Object.keys(months).join('|');
  const re=new RegExp('(?:between the server saves of|between the server save of|from the server save of|from the server saves of)\\s*('+names+')\\s+(\\d{1,2})\\s+(?:and|to|until|through)\\s+(?:the server saves? of\\s+)?('+names+')?\\s*(\\d{1,2})','i');
  const m=textOnly(body).match(re); if(!m)return null;
  const pub=new Date(published+'T12:00:00Z'), y=pub.getUTCFullYear();
  let start=new Date(Date.UTC(y,months[m[1].toLowerCase()],Number(m[2]),12));
  if(start.getTime()<pub.getTime()-45*86400000) start=new Date(Date.UTC(y+1,months[m[1].toLowerCase()],Number(m[2]),12));
  const monthB=months[(m[3]||m[1]).toLowerCase()];
  const endYear=start.getUTCFullYear()+(monthB<start.getUTCMonth()?1:0);
  const end=new Date(Date.UTC(endYear,monthB,Number(m[4]),12));
  if(!(end>start)||((end-start)/86400000)>10)return null;
  return {start:start.toISOString().slice(0,10),end:end.toISOString().slice(0,10)};
}
async function fetchDoubleEvent(){
  const r=await fetch('https://api.tibiadata.com/v4/news/archive'); if(!r.ok)throw new Error('Falha ao consultar notícias');
  const data=await r.json(), box=data.news||data;
  const rows=Array.isArray(box)?box:(box.news||box.news_archive||box.latest_news||box.archive||box.news_list||[]);
  const today=berlinParts().iso;
  const candidates=rows.slice(0,100).filter(x=>/double\s+(?:experience|xp).*?(?:skill|event)|double\s+xp/i.test(String(x.title||''))&&!/compensation|(?:selected|specific|affected) (?:game )?world/i.test(String(x.title||'')));
  for(const entry of candidates){
    const pub=String(entry.date||'').slice(0,10),id=entry.id;if(!pub||!id)continue;
    if((new Date(today)-new Date(pub))/86400000>80)continue;
    const ar=await fetch('https://api.tibiadata.com/v4/news/id/'+id); if(!ar.ok)continue;
    const ad=await ar.json();let inner=ad.news||{};if(inner.news&&typeof inner.news==='object')inner=inner.news;
    let body=inner.content||inner.body||'';if(body&&typeof body==='object')body=Object.values(body).join(' ');
    const plain=textOnly(body);if(/as compensation.*?(?:worlds?|servers?)/is.test(plain))continue;
    const range=parseEventRange(plain,pub);
    if(range&&range.end>=today)return {title:entry.title,start:range.start,end:range.end};
  }
  return null;
}
async function loadTibiaToday(){
  $('#todayStatus').textContent='Atualizando Tibia Hoje...';$('#todayStatus').className='status';
  const r=rashidToday();$('#rashidCity').textContent=r.city;$('#rashidDetail').textContent=r.detail+' • server day '+r.day;$('#rashidImg').src='https://www.tibiawiki.com.br/images/f/f5/Rashid.gif';
  const boostPromise=Promise.all([
    fetch('https://api.tibiadata.com/v4/creatures').then(r=>{if(!r.ok)throw new Error();return r.json()}),
    fetch('https://api.tibiadata.com/v4/boostablebosses').then(r=>{if(!r.ok)throw new Error();return r.json()})
  ]).then(([a,b])=>{
    const cr=a?.creatures?.boosted||{},bo=b?.boostable_bosses?.boosted||{};
    $('#boostedCreature').textContent=cr.name||'Indisponível';$('#creatureImg').src=cr.image_url||sprite(cr.name);
    $('#boostedBoss').textContent=bo.name||'Indisponível';$('#bossImg').src=bo.image_url||sprite(bo.name);
  }).catch(()=>{ $('#boostedCreature').textContent='Indisponível';$('#boostedBoss').textContent='Indisponível'; });

  const eventPromise=fetchDoubleEvent().then(ev=>{
    if(!ev){$('#doubleEvent').textContent='Nenhum evento confirmado';$('#doubleEventDetail').textContent='Nenhum próximo Double XP/Skill global encontrado nas notícias consultadas.';return}
    $('#doubleEvent').textContent=ev.start+' → '+ev.end;$('#doubleEventDetail').textContent=ev.title||'Double XP / Skill Event';
  }).catch(()=>{$('#doubleEvent').textContent='Consulta indisponível';$('#doubleEventDetail').textContent='Não foi possível consultar o calendário agora.'});

  await Promise.allSettled([boostPromise,eventPromise]);$('#todayStatus').textContent='Atualizado agora';$('#todayStatus').className='status ok';
}
$('#loginBtn').onclick=async()=>{const b=$('#loginBtn');b.disabled=true;$('#loginStatus').textContent='Entrando...';try{const{error}=await db.auth.signInWithPassword({email:$('#email').value.trim(),password:$('#password').value});if(error)throw error;$('#password').value='';$('#loginStatus').textContent='';await boot()}catch(e){$('#loginStatus').textContent=e.message;$('#loginStatus').className='status error'}finally{b.disabled=false}};
$('#logout').onclick=async()=>{await db.auth.signOut();S={characters:[],characterId:null,hunts:[],sessions:[]};signed(false)};
$('#character').onchange=async e=>{S.characterId=e.target.value;await loadData()};
$('#refresh').onclick=()=>loadData().catch(e=>{$('#syncStatus').textContent=e.message;$('#syncStatus').className='status error'});
$('#refreshToday').onclick=()=>loadTibiaToday().catch(()=>{});
$('#closeSheet').onclick=()=>$('#sheet').classList.add('hidden');$('#sheet').onclick=e=>{if(e.target===$('#sheet'))$('#sheet').classList.add('hidden')};
$('#tabs button').forEach(t=>t.onclick=()=>{$('#tabs button').forEach(x=>x.classList.remove('active'));t.classList.add('active');['home','hunts','sessions','more'].forEach(p=>$('#p-'+p).classList.toggle('hidden',p!==t.dataset.page));if(t.dataset.page==='more')loadTibiaToday().catch(()=>{});scrollTo({top:0,behavior:'smooth'})});
if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
db.auth.onAuthStateChange((_e,session)=>{if(!session)signed(false)});
boot().catch(e=>{signed(false);$('#loginStatus').textContent=e.message;$('#loginStatus').className='status error'});