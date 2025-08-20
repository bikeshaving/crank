import {renderer} from "@b9g/crank/dom";
import {createCustomElementClass} from "@b9g/crank/custom-elements";

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
		this.refresh(() => {
			visible = !visible;
			this.setAttribute("visible", visible.toString());
			// Dispatch event in this.after to prevent re-entrancy
			this.after(() => {
				this.dispatchEvent(
					new CustomEvent("blink", {
						detail: {visible},
						bubbles: true,
					}),
				);
			});
		});
	}, rate);

	try {
		for ({rate: rateAttr, children} of this) {
			// Handle rate as string from attributes
			rate = parseFloat(rateAttr) || 1000;
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

// Revive the classic <marquee> element!
function* Marquee({speed = 50, children, ref}) {
	let position = 0;
	let containerWidth = 0;
	let contentWidth = 0;

	ref?.((element) => ({
		start() {
			element.play();
		},
		stop() {
			element.pause();
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

	let animationId;
	const animate = () => {
		if (this.getAttribute("playing") === "true") {
			this.refresh(() => {
				position += speed / 60; // Adjust for ~60fps

				// Bounce effect
				if (position > containerWidth) {
					position = -contentWidth;
					// Dispatch event in this.after to prevent re-entrancy
					this.after(() => {
						this.dispatchEvent(
							new CustomEvent("marqueebounce", {
								detail: {position},
								bubbles: true,
							}),
						);
					});
				}
			});
		}
		animationId = requestAnimationFrame(animate);
	};
	animationId = requestAnimationFrame(animate);

	try {
		for ({speed: speedAttr, children} of this) {
			// Handle speed as string from attributes
			speed = parseFloat(speedAttr) || 50;

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
		cancelAnimationFrame(animationId);
	}
}

// Create custom element classes
const BlinkElement = createCustomElementClass(Blink, {
	observedAttributes: ["rate", "visible"],
});

const MarqueeElement = createCustomElementClass(Marquee, {
	observedAttributes: ["speed", "playing"],
});

// Register custom elements
customElements.define("rip-blink", BlinkElement);
customElements.define("rip-marquee", MarqueeElement);

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
	rip-blink {
		font-weight: bold;
		color: red;
	}
	rip-marquee {
		display: block;
		background: #f0f0f0;
		padding: 5px;
		margin: 10px 0;
	}
`;

document.addEventListener("DOMContentLoaded", () => {
	renderer.render(
		<div>
			<style>{style}</style>
			<h1>Retro Web Elements with Crank Custom Elements!</h1>

			<div class="demo-section">
				<h2>The Infamous Blink</h2>
				<p>
					Remember when <rip-blink>EVERYTHING BLINKED</rip-blink> on the web?
					Now you can make <rip-blink rate="500">anything blink</rip-blink>{" "}
					again!
				</p>

				<p>
					<rip-blink rate="2000" visible="true">
						This blinks slowly and thoughtfully
					</rip-blink>
				</p>

				<div class="controls">
					<button onclick="document.querySelectorAll('rip-blink').forEach(b => b.toggle())">
						Toggle All Blinks
					</button>
					<button onclick="document.querySelectorAll('rip-blink').forEach(b => b.show())">
						Show All
					</button>
					<button onclick="document.querySelectorAll('rip-blink').forEach(b => b.hide())">
						Hide All
					</button>
				</div>
			</div>

			<div class="demo-section">
				<h2>The Glorious Marquee</h2>
				<rip-marquee speed="30" playing="true">
					🎉 Breaking News: The 90s are back! Marquee elements are cool again!
					🎉
				</rip-marquee>

				<rip-marquee speed="60">
					<span style="color: blue">This marquee is faster! </span>
					<span style="color: red">And more colorful! </span>
					<span style="color: green">Click play to start! </span>
				</rip-marquee>

				<div class="controls">
					<button onclick="document.querySelectorAll('rip-marquee').forEach(m => m.play())">
						Play All
					</button>
					<button onclick="document.querySelectorAll('rip-marquee').forEach(m => m.pause())">
						Pause All
					</button>
				</div>
			</div>

			<div class="demo-section">
				<h2>Event Playground</h2>
				<p>Open the console to see custom events!</p>
				<rip-blink id="event-blink">
					Blink events fire on each toggle!
				</rip-blink>
				<rip-marquee id="event-marquee" speed="80" playing="true">
					Watch for bounce events! →
				</rip-marquee>
			</div>
		</div>,
		document.body,
	);

	// Set up event listeners
	const eventBlink = document.getElementById("event-blink");
	const eventMarquee = document.getElementById("event-marquee");

	eventBlink.onblink = (e) => {
		// eslint-disable-next-line no-console
		console.log("Blink toggled! Visible:", e.detail.visible);
	};

	eventMarquee.onmarqueebounce = (e) => {
		// eslint-disable-next-line no-console
		console.log("Marquee bounced!", e.detail);
	};
});
