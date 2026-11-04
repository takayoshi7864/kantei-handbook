import * as pdfjs from './vendor/pdf.min.mjs';
import {TOC} from './toc.js';
import {buildIndex,search} from './search.js';
import {calc,STARS,DIR,STAR_PAGE} from './kyusei.js';
pdfjs.GlobalWorkerOptions.workerSrc='./vendor/pdf.worker.min.mjs';

const $=id=>document.getElementById(id);
const ls={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch{return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};

// ---- IndexedDB（PDF本体の保存）
const db=()=>new Promise((res,rej)=>{const r=indexedDB.open('kantei',1);r.onupgradeneeded=()=>r.result.createObjectStore('f');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const idb=async(mode,fn)=>{const d=await db();return new Promise((res,rej)=>{const t=d.transaction('f',mode);const q=fn(t.objectStore('f'));t.oncomplete=()=>res(q&&q.result);t.onerror=()=>rej(t.error)})};

let pages=[],stopFlag=false,lastResults=[];
let pdf=null,page=ls.get('page',1),zoom=ls.get('zoom',1),marks=ls.get('marks',[]),offset=ls.get('offset',0),task=null,pending=null;
const canvas=$('canvas'),ctx=canvas.getContext('2d');

async function openBuffer(buf){
  pdf=await pdfjs.getDocument({data:buf.slice(0)}).promise;
  $('empty').hidden=true;canvas.hidden=false;
  $('pageTotal').textContent='/ '+pdf.numPages;$('pageInput').max=pdf.numPages;
  try{const ix=await idb('readonly',s=>s.get('index'));pages=Array.isArray(ix)&&ix.length===pdf.numPages?ix:[]}catch{pages=[]}
  drawScope();idxStatus();
  go(Math.min(page,pdf.numPages));
}
async function render(){
  if(!pdf)return;
  if(task){pending=true;return}
  task=true;
  do{pending=false;
    const pg=await pdf.getPage(page);
    const stage=$('stage'),w=stage.clientWidth-16;
    const base=pg.getViewport({scale:1}),scale=(w/base.width)*zoom;
    const dpr=Math.min(window.devicePixelRatio||1,3),vp=pg.getViewport({scale:scale*dpr});
    canvas.width=vp.width;canvas.height=vp.height;
    canvas.style.width=vp.width/dpr+'px';canvas.style.height=vp.height/dpr+'px';
    await pg.render({canvasContext:ctx,viewport:vp}).promise;
  }while(pending);
  task=null;
}
function go(n,keepScroll){
  if(!pdf)return;
  page=Math.max(1,Math.min(pdf.numPages,n|0||1));
  ls.set('page',page);$('pageInput').value=page;
  $('btnMark').textContent=marks.some(m=>m.p===page)?'★':'☆';
  $('btnMark').classList.toggle('on',marks.some(m=>m.p===page));
  if(!keepScroll)$('stage').scrollTo(0,0);
  render();
}
const setZoom=z=>{zoom=Math.max(.5,Math.min(4,z));ls.set('zoom',zoom);render()};

// ---- 操作
$('btnPrev').onclick=()=>go(page-1);$('btnNext').onclick=()=>go(page+1);
$('btnZoomIn').onclick=()=>setZoom(zoom*1.25);$('btnZoomOut').onclick=()=>setZoom(zoom/1.25);
$('jumpForm').onsubmit=e=>{e.preventDefault();go(+$('pageInput').value);$('pageInput').blur()};
$('btnMark').onclick=()=>{
  const i=marks.findIndex(m=>m.p===page);
  if(i>=0)marks.splice(i,1);else marks.push({p:page,label:currentTitle()});
  marks.sort((a,b)=>a.p-b.p);ls.set('marks',marks);go(page,true);drawMarks();
};
document.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;if(e.key==='ArrowRight')go(page+1);if(e.key==='ArrowLeft')go(page-1)});
window.addEventListener('resize',()=>render());
// スワイプでページ送り（等倍のときのみ）
let sx=null,sy=null;
$('stage').addEventListener('touchstart',e=>{if(e.touches.length===1&&zoom<=1.01){sx=e.touches[0].clientX;sy=e.touches[0].clientY}else sx=null},{passive:true});
$('stage').addEventListener('touchend',e=>{if(sx==null)return;const t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;sx=null;
  if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*2)go(page+(dx<0?1:-1))},{passive:true});

