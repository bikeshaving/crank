import{h as i,i as a}from"./chunk-Z4NPT5MU.js";i();a();var m=document.querySelectorAll(".code-block-container"),o=document.getElementById("gear-interactive");(m.length>0||o)&&Promise.all([import("./standalone-H6GMIPNQ.js"),import("./dom-7DVMU5CY.js"),import("./contentarea-DC3SSTV7.js"),import("./inline-code-block-ZL6QQZNV.js"),import("./serialize-javascript-C5PT4L6U.js"),import("./prism-47S7FVXY.js").then(async t=>(window.Prism=window.Prism||{},t.default.manual=!0,await Promise.all([import("./prism-javascript-ND5L2NVS.js"),import("./prism-jsx-2K2MVYK7.js"),import("./prism-typescript-G4I5LPB7.js"),import("./prism-tsx-ZNEQJXYE.js"),import("./prism-diff-7Y4U4L2D.js"),import("./prism-bash-O2NEGZLI.js")]),t))]).then(async([{jsx:t},{renderer:r},{ContentAreaElement:c},{InlineCodeBlock:s},{extractData:l}])=>{window.customElements.get("content-area")||window.customElements.define("content-area",c);for(let e of Array.from(m)){let p=e.querySelector(".props"),{code:d,lang:n,jsxVersion:u,templateVersion:w}=l(p);r.hydrate(t`
					<${s}
						value=${d}
						lang=${n}
						editable=${n.endsWith(" live")}
						jsxVersion=${u}
						templateVersion=${w}
					/>
				`,e)}if(o){let{GearInteractive:e}=await import("./gear-interactive-XWV75LTZ.js");r.render(t`<${e} />`,o)}});
