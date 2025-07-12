// --- 遊戲參數 ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const resultDiv = document.getElementById('result');
const restartBtn = document.getElementById('restartBtn');

const showDescBtn = document.getElementById('showDescBtn');
const descDiv = document.getElementById('desc');
const closeDescBtn = document.getElementById('closeDescBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const loadingProgress = document.getElementById('loadingProgress');

// 音效
const throwSound = new Audio('sound/01.wav');
throwSound.volume = 0.3; // 設置音量為30%
const normalThrowSound = new Audio('sound/02.wav');
normalThrowSound.volume = 0.3; // 設置音量為30%
const hitSound = new Audio('sound/03.wav');
hitSound.volume = 0.4; // 設置音量為40%
const deathSound = new Audio('sound/04.wav');
deathSound.volume = 0.5; // 設置音量為50%
const levelStartSound = new Audio('sound/05.wav');
levelStartSound.volume = 0.6; // 設置音量為60%

// 播放投擲音效函數
function playThrowSound(isFullPower = false) {
  try {
    const soundToPlay = isFullPower ? throwSound : normalThrowSound;
    // 重置音效到開始位置
    soundToPlay.currentTime = 0;
    // 播放音效
    soundToPlay.play().catch(e => {
      // 如果播放失敗，靜默處理（避免控制台錯誤）
      console.log('音效播放失敗:', e);
    });
  } catch (e) {
    // 如果音效播放出現錯誤，靜默處理
    console.log('音效播放錯誤:', e);
  }
}

// 播放被擊中音效函數
function playHitSound() {
  try {
    // 重置音效到開始位置
    hitSound.currentTime = 0;
    // 播放音效
    hitSound.play().catch(e => {
      // 如果播放失敗，靜默處理（避免控制台錯誤）
      console.log('被擊中音效播放失敗:', e);
    });
  } catch (e) {
    // 如果音效播放出現錯誤，靜默處理
    console.log('被擊中音效播放錯誤:', e);
  }
}

// 播放死亡音效函數
function playDeathSound() {
  try {
    // 重置音效到開始位置
    deathSound.currentTime = 0;
    // 播放音效
    deathSound.play().catch(e => {
      // 如果播放失敗，靜默處理（避免控制台錯誤）
      console.log('死亡音效播放失敗:', e);
    });
  } catch (e) {
    // 如果音效播放出現錯誤，靜默處理
    console.log('死亡音效播放錯誤:', e);
  }
}

// 播放新關卡開始音效函數
function playLevelStartSound() {
  try {
    // 重置音效到開始位置
    levelStartSound.currentTime = 0;
    // 播放音效
    levelStartSound.play().catch(e => {
      // 如果播放失敗，靜默處理（避免控制台錯誤）
      console.log('新關卡音效播放失敗:', e);
    });
  } catch (e) {
    // 如果音效播放出現錯誤，靜默處理
    console.log('新關卡音效播放錯誤:', e);
  }
}

const PLAYER_RADIUS = 26;
const ENEMY_RADIUS = 26;
const SNOWBALL_RADIUS = 10;
const PLAYER_COUNT = 3;
const ENEMY_START_COUNT = 3;
const ENEMY_ADD_PER_LEVEL = 2;
const PLAYER_MAX_HP = 2;
const ENEMY_MAX_HP = 3;
const STUN_DURATION = 1000; // ms
const ENEMY_THROW_INTERVAL_MIN = 2000; // ms
const ENEMY_THROW_INTERVAL_MAX = 5000; // ms
const ENEMY_THROW_RANGE = 500;
const PLAYER_THROW_RANGE = 600;
const SNOWBALL_BASE_SPEED = 5;
const SNOWBALL_MAX_SPEED = 12;
const CHARGE_TIME = 1000; // ms
// 雪球最大/最小飛行距離 - 動態計算
let MIN_THROW_DISTANCE = 40;
let MAX_THROW_DISTANCE = 600;

// --- 狀態 ---
let level = 1;
let score = 0;
let players = [];
let enemies = [];
let snowballs = [];
let gameState = 'showGreeting'; // 初始狀態改為 showGreeting
let charging = false;
let chargeStart = 0;
let selectedPlayer = null;
let lastFrameTime = 0;
let draggingPlayer = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
// 新增：關卡顯示用
let showLevelText = false;
let showLevelTextValue = 1;
let showLevelTextUntil = 0;
let showGreetingUntil = 0;

// 圖片載入狀態追蹤
let imagesLoaded = 0;
let totalImages = 12;
let imagesReady = false;

// 在檔案開頭加載圖片
const enemyCrouchImg = new Image();
enemyCrouchImg.src = 'img/crouch.png';
const enemyPrepareImg = new Image();
enemyPrepareImg.src = 'img/prepare.png';
const enemyStandupImg = new Image();
enemyStandupImg.src = 'img/standup.png';
const enemyThrowImg = new Image();
enemyThrowImg.src = 'img/throw.png';
const enemyWalk1Img = new Image();
enemyWalk1Img.src = 'img/walk1.png';
const enemyWalk2Img = new Image();
enemyWalk2Img.src = 'img/walk2.png';
const enemyDeadImg = new Image();
enemyDeadImg.src = 'img/dead.png';
const enemyPainImg = new Image();
enemyPainImg.src = 'img/pain.png';
const enemyFallImg = new Image();
enemyFallImg.src = 'img/fall.png';
const playerPrepareImg = new Image();
playerPrepareImg.src = 'img/player_prepare.png';
const playerIdleImg = new Image();
playerIdleImg.src = 'img/player.png';
const playerDeadImg = new Image();
playerDeadImg.src = 'img/player_idle.png';

// 圖片載入處理函數
function handleImageLoad() {
  imagesLoaded++;
  console.log(`圖片載入進度: ${imagesLoaded}/${totalImages}`);
  
  // 更新載入進度顯示
  if (loadingProgress) {
    loadingProgress.textContent = `圖片載入中... ${imagesLoaded}/${totalImages}`;
  }
  
  if (imagesLoaded >= totalImages) {
    imagesReady = true;
    console.log('所有圖片載入完成');
    
    // 隱藏載入指示器
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
  }
}

function handleImageError(img, name) {
  console.error(`圖片載入失敗: ${name}`);
  imagesLoaded++;
  if (imagesLoaded >= totalImages) {
    imagesReady = true;
    console.log('圖片載入完成（部分失敗）');
  }
}

// 為所有圖片添加載入事件
[enemyCrouchImg, enemyPrepareImg, enemyStandupImg, enemyThrowImg, enemyWalk1Img, 
 enemyWalk2Img, enemyDeadImg, enemyPainImg, enemyFallImg, playerPrepareImg, 
 playerIdleImg, playerDeadImg].forEach((img, index) => {
  const names = ['enemyCrouch', 'enemyPrepare', 'enemyStandup', 'enemyThrow', 'enemyWalk1',
                 'enemyWalk2', 'enemyDead', 'enemyPain', 'enemyFall', 'playerPrepare',
                 'playerIdle', 'playerDead'];
  img.onload = handleImageLoad;
  img.onerror = () => handleImageError(img, names[index]);
});

// 響應式縮放參數
let BASE_WIDTH = 960;
let BASE_HEIGHT = 540;
let scale = 1;

// 檢測是否為手機版
function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
         window.innerWidth <= 768 || 'ontouchstart' in window;
}

