import{h as r,i as n}from"./chunk-TNNNJY3N.js";n();r();var i=document.querySelectorAll(".code-block-container");i.length>0&&Promise.all([import("./standalone-D4PRC7FF.js"),import("./dom-SKMU6GJC.js"),import("./contentarea-ANDPEZVX.js"),import("./inline-code-block-FLJKH2LW.js"),import("./serialize-javascript-7ACY7M7T.js"),import("./prism-3O5RH4AN.js").then(async t=>(window.Prism=window.Prism||{},t.default.manual=!0,await Promise.all([import("./prism-javascript-54TMRWCR.js"),import("./prism-jsx-GSQJSGYM.js"),import("./prism-typescript-XS6EKDGP.js"),import("./prism-tsx-EMD2S2MX.js"),import("./prism-diff-RKTBHS27.js"),import("./prism-bash-S3KUEMBR.js")]),t))]).then(async([{jsx:t},{renderer:a},{ContentAreaElement:m},{InlineCodeBlock:c},{extractData:l}])=>{window.customElements.get("content-area")||window.customElements.define("content-area",m);for(let o of Array.from(i)){let p=o.querySelector(".props"),{code:s,lang:e}=l(p);a.hydrate(t`
					<${c}
						value=${s}
						lang=${e}
						editable=${e.endsWith(" live")}
					/>
				`,o)}});
