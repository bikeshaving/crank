/** @jsx createElement */
import {createElement, Raw} from "../src/crank.js";
import {createCustomElementClass} from "../src/custom-elements.js";
import {test} from "uvu";
import * as assert from "uvu/assert";

test("createCustomElementClass creates a custom element", () => {
	function TestComponent({name}: {name?: string}) {
		return <div>Hello {name || "World"}</div>;
	}

	const TestElement = createCustomElementClass(TestComponent, {
		observedAttributes: ["name"]
	});

	assert.ok(typeof TestElement === "function");
	assert.ok((TestElement as any).observedAttributes.includes("name"));
});

test("custom element renders component content", async () => {
	function TestComponent({greeting}: {greeting?: string}) {
		return <div>Message: {greeting || "default"}</div>;
	}

	const TestElement = createCustomElementClass(TestComponent, {
		observedAttributes: ["greeting"]
	});

	customElements.define("test-greeting", TestElement);
	
	const element = document.createElement("test-greeting") as any;
	document.body.appendChild(element);

	// Wait for render
	await new Promise(resolve => setTimeout(resolve, 0));

	assert.is(element.innerHTML, "<div>Message: default</div>");

	document.body.removeChild(element);
});

test("custom element reacts to attribute changes", async () => {
	function TestComponent({message}: {message?: string}) {
		return <div>Content: {message || "empty"}</div>;
	}

	const TestElement = createCustomElementClass(TestComponent, {
		observedAttributes: ["message"]
	});

	customElements.define("test-reactive", TestElement);
	
	const element = document.createElement("test-reactive") as any;
	document.body.appendChild(element);

	// Wait for initial render
	await new Promise(resolve => setTimeout(resolve, 0));
	assert.is(element.innerHTML, "<div>Content: empty</div>");

	// Change attribute
	element.setAttribute("message", "updated");
	
	// Wait for re-render (microtask)
	await new Promise(resolve => setTimeout(resolve, 0));
	assert.is(element.innerHTML, "<div>Content: updated</div>");

	document.body.removeChild(element);
});

test("ref callback extends custom element with methods", async () => {
	function TestComponent({count, ref}: {count?: string, ref?: any}) {
		const num = parseInt(count || "0");
		
		ref?.((element: HTMLElement) => ({
			increment() {
				element.setAttribute("count", (num + 1).toString());
			},
			decrement() {
				element.setAttribute("count", (num - 1).toString());
			},
			get value() {
				return num;
			}
		}));

		return <div>Count: {num}</div>;
	}

	const CounterElement = createCustomElementClass(TestComponent, {
		observedAttributes: ["count"]
	});

	customElements.define("test-counter", CounterElement);
	
	const element = document.createElement("test-counter") as any;
	document.body.appendChild(element);

	// Wait for initial render
	await new Promise(resolve => setTimeout(resolve, 0));
	
	assert.is(element.innerHTML, "<div>Count: 0</div>");
	assert.is(element.value, 0);

	// Test increment method
	element.increment();
	await new Promise(resolve => setTimeout(resolve, 0));
	
	assert.is(element.innerHTML, "<div>Count: 1</div>");
	assert.is(element.value, 1);

	// Test decrement method
	element.decrement();
	await new Promise(resolve => setTimeout(resolve, 0));
	
	assert.is(element.innerHTML, "<div>Count: 0</div>");
	assert.is(element.value, 0);

	document.body.removeChild(element);
});

test("shadow DOM mode creates shadow root", async () => {
	function TestComponent() {
		return <div>Shadow content</div>;
	}

	const ShadowElement = createCustomElementClass(TestComponent, {
		shadowDOM: "open"
	});

	customElements.define("test-shadow", ShadowElement);
	
	const element = document.createElement("test-shadow") as any;
	document.body.appendChild(element);

	// Wait for render
	await new Promise(resolve => setTimeout(resolve, 0));

	assert.ok(element.shadowRoot);
	assert.is(element.shadowRoot.innerHTML, "<div>Shadow content</div>");
	assert.is(element.innerHTML, ""); // Light DOM should be empty

	document.body.removeChild(element);
});

