/** @jsx createElement */
import {createElement} from "@bikeshaving/crank";
import {renderer} from "@bikeshaving/crank/dom";

function shuffle(arr) {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}

	return arr;
}

function getRandomLetters() {
	const alphabet = [..."abcdefghijklmnopqrstuvwxyz"];
	return shuffle(alphabet)
		.slice(0, Math.floor(Math.random() * alphabet.length))
		.sort();
}

const style = {
	position: "absolute",
	top: "20px",
	transition: "transform 750ms, opacity 750ms",
};

function deferTransitionStyles(callback) {
	requestAnimationFrame(() => {
		requestAnimationFrame(callback);
	});
}

function* Letter({letter, index}) {
	this.flush((node) => {
		node.style.transform = `translate(${index * 1.1}em, -20px)`;
		node.style.opacity = 0;
		deferTransitionStyles(() => {
			node.style.transform = `translate(${index * 1.1}em, 0)`;
			node.style.opacity = 1;
		});
	});

	this.cleanup((node) => {
		deferTransitionStyles(() => {
			node.style.color = "red";
			node.style.transform = `translate(${index * 1.1}em, 20px)`;
			node.style.opacity = 0;
		});
		return new Promise((resolve) => setTimeout(resolve, 750));
	});

	yield (
		<span
			style={{
				...style,
				color: "green",
			}}
		>
			{letter}
		</span>
	);

	for ({letter, index} of this) {
		this.flush((node) => {
			deferTransitionStyles(() => {
				node.style.transform = `translate(${index * 1.1}em, 0)`;
			});
		});

		yield <span style={{...style, color: "black"}}>{letter}</span>;
	}
}

function* Letters() {
	const interval = setInterval(() => this.refresh(), 1500);
	try {
		while (true) {
			yield (
				<div style="height: 40px">
					{getRandomLetters().map((l, i) => (
						<Letter crank-key={l} letter={l} index={i} />
					))}
				</div>
			);
		}
	} finally {
		clearInterval(interval);
	}
}

renderer.render(<Letters />, document.body);
