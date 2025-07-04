// Game constants
const LETTERS = ['A', 'B', 'C', 'D', 'E'];
const COLORS = {
    'A': '#0000FF',  // Blue
    'B': '#FF0000',  // Red
    'C': '#FF00FF',  // Magenta/Pink
    'D': '#FFFF00',  // Yellow
    'E': '#00FFFF',  // Cyan
};
const CELL_SIZE = 32;

// Game state
let gameState = {
    size: 'normal',
    style: 'panel',
    soundEnabled: true,
    board: [],
    initBoard: [],
    prevBoard: null,
    prevScore: 0,
    markedGroup: null,
    markedColor: null,
    score: 0,
    timerStarted: false,
    startTime: 0,
    scores: [],
    rows: 10,
    cols: 20
};

// Sound effect
const eliminationSound = new Audio('abcd.wav');

// Initialize game
function initGame() {
    loadScores();
    setBoardSize();
    generateBoard();
    drawBoard();
    updateStatus();
}

// 監聽螢幕方向改變，自動重設盤面
let lastOrientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
window.addEventListener('resize', function() {
    const currentOrientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    if (currentOrientation !== lastOrientation) {
        lastOrientation = currentOrientation;
        // 重新開始遊戲以適應新方向
        newGame();
    }
});

// Set board size
function setBoardSize() {
    let rows, cols;
    if (gameState.size === 'normal') {
        rows = 10;
        cols = 20;
    } else {
        rows = 15;
        cols = 25;
    }
    // 手機板自動對調長短邊
    if (window.innerWidth < 700 && window.innerWidth < window.innerHeight) {
        // 直向手機，rows/cols 對調
        [rows, cols] = [cols, rows];
    }
    gameState.rows = rows;
    gameState.cols = cols;
    const gameBoard = document.getElementById('game-board');
    gameBoard.style.gridTemplateColumns = `repeat(${gameState.cols}, ${CELL_SIZE}px)`;
    gameBoard.style.gridTemplateRows = `repeat(${gameState.rows}, ${CELL_SIZE}px)`;
}

// Generate new board
function generateBoard() {
    gameState.initBoard = Array(gameState.rows).fill().map(() => 
        Array(gameState.cols).fill().map(() => Math.floor(Math.random() * 5))
    );
    gameState.board = gameState.initBoard.map(row => [...row]);
}

// Draw board
function drawBoard() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = '';

    for (let r = 0; r < gameState.rows; r++) {
        for (let c = 0; c < gameState.cols; c++) {
            const cell = document.createElement('div');
            cell.className = `cell ${gameState.style}`;
            
            if (gameState.board[r][c] !== null) {
                const letter = LETTERS[gameState.board[r][c]];
                const color = COLORS[letter];
                
                if (gameState.markedGroup && gameState.markedGroup.has(`${r},${c}`)) {
                    cell.style.backgroundColor = 'white';
                    cell.style.color = color;
                } else {
                    cell.style.backgroundColor = color;
                    cell.style.color = 'black';
                }
                
                // Only show letters in Panel style
                if (gameState.style === 'panel') {
                    cell.textContent = letter;
                }
                
                cell.onclick = () => handleClick(r, c);
            } else {
                // Add empty class for Marble style
                if (gameState.style === 'marble') {
                    cell.classList.add('empty');
                }
            }
            
            gameBoard.appendChild(cell);
        }
    }
}

// Handle cell click
function handleClick(row, col) {
    if (gameState.board[row][col] === null) return;

    const group = findGroup(row, col);
    if (group.size > 1) {
        if (gameState.markedGroup && 
            gameState.markedGroup.size === group.size && 
            Array.from(gameState.markedGroup).every(pos => group.has(pos))) {
            // Save previous state
            gameState.prevBoard = gameState.board.map(row => [...row]);
            gameState.prevScore = gameState.score;

            // Start timer if not started
            if (!gameState.timerStarted) {
                gameState.timerStarted = true;
                gameState.startTime = Date.now();
                updateTimer();
            }

            // Eliminate group
            eliminateGroup(group);
        } else {
            // Mark group
            gameState.markedGroup = group;
            gameState.markedColor = gameState.board[row][col];
            drawBoard();
            updateStatus();
        }
    } else {
        gameState.markedGroup = null;
        gameState.markedColor = null;
        drawBoard();
        updateStatus();
    }
}

// Find connected group
function findGroup(row, col) {
    const target = gameState.board[row][col];
    const visited = new Set();
    const stack = [[row, col]];

    while (stack.length > 0) {
        const [r, c] = stack.pop();
        const key = `${r},${c}`;
        
        if (visited.has(key) || gameState.board[r][c] !== target) continue;
        
        visited.add(key);
        
        const directions = [[-1,0], [1,0], [0,-1], [0,1]];
        for (const [dr, dc] of directions) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < gameState.rows && nc >= 0 && nc < gameState.cols && 
                gameState.board[nr][nc] === target) {
                stack.push([nr, nc]);
            }
        }
    }
    
    return visited;
}

