// --- 遊戲參數 ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const resultDiv = document.getElementById('result');
const restartBtn = document.getElementById('restartBtn');
const levelSpan = document.getElementById('level');
const playerCountSpan = document.getElementById('playerCount');
const enemyCountSpan = document.getElementById('enemyCount');
const scoreSpan = document.getElementById('score');
const showDescBtn = document.getElementById('showDescBtn');
const descDiv = document.getElementById('desc');
const closeDescBtn = document.getElementById('closeDescBtn');

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
const ENEMY_THROW_RANGE = 340;
const PLAYER_THROW_RANGE = 400;
const SNOWBALL_BASE_SPEED = 5;
const SNOWBALL_MAX_SPEED = 12;
const CHARGE_TIME = 1000; // ms
// 雪球最大/最小飛行距離
const MIN_THROW_DISTANCE = 40;
const MAX_THROW_DISTANCE = 600;

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
playerIdleImg.src = 'img/player_idle.png';

// 響應式縮放參數
let BASE_WIDTH = 800;
let BASE_HEIGHT = 600;
let scale = 1;

function resizeCanvas() {
  // 取得可用寬高
  let w = window.innerWidth;
  let h = window.innerHeight;
  // 以寬高比 4:3 為主
  let targetW = Math.min(w, BASE_WIDTH);
  let targetH = targetW * 3 / 4;
  if (h < targetH + 120) { // 若高度不足，縮小寬度
    targetH = h - 120;
    targetW = targetH * 4 / 3;
  }
  scale = targetW / BASE_WIDTH;
  canvas.width = Math.round(targetW * window.devicePixelRatio);
  canvas.height = Math.round(targetH * window.devicePixelRatio);
  canvas.style.width = targetW + 'px';
  canvas.style.height = targetH + 'px';
  ctx.setTransform(window.devicePixelRatio * scale, 0, 0, window.devicePixelRatio * scale, 0, 0);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function resetGame() {
  level = 1;
  score = 0;
  // 新增：顯示開場祝福一秒
  showGreetingUntil = performance.now() + 1000;
  gameState = 'showGreeting';
  resultDiv.textContent = '';
  restartBtn.style.display = 'none';
}

function startLevel() {
  // 玩家
  players = [
    { x: 600, y: 340, hp: PLAYER_MAX_HP, alive: true, stunUntil: 0, charging: false, charge: 0, id: 0 },
    { x: 670, y: 370, hp: PLAYER_MAX_HP, alive: true, stunUntil: 0, charging: false, charge: 0, id: 1 },
    { x: 630, y: 420, hp: PLAYER_MAX_HP, alive: true, stunUntil: 0, charging: false, charge: 0, id: 2 }
  ];
  // 敵人
  enemies = [];
  let enemyCount = ENEMY_START_COUNT + (level - 1) * ENEMY_ADD_PER_LEVEL;
  for (let i = 0; i < enemyCount; i++) {
    // 讓敵人分布在左上角區域，避免重疊
    let baseX = 50 + (i % 3) * 60;
    let baseY = 60 + Math.floor(i / 3) * 60;
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
      chargeStart: 0 // 新增
    });
  }
  snowballs = [];
  gameState = 'playing';
  updateInfo();
}

function updateInfo() {
  levelSpan.textContent = `關卡：${level}`;
  playerCountSpan.textContent = `我方剩餘：${players.filter(p=>p.alive).length}`;
  enemyCountSpan.textContent = `敵方剩餘：${enemies.filter(e=>e.alive).length}`;
  scoreSpan.textContent = `分數：${score}`;
}

