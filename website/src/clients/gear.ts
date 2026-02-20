const gearRoot = document.getElementById("gears");

if (gearRoot) {
	Promise.all([
		import("@b9g/crank/standalone"),
		import("@b9g/crank/dom"),
		import("../components/gears.js"),
	]).then(([{jsx}, {renderer}, {GearInteractive}]) => {
		renderer.render(jsx`<${GearInteractive} />`, gearRoot);
	});
}
