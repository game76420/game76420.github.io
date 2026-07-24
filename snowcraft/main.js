// --- 遊戲參數 ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const resultDiv = document.getElementById('result');

const scoreDisplay = document.getElementById('scoreDisplay');
const levelDisplay = document.getElementById('levelDisplay');

const showDescBtn = document.getElementById('showDescBtn');
const descDiv = document.getElementById('desc');
const closeDescBtn = document.getElementById('closeDescBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const loadingProgress = document.getElementById('loadingProgress');
const skipLoadingBtn = document.getElementById('skipLoadingBtn');

// 排行榜相關元素
const leaderboardModal = document.getElementById('leaderboardModal');
const leaderboardList = document.getElementById('leaderboardList');
const closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
const closeLeaderboardBtn2 = document.getElementById('closeLeaderboardBtn2');
const clearLeaderboardBtn = document.getElementById('clearLeaderboardBtn');
const showLeaderboardBtn = document.getElementById('showLeaderboardBtn');
const restartCurrentLevelBtn = document.getElementById('restartCurrentLevelBtn');
const restartFromFirstLevelBtn = document.getElementById('restartFromFirstLevelBtn');

// 跳關相關元素
const skipLevelModal = document.getElementById('skipLevelModal');
const skipLevelInput = document.getElementById('skipLevelInput');
const closeSkipLevelBtn = document.getElementById('closeSkipLevelBtn');
const confirmSkipLevelBtn = document.getElementById('confirmSkipLevelBtn');
const cancelSkipLevelBtn = document.getElementById('cancelSkipLevelBtn');
const decreaseLevelBtn = document.getElementById('decreaseLevelBtn');
const increaseLevelBtn = document.getElementById('increaseLevelBtn');
const toggleMenuBtn = document.getElementById('toggleMenuBtn');

// 排行榜相關函數
function getLeaderboard() {
  const leaderboard = localStorage.getItem('snowcraft_leaderboard');
  return leaderboard ? JSON.parse(leaderboard) : [];
}

function saveLeaderboard(leaderboard) {
  localStorage.setItem('snowcraft_leaderboard', JSON.stringify(leaderboard));
}

function addScoreToLeaderboard(score) {
  // 0分或負分不列入排行榜
  if (score <= 0) {
    return { leaderboard: getLeaderboard(), isInTop10: false, rank: 0 };
  }
  
  const leaderboard = getLeaderboard();
  const newScore = {
    score: score,
    date: new Date().toLocaleDateString('zh-TW'),
    time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
  };
  
  leaderboard.push(newScore);
  leaderboard.sort((a, b) => b.score - a.score); // 按分數降序排列
  
  // 只保留前10名
  const top10 = leaderboard.slice(0, 10);
  saveLeaderboard(top10);
  
  // 檢查當前分數是否進入排行榜
  const isInTop10 = top10.some(entry => entry.score === score);
  const rank = top10.findIndex(entry => entry.score === score) + 1;
  
  return { leaderboard: top10, isInTop10, rank };
}

function clearLeaderboard() {
  localStorage.removeItem('snowcraft_leaderboard');
  showLeaderboard();
}

function showLeaderboard(currentScore = null) {
  const leaderboard = getLeaderboard();
  let html = '';
  
  if (leaderboard.length === 0) {
    html = '<p style="text-align:center;color:#666;">尚無記錄</p>';
  } else {
    // 使用表格結構來確保對齊
    html = `
      <table style="width:100%;border-collapse:collapse;margin-bottom:10px;font-family:Arial,sans-serif;">
        <thead>
          <tr style="border-bottom:2px solid #2a5;">
            <th style="text-align:center;padding:8px;color:#2a5;font-weight:bold;width:20%;">排名</th>
            <th style="text-align:center;padding:8px;color:#2a5;font-weight:bold;width:25%;">分數</th>
            <th style="text-align:center;padding:8px;color:#2a5;font-weight:bold;width:30%;">日期</th>
            <th style="text-align:center;padding:8px;color:#2a5;font-weight:bold;width:25%;">時間</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    leaderboard.forEach((entry, index) => {
      // 檢查是否為當前分數
      const isCurrentScore = currentScore !== null && entry.score === currentScore;
      const color = isCurrentScore ? '#d22' : '#333';
      const fontWeight = isCurrentScore ? 'bold' : 'normal';
      const bgColor = isCurrentScore ? 'rgba(210,34,34,0.1)' : 'transparent';
      
      html += `
        <tr style="background-color:${bgColor};border-bottom:1px solid #eee;">
          <td style="text-align:center;padding:8px;color:${color};font-weight:${fontWeight};">
            ${index + 1}
            ${isCurrentScore ? `<br><span style="color:#d22;font-size:11px;">${index === 0 ? '(新紀錄！)' : ''}</span>` : ''}
          </td>
          <td style="text-align:center;padding:8px;color:${color};font-weight:${fontWeight};">
            ${entry.score}分
          </td>
          <td style="text-align:center;padding:8px;color:${color};font-weight:${fontWeight};">
            ${entry.date}
          </td>
          <td style="text-align:center;padding:8px;color:${color};font-weight:${fontWeight};">
            ${entry.time}
          </td>
        </tr>
      `;
    });
    
    html += '</tbody></table>';
  }
  
  leaderboardList.innerHTML = html;
  leaderboardModal.style.display = 'block';
}

// 跳關相關函數
function showSkipLevelModal() {
  if (skipLevelModal) {
    skipLevelModal.style.display = 'block';
    if (skipLevelInput) {
      // 填入上次挑戰的關卡號碼
      skipLevelInput.value = lastChallengedLevel;
      skipLevelInput.focus();
      // 選中輸入框內容，方便用戶直接輸入新號碼
      skipLevelInput.select();
    }
  }
}

function hideSkipLevelModal() {
  if (skipLevelModal) {
    skipLevelModal.style.display = 'none';
  }
}

function skipToLevel(targetLevel) {
  // 驗證關卡號碼
  if (targetLevel < 1 || targetLevel > 50) {
    alert('關卡號碼必須在 1-50 之間！');
    return false;
  }
  
  // 移除跳關確認詢問，直接允許跳關
  
  // 設置新關卡
  level = targetLevel;
  
  // 記住這次挑戰的關卡
  lastChallengedLevel = targetLevel;
  
  // 清除當前分數
  score = 0;
  
  // 重置玩家狀態
  players.forEach(player => {
    player.hp = PLAYER_MAX_HP;
    player.alive = true;
    player.stunUntil = 0;
    player.charging = false;
    player.charge = 0;
    player.deadState = false;
    player.deadTime = 0;
  });
  
  // 開始新關卡（不播放音效）
  startLevelWithoutSound();
  
  // 隱藏跳關彈窗
  hideSkipLevelModal();
  
  // 隱藏排行榜彈窗
  if (leaderboardModal) {
    leaderboardModal.style.display = 'none';
  }
  
  // 顯示跳關提示
  showSkipLevelMessage(targetLevel);
  
  return true;
}

function showSkipLevelMessage(targetLevel) {
  // 創建跳關提示訊息
  const messageDiv = document.createElement('div');
  messageDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 20px 30px;
    border-radius: 10px;
    font-size: 18px;
    font-weight: bold;
    z-index: 1002;
    text-align: center;
  `;
  messageDiv.textContent = `🎯 跳關成功！現在是第 ${targetLevel} 關`;
  
  document.body.appendChild(messageDiv);
  
  // 2秒後自動移除
  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.parentNode.removeChild(messageDiv);
    }
  }, 2000);
}

// 上下按鈕功能
function decreaseLevel() {
  if (skipLevelInput) {
    let currentValue = parseInt(skipLevelInput.value) || 1;
    currentValue = Math.max(1, currentValue - 1);
    skipLevelInput.value = currentValue;
  }
}

function increaseLevel() {
  if (skipLevelInput) {
    let currentValue = parseInt(skipLevelInput.value) || 1;
    currentValue = Math.min(50, currentValue + 1);
    skipLevelInput.value = currentValue;
  }
}

