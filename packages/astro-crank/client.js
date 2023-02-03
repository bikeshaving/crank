import {jsx, Raw} from "@b9g/crank/standalone";
import {renderer} from "@b9g/crank/dom";

export default (rootEl) =>
	async (Component, props, {default: children, ...slotted}, {client}) => {
		if (!rootEl.hasAttribute("ssr")) {
			return;
		}

		for (const [key, value] of Object.entries(slotted)) {
			props[key] = jsx`
			<${Raw} value=${value} $static />
		`;
		}

		if (children != null) {
			children = jsx`
			<${Raw} value=${children} $static />
		`;
		}

		if (client === "only") {
			return renderer.render(
				jsx`
				<${Component} ...${props}>
					${children}
				<//Component>
			`,
				rootEl,
			);
		}

		return renderer.hydrate(
			jsx`
			<${Component} ...${props}>
				${children}
			<//Component>
		`,
			rootEl,
		);
	};
