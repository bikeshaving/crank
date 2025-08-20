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

// Individual tile component with animations
function* Tile({value, position, isNew = false, isMerged = false}) {
	const key = `${position.row}-${position.col}`;

	// Exit animation when tile disappears/merges
	this.cleanup(async (element) => {
		if (value === 0) return; // Don't animate empty tiles

		// Merge animation - quick scale up then fade out
		if (isMerged) {
			element.style.transition =
				"transform 150ms ease-out, opacity 150ms ease-out";
			element.style.transform = "scale(1.1)";
			await new Promise((resolve) => setTimeout(resolve, 75));
			element.style.transform = "scale(0)";
			element.style.opacity = "0";
			await new Promise((resolve) => setTimeout(resolve, 75));
		}
	});

	for ({value, isNew, isMerged} of this) {
		if (value === 0) {
			yield null; // Don't render empty tiles
			continue;
		}

		// Official 2048 colors with better contrast
		const getTileStyle = (val) => {
			const styles = {
				2: {bg: "#eee4da", color: "#776e65"},
				4: {bg: "#ede0c8", color: "#776e65"},
				8: {bg: "#f2b179", color: "#f9f6f2"},
				16: {bg: "#f59563", color: "#f9f6f2"},
				32: {bg: "#f67c5f", color: "#f9f6f2"},
				64: {bg: "#f65e3b", color: "#f9f6f2"},
				128: {bg: "#edcf72", color: "#f9f6f2", fontSize: "45px"},
				256: {bg: "#edcc61", color: "#f9f6f2", fontSize: "45px"},
				512: {bg: "#edc850", color: "#f9f6f2", fontSize: "45px"},
				1024: {bg: "#edc53f", color: "#f9f6f2", fontSize: "35px"},
				2048: {bg: "#edc22e", color: "#f9f6f2", fontSize: "35px"},
				4096: {bg: "#3c3a32", color: "#f9f6f2", fontSize: "30px"},
				8192: {bg: "#3c3a32", color: "#f9f6f2", fontSize: "30px"},
			};
			return styles[val] || {bg: "#3c3a32", color: "#f9f6f2", fontSize: "25px"};
		};

		const tileStyle = getTileStyle(value);

		yield (
			<div
				key={key}
				style={{
					position: "absolute",
					width: "106.25px",
					height: "106.25px",
					backgroundColor: tileStyle.bg,
					color: tileStyle.color,
					borderRadius: "3px",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					fontSize: tileStyle.fontSize || "55px",
					fontWeight: "bold",
					lineHeight: "1",
					top: `${position.row * 121.25 + 15}px`,
					left: `${position.col * 121.25 + 15}px`,
					transition: isNew
						? "transform 150ms ease-out"
						: "top 150ms ease-out, left 150ms ease-out, transform 150ms ease-out",
					transform: isNew ? "scale(0)" : isMerged ? "scale(1.2)" : "scale(1)",
					zIndex: isMerged ? 10 : 1,
					animation: isNew
						? "tileAppear 150ms ease-out forwards"
						: isMerged
							? "tileMerge 200ms ease-out forwards"
							: "none",
				}}
			>
				{value.toLocaleString()}
			</div>
		);

		// Reset animation states after first render
		if (isNew || isMerged) {
			setTimeout(() => {
				this.refresh(() => {
					isNew = false;
					isMerged = false;
				});
			}, 200);
		}
	}
}

