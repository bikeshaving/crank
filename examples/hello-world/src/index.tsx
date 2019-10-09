//import {interval} from "@repeaterjs/timers";
import {Controller, createElement, Element, render} from "crank";
const React = {createElement};
const mount = document.getElementById("mount")!;
function logRecords(records: MutationRecord[]): void {
	const logs: {}[] = [];
	for (const record of records) {
		const added: string[] = [];
		for (const node of Array.from(record.addedNodes)) {
			added.push((node as HTMLElement).outerHTML);
		}

		const removed: string[] = [];
		for (const node of Array.from(record.removedNodes)) {
			removed.push((node as HTMLElement).outerHTML);
		}

		logs.push({target: record.target, added, removed});
	}
	console.log(JSON.stringify(logs, null, 2));
}

// const observer = new MutationObserver(logRecords);
// observer.observe(mount, {attributes: true, childList: true, subtree: true});
const arr: number[] = new Array(5).fill(null).map((_, i) => i);

async function* List(
	this: Controller,
	{elems}: {elems: number[]},
): AsyncGenerator<Element> {
	for await ({elems} of this) {
		console.log("LEFT!");
		yield <div>"Loading"</div>;
		await new Promise((resolve) => setTimeout(resolve, 3000));
		yield <div>{elems.map((i) => <li>{i}</li>)}</div>;
		console.log("RIGHT!");
	}
}

render(<List elems={arr} />, mount);
const interval = setInterval(() => {
	arr.push(arr.length);
	render(<List elems={arr} />, mount);
	// logRecords(observer.takeRecords());
}, 5000);
