import {createElement, Element, render} from "@repeaterjs/repeat";
const React = {createElement};
const mount = document.getElementById("mount")!;
const arr = ["a", "b", "c", "d", "e"];

function List({elems}: {elems: string[]}): Element {
	const items = elems.map((elem) => <li>{elem}</li>);
	return <ul>{items}</ul>;
}

const interval = setInterval(() => {
	render(<List elems={arr} />, mount);
	if (arr.length >= 10) {
		clearInterval(interval);
	}

	arr.push("e");
}, 1000);
