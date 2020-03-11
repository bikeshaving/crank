import highlight from "highlight.js";
import js from "highlight.js/lib/languages/javascript.js";
import ts from "highlight.js/lib/languages/typescript.js";
highlight.registerLanguage("jsx", js);
highlight.registerLanguage("tsx", ts);
highlight.initHighlightingOnLoad();
