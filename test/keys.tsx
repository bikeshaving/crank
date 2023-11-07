import {suite} from "uvu";
import * as Assert from "uvu/assert";
import * as Sinon from "sinon";

import {createElement} from "../src/crank.js";
import type {Context} from "../src/crank.js";
import {renderer} from "../src/dom.js";

const test = suite("keys");

// TODO: write generative tests for this stuff
test.after.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
});

test("keys with no changes", () => {
	renderer.render(
		<div>
			<span crank-key="1">1</span>
			<span crank-key="2">2</span>
			<span crank-key="3">3</span>
			<span crank-key="4">4</span>
			<span crank-key="5">5</span>
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>",
	);
	renderer.render(
		<div>
			<span crank-key="1">1</span>
			<span crank-key="2">2</span>
			<span crank-key="3">3</span>
			<span crank-key="4">4</span>
			<span crank-key="5">5</span>
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>",
	);
});

test("no shared keys", () => {
	renderer.render(
		<div>
			<span crank-key="1">1</span>
			<span crank-key="2">2</span>
			<span crank-key="3">3</span>
			<span crank-key="4">4</span>
			<span crank-key="5">5</span>
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>",
	);
	const span1 = document.body.firstChild!.childNodes[0];
	const span2 = document.body.firstChild!.childNodes[1];
	const span3 = document.body.firstChild!.childNodes[2];
	const span4 = document.body.firstChild!.childNodes[3];
	const span5 = document.body.firstChild!.childNodes[4];
	renderer.render(
		<div>
			<span crank-key="6">6</span>
			<span crank-key="7">7</span>
			<span crank-key="8">8</span>
			<span crank-key="9">9</span>
			<span crank-key="10">10</span>
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><span>6</span><span>7</span><span>8</span><span>9</span><span>10</span></div>",
	);
	Assert.is.not(span1, document.body.firstChild!.childNodes[0]);
	Assert.is.not(span2, document.body.firstChild!.childNodes[1]);
	Assert.is.not(span3, document.body.firstChild!.childNodes[2]);
	Assert.is.not(span4, document.body.firstChild!.childNodes[3]);
	Assert.is.not(span5, document.body.firstChild!.childNodes[4]);
});

