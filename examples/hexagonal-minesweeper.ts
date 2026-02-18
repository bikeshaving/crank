import {jsx, renderer} from "@b9g/crank/standalone";

function Hexagon({cx = 0, cy = 0, r, ...props}) {
  if (!r) {
    return null;
  }

  const points = [];
  for (let i = 0, a = 0; i < 6; i++, a += Math.PI / 3) {
    points.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }

  return jsx`
    <path
      ...${props}
      d="M ${points.map(([x, y], i) => `${i > 0 ? "L" : ""} ${x} ${y}`)} Z"
    />
  `;
}

function centerCoordsFor(cell, size, rows, cols) {
  const colSpacing = (size * 3) / 2;
  const rowSpacing = Math.sqrt(3) * size;

  // Calculate grid bounds
  const gridWidth = (cols - 1) * colSpacing;
  const gridHeight = rows * rowSpacing;

  // Center offset
  const offsetX = -gridWidth / 2;
  const offsetY = -gridHeight / 2;

  return {
    cx: cell.col * colSpacing + offsetX,
    cy:
      cell.row * rowSpacing +
      (cell.col % 2 === 0 ? 0 : rowSpacing / 2) +
      offsetY,
  };
}

function axialCoordsFor(cell) {
  return {q: cell.col, r: cell.row - Math.floor(cell.col / 2)};
}

