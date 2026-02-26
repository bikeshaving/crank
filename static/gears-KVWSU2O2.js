import {
  jsx
} from "./chunk-KMKAZVP4.js";
import "./chunk-XF2T33KH.js";

// src/components/gears.ts
function degreesFromRadians(r) {
  return r * 180 / Math.PI;
}
function radiansFromDegrees(d) {
  return d * Math.PI / 180;
}
function rotate([x, y], a) {
  return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
}
function invAngle(radius, baseRadius) {
  return Math.sqrt(radius ** 2 - baseRadius ** 2) / baseRadius;
}
function invPoint(angle, baseRadius) {
  return [
    baseRadius * (Math.cos(angle) + angle * Math.sin(angle)),
    baseRadius * (Math.sin(angle) - angle * Math.cos(angle))
  ];
}
function invIntersectAngle(radius, baseRadius) {
  const angle = Math.sqrt(radius ** 2 - baseRadius ** 2) / baseRadius;
  const [x, y] = invPoint(angle, baseRadius);
  return Math.atan2(y, x);
}
function calculateGear(mod, toothCount, pressureAngle) {
  const pitchRadius = mod * toothCount / 2;
  const baseRadius = pitchRadius * Math.cos(pressureAngle);
  const dedRadius = pitchRadius - mod;
  const addRadius = pitchRadius + mod;
  const toothAngle = 2 * Math.PI / toothCount;
  const addAngle = invIntersectAngle(addRadius, baseRadius);
  let points = [];
  for (let i = 0, steps = 12, maxAngle = invAngle(addRadius, baseRadius); i <= steps; i++) {
    const angle = maxAngle * i / steps;
    const [x, y] = invPoint(angle, baseRadius);
    points.push([x, y]);
  }
  const mirrorAngle = toothAngle / 2 + invIntersectAngle(pitchRadius, baseRadius) * 2;
  {
    const points1 = points.map(([x, y]) => {
      y = -y;
      [x, y] = rotate([x, y], mirrorAngle);
      return [x, y];
    }).reverse();
    points.push(...points1);
  }
  points = points.map(([x, y]) => rotate([x, y], -mirrorAngle / 2));
  let toothPoints = [];
  for (let i = 0; i <= toothCount; i++) {
    const points1 = points.slice().map(([x, y]) => {
      const a = toothAngle * i;
      return rotate([x, y], a);
    }).map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]);
    toothPoints.push(points1);
  }
  const path = toothPoints.map((points2, i) => {
    return points2.map(([x, y], j) => {
      if (i === 0) {
        return `M ${x} ${y}`;
      } else if (j === 0) {
        const radius = toothCount / 2;
        return `A ${radius} ${radius} 0 0 0 ${x} ${y}`;
      }
      return `L ${x} ${y}`;
    }).join(" ");
  }).join(" ");
  return {
    path,
    pitchRadius,
    baseRadius,
    dedRadius,
    addRadius,
    addAngle,
    toothAngle,
    mirrorAngle
  };
}
function* Gear({
  mod,
  toothCount,
  offset,
  mask,
  stroke,
  strokeWidth,
  fill,
  circleRadius
}) {
  const pressureAngle = radiansFromDegrees(20);
  let path;
  let dedRadius = 0;
  let toothAngle = 0;
  let oldMod;
  let oldToothCount;
  for ({
    mod,
    toothCount,
    offset,
    mask,
    stroke,
    strokeWidth,
    fill,
    circleRadius
  } of this) {
    if (oldMod !== mod || oldToothCount !== toothCount) {
      ({ path, dedRadius, toothAngle } = calculateGear(
        mod,
        toothCount,
        pressureAngle
      ));
      circleRadius = circleRadius == null ? dedRadius - 2 * mod : circleRadius;
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
function Rack({ mod, height }) {
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
        [0, offset + tipWidth + 4 * mod * Math.tan(pressureAngle)]
      ]
    );
  }
  const path = `M${points[0][0]} ${points[0][1]}` + points.slice(1).map(([x, y]) => `L ${x} ${y}`).join(" ");
  return jsx`
		<path d=${path} />
	`;
}
function* GearInteractive({}) {
  var _a;
  let scrollTop = 0;
  let idleOffset = 0;
  let lastTime = 0;
  let animationId;
  const idleSpeed = 2 * Math.PI / 480;
  const measure = () => {
    if (typeof document !== "undefined") {
      const el = document.scrollingElement;
      if (el) {
        scrollTop = Math.max(
          0,
          Math.min(el.scrollHeight - el.clientHeight, el.scrollTop)
        );
      }
    }
  };
  const animate = (time) => {
    this.refresh(() => {
      if (lastTime) {
        const delta = (time - lastTime) / 1e3;
        idleOffset += idleSpeed * delta;
      }
      lastTime = time;
    });
    animationId = requestAnimationFrame(animate);
  };
  measure();
  if (typeof window !== "undefined") {
    const onscroll = () => {
      this.refresh(() => {
        measure();
      });
    };
    window.addEventListener("scroll", onscroll, { passive: true });
    this.cleanup(() => {
      window.removeEventListener("scroll", onscroll);
    });
    animationId = requestAnimationFrame(animate);
    this.cleanup(() => {
      if (animationId !== void 0) {
        cancelAnimationFrame(animationId);
      }
    });
  }
  const mod = 20;
  const speed = 1 / 3;
  const toothCount1 = 16;
  const pitchRadius1 = toothCount1 * mod / 2;
  const toothCount2 = 32;
  const pitchRadius2 = toothCount2 * mod / 2;
  const toothCount3 = 16;
  const pitchRadius3 = toothCount3 * mod / 2;
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
    const width = x2 * 2;
    const height = typeof document !== "undefined" && ((_a = document.scrollingElement) == null ? void 0 : _a.clientHeight) || 1e3;
    const scrollAng = -scrollTop * speed / pitchRadius1 + idleOffset;
    const rackOffset = -scrollAng * pitchRadius1;
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
								${rackY - rackOffset % (mod * Math.PI) - mod * Math.PI / 2}px
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
								rotate(${degreesFromRadians(scrollAng * toothCount1 / toothCount2)}deg);
						"
					>
						<${Gear} mod=${mod} toothCount=${toothCount2} offset />
					</g>
					<g
						stroke="#9b7735"
						style="
							transform: translate(${x3}px, ${y3}px)
							rotate(${-degreesFromRadians(scrollAng * toothCount1 / toothCount3)}deg);
						"
					>
						<${Gear} mod=${mod} toothCount=${toothCount3} />
					</g>
					<!-- This last position is hard-coded because I just can't even -->
					<g
						style="
							transform: translate(${x3 + pitchRadius3 - mod + 2}px, ${y3 + 9 + rackOffset % (mod * Math.PI)}px);
						"
					>
						<${Rack} mod=${mod} height=${height} />
					</g>
				</svg>
			</div>
		`;
  }
}
function GearLogo({
  width = 400,
  height = 400,
  color = "var(--highlight-color)",
  background
}) {
  const style = background ? `flex: none; background-color: ${background};` : "flex: none;";
  return jsx`
		<svg
			style=${style}
			fill="none"
			viewBox="-200 -200 400 400"
			width=${width}
			height=${height}
			xmlns="http://www.w3.org/2000/svg"
		>
			<g
				stroke="none"
				fill=${color}
			>
				<${Gear}
					mod=${20}
					toothCount=${16}
					offset=${1}
					stroke="none"
					strokeWidth="4"
					circleRadius=${110}
				/>
				<circle cx="0" cy="0" r="60" stroke="none" />
				<path
					d="
						M 0 -25
						L 120 -20
						L 120 20
						L 0 25
						Z
					"
				/>
			</g>
		</svg>
	`;
}
export {
  Gear,
  GearInteractive,
  GearLogo
};
