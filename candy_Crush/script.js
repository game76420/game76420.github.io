// 糖果傳奇主邏輯重寫
// 分數管理類別
class ScoreManager {
  constructor(scoreDisplayElement = null) {
    this.score = 0;
    this.chainLevel = 1;
    this.scoreDisplayElement = scoreDisplayElement;
  }
  getBaseScore(matchCount) {
    switch (matchCount) {
      case 3: return 60;
      case 4: return 120;
      case 5:
      default: return 200;
    }
  }
  getChainMultiplier() {
    return 1 + (this.chainLevel - 1) * 0.2;
  }
  calculateScore(matchCount) {
    const base = this.getBaseScore(matchCount);
    const multiplier = this.getChainMultiplier();
    const earned = Math.round(base * multiplier);
    return earned;
  }
  addMatchScore(matchCount) {
    const earned = this.calculateScore(matchCount);
    this.score += earned;
    this.updateScoreDisplay();
    return earned;
  }
  addSpecialCandyScore(type, affectedCount = 0) {
    let earned = 0;
    switch (type) {
      case "striped": earned = affectedCount * 60; break;
      case "wrapped": earned = affectedCount * 80; break;
      case "colorBomb": earned = affectedCount * 100; break;
      case "colorBomb+striped": earned = 1000; break;
      case "colorBomb+wrapped": earned = 1500; break;
      case "colorBomb+colorBomb": earned = 2000; break;
      default: earned = 0;
    }
    this.score += earned;
    this.updateScoreDisplay();
    return earned;
  }
  resetChain() { this.chainLevel = 1; }
  nextChain() { this.chainLevel++; }
  updateScoreDisplay() {
    // 分數元素已移除，這裡不做任何事
  }
  getScore() { return this.score; }
  resetGame() {
    this.score = 0;
    this.chainLevel = 1;
    this.updateScoreDisplay();
  }
}

class CandyCrushGame {
    constructor() {
        this.boardSize = 8;
        this.allCandyTypes = [
            { color: 'red', emoji: '🍎' },
            { color: 'lemon', emoji: '🍋' },
            { color: 'grape', emoji: '🍇' },
            { color: 'banana', emoji: '🍌' },
            { color: 'pineapple', emoji: '🍍' },
            { color: 'cherry', emoji: '🍒' },
            { color: 'green', emoji: '🍏' },
            { color: 'peach', emoji: '🍑' }
        ];
        this.level = 1;
        this.updateCandyTypesByLevel();
        this.targetScore = 2000;
        this.maxMoves = 20;
        this.timeLimit = 60;
        // scoreDisplayElement 改為 null，因為分數元素已移除
        this.scoreManager = new ScoreManager(null);
        this.resetGame();
        this.setupEventListeners();
    }

    updateCandyTypesByLevel() {
        // 第1關4種，第2關5種...
        const typeCount = Math.min(4 + (this.level - 1), this.allCandyTypes.length);
        this.candyTypes = this.allCandyTypes.slice(0, typeCount);
    }

    nextLevel() {
        this.level++;
        this.updateCandyTypesByLevel();
        this.resetGame();
        this.updateLevelDisplay();
    }

    updateLevelDisplay() {
        const levelSpan = document.getElementById('level');
        if (levelSpan) levelSpan.textContent = this.level;
    }

    resetGame() {
        this.board = [];
        this.moves = 0;
        this.timeLeft = this.timeLimit;
        this.selectedCandy = null;
        this.comboCount = 0;
        this.isGameActive = true;
        if (this.timer) clearInterval(this.timer);
        this.scoreManager.resetGame();
        this.createBoard();
        this.renderBoard();
        this.updateUI();
        this.updateLevelDisplay();
        document.getElementById('game-over-modal')?.style && (document.getElementById('game-over-modal').style.display = 'none');
        if (this.gameMode === 'time') this.startTimer();
    }

