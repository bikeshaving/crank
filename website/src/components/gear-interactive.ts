import {jsx} from "@b9g/crank/standalone";
import type {Context} from "@b9g/crank";

function degreesFromRadians(r: number) {
	return (r * 180) / Math.PI;
}

function radiansFromDegrees(d: number) {
	return (d * Math.PI) / 180;
}

function rotate([x, y]: [number, number], a: number) {
	return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
}

function invAngle(radius: number, baseRadius: number) {
	return Math.sqrt(radius ** 2 - baseRadius ** 2) / baseRadius;
}

function invPoint(angle: number, baseRadius: number) {
	return [
		baseRadius * (Math.cos(angle) + angle * Math.sin(angle)),
		baseRadius * (Math.sin(angle) - angle * Math.cos(angle)),
	];
}

function invIntersectAngle(radius: number, baseRadius: number) {
	const angle = Math.sqrt(radius ** 2 - baseRadius ** 2) / baseRadius;
	const [x, y] = invPoint(angle, baseRadius);
	return Math.atan2(y, x);
}

function calculateGear(mod: number, toothCount: number, pressureAngle: number) {
	const pitchRadius = (mod * toothCount) / 2;
	const baseRadius = pitchRadius * Math.cos(pressureAngle);
	const dedRadius = pitchRadius - mod;
	const addRadius = pitchRadius + mod;
	const toothAngle = (2 * Math.PI) / toothCount;
	const addAngle = invIntersectAngle(addRadius, baseRadius);

	let points = [];

	// build a side of a tooth
	for (
		let i = 0, steps = 12, maxAngle = invAngle(addRadius, baseRadius);
		i <= steps;
		i++
	) {
		const angle = (maxAngle * i) / steps;
		const [x, y] = invPoint(angle, baseRadius);
		points.push([x, y]);
	}

	// TODO: I found this value by guess and check and I have no idea why it is correct
	const mirrorAngle =
		toothAngle / 2 + invIntersectAngle(pitchRadius, baseRadius) * 2;
	// build the reverse side of the tooth
	{
		const points1 = points
			.map(([x, y]) => {
				y = -y;
				[x, y] = rotate([x, y], mirrorAngle);
				return [x, y];
			})
			.reverse();

		points.push(...points1);
	}

	// rotate points so teeth tips aligned with x=0 and y=0
	points = points.map(([x, y]) => rotate([x, y], -mirrorAngle / 2));

	let toothPoints = [];
	for (let i = 0; i <= toothCount; i++) {
		const points1 = points
			.slice()
			.map(([x, y]) => {
				const a = toothAngle * i;
				return rotate([x, y], a);
			})
			.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]);

		toothPoints.push(points1);
	}

	const path = toothPoints
		.map((points, i) => {
			return points
				.map(([x, y], j) => {
					if (i === 0) {
						return `M ${x} ${y}`;
					} else if (j === 0) {
						const radius = toothCount / 2;
						return `A ${radius} ${radius} 0 0 0 ${x} ${y}`;
					}

					return `L ${x} ${y}`;
				})
				.join(" ");
		})
		.join(" ");

	return {
		path,
		pitchRadius,
		baseRadius,
		dedRadius,
		addRadius,
		addAngle,
		toothAngle,
		mirrorAngle,
	};
}

export function* Gear(
	this: Context<typeof Gear>,
	{
		mod,
		toothCount,
		offset,
		mask,
		stroke,
		strokeWidth,
		fill,
		circleRadius,
	}: {
		mod: number;
		toothCount: number;
		offset: boolean | undefined;
		mask?: string;
		stroke?: string | number;
		strokeWidth?: string | number;
		fill?: string | number;
		circleRadius?: number;
	},
): Generator<any> {
	const pressureAngle = radiansFromDegrees(20);
	let path!: string;
	let dedRadius = 0;
	let toothAngle = 0;
	let oldMod: number | undefined;
	let oldToothCount: number | undefined;
	for ({
		mod,
		toothCount,
		offset,
		mask,
		stroke,
		strokeWidth,
		fill,
		circleRadius,
	} of this) {
		if (oldMod !== mod || oldToothCount !== toothCount) {
			({path, dedRadius, toothAngle} = calculateGear(
				mod,
				toothCount,
				pressureAngle,
			));

			circleRadius = circleRadius == null ? dedRadius - 2 * mod : circleRadius;
			// add the inner circle
			path += `
			  M ${-circleRadius} 0
				a ${circleRadius} ${circleRadius} 0 1 0 ${circleRadius * 2} 0
				a ${circleRadius} ${circleRadius} 0 1 0 ${-circleRadius * 2} 0
			`;
		}

		const pathAngle = offset ? 0 : -toothAngle / 2;
		yield jsx`
			<path
				transform="rotate(${pathAngle * (180 / Math.PI)})"
				d=${path}
				mask=${mask}
				stroke=${stroke}
				stroke-width=${strokeWidth}
				fill=${fill}
			/>
		`;

		oldMod = mod;
		oldToothCount = toothCount;
	}
}

function Rack({mod, height}: {mod: number; height: number}) {
	const pressureAngle = radiansFromDegrees(20);
	const points = [];
	const toothWidth = mod * Math.PI;
	let tipWidth = toothWidth / 4;
	const count = Math.ceil(height / toothWidth) + 1;
	for (let i = Math.floor(-count); i <= count; i++) {
		const offset = i * toothWidth;
		points.push(
			...[
				[0, offset],
				[2 * mod, offset + 2 * mod * Math.tan(pressureAngle)],
				[2 * mod, offset + tipWidth + 2 * mod * Math.tan(pressureAngle)],
				[0, offset + tipWidth + 4 * mod * Math.tan(pressureAngle)],
			],
		);
	}

	const path =
		`M${points[0][0]} ${points[0][1]}` +
		points
			.slice(1)
			.map(([x, y]) => `L ${x} ${y}`)
			.join(" ");
	return jsx`
		<path d=${path} />
	`;
}