// Eliminate group
function eliminateGroup(group) {
    // Play sound
    if (gameState.soundEnabled) {
        eliminationSound.play();
    }

    // Remove cells
    for (const key of group) {
        const [r, c] = key.split(',').map(Number);
        gameState.board[r][c] = null;
    }

    // Update score
    const n = group.size;
    if (n >= 2) {
        gameState.score += (n - 1) * (n - 2) + 2;
    }

    // Collapse board
    collapseBoard();

    // Clear marked group
    gameState.markedGroup = null;
    gameState.markedColor = null;

    // Update display
    drawBoard();
    updateStatus();

    // Check game over
    if (!hasMoves()) {
        setTimeout(() => {
            alert('Game Over!');
            tryUpdateScores();
            showScore();
        }, 100);
    }
}

// Collapse board
function collapseBoard() {
    // Fall down
    for (let c = 0; c < gameState.cols; c++) {
        const stack = [];
        for (let r = 0; r < gameState.rows; r++) {
            if (gameState.board[r][c] !== null) {
                stack.push(gameState.board[r][c]);
            }
        }
        for (let r = gameState.rows - 1; r >= 0; r--) {
            gameState.board[r][c] = stack.pop() ?? null;
        }
    }

    // Shift left
    let writeCol = 0;
    for (let readCol = 0; readCol < gameState.cols; readCol++) {
        if (gameState.board.some(row => row[readCol] !== null)) {
            if (writeCol !== readCol) {
                for (let r = 0; r < gameState.rows; r++) {
                    gameState.board[r][writeCol] = gameState.board[r][readCol];
                    gameState.board[r][readCol] = null;
                }
            }
            writeCol++;
        }
    }
}

// Check if there are any valid moves
function hasMoves() {
    for (let r = 0; r < gameState.rows; r++) {
        for (let c = 0; c < gameState.cols; c++) {
            if (gameState.board[r][c] !== null) {
                const group = findGroup(r, c);
                if (group.size > 1) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Update status display
function updateStatus() {
    const markLabel = document.getElementById('mark-label');
    const scoreLabel = document.getElementById('score-label');

    if (gameState.markedGroup) {
        const n = gameState.markedGroup.size;
        const point = n >= 2 ? (n - 1) * (n - 2) + 2 : 0;
        markLabel.textContent = `MARK: ${n} (POINT: ${point})`;
    } else {
        markLabel.textContent = 'MARK: 0 (POINT: 0)';
    }

    scoreLabel.textContent = `SCORE: ${gameState.score}`;
}

// Update timer
function updateTimer() {
    if (!gameState.timerStarted) {
        document.getElementById('time-label').textContent = 'TIME: 0s';
        return;
    }

    const elapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
    document.getElementById('time-label').textContent = `TIME: ${elapsed}s`;
    setTimeout(updateTimer, 1000);
}

// Game control functions
function newGame() {
    tryUpdateScores();
    setBoardSize();
    generateBoard();
    gameState.prevBoard = null;
    gameState.prevScore = 0;
    gameState.markedGroup = null;
    gameState.markedColor = null;
    gameState.score = 0;
    gameState.timerStarted = false;
    gameState.startTime = 0;
    document.getElementById('time-label').textContent = 'TIME: 0s';
    drawBoard();
    updateStatus();
}

function replay() {
    tryUpdateScores();
    gameState.board = gameState.initBoard.map(row => [...row]);
    gameState.prevBoard = null;
    gameState.prevScore = 0;
    gameState.markedGroup = null;
    gameState.markedColor = null;
    gameState.score = 0;
    gameState.timerStarted = false;
    gameState.startTime = 0;
    document.getElementById('time-label').textContent = 'TIME: 0s';
    drawBoard();
    updateStatus();
}

function undo() {
    if (gameState.prevBoard) {
        gameState.board = gameState.prevBoard.map(row => [...row]);
        gameState.score = gameState.prevScore;
        gameState.markedGroup = null;
        gameState.markedColor = null;
        drawBoard();
        updateStatus();
    } else {
        alert('No moves to undo!');
    }
}

// Score management
function loadScores() {
    const scores = localStorage.getItem('samegame_scores');
    gameState.scores = scores ? JSON.parse(scores) : Array(10).fill(0);
}

function saveScores() {
    localStorage.setItem('samegame_scores', JSON.stringify(gameState.scores));
}

function tryUpdateScores() {
    if (gameState.score > 0) {
        gameState.scores.push(gameState.score);
        gameState.scores.sort((a, b) => b - a);
        gameState.scores = gameState.scores.slice(0, 10);
        saveScores();
    }
}

function showScore() {
    const scoreList = document.getElementById('score-list');
    scoreList.innerHTML = '';
    gameState.scores.forEach((score, index) => {
        const li = document.createElement('li');
        li.textContent = `${index + 1}. ${score}`;
        scoreList.appendChild(li);
    });
    document.getElementById('score-modal').style.display = 'flex';
}

function clearScores() {
    gameState.scores = Array(10).fill(0);
    saveScores();
    showScore();
}

// UI control functions
function toggleSound() {
    gameState.soundEnabled = !gameState.soundEnabled;
    const button = document.querySelector('button[onclick="toggleSound()"]');
    button.textContent = `Sound: ${gameState.soundEnabled ? 'On' : 'Off'}`;
}

function setSize(size) {
    gameState.size = size;
    newGame();
}

function setStyle(style) {
    gameState.style = style;
    drawBoard();
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Initialize game when page loads
window.onload = initGame; 
