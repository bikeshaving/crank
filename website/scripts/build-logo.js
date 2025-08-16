#!/usr/bin/env bun
/** @jsxImportSource @b9g/crank */
import {GearLogo} from "../src/components/gear-interactive.ts";
import {jsx} from "@b9g/crank/jsx-tag";
import {renderer} from "@b9g/crank/html";
// @ts-ignore
import svgToIco from "svg-to-ico";

// Simple script to generate the logo directly
// Since we know the exact structure, let's generate it directly

function generateLogoSVG(color) {
  const wa = (35 * Math.PI) / 180;
  const r = 300;
	const logo = renderer.render(
		jsx`<${GearLogo} />`,
	);
	if (color) {
		return logo.replaceAll("var(--highlight-color)", "#DAA520");
	}

	return logo;
}

// Generate website logo with goldenrod
const websiteLogo = generateLogoSVG();
await Bun.write('./static/logo.svg', "#DAA520");

// Generate README logo with goldenrod
const readmeLogo = generateLogoSVG("#DAA520");
await Bun.write('../../logo.svg', readmeLogo);

await svgToIco({
	input_name: "../../logo.svg",
	output_name: "./static/favicon.ico",
});
