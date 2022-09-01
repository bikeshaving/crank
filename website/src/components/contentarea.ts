import {xm} from "@b9g/crank";
import type {Context} from "@b9g/crank";
import type {
	ContentAreaElement,
	ContentEvent,
} from "@b9g/revise/contentarea.js";

interface SelectionRange {
	selectionStart: number;
	selectionEnd: number;
	selectionDirection: "forward" | "backward" | "none";
}

export function* ContentArea(
	this: Context,
	{
		value,
		children,
		selectionRange,
		renderSource,
		...rest
	}: {
		children: unknown;
		selectionRange?: SelectionRange | undefined;
		value?: string | undefined;
		renderSource?: string | undefined;
	} & Record<string, any>,
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
	for ({value, children, selectionRange, renderSource, ...rest} of this) {
		selectionRange =
			selectionRange ||
			(area && {
				selectionStart: area.selectionStart,
				selectionEnd: area.selectionEnd,
				selectionDirection: area.selectionDirection,
			});

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
				// TODO: Maybe we should allow setting selectionRange to value.length
				// and have that set the cursor to the last possible position in the
				// document, even if it usually happens after the end of a newline.
				area.setSelectionRange(
					Math.min(area.value.length - 1, selectionRange.selectionStart),
					Math.min(area.value.length - 1, selectionRange.selectionEnd),
					selectionRange.selectionDirection,
				);
			}
		});

		yield xm`
			<content-area
				...${rest}
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
