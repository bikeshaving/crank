import {Fragment, Raw} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";

const API_BASE = "https://api.hnpwa.com/v0";
const FEED_API = {top: "news", new: "newest", show: "show", ask: "ask", jobs: "jobs"};
const FEEDS = [
	{key: "top", label: "Top"},
	{key: "new", label: "New"},
	{key: "show", label: "Show"},
	{key: "ask", label: "Ask"},
	{key: "jobs", label: "Jobs"},
];

function parseHash(hash) {
	const parts = hash.replace(/^#\/?/, "").split("/");
	const type = parts[0];
	if (type === "item") {
		const id = parts[1];
		if (id) {
			return {route: "item", id};
		}
	} else if (type === "user") {
		const username = parts[1];
		if (username) {
			return {route: "user", username};
		}
	} else if (FEED_API[type]) {
		const page = parseInt(parts[1]) || 1;
		return {route: "feed", type, page};
	}

	return {route: "feed", type: "top", page: 1};
}

function* Navbar() {
	let active = null;
	const updateActive = () => {
		const data = parseHash(window.location.hash);
		active = data.route === "feed" ? data.type : null;
	};

	const onHashChange = () => {
		this.refresh(updateActive);
	};

	window.addEventListener("hashchange", onHashChange);
	updateActive();

	try {
		for (const {} of this) {
			yield (
				<nav style="background: #ff6600; padding: 8px 10px;">
					<div style="max-width: 800px; margin: 0 auto; display: flex; align-items: center; gap: 10px;">
						<a
							href="#/top/1"
							style="color: white; font-weight: bold; text-decoration: none; margin-right: 4px;"
						>
							Crank News
						</a>
						{FEEDS.map(({key, label}) => (
							<a
								href={`#/${key}/1`}
								style={{
									color: active === key ? "#fff" : "#ffcc99",
									"text-decoration": active === key ? "underline" : "none",
									"font-size": "14px",
								}}
							>
								{label}
							</a>
						))}
					</div>
				</nav>
			);
		}
	} finally {
		window.removeEventListener("hashchange", onHashChange);
	}
}

function Story({story, index}) {
	const isSelfPost = story.url && story.url.startsWith("item?id=");
	const titleHref = isSelfPost
		? `#/item/${story.id}`
		: story.url || `#/item/${story.id}`;
	const isExternal = !isSelfPost && story.url;
	const isJob = story.type === "job";
	return (
		<li
			style="margin-bottom: 4px; list-style: none; padding: 4px 0;"
			value={index}
		>
			<span style="color: #666; margin-right: 4px; font-size: 14px;">
				{index}.
			</span>
			<a
				href={titleHref}
				target={isExternal ? "_blank" : undefined}
				style="text-decoration: none; color: #000;"
			>
				{story.title}
			</a>
			{story.domain ? (
				<span style="color: #666; font-size: 13px;"> ({story.domain})</span>
			) : null}
			<div style="color: #666; margin: 2px 0 0 0; font-size: 13px;">
				{story.points != null ? <span>{story.points} points</span> : null}
				{story.user ? (
					<span>
						{story.points != null ? " by " : ""}
						<a
							href={`#/user/${story.user}`}
							style="color: #666; text-decoration: none;"
						>
							{story.user}
						</a>
					</span>
				) : null}
				{story.time_ago ? (
					<span>
						{story.points != null || story.user ? " | " : ""}
						{story.time_ago}
					</span>
				) : null}
				{!isJob && story.comments_count != null ? (
					<span>
						{" | "}
						<a
							href={`#/item/${story.id}`}
							style="color: #666; text-decoration: none;"
						>
							{story.comments_count} comments
						</a>
					</span>
				) : null}
			</div>
		</li>
	);
}

function Pager({type, page, hasNext}) {
	const prevDisabled = page <= 1;
	const nextDisabled = !hasNext;
	return (
		<div style="text-align: center; margin: 10px 0; padding: 10px;">
			{prevDisabled ? (
				<span style="color: #ccc; margin-right: 10px;">Previous</span>
			) : (
				<a
					href={`#/${type}/${page - 1}`}
					style="color: #ff6600; text-decoration: none; margin-right: 10px;"
				>
					Previous
				</a>
			)}
			<span style="color: #666;">page {page}</span>
			{nextDisabled ? (
				<span style="color: #ccc; margin-left: 10px;">Next</span>
			) : (
				<a
					href={`#/${type}/${page + 1}`}
					style="color: #ff6600; text-decoration: none; margin-left: 10px;"
				>
					Next
				</a>
			)}
		</div>
	);
}

async function List({type, page}) {
	const apiPath = FEED_API[type];
	const result = await fetch(`${API_BASE}/${apiPath}/${page}.json`);
	const stories = await result.json();
	const start = (page - 1) * 30 + 1;
	const hasNext = stories.length >= 30;
	return (
		<Fragment>
			<Pager type={type} page={page} hasNext={hasNext} />
			<ol
				start={start}
				style="max-width: 800px; margin: 0 auto; padding: 0 20px;"
			>
				{stories.map((story, i) => (
					<Story story={story} index={start + i} key={story.id} />
				))}
			</ol>
			<Pager type={type} page={page} hasNext={hasNext} />
		</Fragment>
	);
}

function* Comment() {
	let expanded = true;
	this.addEventListener("click", (ev) => {
		if (ev.target.className === "expand") {
			this.refresh(() => (expanded = !expanded));
			ev.stopPropagation();
		}
	});

	for (const {comment, depth = 0} of this) {
		if (comment.deleted || comment.dead) {
			yield (
				<div style="margin-left: 20px; padding: 4px 0 4px 10px; border-left: 2px solid #eee; color: #aaa; font-size: 13px; margin-bottom: 6px;">
					[deleted]
				</div>
			);
			continue;
		}

		yield (
			<div style="margin-left: 20px; border-left: 2px solid #ccc; padding-left: 10px; margin-bottom: 6px;">
				<p style="margin: 0 0 4px;">
					<button
						class="expand"
						style="background: none; border: none; cursor: pointer; color: #666; padding: 0; font-size: 13px;"
					>
						{expanded ? "[-]" : `[+${comment.comments.length ? ` ${comment.comments.length}` : ""}]`}
					</button>{" "}
					<a
						href={`#/user/${comment.user}`}
						style="color: #666; text-decoration: none; font-weight: bold;"
					>
						{comment.user}
					</a>{" "}
					<span style="color: #999; font-size: 13px;">{comment.time_ago}</span>
				</p>
				<div style={{display: expanded ? "block" : "none"}}>
					<div style="margin: 4px 0; font-size: 14px; line-height: 1.5; overflow-wrap: break-word;">
						<Raw value={comment.content} />
					</div>
					{comment.comments.map((reply) => (
						<Comment key={reply.id} comment={reply} depth={depth + 1} />
					))}
				</div>
			</div>
		);
	}
}

async function Item({id}) {
	const result = await fetch(`${API_BASE}/item/${id}.json`);
	const item = await result.json();
	if (!item) {
		return (
			<div style="max-width: 800px; margin: 0 auto; padding: 20px; color: #666;">
				Item not found.
			</div>
		);
	}

	const isSelfPost = item.url && item.url.startsWith("item?id=");
	const titleHref = isSelfPost ? null : item.url;
	const isJob = item.type === "job";
	return (
		<div style="max-width: 800px; margin: 0 auto; padding: 20px;">
			{titleHref ? (
				<a
					href={titleHref}
					target="_blank"
					style="text-decoration: none; color: #000;"
				>
					<h2 style="margin: 0 0 4px;">{item.title}</h2>
				</a>
			) : (
				<h2 style="margin: 0 0 4px;">{item.title}</h2>
			)}
			{item.domain ? (
				<p style="color: #666; margin: 0 0 4px; font-size: 13px;">
					{item.domain}
				</p>
			) : null}
			<p style="color: #666; margin: 0 0 12px; font-size: 13px;">
				{item.points != null ? <span>{item.points} points</span> : null}
				{item.user ? (
					<span>
						{item.points != null ? " by " : ""}
						<a
							href={`#/user/${item.user}`}
							style="color: #666; text-decoration: none;"
						>
							<strong>{item.user}</strong>
						</a>
					</span>
				) : null}
				{item.time_ago ? (
					<span>
						{item.points != null || item.user ? " | " : ""}
						{item.time_ago}
					</span>
				) : null}
			</p>
			{item.content ? (
				<div style="margin: 0 0 16px; padding: 12px; background: #f6f6f0; font-size: 14px; line-height: 1.5; overflow-wrap: break-word;">
					<Raw value={item.content} />
				</div>
			) : null}
			{!isJob && item.comments && item.comments.length > 0 ? (
				<Fragment>
					<p style="color: #666; font-size: 13px; margin: 0 0 8px;">
						{item.comments_count} comments
					</p>
					{item.comments.map((comment) => (
						<Comment comment={comment} key={comment.id} />
					))}
				</Fragment>
			) : null}
		</div>
	);
}

async function UserProfile({username}) {
	const result = await fetch(`${API_BASE}/user/${username}.json`);
	const user = await result.json();
	if (!user) {
		return (
			<div style="max-width: 800px; margin: 0 auto; padding: 20px; color: #666;">
				User not found.
			</div>
		);
	}

	return (
		<div style="max-width: 800px; margin: 0 auto; padding: 20px;">
			<h2 style="margin: 0 0 12px;">{user.id}</h2>
			<table style="font-size: 14px; border-collapse: collapse;">
				<tbody>
					<tr>
						<td style="color: #666; padding: 2px 12px 2px 0; vertical-align: top;">
							Created:
						</td>
						<td>{user.created}</td>
					</tr>
					<tr>
						<td style="color: #666; padding: 2px 12px 2px 0; vertical-align: top;">
							Karma:
						</td>
						<td>{user.karma}</td>
					</tr>
					{user.about ? (
						<tr>
							<td style="color: #666; padding: 2px 12px 2px 0; vertical-align: top;">
								About:
							</td>
							<td style="line-height: 1.5; overflow-wrap: break-word;">
								<Raw value={user.about} />
							</td>
						</tr>
					) : null}
				</tbody>
			</table>
		</div>
	);
}

async function Loading({wait = 800}) {
	await new Promise((resolve) => setTimeout(resolve, wait));
	return (
		<div style="text-align: center; padding: 40px; color: #666;">
			Loading...
		</div>
	);
}

async function* App() {
	let data;
	const route = (ev) => {
		const update = () => {
			data = parseHash(window.location.hash);
			if (data.route === "feed" && !window.location.hash) {
				window.location.hash = "#/top/1";
			}
		};

		if (ev) {
			this.refresh(update);
		} else {
			update();
		}
	};

	window.addEventListener("hashchange", route);
	route();

	for await (const _ of this) {
		yield <Loading />;
		switch (data.route) {
			case "feed": {
				await (yield <List type={data.type} page={data.page} />);
				break;
			}
			case "item": {
				await (yield <Item id={data.id} />);
				break;
			}
			case "user": {
				await (yield <UserProfile username={data.username} />);
				break;
			}
		}

		window.scrollTo(0, 0);
	}

	window.removeEventListener("hashchange", route);
}

function Root() {
	return (
		<div style="font-family: Arial, sans-serif; line-height: 1.4; background: #f6f6f0; min-height: 100vh;">
			<Navbar />
			<App />
		</div>
	);
}

renderer.render(<Root />, document.body);
