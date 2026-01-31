---
title: SuspenseList
module: "@b9g/crank/async"
type: component
publish: true
---

# SuspenseList

Controls when child Suspense components show their content or fallbacks based on a specified reveal order.

## Syntax

```ts
function* SuspenseList(props: {
  children: Children;
  revealOrder?: "forwards" | "backwards" | "together";
  tail?: "collapsed" | "hidden";
  timeout?: number;
}): Generator<Children>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `Children` | required | Elements containing Suspense components to coordinate |
| `revealOrder` | `string` | `"forwards"` | How children should be revealed |
| `tail` | `string` | `"collapsed"` | How to handle fallbacks |
| `timeout` | `number` | - | Default timeout for Suspense children |

### revealOrder values

- **`"forwards"`** - Show children in document order, waiting for predecessors
- **`"backwards"`** - Show children in reverse order, waiting for successors
- **`"together"`** - Show all children simultaneously when all are ready

### tail values

- **`"collapsed"`** - Show only the fallback for the next unresolved Suspense
- **`"hidden"`** - Hide all fallbacks

## Description

SuspenseList coordinates the reveal order of multiple Suspense boundaries. This is useful for:

- Preventing content from appearing in a jarring order
- Showing a cohesive loading experience
- Controlling which loading indicators are visible

Suspense components that are not rendered immediately (because they are children of another async component) will not be coordinated.

In Crank, async components by default render together. The "together" mode might not be necessary unless you're using Suspense fallbacks.

## Examples

### Sequential reveal (forwards)

```tsx
import {Suspense, SuspenseList} from "@b9g/crank/async";

function Feed() {
  return (
    <SuspenseList revealOrder="forwards">
      <Suspense fallback={<PostSkeleton />}>
        <Post id={1} />
      </Suspense>
      <Suspense fallback={<PostSkeleton />}>
        <Post id={2} />
      </Suspense>
      <Suspense fallback={<PostSkeleton />}>
        <Post id={3} />
      </Suspense>
    </SuspenseList>
  );
}
```

Post 1 will appear first, then Post 2 (even if it loads faster), then Post 3.

### Collapsed tail

```tsx
import {Suspense, SuspenseList} from "@b9g/crank/async";

function SearchResults({results}) {
  return (
    <SuspenseList revealOrder="forwards" tail="collapsed">
      {results.map((result) => (
        <Suspense key={result.id} fallback={<ResultSkeleton />}>
          <SearchResult data={result} />
        </Suspense>
      ))}
    </SuspenseList>
  );
}
```

Only shows one loading skeleton at a time for the next unloaded item.

### Hidden fallbacks

```tsx
import {Suspense, SuspenseList} from "@b9g/crank/async";

function Gallery({images}) {
  return (
    <SuspenseList revealOrder="forwards" tail="hidden">
      {images.map((img) => (
        <Suspense key={img.id} fallback={null}>
          <Image src={img.url} />
        </Suspense>
      ))}
    </SuspenseList>
  );
}
```

Images appear one by one with no loading indicators.

### Reveal together

```tsx
import {Suspense, SuspenseList} from "@b9g/crank/async";

function Dashboard() {
  return (
    <SuspenseList revealOrder="together">
      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />
      </Suspense>
      <Suspense fallback={<ChartSkeleton />}>
        <UsersChart />
      </Suspense>
      <Suspense fallback={<ChartSkeleton />}>
        <TrafficChart />
      </Suspense>
    </SuspenseList>
  );
}
```

All charts appear simultaneously when all have loaded.

### Backwards reveal

```tsx
import {Suspense, SuspenseList} from "@b9g/crank/async";

function Comments({comments}) {
  return (
    <SuspenseList revealOrder="backwards">
      {comments.map((comment) => (
        <Suspense key={comment.id} fallback={<CommentSkeleton />}>
          <Comment data={comment} />
        </Suspense>
      ))}
    </SuspenseList>
  );
}
```

Newer comments (at the end) appear first.

### With shared timeout

```tsx
import {Suspense, SuspenseList} from "@b9g/crank/async";

function Page() {
  return (
    <SuspenseList revealOrder="forwards" timeout={100}>
      {/* All children inherit 100ms timeout */}
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      <Suspense fallback={<ContentSkeleton />}>
        <Content />
      </Suspense>
      <Suspense fallback={<FooterSkeleton />}>
        <Footer />
      </Suspense>
    </SuspenseList>
  );
}
```

### Nested SuspenseLists

```tsx
import {Suspense, SuspenseList} from "@b9g/crank/async";

function App() {
  return (
    <SuspenseList revealOrder="forwards">
      <Suspense fallback={<NavSkeleton />}>
        <Navigation />
      </Suspense>

      <SuspenseList revealOrder="together">
        <Suspense fallback={<SidebarSkeleton />}>
          <Sidebar />
        </Suspense>
        <Suspense fallback={<MainSkeleton />}>
          <Main />
        </Suspense>
      </SuspenseList>

      <Suspense fallback={<FooterSkeleton />}>
        <Footer />
      </Suspense>
    </SuspenseList>
  );
}
```

Navigation shows first, then Sidebar and Main appear together, then Footer.

## See also

- [Suspense](/api/async/components/Suspense)
- [lazy](/api/async/functions/lazy)
- [Async Components Guide](/guides/async-components)
