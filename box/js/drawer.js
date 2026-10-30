// ===== 抽屜盒（內折抽屜盒 BufferwallboxDrawer：Sleeve + Tray）=====
// 以原站 7 個厚度（T = 0.2 / 0.5 / 1 / 1.5 / 2 / 2.5 / 3）的 JSON 逐頂點反推，
// 刀模基準 L×W×H = 250×150×150（製造尺寸 = JSON 的 knifeSize），所有「隨厚度變化」的量集中在 drawerModel()。
//
// 原站尺寸邏輯（getKnifeSizeAdd / getOutSizeAdd）：
//   製造尺寸(knife) = 內尺寸(size) + 2·id + 2·OF + 2·T   （長、寬）；高 = 內高 + 2·T
//   外尺寸(out)     = 製造尺寸 + [2·ed + T, 2·ed + 4·T, 2·ed + 2·T]
//   id = T − ed；ed 為隨厚度查表的值（見 DR_ED）

const DR_T  = [0.2, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0];   // 原站取樣厚度
const DR_ED = [0.1, 0.2, 0.5, 0.5, 1.0, 1.0, 1.0];   // size.ed（原站實測）
const DR_SD = [-0.5, 0, 0, 0.5, 0.5, 1.0, 1.0];      // 長翅插槽深度相對 (H+1)/2 的修正（實測）
const DR_OF = 20;                                    // 牆頂窄折條寬 OF（原站預設）

// 厚度相關的全部參數（單一資料來源）
function drawerModel(T) {
  const ed = ip(T, DR_T, DR_ED);          // 取樣點之間線性內插，超出 0.2~3 夾限
  const id = T - ed;
  const thick = T >= 1 - 1e-9;            // 原站在 0.5 與 1 之間切換「薄紙 / 厚紙」參數組（切點為推測，見說明）
  const g = thick ? 3 : 2;                // 長翅與內折板的間隙 = 45° 倒角大小
  const nx = thick ? T : 2;               // 插槽寬 NX（原站 openParams.NX）
  const tm = Math.max(T, 1);
  return {
    ed, id, thick, g, nx,
    rS: 10 - T / 2,                       // 窄折條(上下)頂緣圓角
    slotAdj: ip(T, DR_T, DR_SD),
    // 封套四片 + 糊邊的高度補償（加在 W / H 上）：頂面、側板1、底面、側板2
    sl: [3 * tm, 2 * tm, thick ? 4 * T : 3 + T, thick ? 2 * T - 1 : 1.5]
  };
}

// 內 / 外尺寸補償 [長, 寬, 高]（dir: 'in' = 製造−內；'out' = 外−製造）
function drawerOffs(dir, T) {
  const r1 = x => Math.round((x + 1e-9) * 10) / 10;
  T = Math.min(3, Math.max(0.2, T));
  const { ed, id } = drawerModel(T);
  const v = dir === 'in'
    ? [2 * id + 2 * DR_OF + 2 * T, 2 * id + 2 * DR_OF + 2 * T, 2 * T]
    : [2 * ed + T, 2 * ed + 4 * T, 2 * ed + 2 * T];
  return v.map(r1);
}

