import {Fragment, Raw} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";

function* Comment() {
  let expanded = true;
  this.addEventListener("click", (ev) => {
    if (ev.target.className === "expand") {
      this.refresh(() => (expanded = !expanded));
      ev.stopPropagation();
    }
  });

  for (const {comment} of this) {
    yield (
      <div style="margin-left: 20px; border-left: 2px solid #ccc; padding-left: 10px; margin-bottom: 10px;">
        <p>
          <button
            class="expand"
            style="background: none; border: none; cursor: pointer; color: #666;"
          >
            {expanded ? "[-]" : "[+]"}
          </button>{" "}
          <strong>{comment.user}</strong> {comment.time_ago}
        </p>
        <div style={{display: expanded ? "block" : "none"}}>
          <div style="margin: 10px 0;">
            <Raw value={comment.content} />
          </div>
          <div>
            {comment.comments.map((reply) => (
              <Comment key={reply.id} comment={reply} />
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
    <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
      <a href={item.url} style="text-decoration: none; color: #000;">
        <h1 style="margin-bottom: 5px;">{item.title}</h1>
      </a>
      <p style="color: #666; margin-bottom: 5px;">{item.domain}</p>
      <p style="color: #666; margin-bottom: 20px;">
        submitted by <strong>{item.user}</strong> {item.time_ago}
      </p>
      {item.comments.map((comment) => (
        <Comment comment={comment} key={comment.id} />
      ))}
    </div>
  );
}

function Story({story}) {
  return (
    <li style="margin-bottom: 15px; list-style: none;">
      <a
        href={story.url}
        style="text-decoration: none; color: #000; font-weight: bold;"
      >
        {story.title}
      </a>{" "}
      <span style="color: #666;">({story.domain})</span>
      <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">
        {story.points} points by <strong>{story.user}</strong> |{" "}
        {story.time_ago} |
        <a
          href={`#/item/${story.id}`}
          style="color: #666; text-decoration: none;"
        >
          {" "}
          {story.comments_count} comments
        </a>
      </p>
    </li>
  );
}

function Pager({page}) {
  const prevDisabled = page <= 1;
  const nextDisabled = page >= 5;

  return (
    <div style="text-align: center; margin: 20px 0; padding: 10px;">
      <a
        href={prevDisabled ? "#" : `#/top/${page - 1}`}
        style={{
          color: prevDisabled ? "#ccc" : "#666",
          "text-decoration": "none",
          "margin-right": "10px",
          cursor: prevDisabled ? "default" : "pointer",
        }}
      >
        Previous
      </a>
      <span>{page}/5</span>
      <a
        href={nextDisabled ? "#" : `#/top/${page + 1}`}
        style={{
          color: nextDisabled ? "#ccc" : "#666",
          "text-decoration": "none",
          "margin-left": "10px",
          cursor: nextDisabled ? "default" : "pointer",
        }}
      >
        Next
      </a>
    </div>
  );
}

async function List({page, start = (page - 1) * 30 + 1}) {
  const result = await fetch(`https://api.hnpwa.com/v0/news/${page}.json`);
  const stories = await result.json();
  const items = stories.map((story) => <Story story={story} key={story.id} />);
  return (
    <Fragment>
      <Pager page={page} />
      <ol
        start={start}
        style="max-width: 800px; margin: 0 auto; padding: 0 20px;"
      >
        {items}
      </ol>
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

async function Loading({wait = 1000}) {
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
      const hash = window.location.hash;
      data = parseHash(hash);
      if (data == null) {
        data = {route: "top", page: 1};
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
      case "item": {
        await (yield <Item {...data} />);
        break;
      }
      case "top": {
        await (yield <List {...data} />);
        break;
      }
    }

    window.scrollTo(0, 0);
  }

  window.removeEventListener("hashchange", route);
}

function Navbar() {
  return (
    <nav style="background: #ff6600; padding: 10px; margin-bottom: 20px;">
      <div style="max-width: 800px; margin: 0 auto; color: white; font-weight: bold;">
        <span style="color: #ffcc99; margin-right: 10px;">Crank News</span>
        <a href="#/top/1" style="color: white; text-decoration: none;">
          Top
        </a>
      </div>
    </nav>
  );
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
