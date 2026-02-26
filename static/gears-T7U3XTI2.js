import{a as x}from"./chunk-PO2FMWCS.js";import"./chunk-EC2DMSSJ.js";import"./chunk-5YGEZ7AS.js";function I(n){return n*180/Math.PI}function L(n){return n*Math.PI/180}function P([n,e],a){return[n*Math.cos(a)-e*Math.sin(a),n*Math.sin(a)+e*Math.cos(a)]}function W(n,e){return Math.sqrt(n**2-e**2)/e}function E(n,e){return[e*(Math.cos(n)+n*Math.sin(n)),e*(Math.sin(n)-n*Math.cos(n))]}function T(n,e){let a=Math.sqrt(n**2-e**2)/e,[s,r]=E(a,e);return Math.atan2(r,s)}function H(n,e,a){let s=n*e/2,r=s*Math.cos(a),c=s-n,i=s+n,t=2*Math.PI/e,d=T(i,r),o=[];for(let h=0,u=12,l=W(i,r);h<=u;h++){let f=l*h/u,[M,b]=E(f,r);o.push([M,b])}let $=t/2+T(s,r)*2;{let h=o.map(([u,l])=>(l=-l,[u,l]=P([u,l],$),[u,l])).reverse();o.push(...h)}o=o.map(([h,u])=>P([h,u],-$/2));let m=[];for(let h=0;h<=e;h++){let u=o.slice().map(([l,f])=>{let M=t*h;return P([l,f],M)}).map(([l,f])=>[Math.round(l*100)/100,Math.round(f*100)/100]);m.push(u)}return{path:m.map((h,u)=>h.map(([l,f],M)=>{if(u===0)return`M ${l} ${f}`;if(M===0){let b=e/2;return`A ${b} ${b} 0 0 0 ${l} ${f}`}return`L ${l} ${f}`}).join(" ")).join(" "),pitchRadius:s,baseRadius:r,dedRadius:c,addRadius:i,addAngle:d,toothAngle:t,mirrorAngle:$}}function*y({mod:n,toothCount:e,offset:a,mask:s,stroke:r,strokeWidth:c,fill:i,circleRadius:t}){let d=L(20),o,$=0,m=0,g,h;for({mod:n,toothCount:e,offset:a,mask:s,stroke:r,strokeWidth:c,fill:i,circleRadius:t}of this){(g!==n||h!==e)&&({path:o,dedRadius:$,toothAngle:m}=H(n,e,d),t=t??$-2*n,o+=`
			  M ${-t} 0
				a ${t} ${t} 0 1 0 ${t*2} 0
				a ${t} ${t} 0 1 0 ${-t*2} 0
			`);let u=a?0:-m/2;yield x`
			<path
				transform="rotate(${u*(180/Math.PI)})"
				d=${o}
				mask=${s}
				stroke=${r}
				stroke-width=${c}
				fill=${i}
			/>
		`,g=n,h=e}}function q({mod:n,height:e}){let a=L(20),s=[],r=n*Math.PI,c=r/4,i=Math.ceil(e/r)+1;for(let d=Math.floor(-i);d<=i;d++){let o=d*r;s.push([0,o],[2*n,o+2*n*Math.tan(a)],[2*n,o+c+2*n*Math.tan(a)],[0,o+c+4*n*Math.tan(a)])}let t=`M${s[0][0]} ${s[0][1]}`+s.slice(1).map(([d,o])=>`L ${d} ${o}`).join(" ");return x`
		<path d=${t} />
	`}function*D({}){var j;let n=0,e=0,a=0,s,r=2*Math.PI/480,c=()=>{if(typeof document<"u"){let p=document.scrollingElement;p&&(n=Math.max(0,Math.min(p.scrollHeight-p.clientHeight,p.scrollTop)))}},i=p=>{this.refresh(()=>{if(a){let A=(p-a)/1e3;e+=r*A}a=p}),s=requestAnimationFrame(i)};if(c(),typeof window<"u"){let p=()=>{this.refresh(()=>{c()})};window.addEventListener("scroll",p,{passive:!0}),this.cleanup(()=>{window.removeEventListener("scroll",p)}),s=requestAnimationFrame(i),this.cleanup(()=>{s!==void 0&&cancelAnimationFrame(s)})}let t=20,d=1/3,o=16,$=o*t/2,m=32,g=m*t/2,h=16,u=h*t/2,l=20,f=75,M=l+$+t,b=f+$+t,v=L(30),k=M+Math.cos(v)*($+g),R=b+Math.sin(v)*($+g),G=k+Math.cos(v)*(g+u),C=R+Math.sin(v)*(g+u);for({}of this){let p=k*2,A=typeof document<"u"&&((j=document.scrollingElement)==null?void 0:j.clientHeight)||1e3,w=-n*d/$+e,F=-w*$;yield x`
			<div style="
				position: fixed;
				top: 0;
				left: 0;
				width: 100vw;
				height: 100vh;
				z-index: -1;
			">
				<svg
					style="
						display: block;
						height: 100%;
						margin: 0 auto;
						position: relative;
						left: 1px;
					"
					stroke="#aaa"
					stroke-width="2"
					fill="none"
					width=${p}
				>
					<g
						style="
							transform: translate(
								${l}px,
								${f-F%(t*Math.PI)-t*Math.PI/2}px
							);
						"
					>
						<${q} mod=${t} height=${A} />
					</g>
					<g
						stroke="#9b7735"
						style="
							transform:
								translate(${M}px, ${b}px)
								rotate(${-I(w)}deg);
						"
					>
						<${y} mod=${t} toothCount=${o} />
					</g>
					<g
						style="
							transform:
								translate(${k}px, ${R}px)
								rotate(${I(w*o/m)}deg);
						"
					>
						<${y} mod=${t} toothCount=${m} offset />
					</g>
					<g
						stroke="#9b7735"
						style="
							transform: translate(${G}px, ${C}px)
							rotate(${-I(w*o/h)}deg);
						"
					>
						<${y} mod=${t} toothCount=${h} />
					</g>
					<!-- This last position is hard-coded because I just can't even -->
					<g
						style="
							transform: translate(${G+u-t+2}px, ${C+9+F%(t*Math.PI)}px);
						"
					>
						<${q} mod=${t} height=${A} />
					</g>
				</svg>
			</div>
		`}}function S({width:n=400,height:e=400}){let r=40*Math.PI/180,c=22,i=Math.round(110*Math.cos(r)*100)/100,t=Math.round(110*Math.sin(r)*100)/100,d=Math.round(60*Math.cos(r)*100)/100,o=Math.round(60*Math.sin(r)*100)/100,$=`
		M ${i} ${-t}
		L ${i+c} ${-t}
		L ${i+c} ${-t+c}
		L ${i} ${-t+c}
		A 110 110 0 1 0 ${i} ${t-c}
		L ${i+c} ${t-c}
		L ${i+c} ${t}
		L ${i} ${t}
		L ${d} ${o}
		A 60 60 0 1 1 ${d} ${-o}
		Z
	`;return x`
		<svg
			style="flex: none;"
			fill="none"
			viewBox="-200 -200 400 400"
			width=${n}
			height=${e}
			xmlns="http://www.w3.org/2000/svg"
		>
			<g
				stroke="none"
				fill="var(--highlight-color)"
			>
				<${y}
					mod=${20}
					toothCount=${16}
					offset=${1}
					stroke="none"
					strokeWidth="4"
					circleRadius=${110}
				/>
				<path d=${$} />
			</g>
		</svg>
	`}export{y as Gear,D as GearInteractive,S as GearLogo};
