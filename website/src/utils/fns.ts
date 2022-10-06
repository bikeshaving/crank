export function debounce(fn: Function, wait: number, immediate?: boolean) {
	let timeout: any = null;
	return function (this: unknown, ...args: Array<unknown>) {
		const later = () => {
			timeout = null;
			if (!immediate) {
				fn.apply(this, args);
			}
		};

		if (immediate && !timeout) {
			fn.apply(this, args);
		}

		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
	};
}
