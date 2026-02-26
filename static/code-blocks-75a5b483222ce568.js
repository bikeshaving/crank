import{h as r,i}from"./chunk-Z4NPT5MU.js";r();i();var n=document.querySelectorAll(".code-block-container");n.length>0&&Promise.all([import("./standalone-E6ZDWCTD.js"),import("./dom-BB4QSQDU.js"),import("./contentarea-DC3SSTV7.js"),import("./inline-code-block-TQIJZQ2T.js"),import("./serialize-javascript-CY73OHD6.js"),import("./prism-47S7FVXY.js").then(async t=>(window.Prism=window.Prism||{},t.default.manual=!0,await Promise.all([import("./prism-javascript-ND5L2NVS.js"),import("./prism-diff-7Y4U4L2D.js"),import("./prism-bash-O2NEGZLI.js")]),await Promise.all([import("./prism-jsx-2K2MVYK7.js"),import("./prism-typescript-G4I5LPB7.js")]),await import("./prism-tsx-ZNEQJXYE.js"),t))]).then(async([{jsx:t},{renderer:a},{ContentAreaElement:m},{InlineCodeBlock:l},{extractData:c}])=>{window.customElements.get("content-area")||window.customElements.define("content-area",m);for(let o of Array.from(n)){let s=o.querySelector(".props"),{code:p,lang:e}=c(s);a.hydrate(t`
					<${l}
						value=${p}
						lang=${e}
						editable=${e.endsWith(" live")}
					/>
				`,o)}});
