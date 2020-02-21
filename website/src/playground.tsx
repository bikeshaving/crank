/** @jsx createElement */
import {Context, createElement, Fragment} from "@bikeshaving/crank";
import {renderer} from "@bikeshaving/crank/dom";
import CodeMirror from "codemirror";
import * as Babel from "@babel/standalone";
import "codemirror/lib/codemirror.css";
import "./index.css";

export function* Editor(this: Context, {value}: {value: string}) {
	setTimeout(() => this.refresh());
	const el = yield (<div />);
	const cm = CodeMirror(el, {
		value,
		tabSize: 2,
		indentWithTabs: true,
		lineNumbers: true,
	});
	cm.on("change", (cm, change) => {
		if (change.origin !== "setValue") {
			value = cm.getValue();
			this.dispatchEvent(
				new CustomEvent("codemirror.change", {bubbles: true, detail: {value}}),
			);
		}
	});

	for (const {value: newValue} of this) {
		if (value !== newValue) {
			cm.setValue(newValue);
		}

		yield (<div class="editor" />);
	}
}

const babelOptions = {
	plugins: [
		[
			"transform-react-jsx",
			{
				pragma: "createElement",
				pragmaFrag: "Fragment",
			},
		],
	],
	presets: [
		[
			"typescript",
			{
				isTSX: true,
				jsxPragma: "createElement",
				allExtensions: true,
			},
		],
	],
};

async function* Preview(this: Context) {
	for await (let {id, code} of this) {
		try {
			yield (<div id={id} class="preview" />);
			// TODO: resume async generators only after parent has committed or something
			await new Promise((resolve) => setTimeout(resolve, 0));
			code = (Babel.transform(code, babelOptions) as any).code;
			const fn = new Function(
				...["createElement", "renderer", "Fragment"],
				code,
			);
			fn(createElement, renderer, Fragment);
		} catch (err) {
			yield (
				<div id={id} class="preview preview-error">
					<code>
						<pre>{err.message}</pre>
					</code>
				</div>
			);
		}
	}
}

const helloCode = `
function Hello ({name}) {
	return (
		<div>Hello {name}</div>
	);
}

renderer.render(<Hello name="Andrew" />, document.getElementById("hello-world-demo"));
`.trim();

const timerCode = `
function *Timer () {
	let seconds = 0;
	const interval = setInterval(() => {
		seconds++;
		this.refresh();
	}, 1000);

	try {
		while (true) {
			yield <div>Seconds: {seconds}</div>;
		}
	} finally {
		clearInterval(interval);
	}
}

renderer.render(<Timer />, document.getElementById("timer-demo"));
`.trim();

const ipCode = `
async function IPAddress () {
	const res = await fetch("https://api.ipify.org");
	const address = await res.text();
	return <div>Your IP Address: {address}</div>;
}

renderer.render(<IPAddress />, document.getElementById("ip-address-demo"));
`.trim();

const todoCode = `
function *TodoApp () {
	const items = [];
	let text = "";
	this.addEventListener("input", (ev) => {
		text = ev.target.value;
		this.refresh();
	});

	this.addEventListener("submit", (ev) => {
		ev.preventDefault();
		if (!text.length) {
			return;
		}

		items.push({text, id: Date.now()});
		text = "";
		this.refresh();
	});

	while (true) {
		yield (
			<div>
				<h3>TODO</h3>
				<TodoList items={items} />
				<form>
					<label for="new-todo">What needs to be done?</label>
					<input id="new-todo" value={text} />
					<button>Add #{items.length + 1}</button>
				</form>
			</div>
		);
	}
}

function TodoList ({items}) {
	return (
		<ul>
			{items.map((item) => <li crank-key={item.id}>{item.text}</li>)}
		</ul>
	);
}

renderer.render(<TodoApp />, document.getElementById("todo-demo"));
`.trim();

const loadingCode = `
async function RandomDogImage ({throttle=false}) {
	if (throttle) {
		await new Promise((resolve) => setTimeout(resolve, 2000));
	}

	const res = await fetch("https://dog.ceo/api/breeds/image/random");
	console.log(res.ok);
	const data = await res.json();
	return (
		<a href={data.message}>
			<img src={data.message} width="250" />
		</a>
	);
}

async function Fallback ({wait = 1000, children}) {
	await new Promise((resolve) => setTimeout(resolve, wait));
	return <Fragment>{children}</Fragment>;
}

async function *Suspense ({fallback, children}) {
	for await ({fallback, children} of this) {
		yield <Fallback>{fallback}</Fallback>;
		yield <Fragment>{children}</Fragment>;
	}
}

function *App () {
	let throttle = false;
	this.addEventListener("click", (ev) => {
		if (ev.target.tagName === "BUTTON") {
			throttle = !throttle;
			this.refresh();
		}
	});

	while (true) {
		yield (
			<Fragment>
				<button>Fetch a new dog</button>
				<Suspense fallback={<div>Fetching a good boy…</div>}>
					<RandomDogImage throttle={throttle} />
				</Suspense>
			</Fragment>
		);
	}
}

renderer.render(<App />, document.getElementById("loading-demo"));
`.trim();

function* Playground(this: Context, {code = "", id = "playground"}) {
	this.addEventListener("codemirror.change", (ev: any) => {
		code = ev.detail.value;
		this.refresh();
	});

	while (true) {
		yield (
			<div class="playground">
				<Editor value={code} />
				<Preview id={id} code={code} />
			</div>
		);
	}
}

function Hero() {
	return (
		<div>
			<h1>Crank.js</h1>
			<p>JSX-based components with functions, generators and promises.</p>
		</div>
	);
}

export function Page() {
	return (
		<Fragment>
			<Hero />
			<Playground id="hello-world-demo" code={helloCode} />
			<Playground id="timer-demo" code={timerCode} />
			<Playground id="ip-address-demo" code={ipCode} />
			<Playground id="todo-demo" code={todoCode} />
			<Playground id="loading-demo" code={loadingCode} />
		</Fragment>
	);
}

//renderer.render(<Page />, document.body.firstElementChild!);
