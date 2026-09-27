import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, doc, onSnapshot, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";


// ---------- helpers ----------
const $app = document.getElementById('app');
const esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = p => (p||'') + Math.random().toString(36).slice(2,8) + Date.now().toString(36).slice(-4);
const todayISO = () => { const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10); };
const BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const fmtDate = iso => { if(!iso) return ''; const [y,m,d]=iso.split('-').map(Number); return d+' '+BULAN[m-1]+' '+y; };
const isNum = v => typeof v==='number' && isFinite(v);
function shuffle(a){ a=[...a]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
let toastTimer;
function toast(msg){ let t=document.querySelector('.toast'); if(!t){t=document.createElement('div');t.className='toast';t.setAttribute('role','status');document.body.appendChild(t);} t.textContent=msg; clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.remove(),2600); }

const ICON = {
  back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  next:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
  share:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>',
  users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 010 6.8M18.5 14.8c1.6.8 2.6 2.6 3 5.2"/></svg>',
  racket:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="14.5" cy="9.5" rx="6" ry="6.5" transform="rotate(40 14.5 9.5)"/><path d="M10 14l-6.5 6.5"/><circle cx="5" cy="5" r="1.8"/></svg>',
  medal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3l3 6M17 3l-3 6"/><circle cx="12" cy="15" r="6"/><path d="M12 12.5v5"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
};

// ---------- storage backends ----------
const Store = { mode:'loading', db:null };
const queues = {};
function enqueue(key, fn){
  const p = (queues[key]||Promise.resolve()).then(fn).catch(e=>{
    console.error(e);
    const c = e && e.code;
    toast(c==='invalid_argument'||c==='permission-denied' ? 'Kamu tidak punya akses untuk mengubah data ini.' : c==='quota_exceeded' ? 'Kuota penyimpanan penuh. Hapus sesi lama dulu.' : 'Gagal menyimpan, coba lagi.');
  });
  queues[key]=p; return p;
}
// local backend (fallback, data hanya di perangkat)
const Local = (()=>{
  const KEY='rallyboard.v1'; let data={t:{},s:{}}; const subs=new Set();
  try{ const raw=localStorage.getItem(KEY); if(raw) data=JSON.parse(raw)||data; }catch(e){}
  const persist=()=>{ try{localStorage.setItem(KEY,JSON.stringify(data));}catch(e){} subs.forEach(f=>f()); };
  return {
    subList(cb){ const f=()=>cb(Object.entries(data.t).map(([id,v])=>({...v,id}))); subs.add(f); f(); return ()=>subs.delete(f); },
    subT(id,cb){ const f=()=>cb(data.t[id]?{...data.t[id],id}:null); subs.add(f); f(); return ()=>subs.delete(f); },
    subS(id,cb){ const f=()=>cb({...(data.s[id]||{})}); subs.add(f); f(); return ()=>subs.delete(f); },
    async saveT(id,obj){ data.t[id]=JSON.parse(JSON.stringify(obj)); persist(); },
    async saveS(tid,mid,obj){ (data.s[tid]=data.s[tid]||{})[mid]=obj; persist(); },
    async delS(tid,mid){ if(data.s[tid]) delete data.s[tid][mid]; persist(); },
    async delT(id){ delete data.t[id]; delete data.s[id]; persist(); },
  };
})();
// shared backend: Firebase Firestore
function FirebaseBackend(db){
  const toList=q=>q.docs.map(d=>({...d.data(),id:d.id}));
  const clean=o=>{ const b=JSON.parse(JSON.stringify(o)); delete b.id; return b; };
  const onErr=e=>{ console.error(e); toast(e.code==='permission-denied'?'Akses ditolak oleh Firestore rules.':'Koneksi ke database bermasalah.'); };
  return {
    subList(cb){ return onSnapshot(collection(db,'tournaments'), q=>cb(toList(q)), onErr); },
    subT(id,cb){ return onSnapshot(doc(db,'tournaments',id), s=>{ if(!s.exists() && s.metadata.fromCache) return; cb(s.exists()?{...s.data(),id}:null); }, onErr); },
    subS(id,cb){ return onSnapshot(collection(db,'tournaments',id,'scores'), q=>{ const o={}; q.docs.forEach(d=>o[d.id]=d.data()); cb(o); }, onErr); },
    saveT(id,obj){ return setDoc(doc(db,'tournaments',id), clean(obj)); },
    saveS(tid,mid,obj){ return setDoc(doc(db,'tournaments',tid,'scores',mid), clean(obj)); },
    delS(tid,mid){ return deleteDoc(doc(db,'tournaments',tid,'scores',mid)); },
    delT(id){ return deleteDoc(doc(db,'tournaments',id)); },
  };
}
let B = null;

