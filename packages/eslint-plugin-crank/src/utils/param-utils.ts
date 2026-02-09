import type {ESLintNode} from "./types";

export interface ExtractedParams {
	props: string[];
	contextVar: string | null;
}

/**
 * Extract parameters from function nodes, handling both Crank context patterns:
 * 1. function* Component(this: Context, { ...props })
 * 2. function* Component({ ...props }, ctx: Context)
 */
export function extractCrankParams(params: ESLintNode[]): ExtractedParams {
	const props: string[] = [];
	let contextVar: string | null = null;

	params.forEach((param, index) => {
		if (param.type === "TSParameterProperty") {
			// TypeScript parameter property (this: Context)
			if (
				param.parameter.type === "Identifier" &&
				param.parameter.name === "this"
			) {
				contextVar = "this";
			}
		} else if (index === 0 && param.type === "ObjectPattern") {
			// First parameter is props destructuring
			props.push(
				...(param.properties
					.map((prop: any) => {
						if (prop.type === "Property" && prop.key.type === "Identifier") {
							return prop.key.name;
						}
						return null;
					})
					.filter(Boolean) as string[]),
			);
		} else if (
			index === 0 &&
			param.type === "Identifier" &&
			param.name === "this"
		) {
			// First parameter is this context (this: Context)
			contextVar = "this";
		} else if (index === 1 && param.type === "ObjectPattern") {
			// Second parameter is props destructuring (when this is first)
			props.push(
				...(param.properties
					.map((prop: any) => {
						if (prop.type === "Property" && prop.key.type === "Identifier") {
							return prop.key.name;
						}
						return null;
					})
					.filter(Boolean) as string[]),
			);
		} else if (index === 1 && param.type === "Identifier" && !contextVar) {
			// Second parameter is context variable (ctx: Context) only if we don't already have one
			contextVar = param.name;
		} else if (param.type === "Identifier" && !contextVar) {
			// Single parameter case - only add to props if we don't have a context variable
			props.push(param.name);
		}
	});

	return {props, contextVar};
}
