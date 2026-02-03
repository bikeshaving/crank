const gearRoot = document.getElementById("gear-interactive");

if (gearRoot) {
	Promise.all([
		import("@b9g/crank/standalone"),
		import("@b9g/crank/dom"),
		import("../components/gear-interactive.js"),
	]).then(([{jsx}, {renderer}, {GearInteractive}]) => {
		renderer.render(jsx`<${GearInteractive} />`, gearRoot);
	});
}