// L, W, H 一律為「製造尺寸」（內 / 外尺寸的換算由 core.js 的 offs() 負責，這裡不碰 DOM）
function buildDrawer(L, W, H, T) {
  const P = [], Hn = [];
  const one = (n, l, id, par, hg, w, o) => P.push({ n, ...shape(l), id, par, hg, w, ...o });

  const t = T;                                   // 紙厚
  const M = drawerModel(T);
  const dOut = drawerOffs('out', T);
  const Lo = L + dOut[0];                        // 外套筒寬 = 外尺寸 L
  const strip = DR_OF;                           // 牆頂窄折條 OF
  const gapF = M.g;                              // 翅近緣與窄折條的間隙
  const chamf = M.g;                             // 翅與內折板交接處 45° 倒角
  const sideInset = 20;                          // 左右內折板距底面端
  const rS = M.rS, rF = 10, rW = M.nx, rK = M.nx / 2; // 窄折條(上下) / 窄折條(左右) / 翅外角(=NX) / 插槽端(=NX/2)
  const dS1 = H + strip;                         // 窄折條外緣
  const dTF = 2 * H + strip - t;                 // 內折板 / 小折邊 折線
  const dNear = dS1 + gapF;                      // 翅近緣
  const dFar = dTF - M.g;                        // 翅遠緣
  const wing = Math.ceil(W / 2);                 // 翅長 L5（自內折板邊起）
  const slotW = M.nx;                            // 插槽寬 NX
  const slotIn = Math.max(W / 2 - 20, 2.5);      // 插槽內緣距內折板
  const slotD = (H + 1) / 2 + M.slotAdj;         // 插槽深（含圓頭）
  // 內折板左右端：距托盤底面端 = OF − id（原站：內折板寬 = L − 2·OF + 2·id）
  const panInset = strip - M.id;
  const tabWN = L - 2 * panInset, tabWS = W - 2 * sideInset;
  // 小折邊高度 G：由內折板寬度與盒高決定，上限 12~15
  const lipCap = 12 + 3 * Math.min(1, Math.max(0, (H - 150) / 130));
  const lip = Math.max(2, Math.round(Math.min(lipCap, Math.min(tabWN, tabWS) / 4)));
  const rL = Math.max(1, Math.round(lip * 0.75));
  const dLip = dTF + lip;                        // 整體外緣
  const k15 = Math.PI / 12;
  const gs = H * Math.cos(k15) / (Math.cos(k15) + Math.sin(k15)); // 角隅 45° 折線 / 15° 斜切交點

  /* ========================================================
     【1. 左側：外套筒 (Sleeve)】 寬 = 外尺寸 L
     四片高度 = [W, H, W, H] + 厚度補償（原站實測，見 drawerModel().sl）
     頂面對齊「托盤底面」的垂直中心
     ======================================================== */
  const glueH = ip(Math.max(W, H), [51, 100, 150, 241.6, 300], [13, 16, 25, 25, 45]);
  const taper = glueH * Math.tan(k15);           // 15° 斜切
  const sw = Lo;
  const yt = dLip, yb = yt + W;                  // 托盤底面上下緣
  const sh0 = W + M.sl[0], sh1 = H + M.sl[1], sh2 = W + M.sl[2], sh3 = H + M.sl[3];
  const sy1 = yt + W / 2 - sh0 / 2;              // 糊邊折線 = 封套頂面上緣
  const sy0 = sy1 - glueH;
  const sy2 = sy1 + sh0;
  const sy3 = sy2 + sh1;
  const sy4 = sy3 + sh2;
  const sy5 = sy4 + sh3;

  one('封套糊邊', [[taper, sy0], [sw - taper, sy0], [sw, sy1], [0, sy1]],
    'sl_gl', 'sl_p0', [[0, sy1], [sw, sy1]], [0.35, 0.45]);
  one('封套頂面', [[0, sy1], [sw, sy1], [sw, sy2], [0, sy2]], 'sl_p0', null, null, [0, 0]);
  one('封套側板1', [[0, sy2], [sw, sy2], [sw, sy3], [0, sy3]], 'sl_p1', 'sl_p0', [[0, sy2], [sw, sy2]], [0.05, 0.25]);
  one('封套底面', [[0, sy3], [sw, sy3], [sw, sy4], [0, sy4]], 'sl_p2', 'sl_p1', [[0, sy3], [sw, sy3]], [0.15, 0.35]);
  one('封套側板2', [[0, sy4], [sw, sy4], [sw, sy5], [0, sy5]], 'sl_p3', 'sl_p2', [[0, sy4], [sw, sy4]], [0.25, 0.45]);

  /* ========================================================
     【2. 右側：內托盤 (Tray)】
     ======================================================== */
  const tL = L, tW = W, tH = H;
  const ox = sw + 10 + dLip;                     // 托盤底面左緣
  const oy = yt;
  const xl = ox, xr = ox + tL;

  one('托盤底面', [[xl, yt], [xr, yt], [xr, yb], [xl, yb]], 'tr_bot', null, null, [0, 0],
    { o3: [-ox + (sw - tL) / 2, 0, 0, 0] });

  /* ---- (A) 上 / 下：牆 → 窄折條 → 內折板(中央窄片) → 小折邊；兩側為長翅 ---- */
  const xP0 = xl + panInset, xP1 = xr - panInset;

  const horiz = (key, nm, sgn, slotNear) => {
    const Y = d => (sgn < 0 ? yt - d : yb + d);
    const pt = (x, d, r) => (r ? [x, Y(d), r] : [x, Y(d)]);
    const hl = (x0, d0, x1, d1) => [[x0, Y(d0)], [x1, Y(d1)]];
    const wId = 'tr_w' + key, sId = 'tr_s' + key, pId = 'tr_p' + key, lId = 'tr_l' + key;

    // 側牆（左右各內縮 T，與角隅接合）
    one('托盤側壁_' + nm, [pt(xl + t, 0), pt(xr - t, 0), pt(xr - t, H), pt(xl + t, H)],
      wId, 'tr_bot', hl(xl + t, 0, xr - t, 0), [0.10, 0.30]);
    // 窄折條（頂緣圓角 r9.75）
    one('托盤窄折條_' + nm, [pt(xl + t, H), pt(xl + t, dS1, rS), pt(xr - t, dS1, rS), pt(xr - t, H)],
      sId, wId, hl(xl + t, H, xr - t, H), [0.32, 0.45]);
    // 內折板（中央窄片，貫穿窄折條到小折邊）
    one('托盤內折板_' + nm, [pt(xP0, dS1), pt(xP0, dTF), pt(xP1, dTF), pt(xP1, dS1)],
      pId, sId, hl(xP0, dS1, xP1, dS1), [0.47, 0.60]);
    // 小折邊（外緣圓角）
    one('托盤小折邊_' + nm, [pt(xP0, dTF), pt(xP0, dLip, rL), pt(xP1, dLip, rL), pt(xP1, dTF)],
      lId, pId, hl(xP0, dTF, xP1, dTF), [0.62, 0.75]);

    // 長翅（含插槽、45° 小倒角）；dirOut: -1 向左、+1 向右
    const wingShape = (xIn, dirOut) => {
      const s = dirOut, xEnd = xIn + s * wing;
      const xsi = xIn + s * slotIn, xso = xsi + s * slotW;   // 插槽內緣 / 外緣
      const arr = [pt(xIn, dNear)];
      if (slotNear) {                               // 插槽開在近緣
        arr.push(pt(xsi, dNear), pt(xsi, dNear + slotD, rK), pt(xso, dNear + slotD, rK), pt(xso, dNear));
        arr.push(pt(xEnd, dNear), pt(xEnd, dFar, rW), pt(xIn + s * chamf, dFar), pt(xIn, dTF));
      } else {                                      // 插槽開在遠緣
        arr.push(pt(xEnd, dNear), pt(xEnd, dFar, rW));
        arr.push(pt(xso, dFar, rW), pt(xso, dFar - slotD, rK), pt(xsi, dFar - slotD, rK), pt(xsi, dFar, rW));
        arr.push(pt(xIn + s * chamf, dFar), pt(xIn, dTF));
      }
      return arr;
    };
    one('托盤長翅_' + nm + '左', wingShape(xP0, -1), 'tr_wg' + key + 'L', pId, hl(xP0, dNear, xP0, dTF), [0.62, 0.75], { dir: -1 });
    one('托盤長翅_' + nm + '右', wingShape(xP1, +1), 'tr_wg' + key + 'R', pId, hl(xP1, dNear, xP1, dTF), [0.62, 0.75], { dir: -1 }); // dir:-1 → 長翅向盒內折
  };
  horiz('N', '上', -1, false);   // 上側插槽開在遠端邊
  horiz('S', '下', +1, true);    // 下側插槽開在近端邊

  /* ---- (B) 左 / 右：牆 → 窄折條 → 內折板 → 小折邊 ---- */
  const vert = (key, nm, sgn) => {
    const X = e => (sgn < 0 ? xl - e : xr + e);
    const E = sgn < 0 ? xl : xr;
    const y0 = yt + sideInset, y1 = yb - sideInset;
    const wId = 'tr_w' + key, sId = 'tr_s' + key, pId = 'tr_p' + key, lId = 'tr_l' + key;
    const vl = (e, ya, yb_) => [[X(e), ya], [X(e), yb_]];

    one('托盤側壁_' + nm, [[E, yt], [X(H), yt], [X(H), yb], [E, yb]],
      wId, 'tr_bot', vl(0, yt, yb), [0.15, 0.30]);
    one('托盤窄折條_' + nm, [[X(H), yt], [X(dS1), yt, rF], [X(dS1), yb, rF], [X(H), yb]],
      sId, wId, vl(H, yt, yb), [0.32, 0.45]);
    one('托盤內折板_' + nm, [[X(dS1), y0], [X(dTF), y0], [X(dTF), y1], [X(dS1), y1]],
      pId, sId, vl(dS1, y0, y1), [0.47, 0.60]);
    one('托盤小折邊_' + nm, [[X(dTF), y0], [X(dLip), y0, rL], [X(dLip), y1, rL], [X(dTF), y1]],
      lId, pId, vl(dTF, y0, y1), [0.62, 0.75]);
  };
  vert('W', '左', -1);
  vert('E', '右', +1);

  /* ---- (C) 四角角隅：45° 折線 + 15° 斜切 ---- */
  const corner = (id, nm, cx, sx, cy, sy, par) => {
    const C = [cx, cy], A = [cx, cy + sy * H], B = [cx + sx * H, cy], Pp = [cx + sx * gs, cy + sy * gs];
    one('角隅_' + nm, [C, A, Pp, B], id, par, [C, A], [0.18, 0.40]);
    Hn.push([C, Pp]);
  };
  corner('tr_gNW', 'NW', xl + t, -1, yt, -1, 'tr_wN');
  corner('tr_gNE', 'NE', xr - t, +1, yt, -1, 'tr_wN');
  corner('tr_gSW', 'SW', xl + t, -1, yb, +1, 'tr_wS');
  corner('tr_gSE', 'SE', xr - t, +1, yb, +1, 'tr_wS');

  /* ========================================================
     【3. 線型後處理】
     renderer 以「整條邊 key 完全相同」判斷摺線，所以：
     (1) 把每條直線邊在其他零件的頂點處切開，
     (2) 兩個零件共用的邊 = 摺線（紅），只屬於單一零件的邊 = 割線（藍）。
     ======================================================== */
  {
    const EPS = 1e-6, vs = [];
    P.forEach(p => p.e.forEach(q => { vs.push(q.a); vs.push(q.b); }));
    P.forEach(p => {
      const ne = [];
      p.e.forEach(q => {
        if (q.c1) { ne.push(q); return; }
        const dx = q.b[0] - q.a[0], dy = q.b[1] - q.a[1], len2 = dx * dx + dy * dy;
        if (len2 < 1e-12) { ne.push(q); return; }
        const L2 = Math.sqrt(len2), cuts = [];
        for (const v of vs) {
          const s = ((v[0] - q.a[0]) * dx + (v[1] - q.a[1]) * dy) / len2;
          if (s <= 1e-9 || s >= 1 - 1e-9) continue;
          if (Math.abs((v[0] - q.a[0]) * dy - (v[1] - q.a[1]) * dx) / L2 > EPS) continue;
          cuts.push([s, v]);
        }
        cuts.sort((m, n) => m[0] - n[0]);
        let cur = q.a;
        for (const [, v] of cuts) {
          if (Math.hypot(v[0] - cur[0], v[1] - cur[1]) < 1e-9) continue;
          ne.push({ a: cur, b: v }); cur = v;
        }
        ne.push({ a: cur, b: q.b });
      });
      p.e = ne;
    });
    const cnt = new Map();
    P.forEach((p, i) => p.e.forEach(q => {
      if (q.c1) return;
      const k = key(q.a, q.b);
      if (!cnt.has(k)) cnt.set(k, { s: new Set(), q });
      cnt.get(k).s.add(i);
    }));
    const have = new Set(Hn.map(h => key(h[0], h[1])));
    cnt.forEach((v, k) => { if (v.s.size > 1 && !have.has(k)) { Hn.push([v.q.a, v.q.b]); have.add(k); } });
  }

  return {
    P,
    Hn,
    SL: [],
    SWd: 0,
    yT: 0,
    D: { ox: ox, oy: oy, a: tL, b: tW, h: tH }
  };
}
