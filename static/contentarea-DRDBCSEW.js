import {
  Edit
} from "./chunk-HYWJG25E.js";
import {
  init_Buffer,
  init_process
} from "./chunk-Z5A3KT4W.js";

// node_modules/@b9g/revise/contentarea.js
init_Buffer();
init_process();
var _cache = /* @__PURE__ */ Symbol.for("ContentArea._cache");
var _observer = /* @__PURE__ */ Symbol.for("ContentArea._observer");
var _onselectionchange = /* @__PURE__ */ Symbol.for("ContentArea._onselectionchange");
var _value = /* @__PURE__ */ Symbol.for("ContentArea._value");
var _selectionRange = /* @__PURE__ */ Symbol.for("ContentArea._selectionRange");
var _staleValue = /* @__PURE__ */ Symbol.for("ContentArea._staleValue");
var _staleSelectionRange = /* @__PURE__ */ Symbol.for("ContentArea._slateSelectionRange");
var _compositionBuffer = /* @__PURE__ */ Symbol.for("ContentArea._compositionBuffer");
var _compositionStartValue = /* @__PURE__ */ Symbol.for("ContentArea._compositionStartValue");
var _compositionSelectionRange = /* @__PURE__ */ Symbol.for("ContentArea._compositionSelectionRange");
var ContentAreaElement = class extends HTMLElement {
  constructor() {
    super();
    this[_cache] = /* @__PURE__ */ new Map();
    this[_observer] = new MutationObserver((records) => {
      if (this[_compositionBuffer]) {
        this[_compositionBuffer].push(...records);
      }
      validate(this, records);
    });
    this[_onselectionchange] = () => {
      this[_selectionRange] = getSelectionRange(this);
    };
    this[_value] = "";
    this[_selectionRange] = { start: 0, end: 0, direction: "none" };
    this[_staleValue] = void 0;
    this[_staleSelectionRange] = void 0;
    this[_compositionBuffer] = void 0;
    this[_compositionStartValue] = void 0;
    this[_compositionSelectionRange] = void 0;
  }
  /******************************/
  /*** Custom Element methods ***/
  /******************************/
  connectedCallback() {
    this[_observer].observe(this, {
      subtree: true,
      childList: true,
      characterData: true,
      characterDataOldValue: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: [
        "data-content"
        // TODO: implement these attributes
        //"data-contentbefore",
        //"data-contentafter",
      ]
    });
    document.addEventListener(
      "selectionchange",
      this[_onselectionchange],
      // We use capture in an attempt to run before other event listeners.
      true
    );
    validate(this);
    this[_onselectionchange]();
    let processCompositionTimeout;
    this.addEventListener("compositionstart", () => {
      clearTimeout(processCompositionTimeout);
      if (processCompositionTimeout == null) {
        this[_compositionBuffer] = [];
        this[_compositionStartValue] = this[_value];
        this[_compositionSelectionRange] = { ...this[_selectionRange] };
      }
      processCompositionTimeout = void 0;
    });
    const processComposition = () => {
      if (this[_compositionBuffer] && this[_compositionBuffer].length > 0 && this[_compositionStartValue] !== void 0 && this[_compositionSelectionRange] !== void 0) {
        const edit = Edit.diff(this[_compositionStartValue], this[_value], this[_compositionSelectionRange].start);
        const ev = new ContentEvent("contentchange", {
          detail: { edit, source: null, mutations: this[_compositionBuffer] }
        });
        this.dispatchEvent(ev);
        this[_staleValue] = void 0;
        this[_staleSelectionRange] = void 0;
      }
      this[_compositionBuffer] = void 0;
      this[_compositionStartValue] = void 0;
      this[_compositionSelectionRange] = void 0;
      processCompositionTimeout = void 0;
    };
    this.addEventListener("compositionend", () => {
      clearTimeout(processCompositionTimeout);
      processCompositionTimeout = setTimeout(processComposition);
    });
    this.addEventListener("blur", () => {
      clearTimeout(processCompositionTimeout);
      processComposition();
    });
    this.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this[_compositionBuffer]) {
        clearTimeout(processCompositionTimeout);
        processComposition();
      }
    });
  }
  disconnectedCallback() {
    this[_cache].clear();
    this[_value] = "";
    this[_observer].disconnect();
    if (document) {
      document.removeEventListener("selectionchange", this[_onselectionchange], true);
    }
  }
  get value() {
    validate(this);
    return this[_staleValue] == null ? this[_value] : this[_staleValue];
  }
  get selectionStart() {
    validate(this);
    const range = this[_staleSelectionRange] || this[_selectionRange];
    return range.start;
  }
  set selectionStart(start) {
    validate(this);
    const { end, direction } = getSelectionRange(this);
    setSelectionRange(this, { start, end, direction });
  }
  get selectionEnd() {
    validate(this);
    const range = this[_staleSelectionRange] || this[_selectionRange];
    return range.end;
  }
  set selectionEnd(end) {
    validate(this);
    const { start, direction } = getSelectionRange(this);
    setSelectionRange(this, { start, end, direction });
  }
  get selectionDirection() {
    validate(this);
    const range = this[_staleSelectionRange] || this[_selectionRange];
    return range.direction;
  }
  set selectionDirection(direction) {
    validate(this);
    const { start, end } = getSelectionRange(this);
    setSelectionRange(this, { start, end, direction });
  }
  getSelectionRange() {
    validate(this);
    const range = this[_staleSelectionRange] || this[_selectionRange];
    return { ...range };
  }
  setSelectionRange(start, end, direction = "none") {
    validate(this);
    setSelectionRange(this, { start, end, direction });
  }
  indexAt(node, offset) {
    validate(this);
    return indexAt(this, node, offset);
  }
  nodeOffsetAt(index) {
    validate(this);
    return nodeOffsetAt(this, index);
  }
  source(source) {
    return validate(this, this[_observer].takeRecords(), source);
  }
};
var PreventDefaultSource = /* @__PURE__ */ Symbol.for("ContentArea.PreventDefaultSource");
var ContentEvent = class extends CustomEvent {
  constructor(typeArg, eventInit) {
    super(typeArg, { bubbles: true, ...eventInit });
  }
  preventDefault() {
    if (this.defaultPrevented) {
      return;
    }
    super.preventDefault();
    const area = this.target;
    area[_staleValue] = area[_value];
    area[_staleSelectionRange] = area[_selectionRange];
    const records = this.detail.mutations;
    for (let i = records.length - 1; i >= 0; i--) {
      const record = records[i];
      switch (record.type) {
        case "childList": {
          for (let j = 0; j < record.addedNodes.length; j++) {
            const node = record.addedNodes[j];
            if (node.parentNode) {
              node.parentNode.removeChild(node);
            }
          }
          for (let j = 0; j < record.removedNodes.length; j++) {
            const node = record.removedNodes[j];
            record.target.insertBefore(node, record.nextSibling);
          }
          break;
        }
        case "characterData": {
          if (record.oldValue !== null) {
            record.target.data = record.oldValue;
          }
          break;
        }
        case "attributes": {
          if (record.oldValue === null) {
            record.target.removeAttribute(record.attributeName);
          } else {
            record.target.setAttribute(record.attributeName, record.oldValue);
          }
          break;
        }
      }
    }
    const records1 = area[_observer].takeRecords();
    validate(area, records1, PreventDefaultSource);
  }
};
var IS_OLD = 1 << 0;
var IS_VALID = 1 << 1;
var IS_BLOCKLIKE = 1 << 2;
var PREPENDS_NEWLINE = 1 << 3;
var APPENDS_NEWLINE = 1 << 4;
var NodeInfo = class {
  constructor(offset) {
    this.f = 0;
    this.offset = offset;
    this.length = 0;
  }
};
function validate(_this, records = _this[_observer].takeRecords(), source = null) {
  if (typeof _this !== "object" || _this[_cache] == null) {
    throw new TypeError("this is not a ContentAreaElement");
  } else if (!document.contains(_this)) {
    throw new Error("ContentArea cannot be read before it is inserted into the DOM");
  }
  if (!invalidate(_this, records)) {
    return false;
  }
  const oldValue = _this[_value];
  const edit = diff(_this, oldValue, _this[_selectionRange].start);
  _this[_value] = edit.apply(oldValue);
  _this[_selectionRange] = getSelectionRange(_this);
  if (source !== PreventDefaultSource && !_this[_compositionBuffer]) {
    const ev = new ContentEvent("contentchange", { detail: { edit, source, mutations: records } });
    _this.dispatchEvent(ev);
    _this[_staleValue] = void 0;
    _this[_staleSelectionRange] = void 0;
  }
  return true;
}
function invalidate(_this, records) {
  const cache = _this[_cache];
  if (!cache.get(_this)) {
    return true;
  }
  let invalid = false;
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    for (let j = 0; j < record.addedNodes.length; j++) {
      const addedNode = record.addedNodes[j];
      clear(addedNode, cache);
    }
    for (let j = 0; j < record.removedNodes.length; j++) {
      clear(record.removedNodes[j], cache);
    }
    let node = record.target;
    if (node === _this) {
      invalid = true;
      continue;
    } else if (!_this.contains(node)) {
      clear(node, cache);
      continue;
    }
    for (; node !== _this; node = node.parentNode) {
      if (!cache.has(node)) {
        break;
      }
      const nodeInfo = cache.get(node);
      if (nodeInfo) {
        nodeInfo.f &= ~IS_VALID;
      }
      invalid = true;
    }
  }
  if (invalid) {
    const nodeInfo = cache.get(_this);
    nodeInfo.f &= ~IS_VALID;
  }
  return invalid;
}
function clear(parent, cache) {
  const walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let node = parent; node !== null; node = walker.nextNode()) {
    cache.delete(node);
  }
}
var NEWLINE = "\n";
function diff(_this, oldValue, oldSelectionStart) {
  const walker = document.createTreeWalker(_this, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  const cache = _this[_cache];
  const stack = [];
  let nodeInfo;
  let value = "";
  for (let node = _this, descending = true, offset = 0, oldIndex = 0, oldIndexRelative = 0, hasNewline = false; ; node = walker.currentNode) {
    if (descending) {
      nodeInfo = cache.get(node);
      if (nodeInfo === void 0) {
        cache.set(node, nodeInfo = new NodeInfo(offset));
        if (isBlocklikeElement(node)) {
          nodeInfo.f |= IS_BLOCKLIKE;
        }
      } else {
        const expectedOffset = oldIndex - oldIndexRelative;
        const deleteLength = nodeInfo.offset - expectedOffset;
        if (deleteLength < 0) {
          throw new Error("cache offset error");
        } else if (deleteLength > 0) {
          oldIndex += deleteLength;
        }
        nodeInfo.offset = offset;
      }
      if (offset && !hasNewline && nodeInfo.f & IS_BLOCKLIKE) {
        hasNewline = true;
        offset += NEWLINE.length;
        value += NEWLINE;
        if (nodeInfo.f & PREPENDS_NEWLINE) {
          oldIndex += NEWLINE.length;
        }
        nodeInfo.f |= PREPENDS_NEWLINE;
      } else {
        if (nodeInfo.f & PREPENDS_NEWLINE) {
          oldIndex += NEWLINE.length;
        }
        nodeInfo.f &= ~PREPENDS_NEWLINE;
      }
      descending = false;
      if (nodeInfo.f & IS_VALID) {
        if (nodeInfo.length) {
          value += oldValue.slice(oldIndex, oldIndex + nodeInfo.length);
          oldIndex += nodeInfo.length;
          offset += nodeInfo.length;
          hasNewline = oldValue.slice(Math.max(0, oldIndex - NEWLINE.length), oldIndex) === NEWLINE;
        }
      } else if (node.nodeType === Node.TEXT_NODE) {
        const text = node.data;
        if (text.length) {
          value += text;
          offset += text.length;
          hasNewline = text.endsWith(NEWLINE);
        }
        if (nodeInfo.f & IS_OLD) {
          oldIndex += nodeInfo.length;
        }
      } else if (node.hasAttribute("data-content")) {
        const text = node.getAttribute("data-content") || "";
        if (text.length) {
          value += text;
          offset += text.length;
          hasNewline = text.endsWith(NEWLINE);
        }
        if (nodeInfo.f & IS_OLD) {
          oldIndex += nodeInfo.length;
        }
      } else if (node.nodeName === "BR") {
        value += NEWLINE;
        offset += NEWLINE.length;
        hasNewline = true;
        if (nodeInfo.f & IS_OLD) {
          oldIndex += nodeInfo.length;
        }
      } else {
        descending = !!walker.firstChild();
        if (descending) {
          stack.push({ nodeInfo, oldIndexRelative });
          offset = 0;
          oldIndexRelative = oldIndex;
        }
      }
    } else {
      if (!stack.length) {
        throw new Error("Stack is empty");
      }
      if (nodeInfo.f & PREPENDS_NEWLINE) {
        offset += NEWLINE.length;
      }
      ({ nodeInfo, oldIndexRelative } = stack.pop());
      offset = nodeInfo.offset + offset;
    }
    if (!descending) {
      if (!(nodeInfo.f & IS_VALID)) {
        if (!hasNewline && nodeInfo.f & IS_BLOCKLIKE) {
          value += NEWLINE;
          offset += NEWLINE.length;
          hasNewline = true;
          nodeInfo.f |= APPENDS_NEWLINE;
        } else {
          nodeInfo.f &= ~APPENDS_NEWLINE;
        }
        nodeInfo.length = offset - nodeInfo.offset;
        nodeInfo.f |= IS_VALID;
      }
      nodeInfo.f |= IS_OLD;
      descending = !!walker.nextSibling();
      if (!descending) {
        if (walker.currentNode === _this) {
          break;
        }
        walker.parentNode();
      }
    }
    if (oldIndex > oldValue.length) {
      throw new Error("cache length error");
    }
  }
  const selectionStart = getSelectionRange(_this).start;
  return Edit.diff(oldValue, value, Math.min(oldSelectionStart, selectionStart));
}
var BLOCKLIKE_DISPLAYS = /* @__PURE__ */ new Set([
  "block",
  "flex",
  "grid",
  "flow-root",
  "list-item",
  "table",
  "table-row-group",
  "table-header-group",
  "table-footer-group",
  "table-row",
  "table-caption"
]);
function isBlocklikeElement(node) {
  return node.nodeType === Node.ELEMENT_NODE && BLOCKLIKE_DISPLAYS.has(
    // handle two-value display syntax like `display: block flex`
    getComputedStyle(node).display.split(" ")[0]
  );
}
function indexAt(_this, node, offset) {
  const cache = _this[_cache];
  if (node == null || !_this.contains(node)) {
    return -1;
  }
  if (!cache.has(node)) {
    offset = 0;
    while (!cache.has(node)) {
      node = node.parentNode;
    }
  }
  let index;
  if (node.nodeType === Node.TEXT_NODE) {
    const nodeInfo = cache.get(node);
    index = offset + nodeInfo.offset;
    node = node.parentNode;
  } else {
    if (offset <= 0) {
      index = 0;
    } else if (offset >= node.childNodes.length) {
      const nodeInfo = cache.get(node);
      index = nodeInfo.f & APPENDS_NEWLINE ? nodeInfo.length - NEWLINE.length : nodeInfo.length;
    } else {
      let child = node.childNodes[offset];
      while (child !== null && !cache.has(child)) {
        child = child.previousSibling;
      }
      if (child === null) {
        index = 0;
      } else {
        node = child;
        const nodeInfo = cache.get(node);
        index = nodeInfo.f & PREPENDS_NEWLINE ? -1 : 0;
      }
    }
  }
  for (; node !== _this; node = node.parentNode) {
    const nodeInfo = cache.get(node);
    index += nodeInfo.offset;
    if (nodeInfo.f & PREPENDS_NEWLINE) {
      index += NEWLINE.length;
    }
  }
  return index;
}
function nodeOffsetAt(_this, index) {
  if (index < 0) {
    return [null, 0];
  }
  const [node, offset] = findNodeOffset(_this, index);
  if (node && node.nodeName === "BR") {
    return nodeOffsetFromChild(node);
  }
  return [node, offset];
}
function findNodeOffset(_this, index) {
  const cache = _this[_cache];
  const walker = document.createTreeWalker(_this, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let node2 = _this; node2 !== null; ) {
    const nodeInfo = cache.get(node2);
    if (nodeInfo == null) {
      return nodeOffsetFromChild(node2, index > 0);
    }
    if (nodeInfo.f & PREPENDS_NEWLINE) {
      index -= 1;
    }
    if (index === nodeInfo.length && node2.nodeType === Node.TEXT_NODE) {
      return [node2, node2.data.length];
    } else if (index >= nodeInfo.length) {
      index -= nodeInfo.length;
      const nextSibling = walker.nextSibling();
      if (nextSibling === null) {
        if (node2 === _this) {
          return [node2, getNodeLength(node2)];
        }
        return nodeOffsetFromChild(walker.currentNode, true);
      }
      node2 = nextSibling;
    } else {
      if (node2.nodeType === Node.ELEMENT_NODE && node2.hasAttribute("data-content")) {
        return nodeOffsetFromChild(node2, index > 0);
      }
      const firstChild = walker.firstChild();
      if (firstChild === null) {
        const offset = node2.nodeType === Node.TEXT_NODE ? index : index > 0 ? 1 : 0;
        return [node2, offset];
      } else {
        node2 = firstChild;
      }
    }
  }
  const node = walker.currentNode;
  return [node, getNodeLength(node)];
}
function getNodeLength(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.data.length;
  }
  return node.childNodes.length;
}
function nodeOffsetFromChild(node, after = false) {
  const parentNode = node.parentNode;
  if (parentNode === null) {
    return [null, 0];
  }
  let offset = Array.from(parentNode.childNodes).indexOf(node);
  if (after) {
    offset++;
  }
  return [parentNode, offset];
}
function getSelectionRange(_this) {
  const selection = document.getSelection();
  if (!selection) {
    return { start: 0, end: 0, direction: "none" };
  }
  const { focusNode, focusOffset, anchorNode, anchorOffset, isCollapsed } = selection;
  const focus = Math.max(0, indexAt(_this, focusNode, focusOffset));
  const anchor = isCollapsed ? focus : Math.max(0, indexAt(_this, anchorNode, anchorOffset));
  return {
    start: Math.min(focus, anchor),
    end: Math.max(focus, anchor),
    direction: focus < anchor ? "backward" : focus > anchor ? "forward" : "none"
  };
}
function setSelectionRange(_this, { start, end, direction }) {
  const selection = document.getSelection();
  if (!selection) {
    return;
  }
  start = Math.max(0, start || 0);
  end = Math.max(0, end || 0);
  if (end < start) {
    start = end;
  }
  const [focus, anchor] = direction === "backward" ? [start, end] : [end, start];
  if (focus === anchor) {
    const [node, offset] = nodeOffsetAt(_this, focus);
    selection.collapse(node, offset);
  } else {
    const [anchorNode, anchorOffset] = nodeOffsetAt(_this, anchor);
    const [focusNode, focusOffset] = nodeOffsetAt(_this, focus);
    if (anchorNode === null && focusNode === null) {
      selection.collapse(null);
    } else if (anchorNode === null) {
      selection.collapse(focusNode, focusOffset);
    } else if (focusNode === null) {
      selection.collapse(anchorNode, anchorOffset);
    } else {
      selection.setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset);
    }
  }
}
export {
  ContentAreaElement,
  ContentEvent
};
