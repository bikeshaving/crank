import {
  Portal,
  REACT_SVG_PROPS,
  Renderer,
  camelToKebabCase,
  createElement,
  formatStyleValue
} from "./chunk-4BVTMV6T.js";
import {
  init_Buffer,
  init_process
} from "./chunk-HNZBFXQU.js";

// node_modules/@b9g/crank/standalone.js
init_Buffer();
init_process();

// node_modules/@b9g/crank/jsx-tag.js
init_Buffer();
init_process();
var cache = /* @__PURE__ */ new Map();
function jsx(spans, ...expressions) {
  const key = JSON.stringify(spans.raw);
  let parseResult = cache.get(key);
  if (parseResult == null) {
    parseResult = parse(spans.raw);
    let hasError = false;
    for (let i = 0; i < parseResult.targets.length; i++) {
      const t = parseResult.targets[i];
      if (t && t.type === "error") {
        hasError = true;
        break;
      }
    }
    if (!hasError) {
      cache.set(key, parseResult);
    }
  }
  const { element, targets } = parseResult;
  for (let i = 0; i < expressions.length; i++) {
    const exp = expressions[i];
    const target = targets[i];
    if (target) {
      if (target.type === "error") {
        const msg = target.message.replace("${}", formatTagForError(exp));
        throw new SyntaxError(target.spanIndex != null && target.charIndex != null ? formatSyntaxError(msg, spans.raw, target.spanIndex, target.charIndex) : msg);
      }
      target.value = exp;
    }
  }
  return build(element, parseResult.spans);
}
var html = jsx;
var CHILDREN_RE = /((?:\r|\n|\r\n)\s*)|(<!--[\S\s]*?(?:-->|$))|(<\s*(\/{0,2})\s*([-_$\w]*))/g;
var PROPS_RE = /\s*(?:(\/?\s*>)|(\.\.\.\s*)|(?:([-_$\w]+)\s*(=)?\s*(?:("(\\"|[\S\s])*?(?:"|$)|'(?:\\'|[\S\s])*?(?:'|$)))?))/g;
var CLOSING_BRACKET_RE = />/g;
var CLOSING_SINGLE_QUOTE_RE = /[^\\]?'/g;
var CLOSING_DOUBLE_QUOTE_RE = /[^\\]?"/g;
var CLOSING_COMMENT_RE = /-->/g;
function parse(spans) {
  let matcher = CHILDREN_RE;
  const stack = [];
  let element = {
    type: "element",
    open: { type: "tag", slash: "", value: "" },
    close: null,
    props: [],
    children: []
  };
  const targets = [];
  let lineStart = true;
  for (let s = 0; s < spans.length; s++) {
    const span = spans[s];
    const expressing = s < spans.length - 1;
    let expressionTarget = null;
    for (let i = 0, end = i; i < span.length; i = end) {
      matcher.lastIndex = i;
      const match = matcher.exec(span);
      end = match ? match.index + match[0].length : span.length;
      switch (matcher) {
        case CHILDREN_RE: {
          if (match) {
            const [, newline, comment, tag, closingSlash, tagName] = match;
            if (i < match.index) {
              let before = span.slice(i, match.index);
              if (lineStart) {
                before = before.replace(/^\s*/, "");
              }
              if (newline) {
                if (span[Math.max(0, match.index - 1)] === "\\") {
                  before = before.slice(0, -1);
                } else {
                  before = before.replace(/\s*$/, "");
                }
              }
              if (before) {
                element.children.push({ type: "value", value: before });
              }
            }
            lineStart = !!newline;
            if (comment) {
              if (end === span.length) {
                matcher = CLOSING_COMMENT_RE;
              }
            } else if (tag) {
              if (closingSlash) {
                element.close = {
                  type: "tag",
                  slash: closingSlash,
                  value: tagName,
                  spanIndex: s,
                  charIndex: match.index
                };
                if (!stack.length) {
                  if (end !== span.length) {
                    throw new SyntaxError(formatSyntaxError(`Unmatched closing tag "${tagName}"`, spans, s, match.index));
                  }
                  expressionTarget = {
                    type: "error",
                    message: "Unmatched closing tag ${}",
                    value: null,
                    spanIndex: s,
                    charIndex: match.index
                  };
                } else {
                  if (end === span.length) {
                    expressionTarget = element.close;
                  }
                  element = stack.pop();
                  matcher = CLOSING_BRACKET_RE;
                }
              } else {
                const next = {
                  type: "element",
                  open: {
                    type: "tag",
                    slash: "",
                    value: tagName,
                    spanIndex: s,
                    charIndex: match.index
                  },
                  close: null,
                  props: [],
                  children: []
                };
                element.children.push(next);
                stack.push(element);
                element = next;
                matcher = PROPS_RE;
                if (end === span.length) {
                  expressionTarget = element.open;
                }
              }
            }
          } else {
            if (i < span.length) {
              let after = span.slice(i);
              if (!expressing) {
                after = after.replace(/\s*$/, "");
              }
              if (after) {
                element.children.push({ type: "value", value: after });
              }
            }
          }
          break;
        }
        case PROPS_RE: {
          if (match) {
            const [, tagEnd, spread, name, equals, string] = match;
            if (i < match.index) {
              throw new SyntaxError(formatSyntaxError(`Unexpected text \`${span.slice(i, match.index).trim()}\``, spans, s, i));
            }
            if (tagEnd) {
              if (tagEnd[0] === "/") {
                element = stack.pop();
              }
              matcher = CHILDREN_RE;
            } else if (spread) {
              const value = {
                type: "value",
                value: null
              };
              element.props.push(value);
              expressionTarget = value;
              if (!(expressing && end === span.length)) {
                throw new SyntaxError(formatSyntaxError('Expression expected after "..."', spans, s, match.index));
              }
            } else if (name) {
              let value;
              if (string == null) {
                if (!equals) {
                  value = { type: "value", value: true };
                } else if (end < span.length) {
                  throw new SyntaxError(formatSyntaxError(`Unexpected text \`${span.slice(end, end + 20)}\``, spans, s, end));
                } else {
                  value = { type: "value", value: null };
                  expressionTarget = value;
                  if (!(expressing && end === span.length)) {
                    throw new SyntaxError(formatSyntaxError(`Expression expected for prop "${name}"`, spans, s, match.index));
                  }
                }
              } else {
                const quote = string[0];
                value = { type: "propString", parts: [] };
                value.parts.push(string);
                if (end === span.length) {
                  matcher = quote === "'" ? CLOSING_SINGLE_QUOTE_RE : CLOSING_DOUBLE_QUOTE_RE;
                }
              }
              const prop = {
                type: "prop",
                name,
                value
              };
              element.props.push(prop);
            }
          } else {
            if (!expressing) {
              if (i === span.length) {
                throw new SyntaxError(formatSyntaxError(`Expected props but reached end of document`, spans, s, i));
              } else {
                throw new SyntaxError(formatSyntaxError(`Unexpected text \`${span.slice(i, i + 20).trim()}\``, spans, s, i));
              }
            }
          }
          break;
        }
        case CLOSING_BRACKET_RE: {
          if (match) {
            if (i < match.index) {
              throw new SyntaxError(formatSyntaxError(`Unexpected text \`${span.slice(i, match.index).trim()}\``, spans, s, i));
            }
            matcher = CHILDREN_RE;
          } else {
            if (!expressing) {
              throw new SyntaxError(formatSyntaxError(`Unexpected text \`${span.slice(i, i + 20).trim()}\``, spans, s, i));
            }
          }
          break;
        }
        case CLOSING_SINGLE_QUOTE_RE:
        case CLOSING_DOUBLE_QUOTE_RE: {
          const string = span.slice(i, end);
          const prop = element.props[element.props.length - 1];
          const propString = prop.value;
          propString.parts.push(string);
          if (match) {
            matcher = PROPS_RE;
          } else {
            if (!expressing) {
              throw new SyntaxError(formatSyntaxError(`Missing \`${matcher === CLOSING_SINGLE_QUOTE_RE ? "'" : '"'}\``, spans, s, i));
            }
          }
          break;
        }
        case CLOSING_COMMENT_RE: {
          if (match) {
            matcher = CHILDREN_RE;
          } else {
            if (!expressing) {
              throw new SyntaxError(formatSyntaxError("Expected `-->` but reached end of template", spans, s, i));
            }
          }
          break;
        }
      }
    }
    if (expressing) {
      if (expressionTarget) {
        targets.push(expressionTarget);
        if (expressionTarget.type === "error") {
          break;
        }
        continue;
      }
      switch (matcher) {
        case CHILDREN_RE: {
          const target = { type: "value", value: null };
          element.children.push(target);
          targets.push(target);
          break;
        }
        case CLOSING_SINGLE_QUOTE_RE:
        case CLOSING_DOUBLE_QUOTE_RE: {
          const prop = element.props[element.props.length - 1];
          const target = { type: "value", value: null };
          prop.value.parts.push(target);
          targets.push(target);
          break;
        }
        case CLOSING_COMMENT_RE:
          targets.push(null);
          break;
        default:
          throw new SyntaxError(formatSyntaxError("Unexpected expression", spans, s, spans[s].length));
      }
    } else if (expressionTarget) {
      throw new SyntaxError(formatSyntaxError("Expression expected", spans, s, spans[s].length));
    }
    lineStart = false;
  }
  if (stack.length) {
    const ti = targets.indexOf(element.open);
    if (ti === -1) {
      throw new SyntaxError(formatSyntaxError(`Unmatched opening tag "${element.open.value}"`, spans, element.open.spanIndex ?? 0, element.open.charIndex ?? 0));
    }
    targets[ti] = {
      type: "error",
      message: "Unmatched opening tag ${}",
      value: null,
      spanIndex: element.open.spanIndex,
      charIndex: element.open.charIndex
    };
  }
  if (element.children.length === 1 && element.children[0].type === "element") {
    element = element.children[0];
  }
  return { element, targets, spans };
}
function build(parsed, spans) {
  if (parsed.close !== null && parsed.close.slash !== "//" && parsed.open.value !== parsed.close.value) {
    const msg = `Unmatched closing tag ${formatTagForError(parsed.close.value)}, expected ${formatTagForError(parsed.open.value)}`;
    throw new SyntaxError(spans && parsed.close.spanIndex != null && parsed.close.charIndex != null ? formatSyntaxError(msg, spans, parsed.close.spanIndex, parsed.close.charIndex) : msg);
  }
  const children = [];
  for (let i = 0; i < parsed.children.length; i++) {
    const child = parsed.children[i];
    children.push(child.type === "element" ? build(child, spans) : child.value);
  }
  let props = parsed.props.length ? {} : null;
  for (let i = 0; i < parsed.props.length; i++) {
    const prop = parsed.props[i];
    if (prop.type === "prop") {
      let value;
      if (prop.value.type === "value") {
        value = prop.value.value;
      } else {
        let string = "";
        for (let i2 = 0; i2 < prop.value.parts.length; i2++) {
          const part = prop.value.parts[i2];
          if (typeof part === "string") {
            string += part;
          } else if (typeof part.value !== "boolean" && part.value != null) {
            string += typeof part.value === "string" ? part.value : String(part.value);
          }
        }
        value = string.slice(1, -1).replace(/\\x[0-9a-f]{2}|\\u[0-9a-f]{4}|\\u\{[0-9a-f]+\}|\\./gi, (match) => {
          switch (match[1]) {
            case "b":
              return "\b";
            case "f":
              return "\f";
            case "n":
              return "\n";
            case "r":
              return "\r";
            case "t":
              return "	";
            case "v":
              return "\v";
            case "x":
              return String.fromCharCode(parseInt(match.slice(2), 16));
            case "u":
              if (match[2] === "{") {
                return String.fromCodePoint(parseInt(match.slice(3, -1), 16));
              }
              return String.fromCharCode(parseInt(match.slice(2), 16));
            case "0":
              return "\0";
            default:
              return match.slice(1);
          }
        });
      }
      props[prop.name] = value;
    } else {
      props = { ...props, ...prop.value };
    }
  }
  return createElement(parsed.open.value, props, ...children);
}
function formatTagForError(tag) {
  return typeof tag === "function" ? tag.name + "()" : typeof tag === "string" ? `"${tag}"` : JSON.stringify(tag);
}
function formatSyntaxError(message, spans, spanIndex, charIndex) {
  let source = spans[0];
  for (let i = 1; i < spans.length; i++) {
    source += "${}" + spans[i];
  }
  let offset = 0;
  for (let i = 0; i < spanIndex; i++) {
    offset += spans[i].length + 3;
  }
  offset += charIndex;
  const lines = source.split(/\n/);
  let line = 0;
  let col = offset;
  for (let i = 0; i < lines.length; i++) {
    if (col <= lines[i].length) {
      line = i;
      break;
    }
    col -= lines[i].length + 1;
  }
  let result = `${message}

`;
  const start = Math.max(0, line - 1);
  const end = Math.min(lines.length - 1, line + 1);
  const gutterWidth = String(end + 1).length;
  for (let i = start; i <= end; i++) {
    const num = String(i + 1).padStart(gutterWidth);
    if (i === line) {
      result += `> ${num} | ${lines[i]}
`;
      result += `  ${" ".repeat(gutterWidth)} | ${" ".repeat(col)}^
`;
    } else {
      result += `  ${num} | ${lines[i]}
`;
    }
  }
  return result.trimEnd();
}

// node_modules/@b9g/crank/html.js
init_Buffer();
init_process();
var voidTags = /* @__PURE__ */ new Set([
  "area",
  "base",
  "br",
  "col",
  "command",
  "embed",
  "hr",
  "img",
  "input",
  "keygen",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
]);
function escape(text) {
  return text.replace(/[&<>"']/g, (match) => {
    switch (match) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#039;";
      default:
        return "";
    }
  });
}
function printStyleObject(style) {
  const cssStrings = [];
  for (const [name, value] of Object.entries(style)) {
    if (value != null) {
      const cssName = camelToKebabCase(name);
      const cssValue = formatStyleValue(cssName, value);
      cssStrings.push(`${cssName}:${cssValue};`);
    }
  }
  return cssStrings.join("");
}
function printAttrs(props, isSVG) {
  const attrs = [];
  for (let [name, value] of Object.entries(props)) {
    if (name === "innerHTML" || name === "dangerouslySetInnerHTML" || name.startsWith("prop:")) {
      continue;
    } else if (name === "htmlFor") {
      if ("for" in props || value == null || value === false) {
        continue;
      }
      attrs.push(`for="${escape(String(value === true ? "" : value))}"`);
    } else if (name === "style") {
      if (typeof value === "string") {
        attrs.push(`style="${escape(value)}"`);
      } else if (typeof value === "object" && value !== null) {
        attrs.push(`style="${escape(printStyleObject(value))}"`);
      }
    } else if (name === "className") {
      if ("class" in props || typeof value !== "string") {
        continue;
      }
      attrs.push(`class="${escape(value)}"`);
    } else if (name === "class") {
      if (typeof value === "string") {
        attrs.push(`class="${escape(value)}"`);
      } else if (typeof value === "object" && value !== null) {
        const classes = Object.keys(value).filter((k) => value[k]).join(" ");
        if (classes) {
          attrs.push(`class="${escape(classes)}"`);
        }
      }
    } else {
      if (name.startsWith("attr:")) {
        name = name.slice("attr:".length);
      } else if (isSVG && name in REACT_SVG_PROPS) {
        name = REACT_SVG_PROPS[name];
      }
      if (typeof value === "string") {
        attrs.push(`${escape(name)}="${escape(value)}"`);
      } else if (typeof value === "number") {
        attrs.push(`${escape(name)}="${value}"`);
      } else if (value === true) {
        attrs.push(`${escape(name)}`);
      }
    }
  }
  return attrs.join(" ");
}
function join(children) {
  let result = "";
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    result += typeof child === "string" ? child : child.value;
  }
  return result;
}
var impl = {
  scope({ scope, tag }) {
    if (tag === Portal) {
      return void 0;
    }
    switch (tag) {
      case "svg":
        return "svg";
      case "math":
        return "math";
      case "foreignObject":
        return void 0;
    }
    return scope;
  },
  create() {
    return { value: "" };
  },
  text({ value }) {
    return { value: escape(value) };
  },
  read(value) {
    if (Array.isArray(value)) {
      return join(value);
    } else if (typeof value === "undefined") {
      return "";
    } else if (typeof value === "string") {
      return value;
    } else {
      return value.value || "";
    }
  },
  arrange({ tag, tagName, node, props, children, scope }) {
    var _a;
    if (tag === Portal) {
      return;
    } else if (typeof tag !== "string") {
      throw new Error(`Unknown tag: ${tagName}`);
    }
    const attrs = printAttrs(props, scope === "svg" || tag === "foreignObject");
    const open = `<${tag}${attrs.length ? " " : ""}${attrs}>`;
    let result;
    if (voidTags.has(tag)) {
      result = open;
    } else {
      const close = `</${tag}>`;
      const contents = "innerHTML" in props ? props["innerHTML"] : "dangerouslySetInnerHTML" in props ? ((_a = props["dangerouslySetInnerHTML"]) == null ? void 0 : _a.__html) ?? "" : join(children);
      result = `${open}${contents}${close}`;
    }
    node.value = result;
  }
};
var HTMLRenderer = class extends Renderer {
  constructor() {
    super(impl);
  }
};
var renderer = new HTMLRenderer();

export {
  jsx,
  html,
  HTMLRenderer,
  renderer
};