// ---- 目次・しおり・設定
const pdfPage=p=>p+offset;
function currentTitle(){let t='';for(const e of TOC){if(e.p!=null&&pdfPage(e.p)<=page)t=e.t}return (t||'')+' (PDF '+page+')'}
function drawToc(){
  const q=$('tocFilter').value.trim(),ul=$('tocList');ul.innerHTML='';
  for(const e of TOC){
    if(e.g){if(!q){const li=document.createElement('li');li.className='grp';li.textContent=e.g;ul.append(li)}continue}
    if(q&&!e.t.includes(q))continue;
    const li=document.createElement('li'),b=document.createElement('button');
    b.innerHTML='<span></span><small>p.'+e.p+'</small>';b.firstChild.textContent=e.t;
    b.onclick=()=>{closeDrawer();go(pdfPage(e.p))};li.append(b);ul.append(li);
  }
}
function drawMarks(){
  const ul=$('markList');ul.innerHTML='';
  if(!marks.length){ul.innerHTML='<li class="hint">しおりはまだありません</li>';return}
  for(const m of marks){const li=document.createElement('li'),b=document.createElement('button');
    b.innerHTML='<span></span><small>PDF '+m.p+'</small>';b.firstChild.textContent='★ '+m.label.replace(/ \(PDF \d+\)$/,'');
    b.onclick=()=>{closeDrawer();go(m.p)};li.append(b);ul.append(li)}
}
const closeDrawer=()=>$('drawer').hidden=true;
$('btnToc').onclick=()=>showTab('toc');
$('btnSearch').onclick=()=>{showTab('search');setTimeout(()=>$('q').focus(),50)};
$('btnClose').onclick=closeDrawer;
document.querySelectorAll('.tabs [data-tab]').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.tabs [data-tab]').forEach(x=>x.classList.toggle('on',x===b));
  for(const t of['toc','search','star','marks','set'])$('tab-'+t).hidden=t!==b.dataset.tab});
const showTab=n=>{$('drawer').hidden=false;document.querySelector('.tabs [data-tab="'+n+'"]').click();drawMarks()};
$('tocFilter').oninput=drawToc;
$('offset').value=offset;$('offset').onchange=()=>{offset=+$('offset').value||0;ls.set('offset',offset)};
$('theme').value=ls.get('theme','auto');
const applyTheme=()=>{const t=ls.get('theme','auto');if(t==='auto')document.documentElement.removeAttribute('data-theme');else document.documentElement.dataset.theme=t};
$('theme').onchange=()=>{ls.set('theme',$('theme').value);applyTheme()};applyTheme();

// ---- PDF読み込み
const pick=()=>$('file').click();
$('btnImport').onclick=pick;$('btnReimport').onclick=pick;
$('file').onchange=async e=>{
  const f=e.target.files[0];if(!f)return;
  const buf=await f.arrayBuffer();
  try{await idb('readwrite',s=>s.put(buf,'pdf'))}catch(err){alert('端末への保存に失敗しました（容量不足の可能性）。今回は一時的に表示します。')}
  page=1;pages=[];try{await idb('readwrite',s=>s.delete('index'))}catch{}closeDrawer();await openBuffer(buf);e.target.value='';
};

// ---- 起動
drawToc();drawMarks();
(async()=>{
  let buf=null;try{buf=await idb('readonly',s=>s.get('pdf'))}catch{}
  if(buf)await openBuffer(buf);else{canvas.hidden=true;$('empty').hidden=false}
  if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
  if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});
})();

// ---- 検索
function sections(){ // 検索範囲：全体／章／各項目（PDFページ範囲）
  const N=pdf?pdf.numPages:1,items=TOC.map((e,i)=>({...e,i})),list=[{label:'全体',r:[1,N]}];
  const gs=items.filter(e=>e.g);
  gs.forEach((g,gi)=>{const st=items.slice(g.i+1).find(e=>e.p!=null),nx=gs[gi+1]&&items.slice(gs[gi+1].i+1).find(e=>e.p!=null);
    list.push({label:'【'+g.g+'】全体',r:[pdfPage(st.p),nx?pdfPage(nx.p)-1:N]})});
  const ts=items.filter(e=>e.p!=null);
  ts.forEach((e,k)=>list.push({label:e.t,r:[pdfPage(e.p),ts[k+1]?Math.max(pdfPage(e.p),pdfPage(ts[k+1].p)-1):N]}));
  return list;
}
function sectionOf(p){let t='';for(const e of TOC)if(e.p!=null&&pdfPage(e.p)<=p)t=e.t;return t}
function drawScope(){const sel=$('scope'),cur=sel.value;sel.innerHTML='';sections().forEach((s,i)=>{const o=document.createElement('option');o.value=i;o.textContent=s.label;sel.append(o)});if(cur)sel.value=cur}
function idxStatus(){const n=pdf?pdf.numPages:0,d=pages.filter(x=>x).length;
  $('idxStatus').textContent=d?`索引済み ${d} / ${n} ページ`:'索引がありません（先に作成または読み込みが必要です）';
  $('searchMsg').textContent=d?'':'検索には索引が必要です。下の「検索用の索引」から作成してください。';
  if(!d)$('idxBox').open=true}
