import {jsx} from "@b9g/crank/standalone";
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
		ref,
		value,
		children,
		selectionRange,
		renderSource,
		...rest
	}: {
		ref?: (el: ContentAreaElement) => void;
		children: unknown;
		selectionRange?: SelectionRange | undefined;
		value?: string | undefined;
		renderSource?: string | undefined;
	} & Record<string, any>,
) {
	let initial = true;
	let contentArea!: ContentAreaElement;
	for ({ref, value, children, selectionRange, renderSource, ...rest} of this) {
		selectionRange =
			selectionRange ||
			(contentArea && {
				selectionStart: contentArea.selectionStart,
				selectionEnd: contentArea.selectionEnd,
				selectionDirection: contentArea.selectionDirection,
			});

		if (!initial) {
			this.after(() => {
				if (typeof renderSource === "string") {
					contentArea.source(renderSource!);
				}

				if (typeof value === "string" && value !== contentArea.value) {
					console.error(
						`Expected value ${JSON.stringify(
							value,
						)} but received ${JSON.stringify(contentArea.value)} from the DOM`,
					);
				}

				if (contentArea.contains(document.activeElement) && selectionRange) {
					// This must be done synchronously after rendering.
					// TODO: Maybe we should allow setting selectionRange to value.length
					// and have that set the cursor to the last possible position in the
					// document, even if it usually happens after the end of a newline.
					contentArea.setSelectionRange(
						Math.min(
							contentArea.value.length - 1,
							selectionRange.selectionStart,
						),
						Math.min(contentArea.value.length - 1, selectionRange.selectionEnd),
						selectionRange.selectionDirection,
					);
				}

				const selection = document.getSelection();
				if (
					selection &&
					// TODO: think more about using renderSource
					renderSource !== "refresh" &&
					contentArea.contains(document.activeElement) &&
					contentArea.contains(selection.focusNode)
				) {
					let focusNode = selection.focusNode! as Element;
					if (focusNode && focusNode.nodeType === Node.TEXT_NODE) {
						focusNode = focusNode.parentNode as Element;
					}

					const rect = focusNode.getBoundingClientRect();
					if (rect.top < 0 || rect.bottom > window.innerHeight) {
						// TODO: we need a way to skip this call for certain renderSources
						focusNode.scrollIntoView({block: "nearest"});
					}
				}
			});
		}

		yield jsx`
			<content-area
				ref=${(el: ContentAreaElement) => {
					contentArea = el;
					ref?.(el);
				}}
				...${rest}
			>${children}</content-area>
		`;

		initial = false;
	}
}

declare global {
	module Crank {
		interface EventMap {
			contentchange: ContentEvent;
		}
	}
}
