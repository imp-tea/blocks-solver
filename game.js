
const canvas = document.getElementById('gridCanvas');
const scoreContainer = document.getElementById('scoreContainer');
const ctx = canvas.getContext('2d');
const gridSize = 8;
let cellSize;

// Grid representation
let grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(0));
let suggestionGrid = Array.from({ length: gridSize }, () => Array(gridSize).fill(0));
let suggestedMoves = [];

// Define blocks and frequencies
const blocks = [
    [[1]],
    [[1, 1]],
    [[1, 1, 1]],
    [[1, 1, 1, 1]],
    [[1, 1, 1, 1, 1]],
    [[1, 1], [1, 0]],
    [[1, 0], [0, 1]],
    [[1, 1, 1], [0, 1, 0]],
    [[1, 1], [1, 1]],
    [[1, 1, 1], [1, 1, 1]],
    [[1, 0, 0], [1, 1, 1]],
    [[1, 1, 1], [1, 0, 1]],
    [[1, 1, 0], [0, 1, 1]],
    [[1, 1, 1], [0, 1, 0], [0, 1, 0]],
    [[1, 1, 1], [1, 0, 0], [1, 0, 0]],
    [[0, 1, 0], [1, 1, 1], [0, 1, 0]],
    [[0, 1, 0], [1, 0, 1], [0, 1, 0]],
    [[1, 0, 1], [0, 1, 0], [1, 0, 1]],
    [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    [[1, 1, 1], [1, 1, 1], [1, 1, 1]]
  ];
  
  const frequencies = [
    2, 2, 2, 2, 2, 
    4, 2, 4, 1, 1, 
    8, 4, 4, 4, 4, 
    1, 1, 1, 2, 1
  ];

let oldScore = 0;
let score = 0;
let combo = 1; // Initialize combo factor to 1
const piecesContainer = document.getElementById('piecesContainer');
let selectedPiece = null;
let offsetX = 0;
let offsetY = 0;

// Variables for Ghost Piece
let ghostShape = null;
let ghostX = null;
let ghostY = null;

// Initialize the game
updateScoreDisplay();
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Event listener for key press 'c' to trigger minimization
document.addEventListener('keydown', function(event) {
  if (event.key === 'c') {
    const pieces = Array.from(piecesContainer.children).map(pieceElement => pieceElement.shape);
    const result = findBestSequence(pieces, grid, standardWeights);
    displayResult(result);
  }
  if (event.key === 't') {
    for (let i = 0; i < suggestedMoves.length; i++) {
      let move = suggestedMoves[i];
      const placementPoints = placeShape(move[0], move[1], move[2]);
      const { clearedLines, lineClearPoints } = checkAndClearLines();
      let totalPoints = (placementPoints + lineClearPoints) * combo;
      score += totalPoints;
      if (clearedLines > 0) {
        combo += 1;
      } else {
        combo = 1;
      }
    }
    updateScoreDisplay();
    drawGrid();
    drawOccupiedCells();
    displayPieces();
 
    const pieces = Array.from(piecesContainer.children).map(pieceElement => pieceElement.shape);
    const result = findBestSequence(pieces, grid, standardWeights);
    displayResult(result);
  }
});

// Rotate the matrix 90 degrees clockwise
function rotateMatrix90Clockwise(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    let rotatedMatrix = Array.from({ length: cols }, () => []);
  
    for (let i = 0; i < cols; i++) {
        for (let j = rows - 1; j >= 0; j--) {
            rotatedMatrix[i].push(matrix[j][i]);
        }
    }
  
    return rotatedMatrix;
  }
  
  // Mirror the matrix horizontally
  function mirrorMatrixHorizontally(matrix) {
    return matrix.map(row => row.slice().reverse());
  }
  
  // Select a random block, with optional mirroring and rotation
  function selectRandomBlock(type) {
    let choices = [];
    for (let i = 0; i < 20; i++) {
        for (let j = 0; j < frequencies[i]; j++) {
            choices.push(i);
        }
    }
  
    const t = type !== undefined ? type : choices[Math.floor(Math.random() * choices.length)];
    let block = blocks[t];
  
    // 50% chance to mirror the block horizontally
    if (Math.random() > 0.5) {
        block = mirrorMatrixHorizontally(block);
    }
  
    // Random rotations (0 to 3 times, equivalent to 0, 90, 180, 270 degrees)
    const rotations = Math.floor(Math.random() * 4);
    for (let i = 0; i < rotations; i++) {
        block = rotateMatrix90Clockwise(block);
    }
  
    return block;
  }

// Update score display
function updateScoreDisplay() {
  scoreContainer.textContent = `Score: ${score}  ---  Combo: ${combo}  ---  Points: +${score-oldScore}`;
  oldScore = score;
}

// Resize canvas to fit the window
function resizeCanvas() {
  canvas.height = Math.min(window.innerHeight, window.innerWidth) * 0.66;
  canvas.width = canvas.height;
  cellSize = canvas.width / gridSize;
  drawGrid();
  drawOccupiedCells();
  if (piecesContainer.children.length === 0) {
    displayPieces(false);
  } else {
    displayPieces(true);
  }
}

// Draw the grid
function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'gray';
  for (let x = 0; x <= gridSize; x++) {
    ctx.beginPath();
    ctx.moveTo(x * cellSize, 0);
    ctx.lineTo(x * cellSize, gridSize * cellSize);
    ctx.stroke();
  }
  for (let y = 0; y <= gridSize; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * cellSize);
    ctx.lineTo(gridSize * cellSize, y * cellSize);
    ctx.stroke();
  }
  if (ghostShape && ghostX !== null && ghostY !== null) {
    drawGhostPiece();
  }
}

