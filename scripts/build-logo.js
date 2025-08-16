#!/usr/bin/env bun
import {writeFileSync} from "fs";
import {GearLogo} from "../website/src/components/gear-interactive.ts";
import {createElement} from "@b9g/crank";
import {renderer} from "@b9g/crank/html";

// Simple script to generate the logo directly
// Since we know the exact structure, let's generate it directly

function generateLogoSVG(color) {
  const wa = (35 * Math.PI) / 180;
  const r = 300;
	const logo = renderer.render(
		<GearLogo />,
	);
	return logo.replaceAll("var(--highlight-color)", "#DAA520");
}

// Generate website logo with goldenrod
const websiteLogo = generateLogoSVG();
writeFileSync('./website/static/logo.svg', websiteLogo);

// Generate README logo with goldenrod
const readmeLogo = generateLogoSVG('#DAA520');
writeFileSync('./logo.svg', readmeLogo);

console.log('✅ Logo generated successfully!');
console.log('📁 Website logo: ./website/static/logo.svg (goldenrod: #DAA520)');
console.log('📁 README logo: ./logo.svg (goldenrod: #DAA520)');
