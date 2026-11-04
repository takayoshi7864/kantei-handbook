// 本命星・月命星の算出。境界日は原本p.17「月命星の決定」の日付（固定日）を使用。
export const STARS=['','一白水星','二黒土星','三碧木星','四緑木星','五黄土星','六白金星','七赤金星','八白土星','九紫火星'];
export const DIR=['','北','南西','東','東南','中央','北西','西','北東','南'];
export const STAR_PAGE=[0,44,51,56,61,66,71,77,82,88]; // 九星象意の印刷ページ
const STEM='甲乙丙丁戊己庚辛壬癸',BRANCH='子丑寅卯辰巳午未申酉戌亥';
const STARTS=[[106,11],[204,0],[306,1],[405,2],[506,3],[606,4],[707,5],[808,6],[908,7],[1009,8],[1108,9],[1207,10]];
const BASE={1:8,4:8,7:8,2:2,5:2,8:2,3:5,6:5,9:5};
export function calc(y,m,d){
  const md=m*100+d, ey=md<204?y-1:y;
  let s=(11-(ey%9))%9; if(s===0)s=9;
  const i=(ey-4)%60, eto=STEM[i%10]+BRANCH[i%12];
  let idx=10; for(const [st,k] of STARTS) if(md>=st) idx=k;   // md<106 は 12/7〜1/5 のまま(idx=10)
  const ms=((BASE[s]-idx-1+45)%9)+1;
  return {ey,star:s,eto,monthStar:ms,monthIdx:idx,near:(md>=202&&md<=204)||md===203};
}
