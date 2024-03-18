import {jsx, Raw} from "@b9g/crank/standalone";
import type {Context} from "@b9g/crank/standalone";
import serializeJavascript from "serialize-javascript";

let nextID = 0;
export function* SerializeScript(
	this: Context,
	{name, value, ...scriptProps}: any,
): any {
	const id = nextID++;
	for ({name, value} of this) {
		name = `${name || "embedded-json"}-${id}`;
		const code = `
			if (window.__embeddedJSON__ == null) {
				window.__embeddedJSON__ = {};
			}
			window.__embeddedJSON__['${name}'] = ${serializeJavascript(value)};
		`;

		yield jsx`
			<script data-name=${name} ...${scriptProps}>
				<${Raw} value=${code} />
			</script>
		`;
	}
}

export function extractData(script: HTMLScriptElement): any {
	const name = script.dataset.name;
	if (name == null) {
		throw new Error("script element is missing data-name attribute");
	}

	return (window as any).__embeddedJSON__[name];
}

// TODO: Add an interface to strongly type the data by name.
