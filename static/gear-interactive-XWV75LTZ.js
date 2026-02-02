import{a as x}from"./chunk-5RZJXTAA.js";import"./chunk-G7MAJUHR.js";import{h as q,i as E}from"./chunk-Z4NPT5MU.js";q();E();function I(t){return t*180/Math.PI}function L(t){return t*Math.PI/180}function P([t,e],r){return[t*Math.cos(r)-e*Math.sin(r),t*Math.sin(r)+e*Math.cos(r)]}function O(t,e){return Math.sqrt(t**2-e**2)/e}function z(t,e){return[e*(Math.cos(t)+t*Math.sin(t)),e*(Math.sin(t)-t*Math.cos(t))]}function H(t,e){let r=Math.sqrt(t**2-e**2)/e,[o,c]=z(r,e);return Math.atan2(c,o)}function B(t,e,r){let o=t*e/2,c=o*Math.cos(r),p=o-t,u=o+t,n=2*Math.PI/e,m=H(u,c),s=[];for(let i=0,a=12,h=O(u,c);i<=a;i++){let d=h*i/a,[M,b]=z(d,c);s.push([M,b])}let l=n/2+H(o,c)*2;{let i=s.map(([a,h])=>(h=-h,[a,h]=P([a,h],l),[a,h])).reverse();s.push(...i)}s=s.map(([i,a])=>P([i,a],-l/2));let $=[];for(let i=0;i<=e;i++){let a=s.slice().map(([h,d])=>{let M=n*i;return P([h,d],M)}).map(([h,d])=>[Math.round(h*100)/100,Math.round(d*100)/100]);$.push(a)}return{path:$.map((i,a)=>i.map(([h,d],M)=>{if(a===0)return`M ${h} ${d}`;if(M===0){let b=e/2;return`A ${b} ${b} 0 0 0 ${h} ${d}`}return`L ${h} ${d}`}).join(" ")).join(" "),pitchRadius:o,baseRadius:c,dedRadius:p,addRadius:u,addAngle:m,toothAngle:n,mirrorAngle:l}}function*y({mod:t,toothCount:e,offset:r,mask:o,stroke:c,strokeWidth:p,fill:u,circleRadius:n}){let m=L(20),s,l=0,$=0,g,i;for({mod:t,toothCount:e,offset:r,mask:o,stroke:c,strokeWidth:p,fill:u,circleRadius:n}of this){(g!==t||i!==e)&&({path:s,dedRadius:l,toothAngle:$}=B(t,e,m),n=n??l-2*t,s+=`
			  M ${-n} 0
				a ${n} ${n} 0 1 0 ${n*2} 0
				a ${n} ${n} 0 1 0 ${-n*2} 0
			`);let a=r?0:-$/2;yield x`
			<path
				transform="rotate(${a*(180/Math.PI)})"
				d=${s}
				mask=${o}
				stroke=${c}
				stroke-width=${p}
				fill=${u}
			/>
		`,g=t,i=e}}function W({mod:t,height:e}){let r=L(20),o=[],c=t*Math.PI,p=c/4,u=Math.ceil(e/c)+1;for(let m=Math.floor(-u);m<=u;m++){let s=m*c;o.push([0,s],[2*t,s+2*t*Math.tan(r)],[2*t,s+p+2*t*Math.tan(r)],[0,s+p+4*t*Math.tan(r)])}let n=`M${o[0][0]} ${o[0][1]}`+o.slice(1).map(([m,s])=>`L ${m} ${s}`).join(" ");return x`
		<path d=${n} />
	`}function*Y({}){var F;let t=0,e=0,r=0,o,c=2*Math.PI/480,p=()=>{if(typeof document<"u"){let f=document.scrollingElement;f&&(t=Math.max(0,Math.min(f.scrollHeight-f.clientHeight,f.scrollTop)))}},u=f=>{if(r){let v=(f-r)/1e3;e+=c*v}r=f,this.refresh(),o=requestAnimationFrame(u)};if(p(),typeof window<"u"){let f=()=>{p(),this.refresh()};window.addEventListener("scroll",f,{passive:!0}),this.cleanup(()=>{window.removeEventListener("scroll",f)}),o=requestAnimationFrame(u),this.cleanup(()=>{o!==void 0&&cancelAnimationFrame(o)})}let n=20,m=1/3,s=16,l=s*n/2,$=32,g=$*n/2,i=16,a=i*n/2,h=20,d=75,M=h+l+n,b=d+l+n,k=L(30),A=M+Math.cos(k)*(l+g),G=b+Math.sin(k)*(l+g),C=A+Math.cos(k)*(g+a),j=G+Math.sin(k)*(g+a);for({}of this){let f=A*2,v=typeof document<"u"&&((F=document.scrollingElement)==null?void 0:F.clientHeight)||1e3,w=-t*m/l+e,T=-w*l;yield x`
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
					width=${f}
				>
					<g
						style="
							transform: translate(
								${h}px,
								${d-T%(n*Math.PI)-n*Math.PI/2}px
							);
						"
					>
						<${W} mod=${n} height=${v} />
					</g>
					<g
						stroke="#9b7735"
						style="
							transform:
								translate(${M}px, ${b}px)
								rotate(${-I(w)}deg);
						"
					>
						<${y} mod=${n} toothCount=${s} />
					</g>
					<g
						style="
							transform:
								translate(${A}px, ${G}px)
								rotate(${I(w*s/$)}deg);
						"
					>
						<${y} mod=${n} toothCount=${$} offset />
					</g>
					<g
						stroke="#9b7735"
						style="
							transform: translate(${C}px, ${j}px)
							rotate(${-I(w*s/i)}deg);
						"
					>
						<${y} mod=${n} toothCount=${i} />
					</g>
					<!-- This last position is hard-coded because I just can't even -->
					<g
						style="
							transform: translate(${C+a-n+2}px, ${j+9+T%(n*Math.PI)}px);
						"
					>
						<${W} mod=${n} height=${v} />
					</g>
				</svg>
			</div>
		`}}function Z({width:t=400,height:e=400}){let o=35*Math.PI/180;return x`
		<svg
			style="flex: none;"
			fill="none"
			viewBox="-200 -200 400 400"
			width=${t}
			height=${e}
			xmlns="http://www.w3.org/2000/svg"
		>
			<defs>
				<mask id="wedge-mask">
					<rect x="-200" y="-200" width="400" height="400" fill="white" />
					<path
						stroke="none"
						fill="black"
						d="
							M 0 0
							L ${Math.cos(o)*300} ${Math.sin(o)*300}
							L ${Math.cos(o)*300} ${-Math.sin(o)*300}
							z
						"
					/>
				</mask>
			</defs>
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
					mask="url(#wedge-mask)"
					circleRadius=${110}
				/>
				<circle cx="0" cy="0" r="60" stroke="none" />
				<path
					d="
						M 0 -28
						L 160 -14
						L 160 14
						L 0 28
						Z
					"
				/>
			</g>
		</svg>
	`}export{y as Gear,Y as GearInteractive,Z as GearLogo};
