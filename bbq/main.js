const stage = document.querySelector("#stage");

/*
  Step 45：全螢幕等比例縮放。
  BASE_WIDTH/HEIGHT 改成跟 style.css 的 --stage-width/--stage-height
  (550 x 440，Step 8 第 2 次工作階段訂正過的正確比例 5:4) 對齊——
  舊版這裡寫死 520 是 Step 8 修正 --stage-height 之前留下的舊值，
  沒有同步更新，會讓縮放比例跟實際版面尺寸對不起來。

  拿掉原本「不放大、只縮小」的 Math.min(..., 1) 上限，也拿掉原本
  預留給外層說明文字/頁尾用的 viewportPadding／220px 扣除值——現在
  頁面只剩 .stage 一個元素，直接用整個視窗寬高去算，讓舞台不論視窗
  比原始尺寸大或小都能等比例（contain）撐滿畫面。
*/
const BASE_WIDTH = 550;
const BASE_HEIGHT = 440;

function updateStageScale() {
  if (!stage) {
    return;
  }

  const availableWidth = window.innerWidth;
  const availableHeight = window.innerHeight;

  const scaleX = availableWidth / BASE_WIDTH;
  const scaleY = availableHeight / BASE_HEIGHT;
  const scale = Math.min(scaleX, scaleY);

  stage.style.transform = `scale(${scale})`;
}

window.addEventListener("resize", updateStageScale);
window.addEventListener("load", updateStageScale);
updateStageScale();

/*
  音效模組。
  用 SWF 二進位 tag 解析（DefineButtonSound / DefineSound / StartSound，
  不是聽感猜測）確認了 6 個 mp3 的用途，對照表如下：

    21.mp3  → 按鈕 down 音效（DefineButtonSound 綁在開始鈕/重新開始鈕）
    39.mp3  → smoke（放到烤網時的滋滋聲，DefineSprite_42 內部音效）
    103.mp3 → OKsnd（吃對時，DefineSprite_104 內部音效）
    106.mp3 → Badsnd（吃錯時，DefineSprite_107 內部音效）
    109.mp3 → NEXTsnd（換盤時，DefineSprite_110 內部音效）
    115.mp3 → 結局音效（LimitOver/TimeOver 共用同一個檔案）

  用 HTMLAudioElement 播放，每次播放前 currentTime 歸零、cloneNode 播放，
  這樣同一個音效在短時間內重複觸發（例如快速連續吃肉）也能疊放播放，
  不會被前一次還沒播完的同一個 <audio> 打斷。播放失敗（例如瀏覽器
  尚未有使用者互動、autoplay 政策擋下）只印警告，不影響遊戲其他邏輯。
*/
const SOUND_FILES = {
  btnDown: "./assets/sounds/21.mp3",
  smoke: "./assets/sounds/39.mp3",
  ok: "./assets/sounds/103.mp3",
  bad: "./assets/sounds/106.mp3",
  next: "./assets/sounds/109.mp3",
  gameOver: "./assets/sounds/115.mp3",
};

const soundElements = {};
Object.keys(SOUND_FILES).forEach((key) => {
  const audio = new Audio(SOUND_FILES[key]);
  audio.preload = "auto";
  soundElements[key] = audio;
});

function playSound(key) {
  const base = soundElements[key];
  if (!base) {
    return;
  }
  try {
    const node = base.cloneNode(true);
    const playPromise = node.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch((err) => {
        console.warn(`音效播放失敗（${key}）：`, err);
      });
    }
  } catch (err) {
    console.warn(`音效播放失敗（${key}）：`, err);
  }
}

/*
  開始按鈕三態。
  直接切換 img 的 src 在 up / over / down 三張原版素材圖之間，
  滑鼠放開或移出按鈕範圍時，一律回到 up 狀態。
*/
const startBtn = document.querySelector("#startBtn");
const startBtnImg = document.querySelector("#startBtnImg");
const clickHint = document.querySelector("#clickHint");

const BTN_STATE = {
  up: "./assets/images/btn_start_up.png",
  over: "./assets/images/btn_start_over.png",
  down: "./assets/images/btn_start_down.png",
};

function setBtnState(state) {
  if (!startBtnImg) {
    return;
  }
  startBtnImg.src = BTN_STATE[state] || BTN_STATE.up;
}

if (startBtn) {
  startBtn.addEventListener("mouseenter", () => setBtnState("over"));
  startBtn.addEventListener("mouseleave", () => setBtnState("up"));
  startBtn.addEventListener("mousedown", () => {
    setBtnState("down");
    playSound("btnDown");
  });
  startBtn.addEventListener("mouseup", () => setBtnState("over"));
  startBtn.addEventListener("touchstart", () => {
    setBtnState("down");
    playSound("btnDown");
  }, { passive: true });
  startBtn.addEventListener("touchend", () => setBtnState("up"), { passive: true });

}

/*
  畫面切換。
  用兩個 .screen 容器（#titleScreen / #gameScreen）搭配 [hidden] 屬性，
  同一時間只顯示一個畫面。點擊開始按鈕後，隱藏標題頁、顯示遊戲頁（占位內容）。
  重新整理頁面會回到標題頁，因為目前沒有把畫面狀態存在任何地方（刻意如此）。
*/
const titleScreen = document.querySelector("#titleScreen");
const gameScreen = document.querySelector("#gameScreen");

function getEndingCleanupTargets() {
  if (!gameScreen) {
    return [];
  }
  return Array.from(gameScreen.querySelectorAll(
    ".grill-img, .plate-img, .bowl-img, #nikuLayer, #fukidasiEl, #bonusEl, .hud, .hit-debug-overlay",
  ));
}

function setEndingMode(active) {
  if (!gameScreen) {
    return;
  }
  gameScreen.classList.toggle("ending-mode", active);
  getEndingCleanupTargets().forEach((el) => {
    el.setAttribute("aria-hidden", active ? "true" : "false");
  });
}

function showGameScreen() {
  if (!titleScreen || !gameScreen) {
    return;
  }
  titleScreen.hidden = true;
  gameScreen.hidden = false;
  setEndingMode(false);
  if (clickHint) {
    clickHint.textContent = "目前畫面：遊戲頁（秒數／說明文／分數已套用原始字型，大標題暫維持系統字型）。";
  }
}

/*
  showTitleScreen()：showGameScreen() 的反向版本，只負責「畫面切換」本身，
  刻意不呼叫 resetGameState()——對應原版兩顆按鈕各自行為不同：
  - 結局畫面的重新開始鈕：只回標題頁，不重置資料。
  - 標題頁「食べる」開始鈕：才會真正觸發初始化（見 resetGameState()）。

  順便把兩個結局畫面（LimitOver／TimeOver）的 hidden 屬性跟 is-visible
  class 重置回初始狀態，避免下次觸發任一結局時，殘留上一輪的 is-visible
  class 導致 CSS transition 不會重新播放。
*/
function showTitleScreen() {
  if (!titleScreen || !gameScreen) {
    return;
  }
  gameScreen.hidden = true;
  titleScreen.hidden = false;
  setEndingMode(false);
  resetEndingTransientUi();
  if (clickHint) {
    clickHint.textContent = "目前畫面：標題頁。";
  }

  if (limitOverScreenEl) {
    limitOverScreenEl.classList.remove("is-visible");
    limitOverScreenEl.hidden = true;
  }
  if (timeOverScreenEl) {
    timeOverScreenEl.classList.remove("is-visible");
    timeOverScreenEl.hidden = true;
  }
}

if (startBtn) {
  startBtn.addEventListener("click", () => {
    setBtnState("up");
    resetGameState(); // 每次從標題頁按「食べる」都會重新初始化，不只第一次進遊戲頁才做
    showGameScreen();
    startGameTimer(); // 切到遊戲頁的同一時間點開始倒數計時
  });
}

/*
  倒數計時器（真實毫秒時間）。

  對應原版用 getTimer() 量測真實經過時間、每滿 1000ms 就把剩餘秒數減 1，
  倒數到 0 進入 TimeOver。這裡刻意不用「tick 次數累加」的方式，因為分頁
  切到背景或裝置效能不穩定時會漂移。改成每次 tick 都用
  Date.now() - gameStartTime 重新算一次真正經過的毫秒數，不管中間 tick
  被延遲或跳過幾次，算出來的剩餘秒數都還是準的。

  timeOverTriggered 這個旗標確保「倒數歸零、停止操作」只會觸發一次。
*/
const GAME_DURATION_MS = 120 * 1000; // 對應原版 DispCount 初始值 120（秒）
let gameStartTime = null; // Date.now() 的時間戳記，尚未開始遊戲時維持 null
let timeOverTriggered = false;

const hudTimerEl = document.querySelector("#hudTimer");
const limitOverScreenEl = document.querySelector("#limitOverScreen");
const timeOverScreenEl = document.querySelector("#timeOverScreen");

function cancelAllDragging() {
  nikus.forEach((niku) => {
    niku.isDragging = false;
    if (niku.el) {
      niku.el.classList.remove("dragging");
    }
  });
}

function resetEndingTransientUi() {
  clearTimeout(fukidasiHideTimer);
  clearTimeout(bonusHideTimer);
  if (fukidasiEl) {
    fukidasiEl.classList.remove("show");
    fukidasiEl.textContent = "";
  }
  if (bonusEl) {
    bonusEl.classList.remove("show");
    bonusEl.textContent = "";
  }
}

function showEndingScreen(screenEl) {
  if (!screenEl) {
    return;
  }
  screenEl.hidden = false;
  screenEl.classList.remove("is-visible");
  void screenEl.offsetWidth; // 強制 reflow，確保同一個結局畫面下次再次顯示時動畫會重播
  requestAnimationFrame(() => {
    screenEl.classList.add("is-visible");
  });
}

function startGameTimer() {
  gameStartTime = Date.now();
  timeOverTriggered = false;
  gameState.isTimeOver = false;
  updateGameTimer(); // 立刻算一次，畫面不用等到下一個 tick 才從「120秒」變動
}

function updateGameTimer() {
  if (gameStartTime === null || timeOverTriggered || gameState.isLimitOver) {
    // 血量歸零（isLimitOver）時也要停止繼續倒數，對應原版行為：LimitOver
    // 會把倒數計時器凍結在觸發當下的數字，不會歸零、也不會繼續往下跳，
    // 跟 TimeOver「歸零後強制顯示 0秒」是不同的凍結方式，所以這裡直接
    // return，不去動 hudTimerEl 的文字。
    return;
  }
  const elapsedMs = Date.now() - gameStartTime;
  const remainMs = Math.max(0, GAME_DURATION_MS - elapsedMs);
  // 用 Math.ceil 而不是 Math.floor：原版倒數從「120」開始顯示（還沒經過任何
  // 時間），對應這裡 remainMs 剛好等於 GAME_DURATION_MS 時也要顯示 120，
  // 而不是等到已經過了一小段時間才從 119 開始顯示。
  const remainSec = Math.ceil(remainMs / 1000);
  if (hudTimerEl) {
    hudTimerEl.textContent = `${remainSec}秒`;
  }
  if (remainMs <= 0) {
    timeOverTriggered = true;
    handleTimeOver();
  }
}