export function* GearInteractive(this: Context<typeof GearInteractive>, {}) {
	let scrollTop = 0;

	const measure = () => {
		if (typeof document !== "undefined") {
			const el = document.scrollingElement;
			if (el) {
				scrollTop = Math.max(
					0,
					Math.min(el.scrollHeight - el.clientHeight, el.scrollTop),
				);
			}
		}
	};

	measure();
	if (typeof window !== "undefined") {
		const onscroll = () => {
			measure();
			this.refresh();
		};

		window.addEventListener("scroll", onscroll, {passive: true});
		this.cleanup(() => {
			window.removeEventListener("scroll", onscroll);
		});

		onclick = () => {
			// TODO: advance the gears by a tiny amount every time the page is
			// clicked.
		};

		window.addEventListener("click", onclick);
		this.cleanup(() => {
			window.removeEventListener("click", onclick as any);
		});
	}

	const mod = 20;
	const speed = 1/3;

	const toothCount1 = 16;
	const pitchRadius1 = (toothCount1 * mod) / 2;

	const toothCount2 = 32;
	const pitchRadius2 = (toothCount2 * mod) / 2;

	const toothCount3 = 16;
	const pitchRadius3 = (toothCount3 * mod) / 2;

	const rackX = 20;
	const rackY = 75;
	const x1 = rackX + pitchRadius1 + mod;
	const y1 = rackY + pitchRadius1 + mod;

	const gearAngle2 = radiansFromDegrees(30);
	const x2 = x1 + Math.cos(gearAngle2) * (pitchRadius1 + pitchRadius2);
	const y2 = y1 + Math.sin(gearAngle2) * (pitchRadius1 + pitchRadius2);

	const x3 = x2 + Math.cos(gearAngle2) * (pitchRadius2 + pitchRadius3);
	const y3 = y2 + Math.sin(gearAngle2) * (pitchRadius2 + pitchRadius3);
	for ({} of this) {
		// TODO: resize observer
		const width = x2 * 2;
		const height =
			(typeof document !== "undefined" &&
				document.scrollingElement?.clientHeight) ||
			1000;
		const scrollAng = (-scrollTop * speed) / pitchRadius1;
		yield jsx`
			<div style="
				position: fixed;
				top: 0;
				left: 0;
				width: 100vw;
				height: 100vh;
				z-index: -1;
			">
				<svg
					style="
						display: block;
						height: 100%;
						margin: 0 auto;
						position: relative;
						left: 1px;
					"
					stroke="#aaa"
					stroke-width="2"
					fill="none"
					width=${width}
				>
					<g
						style="
							transform: translate(
								${rackX}px,
								${rackY - ((scrollTop * speed) % (mod * Math.PI)) - (mod * Math.PI) / 2}px
							);
						"
					>
						<${Rack} mod=${mod} height=${height} />
					</g>
					<g
						stroke="#9b7735"
						style="
							transform:
								translate(${x1}px, ${y1}px)
								rotate(${-degreesFromRadians(scrollAng)}deg);
						"
					>
						<${Gear} mod=${mod} toothCount=${toothCount1} />
					</g>
					<g
						style="
							transform:
								translate(${x2}px, ${y2}px)
								rotate(${degreesFromRadians((scrollAng * toothCount1) / toothCount2)}deg);
						"
					>
						<${Gear} mod=${mod} toothCount=${toothCount2} offset />
					</g>
					<g
						stroke="#9b7735"
						style="
							transform: translate(${x3}px, ${y3}px)
							rotate(${-degreesFromRadians((scrollAng * toothCount1) / toothCount3)}deg);
						"
					>
						<${Gear} mod=${mod} toothCount=${toothCount3} />
					</g>
					<!-- This last position is hard-coded because I just can’t even -->
					<g
						style="
							transform: translate(${x3 + pitchRadius3 - mod}px, ${
			y3 + 9 + ((scrollTop * speed) % (mod * Math.PI))
		}px);
						"
					>
						<${Rack} mod=${mod} height=${height} />
					</g>
				</svg>
			</div>
		`;
	}
}

export function GearLogo({width=400, height=400}) {
	const r = 300;
	const wa = (35 * Math.PI) / 180;
	return jsx`
		<svg
			style="flex: none;"
			fill="none"
			viewBox="-200 -200 400 400"
			width=${width}
			height=${height}
		>
			<defs>
				<mask id="wedge-mask">
					<rect x="-200" y="-200" width="400" height="400" fill="white" />
					<path
						stroke="none"
						fill="black"
						d="
							M 0 0
							L ${Math.cos(wa) * r} ${Math.sin(wa) * r}
							L ${Math.cos(wa) * r} ${-Math.sin(wa) * r}
							z
						"
					/>
				</mask>
			</defs>
			<g
				stroke="none"
				fill="#dbb368"
			>
				<${Gear}
					mod=${20}
					toothCount=${16}
					offset=${1}
					stroke="none"
					strokeWidth="4"
					mask="url(#wedge-mask)"
					circleRadius=${110}
				/>
				<circle cx="0" cy="0" r="60" stroke="none" />
				<path
					d="
						M 0 0
						L 0 40
						L 160 20
						A 0.2 1 0 0 0 160 -20
						L 0 -40
						z
					"
				/>
			</g>
		</svg>
	`;
}