// 功能表切換功能
function toggleMenu() {
  const gameInfo = document.getElementById('gameInfo');
  const menuButtons = document.getElementById('menuButtons');
  const scoreInfo = document.querySelector('.score-info');
  const levelInfo = document.querySelector('.level-info');
  
  if (gameInfo && menuButtons) {
    const isCollapsed = gameInfo.classList.contains('collapsed');
    
    if (isCollapsed) {
      // 展開功能表
      gameInfo.classList.remove('collapsed');
      menuButtons.style.display = 'flex';
      if (scoreInfo) scoreInfo.style.display = 'block';
      if (levelInfo) levelInfo.style.display = 'block';
      // 保存狀態到localStorage
      localStorage.setItem('snowcraft_menu_collapsed', 'false');
    } else {
      // 縮小功能表
      gameInfo.classList.add('collapsed');
      menuButtons.style.display = 'none';
      if (scoreInfo) scoreInfo.style.display = 'none';
      if (levelInfo) levelInfo.style.display = 'none';
      // 保存狀態到localStorage
      localStorage.setItem('snowcraft_menu_collapsed', 'true');
    }
  }
}

// 初始化功能表狀態
function initMenuState() {
  const gameInfo = document.getElementById('gameInfo');
  const menuButtons = document.getElementById('menuButtons');
  const scoreInfo = document.querySelector('.score-info');
  const levelInfo = document.querySelector('.level-info');
  
  if (gameInfo && menuButtons) {
    // 強制預設為展開狀態（除非用戶明確設置為縮小）
    const isCollapsed = localStorage.getItem('snowcraft_menu_collapsed') === 'true';
    
    if (isCollapsed) {
      // 用戶明確設置為縮小
      gameInfo.classList.add('collapsed');
      menuButtons.style.display = 'none';
      if (scoreInfo) scoreInfo.style.display = 'none';
      if (levelInfo) levelInfo.style.display = 'none';
    } else {
      // 預設展開狀態（包括新用戶和未設置的用戶）
      gameInfo.classList.remove('collapsed');
      menuButtons.style.display = 'flex';
      if (scoreInfo) scoreInfo.style.display = 'block';
      if (levelInfo) levelInfo.style.display = 'block';
      // 確保設置為展開狀態
      localStorage.setItem('snowcraft_menu_collapsed', 'false');
    }
  }
  
  // 開發時：將重置函數暴露到全局，方便調試
  if (typeof window !== 'undefined') {
    window.resetMenuToDefault = resetMenuToDefault;
    window.forceExpandMenu = forceExpandMenu;
    window.initMenuStateImmediate = initMenuStateImmediate;
  }
}

// 重置功能表到預設狀態（開發用）
function resetMenuToDefault() {
  localStorage.removeItem('snowcraft_menu_collapsed');
  initMenuState();
}

// 強制重置為展開狀態（立即生效）
function forceExpandMenu() {
  const gameInfo = document.getElementById('gameInfo');
  const menuButtons = document.getElementById('menuButtons');
  const scoreInfo = document.querySelector('.score-info');
  const levelInfo = document.querySelector('.level-info');
  
  if (gameInfo && menuButtons) {
    gameInfo.classList.remove('collapsed');
    menuButtons.style.display = 'flex';
    if (scoreInfo) scoreInfo.style.display = 'block';
    if (levelInfo) levelInfo.style.display = 'block';
    localStorage.setItem('snowcraft_menu_collapsed', 'false');
  }
}

// 立即初始化功能表狀態（不依賴localStorage）
function initMenuStateImmediate() {
  const gameInfo = document.getElementById('gameInfo');
  const menuButtons = document.getElementById('menuButtons');
  const scoreInfo = document.querySelector('.score-info');
  const levelInfo = document.querySelector('.level-info');
  
  if (gameInfo && menuButtons) {
    // 強制設置為展開狀態
    gameInfo.classList.remove('collapsed');
    menuButtons.style.display = 'flex';
    if (scoreInfo) scoreInfo.style.display = 'block';
    if (levelInfo) levelInfo.style.display = 'block';
    console.log('功能表已強制設置為展開狀態');
  }
}

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

// 基礎人物半徑
const BASE_PLAYER_RADIUS = 26;
const BASE_ENEMY_RADIUS = 26;
const SNOWBALL_RADIUS = 10;

// 動態計算人物半徑（電腦版相對更小）
function getPlayerRadius() {
  const isMobileDevice = isMobile();
  return isMobileDevice ? BASE_PLAYER_RADIUS : BASE_PLAYER_RADIUS * 0.8; // 電腦版縮小20%
}

function getEnemyRadius() {
  const isMobileDevice = isMobile();
  return isMobileDevice ? BASE_ENEMY_RADIUS : BASE_ENEMY_RADIUS * 0.8; // 電腦版縮小20%
}
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
const SNOWBALL_BASE_SPEED = 8;  // 從5增加到8
const SNOWBALL_MAX_SPEED = 18;  // 從12增加到18
const CHARGE_TIME = 700; // ms
// 雪球最大/最小飛行距離 - 動態計算
let MIN_THROW_DISTANCE = 40;
let MAX_THROW_DISTANCE = 800; // 增加最大投擲距離

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
// 新增：記住上次挑戰的關卡
let lastChallengedLevel = 1;

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
  
  // 更新載入進度顯示
  if (loadingProgress) {
    loadingProgress.textContent = `圖片載入中... ${imagesLoaded}/${totalImages} (部分失敗)`;
  }
  
  if (imagesLoaded >= totalImages) {
    imagesReady = true;
    console.log('圖片載入完成（部分失敗）');
    
    // 隱藏載入指示器
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
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
  
  // 為每個圖片設置超時處理
  setTimeout(() => {
    if (!img.complete && !imagesReady) {
      console.log(`圖片載入超時: ${names[index]}`);
      handleImageError(img, names[index]);
    }
  }, 2000); // 每個圖片2秒超時
});

// 響應式縮放參數
let BASE_WIDTH = 960;
let BASE_HEIGHT = 540;
let scale = 1;

