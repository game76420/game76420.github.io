const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const restartBtn = document.getElementById('restartBtn');

const FISH_COUNT = 20;
const GAME_TIME = 60; // 秒

let fishes = [];
let score = 0;
let timeLeft = GAME_TIME;
let gameOver = false;
let fishing = false;
// 鉤子預設在水下
let hookY = 400;
let hookTargetY = 400;
let hookVelY = 0;
const hookDefaultY = 400; // 新增：預設中間位置

// 控制狀態
let keyState = { left: false, right: false, up: false, down: false };

// 物理魚線點數
const LINE_POINTS = 20;
let linePoints = [];
let lineVels = [];

// 主角位置
const player = {
  x: 400,
  y: 180
};

// 大鍋（船）的位置與大小
const pot = {
  x: 320,
  y: 120,
  w: 160,
  h: 80
};

// 主角站在大魚上
const bigFish = {
  x: 400,
  y: 220,
  w: 120,
  h: 50
};

// 抽出單一魚生成函數
function createFish() {
  const colors = ["gold", "#f77", "#7f7", "#77f", "#fcf", "#fa7"];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const face = Math.random() < 0.5 ? 'smile' : 'dot';
  // 隨機決定從左還是右進來
  const fromLeft = Math.random() < 0.5;
  const x = fromLeft ? -30 : 830; // 畫面外
  const dir = fromLeft ? 1 : -1;
  return {
    x,
    y: Math.random() * 350 + 220,
    speed: 1 + Math.random() * 2,
    dir,
    caught: false,
    lifting: false,
    color,
    face
  };
}
// 修改 spawnFish 使用 createFish
function spawnFish() {
  fishes = [];
  for (let i = 0; i < FISH_COUNT; i++) {
    fishes.push(createFish());
  }
}

// --- 垃圾相關 ---
const TRASH_COUNT = 4;
let trashes = [];
function createTrash() {
  // 兩種垃圾：罐頭、瓶子
  const types = ['can', 'bottle'];
  const type = types[Math.floor(Math.random() * types.length)];
  const fromLeft = Math.random() < 0.5;
  const x = fromLeft ? -30 : 830;
  const dir = fromLeft ? 1 : -1;
  return {
    x,
    y: Math.random() * 350 + 220,
    speed: 1 + Math.random() * 1.5,
    dir,
    type,
    hit: false,
    lifting: false,
    flyT: 0
  };
}
function spawnTrash() {
  trashes = [];
  for (let i = 0; i < TRASH_COUNT; i++) {
    trashes.push(createTrash());
  }
}
function drawTrash(trash) {
  ctx.save();
  ctx.translate(trash.x, trash.y);
  ctx.scale(trash.dir, 1);
  if (trash.type === 'can') {
    // 畫罐頭
    ctx.fillStyle = '#bbb';
    ctx.fillRect(-10, -10, 20, 20);
    ctx.fillStyle = '#888';
    ctx.fillRect(-10, -10, 20, 6);
    ctx.fillStyle = '#f00';
    ctx.fillRect(-6, -2, 12, 8);
  } else {
    // 畫瓶子
    ctx.fillStyle = '#8cf';
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(-3, -14, 6, 8);
  }
  ctx.restore();
}
// --- 修改初始化 ---
// 在 spawnFish 之後呼叫 spawnTrash

// 初始化釣魚線點
function initLinePoints() {
  linePoints = [];
  lineVels = [];
  for (let i = 0; i < LINE_POINTS; i++) {
    let t = i / (LINE_POINTS - 1);
    let x = bigFish.x;
    let y = bigFish.y - 10 + (hookY - (bigFish.y - 10)) * t;
    linePoints.push({ x, y });
    lineVels.push({ x: 0, y: 0 });
  }
}