function resizeCanvas() {
  try {
    console.log('開始調整Canvas尺寸');
    console.log('視窗尺寸:', window.innerWidth, 'x', window.innerHeight);
    console.log('設備像素比:', window.devicePixelRatio);
    
    // 大畫面16:9模式，確保不超出視窗
    let w = window.innerWidth;
    let h = window.innerHeight;
    
    // 檢測是否為手機版
    const isMobileDevice = isMobile();
    console.log('是否為手機設備:', isMobileDevice);
    
    // 手機版預留UI空間，電腦版充分利用螢幕
    let availableH = isMobileDevice ? h - 100 : h;
    
    // 手機版：優先考慮高度，確保遊戲可見
    if (isMobileDevice) {
      // 手機版以高度為準，確保遊戲內容可見
      let targetH = availableH;
      let targetW = targetH * 16 / 9;
      
      // 如果寬度超出螢幕，則以寬度為準
      if (targetW > w) {
        targetW = w;
        targetH = targetW * 9 / 16;
      }
      
      console.log('手機版目標尺寸:', targetW, 'x', targetH);
      
      canvas.width = Math.round(targetW * window.devicePixelRatio);
      canvas.height = Math.round(targetH * window.devicePixelRatio);
      canvas.style.width = targetW + 'px';
      canvas.style.height = targetH + 'px';
      
      // 計算縮放比例
      scale = targetW / BASE_WIDTH;
      ctx.setTransform(window.devicePixelRatio * scale, 0, 0, window.devicePixelRatio * scale, 0, 0);
      
      // 更新投擲距離限制
      MIN_THROW_DISTANCE = 40 * scale;
      MAX_THROW_DISTANCE = Math.min(targetW, targetH) * 1.5;
    } else {
      // 電腦版邏輯保持不變
      let targetW = Math.min(w, BASE_WIDTH);
      let targetH = targetW * 9 / 16;
      
      if (targetH > availableH) {
        targetH = availableH;
        targetW = targetH * 16 / 9;
      }
      
      if (targetW < w) {
        let maxW = w;
        let maxH = availableH;
        let scaleByWidth = maxW / BASE_WIDTH;
        let scaleByHeight = maxH / BASE_HEIGHT;
        let maxScale = Math.min(scaleByWidth, scaleByHeight);
        
        targetW = BASE_WIDTH * maxScale;
        targetH = BASE_HEIGHT * maxScale;
      }
      
      console.log('電腦版目標尺寸:', targetW, 'x', targetH);
      
      canvas.width = Math.round(targetW * window.devicePixelRatio);
      canvas.height = Math.round(targetH * window.devicePixelRatio);
      canvas.style.width = targetW + 'px';
      canvas.style.height = targetH + 'px';
      
      scale = targetW / BASE_WIDTH;
      ctx.setTransform(window.devicePixelRatio * scale, 0, 0, window.devicePixelRatio * scale, 0, 0);
      
      MIN_THROW_DISTANCE = 40 * scale;
      MAX_THROW_DISTANCE = Math.min(targetW, targetH) * 1.5;
    }
    
    console.log('Canvas實際尺寸:', canvas.width, 'x', canvas.height);
    console.log('Canvas顯示尺寸:', canvas.style.width, 'x', canvas.style.height);
    console.log('縮放比例:', scale);
    
  } catch (error) {
    console.error('調整Canvas尺寸時發生錯誤:', error);
    // 使用預設尺寸作為備用
    canvas.width = 960;
    canvas.height = 540;
    canvas.style.width = '960px';
    canvas.style.height = '540px';
    scale = 1;
  }
}

// 確保在視窗調整時重新計算尺寸
window.addEventListener('resize', () => {
  console.log('視窗大小改變，重新調整Canvas');
  resizeCanvas();
});

// 初始化時調整Canvas
resizeCanvas();

function resetGame() {
  level = 1;
  score = 0;
  // 新增：顯示開場祝福一秒
  showGreetingUntil = performance.now() + 1000;
  gameState = 'showGreeting';
  resultDiv.textContent = '';
  restartBtn.style.display = 'none';
  // 確保畫布尺寸正確
  resizeCanvas();
}

function startLevel() {
  // 播放新關卡開始音效（跳過第一關，因為第一關開始時不需要音效）
  if (level > 1) {
    playLevelStartSound();
  }
  
  // 玩家 - 調整位置適應16:9大畫面
  const canvasWidth = canvas.width / window.devicePixelRatio / scale;
  const canvasHeight = canvas.height / window.devicePixelRatio / scale;
  
  players = [
    { x: canvasWidth * 0.75, y: canvasHeight * 0.7, hp: PLAYER_MAX_HP, alive: true, stunUntil: 0, charging: false, charge: 0, id: 0, deadState: false, deadTime: 0 },
    { x: canvasWidth * 0.85, y: canvasHeight * 0.75, hp: PLAYER_MAX_HP, alive: true, stunUntil: 0, charging: false, charge: 0, id: 1, deadState: false, deadTime: 0 },
    { x: canvasWidth * 0.8, y: canvasHeight * 0.85, hp: PLAYER_MAX_HP, alive: true, stunUntil: 0, charging: false, charge: 0, id: 2, deadState: false, deadTime: 0 }
  ];
  // 敵人
  enemies = [];
  let enemyCount = ENEMY_START_COUNT + (level - 1) * ENEMY_ADD_PER_LEVEL;
  for (let i = 0; i < enemyCount; i++) {
    // 讓敵人分布在左上角區域，避免重疊
    let baseX = canvasWidth * 0.1 + (i % 3) * (canvasWidth * 0.15);
    let baseY = canvasHeight * 0.15 + Math.floor(i / 3) * (canvasHeight * 0.15);
    
    // 生成初始目標位置
    const initialTarget = generateBoundaryTarget(canvasWidth, canvasHeight);
    
    enemies.push({
      x: baseX,
      y: baseY,
      hp: ENEMY_MAX_HP,
      alive: true,
      stunUntil: 0,
      lastThrow: 0,
      nextThrow: randomThrowInterval(),
      id: i,
      moveOffset: Math.random() * 1000,
      moveDir: Math.random() < 0.5 ? -1 : 1,
      throwState: 'idle',
      throwStateUntil: 0,
      walkFrame: 0,
      deadTime: 0, // 新增
      deadState: false, // 新增
      chargeStart: 0, // 新增
      // 新增：移動到邊界的相關屬性
      targetX: initialTarget.x,
      targetY: initialTarget.y,
      moveSpeed: 0.5 + Math.random() * 0.5, // 移動速度 0.5-1.0
      lastTargetChange: 0,
      targetChangeInterval: 3000 + Math.random() * 2000 // 3-5秒改變一次目標
    });
  }
  snowballs = [];
  gameState = 'playing';
  updateInfo();
}

