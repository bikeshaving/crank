import {jsx} from "@b9g/crank/standalone";

export function PartsOfJSX() {
	const tag = "#6cb8e6";
	const prop = "#e9ae7e";
	const child = "#c699e3";
	const punc = "#8da1b9";
	const sw = 2.5;

	// Monospace layout: ch = 0.6 * fontSize
	const ch = 15;
	const x0 = 30;
	const x = (i: number) => x0 + i * ch;
	const tl = (n: number) => n * ch;

	// Code: <div id="element">Hello world</div>  (35 chars, 0-34)
	const W = x0 * 2 + 35 * ch;
	const H = 178;
	const codeY = 48;

	// Brackets
	const bY = 70;
	const tT = 64;
	const tB = 76;

	// Spans: [leftEdge, rightEdge]
	const tagO = [x(1), x(4)];
	const tagC = [x(31), x(34)];
	const pS = [x(5), x(17)];
	const cS = [x(18), x(29)];

	// Connector attachment points
	const tom = (tagO[0] + tagO[1]) / 2;
	const tcm = (tagC[0] + tagC[1]) / 2;
	const pm = pS[0] + (pS[1] - pS[0]) * 0.3;
	const cm = cS[0] + (cS[1] - cS[0]) * 0.3;
	const gap = 10;

	// Y levels
	const tagHY = 120;
	const pcY = 152;

	// Tag label position (embedded in horizontal line)
	const tagLS = tom + 25;
	const tagLE = tagLS + 30;

	const font =
		"ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace";

	return jsx`
		<svg
			viewBox="0 0 ${W} ${H}"
			xmlns="http://www.w3.org/2000/svg"
			role="img"
			aria-label="Diagram showing the parts of a JSX element: tag, props, and children"
			style="max-width: min(100%, 550px); height: auto; display: block; margin: 1em 0;"
		>
			<rect width="100%" height="100%" fill="#111b27" rx="6" />

			<g font-family=${font} font-size="24" lengthAdjust="spacingAndGlyphs">
				<text x=${x(0)} y=${codeY} fill=${punc} textLength=${tl(1)}>${"<"}</text>
				<text x=${x(1)} y=${codeY} fill=${tag} textLength=${tl(3)}>div</text>
				<text x=${x(5)} y=${codeY} fill=${prop} textLength=${tl(12)}>${'id="element"'}</text>
				<text x=${x(17)} y=${codeY} fill=${punc} textLength=${tl(1)}>${">"}</text>
				<text x=${x(18)} y=${codeY} fill=${child} textLength=${tl(11)}>Hello world</text>
				<text x=${x(29)} y=${codeY} fill=${punc} textLength=${tl(2)}>${"</"}</text>
				<text x=${x(31)} y=${codeY} fill=${tag} textLength=${tl(3)}>div</text>
				<text x=${x(34)} y=${codeY} fill=${punc} textLength=${tl(1)}>${">"}</text>
			</g>

			<!-- Opening tag bracket -->
			<line x1=${tagO[0]} y1=${bY} x2=${tagO[1]} y2=${bY} stroke=${tag} stroke-width=${sw} />
			<line x1=${tagO[0]} y1=${tT} x2=${tagO[0]} y2=${tB} stroke=${tag} stroke-width=${sw} />
			<line x1=${tagO[1]} y1=${tT} x2=${tagO[1]} y2=${tB} stroke=${tag} stroke-width=${sw} />

			<!-- Closing tag bracket -->
			<line x1=${tagC[0]} y1=${bY} x2=${tagC[1]} y2=${bY} stroke=${tag} stroke-width=${sw} />
			<line x1=${tagC[0]} y1=${tT} x2=${tagC[0]} y2=${tB} stroke=${tag} stroke-width=${sw} />
			<line x1=${tagC[1]} y1=${tT} x2=${tagC[1]} y2=${tB} stroke=${tag} stroke-width=${sw} />

			<!-- Tag verticals -->
			<line x1=${tom} y1=${tB} x2=${tom} y2=${tagHY} stroke=${tag} stroke-width=${sw} />
			<line x1=${tcm} y1=${tB} x2=${tcm} y2=${tagHY} stroke=${tag} stroke-width=${sw} />

			<!-- Tag horizontal (gaps for label and crossings) -->
			<line x1=${tom} y1=${tagHY} x2=${tagLS - 5} y2=${tagHY} stroke=${tag} stroke-width=${sw} />
			<line x1=${tagLE + 5} y1=${tagHY} x2=${pm - gap} y2=${tagHY} stroke=${tag} stroke-width=${sw} />
			<line x1=${pm + gap} y1=${tagHY} x2=${cm - gap} y2=${tagHY} stroke=${tag} stroke-width=${sw} />
			<line x1=${cm + gap} y1=${tagHY} x2=${tcm} y2=${tagHY} stroke=${tag} stroke-width=${sw} />

			<!-- Tag label -->
			<text x=${tagLS} y=${tagHY + 5} fill=${tag} font-family="system-ui, sans-serif" font-size="16" font-weight="600">tag</text>

			<!-- Props bracket -->
			<line x1=${pS[0]} y1=${bY} x2=${pS[1]} y2=${bY} stroke=${prop} stroke-width=${sw} />
			<line x1=${pS[0]} y1=${tT} x2=${pS[0]} y2=${tB} stroke=${prop} stroke-width=${sw} />
			<line x1=${pS[1]} y1=${tT} x2=${pS[1]} y2=${tB} stroke=${prop} stroke-width=${sw} />

			<!-- Props connector -->
			<line x1=${pm} y1=${tB} x2=${pm} y2=${pcY} stroke=${prop} stroke-width=${sw} />
			<line x1=${pm} y1=${pcY} x2=${pm + 25} y2=${pcY} stroke=${prop} stroke-width=${sw} />

			<!-- Props label -->
			<text x=${pm + 30} y=${pcY + 5} fill=${prop} font-family="system-ui, sans-serif" font-size="16" font-weight="600">props</text>

			<!-- Children bracket -->
			<line x1=${cS[0]} y1=${bY} x2=${cS[1]} y2=${bY} stroke=${child} stroke-width=${sw} />
			<line x1=${cS[0]} y1=${tT} x2=${cS[0]} y2=${tB} stroke=${child} stroke-width=${sw} />
			<line x1=${cS[1]} y1=${tT} x2=${cS[1]} y2=${tB} stroke=${child} stroke-width=${sw} />

			<!-- Children connector -->
			<line x1=${cm} y1=${tB} x2=${cm} y2=${pcY} stroke=${child} stroke-width=${sw} />
			<line x1=${cm} y1=${pcY} x2=${cm + 25} y2=${pcY} stroke=${child} stroke-width=${sw} />

			<!-- Children label -->
			<text x=${cm + 30} y=${pcY + 5} fill=${child} font-family="system-ui, sans-serif" font-size="16" font-weight="600">children</text>
		</svg>
	`;
}
