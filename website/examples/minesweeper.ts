import {jsx} from "@b9g/crank/standalone";
import {renderer} from "@b9g/crank/dom";

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

function centerCoordsFor(cell, size) {
	const colSpacing = (size * 3) / 2;
	const rowSpacing = Math.sqrt(3) * size;
	return {
		cx: cell.col * colSpacing,
		cy: cell.row * rowSpacing + (cell.col % 2 === 0 ? 0 : rowSpacing / 2),
	};
}

function axialCoordsFor(cell) {
	return {q: cell.col, r: cell.row - Math.floor(cell.col / 2)};
}

function HexagonalGrid({radius = 20, cells, testCell}) {
	return cells.map((cell, i) => {
		const onclick = () => {
			console.log(neighborsOf(cell, cells));
		};
		const {cx, cy} = centerCoordsFor(cell, radius);
		const {q, r} = axialCoordsFor(cell);
		return jsx`
      <${Hexagon}
        r=${radius}
        cx=${cx} cy=${cy}
        fill="white" stroke="dodgerblue"
        onclick=${onclick}
      />
      <text
        x=${cx} y=${cy}
        text-anchor="middle" dominant-baseline="middle"
        stroke="dodgerblue"
        font-size="10"
      >${cell.bombCount && !cell.bomb ? cell.bombCount : null}</text>
      <text
        x=${cx} y=${cy}
        text-anchor="middle" dominant-baseline="middle"
        stroke="red"
        font-size="10"
      >${cell.bomb && "!"}</text>
      <!--
      <text
        x=${cx} y=${cy}
        text-anchor="middle" dominant-baseline="middle"
        stroke="red"
        font-size="10"
      >${q},${r}</text>
      -->
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
	const rows = 12,
		cols = 15;
	const cells = [];
	for (let row = 0; row < rows; row++) {
		for (let col = 0; col < cols; col++) {
			cells.push({row, col, bomb: false, bombCount: 0});
		}
	}

	for (const cell of shuffle(cells.slice()).slice(0, 30)) {
		cell.bomb = true;
	}

	for (const cell of cells) {
		cell.bombCount = neighborsOf(cell, cells).reduce(
			(a, c) => a + (c.bomb ? 1 : 0),
			0,
		);
	}

	for ({} of this) {
		yield jsx`
      <svg
        width="500px"
        height="500px"
        viewBox="-50 -50 400 400"
        xmlns="http://www.w3.org/2000/svg"
        stroke="currentcolor"
        fill="none"
        style="border: 1px solid currentcolor"
      >
        <${HexagonalGrid} cells=${cells} radius=${15} />
      </svg>
    `;
	}
}

renderer.render(jsx`<${Minesweeper} />`, document.body);
