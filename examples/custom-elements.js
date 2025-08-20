import {renderer} from "@b9g/crank/dom";
import {createCustomElementClass} from "@b9g/crank/custom-elements";

// Revive the classic <marquee> element!
function* Marquee({speed = 50, children, ref}) {
	let position = 0;
	let containerWidth = 0;
	let contentWidth = 0;

	ref?.((element) => ({
		start() {
			this.play();
		},
		stop() {
			this.pause();
		},
		play() {
			element.setAttribute("playing", "true");
		},
		pause() {
			element.removeAttribute("playing");
		},
		onmarqueebounce: null,
	}));

	this.after((el) => {
		const container = el.querySelector(".marquee-container");
		const content = el.querySelector(".marquee-content");
		containerWidth = container.offsetWidth;
		contentWidth = content.offsetWidth;
	});

	const interval = setInterval(() => {
		if (this.getAttribute("playing") === "true") {
			this.refresh();
		}
	}, 16); // ~60fps

	try {
		for ({speed, children} of this) {
			position += speed / 60; // Adjust for ~60fps

			// Bounce effect
			if (position > containerWidth) {
				position = -contentWidth;
				this.dispatchEvent(
					new CustomEvent("marqueebounce", {
						detail: {position},
						bubbles: true,
					}),
				);
			}

			yield (
				<div
					class="marquee-container"
					style={{
						position: "relative",
						overflow: "hidden",
						width: "100%",
						height: "30px",
					}}
				>
					<div
						class="marquee-content"
						style={{
							position: "absolute",
							left: `${position}px`,
							whiteSpace: "nowrap",
						}}
					>
						{children}
					</div>
				</div>
			);
		}
	} finally {
		clearInterval(interval);
	}
}

// Revive the classic <blink> element!
function* Blink({rate = 1000, children, ref}) {
	let visible = true;

	ref?.((element) => ({
		show() {
			element.setAttribute("visible", "true");
		},
		hide() {
			element.setAttribute("visible", "false");
		},
		toggle() {
			const current = element.getAttribute("visible");
			element.setAttribute("visible", current === "false" ? "true" : "false");
		},
		onblink: null,
	}));

	const interval = setInterval(() => {
		visible = !visible;
		this.setAttribute("visible", visible.toString());
		this.refresh();

		// Fire blink event
		this.dispatchEvent(
			new CustomEvent("blink", {
				detail: {visible},
				bubbles: true,
			}),
		);
	}, rate);

	try {
		for ({rate, children} of this) {
			const isVisible = this.getAttribute("visible") !== "false";

			yield (
				<span
					style={{
						visibility: isVisible ? "visible" : "hidden",
					}}
				>
					{children}
				</span>
			);
		}
	} finally {
		clearInterval(interval);
	}
}

// Create custom element classes
const MarqueeElement = createCustomElementClass(Marquee, {
	observedAttributes: ["speed", "playing"],
});

const BlinkElement = createCustomElementClass(Blink, {
	observedAttributes: ["rate", "visible"],
});

// Register custom elements
customElements.define("x-marquee", MarqueeElement);
customElements.define("x-blink", BlinkElement);

// Demo app
const style = `
	body {
		font-family: Arial, sans-serif;
		max-width: 800px;
		margin: 0 auto;
		padding: 20px;
	}
	.demo-section {
		margin: 30px 0;
		padding: 20px;
		border: 1px solid #ddd;
		border-radius: 8px;
	}
	.controls {
		margin-top: 10px;
	}
	button {
		margin-right: 10px;
		padding: 5px 15px;
		cursor: pointer;
	}
	x-marquee {
		display: block;
		background: #f0f0f0;
		padding: 5px;
		margin: 10px 0;
	}
	x-blink {
		font-weight: bold;
		color: red;
	}
`;

document.addEventListener("DOMContentLoaded", () => {
	renderer.render(
		<div>
			<style>{style}</style>
			<h1>Retro Web Elements with Crank Custom Elements!</h1>

			<div class="demo-section">
				<h2>The Glorious Marquee</h2>
				<x-marquee speed="30" playing="true">
					🎉 Breaking News: The 90s are back! Marquee elements are cool again!
					🎉
				</x-marquee>

				<x-marquee speed="60">
					<span style="color: blue">This marquee is faster! </span>
					<span style="color: red">And more colorful! </span>
					<span style="color: green">Click play to start! </span>
				</x-marquee>

				<div class="controls">
					<button onclick="document.querySelectorAll('x-marquee').forEach(m => m.play())">
						Play All
					</button>
					<button onclick="document.querySelectorAll('x-marquee').forEach(m => m.pause())">
						Pause All
					</button>
				</div>
			</div>

			<div class="demo-section">
				<h2>The Infamous Blink</h2>
				<p>
					Remember when <x-blink>EVERYTHING BLINKED</x-blink> on the web? Now
					you can make <x-blink rate="500">anything blink</x-blink> again!
				</p>

				<p>
					<x-blink rate="2000" visible="true">
						This blinks slowly and thoughtfully
					</x-blink>
				</p>

				<div class="controls">
					<button onclick="document.querySelectorAll('x-blink').forEach(b => b.toggle())">
						Toggle All Blinks
					</button>
					<button onclick="document.querySelectorAll('x-blink').forEach(b => b.show())">
						Show All
					</button>
					<button onclick="document.querySelectorAll('x-blink').forEach(b => b.hide())">
						Hide All
					</button>
				</div>
			</div>

			<div class="demo-section">
				<h2>Event Playground</h2>
				<p>Open the console to see custom events!</p>
				<x-marquee id="event-marquee" speed="80" playing="true">
					Watch for bounce events! →
				</x-marquee>
				<x-blink id="event-blink">Blink events fire on each toggle!</x-blink>
			</div>
		</div>,
		document.body,
	);

	// Set up event listeners
	const eventMarquee = document.getElementById("event-marquee");
	const eventBlink = document.getElementById("event-blink");

	eventMarquee.onmarqueebounce = (e) => {
		// eslint-disable-next-line no-console
		console.log("Marquee bounced!", e.detail);
	};

	eventBlink.onblink = (e) => {
		// eslint-disable-next-line no-console
		console.log("Blink toggled! Visible:", e.detail.visible);
	};
});
