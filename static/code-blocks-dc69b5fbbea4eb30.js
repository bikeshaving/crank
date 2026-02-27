import {
  init_Buffer,
  init_process
} from "./chunk-Z5A3KT4W.js";

// src/clients/code-blocks.ts
init_Buffer();
init_process();
var containers = document.querySelectorAll(".code-block-container");
if (containers.length > 0) {
  Promise.all([
    import("./standalone-LE4PK7N4.js"),
    import("./dom-2KCSDALJ.js"),
    import("./contentarea-DRDBCSEW.js"),
    import("./inline-code-block-BWLZM3FG.js"),
    import("./serialize-javascript-GRMSCJET.js"),
    // Prism and components
    import("./prism-GAXZM3SR.js").then(async (Prism) => {
      window.Prism = window.Prism || {};
      Prism.default.manual = true;
      await Promise.all([
        import("./prism-javascript-OKHMDSIJ.js"),
        import("./prism-markup-NBMLY44R.js"),
        import("./prism-diff-6RLALL5R.js"),
        import("./prism-bash-PBFJQVBJ.js")
      ]);
      await Promise.all([
        import("./prism-jsx-6QFYC4O6.js"),
        import("./prism-typescript-YE3LYPYN.js")
      ]);
      await import("./prism-tsx-54YULGN7.js");
      return Prism;
    })
  ]).then(
    async ([
      { jsx },
      { renderer },
      { ContentAreaElement },
      { InlineCodeBlock },
      { extractData }
    ]) => {
      if (!window.customElements.get("content-area")) {
        window.customElements.define("content-area", ContentAreaElement);
      }
      for (const container of Array.from(containers)) {
        const propsScript = container.querySelector(
          ".props"
        );
        const { code, lang } = extractData(propsScript);
        renderer.hydrate(
          jsx`
					<${InlineCodeBlock}
						value=${code}
						lang=${lang}
						editable=${lang.endsWith(" live")}
					/>
				`,
          container
        );
      }
    }
  );
}
