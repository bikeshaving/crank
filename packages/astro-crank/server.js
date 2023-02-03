import {jsx, Raw} from "@b9g/crank/standalone";
import {renderer} from "@b9g/crank/html";

const slotName = (str) =>
	str.trim().replace(/[-_]([a-z])/g, (_, w) => w.toUpperCase());

function check(Component) {
	return typeof Component === "function";
}

async function renderToStaticMarkup(
	Component,
	props,
	{default: children, ...slotted},
) {
	const slots = {};
	for (const [key, value] of Object.entries(slotted)) {
		const name = slotName(key);
		slots[name] = jsx`
			<${Raw} value=${value.toString()} />
		`;
	}

	const attrs = {...props, ...slots};
	const html = await renderer.render(jsx`
		<${Component} ...${attrs}>
			${children && jsx`<${Raw} value=${children.toString()} />`}
		<//Component>
	`);

	return {attrs, html};
}

export default {
	check,
	renderToStaticMarkup,
};
