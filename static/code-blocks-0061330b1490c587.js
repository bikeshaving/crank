import {
  init_Buffer,
  init_process
} from "./chunk-HNZBFXQU.js";

// src/clients/code-blocks.ts
init_Buffer();
init_process();
var containers = document.querySelectorAll(".code-block-container");
if (containers.length > 0) {
  Promise.all([
    import("./standalone-AUVUKEHZ.js"),
    import("./dom-SOY2XISH.js"),
    import("./contentarea-ZFSSLMQJ.js"),
    import("./inline-code-block-D6QM2L7E.js"),
    import("./serialize-javascript-W22TYOSU.js"),
    // Prism and components
    import("./prism-3HLJ3EQR.js").then(async (Prism) => {
      window.Prism = window.Prism || {};
      Prism.default.manual = true;
      await Promise.all([
        import("./prism-javascript-CSWAHDVH.js"),
        import("./prism-markup-PL4NCHTQ.js"),
        import("./prism-diff-D2PCW5CU.js"),
        import("./prism-bash-YKWPJOKZ.js")
      ]);
      await Promise.all([
        import("./prism-jsx-UIXZWPEH.js"),
        import("./prism-typescript-PVRRMZYY.js")
      ]);
      await import("./prism-tsx-N6SNOD7K.js");
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
