import{a as x}from"./chunk-PO2FMWCS.js";import"./chunk-EC2DMSSJ.js";import"./chunk-5YGEZ7AS.js";function I(t){return t*180/Math.PI}function L(t){return t*Math.PI/180}function P([t,e],r){return[t*Math.cos(r)-e*Math.sin(r),t*Math.sin(r)+e*Math.cos(r)]}function W(t,e){return Math.sqrt(t**2-e**2)/e}function H(t,e){return[e*(Math.cos(t)+t*Math.sin(t)),e*(Math.sin(t)-t*Math.cos(t))]}function q(t,e){let r=Math.sqrt(t**2-e**2)/e,[o,a]=H(r,e);return Math.atan2(a,o)}function O(t,e,r){let o=t*e/2,a=o*Math.cos(r),p=o-t,u=o+t,n=2*Math.PI/e,m=q(u,a),s=[];for(let i=0,c=12,h=W(u,a);i<=c;i++){let d=h*i/c,[M,b]=H(d,a);s.push([M,b])}let l=n/2+q(o,a)*2;{let i=s.map(([c,h])=>(h=-h,[c,h]=P([c,h],l),[c,h])).reverse();s.push(...i)}s=s.map(([i,c])=>P([i,c],-l/2));let $=[];for(let i=0;i<=e;i++){let c=s.slice().map(([h,d])=>{let M=n*i;return P([h,d],M)}).map(([h,d])=>[Math.round(h*100)/100,Math.round(d*100)/100]);$.push(c)}return{path:$.map((i,c)=>i.map(([h,d],M)=>{if(c===0)return`M ${h} ${d}`;if(M===0){let b=e/2;return`A ${b} ${b} 0 0 0 ${h} ${d}`}return`L ${h} ${d}`}).join(" ")).join(" "),pitchRadius:o,baseRadius:a,dedRadius:p,addRadius:u,addAngle:m,toothAngle:n,mirrorAngle:l}}function*y({mod:t,toothCount:e,offset:r,mask:o,stroke:a,strokeWidth:p,fill:u,circleRadius:n}){let m=L(20),s,l=0,$=0,g,i;for({mod:t,toothCount:e,offset:r,mask:o,stroke:a,strokeWidth:p,fill:u,circleRadius:n}of this){(g!==t||i!==e)&&({path:s,dedRadius:l,toothAngle:$}=O(t,e,m),n=n??l-2*t,s+=`
			  M ${-n} 0
				a ${n} ${n} 0 1 0 ${n*2} 0
				a ${n} ${n} 0 1 0 ${-n*2} 0
			`);let c=r?0:-$/2;yield x`
			<path
				transform="rotate(${c*(180/Math.PI)})"
				d=${s}
				mask=${o}
				stroke=${a}
				stroke-width=${p}
				fill=${u}
			/>
		`,g=t,i=e}}function E({mod:t,height:e}){let r=L(20),o=[],a=t*Math.PI,p=a/4,u=Math.ceil(e/a)+1;for(let m=Math.floor(-u);m<=u;m++){let s=m*a;o.push([0,s],[2*t,s+2*t*Math.tan(r)],[2*t,s+p+2*t*Math.tan(r)],[0,s+p+4*t*Math.tan(r)])}let n=`M${o[0][0]} ${o[0][1]}`+o.slice(1).map(([m,s])=>`L ${m} ${s}`).join(" ");return x`
		<path d=${n} />
	`}function*S({}){var F;let t=0,e=0,r=0,o,a=2*Math.PI/480,p=()=>{if(typeof document<"u"){let f=document.scrollingElement;f&&(t=Math.max(0,Math.min(f.scrollHeight-f.clientHeight,f.scrollTop)))}},u=f=>{this.refresh(()=>{if(r){let w=(f-r)/1e3;e+=a*w}r=f}),o=requestAnimationFrame(u)};if(p(),typeof window<"u"){let f=()=>{this.refresh(()=>{p()})};window.addEventListener("scroll",f,{passive:!0}),this.cleanup(()=>{window.removeEventListener("scroll",f)}),o=requestAnimationFrame(u),this.cleanup(()=>{o!==void 0&&cancelAnimationFrame(o)})}let n=20,m=1/3,s=16,l=s*n/2,$=32,g=$*n/2,i=16,c=i*n/2,h=20,d=75,M=h+l+n,b=d+l+n,v=L(30),A=M+Math.cos(v)*(l+g),G=b+Math.sin(v)*(l+g),C=A+Math.cos(v)*(g+c),j=G+Math.sin(v)*(g+c);for({}of this){let f=A*2,w=typeof document<"u"&&((F=document.scrollingElement)==null?void 0:F.clientHeight)||1e3,k=-t*m/l+e,T=-k*l;yield x`
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
						<${E} mod=${n} height=${w} />
					</g>
					<g
						stroke="#9b7735"
						style="
							transform:
								translate(${M}px, ${b}px)
								rotate(${-I(k)}deg);
						"
					>
						<${y} mod=${n} toothCount=${s} />
					</g>
					<g
						style="
							transform:
								translate(${A}px, ${G}px)
								rotate(${I(k*s/$)}deg);
						"
					>
						<${y} mod=${n} toothCount=${$} offset />
					</g>
					<g
						stroke="#9b7735"
						style="
							transform: translate(${C}px, ${j}px)
							rotate(${-I(k*s/i)}deg);
						"
					>
						<${y} mod=${n} toothCount=${i} />
					</g>
					<!-- This last position is hard-coded because I just can't even -->
					<g
						style="
							transform: translate(${C+c-n+2}px, ${j+9+T%(n*Math.PI)}px);
						"
					>
						<${E} mod=${n} height=${w} />
					</g>
				</svg>
			</div>
		`}}function X({width:t=400,height:e=400,color:r="var(--highlight-color)",background:o}){let a=o?`flex: none; background-color: ${o};`:"flex: none;";return x`
		<svg
			style=${a}
			fill="none"
			viewBox="-200 -200 400 400"
			width=${t}
			height=${e}
			xmlns="http://www.w3.org/2000/svg"
		>
			<g
				stroke="none"
				fill=${r}
			>
				<${y}
					mod=${20}
					toothCount=${16}
					offset=${1}
					stroke="none"
					strokeWidth="4"
					circleRadius=${110}
				/>
				<circle cx="0" cy="0" r="60" stroke="none" />
				<path
					d="
						M 0 -25
						L 120 -20
						L 120 20
						L 0 25
						Z
					"
				/>
			</g>
		</svg>
	`}export{y as Gear,S as GearInteractive,X as GearLogo};
