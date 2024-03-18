// This file is provided for compatibility reasons with the JSX automatic
// runtime. Besides automatic imports, the JSX automatic runtime provides no
// actual advantage over the createElement transform.
import {createElement} from "./crank.js";

function jsxAdapter(tag: any, props: Record<string, any>, key: any) {
	// The new JSX transform extracts the key from props for performance reasons,
	// but key is not a special property in Crank.
	props.key = key;
	return createElement(tag, props);
}

export const Fragment = "";
export const jsx = jsxAdapter;
export const jsxs = jsxAdapter;
export const jsxDEV = jsxAdapter;