/*
  handleTimeOver()：對應原版倒數歸零時 gotoAndStop("TimeOver") 並 play()。
  把 isTimeOver 設成 true，讓 setupDragging() 裡的 pointerdown 直接擋掉，
  肉片不能再被拖曳或翻面。
*/
function handleTimeOver() {
  gameState.isTimeOver = true;
  cancelAllDragging();
  resetEndingTransientUi();
  setEndingMode(true);
  if (hudTimerEl) {
    hudTimerEl.textContent = "0秒";
  }

  // 結局畫面進場前，先把遊戲中的烤網／盤子／醬料碗／肉片／HUD／浮字都
  // 切到「清場模式」，而不是只蓋一層半透明遮罩。真正顯示結局時再讓
  // TimeOver 容器做一次回彈進場動畫。
  showEndingScreen(timeOverScreenEl);

  playSound("gameOver"); // 對應原版 TimeOver 結局音效
}

/*
  handleLimitOver()：對應原版「血量歸零 → 進 LimitOver」。
  跟 handleTimeOver() 同一套做法：把 isLimitOver 設成 true，讓
  setupDragging() 的 pointerdown 判斷式擋掉，肉片不能再被拖曳或翻面。
  加一個「已經觸發過就不重複執行」的保護，不依賴呼叫順序。
*/
function handleLimitOver() {
  if (gameState.isLimitOver) {
    return; // 已經觸發過，不重複執行
  }
  gameState.isLimitOver = true;
  cancelAllDragging();
  resetEndingTransientUi();
  setEndingMode(true);

  // LimitOver 跟 TimeOver 共用同一套「先清場、再顯示結局」流程。
  showEndingScreen(limitOverScreenEl);

  playSound("gameOver"); // 對應原版 LimitOver 結局音效
}

/*
  結局畫面的重新開始鈕。

  原版兩個結局畫面（LimitOver／TimeOver）共用同一顆按鈕元件，但因為
  這兩個結局畫面不會同時顯示在畫面上，這裡分別建立兩個獨立的 DOM
  節點（#limitOverRestartBtn／#timeOverRestartBtn），避免以後兩個結局
  畫面同時存在於 DOM 時互搶同一個元素。

  三態切換做法比照開始按鈕（setBtnState() / BTN_STATE），素材換成
  assets/buttons/DefineButton2_117 底下的三張圖。

  點擊後的行為對照原始碼核對過，原版就只是回標題頁，不做任何資料重置；
  真正的「重置 gameState」是標題頁「食べる」開始鈕被按下時才會發生（見
  showTitleScreen() / resetGameState() 的註解），所以這裡的 click
  handler 只呼叫 showTitleScreen()，刻意不呼叫 resetGameState()。
*/
const RESTART_BTN_STATE = {
  up: "./assets/images/btn_restart_up.png",
  over: "./assets/images/btn_restart_over.png",
  down: "./assets/images/btn_restart_down.png",
};

function setupEndingRestartBtn(btnSelector, imgSelector) {
  const btn = document.querySelector(btnSelector);
  const img = document.querySelector(imgSelector);
  if (!btn || !img) {
    return;
  }

  function setState(state) {
    img.src = RESTART_BTN_STATE[state] || RESTART_BTN_STATE.up;
  }

  btn.addEventListener("mouseenter", () => setState("over"));
  btn.addEventListener("mouseleave", () => setState("up"));
  btn.addEventListener("mousedown", () => {
    setState("down");
    playSound("btnDown");
  });
  btn.addEventListener("mouseup", () => setState("over"));
  btn.addEventListener("touchstart", () => {
    setState("down");
    playSound("btnDown");
  }, { passive: true });
  btn.addEventListener("touchend", () => setState("up"), { passive: true });

  btn.addEventListener("click", () => {
    setState("up");
    // 只回標題頁，不重置 gameState（見上方註解）。
    showTitleScreen();
  });
}

setupEndingRestartBtn("#limitOverRestartBtn", "#limitOverRestartBtnImg");
setupEndingRestartBtn("#timeOverRestartBtn", "#timeOverRestartBtnImg");

/*
  十二片肉資料模型 + 通用渲染／翻面／自動熟成。
  依照原版邏輯（每片肉一開始都是 OMode=UMode=0，隨機挑一種花色 Mnum）
  建立 12 片肉，對應 assets/data/assets_map.json 整理出的原始變數：
  - OMode / UMode：原始 ActionScript 裡，單片肉正面／背面各自的熟度（0~3）
  - x, y：原版用 setProperty 隨機擺位到烤網區（Flash 舞台座標 50~170 / 260~310）
  - 每片肉還新增執行期用的欄位：face、eaten、oRemainMs／uRemainMs（自動熟
    成用的倒數計時）、isFlipping（翻面動畫防重複觸發用）、el（對應的 DOM
    節點，方便通用函式直接操作畫面）。

  x, y 這兩個欄位先給預設值 0，實際座標由 assignNikuPositions() 統一分配
  （見下方「擺位限制」區塊），方便之後換盤時整批重新產生座標。
*/
/*
  材質種類（mNum）。
  對應原始碼 DefineSprite_88/frame_1：random(4) 回傳 0~3，+1 之後範圍是
  1~4，且 omote／ura 兩面共用同一個 Mnum（同一片肉翻到背面，花色種類不會
  變，只有熟度 OMode/UMode 各自獨立），所以只在建立時決定一次，翻面不會
  重新產生或改變 mNum。素材對應 assets/images/niku/niku_type1~4.png。
*/
function createNiku(id) {
  return {
    id: id,                 // 對應原始 niku1~niku12 的編號
    x: 0,                    // 座標由 assignNikuPositions() 統一分配
    y: 0,                    // 同上
    face: "omote",          // "omote"（正面）或 "ura"（背面），對應原始 omote/ura 兩個子物件的可見度
    mNum: Math.floor(Math.random() * 4) + 1, // 材質種類 1~4，對應原始 Mnum，兩面共用同一個值
    oMode: 0,                // 正面熟度 0~3，對應原始 OMode
    uMode: 0,                // 背面熟度 0~3，對應原始 UMode
    eaten: false,             // 是否已被吃掉
    oRemainMs: AUTO_COOK_INTERVAL_MS, // 正面目前這階段還剩多少毫秒會自動升級
    uRemainMs: AUTO_COOK_INTERVAL_MS, // 背面同上
    isFlipping: false,        // 翻面動畫進行中旗標，避免同一片肉重複觸發
    isDragging: false,        // 拖曳中旗標，setupDragging() 會實際維護這個值
    onGrill: false,            // 目前是否落在烤網範圍內
    onBowl: false,             // 目前是否落在醬料碗範圍內，對應原版「吃掉流程」的計分/移除規則
    eatResult: null,          // 被吃掉當下的計分結果，尚未被吃掉之前維持 null
    el: null,                 // 對應的 DOM 節點，render 之後才會賦值
  };
}

/*
  擺位限制（核對 FrameLabel／反編譯 AS3 後修正）。

  曾經一度改成「格子分配＋防重疊」，讓 12 片肉保證落在不同格子裡，畫面
  比較整齊。但重新核對 bbq.swf 反編譯出的 frame_7 AS3 邏輯後，確認原版
  就是單純對每一片肉各自呼叫 random，完全獨立、彼此不參照，本來就會
  重疊。為了忠實還原原版行為，改回純隨機寫法，允許肉片重疊（玩家本來
  就得自己把疊在一起的肉分開拖曳）。
*/
const PLATE_X_MIN = 50;
const PLATE_X_RANGE = 120; // 原版純隨機擺位範圍 x: 50~170
const PLATE_Y_MIN = 260;
const PLATE_Y_RANGE = 50; // 原版純隨機擺位範圍 y: 260~310

/*
  使用者需求調整（重製更貼近原版視覺 - 第1項，2026-08-07）：
  原本 assignNikuPositions() 是照抄原版 frame_7 的邏輯——12 片肉各自獨立
  呼叫「50 + random(120)」「260 + random(50)」，完全不參照彼此位置，這在
  肉片還是 34px 小色塊時只是「常常疊在一起看不清楚」，但這次肉片放大到
  46px 基準尺寸後，同一塊只有 120x50 flash 座標單位（換算成畫面大約只有
  26%×14% 的窄長條）的隨機範圍會讓 12 片肉幾乎全部疊成一團，看起來完全
  不像使用者提供的參考截圖裡那種「攤開在整個圓盤上」的自然生肉擺盤。

  這裡改成：以 .plate-img 實際顯示的橢圓盤面為準，用「每片肉各自分配一個
  角度區間 + 隨機半徑 + 角度微幅抖動」的環狀擺位法，讓 12 片肉大致平均
  散開在整個盤面上、彼此還是會有自然的局部重疊（跟參考截圖一樣肉片會互相
  搭在一起，但不是疊成一坨看不出片數），視覺上更接近「隨手擺盤」而不是
  「機械式網格」。這是刻意偏離原版純隨機演算法的一處調整，因為使用者這次
  明確要求「較大、呈自然擺放狀態」的視覺效果優先於逐行為對照原版程式碼；
  原本的 PLATE_X_MIN/RANGE、PLATE_Y_MIN/RANGE 常數保留在上面沒有刪除，
  只是不再被這個函式使用，方便之後如果要切回原版行為比對用。

  座標系換算依據（對照 style.css .plate-img 與 flashToStagePercent()）：

  Step 43（2026-08-07）更新：這組常數原本是照 style.css 舊版 .plate-img
  （left 2.7% / top 64.6% / width 43%）＋錯誤的圖檔尺寸（226x135，其實是
  舊版 game_plate.png 的尺寸）算的，但實際顯示用的 sara_f1.png 是
  226x159（上方多 24px 留白給疊肉動畫），兩邊沒同步，換算出來的橢圓範圍
  跟畫面上盤子的實際瓷盤範圍對不齊。這次連同 Step 43 的 .plate-img 座標
  調整（left 1% / top 54% / width 49%）一起重新量測：
  - sara_f1.png 畫布 226x159px，但有畫面內容（瓷盤本體，不算上方疊肉
    留白）的可視範圍是 x:7~219 / y:26~153（來自 fontTools 之外另外用
    PIL 掃 alpha 通道量出來的），也就是瓷盤本體佔畫布左 3.1%~96.9%、
    上 16.4%~96.2%。
  - .plate-img 目前 width 49%（對照 550px stage 寬 ≈ 269.5px），縮放比例
    269.5/226 ≈ 1.1925，換算成 stage 座標：瓷盤可視範圍左緣 ≈ left(1%) +
    3.1%*49% ≈ 2.5%，右緣 ≈ 1% + 96.9%*49% ≈ 48.5%；上緣 ≈ top(54%) +
    16.4%*(159*1.1925/440*100) ≈ 61.1%，下緣 ≈ 54% + 96.2%*43.1% ≈ 95.5%
    （43.1% 是 sara_f1.png 縮放後的整張畫布高度佔 stage 高度的比例）。
  - 因此瓷盤可視範圍中心約在 (26.0%, 78.3%)，半寬約 23.5%、半高約
    17.2%（皆為 stage 尺寸的百分比），下面用 PLATE_ELLIPSE_* 幾個常數
    記錄這組換算值，再乘上 0~1 的 PLATE_FILL_RATIO 讓肉片群落收在盤緣
    內側，不會貼到盤子的瓷器邊框。
*/
const PLATE_ELLIPSE_CENTER_X_PERCENT = 26.0;
const PLATE_ELLIPSE_CENTER_Y_PERCENT = 78.3;
const PLATE_ELLIPSE_HALF_WIDTH_PERCENT = 23.5;
const PLATE_ELLIPSE_HALF_HEIGHT_PERCENT = 17.2;
const PLATE_FILL_RATIO = 0.68; // 收在盤緣內側的比例，避免肉片超出瓷盤範圍

