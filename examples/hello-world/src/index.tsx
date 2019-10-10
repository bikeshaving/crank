//import {interval} from "@repeaterjs/timers";
import {Controller, createElement, Element, render} from "crank";
const React = {createElement};
const mount = document.getElementById("mount")!;
// function logRecords(records: MutationRecord[]): void {
// 	const total = records.length;
// 	const added = records.reduce((count, record) => count + record.addedNodes.length, 0);
// 	const removed = records.reduce((count, record) => count + record.removedNodes.length, 0);
// 	console.log({total, added, removed});
// }
//
// const observer = new MutationObserver(logRecords);
// observer.observe(mount, {attributes: true, childList: true, subtree: true});

const arr: number[] = [];
async function* List(
	this: Controller,
	{elems}: {elems: number[]},
): AsyncGenerator<Element> {
	let i = 0;
	for await ({elems} of this) {
		if (i > 10) {
			break;
		}

		if (i++ % 5 === 0) {
			yield <div>Loading {elems.length} items...</div>;
			await new Promise((resolve) => setTimeout(resolve, 4000));
		}

		yield (
			<ul>
				{elems.map((i) => (
					<li>{i}</li>
				))}
			</ul>
		);
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
}

render(<List elems={arr} />, mount);
setInterval(() => {
	arr.push(arr.length + 1);
	render(<List elems={arr} />, mount);
	//logRecords(observer.takeRecords());
}, 1000);
