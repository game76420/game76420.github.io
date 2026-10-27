// ===== 抽屜盒（Sleeve + Tray）=====
// 100% 依原版 Pacdora SVG 拓撲結構重構

function drawerOffs(dir, T) {
  const r1 = x => Math.round((x + 1e-9) * 10) / 10;
  const Ts = [0.2, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0];
  const I = [[40.6, 40.6, 0.4], [41.6, 41.6, 1.0], [43.0, 43.0, 2.0], [45.0, 45.0, 3.0], [46.0, 46.0, 4.0], [48.0, 48.0, 5.0], [50.0, 50.0, 6.0]];
  const O = [[0.4, 1.0, 0.6], [0.9, 2.4, 1.4], [2.0, 5.0, 3.0], [2.5, 7.0, 4.0], [4.0, 10.0, 6.0], [4.5, 12.0, 7.0], [5.0, 14.0, 8.0]];
  const K = dir === 'in' ? I : O;
  T = Math.min(3, Math.max(0.2, T));
  let b = 1; while (b < Ts.length - 1 && T > Ts[b]) b++;
  const a = b - 1, t = (T - Ts[a]) / (Ts[b] - Ts[a]);
  return K[a].map((v, j) => r1(v + (K[b][j] - v) * t));
}

function buildDrawer(L, W, H, T) {
  // 1. 尺寸模式切換時換算尺寸
  if (typeof document !== 'undefined') {
    const kBtn = document.querySelector('#ty button.on');
    const kind = kBtn ? kBtn.getAttribute('data-k') : 'mfg';
    const uBtn = document.querySelector('#unit span.on');
    const isIn = uBtn && uBtn.getAttribute('data-u') === 'in';
    const sc = isIn ? 25.4 : 1;
    const rawL = parseFloat(document.getElementById('L')?.value) * sc;
    const rawW = parseFloat(document.getElementById('W')?.value) * sc;
    const rawH = parseFloat(document.getElementById('H')?.value) * sc;
    if (Number.isFinite(rawL) && Number.isFinite(rawW) && Number.isFinite(rawH)) {
      const dIn = drawerOffs('in', T), dOut = drawerOffs('out', T);
      if (kind === 'in') { L = rawL + dIn[0]; W = rawW + dIn[1]; H = rawH + dIn[2]; }
      else if (kind === 'out') { L = rawL - dOut[0]; W = rawW - dOut[1]; H = rawH - dOut[2]; }
    }
  }

  // 同步左上角標籤
  if (typeof document !== 'undefined') {
    const updateLabels = () => {
      const dIn = drawerOffs('in', T), dOut = drawerOffs('out', T);
      const uBtn = document.querySelector('#unit span.on');
      const isIn = uBtn && uBtn.getAttribute('data-u') === 'in';
      const u = isIn ? 'in' : 'mm';
      const sc = isIn ? (1 / 25.4) : 1;
      const fmt = v => Number(Math.round((v * sc + 1e-9) * 100) / 100);
      const s1 = document.getElementById('s1'), s2 = document.getElementById('s2'), s3 = document.getElementById('s3');
      if (s1) s1.textContent = `${fmt(L)} × ${fmt(W)} × ${fmt(H)} ${u}`;
      if (s2) s2.textContent = `${fmt(L - dIn[0])} × ${fmt(W - dIn[1])} × ${fmt(H - dIn[2])} ${u}`;
      if (s3) s3.textContent = `${fmt(L + dOut[0])} × ${fmt(W + dOut[1])} × ${fmt(H + dOut[2])} ${u}`;
    };
    Promise.resolve().then(updateLabels);
    setTimeout(updateLabels, 0);
  }

  const P = [], Hn = [];
  const one = (n, l, id, par, hg, w, o) => P.push({ n, ...shape(l), id, par, hg, w, ...o });
  const rnd = pts => pts;

  /* ========================================================
     【關鍵尺寸】——全部由原版 Pacdora SVG（51³ / 300×300×280 / 341.6×241.6×61）
     逐點反推；以 d 表示「離底面邊緣的外推距離」
     ======================================================== */
  const t = T;                                   // 紙厚
  const dOut = drawerOffs('out', T);
  const Lo = L + dOut[0];                        // 外套筒寬 = 外尺寸 L
  const strip = 20;                              // 牆頂窄折條
  const gapF = 2;                                // 折翼近緣與窄折條之間的間隙
  const inset = 19.2;                            // 內折板距牆端（再加 t）
  const sideInset = 20;                          // 左右內折板距底面端
  const rS = 9.75, rF = 10, rW = 2, rK = 1;      // 窄折條(上下) / 窄折條(左右) / 翅角 / 插槽端
  const chamf = 2;                               // 內折板與翅交接處的 45° 小倒角
  const dS1 = H + strip;                         // 窄折條外緣
  const dTF = 2 * H + strip - t;                 // 內折板 / 小折邊 折線
  const dNear = dS1 + gapF;                      // 翅近緣
  const dFar = dTF - 2;                          // 翅遠緣
  const wing = Math.ceil(W / 2);                 // 翅長（自內折板邊起）
  const slotW = 2;                               // 插槽寬
  const slotIn = Math.max(W / 2 - 20, 2.5);      // 插槽內緣距內折板
  const slotD = (H + 1) / 2;                     // 插槽深（含圓頭）
  // 小折邊高度：由內折板寬度與盒高決定，上限 12~15
  const tabWN = L - 2 * (t + inset), tabWS = W - 2 * sideInset;
  const lipCap = 12 + 3 * Math.min(1, Math.max(0, (H - 150) / 130));
  const lip = Math.max(2, Math.round(Math.min(lipCap, Math.min(tabWN, tabWS) / 4)));
  const rL = Math.max(1, Math.round(lip * 0.75));
  const dLip = dTF + lip;                        // 整體外緣
  const k15 = Math.PI / 12;
  const gs = H * Math.cos(k15) / (Math.cos(k15) + Math.sin(k15)); // 角隅 45° 折線 / 15° 斜切交點

  /* ========================================================
     【1. 左側：外套筒 (Sleeve)】 寬 = 外尺寸 L
     ======================================================== */
  const glueH = ip(Math.max(W, H), [51, 100, 150, 241.6, 300], [13, 16, 25, 25, 45]);
  const taper = glueH * Math.tan(k15);           // 15° 斜切
  const sw = Lo;
  const yt = dLip, yb = yt + W;                  // 托盤底面上下緣
  const sy1 = yt - 1.5;                          // 糊邊折線（與托盤底面上緣差 1.5）
  const sy0 = sy1 - glueH;
  const sy2 = sy1 + W + 6 * t;
  const sy3 = sy2 + H + 4 * t;
  const sy4 = sy3 + W + 7 * t;
  const sy5 = sy4 + H + 3 * t;

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
  const xP0 = xl + t + inset, xP1 = xr - t - inset;

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
