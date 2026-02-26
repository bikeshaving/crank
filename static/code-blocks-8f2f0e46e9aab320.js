import{i as r,j as n}from"./chunk-MF7YEODA.js";r();n();var i=document.querySelectorAll(".code-block-container");i.length>0&&Promise.all([import("./standalone-OKA4TUIJ.js"),import("./dom-46O6W4JJ.js"),import("./contentarea-CTBLLNDI.js"),import("./inline-code-block-6M6LROL4.js"),import("./serialize-javascript-FMDZ3QI3.js"),import("./prism-VWFMUYYE.js").then(async t=>(window.Prism=window.Prism||{},t.default.manual=!0,await Promise.all([import("./prism-javascript-I6J5JYWE.js"),import("./prism-jsx-IABJ46YK.js"),import("./prism-typescript-QQKV4BNW.js"),import("./prism-tsx-RE3GC7WS.js"),import("./prism-diff-4EFTUM4I.js"),import("./prism-bash-LG46JHL2.js")]),t))]).then(async([{jsx:t},{renderer:a},{ContentAreaElement:m},{InlineCodeBlock:c},{extractData:l}])=>{window.customElements.get("content-area")||window.customElements.define("content-area",m);for(let o of Array.from(i)){let p=o.querySelector(".props"),{code:s,lang:e}=l(p);a.hydrate(t`
					<${c}
						value=${s}
						lang=${e}
						editable=${e.endsWith(" live")}
					/>
				`,o)}});
