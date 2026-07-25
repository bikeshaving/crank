// The UMD build's entry: the browser global `window.Crank`. A `<script>` global
// only ever runs in the DOM, so `renderer` is pinned to the DOM renderer here.
export * from "./crank.js";
export {jsx, html} from "./jsx-tag.js";
export {renderer, renderer as domRenderer, DOMRenderer} from "./dom.js";
export {renderer as htmlRenderer, HTMLRenderer} from "./html.js";