// ---------- app state ----------
const S = {
  list:[], listReady:false,
  tid:null, t:null, scores:{}, tab:'matches', round:0, filter:null,
  editMatch:null, draft:null, modal:null,
};
let unsubs=[];
function clearSubs(){ unsubs.forEach(u=>{try{u()}catch(e){}}); unsubs=[]; }

// defer re-render while typing so live updates don't steal focus
let pending=false, pointerDown=false;
const typing=()=>{ const a=document.activeElement; return !!(a && $app.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)); };
function requestRender(){ if(pointerDown||typing()){ pending=true; return; } render(); }
function flush(){ if(pending && !pointerDown && !typing()) render(); }
document.addEventListener('pointerdown',()=>{ pointerDown=true; },true);
['pointerup','pointercancel'].forEach(ev=>document.addEventListener(ev,()=>setTimeout(()=>{ pointerDown=false; flush(); },0),true));
document.addEventListener('focusout',()=>setTimeout(flush,0));

function openHome(){
  setHash('');
  clearSubs(); S.tid=null; S.t=null; S.scores={}; S.editMatch=null; S.modal=null;
  unsubs.push(B.subList(l=>{ S.list=l; S.listReady=true; requestRender(); }));
  render();
}
function openT(id){
  setHash(id);
  clearSubs(); S.tid=id; S.t=null; S.scores={}; S.tab='matches'; S.round=-1; S.editMatch=null; S.filter=null;
  unsubs.push(B.subT(id,t=>{ S.t=t; if(t && S.round<0){ S.round=firstOpenRound(); } if(!t){ openHome(); return; } requestRender(); }));
  unsubs.push(B.subS(id,s=>{ S.scores=s||{}; requestRender(); }));
  render();
}
function setHash(id){ const want=id?'#/s/'+id:'#/'; if(location.hash!==want){ try{ history.replaceState(null,'',want); }catch(e){ location.hash=want; } } }
function hashId(){ const m=location.hash.match(/^#\/s\/([\w-]+)/); return m?m[1]:null; }
window.addEventListener('hashchange',()=>{ if(!B) return; const id=hashId(); if(id && id!==S.tid) openT(id); else if(!id && S.tid) openHome(); });
function saveT(){ const t=S.t; if(!t) return; t.updatedAt=Date.now(); return enqueue('t/'+t.id, ()=>B.saveT(t.id,t)); }

// ---------- scheduling ----------
function circleRounds(ids){
  const arr=[...ids]; if(arr.length%2) arr.push(null);
  const n=arr.length, out=[];
  for(let r=0;r<n-1;r++){
    const pairs=[];
    for(let i=0;i<n/2;i++){ const a=arr[i], b=arr[n-1-i]; if(a&&b) pairs.push([a,b]); }
    out.push(pairs);
    arr.splice(1,0,arr.pop());
  }
  return out;
}
function buildMatches(ids, mode){
  const rounds=circleRounds(shuffle(ids)).map(r=>shuffle(r));
  const ms=[];
  if(mode==='single'){ rounds.forEach(r=>r.forEach(([a,b])=>ms.push({a:[a],b:[b]}))); return {ms,dropped:0}; }
  const pool=[];
  rounds.forEach(r=>{ for(let i=0;i+1<r.length;i+=2) ms.push({a:r[i],b:r[i+1]}); if(r.length%2) pool.push(r[r.length-1]); });
  // pair leftover partnerships that share no player
  let dropped=0;
  while(pool.length){
    const p=pool.shift(); const j=pool.findIndex(q=>!q.some(x=>p.includes(x)));
    if(j<0){ dropped++; continue; }
    const q=pool.splice(j,1)[0]; ms.push({a:p,b:q});
  }
  return {ms,dropped};
}
function scheduleRounds(ms, courts, ids){
  const rest={}; ids.forEach(i=>rest[i]=0);
  let remaining=ms.map((m,i)=>({...m,_i:i})); const out=[]; let r=0;
  while(remaining.length){
    // prefer matches whose players rested longest, then original order
    remaining.sort((x,y)=>{ const sx=[...x.a,...x.b].reduce((s,p)=>s+rest[p],0), sy=[...y.a,...y.b].reduce((s,p)=>s+rest[p],0); return (sy-sx)||(x._i-y._i); });
    const used=new Set(); const pick=[];
    for(const m of remaining){ if(pick.length>=courts) break; const ps=[...m.a,...m.b]; if(ps.some(p=>used.has(p))) continue; ps.forEach(p=>used.add(p)); pick.push(m); }
    remaining=remaining.filter(m=>!pick.includes(m));
    ids.forEach(i=>rest[i]= used.has(i)?0:rest[i]+1);
    pick.forEach((m,c)=>out.push({id:'', r, c:c+1, a:m.a, b:m.b}));
    r++;
  }
  return out;
}
async function generate(){
  const t=S.t; const ids=t.players.map(p=>p.id); const need=t.mode==='single'?2:4;
  if(ids.length<need){ toast('Minimal '+need+' pemain untuk mode '+(t.mode==='single'?'single':'double')+'.'); return; }
  const hasScores=Object.keys(S.scores).length>0;
  if(t.matches && t.matches.length && !confirm(hasScores?'Jadwal baru akan menghapus semua skor yang sudah diisi. Lanjutkan?':'Buat ulang jadwal dengan pasangan acak baru?')) return;
  const courts=Math.max(1,Math.min(Number(t.courts)||1, Math.floor(ids.length/need)));
  const {ms,dropped}=buildMatches(ids,t.mode);
  const gen=(t.gen||0)+1;
  const sched=scheduleRounds(ms,courts,ids).map((m,i)=>({...m,id:'g'+gen+'m'+(i+1)}));
  const oldIds=Object.keys(S.scores);
  t.gen=gen; t.matches=sched; t.scheduledPlayers=ids.slice().sort().join(',');
  S.round=0; S.tab='matches'; S.editMatch=null;
  const w=saveT(); render(); await w;
  oldIds.forEach(mid=>enqueue('s/'+t.id+'/'+mid, ()=>B.delS(t.id,mid)));
  toast(sched.length+' match dibuat'+(dropped?' ('+dropped+' pasangan tidak bisa dijadwalkan)':'')+'.');
}

// ---------- derived ----------
function pname(id){ const p=S.t&&S.t.players.find(x=>x.id===id); return p?(p.name||'Tanpa nama'):'(dihapus)'; }
function scoreOf(mid){ const s=S.scores[mid]; return s||{}; }
function isDone(mid){ const s=scoreOf(mid); return isNum(s.sa)&&isNum(s.sb); }
function roundsOf(t){ const m=t.matches||[]; const n=m.reduce((x,y)=>Math.max(x,y.r+1),0); const out=[]; for(let i=0;i<n;i++) out.push(m.filter(x=>x.r===i).sort((a,b)=>a.c-b.c)); return out; }
function firstOpenRound(){ const t=S.t; if(!t||!t.matches) return 0; const rs=roundsOf(t); const i=rs.findIndex(r=>r.some(m=>!isDone(m.id))); return i<0?Math.max(0,rs.length-1):i; }
function standings(){
  const t=S.t; const st={};
  t.players.forEach(p=>st[p.id]={id:p.id,name:p.name||'Tanpa nama',g:p.g,W:0,L:0,T:0,diff:0,gf:0,pts:0,mp:0,hist:[]});
  (t.matches||[]).forEach(m=>{
    if(!isDone(m.id)) return; const s=scoreOf(m.id);
    const side=(ids,own,opp,oppIds)=>ids.forEach(id=>{ const r=st[id]; if(!r) return; r.mp++; r.gf+=own; r.diff+=own-opp;
      const res=own>opp?'W':own<opp?'L':'T'; r[res]++; r.pts+= res==='W'?2:res==='L'?-2:0;
      r.hist.push({m,res,own,opp,partners:ids.filter(x=>x!==id),opps:oppIds}); });
    side(m.a,s.sa,s.sb,m.b); side(m.b,s.sb,s.sa,m.a);
  });
  return Object.values(st).sort((a,b)=>(b.pts-a.pts)||(b.diff-a.diff)||(b.gf-a.gf)||a.name.localeCompare(b.name));
}

// ---------- render ----------
function header(title, back){
  const sync = Store.mode==='shared' ? '<span class="sync" title="Tersinkron untuk semua yang membuka link"><i></i>Live</span>' : '<span class="sync local" title="Data hanya di perangkat ini"><i></i>Lokal</span>';
  return `<header class="top"><div class="top-row">
    ${back?`<button class="icon-btn" data-act="home" aria-label="Kembali">${ICON.back}</button>`:''}
    <div class="brand grow">${back?'':'<span class="mark" aria-hidden="true"></span>'}<h1>${esc(title)}</h1></div>
    ${sync}
    ${back?`<button class="icon-btn" data-act="share" aria-label="Bagikan hasil">${ICON.share}</button>`:''}
  </div>${back?tabsHtml():''}</header>`;
}
function tabsHtml(){
  const tb=(k,l,ic)=>`<button class="tab" role="tab" aria-selected="${S.tab===k}" data-tab="${k}">${ic}${l}</button>`;
  return `<nav class="tabs" role="tablist">${tb('setup','Setup',ICON.users)}${tb('matches','Match',ICON.racket)}${tb('ranking','Ranking',ICON.medal)}</nav>`;
}
function render(){
  pending=false;
  if(Store.mode==='loading'){ $app.innerHTML=header('Rally Board')+'<div class="wrap"><p class="empty">Menyiapkan…</p></div>'; return; }
  if(!S.tid) return renderHome();
  if(!S.t){ $app.innerHTML=header('Memuat…',true)+'<div class="wrap"><p class="empty">Memuat sesi…</p></div>'; return; }
  const body = S.tab==='setup'?renderSetup():S.tab==='ranking'?renderRanking():renderMatches();
  $app.innerHTML = header(S.t.name||'Sesi tanpa nama', true) + `<main class="wrap">${body}</main>` + renderModal();
}
function renderHome(){
  const list=[...S.list].sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.createdAt||0)-(a.createdAt||0));
  const items = !S.listReady ? '<p class="empty">Memuat sesi…</p>' : list.length ? list.map(t=>{
    const d=(t.date||'').split('-'); const done=(t.matches||[]).length;
    return `<button class="session" data-open="${esc(t.id)}">
      <div class="d"><b class="num">${esc(d[2]?Number(d[2]):'–')}</b><span>${d[1]?BULAN[Number(d[1])-1]:''}</span></div>
      <div class="grow"><div style="font-weight:700">${esc(t.name||'Sesi tanpa nama')}</div>
      <div class="small muted">${t.mode==='single'?'Single':'Double'} · ${(t.players||[]).length} pemain · ${t.courts||1} court${done?' · '+done+' match':''}</div></div>
      <span class="badge ${t.status==='done'?'':'live'}">${t.status==='done'?'Selesai':'Berjalan'}</span></button>`;
  }).join('') : '<div class="empty">Belum ada sesi. Buat sesi pertama untuk mulai mengacak pasangan.</div>';
  $app.innerHTML = header('Rally Board') + `<main class="wrap">
    <section class="hero"><h2>Tennis Americano</h2><p>Acak pasangan, catat skor tiap match, dan ranking per pemain dihitung otomatis.</p></section>
    ${Store.mode==='local'?'<div class="notice">Mode lokal: data hanya tersimpan di perangkat ini. Buka dari link claude.ai supaya bisa diisi bareng teman.</div>':''}
    <button class="btn ball block" style="margin-top:16px;padding:14px" data-act="new">+ Buat sesi baru</button>
    <div style="margin-top:8px">${items}</div>
  </main>`;
}
function renderSetup(){
  const t=S.t; const men=t.players.filter(p=>p.g!=='F').length, women=t.players.length-men;
  const changed = t.matches && t.matches.length && t.scheduledPlayers !== t.players.map(p=>p.id).sort().join(',');
  return `
  <section class="card">
    <label class="field"><span>Nama sesi</span><input class="input" data-f="name" value="${esc(t.name)}" placeholder="mis. Ultradome, 27 Sep"></label>
    <div class="grid2">
      <label class="field"><span>Tanggal</span><input class="input" type="date" data-f="date" value="${esc(t.date)}"></label>
      <label class="field"><span>Jumlah court</span><input class="input" type="number" min="1" max="10" inputmode="numeric" data-f="courts" value="${esc(t.courts)}"></label>
    </div>
    <div class="field"><span class="small muted" style="display:block;margin-bottom:4px">Format permainan</span>
      <div class="seg" role="group"><button data-mode="double" aria-pressed="${t.mode!=='single'}">Double</button><button data-mode="single" aria-pressed="${t.mode==='single'}">Single</button></div></div>
    <div class="field" style="margin-bottom:0"><span class="small muted" style="display:block;margin-bottom:4px">Status</span>
      <div class="seg" role="group"><button data-status="ongoing" aria-pressed="${t.status!=='done'}">Berjalan</button><button data-status="done" aria-pressed="${t.status==='done'}">Selesai</button></div></div>
  </section>
  <section class="card">
    <div class="row" style="margin-bottom:10px"><h2 class="grow" style="margin:0">Pemain (${t.players.length})</h2><span class="small muted">Pria ${men} · Wanita ${women}</span></div>
    ${t.players.map(p=>`<div class="player">
      <input data-pname="${esc(p.id)}" value="${esc(p.name)}" aria-label="Nama pemain" placeholder="Nama">
      <button class="gender ${p.g==='F'?'F':'M'}" data-gender="${esc(p.id)}" aria-label="Ubah gender">${p.g==='F'?'F':'M'}</button>
      <button class="del" data-delp="${esc(p.id)}" aria-label="Hapus ${esc(p.name)}">${ICON.trash}</button></div>`).join('')}
    <div class="row" style="margin-top:10px">
      <input class="input grow" data-newp placeholder="Nama pemain baru" autocomplete="off" enterkeyhint="done">
      <button class="btn primary" type="button" data-act="addp">Tambah</button>
    </div>
    <p class="small muted" style="margin:8px 0 0">Bisa tempel beberapa nama sekaligus, pisahkan dengan koma.</p>
  </section>
  ${changed?'<div class="notice">Daftar pemain berubah sejak jadwal dibuat. Acak ulang jadwal atau edit pasangan di tab Match.</div>':''}
  <button class="btn primary block" style="margin-top:14px;padding:14px" data-act="gen">${t.matches&&t.matches.length?'Acak ulang pasangan & jadwal':'Acak pasangan & buat jadwal'}</button>
  <p class="small muted">${t.mode==='single'?'Single: setiap pemain melawan semua pemain lain satu kali.':'Double Americano: setiap pemain berpasangan dengan semua pemain lain satu kali. Pasangan tetap bisa diedit manual per match.'}</p>
  <button class="btn danger block" style="margin-top:18px" data-act="delT">Hapus sesi ini</button>`;
}
function sideHtml(m, key, s, done){
  const ids=m[key]; const own = key==='a'?s.sa:s.sb, opp = key==='a'?s.sb:s.sa;
  const win = done && own>opp;
  if(S.editMatch===m.id){
    const all=S.t.players;
    return `<div class="side"><span class="lbl">Tim ${key==='a'?'A':'B'}</span>${S.draft[key].map((pid,i)=>`
      <select class="slot-select" data-slot="${key}${i}" aria-label="Pemain">${all.map(p=>`<option value="${esc(p.id)}" ${p.id===pid?'selected':''}>${esc(p.name||'Tanpa nama')}</option>`).join('')}</select>`).join('')}</div>`;
  }
  return `<div class="side ${win?'win':''}"><span class="lbl">Tim ${key==='a'?'A':'B'}</span>${ids.map(id=>`<span>${esc(pname(id))}</span>`).join('')}</div>`;
}
function matchCard(m, idx){
  const s=scoreOf(m.id), done=isDone(m.id), live=!done&&s.active, editing=S.editMatch===m.id;
  const net = editing
    ? `<div class="score-edit"><input type="number" min="0" inputmode="numeric" data-sa value="${isNum(S.draft.sa)?S.draft.sa:''}" aria-label="Skor tim A"><b>–</b><input type="number" min="0" inputmode="numeric" data-sb value="${isNum(S.draft.sb)?S.draft.sb:''}" aria-label="Skor tim B"></div>`
    : done ? `<span class="vs">skor</span><span class="score">${s.sa}–${s.sb}</span>` : `<span class="vs">vs</span><span class="score empty">– : –</span>`;
  const actions = editing
    ? `<button class="btn" data-cancel>Batal</button>${done?'<button class="btn danger" data-clear>Hapus skor</button>':''}<button class="btn primary" data-save="${esc(m.id)}">Simpan</button>`
    : `<button class="btn" data-live="${esc(m.id)}" ${done?'disabled':''}>${live?'Tandai belum main':'Sedang main'}</button><button class="btn primary" data-edit="${esc(m.id)}">${done?'Edit skor / pasangan':'Isi skor / pasangan'}</button>`;
  return `<article class="match"><div class="match-head"><span>Match ${idx} · Court ${m.c}</span><span class="tag ${done?'done':live?'live':''}">${done?'Selesai':live?'Sedang main':'Belum main'}</span></div>
    <div class="court">${sideHtml(m,'a',s,done)}<div class="net">${net}</div>${sideHtml(m,'b',s,done)}</div>
    <div class="match-actions">${actions}</div></article>`;
}
function renderMatches(){
  const t=S.t; const ms=t.matches||[];
  if(!ms.length) return `<div class="card empty">Belum ada jadwal.<br><button class="btn primary" style="margin-top:12px" data-tab="setup">Buka Setup</button></div>`;
  const done=ms.filter(m=>isDone(m.id)).length, live=ms.filter(m=>!isDone(m.id)&&scoreOf(m.id).active).length;
  const rs=roundsOf(t); S.round=Math.max(0,Math.min(S.round,rs.length-1));
  const f=S.filter;
  const chips=`<div class="card" style="padding:12px"><div class="chips">
    <button class="chip ${f==='live'?'on':''}" data-filter="live">${live} Sedang main</button>
    <button class="chip ${f==='done'?'on':''}" data-filter="done">${done} Selesai</button>
    <button class="chip ${f==='pending'?'on':''}" data-filter="pending">${ms.length-done-live} Belum main</button></div></div>`;
  if(f){
    const list=ms.filter(m=> f==='done'?isDone(m.id): f==='live'?(!isDone(m.id)&&scoreOf(m.id).active):(!isDone(m.id)&&!scoreOf(m.id).active));
    return chips + (list.length? list.map(m=>`<p class="small muted" style="margin:14px 0 -8px">Round ${m.r+1}</p>`+matchCard(m, ms.indexOf(m)+1)).join('') : '<p class="empty">Tidak ada match di kategori ini.</p>');
  }
  const cur=rs[S.round]; const playing=new Set(cur.flatMap(m=>[...m.a,...m.b]));
  const bench=t.players.filter(p=>!playing.has(p.id));
  const dots=rs.map((r,i)=>`<span class="dot ${r.every(m=>isDone(m.id))?'done':''} ${i===S.round?'cur':''}"></span>`).join('');
  return chips + `<div class="roundnav">
      <button class="btn" data-rnd="-1" ${S.round===0?'disabled':''} aria-label="Round sebelumnya">${ICON.back}</button>
      <div class="roundtitle"><b>Round ${S.round+1}/${rs.length}</b><div class="dots" aria-hidden="true">${dots}</div></div>
      <button class="btn" data-rnd="1" ${S.round>=rs.length-1?'disabled':''} aria-label="Round berikutnya">${ICON.next}</button></div>
    ${cur.map(m=>matchCard(m, ms.indexOf(m)+1)).join('')}
    ${bench.length?`<section class="bench"><h3>Tidak main di round ini (${bench.length})</h3><div class="names">${bench.map(p=>`<span class="pill">${esc(p.name||'Tanpa nama')}</span>`).join('')}</div></section>`:''}`;
}
function renderRanking(){
  const t=S.t; const st=standings(); const ms=t.matches||[]; const done=ms.filter(m=>isDone(m.id)).length;
  const finished = ms.length && done===ms.length;
  const top=st[0]; const anyPlayed=st.some(r=>r.mp);
  const sign=v=>v>0?'+'+v:String(v);
  return `<section class="leader"><span class="ballshape" aria-hidden="true"></span>
      <small>${finished||t.status==='done'?'Juara '+esc(t.name||''):'Memimpin sementara'}</small>
      <strong>${anyPlayed?esc(top.name):'Belum ada skor'}</strong>
      <div class="meta">${done}/${ms.length} match selesai · ${esc(fmtDate(t.date))}</div></section>
    <div class="table-wrap"><table>
      <thead><tr><th>#</th><th>Pemain</th><th>M</th><th>W-L-T</th><th>Selisih</th><th>Poin</th></tr></thead>
      <tbody>${st.map((r,i)=>`<tr class="${i===0&&anyPlayed?'first':''}"><td>${i+1}</td>
        <td><button class="pname" data-player="${esc(r.id)}">${esc(r.name)}</button></td>
        <td class="num">${r.mp}</td><td class="num">${r.W}-${r.L}-${r.T}</td>
        <td class="num ${r.diff>0?'pos':r.diff<0?'neg':''}">${sign(r.diff)}</td>
        <td class="pts ${r.pts<0?'neg':''}">${sign(r.pts)}</td></tr>`).join('')}</tbody></table></div>
    <p class="legend">Menang +2, kalah −2, seri 0. Urutan: poin, lalu selisih skor, lalu total skor. Ketuk nama pemain untuk lihat riwayat match.</p>
    <button class="btn primary block" style="margin-top:14px;padding:14px" data-act="share">Bagikan hasil</button>`;
}
function renderModal(){
  if(!S.modal) return '';
  if(S.modal.type==='player'){
    const r=standings().find(x=>x.id===S.modal.id); if(!r) return '';
    const sign=v=>v>0?'+'+v:String(v);
    return `<div class="modal-bg" data-close><div class="modal" role="dialog" aria-modal="true" aria-label="Riwayat ${esc(r.name)}" onclick="event.stopPropagation()">
      <div class="row"><h3 class="grow">${esc(r.name)}</h3><button class="icon-btn" data-close aria-label="Tutup" style="color:var(--ink)">✕</button></div>
      <p class="small muted" style="margin:0 0 10px">${r.W}-${r.L}-${r.T} · selisih ${sign(r.diff)} · ${sign(r.pts)} poin · ${r.gf} skor didapat</p>
      ${r.hist.length? r.hist.map(h=>`<div class="hist"><div><div>Round ${h.m.r+1}${h.partners.length?' · bareng '+esc(h.partners.map(pname).join(', ')):''}</div><div class="muted small">vs ${esc(h.opps.map(pname).join(' & '))}</div></div><div class="row"><span class="num" style="font-size:18px;font-weight:700">${h.own}–${h.opp}</span><span class="res ${h.res}">${h.res}</span></div></div>`).join('') : '<p class="empty">Belum ada match selesai.</p>'}
    </div></div>`;
  }
  if(S.modal.type==='share'){
    return `<div class="modal-bg" data-close><div class="modal" role="dialog" aria-modal="true" aria-label="Bagikan hasil" onclick="event.stopPropagation()">
      <div class="row"><h3 class="grow">Bagikan hasil</h3><button class="icon-btn" data-close aria-label="Tutup" style="color:var(--ink)">✕</button></div>
      <p class="small muted" style="margin:0 0 8px">Salin teks ini lalu tempel ke WhatsApp atau grup.</p>
      <textarea class="input" readonly data-sharetext>${esc(S.modal.text)}</textarea>
      <button class="btn primary block" style="margin-top:10px" data-act="copy">Salin teks</button></div></div>`;
  }
  return '';
}
function shareText(){
  const t=S.t, st=standings(), ms=t.matches||[], done=ms.filter(m=>isDone(m.id)).length;
  const sign=v=>v>0?'+'+v:String(v);
  let s=`🎾 ${t.name||'Sesi tennis'} (${fmtDate(t.date)})\n${t.mode==='single'?'Single':'Double'} Americano · ${done}/${ms.length} match selesai\n\n`;
  st.forEach((r,i)=>{ s+=`${i+1}. ${r.name} — ${r.W}-${r.L}-${r.T}, selisih ${sign(r.diff)}, ${sign(r.pts)} poin\n`; });
  return s.trim();
}

