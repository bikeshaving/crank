import {
  init_Buffer,
  init_process
} from "./chunk-Z5A3KT4W.js";

// node_modules/prismjs/components/prism-tsx.js
init_Buffer();
init_process();
(function(Prism2) {
  var typescript = Prism2.util.clone(Prism2.languages.typescript);
  Prism2.languages.tsx = Prism2.languages.extend("jsx", typescript);
  delete Prism2.languages.tsx["parameter"];
  delete Prism2.languages.tsx["literal-property"];
  var tag = Prism2.languages.tsx.tag;
  tag.pattern = RegExp(/(^|[^\w$]|(?=<\/))/.source + "(?:" + tag.pattern.source + ")", tag.pattern.flags);
  tag.lookbehind = true;
})(Prism);