    hasAvailableMove() {
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                // 檢查右邊
                if (col < this.boardSize - 1) {
                    this.swap(row, col, row, col + 1);
                    if (this.findMatches().length > 0) {
                        this.swap(row, col, row, col + 1);
                        return true;
                    }
                    this.swap(row, col, row, col + 1);
                }
                // 檢查下方
                if (row < this.boardSize - 1) {
                    this.swap(row, col, row + 1, col);
                    if (this.findMatches().length > 0) {
                        this.swap(row, col, row + 1, col);
                        return true;
                    }
                    this.swap(row, col, row + 1, col);
                }
            }
        }
        return false;
    }

    shuffleBoard() {
        // 將所有糖果打亂
        let candies = [];
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                candies.push(this.board[row][col]);
            }
        }
        // 洗牌
        for (let i = candies.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candies[i], candies[j]] = [candies[j], candies[i]];
        }
        // 填回棋盤
        for (let row = 0, idx = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++, idx++) {
                this.board[row][col] = candies[idx];
            }
        }
        this.renderBoard();
        this.updateUI();
    }

    createBoard() {
        do {
            this.board = [];
            for (let row = 0; row < this.boardSize; row++) {
                this.board[row] = [];
                for (let col = 0; col < this.boardSize; col++) {
                    this.board[row][col] = this.getRandomCandy();
                }
            }
        } while (this.findMatches().length > 0 || !this.hasAvailableMove()); // 避免初始有消除或無步可走
    }

    getRandomCandy() {
        const idx = Math.floor(Math.random() * this.candyTypes.length);
        return { ...this.candyTypes[idx] };
    }

    renderBoard(newFallingMap = null) {
        const gameBoard = document.getElementById('game-board');
        gameBoard.innerHTML = '';
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const candy = document.createElement('div');
                candy.className = `candy ${this.board[row][col]?.color || ''}`;
                candy.textContent = this.board[row][col]?.emoji || '';
                candy.dataset.row = row;
                candy.dataset.col = col;
                // 滑鼠拖曳交換（mousemove即判斷）
                let dragStart = null;
                let dragMoved = false;
                candy.addEventListener('mousedown', (e) => {
                    dragStart = {x: e.clientX, y: e.clientY, row, col};
                    dragMoved = false;
                    document.onmousemove = (ev) => {
                        if (!dragStart || dragMoved) return;
                        const dx = ev.clientX - dragStart.x;
                        const dy = ev.clientY - dragStart.y;
                        let targetRow = row, targetCol = col;
                        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
                            // 左右
                            if (dx > 0 && col < this.boardSize - 1) targetCol = col + 1;
                            else if (dx < 0 && col > 0) targetCol = col - 1;
                        } else if (Math.abs(dy) > 10) {
                            // 上下
                            if (dy > 0 && row < this.boardSize - 1) targetRow = row + 1;
                            else if (dy < 0 && row > 0) targetRow = row - 1;
                        }
                        if ((targetRow !== row || targetCol !== col)) {
                            this.trySwap(row, col, targetRow, targetCol);
                            dragMoved = true;
                            dragStart = null;
                            document.onmousemove = null;
                            document.onmouseup = null;
                        }
                    };
                    document.onmouseup = () => {
                        dragStart = null;
                        dragMoved = false;
                        document.onmousemove = null;
                        document.onmouseup = null;
                    };
                });
                candy.addEventListener('click', () => this.handleCandyClick(row, col));
                // 新生成的糖果加 falling 動畫
                if (newFallingMap && newFallingMap[row] && newFallingMap[row][col]) {
                    candy.classList.add('falling');
                    setTimeout(() => {
                        candy.classList.remove('falling');
                    }, 450); // 與 CSS 動畫時間一致
                }
                gameBoard.appendChild(candy);
            }
        }
    }

    handleCandyClick(row, col) {
        if (!this.isGameActive || this.isAnimating) return;
        if (!this.selectedCandy) {
            this.selectedCandy = { row, col };
            this.highlightCandy(row, col, true);
        } else {
            const { row: r, col: c } = this.selectedCandy;
            if (this.isAdjacent(r, c, row, col)) {
                this.highlightCandy(r, c, false);
                this.trySwap(r, c, row, col);
                this.selectedCandy = null;
            } else {
                this.highlightCandy(r, c, false);
                this.selectedCandy = { row, col };
                this.highlightCandy(row, col, true);
            }
        }
    }

    handleDragStart(e, row, col) {
        if (!this.isGameActive || this.isAnimating) return;
        this.dragStart = { row, col };
        e.dataTransfer.effectAllowed = 'move';
        // 移除預設拖曳圖片
        if (e.dataTransfer.setDragImage) {
            const img = document.createElement('img');
            img.src = '';
            img.width = img.height = 0;
            document.body.appendChild(img);
            e.dataTransfer.setDragImage(img, 0, 0);
            setTimeout(() => document.body.removeChild(img), 0);
        }
    }
    handleDragOver(e) {
        e.preventDefault();
        if (!this.isGameActive || this.isAnimating || !this.dragStart) return;
        const target = e.currentTarget;
        const row = parseInt(target.dataset.row);
        const col = parseInt(target.dataset.col);
        const { row: r, col: c } = this.dragStart;
        if (this.isAdjacent(r, c, row, col)) {
            this.trySwap(r, c, row, col);
            this.dragStart = null;
        }
    }
    handleDrop(e, row, col) {
        e.preventDefault();
        // 不再處理交換
    }

    isAdjacent(r1, c1, r2, c2) {
        return (Math.abs(r1 - r2) === 1 && c1 === c2) || (Math.abs(c1 - c2) === 1 && r1 === r2);
    }
    highlightCandy(row, col, selected) {
        const el = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (el) el.classList.toggle('selected', selected);
    }

    async trySwap(r1, c1, r2, c2) {
        if (!this.isGameActive || this.isAnimating) return;
        // 第一次交換時解鎖音效
        unlockSound();
        // 取得 DOM
        const el1 = document.querySelector(`[data-row="${r1}"][data-col="${c1}"]`);
        const el2 = document.querySelector(`[data-row="${r2}"][data-col="${c2}"]`);
        if (el1 && el2) {
            // 計算位移
            const rect1 = el1.getBoundingClientRect();
            const rect2 = el2.getBoundingClientRect();
            const dx = rect2.left - rect1.left;
            const dy = rect2.top - rect1.top;
            // 加上動畫 class 與 transform
            el1.classList.add('swapping');
            el2.classList.add('swapping');
            el1.style.transform = `translate(${dx}px, ${dy}px)`;
            el2.style.transform = `translate(${-dx}px, ${-dy}px)`;
            // 等動畫結束
            await new Promise(resolve => setTimeout(resolve, 320));
            // 還原
            el1.classList.remove('swapping');
            el2.classList.remove('swapping');
            el1.style.transform = '';
            el2.style.transform = '';
        }
        // 真正交換資料
        this.swap(r1, c1, r2, c2);
        this.renderBoard();
        if (this.findMatches().length > 0) {
            this.moves++;
            this.scoreManager.resetChain();
            this.updateUI();
            this.handleMatches();
        } else {
            // 失敗時再滑回去
            await new Promise(resolve => setTimeout(resolve, 100));
            const el1b = document.querySelector(`[data-row="${r1}"][data-col="${c1}"]`);
            const el2b = document.querySelector(`[data-row="${r2}"][data-col="${c2}"]`);
            if (el1b && el2b) {
                // 反向動畫
                const rect1b = el1b.getBoundingClientRect();
                const rect2b = el2b.getBoundingClientRect();
                const dx = rect2b.left - rect1b.left;
                const dy = rect2b.top - rect1b.top;
                el1b.classList.add('swapping');
                el2b.classList.add('swapping');
                el1b.style.transform = `translate(${dx}px, ${dy}px)`;
                el2b.style.transform = `translate(${-dx}px, ${-dy}px)`;
                await new Promise(resolve => setTimeout(resolve, 320));
                el1b.classList.remove('swapping');
                el2b.classList.remove('swapping');
                el1b.style.transform = '';
                el2b.style.transform = '';
            }
            this.swap(r1, c1, r2, c2);
            this.renderBoard();
        }
    }
    swap(r1, c1, r2, c2) {
        const temp = this.board[r1][c1];
        this.board[r1][c1] = this.board[r2][c2];
        this.board[r2][c2] = temp;
    }

    findMatches() {
        const matches = [];
        // 橫向
        for (let row = 0; row < this.boardSize; row++) {
            let count = 1;
            for (let col = 1; col < this.boardSize; col++) {
                if (this.board[row][col] && this.board[row][col - 1] && this.board[row][col].color === this.board[row][col - 1].color) {
                    count++;
                } else {
                    if (count >= 3) matches.push({ row, col: col - count, len: count, dir: 'h' });
                    count = 1;
                }
            }
            if (count >= 3) matches.push({ row, col: this.boardSize - count, len: count, dir: 'h' });
        }
        // 直向
        for (let col = 0; col < this.boardSize; col++) {
            let count = 1;
            for (let row = 1; row < this.boardSize; row++) {
                if (this.board[row][col] && this.board[row - 1][col] && this.board[row][col].color === this.board[row - 1][col].color) {
                    count++;
                } else {
                    if (count >= 3) matches.push({ row: row - count, col, len: count, dir: 'v' });
                    count = 1;
                }
            }
            if (count >= 3) matches.push({ row: this.boardSize - count, col, len: count, dir: 'v' });
        }
        return matches;
    }

    async handleMatches() {
        this.isAnimating = true;
        let combo = 0;
        let comboCount = 0;
        let matchCombos = [];
        while (true) {
            const matches = this.findMatches();
            if (matches.length === 0) break;
            combo++;
            comboCount++;
            matchCombos.push(matches);
            this.scoreManager.nextChain(); // 進入下一層連鎖
            // 顯示 combo-indicator
            if (combo > 1) {
                this.showCombo(combo);
            }
            const toRemove = Array.from({ length: this.boardSize }, () => Array(this.boardSize).fill(false));
            matches.forEach(m => {
                for (let i = 0; i < m.len; i++) {
                    if (m.dir === 'h') toRemove[m.row][m.col + i] = true;
                    else toRemove[m.row + i][m.col] = true;
                }
            });
            const positions = [];
            for (let row = 0; row < this.boardSize; row++) {
                for (let col = 0; col < this.boardSize; col++) {
                    if (toRemove[row][col]) positions.push(`${row},${col}`);
                }
            }
            let matchCount = positions.length;
            let points = this.scoreManager.addMatchScore(matchCount);
            let scoreClass = 'score3';
            if (matchCount === 3) scoreClass = 'score3';
            else if (matchCount === 4) scoreClass = 'score4';
            else if (matchCount >= 5) scoreClass = 'score5';
            if (combo > 1) scoreClass = 'combo';
            // 音效：只用 Clear1.wav
            if (true) { // 只要有消除
                if (this.findMatches().length > 0) {
                    clearSound1.currentTime = 0;
                    clearSound1.play();
                } else {
                    clearSound2.currentTime = 0;
                    clearSound2.play();
                }
            }
            await this.showMatchAnimation(positions, points, scoreClass);
            for (let row = 0; row < this.boardSize; row++) {
                for (let col = 0; col < this.boardSize; col++) {
                    if (toRemove[row][col]) this.board[row][col] = null;
                }
            }
            await this.fillBoard();
            this.renderBoard();
            this.updateUI();
        }
        // combo 結束時隱藏
        this.hideCombo();
        this.scoreManager.resetChain(); // 連鎖結束，重設
        // === 新增：自動洗盤 ===
        let shuffleCount = 0;
        while (!this.hasAvailableMove() && shuffleCount < 10) {
            this.shuffleBoard();
            this.renderBoard();
            this.updateUI();
            shuffleCount++;
        }
        // =====================
        this.isAnimating = false;
        this.checkGameEnd();
    }

    showCombo(comboCount) {
        const indicator = document.getElementById('combo-indicator');
        indicator.textContent = '';
        indicator.style.display = 'block';
        indicator.style.animation = 'combo-pop 1s';
        setTimeout(() => {
            indicator.style.animation = '';
        }, 1000);
    }

    hideCombo() {
        const indicator = document.getElementById('combo-indicator');
        indicator.style.display = 'none';
    }

    async showMatchAnimation(positions, score = 0, scoreClass = 'score3') {
        // 震動
        if (window.navigator.vibrate) window.navigator.vibrate([40, 30, 40]);
        // 第一次消除時解鎖音效
        unlockSound();
        // 播放消除音效（Clear1/Clear2）
        // 不再播放clearSound，消除音效已統一於上方
        // 連線閃光線
        const matches = this.findMatches();
        const boardRect = document.getElementById('game-board').getBoundingClientRect();
        matches.forEach(m => {
            const line = document.createElement('div');
            line.className = 'crush-flash-line';
            let x1, y1, x2, y2;
            if (m.dir === 'h') {
                // 橫向
                const elStart = document.querySelector(`[data-row="${m.row}"][data-col="${m.col}"]`);
                const elEnd = document.querySelector(`[data-row="${m.row}"][data-col="${m.col + m.len - 1}"]`);
                if (!elStart || !elEnd) return;
                const rect1 = elStart.getBoundingClientRect();
                const rect2 = elEnd.getBoundingClientRect();
                x1 = rect1.left + rect1.width / 2 - boardRect.left;
                y1 = rect1.top + rect1.height / 2 - boardRect.top;
                x2 = rect2.left + rect2.width / 2 - boardRect.left;
                y2 = y1;
            } else {
                // 直向
                const elStart = document.querySelector(`[data-row="${m.row}"][data-col="${m.col}"]`);
                const elEnd = document.querySelector(`[data-row="${m.row + m.len - 1}"][data-col="${m.col}"]`);
                if (!elStart || !elEnd) return;
                const rect1 = elStart.getBoundingClientRect();
                const rect2 = elEnd.getBoundingClientRect();
                x1 = rect1.left + rect1.width / 2 - boardRect.left;
                y1 = rect1.top + rect1.height / 2 - boardRect.top;
                x2 = x1;
                y2 = rect2.top + rect2.height / 2 - boardRect.top;
            }
            line.style.position = 'absolute';
            line.style.left = Math.min(x1, x2) + 'px';
            line.style.top = Math.min(y1, y2) + 'px';
            line.style.width = (m.dir === 'h' ? Math.abs(x2 - x1) : 4) + 'px';
            line.style.height = (m.dir === 'v' ? Math.abs(y2 - y1) : 4) + 'px';
            line.style.background = 'linear-gradient(90deg, #fff 60%, #ffe066 100%)';
            line.style.borderRadius = '2px';
            line.style.boxShadow = '0 0 8px 2px #fff8';
            line.style.opacity = '0.85';
            line.style.pointerEvents = 'none';
            line.style.zIndex = '30';
            line.classList.add('crush-flash-line-anim');
            document.getElementById('game-board').appendChild(line);
            setTimeout(() => line.remove(), 500);
        });
        // 顯示分數浮現
        if (positions.length > 0 && score > 0) {
            positions.forEach(pos => {
                const [row, col] = pos.split(',').map(Number);
                const el = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (el) {
                    // 白色圓形閃光
                    const flash = document.createElement('div');
                    flash.className = 'crush-flash-circle';
                    el.appendChild(flash);
                    setTimeout(() => flash.remove(), 500);
                    // 分數浮現
                    const float = document.createElement('div');
                    float.className = 'score-float ' + scoreClass;
                    float.textContent = `+${score}`;
                    el.appendChild(float);
                    setTimeout(() => float.remove(), 1200);
                }
            });
        }
        // 閃光+震動動畫
        positions.forEach(pos => {
            const [row, col] = pos.split(',').map(Number);
            const el = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (el) el.classList.add('matching');
        });
        await new Promise(resolve => setTimeout(resolve, 500));
        positions.forEach(pos => {
            const [row, col] = pos.split(',').map(Number);
            const el = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (el) el.classList.remove('matching');
        });
    }

    async fillBoard() {
        let moved = false;
        do {
            moved = false;
            // 記錄每顆糖果要落下幾格
            const fallMap = Array.from({ length: this.boardSize }, () => Array(this.boardSize).fill(0));
            for (let col = 0; col < this.boardSize; col++) {
                let empty = 0;
                for (let row = this.boardSize - 1; row >= 0; row--) {
                    if (this.board[row][col] === null) {
                        empty++;
                    } else if (empty > 0) {
                        fallMap[row][col] = empty;
                    }
                }
            }
            // 只對要移動的現有糖果加動畫
            for (let row = this.boardSize - 1; row >= 0; row--) {
                for (let col = 0; col < this.boardSize; col++) {
                    if (fallMap[row][col] > 0) {
                        const el = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                        if (el) {
                            el.classList.add('swapping');
                            el.style.transition = 'transform 0.38s cubic-bezier(.5,1.6,.5,1)';
                            el.style.transform = `translateY(${fallMap[row][col] * 100}%)`;
                        }
                    }
                }
            }
            // 新產生的糖果一整串同時落下，動畫結束後同時出現，動畫元素完全不顯示內容
            const newCandyRows = Array(this.boardSize).fill(0); // 每行要補幾顆
            for (let col = 0; col < this.boardSize; col++) {
                let empty = 0;
                for (let row = 0; row < this.boardSize; row++) {
                    if (this.board[row][col] === null) empty++;
                }
                newCandyRows[col] = empty;
                if (empty > 0) {
                    // 新增一個覆蓋整欄的動畫元素
                    const el = document.createElement('div');
                    el.className = `candy swapping`;
                    el.textContent = '';
                    el.style.position = 'absolute';
                    el.style.left = `${col * (100 / this.boardSize)}%`;
                    el.style.width = `${100 / this.boardSize}%`;
                    el.style.height = `${empty * (100 / this.boardSize)}%`;
                    el.style.top = '0';
                    el.style.background = 'none';
                    el.style.border = 'none';
                    el.style.boxShadow = 'none';
                    el.style.transform = `translateY(${-100}%)`;
                    el.style.transition = 'transform 0.38s cubic-bezier(.5,1.6,.5,1)';
                    el.style.pointerEvents = 'none';
                    el.style.zIndex = '2'; // 蓋住下方格子
                    document.getElementById('game-board').appendChild(el);
                    setTimeout(() => {
                        el.style.transform = `translateY(${empty * 100}%)`;
                    }, 10);
                    setTimeout(() => {
                        el.remove();
                    }, 400);
                }
            }
            // 等動畫
            await new Promise(resolve => setTimeout(resolve, 380));
            // 還原 style
            for (let row = this.boardSize - 1; row >= 0; row--) {
                for (let col = 0; col < this.boardSize; col++) {
                    if (fallMap[row][col] > 0) {
                        const el = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                        if (el) {
                            el.classList.remove('swapping');
                            el.style.transition = '';
                            el.style.transform = '';
                        }
                    }
                }
            }
            // 真正資料移動（新糖果同時補齊）
            // 先讓現有糖果下落
            let newFallingMap = Array.from({ length: this.boardSize }, () => Array(this.boardSize).fill(false));
            for (let col = 0; col < this.boardSize; col++) {
                let writeRow = this.boardSize - 1;
                // 先把現有糖果往下移動
                for (let row = this.boardSize - 1; row >= 0; row--) {
                    if (this.board[row][col] !== null) {
                        if (writeRow !== row) {
                            this.board[writeRow][col] = this.board[row][col];
                            this.board[row][col] = null;
                            moved = true;
                        }
                        writeRow--;
                    }
                }
                // 一次性補齊新糖果，並標記 falling
                for (let row = writeRow; row >= 0; row--) {
                    this.board[row][col] = this.getRandomCandy();
                    newFallingMap[row][col] = true;
                    moved = true;
                }
            }
            this.renderBoard(newFallingMap);
        } while (moved);
    }

    updateUI() {
        const movesElem = document.getElementById('moves');
        if (movesElem) movesElem.textContent = (this.maxMoves - this.moves);
        const maxMovesElem = document.getElementById('max-moves');
        if (maxMovesElem) maxMovesElem.textContent = '';
        const timerElem = document.getElementById('timer');
        if (timerElem) timerElem.textContent = this.timeLeft;
        if (this.gameMode === 'score') {
            const targetScoreElem = document.getElementById('target-score');
            if (targetScoreElem) targetScoreElem.textContent = `目標: ${this.targetScore}分`;
        }
        // 分數進度條
        const progressBar = document.getElementById('score-progress-bar');
        const progressText = document.getElementById('score-progress-text');
        if (progressBar && progressText) {
            const score = this.scoreManager.getScore();
            const percent = Math.min(100, Math.round(score / this.targetScore * 100));
            progressBar.style.width = percent + '%';
            progressText.textContent = `${score} / ${this.targetScore}`;
        }
    }

    startTimer() {
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateUI();
            if (this.timeLeft <= 0) this.endGame();
        }, 1000);
    }

    checkGameEnd() {
        if (this.gameMode === 'score') {
            if (this.scoreManager.getScore() >= this.targetScore) this.endGame(true);
            else if (this.moves >= this.maxMoves) this.endGame(false);
        }
    }

    endGame(won = false) {
        this.isGameActive = false;
        if (this.timer) clearInterval(this.timer);
        const modal = document.getElementById('game-over-modal');
        const title = document.getElementById('game-result-title');
        const message = document.getElementById('game-result-message');
        const finalScore = document.getElementById('final-score');
        if (won) {
            title.textContent = '🎉 恭喜過關!';
            message.textContent = '你成功達到了目標分數！';
            clearSound2.currentTime = 0;
            clearSound2.play();
            // 不自動進入下一關，等玩家按Nest
        } else {
            title.textContent = '😔 遊戲結束';
            if (this.gameMode === 'score') message.textContent = '步數用完了，但別灰心，再試一次！';
            else message.textContent = '時間到了，但別灰心，再試一次！';
        }
        finalScore.textContent = this.scoreManager.getScore();
        modal.style.display = 'flex';
        // if (won) {
        //     setTimeout(() => this.nextLevel(), 1500);
        // }
    }

    findHint() {
        // 取得棋盤快照
        const cloneBoard = () => this.board.map(row => row.map(cell => cell ? { ...cell } : null));
        // 模擬消除並回傳分數與新棋盤（不補新糖果）
        const simulateMatch = (board) => {
            let totalScore = 0;
            let changed = true;
            let chainLevel = 1;
            while (changed) {
                changed = false;
                // 找出所有消除
                const matches = [];
                // 橫向
                for (let row = 0; row < this.boardSize; row++) {
                    let count = 1;
                    for (let col = 1; col < this.boardSize; col++) {
                        if (board[row][col] && board[row][col - 1] && board[row][col].color === board[row][col - 1].color) {
                            count++;
                        } else {
                            if (count >= 3) matches.push({ row, col: col - count, len: count, dir: 'h' });
                            count = 1;
                        }
                    }
                    if (count >= 3) matches.push({ row, col: this.boardSize - count, len: count, dir: 'h' });
                }
                // 直向
                for (let col = 0; col < this.boardSize; col++) {
                    let count = 1;
                    for (let row = 1; row < this.boardSize; row++) {
                        if (board[row][col] && board[row - 1][col] && board[row][col].color === board[row - 1][col].color) {
                            count++;
                        } else {
                            if (count >= 3) matches.push({ row: row - count, col, len: count, dir: 'v' });
                            count = 1;
                        }
                    }
                    if (count >= 3) matches.push({ row: this.boardSize - count, col, len: count, dir: 'v' });
                }
                if (matches.length === 0) break;
                // 加分並消除
                matches.forEach(m => {
                    let matchScore = this.scoreManager.getBaseScore(m.len) * (1 + (chainLevel - 1) * 0.2);
                    totalScore += Math.round(matchScore);
                    for (let i = 0; i < m.len; i++) {
                        if (m.dir === 'h') board[m.row][m.col + i] = null;
                        else board[m.row + i][m.col] = null;
                    }
                });
                // 下落（不補新糖果）
                for (let col = 0; col < this.boardSize; col++) {
                    let pointer = this.boardSize - 1;
                    for (let row = this.boardSize - 1; row >= 0; row--) {
                        if (board[row][col]) {
                            board[pointer][col] = board[row][col];
                            if (pointer !== row) board[row][col] = null;
                            pointer--;
                        }
                    }
                    for (let row = pointer; row >= 0; row--) {
                        board[row][col] = null; // 不補新糖果
                    }
                }
                changed = true;
                chainLevel++;
            }
            return totalScore;
        };
        let bestScore = 0;
        let bestMove = null;
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                // 檢查右邊
                if (col < this.boardSize - 1) {
                    let board1 = cloneBoard();
                    [board1[row][col], board1[row][col + 1]] = [board1[row][col + 1], board1[row][col]];
                    let firstScore = simulateMatch(board1);
                    if (firstScore === 0) continue; // 交換後沒消除不納入
                    // 第二步所有可能
                    let secondBest = 0;
                    for (let r2 = 0; r2 < this.boardSize; r2++) {
                        for (let c2 = 0; c2 < this.boardSize; c2++) {
                            if (c2 < this.boardSize - 1) {
                                let board2 = board1.map(r => r.map(cell => cell ? { ...cell } : null));
                                [board2[r2][c2], board2[r2][c2 + 1]] = [board2[r2][c2 + 1], board2[r2][c2]];
                                let score2 = simulateMatch(board2);
                                if (score2 > secondBest) secondBest = score2;
                            }
                            if (r2 < this.boardSize - 1) {
                                let board2 = board1.map(r => r.map(cell => cell ? { ...cell } : null));
                                [board2[r2][c2], board2[r2 + 1][c2]] = [board2[r2 + 1][c2], board2[r2][c2]];
                                let score2 = simulateMatch(board2);
                                if (score2 > secondBest) secondBest = score2;
                            }
                        }
                    }
                    let total = firstScore + secondBest;
                    if (total > bestScore || (total === bestScore && bestMove && row > bestMove[0].row)) {
                        bestScore = total;
                        bestMove = [{ row, col }, { row, col: col + 1 }];
                    }
                }
                // 檢查下方
                if (row < this.boardSize - 1) {
                    let board1 = cloneBoard();
                    [board1[row][col], board1[row + 1][col]] = [board1[row + 1][col], board1[row][col]];
                    let firstScore = simulateMatch(board1);
                    if (firstScore === 0) continue; // 交換後沒消除不納入
                    // 第二步所有可能
                    let secondBest = 0;
                    for (let r2 = 0; r2 < this.boardSize; r2++) {
                        for (let c2 = 0; c2 < this.boardSize; c2++) {
                            if (c2 < this.boardSize - 1) {
                                let board2 = board1.map(r => r.map(cell => cell ? { ...cell } : null));
                                [board2[r2][c2], board2[r2][c2 + 1]] = [board2[r2][c2 + 1], board2[r2][c2]];
                                let score2 = simulateMatch(board2);
                                if (score2 > secondBest) secondBest = score2;
                            }
                            if (r2 < this.boardSize - 1) {
                                let board2 = board1.map(r => r.map(cell => cell ? { ...cell } : null));
                                [board2[r2][c2], board2[r2 + 1][c2]] = [board2[r2 + 1][c2], board2[r2][c2]];
                                let score2 = simulateMatch(board2);
                                if (score2 > secondBest) secondBest = score2;
                            }
                        }
                    }
                    let total = firstScore + secondBest;
                    if (total > bestScore || (total === bestScore && bestMove && row > bestMove[0].row)) {
                        bestScore = total;
                        bestMove = [{ row, col }, { row: row + 1, col }];
                    }
                }
            }
        }
        // 若沒找到最佳步驟，但還有合法步驟，提示第一個合法步驟
        if (!bestMove && this.hasAvailableMove()) {
            for (let row = 0; row < this.boardSize; row++) {
                for (let col = 0; col < this.boardSize; col++) {
                    // 檢查右邊
                    if (col < this.boardSize - 1) {
                        this.swap(row, col, row, col + 1);
                        if (this.findMatches().length > 0) {
                            this.swap(row, col, row, col + 1);
                            return [{ row, col }, { row, col: col + 1 }];
                        }
                        this.swap(row, col, row, col + 1);
                    }
                    // 檢查下方
                    if (row < this.boardSize - 1) {
                        this.swap(row, col, row + 1, col);
                        if (this.findMatches().length > 0) {
                            this.swap(row, col, row + 1, col);
                            return [{ row, col }, { row: row + 1, col }];
                        }
                        this.swap(row, col, row + 1, col);
                    }
                }
            }
        }
        // 若無步可走，才自動洗盤直到有步可走
        if (!bestMove && !this.hasAvailableMove()) {
            let shuffleCount = 0;
            do {
                this.shuffleBoard();
                shuffleCount++;
                // 防止極端情況死循環
                if (shuffleCount > 10) break;
                bestMove = this.findHint();
            } while (!bestMove);
        }
        return bestMove;
    }
    showHint() {
        document.querySelectorAll('.hint').forEach(el => el.classList.remove('hint'));
        const hint = this.findHint();
        if (hint) {
            hint.forEach(pos => {
                const el = document.querySelector(`[data-row='${pos.row}'][data-col='${pos.col}']`);
                if (el) {
                    el.classList.add('hint');
                    el.classList.add('vibrate-hint');
                }
            });
            setTimeout(() => {
                document.querySelectorAll('.vibrate-hint').forEach(el => el.classList.remove('vibrate-hint'));
            }, 1000);
            setTimeout(() => {
                document.querySelectorAll('.hint').forEach(el => el.classList.remove('hint'));
            }, 1200);
        } else {
            alert('目前沒有可消除的組合！');
        }
    }

    setupEventListeners() {
        document.getElementById('new-game-btn').addEventListener('click', () => this.resetGame());
        document.getElementById('mode-toggle-btn').addEventListener('click', () => this.toggleGameMode());
        document.getElementById('restart-btn').addEventListener('click', () => this.resetGame());
        document.getElementById('hint-btn').addEventListener('click', () => { if (!this.isAnimating) this.showHint(); });
        // 觸控支援
        let touchStartRow = null, touchStartCol = null;
        const gameBoard = document.getElementById('game-board');
        gameBoard.addEventListener('touchstart', (e) => {
            if (this.isAnimating) return;
            const touch = e.touches[0];
            const candyElement = document.elementFromPoint(touch.clientX, touch.clientY);
            if (!candyElement || !candyElement.classList.contains('candy')) return;
            touchStartRow = parseInt(candyElement.dataset.row);
            touchStartCol = parseInt(candyElement.dataset.col);
        });
        gameBoard.addEventListener('touchmove', (e) => {
            if (this.isAnimating) return;
            if (touchStartRow === null || touchStartCol === null) return;
            const touch = e.touches[0];
            const candyElement = document.elementFromPoint(touch.clientX, touch.clientY);
            if (!candyElement || !candyElement.classList.contains('candy')) return;
            const row = parseInt(candyElement.dataset.row);
            const col = parseInt(candyElement.dataset.col);
            if (this.isAdjacent(touchStartRow, touchStartCol, row, col)) {
                this.trySwap(touchStartRow, touchStartCol, row, col);
                touchStartRow = null;
                touchStartCol = null;
            }
        });
        gameBoard.addEventListener('touchend', (e) => {
            touchStartRow = null;
            touchStartCol = null;
        });
    }

    toggleGameMode() {
        this.gameMode = this.gameMode === 'score' ? 'time' : 'score';
        const modeInfo = document.getElementById('current-mode');
        const timerContainer = document.querySelector('.timer-container');
        const movesContainer = document.querySelector('.moves-container');
        if (this.gameMode === 'time') {
            modeInfo.textContent = '限時模式';
            timerContainer.style.display = 'block';
            movesContainer.style.display = 'none';
        } else {
            modeInfo.textContent = '目標分數模式';
            timerContainer.style.display = 'none';
            movesContainer.style.display = 'block';
        }
        this.resetGame();
    }
}

