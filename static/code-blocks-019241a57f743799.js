import{h as r,i as n}from"./chunk-Z4NPT5MU.js";r();n();var i=document.querySelectorAll(".code-block-container");i.length>0&&Promise.all([import("./standalone-2CMZYD2H.js"),import("./dom-CQOZG5WN.js"),import("./contentarea-DC3SSTV7.js"),import("./inline-code-block-KEEXB3E3.js"),import("./serialize-javascript-USX2M6Y7.js"),import("./prism-47S7FVXY.js").then(async t=>(window.Prism=window.Prism||{},t.default.manual=!0,await Promise.all([import("./prism-javascript-CX3AOF2W.js"),import("./prism-jsx-W2GUVTXA.js"),import("./prism-typescript-5YCRAYBY.js"),import("./prism-tsx-UK25TPPX.js"),import("./prism-diff-TVT6QAVG.js"),import("./prism-bash-K3C672E3.js")]),t))]).then(async([{jsx:t},{renderer:a},{ContentAreaElement:m},{InlineCodeBlock:c},{extractData:l}])=>{window.customElements.get("content-area")||window.customElements.define("content-area",m);for(let o of Array.from(i)){let p=o.querySelector(".props"),{code:s,lang:e}=l(p);a.hydrate(t`
					<${c}
						value=${s}
						lang=${e}
						editable=${e.endsWith(" live")}
					/>
				`,o)}});