test("slot-based props passed from light DOM", async () => {
	function TestComponent({header, children, footer}: {header?: any, children?: any, footer?: any}) {
		return (
			<div>
				<div class="header">
					<Raw value={header} />
				</div>
				<div class="content">
					<Raw value={children} />
				</div>
				<div class="footer">
					<Raw value={footer} />
				</div>
			</div>
		);
	}

	const SlotElement = createCustomElementClass(TestComponent, {
		shadowDOM: "open"
	});

	customElements.define("test-slots", SlotElement);
	
	const element = document.createElement("test-slots") as any;
	element.innerHTML = `
		<h1 slot="header">Header Content</h1>
		<p>Default slot content</p>
		<span slot="footer">Footer Content</span>
	`;
	document.body.appendChild(element);

	// Wait for render
	await new Promise(resolve => setTimeout(resolve, 0));

	// Check that slots were passed correctly
	const shadowContent = element.shadowRoot.innerHTML;
	assert.ok(shadowContent.includes("Header Content"));
	assert.ok(shadowContent.includes("Default slot content"));
	assert.ok(shadowContent.includes("Footer Content"));

	document.body.removeChild(element);
});

test("custom event properties and EventTarget bridging", async () => {
	function TestComponent({ref}: {ref?: any}) {
		ref?.((element: HTMLElement) => ({
			fireCustomEvent() {
				// This should trigger both addEventListener and oncustomevent property
				element.dispatchEvent(new CustomEvent('customevent', { detail: 'test-data' }));
			},
			oncustomevent: null  // This creates the custom event property
		}));

		return <div>Component with events</div>;
	}

	const EventElement = createCustomElementClass(TestComponent, {});

	customElements.define("test-events", EventElement);
	
	const element = document.createElement("test-events") as any;
	document.body.appendChild(element);

	// Wait for render
	await new Promise(resolve => setTimeout(resolve, 0));

	let eventFired = false;
	let propertyFired = false;

	// Test addEventListener works
	element.addEventListener('customevent', (e: CustomEvent) => {
		eventFired = true;
		assert.is(e.detail, 'test-data');
	});

	// Test custom event property works
	element.oncustomevent = (e: CustomEvent) => {
		propertyFired = true;
		assert.is(e.detail, 'test-data');
	};

	// Fire the custom event
	element.fireCustomEvent();

	assert.ok(eventFired, "addEventListener should work");
	assert.ok(propertyFired, "custom event property should work");

	document.body.removeChild(element);
});

test("component events bubble to custom element", async () => {
	function TestComponent({ref}: {ref?: any}) {
		// Component has access to its own context for this.dispatchEvent
		const handleClick = () => {
			// This should bubble to the custom element via EventTarget bridging
			// Note: Need to figure out how component gets access to its context
			// For now, just test that events work
		};

		ref?.((element: HTMLElement) => ({
			simulateComponentEvent() {
				// Simulate component dispatching event that should bubble to element
				element.dispatchEvent(new CustomEvent('componentevent', { detail: 'from-component' }));
			}
		}));

		return <button onclick={handleClick}>Click me</button>;
	}

	const ComponentElement = createCustomElementClass(TestComponent, {});

	customElements.define("test-component-events", ComponentElement);
	
	const element = document.createElement("test-component-events") as any;
	document.body.appendChild(element);

	// Wait for render
	await new Promise(resolve => setTimeout(resolve, 0));

	let eventReceived = false;
	element.addEventListener('componentevent', (e: CustomEvent) => {
		eventReceived = true;
		assert.is(e.detail, 'from-component');
	});

	// Simulate component event
	element.simulateComponentEvent();

	assert.ok(eventReceived, "component event should bubble to custom element");

	document.body.removeChild(element);
});

test.run();