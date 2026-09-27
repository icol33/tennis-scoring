import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, doc, onSnapshot, setDoc, deleteDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
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
  link:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4.5 4.5 0 006.4 0l3-3a4.5 4.5 0 00-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 00-6.4 0l-3 3a4.5 4.5 0 006.4 6.4l1-1"/></svg>',
  ext:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/></svg>',
  copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/></svg>',
  reset:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 00-14.6-4.5L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0014.6 4.5L20 16"/><path d="M20 21v-5h-5"/></svg>',
  arrow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
  share:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>',
  users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 010 6.8M18.5 14.8c1.6.8 2.6 2.6 3 5.2"/></svg>',
  racket:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="14.5" cy="9.5" rx="6" ry="6.5" transform="rotate(40 14.5 9.5)"/><path d="M10 14l-6.5 6.5"/><circle cx="5" cy="5" r="1.8"/></svg>',
  medal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3l3 6M17 3l-3 6"/><circle cx="12" cy="15" r="6"/><path d="M12 12.5v5"/></svg>',
  download:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
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
    async getS(id){ return Object.keys(data.s[id]||{}); },
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
    async getS(id){ const q=await getDocs(collection(db,'tournaments',id,'scores')); return q.docs.map(d=>d.id); },
  };
}
let B = null;