function* Game2048() {
	let grid = create2048Grid();
	let previousGrid = create2048Grid();
	let score = 0;
	let bestScore = parseInt(localStorage.getItem("2048-best") || "0");
	let gameOver = false;
	let won = false;
	let continueAfterWin = false;
	let animating = false;

	// Initialize with two random tiles
	addRandomTile(grid);
	addRandomTile(grid);

	const move = async (direction) => {
		if (gameOver || animating) return;

		animating = true;
		previousGrid = grid.map((row) => [...row]); // Deep copy

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
				animating = false;
				return;
		}

		// Check if move actually changed the grid
		if (!gridsEqual(grid, newGrid)) {
			grid = newGrid;

			// Calculate score increase
			let newScore = 0;
			for (let i = 0; i < 4; i++) {
				for (let j = 0; j < 4; j++) {
					if (grid[i][j] > 0) {
						newScore += grid[i][j];
					}
				}
			}
			score = newScore;

			// Update best score
			if (score > bestScore) {
				bestScore = score;
				localStorage.setItem("2048-best", bestScore.toString());
			}

			// Wait for slide animation
			await new Promise((resolve) => setTimeout(resolve, 150));

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

		animating = false;
	};

	const restart = () => {
		this.refresh(() => {
			grid = create2048Grid();
			previousGrid = create2048Grid();
			score = 0;
			gameOver = false;
			won = false;
			continueAfterWin = false;
			animating = false;
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
		// Generate tile data for rendering
		const tiles = [];
		for (let i = 0; i < 4; i++) {
			for (let j = 0; j < 4; j++) {
				if (grid[i][j] !== 0) {
					const wasEmpty = previousGrid[i][j] === 0;
					const wasDifferent =
						previousGrid[i][j] !== 0 && previousGrid[i][j] !== grid[i][j];

					tiles.push({
						key: `${i}-${j}-${grid[i][j]}`,
						value: grid[i][j],
						position: {row: i, col: j},
						isNew: wasEmpty,
						isMerged: wasDifferent,
					});
				}
			}
		}

		yield (
			<div
				tabindex="0"
				style={{
					fontFamily: '"Clear Sans", "Helvetica Neue", Arial, sans-serif',
					textAlign: "center",
					backgroundColor: "#faf8ef",
					padding: "20px",
					borderRadius: "10px",
					maxWidth: "500px",
					margin: "0 auto",
					outline: "none",
					position: "relative",
				}}
			>
				<style>{`
					@keyframes tileAppear {
						0% { transform: scale(0); }
						100% { transform: scale(1); }
					}
					@keyframes tileMerge {
						0% { transform: scale(1); }
						50% { transform: scale(1.2); }
						100% { transform: scale(1); }
					}
					.game-title {
						font-size: 48px;
						font-weight: bold;
						color: #776e65;
						margin: 0 0 10px 0;
						text-transform: uppercase;
						letter-spacing: -3px;
					}
					.game-intro {
						color: #776e65;
						font-size: 18px;
						line-height: 1.65;
						margin-bottom: 20px;
					}
					.score-container {
						background: #bbada0;
						padding: 10px 20px;
						border-radius: 3px;
						color: white;
						font-weight: bold;
						position: relative;
						display: inline-block;
						margin: 0 10px;
						min-width: 80px;
					}
					.score-container .score-addition {
						position: absolute;
						right: 20px;
						top: -30px;
						color: #119145;
						font-weight: bold;
						font-size: 18px;
						animation: scoreAddition 600ms ease-in;
						pointer-events: none;
					}
					@keyframes scoreAddition {
						0% { opacity: 1; transform: translateY(0); }
						100% { opacity: 0; transform: translateY(-20px); }
					}
					.restart-button {
						background: #8f7a66;
						color: #f9f6f2;
						border: none;
						padding: 10px 20px;
						border-radius: 3px;
						cursor: pointer;
						font-weight: bold;
						font-size: 16px;
						text-decoration: none;
						display: inline-block;
						transition: background 0.3s ease-in-out;
					}
					.restart-button:hover {
						background: #9f7a66;
					}
				`}</style>

				<h1 className="game-title">2048</h1>
				<p className="game-intro">
					<strong className="important">HOW TO PLAY:</strong> Use your{" "}
					<strong>arrow keys</strong> to move the tiles. When two tiles with the
					same number touch, they <strong>merge into one!</strong>
				</p>

				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: "20px",
					}}
				>
					<div style={{display: "flex", gap: "10px"}}>
						<div className="score-container">
							<div
								style={{
									fontSize: "13px",
									textTransform: "uppercase",
									letterSpacing: "1px",
								}}
							>
								Score
							</div>
							<div style={{fontSize: "25px", fontWeight: "bold"}}>
								{score.toLocaleString()}
							</div>
						</div>
						<div className="score-container">
							<div
								style={{
									fontSize: "13px",
									textTransform: "uppercase",
									letterSpacing: "1px",
								}}
							>
								Best
							</div>
							<div style={{fontSize: "25px", fontWeight: "bold"}}>
								{bestScore.toLocaleString()}
							</div>
						</div>
					</div>

					<button className="restart-button" onclick={restart}>
						New Game
					</button>
				</div>

				<div
					style={{
						backgroundColor: "#bbada0",
						borderRadius: "10px",
						position: "relative",
						width: "500px",
						height: "500px",
						margin: "0 auto",
					}}
				>
					{/* Grid background */}
					{Array(4)
						.fill()
						.map((_, i) =>
							Array(4)
								.fill()
								.map((_, j) => (
									<div
										key={`bg-${i}-${j}`}
										style={{
											position: "absolute",
											width: "106.25px",
											height: "106.25px",
											backgroundColor: "rgba(238, 228, 218, 0.35)",
											borderRadius: "3px",
											top: `${i * 121.25 + 15}px`,
											left: `${j * 121.25 + 15}px`,
										}}
									/>
								)),
						)}

					{/* Tiles */}
					{tiles.map((tileData) => (
						<Tile
							key={tileData.key}
							value={tileData.value}
							position={tileData.position}
							isNew={tileData.isNew}
							isMerged={tileData.isMerged}
						/>
					))}
				</div>

				{won && !continueAfterWin && (
					<div
						style={{
							position: "fixed",
							top: "0",
							left: "0",
							width: "100%",
							height: "100%",
							backgroundColor: "rgba(255, 255, 255, 0.73)",
							zIndex: 100,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<div
							style={{
								backgroundColor: "#ffffff",
								padding: "30px",
								borderRadius: "10px",
								textAlign: "center",
								boxShadow: "0 0 30px rgba(0, 0, 0, 0.4)",
							}}
						>
							<h2
								style={{
									color: "#119145",
									fontSize: "60px",
									fontWeight: "bold",
									margin: "0 0 20px 0",
								}}
							>
								You Win!
							</h2>
							<p
								style={{
									color: "#776e65",
									fontSize: "18px",
									margin: "0 0 30px 0",
								}}
							>
								Congratulations! You reached the 2048 tile!
							</p>
							<div>
								<button
									className="restart-button"
									onclick={continuePlaying}
									style={{marginRight: "10px"}}
								>
									Keep Going
								</button>
								<button className="restart-button" onclick={restart}>
									Try Again
								</button>
							</div>
						</div>
					</div>
				)}

				{gameOver && !won && (
					<div
						style={{
							position: "fixed",
							top: "0",
							left: "0",
							width: "100%",
							height: "100%",
							backgroundColor: "rgba(238, 228, 218, 0.73)",
							zIndex: 100,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<div
							style={{
								backgroundColor: "#ffffff",
								padding: "30px",
								borderRadius: "10px",
								textAlign: "center",
								boxShadow: "0 0 30px rgba(0, 0, 0, 0.4)",
							}}
						>
							<h2
								style={{
									color: "#776e65",
									fontSize: "60px",
									fontWeight: "bold",
									margin: "0 0 20px 0",
								}}
							>
								Game Over!
							</h2>
							<p
								style={{
									color: "#776e65",
									fontSize: "18px",
									margin: "0 0 30px 0",
								}}
							>
								No more moves available. Your final score:{" "}
								<strong>{score.toLocaleString()}</strong>
							</p>
							<button className="restart-button" onclick={restart}>
								Try Again
							</button>
						</div>
					</div>
				)}
			</div>
		);
	}
}

renderer.render(<Game2048 />, document.body);
