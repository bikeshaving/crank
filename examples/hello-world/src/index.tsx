import {createElement, Element, render} from "crank";
const React = {createElement};
const mount = document.getElementById("mount")!;
// const observer = new MutationObserver(() => {});
// observer.observe(mount, {attributes: true, childList: true, subtree: true});
// function logRecords(records: MutationRecord[]): void {
//   const logs: {}[] = [];
//   for (const record of records) {
//     const added: string[] = [];
//     for (const node of Array.from(record.addedNodes)) {
//       added.push((node as HTMLElement).outerHTML);
//     }
//
//     const removed: string[] = [];
//     for (const node of Array.from(record.removedNodes)) {
//       removed.push((node as HTMLElement).outerHTML);
//     }
//
//     logs.push({target: record.target, added, removed});
//   }
//   console.dir(logs, {depth: 100});
// }

const arr: number[] = new Array(5).fill(null).map((_, i) => i);

async function List({elems}: {elems: number[]}): Promise<Element> {
	await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000));
	const items = elems.map((elem) => <li>{elem}</li>);
	return <ul>{items}</ul>;
}

render(<List elems={arr} />, mount);
const interval = setInterval(() => {
	arr.push(arr.length);
	render(<List elems={arr} />, mount);
	// logRecords(observer.takeRecords());
}, 1000);
