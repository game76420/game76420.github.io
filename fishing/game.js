const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const restartBtn = document.getElementById('restartBtn');

const FISH_COUNT = 20;
const GAME_TIME = 85; // 秒

let fishes = [];
let score = 0;
let timeLeft = GAME_TIME;
let displayTimeLeft = GAME_TIME; // 新增：用於時間條補間動畫
let gameOver = false;
let fishing = false;
// 新增：時間控制變數
let lastTime = 0;
let deltaTime = 0;
const targetFPS = 60;
const frameTime = 1000 / targetFPS;
// 新增：鉤子拋物線動畫狀態
let hookThrowing = false;
let hookThrowT = 0;
let hookThrowStartY = 0, hookThrowEndY = 0;
let hookThrowStartX = 0, hookThrowEndX = 0;
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
// 新增：標記每段線是否碰撞
let lineCollisions = [];

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
// 新增：主角方向（1=右，-1=左）
let playerDir = 1;
// --- 新增：碗沉到底動畫 ---
let bowlSinking = false;
let bowlY = pot.y;
let bowlSinkTargetY = null;
let bowlSinkSpeed = 6;
let bowlSinkCallback = null;
// --- 新增：鍋子浮動速度 ---
let bowlY_vel = 0;
let bowlImpulseY = 0; // 新增：碗的下沉衝擊

// --- 新增：主角移動影響波浪 ---
let waveDisturb = { x: 0, v: 0, t: 0 };

const COLLISION_DIST = 38;