// Draw occupied cells and suggestions
function drawOccupiedCells() {
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (grid[y][x]) {
        ctx.fillStyle = 'white';
        ctx.fillRect(x * cellSize + 2, y * cellSize + 2, cellSize - 4, cellSize - 4);
      } else if (suggestionGrid[y][x] !== 0) {
        ctx.fillStyle = suggestionGrid[y][x];
        ctx.fillRect(x * cellSize + 2, y * cellSize + 2, cellSize - 4, cellSize - 4);
      }
      ctx.strokeStyle = 'gray';
      ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }
}

// Display pieces, optionally reusing existing ones
function displayPieces(reuse) {
  if (reuse) {
    const pieces = Array.from(piecesContainer.children).map(pieceElement => pieceElement.shape);
    piecesContainer.innerHTML = '';
    for (let i = 0; i < pieces.length; i++) {
      const shape = pieces[i];
      const pieceElement = createPieceElement(shape, i);
      piecesContainer.appendChild(pieceElement);
    }
  } else {
    piecesContainer.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const shape = selectRandomBlock();
      const pieceElement = createPieceElement(shape, i);
      piecesContainer.appendChild(pieceElement);
    }
  }
}

// Create a piece element
function createPieceElement(shape, pieceIndex) {
    const pieceElement = document.createElement('div');
    pieceElement.classList.add('piece');
    pieceElement.shape = shape;
  
    const pieceWidth = cellSize * shape[0].length;
    const pieceHeight = cellSize * shape.length;
    pieceElement.style.width = `${pieceWidth}px`;
    pieceElement.style.height = `${pieceHeight}px`;
  
    let colors = ["#FF0000", "#00FF00", "#0000FF"];
    let cellScale = Math.ceil(cellSize*0.9);
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const block = document.createElement('div');
          block.style.position = 'absolute';
          block.style.width = `${cellScale}px`;
          block.style.height = `${cellScale}px`;
          block.style.left = `${x * cellScale}px`;
          block.style.top = `${y * cellScale}px`;
          block.style.backgroundColor = colors[pieceIndex];
          block.style.border = '1px solid gray';
          pieceElement.appendChild(block);
        }
      }
    }
  
    pieceElement.addEventListener('mousedown', onPieceMouseDown);
    pieceElement.addEventListener('touchstart', onPieceMouseDown);
    return pieceElement;
}

// Mouse and touch event handlers for piece dragging
function onPieceMouseDown(e) {
  e.preventDefault();
  let clientX, clientY;

  if (e.touches) {
    clientX = e.touches[0].clientX;  // For touch events
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.pageX;  // For mouse events
    clientY = e.pageY;
  }

  selectedPiece = e.currentTarget;

  // Calculate offset relative to the piece's current position on the screen
  const rect = selectedPiece.getBoundingClientRect();
  offsetX = clientX - rect.left;
  offsetY = clientY - rect.top;

  document.addEventListener('mousemove', onPieceMouseMove);
  document.addEventListener('mouseup', onPieceMouseUp);
  document.addEventListener('touchmove', onPieceMouseMove);  // Add touch support
  document.addEventListener('touchend', onPieceMouseUp);      // Add touch support
}

