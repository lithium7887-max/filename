const SIZE = 15;
const EMPTY = 0;
const BLACK = 1; // User
const WHITE = 2; // AI

let board = [];
let moveCount = 0;
let gameOver = false;
let isAITurn = false;
let lastMove = null;

const boardElement = document.getElementById('board');
const statusElement = document.getElementById('statusMsg');
const difficultySelect = document.getElementById('difficulty');
const newGameBtn = document.getElementById('newGameBtn');
const themeBtn = document.getElementById('themeBtn');

function initGame() {
    board = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
    moveCount = 0;
    gameOver = false;
    isAITurn = false;
    lastMove = null;
    statusElement.textContent = "당신의 차례입니다! (흑돌)";
    renderBoard();
}

function renderBoard() {
    boardElement.innerHTML = '';
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.r = r;
            cell.dataset.c = c;

            if (board[r][c] !== EMPTY) {
                const stone = document.createElement('div');
                stone.classList.add('stone');
                stone.classList.add(board[r][c] === BLACK ? 'black' : 'white');
                if (lastMove && lastMove.r === r && lastMove.c === c) {
                    stone.classList.add('last-move');
                }
                cell.appendChild(stone);
            } else {
                cell.addEventListener('click', () => handleCellClick(r, c));
            }
            boardElement.appendChild(cell);
        }
    }
}

function handleCellClick(r, c) {
    if (gameOver || isAITurn || board[r][c] !== EMPTY) return;

    makeMove(r, c, BLACK);

    if (checkWin(r, c, BLACK)) {
        gameOver = true;
        statusElement.textContent = "승리했습니다!";
        return;
    }

    isAITurn = true;
    statusElement.textContent = "AI가 생각 중입니다...";

    setTimeout(() => {
        aiMove();
    }, 50);
}

function makeMove(r, c, color) {
    board[r][c] = color;
    lastMove = { r, c };
    moveCount++;
    renderBoard();
}

const WIN_SCORE = 10000000;

function evaluateLine(count, openEnds) {
    if (count >= 5) return WIN_SCORE;
    if (count === 4) {
        if (openEnds === 2) return 100000;
        if (openEnds === 1) return 10000;
    }
    if (count === 3) {
        if (openEnds === 2) return 5000;
        if (openEnds === 1) return 500;
    }
    if (count === 2) {
        if (openEnds === 2) return 100;
        if (openEnds === 1) return 10;
    }
    return 0;
}

function evaluateDirection(r, c, dr, dc, tempBoard, color) {
    let count = 1;
    let blockEnds = 0;

    let i = r + dr, j = c + dc;
    while (i >= 0 && i < SIZE && j >= 0 && j < SIZE && tempBoard[i][j] === color) {
        count++;
        i += dr;
        j += dc;
    }
    if (i < 0 || i >= SIZE || j < 0 || j >= SIZE || tempBoard[i][j] !== EMPTY) {
        blockEnds++;
    }

    i = r - dr; j = c - dc;
    while (i >= 0 && i < SIZE && j >= 0 && j < SIZE && tempBoard[i][j] === color) {
        count++;
        i -= dr;
        j -= dc;
    }
    if (i < 0 || i >= SIZE || j < 0 || j >= SIZE || tempBoard[i][j] !== EMPTY) {
        blockEnds++;
    }

    let openEnds = 2 - blockEnds;
    return { count, openEnds };
}

function checkWin(r, c, color) {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (let [dr, dc] of directions) {
        const { count } = evaluateDirection(r, c, dr, dc, board, color);
        if (count >= 5) return true;
    }
    return false;
}

function hasImmediateThreat(tempBoard, lastR, lastC, color) {
    if (lastR === null || lastC === null) return false;
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (let [dr, dc] of directions) {
        const { count, openEnds } = evaluateDirection(lastR, lastC, dr, dc, tempBoard, color);
        if (count >= 4) return true;
        if (count === 3 && openEnds === 2) return true;
    }
    return false;
}

function getValidMoves(tempBoard) {
    const moves = [];
    const radius = 2;
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (tempBoard[r][c] === EMPTY) {
                let hasNeighbor = false;
                for (let i = Math.max(0, r - radius); i <= Math.min(SIZE - 1, r + radius); i++) {
                    for (let j = Math.max(0, c - radius); j <= Math.min(SIZE - 1, c + radius); j++) {
                        if (tempBoard[i][j] !== EMPTY) {
                            hasNeighbor = true;
                            break;
                        }
                    }
                    if (hasNeighbor) break;
                }
                if (hasNeighbor) {
                    moves.push({ r, c });
                }
            }
        }
    }
    return moves;
}

function evaluatePosition(r, c, tempBoard, color) {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    let score = 0;
    for (let [dr, dc] of directions) {
        const { count, openEnds } = evaluateDirection(r, c, dr, dc, tempBoard, color);
        score += evaluateLine(count, openEnds);
    }
    return score;
}

function evaluateBoardStatic(tempBoard) {
    let whiteScore = 0;
    let blackScore = 0;
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (tempBoard[r][c] === WHITE) {
                whiteScore += evaluatePosition(r, c, tempBoard, WHITE);
            } else if (tempBoard[r][c] === BLACK) {
                blackScore += evaluatePosition(r, c, tempBoard, BLACK);
            }
        }
    }
    return whiteScore - blackScore;
}