function assignNikuPositions(nikuList) {
  const count = nikuList.length;
  nikuList.forEach((niku, index) => {
    // 每片肉先分配一個大致平均的角度區間（360 度 / 片數），再加上左右
    // 微幅抖動，避免看起來像等分刻度那樣過於規則；半徑用隨機值（帶最小
    // 值，避免太多片擠在正中心），讓有的肉片偏盤心、有的偏盤緣，模擬
    // 隨手擺盤的自然感。
    const baseAngle = (index / count) * Math.PI * 2;
    const angleJitter = (Math.random() - 0.5) * ((Math.PI * 2) / count) * 0.9;
    const angle = baseAngle + angleJitter;
    const radiusFactor = 0.3 + Math.random() * 0.6; // 0.3~0.9，盤心到盤緣之間

    const leftPercent =
      PLATE_ELLIPSE_CENTER_X_PERCENT +
      Math.cos(angle) * PLATE_ELLIPSE_HALF_WIDTH_PERCENT * radiusFactor * PLATE_FILL_RATIO;
    const topPercent =
      PLATE_ELLIPSE_CENTER_Y_PERCENT +
      Math.sin(angle) * PLATE_ELLIPSE_HALF_HEIGHT_PERCENT * radiusFactor * PLATE_FILL_RATIO;

    // renderNikuPiece() 一律用 flashToStagePercent(niku.x, niku.y) 換算畫面
    // 位置，所以這裡算完百分比之後要換算回 Flash 舞台座標（450x360）存
    // 回 niku.x / niku.y，維持跟其餘程式碼（拖曳、命中判定）同一套座標系
    // 沒有變動。
    niku.x = (leftPercent / 100) * FLASH_STAGE_WIDTH;
    niku.y = (topPercent / 100) * FLASH_STAGE_HEIGHT;
  });
}

/*
  座標換算：Flash 舞台座標 → 畫面百分比。

  直接解析 bbq.swf 檔頭的 RECT 欄位，確認原始 Flash 舞台大小是 450 x 360 px
  （twips 值 9000 x 7200，除以 20 換算成 px）。frame_7 的擺位座標
  （x: 50~170, y: 260~310）以這個舞台為基準，換算後對照烤網／肉盤／醬料碗
  的百分比位置，確認 12 片生肉一開始其實是擺在肉盤附近，玩家要把肉拖到
  烤網上烤。
*/
const FLASH_STAGE_WIDTH = 450;
const FLASH_STAGE_HEIGHT = 360;

function flashToStagePercent(x, y) {
  return {
    leftPercent: (x / FLASH_STAGE_WIDTH) * 100,
    topPercent: (y / FLASH_STAGE_HEIGHT) * 100,
  };
}

/*
  「畫面百分比 → Flash 座標」的反向換算，跟 flashToStagePercent 互為逆
  運算，拖曳放開時用這個把最終位置換算回 niku.x/niku.y。
*/
function stagePercentToFlash(leftPercent, topPercent) {
  return {
    x: (leftPercent / 100) * FLASH_STAGE_WIDTH,
    y: (topPercent / 100) * FLASH_STAGE_HEIGHT,
  };
}

/*
  落點：烤網。

  烤網範圍沿用 .grill-img 的定位百分比（Step 43 更新：left 20% / top
  16% / width 69%），高度用 game_grill.png 實際尺寸換算出來（69% *
  188/360 * 550/440 ≈ 45.04%），直接寫成常數不在執行期重算，因為烤網
  圖片本身不會動態改變大小。

  命中判定用「alpha 命中判定」而非純矩形：原版是用 `_droptarget` 判斷
  是否落在物件的 hit area 上，矩形判斷在烤網四角/醬料碗外緣容易誤判。
  這裡用 Canvas 把烤網/醬料碗 PNG 畫到離屏畫布，針對放開位置取樣 alpha，
  alpha > threshold 才算命中，就算點在矩形範圍內、圖片是透明的也不算命中。

  兼容性：若瀏覽器不支援 canvas 讀像素（例如 jsdom 測試環境），或圖片
  尚未載入完成，會自動退回矩形判斷，避免玩家操作沒反應。
*/
const GRILL_BOUNDS = {
  left: 20,
  top: 16,
  width: 69,
  height: 45.04,
};

const grillImgEl = document.querySelector(".grill-img");
const bowlImgEl = document.querySelector(".bowl-img");

function isPointInBounds(bounds, leftPercent, topPercent) {
  return (
    leftPercent >= bounds.left &&
    leftPercent <= bounds.left + bounds.width &&
    topPercent >= bounds.top &&
    topPercent <= bounds.top + bounds.height
  );
}

function createAlphaHitTester(imgEl, bounds, { alphaThreshold = 8 } = {}) {
  if (!imgEl || typeof document === "undefined") {
    return null;
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext && canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return null;
  }

  let data = null;
  let width = 0;
  let height = 0;
  let ready = false;

  const refresh = () => {
    width = imgEl.naturalWidth || imgEl.width || 0;
    height = imgEl.naturalHeight || imgEl.height || 0;
    if (!width || !height) {
      ready = false;
      return;
    }
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    try {
      ctx.drawImage(imgEl, 0, 0, width, height);
      data = ctx.getImageData(0, 0, width, height).data;
      ready = true;
    } catch (err) {
      // 部分環境（或安全限制）可能不允許讀像素；退回矩形判斷
      ready = false;
    }
  };

  if (imgEl.complete && (imgEl.naturalWidth || imgEl.width)) {
    refresh();
  } else {
    imgEl.addEventListener("load", refresh, { once: true });
  }

  // 回傳實際命中函式：輸入是「舞台百分比座標」，輸出 boolean
  return (leftPercent, topPercent) => {
    if (!isPointInBounds(bounds, leftPercent, topPercent)) {
      return false;
    }
    if (!ready || !data) {
      return true; // 圖還沒 ready 時，先退化成矩形命中，避免操作無反應
    }

    const relX = (leftPercent - bounds.left) / bounds.width;
    const relY = (topPercent - bounds.top) / bounds.height;
    if (relX < 0 || relX > 1 || relY < 0 || relY > 1) {
      return false;
    }

    const px = Math.min(width - 1, Math.max(0, Math.floor(relX * width)));
    const py = Math.min(height - 1, Math.max(0, Math.floor(relY * height)));
    const alpha = data[(py * width + px) * 4 + 3];
    return alpha > alphaThreshold;
  };
}

let grillAlphaHitTester = null;
function isPointOnGrill(leftPercent, topPercent) {
  if (!isPointInBounds(GRILL_BOUNDS, leftPercent, topPercent)) {
    return false;
  }

  if (!grillAlphaHitTester) {
    grillAlphaHitTester = createAlphaHitTester(grillImgEl, GRILL_BOUNDS, { alphaThreshold: 8 });
  }

  return grillAlphaHitTester ? grillAlphaHitTester(leftPercent, topPercent) : true;
}

/*
  落在烤網上的視覺回饋。
  1. spawnGrillSmoke：在放開的位置動態產生一個煙霧特效元素，播放一次
     動畫後自動移除（監聽 animationend，同時保留 setTimeout 當作保險，
     避免極少數瀏覽器沒有正確觸發 animationend 事件導致元素卡著不消失）。
     使用者需求還原：煙霧改用從原始 SWF（DefineSprite_42，與 39.mp3
     滋滋聲同一顆物件）真實裁切出來的 12 格煙霧畫格拼成的橫向 sprite
     sheet（assets/images/smoke/smoke_sheet.png），用 CSS steps(12)
     動畫依序播放，不再是純 CSS 圓形漸層佔位版本。
  2. 原本另外用 flashOnGrillHighlight 在肉片本身加上一圈黃色外框脈動
     （.on-grill-flash / onGrillPulse），使用者反應這在畫面上看起來像
     「變成黃色框」，蓋過了原本應該用煙霧表現的回饋，所以拿掉這個黃框
     效果，落點回饋統一交給煙霧動畫負責。
*/
function spawnGrillSmoke(leftPercent, topPercent) {
  if (!nikuLayer) {
    return;
  }
  const smoke = document.createElement("div");
  smoke.className = "grill-smoke-fx";
  smoke.style.left = `${leftPercent}%`;
  smoke.style.top = `${topPercent}%`;
  nikuLayer.appendChild(smoke);

  const remove = () => {
    smoke.remove();
  };
  smoke.addEventListener("animationend", remove);
  setTimeout(remove, 800); // 保險：萬一 animationend 沒觸發，最晚 0.8 秒後也會移除
}


