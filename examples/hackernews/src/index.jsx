/** @jsx createElement */
import {createElement, render} from "crank";

function Comment({comment}) {
	let replies;
	if (Array.isArray(comment.comments) && comment.comments.length) {
		replies = (
			<div class="replies" style={{marginLeft: "30px"}}>
				{comment.comments.map((reply) => <Comment crank-key={reply.id} comment={reply}/>)}
			</div>
		);
	}
	return (
		<div>
			<p>{comment.user} {comment.time_ago}</p>
			<p innerHTML={comment.content} />
			{replies}
		</div>
	);
}

async function Item({id}) {
	const result = await fetch(`https://api.hnpwa.com/v0/item/${id}.json`);
	const item = await result.json();
	const comments = item.comments.map((comment) => (
		<Comment comment={comment} crank-key={comment.id} />
	));
	return (
		<article>
			<a href={item.url}>
				<h1>{item.title}</h1>
				<small>{item.domain}</small>
			</a>
			<p class="meta">submitted by {item.user} {item.time_ago}</p>
			{comments}
		</article>
	);
}

function Story({story}) {
	return (
		<div>
			<div>
				<a href={story.url}>{story.title}</a> <span>({story.domain})</span>
			</div>
			<div>
				{story.points} points by <a href="">{story.user}</a> {story.time_ago}
				| <a href={`#/item/${story.id}`}>{story.comments_count} comments</a>
			</div>
		</div>
	);
}

async function News({page}) {
	const result = await fetch(`https://api.hnpwa.com/v0/news/${page}.json`);
	const stories = await result.json();
	const items = stories.map((story) => <Story story={story} crank-key={story.id} />);
	return (
		<div>{items}</div>
	);
}

function parseHash(hash) {
	if (hash.startsWith("#/item/")) {
		const id = hash.slice(7);
		if (id) {
			return {route: "item", id};
		}
	}
}

async function Loading() {
	await new Promise((resolve) => setTimeout(resolve, 1000));
	return "Loading...";
}

async function *App() {
	let data;
	const route = (ev) => {
		const hash = window.location.hash;
		data = parseHash(hash);
		if (data == null) {
			data = {route: "top", page: 1};
			window.location.hash = "#/top/1";
		}

		if (ev) {
			this.refresh();
		}
	};

	window.addEventListener("hashchange", route);
	route();
	try {
		for await (const _ of this) {
			yield <Loading />;
			switch (data.route) {
				case "item": {
					yield <Item id={data.id} />
					break;
				}
				case "top": {
					yield <News page={data.page} />;
					break;
				}
			}
		}
	} finally {
		window.removeEventListener("hashchange", route);
	}
}

render(<App />, document.body.firstElementChild);
