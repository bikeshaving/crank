// node_modules/@esbuild-plugins/node-globals-polyfill/process.js
function defaultSetTimout() {
  throw new Error("setTimeout has not been defined");
}
function defaultClearTimeout() {
  throw new Error("clearTimeout has not been defined");
}
var cachedSetTimeout = defaultSetTimout;
var cachedClearTimeout = defaultClearTimeout;
if (typeof globalThis.setTimeout === "function") {
  cachedSetTimeout = setTimeout;
}
if (typeof globalThis.clearTimeout === "function") {
  cachedClearTimeout = clearTimeout;
}
function runTimeout(fun) {
  if (cachedSetTimeout === setTimeout) {
    return setTimeout(fun, 0);
  }
  if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
    cachedSetTimeout = setTimeout;
    return setTimeout(fun, 0);
  }
  try {
    return cachedSetTimeout(fun, 0);
  } catch (e) {
    try {
      return cachedSetTimeout.call(null, fun, 0);
    } catch (e2) {
      return cachedSetTimeout.call(this, fun, 0);
    }
  }
}
function runClearTimeout(marker) {
  if (cachedClearTimeout === clearTimeout) {
    return clearTimeout(marker);
  }
  if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
    cachedClearTimeout = clearTimeout;
    return clearTimeout(marker);
  }
  try {
    return cachedClearTimeout(marker);
  } catch (e) {
    try {
      return cachedClearTimeout.call(null, marker);
    } catch (e2) {
      return cachedClearTimeout.call(this, marker);
    }
  }
}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;
function cleanUpNextTick() {
  if (!draining || !currentQueue) {
    return;
  }
  draining = false;
  if (currentQueue.length) {
    queue = currentQueue.concat(queue);
  } else {
    queueIndex = -1;
  }
  if (queue.length) {
    drainQueue();
  }
}
function drainQueue() {
  if (draining) {
    return;
  }
  var timeout = runTimeout(cleanUpNextTick);
  draining = true;
  var len = queue.length;
  while (len) {
    currentQueue = queue;
    queue = [];
    while (++queueIndex < len) {
      if (currentQueue) {
        currentQueue[queueIndex].run();
      }
    }
    queueIndex = -1;
    len = queue.length;
  }
  currentQueue = null;
  draining = false;
  runClearTimeout(timeout);
}
function nextTick(fun) {
  var args = new Array(arguments.length - 1);
  if (arguments.length > 1) {
    for (var i = 1; i < arguments.length; i++) {
      args[i - 1] = arguments[i];
    }
  }
  queue.push(new Item(fun, args));
  if (queue.length === 1 && !draining) {
    runTimeout(drainQueue);
  }
}
function Item(fun, array) {
  this.fun = fun;
  this.array = array;
}
Item.prototype.run = function() {
  this.fun.apply(null, this.array);
};
var title = "browser";
var platform = "browser";
var browser = true;
var env = {};
var argv = [];
var version = "";
var versions = {};
var release = {};
var config = {};
function noop() {
}
var on = noop;
var addListener = noop;
var once = noop;
var off = noop;
var removeListener = noop;
var removeAllListeners = noop;
var emit = noop;
function binding(name) {
  throw new Error("process.binding is not supported");
}
function cwd() {
  return "/";
}
function chdir(dir) {
  throw new Error("process.chdir is not supported");
}
function umask() {
  return 0;
}
var performance = globalThis.performance || {};
var performanceNow = performance.now || performance.mozNow || performance.msNow || performance.oNow || performance.webkitNow || function() {
  return (/* @__PURE__ */ new Date()).getTime();
};
function hrtime(previousTimestamp) {
  var clocktime = performanceNow.call(performance) * 1e-3;
  var seconds = Math.floor(clocktime);
  var nanoseconds = Math.floor(clocktime % 1 * 1e9);
  if (previousTimestamp) {
    seconds = seconds - previousTimestamp[0];
    nanoseconds = nanoseconds - previousTimestamp[1];
    if (nanoseconds < 0) {
      seconds--;
      nanoseconds += 1e9;
    }
  }
  return [seconds, nanoseconds];
}
var startTime = /* @__PURE__ */ new Date();
function uptime() {
  var currentTime = /* @__PURE__ */ new Date();
  var dif = currentTime - startTime;
  return dif / 1e3;
}
var process = {
  nextTick,
  title,
  browser,
  env,
  argv,
  version,
  versions,
  on,
  addListener,
  once,
  off,
  removeListener,
  removeAllListeners,
  emit,
  binding,
  cwd,
  chdir,
  umask,
  hrtime,
  platform,
  release,
  config,
  uptime
};
var defines = {};
Object.keys(defines).forEach((key) => {
  const segs = key.split(".");
  let target = process;
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    if (i === segs.length - 1) {
      target[seg] = defines[key];
    } else {
      target = target[seg] || (target[seg] = {});
    }
  }
});

