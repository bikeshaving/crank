/** @jsx createElement */
import {createElement, Context} from "../index";
import {renderer} from "../dom";

describe("parent-child refresh cascades", () => {
	afterEach(async () => {
		document.body.innerHTML = "";
		await renderer.render(null, document.body);
	});

	test("sync function parent and sync function child", () => {
		return new Promise((done) => {
			function Child(this: Context) {
				this.dispatchEvent(new Event("test", {bubbles: true}));
				return <span>child</span>;
			}

			function Parent(this: Context) {
				this.addEventListener("test", () => {
					try {
						this.refresh();
						done();
					} catch (err) {
						done(err);
					}
				});

				return (
					<div>
						<Child />
					</div>
				);
			}

			renderer.render(<Parent />, document.body);
			expect(document.body.innerHTML).toEqual("<div><span>child</span></div>");
		});
	});

	test("sync generator parent and sync function child", () => {
		return new Promise((done) => {
			function Child(this: Context) {
				this.dispatchEvent(new Event("test", {bubbles: true}));
				return <span>child</span>;
			}

			function* Parent(this: Context) {
				this.addEventListener("test", () => {
					try {
						this.refresh();
						done();
					} catch (err) {
						done(err);
					}
				});

				while (true) {
					yield (
						<div>
							<Child />
						</div>
					);
				}
			}

			renderer.render(<Parent />, document.body);
			expect(document.body.innerHTML).toEqual("<div><span>child</span></div>");
		});
	});

	test("sync generator parent and sync generator child", () => {
		return new Promise((done) => {
			function* Child(this: Context) {
				while (true) {
					this.dispatchEvent(new Event("test", {bubbles: true}));
					yield <span>child</span>;
				}
			}

			function* Parent(this: Context) {
				this.addEventListener("test", () => {
					try {
						this.refresh();
						done();
					} catch (err) {
						done(err);
					}
				});

				while (true) {
					yield (
						<div>
							<Child />
						</div>
					);
				}
			}

			renderer.render(<Parent />, document.body);
			expect(document.body.innerHTML).toEqual("<div><span>child</span></div>");
		});
	});
});