function HexagonalGrid({
  radius = 20,
  cells,
  onCellClick,
  onCellRightClick,
  rows,
  cols,
}) {
  return cells.map((cell, i) => {
    const onclick = (event) => {
      event.preventDefault();
      onCellClick(cell);
    };
    const oncontextmenu = (event) => {
      event.preventDefault();
      onCellRightClick(cell);
    };
    const {cx, cy} = centerCoordsFor(cell, radius, rows, cols);

    let fill = "lightgray";
    let stroke = "gray";
    if (cell.revealed) {
      fill = cell.bomb ? "red" : "white";
      stroke = cell.bomb ? "darkred" : "dodgerblue";
    } else if (cell.flagged) {
      fill = "yellow";
      stroke = "orange";
    }

    return jsx`
      <${Hexagon}
        key=${i}
        r=${radius}
        cx=${cx} cy=${cy}
        fill=${fill} stroke=${stroke}
        onclick=${onclick}
        oncontextmenu=${oncontextmenu}
        style="cursor: pointer"
      />
      <text
        x=${cx} y=${cy}
        text-anchor="middle" dominant-baseline="middle"
        fill="dodgerblue"
        font-size="10"
        style="pointer-events: none"
      >${cell.revealed && cell.bombCount && !cell.bomb ? cell.bombCount : ""}</text>
      <text
        x=${cx} y=${cy}
        text-anchor="middle" dominant-baseline="middle"
        fill="red"
        font-size="12"
        style="pointer-events: none"
      >${cell.revealed && cell.bomb ? "💣" : ""}</text>
      <text
        x=${cx} y=${cy}
        text-anchor="middle" dominant-baseline="middle"
        fill="red"
        font-size="12"
        style="pointer-events: none"
      >${!cell.revealed && cell.flagged ? "🚩" : ""}</text>
    `;
  });
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

function neighborsOf(cell, cells) {
  const {q, r} = axialCoordsFor(cell);
  const vectors = [
    [1, 0],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [0, -1],
    [1, -1],
  ];
  const axialSet = new Set(vectors.map(([q1, r1]) => `${q + q1},${r + r1}`));
  return cells.filter((cell1) => {
    const {q, r} = axialCoordsFor(cell1);
    return axialSet.has(`${q},${r}`);
  });
}

function* Minesweeper() {
  const rows = 10;
  const cols = 15;
  const bombCount = 25;

  let gameState = "playing"; // "playing", "won", "lost"
  let firstClick = true;
  let mouseDown = false;

  const initializeCells = () => {
    const cells = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        cells.push({
          row,
          col,
          bomb: false,
          bombCount: 0,
          revealed: false,
          flagged: false,
        });
      }
    }
    return cells;
  };

  let cells = initializeCells();

  const placeBombs = (firstClickCell) => {
    // Don't place bombs on first click or its neighbors
    const forbidden = new Set([
      firstClickCell,
      ...neighborsOf(firstClickCell, cells),
    ]);
    const availableCells = cells.filter((cell) => !forbidden.has(cell));

    for (const cell of shuffle(availableCells.slice()).slice(0, bombCount)) {
      cell.bomb = true;
    }

    // Calculate bomb counts
    for (const cell of cells) {
      if (!cell.bomb) {
        cell.bombCount = neighborsOf(cell, cells).reduce(
          (count, neighbor) => count + (neighbor.bomb ? 1 : 0),
          0,
        );
      }
    }
  };

  const revealCell = (cell) => {
    if (cell.revealed || cell.flagged || gameState !== "playing") {
      return;
    }

    if (firstClick) {
      placeBombs(cell);
      firstClick = false;
    }

    cell.revealed = true;

    if (cell.bomb) {
      gameState = "lost";
      // Reveal all bombs
      cells.filter((c) => c.bomb).forEach((c) => (c.revealed = true));
      return;
    }

    // Auto-reveal empty neighbors
    if (cell.bombCount === 0) {
      neighborsOf(cell, cells).forEach((neighbor) => {
        if (!neighbor.revealed && !neighbor.flagged) {
          revealCell(neighbor);
        }
      });
    }

    // Check win condition
    const unrevealedNonBombs = cells.filter(
      (c) => !c.bomb && !c.revealed,
    ).length;
    if (unrevealedNonBombs === 0) {
      gameState = "won";
    }
  };

  const toggleFlag = (cell) => {
    if (cell.revealed || gameState !== "playing") {
      return;
    }
    cell.flagged = !cell.flagged;
  };

  const resetGame = () => {
    cells = initializeCells();
    gameState = "playing";
    firstClick = true;
  };

  const handleCellClick = (cell) => {
    this.refresh(() => {
      revealCell(cell);
    });
  };

  const handleCellRightClick = (cell) => {
    this.refresh(() => {
      toggleFlag(cell);
    });
  };

  const handleMouseDown = () => {
    if (gameState === "playing") {
      this.refresh(() => (mouseDown = true));
    }
  };

  const handleMouseUp = () => {
    this.refresh(() => (mouseDown = false));
  };

  const flagCount = () => cells.filter((c) => c.flagged).length;
  const remainingBombs = bombCount - flagCount();

  for ({} of this) {
    const statusEmoji =
      gameState === "won"
        ? "😎"
        : gameState === "lost"
          ? "😵"
          : mouseDown
            ? "😳"
            : "🙂";

    const statusText =
      gameState === "won"
        ? "You Won!"
        : gameState === "lost"
          ? "Game Over!"
          : `${remainingBombs} mines`;

    // Calculate grid bounds for centering
    const radius = 18;
    const colSpacing = (radius * 3) / 2;
    const rowSpacing = Math.sqrt(3) * radius;

    const gridWidth = (cols - 1) * colSpacing + radius * 2;
    const gridHeight = rows * rowSpacing + radius * 2;

    const padding = 30;
    const viewBoxWidth = gridWidth + padding * 2;
    const viewBoxHeight = gridHeight + padding * 2;
    const viewBoxX = -viewBoxWidth / 2;
    const viewBoxY = -viewBoxHeight / 2;

    yield jsx`
      <div style="text-align: center; font-family: Arial, sans-serif; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #f0f0f0; margin: 0; padding: 20px; box-sizing: border-box">
        <div style="margin-bottom: 20px; font-size: 24px; font-weight: bold; color: #333">
          Hexagonal Minesweeper
        </div>
        <div style="margin-bottom: 10px; font-size: 32px">
          ${statusEmoji}
        </div>
        <div style="margin-bottom: 15px; font-size: 16px; color: #666">
          ${statusText}
        </div>
        <button
          onclick=${() => this.refresh(() => resetGame())}
          style="margin-bottom: 20px; padding: 10px 20px; font-size: 16px; cursor: pointer; border: 2px solid #333; background: white; border-radius: 4px"
          onmousedown=${handleMouseDown}
          onmouseup=${handleMouseUp}
          onmouseleave=${handleMouseUp}
        >
          New Game
        </button>
        <div style="display: flex; align-items: center; justify-content: center; max-width: 100%">
          <svg
            width="100%"
            height="100%"
            viewBox="${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}"
            xmlns="http://www.w3.org/2000/svg"
            style="border: 3px solid #333; background: white; border-radius: 8px; max-width: 600px; height: 400px"
            onmousedown=${handleMouseDown}
            onmouseup=${handleMouseUp}
            onmouseleave=${handleMouseUp}
          >
            <${HexagonalGrid}
              cells=${cells}
              radius=${radius}
              rows=${rows}
              cols=${cols}
              onCellClick=${handleCellClick}
              onCellRightClick=${handleCellRightClick}
            />
          </svg>
        </div>
        <div style="margin-top: 15px; font-size: 14px; color: #888">
          Left click to reveal • Right click to flag
        </div>
      </div>
    `;
  }
}

renderer.render(jsx`<${Minesweeper} />`, document.body);
