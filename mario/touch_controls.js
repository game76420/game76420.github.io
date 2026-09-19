/* touch_controls.js — 手機虛擬搖桿 (GameBoy 配置)
 *
 *   左：圓形虛擬搖桿（8 方向） → ArrowLeft / Right / Up / Down
 *   右：B 鈕 = Ctrl(加速) + Space(火球)      → ControlLeft + Space
 *       A 鈕 = 跳躍                           → AltLeft
 *   中：小型「暫停」(P)、「選單」(Esc) 鈕
 *
 * 原理：觸控時對 window 送出合成的 KeyboardEvent，遊戲本體
 * (index.html 內的 keys / K 讀取機制) 完全不需要修改。
 *
 * 網址參數：?touch=1 強制顯示（桌面測試用）、?touch=0 強制隱藏。
 */
(function () {
  'use strict';

  const param = new URLSearchParams(location.search).get('touch');
  if (param === '0') return;

  /* ------------------------------------------------------------------ *
   * 1. 合成按鍵：多個來源(搖桿/A/B/系統鈕)的按鍵取聯集後再送出事件
   * ------------------------------------------------------------------ */
  const KEY_NAME = {
    ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight', ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown',
    AltLeft: 'Alt', ControlLeft: 'Control', Space: ' ', KeyP: 'p', Escape: 'Escape'
  };
  const MIN_HOLD_MS = 80;            // 短暫輕點也要撐過至少數個 60Hz 邏輯幀，避免被漏掉
  const sources = { joy: new Set(), a: new Set(), b: new Set(), sys: new Set() };
  const active = new Set();
  const pressedAt = new Map();
  let syncTimer = 0;

  function fire(type, code) {
    window.dispatchEvent(new KeyboardEvent(type, {
      code: code, key: KEY_NAME[code] || code, bubbles: true, cancelable: true
    }));
  }

  function sync() {
    clearTimeout(syncTimer);
    const want = new Set();
    for (const s of Object.values(sources)) for (const c of s) want.add(c);
    const now = performance.now();
    for (const c of want) {
      if (!active.has(c)) { active.add(c); pressedAt.set(c, now); fire('keydown', c); }
    }
    let retry = 0;
    for (const c of Array.from(active)) {
      if (want.has(c)) continue;
      const remain = MIN_HOLD_MS - (now - pressedAt.get(c));
      if (remain > 0) { retry = Math.max(retry, remain); continue; }
      active.delete(c); pressedAt.delete(c); fire('keyup', c);
    }
    if (retry > 0) syncTimer = setTimeout(sync, retry + 1);
  }

  function releaseAll() {
    for (const s of Object.values(sources)) s.clear();
    for (const c of Array.from(active)) { active.delete(c); pressedAt.delete(c); fire('keyup', c); }
    clearTimeout(syncTimer);
  }

  /* ------------------------------------------------------------------ *
   * 2. 手機瀏覽器需要「真實觸控」才能解鎖音效
   *    遊戲使用單一 window.__marioAudio.channel，先在第一次觸控時解鎖它
   * ------------------------------------------------------------------ */
  let audioUnlocked = false;
  const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
  function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    try {
      if (!window.__marioAudio) window.__marioAudio = { channel: null, cache: new Map() };
      const a = window.__marioAudio;
      if (!a.channel) a.channel = new Audio();
      a.channel.src = SILENT_WAV;
      const p = a.channel.play();
      if (p && p.catch) p.catch(function () {});
    } catch (_e) { /* ignore */ }
  }

  function buzz() { try { if (navigator.vibrate) navigator.vibrate(8); } catch (_e) { /* ignore */ } }

  /* ------------------------------------------------------------------ *
   * 3. 建立介面
   * ------------------------------------------------------------------ */
  const CSS = `
html.tc-on,html.tc-on body{touch-action:none;overscroll-behavior:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}
html.tc-on #wrap{height:100dvh}
html.tc-on canvas{width:min(100vw,calc(100dvh * 640 / 437));height:min(100dvh,calc(100vw * 437 / 640))}
#tc{display:none;position:fixed;z-index:50;left:0;right:0;bottom:0;top:0;pointer-events:none;
  --u:clamp(52px,15vh,80px);font-family:system-ui,-apple-system,"Noto Sans TC","PingFang TC",sans-serif}
html.tc-on #tc{display:block}
#tc *{box-sizing:border-box;touch-action:none;-webkit-user-select:none;user-select:none}
#tc .tc-row{position:absolute;left:0;right:0;bottom:0;display:flex;align-items:flex-end;justify-content:space-between;
  padding:0 max(18px,env(safe-area-inset-right)) max(18px,env(safe-area-inset-bottom)) max(18px,env(safe-area-inset-left))}

/* 搖桿 */
#tc .tc-joy{position:relative;width:calc(var(--u)*2.5);height:calc(var(--u)*2.5);border-radius:50%;pointer-events:auto;
  background:radial-gradient(circle at 50% 45%,rgba(255,255,255,.10),rgba(20,24,36,.55) 70%);
  border:2px solid rgba(255,255,255,.28);box-shadow:0 4px 14px rgba(0,0,0,.45),inset 0 0 18px rgba(0,0,0,.35)}
#tc .tc-joy::after{content:"";position:absolute;inset:-16px;border-radius:50%}
#tc .tc-joy i{position:absolute;color:rgba(255,255,255,.35);font-style:normal;font-size:calc(var(--u)*.28);line-height:1}
#tc .tc-joy i:nth-of-type(1){left:50%;top:7%;transform:translateX(-50%)}
#tc .tc-joy i:nth-of-type(2){left:50%;bottom:7%;transform:translateX(-50%)}
#tc .tc-joy i:nth-of-type(3){left:7%;top:50%;transform:translateY(-50%)}
#tc .tc-joy i:nth-of-type(4){right:7%;top:50%;transform:translateY(-50%)}
#tc .tc-knob{position:absolute;left:50%;top:50%;width:calc(var(--u)*1.05);height:calc(var(--u)*1.05);margin:calc(var(--u)*-.525) 0 0 calc(var(--u)*-.525);
  border-radius:50%;background:radial-gradient(circle at 35% 30%,#8a93a8,#3a4154 75%);border:2px solid rgba(255,255,255,.35);
  box-shadow:0 3px 8px rgba(0,0,0,.5);will-change:transform;pointer-events:none}

/* A / B 鈕 (GameBoy：B 在左下、A 在右上) */
#tc .tc-btns{position:relative;width:calc(var(--u)*2.6);height:calc(var(--u)*2.1);pointer-events:auto;margin-bottom:calc(var(--u)*.2)}
#tc .tc-btns::after{content:"";position:absolute;inset:-14px}
#tc .tc-btn{position:absolute;width:calc(var(--u)*1.25);height:calc(var(--u)*1.25);border-radius:50%;display:flex;flex-direction:column;
  align-items:center;justify-content:center;color:#fff;font-weight:800;line-height:1;pointer-events:none;
  background:radial-gradient(circle at 35% 30%,#ff6a5c,#c0281f 75%);border:2px solid rgba(255,255,255,.4);
  box-shadow:0 4px 0 #7d1610,0 6px 12px rgba(0,0,0,.5);transition:transform .04s,box-shadow .04s,filter .04s}
#tc .tc-btn b{font-size:calc(var(--u)*.48)}
#tc .tc-btn small{font-size:calc(var(--u)*.2);font-weight:600;margin-top:calc(var(--u)*.05);opacity:.92;white-space:nowrap}
#tc .tc-btn.on{transform:translateY(3px);box-shadow:0 1px 0 #7d1610,0 2px 6px rgba(0,0,0,.5);filter:brightness(1.18)}
#tc .tc-b{left:0;bottom:0}
#tc .tc-a{right:0;top:0}

/* 暫停 / 選單 小藥丸鈕 */
#tc .tc-sys{position:absolute;display:flex;gap:14px;pointer-events:none}
#tc .tc-pill{pointer-events:auto;padding:7px 14px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:.06em;color:rgba(255,255,255,.85);
  background:rgba(20,24,36,.6);border:1.5px solid rgba(255,255,255,.3)}
#tc .tc-pill.on{background:rgba(255,255,255,.35);color:#000}

/* 直向：畫面在上，控制區在下方剩餘空間 */
@media (orientation:portrait){
  html.tc-on #wrap{align-items:flex-start}
  #tc{top:calc(100vw * 437 / 640);--u:clamp(52px,15vw,96px)}
  #tc .tc-row{bottom:auto;top:0;height:calc(100% - 52px);align-items:center;padding-bottom:0}
  #tc .tc-sys{left:0;right:0;bottom:max(14px,env(safe-area-inset-bottom));justify-content:center}
}
/* 橫向：控制鈕以半透明疊在畫面兩側 */
@media (orientation:landscape){
  #tc{--u:clamp(44px,12vh,68px)}
  #tc .tc-row{padding-left:max(10px,env(safe-area-inset-left));padding-right:max(10px,env(safe-area-inset-right));padding-bottom:max(10px,env(safe-area-inset-bottom))}
  #tc .tc-joy,#tc .tc-btns{opacity:.62}
  #tc .tc-sys{top:max(8px,env(safe-area-inset-top));right:max(14px,env(safe-area-inset-right))}
  #tc .tc-pill{opacity:.7}
}
`;

  let built = false;
  function build() {
    if (built) return;
    built = true;

    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    document.documentElement.classList.add('tc-on');

    const root = document.createElement('div');
    root.id = 'tc';
    root.innerHTML =
      '<div class="tc-row">' +
        '<div class="tc-joy"><i>▲</i><i>▼</i><i>◀</i><i>▶</i><div class="tc-knob"></div></div>' +
        '<div class="tc-btns">' +
          '<div class="tc-btn tc-b"><b>B</b><small>加速·火球</small></div>' +
          '<div class="tc-btn tc-a"><b>A</b><small>跳躍</small></div>' +
        '</div>' +
      '</div>' +
      '<div class="tc-sys">' +
        '<div class="tc-pill" data-code="KeyP">暫停</div>' +
        '<div class="tc-pill" data-code="Escape">選單</div>' +
      '</div>';
    document.body.appendChild(root);

    const joy = root.querySelector('.tc-joy');
    const knob = root.querySelector('.tc-knob');
    const btns = root.querySelector('.tc-btns');
    const btnA = root.querySelector('.tc-a');
    const btnB = root.querySelector('.tc-b');

    /* ---- 搖桿 ---- */
    let joyId = null;
    const dir = { l: false, r: false, u: false, d: false };

    function joyMove(e) {
      const rc = joy.getBoundingClientRect();
      const R = rc.width / 2;
      const dx = e.clientX - (rc.left + R);
      const dy = e.clientY - (rc.top + R);
      const dist = Math.hypot(dx, dy);

      // 搖桿頭視覺位置（限制在底盤內）
      const travel = R * 0.62;
      const k = dist > travel ? travel / dist : 1;
      knob.style.transform = 'translate(' + (dx * k).toFixed(1) + 'px,' + (dy * k).toFixed(1) + 'px)';

      // 8 方向判定 + 遲滯，避免在邊界抖動
      const nx = dist ? dx / dist : 0;
      const ny = dist ? dy / dist : 0;
      const dead = dist > R * 0.22;
      const on = (was) => (was ? 0.32 : 0.42);
      dir.l = dead && nx < -on(dir.l);
      dir.r = dead && nx > on(dir.r);
      dir.u = dead && ny < -on(dir.u);
      dir.d = dead && ny > on(dir.d);
      const s = sources.joy;
      s.clear();
      if (dir.l) s.add('ArrowLeft');
      if (dir.r) s.add('ArrowRight');
      if (dir.u) s.add('ArrowUp');
      if (dir.d) s.add('ArrowDown');
      sync();
    }
    function joyEnd(e) {
      if (e && e.pointerId !== joyId) return;
      joyId = null;
      dir.l = dir.r = dir.u = dir.d = false;
      knob.style.transform = '';
      sources.joy.clear();
      sync();
    }
    joy.addEventListener('pointerdown', function (e) {
      if (joyId !== null) return;
      joyId = e.pointerId;
      try { joy.setPointerCapture(e.pointerId); } catch (_e) { /* ignore */ }
      unlockAudio();
      joyMove(e);
      e.preventDefault();
    });
    joy.addEventListener('pointermove', function (e) { if (e.pointerId === joyId) { joyMove(e); e.preventDefault(); } });
    joy.addEventListener('pointerup', joyEnd);
    joy.addEventListener('pointercancel', joyEnd);
    joy.addEventListener('lostpointercapture', joyEnd);

    /* ---- A / B 鈕：以座標命中判定，可多指、可滑動切換
     *      判定半徑比外觀大 35%，按在兩鈕之間會同時按下 A+B（跑 + 跳）---- */
    const HIT = 1.35;
    const fingers = new Map();
    function hit(el, p) {
      const rc = el.getBoundingClientRect();
      const r = rc.width / 2;
      return Math.hypot(p.x - (rc.left + r), p.y - (rc.top + r)) <= r * HIT;
    }
    function refreshBtns() {
      let a = false, b = false;
      fingers.forEach(function (p) { if (hit(btnA, p)) a = true; if (hit(btnB, p)) b = true; });
      const wasA = sources.a.size > 0, wasB = sources.b.size > 0;
      sources.a.clear(); sources.b.clear();
      if (a) sources.a.add('AltLeft');
      if (b) { sources.b.add('ControlLeft'); sources.b.add('Space'); }
      btnA.classList.toggle('on', a);
      btnB.classList.toggle('on', b);
      if ((a && !wasA) || (b && !wasB)) buzz();
      sync();
    }
    btns.addEventListener('pointerdown', function (e) {
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { btns.setPointerCapture(e.pointerId); } catch (_e) { /* ignore */ }
      unlockAudio();
      refreshBtns();
      e.preventDefault();
    });
    btns.addEventListener('pointermove', function (e) {
      if (!fingers.has(e.pointerId)) return;
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      refreshBtns();
      e.preventDefault();
    });
    function btnEnd(e) { if (fingers.delete(e.pointerId)) refreshBtns(); }
    btns.addEventListener('pointerup', btnEnd);
    btns.addEventListener('pointercancel', btnEnd);
    btns.addEventListener('lostpointercapture', btnEnd);

    /* ---- 暫停 / 選單 ---- */
    root.querySelectorAll('.tc-pill').forEach(function (pill) {
      const code = pill.getAttribute('data-code');
      function up() { pill.classList.remove('on'); sources.sys.delete(code); sync(); }
      pill.addEventListener('pointerdown', function (e) {
        try { pill.setPointerCapture(e.pointerId); } catch (_e) { /* ignore */ }
        unlockAudio();
        pill.classList.add('on');
        sources.sys.add(code);
        sync();
        e.preventDefault();
      });
      pill.addEventListener('pointerup', up);
      pill.addEventListener('pointercancel', up);
      pill.addEventListener('lostpointercapture', up);
    });

    /* ---- 防呆：切走分頁/失焦時放開所有按鍵，避免卡鍵 ---- */
    function resetUI() {
      fingers.clear();
      joyEnd();
      btnA.classList.remove('on');
      btnB.classList.remove('on');
      root.querySelectorAll('.tc-pill').forEach(function (p) { p.classList.remove('on'); });
      releaseAll();
    }
    window.addEventListener('blur', resetUI);
    window.addEventListener('pagehide', resetUI);
    document.addEventListener('visibilitychange', function () { if (document.hidden) resetUI(); });
    window.addEventListener('orientationchange', resetUI);

    // 長按選單、iOS 縮放手勢一律關閉
    root.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  }

  /* ------------------------------------------------------------------ *
   * 4. 何時顯示：觸控裝置（主要指標為手指）、?touch=1，
   *    或偵測到第一次真實 touchstart（例如瀏覽器切成桌面版網站模式）
   * ------------------------------------------------------------------ */
  function init() {
    const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    if (param === '1' || (coarse && navigator.maxTouchPoints > 0)) build();
    else window.addEventListener('touchstart', build, { once: true, passive: true });
  }
  if (document.body) init(); else document.addEventListener('DOMContentLoaded', init);
})();
