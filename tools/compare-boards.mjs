// 気学盤(kigaku.html)と、旧・方位盤(復号した本体)の、年盤・月盤・日盤の中宮と飛ばし方を、全日付で比べる。
// 使い方: node tools/compare-boards.mjs <復号した本体のHTML> [開始年] [終了年]
// 本体の平文は公開リポジトリに置かないこと(引数で外から渡す)。
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const [,,appPath,y0='2000',y1='2050']=process.argv;
const kg=readFileSync(new URL('../kigaku.html',import.meta.url),'utf8').split('\n');
const kgCode=kg.slice(kg.indexOf('<script>',300)+1,kg.findIndex(l=>l.startsWith('function jstToMs'))).join('\n'); // 天文計算 〜 dayStar(jstToMs の手前)
const app=readFileSync(appPath,'utf8').split('\n');
const iS=app.findIndex(l=>l.startsWith('window.SEKKI=')),iA=app.findIndex(l=>l.startsWith('window.AS=(function(){'));
let iE=iA;while(!app[iE].startsWith('})();'))iE++;
const ctx={window:{},Math,Date,Object,Array,String,Number,console};ctx.window=ctx;vm.createContext(ctx);
vm.runInContext(app[iS]+'\n'+app.slice(iA,iE+1).join('\n'),ctx);
vm.runInContext(kgCode+'\nthis.KG={yearBranch,astroAt,yearStar,monthStar,dayStar,jdnOfJstDate,makeBoard,findTerm};',ctx);
const {AS,KG}=ctx;
const JST=9*3600e3;
let n=0;const diff={year:[],month:[],day:[],flyDay:[]};
for(let y=+y0;y<=+y1;y++)for(let m=1;m<=12;m++)for(let d=1;d<=new Date(Date.UTC(y,m,0)).getUTCDate();d++){
  n++;const t=Date.UTC(y,m-1,d,12,0)-JST;
  // 旧・方位盤
  const ym=AS.yearMonth(t),ys=AS.honmei(ym.ey),mc=AS.mod9(AS.BASE[ys]-ym.idx),ds=AS.dayStar(y,m,d);
  // 気学盤
  const a=KG.astroAt(t),kys=KG.yearStar(a.year),kms=KG.monthStar(KG.yearBranch(a.year),a.m),kd=KG.dayStar(KG.jdnOfJstDate(y,m,d),y);
  const key=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  if(ys!==kys)diff.year.push(`${key} 旧${ys} 気${kys}`);
  if(mc!==kms)diff.month.push(`${key} 旧${mc} 気${kms}`);
  if(ds.center!==kd.star||ds.yang!==kd.yang)diff.day.push(`${key} 旧${ds.center}${ds.yang?'陽':'陰'} 気${kd.star}${kd.yang?'陽':'陰'}`);
}
console.log(`比較した日数: ${n}（${y0}〜${y1}年、各日 正午 JST）`);
for(const k of ['year','month','day']){console.log(`${k}: 中宮の不一致 ${diff[k].length} 日`);diff[k].slice(0,15).forEach(s=>console.log('  '+s))}
