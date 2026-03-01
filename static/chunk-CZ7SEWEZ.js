import {
  jsx
} from "./chunk-VKGNBURR.js";
import {
  Raw
} from "./chunk-4BVTMV6T.js";
import {
  __commonJS,
  __template,
  __toESM,
  init_Buffer,
  init_process
} from "./chunk-HNZBFXQU.js";

// node_modules/serialize-javascript/index.js
var require_serialize_javascript = __commonJS({
  "node_modules/serialize-javascript/index.js"(exports, module) {
    "use strict";
    init_Buffer();
    init_process();
    var UID_LENGTH = 16;
    var UID = generateUID();
    var PLACE_HOLDER_REGEXP = new RegExp('(\\\\)?"@__(F|R|D|M|S|A|U|I|B|L)-' + UID + '-(\\d+)__@"', "g");
    var IS_NATIVE_CODE_REGEXP = /\{\s*\[native code\]\s*\}/g;
    var IS_PURE_FUNCTION = /function.*?\(/;
    var IS_ARROW_FUNCTION = /.*?=>.*?/;
    var UNSAFE_CHARS_REGEXP = /[<>\/\u2028\u2029]/g;
    var SCRIPT_CLOSE_REGEXP = /<\/script[^>]*>/gi;
    var RESERVED_SYMBOLS = ["*", "async"];
    var ESCAPED_CHARS = {
      "<": "\\u003C",
      ">": "\\u003E",
      "/": "\\u002F",
      "\u2028": "\\u2028",
      "\u2029": "\\u2029"
    };
    function escapeUnsafeChars(unsafeChar) {
      return ESCAPED_CHARS[unsafeChar];
    }
    function escapeFunctionBody(str) {
      str = str.replace(SCRIPT_CLOSE_REGEXP, function(match) {
        return match.replace(/</g, "\\u003C").replace(/\//g, "\\u002F").replace(/>/g, "\\u003E");
      });
      str = str.replace(/\u2028/g, "\\u2028");
      str = str.replace(/\u2029/g, "\\u2029");
      return str;
    }
    function generateUID() {
      var bytes = crypto.getRandomValues(new Uint8Array(UID_LENGTH));
      var result = "";
      for (var i = 0; i < UID_LENGTH; ++i) {
        result += bytes[i].toString(16);
      }
      return result;
    }
    function deleteFunctions(obj) {
      var functionKeys = [];
      for (var key in obj) {
        if (typeof obj[key] === "function") {
          functionKeys.push(key);
        }
      }
      for (var i = 0; i < functionKeys.length; i++) {
        delete obj[functionKeys[i]];
      }
    }
    module.exports = function serialize(obj, options) {
      options || (options = {});
      if (typeof options === "number" || typeof options === "string") {
        options = { space: options };
      }
      var functions = [];
      var regexps = [];
      var dates = [];
      var maps = [];
      var sets = [];
      var arrays = [];
      var undefs = [];
      var infinities = [];
      var bigInts = [];
      var urls = [];
      function replacer(key, value) {
        if (options.ignoreFunction) {
          deleteFunctions(value);
        }
        if (!value && value !== void 0 && value !== BigInt(0)) {
          return value;
        }
        var origValue = this[key];
        var type = typeof origValue;
        if (type === "object") {
          if (origValue instanceof RegExp) {
            return "@__R-" + UID + "-" + (regexps.push(origValue) - 1) + "__@";
          }
          if (origValue instanceof Date) {
            return "@__D-" + UID + "-" + (dates.push(origValue) - 1) + "__@";
          }
          if (origValue instanceof Map) {
            return "@__M-" + UID + "-" + (maps.push(origValue) - 1) + "__@";
          }
          if (origValue instanceof Set) {
            return "@__S-" + UID + "-" + (sets.push(origValue) - 1) + "__@";
          }
          if (origValue instanceof Array) {
            var isSparse = origValue.filter(function() {
              return true;
            }).length !== origValue.length;
            if (isSparse) {
              return "@__A-" + UID + "-" + (arrays.push(origValue) - 1) + "__@";
            }
          }
          if (origValue instanceof URL) {
            return "@__L-" + UID + "-" + (urls.push(origValue) - 1) + "__@";
          }
        }
        if (type === "function") {
          return "@__F-" + UID + "-" + (functions.push(origValue) - 1) + "__@";
        }
        if (type === "undefined") {
          return "@__U-" + UID + "-" + (undefs.push(origValue) - 1) + "__@";
        }
        if (type === "number" && !isNaN(origValue) && !isFinite(origValue)) {
          return "@__I-" + UID + "-" + (infinities.push(origValue) - 1) + "__@";
        }
        if (type === "bigint") {
          return "@__B-" + UID + "-" + (bigInts.push(origValue) - 1) + "__@";
        }
        return value;
      }
      function serializeFunc(fn, options2) {
        var serializedFn = fn.toString();
        if (IS_NATIVE_CODE_REGEXP.test(serializedFn)) {
          throw new TypeError("Serializing native function: " + fn.name);
        }
        if (options2 && options2.unsafe !== true) {
          serializedFn = escapeFunctionBody(serializedFn);
        }
        if (IS_PURE_FUNCTION.test(serializedFn)) {
          return serializedFn;
        }
        if (IS_ARROW_FUNCTION.test(serializedFn)) {
          return serializedFn;
        }
        var argsStartsAt = serializedFn.indexOf("(");
        var def = serializedFn.substr(0, argsStartsAt).trim().split(" ").filter(function(val) {
          return val.length > 0;
        });
        var nonReservedSymbols = def.filter(function(val) {
          return RESERVED_SYMBOLS.indexOf(val) === -1;
        });
        if (nonReservedSymbols.length > 0) {
          return (def.indexOf("async") > -1 ? "async " : "") + "function" + (def.join("").indexOf("*") > -1 ? "*" : "") + serializedFn.substr(argsStartsAt);
        }
        return serializedFn;
      }
      if (options.ignoreFunction && typeof obj === "function") {
        obj = void 0;
      }
      if (obj === void 0) {
        return String(obj);
      }
      var str;
      if (options.isJSON && !options.space) {
        str = JSON.stringify(obj);
      } else {
        str = JSON.stringify(obj, options.isJSON ? null : replacer, options.space);
      }
      if (typeof str !== "string") {
        return String(str);
      }
      if (options.unsafe !== true) {
        str = str.replace(UNSAFE_CHARS_REGEXP, escapeUnsafeChars);
      }
      if (functions.length === 0 && regexps.length === 0 && dates.length === 0 && maps.length === 0 && sets.length === 0 && arrays.length === 0 && undefs.length === 0 && infinities.length === 0 && bigInts.length === 0 && urls.length === 0) {
        return str;
      }
      return str.replace(PLACE_HOLDER_REGEXP, function(match, backSlash, type, valueIndex) {
        if (backSlash) {
          return match;
        }
        if (type === "D") {
          var isoStr = String(dates[valueIndex].toISOString());
          if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(isoStr)) {
            throw new TypeError("Invalid Date ISO string");
          }
          return 'new Date("' + isoStr + '")';
        }
        if (type === "R") {
          var flags = String(regexps[valueIndex].flags).replace(/[^gimsuydv]/g, "");
          return "new RegExp(" + serialize(regexps[valueIndex].source) + ', "' + flags + '")';
        }
        if (type === "M") {
          return "new Map(" + serialize(Array.from(maps[valueIndex].entries()), options) + ")";
        }
        if (type === "S") {
          return "new Set(" + serialize(Array.from(sets[valueIndex].values()), options) + ")";
        }
        if (type === "A") {
          return "Array.prototype.slice.call(" + serialize(Object.assign({ length: arrays[valueIndex].length }, arrays[valueIndex]), options) + ")";
        }
        if (type === "U") {
          return "undefined";
        }
        if (type === "I") {
          return infinities[valueIndex];
        }
        if (type === "B") {
          return 'BigInt("' + bigInts[valueIndex] + '")';
        }
        if (type === "L") {
          return "new URL(" + serialize(urls[valueIndex].toString(), options) + ")";
        }
        var fn = functions[valueIndex];
        return serializeFunc(fn, options);
      });
    };
  }
});

// src/components/serialize-javascript.ts
init_Buffer();
init_process();
var import_serialize_javascript = __toESM(require_serialize_javascript(), 1);
var nextID = 0;
var _a;
function* SerializeScript({ name, value, ...scriptProps }) {
  const id = nextID++;
  for ({ name, value } of this) {
    name = `${name || "embedded-json"}-${id}`;
    const code = `
			if (window.__embeddedJSON__ == null) {
				window.__embeddedJSON__ = {};
			}
			window.__embeddedJSON__['${name}'] = ${(0, import_serialize_javascript.default)(value)};
		`;
    yield jsx(_a || (_a = __template(["\n			<script data-name=", " ...", ">\n				<", " value=", " />\n			<\/script>\n		"])), name, scriptProps, Raw, code);
  }
}
function extractData(script) {
  const name = script.dataset.name;
  if (name == null) {
    throw new Error("script element is missing data-name attribute");
  }
  return window.__embeddedJSON__[name];
}

export {
  SerializeScript,
  extractData
};
