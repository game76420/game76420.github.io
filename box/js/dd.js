// 原版天地盒專用：內尺寸 / 外尺寸差值公式（涵蓋 T=0.2 ~ 5.0 全部精準規律）
function ddOffs(dir, T){
 const r1 = x => Math.round((x + 1e-9) * 10) / 10;
 const r05 = x => Math.round((x + 1e-9) * 20) / 20;
 const k = Math.round(T * 10);

 // 針對 T = 0.2 ~ 1.0 原版實測精準對應（消除浮點數與分段誤差）
 const inMap = {
  2: [4.2, 4.2, 0.2],
  3: [4.3, 4.3, 0.3],
  4: [4.3, 4.3, 0.5],
  5: [4.4, 4.4, 0.6],
  6: [4.5, 4.5, 0.7],
  7: [4.5, 4.5, 0.9],
  8: [4.6, 4.6, 1.0],
  9: [6.7, 6.7, 1.1],
  10:[7.2, 7.2, 1.0]
 };
 const outMap = {
  2: [4.7,  4.7,  0.6],
  3: [5.05, 5.05, 0.9],
  4: [5.35, 5.35, 1.1],
  5: [5.7,  5.7,  1.4],
  6: [6.05, 6.05, 1.7],
  7: [6.35, 6.35, 1.9],
  8: [6.7,  6.7,  2.2],
  9: [9.05, 9.05, 2.5],
  10:[9.7,  9.7,  3.2]
 };

 if(dir === 'in'){
  if(inMap[k]) return inMap[k];
  if(T <= 0.8) return [r1(4.067 + (2/3)*T), r1(4.067 + (2/3)*T), r1(1.3*T - 0.04)];
  if(T <= 1.0) return [r1(5*T + 2.2), r1(5*T + 2.2), r1(2.0 - T)];
  if(T < 2.0)  return [r1(8*T - 1), r1(8*T - 1), r1(2*T - 1)];
  return [r1(7*T - 1), r1(7*T - 1), r1(T + 1)];
 }
 if(outMap[k]) return outMap[k];
 if(T <= 0.8) return [r05(4.033 + (10/3)*T), r05(4.033 + (10/3)*T), r1(2.65*T + 0.07)];
 if(T <= 1.0) return [r05(6.5*T + 3.2), r05(6.5*T + 3.2), r1(7*T - 3.8)];
 if(T < 2.0)  return [r05(11*T - 1.5), r05(11*T - 1.5), r1(2*T + 1)];
 return [r05(9.5*T - 0.5), r05(9.5*T - 0.5), r1(3*T - 1)];
}