// 不播放音效的關卡開始函數
function startLevelWithoutSound() {
  // 玩家 - 調整位置適應16:9大畫面
  const canvasWidth = canvas.width / window.devicePixelRatio / scale;
  const canvasHeight = canvas.height / window.devicePixelRatio / scale;
  
  players = [
    { x: canvasWidth * 0.75, y: canvasHeight * 0.7, hp: PLAYER_MAX_HP, alive: true, stunUntil: 0, charging: false, charge: 0, id: 0, deadState: false, deadTime: 0 },
    { x: canvasWidth * 0.85, y: canvasHeight * 0.75, hp: PLAYER_MAX_HP, alive: true, stunUntil: 0, charging: false, charge: 0, id: 1, deadState: false, deadTime: 0 },
    { x: canvasWidth * 0.8, y: canvasHeight * 0.85, hp: PLAYER_MAX_HP, alive: true, stunUntil: 0, charging: false, charge: 0, id: 2, deadState: false, deadTime: 0 }
  ];
  // 敵人
  enemies = [];
  let enemyCount = ENEMY_START_COUNT + (level - 1) * ENEMY_ADD_PER_LEVEL;
  for (let i = 0; i < enemyCount; i++) {
    // 讓敵人分布在左上角區域，避免重疊
    let baseX = canvasWidth * 0.1 + (i % 3) * (canvasWidth * 0.15);
    let baseY = canvasHeight * 0.15 + Math.floor(i / 3) * (canvasHeight * 0.15);
    
    // 生成初始目標位置
    const initialTarget = generateBoundaryTarget(canvasWidth, canvasHeight);
    
    enemies.push({
      x: baseX,
      y: baseY,
      hp: ENEMY_MAX_HP,
      alive: true,
      stunUntil: 0,
      lastThrow: 0,
      nextThrow: randomThrowInterval(),
      id: i,
      moveOffset: Math.random() * 1000,
      moveDir: Math.random() < 0.5 ? -1 : 1,
      throwState: 'idle',
      throwStateUntil: 0,
      walkFrame: 0,
      deadTime: 0, // 新增
      deadState: false, // 新增
      chargeStart: 0, // 新增
      // 新增：移動到邊界的相關屬性
      targetX: initialTarget.x,
      targetY: initialTarget.y,
      moveSpeed: 0.5 + Math.random() * 0.5, // 移動速度 0.5-1.0
      lastTargetChange: 0,
      targetChangeInterval: 3000 + Math.random() * 2000 // 3-5秒改變一次目標
    });
  }
  snowballs = [];
  gameState = 'playing';
  updateInfo();
}

function updateInfo() {
  // UI元素已移除，此函數不再需要更新UI
}

