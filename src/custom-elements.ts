import { Component, Context, Children } from "./crank.js";
import { DOMRenderer, renderer } from "./dom.js";
import { addEventTargetDelegates, removeEventTargetDelegates } from "./event-target.js";

/**
 * Options for creating a Custom Element class from a Crank component
 */
export interface CreateCustomElementOptions<TProps extends Record<string, any>> {
	/**
	 * Attributes to observe for changes (triggers re-render when changed)
	 */
	observedAttributes?: string[];
	
	/**
	 * Shadow DOM mode: 'open', 'closed', or false for light DOM
	 * @default false (light DOM)
	 */
	shadowDOM?: 'open' | 'closed' | false;
	
	/**
	 * Custom renderer instance
	 * @default renderer (default DOM renderer)
	 */
	renderer?: DOMRenderer;
}

/**
 * API object that can be returned from the ref callback to extend the custom element
 */
export type RefAPI = Record<string, any>;

/**
 * Convert kebab-case to camelCase
 */
function kebabToCamelCase(str: string): string {
	return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Apply ref API object to custom element with proper this binding
 */
function applyRefAPI(element: HTMLElement, api: RefAPI): void {
	if (!api || typeof api !== 'object') return;

	Object.getOwnPropertyNames(api).forEach(name => {
		const descriptor = Object.getOwnPropertyDescriptor(api, name);
		if (!descriptor) return;

		if (descriptor.get || descriptor.set) {
			// Handle getters and setters with proper this binding
			Object.defineProperty(element, name, {
				get: descriptor.get?.bind(element),
				set: descriptor.set?.bind(element),
				configurable: true,
				enumerable: true
			});
		} else if (typeof descriptor.value === 'function') {
			// Handle methods with proper this binding
			(element as any)[name] = descriptor.value.bind(element);
		} else {
			// Handle regular properties
			(element as any)[name] = descriptor.value;
		}
	});
}

/**
 * Creates a Custom Element class from a Crank component
 */
export function createCustomElementClass<TProps extends Record<string, any>>(
	component: Component<TProps & { 
		ref?: (apiFactory: (element: HTMLElement) => RefAPI) => void;
		children?: Node[];
		[slotName: string]: any; // Allow any slot names as props
	}>,
	options: CreateCustomElementOptions<TProps> = {}
): CustomElementConstructor {
	const {
		observedAttributes = [],
		shadowDOM = false,
		renderer: customRenderer = renderer
	} = options;

	class CrankCustomElement extends HTMLElement {
		private _props: Partial<TProps> = {};
		private _updateScheduled = false;
		private _renderRoot: Element | ShadowRoot;
		private _slots: Record<string, Array<Node>> = {};
		private _refAPI: RefAPI = {};

		static get observedAttributes(): string[] {
			return observedAttributes;
		}

		constructor() {
			super();

			// Set up render root (shadow DOM or light DOM)
			if (shadowDOM) {
				this._renderRoot = this.attachShadow({ mode: shadowDOM });
			} else {
				this._renderRoot = this;
			}
		}

		connectedCallback(): void {
			// Parse light DOM children into slots
			if (shadowDOM) {
				this._parseSlots();
			}
			this._scheduleUpdate();
		}

		disconnectedCallback(): void {
			// Clean up everything by rendering null
			customRenderer.render(null, this._renderRoot);
		}

		// Override dispatchEvent to call matching on* properties
		dispatchEvent(event: Event): boolean {
			// Call standard DOM dispatchEvent first
			const result = super.dispatchEvent(event);
			
			// Check for matching on* property and call it
			const handlerName = 'on' + event.type.toLowerCase();
			if (this.hasOwnProperty(handlerName) && typeof (this as any)[handlerName] === 'function') {
				(this as any)[handlerName](event);
			}
			
			return result;
		}

		attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
			if (oldValue === newValue) return;
			
			// Store the raw attribute value - let component handle conversion
			this._props[name as keyof TProps] = newValue as any;
			this._scheduleUpdate();
		}

		private _parseSlots(): void {
			this._slots = {};
			Array.from(this.childNodes).forEach(node => {
				// Get slot name from slot attribute (for elements) or use 'children' as default
				let slotName = 'children';
				if (node.nodeType === Node.ELEMENT_NODE) {
					const slotAttr = (node as Element).getAttribute('slot');
					if (slotAttr) {
						slotName = slotAttr;
					}
				}
				
				if (!this._slots[slotName]) {
					this._slots[slotName] = [];
				}
				this._slots[slotName].push(node);
			});
		}

		private _scheduleUpdate(): void {
			if (!this._updateScheduled) {
				this._updateScheduled = true;
				queueMicrotask(() => {
					this._updateScheduled = false;
					this._render();
				});
			}
		}

		private _render(): void {
			// Collect current attributes as props
			const props: any = { ...this._props };
			
			// Add slots as individual props
			if (shadowDOM) {
				Object.assign(props, this._slots);
			}

			// Add ref callback - component will call this with a function that takes an element
			props.ref = (apiFactory: (element: HTMLElement) => RefAPI) => {
				// Component calls ref with a function, we call that function with this element
				const api = apiFactory(this);
				this._refAPI = api;
				applyRefAPI(this, api);
			};

			try {
				// Create component result - component will call ref() during execution  
				const context = {} as Context<TProps & { ref?: (apiFactory: (element: HTMLElement) => RefAPI) => void }>;
				const componentResult = component.call(context, props, context);
				
				// Render the component normally
				const result = customRenderer.render(
					componentResult as Children,
					this._renderRoot
				);
				
				// Bridge component EventTarget to custom element
				const retainer = customRenderer.cache.get(this._renderRoot);
				if (retainer && retainer.ctx) {
					// Access delegates using the same symbol
					const _delegates = Symbol.for("CustomEventTarget.delegates");
					const delegatesSet = (retainer.ctx as any)[_delegates];
					
					// Clear existing child delegates
					if (delegatesSet && delegatesSet.size > 0) {
						const existingDelegates = Array.from(delegatesSet);
						removeEventTargetDelegates(retainer.ctx as any, existingDelegates);
					}
					
					// Add custom element as delegate
					addEventTargetDelegates(retainer.ctx as any, [this]);
				}
				
				// Handle async rendering
				if (result && typeof (result as any).then === 'function') {
					(result as Promise<any>).catch((error: Error) => {
						console.error('Error in async render:', error);
					});
				}
			} catch (error) {
				console.error('Error rendering Crank component in custom element:', error);
			}
		}
	}

	return CrankCustomElement as any;
}