// ---------- events ----------
$app.addEventListener('click', async e=>{
  const el=e.target.closest('button,[data-close],[data-open]'); if(!el) return;
  const d=el.dataset;
  if(d.close!==undefined && (el===e.target || el.tagName==='BUTTON')){ S.modal=null; render(); return; }
  if(d.open){ openT(d.open); return; }
  if(d.tab){ S.tab=d.tab; S.editMatch=null; S.filter=null; render(); window.scrollTo(0,0); return; }
  if(d.act==='home'){ openHome(); return; }
  if(d.act==='new'){
    const id=uid('t'); const t={name:'Sesi '+fmtDate(todayISO()), date:todayISO(), sport:'Tennis', mode:'double', courts:1, status:'ongoing', players:[], matches:[], gen:0, createdAt:Date.now()};
    await enqueue('t/'+id, ()=>B.saveT(id,t)); openT(id); S.tab='setup'; render(); return;
  }
  if(!S.t) return;
  const t=S.t;
  if(d.act==='addp'){ addPlayers(); return; }
  if(d.act==='gen'){ generate(); return; }
  if(d.act==='delT'){ if(confirm('Hapus sesi "'+(t.name||'')+'" beserta semua skornya?')){ const id=t.id; Object.keys(S.scores).forEach(mid=>enqueue('s/'+id+'/'+mid,()=>B.delS(id,mid))); await enqueue('t/'+id,()=>B.delT(id)); openHome(); } return; }
  if(d.act==='share'){
    const text=shareText();
    if(navigator.share){ try{ await navigator.share({text}); return; }catch(err){ if(err&&err.name==='AbortError') return; } }
    S.modal={type:'share',text}; render(); return;
  }
  if(d.act==='copy'){ const ta=document.querySelector('[data-sharetext]'); try{ await navigator.clipboard.writeText(ta.value); toast('Teks disalin.'); }catch(err){ ta.select(); try{document.execCommand('copy');toast('Teks disalin.');}catch(x){toast('Pilih teks lalu salin manual.');} } return; }
  if(d.mode){ if(t.mode!==d.mode){ t.mode=d.mode; saveT(); render(); if(t.matches&&t.matches.length) toast('Format berubah. Acak ulang jadwal supaya berlaku.'); } return; }
  if(d.status){ t.status=d.status; saveT(); render(); return; }
  if(d.gender){ const p=t.players.find(x=>x.id===d.gender); if(p){ p.g=p.g==='F'?'M':'F'; saveT(); render(); } return; }
  if(d.delp){ const p=t.players.find(x=>x.id===d.delp); if(p && confirm('Hapus '+(p.name||'pemain ini')+'?')){ t.players=t.players.filter(x=>x.id!==d.delp); saveT(); render(); } return; }
  if(d.rnd){ S.round+=Number(d.rnd); S.editMatch=null; render(); return; }
  if(d.filter){ S.filter = S.filter===d.filter?null:d.filter; S.editMatch=null; render(); return; }
  if(d.player){ S.modal={type:'player',id:d.player}; render(); return; }
  if(d.live){ const cur=scoreOf(d.live); const obj={...cur, active:!cur.active}; S.scores[d.live]=obj; render(); enqueue('s/'+t.id+'/'+d.live,()=>B.saveS(t.id,d.live,obj)); return; }
  if(d.edit){ const m=t.matches.find(x=>x.id===d.edit); const s=scoreOf(d.edit); S.editMatch=d.edit; S.draft={a:[...m.a],b:[...m.b],sa:s.sa,sb:s.sb}; render(); const inp=document.querySelector('[data-sa]'); if(inp) inp.focus(); return; }
  if(d.cancel!==undefined){ S.editMatch=null; render(); return; }
  if(d.clear!==undefined){ const mid=S.editMatch; S.editMatch=null; delete S.scores[mid]; render(); enqueue('s/'+t.id+'/'+mid,()=>B.delS(t.id,mid)); return; }
  if(d.save){
    const m=t.matches.find(x=>x.id===d.save); const dr=S.draft;
    const all=[...dr.a,...dr.b];
    if(new Set(all).size!==all.length){ toast('Satu pemain tidak boleh muncul dua kali di match yang sama.'); return; }
    const others=t.matches.filter(x=>x.r===m.r&&x.id!==m.id).flatMap(x=>[...x.a,...x.b]);
    const clash=all.filter(p=>others.includes(p));
    if(clash.length && !confirm(clash.map(pname).join(', ')+' juga main di match lain pada round ini. Tetap simpan?')) return;
    const sa=dr.sa, sb=dr.sb;
    if(isNum(sa)!==isNum(sb)){ toast('Isi skor kedua tim, atau kosongkan keduanya.'); return; }
    if((isNum(sa)&&sa<0)||(isNum(sb)&&sb<0)){ toast('Skor tidak boleh negatif.'); return; }
    const pairChanged = dr.a.join()!==m.a.join() || dr.b.join()!==m.b.join();
    S.editMatch=null;
    if(pairChanged){ m.a=[...dr.a]; m.b=[...dr.b]; saveT(); render(); }
    const prev=scoreOf(m.id);
    if(isNum(sa)){ const obj={sa,sb,active:false,at:Date.now()}; S.scores[m.id]=obj; render(); enqueue('s/'+t.id+'/'+m.id,()=>B.saveS(t.id,m.id,obj)); toast('Skor tersimpan.'); }
    else if(isNum(prev.sa)){ delete S.scores[m.id]; render(); enqueue('s/'+t.id+'/'+m.id,()=>B.delS(t.id,m.id)); }
    else render();
    return;
  }
});
$app.addEventListener('change', e=>{
  const el=e.target; if(!S.t) return; const t=S.t;
  if(el.dataset.f){ const k=el.dataset.f; let v=el.value; if(k==='courts'){ v=Math.max(1,Math.min(10,parseInt(v,10)||1)); } if(t[k]!==v){ t[k]=v; saveT(); requestRender(); } return; }
  if(el.dataset.pname){ const p=t.players.find(x=>x.id===el.dataset.pname); const v=el.value.trim(); if(p && p.name!==v){ p.name=v; saveT(); requestRender(); } return; }
  if(el.dataset.slot){ const k=el.dataset.slot[0], i=Number(el.dataset.slot.slice(1)); S.draft[k][i]=el.value; return; }
});
$app.addEventListener('input', e=>{
  const el=e.target; if(!S.draft) return;
  if(el.hasAttribute('data-sa')) S.draft.sa = el.value===''?null:Number(el.value);
  if(el.hasAttribute('data-sb')) S.draft.sb = el.value===''?null:Number(el.value);
});
function addPlayers(){
  const inp=document.querySelector('[data-newp]'); if(!inp||!S.t) return;
  const names=inp.value.split(/[,\n]/).map(s=>s.trim()).filter(Boolean);
  if(!names.length){ toast('Ketik nama pemain dulu.'); inp.focus(); return; }
  names.forEach(n=>S.t.players.push({id:uid('p'),name:n,g:'M'}));
  inp.value=''; saveT(); render();
  const again=document.querySelector('[data-newp]'); if(again) again.focus();
}
$app.addEventListener('keydown', e=>{ if(e.key==='Enter' && e.target.hasAttribute && e.target.hasAttribute('data-newp')){ e.preventDefault(); addPlayers(); } });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && S.modal){ S.modal=null; render(); } });

// ---------- boot ----------
render();
(()=>{
  const configured = firebaseConfig && firebaseConfig.projectId && !/GANTI/.test(JSON.stringify(firebaseConfig));
  if(configured){
    try{ const fb=initializeApp(firebaseConfig); B=FirebaseBackend(getFirestore(fb)); Store.mode='shared'; }
    catch(e){ console.error(e); B=Local; Store.mode='local'; toast('Gagal terhubung ke Firebase, pakai mode lokal.'); }
  } else { B=Local; Store.mode='local'; console.warn('firebase-config.js belum diisi: memakai mode lokal.'); }
  const id=hashId(); if(id) openT(id); else openHome();
})();
