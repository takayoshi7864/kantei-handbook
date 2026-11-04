// 全文検索：索引作成（埋め込みテキスト優先、無ければOCR）・保存・検索
const T0=new URL('vendor/tesseract/',location.href).href;
export const norm=s=>s.normalize('NFKC').toLowerCase().replace(/\s+/g,'')
  .replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));
export const cleanText=s=>s.normalize('NFKC').replace(/([^\x00-\x7f])\s+(?=[^\x00-\x7f])/g,'$1').replace(/[ \t]+/g,' ').trim();

let tess=null;
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('load '+src));document.head.append(s)})}
async function getWorker(log){
  if(tess)return tess;
  if(!window.Tesseract)await loadScript(T0+'tesseract.min.js');
  tess=await window.Tesseract.createWorker('jpn',1,{workerPath:T0+'worker.min.js',corePath:T0,langPath:T0+'lang',workerBlobURL:false,logger:log});
  await tess.setParameters({tessedit_pageseg_mode:'3',preserve_interword_spaces:'0'});
  return tess;
}
export async function buildIndex(pdf,pages,{onProgress,save,stop,ocrWidth=1800}){
  const n=pdf.numPages;pages.length=n;let worker=null;
  const cv=document.createElement('canvas');
  for(let p=1;p<=n;p++){
    if(stop())break;
    if(pages[p-1]!=null&&pages[p-1]!==''){onProgress(p,n,'skip');continue}
    const pg=await pdf.getPage(p);
    let txt='';
    try{const tc=await pg.getTextContent();txt=cleanText(tc.items.map(i=>i.str).join(' '))}catch{}
    let src='text';
    if(txt.length<30){
      worker=worker||await getWorker(()=>{});
      const b=pg.getViewport({scale:1}),vp=pg.getViewport({scale:ocrWidth/b.width});
      cv.width=vp.width;cv.height=vp.height;
      await pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
      const r=await worker.recognize(cv);txt=cleanText(r.data.text);src='ocr';
    }
    pages[p-1]=txt;onProgress(p,n,src);
    if(p%5===0)await save();
  }
  await save();
  if(worker){try{await worker.terminate()}catch{};tess=null}
}
export function search(pages,query,range){
  const terms=query.split(/[\s　]+/).filter(Boolean).map(norm);if(!terms.length)return[];
  const out=[];
  for(let p=range[0];p<=range[1];p++){
    const raw=pages[p-1];if(!raw)continue;
    const nt=norm(raw);if(!terms.every(t=>nt.includes(t)))continue;
    // スニペット：正規化前の文字位置とずれるので、空白除去前提の文字列から切り出す
    const flat=raw.normalize('NFKC').replace(/\s+/g,'');
    const fn=flat.replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60)).toLowerCase();
    const at=fn.indexOf(terms[0]);
    out.push({p,snip:at<0?flat.slice(0,60):(at>24?'…':'')+flat.slice(Math.max(0,at-24),at+48),hits:terms.reduce((a,t)=>a+nt.split(t).length-1,0)});
  }
  return out;
}