test("keyed child moves forward", () => {
	renderer.render(
		<div>
			<span crank-key="1">1</span>
			<span>2</span>
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>1</span><span>2</span></div>");
	const span1 = document.body.firstChild!.firstChild;
	renderer.render(
		<div>
			<span>0</span>
			<span crank-key="1">1</span>
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>0</span><span>1</span></div>");
	Assert.is(document.body.firstChild!.lastChild, span1);
});

test("keyed child moves backward", () => {
	renderer.render(
		<div>
			<span>1</span>
			<span crank-key="2">2</span>
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>1</span><span>2</span></div>");
	const span2 = document.body.firstChild!.lastChild;
	renderer.render(
		<div>
			<span crank-key="2">2</span>
			<span>3</span>
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>2</span><span>3</span></div>");
	Assert.is(document.body.firstChild!.firstChild, span2);
});

test("keyed child added between unkeyed children", () => {
	renderer.render(
		<div>
			<span>1</span>
			<span>3</span>
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>1</span><span>3</span></div>");
	const span3 = document.body.firstChild!.childNodes[1];
	renderer.render(
		<div>
			<span>1</span>
			<span crank-key="2">2</span>
			<span>3</span>
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><span>1</span><span>2</span><span>3</span></div>",
	);
	Assert.is(document.body.firstChild!.childNodes[2], span3);
});

test("keyed array", () => {
	const spans = [
		<span crank-key="2">2</span>,
		<span crank-key="3">3</span>,
		<span crank-key="4">4</span>,
	];
	renderer.render(
		<div>
			<span>1</span>
			{spans}
			<span>5</span>
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>",
	);
	const span1 = document.body.firstChild!.childNodes[0];
	const span2 = document.body.firstChild!.childNodes[1];
	const span3 = document.body.firstChild!.childNodes[2];
	const span4 = document.body.firstChild!.childNodes[3];
	const span5 = document.body.firstChild!.childNodes[4];
	spans.splice(1, 1);
	renderer.render(
		<div>
			<span>1</span>
			{spans}
			<span>5</span>
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><span>1</span><span>2</span><span>4</span><span>5</span></div>",
	);
	Assert.is(document.body.firstChild!.childNodes[0], span1);
	Assert.is(document.body.firstChild!.childNodes[1], span2);
	Assert.is(document.body.firstChild!.childNodes[2], span4);
	Assert.is(document.body.firstChild!.childNodes[3], span5);
	Assert.is(document.body.contains(span3), false);
});

test("reversed keyed array", () => {
	const spans = [
		<span crank-key="2">2</span>,
		<span crank-key="3">3</span>,
		<span crank-key="4">4</span>,
		<span crank-key="5">5</span>,
		<span crank-key="6">6</span>,
	];
	renderer.render(
		<div>
			<span>1</span>
			{spans}
			<span>7</span>
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span></div>",
	);
	const span1 = document.body.firstChild!.childNodes[0];
	const span2 = document.body.firstChild!.childNodes[1];
	const span3 = document.body.firstChild!.childNodes[2];
	const span4 = document.body.firstChild!.childNodes[3];
	const span5 = document.body.firstChild!.childNodes[4];
	const span6 = document.body.firstChild!.childNodes[5];
	const span7 = document.body.firstChild!.childNodes[6];
	spans.reverse();
	renderer.render(
		<div>
			<span>1</span>
			{spans}
			<span>7</span>
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><span>1</span><span>6</span><span>5</span><span>4</span><span>3</span><span>2</span><span>7</span></div>",
	);
	renderer.render(
		<div>
			<span>1</span>
			{spans}
			<span>7</span>
		</div>,
		document.body,
	);
	Assert.is(document.body.firstChild!.childNodes[0], span1);
	Assert.is(document.body.firstChild!.childNodes[1], span6);
	Assert.is(document.body.firstChild!.childNodes[2], span5);
	Assert.is(document.body.firstChild!.childNodes[3], span4);
	Assert.is(document.body.firstChild!.childNodes[4], span3);
	Assert.is(document.body.firstChild!.childNodes[5], span2);
	Assert.is(document.body.firstChild!.childNodes[6], span7);
	spans.reverse();
	renderer.render(
		<div>
			<span>1</span>
			{spans}
			<span>7</span>
		</div>,
		document.body,
	);
	Assert.is(document.body.firstChild!.childNodes[0], span1);
	Assert.is(document.body.firstChild!.childNodes[1], span2);
	Assert.is(document.body.firstChild!.childNodes[2], span3);
	Assert.is(document.body.firstChild!.childNodes[3], span4);
	Assert.is(document.body.firstChild!.childNodes[4], span5);
	Assert.is(document.body.firstChild!.childNodes[5], span6);
	Assert.is(document.body.firstChild!.childNodes[6], span7);
});

test("keyed child added", () => {
	renderer.render(
		<div>
			<span crank-key="2">2</span>
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>2</span></div>");
	const span2 = document.body.firstChild!.lastChild;
	renderer.render(
		<div>
			<span crank-key="1">1</span>
			<span crank-key="2">2</span>
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>1</span><span>2</span></div>");
	Assert.is(document.body.firstChild!.lastChild, span2);
});

test("unkeyed replaced with keyed", () => {
	renderer.render(
		<div>
			<span>x</span>
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>x</span></div>");
	let span = document.body.firstChild!.firstChild;
	renderer.render(
		<div>
			<span crank-key="1">1</span>
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>1</span></div>");
	Assert.is.not(document.body.firstChild!.firstChild, span);
	span = document.body.firstChild!.firstChild;
	renderer.render(
		<div>
			<span>x</span>
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>x</span></div>");
	Assert.is.not(document.body.firstChild!.firstChild, span);
});

test("text and unkeyed and keyed children", () => {
	renderer.render(
		<div>
			<span>Hello</span>
			...
			<span crank-key="world">World</span>
			...
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><span>Hello</span>...<span>World</span>...</div>",
	);
	const world = document.body.firstChild!.childNodes[2];
	Assert.is((world as any).outerHTML, "<span>World</span>");
	renderer.render(
		<div>
			...
			<span crank-key="world">World</span>
			...
			<span>Hello</span>
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div>...<span>World</span>...<span>Hello</span></div>",
	);
	Assert.is(document.body.firstChild!.childNodes[1], world);
	renderer.render(
		<div>
			...
			<span>Hello</span>
			<span crank-key="world">World</span>
			...
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div>...<span>Hello</span><span>World</span>...</div>",
	);
	Assert.is(document.body.firstChild!.childNodes[2], world);
});

test("keyed children added before removed unkeyed child", () => {
	renderer.render(
		<div>
			<div crank-key="1">1</div>
			<span>2</span>
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><div>1</div><span>2</span></div>");
	renderer.render(
		<div>
			<span crank-key="1">1</span>
			<span crank-key="2">2</span>
			<span crank-key="3">3</span>
			<span crank-key="4">4</span>
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><span>1</span><span>2</span><span>3</span><span>4</span></div>",
	);
});

test("same key, different tag", () => {
	renderer.render(
		<div>
			<span>0</span>
			<span crank-key="1">1</span>
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>0</span><span>1</span></div>");
	renderer.render(
		<div>
			<div crank-key="1">1</div>
			<span>2</span>
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><div>1</div><span>2</span></div>");
});

test("same key, different tag 2", () => {
	renderer.render(
		<div>
			<span>0</span>
			<span crank-key="1">1</span>
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>0</span><span>1</span></div>");
	renderer.render(
		<div>
			<div crank-key="1">1</div>
			<span>0</span>
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><div>1</div><span>0</span></div>");
	renderer.render(
		<div>
			<span>0</span>
			<span crank-key="1">1</span>
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>0</span><span>1</span></div>");
	renderer.render(
		<div>
			<div crank-key="1">1</div>
			<span>0</span>
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><div>1</div><span>0</span></div>");
});

test("unkeyed elements added in random spots", () => {
	renderer.render(
		<div>
			<span crank-key="1">1</span>
			<span crank-key="2">2</span>
			<span crank-key="3">3</span>
			<span crank-key="4">4</span>
		</div>,
		document.body,
	);
	const span1 = document.body.firstChild!.childNodes[0];
	const span2 = document.body.firstChild!.childNodes[1];
	const span3 = document.body.firstChild!.childNodes[2];
	const span4 = document.body.firstChild!.childNodes[3];
	Assert.is(
		document.body.innerHTML,
		"<div><span>1</span><span>2</span><span>3</span><span>4</span></div>",
	);
	renderer.render(
		<div>
			<span>0.5</span>
			<span crank-key="1">1</span>
			<span>1.5</span>
			<span crank-key="2">2</span>
			<span>2.5</span>
			<span crank-key="3">3</span>
			<span>3.5</span>
			<span crank-key="4">4</span>
			<span>4.5</span>
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><span>0.5</span><span>1</span><span>1.5</span><span>2</span><span>2.5</span><span>3</span><span>3.5</span><span>4</span><span>4.5</span></div>",
	);
	Assert.is(span1, document.body.firstChild!.childNodes[1]);
	Assert.is(span2, document.body.firstChild!.childNodes[3]);
	Assert.is(span3, document.body.firstChild!.childNodes[5]);
	Assert.is(span4, document.body.firstChild!.childNodes[7]);
	renderer.render(
		<div>
			<span crank-key="1">1</span>
			<span crank-key="2">2</span>
			<span crank-key="3">3</span>
			<span crank-key="4">4</span>
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><span>1</span><span>2</span><span>3</span><span>4</span></div>",
	);
	Assert.is(span1, document.body.firstChild!.childNodes[0]);
	Assert.is(span2, document.body.firstChild!.childNodes[1]);
	Assert.is(span3, document.body.firstChild!.childNodes[2]);
	Assert.is(span4, document.body.firstChild!.childNodes[3]);
});

test("moving a keyed item backwards", () => {
	renderer.render(
		<div>
			<span crank-key="1">1</span>
			<span crank-key="2">2</span>
			<span crank-key="3">3</span>
			<span crank-key="4">4</span>
			<span crank-key="5">5</span>
			<span crank-key="6">6</span>
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span></div>",
	);
	const span1 = document.body.firstChild!.childNodes[0];
	const span2 = document.body.firstChild!.childNodes[1];
	const span3 = document.body.firstChild!.childNodes[2];
	const span4 = document.body.firstChild!.childNodes[3];
	const span5 = document.body.firstChild!.childNodes[4];
	const span6 = document.body.firstChild!.childNodes[5];
	renderer.render(
		<div>
			<span crank-key="1">1</span>
			<span crank-key="5">5</span>
			<span crank-key="2">2</span>
			<span crank-key="3">3</span>
			<span crank-key="4">4</span>
			<span crank-key="6">6</span>
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><span>1</span><span>5</span><span>2</span><span>3</span><span>4</span><span>6</span></div>",
	);
	Assert.is(span1, document.body.firstChild!.childNodes[0]);
	Assert.is(span2, document.body.firstChild!.childNodes[2]);
	Assert.is(span3, document.body.firstChild!.childNodes[3]);
	Assert.is(span4, document.body.firstChild!.childNodes[4]);
	Assert.is(span5, document.body.firstChild!.childNodes[1]);
	Assert.is(span6, document.body.firstChild!.childNodes[5]);
	renderer.render(
		<div>
			<span crank-key="1">1</span>
			<span crank-key="2">2</span>
			<span crank-key="3">3</span>
			<span crank-key="4">4</span>
			<span crank-key="5">5</span>
			<span crank-key="6">6</span>
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span></div>",
	);
	Assert.is(span1, document.body.firstChild!.childNodes[0]);
	Assert.is(span2, document.body.firstChild!.childNodes[1]);
	Assert.is(span3, document.body.firstChild!.childNodes[2]);
	Assert.is(span4, document.body.firstChild!.childNodes[3]);
	Assert.is(span5, document.body.firstChild!.childNodes[4]);
	Assert.is(span6, document.body.firstChild!.childNodes[5]);
});

test("moving a keyed item forwards", () => {
	renderer.render(
		<div>
			<span crank-key="1">1</span>
			<span crank-key="2">2</span>
			<span crank-key="3">3</span>
			<span crank-key="4">4</span>
			<span crank-key="5">5</span>
			<span crank-key="6">6</span>
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span></div>",
	);
	const span1 = document.body.firstChild!.childNodes[0];
	const span2 = document.body.firstChild!.childNodes[1];
	const span3 = document.body.firstChild!.childNodes[2];
	const span4 = document.body.firstChild!.childNodes[3];
	const span5 = document.body.firstChild!.childNodes[4];
	const span6 = document.body.firstChild!.childNodes[5];
	renderer.render(
		<div>
			<span crank-key="1">1</span>
			<span crank-key="3">3</span>
			<span crank-key="4">4</span>
			<span crank-key="5">5</span>
			<span crank-key="2">2</span>
			<span crank-key="6">6</span>
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><span>1</span><span>3</span><span>4</span><span>5</span><span>2</span><span>6</span></div>",
	);
	Assert.is(span1, document.body.firstChild!.childNodes[0]);
	Assert.is(span2, document.body.firstChild!.childNodes[4]);
	Assert.is(span3, document.body.firstChild!.childNodes[1]);
	Assert.is(span4, document.body.firstChild!.childNodes[2]);
	Assert.is(span5, document.body.firstChild!.childNodes[3]);
	Assert.is(span6, document.body.firstChild!.childNodes[5]);
	renderer.render(
		<div>
			<span crank-key="1">1</span>
			<span crank-key="2">2</span>
			<span crank-key="3">3</span>
			<span crank-key="4">4</span>
			<span crank-key="5">5</span>
			<span crank-key="6">6</span>
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span></div>",
	);
	Assert.is(span1, document.body.firstChild!.childNodes[0]);
	Assert.is(span2, document.body.firstChild!.childNodes[1]);
	Assert.is(span3, document.body.firstChild!.childNodes[2]);
	Assert.is(span4, document.body.firstChild!.childNodes[3]);
	Assert.is(span5, document.body.firstChild!.childNodes[4]);
	Assert.is(span6, document.body.firstChild!.childNodes[5]);
});
test("swapping two keyed rows", () => {
	renderer.render(
		<div>
			<span crank-key="1">1</span>
			<span crank-key="2">2</span>
			<span crank-key="3">3</span>
			<span crank-key="4">4</span>
			<span crank-key="5">5</span>
			<span crank-key="6">6</span>
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span></div>",
	);
	const span1 = document.body.firstChild!.childNodes[0];
	const span2 = document.body.firstChild!.childNodes[1];
	const span3 = document.body.firstChild!.childNodes[2];
	const span4 = document.body.firstChild!.childNodes[3];
	const span5 = document.body.firstChild!.childNodes[4];
	const span6 = document.body.firstChild!.childNodes[5];
	renderer.render(
		<div>
			<span crank-key="1">1</span>
			<span crank-key="5">5</span>
			<span crank-key="3">3</span>
			<span crank-key="4">4</span>
			<span crank-key="2">2</span>
			<span crank-key="6">6</span>
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><span>1</span><span>5</span><span>3</span><span>4</span><span>2</span><span>6</span></div>",
	);
	Assert.is(span1, document.body.firstChild!.childNodes[0]);
	Assert.is(span2, document.body.firstChild!.childNodes[4]);
	Assert.is(span3, document.body.firstChild!.childNodes[2]);
	Assert.is(span4, document.body.firstChild!.childNodes[3]);
	Assert.is(span5, document.body.firstChild!.childNodes[1]);
	Assert.is(span6, document.body.firstChild!.childNodes[5]);
	renderer.render(
		<div>
			<span crank-key="1">1</span>
			<span crank-key="2">2</span>
			<span crank-key="3">3</span>
			<span crank-key="4">4</span>
			<span crank-key="5">5</span>
			<span crank-key="6">6</span>
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span></div>",
	);
	Assert.is(span1, document.body.firstChild!.childNodes[0]);
	Assert.is(span2, document.body.firstChild!.childNodes[1]);
	Assert.is(span3, document.body.firstChild!.childNodes[2]);
	Assert.is(span4, document.body.firstChild!.childNodes[3]);
	Assert.is(span5, document.body.firstChild!.childNodes[4]);
	Assert.is(span6, document.body.firstChild!.childNodes[5]);
});

test("duplicate keys", () => {
	const mock = Sinon.stub(console, "error");
	try {
		renderer.render(
			<div>
				<span crank-key="1">1</span>
				<span crank-key="1">2</span>
				<span crank-key="1">3</span>
			</div>,
			document.body,
		);
		Assert.is(
			document.body.innerHTML,
			"<div><span>1</span><span>2</span><span>3</span></div>",
		);

		Assert.is(mock.callCount, 2);
		renderer.render(
			<div>
				<span crank-key="2">1</span>
				<span crank-key="1">2</span>
				<span crank-key="2">3</span>
			</div>,
			document.body,
		);
		Assert.is(
			document.body.innerHTML,
			"<div><span>1</span><span>2</span><span>3</span></div>",
		);

		Assert.is(mock.callCount, 3);
	} finally {
		mock.restore();
	}
});

// https://github.com/bikeshaving/crank/issues/267
test("component unmounts with key", () => {
	const fn = Sinon.fake();
	function *Component(this: Context) {
		this.cleanup(() => {
			fn();
		});
		for ({} of this) {
			yield <div>Hello</div>;
		}

		fn();
	}

	renderer.render(
		<div>
			<Component crank-key="1" />
		</div>,
		document.body,
	);
	renderer.render(
		<div>{null}</div>,
		document.body,
	);

	Assert.is(fn.callCount, 2);
});

test.run();
