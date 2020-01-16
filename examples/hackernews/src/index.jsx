/** @jsx createElement */
import {createElement, Fragment} from "@bikeshaving/crank";
import {render} from "@bikeshaving/crank/dom";
import "./index.css";

function* Comment({comment}) {
	let expanded = true;
	this.addEventListener("click", (ev) => {
		if (ev.target.className === "expand") {
			expanded = !expanded;
			this.refresh();
			ev.stopPropagation();
		}
	});

	for ({comment} of this) {
		yield (
			<div class="comment">
				<p>
					<a href="">{comment.user}</a> {comment.time_ago}{" "}
					<button class="expand">
						{expanded ? "[-]" : `[+${comment.comments_count}]`}
					</button>
				</p>
				<div style={{display: expanded ? null : "none"}}>
					<p innerHTML={comment.content} />
					<div class="replies">
						{comment.comments.map((reply) => (
							<Comment crank-key={reply.id} comment={reply} />
						))}
					</div>
				</div>
			</div>
		);
	}
}

async function Item({id}) {
	const result = await fetch(`https://api.hnpwa.com/v0/item/${id}.json`);
	const item = await result.json();
	return (
		<div class="item">
			<a href={item.url}>
				<h1>{item.title}</h1>
			</a>
			<p class="domain">{item.domain}</p>
			<p class="meta">
				submitted by <a>{item.user}</a> {item.time_ago}
			</p>
			{item.comments.map((comment) => (
				<Comment comment={comment} crank-key={comment.id} />
			))}
		</div>
	);
}

function Story({story}) {
	return (
		<li class="story">
			<a href={story.url}>{story.title}</a> <span>({story.domain})</span>
			<p class="meta">
				<span>
					{story.points} points by <a href="">{story.user}</a>
				</span>{" "}
				{story.time_ago} |{" "}
				<a href={`#/item/${story.id}`}>{story.comments_count} comments</a>
			</p>
		</li>
	);
}

function Pager({page}) {
	return (
		<div class="pager">
			<div>
				<a>Previous </a> {page}/25 <a>Next</a>
			</div>
		</div>
	);
}

async function List({page, start = 1}) {
	const result = await fetch(`https://api.hnpwa.com/v0/news/${page}.json`);
	const stories = await result.json();
	const items = stories.map((story) => (
		<Story story={story} crank-key={story.id} />
	));
	return (
		<Fragment>
			<Pager page={page} />
			<ol start={start}>{items}</ol>
			<Pager page={page} />
		</Fragment>
	);
}

function parseHash(hash) {
	if (hash.startsWith("#/item/")) {
		const id = hash.slice(7);
		if (id) {
			return {route: "item", id};
		}
	} else if (hash.startsWith("#/top/")) {
		const page = parseInt(hash.slice(6)) || 1;
		if (!Number.isNaN(page)) {
			return {route: "top", page};
		}
	}
}

async function Loading({wait = 2000}) {
	await new Promise((resolve) => setTimeout(resolve, wait));
	return "Loading...";
}

async function* App() {
	let data;
	const route = (ev) => {
		const hash = window.location.hash;
		data = parseHash(hash);
		if (data == null) {
			data = {route: "top", page: 1};
			window.location.hash = "#/";
		}

		if (ev) {
			this.refresh();
		}
	};

	window.addEventListener("hashchange", route);
	route();
	try {
		for await (const _ of this) {
			yield (<Loading />);
			switch (data.route) {
				case "item": {
					yield (<Item {...data} />);
					break;
				}
				case "top": {
					yield (<List {...data} />);
					break;
				}
			}
		}
	} finally {
		window.removeEventListener("hashchange", route);
	}
}

function Navbar() {
	return <div class="navbar">Top New Show Ask Jobs</div>;
}

function Root() {
	return (
		<div class="root">
			<Navbar />
			<App />
		</div>
	);
}

render(<Root />, document.body.firstElementChild);
