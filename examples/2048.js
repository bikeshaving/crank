import {renderer} from "@b9g/crank/dom";

// 2048 Game Logic
function create2048Grid() {
	return Array(4)
		.fill()
		.map(() => Array(4).fill(0));
}

function addRandomTile(grid) {
	const emptyCells = [];
	for (let i = 0; i < 4; i++) {
		for (let j = 0; j < 4; j++) {
			if (grid[i][j] === 0) {
				emptyCells.push([i, j]);
			}
		}
	}

	if (emptyCells.length > 0) {
		const [row, col] =
			emptyCells[Math.floor(Math.random() * emptyCells.length)];
		grid[row][col] = Math.random() < 0.9 ? 2 : 4;
	}
}

function slide(row) {
	// Remove zeros
	const filtered = row.filter((val) => val !== 0);

	// Merge adjacent equal values
	for (let i = 0; i < filtered.length - 1; i++) {
		if (filtered[i] === filtered[i + 1]) {
			filtered[i] *= 2;
			filtered[i + 1] = 0;
		}
	}

	// Remove zeros again and pad with zeros
	const merged = filtered.filter((val) => val !== 0);
	return merged.concat(Array(4 - merged.length).fill(0));
}

function moveLeft(grid) {
	const newGrid = grid.map((row) => slide(row));
	return newGrid;
}

function moveRight(grid) {
	const newGrid = grid.map((row) => slide(row.slice().reverse()).reverse());
	return newGrid;
}

function moveUp(grid) {
	const newGrid = create2048Grid();
	for (let j = 0; j < 4; j++) {
		const column = [grid[0][j], grid[1][j], grid[2][j], grid[3][j]];
		const slidColumn = slide(column);
		for (let i = 0; i < 4; i++) {
			newGrid[i][j] = slidColumn[i];
		}
	}
	return newGrid;
}

function moveDown(grid) {
	const newGrid = create2048Grid();
	for (let j = 0; j < 4; j++) {
		const column = [grid[0][j], grid[1][j], grid[2][j], grid[3][j]];
		const slidColumn = slide(column.reverse()).reverse();
		for (let i = 0; i < 4; i++) {
			newGrid[i][j] = slidColumn[i];
		}
	}
	return newGrid;
}

function gridsEqual(grid1, grid2) {
	for (let i = 0; i < 4; i++) {
		for (let j = 0; j < 4; j++) {
			if (grid1[i][j] !== grid2[i][j]) {
				return false;
			}
		}
	}
	return true;
}

function hasWon(grid) {
	for (let i = 0; i < 4; i++) {
		for (let j = 0; j < 4; j++) {
			if (grid[i][j] === 2048) {
				return true;
			}
		}
	}
	return false;
}

function canMove(grid) {
	// Check for empty cells
	for (let i = 0; i < 4; i++) {
		for (let j = 0; j < 4; j++) {
			if (grid[i][j] === 0) {
				return true;
			}
		}
	}

	// Check for possible merges
	for (let i = 0; i < 4; i++) {
		for (let j = 0; j < 4; j++) {
			const current = grid[i][j];
			if (
				(i > 0 && grid[i - 1][j] === current) ||
				(i < 3 && grid[i + 1][j] === current) ||
				(j > 0 && grid[i][j - 1] === current) ||
				(j < 3 && grid[i][j + 1] === current)
			) {
				return true;
			}
		}
	}

	return false;
}