function buildD(L,W,H,T){
 const P=[],Hn=[],one=(n,l,id,par,hg,w,o3,ang)=>P.push({n,...shape(l),id,par,hg,w,o3,ang});
 const hasStrip = T > 0.8;
 const c = T > 1 ? Math.min(1, T - 1) : 0;

 // 若使用者在介面上選擇「內尺寸 (in)」或「外尺寸 (out)」，反推正確的製造尺寸 L, W, H
 // 防呆：當高度 H > min(L, W) 時，預覽以 min(L, W) 繪製（欄位修正與警告由 core.js 處理，等使用者輸入完才改）
 if(typeof document !== 'undefined'){
  const kBtn = document.querySelector('#ty button.on');
  const kind = kBtn ? kBtn.getAttribute('data-k') : 'mfg';
  const uBtn = document.querySelector('#unit span.on');
  const isIn = uBtn && uBtn.getAttribute('data-u') === 'in';
  const scale = isIn ? 25.4 : 1;
  const elL = document.getElementById('L');
  const elW = document.getElementById('W');
  const elH = document.getElementById('H');
  const rawL = parseFloat(elL?.value) * scale;
  const rawW = parseFloat(elW?.value) * scale;
  let rawH = parseFloat(elH?.value) * scale;

  if(Number.isFinite(rawL) && Number.isFinite(rawW) && Number.isFinite(rawH)){
   const limitH = Math.min(rawL, rawW);
   // 輸入過程中只用安全上限繪製預覽，不改動欄位；真正修正由 core.js 在輸入完成（失焦 / Enter）時處理
   if(rawH > limitH + 1e-6) rawH = limitH;

   const dIn = ddOffs('in', T), dOut = ddOffs('out', T);
   if(kind === 'mfg'){
    L = rawL; W = rawW; H = rawH;
   } else if(kind === 'in'){
    L = rawL + dIn[0]; W = rawW + dIn[1]; H = rawH + dIn[2];
   } else if(kind === 'out'){
    L = rawL - dOut[0]; W = rawW - dOut[1]; H = rawH - dOut[2];
   }
  }
 }
 H = Math.min(H, Math.min(L, W));

 // 盒蓋製造尺寸補償（與成品外尺寸分離，使右圖盒蓋比例與原版完全一致）
 const lidO = hasStrip
  ? (T <= 1.0
     ? [1.5*T + 4.0, 1.5*T + 4.0, 3.0*T - 1.5]
     : [5.5*T - 0.5*c, 5.5*T - 0.5*c, 1.5*T - 0.5*c])
  : [2.1 + 2.0*T, 2.1 + 2.0*T, 0.13 + 1.35*T];

 // 同步校準左上角「製造尺寸(#s1) / 內尺寸(#s2) / 外尺寸(#s3)」DOM 顯示數值
 if(typeof document !== 'undefined'){
  const updateLabels = () => {
   const dIn = ddOffs('in', T), dOut = ddOffs('out', T);
   const uBtn = document.querySelector('#unit span.on');
   const isIn = uBtn && uBtn.getAttribute('data-u') === 'in';
   const u = isIn ? 'in' : 'mm';
   const sc = isIn ? (1 / 25.4) : 1;
   const fmt = v => Number(Math.round((v * sc + 1e-9) * 100) / 100);
   const mStr = `${fmt(L)} × ${fmt(W)} × ${fmt(H)} ${u}`;
   const iStr = `${fmt(L - dIn[0])} × ${fmt(W - dIn[1])} × ${fmt(H - dIn[2])} ${u}`;
   const oStr = `${fmt(L + dOut[0])} × ${fmt(W + dOut[1])} × ${fmt(H + dOut[2])} ${u}`;

   const s1 = document.getElementById('s1');
   const s2 = document.getElementById('s2');
   const s3 = document.getElementById('s3');
   if(s1) s1.textContent = mStr;
   if(s2) s2.textContent = iStr;
   if(s3) s3.textContent = oStr;
  };
  Promise.resolve().then(updateLabels);
  setTimeout(updateLabels, 0);
 }

 const dims=(a,b,h)=>{
  const s = hasStrip
   ? Math.max(2.0, Math.min(2.5*T - 0.5*c, 0.26*h, 0.22*Math.min(a,b)))
   : Math.max(1.2, Math.min(1.2 + 0.9*T, 0.15*h, 0.15*Math.min(a,b)));
  const st = hasStrip ? s : 0;
  const fh = Math.max(3, h - Math.min(0.38*h, 1.6 + 3.2*T));

  // 插舌高度同時受 0.20*h 與 0.125*邊長 限制（50×50×50 為 6.25mm，261×161×52 為 10.4mm，大盒上限 18mm）
  const tCap = Math.max(2.5, Math.min(18, 0.20*h, 0.125*Math.min(a,b)));
  const tn = Math.min(tCap, 0.30*a);
  const tw = Math.min(tCap, 0.30*b);

  // 側耳 en 與角耳 ee：上限皆為 h - 1.85*T，分別對稱於 0.50*b 與 0.50*a 減去紙厚安全間隙
  const earClear = 2.0 + 2.2*T;
  const maxEar = Math.max(2.5, h - 1.85*T);
  const en = Math.max(2.5, Math.min(maxEar, 0.50*b - earClear));
  const ee = Math.max(2.5, Math.min(maxEar, 0.50*a - earClear));
  const wf = Math.max(1, b - 2*s);
  return {s,st,fh,tn,tw,en,ee,wf, lx:h+st+fh+tw, ty:h+st+fh+tn};
 };

 const mk=(p,ox,oy,a,b,h,nm,o3)=>{
  const {s,st,fh,tn,tw,en,ee,wf}=dims(a,b,h);
  const X=ox+a, Y=oy+b;
  const xL = ox + st, xR = X - st;
  const af = Math.max(1, xR - xL);
  const cn=Math.min(tn, af*0.32);
  const cw=Math.min(tw, wf*0.32);
  const earGap = Math.max(1.2, Math.min(1.2 + 0.75*T, 0.10*h));
  const earChamferY = Math.min(ee*0.22, earGap);

  // 對齊原版影片（2026-10-24 115932.mp4）的真實折疊順序：
  // 1) 0.00~0.14：左右側板(e/w)最先立起 90°，前後(n/s)平躺在地面呈縱向 T 字長條（00:00 畫面）
  // 2) 0.14~0.42：e/w 的 4 片角耳(wEW.ear)向內折 90°，同時前後側板(n/s)向上立起 90°、且 n/s 內襯兩側的耳(wNS.e)同步向內折 90°（00:01~00:04）
  // 3) 0.44~0.58：前後側(n/s)的折邊條(b) → 內襯(c) → 插舌(d)率先折下鎖定，此時只剩左右側(e/w)高高立在兩旁（00:05~00:06）
  // 4) 0.58~0.74：左右側(e/w)的折邊條(b) → 內襯(c)向盒中心折下（00:07 左右兩片內襯在中央斜折呈尖頂屋頂狀）→ 插舌(d)壓平（00:08）
  // 5) 0.74~0.96：左側天蓋翻轉並飛向右側地盒上方落下蓋合（00:10~00:13）
  const wEW={
   a:[0.00, 0.14],
   ear:[0.14, 0.36],
   b:[0.58, 0.66],
   c:[0.61, 0.72],
   bc:[0.58, 0.72],
   d:[0.66, 0.74]
  };
  const wNS={
   a:[0.16, 0.42],
   e:[0.18, 0.42],
   b:[0.44, 0.52],
   c:[0.47, 0.57],
   bc:[0.44, 0.57],
   d:[0.52, 0.60]
  };

  one(nm+'面板', [[ox,oy],[X,oy],[X,Y],[ox,Y]], p+'c', null, null, [0,0], o3);

  [['n',-1,oy],['s',1,Y]].forEach(([k,d,y0])=>{
   const y1 = y0 + d*h;
   const y2 = y1 + d*st;
   const y3 = y2 + d*fh;
   const y4 = y3 + d*tn;

   if(hasStrip){
    if(d < 0){
     one(nm+'側板', [[ox,y0],[ox,y1],[X,y1],[X,y0]], p+k, p+'c', [[ox,y0],[X,y0]], wNS.a);
     one('折邊條', [[ox,y1],[xL,y2],[xR,y2],[X,y1]], p+k+'1', p+k, [[ox,y1],[X,y1]], wNS.b);
     one('內襯折邊', [[xL,y2],[xL,y3],[xR,y3],[xR,y2]], p+k+'2', p+k+'1', [[xL,y2],[xR,y2]], wNS.c);
    } else {
     one(nm+'側板', [[ox,y0],[X,y0],[X,y1],[ox,y1]], p+k, p+'c', [[ox,y0],[X,y0]], wNS.a);
     one('折邊條', [[ox,y1],[X,y1],[xR,y2],[xL,y2]], p+k+'1', p+k, [[ox,y1],[X,y1]], wNS.b);
     one('內襯折邊', [[xL,y2],[xR,y2],[xR,y3],[xL,y3]], p+k+'2', p+k+'1', [[xL,y2],[xR,y2]], wNS.c);
    }
    Hn.push([[ox,y0],[X,y0]], [[ox,y1],[X,y1]], [[xL,y2],[xR,y2]], [[xL,y3],[xR,y3]]);
   } else {
    // T <= 0.8 無折邊條：內襯折邊直接連在側板上，需旋轉 180° (Math.PI) 才能向下貼合內壁
    if(d < 0){
     one(nm+'側板', [[ox,y0],[ox,y2],[X,y2],[X,y0]], p+k, p+'c', [[ox,y0],[X,y0]], wNS.a);
     one('內襯折邊', [[xL,y2],[xL,y3],[xR,y3],[xR,y2]], p+k+'2', p+k, [[xL,y2],[xR,y2]], wNS.bc, null, Math.PI);
    } else {
     one(nm+'側板', [[ox,y0],[X,y0],[X,y2],[ox,y2]], p+k, p+'c', [[ox,y0],[X,y0]], wNS.a);
     one('內襯折邊', [[xL,y2],[xR,y2],[xR,y3],[xL,y3]], p+k+'2', p+k, [[xL,y2],[xR,y2]], wNS.bc, null, Math.PI);
    }
    Hn.push([[ox,y0],[X,y0]], [[xL,y2],[xR,y2]], [[xL,y3],[xR,y3]]);
   }

   if(d < 0){
    one('插舌', [[xL,y3],[xL+cn,y4],[xR-cn,y4],[xR,y3]], p+k+'3', p+k+'2', [[xL,y3],[xR,y3]], wNS.d);
   } else {
    one('插舌', [[xL,y3],[xR,y3],[xR-cn,y4],[xL+cn,y4]], p+k+'3', p+k+'2', [[xL,y3],[xR,y3]], wNS.d);
   }

   [[xL,-1],[xR,1]].forEach(([x,e],i)=>{
    const x2e = x + e*en;
    if(d * e > 0){
     one('耳', [[x,y2],[x2e,y2],[x2e,y3],[x,y3]], p+k+'e'+i, p+k+'2', [[x,y2],[x,y3]], wNS.e);
    } else {
     one('耳', [[x,y2],[x,y3],[x2e,y3],[x2e,y2]], p+k+'e'+i, p+k+'2', [[x,y2],[x,y3]], wNS.e);
    }
    Hn.push([[x,y2],[x,y3]]);
   });
  });

  [['w',-1,ox],['e',1,X]].forEach(([k,d,x0])=>{
   const x1 = x0 + d*h;
   const x2 = x1 + d*st;
   const x3 = x2 + d*fh;
   const x4 = x3 + d*tw;

   if(hasStrip){
    if(d < 0){
     one(nm+'側板', [[x0,oy],[x0,Y],[x1,Y],[x1,oy]], p+k, p+'c', [[x0,oy],[x0,Y]], wEW.a);
     one('折邊條', [[x1,oy],[x1,Y],[x2,Y-s],[x2,oy+s]], p+k+'1', p+k, [[x1,oy],[x1,Y]], wEW.b);
     one('內襯折邊', [[x2,oy+s],[x2,Y-s],[x3,Y-s],[x3,oy+s]], p+k+'2', p+k+'1', [[x2,oy+s],[x2,Y-s]], wEW.c);
    } else {
     one(nm+'側板', [[x0,oy],[x1,oy],[x1,Y],[x0,Y]], p+k, p+'c', [[x0,oy],[x0,Y]], wEW.a);
     one('折邊條', [[x1,oy],[x2,oy+s],[x2,Y-s],[x1,Y]], p+k+'1', p+k, [[x1,oy],[x1,Y]], wEW.b);
     one('內襯折邊', [[x2,oy+s],[x3,oy+s],[x3,Y-s],[x2,Y-s]], p+k+'2', p+k+'1', [[x2,oy+s],[x2,Y-s]], wEW.c);
    }
    Hn.push([[x0,oy],[x0,Y]], [[x1,oy],[x1,Y]], [[x2,oy+s],[x2,Y-s]], [[x3,oy+s],[x3,Y-s]]);
   } else {
    // T <= 0.8 無折邊條：內襯折邊直接連在側板上，需旋轉 180° (Math.PI) 才能向下貼合內壁
    if(d < 0){
     one(nm+'側板', [[x0,oy],[x0,Y],[x1,Y],[x1,Y-s],[x1,oy+s],[x1,oy]], p+k, p+'c', [[x0,oy],[x0,Y]], wEW.a);
     one('內襯折邊', [[x2,oy+s],[x2,Y-s],[x3,Y-s],[x3,oy+s]], p+k+'2', p+k, [[x2,oy+s],[x2,Y-s]], wEW.bc, null, Math.PI);
    } else {
     one(nm+'側板', [[x0,oy],[x1,oy],[x1,oy+s],[x1,Y-s],[x1,Y],[x0,Y]], p+k, p+'c', [[x0,oy],[x0,Y]], wEW.a);
     one('內襯折邊', [[x2,oy+s],[x3,oy+s],[x3,Y-s],[x2,Y-s]], p+k+'2', p+k, [[x2,oy+s],[x2,Y-s]], wEW.bc, null, Math.PI);
    }
    Hn.push([[x0,oy],[x0,Y]], [[x2,oy+s],[x2,Y-s]], [[x3,oy+s],[x3,Y-s]]);
   }

   if(d < 0){
    one('插舌', [[x3,oy+s],[x3,Y-s],[x4,Y-s-cw],[x4,oy+s+cw]], p+k+'3', p+k+'2', [[x3,oy+s],[x3,Y-s]], wEW.d);
   } else {
    one('插舌', [[x3,oy+s],[x4,oy+s+cw],[x4,Y-s-cw],[x3,Y-s]], p+k+'3', p+k+'2', [[x3,oy+s],[x3,Y-s]], wEW.d);
   }

   const xa = x0 + d*earGap;
   [[oy,-1],[Y,1]].forEach(([y,e],i)=>{
    const yc = y + e*earChamferY;
    const y2e = y + e*ee;
    if(d * e > 0){
     one('角耳', [[x0,y],[x1,y],[x1,y2e],[xa,y2e],[xa,yc]], p+k+'e'+i, p+k, [[x0,y],[x1,y]], wEW.ear);
    } else {
     one('角耳', [[x0,y],[xa,yc],[xa,y2e],[x1,y2e],[x1,y]], p+k+'e'+i, p+k, [[x0,y],[x1,y]], wEW.ear);
    }
    Hn.push([[x0,y],[x1,y]]);
   });
  });
 };

 const a2 = L + lidO[0], b2 = W + lidO[1], h2 = H + lidO[2];
 const d1 = dims(L,W,H), d2 = dims(a2,b2,h2);

 // 原版配置：左側為天蓋（較大，最終翻轉飛向右側），右側為地盒（較小，原地不動）
 const oxLid  = d2.lx, oyLid = d2.ty;
 const oxBase = oxLid + a2 + d2.lx + 15 + d1.lx;
 const oyBase = oyLid + (b2 - W)/2;

 // 左：盒蓋（帶 o3 目標位移，從左側飛向並翻扣於右側底盒正上方）
 mk('l', oxLid, oyLid, a2, b2, h2, '蓋', [
  (oxBase + L/2) - (oxLid + a2/2),
  -(oyBase + W/2),
  h2 + T,
  H
 ]);
 // 右：底盒（固定於右側）
 mk('b', oxBase, oyBase, L, W, H, '底');

 // 插舌與 n/s 的「耳」須向盒內折（否則會穿出牆面）；dir=-1 代表反向旋轉
 P.forEach(p=>{if(p.n==='插舌'||p.n==='耳')p.dir=-1});
 return {P, Hn, SL:[], SWd:0, yT:0, D:{ox:oxBase, oy:oyBase, a:L, b:W, h:H}};
}