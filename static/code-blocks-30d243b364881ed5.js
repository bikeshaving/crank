import{e as r,f as i}from"./chunk-F46NCYQB.js";i();r();var n=document.querySelectorAll(".code-block-container");n.length>0&&Promise.all([import("./standalone-4QVTXEK7.js"),import("./dom-EFWUZLZT.js"),import("./contentarea-MIAXBICE.js"),import("./inline-code-block-QO4MP5KF.js"),import("./serialize-javascript-DJ5PF7MZ.js"),import("./prism-CAKEL7BD.js").then(async t=>(window.Prism=window.Prism||{},t.default.manual=!0,await Promise.all([import("./prism-javascript-E5GDOWAI.js"),import("./prism-markup-QXQBGQUV.js"),import("./prism-diff-SOK2AUUG.js"),import("./prism-bash-ZPNABFPW.js")]),await Promise.all([import("./prism-jsx-NKMNQTXN.js"),import("./prism-typescript-6NC2UCE5.js")]),await import("./prism-tsx-6FH4ANYL.js"),t))]).then(async([{jsx:t},{renderer:a},{ContentAreaElement:m},{InlineCodeBlock:l},{extractData:c}])=>{window.customElements.get("content-area")||window.customElements.define("content-area",m);for(let o of Array.from(n)){let p=o.querySelector(".props"),{code:s,lang:e}=c(p);a.hydrate(t`
					<${l}
						value=${s}
						lang=${e}
						editable=${e.endsWith(" live")}
					/>
				`,o)}});