// ---------- app state ----------
const S = {
  list:[], listReady:false,
  tid:null, t:null, scores:{}, tab:'matches', round:0, filter:null,
  editMatch:null, draft:null, modal:null, histFilter:'done',
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
function openT(id, tab){
  setHash(id);
  clearSubs(); S.tid=id; S.t=null; S.scores={}; S.tab=tab||'matches'; S.round=-1; S.editMatch=null; S.filter=null;
  unsubs.push(B.subT(id,t=>{ S.t=t; if(t && S.round<0){ S.round=firstOpenRound(); } if(!t){ openHome(); return; } requestRender(); }));
  unsubs.push(B.subS(id,s=>{ S.scores=s||{}; requestRender(); }));
  unsubs.push(B.subList(l=>{ S.list=l; S.listReady=true; if(S.tab==='setup') requestRender(); }));
  render();
}
function setHash(id){ const want=id?'#/s/'+id:'#/'; if(location.hash!==want){ try{ history.replaceState(null,'',want); }catch(e){ location.hash=want; } } }
function hashId(){ const m=location.hash.match(/^#\/s\/([\w-]+)/); return m?m[1]:null; }
function hashTab(){ const m=location.hash.match(/^#\/s\/[\w-]+\/(setup|matches|ranking)/); return m?m[1]:null; }
function sessionLink(id,tab){ return location.origin+location.pathname+'#/s/'+id+(tab?'/'+tab:''); }
async function copyText(text,okMsg){ try{ await navigator.clipboard.writeText(text); toast(okMsg); }catch(e){ S.modal={type:'share',text,title:'Salin link'}; render(); } }
window.addEventListener('hashchange',()=>{ if(!B) return; const id=hashId(); if(id && id!==S.tid) openT(id, hashTab()); else if(!id && S.tid) openHome(); });
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
// ---- aturan M/F: MM vs FF dilarang, komposisi seimbang diutamakan ----
let GMAP={};                                   // id -> 'M'|'F', diisi sebelum menjadwalkan
const fOf=team=>team.reduce((n,i)=>n+(GMAP[i]==='F'?1:0),0);
const gHard=(A,B)=>A.length===2 && Math.abs(fOf(A)-fOf(B))>=2 ? 1 : 0;   // MM vs FF
const gSoft=(A,B)=>A.length===2 && Math.abs(fOf(A)-fOf(B))===1 ? 1 : 0;  // mis. MF vs MM
function buildMatches(ids, mode){
  const rounds=circleRounds(shuffle(ids)).map(r=>shuffle(r));
  const ms=[];
  if(mode==='single'){ rounds.forEach(r=>r.forEach(([a,b])=>ms.push({a:[a],b:[b]}))); return {ms,dropped:0}; }
  const pool=[];
  rounds.forEach(r=>{
    const left=[...r];
    // pasangkan tim-tim di round ini dengan komposisi M/F paling seimbang
    while(left.length>=2){
      const A=left.shift(); let bi=0, bs=1e9;
      left.forEach((B,i)=>{ const sc=gHard(A,B)*100+gSoft(A,B)*10+Math.random(); if(sc<bs){bs=sc;bi=i;} });
      ms.push({a:A,b:left.splice(bi,1)[0]});
    }
    if(left.length) pool.push(left[0]);
  });
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
  const rest={}, cnt={}; ids.forEach(i=>{rest[i]=0; cnt[i]=0;});
  let remaining=ms.map((m,i)=>({...m,_i:i})); const out=[]; let r=0;
  const load=m=>[...m.a,...m.b].reduce((s,p)=>s+cnt[p],0), rested=m=>[...m.a,...m.b].reduce((s,p)=>s+rest[p],0);
  while(remaining.length){
    const used=new Set(); const pick=[];
    while(pick.length<courts){
      // utamakan match berisi pemain yang paling sedikit main, lalu yang paling lama istirahat
      let best=null;
      for(const m of remaining){ if(pick.includes(m)) continue; const ps=[...m.a,...m.b]; if(ps.some(p=>used.has(p))) continue;
        const key=[load(m), -rested(m), m._i]; if(!best||key[0]<best.k[0]||(key[0]===best.k[0]&&(key[1]<best.k[1]||(key[1]===best.k[1]&&key[2]<best.k[2])))) best={m,k:key}; }
      if(!best) break;
      [...best.m.a,...best.m.b].forEach(p=>used.add(p)); pick.push(best.m);
    }
    remaining=remaining.filter(m=>!pick.includes(m));
    ids.forEach(i=>{ rest[i]=used.has(i)?0:rest[i]+1; if(used.has(i)) cnt[i]++; });
    pick.forEach((m,c)=>out.push({id:'', r, c:c+1, a:m.a, b:m.b}));
    r++;
  }
  return out;
}
const gcd=(a,b)=>b?gcd(b,a%b):a;
// target 1 putaran penuh: tiap pemain idealnya berpasangan dengan semua pemain lain,
// dibulatkan ke atas ke jumlah match yang membuat semua pemain main sama banyak.
function fullRoundMatches(n){ const base=Math.ceil(n*(n-1)/4); const step=n/gcd(n,4); return Math.ceil(base/step)*step; }
// Pengacak adil: pilih pemain yang paling sedikit main, lalu paling lama istirahat,
// lalu bagi tim dengan menghindari pasangan/lawan yang berulang.
function greedySchedule(ids, M, courts, size, prior){
  const cnt={}, last={}, pc={}, oc={}; ids.forEach(i=>{cnt[i]=0; last[i]=-1;});
  const k=(a,b)=>a<b?a+'|'+b:b+'|'+a, g=(o,a,b)=>o[k(a,b)]||0, inc=(o,a,b)=>{o[k(a,b)]=(o[k(a,b)]||0)+1;};
  // lanjutkan dari jadwal yang sudah ada (untuk tombol tambah round)
  let r0=0;
  (prior||[]).forEach(m=>{ [...m.a,...m.b].forEach(i=>{ if(i in cnt){ cnt[i]++; last[i]=Math.max(last[i],m.r); } });
    if(size===4){ inc(pc,m.a[0],m.a[1]); inc(pc,m.b[0],m.b[1]); } m.a.forEach(a=>m.b.forEach(b=>inc(oc,a,b))); r0=Math.max(r0,m.r+1); });
  const combos=(arr,r)=>{ const out=[]; const f=(st,acc)=>{ if(acc.length===r){out.push(acc);return;} for(let i=st;i<arr.length;i++) f(i+1,[...acc,arr[i]]); }; f(0,[]); return out; };
  const splits=q=>size===2?[[[q[0]],[q[1]]]]:[[[q[0],q[1]],[q[2],q[3]]],[[q[0],q[2]],[q[1],q[3]]],[[q[0],q[3]],[q[1],q[2]]]];
  const out=[]; let made=0, r=r0;
  while(made<M){
    const used=new Set(); const per=Math.min(courts, M-made);
    for(let c=0;c<per;c++){
      const pool=shuffle(ids.filter(i=>!used.has(i))).sort((a,b)=>(cnt[a]-cnt[b])||(last[a]-last[b])).slice(0,size===2?10:9);
      let best=null;
      for(const q of combos(pool,size)){
        const load=q.reduce((s2,i)=>s2+cnt[i],0), rest=q.reduce((s2,i)=>s2+last[i],0);
        for(const [A,Bt] of splits(q)){
          const partner=size===2?0:g(pc,A[0],A[1])+g(pc,Bt[0],Bt[1]);
          const opp=A.reduce((s2,a)=>s2+Bt.reduce((t2,b)=>t2+g(oc,a,b),0),0);
          const score=load*1e8 + gHard(A,Bt)*1e7 + gSoft(A,Bt)*3e4 + partner*1e4 + opp*100 + rest + Math.random();
          if(!best||score<best.score) best={score,A,B:Bt};
        }
      }
      const {A,B:Bt}=best; [...A,...Bt].forEach(i=>{cnt[i]++; last[i]=r; used.add(i);});
      if(size===4){ inc(pc,A[0],A[1]); inc(pc,Bt[0],Bt[1]); }
      A.forEach(a=>Bt.forEach(b=>inc(oc,a,b)));
      out.push({id:'',r,c:c+1,a:A,b:Bt}); made++;
    }
    r++;
  }
  return out;
}
function rateSchedule(sch, ids, mode){
  const cnt={}; ids.forEach(i=>cnt[i]=0); let maxGap=0; const R=sch.reduce((x,m)=>Math.max(x,m.r+1),0);
  const pairs={}, key=(a,b)=>a<b?a+'|'+b:b+'|'+a; let hard=0, soft=0;
  for(let r=0;r<R;r++){ sch.filter(m=>m.r===r).forEach(m=>{ [...m.a,...m.b].forEach(p=>cnt[p]++); hard+=gHard(m.a,m.b); soft+=gSoft(m.a,m.b);
      const pr = mode==='single' ? [[m.a[0],m.b[0]]] : [m.a,m.b];
      pr.forEach(([x,y])=>{ const kk=key(x,y); pairs[kk]=(pairs[kk]||0)+1; }); });
    const v=Object.values(cnt); maxGap=Math.max(maxGap, Math.max(...v)-Math.min(...v)); }
  const n=ids.length, missing=n*(n-1)/2-Object.keys(pairs).length;
  const repeats=Object.values(pairs).reduce((s2,x)=>s2+(x-1),0);
  return [hard, maxGap>1?1:0, missing, soft, repeats, maxGap, R];
}
function setGMap(){ GMAP={}; ((S.t&&S.t.players)||[]).forEach(p=>GMAP[p.id]=p.g==='F'?'F':'M'); }
function makeSchedule(ids, mode, courts){
  setGMap();
  const n=ids.length, size=mode==='single'?2:4, cands=[];
  if(mode==='single' || n%4===0 || n%4===1){ const {ms}=buildMatches(ids,mode); cands.push(scheduleRounds(ms,courts,ids)); }
  const M = mode==='single' ? n*(n-1)/2 : fullRoundMatches(n);
  const tries = n>14 ? 15 : 40;
  for(let i=0;i<tries;i++) cands.push(greedySchedule(shuffle(ids), M, courts, size));
  let best=null;
  const less=(x,y)=>{ for(let i=0;i<x.length;i++){ if(x[i]!==y[i]) return x[i]<y[i]; } return false; };
  for(const c of cands){ const k=rateSchedule(c,ids,mode); if(!best||less(k,best.k)) best={c,k}; }
  return best.c;
}
// susun ulang round saat jumlah court berubah (pasangan & skor tetap).
// Round yang sudah ada skornya dibiarkan apa adanya; hanya sisa jadwal yang dipadatkan ulang.
function repackRounds(matches, courts){
  const sorted=[...matches].sort((a,b)=>(a.r-b.r)||(a.c-b.c));
  const lastDone=sorted.reduce((x,m)=>isDone(m.id)?Math.max(x,m.r):x,-1);
  const keep=sorted.filter(m=>m.r<=lastDone), rest=sorted.filter(m=>m.r>lastDone);
  const out=keep.map(m=>({...m})); let r=lastDone+1;
  while(rest.length){
    const used=new Set(); let c=0;
    for(let i=0;i<rest.length && c<courts;){
      const m=rest[i], ps=[...m.a,...m.b];
      if(ps.some(p=>used.has(p))){ i++; continue; }
      ps.forEach(p=>used.add(p)); out.push({...m,r,c:++c}); rest.splice(i,1);
    }
    r++;
  }
  return out;
}
function effCourts(t){ const need=t.mode==='single'?2:4; return Math.max(1,Math.min(Number(t.courts)||1, Math.floor(t.players.length/need)||1)); }
function addRound(){
  const t=S.t; const ids=t.players.map(p=>p.id); const size=t.mode==='single'?2:4;
  if(ids.length<size){ toast('Pemain belum cukup.'); return; }
  setGMap();
  const courts=Math.min(effCourts(t), Math.floor(ids.length/size));
  const prior=(t.matches||[]).filter(m=>[...m.a,...m.b].every(p=>ids.includes(p)));
  let best=null;
  for(let i=0;i<40;i++){
    const add=greedySchedule(shuffle(ids), courts, courts, size, prior);
    const k2=(a,b)=>a<b?a+'|'+b:b+'|'+a; const seen={};
    prior.forEach(m=>{ if(size===4){ seen[k2(...m.a)]=(seen[k2(...m.a)]||0)+1; seen[k2(...m.b)]=(seen[k2(...m.b)]||0)+1; } else { seen[k2(m.a[0],m.b[0])]=(seen[k2(m.a[0],m.b[0])]||0)+1; } });
    const rep2=add.reduce((n,m)=> n + (size===4 ? (seen[k2(...m.a)]||0)+(seen[k2(...m.b)]||0) : (seen[k2(m.a[0],m.b[0])]||0)),0);
    const key=[add.reduce((n,m)=>n+gHard(m.a,m.b),0), add.reduce((n,m)=>n+gSoft(m.a,m.b),0), rep2];
    if(!best||key[0]<best.k[0]||(key[0]===best.k[0]&&(key[1]<best.k[1]||(key[1]===best.k[1]&&key[2]<best.k[2])))) best={add,k:key};
  }
  const R=(t.matches||[]).reduce((x,m)=>Math.max(x,m.r+1),0); const gen=t.gen||1; const base=(t.matches||[]).length;
  const add=best.add.map((m,i)=>({...m, r:R, id:'g'+gen+'x'+Date.now().toString(36)+i}));
  t.matches=[...(t.matches||[]), ...add];
  S.round=R; S.filter=null; saveT(); render();
  toast('Round '+(R+1)+' ditambahkan ('+add.length+' match).');
}
// round-round di mana semua pemain sudah main sama banyak (titik aman untuk berhenti)
function balancedRounds(t){
  const ids=t.players.map(p=>p.id); const cnt={}; ids.forEach(i=>cnt[i]=0); const out=new Set();
  roundsOf(t).forEach((r,i)=>{ r.forEach(m=>[...m.a,...m.b].forEach(p=>{ if(p in cnt) cnt[p]++; })); const v=Object.values(cnt); if(v.length && Math.min(...v)>0 && Math.min(...v)===Math.max(...v)) out.add(i); });
  return out;
}
async function generate(){
  const t=S.t; const ids=t.players.map(p=>p.id); const need=t.mode==='single'?2:4;
  if(ids.length<need){ toast('Minimal '+need+' pemain untuk mode '+(t.mode==='single'?'single':'double')+'.'); return; }
  const hasScores=Object.keys(S.scores).length>0;
  if(t.matches && t.matches.length && !confirm(hasScores?'Jadwal baru akan menghapus semua skor yang sudah diisi. Lanjutkan?':'Buat ulang jadwal dengan pasangan acak baru?')) return;
  const courts=Math.max(1,Math.min(Number(t.courts)||1, Math.floor(ids.length/need)));
  const gen=(t.gen||0)+1;
  const sched=makeSchedule(ids,t.mode,courts).map((m,i)=>({...m,id:'g'+gen+'m'+(i+1)}));
  const oldIds=Object.keys(S.scores);
  t.gen=gen; t.matches=sched; t.scheduledPlayers=ids.slice().sort().join(',');
  S.round=0; S.tab='matches'; S.editMatch=null;
  const w=saveT(); render(); await w;
  oldIds.forEach(mid=>enqueue('s/'+t.id+'/'+mid, ()=>B.delS(t.id,mid)));
  const rounds=sched.reduce((x,m)=>Math.max(x,m.r+1),0);
  toast(sched.length+' match dalam '+rounds+' round dibuat.');
}

// ---------- derived ----------
function pname(id){ const p=S.t&&S.t.players.find(x=>x.id===id); return p?(p.name||'Tanpa nama'):'(dihapus)'; }
function scoreOf(mid){ const s=S.scores[mid]; return s||{}; }
function isDone(mid){ const s=scoreOf(mid); return isNum(s.sa)&&isNum(s.sb); }
function roundsOf(t){ const m=t.matches||[]; const n=m.reduce((x,y)=>Math.max(x,y.r+1),0); const out=[]; for(let i=0;i<n;i++) out.push(m.filter(x=>x.r===i).sort((a,b)=>a.c-b.c)); return out; }
function firstOpenRound(){ const t=S.t; if(!t||!t.matches) return 0; const rs=roundsOf(t); const i=rs.findIndex(r=>r.some(m=>!isDone(m.id))); return i<0?Math.max(0,rs.length-1):i; }
function standings(){
  const t=S.t; const st={};
  t.players.forEach(p=>st[p.id]={id:p.id,name:p.name||'Tanpa nama',g:p.g,W:0,L:0,T:0,diff:0,gf:0,ga:0,mp:0,hist:[],mates:{},opps:{}});
  (t.matches||[]).forEach(m=>{
    if(!isDone(m.id)) return; const s=scoreOf(m.id);
    const side=(ids,own,opp,oppIds)=>ids.forEach(id=>{ const r=st[id]; if(!r) return;
      r.mp++; r.gf+=own; r.ga+=opp; r.diff+=own-opp;
      const res=own>opp?'W':own<opp?'L':'T'; r[res]++;
      const partners=ids.filter(x=>x!==id);
      const add=(bag,pid)=>{ const o=bag[pid]=bag[pid]||{id:pid,n:0,W:0,L:0,T:0,diff:0}; o.n++; o[res]++; o.diff+=own-opp; };
      partners.forEach(pid=>add(r.mates,pid)); oppIds.forEach(pid=>add(r.opps,pid));
      r.hist.push({m,res,own,opp,partners,opps:oppIds}); });
    side(m.a,s.sa,s.sb,m.b); side(m.b,s.sb,s.sa,m.a);
  });
  const rows=Object.values(st); const maxMp=rows.reduce((x,r)=>Math.max(x,r.mp),0);
  rows.forEach(r=>{
    r.V=maxMp-r.mp;                       // virtual win penyeimbang jumlah main
    r.wins=r.W+r.V;
    r.avg=r.mp?r.gf/r.mp:0;
    r.pts=r.wins*4 + r.T*2 + r.L*1 + r.avg*0.2;
  });
  return rows.sort((a,b)=>(b.pts-a.pts)||(b.wins-a.wins)||(b.diff-a.diff)||a.name.localeCompare(b.name));
}
// ---------- render ----------
function header(title, back){
  const sync = Store.mode==='shared' ? '<span class="sync" title="Tersinkron untuk semua yang membuka link"><i></i>Live</span>' : '<span class="sync local" title="Data hanya di perangkat ini"><i></i>Lokal</span>';
  return `<header class="top"><div class="top-row">
    ${back?`<button class="icon-btn" data-act="home" aria-label="Kembali">${ICON.back}</button>`:''}
    <div class="brand grow">${back?'':'<span class="mark" aria-hidden="true"></span>'}<h1>${esc(title)}</h1></div>
    ${sync}
    ${back?`<button class="icon-btn" data-act="copylink" aria-label="Salin link sesi" title="Salin link sesi">${ICON.link}</button>`:''}
  </div>${back?tabsHtml():''}</header>`;
}
function tabsHtml(){
  const tb=(k,l,ic)=>`<button class="tab" role="tab" aria-selected="${S.tab===k}" data-tab="${k}">${ic}${l}</button>`;
  return `<nav class="tabs" role="tablist">${tb('setup','Setup',ICON.users)}${tb('matches','Match',ICON.racket)}${tb('ranking','Ranking',ICON.medal)}</nav>`;
}
function render(){
  pending=false;
  if(Store.mode==='loading'){ $app.innerHTML=header('Rally Board by Cholid')+'<div class="wrap"><p class="empty">Menyiapkan…</p></div>'; return; }
  if(!S.tid) return renderHome();
  if(!S.t){ $app.innerHTML=header('Memuat…',true)+'<div class="wrap"><p class="empty">Memuat sesi…</p></div>'; return; }
  const body = S.tab==='setup'?renderSetup():S.tab==='ranking'?renderRanking():renderMatches();
  $app.innerHTML = header(S.t.name||'Sesi tanpa nama', true) + `<main class="wrap">${body}</main>` + renderModal();
}
function pastPlayers(){
  const cur=new Set(((S.t&&S.t.players)||[]).map(p=>(p.name||'').trim().toLowerCase()));
  const seen={};
  [...S.list].sort((a,b)=>(b.updatedAt||b.createdAt||0)-(a.updatedAt||a.createdAt||0)).forEach(t=>{
    if(S.t && t.id===S.t.id) return;
    (t.players||[]).forEach(p=>{ const nm=(p.name||'').trim(); const k=nm.toLowerCase(); if(!nm||cur.has(k)) return;
      if(!seen[k]) seen[k]={key:k,name:nm,g:p.g==='F'?'F':'M',n:0}; seen[k].n++; });
  });
  return Object.values(seen).sort((a,b)=>(b.n-a.n)||a.name.localeCompare(b.name));
}
async function homeAction(act,id){
  const t=S.list.find(x=>x.id===id); if(!t) return;
  if(act==='open'){ openT(id); return; }
  if(act==='link'){ copyText(sessionLink(id),'Link sesi disalin.'); return; }
  if(act==='dup'){
    const nid=uid('t'); const copy={name:(t.name||'Sesi')+' (copy)', date:todayISO(), sport:t.sport||'Tennis', mode:t.mode||'double', courts:t.courts||1, status:'ongoing',
      players:(t.players||[]).map(p=>({id:uid('p'),name:p.name,g:p.g==='F'?'F':'M'})), matches:[], gen:0, createdAt:Date.now(), updatedAt:Date.now()};
    if(t.host) copy.host=t.host;
    await enqueue('t/'+nid,()=>B.saveT(nid,copy)); toast('Sesi diduplikat: '+copy.name); return;
  }
  if(act==='reset'){
    if(!confirm('Reset "'+(t.name||'')+'"? Jadwal dan semua skor dihapus, daftar pemain tetap.')) return;
    const mids=await B.getS(id).catch(()=>[]);
    const body={...t}; delete body.id; body.matches=[]; body.gen=(t.gen||0)+1; body.status='ongoing'; delete body.scheduledPlayers; body.updatedAt=Date.now();
    await enqueue('t/'+id,()=>B.saveT(id,body));
    mids.forEach(mid=>enqueue('s/'+id+'/'+mid,()=>B.delS(id,mid)));
    toast('Sesi di-reset. Buka Setup untuk mengacak jadwal baru.'); return;
  }
  if(act==='del'){
    if(!confirm('Hapus sesi "'+(t.name||'')+'" beserta semua skornya?')) return;
    const mids=await B.getS(id).catch(()=>[]);
    mids.forEach(mid=>enqueue('s/'+id+'/'+mid,()=>B.delS(id,mid)));
    await enqueue('t/'+id,()=>B.delT(id)); toast('Sesi dihapus.'); return;
  }
}
function renderHome(){
  const list=[...S.list].sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.createdAt||0)-(a.createdAt||0));
  const items = !S.listReady ? '<p class="empty">Memuat sesi…</p>' : list.length ? list.map(t=>{
    const n=(t.matches||[]).length; const ps=t.players||[];
    return `<article class="tcard">
      <div class="tcard-top"><h3>${esc(t.name||'Sesi tanpa nama')}</h3><span class="tdate">${ICON.cal}${esc(fmtDate(t.date))}</span></div>
      <div class="tmeta"><span>🎾 Tennis</span><span>${t.mode==='single'?'Single':'Double'} Americano</span><span>${ps.length} pemain · ${effCourts({...t,players:ps})} court</span>${n?`<span>${n} match</span>`:''}<span class="badge ${t.status==='done'?'':'live'}">${t.status==='done'?'Selesai':'Berjalan'}</span></div>
      ${t.host?`<div class="small hosted">Hosted by <b>${esc(t.host)}</b></div>`:''}
      <div class="tactions">
        <button class="tact" data-hact="link" data-id="${esc(t.id)}" aria-label="Salin link sesi" title="Salin link sesi">${ICON.ext}</button>
        <button class="tact" data-hact="dup" data-id="${esc(t.id)}" aria-label="Duplikat sesi" title="Duplikat (setup & pemain)">${ICON.copy}</button>
        <button class="tact" data-hact="reset" data-id="${esc(t.id)}" aria-label="Reset sesi" title="Reset (hapus jadwal & skor)">${ICON.reset}</button>
        <button class="tact danger" data-hact="del" data-id="${esc(t.id)}" aria-label="Hapus sesi" title="Hapus sesi">${ICON.trash}</button>
        <button class="btn enter" data-hact="open" data-id="${esc(t.id)}">Enter ${ICON.arrow}</button>
      </div></article>`;
  }).join('') : '<div class="empty">Belum ada sesi. Buat sesi pertama untuk mulai mengacak pasangan.</div>';
  $app.innerHTML = header('Rally Board by Cholid') + `<main class="wrap">
    <section class="hero"><h2>Tennis Americano</h2><p>Acak pasangan, catat skor tiap match, dan ranking per pemain dihitung otomatis.</p></section>
    ${Store.mode==='local'?'<div class="notice">Mode lokal: data hanya tersimpan di perangkat ini.</div>':''}
    <button class="btn ball block" style="margin-top:16px;padding:14px" data-act="new">+ Buat sesi baru</button>
    <div class="row" style="margin-top:22px"><h2 class="grow sec-title">Sesi saya</h2><span class="small muted">${list.length} sesi</span></div>
    <div>${items}</div>
  </main>`;
}
function renderSetup(){
  const t=S.t; const men=t.players.filter(p=>p.g!=='F').length, women=t.players.length-men;
  const changed = t.matches && t.matches.length && t.scheduledPlayers !== t.players.map(p=>p.id).sort().join(',');
  return `
  <section class="card">
    <label class="field"><span>Nama sesi</span><input class="input" data-f="name" value="${esc(t.name)}" placeholder="mis. Ultradome, 27 Sep"></label>
    <label class="field"><span>Nama host</span><input class="input" data-f="host" value="${esc(t.host||'')}" placeholder="mis. Cholid" maxlength="60"></label>
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
      <div class="seg newg" role="group" aria-label="Gender pemain baru"><button type="button" data-newg="M" aria-pressed="${S.newG!=='F'}">M</button><button type="button" data-newg="F" aria-pressed="${S.newG==='F'}">F</button></div>
      <button class="btn primary" type="button" data-act="addp">Tambah</button>
    </div>
    <p class="small muted" style="margin:8px 0 0">Pilih M/F dulu, lalu ketik nama. Bisa tempel beberapa nama sekaligus (pisahkan dengan koma); semuanya memakai gender yang dipilih.</p>
    ${(()=>{ const pp=pastPlayers(); return pp.length?`<div class="past"><div class="row"><span class="small grow" style="font-weight:600">Pemain sebelumnya · ketuk untuk menambah</span><button class="linkbtn small" data-act="addallpast">Tambah semua</button></div>
      <div class="pastlist">${pp.map(x=>`<button class="pastchip" data-addpast="${esc(x.key)}"><span class="g ${x.g}">${x.g}</span>${esc(x.name)}</button>`).join('')}</div></div>`:''; })()}
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
  const bal=balancedRounds(t);
  const dots=rs.map((r,i)=>`<span class="dot ${r.every(m=>isDone(m.id))?'done':''} ${i===S.round?'cur':''} ${bal.has(i)?'bal':''}"></span>`).join('');
  const nextBal=[...bal].find(i=>i>=S.round);
  const balNote = bal.has(S.round) ? '✓ Setelah round ini, semua pemain sudah main sama banyak'
    : nextBal!==undefined ? 'Jumlah main semua pemain seimbang lagi di round '+(nextBal+1) : 'Jumlah main pemain di jadwal ini tidak seimbang';
  return chips + `<div class="roundnav">
      <button class="btn" data-rnd="-1" ${S.round===0?'disabled':''} aria-label="Round sebelumnya">${ICON.back}</button>
      <div class="roundtitle"><b>Round ${S.round+1}/${rs.length}</b><div class="dots" aria-hidden="true">${dots}</div><div class="balnote ${bal.has(S.round)?'ok':''}">${balNote}</div></div>
      <button class="btn" data-rnd="1" ${S.round>=rs.length-1?'disabled':''} aria-label="Round berikutnya">${ICON.next}</button></div>
    ${cur.map(m=>matchCard(m, ms.indexOf(m)+1)).join('')}
    ${bench.length?`<section class="bench"><h3>Tidak main di round ini (${bench.length})</h3><div class="names">${bench.map(p=>`<span class="pill">${esc(p.name||'Tanpa nama')}</span>`).join('')}</div></section>`:''}
    ${S.round===rs.length-1?`<button class="btn block addround" data-act="addround">+ Tambah round (${effCourts(t)} court)</button><p class="small muted" style="text-align:center;margin:6px 0 0">Pemain yang paling sedikit main didahulukan.</p>`:''}`;
}
function renderRanking(){
  const t=S.t; const st=standings(); const ms=t.matches||[]; const done=ms.filter(m=>isDone(m.id)).length;
  const finished = ms.length && done===ms.length;
  const top=st[0]; const anyPlayed=st.some(r=>r.mp);
  const sign=v=>v>0?'+'+v:String(v);
  return `<section class="leader"><span class="ballshape" aria-hidden="true"></span>
      <small>${finished||t.status==='done'?'Juara '+esc(t.name||''):'Memimpin sementara'}</small>
      <strong>${anyPlayed?esc(top.name):'Belum ada skor'}</strong>
      <div class="meta">${done}/${ms.length} match selesai · ${esc(fmtDate(t.date))}${t.host?' · Hosted by '+esc(t.host):''}</div></section>
    <div class="table-wrap"><table>
      <thead><tr><th>#</th><th>Pemain</th><th>W-L-T</th><th>Diff</th><th>Poin</th></tr></thead>
      <tbody>${st.map((r,i)=>`<tr class="${i===0&&anyPlayed?'first':''}"><td>${i===0&&anyPlayed?'🏅':i+1}</td>
        <td><button class="pname" data-player="${esc(r.id)}">${esc(r.name)}</button>${r.V&&anyPlayed?` <span class="virt" title="${r.V} virtual win">⭐ +${r.V}</span>`:''}</td>
        <td class="num">${r.W}-${r.L}-${r.T}</td>
        <td class="num ${r.diff>0?'pos':r.diff<0?'neg':''}">${sign(r.diff)}</td>
        <td class="pts">${Math.round(r.pts)}</td></tr>`).join('')}</tbody></table></div>
    <details class="notes" open><summary>Catatan perhitungan</summary><ul>
      <li>Diff = selisih skor (skor didapat − skor kemasukan).</li>
      <li>W-L-T = Menang-Kalah-Seri (contoh 3-0-0 = 3 menang, 0 kalah, 0 seri).</li>
      <li>Poin = (menang × 4) + (seri × 2) + (kalah × 1) + ((total skor ÷ jumlah main) × 0,2), ditampilkan dibulatkan.</li>
      <li>⭐ = virtual win untuk menyeimbangkan pemain yang main lebih sedikit dari pemain terbanyak.</li>
      <li>Urutan: poin, lalu jumlah menang (termasuk virtual), lalu Diff.</li>
      <li>Virtual win tidak menambah Diff.</li>
      <li>Ketuk nama pemain untuk melihat analitiknya.</li></ul></details>
    ${matchHistory()}
    <button class="btn primary block sharebtn" style="margin-top:14px;padding:14px" data-act="copyresult">${ICON.share}<span>Bagikan hasil</span></button>
    <p class="small muted" style="text-align:center;margin:6px 0 0">Menyalin link ke halaman ranking sesi ini.</p>`;
}
function matchHistory(){
  const t=S.t; const ms=[...(t.matches||[])].sort((a,b)=>(a.r-b.r)||(a.c-b.c)); if(!ms.length) return '';
  const f=S.histFilter==='all'?'all':'done';
  const list=f==='done'?ms.filter(m=>isDone(m.id)):ms;
  const multi=effCourts(t)>1;
  const team=ids=>ids.map(pname).map(esc).join(' / ');
  return `<section class="hist-card"><h3>Tournament Matches</h3>
    <div class="hist-filter"><button class="chip ${f==='all'?'on':''}" data-hist="all">Semua match</button><button class="chip ${f==='done'?'on':''}" data-hist="done">Selesai</button></div>
    ${list.length?list.map(m=>{ const s=scoreOf(m.id), done=isDone(m.id), live=!done&&s.active;
      return `<div class="hrow"><div class="hrow-top"><span class="muted small">Match ${ms.indexOf(m)+1} · Round ${m.r+1}${multi?' · Court '+m.c:''}</span>
        <span class="hbadge ${done?'done':live?'live':''}">${done?'Selesai':live?'Sedang main':'Belum main'}</span></div>
        <div class="hrow-main"><span class="ht a ${done&&s.sa>s.sb?'w':''}">${team(m.a)}</span><b class="hs num">${done?s.sa+' - '+s.sb:'vs'}</b><span class="ht b ${done&&s.sb>s.sa?'w':''}">${team(m.b)}</span></div></div>`; }).join('')
      :'<p class="empty">Belum ada match yang selesai.</p>'}
  </section>`;
}
function playerPage(r){
  const sign=v=>v>0?'+'+v:String(v);
  const rate=r.mp?Math.round(r.W/r.mp*100):0;
  const pl=(n,one,many)=>n+' '+(n===1?one:many);
  const mates=Object.values(r.mates).sort((a,b)=>(b.W-a.W)||(b.diff-a.diff)||(b.n-a.n));
  const opps=Object.values(r.opps).sort((a,b)=>(b.L-a.L)||(a.diff-b.diff)||(b.n-a.n));
  const dcls=v=>v>0?'pos':v<0?'neg':'';
  const item=(o,kind)=>`<div class="pa-item"><b>${esc(pname(o.id))}</b><span>${pl(o.n,'match','matches')} · ${kind==='mate'?pl(o.W,'win','wins'):pl(o.L,'loss','losses')} · <em class="${dcls(o.diff)}">${sign(o.diff)} Diff</em></span></div>`;
  return `<div class="pa" role="dialog" aria-modal="true" aria-label="Analitik ${esc(r.name)}">
    <header class="pa-head"><button class="icon-btn" data-close aria-label="Kembali">${ICON.back}</button>
      <div class="pa-title"><h3>${esc(r.name)}</h3><small>Player Analytics</small></div>
      <button class="icon-btn" data-act="dlplayer" aria-label="Download analitik">${ICON.download}</button></header>
    <div class="pa-body" id="pa-capture">
      <div class="pa-caption">${esc(S.t.name||'')} · ${esc(r.name)}</div>
      <div class="pa-top"><div><b>${r.W}</b><span>Total Wins</span></div><div><b>${rate}%</b><span>Win Rate</span></div><div><b>${r.diff}</b><span>Point Diff</span></div></div>
      <section class="pa-card"><h4>Match Status</h4><div class="pa-5">
        <div><b>${r.mp}</b><span>Played</span></div><div><b class="pos">${r.W}</b><span>Won</span></div><div><b class="neg">${r.L}</b><span>Lost</span></div><div><b class="muted">${r.T}</b><span>Ties</span></div><div><b class="muted">${r.V}</b><span>Virtual</span></div></div></section>
      <section class="pa-card"><h4>Score Statistics</h4><div class="pa-ss">
        <div class="pa-ss-h">Total</div><div class="pa-ss-h">Average</div>
        <div class="pa-2"><div><b class="pos">${r.gf}</b><span>Scored</span></div><div><b class="neg">${r.ga}</b><span>Conceded</span></div></div>
        <div class="pa-2"><div><b class="pos">${r.mp?(r.gf/r.mp).toFixed(1):'0'}</b><span>per Match</span></div><div><b class="neg">${r.mp?(r.ga/r.mp).toFixed(1):'0'}</b><span>per Match</span></div></div></div></section>
      ${mates.length?`<section class="pa-card"><h4>Top Teammates</h4>${mates.map(o=>item(o,'mate')).join('')}</section>`:''}
      <section class="pa-card"><h4>Toughest Opponents</h4>${opps.length?opps.map(o=>item(o,'opp')).join(''):'<p class="muted small">Belum ada match selesai.</p>'}</section>
      ${r.hist.length?`<section class="pa-card"><h4>Match History</h4>${r.hist.map(h=>`<div class="hist"><div><div>Round ${h.m.r+1}${h.partners.length?' · bareng '+esc(h.partners.map(pname).join(', ')):''}</div><div class="muted small">vs ${esc(h.opps.map(pname).join(' & '))}</div></div><div class="row"><span class="num" style="font-size:18px;font-weight:700">${h.own}–${h.opp}</span><span class="res ${h.res}">${h.res}</span></div></div>`).join('')}</section>`:''}
    </div></div>`;
}
function renderModal(){
  if(!S.modal) return '';
  if(S.modal.type==='player'){ const r=standings().find(x=>x.id===S.modal.id); return r?playerPage(r):''; }
  if(S.modal.type==='share'){
    return `<div class="modal-bg" data-close><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(S.modal.title||'Bagikan')}" onclick="event.stopPropagation()">
      <div class="row"><h3 class="grow">${esc(S.modal.title||'Bagikan')}</h3><button class="icon-btn" data-close aria-label="Tutup" style="color:var(--ink)">✕</button></div>
      <p class="small muted" style="margin:0 0 8px">Salin lalu tempel ke WhatsApp atau grup.</p>
      <textarea class="input" readonly data-sharetext style="min-height:90px">${esc(S.modal.text)}</textarea>
      <button class="btn primary block" style="margin-top:10px" data-act="copy">Salin</button></div></div>`;
  }
  return '';
}
function shareText(){
  const t=S.t, st=standings(), ms=t.matches||[], done=ms.filter(m=>isDone(m.id)).length;
  const sign=v=>v>0?'+'+v:String(v);
  let s=`🎾 ${t.name||'Sesi tennis'} (${fmtDate(t.date)})\n${t.mode==='single'?'Single':'Double'} Americano · ${done}/${ms.length} match selesai${t.host?'\nHosted by '+t.host:''}\n\n`;
  st.forEach((r,i)=>{ s+=`${i+1}. ${r.name}${r.V?' (⭐+'+r.V+')':''} — ${r.W}-${r.L}-${r.T}, diff ${sign(r.diff)}, ${Math.round(r.pts)} poin\n`; });
  return s.trim();
}

// ---------- confetti ----------
function confetti(x,y){
  const cv=document.createElement('canvas'); const dpr=window.devicePixelRatio||1;
  cv.className='confetti'; cv.width=innerWidth*dpr; cv.height=innerHeight*dpr; document.body.appendChild(cv);
  const ctx=cv.getContext&&cv.getContext('2d'); if(!ctx){ cv.remove(); return; } ctx.scale(dpr,dpr);
  const cs=getComputedStyle(document.documentElement);
  const cols=[cs.getPropertyValue('--ball').trim()||'#D9EE3A','#FFFFFF','#2C7A5B','#F2A93B','#E8505B','#4F8DF7'];
  const ox=x??innerWidth/2, oy=y??innerHeight/3;
  const ps=Array.from({length:90},()=>{ const a=Math.random()*Math.PI*2, v=4+Math.random()*7;
    return {x:ox,y:oy,vx:Math.cos(a)*v,vy:Math.sin(a)*v-4,w:5+Math.random()*6,h:3+Math.random()*4,r:Math.random()*6,vr:(Math.random()-.5)*.4,c:cols[Math.floor(Math.random()*cols.length)],round:Math.random()<.25}; });
  const t0=performance.now();
  (function frame(t){
    const el=t-t0; ctx.clearRect(0,0,innerWidth,innerHeight);
    ps.forEach(p=>{ p.vy+=.22; p.vx*=.985; p.x+=p.vx; p.y+=p.vy; p.r+=p.vr;
      ctx.save(); ctx.globalAlpha=Math.max(0,1-el/1800); ctx.translate(p.x,p.y); ctx.rotate(p.r); ctx.fillStyle=p.c;
      if(p.round){ ctx.beginPath(); ctx.arc(0,0,p.h/1.4,0,Math.PI*2); ctx.fill(); } else ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
      ctx.restore(); });
    if(el<1800) requestAnimationFrame(frame); else cv.remove();
  })(t0);
}
let h2cLoading=null;
function loadH2C(){ if(window.html2canvas) return Promise.resolve(); if(h2cLoading) return h2cLoading;
  h2cLoading=new Promise((res,rej)=>{ const sc=document.createElement('script'); sc.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'; sc.onload=res; sc.onerror=()=>{h2cLoading=null;rej(new Error('load'));}; document.head.appendChild(sc); });
  return h2cLoading; }
async function downloadPlayer(){
  const node=document.getElementById('pa-capture'); if(!node) return;
  const r=standings().find(x=>x.id===S.modal.id); const fname=((r&&r.name)||'pemain').replace(/[^\w-]+/g,'_')+'-analytics.png';
  try{
    toast('Menyiapkan gambar…'); await loadH2C();
    node.classList.add('capturing');
    const bg=getComputedStyle(document.body).backgroundColor;
    const canvas=await window.html2canvas(node,{backgroundColor:bg,scale:2,useCORS:true});
    node.classList.remove('capturing');
    const blob=await new Promise(res=>canvas.toBlob(res,'image/png'));
    const file=new File([blob],fname,{type:'image/png'});
    if(navigator.canShare && navigator.canShare({files:[file]})){ try{ await navigator.share({files:[file],title:fname}); return; }catch(e){ if(e&&e.name==='AbortError') return; } }
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=fname; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),4000);
    toast('Gambar tersimpan.');
  }catch(e){ node.classList.remove('capturing'); console.error(e); toast('Gagal membuat gambar.'); }
}

// ---------- events ----------
// konfeti untuk setiap klik di tab Ranking (tab-nya, nama pemain, tombol, termasuk halaman analitik pemain)
$app.addEventListener('click', e=>{
  const el=e.target.closest('button'); if(!el) return;
  const inRanking = S.tab==='ranking' && S.tid;
  const fire = el.dataset.tab ? el.dataset.tab==='ranking' : (inRanking && el.dataset.act!=='home');
  if(fire) setTimeout(()=>confetti(e.clientX||undefined, e.clientY||undefined),0);
}, true);
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
  if(d.hact){ await homeAction(d.hact, d.id); return; }
  if(!S.t) return;
  const t=S.t;
  if(d.act==='addp'){ addPlayers(); return; }
  if(d.newg){ S.newG=d.newg; render(); const i=document.querySelector('[data-newp]'); if(i) i.focus(); return; }
  if(d.act==='addround'){ addRound(); return; }
  if(d.act==='gen'){ generate(); return; }
  if(d.act==='delT'){ if(confirm('Hapus sesi "'+(t.name||'')+'" beserta semua skornya?')){ const id=t.id; Object.keys(S.scores).forEach(mid=>enqueue('s/'+id+'/'+mid,()=>B.delS(id,mid))); await enqueue('t/'+id,()=>B.delT(id)); openHome(); } return; }
  if(d.act==='copylink'){ copyText(sessionLink(t.id),'Link sesi disalin.'); return; }
  if(d.act==='copyresult'){ copyText(sessionLink(t.id,'ranking'),'Link hasil (ranking) disalin.'); return; }
  if(d.hist){ S.histFilter=d.hist; render(); return; }
  if(d.addpast){ const pp=pastPlayers().find(x=>x.key===d.addpast); if(pp){ t.players.push({id:uid('p'),name:pp.name,g:pp.g}); saveT(); render(); } return; }
  if(d.act==='addallpast'){ const pp=pastPlayers(); if(pp.length){ pp.forEach(x=>t.players.push({id:uid('p'),name:x.name,g:x.g})); saveT(); render(); toast(pp.length+' pemain ditambahkan.'); } return; }
  if(d.act==='copy'){ const ta=document.querySelector('[data-sharetext]'); try{ await navigator.clipboard.writeText(ta.value); toast('Disalin.'); S.modal=null; render(); }catch(err){ ta.select(); try{document.execCommand('copy');toast('Disalin.');}catch(x){toast('Pilih teks lalu salin manual.');} } return; }
  if(d.mode){ if(t.mode!==d.mode){ t.mode=d.mode; saveT(); render(); if(t.matches&&t.matches.length) toast('Format berubah. Acak ulang jadwal supaya berlaku.'); } return; }
  if(d.status){ t.status=d.status; saveT(); render(); return; }
  if(d.gender){ const p=t.players.find(x=>x.id===d.gender); if(p){ p.g=p.g==='F'?'M':'F'; saveT(); render(); } return; }
  if(d.delp){ const p=t.players.find(x=>x.id===d.delp); if(p && confirm('Hapus '+(p.name||'pemain ini')+'?')){ t.players=t.players.filter(x=>x.id!==d.delp); saveT(); render(); } return; }
  if(d.rnd){ S.round+=Number(d.rnd); S.editMatch=null; render(); return; }
  if(d.filter){ S.filter = S.filter===d.filter?null:d.filter; S.editMatch=null; render(); return; }
  if(d.player){ S.modal={type:'player',id:d.player}; render(); return; }
  if(d.act==='dlplayer'){ downloadPlayer(); return; }
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
  if(el.dataset.f){ const k=el.dataset.f; let v=el.value; if(k==='courts'){ v=Math.max(1,Math.min(10,parseInt(v,10)||1)); const need=t.mode==='single'?2:4; const mx=Math.floor(t.players.length/need); if(mx>=1 && v>mx){ toast('Maksimal '+mx+' court untuk '+t.players.length+' pemain.'); v=mx; el.value=v; } } if(k==='host') v=v.trim().slice(0,60);
    if(k==='host' && !v){ if('host' in t){ delete t.host; saveT(); requestRender(); } return; }
    if(t[k]!==v){ t[k]=v;
      if(k==='courts' && t.matches && t.matches.length){ const c=effCourts(t); t.matches=repackRounds(t.matches,c); S.round=firstOpenRound(); toast('Jadwal disusun ulang untuk '+c+' court. Skor tetap aman.'+(c<v?' (maks. '+c+' court untuk '+t.players.length+' pemain)':'')); }
      saveT(); requestRender(); }
    return; }
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
  names.forEach(n=>S.t.players.push({id:uid('p'),name:n,g:S.newG==='F'?'F':'M'}));
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
  const id=hashId(); if(id) openT(id, hashTab()); else openHome();
})();