/*
  落點：醬料碗。

  醬料碗範圍沿用 .bowl-img 的定位百分比（Step 43 更新：left 66% / top
  67% / width 30%），高度用 game_bowl.png 實際尺寸換算，約 27.89%
  （30% * 119/160 * 550/440 ≈ 27.89%）。

  跟烤網範圍（top 16~61.04%）比對可以確認：醬料碗的 top（67%）已經
  在烤網 bottom 之下，兩個矩形範圍不會重疊，所以兩個判斷各自獨立呼叫
  即可，不需要處理「同時落在兩個範圍」的優先順序問題。

  對照原始 ActionScript：_droptarget 是醬料碗時，原版會進入「吃掉流程」
  （計分、扣血、移除肉片，見 eatNiku() 的說明）。
*/
const BOWL_BOUNDS = {
  left: 66,
  top: 67,
  width: 30,
  height: 27.89,
};

let bowlAlphaHitTester = null;
function isPointOnBowl(leftPercent, topPercent) {
  if (!isPointInBounds(BOWL_BOUNDS, leftPercent, topPercent)) {
    return false;
  }

  if (!bowlAlphaHitTester) {
    bowlAlphaHitTester = createAlphaHitTester(bowlImgEl, BOWL_BOUNDS, { alphaThreshold: 8 });
  }

  return bowlAlphaHitTester ? bowlAlphaHitTester(leftPercent, topPercent) : true;
}

/*
  命中區域除錯可視化（?debugHit=1）。

  烤網／醬料碗用的是「矩形範圍 + alpha 命中判定」兩層規則疊在一起，光看
  程式碼很難直覺確認「現在到底哪裡算命中」，所以做了這個除錯可視化工具。

  做法：
  - 用網址參數 `?debugHit=1` 開關，預設關閉、完全不影響正常遊玩（不加
    參數時直接 return，不會建立任何 DOM 或多做任何運算）。
  - 開啟時，在烤網／醬料碗上方各疊一張透明背景的 canvas，尺寸與位置對齊
    GRILL_BOUNDS / BOWL_BOUNDS。
  - canvas 內容：把原圖畫進來取樣 alpha，alpha > 8（跟 createAlphaHitTester
    的 alphaThreshold 保持一致）的像素畫成半透明紅色代表命中，其餘保持
    完全透明代表「雖在矩形範圍內但因透明不算命中」。
  - canvas 加 `pointer-events: none`，不會擋到底下的拖曳操作。
*/
const DEBUG_HIT = (() => {
  try {
    return new URLSearchParams(window.location.search).get("debugHit") === "1";
  } catch (err) {
    // 極少數環境（例如非瀏覽器測試環境）可能沒有 window.location / URLSearchParams，
    // 直接視為關閉即可，不影響正常遊戲邏輯。
    return false;
  }
})();

