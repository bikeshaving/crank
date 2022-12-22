import {
	elementScroll,
	observeElementRect,
	observeElementOffset,
	PartialKeys,
	Virtualizer,
	VirtualizerOptions,
} from "@tanstack/virtual-core";
export * from "@tanstack/virtual-core";
import type {Context} from "@b9g/crank/core.js";

function useVirtualizerBase<
	TScrollElement extends Element | Window,
	TItemElement extends Element,
>(
	_this: Context,
	options: VirtualizerOptions<TScrollElement, TItemElement>,
): Virtualizer<TScrollElement, TItemElement> {
	const virtualizer = new Virtualizer(options);
	let unmount: any;

	_this.flush(() => {
		unmount = virtualizer._didMount();
	});

	_this.cleanup(() => {
		unmount && unmount();
	});

	const afterUpdate = () => {
		virtualizer._willUpdate();
		// TODO: Is this necessary?
		_this.flush(afterUpdate);
	};

	_this.flush(afterUpdate);

	return virtualizer;
}

export function useVirtualizer<TItemElement extends Element>(
	_this: Context,
	options: PartialKeys<
		VirtualizerOptions<Element, TItemElement>,
		"observeElementOffset" | "observeElementRect" | "scrollToFn"
	>,
): Virtualizer<Element, TItemElement> {
	return useVirtualizerBase(_this, {
		observeElementOffset,
		observeElementRect,
		scrollToFn: elementScroll,
		...options,
	});
}

// TODO: useWindowVirtualizer