// --- 新增：美化角色繪製 ---
function drawPlayerSprite(p, color) {
  ctx.save();
  ctx.translate(p.x, p.y);
  const offsetX = -35;  // 與集氣圈一致，讓玩家貼圖中心正確
  const offsetY = -12;  // 向下偏移
  
  // 屍體狀態顯示貼圖 - 優先檢查
  if (p.deadState) {
    if (playerDeadImg.complete && playerDeadImg.naturalWidth) {
      const targetH = 64;
      const scale = targetH / playerDeadImg.naturalHeight;
      const targetW = playerDeadImg.naturalWidth * scale;
      ctx.drawImage(playerDeadImg, -targetW/2 + offsetX, -targetH/2 + offsetY, targetW, targetH);
      ctx.restore();
      return;
    }
  }
  
  // 準備丟狀態顯示貼圖
  if (p.charging && charging && selectedPlayer === p && p.alive) {
    if (playerPrepareImg.complete && playerPrepareImg.naturalWidth) {
      const targetH = 64;
      const scale = targetH / playerPrepareImg.naturalHeight;
      const targetW = playerPrepareImg.naturalWidth * scale;
      ctx.drawImage(playerPrepareImg, -targetW/2 + offsetX, -targetH/2 + offsetY, targetW, targetH);
      ctx.restore();
      return;
    }
  }
  // 平常狀態顯示貼圖
  if (!p.charging && p.alive && !p.deadState) {
    if (playerIdleImg.complete && playerIdleImg.naturalWidth) {
      const targetH = 64;
      const scale = targetH / playerIdleImg.naturalHeight;
      const targetW = playerIdleImg.naturalWidth * scale;
      ctx.drawImage(playerIdleImg, -targetW/2 + offsetX, -targetH/2 + offsetY, targetW, targetH);
      ctx.restore();
      return;
    }
  }
  // 陰影
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.ellipse(0, 28, 18, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#888";
  ctx.fill();
  ctx.globalAlpha = 1;
  // 身體
  ctx.beginPath();
  ctx.arc(0, 10, 18, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  // 頭
  ctx.beginPath();
  ctx.arc(0, -10, 13, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  // 帽子
  ctx.beginPath();
  ctx.arc(0, -18, 13, Math.PI, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  // 腳
  ctx.beginPath();
  ctx.ellipse(-8, 28, 5, 8, 0, 0, Math.PI * 2);
  ctx.ellipse(8, 28, 5, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#36c";
  ctx.fill();
  ctx.restore();
}

function drawEnemySprite(e, color, throwState = 'idle') {
  ctx.save();
  // 狀態參數
  let bodyY = 10, bodyR = 18, headY = -10, headR = 13;
  // 貼圖繪製輔助函式
  function drawCenteredImage(img) {
    if (!img.complete || !img.naturalWidth) return; // 圖片未載入完成不畫
    const targetH = 64;
    const scale = targetH / img.naturalHeight;
    const targetW = img.naturalWidth * scale;
    ctx.translate(e.x, e.y);
    ctx.drawImage(img, -targetW/2, -targetH/2, targetW, targetH);
    ctx.restore();
  }
  if (throwState === 'crouch') {
    drawCenteredImage(enemyCrouchImg);
    return;
  }
  if (throwState === 'prepare') {
    drawCenteredImage(enemyPrepareImg);
    return;
  }
  if (throwState === 'standup') {
    drawCenteredImage(enemyStandupImg);
    return;
  }
  if (throwState === 'throw') {
    drawCenteredImage(enemyThrowImg);
    return;
  }
  if (throwState === 'idle') {
    // 行走動畫
    if (e.walkFrame === 0) {
      drawCenteredImage(enemyWalk1Img);
    } else {
      drawCenteredImage(enemyWalk2Img);
    }
    return;
  }
  if (e.deadState) {
    drawCenteredImage(enemyDeadImg);
    return;
  }
  if (e.throwState === 'pain') {
    drawCenteredImage(enemyPainImg);
    return;
  }
  if (e.throwState === 'fall') {
    drawCenteredImage(enemyFallImg);
    return;
  }
  ctx.translate(e.x, e.y);
  // 陰影
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.ellipse(0, 28, 18, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#888";
  ctx.fill();
  ctx.globalAlpha = 1;
  // 身體
  ctx.beginPath();
  ctx.arc(0, bodyY, bodyR, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  // 頭
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  // 帽子
  ctx.beginPath();
  ctx.arc(0, headY - 8, headR, Math.PI, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  // 腳
  ctx.beginPath();
  ctx.ellipse(-8, 28, 5, 8, 0, 0, Math.PI * 2);
  ctx.ellipse(8, 28, 5, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#191";
  ctx.fill();
  ctx.restore();
}

// --- 新增：美化雪堆 ---
function drawSnowPile(x, y, r) {
  ctx.save();
  // 陰影
  ctx.globalAlpha = 0.2;
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.5, r * 1.1, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#888";
  ctx.fill();
  ctx.globalAlpha = 1;
  // 雪堆主體
  let grad = ctx.createRadialGradient(x, y, r * 0.3, x, y, r);
  grad.addColorStop(0, "#fff");
  grad.addColorStop(1, "#d0e6f7");
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
}

// --- 修改背景 ---
function drawBackground() {
  try {
    // 雪地漸層
    const canvasWidth = canvas.width / window.devicePixelRatio / scale;
    const canvasHeight = canvas.height / window.devicePixelRatio / scale;
    
    // 確保尺寸有效
    if (canvasWidth <= 0 || canvasHeight <= 0) {
      console.log('Canvas尺寸無效，使用預設值');
      return;
    }
    
    let grad = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    grad.addColorStop(0, "#f8fbff");
    grad.addColorStop(1, "#eaf6ff");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    // 雪堆 - 調整位置適應畫布大小
    drawSnowPile(canvasWidth * 0.15, canvasHeight * 0.1, 40);
    drawSnowPile(canvasWidth * 0.45, canvasHeight * 0.5, 50);
  } catch (error) {
    console.error('繪製背景時發生錯誤:', error);
  }
}

// --- 修改玩家繪製 ---
function drawPlayers() {
  // 先繪製所有屍體
  players.forEach((p, idx) => {
    if (p.deadState) {
      ctx.save();
      drawPlayerSprite(p, "#d22");
      ctx.restore();
    }
  });
  
  // 再繪製所有活著的玩家
  players.forEach((p, idx) => {
    if (!p.alive || p.deadState) return; // 跳過死亡和屍體狀態
    ctx.save();
    
    ctx.globalAlpha = (p.stunUntil > performance.now()) ? 0.5 : 1;
    drawPlayerSprite(p, "#d22");
    // 暈圈
    if (p.stunUntil > performance.now()) {
      const offsetX = -45;
      const offsetY = -12;
      ctx.beginPath();
      ctx.arc(p.x + offsetX, p.y + offsetY, PLAYER_RADIUS+10, 0, Math.PI*2);
      ctx.strokeStyle = '#f9c';
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 1;
    }
    // 集氣圈
    if (p.charging && charging && selectedPlayer === p) {
      const offsetX = -45;  // 與 drawPlayerSprite 一致
      const offsetY = -12;
      let charge = Math.min(1, (performance.now() - chargeStart) / CHARGE_TIME);
      ctx.beginPath();
      ctx.arc(p.x + offsetX, p.y + offsetY, PLAYER_RADIUS+8, 0, Math.PI*2*charge);
      ctx.strokeStyle = '#f90';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    // 顯示觸控範圍指示（無論是否在集氣）
    if (p.alive && p.stunUntil < performance.now()) {
      // 控制圈位置往下調整
      const controlX = p.x + 0;
      const controlY = p.y + 50;  // 向下偏移50像素
      // 顯示觸控範圍（半透明圓圈）
      ctx.beginPath();
      ctx.arc(controlX, controlY, PLAYER_RADIUS + 30, 0, Math.PI*2);
      ctx.strokeStyle = (p.hp === 2) ? '#0f0' : '#fa0';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.2;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1;
    }
    ctx.restore();
  });
}

// --- 修改敵人繪製 ---
function drawEnemies() {
  // 先繪製所有屍體
  enemies.forEach(e => {
    if (e.deadState) {
      ctx.save();
      drawEnemySprite(e, "#2a5", 'dead');
      ctx.restore();
    }
  });
  
  // 再繪製所有活著的敵人
  enemies.forEach(e => {
    if (!e.alive || e.deadState) return; // 跳過死亡和屍體狀態
    ctx.save();
    
    ctx.globalAlpha = (e.stunUntil > performance.now()) ? 0.5 : 1;
    drawEnemySprite(e, "#2a5", e.throwState);
    // HP
    for (let i = 0; i < e.hp; i++) {
      ctx.beginPath();
      ctx.arc(e.x - 20 + i*16, e.y - 32, 6, 0, Math.PI*2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#2a5';
      ctx.stroke();
    }
    // 暈圈
    if (e.stunUntil > performance.now()) {
      ctx.beginPath();
      ctx.arc(e.x, e.y, ENEMY_RADIUS+10, 0, Math.PI*2);
      ctx.strokeStyle = '#f9c';
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 1;
    }
    // 準備丟球狀態：黃色圓圈
    if (e.throwState === 'prepare') {
      // 顯示圓形續力環
      let charge = 0;
      if (e.chargeStart) {
        charge = Math.min(1, (performance.now() - e.chargeStart) / CHARGE_TIME);
      }
      ctx.save();
      ctx.beginPath();
      ctx.arc(e.x, e.y, ENEMY_RADIUS+8, 0, Math.PI*2*charge);
      ctx.strokeStyle = '#ff0';
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.9;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1;
      ctx.restore();
    }
    ctx.restore();
  });
}

function drawSnowballs() {
  snowballs.forEach(s => {
    ctx.beginPath();
    ctx.arc(s.x, s.y, SNOWBALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#99f';
    ctx.stroke();
  });
}

// --- 修改 UI，初始顯示大字 ---
function drawUI() {
  const canvasWidth = canvas.width / window.devicePixelRatio / scale;
  const canvasHeight = canvas.height / window.devicePixelRatio / scale;
  
  if (gameState === 'win') {
    ctx.save();
    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = '#2a5';
    ctx.fillText('過關！', canvasWidth/2-70, canvasHeight/2);
    ctx.restore();
  } else if (gameState === 'lose') {
    ctx.save();
    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = '#d22';
    ctx.fillText('遊戲結束', canvasWidth/2-110, canvasHeight/2);
    ctx.restore();
  }
  // 新增：開場祝福
  if (gameState === 'showGreeting' && performance.now() < showGreetingUntil) {
    ctx.save();
    ctx.font = '44px serif';
    ctx.fillStyle = '#357';
    ctx.textAlign = 'center';
    ctx.fillText("Season's Greetings", canvasWidth/2, canvasHeight/2);
    ctx.restore();
  }
  // 新增：顯示關卡文字
  if (showLevelText && performance.now() < showLevelTextUntil) {
    ctx.save();
    ctx.font = 'bold 60px Arial';
    ctx.fillStyle = '#357';
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.85;
    ctx.fillText('Level ' + showLevelTextValue, canvasWidth/2, canvasHeight/2);
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  

}

function gameLoop(ts) {
  try {
    // 確保Canvas和Context存在
    if (!canvas || !ctx) {
      console.error('Canvas或Context不存在');
      return;
    }
    
    // 確保Canvas尺寸正確
    if (canvas.width === 0 || canvas.height === 0) {
      console.log('Canvas尺寸為0，重新調整');
      resizeCanvas();
    }
    
    drawBackground();
    drawPlayers();
    drawEnemies();
    drawSnowballs();
    drawUI();
    
    if (gameState === 'showGreeting') {
      if (performance.now() >= showGreetingUntil) {
        gameState = 'playing';
        startLevel();
      }
    } else if (gameState === 'playing') {
      updateSnowballs();
      updateEnemies(ts);
      updateInfo();
    }
    
    lastFrameTime = ts;
    requestAnimationFrame(gameLoop);
  } catch (error) {
    console.error('遊戲循環錯誤:', error);
    // 嘗試繼續遊戲循環
    requestAnimationFrame(gameLoop);
  }
}

function updateSnowballs() {
  snowballs.forEach(s => {
    s.x += s.vx;
    s.y += s.vy;
    // 碰撞
    if (s.from === 'player') {
      enemies.forEach(e => {
        if (!e.alive || e.stunUntil > performance.now()) return;
        if (distance(s, e) < ENEMY_RADIUS + SNOWBALL_RADIUS) {
          e.hp--;
          // 播放被擊中音效
          playHitSound();
          if (e.hp === 2) {
            e.throwState = 'pain';
            e.stunUntil = performance.now() + STUN_DURATION;
          } else if (e.hp === 1) {
            e.throwState = 'fall';
            e.stunUntil = performance.now() + STUN_DURATION;
          } else if (e.hp <= 0 && !e.deadState) {
            e.alive = false;
            e.deadTime = performance.now();
            e.deadState = true;
            // 播放死亡音效
            playDeathSound();
          }
          s.dead = true;
        }
      });
    } else if (s.from === 'enemy') {
      players.forEach(p => {
        if (!p.alive || p.stunUntil > performance.now()) return;
        if (distance(s, p) < PLAYER_RADIUS + SNOWBALL_RADIUS) {
          p.hp--;
          // 播放被擊中音效
          playHitSound();
          p.stunUntil = performance.now() + STUN_DURATION;
          if (p.hp <= 0) {
            p.alive = false;
            p.deadTime = performance.now();
            p.deadState = true;
            // 播放死亡音效
            playDeathSound();
          }
          s.dead = true;
        }
      });
    }
    // 判斷最大飛行距離
    if (s.startX !== undefined && s.startY !== undefined && s.maxDistance !== undefined) {
      const dx = s.x - s.startX;
      const dy = s.y - s.startY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist > s.maxDistance) s.dead = true;
    }
  });
  // 移除飛出或已命中的雪球
  const canvasWidth = canvas.width / window.devicePixelRatio / scale;
  const canvasHeight = canvas.height / window.devicePixelRatio / scale;
  snowballs = snowballs.filter(s => !s.dead && s.x > -30 && s.x < canvasWidth+30 && s.y > -30 && s.y < canvasHeight+30);
  // 勝負判斷
  if (players.every(p=>!p.alive) && gameState==='playing') {
    gameState = 'lose';
    restartBtn.style.display = 'block';
  }
  if (enemies.every(e=>!e.alive) && gameState==='playing') {
    gameState = 'win';
    // 播放過關音效
    playLevelStartSound();
    restartBtn.style.display = 'none';
    score += 100;
    updateInfo();
    setTimeout(() => {
      level++;
      if (level > 1) {
        showLevelText = true;
        showLevelTextValue = level;
        showLevelTextUntil = performance.now() + 1000;
        gameState = 'pause';
        setTimeout(() => {
          showLevelText = false;
          startLevelWithoutSound();
        }, 1000);
      } else {
        startLevelWithoutSound();
      }
      resultDiv.textContent = '';
      restartBtn.style.display = 'none';
    }, 1000);
  }
}

function randomStateDelay() {
  return 1000 + Math.random() * 1000; // 1~2秒
}

// 新增：生成邊界目標位置
function generateBoundaryTarget(canvasWidth, canvasHeight) {
  const margin = 50; // 距離邊界的距離
  const side = Math.floor(Math.random() * 4); // 0:上, 1:右, 2:下, 3:左
  
  switch(side) {
    case 0: // 上邊界
      return {
        x: margin + Math.random() * (canvasWidth * 0.4 - margin * 2),
        y: margin
      };
    case 1: // 右邊界（限制在左上三角形內）
      const maxX = canvasWidth * 0.4;
      return {
        x: maxX - margin,
        y: margin + Math.random() * (canvasHeight * 0.4 - margin * 2)
      };
    case 2: // 下邊界（限制在左上三角形內）
      const maxY = canvasHeight * 0.4;
      return {
        x: margin + Math.random() * (canvasWidth * 0.4 - margin * 2),
        y: maxY - margin
      };
    case 3: // 左邊界
      return {
        x: margin,
        y: margin + Math.random() * (canvasHeight * 0.4 - margin * 2)
      };
  }
}

// 工具函數：判斷是否在右下三角形（玩家區域）
function isInPlayerArea(x, y, canvasWidth, canvasHeight) {
  // 右下三角形：x > (canvasWidth - y * (canvasWidth/canvasHeight))
  return x > canvasWidth - (y * (canvasWidth / canvasHeight));
}
// 工具函數：判斷是否在左上三角形（敵人區域）
function isInEnemyArea(x, y, canvasWidth, canvasHeight) {
  // 左上三角形：x < (canvasWidth - y * (canvasWidth/canvasHeight))
  return x < canvasWidth - (y * (canvasWidth / canvasHeight));
}

// 修改玩家拖曳移動限制
canvas.addEventListener('mousemove', e => {
  if (!draggingPlayer) return;
  if (draggingPlayer.stunUntil > performance.now()) {
    draggingPlayer.charging = false;
    draggingPlayer = null;
    charging = false;
    selectedPlayer = null;
    return;
  }
  let rect = canvas.getBoundingClientRect();
  let mx = (e.clientX - rect.left) / scale;
  let my = (e.clientY - rect.top) / scale;
  
  // 檢查滑鼠是否移出畫布範圍
  if (e.clientX < rect.left || e.clientX > rect.right || 
      e.clientY < rect.top || e.clientY > rect.bottom) {
    // 滑鼠移出畫布，停止拖曳
    handleMouseUp(e);
    return;
  }
  
  const canvasWidth = canvas.width / window.devicePixelRatio / scale;
  const canvasHeight = canvas.height / window.devicePixelRatio / scale;
  let newX = Math.max(PLAYER_RADIUS, Math.min(canvasWidth - PLAYER_RADIUS, mx - dragOffsetX));
  let newY = Math.max(PLAYER_RADIUS, Math.min(canvasHeight - PLAYER_RADIUS, my - dragOffsetY));
  // 限制只能在右下三角形
  if (!isInPlayerArea(newX, newY, canvasWidth, canvasHeight)) {
    // 若超出，將座標投影到對角線上
    let t = (canvasWidth - newX) / (canvasWidth / canvasHeight);
    if (newY < t) newY = t;
    newX = canvasWidth - newY * (canvasWidth / canvasHeight);
  }
  draggingPlayer.x = newX;
  draggingPlayer.y = newY;
});

// 觸控移動同理
canvas.addEventListener('touchmove', e => {
  if (!draggingPlayer) return;
  if (draggingPlayer.stunUntil > performance.now()) {
    draggingPlayer.charging = false;
    draggingPlayer = null;
    charging = false;
    selectedPlayer = null;
    return;
  }
  if (e.touches.length !== 1) return;
  let rect = canvas.getBoundingClientRect();
  let mx = (e.touches[0].clientX - rect.left) / scale;
  let my = (e.touches[0].clientY - rect.top) / scale;
  
  // 檢查觸控是否移出畫布範圍
  if (e.touches[0].clientX < rect.left || e.touches[0].clientX > rect.right || 
      e.touches[0].clientY < rect.top || e.touches[0].clientY > rect.bottom) {
    // 觸控移出畫布，停止拖曳
    handleTouchEnd(e);
    return;
  }
  
  const canvasWidth = canvas.width / window.devicePixelRatio / scale;
  const canvasHeight = canvas.height / window.devicePixelRatio / scale;
  let newX = Math.max(PLAYER_RADIUS, Math.min(canvasWidth - PLAYER_RADIUS, mx - dragOffsetX));
  let newY = Math.max(PLAYER_RADIUS, Math.min(canvasHeight - PLAYER_RADIUS, my - dragOffsetY));
  if (!isInPlayerArea(newX, newY, canvasWidth, canvasHeight)) {
    let t = (canvasWidth - newX) / (canvasWidth / canvasHeight);
    if (newY < t) newY = t;
    newX = canvasWidth - newY * (canvasWidth / canvasHeight);
  }
  draggingPlayer.x = newX;
  draggingPlayer.y = newY;
  e.preventDefault();
}, {passive:false});

// 敵人移動限制
function updateEnemies(ts) {
  enemies.forEach(e => {
    if (!e.alive) return;
    // pain/fall 狀態不能移動，等 stunUntil 結束自動回 idle
    if ((e.throwState === 'pain' || e.throwState === 'fall') && e.stunUntil > performance.now()) {
      return;
    }
    if ((e.throwState === 'pain' || e.throwState === 'fall') && e.stunUntil <= performance.now()) {
      e.throwState = 'idle';
    }
    if (e.stunUntil > performance.now()) return;
    if (e.throwState === 'idle') {
      const canvasWidth = canvas.width / window.devicePixelRatio / scale;
      const canvasHeight = canvas.height / window.devicePixelRatio / scale;
      
      // 檢查是否需要改變目標
      if (ts - e.lastTargetChange > e.targetChangeInterval) {
        const newTarget = generateBoundaryTarget(canvasWidth, canvasHeight);
        e.targetX = newTarget.x;
        e.targetY = newTarget.y;
        e.lastTargetChange = ts;
      }
      
      // 計算到目標的距離和方向
      const dx = e.targetX - e.x;
      const dy = e.targetY - e.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // 如果距離目標很近，就停止移動
      if (distance > 5) {
        // 標準化方向向量並應用移動速度
        const moveX = (dx / distance) * e.moveSpeed;
        const moveY = (dy / distance) * e.moveSpeed;
        e.x += moveX;
        e.y += moveY;
      }
      
      // 行走動畫
      e.walkFrame = Math.floor(performance.now() / 250) % 2;
      
      // 限制敵人不會移出左上三角形
      // 先限制在畫布內
      e.x = Math.max(ENEMY_RADIUS, Math.min(canvasWidth - ENEMY_RADIUS, e.x));
      e.y = Math.max(ENEMY_RADIUS, Math.min(canvasHeight - ENEMY_RADIUS, e.y));
      // 再限制在左上三角形
      if (!isInEnemyArea(e.x, e.y, canvasWidth, canvasHeight)) {
        // 投影到對角線
        let t = (canvasWidth - e.x) / (canvasWidth / canvasHeight);
        if (e.y > t) e.y = t;
        e.x = canvasWidth - e.y * (canvasWidth / canvasHeight);
      }
      
      // 到了發射時間，進入蹲下
      if (ts - e.lastThrow > e.nextThrow) {
        e.throwState = 'crouch';
        e.throwStateUntil = ts + randomStateDelay();
      }
    } else if (e.throwState === 'crouch') {
      if (ts >= e.throwStateUntil) {
        e.throwState = 'prepare';
        e.chargeStart = performance.now(); // 新增
        e.throwStateUntil = e.chargeStart + CHARGE_TIME;
      }
    } else if (e.throwState === 'prepare') {
      if (ts >= e.throwStateUntil) {
        e.throwState = 'throw';
        e.throwStateUntil = ts + 200; // 0.2秒顯示丟出
        let charge = Math.min(1, (performance.now() - e.chargeStart) / CHARGE_TIME);
        let angle = Math.PI / 4;
        let speed = SNOWBALL_BASE_SPEED + (SNOWBALL_MAX_SPEED - SNOWBALL_BASE_SPEED) * charge;
        let maxDistance = MIN_THROW_DISTANCE + (MAX_THROW_DISTANCE - MIN_THROW_DISTANCE) * charge;
        snowballs.push({
          x: e.x + Math.cos(angle)*ENEMY_RADIUS,
          y: e.y + Math.sin(angle)*ENEMY_RADIUS,
          vx: Math.cos(angle)*speed,
          vy: Math.sin(angle)*speed,
          from: 'enemy',
          startX: e.x + Math.cos(angle)*ENEMY_RADIUS,
          startY: e.y + Math.sin(angle)*ENEMY_RADIUS,
          maxDistance: maxDistance
        });
        // 播放投擲音效 - 根據力道決定音效
        playThrowSound(charge > 0.8);
        e.lastThrow = ts;
        e.nextThrow = randomThrowInterval();
      }
    } else if (e.throwState === 'throw') {
      if (ts >= e.throwStateUntil) {
        e.throwState = 'standup';
        e.throwStateUntil = ts + randomStateDelay();
      }
    } else if (e.throwState === 'standup') {
      if (ts >= e.throwStateUntil) {
        e.throwState = 'idle';
      }
    }
  });
}

function randomThrowInterval() {
  return ENEMY_THROW_INTERVAL_MIN + Math.random() * (ENEMY_THROW_INTERVAL_MAX - ENEMY_THROW_INTERVAL_MIN);
}

function distance(a, b) {
  return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2);
}

// 滑鼠操作
canvas.addEventListener('mousedown', e => {
  if (gameState !== 'playing') return;
  let rect = canvas.getBoundingClientRect();
  let mx = (e.clientX - rect.left) / scale;
  let my = (e.clientY - rect.top) / scale;
  // 選擇最近紅衣角色
  let candidates = players.filter(p=>p.alive && p.stunUntil < performance.now());
  if (candidates.length === 0) return;
  // 拖曳啟動判斷與控制圈一致
  let p = candidates.reduce((a,b)=>{
    const controlX_a = a.x + 0;
    const controlY_a = a.y + 50;
    const controlX_b = b.x + 0;
    const controlY_b = b.y + 50;
    return distance({x:mx,y:my},{x:controlX_a,y:controlY_a}) < distance({x:mx,y:my},{x:controlX_b,y:controlY_b}) ? a : b;
  });
  const controlX = p.x + 0;
  const controlY = p.y + 50;
  const controlRadius = PLAYER_RADIUS + 30;
  if (distance({x:mx,y:my},{x:controlX,y:controlY}) < controlRadius) {
    if (p.stunUntil > performance.now()) return;
    draggingPlayer = p;
    dragOffsetX = mx - p.x;
    dragOffsetY = my - p.y;
    charging = true;
    chargeStart = performance.now();
    selectedPlayer = p;
    p.charging = true;
  }
});

// 滑鼠釋放事件處理函數
function handleMouseUp(e) {
  if (draggingPlayer) {
    let now = performance.now();
    let charge = Math.min(1, (now - chargeStart) / CHARGE_TIME);
    if (selectedPlayer && selectedPlayer.alive) {
      let angle = -3 * Math.PI / 4; // 正確左上45度
      let speed = SNOWBALL_BASE_SPEED + (SNOWBALL_MAX_SPEED-SNOWBALL_BASE_SPEED)*charge;
      let maxDistance = MIN_THROW_DISTANCE + (MAX_THROW_DISTANCE - MIN_THROW_DISTANCE) * charge;
      snowballs.push({
        x: selectedPlayer.x + Math.cos(angle)*PLAYER_RADIUS,
        y: selectedPlayer.y + Math.sin(angle)*PLAYER_RADIUS,
        vx: Math.cos(angle)*speed,
        vy: Math.sin(angle)*speed,
        from: 'player',
        startX: selectedPlayer.x + Math.cos(angle)*PLAYER_RADIUS,
        startY: selectedPlayer.y + Math.sin(angle)*PLAYER_RADIUS,
        maxDistance: maxDistance
      });
      // 播放投擲音效 - 根據力道決定音效
      playThrowSound(charge > 0.8);
    }
    charging = false;
    if (selectedPlayer) selectedPlayer.charging = false;
    selectedPlayer = null;
    draggingPlayer = null;
    return;
  }
  if (!charging || !selectedPlayer || !selectedPlayer.alive) return;
  let now = performance.now();
  let charge = Math.min(1, (now - chargeStart) / CHARGE_TIME);
  let angle = -3 * Math.PI / 4; // 正確左上45度
  let speed = SNOWBALL_BASE_SPEED + (SNOWBALL_MAX_SPEED-SNOWBALL_BASE_SPEED)*charge;
  let maxDistance = MIN_THROW_DISTANCE + (MAX_THROW_DISTANCE - MIN_THROW_DISTANCE) * charge;
  snowballs.push({
    x: selectedPlayer.x + Math.cos(angle)*PLAYER_RADIUS,
    y: selectedPlayer.y + Math.sin(angle)*PLAYER_RADIUS,
    vx: Math.cos(angle)*speed,
    vy: Math.sin(angle)*speed,
    from: 'player',
    startX: selectedPlayer.x + Math.cos(angle)*PLAYER_RADIUS,
    startY: selectedPlayer.y + Math.sin(angle)*PLAYER_RADIUS,
    maxDistance: maxDistance
  });
  // 播放投擲音效 - 根據力道決定音效
  playThrowSound(charge > 0.8);
  charging = false;
  if (selectedPlayer) selectedPlayer.charging = false;
  selectedPlayer = null;
}

canvas.addEventListener('mouseup', handleMouseUp);
// 添加全域滑鼠釋放事件，防止滑鼠移出畫布後無法釋放
document.addEventListener('mouseup', handleMouseUp);

// 觸控操作
canvas.addEventListener('touchstart', e => {
  if (gameState !== 'playing') return;
  if (e.touches.length !== 1) return;
  
  // 防止觸控事件的預設行為
  e.preventDefault();
  
  let rect = canvas.getBoundingClientRect();
  let mx = (e.touches[0].clientX - rect.left) / scale;
  let my = (e.touches[0].clientY - rect.top) / scale;
  
  // 調試信息（手機版）
  if (isMobile()) {
    console.log('Touch start:', {x: mx, y: my, scale: scale, rect: rect});
  }
  
  let candidates = players.filter(p=>p.alive && p.stunUntil < performance.now());
  if (candidates.length === 0) return;
  let p = candidates.reduce((a,b)=>{
    const controlX_a = a.x + 0;
    const controlY_a = a.y + 50;
    const controlX_b = b.x + 0;
    const controlY_b = b.y + 50;
    return distance({x:mx,y:my},{x:controlX_a,y:controlY_a}) < distance({x:mx,y:my},{x:controlX_b,y:controlY_b}) ? a : b;
  });
  const controlX = p.x + 0;
  const controlY = p.y + 50;
  const controlRadius = PLAYER_RADIUS + 30;
  if (distance({x:mx,y:my},{x:controlX,y:controlY}) < controlRadius) {
    if (p.stunUntil > performance.now()) return;
    draggingPlayer = p;
    dragOffsetX = mx - p.x;
    dragOffsetY = my - p.y;
    charging = true;
    chargeStart = performance.now();
    selectedPlayer = p;
    p.charging = true;
  }
}, {passive: false});

// 觸控釋放事件處理函數
function handleTouchEnd(e) {
  if (draggingPlayer) {
    let now = performance.now();
    let charge = Math.min(1, (now - chargeStart) / CHARGE_TIME);
    if (selectedPlayer && selectedPlayer.alive) {
      let angle = -3 * Math.PI / 4;
      let speed = SNOWBALL_BASE_SPEED + (SNOWBALL_MAX_SPEED-SNOWBALL_BASE_SPEED)*charge;
      let maxDistance = MIN_THROW_DISTANCE + (MAX_THROW_DISTANCE - MIN_THROW_DISTANCE) * charge;
      snowballs.push({
        x: selectedPlayer.x + Math.cos(angle)*PLAYER_RADIUS,
        y: selectedPlayer.y + Math.sin(angle)*PLAYER_RADIUS,
        vx: Math.cos(angle)*speed,
        vy: Math.sin(angle)*speed,
        from: 'player',
        startX: selectedPlayer.x + Math.cos(angle)*PLAYER_RADIUS,
        startY: selectedPlayer.y + Math.sin(angle)*PLAYER_RADIUS,
        maxDistance: maxDistance
      });
      // 播放投擲音效 - 根據力道決定音效
      playThrowSound(charge > 0.8);
    }
    charging = false;
    if (selectedPlayer) selectedPlayer.charging = false;
    selectedPlayer = null;
    draggingPlayer = null;
    e.preventDefault();
    return;
  }
  if (!charging || !selectedPlayer || !selectedPlayer.alive) return;
  let now = performance.now();
  let charge = Math.min(1, (now - chargeStart) / CHARGE_TIME);
  let angle = -3 * Math.PI / 4;
  let speed = SNOWBALL_BASE_SPEED + (SNOWBALL_MAX_SPEED-SNOWBALL_BASE_SPEED)*charge;
  let maxDistance = MIN_THROW_DISTANCE + (MAX_THROW_DISTANCE - MIN_THROW_DISTANCE) * charge;
  snowballs.push({
    x: selectedPlayer.x + Math.cos(angle)*PLAYER_RADIUS,
    y: selectedPlayer.y + Math.sin(angle)*PLAYER_RADIUS,
    vx: Math.cos(angle)*speed,
    vy: Math.sin(angle)*speed,
    from: 'player',
    startX: selectedPlayer.x + Math.cos(angle)*PLAYER_RADIUS,
    startY: selectedPlayer.y + Math.sin(angle)*PLAYER_RADIUS,
    maxDistance: maxDistance
  });
  // 播放投擲音效 - 根據力道決定音效
  playThrowSound(charge > 0.8);
  charging = false;
  if (selectedPlayer) selectedPlayer.charging = false;
  selectedPlayer = null;
  e.preventDefault();
}

canvas.addEventListener('touchend', handleTouchEnd, {passive:false});
// 添加全域觸控釋放事件，防止觸控移出畫布後無法釋放
document.addEventListener('touchend', handleTouchEnd, {passive:false});

restartBtn.onclick = () => {
  if (gameState === 'win') {
    // level++;
    // startLevel();
    // resultDiv.textContent = '';
    // restartBtn.style.display = 'none';
  } else {
    resetGame();
    resultDiv.textContent = '';
    restartBtn.style.display = 'none';
  }
};

if (showDescBtn && descDiv) {
  showDescBtn.onclick = () => {
    if (descDiv.style.display === 'none') {
      descDiv.style.display = 'block';
    } else {
      descDiv.style.display = 'none';
    }
  };
}

if (closeDescBtn && descDiv) {
  closeDescBtn.onclick = () => {
    descDiv.style.display = 'none';
  };
}

// 初始化遊戲
function initGame() {
  console.log('Game initializing...');
  console.log('Is mobile:', isMobile());
  console.log('Window size:', window.innerWidth, 'x', window.innerHeight);
  console.log('Device pixel ratio:', window.devicePixelRatio);
  
  // 顯示載入指示器
  if (loadingIndicator) {
    loadingIndicator.style.display = 'block';
    if (loadingProgress) {
      loadingProgress.textContent = '初始化中...';
    }
  }
  
  // 等待圖片載入完成
  if (imagesReady) {
    startGame();
  } else {
    console.log('等待圖片載入完成...');
    // 檢查圖片載入狀態
    const checkImages = setInterval(() => {
      if (imagesReady) {
        clearInterval(checkImages);
        startGame();
      }
    }, 100);
    
    // 設置超時，避免無限等待
    setTimeout(() => {
      if (!imagesReady) {
        clearInterval(checkImages);
        console.log('圖片載入超時，使用備用方案');
        imagesReady = true;
        startGame();
      }
    }, 5000);
  }
}

function startGame() {
  console.log('開始遊戲');
  
  // 確保Canvas已經正確設置
  if (canvas.width === 0 || canvas.height === 0) {
    console.log('Canvas尺寸異常，重新調整');
    resizeCanvas();
  }
  
  // 檢查Canvas是否可見
  const rect = canvas.getBoundingClientRect();
  console.log('Canvas位置和尺寸:', rect);
  
  resetGame();
  requestAnimationFrame(gameLoop);
}

// 手機版特殊處理
if (isMobile()) {
  // 防止手機版縮放
  document.addEventListener('touchstart', function(e) {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });
  
  // 防止雙擊縮放
  let lastTouchEnd = 0;
  document.addEventListener('touchend', function(e) {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, false);
}

// 確保 DOM 完全載入後再初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
} 