// --- 新增：美化角色繪製 ---
function drawPlayerSprite(p, color) {
  ctx.save();
  ctx.translate(p.x, p.y);
  // 準備丟狀態顯示貼圖
  if (p.charging && charging && selectedPlayer === p) {
    if (playerPrepareImg.complete && playerPrepareImg.naturalWidth) {
      const targetH = 64;
      const scale = targetH / playerPrepareImg.naturalHeight;
      const targetW = playerPrepareImg.naturalWidth * scale;
      ctx.drawImage(playerPrepareImg, -targetW/2, -targetH/2, targetW, targetH);
      ctx.restore();
      return;
    }
  }
  // 平常狀態顯示貼圖
  if (!p.charging && p.alive) {
    if (playerIdleImg.complete && playerIdleImg.naturalWidth) {
      const targetH = 64;
      const scale = targetH / playerIdleImg.naturalHeight;
      const targetW = playerIdleImg.naturalWidth * scale;
      ctx.drawImage(playerIdleImg, -targetW/2, -targetH/2, targetW, targetH);
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
  // 雪地漸層
  let grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#f8fbff");
  grad.addColorStop(1, "#eaf6ff");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // 雪堆
  drawSnowPile(200, 80, 40);
  drawSnowPile(700, 420, 50);
}

// --- 修改玩家繪製 ---
function drawPlayers() {
  players.forEach((p, idx) => {
    if (!p.alive) return;
    ctx.save();
    ctx.globalAlpha = (p.stunUntil > performance.now()) ? 0.5 : 1;
    drawPlayerSprite(p, "#d22");
    // HP
    for (let i = 0; i < p.hp; i++) {
      ctx.beginPath();
      ctx.arc(p.x - 16 + i*16, p.y - 32, 6, 0, Math.PI*2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#d22';
      ctx.stroke();
    }
    // 暈圈
    if (p.stunUntil > performance.now()) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, PLAYER_RADIUS+10, 0, Math.PI*2);
      ctx.strokeStyle = '#f9c';
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 1;
    }
    // 集氣圈
    if (p.charging && charging && selectedPlayer === p) {
      let charge = Math.min(1, (performance.now() - chargeStart) / CHARGE_TIME);
      ctx.beginPath();
      ctx.arc(p.x, p.y, PLAYER_RADIUS+8, 0, Math.PI*2*charge);
      ctx.strokeStyle = '#f90';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    ctx.restore();
  });
}

// --- 修改敵人繪製 ---
function drawEnemies() {
  enemies.forEach(e => {
    ctx.save();
    if (e.deadState) {
      drawEnemySprite(e, "#2a5", 'dead');
      ctx.restore();
      return;
    }
    if (!e.alive) {
      ctx.restore();
      return;
    }
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
      // ctx.beginPath();
      // ctx.arc(e.x, e.y, ENEMY_RADIUS+14, 0, Math.PI*2);
      // ctx.strokeStyle = '#ff0';
      // ctx.lineWidth = 4;
      // ctx.globalAlpha = 0.7;
      // ctx.stroke();
      // ctx.globalAlpha = 1;
      // ctx.lineWidth = 1;
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
    // 狀態文字（debug）
    ctx.save();
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#333';
    const stateMap = {
      'idle': '移動',
      'crouch': '蹲下',
      'prepare': '準備丟',
      'throw': '丟出',
      'standup': '起身',
      'pain': '疼痛',
      'fall': '倒地',
      'dead': '死亡'
    };
    ctx.fillText(stateMap[e.throwState] || e.throwState, e.x, e.y - 48);
    ctx.restore();
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
  if (gameState === 'win') {
    ctx.save();
    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = '#2a5';
    ctx.fillText('過關！', canvas.width/2-70, canvas.height/2);
    ctx.restore();
  } else if (gameState === 'lose') {
    ctx.save();
    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = '#d22';
    ctx.fillText('遊戲結束', canvas.width/2-110, canvas.height/2);
    ctx.restore();
  }
  // 新增：開場祝福
  if (gameState === 'showGreeting' && performance.now() < showGreetingUntil) {
    ctx.save();
    ctx.font = '44px serif';
    ctx.fillStyle = '#357';
    ctx.textAlign = 'center';
    ctx.fillText("Season's Greetings", canvas.width/2, canvas.height/2);
    ctx.restore();
  }
  // 新增：顯示關卡文字
  if (showLevelText && performance.now() < showLevelTextUntil) {
    ctx.save();
    ctx.font = 'bold 60px Arial';
    ctx.fillStyle = '#357';
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.85;
    ctx.fillText('Level ' + showLevelTextValue, canvas.width/2, canvas.height/2);
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

function drawChargeBar() {
  if (charging && selectedPlayer && selectedPlayer.alive) {
    let charge = Math.min(1, (performance.now() - chargeStart) / CHARGE_TIME);
    let barW = 220, barH = 18;
    let x = canvas.width/2 - barW/2, y = 40;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, y, barW, barH);
    ctx.strokeStyle = '#bbb';
    ctx.strokeRect(x, y, barW, barH);
    ctx.fillStyle = '#f90';
    ctx.fillRect(x, y, barW*charge, barH);
    ctx.strokeStyle = '#f90';
    ctx.strokeRect(x, y, barW*charge, barH);
    ctx.restore();
  }
}

function gameLoop(ts) {
  drawBackground();
  drawPlayers();
  drawEnemies();
  drawSnowballs();
  drawChargeBar();
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
          }
          s.dead = true;
        }
      });
    } else if (s.from === 'enemy') {
      players.forEach(p => {
        if (!p.alive || p.stunUntil > performance.now()) return;
        if (distance(s, p) < PLAYER_RADIUS + SNOWBALL_RADIUS) {
          p.hp--;
          p.stunUntil = performance.now() + STUN_DURATION;
          if (p.hp <= 0) p.alive = false;
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
  snowballs = snowballs.filter(s => !s.dead && s.x > -30 && s.x < canvas.width+30 && s.y > -30 && s.y < canvas.height+30);
  // 勝負判斷
  if (players.every(p=>!p.alive) && gameState==='playing') {
    gameState = 'lose';
    resultDiv.textContent = '遊戲結束！全部紅衣小朋友被淘汰';
    restartBtn.style.display = 'inline-block';
  }
  if (enemies.every(e=>!e.alive) && gameState==='playing') {
    gameState = 'win';
    resultDiv.textContent = '過關！1秒後自動進入下一關';
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
          startLevel();
        }, 1000);
      } else {
        startLevel();
      }
      resultDiv.textContent = '';
      restartBtn.style.display = 'none';
    }, 1000);
  }
}