// 在 CandyCrushGame 外部加上音效物件
const clearSound = new Audio('sound/Clear.wav');
const clearSound1 = new Audio('sound/Clear1.wav');
const clearSound2 = new Audio('sound/Clear2.wav');
let soundUnlocked = false;
function unlockSound() {
    if (!soundUnlocked) {
        try { clearSound1.volume = 0; clearSound1.play().catch(()=>{}); clearSound1.volume = 1; } catch(e){}
        try { clearSound2.volume = 0; clearSound2.play().catch(()=>{}); clearSound2.volume = 1; } catch(e){}
        soundUnlocked = true;
    }
}

window.onload = () => {
    window.game = new CandyCrushGame();
    window.game.gameMode = 'score';
    // 開始畫面 Play 按鈕
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.onclick = function() {
            const overlay = document.getElementById('start-overlay');
            if (overlay) {
                overlay.style.display = 'none';
                overlay.classList.remove('modal'); // 移除 modal class 以防 display:flex 被強制
            }
            unlockSound();
            window.game.resetGame();
        };
    }
    // 破關彈窗按鈕（Nest）
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
        restartBtn.onclick = function() {
            // 只在過關時進入下一關，失敗時重玩
            if (document.getElementById('game-result-title').textContent.includes('恭喜')) {
                document.getElementById('game-over-modal').style.display = 'none';
                window.game.nextLevel();
            } else {
                document.getElementById('game-over-modal').style.display = 'none';
                window.game.resetGame();
            }
        };
    }
}; 