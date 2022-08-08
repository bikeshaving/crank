import {xm} from "@b9g/crank";
import type {Context} from "@b9g/crank";
import type {
	ContentAreaElement,
	ContentEvent,
	SelectionRange,
} from "@b9g/revise/contentarea.js";

export function* ContentArea(
	this: Context,
	{
		value,
		children,
		selectionRange,
		renderSource,
	}: {
		children: unknown;
		selectionRange?: SelectionRange | undefined;
		value?: string | undefined;
		renderSource?: string | undefined;
	},
) {
	let composing = false;
	this.addEventListener("compositionstart", () => {
		composing = true;
	});

	this.addEventListener("compositionend", () => {
		composing = false;
		// Refreshing synchronously seems to cause weird effects with characters
		// getting preserved in Korean (and probably other langauges).
		Promise.resolve().then(() => this.refresh());
	});

	//let edit: any;
	//this.addEventListener("contentchange", (ev: any) => {
	//	edit = ev.detail.edit;
	//});

	let area!: ContentAreaElement;
	for ({value, children, selectionRange, renderSource} of this) {
		selectionRange =
			selectionRange ||
			(area && {
				selectionStart: area.selectionStart,
				selectionEnd: area.selectionEnd,
				selectionDirection: area.selectionDirection,
			});

		//if (selectionRange?.selectionEnd !== (value?.length || 0) - 1) {
		//	debugger;
		//}
		let time = Date.now();
		while (Date.now() < time + 40);
		this.flush(() => {
			if (typeof renderSource === "string") {
				area.source(renderSource!);
			}

			if (typeof value === "string" && value !== area.value) {
				console.error(
					`Expected value ${JSON.stringify(
						value,
					)} but received ${JSON.stringify(area.value)} from the DOM`,
				);
			}

			if (selectionRange) {
				// This must be done synchronously after rendering.
				area.setSelectionRange(
					selectionRange.selectionStart,
					selectionRange.selectionEnd,
					selectionRange.selectionDirection,
				);
			}
		});

		yield xm`
			<content-area
				$ref=${(el: ContentAreaElement) => (area = el)}
				$static=${composing}
			>${children}</content-area>
		`;
	}
}

declare global {
	module Crank {
		interface EventMap {
			contentchange: ContentEvent;
		}
	}
}
