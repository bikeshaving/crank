// node_modules/@b9g/crank/event-target.js
var NONE = 0;
var CAPTURING_PHASE = 1;
var AT_TARGET = 2;
var BUBBLING_PHASE = 3;
function isEventTarget(value) {
  return value != null && typeof value.addEventListener === "function" && typeof value.removeEventListener === "function" && typeof value.dispatchEvent === "function";
}
function setEventProperty(ev, key, value) {
  Object.defineProperty(ev, key, { value, writable: false, configurable: true });
}
function isListenerOrListenerObject(value) {
  return typeof value === "function" || value !== null && typeof value === "object" && typeof value.handleEvent === "function";
}
function normalizeListenerOptions(options) {
  if (typeof options === "boolean") {
    return { capture: options };
  } else if (options == null) {
    return {};
  }
  return options;
}
var _parent = /* @__PURE__ */ Symbol.for("CustomEventTarget.parent");
var _listeners = /* @__PURE__ */ Symbol.for("CustomEventTarget.listeners");
var _delegates = /* @__PURE__ */ Symbol.for("CustomEventTarget.delegates");
var _dispatchEventOnSelf = /* @__PURE__ */ Symbol.for("CustomEventTarget.dispatchSelf");
var CustomEventTarget = class {
  constructor(parent = null) {
    this[_parent] = parent;
    this[_listeners] = [];
    this[_delegates] = /* @__PURE__ */ new Set();
  }
  addEventListener(type, listener, options) {
    if (!isListenerOrListenerObject(listener)) {
      return;
    }
    const listeners = this[_listeners];
    options = normalizeListenerOptions(options);
    let callback;
    if (typeof listener === "function") {
      callback = listener;
    } else {
      callback = (ev) => listener.handleEvent(ev);
    }
    const record = { type, listener, callback, options };
    if (options.once) {
      record.callback = function() {
        const i = listeners.indexOf(record);
        if (i !== -1) {
          listeners.splice(i, 1);
        }
        return callback.apply(this, arguments);
      };
    }
    if (listeners.some((record1) => record.type === record1.type && record.listener === record1.listener && !record.options.capture === !record1.options.capture)) {
      return;
    }
    listeners.push(record);
    for (const delegate of this[_delegates]) {
      delegate.addEventListener(type, record.callback, record.options);
    }
  }
  removeEventListener(type, listener, options) {
    const listeners = this[_listeners];
    if (listeners == null || !isListenerOrListenerObject(listener)) {
      return;
    }
    const options1 = normalizeListenerOptions(options);
    const i = listeners.findIndex((record2) => record2.type === type && record2.listener === listener && !record2.options.capture === !options1.capture);
    if (i === -1) {
      return;
    }
    const record = listeners[i];
    listeners.splice(i, 1);
    for (const delegate of this[_delegates]) {
      delegate.removeEventListener(record.type, record.callback, record.options);
    }
  }
  dispatchEvent(ev) {
    const path = [];
    for (let parent = this[_parent]; parent; parent = parent[_parent]) {
      path.push(parent);
    }
    let cancelBubble = false;
    let immediateCancelBubble = false;
    const stopPropagation = ev.stopPropagation;
    setEventProperty(ev, "stopPropagation", () => {
      cancelBubble = true;
      return stopPropagation.call(ev);
    });
    const stopImmediatePropagation = ev.stopImmediatePropagation;
    setEventProperty(ev, "stopImmediatePropagation", () => {
      immediateCancelBubble = true;
      return stopImmediatePropagation.call(ev);
    });
    setEventProperty(ev, "target", this);
    try {
      setEventProperty(ev, "eventPhase", CAPTURING_PHASE);
      for (let i = path.length - 1; i >= 0; i--) {
        const target = path[i];
        const listeners = target[_listeners];
        setEventProperty(ev, "currentTarget", target);
        for (let i2 = 0; i2 < listeners.length; i2++) {
          const record = listeners[i2];
          if (record.type === ev.type && record.options.capture) {
            try {
              record.callback.call(target, ev);
            } catch (err) {
              console.error(err);
            }
            if (immediateCancelBubble) {
              return true;
            }
          }
        }
        if (cancelBubble) {
          return true;
        }
      }
      {
        setEventProperty(ev, "eventPhase", AT_TARGET);
        setEventProperty(ev, "currentTarget", this);
        this[_dispatchEventOnSelf](ev);
        if (immediateCancelBubble) {
          return true;
        }
        const listeners = this[_listeners];
        for (let i = 0; i < listeners.length; i++) {
          const record = listeners[i];
          if (record.type === ev.type) {
            try {
              record.callback.call(this, ev);
            } catch (err) {
              console.error(err);
            }
            if (immediateCancelBubble) {
              return true;
            }
          }
        }
        if (cancelBubble) {
          return true;
        }
      }
      if (ev.bubbles) {
        setEventProperty(ev, "eventPhase", BUBBLING_PHASE);
        for (let i = 0; i < path.length; i++) {
          const target = path[i];
          setEventProperty(ev, "currentTarget", target);
          const listeners = target[_listeners];
          for (let i2 = 0; i2 < listeners.length; i2++) {
            const record = listeners[i2];
            if (record.type === ev.type && !record.options.capture) {
              try {
                record.callback.call(target, ev);
              } catch (err) {
                console.error(err);
              }
              if (immediateCancelBubble) {
                return true;
              }
            }
          }
          if (cancelBubble) {
            return true;
          }
        }
      }
    } finally {
      setEventProperty(ev, "eventPhase", NONE);
      setEventProperty(ev, "currentTarget", null);
      return !ev.defaultPrevented;
    }
  }
  [_dispatchEventOnSelf](_ev) {
  }
};
CustomEventTarget.dispatchEventOnSelf = _dispatchEventOnSelf;
function addEventTargetDelegates(target, delegates, include = (target1) => target === target1) {
  const delegates1 = delegates.filter(isEventTarget);
  for (let target1 = target; target1 && include(target1); target1 = target1[_parent]) {
    for (let i = 0; i < delegates1.length; i++) {
      const delegate = delegates1[i];
      if (target1[_delegates].has(delegate)) {
        continue;
      }
      target1[_delegates].add(delegate);
      for (const record of target1[_listeners]) {
        delegate.addEventListener(record.type, record.callback, record.options);
      }
    }
  }
}
function removeEventTargetDelegates(target, delegates, include = (target1) => target === target1) {
  const delegates1 = delegates.filter(isEventTarget);
  for (let target1 = target; target1 && include(target1); target1 = target1[_parent]) {
    for (let i = 0; i < delegates1.length; i++) {
      const delegate = delegates1[i];
      if (!target1[_delegates].has(delegate)) {
        continue;
      }
      target1[_delegates].delete(delegate);
      for (const record of target1[_listeners]) {
        delegate.removeEventListener(record.type, record.callback, record.options);
      }
    }
  }
}
function clearEventListeners(target) {
  const listeners = target[_listeners];
  const delegates = target[_delegates];
  for (let i = 0; i < listeners.length; i++) {
    const record = listeners[i];
    for (const delegate of delegates) {
      delegate.removeEventListener(record.type, record.callback, record.options);
    }
  }
  listeners.length = 0;
  delegates.clear();
}

// node_modules/@b9g/crank/_utils.js
function wrap(value) {
  return value === void 0 ? [] : Array.isArray(value) ? value : [value];
}
function unwrap(arr) {
  return arr.length === 0 ? void 0 : arr.length === 1 ? arr[0] : arr;
}
function arrayify(value) {
  return value == null ? [] : Array.isArray(value) ? value : typeof value === "string" || typeof value[Symbol.iterator] !== "function" ? [value] : [...value];
}
function isIteratorLike(value) {
  return value != null && typeof value.next === "function";
}
function isPromiseLike(value) {
  return value != null && typeof value.then === "function";
}
function createRaceRecord(contender) {
  const deferreds = /* @__PURE__ */ new Set();
  const record = { deferreds, settled: false };
  Promise.resolve(contender).then((value) => {
    for (const { resolve } of deferreds) {
      resolve(value);
    }
    deferreds.clear();
    record.settled = true;
  }, (err) => {
    for (const { reject } of deferreds) {
      reject(err);
    }
    deferreds.clear();
    record.settled = true;
  });
  return record;
}
var wm = /* @__PURE__ */ new WeakMap();
function safeRace(contenders) {
  let deferred;
  const result = new Promise((resolve, reject) => {
    deferred = { resolve, reject };
    for (const contender of contenders) {
      if (!isPromiseLike(contender)) {
        Promise.resolve(contender).then(resolve, reject);
        continue;
      }
      let record = wm.get(contender);
      if (record === void 0) {
        record = createRaceRecord(contender);
        record.deferreds.add(deferred);
        wm.set(contender, record);
      } else if (record.settled) {
        Promise.resolve(contender).then(resolve, reject);
      } else {
        record.deferreds.add(deferred);
      }
    }
  });
  return result.finally(() => {
    for (const contender of contenders) {
      if (isPromiseLike(contender)) {
        const record = wm.get(contender);
        if (record) {
          record.deferreds.delete(deferred);
        }
      }
    }
  });
}

