/** @jsx createElement */
import {createElement} from "@b9g/crank/crank.js";
import type {Context} from "@b9g/crank/crank.js";
import type {
	ContentAreaElement,
	SelectionRange,
} from "@b9g/revise/contentarea.js";

export interface ContentAreaProps {
	children: unknown;
	selectionRange?: SelectionRange | undefined;
	value?: string | undefined;
	renderSource?: string | undefined;
}

export function* ContentArea(
	this: Context<ContentAreaProps>,
	{value, children, selectionRange, renderSource}: ContentAreaProps,
) {
	let composing = false;
	this.addEventListener("compositionstart", () => {
		composing = true;
	});

	this.addEventListener("compositionend", () => {
		composing = false;
		// Refreshing synchronously seems to cause weird effects with
		// characters getting preserved in Korean (and probably other
		// languages).
		Promise.resolve().then(() => this.refresh());
	});

	let oldSelectionRange: SelectionRange | undefined;
	for ({
		value,
		children,
		selectionRange = oldSelectionRange,
		renderSource,
	} of this) {
		this.schedule((area) => {
			if (typeof renderSource === "string") {
				area.source(renderSource);
			}

			//if (typeof value === "string" && value !== area.value) {
			//	console.error(
			//		`Expected value ${JSON.stringify(
			//			value,
			//		)} but received ${JSON.stringify(area.value)} from the DOM`,
			//	);
			//}

			if (selectionRange) {
				area.setSelectionRange(
					selectionRange.selectionStart,
					selectionRange.selectionEnd,
					selectionRange.selectionDirection,
				);
			}
		});

		const area: ContentAreaElement = yield (
			<content-area c-static={composing}>{children}</content-area>
		);

		oldSelectionRange = area.getSelectionRange();
	}
}

declare global {
	module Crank {
		interface EventMap {
			contentchange: ContentEvent;
		}
	}
}