// 檢查魚線碰撞的函數
function checkLineCollision() {
  // 每次檢查前先重設碰撞標記
  lineCollisions = Array(LINE_POINTS - 1).fill(false);
  // 檢查魚碰撞
  for (let fish of fishes) {
    if (fish.lifting || fish.caught) continue;
    // 先判斷鉤子直接碰到（距離放寬）
    if (Math.abs(fish.x - bigFish.x) < 32 && Math.abs(fish.y - hookY) < 28) {
      fish.lifting = true;
      fish.flyT = 0;
      // 播放釣到東西音效（隨機）
      playRandomCatchSound();
      continue;
    }
    // 再判斷是否在線上（距離放寬）
    for (let i = 0; i < linePoints.length - 1; i++) {
      let x1 = linePoints[i].x, y1 = linePoints[i].y;
      let x2 = linePoints[i+1].x, y2 = linePoints[i+1].y;
      let dx = x2 - x1, dy = y2 - y1;
      let len2 = dx*dx + dy*dy;
      let t = ((fish.x - x1) * dx + (fish.y - y1) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      let px = x1 + t * dx, py = y1 + t * dy;
      let dist = Math.hypot(fish.x - px, fish.y - py);
      if (dist < COLLISION_DIST) { // 統一判斷距離
        fish.lifting = true;
        fish.flyT = 0;
        lineCollisions[i] = true;
        // 播放釣到東西音效（隨機）
        playRandomCatchSound();
        break;
      }
    }
  }
  
  // 檢查垃圾碰撞
  for (let trash of trashes) {
    if (trash.lifting || trash.hit) continue;
    if (Math.abs(trash.x - bigFish.x) < 32 && Math.abs(trash.y - hookY) < 28) {
      trash.lifting = true;
      trash.flyT = 0;
      // 播放釣到東西音效（隨機）
      playRandomCatchSound();
      if (timeLeft > 0 && !gameOver) {
        if (timeLeft - 30 <= 0) {
          timeLeft = 0;
          pendingGameOver = true;
        } else {
          timeLeft = Math.max(0, timeLeft - 30);
        }
      }
      continue;
    }
    // 線段碰撞（距離放寬）
    for (let i = 0; i < linePoints.length - 1; i++) {
      let x1 = linePoints[i].x, y1 = linePoints[i].y;
      let x2 = linePoints[i+1].x, y2 = linePoints[i+1].y;
      let dx = x2 - x1, dy = y2 - y1;
      let len2 = dx*dx + dy*dy;
      let t = ((trash.x - x1) * dx + (trash.y - y1) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      let px = x1 + t * dx, py = y1 + t * dy;
      let dist = Math.hypot(trash.x - px, trash.y - py);
      if (dist < COLLISION_DIST) { // 統一判斷距離
        trash.lifting = true;
        trash.flyT = 0;
        // 播放釣到東西音效（隨機）
        playRandomCatchSound();
        if (timeLeft > 0 && !gameOver) {
          if (timeLeft - 30 <= 0) {
            timeLeft = 0;
            pendingGameOver = true;
          } else {
            timeLeft = Math.max(0, timeLeft - 30);
          }
        }
        lineCollisions[i] = true;
        break;
      }
    }
  }
  // 檢查魷魚碰撞
  if (specialSeaCreature && !specialSeaCreature.lifting && !specialSeaCreature.caught) {
    // 先判斷鉤子直接碰到（距離放寬）
    if (Math.abs(specialSeaCreature.x - bigFish.x) < 36 && Math.abs(specialSeaCreature.y - hookY) < 32) {
      specialSeaCreature.lifting = true;
      specialSeaCreature.flyT = 0;
      // 播放釣到東西音效（隨機）
      playRandomCatchSound();
    } else {
      // 線段碰撞（距離放寬）
      for (let i = 0; i < linePoints.length - 1; i++) {
        let x1 = linePoints[i].x, y1 = linePoints[i].y;
        let x2 = linePoints[i+1].x, y2 = linePoints[i+1].y;
        let dx = x2 - x1, dy = y2 - y1;
        let len2 = dx*dx + dy*dy;
        let t = ((specialSeaCreature.x - x1) * dx + (specialSeaCreature.y - y1) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        let px = x1 + t * dx, py = y1 + t * dy;
        let dist = Math.hypot(specialSeaCreature.x - px, specialSeaCreature.y - py);
        if (dist < COLLISION_DIST) { // 統一判斷距離
          specialSeaCreature.lifting = true;
          specialSeaCreature.flyT = 0;
          lineCollisions[i] = true;
          // 播放釣到東西音效（隨機）
          playRandomCatchSound();
          break;
        }
      }
    }
  }
}

// 抽出單一魚生成函數
function createFish() {
  // 減少紫色魚的比例：90% 黃色，10% 紫色
  const isGold = Math.random() < 0.9;
  const color = isGold ? "gold" : "#fcf";
  const face = Math.random() < 0.5 ? 'smile' : 'dot';
  // 隨機決定從左還是右進來
  const fromLeft = Math.random() < 0.5;
  const x = fromLeft ? -30 : canvas.width + 40; // 畫面外
  const dir = fromLeft ? 1 : -1;
  return {
    x,
    y: Math.random() * 350 + 220,
    speed: 1 + Math.random() * 2,
    dir,
    caught: false,
    lifting: false,
    color,
    face,
    fadeOut: false, // 新增：漸層消失動畫
    alpha: 1, // 新增：漸層消失動畫
    fadeStep: 0.04, // 新增：漸層消失動畫
    // 新增：動畫相關屬性（僅黃魚）
    animTime: 0, // 動畫時間
    animSpeed: 4 // 動畫速度（0.25秒切換一次）
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
const TRASH_COUNT = 2;
let trashes = [];
// 新增：預載雨鞋圖片
const bootImg = new Image();
bootImg.src = 'img/boots.png';
// 新增：預載罐頭圖片
const canImg = new Image();
canImg.src = 'img/can.png';
// 新增：預載黃色魚圖片
const yellowFishImg = new Image();
yellowFishImg.src = 'img/yellow_fish.png';
// 新增：預載黃色魚圖片2
const yellowFishImg2 = new Image();
yellowFishImg2.src = 'img/yellow_fish2.png';
// 新增：預載黃色魚圖片3
const yellowFishImg3 = new Image();
yellowFishImg3.src = 'img/yellow_fish3.png';
// 新增：預載紫色魚圖片
const purpleFishImg = new Image();
purpleFishImg.src = 'img/purple_fish.png';
// 新增：預載紫色魚圖片2
const purpleFishImg2 = new Image();
purpleFishImg2.src = 'img/purple_fish2.png';
// 新增：預載紫色魚圖片3
const purpleFishImg3 = new Image();
purpleFishImg3.src = 'img/purple_fish3.png';
// 新增：預載主角貓咪圖片
const catImg = new Image();
catImg.src = 'img/cat.png';

// 新增：預載魷魚圖片
const squidImg = new Image();
squidImg.src = 'img/squid.png';

// 新增：預載海膽圖片
const seaUrchinImg = new Image();
seaUrchinImg.src = 'img/seaurchin.png';

// 新增：預載章魚圖片
const octopusImg = new Image();
octopusImg.src = 'img/octopus.png';

// 新增：預載海參圖片
const seaCucumberImg = new Image();
seaCucumberImg.src = 'img/sea​​cucumber.png'; // 使用正確的文件名
// 添加圖片載入錯誤處理
seaCucumberImg.onerror = function() {
  console.error('海參圖片載入失敗:', seaCucumberImg.src);
};
seaCucumberImg.onload = function() {
  console.log('海參圖片載入成功');
};

// 新增：預載海參圖片2
const seaCucumberImg2 = new Image();
seaCucumberImg2.src = 'img/sea​​cucumber2.png';
// 添加圖片載入錯誤處理
seaCucumberImg2.onerror = function() {
  console.error('海參圖片2載入失敗:', seaCucumberImg2.src);
};
seaCucumberImg2.onload = function() {
  console.log('海參圖片2載入成功');
};

// --- 魷魚/章魚/海參相關 ---
let specialSeaCreature = null; // 取代 squid
let specialSeaCreatureTimer = null;
const SPECIAL_CREATURE_INTERVAL = 10000; // 10秒
function createSpecialSeaCreature() {
  // 只生成海參
  const fromLeft = Math.random() < 0.5;
  const x = fromLeft ? -40 : canvas.width + 40;
  const dir = fromLeft ? 1 : -1;
  return {
    type: 'seacucumber',
    x,
    y: Math.random() * 350 + 220,
    speed: 2.2 + Math.random() * 1.5,
    dir,
    caught: false,
    lifting: false,
    flyT: 0,
    fadeOut: false,
    alpha: 1,
    fadeStep: 0.04,
    // 新增：動畫相關屬性
    animTime: 0, // 動畫時間
    animSpeed: 2 // 動畫速度（0.5秒切換一次）
  };
}
function spawnSpecialSeaCreature() {
  specialSeaCreature = createSpecialSeaCreature();
  console.log('生成海參');
}
function scheduleSpecialSeaCreature() {
  if (specialSeaCreatureTimer) clearTimeout(specialSeaCreatureTimer);
  specialSeaCreatureTimer = setTimeout(() => {
    // 只有當畫面上沒有海參時才生成
    if (!specialSeaCreature || specialSeaCreature.caught || (specialSeaCreature.x < -60 || specialSeaCreature.x > canvas.width + 60)) {
      spawnSpecialSeaCreature();
    }
    scheduleSpecialSeaCreature();
  }, SPECIAL_CREATURE_INTERVAL);
}

// 測試函數：立即生成海參
function spawnTestSeaCucumber() {
  specialSeaCreature = {
    type: 'seacucumber',
    x: 400,
    y: 300,
    speed: 2,
    dir: 1,
    caught: false,
    lifting: false,
    flyT: 0,
    fadeOut: false,
    alpha: 1,
    fadeStep: 0.04,
    // 新增：動畫相關屬性
    animTime: 0, // 動畫時間
    animSpeed: 2 // 動畫速度（0.5秒切換一次）
  };
  console.log('測試：生成海參');
}
function drawSpecialSeaCreature(creature) {
  ctx.save();
  ctx.translate(creature.x, creature.y);
  ctx.scale(creature.dir, 1);
  if (creature.fadeOut) {
    ctx.globalAlpha = creature.alpha;
    creature.alpha -= creature.fadeStep;
    if (creature.alpha < 0) creature.alpha = 0;
  }
  
  // 更新動畫時間
  if (!creature.lifting && !creature.caught) {
    creature.animTime += deltaTime / 1000; // 轉換為秒
  }
  
  // 根據動畫時間決定使用哪張圖片（1秒切換一次）
  const useSecondImage = Math.floor(creature.animTime * creature.animSpeed) % 2 === 1;
  const currentImg = useSecondImage ? seaCucumberImg2 : seaCucumberImg;
  
  if (currentImg.complete && currentImg.naturalWidth > 0) {
    ctx.drawImage(
      currentImg,
      -currentImg.naturalWidth / 2,
      -currentImg.naturalHeight / 2
    );
  } else {
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.ellipse(0, 0, 24, 32, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
function createTrash() {
  // 加入海膽類型
  const types = ['can', 'bottle', 'seaurchin'];
  const type = types[Math.floor(Math.random() * types.length)];
  const fromLeft = Math.random() < 0.5;
  const x = fromLeft ? -30 : canvas.width + 40;
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
  ctx.lineWidth = 2.2;
  if (trash.type === 'can') {
    // 改為顯示罐頭圖片（原尺寸，置中）
    if (canImg.complete && canImg.naturalWidth > 0) {
      ctx.drawImage(
        canImg,
        -canImg.naturalWidth / 2,
        -canImg.naturalHeight / 2
      );
    } else {
      // 圖片尚未載入時，顯示灰色方塊作為佔位
      ctx.fillStyle = '#bbb';
      ctx.fillRect(-16, -16, 32, 32);
    }
  } else if (trash.type === 'bottle') {
    // 改為顯示雨鞋圖片（原尺寸，置中）
    if (bootImg.complete && bootImg.naturalWidth > 0) {
      ctx.drawImage(
        bootImg,
        -bootImg.naturalWidth / 2,
        -bootImg.naturalHeight / 2
      );
    } else {
      // 圖片尚未載入時，顯示灰色方塊作為佔位
      ctx.fillStyle = '#bbb';
      ctx.fillRect(-16, -16, 32, 32);
    }
  } else if (trash.type === 'seaurchin') {
    // 顯示海膽圖片
    if (seaUrchinImg.complete && seaUrchinImg.naturalWidth > 0) {
      ctx.drawImage(
        seaUrchinImg,
        -seaUrchinImg.naturalWidth / 2,
        -seaUrchinImg.naturalHeight / 2
      );
    } else {
      // 圖片尚未載入時，顯示黑色圓形作為佔位
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
    }
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

// 新增：動態標記目前有碰撞的線段
function updateLineCollisions() {
  lineCollisions = Array(LINE_POINTS - 1).fill(false);
  // 檢查所有魚
  for (let fish of fishes) {
    if (fish.lifting || fish.caught) continue;
    for (let i = 0; i < linePoints.length - 1; i++) {
      let x1 = linePoints[i].x, y1 = linePoints[i].y;
      let x2 = linePoints[i+1].x, y2 = linePoints[i+1].y;
      let dx = x2 - x1, dy = y2 - y1;
      let len2 = dx*dx + dy*dy;
      let t = ((fish.x - x1) * dx + (fish.y - y1) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      let px = x1 + t * dx, py = y1 + t * dy;
      let dist = Math.hypot(fish.x - px, fish.y - py);
      if (dist < COLLISION_DIST) {
        lineCollisions[i] = true;
      }
    }
  }
  // 檢查所有垃圾
  for (let trash of trashes) {
    if (trash.lifting || trash.hit) continue;
    for (let i = 0; i < linePoints.length - 1; i++) {
      let x1 = linePoints[i].x, y1 = linePoints[i].y;
      let x2 = linePoints[i+1].x, y2 = linePoints[i+1].y;
      let dx = x2 - x1, dy = y2 - y1;
      let len2 = dx*dx + dy*dy;
      let t = ((trash.x - x1) * dx + (trash.y - y1) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      let px = x1 + t * dx, py = y1 + t * dy;
      let dist = Math.hypot(trash.x - px, trash.y - py);
      if (dist < COLLISION_DIST) {
        lineCollisions[i] = true;
      }
    }
  }
  // 檢查特殊海洋生物
  if (specialSeaCreature && !specialSeaCreature.lifting && !specialSeaCreature.caught) {
    for (let i = 0; i < linePoints.length - 1; i++) {
      let x1 = linePoints[i].x, y1 = linePoints[i].y;
      let x2 = linePoints[i+1].x, y2 = linePoints[i+1].y;
      let dx = x2 - x1, dy = y2 - y1;
      let len2 = dx*dx + dy*dy;
      let t = ((specialSeaCreature.x - x1) * dx + (specialSeaCreature.y - y1) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      let px = x1 + t * dx, py = y1 + t * dy;
      let dist = Math.hypot(specialSeaCreature.x - px, specialSeaCreature.y - py);
      if (dist < COLLISION_DIST) {
        lineCollisions[i] = true;
      }
    }
  }
}

// 畫主角與大鍋和大魚
function drawPlayer() {
  // 大鍋
  ctx.save();
  ctx.fillStyle = "#bbb";
  ctx.beginPath();
  // --- 修改：y 改用 bowlY ---
  let drawPotY = (typeof bowlY === 'number') ? bowlY : pot.y;
  ctx.ellipse(pot.x + pot.w/2, drawPotY + pot.h/2, pot.w/2, pot.h/2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 4;
  ctx.stroke();
  // 鍋邊
  ctx.beginPath();
  ctx.ellipse(pot.x + pot.w/2, drawPotY + 20, pot.w/2, 20, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#eee";
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // 已移除大魚繪製
  // 主角（貓咪圖片）
  ctx.save();
  ctx.translate(bigFish.x, bigFish.y - 40);
  ctx.scale(playerDir, 1);
  if (catImg.complete && catImg.naturalWidth > 0) {
    ctx.drawImage(
      catImg,
      -catImg.naturalWidth / 2,
      -catImg.naturalHeight / 2
    );
  } else {
    // 尚未載入時，顯示紅色圓形作為佔位
    ctx.fillStyle = "#e11";
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// 畫釣竿和虛線釣魚線與小圓點鉤子
function drawRod() {
  updateLinePhysics();
  updateLineCollisions();
  // 畫每段線，根據碰撞狀態決定顏色
  for (let i = 0; i < linePoints.length - 1; i++) {
    ctx.save();
    ctx.strokeStyle = (lineCollisions[i]) ? '#f00' : '#fff';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(linePoints[i].x, linePoints[i].y);
    ctx.lineTo(linePoints[i+1].x, linePoints[i+1].y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
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
  // 新增：漸層消失
  if (fish.fadeOut) {
    ctx.globalAlpha = fish.alpha;
    fish.alpha -= fish.fadeStep;
    if (fish.alpha < 0) fish.alpha = 0;
  }
  if (fish.color === 'gold') {
    // 更新動畫時間（僅黃魚）
    if (!fish.lifting && !fish.caught) {
      fish.animTime += deltaTime / 1000; // 轉換為秒
    }
    
    // 根據動畫時間決定使用哪張圖片（0.5秒切換一次）
    const animFrame = Math.floor(fish.animTime * fish.animSpeed) % 3; // 3張圖片循環
    let currentImg;
    if (animFrame === 0) currentImg = yellowFishImg;
    else if (animFrame === 1) currentImg = yellowFishImg2;
    else currentImg = yellowFishImg3;
    
    // 用黃色魚圖片（原尺寸，置中）
    if (currentImg.complete && currentImg.naturalWidth > 0) {
      ctx.drawImage(
        currentImg,
        -currentImg.naturalWidth / 2,
        -currentImg.naturalHeight / 2
      );
    } else {
      // 尚未載入時，顯示黃色橢圓作為佔位
      ctx.fillStyle = 'gold';
      ctx.beginPath();
      ctx.ellipse(0, 0, 22, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (fish.color === "#fcf") {
    // 新增：紫色魚動畫（0.25秒一張，三張循環）
    if (!fish.lifting && !fish.caught) {
      fish.animTime += deltaTime / 1000;
    }
    const animFrame = Math.floor(fish.animTime * 4) % 3; // 0.25秒一張
    let currentImg;
    if (animFrame === 0) currentImg = purpleFishImg;
    else if (animFrame === 1) currentImg = purpleFishImg2;
    else currentImg = purpleFishImg3;
    if (currentImg.complete && currentImg.naturalWidth > 0) {
      ctx.drawImage(
        currentImg,
        -currentImg.naturalWidth / 2,
        -currentImg.naturalHeight / 2
      );
    } else {
      // 尚未載入時，顯示紫色橢圓作為佔位
      ctx.fillStyle = '#fcf';
      ctx.beginPath();
      ctx.ellipse(0, 0, 22, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // 黃色魚維持原樣
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
  }
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

// --- 排行榜相關 ---
const RANK_KEY = 'fishing_ranks';
function getRanks() {
  let arr = [];
  try {
    arr = JSON.parse(localStorage.getItem(RANK_KEY)) || [];
  } catch(e) {}
  return Array.isArray(arr) ? arr : [];
}
function saveRanks(arr) {
  localStorage.setItem(RANK_KEY, JSON.stringify(arr));
}
function addRank(newScore) {
  let arr = getRanks();
  arr.push({ score: newScore, time: Date.now() });
  arr.sort((a, b) => b.score - a.score || a.time - b.time);
  if (arr.length > 10) arr = arr.slice(0, 10);
  saveRanks(arr);
  return arr;
}
function clearRanks() {
  localStorage.removeItem(RANK_KEY);
}
function showRankModal(thisScore) {
  const rankModal = document.getElementById('rankModal');
  const rankList = document.getElementById('rankList');
  let arr = getRanks();
  let html = '<table class="rank-table"><thead><tr><th>名次</th><th>分數</th></tr></thead><tbody>';
  let selfIdx = -1;
  arr.forEach((r, i) => {
    let isSelf = (selfIdx === -1 && r.score === thisScore && r.time === arr.find(x => x.score === thisScore && x.time === r.time).time);
    if (isSelf) selfIdx = i;
    html += `<tr${isSelf ? ' class="self-score"' : ''}><td${isSelf ? ' style="color:#e11;font-weight:bold;"' : ''}>${i+1}</td><td${isSelf ? ' style="color:#e11;font-weight:bold;"' : ''}>${r.score}</td></tr>`;
  });
  html += '</tbody></table>';
  if (arr.length === 0) html = '<div style="text-align:center;color:#888;">目前沒有紀錄</div>';
  rankList.innerHTML = html;
  rankModal.style.display = 'flex';
}
document.getElementById('closeRankModal').onclick = function() {
  document.getElementById('rankModal').style.display = 'none';
};
document.getElementById('rankModal').addEventListener('click', function(e) {
  if (e.target === this) this.style.display = 'none';
});
document.getElementById('clearRankBtn').onclick = function() {
  clearRanks();
  showRankModal(-1);
};
window.addEventListener('keydown', function(e) {
  if (document.getElementById('rankModal').style.display === 'flex' && (e.key === 'Escape' || e.key === 'Esc')) {
    document.getElementById('rankModal').style.display = 'none';
  }
});

// --- 新增：海浪波動 ---
let wavePhase = 0;
function getWaveY(x, t) {
  // 主波浪 + 次波浪疊加
  let y = 200 + Math.sin((x/120) + t) * 12 + Math.sin((x/40) - t*1.7) * 4;
  // --- 疊加主角擾動波 ---
  let dx = x - waveDisturb.x;
  let disturb = waveDisturb.v * Math.exp(-dx*dx/900) * Math.sin(t*2 + dx/30);
  y += disturb * 10; // 擾動強度
  return y;
}

// 新增：緊張背景音效
const tensionSound = new Audio('sound/Data_4.wav');
let lastTensionSoundTime = 0;
let tensionSoundInterval = 2000; // 初始2秒

// 遊戲主迴圈
function gameLoop(currentTime) {
  try {
    // 時間控制：確保遊戲速度一致
    if (!lastTime) lastTime = currentTime;
    deltaTime = currentTime - lastTime;
    
    // 如果幀率太快，跳過這一幀
    if (deltaTime < frameTime) {
      animationId = requestAnimationFrame(gameLoop);
      return;
    }
    
    // 計算時間縮放因子
    const timeScale = deltaTime / frameTime;
    lastTime = currentTime;
    
    // 防呆：確保 fishes、trashes 一定是陣列
    if (!Array.isArray(fishes)) fishes = [];
    if (!Array.isArray(trashes)) trashes = [];
    
    updateLinePhysics();
    wavePhase += 0.035 * timeScale; // 波浪推進（根據時間縮放）
    // --- 主角移動速度影響波浪 ---
    let prevX = waveDisturb.x;
    waveDisturb.x = pot.x + pot.w/2;
    waveDisturb.v = (waveDisturb.x - prevX);
    // 可加一點阻尼讓波動慢慢消失
    waveDisturb.v *= 0.92;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 畫天空
    let skyGradient = ctx.createLinearGradient(0, 0, 0, 200);
    skyGradient.addColorStop(0, '#b3e0ff'); // 天空藍
    skyGradient.addColorStop(0.3, '#e6f6ff'); // 淺白藍
    skyGradient.addColorStop(0.7, '#a4c8e1'); // 淡藍
    skyGradient.addColorStop(1, '#7bbbe6'); // 較深藍
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, 200);

    // --- 畫波浪海平面 ---
    ctx.save();
    ctx.beginPath();
    for (let x = 0; x <= canvas.width; x += 4) {
      let y = getWaveY(x, wavePhase);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(canvas.width, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fillStyle = '#b3e0ff';
    ctx.globalAlpha = 0.18;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
    // --- 畫海 ---
    let seaGradient = ctx.createLinearGradient(0, 200, 0, canvas.height);
    seaGradient.addColorStop(0, '#7bbbe6'); // 海平面亮藍
    seaGradient.addColorStop(0.15, '#3a8cc1'); // 中藍
    seaGradient.addColorStop(0.4, '#206090'); // 深藍
    seaGradient.addColorStop(0.7, '#133a5c'); // 更深藍
    seaGradient.addColorStop(1, '#0a1a2f'); // 海底深藍
    ctx.fillStyle = seaGradient;
    ctx.fillRect(0, 200, canvas.width, canvas.height - 200);
    // --- 畫波浪線 ---
    ctx.save();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= canvas.width; x += 2) {
      let y = getWaveY(x, wavePhase);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    // 控制主角與大魚左右移動
    if (keyState.left) {
      bigFish.x -= 6 * timeScale;
      playerDir = -1;
    }
    if (keyState.right) {
      bigFish.x += 6 * timeScale;
      playerDir = 1;
    }
    if (bigFish.x < bigFish.w/2) bigFish.x = bigFish.w/2;
    if (bigFish.x > canvas.width - bigFish.w/2) bigFish.x = canvas.width - bigFish.w/2;
    // 釣魚線起點、鉤子都跟著 bigFish.x

    // 控制魚鉤上下移動（慣性/拉力）
    if (!fishing && !hookThrowing) {
      if (keyState.up) {
        hookVelY -= 1.5 * timeScale; // 向上拉
      } else if (keyState.down) {
        hookVelY += 1.5 * timeScale; // 向下拉
      } else {
        // 沒有按上下時，緩慢回到中間
        let diff = hookDefaultY - hookY;
        if (diff > 0) {
          // 上浮（鉤子在下方）
          hookVelY += diff * 0.001 * timeScale; // 上浮速度
        } else {
          // 下沉（鉤子在上方）
          hookVelY += diff * 0.0002 * timeScale; // 下沉更慢
        }
      }
      // 阻尼
      hookVelY *= Math.pow(0.92, timeScale);
      hookY += hookVelY * timeScale;
      if (hookY < 120) {
        hookY = 120;
        hookVelY = 0;
      }
      if (hookY > 580) {
        hookY = 580;
        hookVelY = 0;
      }
    }
    // --- 鉤子拋物線動畫 ---
    if (hookThrowing) {
      hookThrowT += 0.04 * timeScale; // 動畫進度
      if (hookThrowT > 1) hookThrowT = 1;
      let t = hookThrowT;
      // y 拋物線
      hookY = hookThrowStartY * (1 - t) + hookThrowEndY * t - 120 * t * (1 - t);
      // x 可微幅左右偏移（如需鉤子左右動，bigFish.x 也要跟著動，這裡只動 hookY）
      // bigFish.x = hookThrowStartX * (1 - t) + hookThrowEndX * t;
      if (hookThrowT === 1) {
        hookThrowing = false;
        fishing = false;
        hookTargetY = hookDefaultY;
      }
    }

    // --- 鍋子隨波浪浮動 ---
    if (!bowlSinking) {
      let bowlTargetY = getWaveY(pot.x + pot.w/2, wavePhase) - pot.h/2;
      let spring = 0.18, damp = 0.72;
      if (typeof bowlY !== 'number') bowlY = pot.y;
      // 新增：碗下沉彈跳
      bowlY_vel += (bowlTargetY - bowlY) * spring;
      bowlY_vel += bowlImpulseY;
      bowlImpulseY *= 0.85; // 衰減
      bowlY_vel *= damp;
      bowlY += bowlY_vel;
    }
    // 畫主角和釣竿
    drawPlayer();
    drawRod();

    // 畫魚
    for (let fish of fishes) {
      if (!fish.caught) {
        fish.x += fish.speed * fish.dir * timeScale;
        // 如果游出畫面，重新生成一條新魚（根據 canvas.width 動態判斷）
        if ((fish.dir === 1 && fish.x > canvas.width + 40) || (fish.dir === -1 && fish.x < -40)) {
          Object.assign(fish, createFish());
        }
      }
      drawFish(fish);
    }

    // 畫垃圾
    for (let trash of trashes) {
      if (!trash.lifting && !trash.hit) {
        trash.x += trash.speed * trash.dir * timeScale;
        if ((trash.dir === 1 && trash.x > canvas.width + 40) || (trash.dir === -1 && trash.x < -40)) {
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
        trash.flyT += 0.04 * timeScale;
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
          // 新增：垃圾進入碗fadeOut時播放扣秒音效
          penaltySound.currentTime = 0;
          penaltySound.play();
          Object.assign(trash, createTrash()); // 先讓垃圾消失
          // --- 新增：如果 pendingGameOver，這時才正式 gameOver ---
          if (pendingGameOver) {
            pendingGameOver = false;
            timeLeft = 0;
            displayTimeLeft = 0;
            gameOver = true;
            if (countdownTimer) clearTimeout(countdownTimer); // 停止倒數
            restartBtn.style.display = "block";
            bowlSinking = true;
            bowlY = pot.y;
            bowlSinkTargetY = null;
            animationId = requestAnimationFrame(gameLoop);
            return;
          }
        }
      }
    }

    // 畫特殊海洋生物（魷魚/章魚）
    if (specialSeaCreature && !specialSeaCreature.caught) {
      if (!specialSeaCreature.lifting) {
        specialSeaCreature.x += specialSeaCreature.speed * specialSeaCreature.dir * timeScale;
        if ((specialSeaCreature.dir === 1 && specialSeaCreature.x > canvas.width + 40) || (specialSeaCreature.dir === -1 && specialSeaCreature.x < -40)) {
          specialSeaCreature = null; // 游出畫面消失
        }
      }
      drawSpecialSeaCreature(specialSeaCreature);
    }
    // 特殊生物被釣上來動畫
    if (specialSeaCreature && specialSeaCreature.lifting && !specialSeaCreature.caught) {
      if (!specialSeaCreature.flyT) specialSeaCreature.flyT = 0;
      specialSeaCreature.flyT += 0.04 * timeScale;
      let startX = specialSeaCreature.x, startY = specialSeaCreature.y;
      let endX = pot.x + pot.w/2 + (Math.random()-0.5)*pot.w*0.4;
      let endY = pot.y + pot.h/2 - 10;
      let t = specialSeaCreature.flyT;
      if (t > 1) t = 1;
      specialSeaCreature.x = startX * (1-t) + endX * t;
      specialSeaCreature.y = startY * (1-t) + endY * t - 80*t*(1-t);
      if (t === 1) {
        if (
          specialSeaCreature.x > pot.x && specialSeaCreature.x < pot.x + pot.w &&
          specialSeaCreature.y > pot.y && specialSeaCreature.y < pot.y + pot.h
        ) {
          if (timeLeft > 0 && !gameOver) {
            specialSeaCreature.caught = true;
            // 根據特殊生物類型決定獎勵
            if (specialSeaCreature.type === 'squid' || specialSeaCreature.type === 'octopus') {
              score += 200; // 魷魚和章魚加分
              timeLeft += 20;
              if (timeLeft > GAME_TIME) timeLeft = GAME_TIME;
              // playRandomFoodSound(); // 移除這行，改到下方
            } else if (specialSeaCreature.type === 'seacucumber') {
              score += 20; // 海參加分
              timeLeft += 3;
              if (timeLeft > GAME_TIME) timeLeft = GAME_TIME;
              // playRandomFoodSound(); // 移除這行，改到下方
            }
            // 進入漸層消失動畫
            specialSeaCreature.fadeOut = true;
            specialSeaCreature.alpha = 1;
            specialSeaCreature.fadeStep = 0.04;
            // 新增：只有特殊生物進入fadeOut時才播放食物音效
            if (specialSeaCreature.type === 'squid' || specialSeaCreature.type === 'octopus' || specialSeaCreature.type === 'seacucumber') {
              playRandomFoodSound();
            }
            // 下一隻特殊生物計時
            scheduleSpecialSeaCreature();
          }
          specialSeaCreature.lifting = false;
          specialSeaCreature.flyT = 0;
          // 消失
          setTimeout(() => { specialSeaCreature = null; }, 800);
        }
      }
    }

    // 分數顯示在畫面上方
    ctx.save();
    ctx.font = "bold 36px Arial";
    ctx.fillStyle = "#0c0"; // 綠色
    ctx.fillText("分數: " + score, 30, 60);
    ctx.restore();

    // 補間動畫：讓 displayTimeLeft 慢慢趨近 timeLeft
    const lerpSpeed = 0.18; // 越大越快
    displayTimeLeft += (timeLeft - displayTimeLeft) * lerpSpeed;
    if (Math.abs(displayTimeLeft - timeLeft) < 0.1) displayTimeLeft = timeLeft;
    // 時間百分比條
    const barX = 200, barY = 20, barW = 400, barH = 18;
    ctx.save();
    // 底色
    ctx.fillStyle = '#ccc';
    ctx.fillRect(barX, barY, barW, barH);
    // 進度（彩色漸層條，依照圖片：紅-橙-黃-金黃）
    let percent = Math.max(0, Math.min(1, displayTimeLeft / GAME_TIME)); // 用 displayTimeLeft
    let grad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    grad.addColorStop(0, '#f00'); // 紅
    grad.addColorStop(0.25, '#ff8000'); // 橙
    grad.addColorStop(0.6, '#ffe600'); // 黃
    grad.addColorStop(1, '#ffe600'); // 金黃
    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, barW * percent, barH);
    // 邊框
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barW, barH);
    ctx.restore();

    // 時間
    ctx.fillStyle = "#06c"; // 藍色
    ctx.font = "24px Arial";
    ctx.fillText("剩餘時間: " + timeLeft + " 秒", 600, 40);

    // 魚被釣上來動畫
    for (let fish of fishes) {
      if (fish.lifting && !fish.caught) {
        // 飛行進度
        if (!fish.flyT) fish.flyT = 0;
        fish.flyT += 0.04 * timeScale;
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
            // 若已經 gameOver 或 timeLeft <= 0，不再加分加時間
            if (timeLeft > 0 && !gameOver) {
              fish.caught = true;
              // 新增：碗下沉衝擊
              bowlImpulseY = 8; // 下沉
              // 根據魚的顏色決定分數和時間
              if (fish.color === "gold") {
                score += 100;
                timeLeft += 3;
                if (timeLeft > GAME_TIME) timeLeft = GAME_TIME;
                // playRandomFoodSound(); // 移除這行，改到下方
              } else if (fish.color === "#fcf") {
                if (timeLeft > 0 && !gameOver) {
                  timeLeft = Math.max(0, timeLeft - 10);
                }
              }
              // 立刻生成新魚
              fishes.push(createFish());
              // 新增：進入漸層消失動畫
              fish.fadeOut = true;
              fish.alpha = 1;
              fish.fadeStep = 0.04;
              // 新增：紫色魚進入fadeOut時播放扣秒音效
              if (fish.color === "#fcf") {
                penaltySound.currentTime = 0;
                penaltySound.play();
              }
              // 黃色魚進入fadeOut時才播放食物音效
              if (fish.color === "gold") {
                playRandomFoodSound();
              }
            }
          }
          fish.lifting = false;
          fish.flyT = 0;
        }
      }
    }

    // 鉤子動畫
    if (fishing && !hookThrowing) {
      if (hookY > hookTargetY) {
        hookY -= 18 * timeScale;
        if (hookY < hookTargetY) hookY = hookTargetY;
      } else {
        // 拉到空中，甩魚
        fishing = false;
        hookTargetY = 400;
      }
    } else if (hookY < hookTargetY && !hookThrowing) {
      hookY += 8 * timeScale;
      if (hookY > hookTargetY) hookY = hookTargetY;
    }

    // --- 新增：碗沉到底動畫 ---
    if (bowlSinking) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // 畫天空
      let skyGradient = ctx.createLinearGradient(0, 0, 0, 200);
      skyGradient.addColorStop(0, '#b3e0ff');
      skyGradient.addColorStop(0.3, '#e6f6ff');
      skyGradient.addColorStop(0.7, '#a4c8e1');
      skyGradient.addColorStop(1, '#7bbbe6');
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, canvas.width, 200);
      // 畫海
      let seaGradient = ctx.createLinearGradient(0, 200, 0, canvas.height);
      seaGradient.addColorStop(0, '#7bbbe6');
      seaGradient.addColorStop(0.15, '#3a8cc1');
      seaGradient.addColorStop(0.4, '#206090');
      seaGradient.addColorStop(0.7, '#133a5c');
      seaGradient.addColorStop(1, '#0a1a2f');
      ctx.fillStyle = seaGradient;
      ctx.fillRect(0, 200, canvas.width, canvas.height - 200);
      // 畫海平面線
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 200);
      ctx.lineTo(canvas.width, 200);
      ctx.stroke();
      // --- 鍋子下沉動畫 ---
      if (bowlSinkTargetY === null) {
        bowlSinkTargetY = canvas.height - pot.h - 20;
      }
      if (bowlY < bowlSinkTargetY) {
        bowlY += bowlSinkSpeed * timeScale;
        if (bowlY > bowlSinkTargetY) bowlY = bowlSinkTargetY;
      }
      drawPlayer();
      // 遮罩與分數、結束字樣
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.font = "bold 36px Arial";
      ctx.fillStyle = "#0c0";
      ctx.fillText("分數: " + score, 30, 60);
      ctx.restore();
      // 時間條
      const barX = 200, barY = 20, barW = 400, barH = 18;
      ctx.save();
      ctx.fillStyle = '#ccc';
      ctx.fillRect(barX, barY, barW, barH);
      let percent = Math.max(0, Math.min(1, displayTimeLeft / GAME_TIME)); // 用 displayTimeLeft
      let grad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
      grad.addColorStop(0, '#f00');
      grad.addColorStop(0.25, '#ff8000');
      grad.addColorStop(0.6, '#ffe600');
      grad.addColorStop(1, '#ffe600');
      ctx.fillStyle = grad;
      ctx.fillRect(barX, barY, barW * percent, barH);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, barY, barW, barH);
      ctx.restore();
      ctx.fillStyle = "#06c";
      ctx.font = "24px Arial";
      ctx.fillText("剩餘時間: " + timeLeft + " 秒", 600, 40);
      ctx.fillStyle = "#fff";
      ctx.font = "48px Arial";
      ctx.fillText("遊戲結束", 300, 300);
      ctx.font = "36px Arial";
      ctx.fillStyle = "#0c0";
      ctx.fillText("分數: " + score, 320, 360);
      // --- 動畫結束，顯示排行榜 ---
      if (bowlY >= bowlSinkTargetY) {
        bowlY = bowlSinkTargetY; // 鎖定在水底
        // 新增：播放碗沉到底音效
        bowlSinkSound.currentTime = 0;
        bowlSinkSound.play();
        setTimeout(() => {
          let arr = addRank(score);
          showRankModal(score);
        }, 400);
        return;
      }
      animationId = requestAnimationFrame(gameLoop);
      return;
    }
    // 遊戲結束
    // --- 修改：只有沒垃圾動畫時才 gameOver ---
    let trashAnimating = trashes.some(trash => trash.lifting);
    if (timeLeft <= 0 && !gameOver && !trashAnimating && !pendingGameOver) {
      gameOver = true;
      displayTimeLeft = 0; // 修正：同步顯示歸零
      restartBtn.style.display = "block";
      // --- 新增：啟動碗沉到底動畫 ---
      bowlSinking = true;
      bowlY = pot.y;
      bowlSinkTargetY = null;
      animationId = requestAnimationFrame(gameLoop);
      // --- 新增：時間歸零時直接顯示排行榜（若沒有垃圾動畫）---
      if (!trashAnimating) {
        setTimeout(() => {
          let arr = addRank(score);
          showRankModal(score);
        }, 1200); // 與碗下沉動畫同步
      }
      return;
    }
    animationId = requestAnimationFrame(gameLoop);

    // === 緊張背景音效 ===
    if (!gameOver && timeLeft > 0) {
      let minInterval = 80; // 幾乎連續
      let maxInterval = 2000; // 最慢2秒
      let t = Math.max(0, Math.min(1, timeLeft / GAME_TIME));
      tensionSoundInterval = minInterval + (maxInterval - minInterval) * t;
      if (!lastTensionSoundTime) lastTensionSoundTime = currentTime;
      // 只有當音效沒在播放時才播放下一次
      if ((currentTime - lastTensionSoundTime >= tensionSoundInterval) && tensionSound.paused) {
        tensionSound.currentTime = 0;
        tensionSound.play();
        lastTensionSoundTime = currentTime;
      }
    } else {
      tensionSound.pause();
      tensionSound.currentTime = 0;
      lastTensionSoundTime = 0;
    }
  } catch (e) {
    // 若有錯誤，顯示在 console，並嘗試繼續下一幀
    console.error('gameLoop error:', e);
    animationId = requestAnimationFrame(gameLoop);
  }
}

// 倒數計時
function countdown() {
  if (!gameOver) {
    timeLeft--;
    if (timeLeft > 0) {
      countdownTimer = setTimeout(countdown, 1000);
    } else {
      timeLeft = 0;
      displayTimeLeft = 0; // 修正：同步顯示歸零
      gameOver = true;
      restartBtn.style.display = "block";
      // 啟動碗沉到底動畫
      bowlSinking = true;
      bowlY = pot.y;
      bowlSinkTargetY = null;
      animationId = requestAnimationFrame(gameLoop);
    }
  }
}

// 釣魚（滑鼠點擊或空白鍵）
canvas.addEventListener("mousedown", () => {
  if (!gameOver && !fishing && !hookThrowing) {
    checkLineCollision(); // 檢查碰撞
    fishing = true;
    // 新增拋物線動畫
    hookThrowing = true;
    hookThrowT = 0;
    hookThrowStartY = hookY;
    hookThrowEndY = 60; // 天空高度
    hookThrowStartX = bigFish.x;
    hookThrowEndX = bigFish.x + 120 * (Math.random() - 0.5); // 可微幅左右偏移
    // 播放拉竿音效
    if (rodPullSound) { rodPullSound.currentTime = 0; rodPullSound.play(); }
  }
});
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "ArrowUp" || e.code === "ArrowDown") e.preventDefault();
  if (!gameOver && !fishing && !hookThrowing && e.code === "Space") {
    checkLineCollision(); // 檢查碰撞
    fishing = true;
    // 新增拋物線動畫
    hookThrowing = true;
    hookThrowT = 0;
    hookThrowStartY = hookY;
    hookThrowEndY = 60; // 天空高度
    hookThrowStartX = bigFish.x;
    hookThrowEndX = bigFish.x + 120 * (Math.random() - 0.5); // 可微幅左右偏移
    // 播放拉竿音效
    if (rodPullSound) { rodPullSound.currentTime = 0; rodPullSound.play(); }
  }
});

// 方向鍵事件
window.addEventListener('keydown', (e) => {
  if (e.code === 'ArrowLeft') keyState.left = true;
  if (e.code === 'ArrowRight') keyState.right = true;
  if (e.code === 'ArrowUp') keyState.up = true;
  if (e.code === 'ArrowDown') keyState.down = true;
  // 空白鍵、上下鍵釣魚
  if (e.code === "Space" || e.code === "ArrowUp" || e.code === "ArrowDown") e.preventDefault();
  if (!gameOver && !fishing && !hookThrowing && e.code === "Space") {
    checkLineCollision(); // 檢查碰撞
    fishing = true;
    // 新增拋物線動畫
    hookThrowing = true;
    hookThrowT = 0;
    hookThrowStartY = hookY;
    hookThrowEndY = 60; // 天空高度
    hookThrowStartX = bigFish.x;
    hookThrowEndX = bigFish.x + 120 * (Math.random() - 0.5); // 可微幅左右偏移
    // 播放拉竿音效
    if (rodPullSound) { rodPullSound.currentTime = 0; rodPullSound.play(); }
  }
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft') keyState.left = false;
  if (e.code === 'ArrowRight') keyState.right = false;
  if (e.code === 'ArrowUp') keyState.up = false;
  if (e.code === 'ArrowDown') keyState.down = false;
});

// 響應式 canvas 尺寸調整
function resizeGameCanvas() {
  const GAME_WIDTH = 800;
  const GAME_HEIGHT = 600;
  let w = window.innerWidth;
  let h = window.innerHeight;
  let isLandscape = w > h;

  let scale;
  if (isLandscape) {
    // landscape: 以高度為主，維持 4:3
    h = window.innerHeight;
    w = Math.min(window.innerWidth, h * 4 / 3);
    scale = w / GAME_WIDTH;
  } else {
    // portrait: 以寬度為主，維持 4:3
    w = window.innerWidth;
    h = Math.min(window.innerHeight, w * 3 / 4);
    scale = h / GAME_HEIGHT;
  }

  // 設定 canvas 實際繪圖解析度
  canvas.width = GAME_WIDTH;
  canvas.height = GAME_HEIGHT;
  // 設定 CSS 尺寸
  canvas.style.width = (GAME_WIDTH * scale) + 'px';
  canvas.style.height = (GAME_HEIGHT * scale) + 'px';
  // 置中
  canvas.style.position = 'absolute';
  canvas.style.left = ((window.innerWidth - GAME_WIDTH * scale) / 2) + 'px';
  canvas.style.top = ((window.innerHeight - GAME_HEIGHT * scale) / 2) + 'px';
}
window.addEventListener('resize', resizeGameCanvas);
resizeGameCanvas();

// 重新開始
restartBtn.addEventListener("click", () => {
  // 停止前一輪動畫和計時
  if (animationId) cancelAnimationFrame(animationId);
  if (countdownTimer) clearTimeout(countdownTimer);
  score = 0;
  timeLeft = GAME_TIME;
  gameOver = false;
  // 重置時間控制變數
  lastTime = 0;
  deltaTime = 0;
  spawnFish();
  spawnTrash();
  initLinePoints(); // 重新初始化魚線點
  hookY = 400;
  hookVelY = 0;
  hookTargetY = 400;
  specialSeaCreature = null;
if (specialSeaCreatureTimer) clearTimeout(specialSeaCreatureTimer);
scheduleSpecialSeaCreature();
// 測試：立即生成海參
setTimeout(() => {
  spawnTestSeaCucumber();
}, 2000); // 2秒後生成測試海參
// 測試：立即生成海參
setTimeout(() => {
  spawnTestSeaCucumber();
}, 2000); // 2秒後生成測試海參
  resizeGameCanvas();
  // --- 新增：重設鍋子位置與動畫狀態 ---
  bowlY = pot.y;
  bowlSinking = false;
  bowlSinkTargetY = null;
  bowlY_vel = 0;
  bowlImpulseY = 0; // 重置碗下沉衝擊
  pendingGameOver = false; // 重置 pendingGameOver
  animationId = requestAnimationFrame(gameLoop);
  countdownTimer = setTimeout(countdown, 1000);
});
// 新增：遊戲說明按鈕
const infoBtn = document.getElementById('infoBtn');
const infoModal = document.getElementById('infoModal');
const infoModalText = document.getElementById('infoModalText');
const closeInfoModal = document.getElementById('closeInfoModal');

infoBtn.addEventListener('click', () => {
  infoModal.style.display = 'flex';
  infoModalText.innerHTML = `
    <ol style="padding-left: 1.2em;">
      <li>方向鍵移動主角與魚鉤。</li>
      <li>點擊畫面或按空白鍵釣魚。</li>
      <li>黃色魚加分加時間，紫色魚只扣時間。</li>
      <li>勿釣到垃圾，會扣時間。</li>
      <li>時間歸零遊戲結束，可隨時再玩一次。</li>
    </ol>
    <hr style="margin: 12px 0;">
    <div style="font-size:1.1em;">
      <b>【詳細分數與時間規則】</b><br>
      <ul style="padding-left: 1.2em;">
        <li><b>黃色魚</b><br>分數：+100 分<br>時間：+3 秒（但總時間不會超過遊戲起始時間 85 秒）</li>
        <li><b>紫色魚</b><br>分數：不變<br>時間：-10 秒（但剩餘時間不會低於 0）</li>
        <li><b>垃圾（罐頭、瓶子）</b><br>分數：不變<br><span style="color:#e11;"><b>時間：-30 秒</b></span>（但剩餘時間不會低於 0）</li>
        <li><b>魷魚/章魚</b><br>分數：+200 分<br>時間：+20 秒（但總時間不會超過遊戲起始時間 85 秒）</li>
        <li><b>海參</b><br>分數：+20 分<br>時間：+3 秒（但總時間不會超過遊戲起始時間 85 秒）</li>
      </ul>
    </div>
  `;
});
closeInfoModal.addEventListener('click', () => {
  infoModal.style.display = 'none';
});
// 點擊 modal 外部也可關閉
infoModal.addEventListener('click', (e) => {
  if (e.target === infoModal) infoModal.style.display = 'none';
});
// 按 ESC 關閉
window.addEventListener('keydown', (e) => {
  if (infoModal.style.display === 'flex' && (e.key === 'Escape' || e.key === 'Esc')) {
    infoModal.style.display = 'none';
  }
});

// 新增：排行榜內再玩一次按鈕
const playAgainBtn = document.getElementById('playAgainBtn');
if (playAgainBtn) {
  playAgainBtn.onclick = function() {
    document.getElementById('rankModal').style.display = 'none';
    // 觸發 restartBtn 的 click 事件
    restartBtn.click();
  };
}
// 新增：排行榜顯示時按空白鍵可再玩一次
window.addEventListener('keydown', function(e) {
  const rankModal = document.getElementById('rankModal');
  if (rankModal && rankModal.style.display === 'flex' && e.code === 'Space') {
    e.preventDefault();
    if (playAgainBtn) playAgainBtn.click();
  }
});

// === 虛擬搖桿與螢幕按鈕 ===
(function() {
  function updateControlsVisibility() {
    const isLandscape = window.innerWidth > window.innerHeight;
    const isPortrait = window.innerWidth <= window.innerHeight;
    const isMobile = window.innerWidth <= 768;
    const joystick = document.getElementById('joystick');
    const screenButtons = document.getElementById('screenButtons');
    if (joystick && screenButtons) {
      if (isLandscape && window.innerWidth <= 900) {
        joystick.style.display = 'block';
        screenButtons.style.display = 'block';
      } else if (isPortrait && isMobile) {
        joystick.style.display = 'block';
        screenButtons.style.display = 'block';
      } else {
        joystick.style.display = 'none';
        screenButtons.style.display = 'none';
      }
      screenButtons.style.zIndex = 2000;
    }
  }
  window.addEventListener('resize', updateControlsVisibility);
  window.addEventListener('orientationchange', updateControlsVisibility);
  updateControlsVisibility();

  // 虛擬搖桿控制
  const joystick = document.getElementById('joystick');
  const knob = document.getElementById('joystick-knob');
  const directionIndicators = document.querySelectorAll('.direction-indicator');
  let dragging = false, startX = 0, startY = 0, baseRect = null;
  let joyDX = 0, joyDY = 0;
  let activeTouchId = null;

  function updateDirectionIndicators() {
    directionIndicators.forEach(indicator => {
      indicator.classList.remove('active');
    });
    if (Math.abs(joyDX) > 0.1 || Math.abs(joyDY) > 0.1) {
      let direction = '';
      if (joyDY < -0.3) direction += 'up';
      else if (joyDY > 0.3) direction += 'down';
      if (joyDX < -0.3) direction += '-left';
      else if (joyDX > 0.3) direction += '-right';
      if (direction.includes('-')) {
        const indicator = document.querySelector(`.direction-indicator.${direction}`);
        if (indicator) indicator.classList.add('active');
      } else if (direction) {
        const indicator = document.querySelector(`.direction-indicator.${direction}`);
        if (indicator) indicator.classList.add('active');
      }
    }
  }

  if (joystick && knob) {
    knob.addEventListener('touchstart', function(e) {
      if (dragging) return;
      dragging = true;
      const touch = e.touches[0];
      activeTouchId = touch.identifier;
      baseRect = joystick.getBoundingClientRect();
      startX = baseRect.left + baseRect.width / 2;
      startY = baseRect.top + baseRect.height / 2;
      e.preventDefault();
      e.stopPropagation();
    }, { passive: false });

    document.addEventListener('touchmove', function(e) {
      if (!dragging) return;
      let touch = null;
      for (let t of e.touches) {
        if (t.identifier === activeTouchId) {
          touch = t;
          break;
        }
      }
      if (!touch) return;
      let dx = touch.clientX - startX;
      let dy = touch.clientY - startY;
      const maxDist = 45;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist > maxDist) {
        dx = dx * maxDist / dist;
        dy = dy * maxDist / dist;
      }
      knob.style.left = (35 + dx) + 'px';
      knob.style.top = (35 + dy) + 'px';
      joyDX = dx / maxDist;
      joyDY = dy / maxDist;
      keyState.left = joyDX < -0.2;
      keyState.right = joyDX > 0.2;
      keyState.up = joyDY < -0.2;
      keyState.down = joyDY > 0.2;
      updateDirectionIndicators();
      e.preventDefault();
    }, {passive: false});

    document.addEventListener('touchend', function(e) {
      if (!dragging) return;
      let stillTouching = false;
      for (let t of e.touches) {
        if (t.identifier === activeTouchId) {
          stillTouching = true;
          break;
        }
      }
      if (stillTouching) return;
      dragging = false;
      activeTouchId = null;
      knob.style.left = '35px';
      knob.style.top = '35px';
      joyDX = 0; joyDY = 0;
      keyState.left = keyState.right = keyState.up = keyState.down = false;
      directionIndicators.forEach(indicator => {
        indicator.classList.remove('active');
      });
    }, {passive: false});
  }

  // 虛擬按鈕控制
  const actionBtn = document.getElementById('actionBtn');
  if (actionBtn) {
    function triggerFishingAction(e) {
      if (!fishing && !hookThrowing && !gameOver) {
        checkLineCollision();
        fishing = true;
        hookThrowing = true;
        hookThrowT = 0;
        hookThrowStartY = hookY;
        hookThrowEndY = 60; // 改為 60
        hookThrowStartX = bigFish.x;
        hookThrowEndX = bigFish.x;
        if (rodPullSound) { rodPullSound.currentTime = 0; rodPullSound.play(); }
      }
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    actionBtn.addEventListener('touchstart', triggerFishingAction, { passive: false });
    actionBtn.addEventListener('click', triggerFishingAction);
  }

  function triggerFishingFromCanvas(e) {
    if (!fishing && !hookThrowing && !gameOver) {
      checkLineCollision();
      fishing = true;
      hookThrowing = true;
      hookThrowT = 0;
      hookThrowStartY = hookY;
      hookThrowEndY = 60;
      hookThrowStartX = bigFish.x;
      hookThrowEndX = bigFish.x;
      if (rodPullSound) { rodPullSound.currentTime = 0; rodPullSound.play(); }
    }
    if (e) e.preventDefault();
  }
  canvas.addEventListener('click', triggerFishingFromCanvas);
  canvas.addEventListener('touchstart', triggerFishingFromCanvas);
})();

// 初始化
// 停止殘留動畫和計時
if (animationId) cancelAnimationFrame(animationId);
if (countdownTimer) clearTimeout(countdownTimer);
// 重置時間控制變數
lastTime = 0;
deltaTime = 0;
spawnFish();
spawnTrash();
initLinePoints();
specialSeaCreature = null;
if (specialSeaCreatureTimer) clearTimeout(specialSeaCreatureTimer);
scheduleSpecialSeaCreature();
resizeGameCanvas();
// --- 新增：重設鍋子位置與動畫狀態 ---
bowlY = pot.y;
bowlSinking = false;
bowlSinkTargetY = null;
bowlY_vel = 0;
bowlImpulseY = 0; // 重置碗下沉衝擊
animationId = requestAnimationFrame(gameLoop);
countdownTimer = setTimeout(countdown, 1000); 

// 新增：拉起釣竿音效
const rodPullSound = new Audio('sound/Data_1.wav');
// 新增：釣到東西音效
const catchSound = new Audio('sound/Data_2.wav');
// 新增：釣到東西音效2
const catchSound2 = new Audio('sound/Data_3.wav');
// 新增：釣到食物音效（加時間）
const foodSounds = [
  new Audio('sound/Data_10.wav'),
  new Audio('sound/Data_11.wav'),
  new Audio('sound/Data_12.wav'),
  new Audio('sound/Data_13.wav'),
  new Audio('sound/Data_14.wav')
];

// 隨機播放食物音效
function playRandomFoodSound() {
  const idx = Math.floor(Math.random() * foodSounds.length);
  const sound = foodSounds[idx];
  if (sound) { sound.currentTime = 0; sound.play(); }
}

// 將 catchSound 播放改為隨機播放 catchSound 或 catchSound2
function playRandomCatchSound() {
  const sound = Math.random() < 0.5 ? catchSound : catchSound2;
  if (sound) { sound.currentTime = 0; sound.play(); }
}

// 新增：扣秒物品消失音效
const penaltySound = new Audio('sound/Data_15.wav');
// 新增：碗沉到底音效
const bowlSinkSound = new Audio('sound/Data_16.wav');

let isMuted = false;

function setAllAudioMuted(muted) {
  tensionSound.muted = muted;
  rodPullSound.muted = muted;
  catchSound.muted = muted;
  catchSound2.muted = muted;
  penaltySound.muted = muted;
  bowlSinkSound.muted = muted;
  if (Array.isArray(foodSounds)) {
    foodSounds.forEach(s => s.muted = muted);
  }
}

window.toggleMute = function() {
  isMuted = !isMuted;
  setAllAudioMuted(isMuted);
  // 切換 emoji
  const btn = document.getElementById('muteBtn');
  const emojiOn = document.getElementById('muteEmojiOn');
  const emojiOff = document.getElementById('muteEmojiOff');
  if (btn) btn.setAttribute('aria-pressed', isMuted ? 'true' : 'false');
  if (emojiOn) emojiOn.style.display = isMuted ? 'none' : 'inline';
  if (emojiOff) emojiOff.style.display = isMuted ? 'inline' : 'none';
};

document.addEventListener('DOMContentLoaded', function() {
  const btn = document.getElementById('muteBtn');
  if (btn) btn.addEventListener('click', window.toggleMute);
  setAllAudioMuted(isMuted);
  // 根據 isMuted 設定 emoji 狀態
  const emojiOn = document.getElementById('muteEmojiOn');
  const emojiOff = document.getElementById('muteEmojiOff');
  if (btn) btn.setAttribute('aria-pressed', isMuted ? 'true' : 'false');
  if (emojiOn) emojiOn.style.display = isMuted ? 'none' : 'inline';
  if (emojiOff) emojiOff.style.display = isMuted ? 'inline' : 'none';
});