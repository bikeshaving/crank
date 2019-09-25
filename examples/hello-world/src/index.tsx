import {createElement, render} from "@repeaterjs/repeat";
const React = {createElement};
const mount = document.getElementById("mount")!;
const arr = ["a", "b", "c", "d", "e"];
const interval = setInterval(() => {
	const elem = (
		<div>
			{arr.map((str) => (
				<div>{str}</div>
			))}
		</div>
	);
	render(elem, mount);
	if (arr.length >= 10) {
		clearInterval(interval);
	}

	arr.push("e");
}, 1000);
