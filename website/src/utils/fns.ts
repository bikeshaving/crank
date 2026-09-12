export function debounce(
	fn: (...args: unknown[]) => unknown,
	wait: number,
	immediate?: boolean,
): (...args: unknown[]) => void {
	let timeout: any = null;
	return function (this: unknown, ...args: unknown[]) {
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