function onPieceMouseMove(e) {
  e.preventDefault();
  let clientX, clientY;

  if (e.touches) {
    clientX = e.touches[0].clientX;  // For touch events
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.pageX;  // For mouse events
    clientY = e.pageY;
  }

  selectedPiece.style.position = 'absolute';
  selectedPiece.style.zIndex = 1000;

  selectedPiece.style.left = `${clientX - offsetX}px`;
  selectedPiece.style.top = `${clientY - offsetY}px`;

  // ** Ghost Piece Logic
  const rect = canvas.getBoundingClientRect();
  if (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  ) {
    const gridX = Math.floor(0.5 + (clientX - rect.left - offsetX) / cellSize);
    const gridY = Math.floor(0.5 + (clientY - rect.top - offsetY) / cellSize);

    if (canPlaceShape(selectedPiece.shape, gridX, gridY, grid)) {
      ghostShape = selectedPiece.shape;
      ghostX = gridX;
      ghostY = gridY;
    } else {
      ghostShape = null;
      ghostX = null;
      ghostY = null;
    }
  } else {
    ghostShape = null;
    ghostX = null;
    ghostY = null;
  }

  // Redraw the grid to show or remove the ghost piece
  drawGrid();
  drawOccupiedCells();
}

function onPieceMouseUp(e) {
  e.preventDefault();
  let clientX, clientY;

  if (e.changedTouches) {
    clientX = e.changedTouches[0].clientX;  // For touch events
    clientY = e.changedTouches[0].clientY;
  } else {
    clientX = e.pageX;  // For mouse events
    clientY = e.pageY;
  }

  document.removeEventListener('mousemove', onPieceMouseMove);
  document.removeEventListener('mouseup', onPieceMouseUp);
  document.removeEventListener('touchmove', onPieceMouseMove);  // Remove touch support
  document.removeEventListener('touchend', onPieceMouseUp);      // Remove touch support

  const rect = canvas.getBoundingClientRect();
  if (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  ) {
    if (ghostShape && ghostX !== null && ghostY !== null) {
      const placementPoints = placeShape(ghostShape, ghostX, ghostY);
      const { clearedLines, lineClearPoints } = checkAndClearLines();
      let totalPoints = (placementPoints + lineClearPoints) * combo;
      score += totalPoints;
      if (clearedLines > 0) {
        combo += 1;
      } else {
        combo = 1;
      }
      updateScoreDisplay();
      drawGrid();
      drawOccupiedCells();
      selectedPiece.remove();
      if (piecesContainer.children.length === 0) {
        displayPieces(false);
      }
    }
  }
  selectedPiece.style.position = 'relative';
  selectedPiece.style.left = '0px';
  selectedPiece.style.top = '0px';
  selectedPiece.style.zIndex = '0';
  selectedPiece = null;
  ghostShape = null;
  ghostX = null;
  ghostY = null;
  drawGrid();
  drawOccupiedCells();
}


// Draw the ghost piece
function drawGhostPiece() {
    ctx.fillStyle = 'rgba(128, 128, 128, 0.5)'; // Semi-transparent gray
    for (let y = 0; y < ghostShape.length; y++) {
      for (let x = 0; x < ghostShape[y].length; x++) {
        if (ghostShape[y][x]) {
          const gx = ghostX + x;
          const gy = ghostY + y;
          if (gx >= 0 && gx < gridSize && gy >= 0 && gy < gridSize) {
            ctx.fillRect(gx * cellSize + 2, gy * cellSize + 2, cellSize - 4, cellSize - 4);
            ctx.strokeStyle = 'gray';
            ctx.strokeRect(gx * cellSize, gy * cellSize, cellSize, cellSize);
          }
        }
      }
    }
  }

// Check if a shape can be placed on the grid
function canPlaceShape(shape, gridX, gridY, grid) {
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x]) {
        const gx = gridX + x;
        const gy = gridY + y;
        if (gx < 0 || gx >= gridSize || gy < 0 || gy >= gridSize) {
          return false;
        }
        if (grid[gy][gx]) {
          return false;
        }
      }
    }
  }
  return true;
}

// Place a shape on the grid and return points earned
function placeShape(shape, gridX, gridY) {
  let placementPoints = 0;
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x]) {
        grid[gridY + y][gridX + x] = 1;
        placementPoints += 1; // One point for each square placed
      }
    }
  }
  return placementPoints;
}