function runSearch(){
  const q=$('q').value.trim(),ul=$('results');ul.innerHTML='';if(!q)return;
  const sc=sections()[+$('scope').value||0],res=search(pages,q,sc.r);lastResults=res;
  $('searchMsg').textContent=pages.some(x=>x)?`${res.length} ページが該当（${sc.label}）`:$('searchMsg').textContent;
  for(const r of res.slice(0,200)){const li=document.createElement('li'),b=document.createElement('button');
    b.innerHTML='<div><div class="sec"></div><div class="snip"></div></div><small>PDF '+r.p+'</small>';
    b.querySelector('.sec').textContent=sectionOf(r.p);b.querySelector('.snip').textContent=r.snip;
    b.onclick=()=>{closeDrawer();go(r.p)};li.append(b);ul.append(li)}
}
$('searchForm').onsubmit=e=>{e.preventDefault();runSearch();$('q').blur()};
$('scope').onchange=runSearch;
const saveIdx=()=>idb('readwrite',s=>s.put(pages,'index'));
$('idxBuild').onclick=async()=>{
  if(!pdf)return;stopFlag=false;
  $('idxBuild').hidden=true;$('idxStop').hidden=false;$('idxBar').hidden=false;
  try{await buildIndex(pdf,pages,{stop:()=>stopFlag,save:saveIdx,onProgress:(p,n,src)=>{
    $('idxBar').max=n;$('idxBar').value=p;$('idxStatus').textContent=`索引作成中 ${p} / ${n}（${src==='ocr'?'OCR':src==='text'?'埋め込み文字':'済'}）`}})}
  catch(err){$('idxStatus').textContent='エラー: '+err.message}
  $('idxBuild').hidden=false;$('idxStop').hidden=true;$('idxBar').hidden=true;idxStatus();
};
$('idxStop').onclick=()=>{stopFlag=true};
$('idxExport').onclick=()=>{
  const b=new Blob([JSON.stringify({v:1,n:pdf?pdf.numPages:0,pages})],{type:'application/json'}),a=document.createElement('a');
  a.href=URL.createObjectURL(b);a.download='kantei-index.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000)};
$('idxImport').onclick=()=>$('idxFile').click();
$('idxFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;
  try{const j=JSON.parse(await f.text());if(!Array.isArray(j.pages))throw 0;
    if(pdf&&j.pages.length!==pdf.numPages&&!confirm('ページ数がPDFと一致しません。それでも読み込みますか？'))return;
    pages=j.pages;await saveIdx();idxStatus();runSearch()}catch{alert('索引ファイルを読み込めませんでした')}
  e.target.value=''};

// ---- 本命星
function drawStar(){
  const v=$('birth').value,out=$('starOut');out.innerHTML='';if(!v)return;
  const [y,m,d]=v.split('-').map(Number),r=calc(y,m,d);
  const card=(title,star,extra)=>{const c=document.createElement('div');c.className='starcard';
    c.innerHTML='<div class="hint"></div><b></b><div></div>';c.children[0].textContent=title;
    c.children[1].textContent=STARS[star];
    c.children[2].textContent=extra;
    const b=document.createElement('button');b.textContent=STARS[star]+'の象意を開く（p.'+STAR_PAGE[star]+'）';
    b.onclick=()=>{closeDrawer();go(pdfPage(STAR_PAGE[star]))};c.append(b);out.append(c)};
  card('本命星',r.star,'方位：'+DIR[r.star]+'　／　'+r.ey+'年（'+r.eto+'）');
  card('月命星（参考）',r.monthStar,'方位：'+DIR[r.monthStar]);
  const w=document.createElement('p');w.className='warn';
  w.innerHTML='・年の切り替わりは2月4日（原本p.17の日付）で計算しています。立春の日時は年により前後するため、2月2〜4日生まれは日時まで確認してください。<br>・月の境界日も原本p.17の固定日です。<br>・本命星と月命星が同じ場合、原本p.17に「月命の切り換え」規則があります（読み取り不良のため未実装）。原本で確認してください。';
  out.append(w);
  if(r.star===r.monthStar){const b=document.createElement('button');b.textContent='原本 p.17 を開く';b.className='primary';b.onclick=()=>{closeDrawer();go(pdfPage(17))};out.append(b)}
}
$('birth').oninput=drawStar;drawStar();
