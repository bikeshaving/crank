import {compile, match} from "path-to-regexp";
import type {MatchFunction, PathFunction} from "path-to-regexp";
import type {Component} from "@b9g/crank";

export interface ViewProps extends Record<string, unknown> {
	url: string;
	params: Record<string, string>;
	context: Record<string, unknown>;
}

export type ViewComponent = Component<ViewProps>;

export interface Route {
	name: string;
	view: ViewComponent;
	match: MatchFunction;
	reverse: PathFunction;
}

export interface RouteConfig {
	name: string;
	view: ViewComponent;
}

export function route(matcher: string, config: RouteConfig): Route {
	return {
		...config,
		match: match(matcher),
		reverse: compile(matcher),
	};
}

export interface Router {
	routes: Array<Route>;
}

export interface MatchResult {
	name: string;
	params: Record<string, unknown>;
	View: ViewComponent;
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
					View: route.view,
				};
			}
		}

		return null;
	}

	reverse(_result: MatchResult): string {
		throw new Error("TODO");
	}
}