// Check and clear full lines, return points earned
function checkAndClearLines() {
  let clearedLines = 0;
  let lineClearPoints = 0;

  // Check and clear full rows
  for (let y = 0; y < gridSize; y++) {
    if (grid[y].every(cell => cell === 1)) {
      grid[y] = Array(gridSize).fill(0);
      clearedLines += 1;
      lineClearPoints += 8; // 8 points per row cleared
    }
  }

  // Check and clear full columns
  for (let x = 0; x < gridSize; x++) {
    let isFull = true;
    for (let y = 0; y < gridSize; y++) {
      if (grid[y][x] === 0) {
        isFull = false;
        break;
      }
    }
    if (isFull) {
      for (let y = 0; y < gridSize; y++) {
        grid[y][x] = 0;
      }
      clearedLines += 1;
      lineClearPoints += 8; // 8 points per column cleared
    }
  }

  return { clearedLines, lineClearPoints };
}

// Place a shape and calculate score for recursive search
function recursivePlaceAndScore(shape, gridX, gridY, grid) {
  const newGrid = grid.map(row => row.slice()); // Deep copy of the grid
  let placementPoints = 0;
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x]) {
        newGrid[gridY + y][gridX + x] = 1;
        placementPoints += 1; // One point for each square placed
      }
    }
  }

  // Now check for line clears
  let clearedLines = 0;
  let lineClearPoints = 0;
  const gridSize = newGrid.length;

  // Check and clear full rows
  for (let y = 0; y < gridSize; y++) {
    if (newGrid[y].every(cell => cell === 1)) {
      newGrid[y] = Array(gridSize).fill(0);
      clearedLines += 1;
      lineClearPoints += 8; // 8 points per row cleared
    }
  }

  // Check and clear full columns
  for (let x = 0; x < gridSize; x++) {
    let isFull = true;
    for (let y = 0; y < gridSize; y++) {
      if (newGrid[y][x] === 0) {
        isFull = false;
        break;
      }
    }
    if (isFull) {
      for (let y = 0; y < gridSize; y++) {
        newGrid[y][x] = 0;
      }
      clearedLines += 1;
      lineClearPoints += 8; // 8 points per column cleared
    }
  }

  return {
    newGrid,
    placementPoints,
    lineClearPoints,
    clearedLines
  };
}


function findBestSequence(pieces, grid, weights) {
  let bestResult = {
    evaluationScore: Infinity,
    moveSequence: [],
    grid: null,
    gameScore: 0
  };
  const piecesWithIndices = pieces.map((shape, index) => ({ pieceIndex: index, shape }));
  function search(currentGrid, remainingPieces, moveSequence, currentScore, currentCombo) {
    if (remainingPieces.length === 0) {
      const evaluationScore = evaluateBoard(currentGrid, weights) - currentScore*0.25;
      if (
        evaluationScore < bestResult.evaluationScore ||
        (evaluationScore === bestResult.evaluationScore && currentScore > bestResult.gameScore)
      ) {
        bestResult.evaluationScore = evaluationScore;
        bestResult.moveSequence = moveSequence.slice();
        bestResult.grid = currentGrid;
        bestResult.gameScore = currentScore;
      }
      return;
    }
    for (let i = 0; i < remainingPieces.length; i++) {
      const { pieceIndex, shape } = remainingPieces[i];
      const placements = getAllLegalPlacements(shape, currentGrid);
      if (placements.length === 0) continue;
      for (let placement of placements) {
        const {
          newGrid,
          placementPoints,
          lineClearPoints,
          clearedLines
        } = recursivePlaceAndScore(shape, placement.gridX, placement.gridY, currentGrid);
        let newCombo = clearedLines > 0 ? currentCombo + 1 : 1;
        let totalPoints = (placementPoints + lineClearPoints) * currentCombo;
        let newScore = currentScore + totalPoints;
        const newMoveSequence = moveSequence.concat({
          pieceIndex,
          shape,
          gridX: placement.gridX,
          gridY: placement.gridY,
          combo: currentCombo,
          points: totalPoints
        });
        const newRemainingPieces = remainingPieces
          .slice(0, i)
          .concat(remainingPieces.slice(i + 1));
        search(newGrid, newRemainingPieces, newMoveSequence, newScore, newCombo);
      }
    }
  }
  search(grid, piecesWithIndices, [], 0, combo);
  if (bestResult.moveSequence.length < pieces.length){
    return null;
  }
  return {
    remainingFilledSquares: countFilledSquares(bestResult.grid),
    moveSequence: bestResult.moveSequence,
    gameScore: bestResult.gameScore
  };
}

