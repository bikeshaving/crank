import {renderer} from "@b9g/crank/dom";

// Word list (simplified for the example)
const WORDS = [
	"ABOUT",
	"ABOVE",
	"ABUSE",
	"ACTOR",
	"ACUTE",
	"ADMIT",
	"ADOPT",
	"ADULT",
	"AFTER",
	"AGAIN",
	"AGENT",
	"AGREE",
	"AHEAD",
	"ALARM",
	"ALBUM",
	"ALERT",
	"ALIEN",
	"ALIGN",
	"ALIKE",
	"ALIVE",
	"ALLOW",
	"ALONE",
	"ALONG",
	"ALTER",
	"ANGEL",
	"ANGER",
	"ANGLE",
	"ANGRY",
	"APART",
	"APPLE",
	"APPLY",
	"ARENA",
	"ARGUE",
	"ARISE",
	"ARRAY",
	"ARROW",
	"ASIDE",
	"ASSET",
	"AUDIO",
	"AUDIT",
	"AVOID",
	"AWAKE",
	"AWARD",
	"AWARE",
	"BADLY",
	"BAKER",
	"BASES",
	"BASIC",
	"BEACH",
	"BEGAN",
	"BEGIN",
	"BEING",
	"BELOW",
	"BENCH",
	"BILLY",
	"BIRTH",
	"BLACK",
	"BLAME",
	"BLIND",
	"BLOCK",
	"BLOOD",
	"BOARD",
	"BOAST",
	"BONUS",
	"BOOST",
	"BOOTH",
	"BOUND",
	"BRAIN",
	"BRAND",
	"BRASS",
	"BRAVE",
	"BREAD",
	"BREAK",
	"BREED",
	"BRIEF",
	"BRING",
	"BROAD",
	"BROKE",
	"BROWN",
	"BUILD",
	"BUYER",
	"CABLE",
	"CALIF",
	"CARRY",
	"CATCH",
	"CAUSE",
	"CHAIN",
	"CHAIR",
	"CHAOS",
	"CHARM",
	"CHART",
	"CHASE",
	"CHEAP",
	"CHECK",
	"CHEST",
	"CHILD",
	"CHINA",
	"CHOSE",
	"CIVIL",
	"CLAIM",
	"CLASS",
	"CLEAN",
	"CLEAR",
	"CLICK",
	"CLIMB",
	"CLOCK",
	"CLOSE",
	"CLOUD",
	"COACH",
	"COAST",
	"COULD",
	"COUNT",
	"COURT",
	"COVER",
	"CRAFT",
	"CRASH",
	"CRAZY",
	"CREAM",
	"CRIME",
	"CROSS",
	"CROWD",
	"CROWN",
	"CRUDE",
	"CURVE",
	"CYCLE",
	"DAILY",
	"DANCE",
	"DATED",
	"DEALT",
	"DEATH",
	"DEBUG",
	"DELAY",
	"DEPTH",
	"DOING",
	"DOUBT",
	"DOZEN",
	"DRAFT",
	"DRAMA",
	"DRANK",
	"DRAWN",
	"DREAM",
	"DRESS",
	"DRILL",
	"DRINK",
	"DRIVE",
	"DROVE",
	"DYING",
	"EAGER",
	"EARLY",
	"EARTH",
	"EIGHT",
	"ELITE",
	"EMPTY",
	"ENEMY",
	"ENJOY",
	"ENTER",
	"ENTRY",
	"EQUAL",
	"ERROR",
	"EVENT",
	"EVERY",
	"EXACT",
	"EXIST",
	"EXTRA",
	"FAITH",
	"FALSE",
	"FAULT",
	"FIBER",
	"FIELD",
	"FIFTH",
	"FIFTY",
	"FIGHT",
	"FINAL",
	"FIRST",
	"FIXED",
	"FLASH",
	"FLEET",
	"FLOOR",
	"FLUID",
	"FOCUS",
	"FORCE",
	"FORTH",
	"FORTY",
	"FORUM",
	"FOUND",
	"FRAME",
	"FRANK",
	"FRAUD",
	"FRESH",
	"FRONT",
	"FRUIT",
	"FULLY",
	"FUNNY",
	"GIANT",
	"GIVEN",
	"GLASS",
	"GLOBE",
	"GOING",
	"GRACE",
	"GRADE",
	"GRAND",
	"GRANT",
	"GRASS",
	"GRAVE",
	"GREAT",
	"GREEN",
	"GROSS",
	"GROUP",
	"GROWN",
	"GUARD",
	"GUESS",
	"GUEST",
	"GUIDE",
	"HAPPY",
	"HARRY",
	"HEART",
	"HEAVY",
	"HENCE",
	"HENRY",
	"HORSE",
	"HOTEL",
	"HOUSE",
	"HUMAN",
	"IDEAL",
	"IMAGE",
	"INDEX",
	"INNER",
	"INPUT",
	"ISSUE",
	"JAPAN",
	"JIMMY",
	"JOINT",
	"JONES",
	"JUDGE",
	"KNOWN",
	"LABEL",
	"LARGE",
	"LASER",
	"LATER",
	"LAUGH",
	"LAYER",
	"LEARN",
	"LEASE",
	"LEAST",
	"LEAVE",
	"LEGAL",
	"LEVEL",
	"LEWIS",
	"LIGHT",
	"LIMIT",
	"LINKS",
	"LIVES",
	"LOCAL",
	"LOOSE",
	"LOWER",
	"LUCKY",
	"LUNCH",
	"LYING",
	"MAGIC",
	"MAJOR",
	"MAKER",
	"MARCH",
	"MARIA",
	"MATCH",
	"MAYBE",
	"MAYOR",
	"MEANT",
	"MEDIA",
	"METAL",
	"MIGHT",
	"MINOR",
	"MINUS",
	"MIXED",
	"MODEL",
	"MONEY",
	"MONTH",
	"MORAL",
	"MOTOR",
	"MOUNT",
	"MOUSE",
	"MOUTH",
	"MOVED",
	"MOVIE",
	"MUSIC",
	"NEEDS",
	"NEVER",
	"NEWLY",
	"NIGHT",
	"NOISE",
	"NORTH",
	"NOTED",
	"NOVEL",
	"NURSE",
	"OCCUR",
	"OCEAN",
	"OFFER",
	"OFTEN",
	"ORDER",
	"OTHER",
	"OUGHT",
	"PAINT",
	"PANEL",
	"PAPER",
	"PARTY",
	"PEACE",
	"PETER",
	"PHASE",
	"PHONE",
	"PHOTO",
	"PIANO",
	"PIECE",
	"PILOT",
	"PITCH",
	"PLACE",
	"PLAIN",
	"PLANE",
	"PLANT",
	"PLATE",
	"POINT",
	"POUND",
	"POWER",
	"PRESS",
	"PRICE",
	"PRIDE",
	"PRIME",
	"PRINT",
	"PRIOR",
	"PRIZE",
	"PROOF",
	"PROUD",
	"PROVE",
	"QUEEN",
	"QUICK",
	"QUIET",
	"QUITE",
	"RADIO",
	"RAISE",
	"RANGE",
	"RAPID",
	"RATIO",
	"REACH",
	"READ",
	"READY",
	"REALM",
	"REBEL",
	"REFER",
	"RELAX",
	"RIDER",
	"RIDGE",
	"RIGHT",
	"RIGID",
	"RIVAL",
	"RIVER",
	"ROBIN",
	"ROGER",
	"ROMAN",
	"ROUGH",
	"ROUND",
	"ROUTE",
	"ROYAL",
	"RURAL",
	"SCALE",
	"SCENE",
	"SCOPE",
	"SCORE",
	"SENSE",
	"SERVE",
	"SEVEN",
	"SHALL",
	"SHAPE",
	"SHARE",
	"SHARP",
	"SHEET",
	"SHELF",
	"SHELL",
	"SHIFT",
	"SHINE",
	"SHIRT",
	"SHOCK",
	"SHOOT",
	"SHORT",
	"SHOWN",
	"SIGHT",
	"SILLY",
	"SINCE",
	"SIXTH",
	"SIXTY",
	"SIZED",
	"SKILL",
	"SKIN",
	"SLEEP",
	"SLIDE",
	"SMALL",
	"SMART",
	"SMILE",
	"SMITH",
	"SMOKE",
	"SOLID",
	"SOLVE",
	"SORRY",
	"SOUND",
	"SOUTH",
	"SPACE",
	"SPARE",
	"SPEAK",
	"SPEED",
	"SPEND",
	"SPENT",
	"SPLIT",
	"SPOKE",
	"SPORT",
	"STAFF",
	"STAGE",
	"STAKE",
	"STAND",
	"START",
	"STATE",
	"STEAM",
	"STEEL",
	"STICK",
	"STILL",
	"STOCK",
	"STONE",
	"STOOD",
	"STORE",
	"STORM",
	"STORY",
	"STRIP",
	"STUCK",
	"STUDY",
	"STUFF",
	"STYLE",
	"SUGAR",
	"SUITE",
	"SUPER",
	"SWEET",
	"TABLE",
	"TAKEN",
	"TASTE",
	"TAXES",
	"TEACH",
	"TEETH",
	"TERRY",
	"TEXAS",
	"THANK",
	"THEFT",
	"THEIR",
	"THEME",
	"THERE",
	"THESE",
	"THICK",
	"THING",
	"THINK",
	"THIRD",
	"THOSE",
	"THREE",
	"THREW",
	"THROW",
	"THUMB",
	"TIGHT",
	"TIRED",
	"TITLE",
	"TODAY",
	"TOPIC",
	"TOTAL",
	"TOUCH",
	"TOUGH",
	"TOWER",
	"TRACK",
	"TRADE",
	"TRAIN",
	"TREAT",
	"TREND",
	"TRIAL",
	"TRIBE",
	"TRICK",
	"TRIED",
	"TRIES",
	"TRULY",
	"TRUNK",
	"TRUST",
	"TRUTH",
	"TWICE",
	"TWIST",
	"TYPED",
	"ULTRA",
	"UNCLE",
	"UNDER",
	"UNDUE",
	"UNION",
	"UNITY",
	"UNTIL",
	"UPPER",
	"UPSET",
	"URBAN",
	"USAGE",
	"USUAL",
	"VALID",
	"VALUE",
	"VIDEO",
	"VIRAL",
	"VIRUS",
	"VISIT",
	"VITAL",
	"VOCAL",
	"VOICE",
	"WASTE",
	"WATCH",
	"WATER",
	"WHEEL",
	"WHERE",
	"WHICH",
	"WHILE",
	"WHITE",
	"WHOLE",
	"WHOSE",
	"WOMAN",
	"WOMEN",
	"WORLD",
	"WORRY",
	"WORSE",
	"WORST",
	"WORTH",
	"WOULD",
	"WRITE",
	"WRONG",
	"WROTE",
	"YOUNG",
	"YOURS",
	"YOUTH",
];