function* Game2048() {
	let grid = create2048Grid();
	let score = 0;
	let gameOver = false;
	let won = false;
	let continueAfterWin = false;

	// Initialize with two random tiles
	addRandomTile(grid);
	addRandomTile(grid);

	const move = (direction) => {
		if (gameOver && !won) return;

		let newGrid;
		switch (direction) {
			case "left":
				newGrid = moveLeft(grid);
				break;
			case "right":
				newGrid = moveRight(grid);
				break;
			case "up":
				newGrid = moveUp(grid);
				break;
			case "down":
				newGrid = moveDown(grid);
				break;
			default:
				return;
		}

		// Check if move actually changed the grid
		if (!gridsEqual(grid, newGrid)) {
			grid = newGrid;

			// Calculate score increase
			let scoreIncrease = 0;
			for (let i = 0; i < 4; i++) {
				for (let j = 0; j < 4; j++) {
					if (grid[i][j] > 0) {
						scoreIncrease += grid[i][j];
					}
				}
			}
			score = scoreIncrease;

			addRandomTile(grid);

			// Check win condition
			if (hasWon(grid) && !won && !continueAfterWin) {
				won = true;
			}

			// Check game over
			if (!canMove(grid)) {
				gameOver = true;
			}

			this.refresh();
		}
	};

	const restart = () => {
		this.refresh(() => {
			grid = create2048Grid();
			score = 0;
			gameOver = false;
			won = false;
			continueAfterWin = false;
			addRandomTile(grid);
			addRandomTile(grid);
		});
	};

	const continuePlaying = () => {
		this.refresh(() => {
			continueAfterWin = true;
			won = false;
		});
	};

	// Keyboard event handler
	this.addEventListener("keydown", (e) => {
		switch (e.key) {
			case "ArrowLeft":
				e.preventDefault();
				move("left");
				break;
			case "ArrowRight":
				e.preventDefault();
				move("right");
				break;
			case "ArrowUp":
				e.preventDefault();
				move("up");
				break;
			case "ArrowDown":
				e.preventDefault();
				move("down");
				break;
		}
	});

	for ({} of this) {
		const getTileColor = (value) => {
			const colors = {
				0: "#cdc1b4",
				2: "#eee4da",
				4: "#ede0c8",
				8: "#f2b179",
				16: "#f59563",
				32: "#f67c5f",
				64: "#f65e3b",
				128: "#edcf72",
				256: "#edcc61",
				512: "#edc850",
				1024: "#edc53f",
				2048: "#edc22e",
			};
			return colors[value] || "#3c3a32";
		};

		const getTileTextColor = (value) => {
			return value <= 4 ? "#776e65" : "#f9f6f2";
		};

		yield (
			<div
				tabindex="0"
				style={{
					fontFamily: "Arial, sans-serif",
					textAlign: "center",
					backgroundColor: "#faf8ef",
					padding: "20px",
					borderRadius: "10px",
					maxWidth: "500px",
					margin: "0 auto",
					outline: "none",
				}}
			>
				<h1 style={{color: "#776e65", margin: "0 0 20px 0"}}>2048</h1>

				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: "20px",
					}}
				>
					<div
						style={{
							backgroundColor: "#bbada0",
							padding: "10px 20px",
							borderRadius: "5px",
							color: "white",
							fontWeight: "bold",
						}}
					>
						Score: {score}
					</div>

					<button
						onclick={restart}
						style={{
							backgroundColor: "#8f7a66",
							color: "white",
							border: "none",
							padding: "10px 20px",
							borderRadius: "5px",
							cursor: "pointer",
							fontWeight: "bold",
						}}
					>
						New Game
					</button>
				</div>

				<div
					style={{
						backgroundColor: "#bbada0",
						borderRadius: "10px",
						padding: "10px",
						position: "relative",
					}}
				>
					{grid.map((row, i) => (
						<div key={i} style={{display: "flex", marginBottom: "10px"}}>
							{row.map((cell, j) => (
								<div
									key={`${i}-${j}`}
									style={{
										width: "80px",
										height: "80px",
										backgroundColor: getTileColor(cell),
										color: getTileTextColor(cell),
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										borderRadius: "5px",
										fontSize: cell >= 128 ? "24px" : "32px",
										fontWeight: "bold",
										marginRight: j < 3 ? "10px" : "0",
										transition: "all 0.15s ease-in-out",
									}}
								>
									{cell || ""}
								</div>
							))}
						</div>
					))}
				</div>

				{won && !continueAfterWin && (
					<div
						style={{
							position: "absolute",
							top: "50%",
							left: "50%",
							transform: "translate(-50%, -50%)",
							backgroundColor: "rgba(255, 255, 255, 0.9)",
							padding: "20px",
							borderRadius: "10px",
							textAlign: "center",
						}}
					>
						<h2 style={{color: "#776e65", margin: "0 0 10px 0"}}>You Win!</h2>
						<button
							onclick={continuePlaying}
							style={{
								backgroundColor: "#8f7a66",
								color: "white",
								border: "none",
								padding: "10px 20px",
								borderRadius: "5px",
								cursor: "pointer",
								marginRight: "10px",
							}}
						>
							Continue
						</button>
						<button
							onclick={restart}
							style={{
								backgroundColor: "#8f7a66",
								color: "white",
								border: "none",
								padding: "10px 20px",
								borderRadius: "5px",
								cursor: "pointer",
							}}
						>
							New Game
						</button>
					</div>
				)}

				{gameOver && !won && (
					<div
						style={{
							position: "absolute",
							top: "50%",
							left: "50%",
							transform: "translate(-50%, -50%)",
							backgroundColor: "rgba(255, 255, 255, 0.9)",
							padding: "20px",
							borderRadius: "10px",
							textAlign: "center",
						}}
					>
						<h2 style={{color: "#776e65", margin: "0 0 10px 0"}}>Game Over!</h2>
						<button
							onclick={restart}
							style={{
								backgroundColor: "#8f7a66",
								color: "white",
								border: "none",
								padding: "10px 20px",
								borderRadius: "5px",
								cursor: "pointer",
							}}
						>
							Try Again
						</button>
					</div>
				)}

				<div
					style={{
						marginTop: "20px",
						color: "#776e65",
						fontSize: "14px",
					}}
				>
					<p>
						<strong>How to play:</strong> Use arrow keys to move tiles. When two
						tiles with the same number touch, they merge into one!
					</p>
					<p>
						<strong>Goal:</strong> Get to the 2048 tile to win!
					</p>
				</div>
			</div>
		);
	}
}

renderer.render(<Game2048 />, document.body);
