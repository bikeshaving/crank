import {renderer} from "@b9g/crank/dom";

function QuadraticFormula() {
	return (
		<div class="math-example">
			<h3>Quadratic Formula</h3>
			<p>The solution to ax² + bx + c = 0 is:</p>
			<math xmlns="http://www.w3.org/1998/Math/MathML">
				<mrow>
					<mi>x</mi>
					<mo>=</mo>
					<mfrac>
						<mrow>
							<mo>−</mo>
							<mi>b</mi>
							<mo>±</mo>
							<msqrt>
								<mrow>
									<msup>
										<mi>b</mi>
										<mn>2</mn>
									</msup>
									<mo>−</mo>
									<mn>4</mn>
									<mi>a</mi>
									<mi>c</mi>
								</mrow>
							</msqrt>
						</mrow>
						<mrow>
							<mn>2</mn>
							<mi>a</mi>
						</mrow>
					</mfrac>
				</mrow>
			</math>
		</div>
	);
}

function IntegralExample() {
	return (
		<div class="math-example">
			<h3>Definite Integral</h3>
			<p>The definite integral of f(x) from a to b:</p>
			<math xmlns="http://www.w3.org/1998/Math/MathML">
				<mrow>
					<msubsup>
						<mo>∫</mo>
						<mi>a</mi>
						<mi>b</mi>
					</msubsup>
					<mi>f</mi>
					<mo>(</mo>
					<mi>x</mi>
					<mo>)</mo>
					<mo>d</mo>
					<mi>x</mi>
					<mo>=</mo>
					<mi>F</mi>
					<mo>(</mo>
					<mi>b</mi>
					<mo>)</mo>
					<mo>−</mo>
					<mi>F</mi>
					<mo>(</mo>
					<mi>a</mi>
					<mo>)</mo>
				</mrow>
			</math>
		</div>
	);
}

function MatrixExample() {
	return (
		<div class="math-example">
			<h3>Matrix</h3>
			<p>A 2×2 matrix:</p>
			<math xmlns="http://www.w3.org/1998/Math/MathML">
				<mrow>
					<mi>A</mi>
					<mo>=</mo>
					<mfenced open="[" close="]">
						<mtable>
							<mtr>
								<mtd>
									<mi>a</mi>
								</mtd>
								<mtd>
									<mi>b</mi>
								</mtd>
							</mtr>
							<mtr>
								<mtd>
									<mi>c</mi>
								</mtd>
								<mtd>
									<mi>d</mi>
								</mtd>
							</mtr>
						</mtable>
					</mfenced>
				</mrow>
			</math>
		</div>
	);
}

function SummationExample() {
	return (
		<div class="math-example">
			<h3>Summation</h3>
			<p>Sum of squares from 1 to n:</p>
			<math xmlns="http://www.w3.org/1998/Math/MathML">
				<mrow>
					<munderover>
						<mo>∑</mo>
						<mrow>
							<mi>i</mi>
							<mo>=</mo>
							<mn>1</mn>
						</mrow>
						<mi>n</mi>
					</munderover>
					<msup>
						<mi>i</mi>
						<mn>2</mn>
					</msup>
					<mo>=</mo>
					<mfrac>
						<mrow>
							<mi>n</mi>
							<mo>(</mo>
							<mi>n</mi>
							<mo>+</mo>
							<mn>1</mn>
							<mo>)</mo>
							<mo>(</mo>
							<mn>2</mn>
							<mi>n</mi>
							<mo>+</mo>
							<mn>1</mn>
							<mo>)</mo>
						</mrow>
						<mn>6</mn>
					</mfrac>
				</mrow>
			</math>
		</div>
	);
}

const style = `
	body {
		font-family: Arial, sans-serif;
		max-width: 800px;
		margin: 0 auto;
		padding: 20px;
		line-height: 1.6;
	}
	.math-example {
		border: 1px solid #ddd;
		padding: 20px;
		margin: 20px 0;
		background: #f9f9f9;
		border-radius: 8px;
	}
	.math-example h3 {
		margin-top: 0;
		color: #333;
	}
	math {
		font-size: 1.2em;
	}
`;

const app = (
	<div>
		<style>{style}</style>
		<h1>Crank MathML Examples</h1>
		<p>
			This demonstrates MathML support in Crank.js using native MathML elements
			with proper namespace support.
		</p>
		<QuadraticFormula />
		<IntegralExample />
		<MatrixExample />
		<SummationExample />
		<div class="math-example">
			<h3>Browser Support</h3>
			<p>
				MathML is natively supported in Firefox, Safari, and Chrome 109+. Older
				browsers may require polyfills like MathJax.
			</p>
		</div>
	</div>
);

renderer.render(app, document.body);