// 每幀更新魚線物理
function updateLinePhysics() {
  // 物理參數
  const spring = 0.18;
  const damp = 0.72;
  // 頂端跟隨大魚
  linePoints[0].x = bigFish.x;
  linePoints[0].y = bigFish.y - 10;
  // 底端跟隨鉤子
  linePoints[LINE_POINTS - 1].x = bigFish.x;
  linePoints[LINE_POINTS - 1].y = hookY;
  // 中間點物理模擬
  for (let i = 1; i < LINE_POINTS - 1; i++) {
    // 受上下兩點彈簧力
    let prev = linePoints[i - 1];
    let next = linePoints[i + 1];
    let self = linePoints[i];
    let vx = (prev.x + next.x) / 2 - self.x;
    let vy = (prev.y + next.y) / 2 - self.y;
    lineVels[i].x = (lineVels[i].x + vx * spring) * damp;
    lineVels[i].y = (lineVels[i].y + vy * spring) * damp;
    self.x += lineVels[i].x;
    self.y += lineVels[i].y;
  }
}

// 畫主角與大鍋和大魚
function drawPlayer() {
  // 大鍋
  ctx.save();
  ctx.fillStyle = "#bbb";
  ctx.beginPath();
  ctx.ellipse(pot.x + pot.w/2, pot.y + pot.h/2, pot.w/2, pot.h/2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 4;
  ctx.stroke();
  // 鍋邊
  ctx.beginPath();
  ctx.ellipse(pot.x + pot.w/2, pot.y + 20, pot.w/2, 20, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#eee";
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // 大魚
  ctx.save();
  ctx.fillStyle = "#aaf";
  ctx.beginPath();
  ctx.ellipse(bigFish.x, bigFish.y, bigFish.w/2, bigFish.h/2, 0, 0, Math.PI * 2);
  ctx.fill();
  // 魚尾
  ctx.beginPath();
  ctx.moveTo(bigFish.x - bigFish.w/2, bigFish.y);
  ctx.lineTo(bigFish.x - bigFish.w/2 - 20, bigFish.y - 20);
  ctx.lineTo(bigFish.x - bigFish.w/2 - 20, bigFish.y + 20);
  ctx.closePath();
  ctx.fillStyle = "#88f";
  ctx.fill();
  ctx.restore();
  // 主角
  ctx.save();
  ctx.fillStyle = "#f44";
  ctx.beginPath();
  ctx.arc(bigFish.x, bigFish.y - 40, 22, 0, Math.PI * 2);
  ctx.fill();
  // 眼睛
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(bigFish.x - 7, bigFish.y - 45, 5, 0, Math.PI * 2);
  ctx.arc(bigFish.x + 7, bigFish.y - 45, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(bigFish.x - 7, bigFish.y - 45, 2, 0, Math.PI * 2);
  ctx.arc(bigFish.x + 7, bigFish.y - 45, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// 畫釣竿和虛線釣魚線與小圓點鉤子
function drawRod() {
  updateLinePhysics();
  ctx.save();
  ctx.strokeStyle = "#222";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.moveTo(linePoints[0].x, linePoints[0].y);
  for (let i = 1; i < linePoints.length; i++) {
    ctx.lineTo(linePoints[i].x, linePoints[i].y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  // 小圓點鉤子
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(bigFish.x, hookY, 6, 0, Math.PI * 2);
  ctx.fill();
}

// 畫魚
function drawFish(fish) {
  ctx.save();
  ctx.translate(fish.x, fish.y);
  ctx.scale(fish.dir, 1);
  ctx.fillStyle = fish.caught ? "#aaa" : fish.color;
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  // 魚尾
  ctx.beginPath();
  ctx.moveTo(-22, 0);
  ctx.lineTo(-32, -8);
  ctx.lineTo(-32, 8);
  ctx.closePath();
  ctx.fillStyle = fish.caught ? "#888" : "#f90";
  ctx.fill();
  // 眼睛
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(10, -4, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(11, -4, 1.5, 0, Math.PI * 2);
  ctx.fill();
  // 表情
  ctx.save();
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  if (fish.face === 'smile') {
    ctx.beginPath();
    ctx.arc(10, 2, 3, 0, Math.PI, false);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(10, 2, 1, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}

// 魚被釣上來的狀態
for (let fish of fishes) fish.lifting = false;

// 新增：分數條與飢餓條更新
function updateScoreBar(score) {
  const scoreCircles = document.getElementById('scoreCircles');
  scoreCircles.innerHTML = '';
  for (let i = 0; i < 10; i++) {
    scoreCircles.innerHTML += `<span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:${i<score/100?'#0f0':'#fff'};border:2px solid #00f;margin-right:2px;"></span>`;
  }
}
function updateHungerBar(hunger) {
  const hungerMeter = document.getElementById('hungerMeter');
  hungerMeter.innerHTML = '';
  for (let i = 0; i < 10; i++) {
    hungerMeter.innerHTML += `<span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:${i<hunger?'orange':'#fff'};border:2px solid orange;margin-right:2px;"></span>`;
  }
}

// --- 新增 ---
let animationId = null;
let countdownTimer = null;

// 遊戲主迴圈
function gameLoop() {
  updateLinePhysics();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 畫天空
  let skyGradient = ctx.createLinearGradient(0, 0, 0, 200);
  skyGradient.addColorStop(0, '#b3e0ff'); // 淺藍
  skyGradient.addColorStop(1, '#87ceeb'); // 天空藍
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, canvas.width, 200);

  // 畫海
  let seaGradient = ctx.createLinearGradient(0, 200, 0, canvas.height);
  seaGradient.addColorStop(0, '#3399ff'); // 海平面
  seaGradient.addColorStop(1, '#005080'); // 深藍
  ctx.fillStyle = seaGradient;
  ctx.fillRect(0, 200, canvas.width, canvas.height - 200);

  // 畫海平面線
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 200);
  ctx.lineTo(canvas.width, 200);
  ctx.stroke();

  // 控制主角與大魚左右移動
  if (keyState.left) bigFish.x -= 6;
  if (keyState.right) bigFish.x += 6;
  if (bigFish.x < 60) bigFish.x = 60;
  if (bigFish.x > 740) bigFish.x = 740;
  // 釣魚線起點、鉤子都跟著 bigFish.x

  // 控制魚鉤上下移動（慣性/拉力）
  if (!fishing) {
    if (keyState.up) {
      hookVelY -= 1.5; // 向上拉
    } else if (keyState.down) {
      hookVelY += 1.5; // 向下拉
    } else {
      // 沒有按上下時，緩慢回到中間
      let diff = hookDefaultY - hookY;
      if (diff > 0) {
        // 上浮（鉤子在下方）
        hookVelY += diff * 0.001; // 上浮速度
      } else {
        // 下沉（鉤子在上方）
        hookVelY += diff * 0.0002; // 下沉更慢
      }
    }
    // 阻尼
    hookVelY *= 0.92;
    hookY += hookVelY;
    if (hookY < 120) {
      hookY = 120;
      hookVelY = 0;
    }
    if (hookY > 580) {
      hookY = 580;
      hookVelY = 0;
    }
  }

  // 畫主角和釣竿
  drawPlayer();
  drawRod();

  // 畫魚
  for (let fish of fishes) {
    if (!fish.caught) {
      fish.x += fish.speed * fish.dir;
      // 只有當魚已經完全進到畫面內時才允許反彈
      if ((fish.dir === 1 && fish.x > 780) || (fish.dir === -1 && fish.x < 20)) {
        fish.dir *= -1;
      }
    }
    drawFish(fish);
  }

  // 畫垃圾
  for (let trash of trashes) {
    if (!trash.lifting && !trash.hit) {
      trash.x += trash.speed * trash.dir;
      if ((trash.dir === 1 && trash.x > 820) || (trash.dir === -1 && trash.x < -20)) {
        // 重新生成
        Object.assign(trash, createTrash());
      }
    }
    drawTrash(trash);
  }

  // 垃圾被釣起來動畫
  for (let trash of trashes) {
    if (trash.lifting && !trash.hit) {
      if (!trash.flyT) trash.flyT = 0;
      trash.flyT += 0.04;
      let startX = trash.x, startY = trash.y;
      let endX = pot.x + pot.w/2 + (Math.random()-0.5)*pot.w*0.4;
      let endY = pot.y + pot.h/2 - 10;
      let t = trash.flyT;
      if (t > 1) t = 1;
      trash.x = startX * (1-t) + endX * t;
      trash.y = startY * (1-t) + endY * t - 80*t*(1-t);
      if (t === 1) {
        trash.hit = true;
        trash.lifting = false;
        trash.flyT = 0;
        // 重新生成新垃圾
        Object.assign(trash, createTrash());
      }
    }
  }

  // 分數顯示在畫面上方
  ctx.save();
  ctx.font = "bold 36px Arial";
  ctx.fillStyle = "#00f";
  ctx.fillText("分數: " + score, 30, 60);
  ctx.restore();

  // 時間百分比條
  const barX = 200, barY = 20, barW = 400, barH = 18;
  ctx.save();
  // 底色
  ctx.fillStyle = '#ccc';
  ctx.fillRect(barX, barY, barW, barH);
  // 進度
  let percent = Math.max(0, Math.min(1, timeLeft / GAME_TIME));
  ctx.fillStyle = '#00aaff';
  ctx.fillRect(barX, barY, barW * percent, barH);
  // 邊框
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, barW, barH);
  // 數字
  ctx.font = 'bold 18px Arial';
  ctx.fillStyle = '#222';
  ctx.fillText(timeLeft + ' / ' + GAME_TIME + ' 秒', barX + barW + 16, barY + barH - 3);
  ctx.restore();

  // 時間
  ctx.fillStyle = "#fff";
  ctx.font = "24px Arial";
  ctx.fillText("剩餘時間: " + timeLeft + " 秒", 600, 40);

  // 魚被釣上來動畫
  for (let fish of fishes) {
    if (fish.lifting && !fish.caught) {
      // 飛行進度
      if (!fish.flyT) fish.flyT = 0;
      fish.flyT += 0.04;
      // 拋物線飛到空中
      let startX = fish.x, startY = fish.y;
      let endX = pot.x + pot.w/2 + (Math.random()-0.5)*pot.w*0.4;
      let endY = pot.y + pot.h/2 - 10;
      let t = fish.flyT;
      if (t > 1) t = 1;
      // 拋物線插值
      fish.x = startX * (1-t) + endX * t;
      fish.y = startY * (1-t) + endY * t - 80*t*(1-t); // 拋物線效果
      // 進入船範圍才加分
      if (t === 1) {
        if (
          fish.x > pot.x && fish.x < pot.x + pot.w &&
          fish.y > pot.y && fish.y < pot.y + pot.h
        ) {
          fish.caught = true;
          score += 100;
          // 吃到魚增加遊戲時間
          timeLeft += 3;
          if (timeLeft > GAME_TIME) timeLeft = GAME_TIME;
          // 立刻生成新魚
          fishes.push(createFish());
        }
        fish.lifting = false;
        fish.flyT = 0;
      }
    }
  }

  // 鉤子動畫
  if (fishing) {
    if (hookY > player.y + 10) {
      hookY -= 18;
      if (hookY < player.y + 10) hookY = player.y + 10;
      // 在拉鉤過程中，每一幀都判斷魚線碰撞
      for (let fish of fishes) {
        if (fish.lifting || fish.caught) continue;
        // 先判斷鉤子直接碰到
        if (Math.abs(fish.x - bigFish.x) < 25 && Math.abs(fish.y - hookY) < 20) {
          fish.lifting = true;
          fish.flyT = 0;
          continue;
        }
        // 再判斷是否在線上
        for (let i = 0; i < linePoints.length - 1; i++) {
          let x1 = linePoints[i].x, y1 = linePoints[i].y;
          let x2 = linePoints[i+1].x, y2 = linePoints[i+1].y;
          let dx = x2 - x1, dy = y2 - y1;
          let len2 = dx*dx + dy*dy;
          let t = ((fish.x - x1) * dx + (fish.y - y1) * dy) / len2;
          t = Math.max(0, Math.min(1, t));
          let px = x1 + t * dx, py = y1 + t * dy;
          let dist = Math.hypot(fish.x - px, fish.y - py);
          if (dist < 15) {
            fish.lifting = true;
            fish.flyT = 0;
            break;
          }
        }
      }
      // 檢查垃圾碰撞
      for (let trash of trashes) {
        if (trash.lifting || trash.hit) continue;
        if (Math.abs(trash.x - bigFish.x) < 25 && Math.abs(trash.y - hookY) < 20) {
          trash.lifting = true;
          trash.flyT = 0;
          timeLeft -= 10;
          if (timeLeft < 0) timeLeft = 0;
          continue;
        }
        // 線段碰撞
        for (let i = 0; i < linePoints.length - 1; i++) {
          let x1 = linePoints[i].x, y1 = linePoints[i].y;
          let x2 = linePoints[i+1].x, y2 = linePoints[i+1].y;
          let dx = x2 - x1, dy = y2 - y1;
          let len2 = dx*dx + dy*dy;
          let t = ((trash.x - x1) * dx + (trash.y - y1) * dy) / len2;
          t = Math.max(0, Math.min(1, t));
          let px = x1 + t * dx, py = y1 + t * dy;
          let dist = Math.hypot(trash.x - px, trash.y - py);
          if (dist < 15) {
            trash.lifting = true;
            trash.flyT = 0;
            timeLeft -= 10;
            if (timeLeft < 0) timeLeft = 0;
            break;
          }
        }
      }
    } else {
      // 拉到空中，甩魚
      fishing = false;
      hookTargetY = 400;
    }
  } else if (hookY < hookTargetY) {
    hookY += 8;
    if (hookY > hookTargetY) hookY = hookTargetY;
  }

  // 遊戲結束
  if (timeLeft <= 0) {
    gameOver = true;
    restartBtn.style.display = "block";
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "48px Arial";
    ctx.fillText("遊戲結束", 300, 300);
    ctx.font = "36px Arial";
    ctx.fillText("分數: " + score, 320, 360);
    return;
  }
  animationId = requestAnimationFrame(gameLoop);
}

// 倒數計時
function countdown() {
  if (!gameOver) {
    timeLeft--;
    if (timeLeft > 0) {
      countdownTimer = setTimeout(countdown, 1000);
    }
  }
}

// 釣魚（滑鼠點擊或空白鍵）
canvas.addEventListener("mousedown", () => {
  if (!gameOver && !fishing) {
    fishing = true;
  }
});
document.addEventListener("keydown", (e) => {
  if (!gameOver && !fishing && e.code === "Space") {
    fishing = true;
  }
});

// 方向鍵事件
window.addEventListener('keydown', (e) => {
  if (e.code === 'ArrowLeft') keyState.left = true;
  if (e.code === 'ArrowRight') keyState.right = true;
  if (e.code === 'ArrowUp') keyState.up = true;
  if (e.code === 'ArrowDown') keyState.down = true;
  // 空白鍵釣魚
  if (!gameOver && !fishing && e.code === "Space") {
    fishing = true;
  }
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft') keyState.left = false;
  if (e.code === 'ArrowRight') keyState.right = false;
  if (e.code === 'ArrowUp') keyState.up = false;
  if (e.code === 'ArrowDown') keyState.down = false;
});

// 重新開始
restartBtn.addEventListener("click", () => {
  // 停止前一輪動畫和計時
  if (animationId) cancelAnimationFrame(animationId);
  if (countdownTimer) clearTimeout(countdownTimer);
  score = 0;
  timeLeft = GAME_TIME;
  gameOver = false;
  restartBtn.style.display = "none";
  spawnFish();
  spawnTrash();
  initLinePoints(); // 重新初始化魚線點
  hookY = 400;
  hookVelY = 0;
  hookTargetY = 400;
  animationId = requestAnimationFrame(gameLoop);
  countdownTimer = setTimeout(countdown, 1000);
});

// 初始化
// 停止殘留動畫和計時
if (animationId) cancelAnimationFrame(animationId);
if (countdownTimer) clearTimeout(countdownTimer);
spawnFish();
spawnTrash();
initLinePoints();
animationId = requestAnimationFrame(gameLoop);
countdownTimer = setTimeout(countdown, 1000); 