// 電腦版專用參數 - 更大的場地和更小的人物
let COMPUTER_BASE_WIDTH = 1440;  // 增加50%的寬度
let COMPUTER_BASE_HEIGHT = 810;  // 增加50%的高度

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
    
    // 強制視口調整，特別針對手機橫版
    forceViewportAdjustment();
    
    // 大畫面16:9模式，確保不超出視窗
    let w = window.innerWidth;
    let h = window.innerHeight;
    
    // 檢測是否為手機版
    const isMobileDevice = isMobile();
    console.log('是否為手機設備:', isMobileDevice);
    
    // 檢測是否為橫屏
    const isLandscape = w > h;
    console.log('是否為橫屏:', isLandscape);
    
    // 手機版預留UI空間，電腦版充分利用螢幕
    let availableH = isMobileDevice ? h : h; // 手機版不預留空間，完全利用螢幕
    let availableW = w;
    
    if (isMobileDevice && isLandscape) {
      // 手機橫版：完全沒有上下間距，填滿整個視口
      let targetH = availableH; // 完全利用視口高度，沒有邊距
      let targetW = targetH * 16 / 9;
      
      // 如果寬度超出，則以寬度為基準重新計算
      if (targetW > availableW) {
        targetW = availableW;
        targetH = targetW * 9 / 16;
      }
      
      // 確保高度不超出可用高度
      if (targetH > availableH) {
        targetH = availableH;
        targetW = targetH * 16 / 9;
      }
      
      console.log('手機橫版目標尺寸:', targetW, 'x', targetH);
      
      canvas.width = Math.round(targetW * window.devicePixelRatio);
      canvas.height = Math.round(targetH * window.devicePixelRatio);
      canvas.style.width = targetW + 'px';
      canvas.style.height = targetH + 'px';
      scale = targetW / BASE_WIDTH;
      ctx.setTransform(window.devicePixelRatio * scale, 0, 0, window.devicePixelRatio * scale, 0, 0);
      // 注意：投擲距離必須用「邏輯座標」(BASE_WIDTH/BASE_HEIGHT) 計算，
      // 而不是實際螢幕像素(targetW/targetH)，否則不同螢幕尺寸會得到不同的
      // 最大投擲距離，造成手機直版等小螢幕丟不遠的問題。
      MIN_THROW_DISTANCE = 40;
      MAX_THROW_DISTANCE = Math.sqrt(BASE_WIDTH * BASE_WIDTH + BASE_HEIGHT * BASE_HEIGHT) * 0.75;
    } else if (isMobileDevice) {
      // 手機版：充分利用螢幕空間
      let targetW, targetH;
      
      // 計算最大可用空間
      let maxW = w;
      let maxH = availableH;
      
      // 計算基於寬度的尺寸
      let scaleByWidth = maxW / BASE_WIDTH;
      let targetWByWidth = BASE_WIDTH * scaleByWidth;
      let targetHByWidth = BASE_HEIGHT * scaleByWidth;
      
      // 計算基於高度的尺寸
      let scaleByHeight = maxH / BASE_HEIGHT;
      let targetWByHeight = BASE_WIDTH * scaleByHeight;
      let targetHByHeight = BASE_HEIGHT * scaleByHeight;
      
      // 選擇能充分利用空間的尺寸
      if (targetHByWidth <= maxH) {
        // 基於寬度計算的尺寸適合
        targetW = targetWByWidth;
        targetH = targetHByWidth;
      } else {
        // 基於高度計算的尺寸適合
        targetW = targetWByHeight;
        targetH = targetHByHeight;
      }
      
      console.log('手機版目標尺寸:', targetW, 'x', targetH);
      
      canvas.width = Math.round(targetW * window.devicePixelRatio);
      canvas.height = Math.round(targetH * window.devicePixelRatio);
      canvas.style.width = targetW + 'px';
      canvas.style.height = targetH + 'px';
      
      scale = targetW / BASE_WIDTH;
      ctx.setTransform(window.devicePixelRatio * scale, 0, 0, window.devicePixelRatio * scale, 0, 0);
      
      // 同樣使用邏輯座標(BASE_WIDTH/BASE_HEIGHT)計算，避免直版小螢幕
      // 因為 targetW/targetH 過小而導致全力丟擲距離不足。
      MIN_THROW_DISTANCE = 40;
      // 統一：最大投擲距離都設為畫布對角線（邏輯座標）
      MAX_THROW_DISTANCE = Math.sqrt(BASE_WIDTH * BASE_WIDTH + BASE_HEIGHT * BASE_HEIGHT) * 0.75;
    } else {
      // 電腦版：使用更大的基礎尺寸，讓場地更大
      let targetW, targetH;
      
      // 計算最大可用空間
      let maxW = w;
      let maxH = availableH;
      
      // 使用電腦版專用的基礎尺寸
      let computerBaseWidth = COMPUTER_BASE_WIDTH;
      let computerBaseHeight = COMPUTER_BASE_HEIGHT;
      
      // 計算基於寬度的尺寸
      let scaleByWidth = maxW / computerBaseWidth;
      let targetWByWidth = computerBaseWidth * scaleByWidth;
      let targetHByWidth = computerBaseHeight * scaleByWidth;
      
      // 計算基於高度的尺寸
      let scaleByHeight = maxH / computerBaseHeight;
      let targetWByHeight = computerBaseWidth * scaleByHeight;
      let targetHByHeight = computerBaseHeight * scaleByHeight;
      
      // 選擇能充分利用空間的尺寸
      if (targetHByWidth <= maxH) {
        // 基於寬度計算的尺寸適合
        targetW = targetWByWidth;
        targetH = targetHByWidth;
      } else {
        // 基於高度計算的尺寸適合
        targetW = targetWByHeight;
        targetH = targetHByHeight;
      }
      
      console.log('電腦版目標尺寸:', targetW, 'x', targetH);
      
      canvas.width = Math.round(targetW * window.devicePixelRatio);
      canvas.height = Math.round(targetH * window.devicePixelRatio);
      canvas.style.width = targetW + 'px';
      canvas.style.height = targetH + 'px';
      
      // 使用電腦版基礎尺寸計算縮放比例
      scale = targetW / computerBaseWidth;
      ctx.setTransform(window.devicePixelRatio * scale, 0, 0, window.devicePixelRatio * scale, 0, 0);
      
      // 同樣使用邏輯座標(computerBaseWidth/computerBaseHeight)計算，
      // 讓丟擲手感在所有裝置上一致，不受實際螢幕像素大小影響。
      MIN_THROW_DISTANCE = 40;
      // 統一：最大投擲距離都設為畫布對角線（邏輯座標）
      MAX_THROW_DISTANCE = Math.sqrt(computerBaseWidth * computerBaseWidth + computerBaseHeight * computerBaseHeight) * 0.75;
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



// 強制視口高度調整函數
function forceViewportAdjustment() {
  // 設置CSS自定義屬性
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
  
  // 特別處理手機橫版
  if (isMobile() && window.innerWidth > window.innerHeight) {
    console.log('強制調整手機橫版視口');
    
    // 強制設置所有相關元素的高度
    const elements = ['html', 'body', '#container', '#canvasWrap'];
    elements.forEach(selector => {
      const element = document.querySelector(selector);
      if (element) {
        element.style.height = `${window.innerHeight}px`;
        element.style.minHeight = `${window.innerHeight}px`;
        element.style.maxHeight = `${window.innerHeight}px`;
      }
    });
    
    // 特別處理遊戲畫布
    const gameCanvas = document.getElementById('gameCanvas');
    if (gameCanvas) {
      // 完全沒有邊距，填滿整個視口
      const maxHeight = window.innerHeight;
      const maxWidth = window.innerWidth;
      
      let targetH = maxHeight;
      let targetW = targetH * 16 / 9;
      
      if (targetW > maxWidth) {
        targetW = maxWidth;
        targetH = targetW * 9 / 16;
      }
      
      // 再次檢查高度是否超出
      if (targetH > maxHeight) {
        targetH = maxHeight;
        targetW = targetH * 16 / 9;
      }
      
      gameCanvas.style.height = `${targetH}px`;
      gameCanvas.style.maxHeight = `${targetH}px`;
      gameCanvas.style.width = `${targetW}px`;
      gameCanvas.style.maxWidth = `${targetW}px`;
      
      // 確保置中
      gameCanvas.style.margin = '0 auto';
      gameCanvas.style.display = 'block';
      gameCanvas.style.position = 'relative';
      
      // 確保canvasWrap正確置中
      const canvasWrap = document.getElementById('canvasWrap');
      if (canvasWrap) {
        canvasWrap.style.display = 'flex';
        canvasWrap.style.justifyContent = 'center';
        canvasWrap.style.alignItems = 'center';
        canvasWrap.style.width = '100vw';
        canvasWrap.style.height = `${window.innerHeight}px`;
      }
    }
  }
}

// 初始化時調整Canvas
resizeCanvas();

// 強制視口調整
forceViewportAdjustment();

// 確保手機橫版置中的函數
function ensureMobileLandscapeCentering() {
  if (isMobile() && window.innerWidth > window.innerHeight) {
    console.log('確保手機橫版置中');
    
    // 確保canvasWrap正確置中
    const canvasWrap = document.getElementById('canvasWrap');
    if (canvasWrap) {
      canvasWrap.style.display = 'flex';
      canvasWrap.style.justifyContent = 'center';
      canvasWrap.style.alignItems = 'center';
      canvasWrap.style.width = '100vw';
      canvasWrap.style.height = `${window.innerHeight}px`;
      canvasWrap.style.boxSizing = 'border-box';
    }
    
    // 確保遊戲畫布置中且不裁切
    const gameCanvas = document.getElementById('gameCanvas');
    if (gameCanvas) {
      // 完全沒有邊距，填滿整個視口
      const maxHeight = window.innerHeight;
      const maxWidth = window.innerWidth;
      
      let targetH = maxHeight;
      let targetW = targetH * 16 / 9;
      
      if (targetW > maxWidth) {
        targetW = maxWidth;
        targetH = targetW * 9 / 16;
      }
      
      gameCanvas.style.height = `${targetH}px`;
      gameCanvas.style.maxHeight = `${targetH}px`;
      gameCanvas.style.width = `${targetW}px`;
      gameCanvas.style.maxWidth = `${targetW}px`;
      gameCanvas.style.margin = '0 auto';
      gameCanvas.style.display = 'block';
      gameCanvas.style.position = 'relative';
      gameCanvas.style.alignSelf = 'center';
      gameCanvas.style.justifySelf = 'center';
      
      console.log('手機橫版置中完成，尺寸:', targetW, 'x', targetH);
    }
  }
}

// 強制修復手機橫版裁切問題
function forceFixMobileLandscapeClipping() {
  if (isMobile() && window.innerWidth > window.innerHeight) {
    console.log('強制修復手機橫版裁切問題');
    
    const canvasRect = canvas.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    console.log('當前Canvas位置:', {
      left: canvasRect.left,
      top: canvasRect.top,
      right: canvasRect.right,
      bottom: canvasRect.bottom,
      width: canvasRect.width,
      height: canvasRect.height
    });
    
    // 完全沒有邊距，填滿整個視口
    const maxHeight = viewportHeight;
    const maxWidth = viewportWidth;
    
    let targetH = maxHeight;
    let targetW = targetH * 16 / 9;
    
    if (targetW > maxWidth) {
      targetW = maxWidth;
      targetH = targetW * 9 / 16;
    }
    
    // 再次檢查高度
    if (targetH > maxHeight) {
      targetH = maxHeight;
      targetW = targetH * 16 / 9;
    }
    
    console.log('計算的目標尺寸:', targetW, 'x', targetH);
    
    // 應用新的尺寸
    canvas.width = Math.round(targetW * window.devicePixelRatio);
    canvas.height = Math.round(targetH * window.devicePixelRatio);
    canvas.style.width = targetW + 'px';
    canvas.style.height = targetH + 'px';
    
    // 確保置中
    canvas.style.margin = '0 auto';
    canvas.style.display = 'block';
    canvas.style.position = 'relative';
    
    scale = targetW / BASE_WIDTH;
    ctx.setTransform(window.devicePixelRatio * scale, 0, 0, window.devicePixelRatio * scale, 0, 0);
    
    // 強制重新計算Canvas位置
    setTimeout(() => {
      const newRect = canvas.getBoundingClientRect();
      console.log('修復後的Canvas位置:', {
        left: newRect.left,
        top: newRect.top,
        right: newRect.right,
        bottom: newRect.bottom,
        width: newRect.width,
        height: newRect.height,
        isClipped: newRect.bottom > viewportHeight || newRect.right > viewportWidth
      });
    }, 100);
    
    console.log('強制修復完成，新尺寸:', targetW, 'x', targetH);
  }
}

// 初始化後檢查手機橫版裁切問題
setTimeout(() => {
  forceViewportAdjustment();
  checkAndFixMobileLandscapeClipping();
  ensureMobileLandscapeCentering();
  forceFixMobileLandscapeClipping();
}, 500);

// 手機橫版防裁切檢測和修復
function checkAndFixMobileLandscapeClipping() {
  if (isMobile() && window.innerWidth > window.innerHeight) {
    // 檢測是否為手機橫版
    const canvasRect = canvas.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    console.log('手機橫版檢測:', {
      canvasBottom: canvasRect.bottom,
      viewportHeight: viewportHeight,
      canvasRight: canvasRect.right,
      viewportWidth: viewportWidth,
      isClipped: canvasRect.bottom > viewportHeight || canvasRect.right > viewportWidth
    });
    
    // 檢查canvas是否超出視口
    if (canvasRect.bottom > viewportHeight || canvasRect.right > viewportWidth) {
      console.log('檢測到手機橫版裁切問題，正在修復...');
      
      // 完全沒有邊距，填滿整個視口
      const maxHeight = viewportHeight;
      const maxWidth = viewportWidth;
      
      // 優先以高度為基準計算16:9比例
      let targetH = maxHeight;
      let targetW = targetH * 16 / 9;
      
      // 如果寬度超出，則以寬度為基準重新計算
      if (targetW > maxWidth) {
        targetW = maxWidth;
        targetH = targetW * 9 / 16;
        
        // 再次檢查高度是否超出
        if (targetH > maxHeight) {
          targetH = maxHeight;
          targetW = targetH * 16 / 9;
        }
      }
      
      console.log('計算的目標尺寸:', targetW, 'x', targetH);
      
      // 應用新的尺寸
      canvas.width = Math.round(targetW * window.devicePixelRatio);
      canvas.height = Math.round(targetH * window.devicePixelRatio);
      canvas.style.width = targetW + 'px';
      canvas.style.height = targetH + 'px';
      
      // 確保置中
      canvas.style.margin = '0 auto';
      canvas.style.display = 'block';
      canvas.style.position = 'relative';
      
      scale = targetW / BASE_WIDTH;
      ctx.setTransform(window.devicePixelRatio * scale, 0, 0, window.devicePixelRatio * scale, 0, 0);
      
      // 強制重新計算Canvas位置
      setTimeout(() => {
        const newRect = canvas.getBoundingClientRect();
        console.log('修復後的Canvas位置:', {
          left: newRect.left,
          top: newRect.top,
          right: newRect.right,
          bottom: newRect.bottom,
          width: newRect.width,
          height: newRect.height
        });
      }, 100);
      
      console.log('手機橫版裁切修復完成，新尺寸:', targetW, 'x', targetH);
    }
  }
}

// 在方向變化後檢查裁切問題
window.addEventListener('orientationchange', () => {
  console.log('方向改變，重新調整Canvas');
  // 延遲一下確保方向變化完成
  setTimeout(() => {
    forceViewportAdjustment();
    resizeCanvas();
    // 額外檢查裁切問題
    setTimeout(() => {
      forceViewportAdjustment();
      checkAndFixMobileLandscapeClipping();
      ensureMobileLandscapeCentering();
    }, 200);
  }, 100);
  
  // 額外延遲執行以確保完全載入
  setTimeout(() => {
    forceViewportAdjustment();
    resizeCanvas();
    checkAndFixMobileLandscapeClipping();
    ensureMobileLandscapeCentering();
  }, 1000);
});

// 在視窗調整後也檢查裁切問題
window.addEventListener('resize', () => {
  console.log('視窗大小改變，重新調整Canvas');
  forceViewportAdjustment();
  resizeCanvas();
  // 延遲檢查裁切問題
  setTimeout(() => {
    forceViewportAdjustment();
    checkAndFixMobileLandscapeClipping();
    ensureMobileLandscapeCentering();
  }, 100);
});

function resetGame() {
  level = 1;
  score = 0;
  // 新增：顯示開場祝福一秒
  showGreetingUntil = performance.now() + 1000;
  gameState = 'showGreeting';
  resultDiv.textContent = '';
  // 更新分數和關卡顯示
  updateInfo();
  // 確保畫布尺寸正確
  resizeCanvas();
}

function startLevel() {
  // 播放新關卡開始音效（跳過第一關，因為第一關開始時不需要音效）
  if (level > 1) {
    playLevelStartSound();
  }
  
  // 玩家 - 調整位置適應16:9大畫面
  // 電腦版使用更大的基礎尺寸
  const isMobileDevice = isMobile();
  const baseWidth = isMobileDevice ? BASE_WIDTH : COMPUTER_BASE_WIDTH;
  const baseHeight = isMobileDevice ? BASE_HEIGHT : COMPUTER_BASE_HEIGHT;
  
  const canvasWidth = baseWidth;
  const canvasHeight = baseHeight;
  
  // 確保尺寸有效
  if (canvasWidth <= 0 || canvasHeight <= 0) {
    console.log('Canvas尺寸無效，使用預設值');
    return;
  }
  
  console.log('遊戲區域尺寸:', canvasWidth, 'x', canvasHeight);
  
  players = [
    { x: canvasWidth * 0.75, y: canvasHeight * 0.7, hp: PLAYER_MAX_HP, alive: true, stunUntil: 0, charging: false, charge: 0, id: 0, deadState: false, deadTime: 0 },
    { x: canvasWidth * 0.85, y: canvasHeight * 0.75, hp: PLAYER_MAX_HP, alive: true, stunUntil: 0, charging: false, charge: 0, id: 1, deadState: false, deadTime: 0 },
    { x: canvasWidth * 0.8, y: canvasHeight * 0.85, hp: PLAYER_MAX_HP, alive: true, stunUntil: 0, charging: false, charge: 0, id: 2, deadState: false, deadTime: 0 }
  ];
  // 敵人
  enemies = [];
  let enemyCount = ENEMY_START_COUNT + (level - 1) * ENEMY_ADD_PER_LEVEL;
  // 使用矩形網格分布
  const enemyPositions = generateRectGridEnemyPositions(enemyCount, canvasWidth, canvasHeight);
  for (let i = 0; i < enemyCount; i++) {
    const position = enemyPositions[i];
    // 生成初始目標位置
    const initialTarget = generateBoundaryTarget(canvasWidth, canvasHeight);
    enemies.push({
      x: position.x,
      y: position.y,
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
  // 電腦版使用更大的基礎尺寸
  const isMobileDevice = isMobile();
  const baseWidth = isMobileDevice ? BASE_WIDTH : COMPUTER_BASE_WIDTH;
  const baseHeight = isMobileDevice ? BASE_HEIGHT : COMPUTER_BASE_HEIGHT;
  
  const canvasWidth = baseWidth;
  const canvasHeight = baseHeight;
  
  players = [
    { x: canvasWidth * 0.75, y: canvasHeight * 0.7, hp: PLAYER_MAX_HP, alive: true, stunUntil: 0, charging: false, charge: 0, id: 0, deadState: false, deadTime: 0 },
    { x: canvasWidth * 0.85, y: canvasHeight * 0.75, hp: PLAYER_MAX_HP, alive: true, stunUntil: 0, charging: false, charge: 0, id: 1, deadState: false, deadTime: 0 },
    { x: canvasWidth * 0.8, y: canvasHeight * 0.85, hp: PLAYER_MAX_HP, alive: true, stunUntil: 0, charging: false, charge: 0, id: 2, deadState: false, deadTime: 0 }
  ];
  // 敵人
  enemies = [];
  let enemyCount = ENEMY_START_COUNT + (level - 1) * ENEMY_ADD_PER_LEVEL;
  // 使用矩形網格分布
  const enemyPositions = generateRectGridEnemyPositions(enemyCount, canvasWidth, canvasHeight);
  for (let i = 0; i < enemyCount; i++) {
    const position = enemyPositions[i];
    // 生成初始目標位置
    const initialTarget = generateBoundaryTarget(canvasWidth, canvasHeight);
    enemies.push({
      x: position.x,
      y: position.y,
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

// 生成左上三角形均勻分布的敵人位置
function generateRectGridEnemyPositions(enemyCount, canvasWidth, canvasHeight) {
  const margin = 50; // 距離邊界的距離
  const positions = [];
  
  // 在左上三角形區域內生成均勻分布的位置
  for (let i = 0; i < enemyCount; i++) {
    let x, y;
    let attempts = 0;
    const maxAttempts = 100;
    
    // 使用拒絕採樣法在三角形內生成均勻分布的位置
    do {
      // 在整個畫布範圍內隨機生成位置
      x = margin + Math.random() * (canvasWidth - margin * 2);
      y = margin + Math.random() * (canvasHeight - margin * 2);
      attempts++;
    } while (!isInEnemyArea(x, y, canvasWidth, canvasHeight) && attempts < maxAttempts);
    
    // 如果多次嘗試都失敗，強制投影到三角形內
    if (!isInEnemyArea(x, y, canvasWidth, canvasHeight)) {
      // 投影到對角線
      let t = (canvasWidth - x) / (canvasWidth / canvasHeight);
      if (y > t) y = t;
      x = canvasWidth - y * (canvasWidth / canvasHeight);
      // 確保在邊界內
      x = Math.max(margin, Math.min(canvasWidth - margin, x));
      y = Math.max(margin, Math.min(canvasHeight - margin, y));
    }
    
    positions.push({ x, y });
  }
  
  return positions;
}

function updateInfo() {
  // 更新分數和關卡顯示
  if (scoreDisplay) {
    scoreDisplay.textContent = score;
  }
  if (levelDisplay) {
    levelDisplay.textContent = level;
  }
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
    grad.addColorStop(0, "#ffffff"); // 最上方純白
    grad.addColorStop(0.4, "#f0f8ff"); // 上中段淡藍
    grad.addColorStop(0.7, "#e6f3ff"); // 下中段更明顯藍
    grad.addColorStop(1, "#d0e6f7"); // 最下方偏藍
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
      ctx.arc(p.x + offsetX, p.y + offsetY, getPlayerRadius()+10, 0, Math.PI*2);
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
      ctx.arc(p.x + offsetX, p.y + offsetY, getPlayerRadius()+8, 0, Math.PI*2*charge);
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
      ctx.arc(controlX, controlY, getPlayerRadius() + 30, 0, Math.PI*2);
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
      ctx.arc(e.x, e.y, getEnemyRadius()+10, 0, Math.PI*2);
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
      ctx.arc(e.x, e.y, getEnemyRadius()+8, 0, Math.PI*2*charge);
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
    // 中心白、外圈淺藍的漸層
    let grad = ctx.createRadialGradient(s.x, s.y, SNOWBALL_RADIUS * 0.1, s.x, s.y, SNOWBALL_RADIUS);
    grad.addColorStop(0, '#e6f3ff'); // 中心淺藍
    grad.addColorStop(0.4, '#e6f3ff');
    grad.addColorStop(0.7, '#b3d9ff');
    grad.addColorStop(1, '#b3d9ff'); // 外圈更藍
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#7bb6e9'; // 外圈描邊更深藍
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
        if (distance(s, e) < getEnemyRadius() + SNOWBALL_RADIUS) {
          e.hp--;
          // 播放被擊中音效
          playHitSound();
          // 增加分數
          score += 50;
          updateInfo();
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
        if (distance(s, p) < getPlayerRadius() + SNOWBALL_RADIUS) {
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
    
    // 遊戲結束時顯示排行榜
    setTimeout(() => {
      const finalScore = score;
      
      // 只有當分數大於0時才記錄到排行榜
      if (finalScore > 0) {
        const result = addScoreToLeaderboard(finalScore);
        showLeaderboard(finalScore);
      } else {
        // 0分或負分時只顯示排行榜，不記錄分數
        showLeaderboard();
      }
    }, 1000);
  }
  if (enemies.every(e=>!e.alive) && gameState==='playing') {
    gameState = 'win';
    // 播放過關音效
    playLevelStartSound();
    // score += 100; // 已移除過關加分
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
        x: margin + Math.random() * (canvasWidth - margin * 2),
        y: margin
      };
    case 1: // 右邊界（限制在左上三角形內）
      return {
        x: canvasWidth - margin,
        y: margin + Math.random() * (canvasHeight - margin * 2)
      };
    case 2: // 下邊界（限制在左上三角形內）
      return {
        x: margin + Math.random() * (canvasWidth - margin * 2),
        y: canvasHeight - margin
      };
    case 3: // 左邊界
      return {
        x: margin,
        y: margin + Math.random() * (canvasHeight - margin * 2)
      };
  }
}

// --- 新增：計算對角線角度函數 ---
function calculateDiagonalAngle(fromX, fromY, canvasWidth, canvasHeight, isPlayerToEnemy = true) {
  if (isPlayerToEnemy) {
    // 玩家投擲到敵人區域：從右下到左上
    // 計算從右下到左上的角度
    const dx = 0 - canvasWidth; // 從右下到左上的X方向距離（負值）
    const dy = 0 - canvasHeight; // 從右下到左上的Y方向距離（負值）
    
    // 計算對角線角度：從右下到左上
    return Math.atan2(dy, dx);
  } else {
    // 敵人投擲到玩家區域：從左上到右下
    // 計算從左上到右下的角度
    const dx = canvasWidth - 0; // 從左上到右下的X方向距離
    const dy = canvasHeight - 0; // 從左上到右下的Y方向距離
    
    // 計算對角線角度：從左上到右下
    return Math.atan2(dy, dx);
  }
}

// 工具函數：判斷是否在右下三角形（玩家區域）
function isInPlayerArea(x, y, canvasWidth, canvasHeight) {
  // 右下三角形：x > (canvasWidth - y * (canvasWidth/canvasHeight))
  return x > canvasWidth - (y * (canvasWidth / canvasHeight));
}
// 工具函數：判斷是否在左上三角形（敵人區域）
function isInEnemyArea(x, y, canvasWidth, canvasHeight) {
  // 左上三角形：x <= (canvasWidth - y * (canvasWidth/canvasHeight))，包含對角線
  return x <= canvasWidth - (y * (canvasWidth / canvasHeight));
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
  // 考慮設備像素比和縮放比例
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
  let newX = Math.max(getPlayerRadius(), Math.min(canvasWidth - getPlayerRadius(), mx - dragOffsetX));
  let newY = Math.max(getPlayerRadius(), Math.min(canvasHeight - getPlayerRadius(), my - dragOffsetY));
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
  // 防止觸控事件的預設行為（滾動等）
  e.preventDefault();
  
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
  // 考慮設備像素比和縮放比例
  let mx = (e.touches[0].clientX - rect.left) / scale;
  let my = (e.touches[0].clientY - rect.top) / scale;
  
  // 調試信息（手機版）
  if (isMobile()) {
    console.log('Touch move:', {x: mx, y: my, scale: scale, draggingPlayer: draggingPlayer.id, devicePixelRatio: window.devicePixelRatio});
  }
  
  // 檢查觸控是否移出畫布範圍
  if (e.touches[0].clientX < rect.left || e.touches[0].clientX > rect.right || 
      e.touches[0].clientY < rect.top || e.touches[0].clientY > rect.bottom) {
    // 觸控移出畫布，停止拖曳
    handleTouchEnd(e);
    return;
  }
  
  const canvasWidth = canvas.width / window.devicePixelRatio / scale;
  const canvasHeight = canvas.height / window.devicePixelRatio / scale;
  let newX = Math.max(getPlayerRadius(), Math.min(canvasWidth - getPlayerRadius(), mx - dragOffsetX));
  let newY = Math.max(getPlayerRadius(), Math.min(canvasHeight - getPlayerRadius(), my - dragOffsetY));
  if (!isInPlayerArea(newX, newY, canvasWidth, canvasHeight)) {
    let t = (canvasWidth - newX) / (canvasWidth / canvasHeight);
    if (newY < t) newY = t;
    newX = canvasWidth - newY * (canvasWidth / canvasHeight);
  }
  draggingPlayer.x = newX;
  draggingPlayer.y = newY;
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
      e.x = Math.max(getEnemyRadius(), Math.min(canvasWidth - getEnemyRadius(), e.x));
      e.y = Math.max(getEnemyRadius(), Math.min(canvasHeight - getEnemyRadius(), e.y));
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
        const canvasWidth = canvas.width / window.devicePixelRatio / scale;
        const canvasHeight = canvas.height / window.devicePixelRatio / scale;
        let angle = calculateDiagonalAngle(e.x, e.y, canvasWidth, canvasHeight, false); // 敵人投擲到玩家區域
        let speed = SNOWBALL_BASE_SPEED + (SNOWBALL_MAX_SPEED - SNOWBALL_BASE_SPEED) * charge;
        // 手機版速度調整
        if (isMobile()) {
          speed *= 0.7; // 手機版速度降低30%
        }
        let maxDistance = MIN_THROW_DISTANCE + (MAX_THROW_DISTANCE - MIN_THROW_DISTANCE) * charge;
        snowballs.push({
          x: e.x + Math.cos(angle)*getEnemyRadius(),
          y: e.y + Math.sin(angle)*getEnemyRadius(),
          vx: Math.cos(angle)*speed,
          vy: Math.sin(angle)*speed,
          from: 'enemy',
          startX: e.x + Math.cos(angle)*getEnemyRadius(),
          startY: e.y + Math.sin(angle)*getEnemyRadius(),
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
  // 考慮設備像素比和縮放比例
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
  const controlRadius = getPlayerRadius() + 30;
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
      const canvasWidth = canvas.width / window.devicePixelRatio / scale;
      const canvasHeight = canvas.height / window.devicePixelRatio / scale;
      let angle = calculateDiagonalAngle(selectedPlayer.x, selectedPlayer.y, canvasWidth, canvasHeight, true); // 玩家投擲到敵人區域
      let speed = SNOWBALL_BASE_SPEED + (SNOWBALL_MAX_SPEED-SNOWBALL_BASE_SPEED)*charge;
      // 手機版速度調整
      if (isMobile()) {
        speed *= 0.7; // 手機版速度降低30%
      }
      let maxDistance = MIN_THROW_DISTANCE + (MAX_THROW_DISTANCE - MIN_THROW_DISTANCE) * charge;
      snowballs.push({
        x: selectedPlayer.x + Math.cos(angle)*getPlayerRadius(),
        y: selectedPlayer.y + Math.sin(angle)*getPlayerRadius(),
        vx: Math.cos(angle)*speed,
        vy: Math.sin(angle)*speed,
        from: 'player',
        startX: selectedPlayer.x + Math.cos(angle)*getPlayerRadius(),
        startY: selectedPlayer.y + Math.sin(angle)*getPlayerRadius(),
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
  const canvasWidth = canvas.width / window.devicePixelRatio / scale;
  const canvasHeight = canvas.height / window.devicePixelRatio / scale;
  let angle = calculateDiagonalAngle(selectedPlayer.x, selectedPlayer.y, canvasWidth, canvasHeight, true); // 玩家投擲到敵人區域
  let speed = SNOWBALL_BASE_SPEED + (SNOWBALL_MAX_SPEED-SNOWBALL_BASE_SPEED)*charge;
  // 手機版速度調整
  if (isMobile()) {
    speed *= 0.7; // 手機版速度降低30%
  }
  let maxDistance = MIN_THROW_DISTANCE + (MAX_THROW_DISTANCE - MIN_THROW_DISTANCE) * charge;
  snowballs.push({
    x: selectedPlayer.x + Math.cos(angle)*getPlayerRadius(),
    y: selectedPlayer.y + Math.sin(angle)*getPlayerRadius(),
    vx: Math.cos(angle)*speed,
    vy: Math.sin(angle)*speed,
    from: 'player',
    startX: selectedPlayer.x + Math.cos(angle)*getPlayerRadius(),
    startY: selectedPlayer.y + Math.sin(angle)*getPlayerRadius(),
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
  // 防止觸控事件的預設行為（滾動等）
  e.preventDefault();
  
  if (gameState !== 'playing') return;
  if (e.touches.length !== 1) return;
  
  let rect = canvas.getBoundingClientRect();
  // 考慮設備像素比和縮放比例
  let mx = (e.touches[0].clientX - rect.left) / scale;
  let my = (e.touches[0].clientY - rect.top) / scale;
  
  // 調試信息（手機版）
  if (isMobile()) {
    console.log('Touch start:', {x: mx, y: my, scale: scale, rect: rect, devicePixelRatio: window.devicePixelRatio});
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
  const controlRadius = getPlayerRadius() + 30;
  if (distance({x:mx,y:my},{x:controlX,y:controlY}) < controlRadius) {
    if (p.stunUntil > performance.now()) return;
    draggingPlayer = p;
    dragOffsetX = mx - p.x;
    dragOffsetY = my - p.y;
    charging = true;
    chargeStart = performance.now();
    selectedPlayer = p;
    p.charging = true;
    
    // 調試信息（手機版）
    if (isMobile()) {
      console.log('Player selected:', {id: p.id, x: p.x, y: p.y, dragOffset: {x: dragOffsetX, y: dragOffsetY}});
    }
  }
}, {passive: false});

// 觸控釋放事件處理函數
function handleTouchEnd(e) {
  // 防止觸控事件的預設行為
  e.preventDefault();
  
  // 調試信息（手機版）
  if (isMobile()) {
    console.log('Touch end:', {draggingPlayer: draggingPlayer ? draggingPlayer.id : null, charging: charging});
  }
  
  if (draggingPlayer) {
    let now = performance.now();
    let charge = Math.min(1, (now - chargeStart) / CHARGE_TIME);
    if (selectedPlayer && selectedPlayer.alive) {
      const canvasWidth = canvas.width / window.devicePixelRatio / scale;
      const canvasHeight = canvas.height / window.devicePixelRatio / scale;
      let angle = calculateDiagonalAngle(selectedPlayer.x, selectedPlayer.y, canvasWidth, canvasHeight, true); // 玩家投擲到敵人區域
      let speed = SNOWBALL_BASE_SPEED + (SNOWBALL_MAX_SPEED-SNOWBALL_BASE_SPEED)*charge;
      // 手機版速度調整
      if (isMobile()) {
        speed *= 0.7; // 手機版速度降低30%
      }
      let maxDistance = MIN_THROW_DISTANCE + (MAX_THROW_DISTANCE - MIN_THROW_DISTANCE) * charge;
      snowballs.push({
        x: selectedPlayer.x + Math.cos(angle)*getPlayerRadius(),
        y: selectedPlayer.y + Math.sin(angle)*getPlayerRadius(),
        vx: Math.cos(angle)*speed,
        vy: Math.sin(angle)*speed,
        from: 'player',
        startX: selectedPlayer.x + Math.cos(angle)*getPlayerRadius(),
        startY: selectedPlayer.y + Math.sin(angle)*getPlayerRadius(),
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
  const canvasWidth = canvas.width / window.devicePixelRatio / scale;
  const canvasHeight = canvas.height / window.devicePixelRatio / scale;
  let angle = calculateDiagonalAngle(selectedPlayer.x, selectedPlayer.y, canvasWidth, canvasHeight, true); // 玩家投擲到敵人區域
  let speed = SNOWBALL_BASE_SPEED + (SNOWBALL_MAX_SPEED-SNOWBALL_BASE_SPEED)*charge;
  // 手機版速度調整
  if (isMobile()) {
    speed *= 0.7; // 手機版速度降低30%
  }
  let maxDistance = MIN_THROW_DISTANCE + (MAX_THROW_DISTANCE - MIN_THROW_DISTANCE) * charge;
  snowballs.push({
    x: selectedPlayer.x + Math.cos(angle)*getPlayerRadius(),
    y: selectedPlayer.y + Math.sin(angle)*getPlayerRadius(),
    vx: Math.cos(angle)*speed,
    vy: Math.sin(angle)*speed,
    from: 'player',
    startX: selectedPlayer.x + Math.cos(angle)*getPlayerRadius(),
    startY: selectedPlayer.y + Math.sin(angle)*getPlayerRadius(),
    maxDistance: maxDistance
  });
  // 播放投擲音效 - 根據力道決定音效
  playThrowSound(charge > 0.8);
  charging = false;
  if (selectedPlayer) selectedPlayer.charging = false;
  selectedPlayer = null;
}

canvas.addEventListener('touchend', handleTouchEnd, {passive:false});
// 添加全域觸控釋放事件，防止觸控移出畫布後無法釋放
document.addEventListener('touchend', handleTouchEnd, {passive:false});



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

// 排行榜按鈕事件監聽器
if (closeLeaderboardBtn) {
  closeLeaderboardBtn.onclick = () => {
    leaderboardModal.style.display = 'none';
  };
}

if (closeLeaderboardBtn2) {
  closeLeaderboardBtn2.onclick = () => {
    leaderboardModal.style.display = 'none';
  };
}

if (clearLeaderboardBtn) {
  clearLeaderboardBtn.onclick = () => {
    if (confirm('確定要清除所有排行榜記錄嗎？')) {
      clearLeaderboard();
    }
  };
}

// 彈窗統一關閉
function hideAllModals() {
  leaderboardModal.style.display = 'none';
  skipLevelModal.style.display = 'none';
  descDiv.style.display = 'none';
  document.getElementById('canvasWrap').classList.remove('modal-open');
}

// 顯示排行榜
if (showLeaderboardBtn) {
  showLeaderboardBtn.onclick = () => {
    showLeaderboard();
    document.getElementById('canvasWrap').classList.add('modal-open');
  };
  showLeaderboardBtn.addEventListener('touchend', function(e) {
    e.preventDefault();
    e.stopPropagation();
    showLeaderboard();
    document.getElementById('canvasWrap').classList.add('modal-open');
  }, {passive: false});
  // 手機版額外觸控支援
  showLeaderboardBtn.addEventListener('touchstart', function(e) {
    e.preventDefault();
  }, {passive: false});
}

// 功能表切換按鈕
if (toggleMenuBtn) {
  toggleMenuBtn.onclick = toggleMenu;
  toggleMenuBtn.addEventListener('touchend', function(e) {
    e.preventDefault();
    e.stopPropagation();
    toggleMenu();
  }, {passive: false});
  toggleMenuBtn.addEventListener('touchstart', function(e) {
    e.preventDefault();
  }, {passive: false});
}
if (closeLeaderboardBtn) {
  closeLeaderboardBtn.onclick = hideAllModals;
  closeLeaderboardBtn.addEventListener('touchend', function(e) {
    e.preventDefault();
    e.stopPropagation();
    hideAllModals();
  }, {passive: false});
  closeLeaderboardBtn.addEventListener('touchstart', function(e) {
    e.preventDefault();
  }, {passive: false});
}
if (closeLeaderboardBtn2) {
  closeLeaderboardBtn2.onclick = hideAllModals;
  closeLeaderboardBtn2.addEventListener('touchend', function(e) {
    e.preventDefault();
    e.stopPropagation();
    hideAllModals();
  }, {passive: false});
  closeLeaderboardBtn2.addEventListener('touchstart', function(e) {
    e.preventDefault();
  }, {passive: false});
}
// 跳關彈窗
if (skipToLevelBtn) {
  skipToLevelBtn.onclick = () => {
    showSkipLevelModal();
    document.getElementById('canvasWrap').classList.add('modal-open');
  };
  skipToLevelBtn.addEventListener('touchend', function(e) {
    e.preventDefault();
    e.stopPropagation();
    showSkipLevelModal();
    document.getElementById('canvasWrap').classList.add('modal-open');
  }, {passive: false});
  skipToLevelBtn.addEventListener('touchstart', function(e) {
    e.preventDefault();
  }, {passive: false});
}
if (closeSkipLevelBtn) {
  closeSkipLevelBtn.onclick = hideAllModals;
  closeSkipLevelBtn.addEventListener('touchend', function(e) {
    e.preventDefault();
    e.stopPropagation();
    hideAllModals();
  }, {passive: false});
  closeSkipLevelBtn.addEventListener('touchstart', function(e) {
    e.preventDefault();
  }, {passive: false});
}
if (cancelSkipLevelBtn) {
  cancelSkipLevelBtn.onclick = hideAllModals;
  cancelSkipLevelBtn.addEventListener('touchend', function(e) {
    e.preventDefault();
    e.stopPropagation();
    hideAllModals();
  }, {passive: false});
  cancelSkipLevelBtn.addEventListener('touchstart', function(e) {
    e.preventDefault();
  }, {passive: false});
}

// 確認跳關按鈕
if (confirmSkipLevelBtn) {
  confirmSkipLevelBtn.onclick = () => {
    const targetLevel = parseInt(skipLevelInput.value);
    if (targetLevel && skipToLevel(targetLevel)) {
      hideAllModals();
    }
  };
  confirmSkipLevelBtn.addEventListener('touchend', function(e) {
    e.preventDefault();
    e.stopPropagation();
    const targetLevel = parseInt(skipLevelInput.value);
    if (targetLevel && skipToLevel(targetLevel)) {
      hideAllModals();
    }
  }, {passive: false});
  confirmSkipLevelBtn.addEventListener('touchstart', function(e) {
    e.preventDefault();
  }, {passive: false});
}

// 上下按鈕事件處理
if (decreaseLevelBtn) {
  decreaseLevelBtn.onclick = decreaseLevel;
  decreaseLevelBtn.addEventListener('touchend', function(e) {
    e.preventDefault();
    e.stopPropagation();
    decreaseLevel();
  }, {passive: false});
  decreaseLevelBtn.addEventListener('touchstart', function(e) {
    e.preventDefault();
  }, {passive: false});
}

if (increaseLevelBtn) {
  increaseLevelBtn.onclick = increaseLevel;
  increaseLevelBtn.addEventListener('touchend', function(e) {
    e.preventDefault();
    e.stopPropagation();
    increaseLevel();
  }, {passive: false});
  increaseLevelBtn.addEventListener('touchstart', function(e) {
    e.preventDefault();
  }, {passive: false});
}

// 清除排行榜按鈕
if (clearLeaderboardBtn) {
  clearLeaderboardBtn.onclick = () => {
    if (confirm('確定要清除所有排行榜記錄嗎？')) {
      clearLeaderboard();
    }
  };
  clearLeaderboardBtn.addEventListener('touchend', function(e) {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('確定要清除所有排行榜記錄嗎？')) {
      clearLeaderboard();
    }
  }, {passive: false});
  clearLeaderboardBtn.addEventListener('touchstart', function(e) {
    e.preventDefault();
  }, {passive: false});
}

// 重新挑戰當前關卡按鈕
if (restartCurrentLevelBtn) {
  restartCurrentLevelBtn.onclick = () => {
    hideAllModals();
    // 保持當前關卡，只重置玩家狀態和分數
    score = 0;
    players.forEach(player => {
      player.hp = PLAYER_MAX_HP;
      player.alive = true;
      player.stunUntil = 0;
      player.charging = false;
      player.charge = 0;
      player.deadState = false;
      player.deadTime = 0;
    });
    startLevelWithoutSound();
    resultDiv.textContent = '';
    updateInfo();
  };
  restartCurrentLevelBtn.addEventListener('touchend', function(e) {
    e.preventDefault();
    e.stopPropagation();
    hideAllModals();
    // 保持當前關卡，只重置玩家狀態和分數
    score = 0;
    players.forEach(player => {
      player.hp = PLAYER_MAX_HP;
      player.alive = true;
      player.stunUntil = 0;
      player.charging = false;
      player.charge = 0;
      player.deadState = false;
      player.deadTime = 0;
    });
    startLevelWithoutSound();
    resultDiv.textContent = '';
    updateInfo();
  }, {passive: false});
  restartCurrentLevelBtn.addEventListener('touchstart', function(e) {
    e.preventDefault();
  }, {passive: false});
}

// 回到第一關按鈕
if (restartFromFirstLevelBtn) {
  restartFromFirstLevelBtn.onclick = () => {
    hideAllModals();
    resetGame();
    resultDiv.textContent = '';
  };
  restartFromFirstLevelBtn.addEventListener('touchend', function(e) {
    e.preventDefault();
    e.stopPropagation();
    hideAllModals();
    resetGame();
    resultDiv.textContent = '';
  }, {passive: false});
  restartFromFirstLevelBtn.addEventListener('touchstart', function(e) {
    e.preventDefault();
  }, {passive: false});
}
// 說明彈窗
if (showDescBtn && descDiv) {
  showDescBtn.onclick = () => {
    descDiv.style.display = 'block';
    document.getElementById('canvasWrap').classList.add('modal-open');
  };
  showDescBtn.addEventListener('touchend', function(e) {
    e.preventDefault();
    e.stopPropagation();
    descDiv.style.display = 'block';
    document.getElementById('canvasWrap').classList.add('modal-open');
  }, {passive: false});
  showDescBtn.addEventListener('touchstart', function(e) {
    e.preventDefault();
  }, {passive: false});
}
if (closeDescBtn && descDiv) {
  closeDescBtn.onclick = hideAllModals;
  closeDescBtn.addEventListener('touchend', function(e) {
    e.preventDefault();
    e.stopPropagation();
    hideAllModals();
  }, {passive: false});
  closeDescBtn.addEventListener('touchstart', function(e) {
    e.preventDefault();
  }, {passive: false});
}

// 初始化遊戲
function initGame() {
  console.log('Game initializing...');
  console.log('Is mobile:', isMobile());
  console.log('Window size:', window.innerWidth, 'x', window.innerHeight);
  console.log('Device pixel ratio:', window.devicePixelRatio);
  
  // 初始化功能表狀態
  initMenuState();
  
  // 強制確保功能表展開（備用方案）
  setTimeout(() => {
    initMenuStateImmediate();
  }, 100);
  
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
    
    // 更新載入進度顯示
    if (loadingProgress) {
      loadingProgress.textContent = '等待圖片載入...';
    }
    
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
        
        // 隱藏載入指示器
        if (loadingIndicator) {
          loadingIndicator.style.display = 'none';
        }
        
        startGame();
      }
    }, 3000); // 縮短超時時間到3秒
    
    // 添加緊急跳過機制（10秒後強制開始）
    setTimeout(() => {
      if (!imagesReady) {
        console.log('緊急跳過載入，強制開始遊戲');
        imagesReady = true;
        
        // 隱藏載入指示器
        if (loadingIndicator) {
          loadingIndicator.style.display = 'none';
        }
        
        startGame();
      }
    }, 10000);
  }
}

function startGame() {
  console.log('開始遊戲');
  
  // 確保載入指示器已隱藏
  if (loadingIndicator) {
    loadingIndicator.style.display = 'none';
  }
  
  // 強制視口調整，特別針對手機橫版
  forceViewportAdjustment();
  
  // 確保Canvas已經正確設置
  if (canvas.width === 0 || canvas.height === 0) {
    console.log('Canvas尺寸異常，重新調整');
    resizeCanvas();
  }
  
  // 檢查Canvas是否可見
  const rect = canvas.getBoundingClientRect();
  console.log('Canvas位置和尺寸:', rect);
  
  // 額外檢查手機橫版裁切問題
  setTimeout(() => {
    forceViewportAdjustment();
    checkAndFixMobileLandscapeClipping();
    ensureMobileLandscapeCentering();
  }, 200);
  
  resetGame();
  requestAnimationFrame(gameLoop);
}

// 手機版特殊處理
if (isMobile()) {
  // 防止手機版縮放（只在非遊戲區域）
  document.addEventListener('touchstart', function(e) {
    // 檢查是否在遊戲畫布上
    const canvasRect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const isOnCanvas = touch.clientX >= canvasRect.left && 
                      touch.clientX <= canvasRect.right && 
                      touch.clientY >= canvasRect.top && 
                      touch.clientY <= canvasRect.bottom;
    
    // 檢查是否在按鈕或模態框上
    const target = e.target;
    const isOnButton = target.tagName === 'BUTTON' || 
                      target.closest('button') || 
                      target.closest('#leaderboardModal') || 
                      target.closest('#skipLevelModal') || 
                      target.closest('#desc');
    
    // 只有在非遊戲區域且非按鈕區域且多點觸控時才阻止預設行為
    if (!isOnCanvas && !isOnButton && e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });
  
  // 防止雙擊縮放（只在非遊戲區域）
  let lastTouchEnd = 0;
  document.addEventListener('touchend', function(e) {
    // 檢查是否在遊戲畫布上
    const canvasRect = canvas.getBoundingClientRect();
    const touch = e.changedTouches[0];
    const isOnCanvas = touch.clientX >= canvasRect.left && 
                      touch.clientX <= canvasRect.right && 
                      touch.clientY >= canvasRect.top && 
                      touch.clientY <= canvasRect.bottom;
    
    // 檢查是否在按鈕或模態框上
    const target = e.target;
    const isOnButton = target.tagName === 'BUTTON' || 
                      target.closest('button') || 
                      target.closest('#leaderboardModal') || 
                      target.closest('#skipLevelModal') || 
                      target.closest('#desc');
    
    // 只有在非遊戲區域且非按鈕區域且是雙擊時才阻止預設行為
    if (!isOnCanvas && !isOnButton) {
      const now = (new Date()).getTime();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }
  }, false);
}

// 跳過載入按鈕事件
if (skipLoadingBtn) {
  skipLoadingBtn.addEventListener('click', () => {
    console.log('用戶手動跳過載入');
    imagesReady = true;
    
    // 隱藏載入指示器
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
    
    startGame();
  });
  skipLoadingBtn.addEventListener('touchend', function(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('用戶手動跳過載入');
    imagesReady = true;
    
    // 隱藏載入指示器
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
    
    startGame();
  }, {passive: false});
  skipLoadingBtn.addEventListener('touchstart', function(e) {
    e.preventDefault();
  }, {passive: false});
}

// 確保 DOM 完全載入後再初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}

// 立即初始化功能表狀態（確保預設展開）
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(() => {
    initMenuStateImmediate();
  }, 50);
});

// 如果DOM已經加載完成，立即執行
if (document.readyState !== 'loading') {
  setTimeout(() => {
    initMenuStateImmediate();
  }, 50);
} 
