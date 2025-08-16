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
var _parent = Symbol.for("CustomEventTarget.parent");
var _listeners = Symbol.for("CustomEventTarget.listeners");
var _delegates = Symbol.for("CustomEventTarget.delegates");
var _dispatchEventOnSelf = Symbol.for("CustomEventTarget.dispatchSelf");
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

// node_modules/@b9g/crank/crank.js
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
var NOOP = () => {
};
function getTagName(tag) {
  return typeof tag === "function" ? tag.name || "Anonymous" : typeof tag === "string" ? tag : (
    // tag is symbol, using else branch to avoid typeof tag === "symbol"
    tag.description || "Anonymous"
  );
}
var Fragment = "";
var Portal = Symbol.for("crank.Portal");
var Copy = Symbol.for("crank.Copy");
var Text = Symbol.for("crank.Text");
var Raw = Symbol.for("crank.Raw");
var ElementSymbol = Symbol.for("crank.Element");
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
  const children = wrap(ret.children);
  let currentIndex = startIndex;
  for (let i = 0; i < children.length; i++) {
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
    const child = children[i];
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
  if (lingerers != null && lingerers.length > children.length) {
    for (let i = children.length; i < lingerers.length; i++) {
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
function diffChildren(adapter, root, host, ctx, scope, parent, newChildren) {
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
        if (childCopied && getFlag(ret, DidCommit))
          ;
        else if (child.tag === Raw || child.tag === Text)
          ;
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
      scope
    });
  }
  return diffChildren(adapter, root, ret, ctx, scope, ret, ret.el.props.children);
}
function commit(adapter, host, ret, ctx, scope, index, schedulePromises, hydrationNodes) {
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
      value = commitChildren(adapter, host, ctx, scope, ret, index, schedulePromises, hydrationNodes);
    } else if (tag === Text) {
      value = commitText(adapter, ret, el, scope, hydrationNodes);
    } else if (tag === Raw) {
      value = commitRaw(adapter, host, ret, scope, hydrationNodes);
    } else {
      value = commitHost(adapter, ret, ctx, schedulePromises, hydrationNodes);
    }
    if (ret.fallback) {
      unmount(adapter, host, ctx, ret.fallback, false);
      ret.fallback = void 0;
    }
  }
  if (skippedHydrationNodes) {
    skippedHydrationNodes.splice(0, wrap(value).length);
  }
  if (!getFlag(ret, DidCommit)) {
    setFlag(ret, DidCommit);
    if (typeof tag !== "function" && tag !== Fragment && tag !== Portal && typeof el.props.ref === "function") {
      el.props.ref(adapter.read(value));
    }
  }
  return value;
}
function commitChildren(adapter, host, ctx, scope, parent, index, schedulePromises, hydrationNodes) {
  let values = [];
  for (let i = 0, children = wrap(parent.children); i < children.length; i++) {
    let child = children[i];
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
            isNested: false
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
      const value = commit(adapter, host, child, ctx, scope, index, schedulePromises, hydrationNodes);
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
      unmount(adapter, host, ctx, child, false);
    }
    parent.graveyard = void 0;
  }
  if (parent.lingerers) {
    values = getChildValues(parent);
  }
  return values;
}
function commitText(adapter, ret, el, scope, hydrationNodes) {
  const value = adapter.text({
    value: el.props.value,
    scope,
    oldNode: ret.value,
    hydrationNodes
  });
  ret.value = value;
  return value;
}
function commitRaw(adapter, host, ret, scope, hydrationNodes) {
  if (!ret.oldProps || ret.oldProps.value !== ret.el.props.value) {
    const oldNodes = wrap(ret.value);
    for (let i = 0; i < oldNodes.length; i++) {
      const oldNode = oldNodes[i];
      adapter.remove({
        node: oldNode,
        parentNode: host.value,
        isNested: false
      });
    }
    ret.value = adapter.raw({
      value: ret.el.props.value,
      scope,
      hydrationNodes
    });
  }
  ret.oldProps = stripSpecialProps(ret.el.props);
  return ret.value;
}
function commitHost(adapter, ret, ctx, schedulePromises, hydrationNodes) {
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
          scope
        });
        if (childHydrationNodes) {
          for (let i = 0; i < childHydrationNodes.length; i++) {
            adapter.remove({
              node: childHydrationNodes[i],
              parentNode: node,
              isNested: false
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
          scope
        });
        if (childHydrationNodes) {
          node = nextChild;
          for (let i = 0; i < childHydrationNodes.length; i++) {
            adapter.remove({
              node: childHydrationNodes[i],
              parentNode: node,
              isNested: false
            });
          }
        }
      }
      if (!node) {
        node = adapter.create({
          tag,
          tagName: getTagName(tag),
          props,
          scope
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
      copyProps,
      isHydrating: !!childHydrationNodes,
      quietProps
    });
  }
  if (!copyChildren) {
    const children = commitChildren(adapter, ret, ctx, scope, ret, 0, schedulePromises, hydrationMetaProp && !hydrationMetaProp.includes("children") ? void 0 : childHydrationNodes);
    adapter.arrange({
      tag,
      tagName: getTagName(tag),
      node,
      props,
      children,
      oldProps
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
function unmount(adapter, host, ctx, ret, isNested) {
  if (ret.fallback) {
    unmount(adapter, host, ctx, ret.fallback, isNested);
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
          unmount(adapter, host, ctx, lingerer, isNested);
        }
      }
    }
    ret.lingerers = void 0;
  }
  if (typeof ret.el.tag === "function") {
    unmountComponent(ret.ctx, isNested);
  } else if (ret.el.tag === Fragment) {
    unmountChildren(adapter, host, ctx, ret, isNested);
  } else if (ret.el.tag === Portal) {
    unmountChildren(adapter, ret, ctx, ret, false);
    if (ret.value != null) {
      adapter.finalize(ret.value);
    }
  } else {
    unmountChildren(adapter, ret, ctx, ret, true);
    if (getFlag(ret, DidCommit)) {
      if (ctx) {
        removeEventTargetDelegates(ctx.ctx, [ret.value], (ctx1) => ctx1[_ContextState].host === host);
      }
      adapter.remove({
        node: ret.value,
        parentNode: host.value,
        isNested
      });
    }
  }
}
function unmountChildren(adapter, host, ctx, ret, isNested) {
  if (ret.graveyard) {
    for (let i = 0; i < ret.graveyard.length; i++) {
      const child = ret.graveyard[i];
      unmount(adapter, host, ctx, child, isNested);
    }
    ret.graveyard = void 0;
  }
  for (let i = 0, children = wrap(ret.children); i < children.length; i++) {
    const child = children[i];
    if (typeof child === "object") {
      unmount(adapter, host, ctx, child, isNested);
    }
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
var _ContextState = Symbol.for("crank.ContextState");
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
    if (getFlag(ctx.ret, IsInForOfLoop) && !getFlag(ctx.ret, NeedsToYield) && !getFlag(ctx.ret, IsUnmounted) && !getFlag(ctx.ret, IsScheduling)) {
      console.error(`Component <${getTagName(ctx.ret.el.tag)}> yielded/returned more than once in for...of loop`);
    }
    setFlag(ctx.ret, NeedsToYield, false);
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
          if (getFlag(ctx.ret, IsInForOfLoop) && !getFlag(ctx.ret, NeedsToYield) && !getFlag(ctx.ret, IsUnmounted) && !getFlag(ctx.ret, IsScheduling)) {
            console.error(`Component <${getTagName(ctx.ret.el.tag)}> yielded/returned more than once in for...of loop`);
          }
        }
        setFlag(ctx.ret, NeedsToYield, false);
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
  const wasScheduling = getFlag(ctx.ret, IsScheduling);
  const values = commitChildren(ctx.adapter, ctx.host, ctx, ctx.scope, ctx.ret, ctx.index, schedulePromises, hydrationNodes);
  if (getFlag(ctx.ret, IsUnmounted)) {
    return;
  }
  addEventTargetDelegates(ctx.ctx, values);
  const callbacks = scheduleMap.get(ctx);
  let schedulePromises1;
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
        setFlag(ctx.ret, IsScheduling, false);
        propagateComponent(ctx);
        if (ctx.ret.fallback) {
          unmount(ctx.adapter, ctx.host, ctx.parent, ctx.ret.fallback, false);
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
      unmount(ctx.adapter, ctx.host, ctx.parent, ctx.ret.fallback, false);
    }
    ctx.ret.fallback = void 0;
    setFlag(ctx.ret, IsUpdating, false);
  }
  setFlag(ctx.ret, DidCommit);
  return getValue(ctx.ret, true);
}
function propagateComponent(ctx) {
  const values = getChildValues(ctx.ret, ctx.index);
  addEventTargetDelegates(ctx.ctx, values, (ctx1) => ctx1[_ContextState].host === ctx.host);
  const host = ctx.host;
  const props = stripSpecialProps(host.el.props);
  ctx.adapter.arrange({
    tag: host.el.tag,
    tagName: getTagName(host.el.tag),
    node: host.value,
    props,
    oldProps: props,
    children: getChildValues(host, 0)
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
  unmountChildren(ctx.adapter, ctx.host, ctx, ctx.ret, isNested);
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

// node_modules/@b9g/crank/jsx-runtime.js
function jsxAdapter(tag, props, key) {
  props.key = key;
  return createElement(tag, props);
}
var Fragment2 = "";
var jsx = jsxAdapter;
var jsxs = jsxAdapter;
var jsxDEV = jsxAdapter;
export {
  Fragment2 as Fragment,
  jsx,
  jsxDEV,
  jsxs
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
//# sourceMappingURL=jsx-runtime-VTCZGTQU.js.map