// node_modules/@esbuild-plugins/node-globals-polyfill/Buffer.js
var lookup = [];
var revLookup = [];
var Arr = typeof Uint8Array !== "undefined" ? Uint8Array : Array;
var inited = false;
function init() {
  inited = true;
  var code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  for (var i = 0, len = code.length; i < len; ++i) {
    lookup[i] = code[i];
    revLookup[code.charCodeAt(i)] = i;
  }
  revLookup["-".charCodeAt(0)] = 62;
  revLookup["_".charCodeAt(0)] = 63;
}
function base64toByteArray(b64) {
  if (!inited) {
    init();
  }
  var i, j, l, tmp, placeHolders, arr;
  var len = b64.length;
  if (len % 4 > 0) {
    throw new Error("Invalid string. Length must be a multiple of 4");
  }
  placeHolders = b64[len - 2] === "=" ? 2 : b64[len - 1] === "=" ? 1 : 0;
  arr = new Arr(len * 3 / 4 - placeHolders);
  l = placeHolders > 0 ? len - 4 : len;
  var L = 0;
  for (i = 0, j = 0; i < l; i += 4, j += 3) {
    tmp = revLookup[b64.charCodeAt(i)] << 18 | revLookup[b64.charCodeAt(i + 1)] << 12 | revLookup[b64.charCodeAt(i + 2)] << 6 | revLookup[b64.charCodeAt(i + 3)];
    arr[L++] = tmp >> 16 & 255;
    arr[L++] = tmp >> 8 & 255;
    arr[L++] = tmp & 255;
  }
  if (placeHolders === 2) {
    tmp = revLookup[b64.charCodeAt(i)] << 2 | revLookup[b64.charCodeAt(i + 1)] >> 4;
    arr[L++] = tmp & 255;
  } else if (placeHolders === 1) {
    tmp = revLookup[b64.charCodeAt(i)] << 10 | revLookup[b64.charCodeAt(i + 1)] << 4 | revLookup[b64.charCodeAt(i + 2)] >> 2;
    arr[L++] = tmp >> 8 & 255;
    arr[L++] = tmp & 255;
  }
  return arr;
}
function tripletToBase64(num) {
  return lookup[num >> 18 & 63] + lookup[num >> 12 & 63] + lookup[num >> 6 & 63] + lookup[num & 63];
}
function encodeChunk(uint8, start, end) {
  var tmp;
  var output = [];
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + uint8[i + 2];
    output.push(tripletToBase64(tmp));
  }
  return output.join("");
}
function base64fromByteArray(uint8) {
  if (!inited) {
    init();
  }
  var tmp;
  var len = uint8.length;
  var extraBytes = len % 3;
  var output = "";
  var parts = [];
  var maxChunkLength = 16383;
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(
      encodeChunk(
        uint8,
        i,
        i + maxChunkLength > len2 ? len2 : i + maxChunkLength
      )
    );
  }
  if (extraBytes === 1) {
    tmp = uint8[len - 1];
    output += lookup[tmp >> 2];
    output += lookup[tmp << 4 & 63];
    output += "==";
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1];
    output += lookup[tmp >> 10];
    output += lookup[tmp >> 4 & 63];
    output += lookup[tmp << 2 & 63];
    output += "=";
  }
  parts.push(output);
  return parts.join("");
}
Buffer.TYPED_ARRAY_SUPPORT = globalThis.TYPED_ARRAY_SUPPORT !== void 0 ? globalThis.TYPED_ARRAY_SUPPORT : true;
function kMaxLength() {
  return Buffer.TYPED_ARRAY_SUPPORT ? 2147483647 : 1073741823;
}
function createBuffer(that, length) {
  if (kMaxLength() < length) {
    throw new RangeError("Invalid typed array length");
  }
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    that = new Uint8Array(length);
    that.__proto__ = Buffer.prototype;
  } else {
    if (that === null) {
      that = new Buffer(length);
    }
    that.length = length;
  }
  return that;
}
function Buffer(arg, encodingOrOffset, length) {
  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
    return new Buffer(arg, encodingOrOffset, length);
  }
  if (typeof arg === "number") {
    if (typeof encodingOrOffset === "string") {
      throw new Error(
        "If encoding is specified then the first argument must be a string"
      );
    }
    return allocUnsafe(this, arg);
  }
  return from(this, arg, encodingOrOffset, length);
}
Buffer.poolSize = 8192;
Buffer._augment = function(arr) {
  arr.__proto__ = Buffer.prototype;
  return arr;
};
function from(that, value, encodingOrOffset, length) {
  if (typeof value === "number") {
    throw new TypeError('"value" argument must not be a number');
  }
  if (typeof ArrayBuffer !== "undefined" && value instanceof ArrayBuffer) {
    return fromArrayBuffer(that, value, encodingOrOffset, length);
  }
  if (typeof value === "string") {
    return fromString(that, value, encodingOrOffset);
  }
  return fromObject(that, value);
}
Buffer.from = function(value, encodingOrOffset, length) {
  return from(null, value, encodingOrOffset, length);
};
Buffer.kMaxLength = kMaxLength();
if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype;
  Buffer.__proto__ = Uint8Array;
  if (typeof Symbol !== "undefined" && Symbol.species && Buffer[Symbol.species] === Buffer) {
  }
}
function assertSize(size) {
  if (typeof size !== "number") {
    throw new TypeError('"size" argument must be a number');
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative');
  }
}
function alloc(that, size, fill2, encoding) {
  assertSize(size);
  if (size <= 0) {
    return createBuffer(that, size);
  }
  if (fill2 !== void 0) {
    return typeof encoding === "string" ? createBuffer(that, size).fill(fill2, encoding) : createBuffer(that, size).fill(fill2);
  }
  return createBuffer(that, size);
}
Buffer.alloc = function(size, fill2, encoding) {
  return alloc(null, size, fill2, encoding);
};
function allocUnsafe(that, size) {
  assertSize(size);
  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0);
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < size; ++i) {
      that[i] = 0;
    }
  }
  return that;
}
Buffer.allocUnsafe = function(size) {
  return allocUnsafe(null, size);
};
Buffer.allocUnsafeSlow = function(size) {
  return allocUnsafe(null, size);
};
function fromString(that, string, encoding) {
  if (typeof encoding !== "string" || encoding === "") {
    encoding = "utf8";
  }
  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding');
  }
  var length = byteLength(string, encoding) | 0;
  that = createBuffer(that, length);
  var actual = that.write(string, encoding);
  if (actual !== length) {
    that = that.slice(0, actual);
  }
  return that;
}
function fromArrayLike(that, array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0;
  that = createBuffer(that, length);
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255;
  }
  return that;
}
function fromArrayBuffer(that, array, byteOffset, length) {
  array.byteLength;
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError("'offset' is out of bounds");
  }
  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError("'length' is out of bounds");
  }
  if (byteOffset === void 0 && length === void 0) {
    array = new Uint8Array(array);
  } else if (length === void 0) {
    array = new Uint8Array(array, byteOffset);
  } else {
    array = new Uint8Array(array, byteOffset, length);
  }
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    that = array;
    that.__proto__ = Buffer.prototype;
  } else {
    that = fromArrayLike(that, array);
  }
  return that;
}
function fromObject(that, obj) {
  if (internalIsBuffer(obj)) {
    var len = checked(obj.length) | 0;
    that = createBuffer(that, len);
    if (that.length === 0) {
      return that;
    }
    obj.copy(that, 0, 0, len);
    return that;
  }
  if (obj) {
    if (typeof ArrayBuffer !== "undefined" && obj.buffer instanceof ArrayBuffer || "length" in obj) {
      if (typeof obj.length !== "number" || isnan(obj.length)) {
        return createBuffer(that, 0);
      }
      return fromArrayLike(that, obj);
    }
    if (obj.type === "Buffer" && Array.isArray(obj.data)) {
      return fromArrayLike(that, obj.data);
    }
  }
  throw new TypeError(
    "First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object."
  );
}
function checked(length) {
  if (length >= kMaxLength()) {
    throw new RangeError(
      "Attempt to allocate Buffer larger than maximum size: 0x" + kMaxLength().toString(16) + " bytes"
    );
  }
  return length | 0;
}
Buffer.isBuffer = isBuffer;
function internalIsBuffer(b) {
  return !!(b != null && b._isBuffer);
}
Buffer.compare = function compare(a, b) {
  if (!internalIsBuffer(a) || !internalIsBuffer(b)) {
    throw new TypeError("Arguments must be Buffers");
  }
  if (a === b)
    return 0;
  var x = a.length;
  var y = b.length;
  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i];
      y = b[i];
      break;
    }
  }
  if (x < y)
    return -1;
  if (y < x)
    return 1;
  return 0;
};
Buffer.isEncoding = function isEncoding(encoding) {
  switch (String(encoding).toLowerCase()) {
    case "hex":
    case "utf8":
    case "utf-8":
    case "ascii":
    case "latin1":
    case "binary":
    case "base64":
    case "ucs2":
    case "ucs-2":
    case "utf16le":
    case "utf-16le":
      return true;
    default:
      return false;
  }
};
Buffer.concat = function concat(list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers');
  }
  if (list.length === 0) {
    return Buffer.alloc(0);
  }
  var i;
  if (length === void 0) {
    length = 0;
    for (i = 0; i < list.length; ++i) {
      length += list[i].length;
    }
  }
  var buffer = Buffer.allocUnsafe(length);
  var pos = 0;
  for (i = 0; i < list.length; ++i) {
    var buf = list[i];
    if (!internalIsBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers');
    }
    buf.copy(buffer, pos);
    pos += buf.length;
  }
  return buffer;
};
function byteLength(string, encoding) {
  if (internalIsBuffer(string)) {
    return string.length;
  }
  if (typeof ArrayBuffer !== "undefined" && typeof ArrayBuffer.isView === "function" && (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
    return string.byteLength;
  }
  if (typeof string !== "string") {
    string = "" + string;
  }
  var len = string.length;
  if (len === 0)
    return 0;
  var loweredCase = false;
  for (; ; ) {
    switch (encoding) {
      case "ascii":
      case "latin1":
      case "binary":
        return len;
      case "utf8":
      case "utf-8":
      case void 0:
        return utf8ToBytes(string).length;
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
        return len * 2;
      case "hex":
        return len >>> 1;
      case "base64":
        return base64ToBytes(string).length;
      default:
        if (loweredCase)
          return utf8ToBytes(string).length;
        encoding = ("" + encoding).toLowerCase();
        loweredCase = true;
    }
  }
}
Buffer.byteLength = byteLength;
function slowToString(encoding, start, end) {
  var loweredCase = false;
  if (start === void 0 || start < 0) {
    start = 0;
  }
  if (start > this.length) {
    return "";
  }
  if (end === void 0 || end > this.length) {
    end = this.length;
  }
  if (end <= 0) {
    return "";
  }
  end >>>= 0;
  start >>>= 0;
  if (end <= start) {
    return "";
  }
  if (!encoding)
    encoding = "utf8";
  while (true) {
    switch (encoding) {
      case "hex":
        return hexSlice(this, start, end);
      case "utf8":
      case "utf-8":
        return utf8Slice(this, start, end);
      case "ascii":
        return asciiSlice(this, start, end);
      case "latin1":
      case "binary":
        return latin1Slice(this, start, end);
      case "base64":
        return base64Slice(this, start, end);
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
        return utf16leSlice(this, start, end);
      default:
        if (loweredCase)
          throw new TypeError("Unknown encoding: " + encoding);
        encoding = (encoding + "").toLowerCase();
        loweredCase = true;
    }
  }
}
Buffer.prototype._isBuffer = true;
function swap(b, n, m) {
  var i = b[n];
  b[n] = b[m];
  b[m] = i;
}
Buffer.prototype.swap16 = function swap16() {
  var len = this.length;
  if (len % 2 !== 0) {
    throw new RangeError("Buffer size must be a multiple of 16-bits");
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1);
  }
  return this;
};
Buffer.prototype.swap32 = function swap32() {
  var len = this.length;
  if (len % 4 !== 0) {
    throw new RangeError("Buffer size must be a multiple of 32-bits");
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3);
    swap(this, i + 1, i + 2);
  }
  return this;
};
Buffer.prototype.swap64 = function swap64() {
  var len = this.length;
  if (len % 8 !== 0) {
    throw new RangeError("Buffer size must be a multiple of 64-bits");
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7);
    swap(this, i + 1, i + 6);
    swap(this, i + 2, i + 5);
    swap(this, i + 3, i + 4);
  }
  return this;
};
Buffer.prototype.toString = function toString() {
  var length = this.length | 0;
  if (length === 0)
    return "";
  if (arguments.length === 0)
    return utf8Slice(this, 0, length);
  return slowToString.apply(this, arguments);
};
Buffer.prototype.equals = function equals(b) {
  if (!internalIsBuffer(b))
    throw new TypeError("Argument must be a Buffer");
  if (this === b)
    return true;
  return Buffer.compare(this, b) === 0;
};
Buffer.prototype.compare = function compare2(target, start, end, thisStart, thisEnd) {
  if (!internalIsBuffer(target)) {
    throw new TypeError("Argument must be a Buffer");
  }
  if (start === void 0) {
    start = 0;
  }
  if (end === void 0) {
    end = target ? target.length : 0;
  }
  if (thisStart === void 0) {
    thisStart = 0;
  }
  if (thisEnd === void 0) {
    thisEnd = this.length;
  }
  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError("out of range index");
  }
  if (thisStart >= thisEnd && start >= end) {
    return 0;
  }
  if (thisStart >= thisEnd) {
    return -1;
  }
  if (start >= end) {
    return 1;
  }
  start >>>= 0;
  end >>>= 0;
  thisStart >>>= 0;
  thisEnd >>>= 0;
  if (this === target)
    return 0;
  var x = thisEnd - thisStart;
  var y = end - start;
  var len = Math.min(x, y);
  var thisCopy = this.slice(thisStart, thisEnd);
  var targetCopy = target.slice(start, end);
  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i];
      y = targetCopy[i];
      break;
    }
  }
  if (x < y)
    return -1;
  if (y < x)
    return 1;
  return 0;
};
function bidirectionalIndexOf(buffer, val, byteOffset, encoding, dir) {
  if (buffer.length === 0)
    return -1;
  if (typeof byteOffset === "string") {
    encoding = byteOffset;
    byteOffset = 0;
  } else if (byteOffset > 2147483647) {
    byteOffset = 2147483647;
  } else if (byteOffset < -2147483648) {
    byteOffset = -2147483648;
  }
  byteOffset = +byteOffset;
  if (isNaN(byteOffset)) {
    byteOffset = dir ? 0 : buffer.length - 1;
  }
  if (byteOffset < 0)
    byteOffset = buffer.length + byteOffset;
  if (byteOffset >= buffer.length) {
    if (dir)
      return -1;
    else
      byteOffset = buffer.length - 1;
  } else if (byteOffset < 0) {
    if (dir)
      byteOffset = 0;
    else
      return -1;
  }
  if (typeof val === "string") {
    val = Buffer.from(val, encoding);
  }
  if (internalIsBuffer(val)) {
    if (val.length === 0) {
      return -1;
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir);
  } else if (typeof val === "number") {
    val = val & 255;
    if (Buffer.TYPED_ARRAY_SUPPORT && typeof Uint8Array.prototype.indexOf === "function") {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(
          buffer,
          val,
          byteOffset
        );
      } else {
        return Uint8Array.prototype.lastIndexOf.call(
          buffer,
          val,
          byteOffset
        );
      }
    }
    return arrayIndexOf(buffer, [val], byteOffset, encoding, dir);
  }
  throw new TypeError("val must be string, number or Buffer");
}
function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
  var indexSize = 1;
  var arrLength = arr.length;
  var valLength = val.length;
  if (encoding !== void 0) {
    encoding = String(encoding).toLowerCase();
    if (encoding === "ucs2" || encoding === "ucs-2" || encoding === "utf16le" || encoding === "utf-16le") {
      if (arr.length < 2 || val.length < 2) {
        return -1;
      }
      indexSize = 2;
      arrLength /= 2;
      valLength /= 2;
      byteOffset /= 2;
    }
  }
  function read(buf, i2) {
    if (indexSize === 1) {
      return buf[i2];
    } else {
      return buf.readUInt16BE(i2 * indexSize);
    }
  }
  var i;
  if (dir) {
    var foundIndex = -1;
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1)
          foundIndex = i;
        if (i - foundIndex + 1 === valLength)
          return foundIndex * indexSize;
      } else {
        if (foundIndex !== -1)
          i -= i - foundIndex;
        foundIndex = -1;
      }
    }
  } else {
    if (byteOffset + valLength > arrLength)
      byteOffset = arrLength - valLength;
    for (i = byteOffset; i >= 0; i--) {
      var found = true;
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false;
          break;
        }
      }
      if (found)
        return i;
    }
  }
  return -1;
}
Buffer.prototype.includes = function includes(val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1;
};
Buffer.prototype.indexOf = function indexOf(val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true);
};
Buffer.prototype.lastIndexOf = function lastIndexOf(val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false);
};
function hexWrite(buf, string, offset, length) {
  offset = Number(offset) || 0;
  var remaining = buf.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = Number(length);
    if (length > remaining) {
      length = remaining;
    }
  }
  var strLen = string.length;
  if (strLen % 2 !== 0)
    throw new TypeError("Invalid hex string");
  if (length > strLen / 2) {
    length = strLen / 2;
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16);
    if (isNaN(parsed))
      return i;
    buf[offset + i] = parsed;
  }
  return i;
}
function utf8Write(buf, string, offset, length) {
  return blitBuffer(
    utf8ToBytes(string, buf.length - offset),
    buf,
    offset,
    length
  );
}
function asciiWrite(buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length);
}
function latin1Write(buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length);
}
function base64Write(buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length);
}
function ucs2Write(buf, string, offset, length) {
  return blitBuffer(
    utf16leToBytes(string, buf.length - offset),
    buf,
    offset,
    length
  );
}
Buffer.prototype.write = function write(string, offset, length, encoding) {
  if (offset === void 0) {
    encoding = "utf8";
    length = this.length;
    offset = 0;
  } else if (length === void 0 && typeof offset === "string") {
    encoding = offset;
    length = this.length;
    offset = 0;
  } else if (isFinite(offset)) {
    offset = offset | 0;
    if (isFinite(length)) {
      length = length | 0;
      if (encoding === void 0)
        encoding = "utf8";
    } else {
      encoding = length;
      length = void 0;
    }
  } else {
    throw new Error(
      "Buffer.write(string, encoding, offset[, length]) is no longer supported"
    );
  }
  var remaining = this.length - offset;
  if (length === void 0 || length > remaining)
    length = remaining;
  if (string.length > 0 && (length < 0 || offset < 0) || offset > this.length) {
    throw new RangeError("Attempt to write outside buffer bounds");
  }
  if (!encoding)
    encoding = "utf8";
  var loweredCase = false;
  for (; ; ) {
    switch (encoding) {
      case "hex":
        return hexWrite(this, string, offset, length);
      case "utf8":
      case "utf-8":
        return utf8Write(this, string, offset, length);
      case "ascii":
        return asciiWrite(this, string, offset, length);
      case "latin1":
      case "binary":
        return latin1Write(this, string, offset, length);
      case "base64":
        return base64Write(this, string, offset, length);
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
        return ucs2Write(this, string, offset, length);
      default:
        if (loweredCase)
          throw new TypeError("Unknown encoding: " + encoding);
        encoding = ("" + encoding).toLowerCase();
        loweredCase = true;
    }
  }
};
Buffer.prototype.toJSON = function toJSON() {
  return {
    type: "Buffer",
    data: Array.prototype.slice.call(this._arr || this, 0)
  };
};
function base64Slice(buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64fromByteArray(buf);
  } else {
    return base64fromByteArray(buf.slice(start, end));
  }
}
function utf8Slice(buf, start, end) {
  end = Math.min(buf.length, end);
  var res = [];
  var i = start;
  while (i < end) {
    var firstByte = buf[i];
    var codePoint = null;
    var bytesPerSequence = firstByte > 239 ? 4 : firstByte > 223 ? 3 : firstByte > 191 ? 2 : 1;
    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint;
      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 128) {
            codePoint = firstByte;
          }
          break;
        case 2:
          secondByte = buf[i + 1];
          if ((secondByte & 192) === 128) {
            tempCodePoint = (firstByte & 31) << 6 | secondByte & 63;
            if (tempCodePoint > 127) {
              codePoint = tempCodePoint;
            }
          }
          break;
        case 3:
          secondByte = buf[i + 1];
          thirdByte = buf[i + 2];
          if ((secondByte & 192) === 128 && (thirdByte & 192) === 128) {
            tempCodePoint = (firstByte & 15) << 12 | (secondByte & 63) << 6 | thirdByte & 63;
            if (tempCodePoint > 2047 && (tempCodePoint < 55296 || tempCodePoint > 57343)) {
              codePoint = tempCodePoint;
            }
          }
          break;
        case 4:
          secondByte = buf[i + 1];
          thirdByte = buf[i + 2];
          fourthByte = buf[i + 3];
          if ((secondByte & 192) === 128 && (thirdByte & 192) === 128 && (fourthByte & 192) === 128) {
            tempCodePoint = (firstByte & 15) << 18 | (secondByte & 63) << 12 | (thirdByte & 63) << 6 | fourthByte & 63;
            if (tempCodePoint > 65535 && tempCodePoint < 1114112) {
              codePoint = tempCodePoint;
            }
          }
      }
    }
    if (codePoint === null) {
      codePoint = 65533;
      bytesPerSequence = 1;
    } else if (codePoint > 65535) {
      codePoint -= 65536;
      res.push(codePoint >>> 10 & 1023 | 55296);
      codePoint = 56320 | codePoint & 1023;
    }
    res.push(codePoint);
    i += bytesPerSequence;
  }
  return decodeCodePointsArray(res);
}
var MAX_ARGUMENTS_LENGTH = 4096;
function decodeCodePointsArray(codePoints) {
  var len = codePoints.length;
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints);
  }
  var res = "";
  var i = 0;
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    );
  }
  return res;
}
function asciiSlice(buf, start, end) {
  var ret = "";
  end = Math.min(buf.length, end);
  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 127);
  }
  return ret;
}
function latin1Slice(buf, start, end) {
  var ret = "";
  end = Math.min(buf.length, end);
  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i]);
  }
  return ret;
}
function hexSlice(buf, start, end) {
  var len = buf.length;
  if (!start || start < 0)
    start = 0;
  if (!end || end < 0 || end > len)
    end = len;
  var out = "";
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i]);
  }
  return out;
}
function utf16leSlice(buf, start, end) {
  var bytes = buf.slice(start, end);
  var res = "";
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
  }
  return res;
}
Buffer.prototype.slice = function slice(start, end) {
  var len = this.length;
  start = ~~start;
  end = end === void 0 ? len : ~~end;
  if (start < 0) {
    start += len;
    if (start < 0)
      start = 0;
  } else if (start > len) {
    start = len;
  }
  if (end < 0) {
    end += len;
    if (end < 0)
      end = 0;
  } else if (end > len) {
    end = len;
  }
  if (end < start)
    end = start;
  var newBuf;
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end);
    newBuf.__proto__ = Buffer.prototype;
  } else {
    var sliceLen = end - start;
    newBuf = new Buffer(sliceLen, void 0);
    for (var i = 0; i < sliceLen; ++i) {
      newBuf[i] = this[i + start];
    }
  }
  return newBuf;
};
function checkOffset(offset, ext, length) {
  if (offset % 1 !== 0 || offset < 0)
    throw new RangeError("offset is not uint");
  if (offset + ext > length)
    throw new RangeError("Trying to access beyond buffer length");
}
Buffer.prototype.readUIntLE = function readUIntLE(offset, byteLength2, noAssert) {
  offset = offset | 0;
  byteLength2 = byteLength2 | 0;
  if (!noAssert)
    checkOffset(offset, byteLength2, this.length);
  var val = this[offset];
  var mul = 1;
  var i = 0;
  while (++i < byteLength2 && (mul *= 256)) {
    val += this[offset + i] * mul;
  }
  return val;
};
Buffer.prototype.readUIntBE = function readUIntBE(offset, byteLength2, noAssert) {
  offset = offset | 0;
  byteLength2 = byteLength2 | 0;
  if (!noAssert) {
    checkOffset(offset, byteLength2, this.length);
  }
  var val = this[offset + --byteLength2];
  var mul = 1;
  while (byteLength2 > 0 && (mul *= 256)) {
    val += this[offset + --byteLength2] * mul;
  }
  return val;
};
Buffer.prototype.readUInt8 = function readUInt8(offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 1, this.length);
  return this[offset];
};
Buffer.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length);
  return this[offset] | this[offset + 1] << 8;
};
Buffer.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length);
  return this[offset] << 8 | this[offset + 1];
};
Buffer.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length);
  return (this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16) + this[offset + 3] * 16777216;
};
Buffer.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length);
  return this[offset] * 16777216 + (this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3]);
};
Buffer.prototype.readIntLE = function readIntLE(offset, byteLength2, noAssert) {
  offset = offset | 0;
  byteLength2 = byteLength2 | 0;
  if (!noAssert)
    checkOffset(offset, byteLength2, this.length);
  var val = this[offset];
  var mul = 1;
  var i = 0;
  while (++i < byteLength2 && (mul *= 256)) {
    val += this[offset + i] * mul;
  }
  mul *= 128;
  if (val >= mul)
    val -= Math.pow(2, 8 * byteLength2);
  return val;
};
Buffer.prototype.readIntBE = function readIntBE(offset, byteLength2, noAssert) {
  offset = offset | 0;
  byteLength2 = byteLength2 | 0;
  if (!noAssert)
    checkOffset(offset, byteLength2, this.length);
  var i = byteLength2;
  var mul = 1;
  var val = this[offset + --i];
  while (i > 0 && (mul *= 256)) {
    val += this[offset + --i] * mul;
  }
  mul *= 128;
  if (val >= mul)
    val -= Math.pow(2, 8 * byteLength2);
  return val;
};
Buffer.prototype.readInt8 = function readInt8(offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 1, this.length);
  if (!(this[offset] & 128))
    return this[offset];
  return (255 - this[offset] + 1) * -1;
};
Buffer.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length);
  var val = this[offset] | this[offset + 1] << 8;
  return val & 32768 ? val | 4294901760 : val;
};
Buffer.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length);
  var val = this[offset + 1] | this[offset] << 8;
  return val & 32768 ? val | 4294901760 : val;
};
Buffer.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length);
  return this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16 | this[offset + 3] << 24;
};
Buffer.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length);
  return this[offset] << 24 | this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3];
};
Buffer.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length);
  return ieee754read(this, offset, true, 23, 4);
};
Buffer.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length);
  return ieee754read(this, offset, false, 23, 4);
};
Buffer.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 8, this.length);
  return ieee754read(this, offset, true, 52, 8);
};
Buffer.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 8, this.length);
  return ieee754read(this, offset, false, 52, 8);
};
function checkInt(buf, value, offset, ext, max, min) {
  if (!internalIsBuffer(buf))
    throw new TypeError('"buffer" argument must be a Buffer instance');
  if (value > max || value < min)
    throw new RangeError('"value" argument is out of bounds');
  if (offset + ext > buf.length)
    throw new RangeError("Index out of range");
}
Buffer.prototype.writeUIntLE = function writeUIntLE(value, offset, byteLength2, noAssert) {
  value = +value;
  offset = offset | 0;
  byteLength2 = byteLength2 | 0;
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength2) - 1;
    checkInt(this, value, offset, byteLength2, maxBytes, 0);
  }
  var mul = 1;
  var i = 0;
  this[offset] = value & 255;
  while (++i < byteLength2 && (mul *= 256)) {
    this[offset + i] = value / mul & 255;
  }
  return offset + byteLength2;
};
Buffer.prototype.writeUIntBE = function writeUIntBE(value, offset, byteLength2, noAssert) {
  value = +value;
  offset = offset | 0;
  byteLength2 = byteLength2 | 0;
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength2) - 1;
    checkInt(this, value, offset, byteLength2, maxBytes, 0);
  }
  var i = byteLength2 - 1;
  var mul = 1;
  this[offset + i] = value & 255;
  while (--i >= 0 && (mul *= 256)) {
    this[offset + i] = value / mul & 255;
  }
  return offset + byteLength2;
};
Buffer.prototype.writeUInt8 = function writeUInt8(value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert)
    checkInt(this, value, offset, 1, 255, 0);
  if (!Buffer.TYPED_ARRAY_SUPPORT)
    value = Math.floor(value);
  this[offset] = value & 255;
  return offset + 1;
};
function objectWriteUInt16(buf, value, offset, littleEndian) {
  if (value < 0)
    value = 65535 + value + 1;
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
    buf[offset + i] = (value & 255 << 8 * (littleEndian ? i : 1 - i)) >>> (littleEndian ? i : 1 - i) * 8;
  }
}
Buffer.prototype.writeUInt16LE = function writeUInt16LE(value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert)
    checkInt(this, value, offset, 2, 65535, 0);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value & 255;
    this[offset + 1] = value >>> 8;
  } else {
    objectWriteUInt16(this, value, offset, true);
  }
  return offset + 2;
};
Buffer.prototype.writeUInt16BE = function writeUInt16BE(value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert)
    checkInt(this, value, offset, 2, 65535, 0);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value >>> 8;
    this[offset + 1] = value & 255;
  } else {
    objectWriteUInt16(this, value, offset, false);
  }
  return offset + 2;
};
function objectWriteUInt32(buf, value, offset, littleEndian) {
  if (value < 0)
    value = 4294967295 + value + 1;
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
    buf[offset + i] = value >>> (littleEndian ? i : 3 - i) * 8 & 255;
  }
}
Buffer.prototype.writeUInt32LE = function writeUInt32LE(value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert)
    checkInt(this, value, offset, 4, 4294967295, 0);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = value >>> 24;
    this[offset + 2] = value >>> 16;
    this[offset + 1] = value >>> 8;
    this[offset] = value & 255;
  } else {
    objectWriteUInt32(this, value, offset, true);
  }
  return offset + 4;
};
Buffer.prototype.writeUInt32BE = function writeUInt32BE(value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert)
    checkInt(this, value, offset, 4, 4294967295, 0);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value >>> 24;
    this[offset + 1] = value >>> 16;
    this[offset + 2] = value >>> 8;
    this[offset + 3] = value & 255;
  } else {
    objectWriteUInt32(this, value, offset, false);
  }
  return offset + 4;
};
Buffer.prototype.writeIntLE = function writeIntLE(value, offset, byteLength2, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength2 - 1);
    checkInt(this, value, offset, byteLength2, limit - 1, -limit);
  }
  var i = 0;
  var mul = 1;
  var sub = 0;
  this[offset] = value & 255;
  while (++i < byteLength2 && (mul *= 256)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1;
    }
    this[offset + i] = (value / mul >> 0) - sub & 255;
  }
  return offset + byteLength2;
};
Buffer.prototype.writeIntBE = function writeIntBE(value, offset, byteLength2, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength2 - 1);
    checkInt(this, value, offset, byteLength2, limit - 1, -limit);
  }
  var i = byteLength2 - 1;
  var mul = 1;
  var sub = 0;
  this[offset + i] = value & 255;
  while (--i >= 0 && (mul *= 256)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1;
    }
    this[offset + i] = (value / mul >> 0) - sub & 255;
  }
  return offset + byteLength2;
};
Buffer.prototype.writeInt8 = function writeInt8(value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert)
    checkInt(this, value, offset, 1, 127, -128);
  if (!Buffer.TYPED_ARRAY_SUPPORT)
    value = Math.floor(value);
  if (value < 0)
    value = 255 + value + 1;
  this[offset] = value & 255;
  return offset + 1;
};
Buffer.prototype.writeInt16LE = function writeInt16LE(value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert)
    checkInt(this, value, offset, 2, 32767, -32768);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value & 255;
    this[offset + 1] = value >>> 8;
  } else {
    objectWriteUInt16(this, value, offset, true);
  }
  return offset + 2;
};
Buffer.prototype.writeInt16BE = function writeInt16BE(value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert)
    checkInt(this, value, offset, 2, 32767, -32768);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value >>> 8;
    this[offset + 1] = value & 255;
  } else {
    objectWriteUInt16(this, value, offset, false);
  }
  return offset + 2;
};
Buffer.prototype.writeInt32LE = function writeInt32LE(value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert)
    checkInt(this, value, offset, 4, 2147483647, -2147483648);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value & 255;
    this[offset + 1] = value >>> 8;
    this[offset + 2] = value >>> 16;
    this[offset + 3] = value >>> 24;
  } else {
    objectWriteUInt32(this, value, offset, true);
  }
  return offset + 4;
};
Buffer.prototype.writeInt32BE = function writeInt32BE(value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert)
    checkInt(this, value, offset, 4, 2147483647, -2147483648);
  if (value < 0)
    value = 4294967295 + value + 1;
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value >>> 24;
    this[offset + 1] = value >>> 16;
    this[offset + 2] = value >>> 8;
    this[offset + 3] = value & 255;
  } else {
    objectWriteUInt32(this, value, offset, false);
  }
  return offset + 4;
};
function checkIEEE754(buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length)
    throw new RangeError("Index out of range");
  if (offset < 0)
    throw new RangeError("Index out of range");
}
function writeFloat(buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(
      buf,
      value,
      offset,
      4,
      34028234663852886e22,
      -34028234663852886e22
    );
  }
  ieee754write(buf, value, offset, littleEndian, 23, 4);
  return offset + 4;
}
Buffer.prototype.writeFloatLE = function writeFloatLE(value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert);
};
Buffer.prototype.writeFloatBE = function writeFloatBE(value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert);
};
function writeDouble(buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(
      buf,
      value,
      offset,
      8,
      17976931348623157e292,
      -17976931348623157e292
    );
  }
  ieee754write(buf, value, offset, littleEndian, 52, 8);
  return offset + 8;
}
Buffer.prototype.writeDoubleLE = function writeDoubleLE(value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert);
};
Buffer.prototype.writeDoubleBE = function writeDoubleBE(value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert);
};
Buffer.prototype.copy = function copy(target, targetStart, start, end) {
  if (!start)
    start = 0;
  if (!end && end !== 0)
    end = this.length;
  if (targetStart >= target.length)
    targetStart = target.length;
  if (!targetStart)
    targetStart = 0;
  if (end > 0 && end < start)
    end = start;
  if (end === start)
    return 0;
  if (target.length === 0 || this.length === 0)
    return 0;
  if (targetStart < 0) {
    throw new RangeError("targetStart out of bounds");
  }
  if (start < 0 || start >= this.length)
    throw new RangeError("sourceStart out of bounds");
  if (end < 0)
    throw new RangeError("sourceEnd out of bounds");
  if (end > this.length)
    end = this.length;
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start;
  }
  var len = end - start;
  var i;
  if (this === target && start < targetStart && targetStart < end) {
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start];
    }
  } else if (len < 1e3 || !Buffer.TYPED_ARRAY_SUPPORT) {
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start];
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    );
  }
  return len;
};
Buffer.prototype.fill = function fill(val, start, end, encoding) {
  if (typeof val === "string") {
    if (typeof start === "string") {
      encoding = start;
      start = 0;
      end = this.length;
    } else if (typeof end === "string") {
      encoding = end;
      end = this.length;
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0);
      if (code < 256) {
        val = code;
      }
    }
    if (encoding !== void 0 && typeof encoding !== "string") {
      throw new TypeError("encoding must be a string");
    }
    if (typeof encoding === "string" && !Buffer.isEncoding(encoding)) {
      throw new TypeError("Unknown encoding: " + encoding);
    }
  } else if (typeof val === "number") {
    val = val & 255;
  }
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError("Out of range index");
  }
  if (end <= start) {
    return this;
  }
  start = start >>> 0;
  end = end === void 0 ? this.length : end >>> 0;
  if (!val)
    val = 0;
  var i;
  if (typeof val === "number") {
    for (i = start; i < end; ++i) {
      this[i] = val;
    }
  } else {
    var bytes = internalIsBuffer(val) ? val : utf8ToBytes(new Buffer(val, encoding).toString());
    var len = bytes.length;
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len];
    }
  }
  return this;
};
var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g;
function base64clean(str) {
  str = stringtrim(str).replace(INVALID_BASE64_RE, "");
  if (str.length < 2)
    return "";
  while (str.length % 4 !== 0) {
    str = str + "=";
  }
  return str;
}
function stringtrim(str) {
  if (str.trim)
    return str.trim();
  return str.replace(/^\s+|\s+$/g, "");
}
function toHex(n) {
  if (n < 16)
    return "0" + n.toString(16);
  return n.toString(16);
}
function utf8ToBytes(string, units) {
  units = units || Infinity;
  var codePoint;
  var length = string.length;
  var leadSurrogate = null;
  var bytes = [];
  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i);
    if (codePoint > 55295 && codePoint < 57344) {
      if (!leadSurrogate) {
        if (codePoint > 56319) {
          if ((units -= 3) > -1)
            bytes.push(239, 191, 189);
          continue;
        } else if (i + 1 === length) {
          if ((units -= 3) > -1)
            bytes.push(239, 191, 189);
          continue;
        }
        leadSurrogate = codePoint;
        continue;
      }
      if (codePoint < 56320) {
        if ((units -= 3) > -1)
          bytes.push(239, 191, 189);
        leadSurrogate = codePoint;
        continue;
      }
      codePoint = (leadSurrogate - 55296 << 10 | codePoint - 56320) + 65536;
    } else if (leadSurrogate) {
      if ((units -= 3) > -1)
        bytes.push(239, 191, 189);
    }
    leadSurrogate = null;
    if (codePoint < 128) {
      if ((units -= 1) < 0)
        break;
      bytes.push(codePoint);
    } else if (codePoint < 2048) {
      if ((units -= 2) < 0)
        break;
      bytes.push(codePoint >> 6 | 192, codePoint & 63 | 128);
    } else if (codePoint < 65536) {
      if ((units -= 3) < 0)
        break;
      bytes.push(
        codePoint >> 12 | 224,
        codePoint >> 6 & 63 | 128,
        codePoint & 63 | 128
      );
    } else if (codePoint < 1114112) {
      if ((units -= 4) < 0)
        break;
      bytes.push(
        codePoint >> 18 | 240,
        codePoint >> 12 & 63 | 128,
        codePoint >> 6 & 63 | 128,
        codePoint & 63 | 128
      );
    } else {
      throw new Error("Invalid code point");
    }
  }
  return bytes;
}
function asciiToBytes(str) {
  var byteArray = [];
  for (var i = 0; i < str.length; ++i) {
    byteArray.push(str.charCodeAt(i) & 255);
  }
  return byteArray;
}
function utf16leToBytes(str, units) {
  var c, hi, lo;
  var byteArray = [];
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0)
      break;
    c = str.charCodeAt(i);
    hi = c >> 8;
    lo = c % 256;
    byteArray.push(lo);
    byteArray.push(hi);
  }
  return byteArray;
}
function base64ToBytes(str) {
  return base64toByteArray(base64clean(str));
}
function blitBuffer(src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if (i + offset >= dst.length || i >= src.length)
      break;
    dst[i + offset] = src[i];
  }
  return i;
}
function isnan(val) {
  return val !== val;
}
function isBuffer(obj) {
  return obj != null && (!!obj._isBuffer || isFastBuffer(obj) || isSlowBuffer(obj));
}
function isFastBuffer(obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === "function" && obj.constructor.isBuffer(obj);
}
function isSlowBuffer(obj) {
  return typeof obj.readFloatLE === "function" && typeof obj.slice === "function" && isFastBuffer(obj.slice(0, 0));
}
function ieee754read(buffer, offset, isLE, mLen, nBytes) {
  var e, m;
  var eLen = nBytes * 8 - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var nBits = -7;
  var i = isLE ? nBytes - 1 : 0;
  var d = isLE ? -1 : 1;
  var s = buffer[offset + i];
  i += d;
  e = s & (1 << -nBits) - 1;
  s >>= -nBits;
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {
  }
  m = e & (1 << -nBits) - 1;
  e >>= -nBits;
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {
  }
  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : (s ? -1 : 1) * Infinity;
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
}
function ieee754write(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c;
  var eLen = nBytes * 8 - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
  var i = isLE ? 0 : nBytes - 1;
  var d = isLE ? 1 : -1;
  var s = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0;
  value = Math.abs(value);
  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }
    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }
  for (; mLen >= 8; buffer[offset + i] = m & 255, i += d, m /= 256, mLen -= 8) {
  }
  e = e << mLen | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 255, i += d, e /= 256, eLen -= 8) {
  }
  buffer[offset + i - d] |= s * 128;
}

