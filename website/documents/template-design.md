# Designing a template language in the spirit of JSX.

## Grammar

```
$CHILDREN: ($CHILD_TEXT | $ELEMENT | $COMMENT | ${unknown})*
$CHILD_TEXT: /[^<]/+
$ELEMENT:
  $SELF_CLOSING_ELEMENT |
  $OPENING_ELEMENT $CHILDREN $CLOSING_ELEMENT
$SELF_CLOSING_ELEMENT: "<" ($IDENTIFIER | ${Tag}) $PROPS "/" ">"
$OPENING_ELEMENT: "<" ($IDENTIFIER | ${Tag})? $PROPS ">"
$CLOSING_ELEMENT: "<" "/" "/"? ($IDENTIFIER | ${Tag})? ">"
$PROPS: ($PROP | $SPREAD_PROP)*
$PROP: ($IDENTIFIER | ${string}) ("=" $PROP_VALUE)?
$SPREAD_PROP: "..." ${unknown}
$IDENTIFIER: /[-\w]/+
$PROP_VALUE:
  (/"/ (/[^"]/ | ${unknown})* /"/) |
  (/'/ (/[^']/ | ${unknown})* /'/) |
  ${unknown}
$COMMENT: "<!--" (/[\S\s]/ | ${unknown})*? "-->"
```

## Whitespace

The JSX whitespace rules are complicated and controversial.

In the early days of React, when the JSX syntax extension was still being
implemented in the popular transpilers of the time, contributors debated how
whitespace should work. Of course, it shouldn’t work like HTML’s whitespace,
because those rules are flexible, some might even say insane, a result of
HTML’s original goal as a markup language. Insofar as JSX is meant for
programmers, who spend their waking hours editing text files, for fun or for
profit, and like to fiddle with the whitespace in these files, they should
follow the same semantics as JavaScript itself. To this extent, one contributor
wrote:

> Indenting/beautifying code should never affect the outcome, especially as it
> means all indentation has to carry over into the final result and cannot be
> minified away (yuck!). While there are a handful of cases where you might
> want newlines to affect the outcome, those are far better handled explicitly
> by {' '} or {'\n'}.

https://github.com/facebook/jsx/issues/19#issuecomment-57079949

We can rephrase this as a desire for some whitespace in the JSX grammar to be
semantic-insensitive, for the purposes of programmers and tools to toy with.
Common use-cases include highlighting the “structure” of elements via
indentation, and trimming accidental whitespace at the ends of lines. These
use-cases can be rephrased as the concrete rule: whitespace at the starts and
ends of lines, can be added or removed without affecting the semantics of the
code, ”semantics” here meaning simply, the transpilation of JSX to
`createElement()` calls and strings.

The tricky part for JSX is the use-case mentioned previously, where developers
want “some” whitespace at the ends of lines to be significant, as between
“inline” elements separated by a newline. As the author indicates, the solution
is to use JSX’s interpolation syntax `{" "}` to do so.

```
return (
  <div>
    <span>Hello</span>{" "}
    <span>World</span>
  </div>
);
```

This a pitfall for developers new to JSX, who regularly assume that the
whitespace rules are the same or similar to that of HTML, as evidenced in issue
trackers for JSX transpilers. Additionally, this solution is in and of itself
“ugly,” or at the very least, it requires more characters to type out, and is a
bigger lift for authors of developer tools to manage.

To ease the tension, either developer tools need a semantic understanding of
inline/block tags to preserve whitespace across lines, or the whitespace rules
of JSX need to give a little. The former solution is futile, insofar as the
semantics of inline and block depends on external styling information in the
browser. Meanwhile, there’s been no progress made with regard to the JSX spec.

The root cause of all this worry is that the JSX grammar does not have a way to
indicate that whitespace at the ends of lines is significant. Thankfully,
JavaScript template strings allow for Unix-style escapes of newlines, so we
don’t have to deal with any of these problems!

```
yield x`
  <div>
    <span>Hello</span> \
    <span>World</span>
  </div>
`;
```

The only catch is that we have to use the raw representation of strings,
because the “cooked” representation does not indicate that the newline has been
escaped; it removes the newline from the text input. For instance, as we parse
the template in the previous example, we want to treat the whitespace on the
line before `<span>World</span>` as insignificant, but we would have no way of
knowing that these tabs were at the start of a new line.

## Some rambling thoughts on closing tags

JSX uses upper-case capitalization to determine whether a tag is an identifier
from the scope. The disadvantage for templates is that if we interpolate them,
this is slightly more typing (x`<${Component} />`). This unwieldy-ness is
exacerbated by closing tags, which must match opening tags to form a
well-formed tree.

```
yield x`
  <${Component}>hello</${Component}>
`;
```

Having to type out the `${}` twice is a bit of extra syntactic noise. Honestly,
as I look at the above example, it doesn’t seem too bad, but insofar as JSX is
not HTML, we can do what developit/htm does and have a catch-all closing tag
syntax like `<//>`.

```
yield x`
  <${Component}>hello<//>
`;
```

I think this would be the most explicit, least surprising design, right? Trying
to do fancy things where we allow closing elements to be un-interpolated, and
then compared against function names, for instance, would get in the way of
minifiers, which regularly mess with function names. Using the double-slash to
indicate we want to opt out of the well-formed XML constraint is nice and
explicit. We could also treat the double slash as a comment-like construct,
where you could put anything after the slashes. This is a fun thing that future
linters could fight about.

```
// Maybe a linter could be used to determine if the rules
yield x`
  <${Component}>hello<//Component>
`;
```

Little things:

Should we allow for interpolations in prop strings?

```
const cls = 1;
yield x`
  <div class="cls-${cls}">Hello</div>
`;
```

Why not!? It’s just nice and convenient, right?

Should we allow for interpolations in prop names?

```
yield x`
  <${Component} ${name}=${value} />
`;
```

Why not?