function createHitDebugOverlay(imgEl, bounds, label, alphaThreshold = 8) {
  if (!DEBUG_HIT || !imgEl || !gameScreen || typeof document === "undefined") {
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.className = "hit-debug-overlay";
  canvas.dataset.debugHitLabel = label;
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.left = `${bounds.left}%`;
  canvas.style.top = `${bounds.top}%`;
  canvas.style.width = `${bounds.width}%`;
  canvas.style.height = `${bounds.height}%`;
  gameScreen.appendChild(canvas);

  const draw = () => {
    const width = imgEl.naturalWidth || imgEl.width || 0;
    const height = imgEl.naturalHeight || imgEl.height || 0;
    if (!width || !height) {
      return;
    }
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    try {
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(imgEl, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > alphaThreshold) {
          // 命中範圍：半透明紅色遮罩，方便跟畫面上的圖形疊圖比對
          data[i] = 255;
          data[i + 1] = 0;
          data[i + 2] = 0;
          data[i + 3] = 110;
        } else {
          // 矩形範圍內但透明的部分：不算命中，完全不畫
          data[i + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);
    } catch (err) {
      // 讀取像素失敗（例如安全性限制）就不畫，靜默失敗，不影響其他功能。
    }
  };

  if (imgEl.complete && (imgEl.naturalWidth || imgEl.width)) {
    draw();
  } else {
    imgEl.addEventListener("load", draw, { once: true });
  }
}

createHitDebugOverlay(grillImgEl, GRILL_BOUNDS, "grill");
createHitDebugOverlay(bowlImgEl, BOWL_BOUNDS, "bowl");

function spawnSauceSplash(leftPercent, topPercent) {
  if (!nikuLayer) {
    return;
  }
  const splash = document.createElement("div");
  splash.className = "sauce-splash-fx";
  splash.style.left = `${leftPercent}%`;
  splash.style.top = `${topPercent}%`;
  nikuLayer.appendChild(splash);

  const remove = () => {
    splash.remove();
  };
  splash.addEventListener("animationend", remove);
  setTimeout(remove, 700); // 保險：萬一 animationend 沒觸發，最晚 0.7 秒後也會移除
}

function flashOnBowlHighlight(niku) {
  if (!niku.el) {
    return;
  }
  niku.el.classList.add("on-bowl-flash");
  setTimeout(() => {
    if (niku.el) {
      niku.el.classList.remove("on-bowl-flash");
    }
  }, 500);
}

/*
  計分或扣血邏輯。

  對照原始 ActionScript：
  - 進入遊戲頁時初始化：score=0、splus=0、limit=70。
  - 肉被放進醬料碗（對應這裡的 onBowl 判定）：這是「吃掉一片肉」時真正
    計分/扣血的規則。

  規則整理如下（OMode/UMode 在這裡指的是同一片肉「兩面各自的熟度」，
  不是「目前顯示中的那一面」，吃掉的判定同時看正反兩面）：
  1. 先把 oMode/uMode 由小到大排序成 a（較小或相等）、b（較大或相等），
     因為原始程式碼開頭就是「UMode < OMode 就交換」，兩面熟度誰是「正面」
     誰是「背面」對計分結果沒有差異，只有「這兩個數字的組合」有差異。
  2. 依 (a, b) 十種組合，各自對應原版 fukidasi（提示氣泡）Mode 1~10、
     PlusValue（加分）、MinusValue（扣血，是負數或 0）。
  3. 只有 (1,1)（雙面都是「半熟」）這個組合會使用「連續加分」splus：
     splus = splus + 20，PlusValue = 這次的 splus，MinusValue = 5 -
     PlusValue；其餘組合一律把 splus 重置為 0。這對應原版註解「連続で
     おいしく食べ続けると、ボーナス点が増えていきます」——只有連續吃到
     雙面恰好半熟，才會越吃越加分。
  4. score += PlusValue；limit += PlusValue + MinusValue，上限 200
     （原版 "200" < limit 就設回 200）。原版沒有對 limit 設下限，這裡
     維持一致（label 顯示时才 clamp 到 0，見 updateHud）。
  5. PlusValue + MinusValue > 0 表示「這次吃對了」（原版播 Bonus 動畫 +
     OK 音效），否則表示「這次吃錯了」（原版播 Bad 音效），結果記錄到
     niku.eatResult.isGood 供除錯區塊顯示。
  6. nikucnt（原版累計吃了幾片）也一併累加，吃滿 12 片時會觸發
     spawnNewPlate() 重新生成 12 片肉並把 nikucnt 歸零（見下方
     spawnNewPlate() 說明）。
*/
const gameState = {
  score: 0,
  splus: 0,
  limit: 70, // 對應原版初始值
  nikucnt: 0,
  isTimeOver: false, // 倒數歸零後設為 true，用來停用拖曳／翻面操作
  isLimitOver: false, // 血量歸零後設為 true，同樣用來停用拖曳／翻面操作
};

const LIMIT_MAX = 200;

// (a, b) 排序後（a<=b）對應原版 fukidasi Mode 與 Plus/Minus 規則，
// "1-1" 額外用 splus 動態計算，其餘固定寫死。
const EAT_RULE_TABLE = {
  "0-0": { bubbleMode: 1, plus: 0, minus: -40 },
  "0-1": { bubbleMode: 2, plus: 0, minus: -30 },
  "0-2": { bubbleMode: 3, plus: 0, minus: -30 },
  "0-3": { bubbleMode: 4, plus: 0, minus: -30 },
  "1-1": { bubbleMode: 5, useSplus: true },
  "1-2": { bubbleMode: 6, plus: 10, minus: -20 },
  "1-3": { bubbleMode: 7, plus: 10, minus: -30 },
  "2-2": { bubbleMode: 8, plus: 0, minus: -25 },
  "2-3": { bubbleMode: 9, plus: 0, minus: -30 },
  "3-3": { bubbleMode: 10, plus: 0, minus: -40 },
};

/*
  fukidasi（吃肉台詞氣泡）文字對照表。

  這十句台詞不是自己編的，是直接把 bbq.swf 的 fukidasi（DefineSprite_101）
  底下真正裝文字的子物件 kotoba 挖出來的——一開始不小心看錯 sprite（101
  資料夾其實是氣泡外框本身的彈出動畫），後來直接解析 PlaceObject2 標籤，
  確認 kotoba 的 character ID 其實是 DefineSprite_100，才拿到正確對應
  Mode 1~10 的十張文字圖，逐張核對出以下文字，跟 EAT_RULE_TABLE 的
  bubbleMode 一一對應：Mode 5（唯一會觸發 splus 連續加分的組合）的台詞
  正好是「うまいっ！」（好吃！），Mode 1（雙面全生，扣血最重）跟 Mode 10
  （雙面全焦，扣血也最重）分別是「生肉や！」跟「にがいっ！」，語意跟
  EAT_RULE_TABLE 的扣血嚴重程度完全對得上，確認這組對照沒有錯位。
*/
const FUKIDASI_MESSAGES = {
  1: "生肉や！",
  2: "半分生や！",
  3: "生と焦げが混ざってる～",
  4: "半分生で、半分炭や！",
  5: "うまいっ！",
  6: "ちょっと焦げた",
  7: "だいぶ焼きすぎた～",
  8: "焦げすぎ！",
  9: "ほとんど炭や！",
  10: "にがいっ！",
};

const fukidasiEl = document.querySelector("#fukidasiEl");
const bonusEl = document.querySelector("#bonusEl");
let fukidasiHideTimer = null;
let bonusHideTimer = null;

/*
  showFukidasi() / showBonus()：對應原版 DefineSprite_88/frame_8 最後
  那段「tellTarget(fukidasi){gotoAndPlay(2)}」「tellTarget(Bonus){gotoAndPlay(2)}」。
  原版兩個都是「獨立的 MovieClip 播放一次彈出動畫」，不管前一次播完沒有，
  新的一次觸發就是重新從頭播；這裡用「先移除 show class 強制 reflow、
  再加回去」模擬同樣的「隨時可以重新觸發」效果，而不是用 CSS transition
  （transition 對「還在播放中又被重新觸發」的處理沒有 animation 乾脆，
  animation 配合 reflow 可以確保每次都是乾淨地從頭播一次）。
*/
function showFukidasi(bubbleMode) {
  if (!fukidasiEl) return;
  const text = FUKIDASI_MESSAGES[bubbleMode] || "";
  clearTimeout(fukidasiHideTimer);
  fukidasiEl.textContent = text;
  fukidasiEl.classList.remove("show");
  void fukidasiEl.offsetWidth; // 強制 reflow，讓下一行重新加 class 能重新觸發 animation
  fukidasiEl.classList.add("show");
  fukidasiHideTimer = setTimeout(() => {
    fukidasiEl.classList.remove("show");
  }, 833);
}

function showBonus(plusValue) {
  if (!bonusEl) return;
  clearTimeout(bonusHideTimer);
  bonusEl.textContent = `+${plusValue}`;
  bonusEl.classList.remove("show");
  void bonusEl.offsetWidth;
  bonusEl.classList.add("show");
  bonusHideTimer = setTimeout(() => {
    bonusEl.classList.remove("show");
  }, 500);
}

const hudScoreEl = document.querySelector("#hudScore");
const hudBarFillEl = document.querySelector("#hudBarFill");

function updateHud() {
  if (hudScoreEl) {
    hudScoreEl.textContent = `SCORE: ${gameState.score}`;
  }
  /*
    Step 44（2026-08-07）：血條綠色比例跟原版差很多，直接拆 bbq.swf 查證。

    一開始以為血條寬度 = limit / LIMIT_MAX（0~200 線性對應 0~100%），
    但實測畫面發現：原版遊戲剛開始（limit 初始值 70）血條看起來將近
    七成滿，不是三成五滿，代表這個假設是錯的。

    用 tools/swf_niku_frame_tool.py 直接解析 bbq.swf 位元組層級查證：
    - root timeline frame_6 有個名叫 "statusbar" 的物件實例，char_id=48。
    - DefineSprite_48（也就是 statusbar 本體）的 frame_count 實際上
      只有 **100**，不是 200。
    - 逐格解析 PlaceObject2 的 matrix scale_x：frame 2 是 0.00999、
      frame 3 是 0.02010、frame 50 是 0.49489、frame 99 是 0.98990，
      幾乎精確等於 (frame-1)/99——確認這是一個用 100 格 motion tween
      把血條圖形從 scaleX=0 線性放大到 scaleX≈1 的標準 Flash 血條做法。
    - AS 原始碼（DefineSprite_88/frame_8）的
      `tellTarget("_flash0/statusbar"){ gotoAndStop(limit) }`
      直接把 limit 數值當「要跳到第幾格」，但 statusbar 這個 MovieClip
      只有 100 格：limit<=100 時，第 N 格對應大約 N% 寬度；limit>100
      （最高可以到 200，見上面 `if 200<limit` 的 clamp）時，
      `gotoAndStop(101~200)` 目標格數超出時間軸長度，Flash Player 的
      行為是直接停在最後一格（第 100 格，scaleX≈1，滿格），視覺上完全
      看不出 101 跟 200 的差異，兩者看起來都是「滿血」。

    換句話說，limit 本身的數值範圍（0~200）跟血條視覺呈現的範圍
    （0~100%，實際只有 100 個離散刻度）是兩件事：limit 只是遊戲內部
    用來加減分/判斷 LimitOver 的邏輯數值，血條 UI 用的是
    `min(limit, 100)`，不是 `limit / 200`。

    這裡改成 `Math.min(gameState.limit, 100)` 而不是
    `(gameState.limit / LIMIT_MAX) * 100`，LIMIT_MAX（200）本身維持不變
    （eatNiku() 那邊 clamp limit 上限、判斷 LimitOver 的邏輯都還是用
    200，只有這裡畫血條寬度的公式改掉）。
  */
  if (hudBarFillEl) {
    // limit 沒有下限，但畫面上的血條寬度不能是負的，這裡只在「顯示時」
    // clamp 到 0~100%，gameState.limit 本身的原始數值不受影響。
    const percent = Math.max(0, Math.min(100, gameState.limit));
    hudBarFillEl.style.width = `${percent}%`;
  }
}

/*
  computeEatResult 只負責「算出這一片肉吃掉之後的結果」，不直接修改
  gameState，方便之後如果要做「先預覽結果再確認」之類的功能時重用；
  真正套用結果、修改 gameState 與 niku 狀態的是下面的 eatNiku()。
*/
function computeEatResult(niku) {
  const a = Math.min(niku.oMode, niku.uMode);
  const b = Math.max(niku.oMode, niku.uMode);
  const rule = EAT_RULE_TABLE[`${a}-${b}`];

  if (rule.useSplus) {
    const newSplus = gameState.splus + 20;
    const plus = newSplus;
    const minus = 5 - plus;
    return { bubbleMode: rule.bubbleMode, plus, minus, nextSplus: newSplus };
  }

  return { bubbleMode: rule.bubbleMode, plus: rule.plus, minus: rule.minus, nextSplus: 0 };
}

function eatNiku(niku) {
  if (niku.eaten) {
    return; // 防呆：理論上 onBowl 判定只會觸發一次，但保留這道保護避免重複計分
  }

  const result = computeEatResult(niku);

  gameState.score += result.plus;
  gameState.limit = Math.min(LIMIT_MAX, gameState.limit + result.plus + result.minus);
  gameState.splus = result.nextSplus;
  gameState.nikucnt += 1;

  // 對應原版判斷式（換盤優先於血量歸零）：if(nikucnt==12) → 換盤；
  // else if(limit<=0) → LimitOver。用 if / else if 保留這個優先順序：
  // 如果這一片肉剛好同時讓 nikucnt 累加到 12、又讓 limit 掉到 0 以下，
  // 這一輪只會觸發換盤，不會直接進 LimitOver；要等下一輪再次呼叫
  // eatNiku() 檢查時，limit 仍然 <=0 才會真正觸發 LimitOver。
  if (gameState.nikucnt === 12) {
    spawnNewPlate();
    playSound("next"); // 對應原版換盤音效
    // 刻意在呼叫端播放，不放進 spawnNewPlate() 內部，因為 spawnNewPlate()
    // 也被 resetGameState()（剛開局生成第一輪 12 片肉）共用，原版換盤
    // 才會播這個音效，剛開局不會播。
  } else if (gameState.limit <= 0) {
    handleLimitOver();
  }

  niku.eaten = true;
  // 決策記錄：原版 DefineSprite_88/frame_8 這裡實際寫的是
  // `if("0" < PlusValue + Minusvalue)`（注意 Minusvalue 小寫 v，跟同段
  // 程式碼其他地方的 MinusValue 大寫 V 不一樣），AS2 變數名稱區分大小寫，
  // 這其實是個從未賦值過的變數，運算成 NaN，判斷恆為 false——也就是說
  // 原版真正發行的遊戲裡，Bonus 動畫／OK 音效實際上從來沒有觸發過，不管
  // 吃得多好都只播 Bad 音效。跟使用者確認後，決定不刻意重現這個原版 bug，
  // 維持下面這行數學正確的判斷式，吃對了才會有 Bonus 動畫。這是刻意的
  // 產品決策，不要因為之後又核對到原版程式碼、看到這個差異就把它「修」
  // 回原版的錯誤行為。
  const isGood = result.plus + result.minus > 0; // 對應原版「播 Bonus/OK 音效」還是「播 Bad 音效」的判斷條件
  niku.eatResult = {
    bubbleMode: result.bubbleMode,
    plusValue: result.plus,
    minusValue: result.minus,
    isGood,
  };

  updateHud();

  // 對應原版：fukidasi 台詞氣泡「每次吃掉都會跳出來」，不管吃對吃錯；
  // Bonus 加分彈出動畫則只有 isGood（這次吃對了）才會跳，吃錯的話原版
  // 只播 Bad 音效、不會有 Bonus 動畫。
  showFukidasi(result.bubbleMode);
  if (isGood) {
    showBonus(result.plus);
    playSound("ok"); // 對應原版 OK 音效
  } else {
    playSound("bad"); // 對應原版 Bad 音效
  }

  // 吃掉後讓肉片淡出再從畫面移除，而不是瞬間消失，玩家比較容易理解
  // 「這片肉是因為被吃掉才不見的」，跟拖到範圍外或誤操作區分開來。
  if (niku.el) {
    niku.el.classList.add("eaten-fade");
    const elToRemove = niku.el;
    setTimeout(() => {
      elToRemove.remove();
    }, 300);
    niku.el = null;
  }
}

const nikuLayer = document.querySelector("#nikuLayer");

/*
  renderNikuPiece 只負責「畫出一片肉、把 DOM 節點存回 niku.el」，之後想
  操作哪一片肉，直接從 nikus 陣列裡的那個 niku 物件拿 niku.el 即可。
*/
function renderNikuPiece(niku) {
  if (!nikuLayer) {
    return;
  }
  const pos = flashToStagePercent(niku.x, niku.y);
  const el = document.createElement("div");
  el.className = "niku-piece";
  el.dataset.nikuId = String(niku.id);
  el.dataset.face = niku.face;
  el.dataset.mode = String(niku.oMode); // 一開始顯示的是正面，所以用 oMode
  el.dataset.mNum = String(niku.mNum); // 材質種類 1~4，翻面不會變，這裡設一次就好
  el.style.left = `${pos.leftPercent}%`;
  el.style.top = `${pos.topPercent}%`;
  el.title = `第 ${niku.id} 片肉，可拖曳移動；放開時會翻面`;
  nikuLayer.appendChild(el);
  niku.el = el;
}

/*
  依「目前顯示中的那一面」更新色塊的 data-mode。
  omote 顯示 oMode，ura 顯示 uMode，這個函式集中負責這個對應關係，
  翻面（face 改變）或熟度變化（oMode/uMode 改變）都呼叫這個函式同步畫面。
*/
function updateNikuAppearance(niku) {
  if (!niku.el) {
    return;
  }
  niku.el.dataset.face = niku.face;
  niku.el.dataset.mode = String(niku.face === "omote" ? niku.oMode : niku.uMode);
}

const nikuDebug = document.querySelector("#nikuDebug");

/*
  除錯區塊只顯示「目前選取中的那一片肉」，不列出全部 12 片。
  selectedNiku 預設是 nikus[0]（第一片），點擊任何一片肉或對它翻面時，
  都會把 selectedNiku 換成那一片。
*/
let selectedNiku = null;

function renderNikuDebug(niku, countdownInfo) {
  if (!nikuDebug || !niku) {
    return;
  }
  const pos = flashToStagePercent(niku.x, niku.y);
  const lines = [
    `目前選取：第 ${niku.id} 片肉（共 ${nikus.length} 片，點任一片肉可切換選取對象）`,
    `x：${niku.x.toFixed(1)}（Flash 原始舞台座標，450x360px 基準）`,
    `y：${niku.y.toFixed(1)}（同上）`,
    `換算後畫面位置：left ${pos.leftPercent.toFixed(1)}% / top ${pos.topPercent.toFixed(1)}%（落在肉盤附近，見 assets_map.json 座標分析修正）`,
    `face：${niku.face}（omote=正面 / ura=背面，點擊畫面上的色塊或按鈕可以切換）`,
    `mNum：${niku.mNum}（材質種類 1~4，對應 niku_type${niku.mNum}.png，兩面共用不會因翻面改變）`,
    `oMode：${niku.oMode}（正面熟度 0~3；0生/1半/2焼/3焦）`,
    `uMode：${niku.uMode}（背面熟度 0~3，與 oMode 各自獨立）`,
    `eaten：${niku.eaten}`,
    `落在烤網上：${niku.onGrill ? "是" : "否"}（放開才會更新這個值）`,
    `落在醬料碗上：${niku.onBowl ? "是" : "否"}（放開才會更新這個值）`,
  ];
  if (countdownInfo) {
    lines.push(
      `自動熟成：目前作用中的是「${countdownInfo.faceLabel}」，${countdownInfo.statusText}`
    );
  }
  if (niku.eatResult) {
    lines.push(
      `吃掉結果：${niku.eatResult.isGood ? "吃對了（Bonus/OK）" : "吃錯了（Bad）"}，` +
        `加分 ${niku.eatResult.plusValue}，扣血 ${niku.eatResult.minusValue}，` +
        `原版 fukidasi Mode ${niku.eatResult.bubbleMode}`
    );
  }
  lines.push(
    "----",
    `全域狀態 → score：${gameState.score}｜limit（血量）：${gameState.limit}／${LIMIT_MAX}｜` +
      `splus（連續加分）：${gameState.splus}｜nikucnt（累計吃掉片數）：${gameState.nikucnt}`,
    `遊戲結束旗標 → isTimeOver（倒數歸零）：${gameState.isTimeOver}｜` +
      `isLimitOver（血量歸零）：${gameState.isLimitOver}（任一為 true，肉片都無法再拖曳／翻面）`
  );
  nikuDebug.textContent = lines.join("\n");
}

/*
  單片肉自動熟成。

  規則：
  1. 只有「目前顯示中的那一面」會隨時間自動 +1 熟度，上限 3（到 3 後停止）。
     沒有顯示的那一面（背面或正面）暫停計時，不會偷偷在背景累加。
  2. 每一片肉、每一面各自維護自己的剩餘倒數時間（niku.oRemainMs /
     niku.uRemainMs），翻面只是切換「現在要幫哪一面計時」。
  3. 用 100ms 為一個 tick 更新剩餘時間，真正升熟度的判斷是剩餘時間 <= 0
     才觸發。

  熟成間隔已對照原始 SWF 精算：檔頭 frame rate = 12fps，DefineSprite_88 的
  frame_3~7 是一輪 5-frame 迴圈（frame_7 結尾 gotoAndPlay(3)），OValue/UValue
  要跑滿 12 輪才讓 OMode/UMode 升一級，所以 12 輪 × 5 frame ÷ 12fps = 5.0 秒，
  是精確值，不是約略抓的，之後不要再改回 4 秒。
*/
const AUTO_COOK_INTERVAL_MS = 5000;
const AUTO_COOK_TICK_MS = 100;

/*
  熟成倒數改用真實時間差，修正 setInterval 漂移問題。

  問題背景：原本的寫法是「每個 tick 固定扣 AUTO_COOK_TICK_MS(100ms)」，
  這只在瀏覽器「準時」每 100ms 觸發一次 tick 時才準確。但 setInterval 只
  保證「至少」等這麼久才觸發，分頁切到背景、裝置效能不足時，實際間隔
  常常會被拉長（背景分頁甚至常被節流到 ≥1000ms 才觸發一次）。固定扣
  100ms 的寫法沒辦法追回這段被拉長的時間，於是肉實際變熟的速度會比畫面
  上的回合倒數（已經是用 Date.now() 真實時間差，不會漂移）慢，兩個計時
  器步調對不起來。

  修法：記錄「上一次 tick 的真實時間戳」，每次 tick 改用
  now - lastCookTickTime 算出真正經過了幾毫秒，再拿這個真實差值去扣
  remainMs，而不是固定扣 AUTO_COOK_TICK_MS。這樣即使某次 tick 被延遲或
  跳過幾次，下一次 tick 一次補回真實經過的時間，熟成速度就會跟畫面上的
  回合秒數維持一致的步調。

  另外用 while 迴圈取代原本的 if，是因為改用真實時間差之後，deltaMs 有
  可能一次很大（例如分頁被背景節流很久才醒來），單次扣減後 remainMs 可能
  一口氣變成負很多，代表這段時間裡其實應該連續升了不只一級熟度。用
  while 迴圈搭配「remainMs 用加回 AUTO_COOK_INTERVAL_MS 而不是重設成
  AUTO_COOK_INTERVAL_MS」，可以正確地把多算的時間也計入下一級的倒數，
  不會因為節流而讓玩家「賺到」原本該經過的熟成時間。
*/
let lastCookTickTime = Date.now();

function resetActiveCountdown(niku) {
  if (niku.face === "omote") {
    niku.oRemainMs = AUTO_COOK_INTERVAL_MS;
  } else {
    niku.uRemainMs = AUTO_COOK_INTERVAL_MS;
  }
}

/*
  自動熟成只在「肉片目前在烤網上」時才會進行，對應原版邏輯：只有放在
  烤網上的肉才會真的被烤（熟度才會變化），還在盤子上、或是被玩家拖到
  烤網以外地方的肉，應該維持生肉狀態，不會自己變熟。

  做法：把「要不要讓時間往下扣」這件事，改成先檢查 niku.onGrill 是不是
  true：
  - true（放開時落在烤網範圍內）：才繼續原本的倒數與升熟度邏輯。
  - false（一開始在盤子上、或被拖離烤網）：暫停倒數，remainMs 維持原地
    不動（不重置），這樣之後玩家又把這片肉放回烤網，會從離開烤網前剩下
    的秒數繼續倒數，而不是每次上下烤網都要重新等一輪完整的間隔。
*/
function tickDebugWithCountdown(niku) {
  if (niku !== selectedNiku) {
    return; // 只有目前選取中的那一片肉才需要更新除錯文字，其餘 11 片不用算
  }
  const isOmote = niku.face === "omote";
  // 正在被烤、倒數才會遞減的是隱藏面，不是畫面上顯示中的那一面，所以這裡
  // 也要取反面的 mode/remainMs，除錯文字才會跟實際自動升級的時機對得上。
  const cookingMode = isOmote ? niku.uMode : niku.oMode;
  const cookingRemainMs = isOmote ? niku.uRemainMs : niku.oRemainMs;

  let statusText;
  if (!niku.onGrill) {
    statusText = "目前不在烤網上（在盤子上或已被拖離烤網），維持生肉不會自動熟成";
  } else if (cookingMode >= 3) {
    statusText = "貼著烤網的那一面已經到最高熟度（焦），不再自動升級";
  } else {
    statusText = `貼著烤網的那一面，${(cookingRemainMs / 1000).toFixed(1)} 秒後自動升級到下一階段`;
  }

  renderNikuDebug(niku, {
    faceLabel: isOmote
      ? "顯示中：正面（oMode）／烤網上：背面（uMode）"
      : "顯示中：背面（uMode）／烤網上：正面（oMode）",
    statusText,
  });
}

/*
  翻面互動。

  原始 ActionScript 顯示，原版的翻面其實是「按下開始拖曳 → 放開時判斷
  落點」的一部分：放開當下一定會翻面（omote/ura 可見度互換），同時再
  判斷放開位置是否在烤網（冒煙特效）或醬料碗（進入吃掉流程）。也就是說，
  原版沒有獨立的「翻面鍵」，翻面是每次放開肉片時必然發生的動作，沒有
  額外的翻面冷卻時間限制。這裡用點擊模擬「放開時翻面」這個行為，加上
  簡單的 2D 壓扁動畫。
*/
function flipFace(niku) {
  if (niku.isFlipping) {
    return; // 避免同一片肉在極短時間內被重複觸發翻面
  }
  niku.isFlipping = true;

  // 使用者需求調整：翻面不要有中間經過壓扁／縮放的過渡動畫（看起來像在
  // 旋轉），改成直接把肉片水平翻轉過去——用 CSS scaleX(-1) 把整個色塊
  // 水平鏡像翻過去，沒有中間縮到接近 0 再放大的過程，也不需要在動畫途中
  // 用 setTimeout 卡時間點切換資料。
  niku.face = niku.face === "omote" ? "ura" : "omote";
  updateNikuAppearance(niku);
  if (niku.el) {
    niku.el.classList.toggle("flip-mirrored");
  }
  tickDebugWithCountdown(niku);

  niku.isFlipping = false;
}

/*
  十二片生成主流程。
  1. 建立 12 片肉（nikus 陣列），逐一 renderNikuPiece 畫到畫面上。
  2. 每片肉的色塊加上點擊事件：選取這一片（更新除錯區塊）＋觸發翻面。
  3. 預設選取第一片肉，讓除錯區塊一開始就有東西可看。
  4. 除錯區塊的「翻面」「熟度 +1」按鈕都是操作 selectedNiku，而不是寫死
     某一片肉，按鈕的行為會跟著玩家目前選取的對象走。

  座標是先建立完全部 12 個 niku 物件之後，統一呼叫
  assignNikuPositions(nikus) 產生（擺位規則本身核對原版後改回純隨機，
  會重疊，見上方 assignNikuPositions 的說明）。
*/
const NIKU_COUNT = 12;
const nikus = [];

for (let i = 1; i <= NIKU_COUNT; i += 1) {
  nikus.push(createNiku(i));
}

assignNikuPositions(nikus);

/*
  拖曳操作。

  對照原始 ActionScript（DefineButton2_87 on(press)/on(release)）：
  - on(press) 呼叫 startDrag，肉片跟著滑鼠移動。
  - on(release) 一定會翻面（omote/ura 可見度互換），同時再判斷放開位置
    是否在烤網或醬料碗。

  用 Pointer Events（pointerdown / pointermove / pointerup /
  pointercancel）實作對應行為，一套 API 同時涵蓋滑鼠與觸控：
  1. pointerdown：記錄「這片肉正在被拖曳」，並用 setPointerCapture
     讓後續的 pointermove/pointerup 事件即使指標移出元素範圍，也仍然會
     持續送到這個元素上。
  2. pointermove：只有在拖曳中才處理，即時把肉片畫面位置（left/top 百分比）
     設成跟著指標走，並限制在 0%~100% 之間，避免拖到舞台外面完全看不到。
  3. pointerup：結束拖曳，把最終畫面位置換算回 Flash 座標存回
     niku.x/niku.y（用 stagePercentToFlash），然後呼叫 flipFace(niku)——
     對應原版「放開一定會翻面」的規則。因為 flipFace 內部已經有
     isFlipping 防重複觸發的保護，這裡不需要額外處理。
  4. pointercancel（例如拖曳中瀏覽器手勢被系統中斷）：只重置拖曳狀態，
     不觸發翻面、也不更動座標，避免非預期的資料變動。

  快速點擊（幾乎沒有移動距離的按下＋放開）在這個實作下依然會正常觸發
  翻面，因為 pointerup 一律呼叫 flipFace，不需要額外判斷「這是點擊還是
  拖曳」。

  lockCenter 手感補正：核對 DefineButton2_87 on(press) 原始碼，
  `startDrag(_target,"1")` 第二個參數 "1" 是 lockCenter，代表按下的瞬間，
  肉片中心就要立刻貼到指標位置，不是等到第一次移動或放開才貼過去。
  這裡在 pointerdown 內、設定完 isDragging 等狀態之後，立刻呼叫一次
  moveTo(e.clientX, e.clientY)，讓肉片中心點在按下的當下就跳到指標
  位置，行為對齊 Flash `startDrag(_target, true)`。
  這裡不需要額外處理命中判定基準點：isPointOnGrill / isPointOnBowl
  用的都是 pointerup 當下換算出的 leftPercent/topPercent（即肉片中心點
  的畫面座標，因為 .niku-piece 用 transform: translate(-50%, -50%)
  讓 left/top 代表中心點，見 style.css），跟命中判定基準本來就是同一組
  數字，這裡的修改不會影響命中判定。
*/
function setupDragging(niku) {
  if (!niku.el || !stage) {
    return;
  }

  niku.isDragging = false;

  function moveTo(clientX, clientY) {
    const rect = stage.getBoundingClientRect();
    let leftPercent = ((clientX - rect.left) / rect.width) * 100;
    let topPercent = ((clientY - rect.top) / rect.height) * 100;
    leftPercent = Math.min(100, Math.max(0, leftPercent));
    topPercent = Math.min(100, Math.max(0, topPercent));
    niku.el.style.left = `${leftPercent}%`;
    niku.el.style.top = `${topPercent}%`;
    return { leftPercent, topPercent };
  }

  niku.el.addEventListener("pointerdown", (e) => {
    if (gameState.isTimeOver || gameState.isLimitOver) {
      // 倒數歸零或血量歸零後停止操作，對應原版行為：任一旗標為 true，
      // 玩家都不能再拖曳／翻面任何肉片。
      return;
    }
    e.preventDefault();
    niku.isDragging = true;
    selectedNiku = niku;
    niku.el.classList.add("dragging");
    niku.el.setPointerCapture(e.pointerId);
    // lockCenter——比照 Flash startDrag(_target, "1")，按下的瞬間肉片
    // 中心立刻貼到指標位置，不等第一次 pointermove 才對齊。
    moveTo(e.clientX, e.clientY);
  });

  niku.el.addEventListener("pointermove", (e) => {
    if (!niku.isDragging) {
      return;
    }
    moveTo(e.clientX, e.clientY);
  });

  niku.el.addEventListener("pointerup", (e) => {
    if (!niku.isDragging) {
      return;
    }
    niku.isDragging = false;
    niku.el.classList.remove("dragging");

    const { leftPercent, topPercent } = moveTo(e.clientX, e.clientY);
    const flashPos = stagePercentToFlash(leftPercent, topPercent);
    niku.x = flashPos.x;
    niku.y = flashPos.y;

    // 判斷放開位置是否落在烤網上，是的話播放視覺回饋。
    niku.onGrill = isPointOnGrill(leftPercent, topPercent);
    // 烤網上的肉塊要放大 1.5~2 倍（見 style.css .niku-piece.on-grill），
    // 放開時同步切換這個 class；如果放開時判定不在烤網上（拖回盤子或拖
    // 到其他地方），這裡會移除 class，肉塊縮回盤子上的基準尺寸。
    if (niku.el) {
      niku.el.classList.toggle("on-grill", niku.onGrill);
    }
    if (niku.onGrill) {
      spawnGrillSmoke(leftPercent, topPercent);
      playSound("smoke"); // 對應原版烤肉冒煙音效
    }

    // 判斷放開位置是否落在醬料碗上，兩個範圍不重疊（見上方 BOWL_BOUNDS
    // 註解），所以這裡直接各自獨立判斷即可，不需要 else if。
    niku.onBowl = isPointOnBowl(leftPercent, topPercent);
    if (niku.onBowl) {
      spawnSauceSplash(leftPercent, topPercent);
      flashOnBowlHighlight(niku);
      eatNiku(niku); // 落在醬料碗上才真正觸發計分/扣血與吃掉流程
    }

    // 對照原版 on(release) 原始碼確認：不管放開位置是烤網／醬料碗／其他，
    // 一律先無條件翻面，再才判斷 _droptarget 決定要冒煙、進吃掉流程、
    // 還是單純停在原地。這裡一律呼叫 flipFace，不分 niku.eaten。因為
    // eatNiku() 在這之前已經把 niku.el 設回 null（見 eatNiku() 尾端
    // 「淡出後移除」那段），flipFace 內部的 DOM 操作（classList.add/remove）
    // 都有 `if (niku.el)` 保護，會自動跳過，只有 niku.face／isFlipping
    // 這些純資料欄位還是會照原版邏輯翻動，不會造成任何畫面上的副作用。
    flipFace(niku); // 對應原版：放開一定會翻面，不分是否被吃掉
  });

  niku.el.addEventListener("pointercancel", () => {
    niku.isDragging = false;
    niku.el.classList.remove("dragging");
  });
}

nikus.forEach((niku) => {
  renderNikuPiece(niku);
  setupDragging(niku);
});

/*
  換盤流程。

  對應原版 frame_10 判斷式：nikucnt==12 時播換盤音效、換下一張盤子圖、
  回到 nikuinit 重新生成 12 片肉。舊的 nikus 陣列整個清空、重新建立 12
  個全新的 createNiku()（熟度重新從 0 開始、eaten 重新是 false），並
  重新呼叫 assignNikuPositions() 分配新的隨機擺位，跟生成初始 12 片肉
  用的是同一套邏輯。

  沒有清空 nikuLayer 的 innerHTML：呼叫這個函式的時機點（eatNiku() 裡，
  nikucnt 剛好累加到 12 的那一刻）最後一片被吃掉的肉，畫面上的 DOM 節點
  還在播放 300ms 的淡出動畫，只是 niku.el 這個參照已經（稍後）會被設成
  null——如果這裡強制清空 nikuLayer，會讓那個淡出動畫還沒播完就被直接
  砍斷，畫面上會看到肉片「消失」而不是「淡出」。改成完全不動 nikuLayer
  既有的子節點，讓舊節點自己的 setTimeout 自然移除，新的 12 片肉節點
  只是額外 append 進去，兩邊互不干擾。

  gameState.nikucnt 歸零，但 score／limit／splus 都不受影響，繼續累計
  ——換盤只是「換一輪新的生肉」，不是重新開局。

  美術素材部分（2026-08-07 補上）：原版換盤時，`/sara` 這個盤子元件會
  用 `nextFrame()` 逐格往下切換外觀（見 BBQ_flash/shapes 抽出的
  sara_f1.png ~ sara_f10.png，肉眼比對是「盤子底下疊的盤子數量」逐格
  增加、frame_1 只有一張、frame_10 疊到最多，沒有再往回繞的跡象，
  對照反編譯結果：sara 這個 sprite 只查得到 frame_1 的 DoAction，其餘
  frame 都是純圖形格，沒有任何會把它跳回 frame_1 的邏輯，因此判斷是
  「疊到最後一格（frame_10）後續換盤 nextFrame() 在 Flash 裡本來就會
  停在最後一格，不會自動繞回去」，不是原本以為「找不到對應素材」，
  而是先前的分析階段還沒抽出這批圖檔）。

  這裡改成真的切換 sara_f{1~10}.png，搭配 plateFrameIndex 這個模組
  變數紀錄目前格數：
  - 初始值 1，對應畫面一開始（index.html 已經把預設 src 換成
    sara_f1.png）；
  - 每次「吃滿 12 片換盤」呼叫 spawnNewPlate() 時 +1，超過 10 就夾住
    在 10（對應 Flash nextFrame() 到底格不會再往前的行為）；
  - resetGameState()（開始新局／もう一度重新開始）呼叫的
    resetPlateFrame() 會把它重置回 1，讓新的一局從乾淨的單張盤子
    開始，這是延續專案裡「新局視覺重置」的既有取捨（跟熟度、擺位等
    其他每局都重來的欄位一致），原始 SWF 是否真的每局都會重置沒有
    足夠證據，但這個選擇不影響任何計分規則，維持畫面乾淨可預期優先。

  .plate-changed 這個 CSS 縮放回彈動畫繼續保留，現在變成「真的換了
  一張圖」+「加一個回彈動畫」雙重視覺回饋，比原本單純同一張圖再放大
  更接近原版換盤瞬間的感覺。
*/
const plateImgEl = document.querySelector(".plate-img");
const PLATE_FRAME_COUNT = 10; // sara_f1.png ~ sara_f10.png，對應 sara sprite 總格數
let plateFrameIndex = 1;

function updatePlateImage() {
  if (!plateImgEl) {
    return;
  }
  plateImgEl.src = `./assets/images/sara_f${plateFrameIndex}.png`;
}

function resetPlateFrame() {
  // 對應原版一局重新開始時的乾淨畫面，見上方大註解的取捨說明。
  // 這裡故意設成 0、不是 1：resetGameState() 呼叫完這個函式後緊接著
  // 會呼叫 spawnNewPlate()，而 spawnNewPlate() 內部一定會先 +1 才更新
  // 畫面（對應「換盤」這個動作本身），設成 0 才能讓那次 +1 剛好落在
  // 1，顯示乾淨的單張盤子，而不是誤跳到 2。這裡不主動呼叫
  // updatePlateImage()，圖片會在 spawnNewPlate() 那次 +1 之後才更新，
  // 避免中間出現一個不存在的 sara_f0.png 短暫請求。
  plateFrameIndex = 0;
}

function spawnNewPlate() {
  nikus.length = 0; // 清空陣列本身（保留同一個 const 陣列參照，不整個重新賦值）
  for (let i = 1; i <= NIKU_COUNT; i += 1) {
    nikus.push(createNiku(i));
  }
  assignNikuPositions(nikus);
  nikus.forEach((niku) => {
    renderNikuPiece(niku);
    setupDragging(niku);
  });

  gameState.nikucnt = 0;

  selectedNiku = nikus.length > 0 ? nikus[0] : null;
  renderNikuDebug(selectedNiku);

  // 對應原版 nextFrame()：往下切一格，超過最後一格（10）就停在原地，
  // 不會自動繞回 frame_1（見上方大註解）。
  plateFrameIndex = Math.min(PLATE_FRAME_COUNT, plateFrameIndex + 1);
  updatePlateImage();

  if (plateImgEl) {
    plateImgEl.classList.remove("plate-changed");
    void plateImgEl.offsetWidth; // 強制 reflow，確保能重新觸發動畫
    plateImgEl.classList.add("plate-changed");
  }
}

/*
  resetGameState()，對應原版兩個 frame 合起來做的初始化，在標題頁
  「食べる」開始鈕被按下時觸發：
  - score/splus/limit 歸零重設（limit 是設回初始值 70，不是歸零，跟
    score/splus 的「歸零」不一樣）。
  - nikucnt 歸零、12 片肉重新隨機擺位（也就是重新走一次「生成 12 片
    新肉」的流程）。

  「12 片肉重新生成＋隨機擺位＋nikucnt 歸零」這部分，跟換盤
  spawnNewPlate() 要做的事完全一樣（spawnNewPlate() 本來就是照這個
  邏輯寫的），所以直接重用 spawnNewPlate()，不重複寫一份幾乎一樣的
  程式碼；差別只在於 resetGameState() 這裡還要多做 spawnNewPlate()
  不會處理的部分：
  1. score/splus 歸零、limit 設回初始值 70（spawnNewPlate() 刻意不動
     這三個值，因為「換盤」跟「重新開始」是不同情境）。
  2. isTimeOver/isLimitOver 兩個旗標歸位成 false，讓 setupDragging()
     裡的 pointerdown 判斷式重新放行操作。
  3. timeOverTriggered 歸位成 false、gameStartTime 重置回 null，避免
     沿用上一輪已經跑到底的計時旗標（startGameTimer() 呼叫時其實也會
     做這兩件事，但這裡先重置一次，確保呼叫 resetGameState() 之後、
     下一次 startGameTimer() 還沒被呼叫之前的這段空窗期，狀態也是
     乾淨的）。
  4. hudTimerEl 文字重設回初始秒數顯示，不等下一個 tick 才更新（避免
     畫面短暫閃過上一輪結束時的秒數，例如「0秒」）。
  5. #limitOverScreen／#timeOverScreen 的 hidden 屬性跟 is-visible
     class 都重置回初始狀態，理由跟 showTitleScreen() 裡同一段重置
     完全一樣（見那邊的註解），這裡重複做一次是為了保險：萬一
     resetGameState() 未來被其他呼叫路徑單獨呼叫（不是透過
     showTitleScreen() 那條路徑），也不會漏掉這一步。
*/
/*
  Bug 修正（2026-08-07，使用者回報）：「修正新局的時候，上一次烤網上的
  肉片沒有清除的問題」。

  問題根源：spawnNewPlate() 本身故意不清空 nikuLayer 的既有子節點（見上
  方註解），理由是「吃滿 12 片觸發換盤」這個情境下，最後一片被吃掉的
  肉還在播放 300ms 淡出動畫，強制清空會讓動畫被硬生生打斷。但
  resetGameState()（標題頁「食べる」開始鈕、或結局畫面「もう一度」
  重新開始鈕觸發）呼叫 spawnNewPlate() 時，情境完全不同：如果上一局是
  因為 LimitOver／TimeOver 結束、而不是「12 片全部吃完」結束，畫面上會
  有肉片還留在烤網（或盤子）上、根本沒有觸發淡出動畫、niku.el 也沒有被
  設成 null——這些 DOM 節點會一路留在 #nikuLayer 底下，只是因為
  setEndingMode(true) 把整個 .niku-layer 設成 display:none 而暫時看不到。
  等這次 resetGameState() 呼叫 setEndingMode(false) 讓 .niku-layer 重新
  顯示、又呼叫 spawnNewPlate() append 新的 12 片肉進去時，舊的、沒被吃完
  的肉片節點就會跟新的 12 片肉一起出現在畫面上，看起來像「上一次烤網上
  的肉片沒有清除」。

  修法：resetGameState() 是「真正重新開始一局」的情境，不像 spawnNewPlate()
  在「吃滿 12 片換盤」時那樣需要保留最後一片的淡出動畫（此時遊戲已經
  結束，沒有動畫需要保留），所以這裡直接把 nikuLayer 清空，確保新局
  開始時 #nikuLayer 底下不會有任何上一局殘留的肉片 DOM 節點，再呼叫
  spawnNewPlate() 生成乾淨的全新 12 片。
*/
function resetGameState() {
  gameState.score = 0;
  gameState.splus = 0;
  gameState.limit = 70; // 對應原版初始值，不是 0
  gameState.isTimeOver = false;
  gameState.isLimitOver = false;

  timeOverTriggered = false;
  gameStartTime = null;
  setEndingMode(false);
  resetEndingTransientUi();

  if (nikuLayer) {
    nikuLayer.innerHTML = ""; // 清掉上一局殘留（尚未吃完）的肉片節點，見上方說明
  }
  resetPlateFrame(); // 盤子格數歸零，讓下面 spawnNewPlate() 的 +1 落在 sara_f1（見該函式註解）
  spawnNewPlate(); // nikucnt 歸零、12 片肉重新生成＋隨機擺位（順便把盤子圖切到 sara_f1）

  updateHud();
  if (hudTimerEl) {
    hudTimerEl.textContent = `${GAME_DURATION_MS / 1000}秒`;
  }

  if (limitOverScreenEl) {
    limitOverScreenEl.classList.remove("is-visible");
    limitOverScreenEl.hidden = true;
  }
  if (timeOverScreenEl) {
    timeOverScreenEl.classList.remove("is-visible");
    timeOverScreenEl.hidden = true;
  }
}

if (nikus.length > 0) {
  selectedNiku = nikus[0];
  renderNikuDebug(selectedNiku);
}

updateHud(); // 套用初始值（score 0 / limit 70）到 HUD

const btnFlip = document.querySelector("#btnFlip");
if (btnFlip) {
  btnFlip.addEventListener("click", () => {
    if (selectedNiku) {
      flipFace(selectedNiku);
    }
  });
}

const btnModeUp = document.querySelector("#btnModeUp");
if (btnModeUp) {
  btnModeUp.addEventListener("click", () => {
    if (!selectedNiku) {
      return;
    }
    if (selectedNiku.face === "omote") {
      if (selectedNiku.oMode < 3) {
        selectedNiku.oMode += 1;
      }
    } else {
      if (selectedNiku.uMode < 3) {
        selectedNiku.uMode += 1;
      }
    }
    updateNikuAppearance(selectedNiku);
    // 手動加熟度後，把「目前這一面」的自動熟成倒數重新計滿，
    // 避免手動點完馬上又自動跳一次，讓測試時的時間感比較合理。
    resetActiveCountdown(selectedNiku);
    tickDebugWithCountdown(selectedNiku);
  });
}

/*
  自動熟成計時器，一次迴圈處理 12 片肉。
  每 100ms 這個 tick 會走過 nikus 陣列裡的每一片肉，各自判斷「目前顯示中
  的那一面」是否需要升熟度，彼此的 oRemainMs/uRemainMs 完全獨立、互不影響。
  只有 selectedNiku 需要更新除錯文字（tickDebugWithCountdown 內部已經做了
  這個判斷），其餘肉片只更新畫面外觀，不用重算除錯文字，節省一點運算。

  只有目前判定「在烤網上」的肉才會倒數升熟度，還在盤子上、或已經被拖離
  烤網的肉，維持生肉（或當時的熟度）不會繼續變化。已經被吃掉的肉
  （niku.eaten）也順便跳過，反正它已經沒有畫面元素了。
*/
setInterval(() => {
  updateGameTimer(); // 每個 tick 都用真實毫秒時間重新算一次剩餘秒數

  // 用「真實經過的毫秒數」取代固定扣 AUTO_COOK_TICK_MS，避免 setInterval
  // 被瀏覽器延遲/節流時熟成速度變慢。
  const now = Date.now();
  const deltaMs = now - lastCookTickTime;
  lastCookTickTime = now;

  nikus.forEach((niku) => {
    if (niku.eaten || !niku.onGrill) {
      return; // 不在烤網上：暫停倒數，remainMs 維持不變，之後放回烤網會接續倒數
    }

    const isOmote = niku.face === "omote";
    // 原始 AS3 邏輯：omote 顯示中累加的是 UValue/UMode，方向跟直覺相反
    // ——因為畫面朝上的那一面沒有貼著烤網，真正被烤、會變熟的是「目前
    // 看不到」的那一面。所以這裡故意取反面的 mode/remainMs，不是
    // isOmote ? o... : u...。

    // 已經燒到最焦（3）就不用再倒數，維持原地不動即可。
    if (isOmote) {
      if (niku.uMode < 3) {
        niku.uRemainMs -= deltaMs;
        // 用 while + 累加回 AUTO_COOK_INTERVAL_MS（而非重設成
        // AUTO_COOK_INTERVAL_MS），正確處理 deltaMs 一次很大、連跳多級
        // 熟度的情況（例如分頁被背景節流很久才醒來）。
        while (niku.uRemainMs <= 0 && niku.uMode < 3) {
          niku.uMode += 1;
          niku.uRemainMs += AUTO_COOK_INTERVAL_MS;
          updateNikuAppearance(niku);
        }
      }
    } else {
      if (niku.oMode < 3) {
        niku.oRemainMs -= deltaMs;
        while (niku.oRemainMs <= 0 && niku.oMode < 3) {
          niku.oMode += 1;
          niku.oRemainMs += AUTO_COOK_INTERVAL_MS;
          updateNikuAppearance(niku);
        }
      }
    }

    tickDebugWithCountdown(niku);
  });
}, AUTO_COOK_TICK_MS);
