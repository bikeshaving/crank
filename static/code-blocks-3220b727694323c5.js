import{h as r,i as n}from"./chunk-Z4NPT5MU.js";r();n();var i=document.querySelectorAll(".code-block-container");i.length>0&&Promise.all([import("./standalone-2CMZYD2H.js"),import("./dom-CQOZG5WN.js"),import("./contentarea-DC3SSTV7.js"),import("./inline-code-block-QNQKJEGG.js"),import("./serialize-javascript-USX2M6Y7.js"),import("./prism-47S7FVXY.js").then(async t=>(window.Prism=window.Prism||{},t.default.manual=!0,await Promise.all([import("./prism-javascript-ND5L2NVS.js"),import("./prism-jsx-2K2MVYK7.js"),import("./prism-typescript-G4I5LPB7.js"),import("./prism-tsx-ZNEQJXYE.js"),import("./prism-diff-7Y4U4L2D.js"),import("./prism-bash-O2NEGZLI.js")]),t))]).then(async([{jsx:t},{renderer:a},{ContentAreaElement:m},{InlineCodeBlock:c},{extractData:l}])=>{window.customElements.get("content-area")||window.customElements.define("content-area",m);for(let o of Array.from(i)){let p=o.querySelector(".props"),{code:s,lang:e}=l(p);a.hydrate(t`
					<${c}
						value=${s}
						lang=${e}
						editable=${e.endsWith(" live")}
					/>
				`,o)}});
