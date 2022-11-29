import {jsx} from "@b9g/crank";
import type {Context} from "@b9g/crank";

function degreesFromRadians(rad: number) {
	return (rad * 180) / Math.PI;
}

function radiansFromDegrees(deg: number) {
	return (deg * Math.PI) / 180;
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

	const toothPoints = [];
	for (let i = 0; i <= toothCount; i++) {
		const points1 = points.slice().map(([x, y]) => {
			const a = toothAngle * i;
			return rotate([x, y], a);
		});
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

function* Gear(
	this: Context<typeof Gear>,
	{
		mod,
		toothCount,
		offset,
	}: {mod: number; toothCount: number; offset: boolean | undefined},
): Generator<any> {
	const pressureAngle = radiansFromDegrees(20);
	let path!: string;
	let dedRadius = 0;
	let toothAngle = 0;
	let circleRadius = 0;
	let oldMod: number | undefined;
	let oldToothCount: number | undefined;
	for ({mod, toothCount, offset} of this) {
		if (oldMod !== mod || oldToothCount !== toothCount) {
			({path, dedRadius, toothAngle} = calculateGear(
				mod,
				toothCount,
				pressureAngle,
			));

			circleRadius = dedRadius - 2 * mod;
			// add the inner circle
			path += `
			  M ${-circleRadius}, 0
				a ${circleRadius}, ${circleRadius} 0 1 0 ${circleRadius * 2}, 0
				a ${circleRadius}, ${circleRadius} 0 1 0 ${-circleRadius * 2}, 0
			`;
		}

		const pathAngle = offset ? 0 : -toothAngle / 2;
		yield jsx`
			<path
				transform="rotate(${pathAngle * (180 / Math.PI)})"
				d=${path}
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
		points.slice(1).map(([x, y]) => `L ${x} ${y}`);
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
	const onscroll = () => {
		measure();
		this.refresh();
	};
	if (typeof window !== "undefined") {
		window.addEventListener("scroll", onscroll, {passive: true});
		this.cleanup(() => {
			window.removeEventListener("scroll", onscroll);
		});
	}

	const mod = 20;
	const speed = 1;

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
			<div style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: -1">
				<svg
					style="display: block; height: 100%; margin: 0 auto;"
					stroke="#aaa"
					stroke-width="2"
					fill="none"
					width=${width}
				>
					<g
						transform="translate(
							${rackX},
							${rackY - ((scrollTop * speed) % (mod * Math.PI)) - (mod * Math.PI) / 2}
						)"
					>
						<${Rack} mod=${20} height=${height} />
					</g>
					<g
						stroke="#9b7735"
						transform="translate(${x1}, ${y1}) rotate(${-degreesFromRadians(scrollAng)})">
						<${Gear} mod=${mod} toothCount=${toothCount1} />
					</g>
					<g
						transform="translate(${x2}, ${y2}) rotate(${degreesFromRadians(
			(scrollAng * toothCount1) / toothCount2,
		)})">
						<${Gear} mod=${mod} toothCount=${toothCount2} offset />
					</g>
					<g
						stroke="#9b7735"
						transform="translate(${x3}, ${y3}) rotate(${-degreesFromRadians(
			(scrollAng * toothCount1) / toothCount3,
		)})">
						<${Gear} mod=${mod} toothCount=${toothCount3} />
					</g>
					<!-- This last position is hard-coded because I just can’t even -->
					<g
						transform="translate(
							${x3 + pitchRadius3 - mod},
							${y3 + 9 + ((scrollTop * speed) % (mod * Math.PI))}
						)"
					>
						<${Rack} mod=${mod} height=${height} />
					</g>
				</svg>
			</div>
		`;
	}
}
