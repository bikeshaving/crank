import {compile, match} from "path-to-regexp";
import type {MatchFunction, PathFunction} from "path-to-regexp";

export interface Route {
	name: string;
	match: MatchFunction;
	reverse: PathFunction;
}

export function route(
	matcher: string,
	name: string,
	// TODO: options?
): Route {
	return {
		name,
		match: match(matcher),
		reverse: compile(matcher),
	};
}

export interface Router {
	routes: Array<Route>;
}

export class Router {
	constructor(routes: Array<Route>) {
		this.routes = routes;
	}

	match(pathname: string): MatchResult | null {
		for (const route of this.routes) {
			const match = route.match(pathname);
			if (match) {
				return {
					name: route.name,
					params: match.params as Record<string, unknown>,
				};
			}
		}

		return null;
	}

	reverse(_result: MatchResult): string {
		throw new Error("TODO");
	}
}

export interface MatchResult {
	name: string;
	params: Record<string, unknown>;
}
