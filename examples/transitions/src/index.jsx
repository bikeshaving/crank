/** @jsx createElement */
import {createElement} from "@bikeshaving/crank";
import {renderer} from "@bikeshaving/crank/dom";

const alphabet = "abcdefghijklmnopqrstuvwxyz".split("");
function shuffle(arr) {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}

	return arr;
}

function randomLetters() {
	return shuffle(Array.from(alphabet))
		.slice(0, Math.floor(Math.random() * 26))
		.sort();
}

async function* Letter({letter, index}) {
	let node;
	try {
		const style = {
			position: "absolute",
			top: "20px",
			transition: "transform 750ms, opacity 750ms",
		};

		node = yield <span style={style}>{letter}</span>;
		node.style.color = "green";
		node.style.transform = `translate(${index * 1.2}em, -20px)`;
		node.style.opacity = 0;
		requestAnimationFrame(() => {
			node.style.transform = `translate(${index * 1.2}em, 0)`;
			node.style.opacity = 1;
		});

		for await ({letter, index} of this) {
			yield <span style={style}>{letter}</span>;
			node.style.color = "black";
			requestAnimationFrame(() => {
				node.style.transform = `translate(${index * 1.2}em, 0)`;
			});
		}
	} finally {
		node.style.color = "red";
		requestAnimationFrame(() => {
			node.style.transform = `translate(${index * 1.2}em, 20px)`;
			node.style.opacity = 0;
		});
		await new Promise((resolve) => setTimeout(resolve, 750));
	}
}

function* Letters() {
	const interval = setInterval(() => this.refresh(), 1500);
	try {
		while (true) {
			const letters = randomLetters().map((l, i) => (
				<Letter crank-key={l} letter={l} index={i} />
			));

			yield <div style="height: 40px">{letters}</div>;
		}
	} finally {
		clearInterval(interval);
	}
}

renderer.render(<Letters />, document.body);
