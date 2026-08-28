import {describe, test, beforeEach, afterEach, expect} from "@b9g/libuild/test";
import * as Sinon from "sinon";

import {createElement, Fragment} from "../src/crank.js";
import type {Context} from "../src/crank.js";
import {renderer} from "../src/dom.js";

describe("keys", () => {
	beforeEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	// TODO: write generative tests for this stuff
	afterEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	test("keys with no changes", () => {
		renderer.render(
			<div>
				<span key="1">1</span>
				<span key="2">2</span>
				<span key="3">3</span>
				<span key="4">4</span>
				<span key="5">5</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>",
		);
		renderer.render(
			<div>
				<span key="1">1</span>
				<span key="2">2</span>
				<span key="3">3</span>
				<span key="4">4</span>
				<span key="5">5</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>",
		);
	});

	test("no shared keys", () => {
		renderer.render(
			<div>
				<span key="1">1</span>
				<span key="2">2</span>
				<span key="3">3</span>
				<span key="4">4</span>
				<span key="5">5</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>",
		);
		const span1 = document.body.firstChild!.childNodes[0];
		const span2 = document.body.firstChild!.childNodes[1];
		const span3 = document.body.firstChild!.childNodes[2];
		const span4 = document.body.firstChild!.childNodes[3];
		const span5 = document.body.firstChild!.childNodes[4];
		renderer.render(
			<div>
				<span key="6">6</span>
				<span key="7">7</span>
				<span key="8">8</span>
				<span key="9">9</span>
				<span key="10">10</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><span>6</span><span>7</span><span>8</span><span>9</span><span>10</span></div>",
		);
		expect(span1).not.toBe(document.body.firstChild!.childNodes[0]);
		expect(span2).not.toBe(document.body.firstChild!.childNodes[1]);
		expect(span3).not.toBe(document.body.firstChild!.childNodes[2]);
		expect(span4).not.toBe(document.body.firstChild!.childNodes[3]);
		expect(span5).not.toBe(document.body.firstChild!.childNodes[4]);
	});

	test("keyed child moves forward", () => {
		renderer.render(
			<div>
				<span key="1">1</span>
				<span>2</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><span>1</span><span>2</span></div>",
		);
		const span1 = document.body.firstChild!.firstChild;
		renderer.render(
			<div>
				<span>0</span>
				<span key="1">1</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><span>0</span><span>1</span></div>",
		);
		expect(document.body.firstChild!.lastChild).toBe(span1);
	});

	test("keyed child moves backward", () => {
		renderer.render(
			<div>
				<span>1</span>
				<span key="2">2</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><span>1</span><span>2</span></div>",
		);
		const span2 = document.body.firstChild!.lastChild;
		renderer.render(
			<div>
				<span key="2">2</span>
				<span>3</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><span>2</span><span>3</span></div>",
		);
		expect(document.body.firstChild!.firstChild).toBe(span2);
	});

	test("keyed child added between unkeyed children", () => {
		renderer.render(
			<div>
				<span>1</span>
				<span>3</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><span>1</span><span>3</span></div>",
		);
		const span3 = document.body.firstChild!.childNodes[1];
		renderer.render(
			<div>
				<span>1</span>
				<span key="2">2</span>
				<span>3</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><span>1</span><span>2</span><span>3</span></div>",
		);
		expect(document.body.firstChild!.childNodes[2]).toBe(span3);
	});

	test("keyed array", () => {
		const spans = [
			<span key="2">2</span>,
			<span key="3">3</span>,
			<span key="4">4</span>,
		];
		renderer.render(
			<div>
				<span>1</span>
				{spans}
				<span>5</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
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
		expect(document.body.innerHTML).toBe(
			"<div><span>1</span><span>2</span><span>4</span><span>5</span></div>",
		);
		expect(document.body.firstChild!.childNodes[0]).toBe(span1);
		expect(document.body.firstChild!.childNodes[1]).toBe(span2);
		expect(document.body.firstChild!.childNodes[2]).toBe(span4);
		expect(document.body.firstChild!.childNodes[3]).toBe(span5);
		expect(document.body.contains(span3)).toBe(false);
	});

	test("reversed keyed array", () => {
		const spans = [
			<span key="2">2</span>,
			<span key="3">3</span>,
			<span key="4">4</span>,
			<span key="5">5</span>,
			<span key="6">6</span>,
		];
		renderer.render(
			<div>
				<span>1</span>
				{spans}
				<span>7</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
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
		expect(document.body.innerHTML).toBe(
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
		expect(document.body.firstChild!.childNodes[0]).toBe(span1);
		expect(document.body.firstChild!.childNodes[1]).toBe(span6);
		expect(document.body.firstChild!.childNodes[2]).toBe(span5);
		expect(document.body.firstChild!.childNodes[3]).toBe(span4);
		expect(document.body.firstChild!.childNodes[4]).toBe(span3);
		expect(document.body.firstChild!.childNodes[5]).toBe(span2);
		expect(document.body.firstChild!.childNodes[6]).toBe(span7);
		spans.reverse();
		renderer.render(
			<div>
				<span>1</span>
				{spans}
				<span>7</span>
			</div>,
			document.body,
		);
		expect(document.body.firstChild!.childNodes[0]).toBe(span1);
		expect(document.body.firstChild!.childNodes[1]).toBe(span2);
		expect(document.body.firstChild!.childNodes[2]).toBe(span3);
		expect(document.body.firstChild!.childNodes[3]).toBe(span4);
		expect(document.body.firstChild!.childNodes[4]).toBe(span5);
		expect(document.body.firstChild!.childNodes[5]).toBe(span6);
		expect(document.body.firstChild!.childNodes[6]).toBe(span7);
	});

	test("keyed child added", () => {
		renderer.render(
			<div>
				<span key="2">2</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>2</span></div>");
		const span2 = document.body.firstChild!.lastChild;
		renderer.render(
			<div>
				<span key="1">1</span>
				<span key="2">2</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><span>1</span><span>2</span></div>",
		);
		expect(document.body.firstChild!.lastChild).toBe(span2);
	});

	test("unkeyed replaced with keyed", () => {
		renderer.render(
			<div>
				<span>x</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>x</span></div>");
		let span = document.body.firstChild!.firstChild;
		renderer.render(
			<div>
				<span key="1">1</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>1</span></div>");
		expect(document.body.firstChild!.firstChild).not.toBe(span);
		span = document.body.firstChild!.firstChild;
		renderer.render(
			<div>
				<span>x</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>x</span></div>");
		expect(document.body.firstChild!.firstChild).not.toBe(span);
	});

	test("text and unkeyed and keyed children", () => {
		renderer.render(
			<div>
				<span>Hello</span>
				...
				<span key="world">World</span>
				...
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><span>Hello</span>...<span>World</span>...</div>",
		);
		const world = document.body.firstChild!.childNodes[2];
		expect((world as any).outerHTML).toBe("<span>World</span>");
		renderer.render(
			<div>
				...
				<span key="world">World</span>
				...
				<span>Hello</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div>...<span>World</span>...<span>Hello</span></div>",
		);
		expect(document.body.firstChild!.childNodes[1]).toBe(world);
		renderer.render(
			<div>
				...
				<span>Hello</span>
				<span key="world">World</span>
				...
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div>...<span>Hello</span><span>World</span>...</div>",
		);
		expect(document.body.firstChild!.childNodes[2]).toBe(world);
	});

	test("keyed children added before removed unkeyed child", () => {
		renderer.render(
			<div>
				<div key="1">1</div>
				<span>2</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><div>1</div><span>2</span></div>",
		);
		renderer.render(
			<div>
				<span key="1">1</span>
				<span key="2">2</span>
				<span key="3">3</span>
				<span key="4">4</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><span>1</span><span>2</span><span>3</span><span>4</span></div>",
		);
	});

	test("same key, different tag", () => {
		renderer.render(
			<div>
				<span>0</span>
				<span key="1">1</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><span>0</span><span>1</span></div>",
		);
		renderer.render(
			<div>
				<div key="1">1</div>
				<span>2</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><div>1</div><span>2</span></div>",
		);
	});

	test("same key, different tag 2", () => {
		renderer.render(
			<div>
				<span>0</span>
				<span key="1">1</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><span>0</span><span>1</span></div>",
		);
		renderer.render(
			<div>
				<div key="1">1</div>
				<span>0</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><div>1</div><span>0</span></div>",
		);
		renderer.render(
			<div>
				<span>0</span>
				<span key="1">1</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><span>0</span><span>1</span></div>",
		);
		renderer.render(
			<div>
				<div key="1">1</div>
				<span>0</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><div>1</div><span>0</span></div>",
		);
	});

	test("unkeyed elements added in random spots", () => {
		renderer.render(
			<div>
				<span key="1">1</span>
				<span key="2">2</span>
				<span key="3">3</span>
				<span key="4">4</span>
			</div>,
			document.body,
		);
		const span1 = document.body.firstChild!.childNodes[0];
		const span2 = document.body.firstChild!.childNodes[1];
		const span3 = document.body.firstChild!.childNodes[2];
		const span4 = document.body.firstChild!.childNodes[3];
		expect(document.body.innerHTML).toBe(
			"<div><span>1</span><span>2</span><span>3</span><span>4</span></div>",
		);
		renderer.render(
			<div>
				<span>0.5</span>
				<span key="1">1</span>
				<span>1.5</span>
				<span key="2">2</span>
				<span>2.5</span>
				<span key="3">3</span>
				<span>3.5</span>
				<span key="4">4</span>
				<span>4.5</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><span>0.5</span><span>1</span><span>1.5</span><span>2</span><span>2.5</span><span>3</span><span>3.5</span><span>4</span><span>4.5</span></div>",
		);
		expect(span1).toBe(document.body.firstChild!.childNodes[1]);
		expect(span2).toBe(document.body.firstChild!.childNodes[3]);
		expect(span3).toBe(document.body.firstChild!.childNodes[5]);
		expect(span4).toBe(document.body.firstChild!.childNodes[7]);
		renderer.render(
			<div>
				<span key="1">1</span>
				<span key="2">2</span>
				<span key="3">3</span>
				<span key="4">4</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><span>1</span><span>2</span><span>3</span><span>4</span></div>",
		);
		expect(span1).toBe(document.body.firstChild!.childNodes[0]);
		expect(span2).toBe(document.body.firstChild!.childNodes[1]);
		expect(span3).toBe(document.body.firstChild!.childNodes[2]);
		expect(span4).toBe(document.body.firstChild!.childNodes[3]);
	});

	test("moving a keyed item backwards", () => {
		renderer.render(
			<div>
				<span key="1">1</span>
				<span key="2">2</span>
				<span key="3">3</span>
				<span key="4">4</span>
				<span key="5">5</span>
				<span key="6">6</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
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
				<span key="1">1</span>
				<span key="5">5</span>
				<span key="2">2</span>
				<span key="3">3</span>
				<span key="4">4</span>
				<span key="6">6</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><span>1</span><span>5</span><span>2</span><span>3</span><span>4</span><span>6</span></div>",
		);
		expect(span1).toBe(document.body.firstChild!.childNodes[0]);
		expect(span2).toBe(document.body.firstChild!.childNodes[2]);
		expect(span3).toBe(document.body.firstChild!.childNodes[3]);
		expect(span4).toBe(document.body.firstChild!.childNodes[4]);
		expect(span5).toBe(document.body.firstChild!.childNodes[1]);
		expect(span6).toBe(document.body.firstChild!.childNodes[5]);
		renderer.render(
			<div>
				<span key="1">1</span>
				<span key="2">2</span>
				<span key="3">3</span>
				<span key="4">4</span>
				<span key="5">5</span>
				<span key="6">6</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span></div>",
		);
		expect(span1).toBe(document.body.firstChild!.childNodes[0]);
		expect(span2).toBe(document.body.firstChild!.childNodes[1]);
		expect(span3).toBe(document.body.firstChild!.childNodes[2]);
		expect(span4).toBe(document.body.firstChild!.childNodes[3]);
		expect(span5).toBe(document.body.firstChild!.childNodes[4]);
		expect(span6).toBe(document.body.firstChild!.childNodes[5]);
	});

	test("moving a keyed item forwards", () => {
		renderer.render(
			<div>
				<span key="1">1</span>
				<span key="2">2</span>
				<span key="3">3</span>
				<span key="4">4</span>
				<span key="5">5</span>
				<span key="6">6</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
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
				<span key="1">1</span>
				<span key="3">3</span>
				<span key="4">4</span>
				<span key="5">5</span>
				<span key="2">2</span>
				<span key="6">6</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><span>1</span><span>3</span><span>4</span><span>5</span><span>2</span><span>6</span></div>",
		);
		expect(span1).toBe(document.body.firstChild!.childNodes[0]);
		expect(span2).toBe(document.body.firstChild!.childNodes[4]);
		expect(span3).toBe(document.body.firstChild!.childNodes[1]);
		expect(span4).toBe(document.body.firstChild!.childNodes[2]);
		expect(span5).toBe(document.body.firstChild!.childNodes[3]);
		expect(span6).toBe(document.body.firstChild!.childNodes[5]);
		renderer.render(
			<div>
				<span key="1">1</span>
				<span key="2">2</span>
				<span key="3">3</span>
				<span key="4">4</span>
				<span key="5">5</span>
				<span key="6">6</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span></div>",
		);
		expect(span1).toBe(document.body.firstChild!.childNodes[0]);
		expect(span2).toBe(document.body.firstChild!.childNodes[1]);
		expect(span3).toBe(document.body.firstChild!.childNodes[2]);
		expect(span4).toBe(document.body.firstChild!.childNodes[3]);
		expect(span5).toBe(document.body.firstChild!.childNodes[4]);
		expect(span6).toBe(document.body.firstChild!.childNodes[5]);
	});
	test("swapping two keyed rows", () => {
		renderer.render(
			<div>
				<span key="1">1</span>
				<span key="2">2</span>
				<span key="3">3</span>
				<span key="4">4</span>
				<span key="5">5</span>
				<span key="6">6</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
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
				<span key="1">1</span>
				<span key="5">5</span>
				<span key="3">3</span>
				<span key="4">4</span>
				<span key="2">2</span>
				<span key="6">6</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><span>1</span><span>5</span><span>3</span><span>4</span><span>2</span><span>6</span></div>",
		);
		expect(span1).toBe(document.body.firstChild!.childNodes[0]);
		expect(span2).toBe(document.body.firstChild!.childNodes[4]);
		expect(span3).toBe(document.body.firstChild!.childNodes[2]);
		expect(span4).toBe(document.body.firstChild!.childNodes[3]);
		expect(span5).toBe(document.body.firstChild!.childNodes[1]);
		expect(span6).toBe(document.body.firstChild!.childNodes[5]);
		renderer.render(
			<div>
				<span key="1">1</span>
				<span key="2">2</span>
				<span key="3">3</span>
				<span key="4">4</span>
				<span key="5">5</span>
				<span key="6">6</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span></div>",
		);
		expect(span1).toBe(document.body.firstChild!.childNodes[0]);
		expect(span2).toBe(document.body.firstChild!.childNodes[1]);
		expect(span3).toBe(document.body.firstChild!.childNodes[2]);
		expect(span4).toBe(document.body.firstChild!.childNodes[3]);
		expect(span5).toBe(document.body.firstChild!.childNodes[4]);
		expect(span6).toBe(document.body.firstChild!.childNodes[5]);
	});

	test("duplicate keys", () => {
		const mock = Sinon.stub(console, "error");
		try {
			renderer.render(
				<div>
					<span key="1">1</span>
					<span key="1">2</span>
					<span key="1">3</span>
				</div>,
				document.body,
			);
			expect(document.body.innerHTML).toBe(
				"<div><span>1</span><span>2</span><span>3</span></div>",
			);

			expect(mock.callCount).toBe(2);
			renderer.render(
				<div>
					<span key="2">1</span>
					<span key="1">2</span>
					<span key="2">3</span>
				</div>,
				document.body,
			);
			expect(document.body.innerHTML).toBe(
				"<div><span>1</span><span>2</span><span>3</span></div>",
			);

			expect(mock.callCount).toBe(3);
		} finally {
			mock.restore();
		}
	});

	// https://github.com/bikeshaving/crank/issues/267
	test("component unmounts with key", () => {
		const fn = Sinon.fake();

		function* Component(this: Context) {
			this.cleanup(() => {
				fn();
			});
			for ({} of this) {
				yield <div>Hello</div>;
			}

			fn();
		}

		renderer.render(
			<div>{[<Fragment />, <Fragment />, <Component key="1" />]}</div>,
			document.body,
		);
		renderer.render(<div>{[<Fragment />, <Fragment />]}</div>, document.body);

		expect(2).toBe(fn.callCount);
	});

	test("changing list", () => {
		const fn = Sinon.fake();

		function* Component(this: Context, {children}: {children?: any}) {
			for ({children} of this) {
				yield <p>{children}</p>;
			}

			fn(children);
		}

		renderer.render(
			<div>
				<Component key="1">1</Component>
				<Component key="2">2</Component>
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe("<div><p>1</p><p>2</p></div>");

		renderer.render(
			<div>
				<Component key="2">2</Component>
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe("<div><p>2</p></div>");

		expect(1).toBe(fn.callCount);
	});

	// Keyed host elements reorder correctly via refresh
	test("keyed host elements reorder via refresh", async () => {
		let refresh: () => void;

		function* List(this: Context) {
			let reversed = false;
			refresh = () => {
				reversed = !reversed;
				this.refresh();
			};

			for ({} of this) {
				yield (
					<div>
						{reversed
							? [
								<span key="d">d</span>,
								<span key="c">c</span>,
								<span key="b">b</span>,
								<span key="a">a</span>,
							]
							: [
								<span key="a">a</span>,
								<span key="b">b</span>,
								<span key="c">c</span>,
								<span key="d">d</span>,
							]}
					</div>
				);
			}
		}

		renderer.render(<List />, document.body);
		expect(document.body.innerHTML).toBe(
			"<div><span>a</span><span>b</span><span>c</span><span>d</span></div>",
		);

		const spanA = document.body.firstChild!.childNodes[0];
		const spanB = document.body.firstChild!.childNodes[1];
		const spanC = document.body.firstChild!.childNodes[2];
		const spanD = document.body.firstChild!.childNodes[3];

		// Reverse via refresh
		refresh!();
		await new Promise((r) => setTimeout(r, 0));

		// DOM should be reordered
		expect(document.body.innerHTML).toBe(
			"<div><span>d</span><span>c</span><span>b</span><span>a</span></div>",
		);
		// Same DOM nodes, just moved
		expect(document.body.firstChild!.childNodes[0]).toBe(spanD);
		expect(document.body.firstChild!.childNodes[1]).toBe(spanC);
		expect(document.body.firstChild!.childNodes[2]).toBe(spanB);
		expect(document.body.firstChild!.childNodes[3]).toBe(spanA);
	});

	// Bug: keyed generator components don't reorder via refresh
	test("keyed generator components reorder via refresh", async () => {
		const mounted: string[] = [];

		function* ID(this: Context, {id}: {id: string}) {
			mounted.push(id);
			for ({id} of this) {
				yield <span>{id}</span>;
			}
		}

		let refresh: () => void;

		function* List(this: Context) {
			let reversed = false;
			refresh = () => {
				reversed = !reversed;
				this.refresh();
			};

			for ({} of this) {
				const order = reversed ? ["d", "c", "b", "a"] : ["a", "b", "c", "d"];
				yield (
					<div>
						{order.map((k) => (
							<ID key={k} id={k} />
						))}
					</div>
				);
			}
		}

		renderer.render(<List />, document.body);
		expect(document.body.innerHTML).toBe(
			"<div><span>a</span><span>b</span><span>c</span><span>d</span></div>",
		);
		expect(mounted).toEqual(["a", "b", "c", "d"]);

		const spanA = document.body.firstChild!.childNodes[0];
		const spanB = document.body.firstChild!.childNodes[1];
		const spanC = document.body.firstChild!.childNodes[2];
		const spanD = document.body.firstChild!.childNodes[3];

		// Reverse via refresh
		refresh!();
		await new Promise((r) => setTimeout(r, 0));

		// Components should NOT be remounted
		expect(mounted).toEqual(["a", "b", "c", "d"]);

		// DOM should be reordered
		expect(document.body.innerHTML).toBe(
			"<div><span>d</span><span>c</span><span>b</span><span>a</span></div>",
		);
		// Same DOM nodes, just moved
		expect(document.body.firstChild!.childNodes[0]).toBe(spanD);
		expect(document.body.firstChild!.childNodes[1]).toBe(spanC);
		expect(document.body.firstChild!.childNodes[2]).toBe(spanB);
		expect(document.body.firstChild!.childNodes[3]).toBe(spanA);
	});
});