function randomStateDelay() {
  return 1000 + Math.random() * 1000; // 1~2秒
}

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
    // 狀態機流程
    if (e.throwState === 'idle') {
      // idle時才移動
      let t = (performance.now() + e.moveOffset) / 1000;
      let moveY = Math.sin(t * 1.2 + e.id) * 0.7;
      let moveX = Math.cos(t * 0.7 + e.id) * 0.7;
      e.x += moveX;
      e.y += moveY;
      // 行走動畫切換
      e.walkFrame = Math.floor(performance.now() / 250) % 2;
      // 限制敵人不會移出畫面
      e.x = Math.max(ENEMY_RADIUS, Math.min(canvas.width - ENEMY_RADIUS, e.x));
      e.y = Math.max(ENEMY_RADIUS, Math.min(canvas.height - ENEMY_RADIUS, e.y));
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
        // 計算 charge
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
        e.lastThrow = ts;
        e.nextThrow = randomThrowInterval();
      }
    } else if (e.throwState === 'throw') {
      // 丟出狀態顯示 0.2 秒
      if (ts >= e.throwStateUntil) {
        e.throwState = 'standup';
        e.throwStateUntil = ts + randomStateDelay();
      }
    } else if (e.throwState === 'standup') {
      // 起身，不能移動
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
  let mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  let my = (e.clientY - rect.top) * (canvas.height / rect.height);
  // 選擇最近紅衣角色
  let candidates = players.filter(p=>p.alive && p.stunUntil < performance.now());
  if (candidates.length === 0) return;
  let p = candidates.reduce((a,b)=>distance({x:mx,y:my},a)<distance({x:mx,y:my},b)?a:b);
  if (distance({x:mx,y:my},p) < PLAYER_RADIUS+16) {
    // 拖曳移動並集氣
    // 新增：暈眩時不能拖動
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

canvas.addEventListener('mousemove', e => {
  if (!draggingPlayer) return;
  // 新增：拖動中如果進入暈眩狀態，立即停止拖動
  if (draggingPlayer.stunUntil > performance.now()) {
    draggingPlayer.charging = false;
    draggingPlayer = null;
    charging = false;
    selectedPlayer = null;
    return;
  }
  let rect = canvas.getBoundingClientRect();
  let mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  let my = (e.clientY - rect.top) * (canvas.height / rect.height);
  draggingPlayer.x = mx - dragOffsetX;
  draggingPlayer.y = my - dragOffsetY;
});

canvas.addEventListener('mouseup', e => {
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
  charging = false;
  if (selectedPlayer) selectedPlayer.charging = false;
  selectedPlayer = null;
});

// 觸控操作
canvas.addEventListener('touchstart', e => {
  if (gameState !== 'playing') return;
  if (e.touches.length !== 1) return;
  let rect = canvas.getBoundingClientRect();
  let mx = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
  let my = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
  let candidates = players.filter(p=>p.alive && p.stunUntil < performance.now());
  if (candidates.length === 0) return;
  let p = candidates.reduce((a,b)=>distance({x:mx,y:my},a)<distance({x:mx,y:my},b)?a:b);
  if (distance({x:mx,y:my},p) < PLAYER_RADIUS+16) {
    if (p.stunUntil > performance.now()) return;
    draggingPlayer = p;
    dragOffsetX = mx - p.x;
    dragOffsetY = my - p.y;
    charging = true;
    chargeStart = performance.now();
    selectedPlayer = p;
    p.charging = true;
    e.preventDefault();
  }
}, {passive:false});

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
  let mx = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
  let my = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
  draggingPlayer.x = mx - dragOffsetX;
  draggingPlayer.y = my - dragOffsetY;
  e.preventDefault();
}, {passive:false});

canvas.addEventListener('touchend', e => {
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
  charging = false;
  if (selectedPlayer) selectedPlayer.charging = false;
  selectedPlayer = null;
  e.preventDefault();
}, {passive:false});

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

resetGame();
requestAnimationFrame(gameLoop); 