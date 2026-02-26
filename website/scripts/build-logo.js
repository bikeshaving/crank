#!/usr/bin/env bun
/** @jsxImportSource @b9g/crank */
import { GearLogo } from "../src/components/gears.ts";
import { jsx } from "@b9g/crank/jsx-tag";
import { renderer } from "@b9g/crank/html";
// @ts-ignore
import svgToIco from "svg-to-ico";

import { resolve } from "node:path";

const scriptsDir = import.meta.dir;
const websiteDir = resolve(scriptsDir, "..");
const rootDir = resolve(websiteDir, "..");

function generateLogoSVG({ color, background } = {}) {
  return renderer.render(
    jsx`<${GearLogo} color=${color} background=${background} />`,
  );
}

// Generate website logo (CSS var, transparent)
const websiteLogo = generateLogoSVG();
await Bun.write(resolve(websiteDir, "static/logo.svg"), websiteLogo);

// Generate README logo with goldenrod (transparent)
const readmeLogo = generateLogoSVG({ color: "#DAA520" });
const rootLogo = resolve(rootDir, "logo.svg");
await Bun.write(rootLogo, readmeLogo);

// Generate press kit variants
const darkLogo = generateLogoSVG({ color: "#DAA520", background: "#0a0e1f" });
await Bun.write(resolve(websiteDir, "static/logo-dark.svg"), darkLogo);

const lightLogo = generateLogoSVG({ color: "#DAA520", background: "#e7f4f5" });
await Bun.write(resolve(websiteDir, "static/logo-light.svg"), lightLogo);

const transparentLogo = generateLogoSVG({ color: "#DAA520" });
await Bun.write(
  resolve(websiteDir, "static/logo-transparent.svg"),
  transparentLogo,
);

await svgToIco({
  input_name: rootLogo,
  output_name: resolve(websiteDir, "static/favicon.ico"),
});

// Generate PNG icons at multiples of 16 for Google search results
// @ts-ignore
const sharp = (await import("sharp")).default;
const sizes = [16, 32, 48, 64, 96, 128, 192, 256, 512];
const svgBuffer = Buffer.from(readmeLogo);
for (const size of sizes) {
  await sharp(svgBuffer)
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(resolve(websiteDir, `static/logo-${size}.png`));
}