function getRandomWord() {
	return WORDS[Math.floor(Math.random() * WORDS.length)];
}

function checkGuess(guess, target) {
	const result = [];
	const targetLetters = target.split("");
	const guessLetters = guess.split("");

	// First pass: mark correct positions
	for (let i = 0; i < 5; i++) {
		if (guessLetters[i] === targetLetters[i]) {
			result[i] = "correct";
			targetLetters[i] = null; // Mark as used
		}
	}

	// Second pass: mark present letters
	for (let i = 0; i < 5; i++) {
		if (result[i] !== "correct") {
			const letterIndex = targetLetters.indexOf(guessLetters[i]);
			if (letterIndex !== -1) {
				result[i] = "present";
				targetLetters[letterIndex] = null; // Mark as used
			} else {
				result[i] = "absent";
			}
		}
	}

	return result;
}

function* WordleGame() {
	let targetWord = getRandomWord();
	let guesses = [];
	let currentGuess = "";
	let gameOver = false;
	let won = false;
	let currentRow = 0;
	let shake = false;
	let message = "";

	const submitGuess = () => {
		if (currentGuess.length !== 5) {
			this.refresh(() => {
				message = "Word must be 5 letters long";
				shake = true;
			});
			setTimeout(() => {
				this.refresh(() => {
					message = "";
					shake = false;
				});
			}, 1000);
			return;
		}

		if (!WORDS.includes(currentGuess)) {
			this.refresh(() => {
				message = "Not a valid word";
				shake = true;
			});
			setTimeout(() => {
				this.refresh(() => {
					message = "";
					shake = false;
				});
			}, 1000);
			return;
		}

		this.refresh(() => {
			const result = checkGuess(currentGuess, targetWord);
			guesses.push({word: currentGuess, result});

			if (currentGuess === targetWord) {
				won = true;
				gameOver = true;
				message = "Congratulations! 🎉";
			} else if (guesses.length >= 6) {
				gameOver = true;
				message = `Game Over! The word was: ${targetWord}`;
			}

			currentGuess = "";
			currentRow++;
		});
	};

	const addLetter = (letter) => {
		if (currentGuess.length < 5 && !gameOver) {
			this.refresh(() => {
				currentGuess += letter;
			});
		}
	};

	const removeLetter = () => {
		if (currentGuess.length > 0 && !gameOver) {
			this.refresh(() => {
				currentGuess = currentGuess.slice(0, -1);
			});
		}
	};

	const newGame = () => {
		this.refresh(() => {
			targetWord = getRandomWord();
			guesses = [];
			currentGuess = "";
			gameOver = false;
			won = false;
			currentRow = 0;
			shake = false;
			message = "";
		});
	};

	// Keyboard event handler
	this.addEventListener("keydown", (e) => {
		if (e.key === "Enter") {
			e.preventDefault();
			submitGuess();
		} else if (e.key === "Backspace") {
			e.preventDefault();
			removeLetter();
		} else if (/^[a-zA-Z]$/.test(e.key)) {
			e.preventDefault();
			addLetter(e.key.toUpperCase());
		}
	});

	for ({} of this) {
		const getCellStyle = (state) => {
			const baseStyle = {
				width: "60px",
				height: "60px",
				border: "2px solid #d3d6da",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				fontSize: "32px",
				fontWeight: "bold",
				textTransform: "uppercase",
				transition: "all 0.3s ease",
			};

			switch (state) {
				case "correct":
					return {
						...baseStyle,
						backgroundColor: "#6aaa64",
						borderColor: "#6aaa64",
						color: "white",
					};
				case "present":
					return {
						...baseStyle,
						backgroundColor: "#c9b458",
						borderColor: "#c9b458",
						color: "white",
					};
				case "absent":
					return {
						...baseStyle,
						backgroundColor: "#787c7e",
						borderColor: "#787c7e",
						color: "white",
					};
				default:
					return baseStyle;
			}
		};

		const getKeyStyle = (letter) => {
			const baseStyle = {
				backgroundColor: "#d3d6da",
				border: "none",
				borderRadius: "4px",
				color: "black",
				cursor: "pointer",
				fontWeight: "bold",
				height: "58px",
				margin: "3px",
				textTransform: "uppercase",
				fontSize: "14px",
			};

			// Check if this letter has been guessed
			let state = null;
			for (const guess of guesses) {
				for (let i = 0; i < guess.word.length; i++) {
					if (guess.word[i] === letter) {
						if (guess.result[i] === "correct") {
							state = "correct";
							break;
						} else if (guess.result[i] === "present" && state !== "correct") {
							state = "present";
						} else if (guess.result[i] === "absent" && !state) {
							state = "absent";
						}
					}
				}
			}

			switch (state) {
				case "correct":
					return {...baseStyle, backgroundColor: "#6aaa64", color: "white"};
				case "present":
					return {...baseStyle, backgroundColor: "#c9b458", color: "white"};
				case "absent":
					return {...baseStyle, backgroundColor: "#787c7e", color: "white"};
				default:
					return baseStyle;
			}
		};

		yield (
			<div>
				{/* Global page reset */}
				<style>{`
					* {
						box-sizing: border-box;
					}
					html, body {
						margin: 0;
						padding: 0;
						background: #ffffff;
						font-family: "Clear Sans", "Helvetica Neue", Arial, sans-serif;
						color: #1a1a1b;
						min-height: 100vh;
					}
					@keyframes shake {
						0%, 100% { transform: translateX(0); }
						25% { transform: translateX(-5px); }
						75% { transform: translateX(5px); }
					}
				`}</style>

				<div
					tabindex="0"
					style={{
						textAlign: "center",
						backgroundColor: "#ffffff",
						padding: "20px",
						maxWidth: "500px",
						margin: "0 auto",
						outline: "none",
						minHeight: "100vh",
						display: "flex",
						flexDirection: "column",
						justifyContent: "space-between",
					}}
				>
					<div>
						<h1
							style={{
								color: "#1a1a1b",
								margin: "0 0 20px 0",
								fontSize: "36px",
								fontWeight: "bold",
								letterSpacing: "2px",
								borderBottom: "1px solid #d3d6da",
								paddingBottom: "10px",
							}}
						>
							WORDLE
						</h1>

						{message && (
							<div
								style={{
									backgroundColor: won ? "#6aaa64" : "#f56565",
									color: "white",
									padding: "10px",
									borderRadius: "5px",
									margin: "10px 0",
									fontWeight: "bold",
								}}
							>
								{message}
							</div>
						)}

						{/* Game Grid */}
						<div
							style={{
								display: "grid",
								gridTemplateRows: "repeat(6, 1fr)",
								gap: "5px",
								marginBottom: "30px",
								animation: shake ? "shake 0.5s ease-in-out" : "none",
							}}
						>
							{Array(6)
								.fill()
								.map((_, rowIndex) => (
									<div
										key={rowIndex}
										style={{
											display: "grid",
											gridTemplateColumns: "repeat(5, 1fr)",
											gap: "5px",
											justifyContent: "center",
										}}
									>
										{Array(5)
											.fill()
											.map((_, colIndex) => {
												let letter = "";
												let state = null;

												if (rowIndex < guesses.length) {
													// Past guess
													letter = guesses[rowIndex].word[colIndex];
													state = guesses[rowIndex].result[colIndex];
												} else if (rowIndex === currentRow) {
													// Current guess
													letter = currentGuess[colIndex] || "";
												}

												return (
													<div
														key={colIndex}
														style={{
															...getCellStyle(state),
															borderColor:
																letter && !state
																	? "#878a8c"
																	: getCellStyle(state).borderColor,
														}}
													>
														{letter}
													</div>
												);
											})}
									</div>
								))}
						</div>
					</div>

					{/* Keyboard */}
					<div style={{marginBottom: "20px"}}>
						{[
							["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
							["A", "S", "D", "F", "G", "H", "J", "K", "L"],
							["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"],
						].map((row, rowIndex) => (
							<div
								key={rowIndex}
								style={{
									display: "flex",
									justifyContent: "center",
									margin: "5px 0",
								}}
							>
								{row.map((key) => (
									<button
										key={key}
										onclick={() => {
											if (key === "ENTER") {
												submitGuess();
											} else if (key === "⌫") {
												removeLetter();
											} else {
												addLetter(key);
											}
										}}
										style={{
											...getKeyStyle(key),
											width: key === "ENTER" || key === "⌫" ? "80px" : "40px",
										}}
									>
										{key}
									</button>
								))}
							</div>
						))}

						<button
							onclick={newGame}
							style={{
								backgroundColor: "#6aaa64",
								color: "white",
								border: "none",
								padding: "12px 24px",
								borderRadius: "5px",
								cursor: "pointer",
								fontWeight: "bold",
								fontSize: "16px",
								marginTop: "20px",
							}}
						>
							New Game
						</button>
					</div>

					{/* Legend */}
					<div
						style={{
							color: "#787c7e",
							fontSize: "14px",
							marginTop: "20px",
						}}
					>
						<p>Guess the WORDLE in 6 tries.</p>
						<p>Each guess must be a valid 5-letter word.</p>
						<div
							style={{
								display: "flex",
								justifyContent: "center",
								gap: "15px",
								marginTop: "15px",
								flexWrap: "wrap",
							}}
						>
							<div style={{display: "flex", alignItems: "center", gap: "5px"}}>
								<div
									style={{
										width: "20px",
										height: "20px",
										backgroundColor: "#6aaa64",
										borderRadius: "2px",
									}}
								></div>
								<span>Correct</span>
							</div>
							<div style={{display: "flex", alignItems: "center", gap: "5px"}}>
								<div
									style={{
										width: "20px",
										height: "20px",
										backgroundColor: "#c9b458",
										borderRadius: "2px",
									}}
								></div>
								<span>Present</span>
							</div>
							<div style={{display: "flex", alignItems: "center", gap: "5px"}}>
								<div
									style={{
										width: "20px",
										height: "20px",
										backgroundColor: "#787c7e",
										borderRadius: "2px",
									}}
								></div>
								<span>Absent</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}
}

renderer.render(<WordleGame />, document.body);