function heuristicMoveSort(moves, tempBoard) {
    for (let m of moves) {
        tempBoard[m.r][m.c] = WHITE;
        let scoreW = evaluatePosition(m.r, m.c, tempBoard, WHITE);
        tempBoard[m.r][m.c] = BLACK;
        let scoreB = evaluatePosition(m.r, m.c, tempBoard, BLACK);
        tempBoard[m.r][m.c] = EMPTY;
        m.score = scoreW + scoreB;
    }
    moves.sort((a, b) => b.score - a.score);
}

function getAiParams() {
    const level = parseInt(difficultySelect.value, 10);
    let depth = 1;
    let maxBranches = 15;

    if (level === 10) { depth = 4; maxBranches = 16; }
    else if (level >= 7) { depth = 3; maxBranches = 15; }
    else if (level >= 4) { depth = 2; maxBranches = 15; }
    else { depth = 1; maxBranches = 20; }

    let evaluateNoise = 0;
    if (level === 1) evaluateNoise = 100;
    else if (level === 2) evaluateNoise = 50;
    else evaluateNoise = 0;

    return { level, depth, maxBranches, evaluateNoise };
}

function minimax(tempBoard, depth, alpha, beta, isMaximizing, lastR, lastC) {
    if (lastR !== null && lastC !== null) {
        let prevColor = isMaximizing ? BLACK : WHITE;
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
        for (let [dr, dc] of directions) {
            const { count } = evaluateDirection(lastR, lastC, dr, dc, tempBoard, prevColor);
            if (count >= 5) {
                return prevColor === WHITE ? WIN_SCORE : -WIN_SCORE;
            }
        }
    }

    if (depth === 0) {
        return evaluateBoardStatic(tempBoard);
    }

    const { maxBranches } = getAiParams();
    let validMoves = getValidMoves(tempBoard);

    heuristicMoveSort(validMoves, tempBoard);
    validMoves = validMoves.slice(0, maxBranches);

    if (validMoves.length === 0) return 0;

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (let m of validMoves) {
            tempBoard[m.r][m.c] = WHITE;
            let ev = minimax(tempBoard, depth - 1, alpha, beta, false, m.r, m.c);
            tempBoard[m.r][m.c] = EMPTY;
            maxEval = Math.max(maxEval, ev);
            alpha = Math.max(alpha, ev);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (let m of validMoves) {
            tempBoard[m.r][m.c] = BLACK;
            let ev = minimax(tempBoard, depth - 1, alpha, beta, true, m.r, m.c);
            tempBoard[m.r][m.c] = EMPTY;
            minEval = Math.min(minEval, ev);
            beta = Math.min(beta, ev);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

function playRandomMove() {
    let validMoves = getValidMoves(board);
    if (validMoves.length > 0) {
        const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
        makeMove(randomMove.r, randomMove.c, WHITE);
        if (checkWin(randomMove.r, randomMove.c, WHITE)) {
            gameOver = true;
            statusElement.textContent = "AI가 승리했습니다!";
        } else {
            isAITurn = false;
            statusElement.textContent = "당신의 차례입니다! (흑돌)";
        }
    }
}

function aiMove() {
    if (gameOver) return;

    const params = getAiParams();

    let randomChance = 0;
    if (params.level === 1) randomChance = 0.02; // 2% 확률의 실수
    else if (params.level === 2) randomChance = 0.01;

    if (randomChance > 0 && Math.random() < randomChance) {
        playRandomMove();
        return;
    }

    let validMoves = getValidMoves(board);
    if (validMoves.length === 0) return;

    heuristicMoveSort(validMoves, board);
    validMoves = validMoves.slice(0, params.maxBranches);

    let bestScore = -Infinity;
    let bestMove = validMoves[0];

    for (let m of validMoves) {
        board[m.r][m.c] = WHITE;
        let score = minimax(board, params.depth - 1, -Infinity, Infinity, false, m.r, m.c);

        if (params.evaluateNoise > 0) {
            score += (Math.random() * params.evaluateNoise * 2) - params.evaluateNoise;
        }

        board[m.r][m.c] = EMPTY;

        if (score > bestScore) {
            bestScore = score;
            bestMove = m;
        }
    }

    makeMove(bestMove.r, bestMove.c, WHITE);

    if (checkWin(bestMove.r, bestMove.c, WHITE)) {
        gameOver = true;
        statusElement.textContent = "AI가 승리했습니다!";
        return;
    }

    isAITurn = false;
    statusElement.textContent = "당신의 차례입니다! (흑돌)";
}

document.body.dataset.theme = localStorage.getItem('theme') || 'light';
themeBtn.addEventListener('click', () => {
    if (document.body.dataset.theme === 'dark') {
        document.body.dataset.theme = 'light';
        localStorage.setItem('theme', 'light');
    } else {
        document.body.dataset.theme = 'dark';
        localStorage.setItem('theme', 'dark');
    }
});

newGameBtn.addEventListener('click', initGame);

initGame();
