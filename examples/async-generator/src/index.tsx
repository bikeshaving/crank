/** @jsx createElement */
import {Context, createElement, Element} from "@bikeshaving/crank";
import {renderer} from "@bikeshaving/crank/dom";
const mount = document.getElementById("mount")!;
const arr: number[] = [];
async function* List(
	this: Context,
	{elems}: {elems: number[]},
): AsyncGenerator<Element> {
	let i = 0;
	for await ({elems} of this) {
		i++;
		if (i % 5 === 0) {
			yield (<div>Loading {elems.length} items...</div>);
			await new Promise((resolve) => setTimeout(resolve, 4000));
		}
		yield (
			<ul>
				{elems.map((i) => (
					<li crank-key={i}>{i}</li>
				))}
			</ul>
		);
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
}

renderer.render(<List elems={arr} />, mount);
setInterval(() => {
	arr.push(arr.length + 1);
	if (arr.length > 30) {
		arr.length = 0;
	}

	renderer.render(<List elems={arr} />, mount);
}, 1000);
