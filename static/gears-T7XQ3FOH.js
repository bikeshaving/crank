import{a as x}from"./chunk-PO2FMWCS.js";import"./chunk-EC2DMSSJ.js";import"./chunk-5YGEZ7AS.js";function I(t){return t*180/Math.PI}function L(t){return t*Math.PI/180}function P([t,e],r){return[t*Math.cos(r)-e*Math.sin(r),t*Math.sin(r)+e*Math.cos(r)]}function W(t,e){return Math.sqrt(t**2-e**2)/e}function H(t,e){return[e*(Math.cos(t)+t*Math.sin(t)),e*(Math.sin(t)-t*Math.cos(t))]}function q(t,e){let r=Math.sqrt(t**2-e**2)/e,[s,h]=H(r,e);return Math.atan2(h,s)}function O(t,e,r){let s=t*e/2,h=s*Math.cos(r),p=s-t,u=s+t,n=2*Math.PI/e,m=q(u,h),o=[];for(let i=0,a=12,c=W(u,h);i<=a;i++){let f=c*i/a,[M,b]=H(f,h);o.push([M,b])}let l=n/2+q(s,h)*2;{let i=o.map(([a,c])=>(c=-c,[a,c]=P([a,c],l),[a,c])).reverse();o.push(...i)}o=o.map(([i,a])=>P([i,a],-l/2));let $=[];for(let i=0;i<=e;i++){let a=o.slice().map(([c,f])=>{let M=n*i;return P([c,f],M)}).map(([c,f])=>[Math.round(c*100)/100,Math.round(f*100)/100]);$.push(a)}return{path:$.map((i,a)=>i.map(([c,f],M)=>{if(a===0)return`M ${c} ${f}`;if(M===0){let b=e/2;return`A ${b} ${b} 0 0 0 ${c} ${f}`}return`L ${c} ${f}`}).join(" ")).join(" "),pitchRadius:s,baseRadius:h,dedRadius:p,addRadius:u,addAngle:m,toothAngle:n,mirrorAngle:l}}function*y({mod:t,toothCount:e,offset:r,mask:s,stroke:h,strokeWidth:p,fill:u,circleRadius:n}){let m=L(20),o,l=0,$=0,g,i;for({mod:t,toothCount:e,offset:r,mask:s,stroke:h,strokeWidth:p,fill:u,circleRadius:n}of this){(g!==t||i!==e)&&({path:o,dedRadius:l,toothAngle:$}=O(t,e,m),n=n??l-2*t,o+=`
			  M ${-n} 0
				a ${n} ${n} 0 1 0 ${n*2} 0
				a ${n} ${n} 0 1 0 ${-n*2} 0
			`);let a=r?0:-$/2;yield x`
			<path
				transform="rotate(${a*(180/Math.PI)})"
				d=${o}
				mask=${s}
				stroke=${h}
				stroke-width=${p}
				fill=${u}
			/>
		`,g=t,i=e}}function E({mod:t,height:e}){let r=L(20),s=[],h=t*Math.PI,p=h/4,u=Math.ceil(e/h)+1;for(let m=Math.floor(-u);m<=u;m++){let o=m*h;s.push([0,o],[2*t,o+2*t*Math.tan(r)],[2*t,o+p+2*t*Math.tan(r)],[0,o+p+4*t*Math.tan(r)])}let n=`M${s[0][0]} ${s[0][1]}`+s.slice(1).map(([m,o])=>`L ${m} ${o}`).join(" ");return x`
		<path d=${n} />
	`}function*S({}){var F;let t=0,e=0,r=0,s,h=2*Math.PI/480,p=()=>{if(typeof document<"u"){let d=document.scrollingElement;d&&(t=Math.max(0,Math.min(d.scrollHeight-d.clientHeight,d.scrollTop)))}},u=d=>{this.refresh(()=>{if(r){let w=(d-r)/1e3;e+=h*w}r=d}),s=requestAnimationFrame(u)};if(p(),typeof window<"u"){let d=()=>{this.refresh(()=>{p()})};window.addEventListener("scroll",d,{passive:!0}),this.cleanup(()=>{window.removeEventListener("scroll",d)}),s=requestAnimationFrame(u),this.cleanup(()=>{s!==void 0&&cancelAnimationFrame(s)})}let n=20,m=1/3,o=16,l=o*n/2,$=32,g=$*n/2,i=16,a=i*n/2,c=20,f=75,M=c+l+n,b=f+l+n,v=L(30),A=M+Math.cos(v)*(l+g),G=b+Math.sin(v)*(l+g),C=A+Math.cos(v)*(g+a),j=G+Math.sin(v)*(g+a);for({}of this){let d=A*2,w=typeof document<"u"&&((F=document.scrollingElement)==null?void 0:F.clientHeight)||1e3,k=-t*m/l+e,T=-k*l;yield x`
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
					width=${d}
				>
					<g
						style="
							transform: translate(
								${c}px,
								${f-T%(n*Math.PI)-n*Math.PI/2}px
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
						<${y} mod=${n} toothCount=${o} />
					</g>
					<g
						style="
							transform:
								translate(${A}px, ${G}px)
								rotate(${I(k*o/$)}deg);
						"
					>
						<${y} mod=${n} toothCount=${$} offset />
					</g>
					<g
						stroke="#9b7735"
						style="
							transform: translate(${C}px, ${j}px)
							rotate(${-I(k*o/i)}deg);
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
						<${E} mod=${n} height=${w} />
					</g>
				</svg>
			</div>
		`}}function X({width:t=400,height:e=400}){let s=35*Math.PI/180;return x`
		<svg
			style="flex: none;"
			fill="none"
			viewBox="-200 -200 400 400"
			width=${t}
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
				<circle cx="0" cy="0" r="60" stroke="none" />
				<path
					d="
						M 0 -28
						L 160 -30
						L 160 30
						L 0 28
						Z
					"
				/>
			</g>
		</svg>
	`}export{y as Gear,S as GearInteractive,X as GearLogo};
