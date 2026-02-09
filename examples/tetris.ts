import {jsx} from "@b9g/crank/standalone";
import {renderer} from "@b9g/crank/dom";

// tetronimo shapes represented as 2d arrays
type Tet = number[][];
const tets: Record<string, Tet> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
};

function randomTet() {
  const tetValues = Array.from(Object.values(tets));
  return tetValues[Math.floor(Math.random() * tetValues.length)];
}

function transpose(tet: Tet): Tet {
  return tet.map((row, r) => row.map((cell, c) => tet[c][r]));
}

function reflectY(tet: Tet): Tet {
  return tet.map((row, r) => row.map((cell, c) => tet[tet.length - r - 1][c]));
}

// TODO: combine rotate90 and rotate270
function rotate90(tet: Tet): Tet {
  return reflectY(transpose(tet));
}

function rotate270(tet: Tet): Tet {
  return transpose(reflectY(tet));
}

interface Piece {
  tet: Tet;
  x: number;
  y: number;
}

// SVG coordinates, so top row is 0 and bottom row is field.length - 1;
type Field = number[][];

function canFit(piece: Piece, field: Field): boolean {
  for (const [c, r] of squaresOf(piece)) {
    if (r < 0) {
      // square is above the board
      return false;
    } else if (r >= field.length) {
      // square is below the board
      return false;
    } else if (c < 0) {
      // square is left of board
      return false;
    } else if (c >= field[0].length) {
      // square is right of board
      return false;
    } else if (field[r][c]) {
      // square is occupied
      return false;
    }
  }

  return true;
}

function squaresOf(piece: Piece): [x: number, y: number][] {
  const squares = [];
  for (let r = 0; r < piece.tet.length; r++) {
    const row = piece.tet[r];
    for (let c = 0; c < row.length; c++) {
      const data = row[c];
      if (data) {
        squares.push([c + piece.x, r + piece.y]);
      }
    }
  }

  return squares;
}

function createPiece(): Piece {
  // TODO: piece sequences
  return {
    tet: randomTet(),
    x: 3,
    y: 0,
  };
}

function placePiece(piece: Piece, field: Field) {
  for (const [c, r] of squaresOf(piece)) {
    field[r][c] = true;
  }

  clearFilledRows(field);
}

function clearFilledRows(field: Field) {
  for (let r = 0; r < field.length; r++) {
    const row = field[r];
    if (row.every((d) => d)) {
      // copy previous rows into next rows
      for (let r1 = r; r1 > 0; r1--) {
        field[r1] = field[r1 - 1];
      }

      // clear the top row
      field[0] = field[0].map(() => false);
    }
  }
}

const UNIT = 20;
const WIDTH = 10;
const HEIGHT = 24;

function Piece({piece}) {
  // TODO: colored pieces
  return jsx`
    <g fill="red">
      ${squaresOf(piece).map(
        ([c, r]) => jsx`
        <rect
          width=${UNIT}
          height=${UNIT}
          transform="translate(${c * UNIT}, ${r * UNIT})"
        />
      `,
      )}
    </g>
  `;
}

function Board({field}) {
  return field.map((row, r) =>
    row.map(
      (data, c) => jsx`
      <rect
        width=${UNIT}
        height=${UNIT}
        fill=${data && "blue"}
        x=${c * UNIT}
        y=${r * UNIT}
      />
    `,
    ),
  );
}

function* App() {
  let currentPiece = createPiece();
  const field = Array.from(Array(HEIGHT), () =>
    Array.from(Array(WIDTH), () => false),
  );

  const interval = setInterval(() => {
    this.refresh(() => {
      currentPiece.y++;
      if (!canFit(currentPiece, field)) {
        currentPiece.y--;
        placePiece(currentPiece, field);
        // TODO: game over check
        currentPiece = createPiece();
      }
    });
  }, 1000);
  this.cleanup(() => clearInterval(interval));

  const keydown = (ev) => {
    this.refresh(() => {
      if (ev.key === "w") {
        // rotate left
        // TODO: wall kicks to allow rotations at the edge
        currentPiece.tet = rotate90(currentPiece.tet);
        if (!canFit(currentPiece, field)) {
          currentPiece.tet = rotate270(currentPiece.tet);
        }
      } else if (ev.key === "e") {
        // rotate right
        // TODO: wall kicks to allow rotations at the edge
        currentPiece.tet = rotate270(currentPiece.tet);
        if (!canFit(currentPiece, field)) {
          currentPiece.tet = rotate90(currentPiece.tet);
        }
      } else if (ev.key === "a") {
        // move left
        currentPiece.x--;
        if (!canFit(currentPiece, field)) {
          currentPiece.x++;
        }
      } else if (ev.key === "s") {
        // move down
        currentPiece.y++;
        if (!canFit(currentPiece, field)) {
          currentPiece.y--;
          placePiece(currentPiece, field);
          currentPiece = createPiece();
        }
      } else if (ev.key === "d") {
        // move right
        currentPiece.x++;
        if (!canFit(currentPiece, field)) {
          currentPiece.x--;
        }
      }
      // TODO: hard drop
    });
  };

  window.addEventListener("keydown", keydown);
  this.cleanup(() => window.removeEventListener("keydown", keydown));

  for ({} of this) {
    // TODO: game start/game over
    // TODO: piece placement preview
    // TODO: next piece
    yield jsx`
      <svg
        width=${WIDTH * UNIT}
        height=${HEIGHT * UNIT}
        style="border: 1px solid currentcolor"
        fill="transparent"
      >
        <${Board} field=${field} />
        <${Piece} piece=${currentPiece} />
      </svg>
    `;
  }
}

renderer.render(jsx`<${App} />`, document.body);