// node_modules/@b9g/crank/crank.js
var NOOP = () => {
};
function getTagName(tag) {
  return typeof tag === "function" ? tag.name || "Anonymous" : typeof tag === "string" ? tag : (
    // tag is symbol, using else branch to avoid typeof tag === "symbol"
    tag.description || "Anonymous"
  );
}
var Fragment = "";
var Portal = /* @__PURE__ */ Symbol.for("crank.Portal");
var Copy = /* @__PURE__ */ Symbol.for("crank.Copy");
var Text = /* @__PURE__ */ Symbol.for("crank.Text");
var Raw = /* @__PURE__ */ Symbol.for("crank.Raw");
var ElementSymbol = /* @__PURE__ */ Symbol.for("crank.Element");
var Element = class {
  constructor(tag, props) {
    this.tag = tag;
    this.props = props;
  }
};
Element.prototype.$$typeof = ElementSymbol;
function isElement(value) {
  return value != null && value.$$typeof === ElementSymbol;
}
var DEPRECATED_PROP_PREFIXES = ["crank-", "c-", "$"];
var DEPRECATED_SPECIAL_PROP_BASES = ["key", "ref", "static", "copy"];
function createElement(tag, props, ...children) {
  if (props == null) {
    props = {};
  }
  if ("static" in props) {
    console.error(`The \`static\` prop is deprecated. Use \`copy\` instead.`);
    props["copy"] = props["static"];
    delete props["static"];
  }
  for (let i = 0; i < DEPRECATED_PROP_PREFIXES.length; i++) {
    const propPrefix = DEPRECATED_PROP_PREFIXES[i];
    for (let j = 0; j < DEPRECATED_SPECIAL_PROP_BASES.length; j++) {
      const propBase = DEPRECATED_SPECIAL_PROP_BASES[j];
      const deprecatedPropName = propPrefix + propBase;
      if (deprecatedPropName in props) {
        const targetPropBase = propBase === "static" ? "copy" : propBase;
        console.error(`The \`${deprecatedPropName}\` prop is deprecated. Use \`${targetPropBase}\` instead.`);
        props[targetPropBase] = props[deprecatedPropName];
        delete props[deprecatedPropName];
      }
    }
  }
  if (children.length > 1) {
    props.children = children;
  } else if (children.length === 1) {
    props.children = children[0];
  }
  return new Element(tag, props);
}
function cloneElement(el) {
  if (!isElement(el)) {
    throw new TypeError(`Cannot clone non-element: ${String(el)}`);
  }
  return new Element(el.tag, { ...el.props });
}
function narrow(value) {
  if (typeof value === "boolean" || value == null) {
    return;
  } else if (typeof value === "string" || isElement(value)) {
    return value;
  } else if (typeof value[Symbol.iterator] === "function") {
    return createElement(Fragment, null, value);
  }
  return value.toString();
}
var DidDiff = 1 << 0;
var DidCommit = 1 << 1;
var IsCopied = 1 << 2;
var IsUpdating = 1 << 3;
var IsExecuting = 1 << 4;
var IsRefreshing = 1 << 5;
var IsScheduling = 1 << 6;
var IsSchedulingFallback = 1 << 7;
var IsUnmounted = 1 << 8;
var IsErrored = 1 << 9;
var IsResurrecting = 1 << 10;
var IsSyncGen = 1 << 11;
var IsAsyncGen = 1 << 12;
var IsInForOfLoop = 1 << 13;
var IsInForAwaitOfLoop = 1 << 14;
var NeedsToYield = 1 << 15;
var PropsAvailable = 1 << 16;
var IsSchedulingRefresh = 1 << 17;
function getFlag(ret, flag) {
  return !!(ret.f & flag);
}
function setFlag(ret, flag, value = true) {
  if (value) {
    ret.f |= flag;
  } else {
    ret.f &= ~flag;
  }
}
var Retainer = class {
  constructor(el) {
    this.f = 0;
    this.el = el;
    this.ctx = void 0;
    this.children = void 0;
    this.fallback = void 0;
    this.value = void 0;
    this.oldProps = void 0;
    this.pendingDiff = void 0;
    this.onNextDiff = void 0;
    this.graveyard = void 0;
    this.lingerers = void 0;
  }
};
function cloneRetainer(ret) {
  const clone = new Retainer(ret.el);
  clone.f = ret.f;
  clone.ctx = ret.ctx;
  clone.children = ret.children;
  clone.fallback = ret.fallback;
  clone.value = ret.value;
  clone.scope = ret.scope;
  clone.oldProps = ret.oldProps;
  clone.pendingDiff = ret.pendingDiff;
  clone.onNextDiff = ret.onNextDiff;
  clone.graveyard = ret.graveyard;
  clone.lingerers = ret.lingerers;
  return clone;
}
function getValue(ret, isNested = false, index) {
  if (getFlag(ret, IsScheduling) && isNested) {
    return ret.fallback ? getValue(ret.fallback, isNested, index) : void 0;
  } else if (ret.fallback && !getFlag(ret, DidDiff)) {
    return ret.fallback ? getValue(ret.fallback, isNested, index) : ret.fallback;
  } else if (ret.el.tag === Portal) {
    return;
  } else if (ret.el.tag === Fragment || typeof ret.el.tag === "function") {
    if (index != null && ret.ctx) {
      ret.ctx.index = index;
    }
    return unwrap(getChildValues(ret, index));
  }
  return ret.value;
}
function getChildValues(ret, startIndex) {
  const values = [];
  const lingerers = ret.lingerers;
  const rawChildren = ret.children;
  const isChildrenArray = Array.isArray(rawChildren);
  const childrenLength = rawChildren === void 0 ? 0 : isChildrenArray ? rawChildren.length : 1;
  let currentIndex = startIndex;
  for (let i = 0; i < childrenLength; i++) {
    if (lingerers != null && lingerers[i] != null) {
      const rets = lingerers[i];
      for (const ret2 of rets) {
        const value = getValue(ret2, true, currentIndex);
        if (Array.isArray(value)) {
          for (let j = 0; j < value.length; j++) {
            values.push(value[j]);
          }
          if (currentIndex != null) {
            currentIndex += value.length;
          }
        } else if (value) {
          values.push(value);
          if (currentIndex != null) {
            currentIndex++;
          }
        }
      }
    }
    const child = isChildrenArray ? rawChildren[i] : rawChildren;
    if (child) {
      const value = getValue(child, true, currentIndex);
      if (Array.isArray(value)) {
        for (let j = 0; j < value.length; j++) {
          values.push(value[j]);
        }
        if (currentIndex != null) {
          currentIndex += value.length;
        }
      } else if (value) {
        values.push(value);
        if (currentIndex != null) {
          currentIndex++;
        }
      }
    }
  }
  if (lingerers != null && lingerers.length > childrenLength) {
    for (let i = childrenLength; i < lingerers.length; i++) {
      const rets = lingerers[i];
      if (rets != null) {
        for (const ret2 of rets) {
          const value = getValue(ret2, true, currentIndex);
          if (Array.isArray(value)) {
            for (let j = 0; j < value.length; j++) {
              values.push(value[j]);
            }
            if (currentIndex != null) {
              currentIndex += value.length;
            }
          } else if (value) {
            values.push(value);
            if (currentIndex != null) {
              currentIndex++;
            }
          }
        }
      }
    }
  }
  return values;
}
function stripSpecialProps(props) {
  let _;
  let result;
  ({ key: _, ref: _, copy: _, hydrate: _, children: _, ...result } = props);
  return result;
}
function diffChild(adapter, root, host, ctx, scope, parent, newChildren) {
  let child = narrow(newChildren);
  let ret = parent.children;
  let graveyard;
  let diff;
  if (typeof child === "object") {
    let childCopied = false;
    const oldKey = typeof ret === "object" ? ret.el.props.key : void 0;
    const newKey = child.props.key;
    if (oldKey !== newKey) {
      if (typeof ret === "object") {
        (graveyard = graveyard || []).push(ret);
      }
      ret = void 0;
    }
    if (child.tag === Copy) {
      childCopied = true;
    } else if (typeof ret === "object" && ret.el === child && getFlag(ret, DidCommit)) {
      childCopied = true;
    } else {
      if (ret && ret.el.tag === child.tag) {
        ret.el = child;
        if (child.props.copy && typeof child.props.copy !== "string") {
          childCopied = true;
        }
      } else if (ret) {
        let candidateFound = false;
        for (let predecessor = ret, candidate = ret.fallback; candidate; predecessor = candidate, candidate = candidate.fallback) {
          if (candidate.el.tag === child.tag) {
            const clone = cloneRetainer(candidate);
            setFlag(clone, IsResurrecting);
            predecessor.fallback = clone;
            const fallback = ret;
            ret = candidate;
            ret.el = child;
            ret.fallback = fallback;
            setFlag(ret, DidDiff, false);
            candidateFound = true;
            break;
          }
        }
        if (!candidateFound) {
          const fallback = ret;
          ret = new Retainer(child);
          ret.fallback = fallback;
        }
      } else {
        ret = new Retainer(child);
      }
      if (childCopied && getFlag(ret, DidCommit)) ;
      else if (child.tag === Raw || child.tag === Text) ;
      else if (child.tag === Fragment) {
        diff = diffChildren(adapter, root, host, ctx, scope, ret, ret.el.props.children);
      } else if (typeof child.tag === "function") {
        diff = diffComponent(adapter, root, host, ctx, scope, ret);
      } else {
        diff = diffHost(adapter, root, ctx, scope, ret);
      }
    }
    if (typeof ret === "object") {
      if (childCopied) {
        setFlag(ret, IsCopied);
        diff = getInflightDiff(ret);
      } else {
        setFlag(ret, IsCopied, false);
      }
    }
  } else if (typeof child === "string") {
    if (typeof ret === "object" && ret.el.tag === Text) {
      ret.el.props.value = child;
    } else {
      if (typeof ret === "object") {
        (graveyard = graveyard || []).push(ret);
      }
      ret = new Retainer(createElement(Text, { value: child }));
    }
  } else {
    if (typeof ret === "object") {
      (graveyard = graveyard || []).push(ret);
    }
    ret = void 0;
  }
  parent.children = ret;
  if (isPromiseLike(diff)) {
    const diff1 = diff.finally(() => {
      setFlag(parent, DidDiff);
      if (graveyard) {
        if (parent.graveyard) {
          for (let i = 0; i < graveyard.length; i++) {
            parent.graveyard.push(graveyard[i]);
          }
        } else {
          parent.graveyard = graveyard;
        }
      }
    });
    let onNextDiffs;
    const diff2 = parent.pendingDiff = safeRace([
      diff1,
      new Promise((resolve) => onNextDiffs = resolve)
    ]);
    if (parent.onNextDiff) {
      parent.onNextDiff(diff2);
    }
    parent.onNextDiff = onNextDiffs;
    return diff2;
  } else {
    setFlag(parent, DidDiff);
    if (graveyard) {
      if (parent.graveyard) {
        for (let i = 0; i < graveyard.length; i++) {
          parent.graveyard.push(graveyard[i]);
        }
      } else {
        parent.graveyard = graveyard;
      }
    }
    if (parent.onNextDiff) {
      parent.onNextDiff(diff);
      parent.onNextDiff = void 0;
    }
    parent.pendingDiff = void 0;
  }
}
function diffChildren(adapter, root, host, ctx, scope, parent, newChildren) {
  if (!Array.isArray(newChildren) && (typeof newChildren !== "object" || newChildren === null || typeof newChildren[Symbol.iterator] !== "function") && !Array.isArray(parent.children)) {
    return diffChild(adapter, root, host, ctx, scope, parent, newChildren);
  }
  const oldRetained = wrap(parent.children);
  const newRetained = [];
  const newChildren1 = arrayify(newChildren);
  const diffs = [];
  let childrenByKey;
  let seenKeys;
  let isAsync = false;
  let oi = 0;
  let oldLength = oldRetained.length;
  let graveyard;
  for (let ni = 0, newLength = newChildren1.length; ni < newLength; ni++) {
    let ret = oi >= oldLength ? void 0 : oldRetained[oi];
    let child = narrow(newChildren1[ni]);
    {
      let oldKey = typeof ret === "object" ? ret.el.props.key : void 0;
      let newKey = typeof child === "object" ? child.props.key : void 0;
      if (newKey !== void 0 && seenKeys && seenKeys.has(newKey)) {
        console.error(`Duplicate key found in <${getTagName(parent.el.tag)}>`, newKey);
        child = cloneElement(child);
        newKey = child.props.key = void 0;
      }
      if (oldKey === newKey) {
        if (childrenByKey !== void 0 && newKey !== void 0) {
          childrenByKey.delete(newKey);
        }
        oi++;
      } else {
        childrenByKey = childrenByKey || createChildrenByKey(oldRetained, oi);
        if (newKey === void 0) {
          while (ret !== void 0 && oldKey !== void 0) {
            oi++;
            ret = oldRetained[oi];
            oldKey = typeof ret === "object" ? ret.el.props.key : void 0;
          }
          oi++;
        } else {
          ret = childrenByKey.get(newKey);
          if (ret !== void 0) {
            childrenByKey.delete(newKey);
          }
          (seenKeys = seenKeys || /* @__PURE__ */ new Set()).add(newKey);
        }
      }
    }
    let diff = void 0;
    if (typeof child === "object") {
      let childCopied = false;
      if (child.tag === Copy) {
        childCopied = true;
      } else if (typeof ret === "object" && ret.el === child && getFlag(ret, DidCommit)) {
        childCopied = true;
      } else {
        if (ret && ret.el.tag === child.tag) {
          ret.el = child;
          if (child.props.copy && typeof child.props.copy !== "string") {
            childCopied = true;
          }
        } else if (ret) {
          let candidateFound = false;
          for (let predecessor = ret, candidate = ret.fallback; candidate; predecessor = candidate, candidate = candidate.fallback) {
            if (candidate.el.tag === child.tag) {
              const clone = cloneRetainer(candidate);
              setFlag(clone, IsResurrecting);
              predecessor.fallback = clone;
              const fallback = ret;
              ret = candidate;
              ret.el = child;
              ret.fallback = fallback;
              setFlag(ret, DidDiff, false);
              candidateFound = true;
              break;
            }
          }
          if (!candidateFound) {
            const fallback = ret;
            ret = new Retainer(child);
            ret.fallback = fallback;
          }
        } else {
          ret = new Retainer(child);
        }
        if (childCopied && getFlag(ret, DidCommit)) ;
        else if (child.tag === Raw || child.tag === Text) ;
        else if (child.tag === Fragment) {
          diff = diffChildren(adapter, root, host, ctx, scope, ret, ret.el.props.children);
        } else if (typeof child.tag === "function") {
          diff = diffComponent(adapter, root, host, ctx, scope, ret);
        } else {
          diff = diffHost(adapter, root, ctx, scope, ret);
        }
      }
      if (typeof ret === "object") {
        if (childCopied) {
          setFlag(ret, IsCopied);
          diff = getInflightDiff(ret);
        } else {
          setFlag(ret, IsCopied, false);
        }
      }
      if (isPromiseLike(diff)) {
        isAsync = true;
      }
    } else if (typeof child === "string") {
      if (typeof ret === "object" && ret.el.tag === Text) {
        ret.el.props.value = child;
      } else {
        if (typeof ret === "object") {
          (graveyard = graveyard || []).push(ret);
        }
        ret = new Retainer(createElement(Text, { value: child }));
      }
    } else {
      if (typeof ret === "object") {
        (graveyard = graveyard || []).push(ret);
      }
      ret = void 0;
    }
    diffs[ni] = diff;
    newRetained[ni] = ret;
  }
  for (; oi < oldLength; oi++) {
    const ret = oldRetained[oi];
    if (typeof ret === "object" && (typeof ret.el.props.key === "undefined" || !seenKeys || !seenKeys.has(ret.el.props.key))) {
      (graveyard = graveyard || []).push(ret);
    }
  }
  if (childrenByKey !== void 0 && childrenByKey.size > 0) {
    graveyard = graveyard || [];
    for (const ret of childrenByKey.values()) {
      graveyard.push(ret);
    }
  }
  parent.children = unwrap(newRetained);
  if (isAsync) {
    const diffs1 = Promise.all(diffs).then(() => void 0).finally(() => {
      setFlag(parent, DidDiff);
      if (graveyard) {
        if (parent.graveyard) {
          for (let i = 0; i < graveyard.length; i++) {
            parent.graveyard.push(graveyard[i]);
          }
        } else {
          parent.graveyard = graveyard;
        }
      }
    });
    let onNextDiffs;
    const diffs2 = parent.pendingDiff = safeRace([
      diffs1,
      new Promise((resolve) => onNextDiffs = resolve)
    ]);
    if (parent.onNextDiff) {
      parent.onNextDiff(diffs2);
    }
    parent.onNextDiff = onNextDiffs;
    return diffs2;
  } else {
    setFlag(parent, DidDiff);
    if (graveyard) {
      if (parent.graveyard) {
        for (let i = 0; i < graveyard.length; i++) {
          parent.graveyard.push(graveyard[i]);
        }
      } else {
        parent.graveyard = graveyard;
      }
    }
    if (parent.onNextDiff) {
      parent.onNextDiff(diffs);
      parent.onNextDiff = void 0;
    }
    parent.pendingDiff = void 0;
  }
}
function getInflightDiff(ret) {
  if (ret.ctx && ret.ctx.inflight) {
    return ret.ctx.inflight[1];
  } else if (ret.pendingDiff) {
    return ret.pendingDiff;
  }
}
function createChildrenByKey(children, offset) {
  const childrenByKey = /* @__PURE__ */ new Map();
  for (let i = offset; i < children.length; i++) {
    const child = children[i];
    if (typeof child === "object" && typeof child.el.props.key !== "undefined") {
      childrenByKey.set(child.el.props.key, child);
    }
  }
  return childrenByKey;
}
function diffHost(adapter, root, ctx, scope, ret) {
  const el = ret.el;
  const tag = el.tag;
  if (el.tag === Portal) {
    root = ret.value = el.props.root;
  }
  if (getFlag(ret, DidCommit)) {
    scope = ret.scope;
  } else {
    scope = ret.scope = adapter.scope({
      tag,
      tagName: getTagName(tag),
      props: el.props,
      scope,
      root
    });
  }
  return diffChildren(adapter, root, ret, ctx, scope, ret, ret.el.props.children);
}
function commit(adapter, host, ret, ctx, scope, root, index, schedulePromises, hydrationNodes) {
  if (getFlag(ret, IsCopied) && getFlag(ret, DidCommit)) {
    return getValue(ret);
  }
  const el = ret.el;
  const tag = el.tag;
  if (typeof tag === "function" || tag === Fragment || tag === Portal || tag === Raw || tag === Text) {
    if (typeof el.props.copy === "string") {
      console.error(`String copy prop ignored for <${getTagName(tag)}>. Use booleans instead.`);
    }
    if (typeof el.props.hydrate === "string") {
      console.error(`String hydrate prop ignored for <${getTagName(tag)}>. Use booleans instead.`);
    }
  }
  let value;
  let skippedHydrationNodes;
  if (hydrationNodes && el.props.hydrate != null && !el.props.hydrate && typeof el.props.hydrate !== "string") {
    skippedHydrationNodes = hydrationNodes;
    hydrationNodes = void 0;
  }
  if (typeof tag === "function") {
    ret.ctx.index = index;
    value = commitComponent(ret.ctx, schedulePromises, hydrationNodes);
  } else {
    if (tag === Fragment) {
      value = commitChildren(adapter, host, ctx, scope, root, ret, index, schedulePromises, hydrationNodes);
    } else if (tag === Text) {
      value = commitText(adapter, ret, el, scope, hydrationNodes, root);
    } else if (tag === Raw) {
      value = commitRaw(adapter, host, ret, scope, hydrationNodes, root);
    } else {
      value = commitHost(adapter, ret, ctx, root, schedulePromises, hydrationNodes);
    }
    if (ret.fallback) {
      unmount(adapter, host, ctx, root, ret.fallback, false);
      ret.fallback = void 0;
    }
  }
  if (skippedHydrationNodes) {
    skippedHydrationNodes.splice(0, value == null ? 0 : Array.isArray(value) ? value.length : 1);
  }
  if (!getFlag(ret, DidCommit)) {
    setFlag(ret, DidCommit);
    if (typeof tag !== "function" && tag !== Fragment && tag !== Portal && typeof el.props.ref === "function") {
      el.props.ref(adapter.read(value));
    }
  }
  return value;
}
function commitChildren(adapter, host, ctx, scope, root, parent, index, schedulePromises, hydrationNodes) {
  let values = [];
  const rawChildren = parent.children;
  const isChildrenArray = Array.isArray(rawChildren);
  const childrenLength = rawChildren === void 0 ? 0 : isChildrenArray ? rawChildren.length : 1;
  for (let i = 0; i < childrenLength; i++) {
    let child = isChildrenArray ? rawChildren[i] : rawChildren;
    let schedulePromises1;
    let isSchedulingFallback = false;
    while (child && (!getFlag(child, DidDiff) && child.fallback || getFlag(child, IsScheduling))) {
      if (getFlag(child, IsScheduling) && child.ctx.schedule) {
        (schedulePromises1 = schedulePromises1 || []).push(child.ctx.schedule.promise);
        isSchedulingFallback = true;
      }
      if (!getFlag(child, DidDiff) && getFlag(child, DidCommit)) {
        for (const node of getChildValues(child)) {
          adapter.remove({
            node,
            parentNode: host.value,
            isNested: false,
            root
          });
        }
      }
      child = child.fallback;
      if (schedulePromises1 && isSchedulingFallback && child) {
        if (!getFlag(child, DidDiff)) {
          const inflightDiff = getInflightDiff(child);
          schedulePromises1.push(inflightDiff);
        } else {
          schedulePromises1 = void 0;
        }
        if (getFlag(child, IsSchedulingFallback)) {
          isSchedulingFallback = true;
        } else {
          setFlag(child, IsSchedulingFallback, true);
          isSchedulingFallback = false;
        }
      }
    }
    if (schedulePromises1 && schedulePromises1.length > 1) {
      schedulePromises.push(safeRace(schedulePromises1));
    }
    if (child) {
      const value = commit(adapter, host, child, ctx, scope, root, index, schedulePromises, hydrationNodes);
      if (Array.isArray(value)) {
        for (let j = 0; j < value.length; j++) {
          values.push(value[j]);
        }
        index += value.length;
      } else if (value) {
        values.push(value);
        index++;
      }
    }
  }
  if (parent.graveyard) {
    for (let i = 0; i < parent.graveyard.length; i++) {
      const child = parent.graveyard[i];
      unmount(adapter, host, ctx, root, child, false);
    }
    parent.graveyard = void 0;
  }
  if (parent.lingerers) {
    values = getChildValues(parent);
  }
  return values;
}
function commitText(adapter, ret, el, scope, hydrationNodes, root) {
  const value = adapter.text({
    value: el.props.value,
    scope,
    oldNode: ret.value,
    hydrationNodes,
    root
  });
  ret.value = value;
  return value;
}
function commitRaw(adapter, host, ret, scope, hydrationNodes, root) {
  if (!ret.oldProps || ret.oldProps.value !== ret.el.props.value) {
    const oldNodes = wrap(ret.value);
    for (let i = 0; i < oldNodes.length; i++) {
      const oldNode = oldNodes[i];
      adapter.remove({
        node: oldNode,
        parentNode: host.value,
        isNested: false,
        root
      });
    }
    ret.value = adapter.raw({
      value: ret.el.props.value,
      scope,
      hydrationNodes,
      root
    });
  }
  ret.oldProps = stripSpecialProps(ret.el.props);
  return ret.value;
}
function commitHost(adapter, ret, ctx, root, schedulePromises, hydrationNodes) {
  if (getFlag(ret, IsCopied) && getFlag(ret, DidCommit)) {
    return getValue(ret);
  }
  const tag = ret.el.tag;
  const props = stripSpecialProps(ret.el.props);
  const oldProps = ret.oldProps;
  let node = ret.value;
  let copyProps;
  let copyChildren = false;
  if (oldProps) {
    for (const propName in props) {
      if (props[propName] === Copy) {
        props[propName] = oldProps[propName];
        (copyProps = copyProps || /* @__PURE__ */ new Set()).add(propName);
      }
    }
    if (typeof ret.el.props.copy === "string") {
      const copyMetaProp = new MetaProp("copy", ret.el.props.copy);
      if (copyMetaProp.include) {
        for (const propName of copyMetaProp.props) {
          if (propName in oldProps) {
            props[propName] = oldProps[propName];
            (copyProps = copyProps || /* @__PURE__ */ new Set()).add(propName);
          }
        }
      } else {
        for (const propName in oldProps) {
          if (!copyMetaProp.props.has(propName)) {
            props[propName] = oldProps[propName];
            (copyProps = copyProps || /* @__PURE__ */ new Set()).add(propName);
          }
        }
      }
      copyChildren = copyMetaProp.includes("children");
    }
  }
  const scope = ret.scope;
  let childHydrationNodes;
  let quietProps;
  let hydrationMetaProp;
  if (!getFlag(ret, DidCommit)) {
    if (tag === Portal) {
      if (ret.el.props.hydrate && typeof ret.el.props.hydrate !== "string") {
        childHydrationNodes = adapter.adopt({
          tag,
          tagName: getTagName(tag),
          node,
          props,
          scope,
          root
        });
        if (childHydrationNodes) {
          for (let i = 0; i < childHydrationNodes.length; i++) {
            adapter.remove({
              node: childHydrationNodes[i],
              parentNode: node,
              isNested: false,
              root
            });
          }
        }
      }
    } else {
      if (!node && hydrationNodes) {
        const nextChild = hydrationNodes.shift();
        if (typeof ret.el.props.hydrate === "string") {
          hydrationMetaProp = new MetaProp("hydration", ret.el.props.hydrate);
          if (hydrationMetaProp.include) {
            quietProps = new Set(Object.keys(props));
            for (const propName of hydrationMetaProp.props) {
              quietProps.delete(propName);
            }
          } else {
            quietProps = hydrationMetaProp.props;
          }
        }
        childHydrationNodes = adapter.adopt({
          tag,
          tagName: getTagName(tag),
          node: nextChild,
          props,
          scope,
          root
        });
        if (childHydrationNodes) {
          node = nextChild;
          for (let i = 0; i < childHydrationNodes.length; i++) {
            adapter.remove({
              node: childHydrationNodes[i],
              parentNode: node,
              isNested: false,
              root
            });
          }
        }
      }
      if (!node) {
        node = adapter.create({
          tag,
          tagName: getTagName(tag),
          props,
          scope,
          root
        });
      }
      ret.value = node;
    }
  }
  if (tag !== Portal) {
    adapter.patch({
      tag,
      tagName: getTagName(tag),
      node,
      props,
      oldProps,
      scope,
      root,
      copyProps,
      isHydrating: !!childHydrationNodes,
      quietProps
    });
  }
  if (!copyChildren) {
    const children = commitChildren(adapter, ret, ctx, scope, tag === Portal ? node : root, ret, 0, schedulePromises, hydrationMetaProp && !hydrationMetaProp.includes("children") ? void 0 : childHydrationNodes);
    adapter.arrange({
      tag,
      tagName: getTagName(tag),
      node,
      props,
      children,
      oldProps,
      scope,
      root
    });
  }
  ret.oldProps = props;
  if (tag === Portal) {
    flush(adapter, ret.value);
    return;
  }
  return node;
}
var MetaProp = class {
  constructor(propName, propValue) {
    this.include = true;
    this.props = /* @__PURE__ */ new Set();
    let noBangs = true;
    let allBangs = true;
    const tokens = propValue.split(/[,\s]+/);
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i].trim();
      if (!token) {
        continue;
      } else if (token.startsWith("!")) {
        noBangs = false;
        this.props.add(token.slice(1));
      } else {
        allBangs = false;
        this.props.add(token);
      }
    }
    if (!allBangs && !noBangs) {
      console.error(`Invalid ${propName} prop "${propValue}".
Use prop or !prop but not both.`);
      this.include = true;
      this.props.clear();
    } else {
      this.include = noBangs;
    }
  }
  includes(propName) {
    if (this.include) {
      return this.props.has(propName);
    } else {
      return !this.props.has(propName);
    }
  }
};
function contextContains(parent, child) {
  for (let current = child; current !== void 0; current = current.parent) {
    if (current === parent) {
      return true;
    }
  }
  return false;
}
var ANONYMOUS_ROOT = {};
function flush(adapter, root, initiator) {
  if (root != null) {
    adapter.finalize(root);
  }
  if (typeof root !== "object" || root === null) {
    root = ANONYMOUS_ROOT;
  }
  const afterMap = afterMapByRoot.get(root);
  if (afterMap) {
    const afterMap1 = /* @__PURE__ */ new Map();
    for (const [ctx, callbacks] of afterMap) {
      if (getFlag(ctx.ret, IsScheduling) || initiator && !contextContains(initiator, ctx)) {
        afterMap.delete(ctx);
        afterMap1.set(ctx, callbacks);
      }
    }
    if (afterMap1.size) {
      afterMapByRoot.set(root, afterMap1);
    } else {
      afterMapByRoot.delete(root);
    }
    for (const [ctx, callbacks] of afterMap) {
      const value = adapter.read(getValue(ctx.ret));
      for (const callback of callbacks) {
        callback(value);
      }
    }
  }
}
function unmount(adapter, host, ctx, root, ret, isNested) {
  if (ret.fallback) {
    unmount(adapter, host, ctx, root, ret.fallback, isNested);
    ret.fallback = void 0;
  }
  if (getFlag(ret, IsResurrecting)) {
    return;
  }
  if (ret.lingerers) {
    for (let i = 0; i < ret.lingerers.length; i++) {
      const lingerers = ret.lingerers[i];
      if (lingerers) {
        for (const lingerer of lingerers) {
          unmount(adapter, host, ctx, root, lingerer, isNested);
        }
      }
    }
    ret.lingerers = void 0;
  }
  if (typeof ret.el.tag === "function") {
    unmountComponent(ret.ctx, isNested);
  } else if (ret.el.tag === Fragment) {
    unmountChildren(adapter, host, ctx, root, ret, isNested);
  } else if (ret.el.tag === Portal) {
    unmountChildren(adapter, ret, ctx, ret.value, ret, false);
    if (ret.value != null) {
      adapter.finalize(ret.value);
    }
  } else {
    unmountChildren(adapter, ret, ctx, root, ret, true);
    if (getFlag(ret, DidCommit)) {
      if (ctx) {
        removeEventTargetDelegates(ctx.ctx, [ret.value], (ctx1) => ctx1[_ContextState].host === host);
      }
      adapter.remove({
        node: ret.value,
        parentNode: host.value,
        isNested,
        root
      });
    }
  }
}
function unmountChildren(adapter, host, ctx, root, ret, isNested) {
  if (ret.graveyard) {
    for (let i = 0; i < ret.graveyard.length; i++) {
      const child = ret.graveyard[i];
      unmount(adapter, host, ctx, root, child, isNested);
    }
    ret.graveyard = void 0;
  }
  const rawChildren = ret.children;
  if (Array.isArray(rawChildren)) {
    for (let i = 0; i < rawChildren.length; i++) {
      const child = rawChildren[i];
      if (typeof child === "object") {
        unmount(adapter, host, ctx, root, child, isNested);
      }
    }
  } else if (rawChildren !== void 0) {
    unmount(adapter, host, ctx, root, rawChildren, isNested);
  }
}
var provisionMaps = /* @__PURE__ */ new WeakMap();
var scheduleMap = /* @__PURE__ */ new WeakMap();
var cleanupMap = /* @__PURE__ */ new WeakMap();
var afterMapByRoot = /* @__PURE__ */ new WeakMap();
var ContextState = class {
  constructor(adapter, root, host, parent, scope, ret) {
    this.adapter = adapter;
    this.root = root;
    this.host = host;
    this.parent = parent;
    this.ctx = new Context(this);
    this.scope = scope;
    this.ret = ret;
    this.iterator = void 0;
    this.inflight = void 0;
    this.enqueued = void 0;
    this.onPropsProvided = void 0;
    this.onPropsRequested = void 0;
    this.pull = void 0;
    this.index = 0;
    this.schedule = void 0;
  }
};
var _ContextState = /* @__PURE__ */ Symbol.for("crank.ContextState");
var Context = class extends CustomEventTarget {
  // TODO: If we could make the constructor function take a nicer value, it
  // would be useful for testing purposes.
  constructor(state) {
    super(state.parent ? state.parent.ctx : null);
    this[_ContextState] = state;
  }
  /**
   * The current props of the associated element.
   */
  get props() {
    return this[_ContextState].ret.el.props;
  }
  /**
   * The current value of the associated element.
   *
   * @deprecated
   */
  get value() {
    console.warn("Context.value is deprecated.");
    return this[_ContextState].adapter.read(getValue(this[_ContextState].ret));
  }
  get isExecuting() {
    return getFlag(this[_ContextState].ret, IsExecuting);
  }
  get isUnmounted() {
    return getFlag(this[_ContextState].ret, IsUnmounted);
  }
  *[Symbol.iterator]() {
    const ctx = this[_ContextState];
    setFlag(ctx.ret, IsInForOfLoop);
    try {
      while (!getFlag(ctx.ret, IsUnmounted) && !getFlag(ctx.ret, IsErrored)) {
        if (getFlag(ctx.ret, NeedsToYield)) {
          throw new Error(`<${getTagName(ctx.ret.el.tag)}> context iterated twice without a yield`);
        } else {
          setFlag(ctx.ret, NeedsToYield);
        }
        yield ctx.ret.el.props;
      }
    } finally {
      setFlag(ctx.ret, IsInForOfLoop, false);
    }
  }
  async *[Symbol.asyncIterator]() {
    const ctx = this[_ContextState];
    setFlag(ctx.ret, IsInForAwaitOfLoop);
    try {
      while (!getFlag(ctx.ret, IsUnmounted) && !getFlag(ctx.ret, IsErrored)) {
        if (getFlag(ctx.ret, NeedsToYield)) {
          throw new Error(`<${getTagName(ctx.ret.el.tag)}> context iterated twice without a yield`);
        } else {
          setFlag(ctx.ret, NeedsToYield);
        }
        if (getFlag(ctx.ret, PropsAvailable)) {
          setFlag(ctx.ret, PropsAvailable, false);
          yield ctx.ret.el.props;
        } else {
          const props = await new Promise((resolve) => ctx.onPropsProvided = resolve);
          if (getFlag(ctx.ret, IsUnmounted) || getFlag(ctx.ret, IsErrored)) {
            break;
          }
          yield props;
        }
        if (ctx.onPropsRequested) {
          ctx.onPropsRequested();
          ctx.onPropsRequested = void 0;
        }
      }
    } finally {
      setFlag(ctx.ret, IsInForAwaitOfLoop, false);
      if (ctx.onPropsRequested) {
        ctx.onPropsRequested();
        ctx.onPropsRequested = void 0;
      }
    }
  }
  /**
   * Re-executes a component.
   *
   * @param callback - Optional callback to execute before refresh
   * @returns The rendered result of the component or a promise thereof if the
   * component or its children execute asynchronously.
   */
  refresh(callback) {
    const ctx = this[_ContextState];
    if (getFlag(ctx.ret, IsUnmounted)) {
      console.error(`Component <${getTagName(ctx.ret.el.tag)}> is unmounted. Check the isUnmounted property if necessary.`);
      return ctx.adapter.read(getValue(ctx.ret));
    } else if (getFlag(ctx.ret, IsExecuting)) {
      console.error(`Component <${getTagName(ctx.ret.el.tag)}> is already executing Check the isExecuting property if necessary.`);
      return ctx.adapter.read(getValue(ctx.ret));
    }
    if (callback) {
      const result = callback();
      if (isPromiseLike(result)) {
        return Promise.resolve(result).then(() => {
          if (!getFlag(ctx.ret, IsUnmounted)) {
            return this.refresh();
          }
          return ctx.adapter.read(getValue(ctx.ret));
        });
      }
    }
    if (getFlag(ctx.ret, IsScheduling)) {
      setFlag(ctx.ret, IsSchedulingRefresh);
    }
    let diff;
    const schedulePromises = [];
    try {
      setFlag(ctx.ret, IsRefreshing);
      diff = enqueueComponent(ctx);
      if (isPromiseLike(diff)) {
        return diff.then(() => ctx.adapter.read(commitComponent(ctx, schedulePromises))).then((result2) => {
          if (schedulePromises.length) {
            return Promise.all(schedulePromises).then(() => {
              return ctx.adapter.read(getValue(ctx.ret));
            });
          }
          return result2;
        }).catch((err) => {
          const diff2 = propagateError(ctx, err, schedulePromises);
          if (diff2) {
            return diff2.then(() => {
              if (schedulePromises.length) {
                return Promise.all(schedulePromises).then(() => {
                  return ctx.adapter.read(getValue(ctx.ret));
                });
              }
              return ctx.adapter.read(getValue(ctx.ret));
            });
          }
          if (schedulePromises.length) {
            return Promise.all(schedulePromises).then(() => {
              return ctx.adapter.read(getValue(ctx.ret));
            });
          }
          return ctx.adapter.read(getValue(ctx.ret));
        }).finally(() => setFlag(ctx.ret, IsRefreshing, false));
      }
      const result = ctx.adapter.read(commitComponent(ctx, schedulePromises));
      if (schedulePromises.length) {
        return Promise.all(schedulePromises).then(() => {
          return ctx.adapter.read(getValue(ctx.ret));
        });
      }
      return result;
    } catch (err) {
      const diff2 = propagateError(ctx, err, schedulePromises);
      if (diff2) {
        return diff2.then(() => {
          if (schedulePromises.length) {
            return Promise.all(schedulePromises).then(() => {
              return ctx.adapter.read(getValue(ctx.ret));
            });
          }
        }).then(() => ctx.adapter.read(getValue(ctx.ret)));
      }
      if (schedulePromises.length) {
        return Promise.all(schedulePromises).then(() => {
          return ctx.adapter.read(getValue(ctx.ret));
        });
      }
      return ctx.adapter.read(getValue(ctx.ret));
    } finally {
      if (!isPromiseLike(diff)) {
        setFlag(ctx.ret, IsRefreshing, false);
      }
    }
  }
  schedule(callback) {
    if (!callback) {
      return new Promise((resolve) => this.schedule(resolve));
    }
    const ctx = this[_ContextState];
    let callbacks = scheduleMap.get(ctx);
    if (!callbacks) {
      callbacks = /* @__PURE__ */ new Set();
      scheduleMap.set(ctx, callbacks);
    }
    callbacks.add(callback);
  }
  after(callback) {
    if (!callback) {
      return new Promise((resolve) => this.after(resolve));
    }
    const ctx = this[_ContextState];
    const root = ctx.root || ANONYMOUS_ROOT;
    let afterMap = afterMapByRoot.get(root);
    if (!afterMap) {
      afterMap = /* @__PURE__ */ new Map();
      afterMapByRoot.set(root, afterMap);
    }
    let callbacks = afterMap.get(ctx);
    if (!callbacks) {
      callbacks = /* @__PURE__ */ new Set();
      afterMap.set(ctx, callbacks);
    }
    callbacks.add(callback);
  }
  flush(callback) {
    console.error("Context.flush() method has been renamed to after()");
    this.after(callback);
  }
  cleanup(callback) {
    if (!callback) {
      return new Promise((resolve) => this.cleanup(resolve));
    }
    const ctx = this[_ContextState];
    if (getFlag(ctx.ret, IsUnmounted)) {
      const value = ctx.adapter.read(getValue(ctx.ret));
      callback(value);
      return;
    }
    let callbacks = cleanupMap.get(ctx);
    if (!callbacks) {
      callbacks = /* @__PURE__ */ new Set();
      cleanupMap.set(ctx, callbacks);
    }
    callbacks.add(callback);
  }
  consume(key) {
    for (let ctx = this[_ContextState].parent; ctx !== void 0; ctx = ctx.parent) {
      const provisions = provisionMaps.get(ctx);
      if (provisions && provisions.has(key)) {
        return provisions.get(key);
      }
    }
  }
  provide(key, value) {
    const ctx = this[_ContextState];
    let provisions = provisionMaps.get(ctx);
    if (!provisions) {
      provisions = /* @__PURE__ */ new Map();
      provisionMaps.set(ctx, provisions);
    }
    provisions.set(key, value);
  }
  [CustomEventTarget.dispatchEventOnSelf](ev) {
    const ctx = this[_ContextState];
    let propCallback = ctx.ret.el.props["on" + ev.type];
    if (typeof propCallback === "function") {
      propCallback(ev);
    } else {
      for (const propName in ctx.ret.el.props) {
        if (propName.toLowerCase() === "on" + ev.type.toLowerCase()) {
          propCallback = ctx.ret.el.props[propName];
          if (typeof propCallback === "function") {
            propCallback(ev);
          }
        }
      }
    }
  }
};
function diffComponent(adapter, root, host, parent, scope, ret) {
  let ctx;
  if (ret.ctx) {
    ctx = ret.ctx;
    if (getFlag(ctx.ret, IsExecuting)) {
      console.error(`Component <${getTagName(ctx.ret.el.tag)}> is already executing`);
      return;
    } else if (ctx.schedule) {
      return ctx.schedule.promise.then(() => {
        return diffComponent(adapter, root, host, parent, scope, ret);
      });
    }
  } else {
    ctx = ret.ctx = new ContextState(adapter, root, host, parent, scope, ret);
  }
  setFlag(ctx.ret, IsUpdating);
  return enqueueComponent(ctx);
}
function diffComponentChildren(ctx, children, isYield) {
  if (getFlag(ctx.ret, IsUnmounted) || getFlag(ctx.ret, IsErrored)) {
    return;
  } else if (children === void 0) {
    console.error(`Component <${getTagName(ctx.ret.el.tag)}> has ${isYield ? "yielded" : "returned"} undefined. If this was intentional, ${isYield ? "yield" : "return"} null instead.`);
  }
  let diff;
  try {
    setFlag(ctx.ret, IsExecuting);
    diff = diffChildren(ctx.adapter, ctx.root, ctx.host, ctx, ctx.scope, ctx.ret, narrow(children));
    if (diff) {
      diff = diff.catch((err) => handleChildError(ctx, err));
    }
  } catch (err) {
    diff = handleChildError(ctx, err);
  } finally {
    setFlag(ctx.ret, IsExecuting, false);
  }
  return diff;
}
function enqueueComponent(ctx) {
  if (!ctx.inflight) {
    const [block, diff] = runComponent(ctx);
    if (block) {
      ctx.inflight = [block.finally(() => advanceComponent(ctx)), diff];
    }
    return diff;
  } else if (!ctx.enqueued) {
    let resolve;
    ctx.enqueued = [
      new Promise((resolve1) => resolve = resolve1).finally(() => advanceComponent(ctx)),
      ctx.inflight[0].finally(() => {
        const [block, diff] = runComponent(ctx);
        resolve(block);
        return diff;
      })
    ];
  }
  return ctx.enqueued[1];
}
function advanceComponent(ctx) {
  ctx.inflight = ctx.enqueued;
  ctx.enqueued = void 0;
}
function runComponent(ctx) {
  if (getFlag(ctx.ret, IsUnmounted)) {
    return [void 0, void 0];
  }
  const ret = ctx.ret;
  const initial = !ctx.iterator;
  if (initial) {
    setFlag(ctx.ret, IsExecuting);
    clearEventListeners(ctx.ctx);
    let returned;
    try {
      returned = ret.el.tag.call(ctx.ctx, ret.el.props, ctx.ctx);
    } catch (err) {
      setFlag(ctx.ret, IsErrored);
      throw err;
    } finally {
      setFlag(ctx.ret, IsExecuting, false);
    }
    if (isIteratorLike(returned)) {
      ctx.iterator = returned;
    } else if (!isPromiseLike(returned)) {
      return [
        void 0,
        diffComponentChildren(ctx, returned, false)
      ];
    } else {
      const returned1 = returned instanceof Promise ? returned : Promise.resolve(returned);
      return [
        returned1.catch(NOOP),
        returned1.then((returned2) => diffComponentChildren(ctx, returned2, false), (err) => {
          setFlag(ctx.ret, IsErrored);
          throw err;
        })
      ];
    }
  }
  let iteration;
  if (initial) {
    try {
      setFlag(ctx.ret, IsExecuting);
      iteration = ctx.iterator.next();
    } catch (err) {
      setFlag(ctx.ret, IsErrored);
      throw err;
    } finally {
      setFlag(ctx.ret, IsExecuting, false);
    }
    if (isPromiseLike(iteration)) {
      setFlag(ctx.ret, IsAsyncGen);
    } else {
      setFlag(ctx.ret, IsSyncGen);
    }
  }
  if (getFlag(ctx.ret, IsSyncGen)) {
    if (!initial) {
      try {
        setFlag(ctx.ret, IsExecuting);
        const oldResult = ctx.adapter.read(getValue(ctx.ret));
        iteration = ctx.iterator.next(oldResult);
      } catch (err) {
        setFlag(ctx.ret, IsErrored);
        throw err;
      } finally {
        setFlag(ctx.ret, IsExecuting, false);
      }
    }
    if (isPromiseLike(iteration)) {
      throw new Error("Mixed generator component");
    }
    if (getFlag(ctx.ret, IsInForOfLoop) && !getFlag(ctx.ret, NeedsToYield) && !getFlag(ctx.ret, IsUnmounted) && !getFlag(ctx.ret, IsSchedulingRefresh)) {
      console.error(`Component <${getTagName(ctx.ret.el.tag)}> yielded/returned more than once in for...of loop`);
    }
    setFlag(ctx.ret, NeedsToYield, false);
    setFlag(ctx.ret, IsSchedulingRefresh, false);
    if (iteration.done) {
      setFlag(ctx.ret, IsSyncGen, false);
      ctx.iterator = void 0;
    }
    const diff = diffComponentChildren(ctx, iteration.value, !iteration.done);
    const block = isPromiseLike(diff) ? diff.catch(NOOP) : void 0;
    return [block, diff];
  } else {
    if (getFlag(ctx.ret, IsInForAwaitOfLoop)) {
      pullComponent(ctx, iteration);
      const block = resumePropsAsyncIterator(ctx);
      return [block, ctx.pull && ctx.pull.diff];
    } else {
      resumePropsAsyncIterator(ctx);
      if (!initial) {
        try {
          setFlag(ctx.ret, IsExecuting);
          const oldResult = ctx.adapter.read(getValue(ctx.ret));
          iteration = ctx.iterator.next(oldResult);
        } catch (err) {
          setFlag(ctx.ret, IsErrored);
          throw err;
        } finally {
          setFlag(ctx.ret, IsExecuting, false);
        }
      }
      if (!isPromiseLike(iteration)) {
        throw new Error("Mixed generator component");
      }
      const diff = iteration.then((iteration2) => {
        if (getFlag(ctx.ret, IsInForAwaitOfLoop)) {
          pullComponent(ctx, iteration2);
        } else {
          if (getFlag(ctx.ret, IsInForOfLoop) && !getFlag(ctx.ret, NeedsToYield) && !getFlag(ctx.ret, IsUnmounted) && !getFlag(ctx.ret, IsSchedulingRefresh)) {
            console.error(`Component <${getTagName(ctx.ret.el.tag)}> yielded/returned more than once in for...of loop`);
          }
        }
        setFlag(ctx.ret, NeedsToYield, false);
        setFlag(ctx.ret, IsSchedulingRefresh, false);
        if (iteration2.done) {
          setFlag(ctx.ret, IsAsyncGen, false);
          ctx.iterator = void 0;
        }
        return diffComponentChildren(
          ctx,
          // Children can be void so we eliminate that here
          iteration2.value,
          !iteration2.done
        );
      }, (err) => {
        setFlag(ctx.ret, IsErrored);
        throw err;
      });
      return [diff.catch(NOOP), diff];
    }
  }
}
function resumePropsAsyncIterator(ctx) {
  if (ctx.onPropsProvided) {
    ctx.onPropsProvided(ctx.ret.el.props);
    ctx.onPropsProvided = void 0;
    setFlag(ctx.ret, PropsAvailable, false);
  } else {
    setFlag(ctx.ret, PropsAvailable);
    if (getFlag(ctx.ret, IsInForAwaitOfLoop)) {
      return new Promise((resolve) => ctx.onPropsRequested = resolve);
    }
  }
  return ctx.pull && ctx.pull.iterationP && ctx.pull.iterationP.then(NOOP, NOOP);
}
async function pullComponent(ctx, iterationP) {
  if (!iterationP || ctx.pull) {
    return;
  }
  ctx.pull = { iterationP: void 0, diff: void 0, onChildError: void 0 };
  let done = false;
  try {
    let childError;
    while (!done) {
      if (isPromiseLike(iterationP)) {
        ctx.pull.iterationP = iterationP;
      }
      let onDiff;
      ctx.pull.diff = new Promise((resolve) => onDiff = resolve).then(() => {
        if (!(getFlag(ctx.ret, IsUpdating) || getFlag(ctx.ret, IsRefreshing))) {
          commitComponent(ctx, []);
        }
      }, (err) => {
        if (!(getFlag(ctx.ret, IsUpdating) || getFlag(ctx.ret, IsRefreshing)) || // TODO: is this flag necessary?
        !getFlag(ctx.ret, NeedsToYield)) {
          return propagateError(ctx, err, []);
        }
        throw err;
      });
      let iteration;
      try {
        iteration = await iterationP;
      } catch (err) {
        done = true;
        setFlag(ctx.ret, IsErrored);
        setFlag(ctx.ret, NeedsToYield, false);
        onDiff(Promise.reject(err));
        break;
      }
      let oldResult;
      {
        let floating = true;
        const oldResult1 = new Promise((resolve, reject) => {
          ctx.ctx.schedule(resolve);
          ctx.pull.onChildError = (err) => {
            reject(err);
            if (floating) {
              childError = err;
              resumePropsAsyncIterator(ctx);
              return ctx.pull.diff;
            }
          };
        });
        oldResult1.catch(NOOP);
        oldResult = Object.create(oldResult1);
        oldResult.then = function(onfulfilled, onrejected) {
          floating = false;
          return oldResult1.then(onfulfilled, onrejected);
        };
        oldResult.catch = function(onrejected) {
          floating = false;
          return oldResult1.catch(onrejected);
        };
      }
      if (childError != null) {
        try {
          setFlag(ctx.ret, IsExecuting);
          if (typeof ctx.iterator.throw !== "function") {
            throw childError;
          }
          iteration = await ctx.iterator.throw(childError);
        } catch (err) {
          done = true;
          setFlag(ctx.ret, IsErrored);
          setFlag(ctx.ret, NeedsToYield, false);
          onDiff(Promise.reject(err));
          break;
        } finally {
          childError = void 0;
          setFlag(ctx.ret, IsExecuting, false);
        }
      }
      if (!getFlag(ctx.ret, IsInForAwaitOfLoop)) {
        setFlag(ctx.ret, PropsAvailable, false);
      }
      done = !!iteration.done;
      let diff;
      try {
        if (!isPromiseLike(iterationP)) {
          diff = void 0;
        } else if (!getFlag(ctx.ret, NeedsToYield) && getFlag(ctx.ret, PropsAvailable) && getFlag(ctx.ret, IsInForAwaitOfLoop)) {
          diff = void 0;
        } else {
          diff = diffComponentChildren(ctx, iteration.value, !iteration.done);
        }
      } catch (err) {
        onDiff(Promise.reject(err));
      } finally {
        onDiff(diff);
        setFlag(ctx.ret, NeedsToYield, false);
      }
      if (getFlag(ctx.ret, IsUnmounted)) {
        while ((!iteration || !iteration.done) && ctx.iterator && getFlag(ctx.ret, IsInForAwaitOfLoop)) {
          try {
            setFlag(ctx.ret, IsExecuting);
            iteration = await ctx.iterator.next(oldResult);
          } catch (err) {
            setFlag(ctx.ret, IsErrored);
            throw err;
          } finally {
            setFlag(ctx.ret, IsExecuting, false);
          }
        }
        if ((!iteration || !iteration.done) && ctx.iterator && typeof ctx.iterator.return === "function") {
          try {
            setFlag(ctx.ret, IsExecuting);
            await ctx.iterator.return();
          } catch (err) {
            setFlag(ctx.ret, IsErrored);
            throw err;
          } finally {
            setFlag(ctx.ret, IsExecuting, false);
          }
        }
        break;
      } else if (!getFlag(ctx.ret, IsInForAwaitOfLoop)) {
        break;
      } else if (!iteration.done) {
        try {
          setFlag(ctx.ret, IsExecuting);
          iterationP = ctx.iterator.next(oldResult);
        } finally {
          setFlag(ctx.ret, IsExecuting, false);
        }
      }
    }
  } finally {
    if (done) {
      setFlag(ctx.ret, IsAsyncGen, false);
      ctx.iterator = void 0;
    }
    ctx.pull = void 0;
  }
}
function commitComponent(ctx, schedulePromises, hydrationNodes) {
  if (ctx.schedule) {
    ctx.schedule.promise.then(() => {
      commitComponent(ctx, []);
      propagateComponent(ctx);
    });
    return getValue(ctx.ret);
  }
  const values = commitChildren(ctx.adapter, ctx.host, ctx, ctx.scope, ctx.root, ctx.ret, ctx.index, schedulePromises, hydrationNodes);
  if (getFlag(ctx.ret, IsUnmounted)) {
    return;
  }
  addEventTargetDelegates(ctx.ctx, values);
  const wasScheduling = getFlag(ctx.ret, IsScheduling);
  let schedulePromises1;
  const callbacks = scheduleMap.get(ctx);
  if (callbacks) {
    scheduleMap.delete(ctx);
    setFlag(ctx.ret, IsScheduling);
    const result = ctx.adapter.read(unwrap(values));
    for (const callback of callbacks) {
      const scheduleResult = callback(result);
      if (isPromiseLike(scheduleResult)) {
        (schedulePromises1 = schedulePromises1 || []).push(scheduleResult);
      }
    }
    if (schedulePromises1 && !getFlag(ctx.ret, DidCommit)) {
      const scheduleCallbacksP = Promise.all(schedulePromises1).then(() => {
        setFlag(ctx.ret, IsScheduling, wasScheduling);
        propagateComponent(ctx);
        if (ctx.ret.fallback) {
          unmount(ctx.adapter, ctx.host, ctx.parent, ctx.root, ctx.ret.fallback, false);
        }
        ctx.ret.fallback = void 0;
      });
      let onAbort;
      const scheduleP = safeRace([
        scheduleCallbacksP,
        new Promise((resolve) => onAbort = resolve)
      ]).finally(() => {
        ctx.schedule = void 0;
      });
      ctx.schedule = { promise: scheduleP, onAbort };
      schedulePromises.push(scheduleP);
    } else {
      setFlag(ctx.ret, IsScheduling, wasScheduling);
    }
  } else {
    setFlag(ctx.ret, IsScheduling, wasScheduling);
  }
  if (!getFlag(ctx.ret, IsScheduling)) {
    if (!getFlag(ctx.ret, IsUpdating)) {
      propagateComponent(ctx);
    }
    if (ctx.ret.fallback) {
      unmount(ctx.adapter, ctx.host, ctx.parent, ctx.root, ctx.ret.fallback, false);
    }
    ctx.ret.fallback = void 0;
    setFlag(ctx.ret, IsUpdating, false);
  }
  setFlag(ctx.ret, DidCommit);
  return getValue(ctx.ret, true);
}
function isRetainerActive(target, host) {
  const stack = [host];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === target) {
      return true;
    }
    const isHostBoundary = current !== host && (typeof current.el.tag === "string" && current.el.tag !== Fragment || current.el.tag === Portal);
    if (current.children && !isHostBoundary) {
      if (Array.isArray(current.children)) {
        for (const child of current.children) {
          if (child) {
            stack.push(child);
          }
        }
      } else {
        stack.push(current.children);
      }
    }
    if (current.fallback && !getFlag(current, DidDiff)) {
      stack.push(current.fallback);
    }
  }
  return false;
}
function propagateComponent(ctx) {
  const values = getChildValues(ctx.ret, ctx.index);
  addEventTargetDelegates(ctx.ctx, values, (ctx1) => ctx1[_ContextState].host === ctx.host);
  const host = ctx.host;
  const initiator = ctx.ret;
  if (!isRetainerActive(initiator, host)) {
    return;
  }
  if (!getFlag(host, DidCommit)) {
    return;
  }
  const props = stripSpecialProps(host.el.props);
  const hostChildren = getChildValues(host, 0);
  ctx.adapter.arrange({
    tag: host.el.tag,
    tagName: getTagName(host.el.tag),
    node: host.value,
    props,
    oldProps: props,
    children: hostChildren,
    scope: host.scope,
    root: ctx.root
  });
  flush(ctx.adapter, ctx.root, ctx);
}
async function unmountComponent(ctx, isNested) {
  if (getFlag(ctx.ret, IsUnmounted)) {
    return;
  }
  let cleanupPromises;
  const callbacks = cleanupMap.get(ctx);
  if (callbacks) {
    const oldResult = ctx.adapter.read(getValue(ctx.ret));
    cleanupMap.delete(ctx);
    for (const callback of callbacks) {
      const cleanup = callback(oldResult);
      if (isPromiseLike(cleanup)) {
        (cleanupPromises = cleanupPromises || []).push(cleanup);
      }
    }
  }
  let didLinger = false;
  if (!isNested && cleanupPromises && getChildValues(ctx.ret).length > 0) {
    didLinger = true;
    const index = ctx.index;
    const lingerers = ctx.host.lingerers || (ctx.host.lingerers = []);
    let set = lingerers[index];
    if (set == null) {
      set = /* @__PURE__ */ new Set();
      lingerers[index] = set;
    }
    set.add(ctx.ret);
    await Promise.all(cleanupPromises);
    set.delete(ctx.ret);
    if (set.size === 0) {
      lingerers[index] = void 0;
    }
    if (!lingerers.some(Boolean)) {
      ctx.host.lingerers = void 0;
    }
  }
  if (getFlag(ctx.ret, IsUnmounted)) {
    return;
  }
  setFlag(ctx.ret, IsUnmounted);
  if (ctx.schedule) {
    ctx.schedule.onAbort();
    ctx.schedule = void 0;
  }
  clearEventListeners(ctx.ctx);
  unmountChildren(ctx.adapter, ctx.host, ctx, ctx.root, ctx.ret, isNested);
  if (didLinger) {
    if (ctx.root != null) {
      ctx.adapter.finalize(ctx.root);
    }
  }
  if (ctx.iterator) {
    if (ctx.pull) {
      resumePropsAsyncIterator(ctx);
      return;
    }
    if (ctx.inflight) {
      await ctx.inflight[1];
    }
    let iteration;
    if (getFlag(ctx.ret, IsInForOfLoop)) {
      try {
        setFlag(ctx.ret, IsExecuting);
        const oldResult = ctx.adapter.read(getValue(ctx.ret));
        const iterationP = ctx.iterator.next(oldResult);
        if (isPromiseLike(iterationP)) {
          if (!getFlag(ctx.ret, IsAsyncGen)) {
            throw new Error("Mixed generator component");
          }
          iteration = await iterationP;
        } else {
          if (!getFlag(ctx.ret, IsSyncGen)) {
            throw new Error("Mixed generator component");
          }
          iteration = iterationP;
        }
      } catch (err) {
        setFlag(ctx.ret, IsErrored);
        throw err;
      } finally {
        setFlag(ctx.ret, IsExecuting, false);
      }
    }
    if ((!iteration || !iteration.done) && ctx.iterator && typeof ctx.iterator.return === "function") {
      try {
        setFlag(ctx.ret, IsExecuting);
        const iterationP = ctx.iterator.return();
        if (isPromiseLike(iterationP)) {
          if (!getFlag(ctx.ret, IsAsyncGen)) {
            throw new Error("Mixed generator component");
          }
          iteration = await iterationP;
        } else {
          if (!getFlag(ctx.ret, IsSyncGen)) {
            throw new Error("Mixed generator component");
          }
          iteration = iterationP;
        }
      } catch (err) {
        setFlag(ctx.ret, IsErrored);
        throw err;
      } finally {
        setFlag(ctx.ret, IsExecuting, false);
      }
    }
  }
}
function handleChildError(ctx, err) {
  if (!ctx.iterator) {
    throw err;
  }
  if (ctx.pull) {
    ctx.pull.onChildError(err);
    return ctx.pull.diff;
  }
  if (!ctx.iterator.throw) {
    throw err;
  }
  resumePropsAsyncIterator(ctx);
  let iteration;
  try {
    setFlag(ctx.ret, IsExecuting);
    iteration = ctx.iterator.throw(err);
  } catch (err2) {
    setFlag(ctx.ret, IsErrored);
    throw err2;
  } finally {
    setFlag(ctx.ret, IsExecuting, false);
  }
  if (isPromiseLike(iteration)) {
    return iteration.then((iteration2) => {
      if (iteration2.done) {
        setFlag(ctx.ret, IsSyncGen, false);
        setFlag(ctx.ret, IsAsyncGen, false);
        ctx.iterator = void 0;
      }
      return diffComponentChildren(ctx, iteration2.value, !iteration2.done);
    }, (err2) => {
      setFlag(ctx.ret, IsErrored);
      throw err2;
    });
  }
  if (iteration.done) {
    setFlag(ctx.ret, IsSyncGen, false);
    setFlag(ctx.ret, IsAsyncGen, false);
    ctx.iterator = void 0;
  }
  return diffComponentChildren(ctx, iteration.value, !iteration.done);
}
function propagateError(ctx, err, schedulePromises) {
  const parent = ctx.parent;
  if (!parent) {
    throw err;
  }
  let diff;
  try {
    diff = handleChildError(parent, err);
  } catch (err2) {
    return propagateError(parent, err2, schedulePromises);
  }
  if (isPromiseLike(diff)) {
    return diff.then(() => void commitComponent(parent, schedulePromises), (err2) => propagateError(parent, err2, schedulePromises));
  }
  commitComponent(parent, schedulePromises);
}

// node_modules/@b9g/crank/jsx-tag.js
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
export {
  html,
  jsx,
  parse
};
