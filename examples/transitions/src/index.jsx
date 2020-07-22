/** @jsx createElement */
import {createElement} from "@bikeshaving/crank";
import {renderer} from "@bikeshaving/crank/dom";

const alphabet = "abcdefghijklmnopqrstuvwxyz".split("");
function shuffle(arr) {
	arr = arr.slice();
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}

	return arr;
}

function randomLetters() {
	return shuffle(alphabet)
		.slice(0, Math.floor(Math.random() * 26))
		.sort();
}

async function* Letter({letter, index}) {
	let em = index * 1.3;
	let node;
	try {
		const style = {
			position: "absolute",
			transition: "transform .7s",
			transform: `translate(${em}em, -30px)`,
			color: "green",
		};
		node = yield <span style={style}>{letter}</span>;
		requestAnimationFrame(() => {
			node.style.transform = `translate(${em}em, 0)`;
		});

		for await ({letter, index} of this) {
			em = index * 1.3;
			yield <span>{letter}</span>;
			requestAnimationFrame(() => {
				node.style.color = "black";
				node.style.transform = `translate(${em}em, 0)`;
			});
		}
	} finally {
		if (node !== undefined) {
			requestAnimationFrame(() => {
				node.style.color = "red";
				node.style.transform = `translate(${em}em, 30px)`;
			});

			await new Promise((resolve) => setTimeout(resolve, 700));
		}
	}
}

function* Letters() {
	const interval = setInterval(() => this.refresh(), 1500);

	try {
		while (true) {
			const letters = randomLetters().map((l, i) => (
				<Letter crank-key={l} letter={l} index={i} />
			));

			yield <div style="margin: 50px 20px;">{letters}</div>;
		}
	} finally {
		clearInterval(interval);
	}
}

renderer.render(<Letters letter="a" />, document.body);