// Get all legal placements for a shape
function getAllLegalPlacements(shape, grid) {
  let positions = [];
  const shapeHeight = shape.length;
  const shapeWidth = shape[0].length;

  for (let gridY = 0; gridY <= gridSize - shapeHeight; gridY++) {
    for (let gridX = 0; gridX <= gridSize - shapeWidth; gridX++) {
      if (canPlaceShape(shape, gridX, gridY, grid)) {
        positions.push({ gridX, gridY });
      }
    }
  }
  return positions;
}

// Place suggestion shape on the suggestion grid
function placeSuggestionShape(shape, gridX, gridY, color) {
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x]) {
        suggestionGrid[gridY + y][gridX + x] = color;
      }
    }
  }
}

// Display the result including game score
function displayResult(result) {
  suggestedMoves = [];
  suggestionGrid = Array.from({ length: gridSize }, () => Array(gridSize).fill(0));
  for (let index = result.moveSequence.length - 1; index >= 0; index--) {
    let move = result.moveSequence[index];
    let colors = ["#5F0000", "#003F00", "#00004F"];
    placeSuggestionShape(move.shape, move.gridX, move.gridY, colors[index]);
    suggestedMoves.push([move.shape, move.gridX, move.gridY]);
  }
  //console.log(`Optimal sequence game score: ${result.gameScore}`);
  drawGrid();
  drawOccupiedCells();
}

const standardWeights = {
  filledSquares: 1,
  chaos: 2.6,
  accessibility: -.7,
};

let trainingData = [];

// Evaluate the board state
function evaluateBoard(grid, weights) {
    let score = 0;
    score += countFilledSquares(grid) * weights.filledSquares;
    score += calculateChaos(grid) * weights.chaos;
    return score;
}

//Range: 0 - 64
function countFilledSquares(grid) {
    let count = 0;
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        if (grid[y][x] === 1) {
          count++;
        }
      }
    }
    return count;
}

//Range: 0 - 112
function calculateChaos(grid) {
    let q = 0;
      
    // Horizontal segments
    for (let y = 0; y < 8; y++) {
        let segments = 0;
        for (let x = 1; x < 8; x++) {
            if (grid[y][x] !== grid[y][x - 1]) segments += 1;
        }
        q += segments;
    }
    
    // Vertical segments
    for (let x = 0; x < 8; x++) {
        let segments = 0;
        for (let y = 1; y < 8; y++) {
            if (grid[y][x] !== grid[y - 1][x]) segments += 1;
        }
        q += segments;
    }
  
    return q;
}

function accessibilityScore(grid) {
  let score = 0;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (grid[y][x] === 0) {
        let neighbors = 0;
        if (x > 0 && grid[y][x - 1] === 0) neighbors++;
        if (x < 7 && grid[y][x + 1] === 0) neighbors++;
        if (y > 0 && grid[y - 1][x] === 0) neighbors++;
        if (y < 7 && grid[y + 1][x] === 0) neighbors++;
        score += neighbors;
      }
    }
  }
  return score;
}

// Add event listeners to buttons for computing and playing suggested moves
document.getElementById('computeButton').addEventListener('click', function() {
  const pieces = Array.from(piecesContainer.children).map(pieceElement => pieceElement.shape);
  const result = findBestSequence(pieces, grid, standardWeights);
  displayResult(result);
});

document.getElementById('playButton').addEventListener('click', function() {
  for (let i = 0; i < suggestedMoves.length; i++) {
    let move = suggestedMoves[i];
    const placementPoints = placeShape(move[0], move[1], move[2]);
    const { clearedLines, lineClearPoints } = checkAndClearLines();
    let totalPoints = (placementPoints + lineClearPoints) * combo;
    score += totalPoints;
    if (clearedLines > 0) {
      combo += 1;
    } else {
      combo = 1;
    }
  }
  updateScoreDisplay();
  drawGrid();
  drawOccupiedCells();
  displayPieces();
  
  const pieces = Array.from(piecesContainer.children).map(pieceElement => pieceElement.shape);
  const result = findBestSequence(pieces, grid, standardWeights);
  displayResult(result);
});
