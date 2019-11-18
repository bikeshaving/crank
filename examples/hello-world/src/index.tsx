/** @jsx createElement */
import {Controller, createElement, Element, render} from "crank";
const mount = document.getElementById("mount")!;
const arr: number[] = [];
async function* List(
	this: Controller,
	{elems}: {elems: number[]},
): AsyncGenerator<Element> {
	let i = 0;
	for await ({elems} of this) {
		if (i++ % 5 === 0) {
			yield (<div>Loading {elems.length} items...</div>);
			await new Promise((resolve) => setTimeout(resolve, 4000));
		}

		const lis = elems.map((i) => <li>{i}</li>);
		yield (<ul>{lis}</ul>);
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
}

render(<List elems={arr} />, mount);
setInterval(() => {
	arr.push(arr.length + 1);
	render(<List elems={arr} />, mount);
}, 1000);
