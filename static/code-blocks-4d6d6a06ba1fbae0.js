import{h as r,i as n}from"./chunk-Z4NPT5MU.js";r();n();var i=document.querySelectorAll(".code-block-container");i.length>0&&Promise.all([import("./standalone-H6GMIPNQ.js"),import("./dom-7DVMU5CY.js"),import("./contentarea-DC3SSTV7.js"),import("./inline-code-block-ZL6QQZNV.js"),import("./serialize-javascript-C5PT4L6U.js"),import("./prism-47S7FVXY.js").then(async t=>(window.Prism=window.Prism||{},t.default.manual=!0,await Promise.all([import("./prism-javascript-ND5L2NVS.js"),import("./prism-jsx-2K2MVYK7.js"),import("./prism-typescript-G4I5LPB7.js"),import("./prism-tsx-ZNEQJXYE.js"),import("./prism-diff-7Y4U4L2D.js"),import("./prism-bash-O2NEGZLI.js")]),t))]).then(async([{jsx:t},{renderer:a},{ContentAreaElement:m},{InlineCodeBlock:s},{extractData:l}])=>{window.customElements.get("content-area")||window.customElements.define("content-area",m);for(let e of Array.from(i)){let c=e.querySelector(".props"),{code:p,lang:o,jsxVersion:d,templateVersion:u}=l(c);a.hydrate(t`
					<${s}
						value=${p}
						lang=${o}
						editable=${o.endsWith(" live")}
						jsxVersion=${d}
						templateVersion=${u}
					/>
				`,e)}});