// ../dist/crank.js
var NOOP = () => {
};
var IDENTITY = (value) => value;
function wrap(value) {
  return value === void 0 ? [] : Array.isArray(value) ? value : [value];
}
function unwrap(arr) {
  return arr.length === 0 ? void 0 : arr.length === 1 ? arr[0] : arr;
}
function arrayify(value) {
  return value == null ? [] : Array.isArray(value) ? value : typeof value === "string" || typeof value[Symbol.iterator] !== "function" ? [value] : (
    // TODO: inference broke in TypeScript 3.9.
    [...value]
  );
}
function isIteratorLike(value) {
  return value != null && typeof value.next === "function";
}
function isPromiseLike(value) {
  return value != null && typeof value.then === "function";
}
var Fragment = "";
var Portal = Symbol.for("crank.Portal");
var Copy = Symbol.for("crank.Copy");
var Raw = Symbol.for("crank.Raw");
var ElementSymbol = Symbol.for("crank.Element");
var Element = class {
  constructor(tag, props, key, ref, static_) {
    this.tag = tag;
    this.props = props;
    this.key = key;
    this.ref = ref;
    this.static_ = static_;
  }
};
Element.prototype.$$typeof = ElementSymbol;
function isElement(value) {
  return value != null && value.$$typeof === ElementSymbol;
}
function createElement(tag, props, ...children) {
  let key;
  let ref;
  let static_ = false;
  const props1 = {};
  if (props != null) {
    for (const name in props) {
      switch (name) {
        case "crank-key":
        case "c-key":
        case "$key":
          if (props[name] != null) {
            key = props[name];
          }
          break;
        case "crank-ref":
        case "c-ref":
        case "$ref":
          if (typeof props[name] === "function") {
            ref = props[name];
          }
          break;
        case "crank-static":
        case "c-static":
        case "$static":
          static_ = !!props[name];
          break;
        default:
          props1[name] = props[name];
      }
    }
  }
  if (children.length > 1) {
    props1.children = children;
  } else if (children.length === 1) {
    props1.children = children[0];
  }
  return new Element(tag, props1, key, ref, static_);
}
function cloneElement(el) {
  if (!isElement(el)) {
    throw new TypeError("Cannot clone non-element");
  }
  return new Element(el.tag, { ...el.props }, el.key, el.ref);
}
function narrow(value) {
  if (typeof value === "boolean" || value == null) {
    return void 0;
  } else if (typeof value === "string" || isElement(value)) {
    return value;
  } else if (typeof value[Symbol.iterator] === "function") {
    return createElement(Fragment, null, value);
  }
  return value.toString();
}
function normalize(values) {
  const result = [];
  let buffer;
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (!value)
      ;
    else if (typeof value === "string") {
      buffer = (buffer || "") + value;
    } else if (!Array.isArray(value)) {
      if (buffer) {
        result.push(buffer);
        buffer = void 0;
      }
      result.push(value);
    } else {
      for (let j = 0; j < value.length; j++) {
        const value1 = value[j];
        if (!value1)
          ;
        else if (typeof value1 === "string") {
          buffer = (buffer || "") + value1;
        } else {
          if (buffer) {
            result.push(buffer);
            buffer = void 0;
          }
          result.push(value1);
        }
      }
    }
  }
  if (buffer) {
    result.push(buffer);
  }
  return result;
}
var Retainer = class {
  constructor(el) {
    this.el = el;
    this.ctx = void 0;
    this.children = void 0;
    this.value = void 0;
    this.cachedChildValues = void 0;
    this.fallbackValue = void 0;
    this.inflightValue = void 0;
    this.onNextValues = void 0;
  }
};
function getValue(ret) {
  if (typeof ret.fallbackValue !== "undefined") {
    return typeof ret.fallbackValue === "object" ? getValue(ret.fallbackValue) : ret.fallbackValue;
  } else if (ret.el.tag === Portal) {
    return;
  } else if (typeof ret.el.tag !== "function" && ret.el.tag !== Fragment) {
    return ret.value;
  }
  return unwrap(getChildValues(ret));
}
function getChildValues(ret) {
  if (ret.cachedChildValues) {
    return wrap(ret.cachedChildValues);
  }
  const values = [];
  const children = wrap(ret.children);
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child) {
      values.push(typeof child === "string" ? child : getValue(child));
    }
  }
  const values1 = normalize(values);
  const tag = ret.el.tag;
  if (typeof tag === "function" || tag !== Fragment && tag !== Raw) {
    ret.cachedChildValues = unwrap(values1);
  }
  return values1;
}
var defaultRendererImpl = {
  create() {
    throw new Error("Not implemented");
  },
  hydrate() {
    throw new Error("Not implemented");
  },
  scope: IDENTITY,
  read: IDENTITY,
  text: IDENTITY,
  raw: IDENTITY,
  patch: NOOP,
  arrange: NOOP,
  dispose: NOOP,
  flush: NOOP
};
var _RendererImpl = Symbol.for("crank.RendererImpl");
var Renderer = class {
  constructor(impl) {
    this.cache = /* @__PURE__ */ new WeakMap();
    this[_RendererImpl] = {
      ...defaultRendererImpl,
      ...impl
    };
  }
  /**
   * Renders an element tree into a specific root.
   *
   * @param children - An element tree. You can render null with a previously
   * used root to delete the previously rendered element tree from the cache.
   * @param root - The node to be rendered into. The renderer will cache
   * element trees per root.
   * @param bridge - An optional context that will be the ancestor context of all
   * elements in the tree. Useful for connecting different renderers so that
   * events/provisions properly propagate. The context for a given root must be
   * the same or an error will be thrown.
   *
   * @returns The result of rendering the children, or a possible promise of
   * the result if the element tree renders asynchronously.
   */
  render(children, root, bridge) {
    let ret;
    const ctx = bridge && bridge[_ContextImpl];
    if (typeof root === "object" && root !== null) {
      ret = this.cache.get(root);
    }
    let oldProps;
    if (ret === void 0) {
      ret = new Retainer(createElement(Portal, { children, root }));
      ret.value = root;
      ret.ctx = ctx;
      if (typeof root === "object" && root !== null && children != null) {
        this.cache.set(root, ret);
      }
    } else if (ret.ctx !== ctx) {
      throw new Error("Context mismatch");
    } else {
      oldProps = ret.el.props;
      ret.el = createElement(Portal, { children, root });
      if (typeof root === "object" && root !== null && children == null) {
        this.cache.delete(root);
      }
    }
    const impl = this[_RendererImpl];
    const childValues = diffChildren(impl, root, ret, ctx, impl.scope(void 0, Portal, ret.el.props), ret, children, void 0);
    if (isPromiseLike(childValues)) {
      return childValues.then((childValues2) => commitRootRender(impl, root, ctx, ret, childValues2, oldProps));
    }
    return commitRootRender(impl, root, ctx, ret, childValues, oldProps);
  }
  hydrate(children, root, bridge) {
    const impl = this[_RendererImpl];
    const ctx = bridge && bridge[_ContextImpl];
    let ret;
    ret = this.cache.get(root);
    if (ret !== void 0) {
      return this.render(children, root, bridge);
    }
    let oldProps;
    ret = new Retainer(createElement(Portal, { children, root }));
    ret.value = root;
    if (typeof root === "object" && root !== null && children != null) {
      this.cache.set(root, ret);
    }
    const hydrationData = impl.hydrate(Portal, root, {});
    const childValues = diffChildren(impl, root, ret, ctx, impl.scope(void 0, Portal, ret.el.props), ret, children, hydrationData);
    if (isPromiseLike(childValues)) {
      return childValues.then((childValues2) => commitRootRender(impl, root, ctx, ret, childValues2, oldProps));
    }
    return commitRootRender(impl, root, ctx, ret, childValues, oldProps);
  }
};
function commitRootRender(renderer, root, ctx, ret, childValues, oldProps) {
  if (root != null) {
    renderer.arrange(Portal, root, ret.el.props, childValues, oldProps, wrap(ret.cachedChildValues));
    flush(renderer, root);
  }
  ret.cachedChildValues = unwrap(childValues);
  if (root == null) {
    unmount(renderer, ret, ctx, ret);
  }
  return renderer.read(ret.cachedChildValues);
}
function diffChildren(renderer, root, host, ctx, scope, parent, children, hydrationData) {
  const oldRetained = wrap(parent.children);
  const newRetained = [];
  const newChildren = arrayify(children);
  const values = [];
  let graveyard;
  let childrenByKey;
  let seenKeys;
  let isAsync = false;
  let hydrationBlock;
  let oi = 0;
  let oldLength = oldRetained.length;
  for (let ni = 0, newLength = newChildren.length; ni < newLength; ni++) {
    let ret = oi >= oldLength ? void 0 : oldRetained[oi];
    let child = narrow(newChildren[ni]);
    {
      let oldKey = typeof ret === "object" ? ret.el.key : void 0;
      let newKey = typeof child === "object" ? child.key : void 0;
      if (newKey !== void 0 && seenKeys && seenKeys.has(newKey)) {
        console.error("Duplicate key", newKey);
        newKey = void 0;
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
            oldKey = typeof ret === "object" ? ret.el.key : void 0;
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
    let value;
    if (typeof child === "object") {
      if (child.tag === Copy) {
        value = getInflightValue(ret);
      } else {
        let oldProps;
        let static_ = false;
        if (typeof ret === "object" && ret.el.tag === child.tag) {
          oldProps = ret.el.props;
          ret.el = child;
          if (child.static_) {
            value = getInflightValue(ret);
            static_ = true;
          }
        } else {
          if (typeof ret === "object") {
            (graveyard = graveyard || []).push(ret);
          }
          const fallback = ret;
          ret = new Retainer(child);
          ret.fallbackValue = fallback;
        }
        if (static_)
          ;
        else if (child.tag === Raw) {
          value = hydrationBlock ? hydrationBlock.then(() => updateRaw(renderer, ret, scope, oldProps, hydrationData)) : updateRaw(renderer, ret, scope, oldProps, hydrationData);
        } else if (child.tag === Fragment) {
          value = hydrationBlock ? hydrationBlock.then(() => updateFragment(renderer, root, host, ctx, scope, ret, hydrationData)) : updateFragment(renderer, root, host, ctx, scope, ret, hydrationData);
        } else if (typeof child.tag === "function") {
          value = hydrationBlock ? hydrationBlock.then(() => updateComponent(renderer, root, host, ctx, scope, ret, oldProps, hydrationData)) : updateComponent(renderer, root, host, ctx, scope, ret, oldProps, hydrationData);
        } else {
          value = hydrationBlock ? hydrationBlock.then(() => updateHost(renderer, root, ctx, scope, ret, oldProps, hydrationData)) : updateHost(renderer, root, ctx, scope, ret, oldProps, hydrationData);
        }
      }
      const ref = child.ref;
      if (isPromiseLike(value)) {
        isAsync = true;
        if (typeof ref === "function") {
          value = value.then((value2) => {
            ref(renderer.read(value2));
            return value2;
          });
        }
        if (hydrationData !== void 0) {
          hydrationBlock = value;
        }
      } else {
        if (typeof ref === "function") {
          ref(renderer.read(value));
        }
      }
    } else {
      if (typeof ret === "object") {
        (graveyard = graveyard || []).push(ret);
      }
      if (typeof child === "string") {
        value = ret = renderer.text(child, scope, hydrationData);
      } else {
        ret = void 0;
      }
    }
    values[ni] = value;
    newRetained[ni] = ret;
  }
  for (; oi < oldLength; oi++) {
    const ret = oldRetained[oi];
    if (typeof ret === "object") {
      (graveyard = graveyard || []).push(ret);
    }
  }
  if (childrenByKey !== void 0 && childrenByKey.size > 0) {
    (graveyard = graveyard || []).push(...childrenByKey.values());
  }
  parent.children = unwrap(newRetained);
  if (isAsync) {
    let childValues1 = Promise.all(values).finally(() => {
      if (graveyard) {
        for (let i = 0; i < graveyard.length; i++) {
          unmount(renderer, host, ctx, graveyard[i]);
        }
      }
    });
    let onChildValues;
    childValues1 = Promise.race([
      childValues1,
      new Promise((resolve) => onChildValues = resolve)
    ]);
    if (parent.onNextValues) {
      parent.onNextValues(childValues1);
    }
    parent.onNextValues = onChildValues;
    return childValues1.then((childValues) => {
      parent.inflightValue = parent.fallbackValue = void 0;
      return normalize(childValues);
    });
  } else {
    if (graveyard) {
      for (let i = 0; i < graveyard.length; i++) {
        unmount(renderer, host, ctx, graveyard[i]);
      }
    }
    if (parent.onNextValues) {
      parent.onNextValues(values);
      parent.onNextValues = void 0;
    }
    parent.inflightValue = parent.fallbackValue = void 0;
    return normalize(values);
  }
}
function createChildrenByKey(children, offset) {
  const childrenByKey = /* @__PURE__ */ new Map();
  for (let i = offset; i < children.length; i++) {
    const child = children[i];
    if (typeof child === "object" && typeof child.el.key !== "undefined") {
      childrenByKey.set(child.el.key, child);
    }
  }
  return childrenByKey;
}
function getInflightValue(child) {
  if (typeof child !== "object") {
    return child;
  }
  const ctx = typeof child.el.tag === "function" ? child.ctx : void 0;
  if (ctx && ctx.f & IsUpdating && ctx.inflightValue) {
    return ctx.inflightValue;
  } else if (child.inflightValue) {
    return child.inflightValue;
  }
  return getValue(child);
}
function updateRaw(renderer, ret, scope, oldProps, hydrationData) {
  const props = ret.el.props;
  if (!oldProps || oldProps.value !== props.value) {
    ret.value = renderer.raw(props.value, scope, hydrationData);
  }
  return ret.value;
}
function updateFragment(renderer, root, host, ctx, scope, ret, hydrationData) {
  const childValues = diffChildren(renderer, root, host, ctx, scope, ret, ret.el.props.children, hydrationData);
  if (isPromiseLike(childValues)) {
    ret.inflightValue = childValues.then((childValues2) => unwrap(childValues2));
    return ret.inflightValue;
  }
  return unwrap(childValues);
}
function updateHost(renderer, root, ctx, scope, ret, oldProps, hydrationData) {
  const el = ret.el;
  const tag = el.tag;
  let hydrationValue;
  if (el.tag === Portal) {
    root = ret.value = el.props.root;
  } else {
    if (hydrationData !== void 0) {
      const value = hydrationData.children.shift();
      hydrationValue = value;
    }
  }
  scope = renderer.scope(scope, tag, el.props);
  let childHydrationData;
  if (hydrationValue != null && typeof hydrationValue !== "string") {
    childHydrationData = renderer.hydrate(tag, hydrationValue, el.props);
    if (childHydrationData === void 0) {
      hydrationValue = void 0;
    }
  }
  const childValues = diffChildren(renderer, root, ret, ctx, scope, ret, ret.el.props.children, childHydrationData);
  if (isPromiseLike(childValues)) {
    ret.inflightValue = childValues.then((childValues2) => commitHost(renderer, scope, ret, childValues2, oldProps, hydrationValue));
    return ret.inflightValue;
  }
  return commitHost(renderer, scope, ret, childValues, oldProps, hydrationValue);
}
function commitHost(renderer, scope, ret, childValues, oldProps, hydrationValue) {
  const tag = ret.el.tag;
  let value = ret.value;
  if (hydrationValue != null) {
    value = ret.value = hydrationValue;
  }
  let props = ret.el.props;
  let copied;
  if (tag !== Portal) {
    if (value == null) {
      value = ret.value = renderer.create(tag, props, scope);
    }
    for (const propName in { ...oldProps, ...props }) {
      const propValue = props[propName];
      if (propValue === Copy) {
        (copied = copied || /* @__PURE__ */ new Set()).add(propName);
      } else if (propName !== "children") {
        renderer.patch(tag, value, propName, propValue, oldProps && oldProps[propName], scope);
      }
    }
  }
  if (copied) {
    props = { ...ret.el.props };
    for (const name of copied) {
      props[name] = oldProps && oldProps[name];
    }
    ret.el = new Element(tag, props, ret.el.key, ret.el.ref);
  }
  renderer.arrange(tag, value, props, childValues, oldProps, wrap(ret.cachedChildValues));
  ret.cachedChildValues = unwrap(childValues);
  if (tag === Portal) {
    flush(renderer, ret.value);
    return;
  }
  return value;
}
function flush(renderer, root, initiator) {
  renderer.flush(root);
  if (typeof root !== "object" || root === null) {
    return;
  }
  const flushMap = flushMaps.get(root);
  if (flushMap) {
    if (initiator) {
      const flushMap1 = /* @__PURE__ */ new Map();
      for (let [ctx, callbacks] of flushMap) {
        if (!ctxContains(initiator, ctx)) {
          flushMap.delete(ctx);
          flushMap1.set(ctx, callbacks);
        }
      }
      if (flushMap1.size) {
        flushMaps.set(root, flushMap1);
      } else {
        flushMaps.delete(root);
      }
    } else {
      flushMaps.delete(root);
    }
    for (const [ctx, callbacks] of flushMap) {
      const value = renderer.read(getValue(ctx.ret));
      for (const callback of callbacks) {
        callback(value);
      }
    }
  }
}
function unmount(renderer, host, ctx, ret) {
  if (typeof ret.el.tag === "function") {
    ctx = ret.ctx;
    unmountComponent(ctx);
  } else if (ret.el.tag === Portal) {
    host = ret;
    renderer.arrange(Portal, host.value, host.el.props, [], host.el.props, wrap(host.cachedChildValues));
    flush(renderer, host.value);
  } else if (ret.el.tag !== Fragment) {
    if (isEventTarget(ret.value)) {
      const records = getListenerRecords(ctx, host);
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        ret.value.removeEventListener(record.type, record.callback, record.options);
      }
    }
    renderer.dispose(ret.el.tag, ret.value, ret.el.props);
    host = ret;
  }
  const children = wrap(ret.children);
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (typeof child === "object") {
      unmount(renderer, host, ctx, child);
    }
  }
}
var IsUpdating = 1 << 0;
var IsSyncExecuting = 1 << 1;
var IsInForOfLoop = 1 << 2;
var IsInForAwaitOfLoop = 1 << 3;
var NeedsToYield = 1 << 4;
var PropsAvailable = 1 << 5;
var IsErrored = 1 << 6;
var IsUnmounted = 1 << 7;
var IsSyncGen = 1 << 8;
var IsAsyncGen = 1 << 9;
var IsScheduling = 1 << 10;
var IsSchedulingRefresh = 1 << 11;
var provisionMaps = /* @__PURE__ */ new WeakMap();
var scheduleMap = /* @__PURE__ */ new WeakMap();
var cleanupMap = /* @__PURE__ */ new WeakMap();
var flushMaps = /* @__PURE__ */ new WeakMap();
var ContextImpl = class {
  constructor(renderer, root, host, parent, scope, ret) {
    this.f = 0;
    this.owner = new Context(this);
    this.renderer = renderer;
    this.root = root;
    this.host = host;
    this.parent = parent;
    this.scope = scope;
    this.ret = ret;
    this.iterator = void 0;
    this.inflightBlock = void 0;
    this.inflightValue = void 0;
    this.enqueuedBlock = void 0;
    this.enqueuedValue = void 0;
    this.onProps = void 0;
    this.onPropsRequested = void 0;
  }
};
var _ContextImpl = Symbol.for("crank.ContextImpl");
var Context = class {
  // TODO: If we could make the constructor function take a nicer value, it
  // would be useful for testing purposes.
  constructor(impl) {
    this[_ContextImpl] = impl;
  }
  /**
   * The current props of the associated element.
   *
   * Typically, you should read props either via the first parameter of the
   * component or via the context iterator methods. This property is mainly for
   * plugins or utilities which wrap contexts.
   */
  get props() {
    return this[_ContextImpl].ret.el.props;
  }
  // TODO: Should we rename this???
  /**
   * The current value of the associated element.
   *
   * Typically, you should read values via refs, generator yield expressions,
   * or the refresh, schedule, cleanup, or flush methods. This property is
   * mainly for plugins or utilities which wrap contexts.
   */
  get value() {
    return this[_ContextImpl].renderer.read(getValue(this[_ContextImpl].ret));
  }
  *[Symbol.iterator]() {
    const ctx = this[_ContextImpl];
    try {
      ctx.f |= IsInForOfLoop;
      while (!(ctx.f & IsUnmounted)) {
        if (ctx.f & NeedsToYield) {
          throw new Error("Context iterated twice without a yield");
        } else {
          ctx.f |= NeedsToYield;
        }
        yield ctx.ret.el.props;
      }
    } finally {
      ctx.f &= ~IsInForOfLoop;
    }
  }
  async *[Symbol.asyncIterator]() {
    const ctx = this[_ContextImpl];
    if (ctx.f & IsSyncGen) {
      throw new Error("Use for...of in sync generator components");
    }
    try {
      ctx.f |= IsInForAwaitOfLoop;
      while (!(ctx.f & IsUnmounted)) {
        if (ctx.f & NeedsToYield) {
          throw new Error("Context iterated twice without a yield");
        } else {
          ctx.f |= NeedsToYield;
        }
        if (ctx.f & PropsAvailable) {
          ctx.f &= ~PropsAvailable;
          yield ctx.ret.el.props;
        } else {
          const props = await new Promise((resolve) => ctx.onProps = resolve);
          if (ctx.f & IsUnmounted) {
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
      ctx.f &= ~IsInForAwaitOfLoop;
      if (ctx.onPropsRequested) {
        ctx.onPropsRequested();
        ctx.onPropsRequested = void 0;
      }
    }
  }
  /**
   * Re-executes a component.
   *
   * @returns The rendered value of the component or a promise thereof if the
   * component or its children execute asynchronously.
   *
   * The refresh method works a little differently for async generator
   * components, in that it will resume the Context’s props async iterator
   * rather than resuming execution. This is because async generator components
   * are perpetually resumed independent of updates, and rely on the props
   * async iterator to suspend.
   */
  refresh() {
    const ctx = this[_ContextImpl];
    if (ctx.f & IsUnmounted) {
      console.error("Component is unmounted");
      return ctx.renderer.read(void 0);
    } else if (ctx.f & IsSyncExecuting) {
      console.error("Component is already executing");
      return this.value;
    }
    const value = enqueueComponentRun(ctx);
    if (isPromiseLike(value)) {
      return value.then((value2) => ctx.renderer.read(value2));
    }
    return ctx.renderer.read(value);
  }
  /**
   * Registers a callback which fires when the component commits. Will only
   * fire once per callback and update.
   */
  schedule(callback) {
    const ctx = this[_ContextImpl];
    let callbacks = scheduleMap.get(ctx);
    if (!callbacks) {
      callbacks = /* @__PURE__ */ new Set();
      scheduleMap.set(ctx, callbacks);
    }
    callbacks.add(callback);
  }
  /**
   * Registers a callback which fires when the component’s children are
   * rendered into the root. Will only fire once per callback and render.
   */
  flush(callback) {
    const ctx = this[_ContextImpl];
    if (typeof ctx.root !== "object" || ctx.root === null) {
      return;
    }
    let flushMap = flushMaps.get(ctx.root);
    if (!flushMap) {
      flushMap = /* @__PURE__ */ new Map();
      flushMaps.set(ctx.root, flushMap);
    }
    let callbacks = flushMap.get(ctx);
    if (!callbacks) {
      callbacks = /* @__PURE__ */ new Set();
      flushMap.set(ctx, callbacks);
    }
    callbacks.add(callback);
  }
  /**
   * Registers a callback which fires when the component unmounts. Will only
   * fire once per callback.
   */
  cleanup(callback) {
    const ctx = this[_ContextImpl];
    if (ctx.f & IsUnmounted) {
      const value = ctx.renderer.read(getValue(ctx.ret));
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
    for (let ctx = this[_ContextImpl].parent; ctx !== void 0; ctx = ctx.parent) {
      const provisions = provisionMaps.get(ctx);
      if (provisions && provisions.has(key)) {
        return provisions.get(key);
      }
    }
  }
  provide(key, value) {
    const ctx = this[_ContextImpl];
    let provisions = provisionMaps.get(ctx);
    if (!provisions) {
      provisions = /* @__PURE__ */ new Map();
      provisionMaps.set(ctx, provisions);
    }
    provisions.set(key, value);
  }
  addEventListener(type, listener, options) {
    const ctx = this[_ContextImpl];
    let listeners;
    if (!isListenerOrListenerObject(listener)) {
      return;
    } else {
      const listeners1 = listenersMap.get(ctx);
      if (listeners1) {
        listeners = listeners1;
      } else {
        listeners = [];
        listenersMap.set(ctx, listeners);
      }
    }
    options = normalizeListenerOptions(options);
    let callback;
    if (typeof listener === "object") {
      callback = () => listener.handleEvent.apply(listener, arguments);
    } else {
      callback = listener;
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
    for (const value of getChildValues(ctx.ret)) {
      if (isEventTarget(value)) {
        value.addEventListener(record.type, record.callback, record.options);
      }
    }
  }
  removeEventListener(type, listener, options) {
    const ctx = this[_ContextImpl];
    const listeners = listenersMap.get(ctx);
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
    for (const value of getChildValues(ctx.ret)) {
      if (isEventTarget(value)) {
        value.removeEventListener(record.type, record.callback, record.options);
      }
    }
  }
  dispatchEvent(ev) {
    const ctx = this[_ContextImpl];
    const path = [];
    for (let parent = ctx.parent; parent !== void 0; parent = parent.parent) {
      path.push(parent);
    }
    let immediateCancelBubble = false;
    const stopImmediatePropagation = ev.stopImmediatePropagation;
    setEventProperty(ev, "stopImmediatePropagation", () => {
      immediateCancelBubble = true;
      return stopImmediatePropagation.call(ev);
    });
    setEventProperty(ev, "target", ctx.owner);
    try {
      setEventProperty(ev, "eventPhase", CAPTURING_PHASE);
      for (let i = path.length - 1; i >= 0; i--) {
        const target = path[i];
        const listeners = listenersMap.get(target);
        if (listeners) {
          setEventProperty(ev, "currentTarget", target.owner);
          for (const record of listeners) {
            if (record.type === ev.type && record.options.capture) {
              try {
                record.callback.call(target.owner, ev);
              } catch (err) {
                console.error(err);
              }
              if (immediateCancelBubble) {
                return true;
              }
            }
          }
        }
        if (ev.cancelBubble) {
          return true;
        }
      }
      {
        setEventProperty(ev, "eventPhase", AT_TARGET);
        setEventProperty(ev, "currentTarget", ctx.owner);
        const propCallback = ctx.ret.el.props["on" + ev.type];
        if (propCallback != null) {
          propCallback(ev);
          if (immediateCancelBubble || ev.cancelBubble) {
            return true;
          }
        }
        const listeners = listenersMap.get(ctx);
        if (listeners) {
          for (const record of listeners) {
            if (record.type === ev.type) {
              try {
                record.callback.call(ctx.owner, ev);
              } catch (err) {
                console.error(err);
              }
              if (immediateCancelBubble) {
                return true;
              }
            }
          }
          if (ev.cancelBubble) {
            return true;
          }
        }
      }
      if (ev.bubbles) {
        setEventProperty(ev, "eventPhase", BUBBLING_PHASE);
        for (let i = 0; i < path.length; i++) {
          const target = path[i];
          const listeners = listenersMap.get(target);
          if (listeners) {
            setEventProperty(ev, "currentTarget", target.owner);
            for (const record of listeners) {
              if (record.type === ev.type && !record.options.capture) {
                try {
                  record.callback.call(target.owner, ev);
                } catch (err) {
                  console.error(err);
                }
                if (immediateCancelBubble) {
                  return true;
                }
              }
            }
          }
          if (ev.cancelBubble) {
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
};
function ctxContains(parent, child) {
  for (let current = child; current !== void 0; current = current.parent) {
    if (current === parent) {
      return true;
    }
  }
  return false;
}
function updateComponent(renderer, root, host, parent, scope, ret, oldProps, hydrationData) {
  let ctx;
  if (oldProps) {
    ctx = ret.ctx;
    if (ctx.f & IsSyncExecuting) {
      console.error("Component is already executing");
      return ret.cachedChildValues;
    }
  } else {
    ctx = ret.ctx = new ContextImpl(renderer, root, host, parent, scope, ret);
  }
  ctx.f |= IsUpdating;
  return enqueueComponentRun(ctx, hydrationData);
}
function updateComponentChildren(ctx, children, hydrationData) {
  if (ctx.f & IsUnmounted) {
    return;
  } else if (ctx.f & IsErrored) {
    return;
  } else if (children === void 0) {
    console.error("A component has returned or yielded undefined. If this was intentional, return or yield null instead.");
  }
  let childValues;
  try {
    ctx.f |= IsSyncExecuting;
    childValues = diffChildren(ctx.renderer, ctx.root, ctx.host, ctx, ctx.scope, ctx.ret, narrow(children), hydrationData);
  } finally {
    ctx.f &= ~IsSyncExecuting;
  }
  if (isPromiseLike(childValues)) {
    ctx.ret.inflightValue = childValues.then((childValues2) => commitComponent(ctx, childValues2));
    return ctx.ret.inflightValue;
  }
  return commitComponent(ctx, childValues);
}
function commitComponent(ctx, values) {
  if (ctx.f & IsUnmounted) {
    return;
  }
  const listeners = listenersMap.get(ctx);
  if (listeners && listeners.length) {
    for (let i = 0; i < values.length; i++) {
      const value2 = values[i];
      if (isEventTarget(value2)) {
        for (let j = 0; j < listeners.length; j++) {
          const record = listeners[j];
          value2.addEventListener(record.type, record.callback, record.options);
        }
      }
    }
  }
  const oldValues = wrap(ctx.ret.cachedChildValues);
  let value = ctx.ret.cachedChildValues = unwrap(values);
  if (ctx.f & IsScheduling) {
    ctx.f |= IsSchedulingRefresh;
  } else if (!(ctx.f & IsUpdating)) {
    if (!arrayEqual(oldValues, values)) {
      const records = getListenerRecords(ctx.parent, ctx.host);
      if (records.length) {
        for (let i = 0; i < values.length; i++) {
          const value2 = values[i];
          if (isEventTarget(value2)) {
            for (let j = 0; j < records.length; j++) {
              const record = records[j];
              value2.addEventListener(record.type, record.callback, record.options);
            }
          }
        }
      }
      const host = ctx.host;
      const oldHostValues = wrap(host.cachedChildValues);
      invalidate(ctx, host);
      const hostValues = getChildValues(host);
      ctx.renderer.arrange(
        host.el.tag,
        host.value,
        host.el.props,
        hostValues,
        // props and oldProps are the same because the host isn’t updated.
        host.el.props,
        oldHostValues
      );
    }
    flush(ctx.renderer, ctx.root, ctx);
  }
  const callbacks = scheduleMap.get(ctx);
  if (callbacks) {
    scheduleMap.delete(ctx);
    ctx.f |= IsScheduling;
    const value1 = ctx.renderer.read(value);
    for (const callback of callbacks) {
      callback(value1);
    }
    ctx.f &= ~IsScheduling;
    if (ctx.f & IsSchedulingRefresh) {
      ctx.f &= ~IsSchedulingRefresh;
      value = getValue(ctx.ret);
    }
  }
  ctx.f &= ~IsUpdating;
  return value;
}
function invalidate(ctx, host) {
  for (let parent = ctx.parent; parent !== void 0 && parent.host === host; parent = parent.parent) {
    parent.ret.cachedChildValues = void 0;
  }
  host.cachedChildValues = void 0;
}
function arrayEqual(arr1, arr2) {
  if (arr1.length !== arr2.length) {
    return false;
  }
  for (let i = 0; i < arr1.length; i++) {
    const value1 = arr1[i];
    const value2 = arr2[i];
    if (value1 !== value2) {
      return false;
    }
  }
  return true;
}
function enqueueComponentRun(ctx, hydrationData) {
  if (ctx.f & IsAsyncGen && !(ctx.f & IsInForOfLoop)) {
    if (hydrationData !== void 0) {
      throw new Error("Hydration error");
    }
    const isAtLoopbottom = ctx.f & IsInForAwaitOfLoop && !ctx.onProps;
    resumePropsIterator(ctx);
    if (isAtLoopbottom) {
      if (ctx.inflightBlock == null) {
        ctx.inflightBlock = new Promise((resolve) => ctx.onPropsRequested = resolve);
      }
      return ctx.inflightBlock.then(() => {
        ctx.inflightBlock = void 0;
        return ctx.inflightValue;
      });
    }
    return ctx.inflightValue;
  } else if (!ctx.inflightBlock) {
    try {
      const [block, value] = runComponent(ctx, hydrationData);
      if (block) {
        ctx.inflightBlock = block.then((v) => v).finally(() => advanceComponent(ctx));
        ctx.inflightValue = value;
      }
      return value;
    } catch (err) {
      if (!(ctx.f & IsUpdating)) {
        if (!ctx.parent) {
          throw err;
        }
        return propagateError(ctx.parent, err);
      }
      throw err;
    }
  } else if (!ctx.enqueuedBlock) {
    if (hydrationData !== void 0) {
      throw new Error("Hydration error");
    }
    let resolveEnqueuedBlock;
    ctx.enqueuedBlock = new Promise((resolve) => resolveEnqueuedBlock = resolve);
    ctx.enqueuedValue = ctx.inflightBlock.then(() => {
      try {
        const [block, value] = runComponent(ctx);
        if (block) {
          resolveEnqueuedBlock(block.finally(() => advanceComponent(ctx)));
        }
        return value;
      } catch (err) {
        if (!(ctx.f & IsUpdating)) {
          if (!ctx.parent) {
            throw err;
          }
          return propagateError(ctx.parent, err);
        }
        throw err;
      }
    });
  }
  return ctx.enqueuedValue;
}
function advanceComponent(ctx) {
  if (ctx.f & IsAsyncGen && !(ctx.f & IsInForOfLoop)) {
    return;
  }
  ctx.inflightBlock = ctx.enqueuedBlock;
  ctx.inflightValue = ctx.enqueuedValue;
  ctx.enqueuedBlock = void 0;
  ctx.enqueuedValue = void 0;
}
function runComponent(ctx, hydrationData) {
  const ret = ctx.ret;
  const initial = !ctx.iterator;
  if (initial) {
    resumePropsIterator(ctx);
    ctx.f |= IsSyncExecuting;
    clearEventListeners(ctx);
    let result;
    try {
      result = ret.el.tag.call(ctx.owner, ret.el.props);
    } catch (err) {
      ctx.f |= IsErrored;
      throw err;
    } finally {
      ctx.f &= ~IsSyncExecuting;
    }
    if (isIteratorLike(result)) {
      ctx.iterator = result;
    } else if (isPromiseLike(result)) {
      const result1 = result instanceof Promise ? result : Promise.resolve(result);
      const value = result1.then((result2) => updateComponentChildren(ctx, result2, hydrationData), (err) => {
        ctx.f |= IsErrored;
        throw err;
      });
      return [result1.catch(NOOP), value];
    } else {
      return [
        void 0,
        updateComponentChildren(ctx, result, hydrationData)
      ];
    }
  } else if (hydrationData !== void 0) {
    throw new Error("Hydration error");
  }
  let iteration;
  if (initial) {
    try {
      ctx.f |= IsSyncExecuting;
      iteration = ctx.iterator.next();
    } catch (err) {
      ctx.f |= IsErrored;
      throw err;
    } finally {
      ctx.f &= ~IsSyncExecuting;
    }
    if (isPromiseLike(iteration)) {
      ctx.f |= IsAsyncGen;
    } else {
      ctx.f |= IsSyncGen;
    }
  }
  if (ctx.f & IsSyncGen) {
    ctx.f &= ~NeedsToYield;
    if (!initial) {
      try {
        ctx.f |= IsSyncExecuting;
        iteration = ctx.iterator.next(ctx.renderer.read(getValue(ret)));
      } catch (err) {
        ctx.f |= IsErrored;
        throw err;
      } finally {
        ctx.f &= ~IsSyncExecuting;
      }
    }
    if (isPromiseLike(iteration)) {
      throw new Error("Mixed generator component");
    }
    if (iteration.done) {
      ctx.f &= ~IsSyncGen;
      ctx.iterator = void 0;
    }
    let value;
    try {
      value = updateComponentChildren(
        ctx,
        // Children can be void so we eliminate that here
        iteration.value,
        hydrationData
      );
      if (isPromiseLike(value)) {
        value = value.catch((err) => handleChildError(ctx, err));
      }
    } catch (err) {
      value = handleChildError(ctx, err);
    }
    const block = isPromiseLike(value) ? value.catch(NOOP) : void 0;
    return [block, value];
  } else if (ctx.f & IsInForOfLoop) {
    ctx.f &= ~NeedsToYield;
    if (!initial) {
      try {
        ctx.f |= IsSyncExecuting;
        iteration = ctx.iterator.next(ctx.renderer.read(getValue(ret)));
      } catch (err) {
        ctx.f |= IsErrored;
        throw err;
      } finally {
        ctx.f &= ~IsSyncExecuting;
      }
    }
    if (!isPromiseLike(iteration)) {
      throw new Error("Mixed generator component");
    }
    const block = iteration.catch(NOOP);
    const value = iteration.then((iteration2) => {
      let value2;
      if (!(ctx.f & IsInForOfLoop)) {
        runAsyncGenComponent(ctx, Promise.resolve(iteration2), hydrationData);
      }
      try {
        value2 = updateComponentChildren(
          ctx,
          // Children can be void so we eliminate that here
          iteration2.value,
          hydrationData
        );
        if (isPromiseLike(value2)) {
          value2 = value2.catch((err) => handleChildError(ctx, err));
        }
      } catch (err) {
        value2 = handleChildError(ctx, err);
      }
      return value2;
    }, (err) => {
      ctx.f |= IsErrored;
      throw err;
    });
    return [block, value];
  } else {
    runAsyncGenComponent(ctx, iteration, hydrationData);
    return [ctx.inflightBlock, ctx.inflightValue];
  }
}
async function runAsyncGenComponent(ctx, iterationP, hydrationData) {
  let done = false;
  try {
    while (!done) {
      if (ctx.f & IsInForOfLoop) {
        break;
      }
      let onValue;
      ctx.inflightValue = new Promise((resolve) => onValue = resolve);
      if (ctx.f & IsUpdating) {
        ctx.inflightValue.catch(NOOP);
      }
      let iteration;
      try {
        iteration = await iterationP;
      } catch (err) {
        done = true;
        ctx.f |= IsErrored;
        onValue(Promise.reject(err));
        break;
      } finally {
        ctx.f &= ~NeedsToYield;
        if (!(ctx.f & IsInForAwaitOfLoop)) {
          ctx.f &= ~PropsAvailable;
        }
      }
      done = !!iteration.done;
      let value;
      try {
        value = updateComponentChildren(ctx, iteration.value, hydrationData);
        hydrationData = void 0;
        if (isPromiseLike(value)) {
          value = value.catch((err) => handleChildError(ctx, err));
        }
      } catch (err) {
        value = handleChildError(ctx, err);
      } finally {
        onValue(value);
      }
      let oldValue;
      if (ctx.ret.inflightValue) {
        oldValue = ctx.ret.inflightValue.then((value2) => ctx.renderer.read(value2));
        oldValue.catch((err) => {
          if (ctx.f & IsUpdating) {
            return;
          }
          if (!ctx.parent) {
            throw err;
          }
          return propagateError(ctx.parent, err);
        });
      } else {
        oldValue = ctx.renderer.read(getValue(ctx.ret));
      }
      if (ctx.f & IsUnmounted) {
        if (ctx.f & IsInForAwaitOfLoop) {
          try {
            ctx.f |= IsSyncExecuting;
            iterationP = ctx.iterator.next(oldValue);
          } finally {
            ctx.f &= ~IsSyncExecuting;
          }
        } else {
          returnComponent(ctx);
          break;
        }
      } else if (!done && !(ctx.f & IsInForOfLoop)) {
        try {
          ctx.f |= IsSyncExecuting;
          iterationP = ctx.iterator.next(oldValue);
        } finally {
          ctx.f &= ~IsSyncExecuting;
        }
      }
    }
  } finally {
    if (done) {
      ctx.f &= ~IsAsyncGen;
      ctx.iterator = void 0;
    }
  }
}
function resumePropsIterator(ctx) {
  if (ctx.onProps) {
    ctx.onProps(ctx.ret.el.props);
    ctx.onProps = void 0;
    ctx.f &= ~PropsAvailable;
  } else {
    ctx.f |= PropsAvailable;
  }
}
function unmountComponent(ctx) {
  if (ctx.f & IsUnmounted) {
    return;
  }
  clearEventListeners(ctx);
  const callbacks = cleanupMap.get(ctx);
  if (callbacks) {
    cleanupMap.delete(ctx);
    const value = ctx.renderer.read(getValue(ctx.ret));
    for (const callback of callbacks) {
      callback(value);
    }
  }
  ctx.f |= IsUnmounted;
  if (ctx.iterator) {
    if (ctx.f & IsSyncGen) {
      let value;
      if (ctx.f & IsInForOfLoop) {
        value = enqueueComponentRun(ctx);
      }
      if (isPromiseLike(value)) {
        value.then(() => {
          if (ctx.f & IsInForOfLoop) {
            unmountComponent(ctx);
          } else {
            returnComponent(ctx);
          }
        }, (err) => {
          if (!ctx.parent) {
            throw err;
          }
          return propagateError(ctx.parent, err);
        });
      } else {
        if (ctx.f & IsInForOfLoop) {
          unmountComponent(ctx);
        } else {
          returnComponent(ctx);
        }
      }
    } else if (ctx.f & IsAsyncGen) {
      if (ctx.f & IsInForOfLoop) {
        const value = enqueueComponentRun(ctx);
        value.then(() => {
          if (ctx.f & IsInForOfLoop) {
            unmountComponent(ctx);
          } else {
            returnComponent(ctx);
          }
        }, (err) => {
          if (!ctx.parent) {
            throw err;
          }
          return propagateError(ctx.parent, err);
        });
      } else {
        resumePropsIterator(ctx);
      }
    }
  }
}
function returnComponent(ctx) {
  resumePropsIterator(ctx);
  if (ctx.iterator && typeof ctx.iterator.return === "function") {
    try {
      ctx.f |= IsSyncExecuting;
      const iteration = ctx.iterator.return();
      if (isPromiseLike(iteration)) {
        iteration.catch((err) => {
          if (!ctx.parent) {
            throw err;
          }
          return propagateError(ctx.parent, err);
        });
      }
    } finally {
      ctx.f &= ~IsSyncExecuting;
    }
  }
}
var NONE = 0;
var CAPTURING_PHASE = 1;
var AT_TARGET = 2;
var BUBBLING_PHASE = 3;
var listenersMap = /* @__PURE__ */ new WeakMap();
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
function isEventTarget(value) {
  return value != null && typeof value.addEventListener === "function" && typeof value.removeEventListener === "function" && typeof value.dispatchEvent === "function";
}
function setEventProperty(ev, key, value) {
  Object.defineProperty(ev, key, { value, writable: false, configurable: true });
}
function getListenerRecords(ctx, ret) {
  let listeners = [];
  while (ctx !== void 0 && ctx.host === ret) {
    const listeners1 = listenersMap.get(ctx);
    if (listeners1) {
      listeners = listeners.concat(listeners1);
    }
    ctx = ctx.parent;
  }
  return listeners;
}
function clearEventListeners(ctx) {
  const listeners = listenersMap.get(ctx);
  if (listeners && listeners.length) {
    for (const value of getChildValues(ctx.ret)) {
      if (isEventTarget(value)) {
        for (const record of listeners) {
          value.removeEventListener(record.type, record.callback, record.options);
        }
      }
    }
    listeners.length = 0;
  }
}
function handleChildError(ctx, err) {
  if (!ctx.iterator || typeof ctx.iterator.throw !== "function") {
    throw err;
  }
  resumePropsIterator(ctx);
  let iteration;
  try {
    ctx.f |= IsSyncExecuting;
    iteration = ctx.iterator.throw(err);
  } catch (err2) {
    ctx.f |= IsErrored;
    throw err2;
  } finally {
    ctx.f &= ~IsSyncExecuting;
  }
  if (isPromiseLike(iteration)) {
    return iteration.then((iteration2) => {
      if (iteration2.done) {
        ctx.f &= ~IsAsyncGen;
        ctx.iterator = void 0;
      }
      return updateComponentChildren(ctx, iteration2.value);
    }, (err2) => {
      ctx.f |= IsErrored;
      throw err2;
    });
  }
  if (iteration.done) {
    ctx.f &= ~IsSyncGen;
    ctx.f &= ~IsAsyncGen;
    ctx.iterator = void 0;
  }
  return updateComponentChildren(ctx, iteration.value);
}
function propagateError(ctx, err) {
  let result;
  try {
    result = handleChildError(ctx, err);
  } catch (err2) {
    if (!ctx.parent) {
      throw err2;
    }
    return propagateError(ctx.parent, err2);
  }
  if (isPromiseLike(result)) {
    return result.catch((err2) => {
      if (!ctx.parent) {
        throw err2;
      }
      return propagateError(ctx.parent, err2);
    });
  }
  return result;
}
export {
  Context,
  Copy,
  Element,
  Fragment,
  Portal,
  Raw,
  Renderer,
  cloneElement,
  createElement,
  isElement
};
/*! Bundled license information:

@esbuild-plugins/node-globals-polyfill/Buffer.js:
  (*!
   * The buffer module from node.js, for the browser.
   *
   * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
   * @license  MIT
   *)
*/
//# sourceMappingURL=crank-I2M42UR7.js.map
