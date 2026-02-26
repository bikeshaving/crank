// src/clients/gear.ts
var gearRoot = document.getElementById("gears");
if (gearRoot) {
  Promise.all([
    import("./standalone-S2S7VMAQ.js"),
    import("./dom-42CARGKQ.js"),
    import("./gears-KVWSU2O2.js")
  ]).then(([{ jsx }, { renderer }, { GearInteractive }]) => {
    renderer.render(jsx`<${GearInteractive} />`, gearRoot);
  });
}
