(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[Object.keys(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __reExport = (target, module, desc) => {
    if (module && typeof module === "object" || typeof module === "function") {
      for (let key of __getOwnPropNames(module))
        if (!__hasOwnProp.call(target, key) && key !== "default")
          __defProp(target, key, { get: () => module[key], enumerable: !(desc = __getOwnPropDesc(module, key)) || desc.enumerable });
    }
    return target;
  };
  var __toModule = (module) => {
    return __reExport(__markAsModule(__defProp(module != null ? __create(__getProtoOf(module)) : {}, "default", module && module.__esModule && "default" in module ? { get: () => module.default, enumerable: true } : { value: module, enumerable: true })), module);
  };

  // node_modules/prismjs/prism.js
  var require_prism = __commonJS({
    "node_modules/prismjs/prism.js"(exports, module) {
      var _self = typeof window !== "undefined" ? window : typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope ? self : {};
      var Prism4 = function(_self2) {
        var lang = /\blang(?:uage)?-([\w-]+)\b/i;
        var uniqueId = 0;
        var plainTextGrammar = {};
        var _ = {
          manual: _self2.Prism && _self2.Prism.manual,
          disableWorkerMessageHandler: _self2.Prism && _self2.Prism.disableWorkerMessageHandler,
          util: {
            encode: function encode(tokens) {
              if (tokens instanceof Token) {
                return new Token(tokens.type, encode(tokens.content), tokens.alias);
              } else if (Array.isArray(tokens)) {
                return tokens.map(encode);
              } else {
                return tokens.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\u00a0/g, " ");
              }
            },
            type: function(o) {
              return Object.prototype.toString.call(o).slice(8, -1);
            },
            objId: function(obj) {
              if (!obj["__id"]) {
                Object.defineProperty(obj, "__id", { value: ++uniqueId });
              }
              return obj["__id"];
            },
            clone: function deepClone(o, visited) {
              visited = visited || {};
              var clone;
              var id;
              switch (_.util.type(o)) {
                case "Object":
                  id = _.util.objId(o);
                  if (visited[id]) {
                    return visited[id];
                  }
                  clone = {};
                  visited[id] = clone;
                  for (var key in o) {
                    if (o.hasOwnProperty(key)) {
                      clone[key] = deepClone(o[key], visited);
                    }
                  }
                  return clone;
                case "Array":
                  id = _.util.objId(o);
                  if (visited[id]) {
                    return visited[id];
                  }
                  clone = [];
                  visited[id] = clone;
                  o.forEach(function(v, i) {
                    clone[i] = deepClone(v, visited);
                  });
                  return clone;
                default:
                  return o;
              }
            },
            getLanguage: function(element) {
              while (element && !lang.test(element.className)) {
                element = element.parentElement;
              }
              if (element) {
                return (element.className.match(lang) || [, "none"])[1].toLowerCase();
              }
              return "none";
            },
            currentScript: function() {
              if (typeof document === "undefined") {
                return null;
              }
              if ("currentScript" in document && 1 < 2) {
                return document.currentScript;
              }
              try {
                throw new Error();
              } catch (err) {
                var src = (/at [^(\r\n]*\((.*):[^:]+:[^:]+\)$/i.exec(err.stack) || [])[1];
                if (src) {
                  var scripts = document.getElementsByTagName("script");
                  for (var i in scripts) {
                    if (scripts[i].src == src) {
                      return scripts[i];
                    }
                  }
                }
                return null;
              }
            },
            isActive: function(element, className, defaultActivation) {
              var no = "no-" + className;
              while (element) {
                var classList = element.classList;
                if (classList.contains(className)) {
                  return true;
                }
                if (classList.contains(no)) {
                  return false;
                }
                element = element.parentElement;
              }
              return !!defaultActivation;
            }
          },
          languages: {
            plain: plainTextGrammar,
            plaintext: plainTextGrammar,
            text: plainTextGrammar,
            txt: plainTextGrammar,
            extend: function(id, redef) {
              var lang2 = _.util.clone(_.languages[id]);
              for (var key in redef) {
                lang2[key] = redef[key];
              }
              return lang2;
            },
            insertBefore: function(inside, before, insert, root) {
              root = root || _.languages;
              var grammar = root[inside];
              var ret = {};
              for (var token in grammar) {
                if (grammar.hasOwnProperty(token)) {
                  if (token == before) {
                    for (var newToken in insert) {
                      if (insert.hasOwnProperty(newToken)) {
                        ret[newToken] = insert[newToken];
                      }
                    }
                  }
                  if (!insert.hasOwnProperty(token)) {
                    ret[token] = grammar[token];
                  }
                }
              }
              var old = root[inside];
              root[inside] = ret;
              _.languages.DFS(_.languages, function(key, value) {
                if (value === old && key != inside) {
                  this[key] = ret;
                }
              });
              return ret;
            },
            DFS: function DFS(o, callback, type, visited) {
              visited = visited || {};
              var objId = _.util.objId;
              for (var i in o) {
                if (o.hasOwnProperty(i)) {
                  callback.call(o, i, o[i], type || i);
                  var property = o[i];
                  var propertyType = _.util.type(property);
                  if (propertyType === "Object" && !visited[objId(property)]) {
                    visited[objId(property)] = true;
                    DFS(property, callback, null, visited);
                  } else if (propertyType === "Array" && !visited[objId(property)]) {
                    visited[objId(property)] = true;
                    DFS(property, callback, i, visited);
                  }
                }
              }
            }
          },
          plugins: {},
          highlightAll: function(async, callback) {
            _.highlightAllUnder(document, async, callback);
          },
          highlightAllUnder: function(container, async, callback) {
            var env = {
              callback,
              container,
              selector: 'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'
            };
            _.hooks.run("before-highlightall", env);
            env.elements = Array.prototype.slice.apply(env.container.querySelectorAll(env.selector));
            _.hooks.run("before-all-elements-highlight", env);
            for (var i = 0, element; element = env.elements[i++]; ) {
              _.highlightElement(element, async === true, env.callback);
            }
          },
          highlightElement: function(element, async, callback) {
            var language = _.util.getLanguage(element);
            var grammar = _.languages[language];
            element.className = element.className.replace(lang, "").replace(/\s+/g, " ") + " language-" + language;
            var parent = element.parentElement;
            if (parent && parent.nodeName.toLowerCase() === "pre") {
              parent.className = parent.className.replace(lang, "").replace(/\s+/g, " ") + " language-" + language;
            }
            var code = element.textContent;
            var env = {
              element,
              language,
              grammar,
              code
            };
            function insertHighlightedCode(highlightedCode) {
              env.highlightedCode = highlightedCode;
              _.hooks.run("before-insert", env);
              env.element.innerHTML = env.highlightedCode;
              _.hooks.run("after-highlight", env);
              _.hooks.run("complete", env);
              callback && callback.call(env.element);
            }
            _.hooks.run("before-sanity-check", env);
            parent = env.element.parentElement;
            if (parent && parent.nodeName.toLowerCase() === "pre" && !parent.hasAttribute("tabindex")) {
              parent.setAttribute("tabindex", "0");
            }
            if (!env.code) {
              _.hooks.run("complete", env);
              callback && callback.call(env.element);
              return;
            }
            _.hooks.run("before-highlight", env);
            if (!env.grammar) {
              insertHighlightedCode(_.util.encode(env.code));
              return;
            }
            if (async && _self2.Worker) {
              var worker = new Worker(_.filename);
              worker.onmessage = function(evt) {
                insertHighlightedCode(evt.data);
              };
              worker.postMessage(JSON.stringify({
                language: env.language,
                code: env.code,
                immediateClose: true
              }));
            } else {
              insertHighlightedCode(_.highlight(env.code, env.grammar, env.language));
            }
          },
          highlight: function(text, grammar, language) {
            var env = {
              code: text,
              grammar,
              language
            };
            _.hooks.run("before-tokenize", env);
            env.tokens = _.tokenize(env.code, env.grammar);
            _.hooks.run("after-tokenize", env);
            return Token.stringify(_.util.encode(env.tokens), env.language);
          },
          tokenize: function(text, grammar) {
            var rest = grammar.rest;
            if (rest) {
              for (var token in rest) {
                grammar[token] = rest[token];
              }
              delete grammar.rest;
            }
            var tokenList = new LinkedList();
            addAfter(tokenList, tokenList.head, text);
            matchGrammar(text, tokenList, grammar, tokenList.head, 0);
            return toArray(tokenList);
          },
          hooks: {
            all: {},
            add: function(name, callback) {
              var hooks = _.hooks.all;
              hooks[name] = hooks[name] || [];
              hooks[name].push(callback);
            },
            run: function(name, env) {
              var callbacks = _.hooks.all[name];
              if (!callbacks || !callbacks.length) {
                return;
              }
              for (var i = 0, callback; callback = callbacks[i++]; ) {
                callback(env);
              }
            }
          },
          Token
        };
        _self2.Prism = _;
        function Token(type, content, alias, matchedStr) {
          this.type = type;
          this.content = content;
          this.alias = alias;
          this.length = (matchedStr || "").length | 0;
        }
        Token.stringify = function stringify(o, language) {
          if (typeof o == "string") {
            return o;
          }
          if (Array.isArray(o)) {
            var s = "";
            o.forEach(function(e) {
              s += stringify(e, language);
            });
            return s;
          }
          var env = {
            type: o.type,
            content: stringify(o.content, language),
            tag: "span",
            classes: ["token", o.type],
            attributes: {},
            language
          };
          var aliases = o.alias;
          if (aliases) {
            if (Array.isArray(aliases)) {
              Array.prototype.push.apply(env.classes, aliases);
            } else {
              env.classes.push(aliases);
            }
          }
          _.hooks.run("wrap", env);
          var attributes = "";
          for (var name in env.attributes) {
            attributes += " " + name + '="' + (env.attributes[name] || "").replace(/"/g, "&quot;") + '"';
          }
          return "<" + env.tag + ' class="' + env.classes.join(" ") + '"' + attributes + ">" + env.content + "</" + env.tag + ">";
        };
        function matchPattern(pattern, pos, text, lookbehind) {
          pattern.lastIndex = pos;
          var match = pattern.exec(text);
          if (match && lookbehind && match[1]) {
            var lookbehindLength = match[1].length;
            match.index += lookbehindLength;
            match[0] = match[0].slice(lookbehindLength);
          }
          return match;
        }
        function matchGrammar(text, tokenList, grammar, startNode, startPos, rematch) {
          for (var token in grammar) {
            if (!grammar.hasOwnProperty(token) || !grammar[token]) {
              continue;
            }
            var patterns = grammar[token];
            patterns = Array.isArray(patterns) ? patterns : [patterns];
            for (var j = 0; j < patterns.length; ++j) {
              if (rematch && rematch.cause == token + "," + j) {
                return;
              }
              var patternObj = patterns[j];
              var inside = patternObj.inside;
              var lookbehind = !!patternObj.lookbehind;
              var greedy = !!patternObj.greedy;
              var alias = patternObj.alias;
              if (greedy && !patternObj.pattern.global) {
                var flags = patternObj.pattern.toString().match(/[imsuy]*$/)[0];
                patternObj.pattern = RegExp(patternObj.pattern.source, flags + "g");
              }
              var pattern = patternObj.pattern || patternObj;
              for (var currentNode = startNode.next, pos = startPos; currentNode !== tokenList.tail; pos += currentNode.value.length, currentNode = currentNode.next) {
                if (rematch && pos >= rematch.reach) {
                  break;
                }
                var str = currentNode.value;
                if (tokenList.length > text.length) {
                  return;
                }
                if (str instanceof Token) {
                  continue;
                }
                var removeCount = 1;
                var match;
                if (greedy) {
                  match = matchPattern(pattern, pos, text, lookbehind);
                  if (!match) {
                    break;
                  }
                  var from = match.index;
                  var to = match.index + match[0].length;
                  var p = pos;
                  p += currentNode.value.length;
                  while (from >= p) {
                    currentNode = currentNode.next;
                    p += currentNode.value.length;
                  }
                  p -= currentNode.value.length;
                  pos = p;
                  if (currentNode.value instanceof Token) {
                    continue;
                  }
                  for (var k = currentNode; k !== tokenList.tail && (p < to || typeof k.value === "string"); k = k.next) {
                    removeCount++;
                    p += k.value.length;
                  }
                  removeCount--;
                  str = text.slice(pos, p);
                  match.index -= pos;
                } else {
                  match = matchPattern(pattern, 0, str, lookbehind);
                  if (!match) {
                    continue;
                  }
                }
                var from = match.index;
                var matchStr = match[0];
                var before = str.slice(0, from);
                var after = str.slice(from + matchStr.length);
                var reach = pos + str.length;
                if (rematch && reach > rematch.reach) {
                  rematch.reach = reach;
                }
                var removeFrom = currentNode.prev;
                if (before) {
                  removeFrom = addAfter(tokenList, removeFrom, before);
                  pos += before.length;
                }
                removeRange(tokenList, removeFrom, removeCount);
                var wrapped = new Token(token, inside ? _.tokenize(matchStr, inside) : matchStr, alias, matchStr);
                currentNode = addAfter(tokenList, removeFrom, wrapped);
                if (after) {
                  addAfter(tokenList, currentNode, after);
                }
                if (removeCount > 1) {
                  var nestedRematch = {
                    cause: token + "," + j,
                    reach
                  };
                  matchGrammar(text, tokenList, grammar, currentNode.prev, pos, nestedRematch);
                  if (rematch && nestedRematch.reach > rematch.reach) {
                    rematch.reach = nestedRematch.reach;
                  }
                }
              }
            }
          }
        }
        function LinkedList() {
          var head = { value: null, prev: null, next: null };
          var tail = { value: null, prev: head, next: null };
          head.next = tail;
          this.head = head;
          this.tail = tail;
          this.length = 0;
        }
        function addAfter(list, node, value) {
          var next = node.next;
          var newNode = { value, prev: node, next };
          node.next = newNode;
          next.prev = newNode;
          list.length++;
          return newNode;
        }
        function removeRange(list, node, count) {
          var next = node.next;
          for (var i = 0; i < count && next !== list.tail; i++) {
            next = next.next;
          }
          node.next = next;
          next.prev = node;
          list.length -= i;
        }
        function toArray(list) {
          var array = [];
          var node = list.head.next;
          while (node !== list.tail) {
            array.push(node.value);
            node = node.next;
          }
          return array;
        }
        if (!_self2.document) {
          if (!_self2.addEventListener) {
            return _;
          }
          if (!_.disableWorkerMessageHandler) {
            _self2.addEventListener("message", function(evt) {
              var message = JSON.parse(evt.data);
              var lang2 = message.language;
              var code = message.code;
              var immediateClose = message.immediateClose;
              _self2.postMessage(_.highlight(code, _.languages[lang2], lang2));
              if (immediateClose) {
                _self2.close();
              }
            }, false);
          }
          return _;
        }
        var script = _.util.currentScript();
        if (script) {
          _.filename = script.src;
          if (script.hasAttribute("data-manual")) {
            _.manual = true;
          }
        }
        function highlightAutomaticallyCallback() {
          if (!_.manual) {
            _.highlightAll();
          }
        }
        if (!_.manual) {
          var readyState = document.readyState;
          if (readyState === "loading" || readyState === "interactive" && script && script.defer) {
            document.addEventListener("DOMContentLoaded", highlightAutomaticallyCallback);
          } else {
            if (window.requestAnimationFrame) {
              window.requestAnimationFrame(highlightAutomaticallyCallback);
            } else {
              window.setTimeout(highlightAutomaticallyCallback, 16);
            }
          }
        }
        return _;
      }(_self);
      if (typeof module !== "undefined" && module.exports) {
        module.exports = Prism4;
      }
      if (typeof global !== "undefined") {
        global.Prism = Prism4;
      }
      Prism4.languages.markup = {
        "comment": {
          pattern: /<!--(?:(?!<!--)[\s\S])*?-->/,
          greedy: true
        },
        "prolog": {
          pattern: /<\?[\s\S]+?\?>/,
          greedy: true
        },
        "doctype": {
          pattern: /<!DOCTYPE(?:[^>"'[\]]|"[^"]*"|'[^']*')+(?:\[(?:[^<"'\]]|"[^"]*"|'[^']*'|<(?!!--)|<!--(?:[^-]|-(?!->))*-->)*\]\s*)?>/i,
          greedy: true,
          inside: {
            "internal-subset": {
              pattern: /(^[^\[]*\[)[\s\S]+(?=\]>$)/,
              lookbehind: true,
              greedy: true,
              inside: null
            },
            "string": {
              pattern: /"[^"]*"|'[^']*'/,
              greedy: true
            },
            "punctuation": /^<!|>$|[[\]]/,
            "doctype-tag": /^DOCTYPE/i,
            "name": /[^\s<>'"]+/
          }
        },
        "cdata": {
          pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i,
          greedy: true
        },
        "tag": {
          pattern: /<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/,
          greedy: true,
          inside: {
            "tag": {
              pattern: /^<\/?[^\s>\/]+/,
              inside: {
                "punctuation": /^<\/?/,
                "namespace": /^[^\s>\/:]+:/
              }
            },
            "special-attr": [],
            "attr-value": {
              pattern: /=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/,
              inside: {
                "punctuation": [
                  {
                    pattern: /^=/,
                    alias: "attr-equals"
                  },
                  /"|'/
                ]
              }
            },
            "punctuation": /\/?>/,
            "attr-name": {
              pattern: /[^\s>\/]+/,
              inside: {
                "namespace": /^[^\s>\/:]+:/
              }
            }
          }
        },
        "entity": [
          {
            pattern: /&[\da-z]{1,8};/i,
            alias: "named-entity"
          },
          /&#x?[\da-f]{1,8};/i
        ]
      };
      Prism4.languages.markup["tag"].inside["attr-value"].inside["entity"] = Prism4.languages.markup["entity"];
      Prism4.languages.markup["doctype"].inside["internal-subset"].inside = Prism4.languages.markup;
      Prism4.hooks.add("wrap", function(env) {
        if (env.type === "entity") {
          env.attributes["title"] = env.content.replace(/&amp;/, "&");
        }
      });
      Object.defineProperty(Prism4.languages.markup.tag, "addInlined", {
        value: function addInlined(tagName, lang) {
          var includedCdataInside = {};
          includedCdataInside["language-" + lang] = {
            pattern: /(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,
            lookbehind: true,
            inside: Prism4.languages[lang]
          };
          includedCdataInside["cdata"] = /^<!\[CDATA\[|\]\]>$/i;
          var inside = {
            "included-cdata": {
              pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i,
              inside: includedCdataInside
            }
          };
          inside["language-" + lang] = {
            pattern: /[\s\S]+/,
            inside: Prism4.languages[lang]
          };
          var def = {};
          def[tagName] = {
            pattern: RegExp(/(<__[^>]*>)(?:<!\[CDATA\[(?:[^\]]|\](?!\]>))*\]\]>|(?!<!\[CDATA\[)[\s\S])*?(?=<\/__>)/.source.replace(/__/g, function() {
              return tagName;
            }), "i"),
            lookbehind: true,
            greedy: true,
            inside
          };
          Prism4.languages.insertBefore("markup", "cdata", def);
        }
      });
      Object.defineProperty(Prism4.languages.markup.tag, "addAttribute", {
        value: function(attrName, lang) {
          Prism4.languages.markup.tag.inside["special-attr"].push({
            pattern: RegExp(/(^|["'\s])/.source + "(?:" + attrName + ")" + /\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))/.source, "i"),
            lookbehind: true,
            inside: {
              "attr-name": /^[^\s=]+/,
              "attr-value": {
                pattern: /=[\s\S]+/,
                inside: {
                  "value": {
                    pattern: /(^=\s*(["']|(?!["'])))\S[\s\S]*(?=\2$)/,
                    lookbehind: true,
                    alias: [lang, "language-" + lang],
                    inside: Prism4.languages[lang]
                  },
                  "punctuation": [
                    {
                      pattern: /^=/,
                      alias: "attr-equals"
                    },
                    /"|'/
                  ]
                }
              }
            }
          });
        }
      });
      Prism4.languages.html = Prism4.languages.markup;
      Prism4.languages.mathml = Prism4.languages.markup;
      Prism4.languages.svg = Prism4.languages.markup;
      Prism4.languages.xml = Prism4.languages.extend("markup", {});
      Prism4.languages.ssml = Prism4.languages.xml;
      Prism4.languages.atom = Prism4.languages.xml;
      Prism4.languages.rss = Prism4.languages.xml;
      (function(Prism5) {
        var string = /(?:"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n])*')/;
        Prism5.languages.css = {
          "comment": /\/\*[\s\S]*?\*\//,
          "atrule": {
            pattern: /@[\w-](?:[^;{\s]|\s+(?![\s{]))*(?:;|(?=\s*\{))/,
            inside: {
              "rule": /^@[\w-]+/,
              "selector-function-argument": {
                pattern: /(\bselector\s*\(\s*(?![\s)]))(?:[^()\s]|\s+(?![\s)])|\((?:[^()]|\([^()]*\))*\))+(?=\s*\))/,
                lookbehind: true,
                alias: "selector"
              },
              "keyword": {
                pattern: /(^|[^\w-])(?:and|not|only|or)(?![\w-])/,
                lookbehind: true
              }
            }
          },
          "url": {
            pattern: RegExp("\\burl\\((?:" + string.source + "|" + /(?:[^\\\r\n()"']|\\[\s\S])*/.source + ")\\)", "i"),
            greedy: true,
            inside: {
              "function": /^url/i,
              "punctuation": /^\(|\)$/,
              "string": {
                pattern: RegExp("^" + string.source + "$"),
                alias: "url"
              }
            }
          },
          "selector": {
            pattern: RegExp(`(^|[{}\\s])[^{}\\s](?:[^{};"'\\s]|\\s+(?![\\s{])|` + string.source + ")*(?=\\s*\\{)"),
            lookbehind: true
          },
          "string": {
            pattern: string,
            greedy: true
          },
          "property": {
            pattern: /(^|[^-\w\xA0-\uFFFF])(?!\s)[-_a-z\xA0-\uFFFF](?:(?!\s)[-\w\xA0-\uFFFF])*(?=\s*:)/i,
            lookbehind: true
          },
          "important": /!important\b/i,
          "function": {
            pattern: /(^|[^-a-z0-9])[-a-z0-9]+(?=\()/i,
            lookbehind: true
          },
          "punctuation": /[(){};:,]/
        };
        Prism5.languages.css["atrule"].inside.rest = Prism5.languages.css;
        var markup = Prism5.languages.markup;
        if (markup) {
          markup.tag.addInlined("style", "css");
          markup.tag.addAttribute("style", "css");
        }
      })(Prism4);
      Prism4.languages.clike = {
        "comment": [
          {
            pattern: /(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,
            lookbehind: true,
            greedy: true
          },
          {
            pattern: /(^|[^\\:])\/\/.*/,
            lookbehind: true,
            greedy: true
          }
        ],
        "string": {
          pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
          greedy: true
        },
        "class-name": {
          pattern: /(\b(?:class|interface|extends|implements|trait|instanceof|new)\s+|\bcatch\s+\()[\w.\\]+/i,
          lookbehind: true,
          inside: {
            "punctuation": /[.\\]/
          }
        },
        "keyword": /\b(?:if|else|while|do|for|return|in|instanceof|function|new|try|throw|catch|finally|null|break|continue)\b/,
        "boolean": /\b(?:true|false)\b/,
        "function": /\b\w+(?=\()/,
        "number": /\b0x[\da-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?/i,
        "operator": /[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,
        "punctuation": /[{}[\];(),.:]/
      };
      Prism4.languages.javascript = Prism4.languages.extend("clike", {
        "class-name": [
          Prism4.languages.clike["class-name"],
          {
            pattern: /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$A-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\.(?:prototype|constructor))/,
            lookbehind: true
          }
        ],
        "keyword": [
          {
            pattern: /((?:^|\})\s*)catch\b/,
            lookbehind: true
          },
          {
            pattern: /(^|[^.]|\.\.\.\s*)\b(?:as|assert(?=\s*\{)|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally(?=\s*(?:\{|$))|for|from(?=\s*(?:['"]|$))|function|(?:get|set)(?=\s*(?:[#\[$\w\xA0-\uFFFF]|$))|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,
            lookbehind: true
          }
        ],
        "function": /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,
        "number": /\b(?:(?:0[xX](?:[\dA-Fa-f](?:_[\dA-Fa-f])?)+|0[bB](?:[01](?:_[01])?)+|0[oO](?:[0-7](?:_[0-7])?)+)n?|(?:\d(?:_\d)?)+n|NaN|Infinity)\b|(?:\b(?:\d(?:_\d)?)+\.?(?:\d(?:_\d)?)*|\B\.(?:\d(?:_\d)?)+)(?:[Ee][+-]?(?:\d(?:_\d)?)+)?/,
        "operator": /--|\+\+|\*\*=?|=>|&&=?|\|\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?\?=?|\?\.?|[~:]/
      });
      Prism4.languages.javascript["class-name"][0].pattern = /(\b(?:class|interface|extends|implements|instanceof|new)\s+)[\w.\\]+/;
      Prism4.languages.insertBefore("javascript", "keyword", {
        "regex": {
          pattern: /((?:^|[^$\w\xA0-\uFFFF."'\])\s]|\b(?:return|yield))\s*)\/(?:\[(?:[^\]\\\r\n]|\\.)*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}(?=(?:\s|\/\*(?:[^*]|\*(?!\/))*\*\/)*(?:$|[\r\n,.;:})\]]|\/\/))/,
          lookbehind: true,
          greedy: true,
          inside: {
            "regex-source": {
              pattern: /^(\/)[\s\S]+(?=\/[a-z]*$)/,
              lookbehind: true,
              alias: "language-regex",
              inside: Prism4.languages.regex
            },
            "regex-delimiter": /^\/|\/$/,
            "regex-flags": /^[a-z]+$/
          }
        },
        "function-variable": {
          pattern: /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)\s*=>))/,
          alias: "function"
        },
        "parameter": [
          {
            pattern: /(function(?:\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)?\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\))/,
            lookbehind: true,
            inside: Prism4.languages.javascript
          },
          {
            pattern: /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$a-z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*=>)/i,
            lookbehind: true,
            inside: Prism4.languages.javascript
          },
          {
            pattern: /(\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*=>)/,
            lookbehind: true,
            inside: Prism4.languages.javascript
          },
          {
            pattern: /((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*\{)/,
            lookbehind: true,
            inside: Prism4.languages.javascript
          }
        ],
        "constant": /\b[A-Z](?:[A-Z_]|\dx?)*\b/
      });
      Prism4.languages.insertBefore("javascript", "string", {
        "hashbang": {
          pattern: /^#!.*/,
          greedy: true,
          alias: "comment"
        },
        "template-string": {
          pattern: /`(?:\\[\s\S]|\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}|(?!\$\{)[^\\`])*`/,
          greedy: true,
          inside: {
            "template-punctuation": {
              pattern: /^`|`$/,
              alias: "string"
            },
            "interpolation": {
              pattern: /((?:^|[^\\])(?:\\{2})*)\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}/,
              lookbehind: true,
              inside: {
                "interpolation-punctuation": {
                  pattern: /^\$\{|\}$/,
                  alias: "punctuation"
                },
                rest: Prism4.languages.javascript
              }
            },
            "string": /[\s\S]+/
          }
        }
      });
      if (Prism4.languages.markup) {
        Prism4.languages.markup.tag.addInlined("script", "javascript");
        Prism4.languages.markup.tag.addAttribute(/on(?:abort|blur|change|click|composition(?:end|start|update)|dblclick|error|focus(?:in|out)?|key(?:down|up)|load|mouse(?:down|enter|leave|move|out|over|up)|reset|resize|scroll|select|slotchange|submit|unload|wheel)/.source, "javascript");
      }
      Prism4.languages.js = Prism4.languages.javascript;
      (function() {
        if (typeof Prism4 === "undefined" || typeof document === "undefined") {
          return;
        }
        if (!Element.prototype.matches) {
          Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
        }
        var LOADING_MESSAGE = "Loading\u2026";
        var FAILURE_MESSAGE = function(status, message) {
          return "\u2716 Error " + status + " while fetching file: " + message;
        };
        var FAILURE_EMPTY_MESSAGE = "\u2716 Error: File does not exist or is empty";
        var EXTENSIONS = {
          "js": "javascript",
          "py": "python",
          "rb": "ruby",
          "ps1": "powershell",
          "psm1": "powershell",
          "sh": "bash",
          "bat": "batch",
          "h": "c",
          "tex": "latex"
        };
        var STATUS_ATTR = "data-src-status";
        var STATUS_LOADING = "loading";
        var STATUS_LOADED = "loaded";
        var STATUS_FAILED = "failed";
        var SELECTOR = "pre[data-src]:not([" + STATUS_ATTR + '="' + STATUS_LOADED + '"]):not([' + STATUS_ATTR + '="' + STATUS_LOADING + '"])';
        var lang = /\blang(?:uage)?-([\w-]+)\b/i;
        function setLanguageClass(element, language) {
          var className = element.className;
          className = className.replace(lang, " ") + " language-" + language;
          element.className = className.replace(/\s+/g, " ").trim();
        }
        Prism4.hooks.add("before-highlightall", function(env) {
          env.selector += ", " + SELECTOR;
        });
        Prism4.hooks.add("before-sanity-check", function(env) {
          var pre = env.element;
          if (pre.matches(SELECTOR)) {
            env.code = "";
            pre.setAttribute(STATUS_ATTR, STATUS_LOADING);
            var code = pre.appendChild(document.createElement("CODE"));
            code.textContent = LOADING_MESSAGE;
            var src = pre.getAttribute("data-src");
            var language = env.language;
            if (language === "none") {
              var extension = (/\.(\w+)$/.exec(src) || [, "none"])[1];
              language = EXTENSIONS[extension] || extension;
            }
            setLanguageClass(code, language);
            setLanguageClass(pre, language);
            var autoloader = Prism4.plugins.autoloader;
            if (autoloader) {
              autoloader.loadLanguages(language);
            }
            var xhr = new XMLHttpRequest();
            xhr.open("GET", src, true);
            xhr.onreadystatechange = function() {
              if (xhr.readyState == 4) {
                if (xhr.status < 400 && xhr.responseText) {
                  pre.setAttribute(STATUS_ATTR, STATUS_LOADED);
                  code.textContent = xhr.responseText;
                  Prism4.highlightElement(code);
                } else {
                  pre.setAttribute(STATUS_ATTR, STATUS_FAILED);
                  if (xhr.status >= 400) {
                    code.textContent = FAILURE_MESSAGE(xhr.status, xhr.statusText);
                  } else {
                    code.textContent = FAILURE_EMPTY_MESSAGE;
                  }
                }
              }
            };
            xhr.send(null);
          }
        });
        Prism4.plugins.fileHighlight = {
          highlight: function highlight(container) {
            var elements = (container || document).querySelectorAll(SELECTOR);
            for (var i = 0, element; element = elements[i++]; ) {
              Prism4.highlightElement(element);
            }
          }
        };
        var logged = false;
        Prism4.fileHighlight = function() {
          if (!logged) {
            console.warn("Prism.fileHighlight is deprecated. Use `Prism.plugins.fileHighlight.highlight` instead.");
            logged = true;
          }
          Prism4.plugins.fileHighlight.highlight.apply(this, arguments);
        };
      })();
    }
  });

  // node_modules/sucrase/dist/parser/tokenizer/keywords.js
  var require_keywords = __commonJS({
    "node_modules/sucrase/dist/parser/tokenizer/keywords.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var ContextualKeyword;
      (function(ContextualKeyword2) {
        const NONE2 = 0;
        ContextualKeyword2[ContextualKeyword2["NONE"] = NONE2] = "NONE";
        const _abstract = NONE2 + 1;
        ContextualKeyword2[ContextualKeyword2["_abstract"] = _abstract] = "_abstract";
        const _as = _abstract + 1;
        ContextualKeyword2[ContextualKeyword2["_as"] = _as] = "_as";
        const _asserts = _as + 1;
        ContextualKeyword2[ContextualKeyword2["_asserts"] = _asserts] = "_asserts";
        const _async = _asserts + 1;
        ContextualKeyword2[ContextualKeyword2["_async"] = _async] = "_async";
        const _await = _async + 1;
        ContextualKeyword2[ContextualKeyword2["_await"] = _await] = "_await";
        const _checks = _await + 1;
        ContextualKeyword2[ContextualKeyword2["_checks"] = _checks] = "_checks";
        const _constructor = _checks + 1;
        ContextualKeyword2[ContextualKeyword2["_constructor"] = _constructor] = "_constructor";
        const _declare = _constructor + 1;
        ContextualKeyword2[ContextualKeyword2["_declare"] = _declare] = "_declare";
        const _enum = _declare + 1;
        ContextualKeyword2[ContextualKeyword2["_enum"] = _enum] = "_enum";
        const _exports = _enum + 1;
        ContextualKeyword2[ContextualKeyword2["_exports"] = _exports] = "_exports";
        const _from = _exports + 1;
        ContextualKeyword2[ContextualKeyword2["_from"] = _from] = "_from";
        const _get = _from + 1;
        ContextualKeyword2[ContextualKeyword2["_get"] = _get] = "_get";
        const _global = _get + 1;
        ContextualKeyword2[ContextualKeyword2["_global"] = _global] = "_global";
        const _implements = _global + 1;
        ContextualKeyword2[ContextualKeyword2["_implements"] = _implements] = "_implements";
        const _infer = _implements + 1;
        ContextualKeyword2[ContextualKeyword2["_infer"] = _infer] = "_infer";
        const _interface = _infer + 1;
        ContextualKeyword2[ContextualKeyword2["_interface"] = _interface] = "_interface";
        const _is = _interface + 1;
        ContextualKeyword2[ContextualKeyword2["_is"] = _is] = "_is";
        const _keyof = _is + 1;
        ContextualKeyword2[ContextualKeyword2["_keyof"] = _keyof] = "_keyof";
        const _mixins = _keyof + 1;
        ContextualKeyword2[ContextualKeyword2["_mixins"] = _mixins] = "_mixins";
        const _module = _mixins + 1;
        ContextualKeyword2[ContextualKeyword2["_module"] = _module] = "_module";
        const _namespace = _module + 1;
        ContextualKeyword2[ContextualKeyword2["_namespace"] = _namespace] = "_namespace";
        const _of = _namespace + 1;
        ContextualKeyword2[ContextualKeyword2["_of"] = _of] = "_of";
        const _opaque = _of + 1;
        ContextualKeyword2[ContextualKeyword2["_opaque"] = _opaque] = "_opaque";
        const _override = _opaque + 1;
        ContextualKeyword2[ContextualKeyword2["_override"] = _override] = "_override";
        const _private = _override + 1;
        ContextualKeyword2[ContextualKeyword2["_private"] = _private] = "_private";
        const _protected = _private + 1;
        ContextualKeyword2[ContextualKeyword2["_protected"] = _protected] = "_protected";
        const _proto = _protected + 1;
        ContextualKeyword2[ContextualKeyword2["_proto"] = _proto] = "_proto";
        const _public = _proto + 1;
        ContextualKeyword2[ContextualKeyword2["_public"] = _public] = "_public";
        const _readonly = _public + 1;
        ContextualKeyword2[ContextualKeyword2["_readonly"] = _readonly] = "_readonly";
        const _require = _readonly + 1;
        ContextualKeyword2[ContextualKeyword2["_require"] = _require] = "_require";
        const _set = _require + 1;
        ContextualKeyword2[ContextualKeyword2["_set"] = _set] = "_set";
        const _static = _set + 1;
        ContextualKeyword2[ContextualKeyword2["_static"] = _static] = "_static";
        const _type = _static + 1;
        ContextualKeyword2[ContextualKeyword2["_type"] = _type] = "_type";
        const _unique = _type + 1;
        ContextualKeyword2[ContextualKeyword2["_unique"] = _unique] = "_unique";
      })(ContextualKeyword || (exports.ContextualKeyword = ContextualKeyword = {}));
    }
  });

  // node_modules/sucrase/dist/parser/tokenizer/types.js
  var require_types = __commonJS({
    "node_modules/sucrase/dist/parser/tokenizer/types.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var TokenType;
      (function(TokenType2) {
        const PRECEDENCE_MASK = 15;
        TokenType2[TokenType2["PRECEDENCE_MASK"] = PRECEDENCE_MASK] = "PRECEDENCE_MASK";
        const IS_KEYWORD = 1 << 4;
        TokenType2[TokenType2["IS_KEYWORD"] = IS_KEYWORD] = "IS_KEYWORD";
        const IS_ASSIGN = 1 << 5;
        TokenType2[TokenType2["IS_ASSIGN"] = IS_ASSIGN] = "IS_ASSIGN";
        const IS_RIGHT_ASSOCIATIVE = 1 << 6;
        TokenType2[TokenType2["IS_RIGHT_ASSOCIATIVE"] = IS_RIGHT_ASSOCIATIVE] = "IS_RIGHT_ASSOCIATIVE";
        const IS_PREFIX = 1 << 7;
        TokenType2[TokenType2["IS_PREFIX"] = IS_PREFIX] = "IS_PREFIX";
        const IS_POSTFIX = 1 << 8;
        TokenType2[TokenType2["IS_POSTFIX"] = IS_POSTFIX] = "IS_POSTFIX";
        const num = 0;
        TokenType2[TokenType2["num"] = num] = "num";
        const bigint = 512;
        TokenType2[TokenType2["bigint"] = bigint] = "bigint";
        const decimal = 1024;
        TokenType2[TokenType2["decimal"] = decimal] = "decimal";
        const regexp = 1536;
        TokenType2[TokenType2["regexp"] = regexp] = "regexp";
        const string = 2048;
        TokenType2[TokenType2["string"] = string] = "string";
        const name = 2560;
        TokenType2[TokenType2["name"] = name] = "name";
        const eof = 3072;
        TokenType2[TokenType2["eof"] = eof] = "eof";
        const bracketL = 3584;
        TokenType2[TokenType2["bracketL"] = bracketL] = "bracketL";
        const bracketR = 4096;
        TokenType2[TokenType2["bracketR"] = bracketR] = "bracketR";
        const braceL = 4608;
        TokenType2[TokenType2["braceL"] = braceL] = "braceL";
        const braceBarL = 5120;
        TokenType2[TokenType2["braceBarL"] = braceBarL] = "braceBarL";
        const braceR = 5632;
        TokenType2[TokenType2["braceR"] = braceR] = "braceR";
        const braceBarR = 6144;
        TokenType2[TokenType2["braceBarR"] = braceBarR] = "braceBarR";
        const parenL = 6656;
        TokenType2[TokenType2["parenL"] = parenL] = "parenL";
        const parenR = 7168;
        TokenType2[TokenType2["parenR"] = parenR] = "parenR";
        const comma = 7680;
        TokenType2[TokenType2["comma"] = comma] = "comma";
        const semi = 8192;
        TokenType2[TokenType2["semi"] = semi] = "semi";
        const colon = 8704;
        TokenType2[TokenType2["colon"] = colon] = "colon";
        const doubleColon = 9216;
        TokenType2[TokenType2["doubleColon"] = doubleColon] = "doubleColon";
        const dot = 9728;
        TokenType2[TokenType2["dot"] = dot] = "dot";
        const question = 10240;
        TokenType2[TokenType2["question"] = question] = "question";
        const questionDot = 10752;
        TokenType2[TokenType2["questionDot"] = questionDot] = "questionDot";
        const arrow = 11264;
        TokenType2[TokenType2["arrow"] = arrow] = "arrow";
        const template = 11776;
        TokenType2[TokenType2["template"] = template] = "template";
        const ellipsis = 12288;
        TokenType2[TokenType2["ellipsis"] = ellipsis] = "ellipsis";
        const backQuote = 12800;
        TokenType2[TokenType2["backQuote"] = backQuote] = "backQuote";
        const dollarBraceL = 13312;
        TokenType2[TokenType2["dollarBraceL"] = dollarBraceL] = "dollarBraceL";
        const at = 13824;
        TokenType2[TokenType2["at"] = at] = "at";
        const hash = 14336;
        TokenType2[TokenType2["hash"] = hash] = "hash";
        const eq = 14880;
        TokenType2[TokenType2["eq"] = eq] = "eq";
        const assign = 15392;
        TokenType2[TokenType2["assign"] = assign] = "assign";
        const preIncDec = 16256;
        TokenType2[TokenType2["preIncDec"] = preIncDec] = "preIncDec";
        const postIncDec = 16768;
        TokenType2[TokenType2["postIncDec"] = postIncDec] = "postIncDec";
        const bang = 17024;
        TokenType2[TokenType2["bang"] = bang] = "bang";
        const tilde = 17536;
        TokenType2[TokenType2["tilde"] = tilde] = "tilde";
        const pipeline = 17921;
        TokenType2[TokenType2["pipeline"] = pipeline] = "pipeline";
        const nullishCoalescing = 18434;
        TokenType2[TokenType2["nullishCoalescing"] = nullishCoalescing] = "nullishCoalescing";
        const logicalOR = 18946;
        TokenType2[TokenType2["logicalOR"] = logicalOR] = "logicalOR";
        const logicalAND = 19459;
        TokenType2[TokenType2["logicalAND"] = logicalAND] = "logicalAND";
        const bitwiseOR = 19972;
        TokenType2[TokenType2["bitwiseOR"] = bitwiseOR] = "bitwiseOR";
        const bitwiseXOR = 20485;
        TokenType2[TokenType2["bitwiseXOR"] = bitwiseXOR] = "bitwiseXOR";
        const bitwiseAND = 20998;
        TokenType2[TokenType2["bitwiseAND"] = bitwiseAND] = "bitwiseAND";
        const equality = 21511;
        TokenType2[TokenType2["equality"] = equality] = "equality";
        const lessThan = 22024;
        TokenType2[TokenType2["lessThan"] = lessThan] = "lessThan";
        const greaterThan = 22536;
        TokenType2[TokenType2["greaterThan"] = greaterThan] = "greaterThan";
        const relationalOrEqual = 23048;
        TokenType2[TokenType2["relationalOrEqual"] = relationalOrEqual] = "relationalOrEqual";
        const bitShift = 23561;
        TokenType2[TokenType2["bitShift"] = bitShift] = "bitShift";
        const plus = 24202;
        TokenType2[TokenType2["plus"] = plus] = "plus";
        const minus = 24714;
        TokenType2[TokenType2["minus"] = minus] = "minus";
        const modulo = 25099;
        TokenType2[TokenType2["modulo"] = modulo] = "modulo";
        const star = 25611;
        TokenType2[TokenType2["star"] = star] = "star";
        const slash = 26123;
        TokenType2[TokenType2["slash"] = slash] = "slash";
        const exponent = 26700;
        TokenType2[TokenType2["exponent"] = exponent] = "exponent";
        const jsxName = 27136;
        TokenType2[TokenType2["jsxName"] = jsxName] = "jsxName";
        const jsxText = 27648;
        TokenType2[TokenType2["jsxText"] = jsxText] = "jsxText";
        const jsxTagStart = 28160;
        TokenType2[TokenType2["jsxTagStart"] = jsxTagStart] = "jsxTagStart";
        const jsxTagEnd = 28672;
        TokenType2[TokenType2["jsxTagEnd"] = jsxTagEnd] = "jsxTagEnd";
        const typeParameterStart = 29184;
        TokenType2[TokenType2["typeParameterStart"] = typeParameterStart] = "typeParameterStart";
        const nonNullAssertion = 29696;
        TokenType2[TokenType2["nonNullAssertion"] = nonNullAssertion] = "nonNullAssertion";
        const _break = 30224;
        TokenType2[TokenType2["_break"] = _break] = "_break";
        const _case = 30736;
        TokenType2[TokenType2["_case"] = _case] = "_case";
        const _catch = 31248;
        TokenType2[TokenType2["_catch"] = _catch] = "_catch";
        const _continue = 31760;
        TokenType2[TokenType2["_continue"] = _continue] = "_continue";
        const _debugger = 32272;
        TokenType2[TokenType2["_debugger"] = _debugger] = "_debugger";
        const _default = 32784;
        TokenType2[TokenType2["_default"] = _default] = "_default";
        const _do = 33296;
        TokenType2[TokenType2["_do"] = _do] = "_do";
        const _else = 33808;
        TokenType2[TokenType2["_else"] = _else] = "_else";
        const _finally = 34320;
        TokenType2[TokenType2["_finally"] = _finally] = "_finally";
        const _for = 34832;
        TokenType2[TokenType2["_for"] = _for] = "_for";
        const _function = 35344;
        TokenType2[TokenType2["_function"] = _function] = "_function";
        const _if = 35856;
        TokenType2[TokenType2["_if"] = _if] = "_if";
        const _return = 36368;
        TokenType2[TokenType2["_return"] = _return] = "_return";
        const _switch = 36880;
        TokenType2[TokenType2["_switch"] = _switch] = "_switch";
        const _throw = 37520;
        TokenType2[TokenType2["_throw"] = _throw] = "_throw";
        const _try = 37904;
        TokenType2[TokenType2["_try"] = _try] = "_try";
        const _var = 38416;
        TokenType2[TokenType2["_var"] = _var] = "_var";
        const _let = 38928;
        TokenType2[TokenType2["_let"] = _let] = "_let";
        const _const = 39440;
        TokenType2[TokenType2["_const"] = _const] = "_const";
        const _while = 39952;
        TokenType2[TokenType2["_while"] = _while] = "_while";
        const _with = 40464;
        TokenType2[TokenType2["_with"] = _with] = "_with";
        const _new = 40976;
        TokenType2[TokenType2["_new"] = _new] = "_new";
        const _this = 41488;
        TokenType2[TokenType2["_this"] = _this] = "_this";
        const _super = 42e3;
        TokenType2[TokenType2["_super"] = _super] = "_super";
        const _class = 42512;
        TokenType2[TokenType2["_class"] = _class] = "_class";
        const _extends = 43024;
        TokenType2[TokenType2["_extends"] = _extends] = "_extends";
        const _export = 43536;
        TokenType2[TokenType2["_export"] = _export] = "_export";
        const _import = 44048;
        TokenType2[TokenType2["_import"] = _import] = "_import";
        const _yield = 44560;
        TokenType2[TokenType2["_yield"] = _yield] = "_yield";
        const _null = 45072;
        TokenType2[TokenType2["_null"] = _null] = "_null";
        const _true = 45584;
        TokenType2[TokenType2["_true"] = _true] = "_true";
        const _false = 46096;
        TokenType2[TokenType2["_false"] = _false] = "_false";
        const _in = 46616;
        TokenType2[TokenType2["_in"] = _in] = "_in";
        const _instanceof = 47128;
        TokenType2[TokenType2["_instanceof"] = _instanceof] = "_instanceof";
        const _typeof = 47760;
        TokenType2[TokenType2["_typeof"] = _typeof] = "_typeof";
        const _void = 48272;
        TokenType2[TokenType2["_void"] = _void] = "_void";
        const _delete = 48784;
        TokenType2[TokenType2["_delete"] = _delete] = "_delete";
        const _async = 49168;
        TokenType2[TokenType2["_async"] = _async] = "_async";
        const _get = 49680;
        TokenType2[TokenType2["_get"] = _get] = "_get";
        const _set = 50192;
        TokenType2[TokenType2["_set"] = _set] = "_set";
        const _declare = 50704;
        TokenType2[TokenType2["_declare"] = _declare] = "_declare";
        const _readonly = 51216;
        TokenType2[TokenType2["_readonly"] = _readonly] = "_readonly";
        const _abstract = 51728;
        TokenType2[TokenType2["_abstract"] = _abstract] = "_abstract";
        const _static = 52240;
        TokenType2[TokenType2["_static"] = _static] = "_static";
        const _public = 52752;
        TokenType2[TokenType2["_public"] = _public] = "_public";
        const _private = 53264;
        TokenType2[TokenType2["_private"] = _private] = "_private";
        const _protected = 53776;
        TokenType2[TokenType2["_protected"] = _protected] = "_protected";
        const _override = 54288;
        TokenType2[TokenType2["_override"] = _override] = "_override";
        const _as = 54800;
        TokenType2[TokenType2["_as"] = _as] = "_as";
        const _enum = 55312;
        TokenType2[TokenType2["_enum"] = _enum] = "_enum";
        const _type = 55824;
        TokenType2[TokenType2["_type"] = _type] = "_type";
        const _implements = 56336;
        TokenType2[TokenType2["_implements"] = _implements] = "_implements";
      })(TokenType || (exports.TokenType = TokenType = {}));
      function formatTokenType(tokenType) {
        switch (tokenType) {
          case TokenType.num:
            return "num";
          case TokenType.bigint:
            return "bigint";
          case TokenType.decimal:
            return "decimal";
          case TokenType.regexp:
            return "regexp";
          case TokenType.string:
            return "string";
          case TokenType.name:
            return "name";
          case TokenType.eof:
            return "eof";
          case TokenType.bracketL:
            return "[";
          case TokenType.bracketR:
            return "]";
          case TokenType.braceL:
            return "{";
          case TokenType.braceBarL:
            return "{|";
          case TokenType.braceR:
            return "}";
          case TokenType.braceBarR:
            return "|}";
          case TokenType.parenL:
            return "(";
          case TokenType.parenR:
            return ")";
          case TokenType.comma:
            return ",";
          case TokenType.semi:
            return ";";
          case TokenType.colon:
            return ":";
          case TokenType.doubleColon:
            return "::";
          case TokenType.dot:
            return ".";
          case TokenType.question:
            return "?";
          case TokenType.questionDot:
            return "?.";
          case TokenType.arrow:
            return "=>";
          case TokenType.template:
            return "template";
          case TokenType.ellipsis:
            return "...";
          case TokenType.backQuote:
            return "`";
          case TokenType.dollarBraceL:
            return "${";
          case TokenType.at:
            return "@";
          case TokenType.hash:
            return "#";
          case TokenType.eq:
            return "=";
          case TokenType.assign:
            return "_=";
          case TokenType.preIncDec:
            return "++/--";
          case TokenType.postIncDec:
            return "++/--";
          case TokenType.bang:
            return "!";
          case TokenType.tilde:
            return "~";
          case TokenType.pipeline:
            return "|>";
          case TokenType.nullishCoalescing:
            return "??";
          case TokenType.logicalOR:
            return "||";
          case TokenType.logicalAND:
            return "&&";
          case TokenType.bitwiseOR:
            return "|";
          case TokenType.bitwiseXOR:
            return "^";
          case TokenType.bitwiseAND:
            return "&";
          case TokenType.equality:
            return "==/!=";
          case TokenType.lessThan:
            return "<";
          case TokenType.greaterThan:
            return ">";
          case TokenType.relationalOrEqual:
            return "<=/>=";
          case TokenType.bitShift:
            return "<</>>";
          case TokenType.plus:
            return "+";
          case TokenType.minus:
            return "-";
          case TokenType.modulo:
            return "%";
          case TokenType.star:
            return "*";
          case TokenType.slash:
            return "/";
          case TokenType.exponent:
            return "**";
          case TokenType.jsxName:
            return "jsxName";
          case TokenType.jsxText:
            return "jsxText";
          case TokenType.jsxTagStart:
            return "jsxTagStart";
          case TokenType.jsxTagEnd:
            return "jsxTagEnd";
          case TokenType.typeParameterStart:
            return "typeParameterStart";
          case TokenType.nonNullAssertion:
            return "nonNullAssertion";
          case TokenType._break:
            return "break";
          case TokenType._case:
            return "case";
          case TokenType._catch:
            return "catch";
          case TokenType._continue:
            return "continue";
          case TokenType._debugger:
            return "debugger";
          case TokenType._default:
            return "default";
          case TokenType._do:
            return "do";
          case TokenType._else:
            return "else";
          case TokenType._finally:
            return "finally";
          case TokenType._for:
            return "for";
          case TokenType._function:
            return "function";
          case TokenType._if:
            return "if";
          case TokenType._return:
            return "return";
          case TokenType._switch:
            return "switch";
          case TokenType._throw:
            return "throw";
          case TokenType._try:
            return "try";
          case TokenType._var:
            return "var";
          case TokenType._let:
            return "let";
          case TokenType._const:
            return "const";
          case TokenType._while:
            return "while";
          case TokenType._with:
            return "with";
          case TokenType._new:
            return "new";
          case TokenType._this:
            return "this";
          case TokenType._super:
            return "super";
          case TokenType._class:
            return "class";
          case TokenType._extends:
            return "extends";
          case TokenType._export:
            return "export";
          case TokenType._import:
            return "import";
          case TokenType._yield:
            return "yield";
          case TokenType._null:
            return "null";
          case TokenType._true:
            return "true";
          case TokenType._false:
            return "false";
          case TokenType._in:
            return "in";
          case TokenType._instanceof:
            return "instanceof";
          case TokenType._typeof:
            return "typeof";
          case TokenType._void:
            return "void";
          case TokenType._delete:
            return "delete";
          case TokenType._async:
            return "async";
          case TokenType._get:
            return "get";
          case TokenType._set:
            return "set";
          case TokenType._declare:
            return "declare";
          case TokenType._readonly:
            return "readonly";
          case TokenType._abstract:
            return "abstract";
          case TokenType._static:
            return "static";
          case TokenType._public:
            return "public";
          case TokenType._private:
            return "private";
          case TokenType._protected:
            return "protected";
          case TokenType._override:
            return "override";
          case TokenType._as:
            return "as";
          case TokenType._enum:
            return "enum";
          case TokenType._type:
            return "type";
          case TokenType._implements:
            return "implements";
          default:
            return "";
        }
      }
      exports.formatTokenType = formatTokenType;
    }
  });

  // node_modules/sucrase/dist/parser/tokenizer/state.js
  var require_state = __commonJS({
    "node_modules/sucrase/dist/parser/tokenizer/state.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var _keywords = require_keywords();
      var _types = require_types();
      var Scope = class {
        constructor(startTokenIndex, endTokenIndex, isFunctionScope) {
          this.startTokenIndex = startTokenIndex;
          this.endTokenIndex = endTokenIndex;
          this.isFunctionScope = isFunctionScope;
        }
      };
      exports.Scope = Scope;
      var StateSnapshot = class {
        constructor(potentialArrowAt, noAnonFunctionType, tokensLength, scopesLength, pos, type, contextualKeyword, start, end, isType, scopeDepth, error) {
          ;
          this.potentialArrowAt = potentialArrowAt;
          this.noAnonFunctionType = noAnonFunctionType;
          this.tokensLength = tokensLength;
          this.scopesLength = scopesLength;
          this.pos = pos;
          this.type = type;
          this.contextualKeyword = contextualKeyword;
          this.start = start;
          this.end = end;
          this.isType = isType;
          this.scopeDepth = scopeDepth;
          this.error = error;
        }
      };
      exports.StateSnapshot = StateSnapshot;
      var State = class {
        constructor() {
          State.prototype.__init.call(this);
          State.prototype.__init2.call(this);
          State.prototype.__init3.call(this);
          State.prototype.__init4.call(this);
          State.prototype.__init5.call(this);
          State.prototype.__init6.call(this);
          State.prototype.__init7.call(this);
          State.prototype.__init8.call(this);
          State.prototype.__init9.call(this);
          State.prototype.__init10.call(this);
          State.prototype.__init11.call(this);
          State.prototype.__init12.call(this);
        }
        __init() {
          this.potentialArrowAt = -1;
        }
        __init2() {
          this.noAnonFunctionType = false;
        }
        __init3() {
          this.tokens = [];
        }
        __init4() {
          this.scopes = [];
        }
        __init5() {
          this.pos = 0;
        }
        __init6() {
          this.type = _types.TokenType.eof;
        }
        __init7() {
          this.contextualKeyword = _keywords.ContextualKeyword.NONE;
        }
        __init8() {
          this.start = 0;
        }
        __init9() {
          this.end = 0;
        }
        __init10() {
          this.isType = false;
        }
        __init11() {
          this.scopeDepth = 0;
        }
        __init12() {
          this.error = null;
        }
        snapshot() {
          return new StateSnapshot(this.potentialArrowAt, this.noAnonFunctionType, this.tokens.length, this.scopes.length, this.pos, this.type, this.contextualKeyword, this.start, this.end, this.isType, this.scopeDepth, this.error);
        }
        restoreFromSnapshot(snapshot) {
          this.potentialArrowAt = snapshot.potentialArrowAt;
          this.noAnonFunctionType = snapshot.noAnonFunctionType;
          this.tokens.length = snapshot.tokensLength;
          this.scopes.length = snapshot.scopesLength;
          this.pos = snapshot.pos;
          this.type = snapshot.type;
          this.contextualKeyword = snapshot.contextualKeyword;
          this.start = snapshot.start;
          this.end = snapshot.end;
          this.isType = snapshot.isType;
          this.scopeDepth = snapshot.scopeDepth;
          this.error = snapshot.error;
        }
      };
      exports.default = State;
    }
  });

  // node_modules/sucrase/dist/parser/util/charcodes.js
  var require_charcodes = __commonJS({
    "node_modules/sucrase/dist/parser/util/charcodes.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var charCodes;
      (function(charCodes2) {
        const backSpace = 8;
        charCodes2[charCodes2["backSpace"] = backSpace] = "backSpace";
        const lineFeed = 10;
        charCodes2[charCodes2["lineFeed"] = lineFeed] = "lineFeed";
        const carriageReturn = 13;
        charCodes2[charCodes2["carriageReturn"] = carriageReturn] = "carriageReturn";
        const shiftOut = 14;
        charCodes2[charCodes2["shiftOut"] = shiftOut] = "shiftOut";
        const space = 32;
        charCodes2[charCodes2["space"] = space] = "space";
        const exclamationMark = 33;
        charCodes2[charCodes2["exclamationMark"] = exclamationMark] = "exclamationMark";
        const quotationMark = 34;
        charCodes2[charCodes2["quotationMark"] = quotationMark] = "quotationMark";
        const numberSign = 35;
        charCodes2[charCodes2["numberSign"] = numberSign] = "numberSign";
        const dollarSign = 36;
        charCodes2[charCodes2["dollarSign"] = dollarSign] = "dollarSign";
        const percentSign = 37;
        charCodes2[charCodes2["percentSign"] = percentSign] = "percentSign";
        const ampersand = 38;
        charCodes2[charCodes2["ampersand"] = ampersand] = "ampersand";
        const apostrophe = 39;
        charCodes2[charCodes2["apostrophe"] = apostrophe] = "apostrophe";
        const leftParenthesis = 40;
        charCodes2[charCodes2["leftParenthesis"] = leftParenthesis] = "leftParenthesis";
        const rightParenthesis = 41;
        charCodes2[charCodes2["rightParenthesis"] = rightParenthesis] = "rightParenthesis";
        const asterisk = 42;
        charCodes2[charCodes2["asterisk"] = asterisk] = "asterisk";
        const plusSign = 43;
        charCodes2[charCodes2["plusSign"] = plusSign] = "plusSign";
        const comma = 44;
        charCodes2[charCodes2["comma"] = comma] = "comma";
        const dash = 45;
        charCodes2[charCodes2["dash"] = dash] = "dash";
        const dot = 46;
        charCodes2[charCodes2["dot"] = dot] = "dot";
        const slash = 47;
        charCodes2[charCodes2["slash"] = slash] = "slash";
        const digit0 = 48;
        charCodes2[charCodes2["digit0"] = digit0] = "digit0";
        const digit1 = 49;
        charCodes2[charCodes2["digit1"] = digit1] = "digit1";
        const digit2 = 50;
        charCodes2[charCodes2["digit2"] = digit2] = "digit2";
        const digit3 = 51;
        charCodes2[charCodes2["digit3"] = digit3] = "digit3";
        const digit4 = 52;
        charCodes2[charCodes2["digit4"] = digit4] = "digit4";
        const digit5 = 53;
        charCodes2[charCodes2["digit5"] = digit5] = "digit5";
        const digit6 = 54;
        charCodes2[charCodes2["digit6"] = digit6] = "digit6";
        const digit7 = 55;
        charCodes2[charCodes2["digit7"] = digit7] = "digit7";
        const digit8 = 56;
        charCodes2[charCodes2["digit8"] = digit8] = "digit8";
        const digit9 = 57;
        charCodes2[charCodes2["digit9"] = digit9] = "digit9";
        const colon = 58;
        charCodes2[charCodes2["colon"] = colon] = "colon";
        const semicolon = 59;
        charCodes2[charCodes2["semicolon"] = semicolon] = "semicolon";
        const lessThan = 60;
        charCodes2[charCodes2["lessThan"] = lessThan] = "lessThan";
        const equalsTo = 61;
        charCodes2[charCodes2["equalsTo"] = equalsTo] = "equalsTo";
        const greaterThan = 62;
        charCodes2[charCodes2["greaterThan"] = greaterThan] = "greaterThan";
        const questionMark = 63;
        charCodes2[charCodes2["questionMark"] = questionMark] = "questionMark";
        const atSign = 64;
        charCodes2[charCodes2["atSign"] = atSign] = "atSign";
        const uppercaseA = 65;
        charCodes2[charCodes2["uppercaseA"] = uppercaseA] = "uppercaseA";
        const uppercaseB = 66;
        charCodes2[charCodes2["uppercaseB"] = uppercaseB] = "uppercaseB";
        const uppercaseC = 67;
        charCodes2[charCodes2["uppercaseC"] = uppercaseC] = "uppercaseC";
        const uppercaseD = 68;
        charCodes2[charCodes2["uppercaseD"] = uppercaseD] = "uppercaseD";
        const uppercaseE = 69;
        charCodes2[charCodes2["uppercaseE"] = uppercaseE] = "uppercaseE";
        const uppercaseF = 70;
        charCodes2[charCodes2["uppercaseF"] = uppercaseF] = "uppercaseF";
        const uppercaseG = 71;
        charCodes2[charCodes2["uppercaseG"] = uppercaseG] = "uppercaseG";
        const uppercaseH = 72;
        charCodes2[charCodes2["uppercaseH"] = uppercaseH] = "uppercaseH";
        const uppercaseI = 73;
        charCodes2[charCodes2["uppercaseI"] = uppercaseI] = "uppercaseI";
        const uppercaseJ = 74;
        charCodes2[charCodes2["uppercaseJ"] = uppercaseJ] = "uppercaseJ";
        const uppercaseK = 75;
        charCodes2[charCodes2["uppercaseK"] = uppercaseK] = "uppercaseK";
        const uppercaseL = 76;
        charCodes2[charCodes2["uppercaseL"] = uppercaseL] = "uppercaseL";
        const uppercaseM = 77;
        charCodes2[charCodes2["uppercaseM"] = uppercaseM] = "uppercaseM";
        const uppercaseN = 78;
        charCodes2[charCodes2["uppercaseN"] = uppercaseN] = "uppercaseN";
        const uppercaseO = 79;
        charCodes2[charCodes2["uppercaseO"] = uppercaseO] = "uppercaseO";
        const uppercaseP = 80;
        charCodes2[charCodes2["uppercaseP"] = uppercaseP] = "uppercaseP";
        const uppercaseQ = 81;
        charCodes2[charCodes2["uppercaseQ"] = uppercaseQ] = "uppercaseQ";
        const uppercaseR = 82;
        charCodes2[charCodes2["uppercaseR"] = uppercaseR] = "uppercaseR";
        const uppercaseS = 83;
        charCodes2[charCodes2["uppercaseS"] = uppercaseS] = "uppercaseS";
        const uppercaseT = 84;
        charCodes2[charCodes2["uppercaseT"] = uppercaseT] = "uppercaseT";
        const uppercaseU = 85;
        charCodes2[charCodes2["uppercaseU"] = uppercaseU] = "uppercaseU";
        const uppercaseV = 86;
        charCodes2[charCodes2["uppercaseV"] = uppercaseV] = "uppercaseV";
        const uppercaseW = 87;
        charCodes2[charCodes2["uppercaseW"] = uppercaseW] = "uppercaseW";
        const uppercaseX = 88;
        charCodes2[charCodes2["uppercaseX"] = uppercaseX] = "uppercaseX";
        const uppercaseY = 89;
        charCodes2[charCodes2["uppercaseY"] = uppercaseY] = "uppercaseY";
        const uppercaseZ = 90;
        charCodes2[charCodes2["uppercaseZ"] = uppercaseZ] = "uppercaseZ";
        const leftSquareBracket = 91;
        charCodes2[charCodes2["leftSquareBracket"] = leftSquareBracket] = "leftSquareBracket";
        const backslash = 92;
        charCodes2[charCodes2["backslash"] = backslash] = "backslash";
        const rightSquareBracket = 93;
        charCodes2[charCodes2["rightSquareBracket"] = rightSquareBracket] = "rightSquareBracket";
        const caret = 94;
        charCodes2[charCodes2["caret"] = caret] = "caret";
        const underscore = 95;
        charCodes2[charCodes2["underscore"] = underscore] = "underscore";
        const graveAccent = 96;
        charCodes2[charCodes2["graveAccent"] = graveAccent] = "graveAccent";
        const lowercaseA = 97;
        charCodes2[charCodes2["lowercaseA"] = lowercaseA] = "lowercaseA";
        const lowercaseB = 98;
        charCodes2[charCodes2["lowercaseB"] = lowercaseB] = "lowercaseB";
        const lowercaseC = 99;
        charCodes2[charCodes2["lowercaseC"] = lowercaseC] = "lowercaseC";
        const lowercaseD = 100;
        charCodes2[charCodes2["lowercaseD"] = lowercaseD] = "lowercaseD";
        const lowercaseE = 101;
        charCodes2[charCodes2["lowercaseE"] = lowercaseE] = "lowercaseE";
        const lowercaseF = 102;
        charCodes2[charCodes2["lowercaseF"] = lowercaseF] = "lowercaseF";
        const lowercaseG = 103;
        charCodes2[charCodes2["lowercaseG"] = lowercaseG] = "lowercaseG";
        const lowercaseH = 104;
        charCodes2[charCodes2["lowercaseH"] = lowercaseH] = "lowercaseH";
        const lowercaseI = 105;
        charCodes2[charCodes2["lowercaseI"] = lowercaseI] = "lowercaseI";
        const lowercaseJ = 106;
        charCodes2[charCodes2["lowercaseJ"] = lowercaseJ] = "lowercaseJ";
        const lowercaseK = 107;
        charCodes2[charCodes2["lowercaseK"] = lowercaseK] = "lowercaseK";
        const lowercaseL = 108;
        charCodes2[charCodes2["lowercaseL"] = lowercaseL] = "lowercaseL";
        const lowercaseM = 109;
        charCodes2[charCodes2["lowercaseM"] = lowercaseM] = "lowercaseM";
        const lowercaseN = 110;
        charCodes2[charCodes2["lowercaseN"] = lowercaseN] = "lowercaseN";
        const lowercaseO = 111;
        charCodes2[charCodes2["lowercaseO"] = lowercaseO] = "lowercaseO";
        const lowercaseP = 112;
        charCodes2[charCodes2["lowercaseP"] = lowercaseP] = "lowercaseP";
        const lowercaseQ = 113;
        charCodes2[charCodes2["lowercaseQ"] = lowercaseQ] = "lowercaseQ";
        const lowercaseR = 114;
        charCodes2[charCodes2["lowercaseR"] = lowercaseR] = "lowercaseR";
        const lowercaseS = 115;
        charCodes2[charCodes2["lowercaseS"] = lowercaseS] = "lowercaseS";
        const lowercaseT = 116;
        charCodes2[charCodes2["lowercaseT"] = lowercaseT] = "lowercaseT";
        const lowercaseU = 117;
        charCodes2[charCodes2["lowercaseU"] = lowercaseU] = "lowercaseU";
        const lowercaseV = 118;
        charCodes2[charCodes2["lowercaseV"] = lowercaseV] = "lowercaseV";
        const lowercaseW = 119;
        charCodes2[charCodes2["lowercaseW"] = lowercaseW] = "lowercaseW";
        const lowercaseX = 120;
        charCodes2[charCodes2["lowercaseX"] = lowercaseX] = "lowercaseX";
        const lowercaseY = 121;
        charCodes2[charCodes2["lowercaseY"] = lowercaseY] = "lowercaseY";
        const lowercaseZ = 122;
        charCodes2[charCodes2["lowercaseZ"] = lowercaseZ] = "lowercaseZ";
        const leftCurlyBrace = 123;
        charCodes2[charCodes2["leftCurlyBrace"] = leftCurlyBrace] = "leftCurlyBrace";
        const verticalBar = 124;
        charCodes2[charCodes2["verticalBar"] = verticalBar] = "verticalBar";
        const rightCurlyBrace = 125;
        charCodes2[charCodes2["rightCurlyBrace"] = rightCurlyBrace] = "rightCurlyBrace";
        const tilde = 126;
        charCodes2[charCodes2["tilde"] = tilde] = "tilde";
        const nonBreakingSpace = 160;
        charCodes2[charCodes2["nonBreakingSpace"] = nonBreakingSpace] = "nonBreakingSpace";
        const oghamSpaceMark = 5760;
        charCodes2[charCodes2["oghamSpaceMark"] = oghamSpaceMark] = "oghamSpaceMark";
        const lineSeparator = 8232;
        charCodes2[charCodes2["lineSeparator"] = lineSeparator] = "lineSeparator";
        const paragraphSeparator = 8233;
        charCodes2[charCodes2["paragraphSeparator"] = paragraphSeparator] = "paragraphSeparator";
      })(charCodes || (exports.charCodes = charCodes = {}));
      function isDigit(code) {
        return code >= charCodes.digit0 && code <= charCodes.digit9 || code >= charCodes.lowercaseA && code <= charCodes.lowercaseF || code >= charCodes.uppercaseA && code <= charCodes.uppercaseF;
      }
      exports.isDigit = isDigit;
    }
  });

  // node_modules/sucrase/dist/parser/traverser/base.js
  var require_base = __commonJS({
    "node_modules/sucrase/dist/parser/traverser/base.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : { default: obj };
      }
      var _state = require_state();
      var _state2 = _interopRequireDefault(_state);
      var _charcodes = require_charcodes();
      exports.isJSXEnabled;
      exports.isTypeScriptEnabled;
      exports.isFlowEnabled;
      exports.state;
      exports.input;
      exports.nextContextId;
      function getNextContextId() {
        return exports.nextContextId++;
      }
      exports.getNextContextId = getNextContextId;
      function augmentError(error) {
        if ("pos" in error) {
          const loc = locationForIndex(error.pos);
          error.message += ` (${loc.line}:${loc.column})`;
          error.loc = loc;
        }
        return error;
      }
      exports.augmentError = augmentError;
      var Loc = class {
        constructor(line, column) {
          this.line = line;
          this.column = column;
        }
      };
      exports.Loc = Loc;
      function locationForIndex(pos) {
        let line = 1;
        let column = 1;
        for (let i = 0; i < pos; i++) {
          if (exports.input.charCodeAt(i) === _charcodes.charCodes.lineFeed) {
            line++;
            column = 1;
          } else {
            column++;
          }
        }
        return new Loc(line, column);
      }
      exports.locationForIndex = locationForIndex;
      function initParser(inputCode, isJSXEnabledArg, isTypeScriptEnabledArg, isFlowEnabledArg) {
        exports.input = inputCode;
        exports.state = new (0, _state2.default)();
        exports.nextContextId = 1;
        exports.isJSXEnabled = isJSXEnabledArg;
        exports.isTypeScriptEnabled = isTypeScriptEnabledArg;
        exports.isFlowEnabled = isFlowEnabledArg;
      }
      exports.initParser = initParser;
    }
  });

  // node_modules/sucrase/dist/parser/traverser/util.js
  var require_util = __commonJS({
    "node_modules/sucrase/dist/parser/traverser/util.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var _index = require_tokenizer();
      var _types = require_types();
      var _charcodes = require_charcodes();
      var _base = require_base();
      function isContextual(contextualKeyword) {
        return _base.state.contextualKeyword === contextualKeyword;
      }
      exports.isContextual = isContextual;
      function isLookaheadContextual(contextualKeyword) {
        const l = _index.lookaheadTypeAndKeyword.call(void 0);
        return l.type === _types.TokenType.name && l.contextualKeyword === contextualKeyword;
      }
      exports.isLookaheadContextual = isLookaheadContextual;
      function eatContextual(contextualKeyword) {
        return _base.state.contextualKeyword === contextualKeyword && _index.eat.call(void 0, _types.TokenType.name);
      }
      exports.eatContextual = eatContextual;
      function expectContextual(contextualKeyword) {
        if (!eatContextual(contextualKeyword)) {
          unexpected();
        }
      }
      exports.expectContextual = expectContextual;
      function canInsertSemicolon() {
        return _index.match.call(void 0, _types.TokenType.eof) || _index.match.call(void 0, _types.TokenType.braceR) || hasPrecedingLineBreak();
      }
      exports.canInsertSemicolon = canInsertSemicolon;
      function hasPrecedingLineBreak() {
        const prevToken = _base.state.tokens[_base.state.tokens.length - 1];
        const lastTokEnd = prevToken ? prevToken.end : 0;
        for (let i = lastTokEnd; i < _base.state.start; i++) {
          const code = _base.input.charCodeAt(i);
          if (code === _charcodes.charCodes.lineFeed || code === _charcodes.charCodes.carriageReturn || code === 8232 || code === 8233) {
            return true;
          }
        }
        return false;
      }
      exports.hasPrecedingLineBreak = hasPrecedingLineBreak;
      function hasFollowingLineBreak() {
        const nextStart = _index.nextTokenStart.call(void 0);
        for (let i = _base.state.end; i < nextStart; i++) {
          const code = _base.input.charCodeAt(i);
          if (code === _charcodes.charCodes.lineFeed || code === _charcodes.charCodes.carriageReturn || code === 8232 || code === 8233) {
            return true;
          }
        }
        return false;
      }
      exports.hasFollowingLineBreak = hasFollowingLineBreak;
      function isLineTerminator() {
        return _index.eat.call(void 0, _types.TokenType.semi) || canInsertSemicolon();
      }
      exports.isLineTerminator = isLineTerminator;
      function semicolon() {
        if (!isLineTerminator()) {
          unexpected('Unexpected token, expected ";"');
        }
      }
      exports.semicolon = semicolon;
      function expect(type) {
        const matched = _index.eat.call(void 0, type);
        if (!matched) {
          unexpected(`Unexpected token, expected "${_types.formatTokenType.call(void 0, type)}"`);
        }
      }
      exports.expect = expect;
      function unexpected(message = "Unexpected token", pos = _base.state.start) {
        if (_base.state.error) {
          return;
        }
        const err = new SyntaxError(message);
        err.pos = pos;
        _base.state.error = err;
        _base.state.pos = _base.input.length;
        _index.finishToken.call(void 0, _types.TokenType.eof);
      }
      exports.unexpected = unexpected;
    }
  });

  // node_modules/sucrase/dist/parser/util/whitespace.js
  var require_whitespace = __commonJS({
    "node_modules/sucrase/dist/parser/util/whitespace.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var _charcodes = require_charcodes();
      var WHITESPACE_CHARS = [
        9,
        11,
        12,
        _charcodes.charCodes.space,
        _charcodes.charCodes.nonBreakingSpace,
        _charcodes.charCodes.oghamSpaceMark,
        8192,
        8193,
        8194,
        8195,
        8196,
        8197,
        8198,
        8199,
        8200,
        8201,
        8202,
        8239,
        8287,
        12288,
        65279
      ];
      exports.WHITESPACE_CHARS = WHITESPACE_CHARS;
      var skipWhiteSpace = /(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g;
      exports.skipWhiteSpace = skipWhiteSpace;
      var IS_WHITESPACE = new Uint8Array(65536);
      exports.IS_WHITESPACE = IS_WHITESPACE;
      for (const char of exports.WHITESPACE_CHARS) {
        exports.IS_WHITESPACE[char] = 1;
      }
    }
  });

  // node_modules/sucrase/dist/parser/util/identifier.js
  var require_identifier = __commonJS({
    "node_modules/sucrase/dist/parser/util/identifier.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var _charcodes = require_charcodes();
      var _whitespace = require_whitespace();
      function computeIsIdentifierChar(code) {
        if (code < 48)
          return code === 36;
        if (code < 58)
          return true;
        if (code < 65)
          return false;
        if (code < 91)
          return true;
        if (code < 97)
          return code === 95;
        if (code < 123)
          return true;
        if (code < 128)
          return false;
        throw new Error("Should not be called with non-ASCII char code.");
      }
      var IS_IDENTIFIER_CHAR = new Uint8Array(65536);
      exports.IS_IDENTIFIER_CHAR = IS_IDENTIFIER_CHAR;
      for (let i = 0; i < 128; i++) {
        exports.IS_IDENTIFIER_CHAR[i] = computeIsIdentifierChar(i) ? 1 : 0;
      }
      for (let i = 128; i < 65536; i++) {
        exports.IS_IDENTIFIER_CHAR[i] = 1;
      }
      for (const whitespaceChar of _whitespace.WHITESPACE_CHARS) {
        exports.IS_IDENTIFIER_CHAR[whitespaceChar] = 0;
      }
      exports.IS_IDENTIFIER_CHAR[8232] = 0;
      exports.IS_IDENTIFIER_CHAR[8233] = 0;
      var IS_IDENTIFIER_START = exports.IS_IDENTIFIER_CHAR.slice();
      exports.IS_IDENTIFIER_START = IS_IDENTIFIER_START;
      for (let numChar = _charcodes.charCodes.digit0; numChar <= _charcodes.charCodes.digit9; numChar++) {
        exports.IS_IDENTIFIER_START[numChar] = 0;
      }
    }
  });

  // node_modules/sucrase/dist/parser/tokenizer/readWordTree.js
  var require_readWordTree = __commonJS({
    "node_modules/sucrase/dist/parser/tokenizer/readWordTree.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var _keywords = require_keywords();
      var _types = require_types();
      var READ_WORD_TREE = new Int32Array([
        -1,
        27,
        594,
        729,
        1566,
        2187,
        2673,
        3294,
        -1,
        3510,
        -1,
        4428,
        4563,
        4644,
        4941,
        5319,
        5697,
        -1,
        6237,
        6696,
        7155,
        7587,
        7749,
        7911,
        -1,
        8127,
        -1,
        -1,
        -1,
        54,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        243,
        -1,
        -1,
        -1,
        486,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        81,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        108,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        135,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        162,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        189,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        216,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        _keywords.ContextualKeyword._abstract << 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        _keywords.ContextualKeyword._as << 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        270,
        -1,
        -1,
        -1,
        -1,
        -1,
        405,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        297,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        324,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        351,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        378,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        _keywords.ContextualKeyword._asserts << 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        432,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        459,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        _keywords.ContextualKeyword._async << 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        513,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        540,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        567,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        _keywords.ContextualKeyword._await << 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        621,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        648,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        675,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        702,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        (_types.TokenType._break << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        756,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        918,
        -1,
        -1,
        -1,
        1053,
        -1,
        -1,
        1161,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        783,
        837,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        810,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        (_types.TokenType._case << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        864,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        891,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        (_types.TokenType._catch << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        945,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        972,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        999,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        1026,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        _keywords.ContextualKeyword._checks << 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        1080,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        1107,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        1134,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        (_types.TokenType._class << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        1188,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        1215,
        1431,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        1242,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        (_types.TokenType._const << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        1269,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        1296,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        1323,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        1350,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        1377,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        1404,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        _keywords.ContextualKeyword._constructor << 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        1458,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        1485,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        1512,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        1539,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        (_types.TokenType._continue << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        1593,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        2160,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        1620,
        1782,
        -1,
        -1,
        1917,
        -1,
        -1,
        -1,
        -1,
        -1,
        2052,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        1647,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        1674,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        1701,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        1728,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        1755,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        (_types.TokenType._debugger << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        1809,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        1836,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        1863,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        1890,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        _keywords.ContextualKeyword._declare << 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        1944,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        1971,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        1998,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        2025,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        (_types.TokenType._default << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        2079,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        2106,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        2133,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        (_types.TokenType._delete << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        (_types.TokenType._do << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        2214,
        -1,
        2295,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        2376,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        2241,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        2268,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        (_types.TokenType._else << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        2322,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        2349,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        _keywords.ContextualKeyword._enum << 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        2403,
        -1,
        -1,
        -1,
        2538,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        2430,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        2457,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        2484,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        (_types.TokenType._export << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        2511,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        _keywords.ContextualKeyword._exports << 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        2565,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        2592,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        2619,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        2646,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        (_types.TokenType._extends << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        2700,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        2808,
        -1,
        -1,
        -1,
        -1,
        -1,
        2970,
        -1,
        -1,
        3024,
        -1,
        -1,
        3105,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        2727,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        2754,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        2781,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        (_types.TokenType._false << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        2835,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        2862,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        2889,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        2916,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        2943,
        -1,
        (_types.TokenType._finally << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        2997,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        (_types.TokenType._for << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        3051,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        3078,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        _keywords.ContextualKeyword._from << 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        3132,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        3159,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        3186,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        3213,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        3240,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        3267,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        (_types.TokenType._function << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        3321,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        3375,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        3348,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        _keywords.ContextualKeyword._get << 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        3402,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        3429,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        3456,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        3483,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        _keywords.ContextualKeyword._global << 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        3537,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        3564,
        3888,
        -1,
        -1,
        -1,
        -1,
        4401,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        (_types.TokenType._if << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        3591,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        3618,
        -1,
        -1,
        3807,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        3645,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        3672,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        3699,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        3726,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        3753,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        3780,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        _keywords.ContextualKeyword._implements << 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        3834,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        3861,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        (_types.TokenType._import << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        (_types.TokenType._in << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        3915,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        3996,
        4212,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        3942,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        3969,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        _keywords.ContextualKeyword._infer << 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        4023,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        4050,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        4077,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        4104,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        4131,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        4158,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        4185,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        (_types.TokenType._instanceof << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        4239,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        4266,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        4293,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        4320,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        4347,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        4374,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        _keywords.ContextualKeyword._interface << 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        _keywords.ContextualKeyword._is << 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        4455,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        4482,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        4509,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        4536,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        _keywords.ContextualKeyword._keyof << 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        4590,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        4617,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        (_types.TokenType._let << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        4671,
        -1,
        -1,
        -1,
        -1,
        -1,
        4806,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        4698,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        4725,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        4752,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        4779,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        _keywords.ContextualKeyword._mixins << 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        4833,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        4860,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        4887,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        4914,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        _keywords.ContextualKeyword._module << 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        4968,
        -1,
        -1,
        -1,
        5184,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        5238,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        4995,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        5022,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        5049,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        5076,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        5103,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        5130,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        5157,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        _keywords.ContextualKeyword._namespace << 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        5211,
        -1,
        -1,
        -1,
        (_types.TokenType._new << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        5265,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        5292,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        (_types.TokenType._null << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        5346,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        5373,
        -1,
        -1,
        -1,
        -1,
        -1,
        5508,
        -1,
        -1,
        -1,
        -1,
        _keywords.ContextualKeyword._of << 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        5400,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        5427,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        5454,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        5481,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        _keywords.ContextualKeyword._opaque << 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        5535,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        5562,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        5589,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        5616,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        5643,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        5670,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        _keywords.ContextualKeyword._override << 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        5724,
        -1,
        -1,
        6102,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        5751,
        -1,
        -1,
        -1,
        -1,
        -1,
        5886,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        5778,
        -1,
        -1,
        -1,
        -1,
        -1,
        5805,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        5832,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        5859,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        _keywords.ContextualKeyword._private << 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        5913,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        5940,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        6075,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        5967,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        5994,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        6021,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        6048,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        _keywords.ContextualKeyword._protected << 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        _keywords.ContextualKeyword._proto << 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        6129,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        6156,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        6183,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        6210,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        _keywords.ContextualKeyword._public << 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        6264,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        6291,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        6453,
        -1,
        -1,
        6588,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        6318,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        6345,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        6372,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        6399,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        6426,
        -1,
        _keywords.ContextualKeyword._readonly << 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        6480,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        6507,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        6534,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        6561,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        _keywords.ContextualKeyword._require << 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        6615,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        6642,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        6669,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        (_types.TokenType._return << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        6723,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        6777,
        6912,
        -1,
        7020,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        6750,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        _keywords.ContextualKeyword._set << 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        6804,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        6831,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        6858,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        6885,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        _keywords.ContextualKeyword._static << 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        6939,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        6966,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        6993,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        (_types.TokenType._super << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        7047,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        7074,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        7101,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        7128,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        (_types.TokenType._switch << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        7182,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        7344,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        7452,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        7209,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        7263,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        7236,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        (_types.TokenType._this << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        7290,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        7317,
        -1,
        -1,
        -1,
        (_types.TokenType._throw << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        7371,
        -1,
        -1,
        -1,
        7425,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        7398,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        (_types.TokenType._true << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        (_types.TokenType._try << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        7479,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        7506,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        _keywords.ContextualKeyword._type << 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        7533,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        7560,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        (_types.TokenType._typeof << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        7614,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        7641,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        7668,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        7695,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        7722,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        _keywords.ContextualKeyword._unique << 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        7776,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        7830,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        7803,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        (_types.TokenType._var << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        7857,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        7884,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        (_types.TokenType._void << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        7938,
        8046,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        7965,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        7992,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        8019,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        (_types.TokenType._while << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        8073,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        8100,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        (_types.TokenType._with << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        8154,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        8181,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        8208,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        8235,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        (_types.TokenType._yield << 1) + 1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1
      ]);
      exports.READ_WORD_TREE = READ_WORD_TREE;
    }
  });

  // node_modules/sucrase/dist/parser/tokenizer/readWord.js
  var require_readWord = __commonJS({
    "node_modules/sucrase/dist/parser/tokenizer/readWord.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var _base = require_base();
      var _charcodes = require_charcodes();
      var _identifier = require_identifier();
      var _index = require_tokenizer();
      var _readWordTree = require_readWordTree();
      var _types = require_types();
      function readWord() {
        let treePos = 0;
        let code = 0;
        let pos = _base.state.pos;
        while (pos < _base.input.length) {
          code = _base.input.charCodeAt(pos);
          if (code < _charcodes.charCodes.lowercaseA || code > _charcodes.charCodes.lowercaseZ) {
            break;
          }
          const next = _readWordTree.READ_WORD_TREE[treePos + (code - _charcodes.charCodes.lowercaseA) + 1];
          if (next === -1) {
            break;
          } else {
            treePos = next;
            pos++;
          }
        }
        const keywordValue = _readWordTree.READ_WORD_TREE[treePos];
        if (keywordValue > -1 && !_identifier.IS_IDENTIFIER_CHAR[code]) {
          _base.state.pos = pos;
          if (keywordValue & 1) {
            _index.finishToken.call(void 0, keywordValue >>> 1);
          } else {
            _index.finishToken.call(void 0, _types.TokenType.name, keywordValue >>> 1);
          }
          return;
        }
        while (pos < _base.input.length) {
          const ch = _base.input.charCodeAt(pos);
          if (_identifier.IS_IDENTIFIER_CHAR[ch]) {
            pos++;
          } else if (ch === _charcodes.charCodes.backslash) {
            pos += 2;
            if (_base.input.charCodeAt(pos) === _charcodes.charCodes.leftCurlyBrace) {
              while (pos < _base.input.length && _base.input.charCodeAt(pos) !== _charcodes.charCodes.rightCurlyBrace) {
                pos++;
              }
              pos++;
            }
          } else if (ch === _charcodes.charCodes.atSign && _base.input.charCodeAt(pos + 1) === _charcodes.charCodes.atSign) {
            pos += 2;
          } else {
            break;
          }
        }
        _base.state.pos = pos;
        _index.finishToken.call(void 0, _types.TokenType.name);
      }
      exports.default = readWord;
    }
  });

  // node_modules/sucrase/dist/parser/tokenizer/index.js
  var require_tokenizer = __commonJS({
    "node_modules/sucrase/dist/parser/tokenizer/index.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : { default: obj };
      }
      var _base = require_base();
      var _util = require_util();
      var _charcodes = require_charcodes();
      var _identifier = require_identifier();
      var _whitespace = require_whitespace();
      var _keywords = require_keywords();
      var _readWord = require_readWord();
      var _readWord2 = _interopRequireDefault(_readWord);
      var _types = require_types();
      var IdentifierRole;
      (function(IdentifierRole2) {
        const Access = 0;
        IdentifierRole2[IdentifierRole2["Access"] = Access] = "Access";
        const ExportAccess = Access + 1;
        IdentifierRole2[IdentifierRole2["ExportAccess"] = ExportAccess] = "ExportAccess";
        const TopLevelDeclaration = ExportAccess + 1;
        IdentifierRole2[IdentifierRole2["TopLevelDeclaration"] = TopLevelDeclaration] = "TopLevelDeclaration";
        const FunctionScopedDeclaration = TopLevelDeclaration + 1;
        IdentifierRole2[IdentifierRole2["FunctionScopedDeclaration"] = FunctionScopedDeclaration] = "FunctionScopedDeclaration";
        const BlockScopedDeclaration = FunctionScopedDeclaration + 1;
        IdentifierRole2[IdentifierRole2["BlockScopedDeclaration"] = BlockScopedDeclaration] = "BlockScopedDeclaration";
        const ObjectShorthandTopLevelDeclaration = BlockScopedDeclaration + 1;
        IdentifierRole2[IdentifierRole2["ObjectShorthandTopLevelDeclaration"] = ObjectShorthandTopLevelDeclaration] = "ObjectShorthandTopLevelDeclaration";
        const ObjectShorthandFunctionScopedDeclaration = ObjectShorthandTopLevelDeclaration + 1;
        IdentifierRole2[IdentifierRole2["ObjectShorthandFunctionScopedDeclaration"] = ObjectShorthandFunctionScopedDeclaration] = "ObjectShorthandFunctionScopedDeclaration";
        const ObjectShorthandBlockScopedDeclaration = ObjectShorthandFunctionScopedDeclaration + 1;
        IdentifierRole2[IdentifierRole2["ObjectShorthandBlockScopedDeclaration"] = ObjectShorthandBlockScopedDeclaration] = "ObjectShorthandBlockScopedDeclaration";
        const ObjectShorthand = ObjectShorthandBlockScopedDeclaration + 1;
        IdentifierRole2[IdentifierRole2["ObjectShorthand"] = ObjectShorthand] = "ObjectShorthand";
        const ImportDeclaration = ObjectShorthand + 1;
        IdentifierRole2[IdentifierRole2["ImportDeclaration"] = ImportDeclaration] = "ImportDeclaration";
        const ObjectKey = ImportDeclaration + 1;
        IdentifierRole2[IdentifierRole2["ObjectKey"] = ObjectKey] = "ObjectKey";
        const ImportAccess = ObjectKey + 1;
        IdentifierRole2[IdentifierRole2["ImportAccess"] = ImportAccess] = "ImportAccess";
      })(IdentifierRole || (exports.IdentifierRole = IdentifierRole = {}));
      function isDeclaration(token) {
        const role = token.identifierRole;
        return role === IdentifierRole.TopLevelDeclaration || role === IdentifierRole.FunctionScopedDeclaration || role === IdentifierRole.BlockScopedDeclaration || role === IdentifierRole.ObjectShorthandTopLevelDeclaration || role === IdentifierRole.ObjectShorthandFunctionScopedDeclaration || role === IdentifierRole.ObjectShorthandBlockScopedDeclaration;
      }
      exports.isDeclaration = isDeclaration;
      function isNonTopLevelDeclaration(token) {
        const role = token.identifierRole;
        return role === IdentifierRole.FunctionScopedDeclaration || role === IdentifierRole.BlockScopedDeclaration || role === IdentifierRole.ObjectShorthandFunctionScopedDeclaration || role === IdentifierRole.ObjectShorthandBlockScopedDeclaration;
      }
      exports.isNonTopLevelDeclaration = isNonTopLevelDeclaration;
      function isTopLevelDeclaration(token) {
        const role = token.identifierRole;
        return role === IdentifierRole.TopLevelDeclaration || role === IdentifierRole.ObjectShorthandTopLevelDeclaration || role === IdentifierRole.ImportDeclaration;
      }
      exports.isTopLevelDeclaration = isTopLevelDeclaration;
      function isBlockScopedDeclaration(token) {
        const role = token.identifierRole;
        return role === IdentifierRole.TopLevelDeclaration || role === IdentifierRole.BlockScopedDeclaration || role === IdentifierRole.ObjectShorthandTopLevelDeclaration || role === IdentifierRole.ObjectShorthandBlockScopedDeclaration;
      }
      exports.isBlockScopedDeclaration = isBlockScopedDeclaration;
      function isFunctionScopedDeclaration(token) {
        const role = token.identifierRole;
        return role === IdentifierRole.FunctionScopedDeclaration || role === IdentifierRole.ObjectShorthandFunctionScopedDeclaration;
      }
      exports.isFunctionScopedDeclaration = isFunctionScopedDeclaration;
      function isObjectShorthandDeclaration(token) {
        return token.identifierRole === IdentifierRole.ObjectShorthandTopLevelDeclaration || token.identifierRole === IdentifierRole.ObjectShorthandBlockScopedDeclaration || token.identifierRole === IdentifierRole.ObjectShorthandFunctionScopedDeclaration;
      }
      exports.isObjectShorthandDeclaration = isObjectShorthandDeclaration;
      var Token = class {
        constructor() {
          this.type = _base.state.type;
          this.contextualKeyword = _base.state.contextualKeyword;
          this.start = _base.state.start;
          this.end = _base.state.end;
          this.scopeDepth = _base.state.scopeDepth;
          this.isType = _base.state.isType;
          this.identifierRole = null;
          this.shadowsGlobal = false;
          this.isAsyncOperation = false;
          this.contextId = null;
          this.rhsEndIndex = null;
          this.isExpression = false;
          this.numNullishCoalesceStarts = 0;
          this.numNullishCoalesceEnds = 0;
          this.isOptionalChainStart = false;
          this.isOptionalChainEnd = false;
          this.subscriptStartIndex = null;
          this.nullishStartIndex = null;
        }
      };
      exports.Token = Token;
      function next() {
        _base.state.tokens.push(new Token());
        nextToken();
      }
      exports.next = next;
      function nextTemplateToken() {
        _base.state.tokens.push(new Token());
        _base.state.start = _base.state.pos;
        readTmplToken();
      }
      exports.nextTemplateToken = nextTemplateToken;
      function retokenizeSlashAsRegex() {
        if (_base.state.type === _types.TokenType.assign) {
          --_base.state.pos;
        }
        readRegexp();
      }
      exports.retokenizeSlashAsRegex = retokenizeSlashAsRegex;
      function pushTypeContext(existingTokensInType) {
        for (let i = _base.state.tokens.length - existingTokensInType; i < _base.state.tokens.length; i++) {
          _base.state.tokens[i].isType = true;
        }
        const oldIsType = _base.state.isType;
        _base.state.isType = true;
        return oldIsType;
      }
      exports.pushTypeContext = pushTypeContext;
      function popTypeContext(oldIsType) {
        _base.state.isType = oldIsType;
      }
      exports.popTypeContext = popTypeContext;
      function eat(type) {
        if (match(type)) {
          next();
          return true;
        } else {
          return false;
        }
      }
      exports.eat = eat;
      function eatTypeToken(tokenType) {
        const oldIsType = _base.state.isType;
        _base.state.isType = true;
        eat(tokenType);
        _base.state.isType = oldIsType;
      }
      exports.eatTypeToken = eatTypeToken;
      function match(type) {
        return _base.state.type === type;
      }
      exports.match = match;
      function lookaheadType() {
        const snapshot = _base.state.snapshot();
        next();
        const type = _base.state.type;
        _base.state.restoreFromSnapshot(snapshot);
        return type;
      }
      exports.lookaheadType = lookaheadType;
      var TypeAndKeyword = class {
        constructor(type, contextualKeyword) {
          this.type = type;
          this.contextualKeyword = contextualKeyword;
        }
      };
      exports.TypeAndKeyword = TypeAndKeyword;
      function lookaheadTypeAndKeyword() {
        const snapshot = _base.state.snapshot();
        next();
        const type = _base.state.type;
        const contextualKeyword = _base.state.contextualKeyword;
        _base.state.restoreFromSnapshot(snapshot);
        return new TypeAndKeyword(type, contextualKeyword);
      }
      exports.lookaheadTypeAndKeyword = lookaheadTypeAndKeyword;
      function nextTokenStart() {
        return nextTokenStartSince(_base.state.pos);
      }
      exports.nextTokenStart = nextTokenStart;
      function nextTokenStartSince(pos) {
        _whitespace.skipWhiteSpace.lastIndex = pos;
        const skip = _whitespace.skipWhiteSpace.exec(_base.input);
        return pos + skip[0].length;
      }
      exports.nextTokenStartSince = nextTokenStartSince;
      function lookaheadCharCode() {
        return _base.input.charCodeAt(nextTokenStart());
      }
      exports.lookaheadCharCode = lookaheadCharCode;
      function nextToken() {
        skipSpace();
        _base.state.start = _base.state.pos;
        if (_base.state.pos >= _base.input.length) {
          const tokens = _base.state.tokens;
          if (tokens.length >= 2 && tokens[tokens.length - 1].start >= _base.input.length && tokens[tokens.length - 2].start >= _base.input.length) {
            _util.unexpected.call(void 0, "Unexpectedly reached the end of input.");
          }
          finishToken(_types.TokenType.eof);
          return;
        }
        readToken(_base.input.charCodeAt(_base.state.pos));
      }
      exports.nextToken = nextToken;
      function readToken(code) {
        if (_identifier.IS_IDENTIFIER_START[code] || code === _charcodes.charCodes.backslash || code === _charcodes.charCodes.atSign && _base.input.charCodeAt(_base.state.pos + 1) === _charcodes.charCodes.atSign) {
          _readWord2.default.call(void 0);
        } else {
          getTokenFromCode(code);
        }
      }
      function skipBlockComment() {
        while (_base.input.charCodeAt(_base.state.pos) !== _charcodes.charCodes.asterisk || _base.input.charCodeAt(_base.state.pos + 1) !== _charcodes.charCodes.slash) {
          _base.state.pos++;
          if (_base.state.pos > _base.input.length) {
            _util.unexpected.call(void 0, "Unterminated comment", _base.state.pos - 2);
            return;
          }
        }
        _base.state.pos += 2;
      }
      function skipLineComment(startSkip) {
        let ch = _base.input.charCodeAt(_base.state.pos += startSkip);
        if (_base.state.pos < _base.input.length) {
          while (ch !== _charcodes.charCodes.lineFeed && ch !== _charcodes.charCodes.carriageReturn && ch !== _charcodes.charCodes.lineSeparator && ch !== _charcodes.charCodes.paragraphSeparator && ++_base.state.pos < _base.input.length) {
            ch = _base.input.charCodeAt(_base.state.pos);
          }
        }
      }
      exports.skipLineComment = skipLineComment;
      function skipSpace() {
        while (_base.state.pos < _base.input.length) {
          const ch = _base.input.charCodeAt(_base.state.pos);
          switch (ch) {
            case _charcodes.charCodes.carriageReturn:
              if (_base.input.charCodeAt(_base.state.pos + 1) === _charcodes.charCodes.lineFeed) {
                ++_base.state.pos;
              }
            case _charcodes.charCodes.lineFeed:
            case _charcodes.charCodes.lineSeparator:
            case _charcodes.charCodes.paragraphSeparator:
              ++_base.state.pos;
              break;
            case _charcodes.charCodes.slash:
              switch (_base.input.charCodeAt(_base.state.pos + 1)) {
                case _charcodes.charCodes.asterisk:
                  _base.state.pos += 2;
                  skipBlockComment();
                  break;
                case _charcodes.charCodes.slash:
                  skipLineComment(2);
                  break;
                default:
                  return;
              }
              break;
            default:
              if (_whitespace.IS_WHITESPACE[ch]) {
                ++_base.state.pos;
              } else {
                return;
              }
          }
        }
      }
      exports.skipSpace = skipSpace;
      function finishToken(type, contextualKeyword = _keywords.ContextualKeyword.NONE) {
        _base.state.end = _base.state.pos;
        _base.state.type = type;
        _base.state.contextualKeyword = contextualKeyword;
      }
      exports.finishToken = finishToken;
      function readToken_dot() {
        const nextChar = _base.input.charCodeAt(_base.state.pos + 1);
        if (nextChar >= _charcodes.charCodes.digit0 && nextChar <= _charcodes.charCodes.digit9) {
          readNumber(true);
          return;
        }
        if (nextChar === _charcodes.charCodes.dot && _base.input.charCodeAt(_base.state.pos + 2) === _charcodes.charCodes.dot) {
          _base.state.pos += 3;
          finishToken(_types.TokenType.ellipsis);
        } else {
          ++_base.state.pos;
          finishToken(_types.TokenType.dot);
        }
      }
      function readToken_slash() {
        const nextChar = _base.input.charCodeAt(_base.state.pos + 1);
        if (nextChar === _charcodes.charCodes.equalsTo) {
          finishOp(_types.TokenType.assign, 2);
        } else {
          finishOp(_types.TokenType.slash, 1);
        }
      }
      function readToken_mult_modulo(code) {
        let tokenType = code === _charcodes.charCodes.asterisk ? _types.TokenType.star : _types.TokenType.modulo;
        let width = 1;
        let nextChar = _base.input.charCodeAt(_base.state.pos + 1);
        if (code === _charcodes.charCodes.asterisk && nextChar === _charcodes.charCodes.asterisk) {
          width++;
          nextChar = _base.input.charCodeAt(_base.state.pos + 2);
          tokenType = _types.TokenType.exponent;
        }
        if (nextChar === _charcodes.charCodes.equalsTo && _base.input.charCodeAt(_base.state.pos + 2) !== _charcodes.charCodes.greaterThan) {
          width++;
          tokenType = _types.TokenType.assign;
        }
        finishOp(tokenType, width);
      }
      function readToken_pipe_amp(code) {
        const nextChar = _base.input.charCodeAt(_base.state.pos + 1);
        if (nextChar === code) {
          if (_base.input.charCodeAt(_base.state.pos + 2) === _charcodes.charCodes.equalsTo) {
            finishOp(_types.TokenType.assign, 3);
          } else {
            finishOp(code === _charcodes.charCodes.verticalBar ? _types.TokenType.logicalOR : _types.TokenType.logicalAND, 2);
          }
          return;
        }
        if (code === _charcodes.charCodes.verticalBar) {
          if (nextChar === _charcodes.charCodes.greaterThan) {
            finishOp(_types.TokenType.pipeline, 2);
            return;
          } else if (nextChar === _charcodes.charCodes.rightCurlyBrace && _base.isFlowEnabled) {
            finishOp(_types.TokenType.braceBarR, 2);
            return;
          }
        }
        if (nextChar === _charcodes.charCodes.equalsTo) {
          finishOp(_types.TokenType.assign, 2);
          return;
        }
        finishOp(code === _charcodes.charCodes.verticalBar ? _types.TokenType.bitwiseOR : _types.TokenType.bitwiseAND, 1);
      }
      function readToken_caret() {
        const nextChar = _base.input.charCodeAt(_base.state.pos + 1);
        if (nextChar === _charcodes.charCodes.equalsTo) {
          finishOp(_types.TokenType.assign, 2);
        } else {
          finishOp(_types.TokenType.bitwiseXOR, 1);
        }
      }
      function readToken_plus_min(code) {
        const nextChar = _base.input.charCodeAt(_base.state.pos + 1);
        if (nextChar === code) {
          finishOp(_types.TokenType.preIncDec, 2);
          return;
        }
        if (nextChar === _charcodes.charCodes.equalsTo) {
          finishOp(_types.TokenType.assign, 2);
        } else if (code === _charcodes.charCodes.plusSign) {
          finishOp(_types.TokenType.plus, 1);
        } else {
          finishOp(_types.TokenType.minus, 1);
        }
      }
      function readToken_lt_gt(code) {
        const nextChar = _base.input.charCodeAt(_base.state.pos + 1);
        if (nextChar === code) {
          const size = code === _charcodes.charCodes.greaterThan && _base.input.charCodeAt(_base.state.pos + 2) === _charcodes.charCodes.greaterThan ? 3 : 2;
          if (_base.input.charCodeAt(_base.state.pos + size) === _charcodes.charCodes.equalsTo) {
            finishOp(_types.TokenType.assign, size + 1);
            return;
          }
          if (code === _charcodes.charCodes.greaterThan && _base.state.isType) {
            finishOp(_types.TokenType.greaterThan, 1);
            return;
          }
          finishOp(_types.TokenType.bitShift, size);
          return;
        }
        if (nextChar === _charcodes.charCodes.equalsTo) {
          finishOp(_types.TokenType.relationalOrEqual, 2);
        } else if (code === _charcodes.charCodes.lessThan) {
          finishOp(_types.TokenType.lessThan, 1);
        } else {
          finishOp(_types.TokenType.greaterThan, 1);
        }
      }
      function readToken_eq_excl(code) {
        const nextChar = _base.input.charCodeAt(_base.state.pos + 1);
        if (nextChar === _charcodes.charCodes.equalsTo) {
          finishOp(_types.TokenType.equality, _base.input.charCodeAt(_base.state.pos + 2) === _charcodes.charCodes.equalsTo ? 3 : 2);
          return;
        }
        if (code === _charcodes.charCodes.equalsTo && nextChar === _charcodes.charCodes.greaterThan) {
          _base.state.pos += 2;
          finishToken(_types.TokenType.arrow);
          return;
        }
        finishOp(code === _charcodes.charCodes.equalsTo ? _types.TokenType.eq : _types.TokenType.bang, 1);
      }
      function readToken_question() {
        const nextChar = _base.input.charCodeAt(_base.state.pos + 1);
        const nextChar2 = _base.input.charCodeAt(_base.state.pos + 2);
        if (nextChar === _charcodes.charCodes.questionMark && !_base.state.isType) {
          if (nextChar2 === _charcodes.charCodes.equalsTo) {
            finishOp(_types.TokenType.assign, 3);
          } else {
            finishOp(_types.TokenType.nullishCoalescing, 2);
          }
        } else if (nextChar === _charcodes.charCodes.dot && !(nextChar2 >= _charcodes.charCodes.digit0 && nextChar2 <= _charcodes.charCodes.digit9)) {
          _base.state.pos += 2;
          finishToken(_types.TokenType.questionDot);
        } else {
          ++_base.state.pos;
          finishToken(_types.TokenType.question);
        }
      }
      function getTokenFromCode(code) {
        switch (code) {
          case _charcodes.charCodes.numberSign:
            ++_base.state.pos;
            finishToken(_types.TokenType.hash);
            return;
          case _charcodes.charCodes.dot:
            readToken_dot();
            return;
          case _charcodes.charCodes.leftParenthesis:
            ++_base.state.pos;
            finishToken(_types.TokenType.parenL);
            return;
          case _charcodes.charCodes.rightParenthesis:
            ++_base.state.pos;
            finishToken(_types.TokenType.parenR);
            return;
          case _charcodes.charCodes.semicolon:
            ++_base.state.pos;
            finishToken(_types.TokenType.semi);
            return;
          case _charcodes.charCodes.comma:
            ++_base.state.pos;
            finishToken(_types.TokenType.comma);
            return;
          case _charcodes.charCodes.leftSquareBracket:
            ++_base.state.pos;
            finishToken(_types.TokenType.bracketL);
            return;
          case _charcodes.charCodes.rightSquareBracket:
            ++_base.state.pos;
            finishToken(_types.TokenType.bracketR);
            return;
          case _charcodes.charCodes.leftCurlyBrace:
            if (_base.isFlowEnabled && _base.input.charCodeAt(_base.state.pos + 1) === _charcodes.charCodes.verticalBar) {
              finishOp(_types.TokenType.braceBarL, 2);
            } else {
              ++_base.state.pos;
              finishToken(_types.TokenType.braceL);
            }
            return;
          case _charcodes.charCodes.rightCurlyBrace:
            ++_base.state.pos;
            finishToken(_types.TokenType.braceR);
            return;
          case _charcodes.charCodes.colon:
            if (_base.input.charCodeAt(_base.state.pos + 1) === _charcodes.charCodes.colon) {
              finishOp(_types.TokenType.doubleColon, 2);
            } else {
              ++_base.state.pos;
              finishToken(_types.TokenType.colon);
            }
            return;
          case _charcodes.charCodes.questionMark:
            readToken_question();
            return;
          case _charcodes.charCodes.atSign:
            ++_base.state.pos;
            finishToken(_types.TokenType.at);
            return;
          case _charcodes.charCodes.graveAccent:
            ++_base.state.pos;
            finishToken(_types.TokenType.backQuote);
            return;
          case _charcodes.charCodes.digit0: {
            const nextChar = _base.input.charCodeAt(_base.state.pos + 1);
            if (nextChar === _charcodes.charCodes.lowercaseX || nextChar === _charcodes.charCodes.uppercaseX || nextChar === _charcodes.charCodes.lowercaseO || nextChar === _charcodes.charCodes.uppercaseO || nextChar === _charcodes.charCodes.lowercaseB || nextChar === _charcodes.charCodes.uppercaseB) {
              readRadixNumber();
              return;
            }
          }
          case _charcodes.charCodes.digit1:
          case _charcodes.charCodes.digit2:
          case _charcodes.charCodes.digit3:
          case _charcodes.charCodes.digit4:
          case _charcodes.charCodes.digit5:
          case _charcodes.charCodes.digit6:
          case _charcodes.charCodes.digit7:
          case _charcodes.charCodes.digit8:
          case _charcodes.charCodes.digit9:
            readNumber(false);
            return;
          case _charcodes.charCodes.quotationMark:
          case _charcodes.charCodes.apostrophe:
            readString(code);
            return;
          case _charcodes.charCodes.slash:
            readToken_slash();
            return;
          case _charcodes.charCodes.percentSign:
          case _charcodes.charCodes.asterisk:
            readToken_mult_modulo(code);
            return;
          case _charcodes.charCodes.verticalBar:
          case _charcodes.charCodes.ampersand:
            readToken_pipe_amp(code);
            return;
          case _charcodes.charCodes.caret:
            readToken_caret();
            return;
          case _charcodes.charCodes.plusSign:
          case _charcodes.charCodes.dash:
            readToken_plus_min(code);
            return;
          case _charcodes.charCodes.lessThan:
          case _charcodes.charCodes.greaterThan:
            readToken_lt_gt(code);
            return;
          case _charcodes.charCodes.equalsTo:
          case _charcodes.charCodes.exclamationMark:
            readToken_eq_excl(code);
            return;
          case _charcodes.charCodes.tilde:
            finishOp(_types.TokenType.tilde, 1);
            return;
          default:
            break;
        }
        _util.unexpected.call(void 0, `Unexpected character '${String.fromCharCode(code)}'`, _base.state.pos);
      }
      exports.getTokenFromCode = getTokenFromCode;
      function finishOp(type, size) {
        _base.state.pos += size;
        finishToken(type);
      }
      function readRegexp() {
        const start = _base.state.pos;
        let escaped = false;
        let inClass = false;
        for (; ; ) {
          if (_base.state.pos >= _base.input.length) {
            _util.unexpected.call(void 0, "Unterminated regular expression", start);
            return;
          }
          const code = _base.input.charCodeAt(_base.state.pos);
          if (escaped) {
            escaped = false;
          } else {
            if (code === _charcodes.charCodes.leftSquareBracket) {
              inClass = true;
            } else if (code === _charcodes.charCodes.rightSquareBracket && inClass) {
              inClass = false;
            } else if (code === _charcodes.charCodes.slash && !inClass) {
              break;
            }
            escaped = code === _charcodes.charCodes.backslash;
          }
          ++_base.state.pos;
        }
        ++_base.state.pos;
        skipWord();
        finishToken(_types.TokenType.regexp);
      }
      function readInt() {
        while (true) {
          const code = _base.input.charCodeAt(_base.state.pos);
          if (code >= _charcodes.charCodes.digit0 && code <= _charcodes.charCodes.digit9 || code >= _charcodes.charCodes.lowercaseA && code <= _charcodes.charCodes.lowercaseF || code >= _charcodes.charCodes.uppercaseA && code <= _charcodes.charCodes.uppercaseF || code === _charcodes.charCodes.underscore) {
            _base.state.pos++;
          } else {
            break;
          }
        }
      }
      function readRadixNumber() {
        let isBigInt = false;
        const start = _base.state.pos;
        _base.state.pos += 2;
        readInt();
        const nextChar = _base.input.charCodeAt(_base.state.pos);
        if (nextChar === _charcodes.charCodes.lowercaseN) {
          ++_base.state.pos;
          isBigInt = true;
        } else if (nextChar === _charcodes.charCodes.lowercaseM) {
          _util.unexpected.call(void 0, "Invalid decimal", start);
        }
        if (isBigInt) {
          finishToken(_types.TokenType.bigint);
          return;
        }
        finishToken(_types.TokenType.num);
      }
      function readNumber(startsWithDot) {
        let isBigInt = false;
        let isDecimal = false;
        if (!startsWithDot) {
          readInt();
        }
        let nextChar = _base.input.charCodeAt(_base.state.pos);
        if (nextChar === _charcodes.charCodes.dot) {
          ++_base.state.pos;
          readInt();
          nextChar = _base.input.charCodeAt(_base.state.pos);
        }
        if (nextChar === _charcodes.charCodes.uppercaseE || nextChar === _charcodes.charCodes.lowercaseE) {
          nextChar = _base.input.charCodeAt(++_base.state.pos);
          if (nextChar === _charcodes.charCodes.plusSign || nextChar === _charcodes.charCodes.dash) {
            ++_base.state.pos;
          }
          readInt();
          nextChar = _base.input.charCodeAt(_base.state.pos);
        }
        if (nextChar === _charcodes.charCodes.lowercaseN) {
          ++_base.state.pos;
          isBigInt = true;
        } else if (nextChar === _charcodes.charCodes.lowercaseM) {
          ++_base.state.pos;
          isDecimal = true;
        }
        if (isBigInt) {
          finishToken(_types.TokenType.bigint);
          return;
        }
        if (isDecimal) {
          finishToken(_types.TokenType.decimal);
          return;
        }
        finishToken(_types.TokenType.num);
      }
      function readString(quote) {
        _base.state.pos++;
        for (; ; ) {
          if (_base.state.pos >= _base.input.length) {
            _util.unexpected.call(void 0, "Unterminated string constant");
            return;
          }
          const ch = _base.input.charCodeAt(_base.state.pos);
          if (ch === _charcodes.charCodes.backslash) {
            _base.state.pos++;
          } else if (ch === quote) {
            break;
          }
          _base.state.pos++;
        }
        _base.state.pos++;
        finishToken(_types.TokenType.string);
      }
      function readTmplToken() {
        for (; ; ) {
          if (_base.state.pos >= _base.input.length) {
            _util.unexpected.call(void 0, "Unterminated template");
            return;
          }
          const ch = _base.input.charCodeAt(_base.state.pos);
          if (ch === _charcodes.charCodes.graveAccent || ch === _charcodes.charCodes.dollarSign && _base.input.charCodeAt(_base.state.pos + 1) === _charcodes.charCodes.leftCurlyBrace) {
            if (_base.state.pos === _base.state.start && match(_types.TokenType.template)) {
              if (ch === _charcodes.charCodes.dollarSign) {
                _base.state.pos += 2;
                finishToken(_types.TokenType.dollarBraceL);
                return;
              } else {
                ++_base.state.pos;
                finishToken(_types.TokenType.backQuote);
                return;
              }
            }
            finishToken(_types.TokenType.template);
            return;
          }
          if (ch === _charcodes.charCodes.backslash) {
            _base.state.pos++;
          }
          _base.state.pos++;
        }
      }
      function skipWord() {
        while (_base.state.pos < _base.input.length) {
          const ch = _base.input.charCodeAt(_base.state.pos);
          if (_identifier.IS_IDENTIFIER_CHAR[ch]) {
            _base.state.pos++;
          } else if (ch === _charcodes.charCodes.backslash) {
            _base.state.pos += 2;
            if (_base.input.charCodeAt(_base.state.pos) === _charcodes.charCodes.leftCurlyBrace) {
              while (_base.state.pos < _base.input.length && _base.input.charCodeAt(_base.state.pos) !== _charcodes.charCodes.rightCurlyBrace) {
                _base.state.pos++;
              }
              _base.state.pos++;
            }
          } else {
            break;
          }
        }
      }
      exports.skipWord = skipWord;
    }
  });

  // node_modules/sucrase/dist/parser/plugins/jsx/xhtml.js
  var require_xhtml = __commonJS({
    "node_modules/sucrase/dist/parser/plugins/jsx/xhtml.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var entities = {
        quot: '"',
        amp: "&",
        apos: "'",
        lt: "<",
        gt: ">",
        nbsp: "\xA0",
        iexcl: "\xA1",
        cent: "\xA2",
        pound: "\xA3",
        curren: "\xA4",
        yen: "\xA5",
        brvbar: "\xA6",
        sect: "\xA7",
        uml: "\xA8",
        copy: "\xA9",
        ordf: "\xAA",
        laquo: "\xAB",
        not: "\xAC",
        shy: "\xAD",
        reg: "\xAE",
        macr: "\xAF",
        deg: "\xB0",
        plusmn: "\xB1",
        sup2: "\xB2",
        sup3: "\xB3",
        acute: "\xB4",
        micro: "\xB5",
        para: "\xB6",
        middot: "\xB7",
        cedil: "\xB8",
        sup1: "\xB9",
        ordm: "\xBA",
        raquo: "\xBB",
        frac14: "\xBC",
        frac12: "\xBD",
        frac34: "\xBE",
        iquest: "\xBF",
        Agrave: "\xC0",
        Aacute: "\xC1",
        Acirc: "\xC2",
        Atilde: "\xC3",
        Auml: "\xC4",
        Aring: "\xC5",
        AElig: "\xC6",
        Ccedil: "\xC7",
        Egrave: "\xC8",
        Eacute: "\xC9",
        Ecirc: "\xCA",
        Euml: "\xCB",
        Igrave: "\xCC",
        Iacute: "\xCD",
        Icirc: "\xCE",
        Iuml: "\xCF",
        ETH: "\xD0",
        Ntilde: "\xD1",
        Ograve: "\xD2",
        Oacute: "\xD3",
        Ocirc: "\xD4",
        Otilde: "\xD5",
        Ouml: "\xD6",
        times: "\xD7",
        Oslash: "\xD8",
        Ugrave: "\xD9",
        Uacute: "\xDA",
        Ucirc: "\xDB",
        Uuml: "\xDC",
        Yacute: "\xDD",
        THORN: "\xDE",
        szlig: "\xDF",
        agrave: "\xE0",
        aacute: "\xE1",
        acirc: "\xE2",
        atilde: "\xE3",
        auml: "\xE4",
        aring: "\xE5",
        aelig: "\xE6",
        ccedil: "\xE7",
        egrave: "\xE8",
        eacute: "\xE9",
        ecirc: "\xEA",
        euml: "\xEB",
        igrave: "\xEC",
        iacute: "\xED",
        icirc: "\xEE",
        iuml: "\xEF",
        eth: "\xF0",
        ntilde: "\xF1",
        ograve: "\xF2",
        oacute: "\xF3",
        ocirc: "\xF4",
        otilde: "\xF5",
        ouml: "\xF6",
        divide: "\xF7",
        oslash: "\xF8",
        ugrave: "\xF9",
        uacute: "\xFA",
        ucirc: "\xFB",
        uuml: "\xFC",
        yacute: "\xFD",
        thorn: "\xFE",
        yuml: "\xFF",
        OElig: "\u0152",
        oelig: "\u0153",
        Scaron: "\u0160",
        scaron: "\u0161",
        Yuml: "\u0178",
        fnof: "\u0192",
        circ: "\u02C6",
        tilde: "\u02DC",
        Alpha: "\u0391",
        Beta: "\u0392",
        Gamma: "\u0393",
        Delta: "\u0394",
        Epsilon: "\u0395",
        Zeta: "\u0396",
        Eta: "\u0397",
        Theta: "\u0398",
        Iota: "\u0399",
        Kappa: "\u039A",
        Lambda: "\u039B",
        Mu: "\u039C",
        Nu: "\u039D",
        Xi: "\u039E",
        Omicron: "\u039F",
        Pi: "\u03A0",
        Rho: "\u03A1",
        Sigma: "\u03A3",
        Tau: "\u03A4",
        Upsilon: "\u03A5",
        Phi: "\u03A6",
        Chi: "\u03A7",
        Psi: "\u03A8",
        Omega: "\u03A9",
        alpha: "\u03B1",
        beta: "\u03B2",
        gamma: "\u03B3",
        delta: "\u03B4",
        epsilon: "\u03B5",
        zeta: "\u03B6",
        eta: "\u03B7",
        theta: "\u03B8",
        iota: "\u03B9",
        kappa: "\u03BA",
        lambda: "\u03BB",
        mu: "\u03BC",
        nu: "\u03BD",
        xi: "\u03BE",
        omicron: "\u03BF",
        pi: "\u03C0",
        rho: "\u03C1",
        sigmaf: "\u03C2",
        sigma: "\u03C3",
        tau: "\u03C4",
        upsilon: "\u03C5",
        phi: "\u03C6",
        chi: "\u03C7",
        psi: "\u03C8",
        omega: "\u03C9",
        thetasym: "\u03D1",
        upsih: "\u03D2",
        piv: "\u03D6",
        ensp: "\u2002",
        emsp: "\u2003",
        thinsp: "\u2009",
        zwnj: "\u200C",
        zwj: "\u200D",
        lrm: "\u200E",
        rlm: "\u200F",
        ndash: "\u2013",
        mdash: "\u2014",
        lsquo: "\u2018",
        rsquo: "\u2019",
        sbquo: "\u201A",
        ldquo: "\u201C",
        rdquo: "\u201D",
        bdquo: "\u201E",
        dagger: "\u2020",
        Dagger: "\u2021",
        bull: "\u2022",
        hellip: "\u2026",
        permil: "\u2030",
        prime: "\u2032",
        Prime: "\u2033",
        lsaquo: "\u2039",
        rsaquo: "\u203A",
        oline: "\u203E",
        frasl: "\u2044",
        euro: "\u20AC",
        image: "\u2111",
        weierp: "\u2118",
        real: "\u211C",
        trade: "\u2122",
        alefsym: "\u2135",
        larr: "\u2190",
        uarr: "\u2191",
        rarr: "\u2192",
        darr: "\u2193",
        harr: "\u2194",
        crarr: "\u21B5",
        lArr: "\u21D0",
        uArr: "\u21D1",
        rArr: "\u21D2",
        dArr: "\u21D3",
        hArr: "\u21D4",
        forall: "\u2200",
        part: "\u2202",
        exist: "\u2203",
        empty: "\u2205",
        nabla: "\u2207",
        isin: "\u2208",
        notin: "\u2209",
        ni: "\u220B",
        prod: "\u220F",
        sum: "\u2211",
        minus: "\u2212",
        lowast: "\u2217",
        radic: "\u221A",
        prop: "\u221D",
        infin: "\u221E",
        ang: "\u2220",
        and: "\u2227",
        or: "\u2228",
        cap: "\u2229",
        cup: "\u222A",
        int: "\u222B",
        there4: "\u2234",
        sim: "\u223C",
        cong: "\u2245",
        asymp: "\u2248",
        ne: "\u2260",
        equiv: "\u2261",
        le: "\u2264",
        ge: "\u2265",
        sub: "\u2282",
        sup: "\u2283",
        nsub: "\u2284",
        sube: "\u2286",
        supe: "\u2287",
        oplus: "\u2295",
        otimes: "\u2297",
        perp: "\u22A5",
        sdot: "\u22C5",
        lceil: "\u2308",
        rceil: "\u2309",
        lfloor: "\u230A",
        rfloor: "\u230B",
        lang: "\u2329",
        rang: "\u232A",
        loz: "\u25CA",
        spades: "\u2660",
        clubs: "\u2663",
        hearts: "\u2665",
        diams: "\u2666"
      };
      exports.default = entities;
    }
  });

  // node_modules/sucrase/dist/util/getJSXPragmaInfo.js
  var require_getJSXPragmaInfo = __commonJS({
    "node_modules/sucrase/dist/util/getJSXPragmaInfo.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      function getJSXPragmaInfo(options) {
        const [base, suffix] = splitPragma(options.jsxPragma || "React.createElement");
        const [fragmentBase, fragmentSuffix] = splitPragma(options.jsxFragmentPragma || "React.Fragment");
        return { base, suffix, fragmentBase, fragmentSuffix };
      }
      exports.default = getJSXPragmaInfo;
      function splitPragma(pragma) {
        let dotIndex = pragma.indexOf(".");
        if (dotIndex === -1) {
          dotIndex = pragma.length;
        }
        return [pragma.slice(0, dotIndex), pragma.slice(dotIndex)];
      }
    }
  });

  // node_modules/sucrase/dist/transformers/Transformer.js
  var require_Transformer = __commonJS({
    "node_modules/sucrase/dist/transformers/Transformer.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var Transformer = class {
        getPrefixCode() {
          return "";
        }
        getHoistedCode() {
          return "";
        }
        getSuffixCode() {
          return "";
        }
      };
      exports.default = Transformer;
    }
  });

  // node_modules/sucrase/dist/transformers/JSXTransformer.js
  var require_JSXTransformer = __commonJS({
    "node_modules/sucrase/dist/transformers/JSXTransformer.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : { default: obj };
      }
      var _xhtml = require_xhtml();
      var _xhtml2 = _interopRequireDefault(_xhtml);
      var _types = require_types();
      var _charcodes = require_charcodes();
      var _getJSXPragmaInfo = require_getJSXPragmaInfo();
      var _getJSXPragmaInfo2 = _interopRequireDefault(_getJSXPragmaInfo);
      var _Transformer = require_Transformer();
      var _Transformer2 = _interopRequireDefault(_Transformer);
      var HEX_NUMBER = /^[\da-fA-F]+$/;
      var DECIMAL_NUMBER = /^\d+$/;
      var JSXTransformer = class extends _Transformer2.default {
        __init() {
          this.lastLineNumber = 1;
        }
        __init2() {
          this.lastIndex = 0;
        }
        __init3() {
          this.filenameVarName = null;
        }
        constructor(rootTransformer, tokens, importProcessor, nameManager, options) {
          super();
          this.rootTransformer = rootTransformer;
          this.tokens = tokens;
          this.importProcessor = importProcessor;
          this.nameManager = nameManager;
          this.options = options;
          JSXTransformer.prototype.__init.call(this);
          JSXTransformer.prototype.__init2.call(this);
          JSXTransformer.prototype.__init3.call(this);
          ;
          this.jsxPragmaInfo = _getJSXPragmaInfo2.default.call(void 0, options);
        }
        process() {
          if (this.tokens.matches1(_types.TokenType.jsxTagStart)) {
            this.processJSXTag();
            return true;
          }
          return false;
        }
        getPrefixCode() {
          if (this.filenameVarName) {
            return `const ${this.filenameVarName} = ${JSON.stringify(this.options.filePath || "")};`;
          } else {
            return "";
          }
        }
        getLineNumberForIndex(index) {
          const code = this.tokens.code;
          while (this.lastIndex < index && this.lastIndex < code.length) {
            if (code[this.lastIndex] === "\n") {
              this.lastLineNumber++;
            }
            this.lastIndex++;
          }
          return this.lastLineNumber;
        }
        getFilenameVarName() {
          if (!this.filenameVarName) {
            this.filenameVarName = this.nameManager.claimFreeName("_jsxFileName");
          }
          return this.filenameVarName;
        }
        processProps(firstTokenStart) {
          const lineNumber = this.getLineNumberForIndex(firstTokenStart);
          const devProps = this.options.production ? "" : `__self: this, __source: {fileName: ${this.getFilenameVarName()}, lineNumber: ${lineNumber}}`;
          if (!this.tokens.matches1(_types.TokenType.jsxName) && !this.tokens.matches1(_types.TokenType.braceL)) {
            if (devProps) {
              this.tokens.appendCode(`, {${devProps}}`);
            } else {
              this.tokens.appendCode(`, null`);
            }
            return;
          }
          this.tokens.appendCode(`, {`);
          while (true) {
            if (this.tokens.matches2(_types.TokenType.jsxName, _types.TokenType.eq)) {
              this.processPropKeyName();
              this.tokens.replaceToken(": ");
              if (this.tokens.matches1(_types.TokenType.braceL)) {
                this.tokens.replaceToken("");
                this.rootTransformer.processBalancedCode();
                this.tokens.replaceToken("");
              } else if (this.tokens.matches1(_types.TokenType.jsxTagStart)) {
                this.processJSXTag();
              } else {
                this.processStringPropValue();
              }
            } else if (this.tokens.matches1(_types.TokenType.jsxName)) {
              this.processPropKeyName();
              this.tokens.appendCode(": true");
            } else if (this.tokens.matches1(_types.TokenType.braceL)) {
              this.tokens.replaceToken("");
              this.rootTransformer.processBalancedCode();
              this.tokens.replaceToken("");
            } else {
              break;
            }
            this.tokens.appendCode(",");
          }
          if (devProps) {
            this.tokens.appendCode(` ${devProps}}`);
          } else {
            this.tokens.appendCode("}");
          }
        }
        processPropKeyName() {
          const keyName = this.tokens.identifierName();
          if (keyName.includes("-")) {
            this.tokens.replaceToken(`'${keyName}'`);
          } else {
            this.tokens.copyToken();
          }
        }
        processStringPropValue() {
          const token = this.tokens.currentToken();
          const valueCode = this.tokens.code.slice(token.start + 1, token.end - 1);
          const replacementCode = formatJSXTextReplacement(valueCode);
          const literalCode = formatJSXStringValueLiteral(valueCode);
          this.tokens.replaceToken(literalCode + replacementCode);
        }
        processTagIntro() {
          let introEnd = this.tokens.currentIndex() + 1;
          while (this.tokens.tokens[introEnd].isType || !this.tokens.matches2AtIndex(introEnd - 1, _types.TokenType.jsxName, _types.TokenType.jsxName) && !this.tokens.matches2AtIndex(introEnd - 1, _types.TokenType.greaterThan, _types.TokenType.jsxName) && !this.tokens.matches1AtIndex(introEnd, _types.TokenType.braceL) && !this.tokens.matches1AtIndex(introEnd, _types.TokenType.jsxTagEnd) && !this.tokens.matches2AtIndex(introEnd, _types.TokenType.slash, _types.TokenType.jsxTagEnd)) {
            introEnd++;
          }
          if (introEnd === this.tokens.currentIndex() + 1) {
            const tagName = this.tokens.identifierName();
            if (startsWithLowerCase(tagName)) {
              this.tokens.replaceToken(`'${tagName}'`);
            }
          }
          while (this.tokens.currentIndex() < introEnd) {
            this.rootTransformer.processToken();
          }
        }
        processChildren() {
          while (true) {
            if (this.tokens.matches2(_types.TokenType.jsxTagStart, _types.TokenType.slash)) {
              return;
            }
            if (this.tokens.matches1(_types.TokenType.braceL)) {
              if (this.tokens.matches2(_types.TokenType.braceL, _types.TokenType.braceR)) {
                this.tokens.replaceToken("");
                this.tokens.replaceToken("");
              } else {
                this.tokens.replaceToken(", ");
                this.rootTransformer.processBalancedCode();
                this.tokens.replaceToken("");
              }
            } else if (this.tokens.matches1(_types.TokenType.jsxTagStart)) {
              this.tokens.appendCode(", ");
              this.processJSXTag();
            } else if (this.tokens.matches1(_types.TokenType.jsxText)) {
              this.processChildTextElement();
            } else {
              throw new Error("Unexpected token when processing JSX children.");
            }
          }
        }
        processChildTextElement() {
          const token = this.tokens.currentToken();
          const valueCode = this.tokens.code.slice(token.start, token.end);
          const replacementCode = formatJSXTextReplacement(valueCode);
          const literalCode = formatJSXTextLiteral(valueCode);
          if (literalCode === '""') {
            this.tokens.replaceToken(replacementCode);
          } else {
            this.tokens.replaceToken(`, ${literalCode}${replacementCode}`);
          }
        }
        processJSXTag() {
          const { jsxPragmaInfo } = this;
          const resolvedPragmaBaseName = this.importProcessor ? this.importProcessor.getIdentifierReplacement(jsxPragmaInfo.base) || jsxPragmaInfo.base : jsxPragmaInfo.base;
          const firstTokenStart = this.tokens.currentToken().start;
          this.tokens.replaceToken(`${resolvedPragmaBaseName}${jsxPragmaInfo.suffix}(`);
          if (this.tokens.matches1(_types.TokenType.jsxTagEnd)) {
            const resolvedFragmentPragmaBaseName = this.importProcessor ? this.importProcessor.getIdentifierReplacement(jsxPragmaInfo.fragmentBase) || jsxPragmaInfo.fragmentBase : jsxPragmaInfo.fragmentBase;
            this.tokens.replaceToken(`${resolvedFragmentPragmaBaseName}${jsxPragmaInfo.fragmentSuffix}, null`);
            this.processChildren();
            while (!this.tokens.matches1(_types.TokenType.jsxTagEnd)) {
              this.tokens.replaceToken("");
            }
            this.tokens.replaceToken(")");
          } else {
            this.processTagIntro();
            this.processProps(firstTokenStart);
            if (this.tokens.matches2(_types.TokenType.slash, _types.TokenType.jsxTagEnd)) {
              this.tokens.replaceToken("");
              this.tokens.replaceToken(")");
            } else if (this.tokens.matches1(_types.TokenType.jsxTagEnd)) {
              this.tokens.replaceToken("");
              this.processChildren();
              while (!this.tokens.matches1(_types.TokenType.jsxTagEnd)) {
                this.tokens.replaceToken("");
              }
              this.tokens.replaceToken(")");
            } else {
              throw new Error("Expected either /> or > at the end of the tag.");
            }
          }
        }
      };
      exports.default = JSXTransformer;
      function startsWithLowerCase(s) {
        const firstChar = s.charCodeAt(0);
        return firstChar >= _charcodes.charCodes.lowercaseA && firstChar <= _charcodes.charCodes.lowercaseZ;
      }
      exports.startsWithLowerCase = startsWithLowerCase;
      function formatJSXTextLiteral(text) {
        let result = "";
        let whitespace = "";
        let isInInitialLineWhitespace = false;
        let seenNonWhitespace = false;
        for (let i = 0; i < text.length; i++) {
          const c = text[i];
          if (c === " " || c === "	" || c === "\r") {
            if (!isInInitialLineWhitespace) {
              whitespace += c;
            }
          } else if (c === "\n") {
            whitespace = "";
            isInInitialLineWhitespace = true;
          } else {
            if (seenNonWhitespace && isInInitialLineWhitespace) {
              result += " ";
            }
            result += whitespace;
            whitespace = "";
            if (c === "&") {
              const { entity, newI } = processEntity(text, i + 1);
              i = newI - 1;
              result += entity;
            } else {
              result += c;
            }
            seenNonWhitespace = true;
            isInInitialLineWhitespace = false;
          }
        }
        if (!isInInitialLineWhitespace) {
          result += whitespace;
        }
        return JSON.stringify(result);
      }
      function formatJSXTextReplacement(text) {
        let numNewlines = 0;
        let numSpaces = 0;
        for (const c of text) {
          if (c === "\n") {
            numNewlines++;
            numSpaces = 0;
          } else if (c === " ") {
            numSpaces++;
          }
        }
        return "\n".repeat(numNewlines) + " ".repeat(numSpaces);
      }
      function formatJSXStringValueLiteral(text) {
        let result = "";
        for (let i = 0; i < text.length; i++) {
          const c = text[i];
          if (c === "\n") {
            if (/\s/.test(text[i + 1])) {
              result += " ";
              while (i < text.length && /\s/.test(text[i + 1])) {
                i++;
              }
            } else {
              result += "\n";
            }
          } else if (c === "&") {
            const { entity, newI } = processEntity(text, i + 1);
            result += entity;
            i = newI - 1;
          } else {
            result += c;
          }
        }
        return JSON.stringify(result);
      }
      function processEntity(text, indexAfterAmpersand) {
        let str = "";
        let count = 0;
        let entity;
        let i = indexAfterAmpersand;
        while (i < text.length && count++ < 10) {
          const ch = text[i];
          i++;
          if (ch === ";") {
            if (str[0] === "#") {
              if (str[1] === "x") {
                str = str.substr(2);
                if (HEX_NUMBER.test(str)) {
                  entity = String.fromCodePoint(parseInt(str, 16));
                }
              } else {
                str = str.substr(1);
                if (DECIMAL_NUMBER.test(str)) {
                  entity = String.fromCodePoint(parseInt(str, 10));
                }
              }
            } else {
              entity = _xhtml2.default[str];
            }
            break;
          }
          str += ch;
        }
        if (!entity) {
          return { entity: "&", newI: indexAfterAmpersand };
        }
        return { entity, newI: i };
      }
    }
  });

  // node_modules/sucrase/dist/util/getNonTypeIdentifiers.js
  var require_getNonTypeIdentifiers = __commonJS({
    "node_modules/sucrase/dist/util/getNonTypeIdentifiers.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : { default: obj };
      }
      var _tokenizer = require_tokenizer();
      var _types = require_types();
      var _JSXTransformer = require_JSXTransformer();
      var _getJSXPragmaInfo = require_getJSXPragmaInfo();
      var _getJSXPragmaInfo2 = _interopRequireDefault(_getJSXPragmaInfo);
      function getNonTypeIdentifiers(tokens, options) {
        const jsxPragmaInfo = _getJSXPragmaInfo2.default.call(void 0, options);
        const nonTypeIdentifiers = new Set();
        for (let i = 0; i < tokens.tokens.length; i++) {
          const token = tokens.tokens[i];
          if (token.type === _types.TokenType.name && !token.isType && (token.identifierRole === _tokenizer.IdentifierRole.Access || token.identifierRole === _tokenizer.IdentifierRole.ObjectShorthand || token.identifierRole === _tokenizer.IdentifierRole.ExportAccess) && !token.shadowsGlobal) {
            nonTypeIdentifiers.add(tokens.identifierNameForToken(token));
          }
          if (token.type === _types.TokenType.jsxTagStart) {
            nonTypeIdentifiers.add(jsxPragmaInfo.base);
          }
          if (token.type === _types.TokenType.jsxTagStart && i + 1 < tokens.tokens.length && tokens.tokens[i + 1].type === _types.TokenType.jsxTagEnd) {
            nonTypeIdentifiers.add(jsxPragmaInfo.base);
            nonTypeIdentifiers.add(jsxPragmaInfo.fragmentBase);
          }
          if (token.type === _types.TokenType.jsxName && token.identifierRole === _tokenizer.IdentifierRole.Access) {
            const identifierName = tokens.identifierNameForToken(token);
            if (!_JSXTransformer.startsWithLowerCase.call(void 0, identifierName) || tokens.tokens[i + 1].type === _types.TokenType.dot) {
              nonTypeIdentifiers.add(tokens.identifierNameForToken(token));
            }
          }
        }
        return nonTypeIdentifiers;
      }
      exports.getNonTypeIdentifiers = getNonTypeIdentifiers;
    }
  });

  // node_modules/sucrase/dist/CJSImportProcessor.js
  var require_CJSImportProcessor = __commonJS({
    "node_modules/sucrase/dist/CJSImportProcessor.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var _tokenizer = require_tokenizer();
      var _keywords = require_keywords();
      var _types = require_types();
      var _getNonTypeIdentifiers = require_getNonTypeIdentifiers();
      var CJSImportProcessor2 = class {
        __init() {
          this.nonTypeIdentifiers = new Set();
        }
        __init2() {
          this.importInfoByPath = new Map();
        }
        __init3() {
          this.importsToReplace = new Map();
        }
        __init4() {
          this.identifierReplacements = new Map();
        }
        __init5() {
          this.exportBindingsByLocalName = new Map();
        }
        constructor(nameManager, tokens, enableLegacyTypeScriptModuleInterop, options, isTypeScriptTransformEnabled, helperManager) {
          ;
          this.nameManager = nameManager;
          this.tokens = tokens;
          this.enableLegacyTypeScriptModuleInterop = enableLegacyTypeScriptModuleInterop;
          this.options = options;
          this.isTypeScriptTransformEnabled = isTypeScriptTransformEnabled;
          this.helperManager = helperManager;
          CJSImportProcessor2.prototype.__init.call(this);
          CJSImportProcessor2.prototype.__init2.call(this);
          CJSImportProcessor2.prototype.__init3.call(this);
          CJSImportProcessor2.prototype.__init4.call(this);
          CJSImportProcessor2.prototype.__init5.call(this);
        }
        preprocessTokens() {
          for (let i = 0; i < this.tokens.tokens.length; i++) {
            if (this.tokens.matches1AtIndex(i, _types.TokenType._import) && !this.tokens.matches3AtIndex(i, _types.TokenType._import, _types.TokenType.name, _types.TokenType.eq)) {
              this.preprocessImportAtIndex(i);
            }
            if (this.tokens.matches1AtIndex(i, _types.TokenType._export) && !this.tokens.matches2AtIndex(i, _types.TokenType._export, _types.TokenType.eq)) {
              this.preprocessExportAtIndex(i);
            }
          }
          this.generateImportReplacements();
        }
        pruneTypeOnlyImports() {
          this.nonTypeIdentifiers = _getNonTypeIdentifiers.getNonTypeIdentifiers.call(void 0, this.tokens, this.options);
          for (const [path, importInfo] of this.importInfoByPath.entries()) {
            if (importInfo.hasBareImport || importInfo.hasStarExport || importInfo.exportStarNames.length > 0 || importInfo.namedExports.length > 0) {
              continue;
            }
            const names = [
              ...importInfo.defaultNames,
              ...importInfo.wildcardNames,
              ...importInfo.namedImports.map(({ localName }) => localName)
            ];
            if (names.every((name) => this.isTypeName(name))) {
              this.importsToReplace.set(path, "");
            }
          }
        }
        isTypeName(name) {
          return this.isTypeScriptTransformEnabled && !this.nonTypeIdentifiers.has(name);
        }
        generateImportReplacements() {
          for (const [path, importInfo] of this.importInfoByPath.entries()) {
            const {
              defaultNames,
              wildcardNames,
              namedImports,
              namedExports,
              exportStarNames,
              hasStarExport
            } = importInfo;
            if (defaultNames.length === 0 && wildcardNames.length === 0 && namedImports.length === 0 && namedExports.length === 0 && exportStarNames.length === 0 && !hasStarExport) {
              this.importsToReplace.set(path, `require('${path}');`);
              continue;
            }
            const primaryImportName = this.getFreeIdentifierForPath(path);
            let secondaryImportName;
            if (this.enableLegacyTypeScriptModuleInterop) {
              secondaryImportName = primaryImportName;
            } else {
              secondaryImportName = wildcardNames.length > 0 ? wildcardNames[0] : this.getFreeIdentifierForPath(path);
            }
            let requireCode = `var ${primaryImportName} = require('${path}');`;
            if (wildcardNames.length > 0) {
              for (const wildcardName of wildcardNames) {
                const moduleExpr = this.enableLegacyTypeScriptModuleInterop ? primaryImportName : `${this.helperManager.getHelperName("interopRequireWildcard")}(${primaryImportName})`;
                requireCode += ` var ${wildcardName} = ${moduleExpr};`;
              }
            } else if (exportStarNames.length > 0 && secondaryImportName !== primaryImportName) {
              requireCode += ` var ${secondaryImportName} = ${this.helperManager.getHelperName("interopRequireWildcard")}(${primaryImportName});`;
            } else if (defaultNames.length > 0 && secondaryImportName !== primaryImportName) {
              requireCode += ` var ${secondaryImportName} = ${this.helperManager.getHelperName("interopRequireDefault")}(${primaryImportName});`;
            }
            for (const { importedName, localName } of namedExports) {
              requireCode += ` ${this.helperManager.getHelperName("createNamedExportFrom")}(${primaryImportName}, '${localName}', '${importedName}');`;
            }
            for (const exportStarName of exportStarNames) {
              requireCode += ` exports.${exportStarName} = ${secondaryImportName};`;
            }
            if (hasStarExport) {
              requireCode += ` ${this.helperManager.getHelperName("createStarExport")}(${primaryImportName});`;
            }
            this.importsToReplace.set(path, requireCode);
            for (const defaultName of defaultNames) {
              this.identifierReplacements.set(defaultName, `${secondaryImportName}.default`);
            }
            for (const { importedName, localName } of namedImports) {
              this.identifierReplacements.set(localName, `${primaryImportName}.${importedName}`);
            }
          }
        }
        getFreeIdentifierForPath(path) {
          const components = path.split("/");
          const lastComponent = components[components.length - 1];
          const baseName = lastComponent.replace(/\W/g, "");
          return this.nameManager.claimFreeName(`_${baseName}`);
        }
        preprocessImportAtIndex(index) {
          const defaultNames = [];
          const wildcardNames = [];
          const namedImports = [];
          index++;
          if ((this.tokens.matchesContextualAtIndex(index, _keywords.ContextualKeyword._type) || this.tokens.matches1AtIndex(index, _types.TokenType._typeof)) && !this.tokens.matches1AtIndex(index + 1, _types.TokenType.comma) && !this.tokens.matchesContextualAtIndex(index + 1, _keywords.ContextualKeyword._from)) {
            return;
          }
          if (this.tokens.matches1AtIndex(index, _types.TokenType.parenL)) {
            return;
          }
          if (this.tokens.matches1AtIndex(index, _types.TokenType.name)) {
            defaultNames.push(this.tokens.identifierNameAtIndex(index));
            index++;
            if (this.tokens.matches1AtIndex(index, _types.TokenType.comma)) {
              index++;
            }
          }
          if (this.tokens.matches1AtIndex(index, _types.TokenType.star)) {
            index += 2;
            wildcardNames.push(this.tokens.identifierNameAtIndex(index));
            index++;
          }
          if (this.tokens.matches1AtIndex(index, _types.TokenType.braceL)) {
            const result = this.getNamedImports(index + 1);
            index = result.newIndex;
            for (const namedImport of result.namedImports) {
              if (namedImport.importedName === "default") {
                defaultNames.push(namedImport.localName);
              } else {
                namedImports.push(namedImport);
              }
            }
          }
          if (this.tokens.matchesContextualAtIndex(index, _keywords.ContextualKeyword._from)) {
            index++;
          }
          if (!this.tokens.matches1AtIndex(index, _types.TokenType.string)) {
            throw new Error("Expected string token at the end of import statement.");
          }
          const path = this.tokens.stringValueAtIndex(index);
          const importInfo = this.getImportInfo(path);
          importInfo.defaultNames.push(...defaultNames);
          importInfo.wildcardNames.push(...wildcardNames);
          importInfo.namedImports.push(...namedImports);
          if (defaultNames.length === 0 && wildcardNames.length === 0 && namedImports.length === 0) {
            importInfo.hasBareImport = true;
          }
        }
        preprocessExportAtIndex(index) {
          if (this.tokens.matches2AtIndex(index, _types.TokenType._export, _types.TokenType._var) || this.tokens.matches2AtIndex(index, _types.TokenType._export, _types.TokenType._let) || this.tokens.matches2AtIndex(index, _types.TokenType._export, _types.TokenType._const)) {
            this.preprocessVarExportAtIndex(index);
          } else if (this.tokens.matches2AtIndex(index, _types.TokenType._export, _types.TokenType._function) || this.tokens.matches2AtIndex(index, _types.TokenType._export, _types.TokenType._class)) {
            const exportName = this.tokens.identifierNameAtIndex(index + 2);
            this.addExportBinding(exportName, exportName);
          } else if (this.tokens.matches3AtIndex(index, _types.TokenType._export, _types.TokenType.name, _types.TokenType._function)) {
            const exportName = this.tokens.identifierNameAtIndex(index + 3);
            this.addExportBinding(exportName, exportName);
          } else if (this.tokens.matches2AtIndex(index, _types.TokenType._export, _types.TokenType.braceL)) {
            this.preprocessNamedExportAtIndex(index);
          } else if (this.tokens.matches2AtIndex(index, _types.TokenType._export, _types.TokenType.star)) {
            this.preprocessExportStarAtIndex(index);
          }
        }
        preprocessVarExportAtIndex(index) {
          let depth = 0;
          for (let i = index + 2; ; i++) {
            if (this.tokens.matches1AtIndex(i, _types.TokenType.braceL) || this.tokens.matches1AtIndex(i, _types.TokenType.dollarBraceL) || this.tokens.matches1AtIndex(i, _types.TokenType.bracketL)) {
              depth++;
            } else if (this.tokens.matches1AtIndex(i, _types.TokenType.braceR) || this.tokens.matches1AtIndex(i, _types.TokenType.bracketR)) {
              depth--;
            } else if (depth === 0 && !this.tokens.matches1AtIndex(i, _types.TokenType.name)) {
              break;
            } else if (this.tokens.matches1AtIndex(1, _types.TokenType.eq)) {
              const endIndex = this.tokens.currentToken().rhsEndIndex;
              if (endIndex == null) {
                throw new Error("Expected = token with an end index.");
              }
              i = endIndex - 1;
            } else {
              const token = this.tokens.tokens[i];
              if (_tokenizer.isDeclaration.call(void 0, token)) {
                const exportName = this.tokens.identifierNameAtIndex(i);
                this.identifierReplacements.set(exportName, `exports.${exportName}`);
              }
            }
          }
        }
        preprocessNamedExportAtIndex(index) {
          index += 2;
          const { newIndex, namedImports } = this.getNamedImports(index);
          index = newIndex;
          if (this.tokens.matchesContextualAtIndex(index, _keywords.ContextualKeyword._from)) {
            index++;
          } else {
            for (const { importedName: localName, localName: exportedName } of namedImports) {
              this.addExportBinding(localName, exportedName);
            }
            return;
          }
          if (!this.tokens.matches1AtIndex(index, _types.TokenType.string)) {
            throw new Error("Expected string token at the end of import statement.");
          }
          const path = this.tokens.stringValueAtIndex(index);
          const importInfo = this.getImportInfo(path);
          importInfo.namedExports.push(...namedImports);
        }
        preprocessExportStarAtIndex(index) {
          let exportedName = null;
          if (this.tokens.matches3AtIndex(index, _types.TokenType._export, _types.TokenType.star, _types.TokenType._as)) {
            index += 3;
            exportedName = this.tokens.identifierNameAtIndex(index);
            index += 2;
          } else {
            index += 3;
          }
          if (!this.tokens.matches1AtIndex(index, _types.TokenType.string)) {
            throw new Error("Expected string token at the end of star export statement.");
          }
          const path = this.tokens.stringValueAtIndex(index);
          const importInfo = this.getImportInfo(path);
          if (exportedName !== null) {
            importInfo.exportStarNames.push(exportedName);
          } else {
            importInfo.hasStarExport = true;
          }
        }
        getNamedImports(index) {
          const namedImports = [];
          while (true) {
            if (this.tokens.matches1AtIndex(index, _types.TokenType.braceR)) {
              index++;
              break;
            }
            let isTypeImport = false;
            if ((this.tokens.matchesContextualAtIndex(index, _keywords.ContextualKeyword._type) || this.tokens.matches1AtIndex(index, _types.TokenType._typeof)) && this.tokens.matches1AtIndex(index + 1, _types.TokenType.name) && !this.tokens.matchesContextualAtIndex(index + 1, _keywords.ContextualKeyword._as)) {
              isTypeImport = true;
              index++;
            }
            const importedName = this.tokens.identifierNameAtIndex(index);
            let localName;
            index++;
            if (this.tokens.matchesContextualAtIndex(index, _keywords.ContextualKeyword._as)) {
              index++;
              localName = this.tokens.identifierNameAtIndex(index);
              index++;
            } else {
              localName = importedName;
            }
            if (!isTypeImport) {
              namedImports.push({ importedName, localName });
            }
            if (this.tokens.matches2AtIndex(index, _types.TokenType.comma, _types.TokenType.braceR)) {
              index += 2;
              break;
            } else if (this.tokens.matches1AtIndex(index, _types.TokenType.braceR)) {
              index++;
              break;
            } else if (this.tokens.matches1AtIndex(index, _types.TokenType.comma)) {
              index++;
            } else {
              throw new Error(`Unexpected token: ${JSON.stringify(this.tokens.tokens[index])}`);
            }
          }
          return { newIndex: index, namedImports };
        }
        getImportInfo(path) {
          const existingInfo = this.importInfoByPath.get(path);
          if (existingInfo) {
            return existingInfo;
          }
          const newInfo = {
            defaultNames: [],
            wildcardNames: [],
            namedImports: [],
            namedExports: [],
            hasBareImport: false,
            exportStarNames: [],
            hasStarExport: false
          };
          this.importInfoByPath.set(path, newInfo);
          return newInfo;
        }
        addExportBinding(localName, exportedName) {
          if (!this.exportBindingsByLocalName.has(localName)) {
            this.exportBindingsByLocalName.set(localName, []);
          }
          this.exportBindingsByLocalName.get(localName).push(exportedName);
        }
        claimImportCode(importPath) {
          const result = this.importsToReplace.get(importPath);
          this.importsToReplace.set(importPath, "");
          return result || "";
        }
        getIdentifierReplacement(identifierName) {
          return this.identifierReplacements.get(identifierName) || null;
        }
        resolveExportBinding(assignedName) {
          const exportedNames = this.exportBindingsByLocalName.get(assignedName);
          if (!exportedNames || exportedNames.length === 0) {
            return null;
          }
          return exportedNames.map((exportedName) => `exports.${exportedName}`).join(" = ");
        }
        getGlobalNames() {
          return new Set([
            ...this.identifierReplacements.keys(),
            ...this.exportBindingsByLocalName.keys()
          ]);
        }
      };
      exports.default = CJSImportProcessor2;
    }
  });

  // node_modules/sucrase/dist/computeSourceMap.js
  var require_computeSourceMap = __commonJS({
    "node_modules/sucrase/dist/computeSourceMap.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var _charcodes = require_charcodes();
      function computeSourceMap2(code, filePath, { compiledFilename }) {
        let mappings = "AAAA";
        for (let i = 0; i < code.length; i++) {
          if (code.charCodeAt(i) === _charcodes.charCodes.lineFeed) {
            mappings += ";AACA";
          }
        }
        return {
          version: 3,
          file: compiledFilename || "",
          sources: [filePath],
          mappings,
          names: []
        };
      }
      exports.default = computeSourceMap2;
    }
  });

  // node_modules/sucrase/dist/HelperManager.js
  var require_HelperManager = __commonJS({
    "node_modules/sucrase/dist/HelperManager.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var HELPERS = {
        interopRequireWildcard: `
    function interopRequireWildcard(obj) {
      if (obj && obj.__esModule) {
        return obj;
      } else {
        var newObj = {};
        if (obj != null) {
          for (var key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              newObj[key] = obj[key];
            }
          }
        }
        newObj.default = obj;
        return newObj;
      }
    }
  `,
        interopRequireDefault: `
    function interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
  `,
        createNamedExportFrom: `
    function createNamedExportFrom(obj, localName, importedName) {
      Object.defineProperty(exports, localName, {enumerable: true, get: () => obj[importedName]});
    }
  `,
        createStarExport: `
    function createStarExport(obj) {
      Object.keys(obj)
        .filter((key) => key !== "default" && key !== "__esModule")
        .forEach((key) => {
          if (exports.hasOwnProperty(key)) {
            return;
          }
          Object.defineProperty(exports, key, {enumerable: true, get: () => obj[key]});
        });
    }
  `,
        nullishCoalesce: `
    function nullishCoalesce(lhs, rhsFn) {
      if (lhs != null) {
        return lhs;
      } else {
        return rhsFn();
      }
    }
  `,
        asyncNullishCoalesce: `
    async function asyncNullishCoalesce(lhs, rhsFn) {
      if (lhs != null) {
        return lhs;
      } else {
        return await rhsFn();
      }
    }
  `,
        optionalChain: `
    function optionalChain(ops) {
      let lastAccessLHS = undefined;
      let value = ops[0];
      let i = 1;
      while (i < ops.length) {
        const op = ops[i];
        const fn = ops[i + 1];
        i += 2;
        if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) {
          return undefined;
        }
        if (op === 'access' || op === 'optionalAccess') {
          lastAccessLHS = value;
          value = fn(value);
        } else if (op === 'call' || op === 'optionalCall') {
          value = fn((...args) => value.call(lastAccessLHS, ...args));
          lastAccessLHS = undefined;
        }
      }
      return value;
    }
  `,
        asyncOptionalChain: `
    async function asyncOptionalChain(ops) {
      let lastAccessLHS = undefined;
      let value = ops[0];
      let i = 1;
      while (i < ops.length) {
        const op = ops[i];
        const fn = ops[i + 1];
        i += 2;
        if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) {
          return undefined;
        }
        if (op === 'access' || op === 'optionalAccess') {
          lastAccessLHS = value;
          value = await fn(value);
        } else if (op === 'call' || op === 'optionalCall') {
          value = await fn((...args) => value.call(lastAccessLHS, ...args));
          lastAccessLHS = undefined;
        }
      }
      return value;
    }
  `,
        optionalChainDelete: `
    function optionalChainDelete(ops) {
      const result = OPTIONAL_CHAIN_NAME(ops);
      return result == null ? true : result;
    }
  `,
        asyncOptionalChainDelete: `
    async function asyncOptionalChainDelete(ops) {
      const result = await ASYNC_OPTIONAL_CHAIN_NAME(ops);
      return result == null ? true : result;
    }
  `
      };
      var HelperManager2 = class {
        __init() {
          this.helperNames = {};
        }
        constructor(nameManager) {
          ;
          this.nameManager = nameManager;
          HelperManager2.prototype.__init.call(this);
        }
        getHelperName(baseName) {
          let helperName = this.helperNames[baseName];
          if (helperName) {
            return helperName;
          }
          helperName = this.nameManager.claimFreeName(`_${baseName}`);
          this.helperNames[baseName] = helperName;
          return helperName;
        }
        emitHelpers() {
          let resultCode = "";
          if (this.helperNames.optionalChainDelete) {
            this.getHelperName("optionalChain");
          }
          if (this.helperNames.asyncOptionalChainDelete) {
            this.getHelperName("asyncOptionalChain");
          }
          for (const [baseName, helperCodeTemplate] of Object.entries(HELPERS)) {
            const helperName = this.helperNames[baseName];
            let helperCode = helperCodeTemplate;
            if (baseName === "optionalChainDelete") {
              helperCode = helperCode.replace("OPTIONAL_CHAIN_NAME", this.helperNames.optionalChain);
            } else if (baseName === "asyncOptionalChainDelete") {
              helperCode = helperCode.replace("ASYNC_OPTIONAL_CHAIN_NAME", this.helperNames.asyncOptionalChain);
            }
            if (helperName) {
              resultCode += " ";
              resultCode += helperCode.replace(baseName, helperName).replace(/\s+/g, " ").trim();
            }
          }
          return resultCode;
        }
      };
      exports.HelperManager = HelperManager2;
    }
  });

  // node_modules/sucrase/dist/identifyShadowedGlobals.js
  var require_identifyShadowedGlobals = __commonJS({
    "node_modules/sucrase/dist/identifyShadowedGlobals.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var _tokenizer = require_tokenizer();
      var _types = require_types();
      function identifyShadowedGlobals2(tokens, scopes, globalNames) {
        if (!hasShadowedGlobals(tokens, globalNames)) {
          return;
        }
        markShadowedGlobals(tokens, scopes, globalNames);
      }
      exports.default = identifyShadowedGlobals2;
      function hasShadowedGlobals(tokens, globalNames) {
        for (const token of tokens.tokens) {
          if (token.type === _types.TokenType.name && _tokenizer.isNonTopLevelDeclaration.call(void 0, token) && globalNames.has(tokens.identifierNameForToken(token))) {
            return true;
          }
        }
        return false;
      }
      exports.hasShadowedGlobals = hasShadowedGlobals;
      function markShadowedGlobals(tokens, scopes, globalNames) {
        const scopeStack = [];
        let scopeIndex = scopes.length - 1;
        for (let i = tokens.tokens.length - 1; ; i--) {
          while (scopeStack.length > 0 && scopeStack[scopeStack.length - 1].startTokenIndex === i + 1) {
            scopeStack.pop();
          }
          while (scopeIndex >= 0 && scopes[scopeIndex].endTokenIndex === i + 1) {
            scopeStack.push(scopes[scopeIndex]);
            scopeIndex--;
          }
          if (i < 0) {
            break;
          }
          const token = tokens.tokens[i];
          const name = tokens.identifierNameForToken(token);
          if (scopeStack.length > 1 && token.type === _types.TokenType.name && globalNames.has(name)) {
            if (_tokenizer.isBlockScopedDeclaration.call(void 0, token)) {
              markShadowedForScope(scopeStack[scopeStack.length - 1], tokens, name);
            } else if (_tokenizer.isFunctionScopedDeclaration.call(void 0, token)) {
              let stackIndex = scopeStack.length - 1;
              while (stackIndex > 0 && !scopeStack[stackIndex].isFunctionScope) {
                stackIndex--;
              }
              if (stackIndex < 0) {
                throw new Error("Did not find parent function scope.");
              }
              markShadowedForScope(scopeStack[stackIndex], tokens, name);
            }
          }
        }
        if (scopeStack.length > 0) {
          throw new Error("Expected empty scope stack after processing file.");
        }
      }
      function markShadowedForScope(scope, tokens, name) {
        for (let i = scope.startTokenIndex; i < scope.endTokenIndex; i++) {
          const token = tokens.tokens[i];
          if ((token.type === _types.TokenType.name || token.type === _types.TokenType.jsxName) && tokens.identifierNameForToken(token) === name) {
            token.shadowsGlobal = true;
          }
        }
      }
    }
  });

  // node_modules/sucrase/dist/util/getIdentifierNames.js
  var require_getIdentifierNames = __commonJS({
    "node_modules/sucrase/dist/util/getIdentifierNames.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var _types = require_types();
      function getIdentifierNames(code, tokens) {
        const names = [];
        for (const token of tokens) {
          if (token.type === _types.TokenType.name) {
            names.push(code.slice(token.start, token.end));
          }
        }
        return names;
      }
      exports.default = getIdentifierNames;
    }
  });

  // node_modules/sucrase/dist/NameManager.js
  var require_NameManager = __commonJS({
    "node_modules/sucrase/dist/NameManager.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : { default: obj };
      }
      var _getIdentifierNames = require_getIdentifierNames();
      var _getIdentifierNames2 = _interopRequireDefault(_getIdentifierNames);
      var NameManager2 = class {
        __init() {
          this.usedNames = new Set();
        }
        constructor(code, tokens) {
          ;
          NameManager2.prototype.__init.call(this);
          this.usedNames = new Set(_getIdentifierNames2.default.call(void 0, code, tokens));
        }
        claimFreeName(name) {
          const newName = this.findFreeName(name);
          this.usedNames.add(newName);
          return newName;
        }
        findFreeName(name) {
          if (!this.usedNames.has(name)) {
            return name;
          }
          let suffixNum = 2;
          while (this.usedNames.has(name + String(suffixNum))) {
            suffixNum++;
          }
          return name + String(suffixNum);
        }
      };
      exports.default = NameManager2;
    }
  });

  // node_modules/ts-interface-checker/dist/util.js
  var require_util2 = __commonJS({
    "node_modules/ts-interface-checker/dist/util.js"(exports) {
      "use strict";
      var __extends = exports && exports.__extends || function() {
        var extendStatics = function(d, b) {
          extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
            d2.__proto__ = b2;
          } || function(d2, b2) {
            for (var p in b2)
              if (b2.hasOwnProperty(p))
                d2[p] = b2[p];
          };
          return extendStatics(d, b);
        };
        return function(d, b) {
          extendStatics(d, b);
          function __() {
            this.constructor = d;
          }
          d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
      }();
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.DetailContext = exports.NoopContext = exports.VError = void 0;
      var VError = function(_super) {
        __extends(VError2, _super);
        function VError2(path, message) {
          var _this = _super.call(this, message) || this;
          _this.path = path;
          Object.setPrototypeOf(_this, VError2.prototype);
          return _this;
        }
        return VError2;
      }(Error);
      exports.VError = VError;
      var NoopContext = function() {
        function NoopContext2() {
        }
        NoopContext2.prototype.fail = function(relPath, message, score) {
          return false;
        };
        NoopContext2.prototype.unionResolver = function() {
          return this;
        };
        NoopContext2.prototype.createContext = function() {
          return this;
        };
        NoopContext2.prototype.resolveUnion = function(ur) {
        };
        return NoopContext2;
      }();
      exports.NoopContext = NoopContext;
      var DetailContext = function() {
        function DetailContext2() {
          this._propNames = [""];
          this._messages = [null];
          this._score = 0;
        }
        DetailContext2.prototype.fail = function(relPath, message, score) {
          this._propNames.push(relPath);
          this._messages.push(message);
          this._score += score;
          return false;
        };
        DetailContext2.prototype.unionResolver = function() {
          return new DetailUnionResolver();
        };
        DetailContext2.prototype.resolveUnion = function(unionResolver) {
          var _a, _b;
          var u = unionResolver;
          var best = null;
          for (var _i = 0, _c = u.contexts; _i < _c.length; _i++) {
            var ctx = _c[_i];
            if (!best || ctx._score >= best._score) {
              best = ctx;
            }
          }
          if (best && best._score > 0) {
            (_a = this._propNames).push.apply(_a, best._propNames);
            (_b = this._messages).push.apply(_b, best._messages);
          }
        };
        DetailContext2.prototype.getError = function(path) {
          var msgParts = [];
          for (var i = this._propNames.length - 1; i >= 0; i--) {
            var p = this._propNames[i];
            path += typeof p === "number" ? "[" + p + "]" : p ? "." + p : "";
            var m = this._messages[i];
            if (m) {
              msgParts.push(path + " " + m);
            }
          }
          return new VError(path, msgParts.join("; "));
        };
        DetailContext2.prototype.getErrorDetail = function(path) {
          var details = [];
          for (var i = this._propNames.length - 1; i >= 0; i--) {
            var p = this._propNames[i];
            path += typeof p === "number" ? "[" + p + "]" : p ? "." + p : "";
            var message = this._messages[i];
            if (message) {
              details.push({ path, message });
            }
          }
          var detail = null;
          for (var i = details.length - 1; i >= 0; i--) {
            if (detail) {
              details[i].nested = [detail];
            }
            detail = details[i];
          }
          return detail;
        };
        return DetailContext2;
      }();
      exports.DetailContext = DetailContext;
      var DetailUnionResolver = function() {
        function DetailUnionResolver2() {
          this.contexts = [];
        }
        DetailUnionResolver2.prototype.createContext = function() {
          var ctx = new DetailContext();
          this.contexts.push(ctx);
          return ctx;
        };
        return DetailUnionResolver2;
      }();
    }
  });

  // node_modules/ts-interface-checker/dist/types.js
  var require_types2 = __commonJS({
    "node_modules/ts-interface-checker/dist/types.js"(exports) {
      "use strict";
      var __extends = exports && exports.__extends || function() {
        var extendStatics = function(d, b) {
          extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
            d2.__proto__ = b2;
          } || function(d2, b2) {
            for (var p in b2)
              if (b2.hasOwnProperty(p))
                d2[p] = b2[p];
          };
          return extendStatics(d, b);
        };
        return function(d, b) {
          extendStatics(d, b);
          function __() {
            this.constructor = d;
          }
          d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
      }();
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.basicTypes = exports.BasicType = exports.TParamList = exports.TParam = exports.param = exports.TFunc = exports.func = exports.TProp = exports.TOptional = exports.opt = exports.TIface = exports.iface = exports.TEnumLiteral = exports.enumlit = exports.TEnumType = exports.enumtype = exports.TIntersection = exports.intersection = exports.TUnion = exports.union = exports.TTuple = exports.tuple = exports.TArray = exports.array = exports.TLiteral = exports.lit = exports.TName = exports.name = exports.TType = void 0;
      var util_1 = require_util2();
      var TType = function() {
        function TType2() {
        }
        return TType2;
      }();
      exports.TType = TType;
      function parseSpec(typeSpec) {
        return typeof typeSpec === "string" ? name(typeSpec) : typeSpec;
      }
      function getNamedType(suite, name2) {
        var ttype = suite[name2];
        if (!ttype) {
          throw new Error("Unknown type " + name2);
        }
        return ttype;
      }
      function name(value) {
        return new TName(value);
      }
      exports.name = name;
      var TName = function(_super) {
        __extends(TName2, _super);
        function TName2(name2) {
          var _this = _super.call(this) || this;
          _this.name = name2;
          _this._failMsg = "is not a " + name2;
          return _this;
        }
        TName2.prototype.getChecker = function(suite, strict, allowedProps) {
          var _this = this;
          var ttype = getNamedType(suite, this.name);
          var checker = ttype.getChecker(suite, strict, allowedProps);
          if (ttype instanceof BasicType || ttype instanceof TName2) {
            return checker;
          }
          return function(value, ctx) {
            return checker(value, ctx) ? true : ctx.fail(null, _this._failMsg, 0);
          };
        };
        return TName2;
      }(TType);
      exports.TName = TName;
      function lit(value) {
        return new TLiteral(value);
      }
      exports.lit = lit;
      var TLiteral = function(_super) {
        __extends(TLiteral2, _super);
        function TLiteral2(value) {
          var _this = _super.call(this) || this;
          _this.value = value;
          _this.name = JSON.stringify(value);
          _this._failMsg = "is not " + _this.name;
          return _this;
        }
        TLiteral2.prototype.getChecker = function(suite, strict) {
          var _this = this;
          return function(value, ctx) {
            return value === _this.value ? true : ctx.fail(null, _this._failMsg, -1);
          };
        };
        return TLiteral2;
      }(TType);
      exports.TLiteral = TLiteral;
      function array(typeSpec) {
        return new TArray(parseSpec(typeSpec));
      }
      exports.array = array;
      var TArray = function(_super) {
        __extends(TArray2, _super);
        function TArray2(ttype) {
          var _this = _super.call(this) || this;
          _this.ttype = ttype;
          return _this;
        }
        TArray2.prototype.getChecker = function(suite, strict) {
          var itemChecker = this.ttype.getChecker(suite, strict);
          return function(value, ctx) {
            if (!Array.isArray(value)) {
              return ctx.fail(null, "is not an array", 0);
            }
            for (var i = 0; i < value.length; i++) {
              var ok = itemChecker(value[i], ctx);
              if (!ok) {
                return ctx.fail(i, null, 1);
              }
            }
            return true;
          };
        };
        return TArray2;
      }(TType);
      exports.TArray = TArray;
      function tuple() {
        var typeSpec = [];
        for (var _i2 = 0; _i2 < arguments.length; _i2++) {
          typeSpec[_i2] = arguments[_i2];
        }
        return new TTuple(typeSpec.map(function(t) {
          return parseSpec(t);
        }));
      }
      exports.tuple = tuple;
      var TTuple = function(_super) {
        __extends(TTuple2, _super);
        function TTuple2(ttypes) {
          var _this = _super.call(this) || this;
          _this.ttypes = ttypes;
          return _this;
        }
        TTuple2.prototype.getChecker = function(suite, strict) {
          var itemCheckers = this.ttypes.map(function(t) {
            return t.getChecker(suite, strict);
          });
          var checker = function(value, ctx) {
            if (!Array.isArray(value)) {
              return ctx.fail(null, "is not an array", 0);
            }
            for (var i = 0; i < itemCheckers.length; i++) {
              var ok = itemCheckers[i](value[i], ctx);
              if (!ok) {
                return ctx.fail(i, null, 1);
              }
            }
            return true;
          };
          if (!strict) {
            return checker;
          }
          return function(value, ctx) {
            if (!checker(value, ctx)) {
              return false;
            }
            return value.length <= itemCheckers.length ? true : ctx.fail(itemCheckers.length, "is extraneous", 2);
          };
        };
        return TTuple2;
      }(TType);
      exports.TTuple = TTuple;
      function union() {
        var typeSpec = [];
        for (var _i2 = 0; _i2 < arguments.length; _i2++) {
          typeSpec[_i2] = arguments[_i2];
        }
        return new TUnion(typeSpec.map(function(t) {
          return parseSpec(t);
        }));
      }
      exports.union = union;
      var TUnion = function(_super) {
        __extends(TUnion2, _super);
        function TUnion2(ttypes) {
          var _this = _super.call(this) || this;
          _this.ttypes = ttypes;
          var names = ttypes.map(function(t) {
            return t instanceof TName || t instanceof TLiteral ? t.name : null;
          }).filter(function(n) {
            return n;
          });
          var otherTypes = ttypes.length - names.length;
          if (names.length) {
            if (otherTypes > 0) {
              names.push(otherTypes + " more");
            }
            _this._failMsg = "is none of " + names.join(", ");
          } else {
            _this._failMsg = "is none of " + otherTypes + " types";
          }
          return _this;
        }
        TUnion2.prototype.getChecker = function(suite, strict) {
          var _this = this;
          var itemCheckers = this.ttypes.map(function(t) {
            return t.getChecker(suite, strict);
          });
          return function(value, ctx) {
            var ur = ctx.unionResolver();
            for (var i = 0; i < itemCheckers.length; i++) {
              var ok = itemCheckers[i](value, ur.createContext());
              if (ok) {
                return true;
              }
            }
            ctx.resolveUnion(ur);
            return ctx.fail(null, _this._failMsg, 0);
          };
        };
        return TUnion2;
      }(TType);
      exports.TUnion = TUnion;
      function intersection() {
        var typeSpec = [];
        for (var _i2 = 0; _i2 < arguments.length; _i2++) {
          typeSpec[_i2] = arguments[_i2];
        }
        return new TIntersection(typeSpec.map(function(t) {
          return parseSpec(t);
        }));
      }
      exports.intersection = intersection;
      var TIntersection = function(_super) {
        __extends(TIntersection2, _super);
        function TIntersection2(ttypes) {
          var _this = _super.call(this) || this;
          _this.ttypes = ttypes;
          return _this;
        }
        TIntersection2.prototype.getChecker = function(suite, strict) {
          var allowedProps = new Set();
          var itemCheckers = this.ttypes.map(function(t) {
            return t.getChecker(suite, strict, allowedProps);
          });
          return function(value, ctx) {
            var ok = itemCheckers.every(function(checker) {
              return checker(value, ctx);
            });
            if (ok) {
              return true;
            }
            return ctx.fail(null, null, 0);
          };
        };
        return TIntersection2;
      }(TType);
      exports.TIntersection = TIntersection;
      function enumtype(values) {
        return new TEnumType(values);
      }
      exports.enumtype = enumtype;
      var TEnumType = function(_super) {
        __extends(TEnumType2, _super);
        function TEnumType2(members) {
          var _this = _super.call(this) || this;
          _this.members = members;
          _this.validValues = new Set();
          _this._failMsg = "is not a valid enum value";
          _this.validValues = new Set(Object.keys(members).map(function(name2) {
            return members[name2];
          }));
          return _this;
        }
        TEnumType2.prototype.getChecker = function(suite, strict) {
          var _this = this;
          return function(value, ctx) {
            return _this.validValues.has(value) ? true : ctx.fail(null, _this._failMsg, 0);
          };
        };
        return TEnumType2;
      }(TType);
      exports.TEnumType = TEnumType;
      function enumlit(name2, prop) {
        return new TEnumLiteral(name2, prop);
      }
      exports.enumlit = enumlit;
      var TEnumLiteral = function(_super) {
        __extends(TEnumLiteral2, _super);
        function TEnumLiteral2(enumName, prop) {
          var _this = _super.call(this) || this;
          _this.enumName = enumName;
          _this.prop = prop;
          _this._failMsg = "is not " + enumName + "." + prop;
          return _this;
        }
        TEnumLiteral2.prototype.getChecker = function(suite, strict) {
          var _this = this;
          var ttype = getNamedType(suite, this.enumName);
          if (!(ttype instanceof TEnumType)) {
            throw new Error("Type " + this.enumName + " used in enumlit is not an enum type");
          }
          var val = ttype.members[this.prop];
          if (!ttype.members.hasOwnProperty(this.prop)) {
            throw new Error("Unknown value " + this.enumName + "." + this.prop + " used in enumlit");
          }
          return function(value, ctx) {
            return value === val ? true : ctx.fail(null, _this._failMsg, -1);
          };
        };
        return TEnumLiteral2;
      }(TType);
      exports.TEnumLiteral = TEnumLiteral;
      function makeIfaceProps(props) {
        return Object.keys(props).map(function(name2) {
          return makeIfaceProp(name2, props[name2]);
        });
      }
      function makeIfaceProp(name2, prop) {
        return prop instanceof TOptional ? new TProp(name2, prop.ttype, true) : new TProp(name2, parseSpec(prop), false);
      }
      function iface(bases, props) {
        return new TIface(bases, makeIfaceProps(props));
      }
      exports.iface = iface;
      var TIface = function(_super) {
        __extends(TIface2, _super);
        function TIface2(bases, props) {
          var _this = _super.call(this) || this;
          _this.bases = bases;
          _this.props = props;
          _this.propSet = new Set(props.map(function(p) {
            return p.name;
          }));
          return _this;
        }
        TIface2.prototype.getChecker = function(suite, strict, allowedProps) {
          var _this = this;
          var baseCheckers = this.bases.map(function(b) {
            return getNamedType(suite, b).getChecker(suite, strict);
          });
          var propCheckers = this.props.map(function(prop) {
            return prop.ttype.getChecker(suite, strict);
          });
          var testCtx = new util_1.NoopContext();
          var isPropRequired = this.props.map(function(prop, i) {
            return !prop.isOpt && !propCheckers[i](void 0, testCtx);
          });
          var checker = function(value, ctx) {
            if (typeof value !== "object" || value === null) {
              return ctx.fail(null, "is not an object", 0);
            }
            for (var i = 0; i < baseCheckers.length; i++) {
              if (!baseCheckers[i](value, ctx)) {
                return false;
              }
            }
            for (var i = 0; i < propCheckers.length; i++) {
              var name_1 = _this.props[i].name;
              var v = value[name_1];
              if (v === void 0) {
                if (isPropRequired[i]) {
                  return ctx.fail(name_1, "is missing", 1);
                }
              } else {
                var ok = propCheckers[i](v, ctx);
                if (!ok) {
                  return ctx.fail(name_1, null, 1);
                }
              }
            }
            return true;
          };
          if (!strict) {
            return checker;
          }
          var propSet = this.propSet;
          if (allowedProps) {
            this.propSet.forEach(function(prop) {
              return allowedProps.add(prop);
            });
            propSet = allowedProps;
          }
          return function(value, ctx) {
            if (!checker(value, ctx)) {
              return false;
            }
            for (var prop in value) {
              if (!propSet.has(prop)) {
                return ctx.fail(prop, "is extraneous", 2);
              }
            }
            return true;
          };
        };
        return TIface2;
      }(TType);
      exports.TIface = TIface;
      function opt(typeSpec) {
        return new TOptional(parseSpec(typeSpec));
      }
      exports.opt = opt;
      var TOptional = function(_super) {
        __extends(TOptional2, _super);
        function TOptional2(ttype) {
          var _this = _super.call(this) || this;
          _this.ttype = ttype;
          return _this;
        }
        TOptional2.prototype.getChecker = function(suite, strict) {
          var itemChecker = this.ttype.getChecker(suite, strict);
          return function(value, ctx) {
            return value === void 0 || itemChecker(value, ctx);
          };
        };
        return TOptional2;
      }(TType);
      exports.TOptional = TOptional;
      var TProp = function() {
        function TProp2(name2, ttype, isOpt) {
          this.name = name2;
          this.ttype = ttype;
          this.isOpt = isOpt;
        }
        return TProp2;
      }();
      exports.TProp = TProp;
      function func(resultSpec) {
        var params = [];
        for (var _i2 = 1; _i2 < arguments.length; _i2++) {
          params[_i2 - 1] = arguments[_i2];
        }
        return new TFunc(new TParamList(params), parseSpec(resultSpec));
      }
      exports.func = func;
      var TFunc = function(_super) {
        __extends(TFunc2, _super);
        function TFunc2(paramList, result) {
          var _this = _super.call(this) || this;
          _this.paramList = paramList;
          _this.result = result;
          return _this;
        }
        TFunc2.prototype.getChecker = function(suite, strict) {
          return function(value, ctx) {
            return typeof value === "function" ? true : ctx.fail(null, "is not a function", 0);
          };
        };
        return TFunc2;
      }(TType);
      exports.TFunc = TFunc;
      function param(name2, typeSpec, isOpt) {
        return new TParam(name2, parseSpec(typeSpec), Boolean(isOpt));
      }
      exports.param = param;
      var TParam = function() {
        function TParam2(name2, ttype, isOpt) {
          this.name = name2;
          this.ttype = ttype;
          this.isOpt = isOpt;
        }
        return TParam2;
      }();
      exports.TParam = TParam;
      var TParamList = function(_super) {
        __extends(TParamList2, _super);
        function TParamList2(params) {
          var _this = _super.call(this) || this;
          _this.params = params;
          return _this;
        }
        TParamList2.prototype.getChecker = function(suite, strict) {
          var _this = this;
          var itemCheckers = this.params.map(function(t) {
            return t.ttype.getChecker(suite, strict);
          });
          var testCtx = new util_1.NoopContext();
          var isParamRequired = this.params.map(function(param2, i) {
            return !param2.isOpt && !itemCheckers[i](void 0, testCtx);
          });
          var checker = function(value, ctx) {
            if (!Array.isArray(value)) {
              return ctx.fail(null, "is not an array", 0);
            }
            for (var i = 0; i < itemCheckers.length; i++) {
              var p = _this.params[i];
              if (value[i] === void 0) {
                if (isParamRequired[i]) {
                  return ctx.fail(p.name, "is missing", 1);
                }
              } else {
                var ok = itemCheckers[i](value[i], ctx);
                if (!ok) {
                  return ctx.fail(p.name, null, 1);
                }
              }
            }
            return true;
          };
          if (!strict) {
            return checker;
          }
          return function(value, ctx) {
            if (!checker(value, ctx)) {
              return false;
            }
            return value.length <= itemCheckers.length ? true : ctx.fail(itemCheckers.length, "is extraneous", 2);
          };
        };
        return TParamList2;
      }(TType);
      exports.TParamList = TParamList;
      var BasicType = function(_super) {
        __extends(BasicType2, _super);
        function BasicType2(validator, message) {
          var _this = _super.call(this) || this;
          _this.validator = validator;
          _this.message = message;
          return _this;
        }
        BasicType2.prototype.getChecker = function(suite, strict) {
          var _this = this;
          return function(value, ctx) {
            return _this.validator(value) ? true : ctx.fail(null, _this.message, 0);
          };
        };
        return BasicType2;
      }(TType);
      exports.BasicType = BasicType;
      exports.basicTypes = {
        any: new BasicType(function(v) {
          return true;
        }, "is invalid"),
        number: new BasicType(function(v) {
          return typeof v === "number";
        }, "is not a number"),
        object: new BasicType(function(v) {
          return typeof v === "object" && v;
        }, "is not an object"),
        boolean: new BasicType(function(v) {
          return typeof v === "boolean";
        }, "is not a boolean"),
        string: new BasicType(function(v) {
          return typeof v === "string";
        }, "is not a string"),
        symbol: new BasicType(function(v) {
          return typeof v === "symbol";
        }, "is not a symbol"),
        void: new BasicType(function(v) {
          return v == null;
        }, "is not void"),
        undefined: new BasicType(function(v) {
          return v === void 0;
        }, "is not undefined"),
        null: new BasicType(function(v) {
          return v === null;
        }, "is not null"),
        never: new BasicType(function(v) {
          return false;
        }, "is unexpected"),
        Date: new BasicType(getIsNativeChecker("[object Date]"), "is not a Date"),
        RegExp: new BasicType(getIsNativeChecker("[object RegExp]"), "is not a RegExp")
      };
      var nativeToString = Object.prototype.toString;
      function getIsNativeChecker(tag) {
        return function(v) {
          return typeof v === "object" && v && nativeToString.call(v) === tag;
        };
      }
      if (typeof Buffer !== "undefined") {
        exports.basicTypes.Buffer = new BasicType(function(v) {
          return Buffer.isBuffer(v);
        }, "is not a Buffer");
      }
      var _loop_1 = function(array_12) {
        exports.basicTypes[array_12.name] = new BasicType(function(v) {
          return v instanceof array_12;
        }, "is not a " + array_12.name);
      };
      for (_i = 0, _a = [
        Int8Array,
        Uint8Array,
        Uint8ClampedArray,
        Int16Array,
        Uint16Array,
        Int32Array,
        Uint32Array,
        Float32Array,
        Float64Array,
        ArrayBuffer
      ]; _i < _a.length; _i++) {
        array_1 = _a[_i];
        _loop_1(array_1);
      }
      var array_1;
      var _i;
      var _a;
    }
  });

  // node_modules/ts-interface-checker/dist/index.js
  var require_dist = __commonJS({
    "node_modules/ts-interface-checker/dist/index.js"(exports) {
      "use strict";
      var __spreadArrays = exports && exports.__spreadArrays || function() {
        for (var s = 0, i = 0, il = arguments.length; i < il; i++)
          s += arguments[i].length;
        for (var r = Array(s), k = 0, i = 0; i < il; i++)
          for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
        return r;
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Checker = exports.createCheckers = void 0;
      var types_1 = require_types2();
      var util_1 = require_util2();
      var types_2 = require_types2();
      Object.defineProperty(exports, "TArray", { enumerable: true, get: function() {
        return types_2.TArray;
      } });
      Object.defineProperty(exports, "TEnumType", { enumerable: true, get: function() {
        return types_2.TEnumType;
      } });
      Object.defineProperty(exports, "TEnumLiteral", { enumerable: true, get: function() {
        return types_2.TEnumLiteral;
      } });
      Object.defineProperty(exports, "TFunc", { enumerable: true, get: function() {
        return types_2.TFunc;
      } });
      Object.defineProperty(exports, "TIface", { enumerable: true, get: function() {
        return types_2.TIface;
      } });
      Object.defineProperty(exports, "TLiteral", { enumerable: true, get: function() {
        return types_2.TLiteral;
      } });
      Object.defineProperty(exports, "TName", { enumerable: true, get: function() {
        return types_2.TName;
      } });
      Object.defineProperty(exports, "TOptional", { enumerable: true, get: function() {
        return types_2.TOptional;
      } });
      Object.defineProperty(exports, "TParam", { enumerable: true, get: function() {
        return types_2.TParam;
      } });
      Object.defineProperty(exports, "TParamList", { enumerable: true, get: function() {
        return types_2.TParamList;
      } });
      Object.defineProperty(exports, "TProp", { enumerable: true, get: function() {
        return types_2.TProp;
      } });
      Object.defineProperty(exports, "TTuple", { enumerable: true, get: function() {
        return types_2.TTuple;
      } });
      Object.defineProperty(exports, "TType", { enumerable: true, get: function() {
        return types_2.TType;
      } });
      Object.defineProperty(exports, "TUnion", { enumerable: true, get: function() {
        return types_2.TUnion;
      } });
      Object.defineProperty(exports, "TIntersection", { enumerable: true, get: function() {
        return types_2.TIntersection;
      } });
      Object.defineProperty(exports, "array", { enumerable: true, get: function() {
        return types_2.array;
      } });
      Object.defineProperty(exports, "enumlit", { enumerable: true, get: function() {
        return types_2.enumlit;
      } });
      Object.defineProperty(exports, "enumtype", { enumerable: true, get: function() {
        return types_2.enumtype;
      } });
      Object.defineProperty(exports, "func", { enumerable: true, get: function() {
        return types_2.func;
      } });
      Object.defineProperty(exports, "iface", { enumerable: true, get: function() {
        return types_2.iface;
      } });
      Object.defineProperty(exports, "lit", { enumerable: true, get: function() {
        return types_2.lit;
      } });
      Object.defineProperty(exports, "name", { enumerable: true, get: function() {
        return types_2.name;
      } });
      Object.defineProperty(exports, "opt", { enumerable: true, get: function() {
        return types_2.opt;
      } });
      Object.defineProperty(exports, "param", { enumerable: true, get: function() {
        return types_2.param;
      } });
      Object.defineProperty(exports, "tuple", { enumerable: true, get: function() {
        return types_2.tuple;
      } });
      Object.defineProperty(exports, "union", { enumerable: true, get: function() {
        return types_2.union;
      } });
      Object.defineProperty(exports, "intersection", { enumerable: true, get: function() {
        return types_2.intersection;
      } });
      Object.defineProperty(exports, "BasicType", { enumerable: true, get: function() {
        return types_2.BasicType;
      } });
      var util_2 = require_util2();
      Object.defineProperty(exports, "VError", { enumerable: true, get: function() {
        return util_2.VError;
      } });
      function createCheckers() {
        var typeSuite = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          typeSuite[_i] = arguments[_i];
        }
        var fullSuite = Object.assign.apply(Object, __spreadArrays([{}, types_1.basicTypes], typeSuite));
        var checkers = {};
        for (var _a = 0, typeSuite_1 = typeSuite; _a < typeSuite_1.length; _a++) {
          var suite_1 = typeSuite_1[_a];
          for (var _b = 0, _c = Object.keys(suite_1); _b < _c.length; _b++) {
            var name = _c[_b];
            checkers[name] = new Checker(fullSuite, suite_1[name]);
          }
        }
        return checkers;
      }
      exports.createCheckers = createCheckers;
      var Checker = function() {
        function Checker2(suite, ttype, _path) {
          if (_path === void 0) {
            _path = "value";
          }
          this.suite = suite;
          this.ttype = ttype;
          this._path = _path;
          this.props = new Map();
          if (ttype instanceof types_1.TIface) {
            for (var _i = 0, _a = ttype.props; _i < _a.length; _i++) {
              var p = _a[_i];
              this.props.set(p.name, p.ttype);
            }
          }
          this.checkerPlain = this.ttype.getChecker(suite, false);
          this.checkerStrict = this.ttype.getChecker(suite, true);
        }
        Checker2.prototype.setReportedPath = function(path) {
          this._path = path;
        };
        Checker2.prototype.check = function(value) {
          return this._doCheck(this.checkerPlain, value);
        };
        Checker2.prototype.test = function(value) {
          return this.checkerPlain(value, new util_1.NoopContext());
        };
        Checker2.prototype.validate = function(value) {
          return this._doValidate(this.checkerPlain, value);
        };
        Checker2.prototype.strictCheck = function(value) {
          return this._doCheck(this.checkerStrict, value);
        };
        Checker2.prototype.strictTest = function(value) {
          return this.checkerStrict(value, new util_1.NoopContext());
        };
        Checker2.prototype.strictValidate = function(value) {
          return this._doValidate(this.checkerStrict, value);
        };
        Checker2.prototype.getProp = function(prop) {
          var ttype = this.props.get(prop);
          if (!ttype) {
            throw new Error("Type has no property " + prop);
          }
          return new Checker2(this.suite, ttype, this._path + "." + prop);
        };
        Checker2.prototype.methodArgs = function(methodName) {
          var tfunc = this._getMethod(methodName);
          return new Checker2(this.suite, tfunc.paramList);
        };
        Checker2.prototype.methodResult = function(methodName) {
          var tfunc = this._getMethod(methodName);
          return new Checker2(this.suite, tfunc.result);
        };
        Checker2.prototype.getArgs = function() {
          if (!(this.ttype instanceof types_1.TFunc)) {
            throw new Error("getArgs() applied to non-function");
          }
          return new Checker2(this.suite, this.ttype.paramList);
        };
        Checker2.prototype.getResult = function() {
          if (!(this.ttype instanceof types_1.TFunc)) {
            throw new Error("getResult() applied to non-function");
          }
          return new Checker2(this.suite, this.ttype.result);
        };
        Checker2.prototype.getType = function() {
          return this.ttype;
        };
        Checker2.prototype._doCheck = function(checkerFunc, value) {
          var noopCtx = new util_1.NoopContext();
          if (!checkerFunc(value, noopCtx)) {
            var detailCtx = new util_1.DetailContext();
            checkerFunc(value, detailCtx);
            throw detailCtx.getError(this._path);
          }
        };
        Checker2.prototype._doValidate = function(checkerFunc, value) {
          var noopCtx = new util_1.NoopContext();
          if (checkerFunc(value, noopCtx)) {
            return null;
          }
          var detailCtx = new util_1.DetailContext();
          checkerFunc(value, detailCtx);
          return detailCtx.getErrorDetail(this._path);
        };
        Checker2.prototype._getMethod = function(methodName) {
          var ttype = this.props.get(methodName);
          if (!ttype) {
            throw new Error("Type has no property " + methodName);
          }
          if (!(ttype instanceof types_1.TFunc)) {
            throw new Error("Property " + methodName + " is not a method");
          }
          return ttype;
        };
        return Checker2;
      }();
      exports.Checker = Checker;
    }
  });

  // node_modules/sucrase/dist/Options-gen-types.js
  var require_Options_gen_types = __commonJS({
    "node_modules/sucrase/dist/Options-gen-types.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      function _interopRequireWildcard(obj) {
        if (obj && obj.__esModule) {
          return obj;
        } else {
          var newObj = {};
          if (obj != null) {
            for (var key in obj) {
              if (Object.prototype.hasOwnProperty.call(obj, key)) {
                newObj[key] = obj[key];
              }
            }
          }
          newObj.default = obj;
          return newObj;
        }
      }
      var _tsinterfacechecker = require_dist();
      var t = _interopRequireWildcard(_tsinterfacechecker);
      var Transform = t.union(t.lit("jsx"), t.lit("typescript"), t.lit("flow"), t.lit("imports"), t.lit("react-hot-loader"), t.lit("jest"));
      exports.Transform = Transform;
      var SourceMapOptions = t.iface([], {
        compiledFilename: "string"
      });
      exports.SourceMapOptions = SourceMapOptions;
      var Options = t.iface([], {
        transforms: t.array("Transform"),
        jsxPragma: t.opt("string"),
        jsxFragmentPragma: t.opt("string"),
        enableLegacyTypeScriptModuleInterop: t.opt("boolean"),
        enableLegacyBabel5ModuleInterop: t.opt("boolean"),
        sourceMapOptions: t.opt("SourceMapOptions"),
        filePath: t.opt("string"),
        production: t.opt("boolean"),
        disableESTransforms: t.opt("boolean")
      });
      exports.Options = Options;
      var exportedTypeSuite = {
        Transform: exports.Transform,
        SourceMapOptions: exports.SourceMapOptions,
        Options: exports.Options
      };
      exports.default = exportedTypeSuite;
    }
  });

  // node_modules/sucrase/dist/Options.js
  var require_Options = __commonJS({
    "node_modules/sucrase/dist/Options.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : { default: obj };
      }
      var _tsinterfacechecker = require_dist();
      var _Optionsgentypes = require_Options_gen_types();
      var _Optionsgentypes2 = _interopRequireDefault(_Optionsgentypes);
      var { Options: OptionsChecker } = _tsinterfacechecker.createCheckers.call(void 0, _Optionsgentypes2.default);
      function validateOptions2(options) {
        OptionsChecker.strictCheck(options);
      }
      exports.validateOptions = validateOptions2;
    }
  });

  // node_modules/sucrase/dist/parser/traverser/lval.js
  var require_lval = __commonJS({
    "node_modules/sucrase/dist/parser/traverser/lval.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var _flow = require_flow();
      var _typescript = require_typescript();
      var _index = require_tokenizer();
      var _keywords = require_keywords();
      var _types = require_types();
      var _base = require_base();
      var _expression = require_expression();
      var _util = require_util();
      function parseSpread() {
        _index.next.call(void 0);
        _expression.parseMaybeAssign.call(void 0, false);
      }
      exports.parseSpread = parseSpread;
      function parseRest(isBlockScope) {
        _index.next.call(void 0);
        parseBindingAtom(isBlockScope);
      }
      exports.parseRest = parseRest;
      function parseBindingIdentifier(isBlockScope) {
        _expression.parseIdentifier.call(void 0);
        markPriorBindingIdentifier(isBlockScope);
      }
      exports.parseBindingIdentifier = parseBindingIdentifier;
      function parseImportedIdentifier() {
        _expression.parseIdentifier.call(void 0);
        _base.state.tokens[_base.state.tokens.length - 1].identifierRole = _index.IdentifierRole.ImportDeclaration;
      }
      exports.parseImportedIdentifier = parseImportedIdentifier;
      function markPriorBindingIdentifier(isBlockScope) {
        let identifierRole;
        if (_base.state.scopeDepth === 0) {
          identifierRole = _index.IdentifierRole.TopLevelDeclaration;
        } else if (isBlockScope) {
          identifierRole = _index.IdentifierRole.BlockScopedDeclaration;
        } else {
          identifierRole = _index.IdentifierRole.FunctionScopedDeclaration;
        }
        _base.state.tokens[_base.state.tokens.length - 1].identifierRole = identifierRole;
      }
      exports.markPriorBindingIdentifier = markPriorBindingIdentifier;
      function parseBindingAtom(isBlockScope) {
        switch (_base.state.type) {
          case _types.TokenType._this: {
            const oldIsType = _index.pushTypeContext.call(void 0, 0);
            _index.next.call(void 0);
            _index.popTypeContext.call(void 0, oldIsType);
            return;
          }
          case _types.TokenType._yield:
          case _types.TokenType.name: {
            _base.state.type = _types.TokenType.name;
            parseBindingIdentifier(isBlockScope);
            return;
          }
          case _types.TokenType.bracketL: {
            _index.next.call(void 0);
            parseBindingList(_types.TokenType.bracketR, isBlockScope, true);
            return;
          }
          case _types.TokenType.braceL:
            _expression.parseObj.call(void 0, true, isBlockScope);
            return;
          default:
            _util.unexpected.call(void 0);
        }
      }
      exports.parseBindingAtom = parseBindingAtom;
      function parseBindingList(close, isBlockScope, allowEmpty = false, allowModifiers = false, contextId = 0) {
        let first = true;
        let hasRemovedComma = false;
        const firstItemTokenIndex = _base.state.tokens.length;
        while (!_index.eat.call(void 0, close) && !_base.state.error) {
          if (first) {
            first = false;
          } else {
            _util.expect.call(void 0, _types.TokenType.comma);
            _base.state.tokens[_base.state.tokens.length - 1].contextId = contextId;
            if (!hasRemovedComma && _base.state.tokens[firstItemTokenIndex].isType) {
              _base.state.tokens[_base.state.tokens.length - 1].isType = true;
              hasRemovedComma = true;
            }
          }
          if (allowEmpty && _index.match.call(void 0, _types.TokenType.comma)) {
          } else if (_index.eat.call(void 0, close)) {
            break;
          } else if (_index.match.call(void 0, _types.TokenType.ellipsis)) {
            parseRest(isBlockScope);
            parseAssignableListItemTypes();
            _index.eat.call(void 0, _types.TokenType.comma);
            _util.expect.call(void 0, close);
            break;
          } else {
            parseAssignableListItem(allowModifiers, isBlockScope);
          }
        }
      }
      exports.parseBindingList = parseBindingList;
      function parseAssignableListItem(allowModifiers, isBlockScope) {
        if (allowModifiers) {
          _typescript.tsParseModifiers.call(void 0, [
            _keywords.ContextualKeyword._public,
            _keywords.ContextualKeyword._protected,
            _keywords.ContextualKeyword._private,
            _keywords.ContextualKeyword._readonly,
            _keywords.ContextualKeyword._override
          ]);
        }
        parseMaybeDefault(isBlockScope);
        parseAssignableListItemTypes();
        parseMaybeDefault(isBlockScope, true);
      }
      function parseAssignableListItemTypes() {
        if (_base.isFlowEnabled) {
          _flow.flowParseAssignableListItemTypes.call(void 0);
        } else if (_base.isTypeScriptEnabled) {
          _typescript.tsParseAssignableListItemTypes.call(void 0);
        }
      }
      function parseMaybeDefault(isBlockScope, leftAlreadyParsed = false) {
        if (!leftAlreadyParsed) {
          parseBindingAtom(isBlockScope);
        }
        if (!_index.eat.call(void 0, _types.TokenType.eq)) {
          return;
        }
        const eqIndex = _base.state.tokens.length - 1;
        _expression.parseMaybeAssign.call(void 0);
        _base.state.tokens[eqIndex].rhsEndIndex = _base.state.tokens.length;
      }
      exports.parseMaybeDefault = parseMaybeDefault;
    }
  });

  // node_modules/sucrase/dist/parser/plugins/typescript.js
  var require_typescript = __commonJS({
    "node_modules/sucrase/dist/parser/plugins/typescript.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var _index = require_tokenizer();
      var _keywords = require_keywords();
      var _types = require_types();
      var _base = require_base();
      var _expression = require_expression();
      var _lval = require_lval();
      var _statement = require_statement();
      var _util = require_util();
      var _jsx = require_jsx();
      function tsIsIdentifier() {
        return _index.match.call(void 0, _types.TokenType.name);
      }
      function isLiteralPropertyName() {
        return _index.match.call(void 0, _types.TokenType.name) || Boolean(_base.state.type & _types.TokenType.IS_KEYWORD) || _index.match.call(void 0, _types.TokenType.string) || _index.match.call(void 0, _types.TokenType.num) || _index.match.call(void 0, _types.TokenType.bigint) || _index.match.call(void 0, _types.TokenType.decimal);
      }
      function tsNextTokenCanFollowModifier() {
        const snapshot = _base.state.snapshot();
        _index.next.call(void 0);
        const canFollowModifier = (_index.match.call(void 0, _types.TokenType.bracketL) || _index.match.call(void 0, _types.TokenType.braceL) || _index.match.call(void 0, _types.TokenType.star) || _index.match.call(void 0, _types.TokenType.ellipsis) || _index.match.call(void 0, _types.TokenType.hash) || isLiteralPropertyName()) && !_util.hasPrecedingLineBreak.call(void 0);
        if (canFollowModifier) {
          return true;
        } else {
          _base.state.restoreFromSnapshot(snapshot);
          return false;
        }
      }
      function tsParseModifiers(allowedModifiers) {
        while (true) {
          const modifier = tsParseModifier(allowedModifiers);
          if (modifier === null) {
            break;
          }
        }
      }
      exports.tsParseModifiers = tsParseModifiers;
      function tsParseModifier(allowedModifiers) {
        if (!_index.match.call(void 0, _types.TokenType.name)) {
          return null;
        }
        const modifier = _base.state.contextualKeyword;
        if (allowedModifiers.indexOf(modifier) !== -1 && tsNextTokenCanFollowModifier()) {
          switch (modifier) {
            case _keywords.ContextualKeyword._readonly:
              _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._readonly;
              break;
            case _keywords.ContextualKeyword._abstract:
              _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._abstract;
              break;
            case _keywords.ContextualKeyword._static:
              _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._static;
              break;
            case _keywords.ContextualKeyword._public:
              _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._public;
              break;
            case _keywords.ContextualKeyword._private:
              _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._private;
              break;
            case _keywords.ContextualKeyword._protected:
              _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._protected;
              break;
            case _keywords.ContextualKeyword._override:
              _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._override;
              break;
            case _keywords.ContextualKeyword._declare:
              _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._declare;
              break;
            default:
              break;
          }
          return modifier;
        }
        return null;
      }
      exports.tsParseModifier = tsParseModifier;
      function tsParseEntityName() {
        _expression.parseIdentifier.call(void 0);
        while (_index.eat.call(void 0, _types.TokenType.dot)) {
          _expression.parseIdentifier.call(void 0);
        }
      }
      function tsParseTypeReference() {
        tsParseEntityName();
        if (!_util.hasPrecedingLineBreak.call(void 0) && _index.match.call(void 0, _types.TokenType.lessThan)) {
          tsParseTypeArguments();
        }
      }
      function tsParseThisTypePredicate() {
        _index.next.call(void 0);
        tsParseTypeAnnotation();
      }
      function tsParseThisTypeNode() {
        _index.next.call(void 0);
      }
      function tsParseTypeQuery() {
        _util.expect.call(void 0, _types.TokenType._typeof);
        if (_index.match.call(void 0, _types.TokenType._import)) {
          tsParseImportType();
        } else {
          tsParseEntityName();
        }
      }
      function tsParseImportType() {
        _util.expect.call(void 0, _types.TokenType._import);
        _util.expect.call(void 0, _types.TokenType.parenL);
        _util.expect.call(void 0, _types.TokenType.string);
        _util.expect.call(void 0, _types.TokenType.parenR);
        if (_index.eat.call(void 0, _types.TokenType.dot)) {
          tsParseEntityName();
        }
        if (_index.match.call(void 0, _types.TokenType.lessThan)) {
          tsParseTypeArguments();
        }
      }
      function tsParseTypeParameter() {
        _expression.parseIdentifier.call(void 0);
        if (_index.eat.call(void 0, _types.TokenType._extends)) {
          tsParseType();
        }
        if (_index.eat.call(void 0, _types.TokenType.eq)) {
          tsParseType();
        }
      }
      function tsTryParseTypeParameters() {
        if (_index.match.call(void 0, _types.TokenType.lessThan)) {
          tsParseTypeParameters();
        }
      }
      exports.tsTryParseTypeParameters = tsTryParseTypeParameters;
      function tsParseTypeParameters() {
        const oldIsType = _index.pushTypeContext.call(void 0, 0);
        if (_index.match.call(void 0, _types.TokenType.lessThan) || _index.match.call(void 0, _types.TokenType.typeParameterStart)) {
          _index.next.call(void 0);
        } else {
          _util.unexpected.call(void 0);
        }
        while (!_index.eat.call(void 0, _types.TokenType.greaterThan) && !_base.state.error) {
          tsParseTypeParameter();
          _index.eat.call(void 0, _types.TokenType.comma);
        }
        _index.popTypeContext.call(void 0, oldIsType);
      }
      function tsFillSignature(returnToken) {
        const returnTokenRequired = returnToken === _types.TokenType.arrow;
        tsTryParseTypeParameters();
        _util.expect.call(void 0, _types.TokenType.parenL);
        _base.state.scopeDepth++;
        tsParseBindingListForSignature(false);
        _base.state.scopeDepth--;
        if (returnTokenRequired) {
          tsParseTypeOrTypePredicateAnnotation(returnToken);
        } else if (_index.match.call(void 0, returnToken)) {
          tsParseTypeOrTypePredicateAnnotation(returnToken);
        }
      }
      function tsParseBindingListForSignature(isBlockScope) {
        _lval.parseBindingList.call(void 0, _types.TokenType.parenR, isBlockScope);
      }
      function tsParseTypeMemberSemicolon() {
        if (!_index.eat.call(void 0, _types.TokenType.comma)) {
          _util.semicolon.call(void 0);
        }
      }
      function tsParseSignatureMember() {
        tsFillSignature(_types.TokenType.colon);
        tsParseTypeMemberSemicolon();
      }
      function tsIsUnambiguouslyIndexSignature() {
        const snapshot = _base.state.snapshot();
        _index.next.call(void 0);
        const isIndexSignature = _index.eat.call(void 0, _types.TokenType.name) && _index.match.call(void 0, _types.TokenType.colon);
        _base.state.restoreFromSnapshot(snapshot);
        return isIndexSignature;
      }
      function tsTryParseIndexSignature() {
        if (!(_index.match.call(void 0, _types.TokenType.bracketL) && tsIsUnambiguouslyIndexSignature())) {
          return false;
        }
        const oldIsType = _index.pushTypeContext.call(void 0, 0);
        _util.expect.call(void 0, _types.TokenType.bracketL);
        _expression.parseIdentifier.call(void 0);
        tsParseTypeAnnotation();
        _util.expect.call(void 0, _types.TokenType.bracketR);
        tsTryParseTypeAnnotation();
        tsParseTypeMemberSemicolon();
        _index.popTypeContext.call(void 0, oldIsType);
        return true;
      }
      function tsParsePropertyOrMethodSignature(isReadonly) {
        _index.eat.call(void 0, _types.TokenType.question);
        if (!isReadonly && (_index.match.call(void 0, _types.TokenType.parenL) || _index.match.call(void 0, _types.TokenType.lessThan))) {
          tsFillSignature(_types.TokenType.colon);
          tsParseTypeMemberSemicolon();
        } else {
          tsTryParseTypeAnnotation();
          tsParseTypeMemberSemicolon();
        }
      }
      function tsParseTypeMember() {
        if (_index.match.call(void 0, _types.TokenType.parenL) || _index.match.call(void 0, _types.TokenType.lessThan)) {
          tsParseSignatureMember();
          return;
        }
        if (_index.match.call(void 0, _types.TokenType._new)) {
          _index.next.call(void 0);
          if (_index.match.call(void 0, _types.TokenType.parenL) || _index.match.call(void 0, _types.TokenType.lessThan)) {
            tsParseSignatureMember();
          } else {
            tsParsePropertyOrMethodSignature(false);
          }
          return;
        }
        const readonly = !!tsParseModifier([_keywords.ContextualKeyword._readonly]);
        const found = tsTryParseIndexSignature();
        if (found) {
          return;
        }
        if ((_util.isContextual.call(void 0, _keywords.ContextualKeyword._get) || _util.isContextual.call(void 0, _keywords.ContextualKeyword._set)) && tsNextTokenCanFollowModifier()) {
        }
        _expression.parsePropertyName.call(void 0, -1);
        tsParsePropertyOrMethodSignature(readonly);
      }
      function tsParseTypeLiteral() {
        tsParseObjectTypeMembers();
      }
      function tsParseObjectTypeMembers() {
        _util.expect.call(void 0, _types.TokenType.braceL);
        while (!_index.eat.call(void 0, _types.TokenType.braceR) && !_base.state.error) {
          tsParseTypeMember();
        }
      }
      function tsLookaheadIsStartOfMappedType() {
        const snapshot = _base.state.snapshot();
        const isStartOfMappedType = tsIsStartOfMappedType();
        _base.state.restoreFromSnapshot(snapshot);
        return isStartOfMappedType;
      }
      function tsIsStartOfMappedType() {
        _index.next.call(void 0);
        if (_index.eat.call(void 0, _types.TokenType.plus) || _index.eat.call(void 0, _types.TokenType.minus)) {
          return _util.isContextual.call(void 0, _keywords.ContextualKeyword._readonly);
        }
        if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._readonly)) {
          _index.next.call(void 0);
        }
        if (!_index.match.call(void 0, _types.TokenType.bracketL)) {
          return false;
        }
        _index.next.call(void 0);
        if (!tsIsIdentifier()) {
          return false;
        }
        _index.next.call(void 0);
        return _index.match.call(void 0, _types.TokenType._in);
      }
      function tsParseMappedTypeParameter() {
        _expression.parseIdentifier.call(void 0);
        _util.expect.call(void 0, _types.TokenType._in);
        tsParseType();
      }
      function tsParseMappedType() {
        _util.expect.call(void 0, _types.TokenType.braceL);
        if (_index.match.call(void 0, _types.TokenType.plus) || _index.match.call(void 0, _types.TokenType.minus)) {
          _index.next.call(void 0);
          _util.expectContextual.call(void 0, _keywords.ContextualKeyword._readonly);
        } else {
          _util.eatContextual.call(void 0, _keywords.ContextualKeyword._readonly);
        }
        _util.expect.call(void 0, _types.TokenType.bracketL);
        tsParseMappedTypeParameter();
        if (_util.eatContextual.call(void 0, _keywords.ContextualKeyword._as)) {
          tsParseType();
        }
        _util.expect.call(void 0, _types.TokenType.bracketR);
        if (_index.match.call(void 0, _types.TokenType.plus) || _index.match.call(void 0, _types.TokenType.minus)) {
          _index.next.call(void 0);
          _util.expect.call(void 0, _types.TokenType.question);
        } else {
          _index.eat.call(void 0, _types.TokenType.question);
        }
        tsTryParseType();
        _util.semicolon.call(void 0);
        _util.expect.call(void 0, _types.TokenType.braceR);
      }
      function tsParseTupleType() {
        _util.expect.call(void 0, _types.TokenType.bracketL);
        while (!_index.eat.call(void 0, _types.TokenType.bracketR) && !_base.state.error) {
          tsParseTupleElementType();
          _index.eat.call(void 0, _types.TokenType.comma);
        }
      }
      function tsParseTupleElementType() {
        if (_index.eat.call(void 0, _types.TokenType.ellipsis)) {
          tsParseType();
        } else {
          tsParseType();
          _index.eat.call(void 0, _types.TokenType.question);
        }
        if (_index.eat.call(void 0, _types.TokenType.colon)) {
          tsParseType();
        }
      }
      function tsParseParenthesizedType() {
        _util.expect.call(void 0, _types.TokenType.parenL);
        tsParseType();
        _util.expect.call(void 0, _types.TokenType.parenR);
      }
      function tsParseTemplateLiteralType() {
        _index.nextTemplateToken.call(void 0);
        _index.nextTemplateToken.call(void 0);
        while (!_index.match.call(void 0, _types.TokenType.backQuote) && !_base.state.error) {
          _util.expect.call(void 0, _types.TokenType.dollarBraceL);
          tsParseType();
          _index.nextTemplateToken.call(void 0);
          _index.nextTemplateToken.call(void 0);
        }
        _index.next.call(void 0);
      }
      var FunctionType;
      (function(FunctionType2) {
        const TSFunctionType = 0;
        FunctionType2[FunctionType2["TSFunctionType"] = TSFunctionType] = "TSFunctionType";
        const TSConstructorType = TSFunctionType + 1;
        FunctionType2[FunctionType2["TSConstructorType"] = TSConstructorType] = "TSConstructorType";
        const TSAbstractConstructorType = TSConstructorType + 1;
        FunctionType2[FunctionType2["TSAbstractConstructorType"] = TSAbstractConstructorType] = "TSAbstractConstructorType";
      })(FunctionType || (FunctionType = {}));
      function tsParseFunctionOrConstructorType(type) {
        if (type === FunctionType.TSAbstractConstructorType) {
          _util.expectContextual.call(void 0, _keywords.ContextualKeyword._abstract);
        }
        if (type === FunctionType.TSConstructorType || type === FunctionType.TSAbstractConstructorType) {
          _util.expect.call(void 0, _types.TokenType._new);
        }
        tsFillSignature(_types.TokenType.arrow);
      }
      function tsParseNonArrayType() {
        switch (_base.state.type) {
          case _types.TokenType.name:
            tsParseTypeReference();
            return;
          case _types.TokenType._void:
          case _types.TokenType._null:
            _index.next.call(void 0);
            return;
          case _types.TokenType.string:
          case _types.TokenType.num:
          case _types.TokenType.bigint:
          case _types.TokenType.decimal:
          case _types.TokenType._true:
          case _types.TokenType._false:
            _expression.parseLiteral.call(void 0);
            return;
          case _types.TokenType.minus:
            _index.next.call(void 0);
            _expression.parseLiteral.call(void 0);
            return;
          case _types.TokenType._this: {
            tsParseThisTypeNode();
            if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._is) && !_util.hasPrecedingLineBreak.call(void 0)) {
              tsParseThisTypePredicate();
            }
            return;
          }
          case _types.TokenType._typeof:
            tsParseTypeQuery();
            return;
          case _types.TokenType._import:
            tsParseImportType();
            return;
          case _types.TokenType.braceL:
            if (tsLookaheadIsStartOfMappedType()) {
              tsParseMappedType();
            } else {
              tsParseTypeLiteral();
            }
            return;
          case _types.TokenType.bracketL:
            tsParseTupleType();
            return;
          case _types.TokenType.parenL:
            tsParseParenthesizedType();
            return;
          case _types.TokenType.backQuote:
            tsParseTemplateLiteralType();
            return;
          default:
            if (_base.state.type & _types.TokenType.IS_KEYWORD) {
              _index.next.call(void 0);
              _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType.name;
              return;
            }
            break;
        }
        _util.unexpected.call(void 0);
      }
      function tsParseArrayTypeOrHigher() {
        tsParseNonArrayType();
        while (!_util.hasPrecedingLineBreak.call(void 0) && _index.eat.call(void 0, _types.TokenType.bracketL)) {
          if (!_index.eat.call(void 0, _types.TokenType.bracketR)) {
            tsParseType();
            _util.expect.call(void 0, _types.TokenType.bracketR);
          }
        }
      }
      function tsParseInferType() {
        _util.expectContextual.call(void 0, _keywords.ContextualKeyword._infer);
        _expression.parseIdentifier.call(void 0);
      }
      function tsParseTypeOperatorOrHigher() {
        if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._keyof) || _util.isContextual.call(void 0, _keywords.ContextualKeyword._unique) || _util.isContextual.call(void 0, _keywords.ContextualKeyword._readonly)) {
          _index.next.call(void 0);
          tsParseTypeOperatorOrHigher();
        } else if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._infer)) {
          tsParseInferType();
        } else {
          tsParseArrayTypeOrHigher();
        }
      }
      function tsParseIntersectionTypeOrHigher() {
        _index.eat.call(void 0, _types.TokenType.bitwiseAND);
        tsParseTypeOperatorOrHigher();
        if (_index.match.call(void 0, _types.TokenType.bitwiseAND)) {
          while (_index.eat.call(void 0, _types.TokenType.bitwiseAND)) {
            tsParseTypeOperatorOrHigher();
          }
        }
      }
      function tsParseUnionTypeOrHigher() {
        _index.eat.call(void 0, _types.TokenType.bitwiseOR);
        tsParseIntersectionTypeOrHigher();
        if (_index.match.call(void 0, _types.TokenType.bitwiseOR)) {
          while (_index.eat.call(void 0, _types.TokenType.bitwiseOR)) {
            tsParseIntersectionTypeOrHigher();
          }
        }
      }
      function tsIsStartOfFunctionType() {
        if (_index.match.call(void 0, _types.TokenType.lessThan)) {
          return true;
        }
        return _index.match.call(void 0, _types.TokenType.parenL) && tsLookaheadIsUnambiguouslyStartOfFunctionType();
      }
      function tsSkipParameterStart() {
        if (_index.match.call(void 0, _types.TokenType.name) || _index.match.call(void 0, _types.TokenType._this)) {
          _index.next.call(void 0);
          return true;
        }
        if (_index.match.call(void 0, _types.TokenType.braceL) || _index.match.call(void 0, _types.TokenType.bracketL)) {
          let depth = 1;
          _index.next.call(void 0);
          while (depth > 0 && !_base.state.error) {
            if (_index.match.call(void 0, _types.TokenType.braceL) || _index.match.call(void 0, _types.TokenType.bracketL)) {
              depth++;
            } else if (_index.match.call(void 0, _types.TokenType.braceR) || _index.match.call(void 0, _types.TokenType.bracketR)) {
              depth--;
            }
            _index.next.call(void 0);
          }
          return true;
        }
        return false;
      }
      function tsLookaheadIsUnambiguouslyStartOfFunctionType() {
        const snapshot = _base.state.snapshot();
        const isUnambiguouslyStartOfFunctionType = tsIsUnambiguouslyStartOfFunctionType();
        _base.state.restoreFromSnapshot(snapshot);
        return isUnambiguouslyStartOfFunctionType;
      }
      function tsIsUnambiguouslyStartOfFunctionType() {
        _index.next.call(void 0);
        if (_index.match.call(void 0, _types.TokenType.parenR) || _index.match.call(void 0, _types.TokenType.ellipsis)) {
          return true;
        }
        if (tsSkipParameterStart()) {
          if (_index.match.call(void 0, _types.TokenType.colon) || _index.match.call(void 0, _types.TokenType.comma) || _index.match.call(void 0, _types.TokenType.question) || _index.match.call(void 0, _types.TokenType.eq)) {
            return true;
          }
          if (_index.match.call(void 0, _types.TokenType.parenR)) {
            _index.next.call(void 0);
            if (_index.match.call(void 0, _types.TokenType.arrow)) {
              return true;
            }
          }
        }
        return false;
      }
      function tsParseTypeOrTypePredicateAnnotation(returnToken) {
        const oldIsType = _index.pushTypeContext.call(void 0, 0);
        _util.expect.call(void 0, returnToken);
        const finishedReturn = tsParseTypePredicateOrAssertsPrefix();
        if (!finishedReturn) {
          tsParseType();
        }
        _index.popTypeContext.call(void 0, oldIsType);
      }
      function tsTryParseTypeOrTypePredicateAnnotation() {
        if (_index.match.call(void 0, _types.TokenType.colon)) {
          tsParseTypeOrTypePredicateAnnotation(_types.TokenType.colon);
        }
      }
      function tsTryParseTypeAnnotation() {
        if (_index.match.call(void 0, _types.TokenType.colon)) {
          tsParseTypeAnnotation();
        }
      }
      exports.tsTryParseTypeAnnotation = tsTryParseTypeAnnotation;
      function tsTryParseType() {
        if (_index.eat.call(void 0, _types.TokenType.colon)) {
          tsParseType();
        }
      }
      function tsParseTypePredicateOrAssertsPrefix() {
        const snapshot = _base.state.snapshot();
        if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._asserts) && !_util.hasPrecedingLineBreak.call(void 0)) {
          _index.next.call(void 0);
          if (_util.eatContextual.call(void 0, _keywords.ContextualKeyword._is)) {
            tsParseType();
            return true;
          } else if (tsIsIdentifier() || _index.match.call(void 0, _types.TokenType._this)) {
            _index.next.call(void 0);
            if (_util.eatContextual.call(void 0, _keywords.ContextualKeyword._is)) {
              tsParseType();
            }
            return true;
          } else {
            _base.state.restoreFromSnapshot(snapshot);
            return false;
          }
        } else if (tsIsIdentifier() || _index.match.call(void 0, _types.TokenType._this)) {
          _index.next.call(void 0);
          if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._is) && !_util.hasPrecedingLineBreak.call(void 0)) {
            _index.next.call(void 0);
            tsParseType();
            return true;
          } else {
            _base.state.restoreFromSnapshot(snapshot);
            return false;
          }
        }
        return false;
      }
      function tsParseTypeAnnotation() {
        const oldIsType = _index.pushTypeContext.call(void 0, 0);
        _util.expect.call(void 0, _types.TokenType.colon);
        tsParseType();
        _index.popTypeContext.call(void 0, oldIsType);
      }
      exports.tsParseTypeAnnotation = tsParseTypeAnnotation;
      function tsParseType() {
        tsParseNonConditionalType();
        if (_util.hasPrecedingLineBreak.call(void 0) || !_index.eat.call(void 0, _types.TokenType._extends)) {
          return;
        }
        tsParseNonConditionalType();
        _util.expect.call(void 0, _types.TokenType.question);
        tsParseType();
        _util.expect.call(void 0, _types.TokenType.colon);
        tsParseType();
      }
      exports.tsParseType = tsParseType;
      function isAbstractConstructorSignature() {
        return _util.isContextual.call(void 0, _keywords.ContextualKeyword._abstract) && _index.lookaheadType.call(void 0) === _types.TokenType._new;
      }
      function tsParseNonConditionalType() {
        if (tsIsStartOfFunctionType()) {
          tsParseFunctionOrConstructorType(FunctionType.TSFunctionType);
          return;
        }
        if (_index.match.call(void 0, _types.TokenType._new)) {
          tsParseFunctionOrConstructorType(FunctionType.TSConstructorType);
          return;
        } else if (isAbstractConstructorSignature()) {
          tsParseFunctionOrConstructorType(FunctionType.TSAbstractConstructorType);
          return;
        }
        tsParseUnionTypeOrHigher();
      }
      exports.tsParseNonConditionalType = tsParseNonConditionalType;
      function tsParseTypeAssertion() {
        const oldIsType = _index.pushTypeContext.call(void 0, 1);
        tsParseType();
        _util.expect.call(void 0, _types.TokenType.greaterThan);
        _index.popTypeContext.call(void 0, oldIsType);
        _expression.parseMaybeUnary.call(void 0);
      }
      exports.tsParseTypeAssertion = tsParseTypeAssertion;
      function tsTryParseJSXTypeArgument() {
        if (_index.eat.call(void 0, _types.TokenType.jsxTagStart)) {
          _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType.typeParameterStart;
          const oldIsType = _index.pushTypeContext.call(void 0, 1);
          while (!_index.match.call(void 0, _types.TokenType.greaterThan) && !_base.state.error) {
            tsParseType();
            _index.eat.call(void 0, _types.TokenType.comma);
          }
          _jsx.nextJSXTagToken.call(void 0);
          _index.popTypeContext.call(void 0, oldIsType);
        }
      }
      exports.tsTryParseJSXTypeArgument = tsTryParseJSXTypeArgument;
      function tsParseHeritageClause() {
        while (!_index.match.call(void 0, _types.TokenType.braceL) && !_base.state.error) {
          tsParseExpressionWithTypeArguments();
          _index.eat.call(void 0, _types.TokenType.comma);
        }
      }
      function tsParseExpressionWithTypeArguments() {
        tsParseEntityName();
        if (_index.match.call(void 0, _types.TokenType.lessThan)) {
          tsParseTypeArguments();
        }
      }
      function tsParseInterfaceDeclaration() {
        _lval.parseBindingIdentifier.call(void 0, false);
        tsTryParseTypeParameters();
        if (_index.eat.call(void 0, _types.TokenType._extends)) {
          tsParseHeritageClause();
        }
        tsParseObjectTypeMembers();
      }
      function tsParseTypeAliasDeclaration() {
        _lval.parseBindingIdentifier.call(void 0, false);
        tsTryParseTypeParameters();
        _util.expect.call(void 0, _types.TokenType.eq);
        tsParseType();
        _util.semicolon.call(void 0);
      }
      function tsParseEnumMember() {
        if (_index.match.call(void 0, _types.TokenType.string)) {
          _expression.parseLiteral.call(void 0);
        } else {
          _expression.parseIdentifier.call(void 0);
        }
        if (_index.eat.call(void 0, _types.TokenType.eq)) {
          const eqIndex = _base.state.tokens.length - 1;
          _expression.parseMaybeAssign.call(void 0);
          _base.state.tokens[eqIndex].rhsEndIndex = _base.state.tokens.length;
        }
      }
      function tsParseEnumDeclaration() {
        _lval.parseBindingIdentifier.call(void 0, false);
        _util.expect.call(void 0, _types.TokenType.braceL);
        while (!_index.eat.call(void 0, _types.TokenType.braceR) && !_base.state.error) {
          tsParseEnumMember();
          _index.eat.call(void 0, _types.TokenType.comma);
        }
      }
      function tsParseModuleBlock() {
        _util.expect.call(void 0, _types.TokenType.braceL);
        _statement.parseBlockBody.call(void 0, _types.TokenType.braceR);
      }
      function tsParseModuleOrNamespaceDeclaration() {
        _lval.parseBindingIdentifier.call(void 0, false);
        if (_index.eat.call(void 0, _types.TokenType.dot)) {
          tsParseModuleOrNamespaceDeclaration();
        } else {
          tsParseModuleBlock();
        }
      }
      function tsParseAmbientExternalModuleDeclaration() {
        if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._global)) {
          _expression.parseIdentifier.call(void 0);
        } else if (_index.match.call(void 0, _types.TokenType.string)) {
          _expression.parseExprAtom.call(void 0);
        } else {
          _util.unexpected.call(void 0);
        }
        if (_index.match.call(void 0, _types.TokenType.braceL)) {
          tsParseModuleBlock();
        } else {
          _util.semicolon.call(void 0);
        }
      }
      function tsParseImportEqualsDeclaration() {
        _lval.parseImportedIdentifier.call(void 0);
        _util.expect.call(void 0, _types.TokenType.eq);
        tsParseModuleReference();
        _util.semicolon.call(void 0);
      }
      exports.tsParseImportEqualsDeclaration = tsParseImportEqualsDeclaration;
      function tsIsExternalModuleReference() {
        return _util.isContextual.call(void 0, _keywords.ContextualKeyword._require) && _index.lookaheadType.call(void 0) === _types.TokenType.parenL;
      }
      function tsParseModuleReference() {
        if (tsIsExternalModuleReference()) {
          tsParseExternalModuleReference();
        } else {
          tsParseEntityName();
        }
      }
      function tsParseExternalModuleReference() {
        _util.expectContextual.call(void 0, _keywords.ContextualKeyword._require);
        _util.expect.call(void 0, _types.TokenType.parenL);
        if (!_index.match.call(void 0, _types.TokenType.string)) {
          _util.unexpected.call(void 0);
        }
        _expression.parseLiteral.call(void 0);
        _util.expect.call(void 0, _types.TokenType.parenR);
      }
      function tsTryParseDeclare() {
        if (_util.isLineTerminator.call(void 0)) {
          return false;
        }
        switch (_base.state.type) {
          case _types.TokenType._function: {
            const oldIsType = _index.pushTypeContext.call(void 0, 1);
            _index.next.call(void 0);
            const functionStart = _base.state.start;
            _statement.parseFunction.call(void 0, functionStart, true);
            _index.popTypeContext.call(void 0, oldIsType);
            return true;
          }
          case _types.TokenType._class: {
            const oldIsType = _index.pushTypeContext.call(void 0, 1);
            _statement.parseClass.call(void 0, true, false);
            _index.popTypeContext.call(void 0, oldIsType);
            return true;
          }
          case _types.TokenType._const: {
            if (_index.match.call(void 0, _types.TokenType._const) && _util.isLookaheadContextual.call(void 0, _keywords.ContextualKeyword._enum)) {
              const oldIsType = _index.pushTypeContext.call(void 0, 1);
              _util.expect.call(void 0, _types.TokenType._const);
              _util.expectContextual.call(void 0, _keywords.ContextualKeyword._enum);
              _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._enum;
              tsParseEnumDeclaration();
              _index.popTypeContext.call(void 0, oldIsType);
              return true;
            }
          }
          case _types.TokenType._var:
          case _types.TokenType._let: {
            const oldIsType = _index.pushTypeContext.call(void 0, 1);
            _statement.parseVarStatement.call(void 0, _base.state.type);
            _index.popTypeContext.call(void 0, oldIsType);
            return true;
          }
          case _types.TokenType.name: {
            const oldIsType = _index.pushTypeContext.call(void 0, 1);
            const contextualKeyword = _base.state.contextualKeyword;
            let matched = false;
            if (contextualKeyword === _keywords.ContextualKeyword._global) {
              tsParseAmbientExternalModuleDeclaration();
              matched = true;
            } else {
              matched = tsParseDeclaration(contextualKeyword, true);
            }
            _index.popTypeContext.call(void 0, oldIsType);
            return matched;
          }
          default:
            return false;
        }
      }
      function tsTryParseExportDeclaration() {
        return tsParseDeclaration(_base.state.contextualKeyword, true);
      }
      function tsParseExpressionStatement(contextualKeyword) {
        switch (contextualKeyword) {
          case _keywords.ContextualKeyword._declare: {
            const declareTokenIndex = _base.state.tokens.length - 1;
            const matched = tsTryParseDeclare();
            if (matched) {
              _base.state.tokens[declareTokenIndex].type = _types.TokenType._declare;
              return true;
            }
            break;
          }
          case _keywords.ContextualKeyword._global:
            if (_index.match.call(void 0, _types.TokenType.braceL)) {
              tsParseModuleBlock();
              return true;
            }
            break;
          default:
            return tsParseDeclaration(contextualKeyword, false);
        }
        return false;
      }
      function tsParseDeclaration(contextualKeyword, isBeforeToken) {
        switch (contextualKeyword) {
          case _keywords.ContextualKeyword._abstract:
            if (tsCheckLineTerminator(isBeforeToken) && _index.match.call(void 0, _types.TokenType._class)) {
              _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._abstract;
              _statement.parseClass.call(void 0, true, false);
              return true;
            }
            break;
          case _keywords.ContextualKeyword._enum:
            if (tsCheckLineTerminator(isBeforeToken) && _index.match.call(void 0, _types.TokenType.name)) {
              _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._enum;
              tsParseEnumDeclaration();
              return true;
            }
            break;
          case _keywords.ContextualKeyword._interface:
            if (tsCheckLineTerminator(isBeforeToken) && _index.match.call(void 0, _types.TokenType.name)) {
              const oldIsType = _index.pushTypeContext.call(void 0, isBeforeToken ? 2 : 1);
              tsParseInterfaceDeclaration();
              _index.popTypeContext.call(void 0, oldIsType);
              return true;
            }
            break;
          case _keywords.ContextualKeyword._module:
            if (tsCheckLineTerminator(isBeforeToken)) {
              if (_index.match.call(void 0, _types.TokenType.string)) {
                const oldIsType = _index.pushTypeContext.call(void 0, isBeforeToken ? 2 : 1);
                tsParseAmbientExternalModuleDeclaration();
                _index.popTypeContext.call(void 0, oldIsType);
                return true;
              } else if (_index.match.call(void 0, _types.TokenType.name)) {
                const oldIsType = _index.pushTypeContext.call(void 0, isBeforeToken ? 2 : 1);
                tsParseModuleOrNamespaceDeclaration();
                _index.popTypeContext.call(void 0, oldIsType);
                return true;
              }
            }
            break;
          case _keywords.ContextualKeyword._namespace:
            if (tsCheckLineTerminator(isBeforeToken) && _index.match.call(void 0, _types.TokenType.name)) {
              const oldIsType = _index.pushTypeContext.call(void 0, isBeforeToken ? 2 : 1);
              tsParseModuleOrNamespaceDeclaration();
              _index.popTypeContext.call(void 0, oldIsType);
              return true;
            }
            break;
          case _keywords.ContextualKeyword._type:
            if (tsCheckLineTerminator(isBeforeToken) && _index.match.call(void 0, _types.TokenType.name)) {
              const oldIsType = _index.pushTypeContext.call(void 0, isBeforeToken ? 2 : 1);
              tsParseTypeAliasDeclaration();
              _index.popTypeContext.call(void 0, oldIsType);
              return true;
            }
            break;
          default:
            break;
        }
        return false;
      }
      function tsCheckLineTerminator(isBeforeToken) {
        if (isBeforeToken) {
          _index.next.call(void 0);
          return true;
        } else {
          return !_util.isLineTerminator.call(void 0);
        }
      }
      function tsTryParseGenericAsyncArrowFunction() {
        const snapshot = _base.state.snapshot();
        tsParseTypeParameters();
        _statement.parseFunctionParams.call(void 0);
        tsTryParseTypeOrTypePredicateAnnotation();
        _util.expect.call(void 0, _types.TokenType.arrow);
        if (_base.state.error) {
          _base.state.restoreFromSnapshot(snapshot);
          return false;
        }
        _expression.parseFunctionBody.call(void 0, true);
        return true;
      }
      function tsParseTypeArguments() {
        const oldIsType = _index.pushTypeContext.call(void 0, 0);
        _util.expect.call(void 0, _types.TokenType.lessThan);
        while (!_index.eat.call(void 0, _types.TokenType.greaterThan) && !_base.state.error) {
          tsParseType();
          _index.eat.call(void 0, _types.TokenType.comma);
        }
        _index.popTypeContext.call(void 0, oldIsType);
      }
      function tsIsDeclarationStart() {
        if (_index.match.call(void 0, _types.TokenType.name)) {
          switch (_base.state.contextualKeyword) {
            case _keywords.ContextualKeyword._abstract:
            case _keywords.ContextualKeyword._declare:
            case _keywords.ContextualKeyword._enum:
            case _keywords.ContextualKeyword._interface:
            case _keywords.ContextualKeyword._module:
            case _keywords.ContextualKeyword._namespace:
            case _keywords.ContextualKeyword._type:
              return true;
            default:
              break;
          }
        }
        return false;
      }
      exports.tsIsDeclarationStart = tsIsDeclarationStart;
      function tsParseFunctionBodyAndFinish(functionStart, funcContextId) {
        if (_index.match.call(void 0, _types.TokenType.colon)) {
          tsParseTypeOrTypePredicateAnnotation(_types.TokenType.colon);
        }
        if (!_index.match.call(void 0, _types.TokenType.braceL) && _util.isLineTerminator.call(void 0)) {
          let i = _base.state.tokens.length - 1;
          while (i >= 0 && (_base.state.tokens[i].start >= functionStart || _base.state.tokens[i].type === _types.TokenType._default || _base.state.tokens[i].type === _types.TokenType._export)) {
            _base.state.tokens[i].isType = true;
            i--;
          }
          return;
        }
        _expression.parseFunctionBody.call(void 0, false, funcContextId);
      }
      exports.tsParseFunctionBodyAndFinish = tsParseFunctionBodyAndFinish;
      function tsParseSubscript(startTokenIndex, noCalls, stopState) {
        if (!_util.hasPrecedingLineBreak.call(void 0) && _index.eat.call(void 0, _types.TokenType.bang)) {
          _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType.nonNullAssertion;
          return;
        }
        if (_index.match.call(void 0, _types.TokenType.lessThan)) {
          const snapshot = _base.state.snapshot();
          if (!noCalls && _expression.atPossibleAsync.call(void 0)) {
            const asyncArrowFn = tsTryParseGenericAsyncArrowFunction();
            if (asyncArrowFn) {
              return;
            }
          }
          tsParseTypeArguments();
          if (!noCalls && _index.eat.call(void 0, _types.TokenType.parenL)) {
            _base.state.tokens[_base.state.tokens.length - 1].subscriptStartIndex = startTokenIndex;
            _expression.parseCallExpressionArguments.call(void 0);
          } else if (_index.match.call(void 0, _types.TokenType.backQuote)) {
            _expression.parseTemplate.call(void 0);
          } else {
            _util.unexpected.call(void 0);
          }
          if (_base.state.error) {
            _base.state.restoreFromSnapshot(snapshot);
          } else {
            return;
          }
        } else if (!noCalls && _index.match.call(void 0, _types.TokenType.questionDot) && _index.lookaheadType.call(void 0) === _types.TokenType.lessThan) {
          _index.next.call(void 0);
          _base.state.tokens[startTokenIndex].isOptionalChainStart = true;
          _base.state.tokens[_base.state.tokens.length - 1].subscriptStartIndex = startTokenIndex;
          tsParseTypeArguments();
          _util.expect.call(void 0, _types.TokenType.parenL);
          _expression.parseCallExpressionArguments.call(void 0);
        }
        _expression.baseParseSubscript.call(void 0, startTokenIndex, noCalls, stopState);
      }
      exports.tsParseSubscript = tsParseSubscript;
      function tsStartParseNewArguments() {
        if (_index.match.call(void 0, _types.TokenType.lessThan)) {
          const snapshot = _base.state.snapshot();
          _base.state.type = _types.TokenType.typeParameterStart;
          tsParseTypeArguments();
          if (!_index.match.call(void 0, _types.TokenType.parenL)) {
            _util.unexpected.call(void 0);
          }
          if (_base.state.error) {
            _base.state.restoreFromSnapshot(snapshot);
          }
        }
      }
      exports.tsStartParseNewArguments = tsStartParseNewArguments;
      function tsTryParseExport() {
        if (_index.eat.call(void 0, _types.TokenType._import)) {
          if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._type) && _index.lookaheadType.call(void 0) !== _types.TokenType.eq) {
            _util.expectContextual.call(void 0, _keywords.ContextualKeyword._type);
          }
          tsParseImportEqualsDeclaration();
          return true;
        } else if (_index.eat.call(void 0, _types.TokenType.eq)) {
          _expression.parseExpression.call(void 0);
          _util.semicolon.call(void 0);
          return true;
        } else if (_util.eatContextual.call(void 0, _keywords.ContextualKeyword._as)) {
          _util.expectContextual.call(void 0, _keywords.ContextualKeyword._namespace);
          _expression.parseIdentifier.call(void 0);
          _util.semicolon.call(void 0);
          return true;
        } else {
          if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._type) && _index.lookaheadType.call(void 0) === _types.TokenType.braceL) {
            _index.next.call(void 0);
          }
          return false;
        }
      }
      exports.tsTryParseExport = tsTryParseExport;
      function tsTryParseExportDefaultExpression() {
        if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._abstract) && _index.lookaheadType.call(void 0) === _types.TokenType._class) {
          _base.state.type = _types.TokenType._abstract;
          _index.next.call(void 0);
          _statement.parseClass.call(void 0, true, true);
          return true;
        }
        if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._interface)) {
          const oldIsType = _index.pushTypeContext.call(void 0, 2);
          tsParseDeclaration(_keywords.ContextualKeyword._interface, true);
          _index.popTypeContext.call(void 0, oldIsType);
          return true;
        }
        return false;
      }
      exports.tsTryParseExportDefaultExpression = tsTryParseExportDefaultExpression;
      function tsTryParseStatementContent() {
        if (_base.state.type === _types.TokenType._const) {
          const ahead = _index.lookaheadTypeAndKeyword.call(void 0);
          if (ahead.type === _types.TokenType.name && ahead.contextualKeyword === _keywords.ContextualKeyword._enum) {
            _util.expect.call(void 0, _types.TokenType._const);
            _util.expectContextual.call(void 0, _keywords.ContextualKeyword._enum);
            _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._enum;
            tsParseEnumDeclaration();
            return true;
          }
        }
        return false;
      }
      exports.tsTryParseStatementContent = tsTryParseStatementContent;
      function tsTryParseClassMemberWithIsStatic(isStatic) {
        const memberStartIndexAfterStatic = _base.state.tokens.length;
        tsParseModifiers([
          _keywords.ContextualKeyword._abstract,
          _keywords.ContextualKeyword._readonly,
          _keywords.ContextualKeyword._declare,
          _keywords.ContextualKeyword._static,
          _keywords.ContextualKeyword._override
        ]);
        const modifiersEndIndex = _base.state.tokens.length;
        const found = tsTryParseIndexSignature();
        if (found) {
          const memberStartIndex = isStatic ? memberStartIndexAfterStatic - 1 : memberStartIndexAfterStatic;
          for (let i = memberStartIndex; i < modifiersEndIndex; i++) {
            _base.state.tokens[i].isType = true;
          }
          return true;
        }
        return false;
      }
      exports.tsTryParseClassMemberWithIsStatic = tsTryParseClassMemberWithIsStatic;
      function tsParseIdentifierStatement(contextualKeyword) {
        const matched = tsParseExpressionStatement(contextualKeyword);
        if (!matched) {
          _util.semicolon.call(void 0);
        }
      }
      exports.tsParseIdentifierStatement = tsParseIdentifierStatement;
      function tsParseExportDeclaration() {
        const isDeclare = _util.eatContextual.call(void 0, _keywords.ContextualKeyword._declare);
        if (isDeclare) {
          _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._declare;
        }
        let matchedDeclaration = false;
        if (_index.match.call(void 0, _types.TokenType.name)) {
          if (isDeclare) {
            const oldIsType = _index.pushTypeContext.call(void 0, 2);
            matchedDeclaration = tsTryParseExportDeclaration();
            _index.popTypeContext.call(void 0, oldIsType);
          } else {
            matchedDeclaration = tsTryParseExportDeclaration();
          }
        }
        if (!matchedDeclaration) {
          if (isDeclare) {
            const oldIsType = _index.pushTypeContext.call(void 0, 2);
            _statement.parseStatement.call(void 0, true);
            _index.popTypeContext.call(void 0, oldIsType);
          } else {
            _statement.parseStatement.call(void 0, true);
          }
        }
      }
      exports.tsParseExportDeclaration = tsParseExportDeclaration;
      function tsAfterParseClassSuper(hasSuper) {
        if (hasSuper && _index.match.call(void 0, _types.TokenType.lessThan)) {
          tsParseTypeArguments();
        }
        if (_util.eatContextual.call(void 0, _keywords.ContextualKeyword._implements)) {
          _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._implements;
          const oldIsType = _index.pushTypeContext.call(void 0, 1);
          tsParseHeritageClause();
          _index.popTypeContext.call(void 0, oldIsType);
        }
      }
      exports.tsAfterParseClassSuper = tsAfterParseClassSuper;
      function tsStartParseObjPropValue() {
        tsTryParseTypeParameters();
      }
      exports.tsStartParseObjPropValue = tsStartParseObjPropValue;
      function tsStartParseFunctionParams() {
        tsTryParseTypeParameters();
      }
      exports.tsStartParseFunctionParams = tsStartParseFunctionParams;
      function tsAfterParseVarHead() {
        const oldIsType = _index.pushTypeContext.call(void 0, 0);
        _index.eat.call(void 0, _types.TokenType.bang);
        tsTryParseTypeAnnotation();
        _index.popTypeContext.call(void 0, oldIsType);
      }
      exports.tsAfterParseVarHead = tsAfterParseVarHead;
      function tsStartParseAsyncArrowFromCallExpression() {
        if (_index.match.call(void 0, _types.TokenType.colon)) {
          tsParseTypeAnnotation();
        }
      }
      exports.tsStartParseAsyncArrowFromCallExpression = tsStartParseAsyncArrowFromCallExpression;
      function tsParseMaybeAssign(noIn, isWithinParens) {
        if (_base.isJSXEnabled) {
          return tsParseMaybeAssignWithJSX(noIn, isWithinParens);
        } else {
          return tsParseMaybeAssignWithoutJSX(noIn, isWithinParens);
        }
      }
      exports.tsParseMaybeAssign = tsParseMaybeAssign;
      function tsParseMaybeAssignWithJSX(noIn, isWithinParens) {
        if (!_index.match.call(void 0, _types.TokenType.lessThan)) {
          return _expression.baseParseMaybeAssign.call(void 0, noIn, isWithinParens);
        }
        const snapshot = _base.state.snapshot();
        let wasArrow = _expression.baseParseMaybeAssign.call(void 0, noIn, isWithinParens);
        if (_base.state.error) {
          _base.state.restoreFromSnapshot(snapshot);
        } else {
          return wasArrow;
        }
        _base.state.type = _types.TokenType.typeParameterStart;
        tsParseTypeParameters();
        wasArrow = _expression.baseParseMaybeAssign.call(void 0, noIn, isWithinParens);
        if (!wasArrow) {
          _util.unexpected.call(void 0);
        }
        return wasArrow;
      }
      exports.tsParseMaybeAssignWithJSX = tsParseMaybeAssignWithJSX;
      function tsParseMaybeAssignWithoutJSX(noIn, isWithinParens) {
        if (!_index.match.call(void 0, _types.TokenType.lessThan)) {
          return _expression.baseParseMaybeAssign.call(void 0, noIn, isWithinParens);
        }
        const snapshot = _base.state.snapshot();
        tsParseTypeParameters();
        const wasArrow = _expression.baseParseMaybeAssign.call(void 0, noIn, isWithinParens);
        if (!wasArrow) {
          _util.unexpected.call(void 0);
        }
        if (_base.state.error) {
          _base.state.restoreFromSnapshot(snapshot);
        } else {
          return wasArrow;
        }
        return _expression.baseParseMaybeAssign.call(void 0, noIn, isWithinParens);
      }
      exports.tsParseMaybeAssignWithoutJSX = tsParseMaybeAssignWithoutJSX;
      function tsParseArrow() {
        if (_index.match.call(void 0, _types.TokenType.colon)) {
          const snapshot = _base.state.snapshot();
          tsParseTypeOrTypePredicateAnnotation(_types.TokenType.colon);
          if (_util.canInsertSemicolon.call(void 0))
            _util.unexpected.call(void 0);
          if (!_index.match.call(void 0, _types.TokenType.arrow))
            _util.unexpected.call(void 0);
          if (_base.state.error) {
            _base.state.restoreFromSnapshot(snapshot);
          }
        }
        return _index.eat.call(void 0, _types.TokenType.arrow);
      }
      exports.tsParseArrow = tsParseArrow;
      function tsParseAssignableListItemTypes() {
        const oldIsType = _index.pushTypeContext.call(void 0, 0);
        _index.eat.call(void 0, _types.TokenType.question);
        tsTryParseTypeAnnotation();
        _index.popTypeContext.call(void 0, oldIsType);
      }
      exports.tsParseAssignableListItemTypes = tsParseAssignableListItemTypes;
      function tsParseMaybeDecoratorArguments() {
        if (_index.match.call(void 0, _types.TokenType.lessThan)) {
          tsParseTypeArguments();
        }
        _statement.baseParseMaybeDecoratorArguments.call(void 0);
      }
      exports.tsParseMaybeDecoratorArguments = tsParseMaybeDecoratorArguments;
    }
  });

  // node_modules/sucrase/dist/parser/plugins/jsx/index.js
  var require_jsx = __commonJS({
    "node_modules/sucrase/dist/parser/plugins/jsx/index.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var _index = require_tokenizer();
      var _types = require_types();
      var _base = require_base();
      var _expression = require_expression();
      var _util = require_util();
      var _charcodes = require_charcodes();
      var _identifier = require_identifier();
      var _typescript = require_typescript();
      function jsxReadToken() {
        for (; ; ) {
          if (_base.state.pos >= _base.input.length) {
            _util.unexpected.call(void 0, "Unterminated JSX contents");
            return;
          }
          const ch = _base.input.charCodeAt(_base.state.pos);
          switch (ch) {
            case _charcodes.charCodes.lessThan:
            case _charcodes.charCodes.leftCurlyBrace:
              if (_base.state.pos === _base.state.start) {
                if (ch === _charcodes.charCodes.lessThan) {
                  _base.state.pos++;
                  _index.finishToken.call(void 0, _types.TokenType.jsxTagStart);
                  return;
                }
                _index.getTokenFromCode.call(void 0, ch);
                return;
              }
              _index.finishToken.call(void 0, _types.TokenType.jsxText);
              return;
            default:
              _base.state.pos++;
          }
        }
      }
      function jsxReadString(quote) {
        _base.state.pos++;
        for (; ; ) {
          if (_base.state.pos >= _base.input.length) {
            _util.unexpected.call(void 0, "Unterminated string constant");
            return;
          }
          const ch = _base.input.charCodeAt(_base.state.pos);
          if (ch === quote) {
            _base.state.pos++;
            break;
          }
          _base.state.pos++;
        }
        _index.finishToken.call(void 0, _types.TokenType.string);
      }
      function jsxReadWord() {
        let ch;
        do {
          if (_base.state.pos > _base.input.length) {
            _util.unexpected.call(void 0, "Unexpectedly reached the end of input.");
            return;
          }
          ch = _base.input.charCodeAt(++_base.state.pos);
        } while (_identifier.IS_IDENTIFIER_CHAR[ch] || ch === _charcodes.charCodes.dash);
        _index.finishToken.call(void 0, _types.TokenType.jsxName);
      }
      function jsxParseIdentifier() {
        nextJSXTagToken();
      }
      function jsxParseNamespacedName(identifierRole) {
        jsxParseIdentifier();
        if (!_index.eat.call(void 0, _types.TokenType.colon)) {
          _base.state.tokens[_base.state.tokens.length - 1].identifierRole = identifierRole;
          return;
        }
        jsxParseIdentifier();
      }
      function jsxParseElementName() {
        jsxParseNamespacedName(_index.IdentifierRole.Access);
        while (_index.match.call(void 0, _types.TokenType.dot)) {
          nextJSXTagToken();
          jsxParseIdentifier();
        }
      }
      function jsxParseAttributeValue() {
        switch (_base.state.type) {
          case _types.TokenType.braceL:
            _index.next.call(void 0);
            jsxParseExpressionContainer();
            nextJSXTagToken();
            return;
          case _types.TokenType.jsxTagStart:
            jsxParseElement();
            nextJSXTagToken();
            return;
          case _types.TokenType.string:
            nextJSXTagToken();
            return;
          default:
            _util.unexpected.call(void 0, "JSX value should be either an expression or a quoted JSX text");
        }
      }
      function jsxParseEmptyExpression() {
      }
      function jsxParseSpreadChild() {
        _util.expect.call(void 0, _types.TokenType.ellipsis);
        _expression.parseExpression.call(void 0);
      }
      function jsxParseExpressionContainer() {
        if (_index.match.call(void 0, _types.TokenType.braceR)) {
          jsxParseEmptyExpression();
        } else {
          _expression.parseExpression.call(void 0);
        }
      }
      function jsxParseAttribute() {
        if (_index.eat.call(void 0, _types.TokenType.braceL)) {
          _util.expect.call(void 0, _types.TokenType.ellipsis);
          _expression.parseMaybeAssign.call(void 0);
          nextJSXTagToken();
          return;
        }
        jsxParseNamespacedName(_index.IdentifierRole.ObjectKey);
        if (_index.match.call(void 0, _types.TokenType.eq)) {
          nextJSXTagToken();
          jsxParseAttributeValue();
        }
      }
      function jsxParseOpeningElement() {
        if (_index.match.call(void 0, _types.TokenType.jsxTagEnd)) {
          return false;
        }
        jsxParseElementName();
        if (_base.isTypeScriptEnabled) {
          _typescript.tsTryParseJSXTypeArgument.call(void 0);
        }
        while (!_index.match.call(void 0, _types.TokenType.slash) && !_index.match.call(void 0, _types.TokenType.jsxTagEnd) && !_base.state.error) {
          jsxParseAttribute();
        }
        const isSelfClosing = _index.match.call(void 0, _types.TokenType.slash);
        if (isSelfClosing) {
          nextJSXTagToken();
        }
        return isSelfClosing;
      }
      function jsxParseClosingElement() {
        if (_index.match.call(void 0, _types.TokenType.jsxTagEnd)) {
          return;
        }
        jsxParseElementName();
      }
      function jsxParseElementAt() {
        const isSelfClosing = jsxParseOpeningElement();
        if (!isSelfClosing) {
          nextJSXExprToken();
          while (true) {
            switch (_base.state.type) {
              case _types.TokenType.jsxTagStart:
                nextJSXTagToken();
                if (_index.match.call(void 0, _types.TokenType.slash)) {
                  nextJSXTagToken();
                  jsxParseClosingElement();
                  return;
                }
                jsxParseElementAt();
                nextJSXExprToken();
                break;
              case _types.TokenType.jsxText:
                nextJSXExprToken();
                break;
              case _types.TokenType.braceL:
                _index.next.call(void 0);
                if (_index.match.call(void 0, _types.TokenType.ellipsis)) {
                  jsxParseSpreadChild();
                  nextJSXExprToken();
                } else {
                  jsxParseExpressionContainer();
                  nextJSXExprToken();
                }
                break;
              default:
                _util.unexpected.call(void 0);
                return;
            }
          }
        }
      }
      function jsxParseElement() {
        nextJSXTagToken();
        jsxParseElementAt();
      }
      exports.jsxParseElement = jsxParseElement;
      function nextJSXTagToken() {
        _base.state.tokens.push(new (0, _index.Token)());
        _index.skipSpace.call(void 0);
        _base.state.start = _base.state.pos;
        const code = _base.input.charCodeAt(_base.state.pos);
        if (_identifier.IS_IDENTIFIER_START[code]) {
          jsxReadWord();
        } else if (code === _charcodes.charCodes.quotationMark || code === _charcodes.charCodes.apostrophe) {
          jsxReadString(code);
        } else {
          ++_base.state.pos;
          switch (code) {
            case _charcodes.charCodes.greaterThan:
              _index.finishToken.call(void 0, _types.TokenType.jsxTagEnd);
              break;
            case _charcodes.charCodes.lessThan:
              _index.finishToken.call(void 0, _types.TokenType.jsxTagStart);
              break;
            case _charcodes.charCodes.slash:
              _index.finishToken.call(void 0, _types.TokenType.slash);
              break;
            case _charcodes.charCodes.equalsTo:
              _index.finishToken.call(void 0, _types.TokenType.eq);
              break;
            case _charcodes.charCodes.leftCurlyBrace:
              _index.finishToken.call(void 0, _types.TokenType.braceL);
              break;
            case _charcodes.charCodes.dot:
              _index.finishToken.call(void 0, _types.TokenType.dot);
              break;
            case _charcodes.charCodes.colon:
              _index.finishToken.call(void 0, _types.TokenType.colon);
              break;
            default:
              _util.unexpected.call(void 0);
          }
        }
      }
      exports.nextJSXTagToken = nextJSXTagToken;
      function nextJSXExprToken() {
        _base.state.tokens.push(new (0, _index.Token)());
        _base.state.start = _base.state.pos;
        jsxReadToken();
      }
    }
  });

  // node_modules/sucrase/dist/parser/plugins/types.js
  var require_types3 = __commonJS({
    "node_modules/sucrase/dist/parser/plugins/types.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var _index = require_tokenizer();
      var _types = require_types();
      var _base = require_base();
      var _expression = require_expression();
      var _flow = require_flow();
      var _typescript = require_typescript();
      function typedParseConditional(noIn) {
        if (_index.match.call(void 0, _types.TokenType.question)) {
          const nextType = _index.lookaheadType.call(void 0);
          if (nextType === _types.TokenType.colon || nextType === _types.TokenType.comma || nextType === _types.TokenType.parenR) {
            return;
          }
        }
        _expression.baseParseConditional.call(void 0, noIn);
      }
      exports.typedParseConditional = typedParseConditional;
      function typedParseParenItem() {
        _index.eatTypeToken.call(void 0, _types.TokenType.question);
        if (_index.match.call(void 0, _types.TokenType.colon)) {
          if (_base.isTypeScriptEnabled) {
            _typescript.tsParseTypeAnnotation.call(void 0);
          } else if (_base.isFlowEnabled) {
            _flow.flowParseTypeAnnotation.call(void 0);
          }
        }
      }
      exports.typedParseParenItem = typedParseParenItem;
    }
  });

  // node_modules/sucrase/dist/parser/traverser/expression.js
  var require_expression = __commonJS({
    "node_modules/sucrase/dist/parser/traverser/expression.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var _flow = require_flow();
      var _index = require_jsx();
      var _types = require_types3();
      var _typescript = require_typescript();
      var _index3 = require_tokenizer();
      var _keywords = require_keywords();
      var _state = require_state();
      var _types3 = require_types();
      var _charcodes = require_charcodes();
      var _identifier = require_identifier();
      var _base = require_base();
      var _lval = require_lval();
      var _statement = require_statement();
      var _util = require_util();
      var StopState = class {
        constructor(stop) {
          this.stop = stop;
        }
      };
      exports.StopState = StopState;
      function parseExpression(noIn = false) {
        parseMaybeAssign(noIn);
        if (_index3.match.call(void 0, _types3.TokenType.comma)) {
          while (_index3.eat.call(void 0, _types3.TokenType.comma)) {
            parseMaybeAssign(noIn);
          }
        }
      }
      exports.parseExpression = parseExpression;
      function parseMaybeAssign(noIn = false, isWithinParens = false) {
        if (_base.isTypeScriptEnabled) {
          return _typescript.tsParseMaybeAssign.call(void 0, noIn, isWithinParens);
        } else if (_base.isFlowEnabled) {
          return _flow.flowParseMaybeAssign.call(void 0, noIn, isWithinParens);
        } else {
          return baseParseMaybeAssign(noIn, isWithinParens);
        }
      }
      exports.parseMaybeAssign = parseMaybeAssign;
      function baseParseMaybeAssign(noIn, isWithinParens) {
        if (_index3.match.call(void 0, _types3.TokenType._yield)) {
          parseYield();
          return false;
        }
        if (_index3.match.call(void 0, _types3.TokenType.parenL) || _index3.match.call(void 0, _types3.TokenType.name) || _index3.match.call(void 0, _types3.TokenType._yield)) {
          _base.state.potentialArrowAt = _base.state.start;
        }
        const wasArrow = parseMaybeConditional(noIn);
        if (isWithinParens) {
          parseParenItem();
        }
        if (_base.state.type & _types3.TokenType.IS_ASSIGN) {
          _index3.next.call(void 0);
          parseMaybeAssign(noIn);
          return false;
        }
        return wasArrow;
      }
      exports.baseParseMaybeAssign = baseParseMaybeAssign;
      function parseMaybeConditional(noIn) {
        const wasArrow = parseExprOps(noIn);
        if (wasArrow) {
          return true;
        }
        parseConditional(noIn);
        return false;
      }
      function parseConditional(noIn) {
        if (_base.isTypeScriptEnabled || _base.isFlowEnabled) {
          _types.typedParseConditional.call(void 0, noIn);
        } else {
          baseParseConditional(noIn);
        }
      }
      function baseParseConditional(noIn) {
        if (_index3.eat.call(void 0, _types3.TokenType.question)) {
          parseMaybeAssign();
          _util.expect.call(void 0, _types3.TokenType.colon);
          parseMaybeAssign(noIn);
        }
      }
      exports.baseParseConditional = baseParseConditional;
      function parseExprOps(noIn) {
        const startTokenIndex = _base.state.tokens.length;
        const wasArrow = parseMaybeUnary();
        if (wasArrow) {
          return true;
        }
        parseExprOp(startTokenIndex, -1, noIn);
        return false;
      }
      function parseExprOp(startTokenIndex, minPrec, noIn) {
        if (_base.isTypeScriptEnabled && (_types3.TokenType._in & _types3.TokenType.PRECEDENCE_MASK) > minPrec && !_util.hasPrecedingLineBreak.call(void 0) && _util.eatContextual.call(void 0, _keywords.ContextualKeyword._as)) {
          _base.state.tokens[_base.state.tokens.length - 1].type = _types3.TokenType._as;
          const oldIsType = _index3.pushTypeContext.call(void 0, 1);
          _typescript.tsParseType.call(void 0);
          _index3.popTypeContext.call(void 0, oldIsType);
          parseExprOp(startTokenIndex, minPrec, noIn);
          return;
        }
        const prec = _base.state.type & _types3.TokenType.PRECEDENCE_MASK;
        if (prec > 0 && (!noIn || !_index3.match.call(void 0, _types3.TokenType._in))) {
          if (prec > minPrec) {
            const op = _base.state.type;
            _index3.next.call(void 0);
            if (op === _types3.TokenType.nullishCoalescing) {
              _base.state.tokens[_base.state.tokens.length - 1].nullishStartIndex = startTokenIndex;
            }
            const rhsStartTokenIndex = _base.state.tokens.length;
            parseMaybeUnary();
            parseExprOp(rhsStartTokenIndex, op & _types3.TokenType.IS_RIGHT_ASSOCIATIVE ? prec - 1 : prec, noIn);
            if (op === _types3.TokenType.nullishCoalescing) {
              _base.state.tokens[startTokenIndex].numNullishCoalesceStarts++;
              _base.state.tokens[_base.state.tokens.length - 1].numNullishCoalesceEnds++;
            }
            parseExprOp(startTokenIndex, minPrec, noIn);
          }
        }
      }
      function parseMaybeUnary() {
        if (_base.isTypeScriptEnabled && !_base.isJSXEnabled && _index3.eat.call(void 0, _types3.TokenType.lessThan)) {
          _typescript.tsParseTypeAssertion.call(void 0);
          return false;
        }
        if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._module) && _index3.lookaheadCharCode.call(void 0) === _charcodes.charCodes.leftCurlyBrace && !_util.hasFollowingLineBreak.call(void 0)) {
          parseModuleExpression();
          return false;
        }
        if (_base.state.type & _types3.TokenType.IS_PREFIX) {
          _index3.next.call(void 0);
          parseMaybeUnary();
          return false;
        }
        const wasArrow = parseExprSubscripts();
        if (wasArrow) {
          return true;
        }
        while (_base.state.type & _types3.TokenType.IS_POSTFIX && !_util.canInsertSemicolon.call(void 0)) {
          if (_base.state.type === _types3.TokenType.preIncDec) {
            _base.state.type = _types3.TokenType.postIncDec;
          }
          _index3.next.call(void 0);
        }
        return false;
      }
      exports.parseMaybeUnary = parseMaybeUnary;
      function parseExprSubscripts() {
        const startTokenIndex = _base.state.tokens.length;
        const wasArrow = parseExprAtom();
        if (wasArrow) {
          return true;
        }
        parseSubscripts(startTokenIndex);
        if (_base.state.tokens.length > startTokenIndex && _base.state.tokens[startTokenIndex].isOptionalChainStart) {
          _base.state.tokens[_base.state.tokens.length - 1].isOptionalChainEnd = true;
        }
        return false;
      }
      exports.parseExprSubscripts = parseExprSubscripts;
      function parseSubscripts(startTokenIndex, noCalls = false) {
        if (_base.isFlowEnabled) {
          _flow.flowParseSubscripts.call(void 0, startTokenIndex, noCalls);
        } else {
          baseParseSubscripts(startTokenIndex, noCalls);
        }
      }
      function baseParseSubscripts(startTokenIndex, noCalls = false) {
        const stopState = new StopState(false);
        do {
          parseSubscript(startTokenIndex, noCalls, stopState);
        } while (!stopState.stop && !_base.state.error);
      }
      exports.baseParseSubscripts = baseParseSubscripts;
      function parseSubscript(startTokenIndex, noCalls, stopState) {
        if (_base.isTypeScriptEnabled) {
          _typescript.tsParseSubscript.call(void 0, startTokenIndex, noCalls, stopState);
        } else if (_base.isFlowEnabled) {
          _flow.flowParseSubscript.call(void 0, startTokenIndex, noCalls, stopState);
        } else {
          baseParseSubscript(startTokenIndex, noCalls, stopState);
        }
      }
      function baseParseSubscript(startTokenIndex, noCalls, stopState) {
        if (!noCalls && _index3.eat.call(void 0, _types3.TokenType.doubleColon)) {
          parseNoCallExpr();
          stopState.stop = true;
          parseSubscripts(startTokenIndex, noCalls);
        } else if (_index3.match.call(void 0, _types3.TokenType.questionDot)) {
          _base.state.tokens[startTokenIndex].isOptionalChainStart = true;
          if (noCalls && _index3.lookaheadType.call(void 0) === _types3.TokenType.parenL) {
            stopState.stop = true;
            return;
          }
          _index3.next.call(void 0);
          _base.state.tokens[_base.state.tokens.length - 1].subscriptStartIndex = startTokenIndex;
          if (_index3.eat.call(void 0, _types3.TokenType.bracketL)) {
            parseExpression();
            _util.expect.call(void 0, _types3.TokenType.bracketR);
          } else if (_index3.eat.call(void 0, _types3.TokenType.parenL)) {
            parseCallExpressionArguments();
          } else {
            parseMaybePrivateName();
          }
        } else if (_index3.eat.call(void 0, _types3.TokenType.dot)) {
          _base.state.tokens[_base.state.tokens.length - 1].subscriptStartIndex = startTokenIndex;
          parseMaybePrivateName();
        } else if (_index3.eat.call(void 0, _types3.TokenType.bracketL)) {
          _base.state.tokens[_base.state.tokens.length - 1].subscriptStartIndex = startTokenIndex;
          parseExpression();
          _util.expect.call(void 0, _types3.TokenType.bracketR);
        } else if (!noCalls && _index3.match.call(void 0, _types3.TokenType.parenL)) {
          if (atPossibleAsync()) {
            const snapshot = _base.state.snapshot();
            const asyncStartTokenIndex = _base.state.tokens.length;
            _index3.next.call(void 0);
            _base.state.tokens[_base.state.tokens.length - 1].subscriptStartIndex = startTokenIndex;
            const callContextId = _base.getNextContextId.call(void 0);
            _base.state.tokens[_base.state.tokens.length - 1].contextId = callContextId;
            parseCallExpressionArguments();
            _base.state.tokens[_base.state.tokens.length - 1].contextId = callContextId;
            if (shouldParseAsyncArrow()) {
              _base.state.restoreFromSnapshot(snapshot);
              stopState.stop = true;
              _base.state.scopeDepth++;
              _statement.parseFunctionParams.call(void 0);
              parseAsyncArrowFromCallExpression(asyncStartTokenIndex);
            }
          } else {
            _index3.next.call(void 0);
            _base.state.tokens[_base.state.tokens.length - 1].subscriptStartIndex = startTokenIndex;
            const callContextId = _base.getNextContextId.call(void 0);
            _base.state.tokens[_base.state.tokens.length - 1].contextId = callContextId;
            parseCallExpressionArguments();
            _base.state.tokens[_base.state.tokens.length - 1].contextId = callContextId;
          }
        } else if (_index3.match.call(void 0, _types3.TokenType.backQuote)) {
          parseTemplate();
        } else {
          stopState.stop = true;
        }
      }
      exports.baseParseSubscript = baseParseSubscript;
      function atPossibleAsync() {
        return _base.state.tokens[_base.state.tokens.length - 1].contextualKeyword === _keywords.ContextualKeyword._async && !_util.canInsertSemicolon.call(void 0);
      }
      exports.atPossibleAsync = atPossibleAsync;
      function parseCallExpressionArguments() {
        let first = true;
        while (!_index3.eat.call(void 0, _types3.TokenType.parenR) && !_base.state.error) {
          if (first) {
            first = false;
          } else {
            _util.expect.call(void 0, _types3.TokenType.comma);
            if (_index3.eat.call(void 0, _types3.TokenType.parenR)) {
              break;
            }
          }
          parseExprListItem(false);
        }
      }
      exports.parseCallExpressionArguments = parseCallExpressionArguments;
      function shouldParseAsyncArrow() {
        return _index3.match.call(void 0, _types3.TokenType.colon) || _index3.match.call(void 0, _types3.TokenType.arrow);
      }
      function parseAsyncArrowFromCallExpression(startTokenIndex) {
        if (_base.isTypeScriptEnabled) {
          _typescript.tsStartParseAsyncArrowFromCallExpression.call(void 0);
        } else if (_base.isFlowEnabled) {
          _flow.flowStartParseAsyncArrowFromCallExpression.call(void 0);
        }
        _util.expect.call(void 0, _types3.TokenType.arrow);
        parseArrowExpression(startTokenIndex);
      }
      function parseNoCallExpr() {
        const startTokenIndex = _base.state.tokens.length;
        parseExprAtom();
        parseSubscripts(startTokenIndex, true);
      }
      function parseExprAtom() {
        if (_index3.eat.call(void 0, _types3.TokenType.modulo)) {
          parseIdentifier();
          return false;
        }
        if (_index3.match.call(void 0, _types3.TokenType.jsxText)) {
          parseLiteral();
          return false;
        } else if (_index3.match.call(void 0, _types3.TokenType.lessThan) && _base.isJSXEnabled) {
          _base.state.type = _types3.TokenType.jsxTagStart;
          _index.jsxParseElement.call(void 0);
          _index3.next.call(void 0);
          return false;
        }
        const canBeArrow = _base.state.potentialArrowAt === _base.state.start;
        switch (_base.state.type) {
          case _types3.TokenType.slash:
          case _types3.TokenType.assign:
            _index3.retokenizeSlashAsRegex.call(void 0);
          case _types3.TokenType._super:
          case _types3.TokenType._this:
          case _types3.TokenType.regexp:
          case _types3.TokenType.num:
          case _types3.TokenType.bigint:
          case _types3.TokenType.decimal:
          case _types3.TokenType.string:
          case _types3.TokenType._null:
          case _types3.TokenType._true:
          case _types3.TokenType._false:
            _index3.next.call(void 0);
            return false;
          case _types3.TokenType._import:
            _index3.next.call(void 0);
            if (_index3.match.call(void 0, _types3.TokenType.dot)) {
              _base.state.tokens[_base.state.tokens.length - 1].type = _types3.TokenType.name;
              _index3.next.call(void 0);
              parseIdentifier();
            }
            return false;
          case _types3.TokenType.name: {
            const startTokenIndex = _base.state.tokens.length;
            const functionStart = _base.state.start;
            const contextualKeyword = _base.state.contextualKeyword;
            parseIdentifier();
            if (contextualKeyword === _keywords.ContextualKeyword._await) {
              parseAwait();
              return false;
            } else if (contextualKeyword === _keywords.ContextualKeyword._async && _index3.match.call(void 0, _types3.TokenType._function) && !_util.canInsertSemicolon.call(void 0)) {
              _index3.next.call(void 0);
              _statement.parseFunction.call(void 0, functionStart, false);
              return false;
            } else if (canBeArrow && contextualKeyword === _keywords.ContextualKeyword._async && !_util.canInsertSemicolon.call(void 0) && _index3.match.call(void 0, _types3.TokenType.name)) {
              _base.state.scopeDepth++;
              _lval.parseBindingIdentifier.call(void 0, false);
              _util.expect.call(void 0, _types3.TokenType.arrow);
              parseArrowExpression(startTokenIndex);
              return true;
            } else if (_index3.match.call(void 0, _types3.TokenType._do) && !_util.canInsertSemicolon.call(void 0)) {
              _index3.next.call(void 0);
              _statement.parseBlock.call(void 0);
              return false;
            }
            if (canBeArrow && !_util.canInsertSemicolon.call(void 0) && _index3.match.call(void 0, _types3.TokenType.arrow)) {
              _base.state.scopeDepth++;
              _lval.markPriorBindingIdentifier.call(void 0, false);
              _util.expect.call(void 0, _types3.TokenType.arrow);
              parseArrowExpression(startTokenIndex);
              return true;
            }
            _base.state.tokens[_base.state.tokens.length - 1].identifierRole = _index3.IdentifierRole.Access;
            return false;
          }
          case _types3.TokenType._do: {
            _index3.next.call(void 0);
            _statement.parseBlock.call(void 0);
            return false;
          }
          case _types3.TokenType.parenL: {
            const wasArrow = parseParenAndDistinguishExpression(canBeArrow);
            return wasArrow;
          }
          case _types3.TokenType.bracketL:
            _index3.next.call(void 0);
            parseExprList(_types3.TokenType.bracketR, true);
            return false;
          case _types3.TokenType.braceL:
            parseObj(false, false);
            return false;
          case _types3.TokenType._function:
            parseFunctionExpression();
            return false;
          case _types3.TokenType.at:
            _statement.parseDecorators.call(void 0);
          case _types3.TokenType._class:
            _statement.parseClass.call(void 0, false);
            return false;
          case _types3.TokenType._new:
            parseNew();
            return false;
          case _types3.TokenType.backQuote:
            parseTemplate();
            return false;
          case _types3.TokenType.doubleColon: {
            _index3.next.call(void 0);
            parseNoCallExpr();
            return false;
          }
          case _types3.TokenType.hash: {
            const code = _index3.lookaheadCharCode.call(void 0);
            if (_identifier.IS_IDENTIFIER_START[code] || code === _charcodes.charCodes.backslash) {
              parseMaybePrivateName();
            } else {
              _index3.next.call(void 0);
            }
            return false;
          }
          default:
            _util.unexpected.call(void 0);
            return false;
        }
      }
      exports.parseExprAtom = parseExprAtom;
      function parseMaybePrivateName() {
        _index3.eat.call(void 0, _types3.TokenType.hash);
        parseIdentifier();
      }
      function parseFunctionExpression() {
        const functionStart = _base.state.start;
        parseIdentifier();
        if (_index3.eat.call(void 0, _types3.TokenType.dot)) {
          parseIdentifier();
        }
        _statement.parseFunction.call(void 0, functionStart, false);
      }
      function parseLiteral() {
        _index3.next.call(void 0);
      }
      exports.parseLiteral = parseLiteral;
      function parseParenExpression() {
        _util.expect.call(void 0, _types3.TokenType.parenL);
        parseExpression();
        _util.expect.call(void 0, _types3.TokenType.parenR);
      }
      exports.parseParenExpression = parseParenExpression;
      function parseParenAndDistinguishExpression(canBeArrow) {
        const snapshot = _base.state.snapshot();
        const startTokenIndex = _base.state.tokens.length;
        _util.expect.call(void 0, _types3.TokenType.parenL);
        let first = true;
        while (!_index3.match.call(void 0, _types3.TokenType.parenR) && !_base.state.error) {
          if (first) {
            first = false;
          } else {
            _util.expect.call(void 0, _types3.TokenType.comma);
            if (_index3.match.call(void 0, _types3.TokenType.parenR)) {
              break;
            }
          }
          if (_index3.match.call(void 0, _types3.TokenType.ellipsis)) {
            _lval.parseRest.call(void 0, false);
            parseParenItem();
            break;
          } else {
            parseMaybeAssign(false, true);
          }
        }
        _util.expect.call(void 0, _types3.TokenType.parenR);
        if (canBeArrow && shouldParseArrow()) {
          const wasArrow = parseArrow();
          if (wasArrow) {
            _base.state.restoreFromSnapshot(snapshot);
            _base.state.scopeDepth++;
            _statement.parseFunctionParams.call(void 0);
            parseArrow();
            parseArrowExpression(startTokenIndex);
            return true;
          }
        }
        return false;
      }
      function shouldParseArrow() {
        return _index3.match.call(void 0, _types3.TokenType.colon) || !_util.canInsertSemicolon.call(void 0);
      }
      function parseArrow() {
        if (_base.isTypeScriptEnabled) {
          return _typescript.tsParseArrow.call(void 0);
        } else if (_base.isFlowEnabled) {
          return _flow.flowParseArrow.call(void 0);
        } else {
          return _index3.eat.call(void 0, _types3.TokenType.arrow);
        }
      }
      exports.parseArrow = parseArrow;
      function parseParenItem() {
        if (_base.isTypeScriptEnabled || _base.isFlowEnabled) {
          _types.typedParseParenItem.call(void 0);
        }
      }
      function parseNew() {
        _util.expect.call(void 0, _types3.TokenType._new);
        if (_index3.eat.call(void 0, _types3.TokenType.dot)) {
          parseIdentifier();
          return;
        }
        parseNoCallExpr();
        _index3.eat.call(void 0, _types3.TokenType.questionDot);
        parseNewArguments();
      }
      function parseNewArguments() {
        if (_base.isTypeScriptEnabled) {
          _typescript.tsStartParseNewArguments.call(void 0);
        } else if (_base.isFlowEnabled) {
          _flow.flowStartParseNewArguments.call(void 0);
        }
        if (_index3.eat.call(void 0, _types3.TokenType.parenL)) {
          parseExprList(_types3.TokenType.parenR);
        }
      }
      function parseTemplate() {
        _index3.nextTemplateToken.call(void 0);
        _index3.nextTemplateToken.call(void 0);
        while (!_index3.match.call(void 0, _types3.TokenType.backQuote) && !_base.state.error) {
          _util.expect.call(void 0, _types3.TokenType.dollarBraceL);
          parseExpression();
          _index3.nextTemplateToken.call(void 0);
          _index3.nextTemplateToken.call(void 0);
        }
        _index3.next.call(void 0);
      }
      exports.parseTemplate = parseTemplate;
      function parseObj(isPattern, isBlockScope) {
        const contextId = _base.getNextContextId.call(void 0);
        let first = true;
        _index3.next.call(void 0);
        _base.state.tokens[_base.state.tokens.length - 1].contextId = contextId;
        while (!_index3.eat.call(void 0, _types3.TokenType.braceR) && !_base.state.error) {
          if (first) {
            first = false;
          } else {
            _util.expect.call(void 0, _types3.TokenType.comma);
            if (_index3.eat.call(void 0, _types3.TokenType.braceR)) {
              break;
            }
          }
          let isGenerator = false;
          if (_index3.match.call(void 0, _types3.TokenType.ellipsis)) {
            const previousIndex = _base.state.tokens.length;
            _lval.parseSpread.call(void 0);
            if (isPattern) {
              if (_base.state.tokens.length === previousIndex + 2) {
                _lval.markPriorBindingIdentifier.call(void 0, isBlockScope);
              }
              if (_index3.eat.call(void 0, _types3.TokenType.braceR)) {
                break;
              }
            }
            continue;
          }
          if (!isPattern) {
            isGenerator = _index3.eat.call(void 0, _types3.TokenType.star);
          }
          if (!isPattern && _util.isContextual.call(void 0, _keywords.ContextualKeyword._async)) {
            if (isGenerator)
              _util.unexpected.call(void 0);
            parseIdentifier();
            if (_index3.match.call(void 0, _types3.TokenType.colon) || _index3.match.call(void 0, _types3.TokenType.parenL) || _index3.match.call(void 0, _types3.TokenType.braceR) || _index3.match.call(void 0, _types3.TokenType.eq) || _index3.match.call(void 0, _types3.TokenType.comma)) {
            } else {
              if (_index3.match.call(void 0, _types3.TokenType.star)) {
                _index3.next.call(void 0);
                isGenerator = true;
              }
              parsePropertyName(contextId);
            }
          } else {
            parsePropertyName(contextId);
          }
          parseObjPropValue(isPattern, isBlockScope, contextId);
        }
        _base.state.tokens[_base.state.tokens.length - 1].contextId = contextId;
      }
      exports.parseObj = parseObj;
      function isGetterOrSetterMethod(isPattern) {
        return !isPattern && (_index3.match.call(void 0, _types3.TokenType.string) || _index3.match.call(void 0, _types3.TokenType.num) || _index3.match.call(void 0, _types3.TokenType.bracketL) || _index3.match.call(void 0, _types3.TokenType.name) || !!(_base.state.type & _types3.TokenType.IS_KEYWORD));
      }
      function parseObjectMethod(isPattern, objectContextId) {
        const functionStart = _base.state.start;
        if (_index3.match.call(void 0, _types3.TokenType.parenL)) {
          if (isPattern)
            _util.unexpected.call(void 0);
          parseMethod(functionStart, false);
          return true;
        }
        if (isGetterOrSetterMethod(isPattern)) {
          parsePropertyName(objectContextId);
          parseMethod(functionStart, false);
          return true;
        }
        return false;
      }
      function parseObjectProperty(isPattern, isBlockScope) {
        if (_index3.eat.call(void 0, _types3.TokenType.colon)) {
          if (isPattern) {
            _lval.parseMaybeDefault.call(void 0, isBlockScope);
          } else {
            parseMaybeAssign(false);
          }
          return;
        }
        let identifierRole;
        if (isPattern) {
          if (_base.state.scopeDepth === 0) {
            identifierRole = _index3.IdentifierRole.ObjectShorthandTopLevelDeclaration;
          } else if (isBlockScope) {
            identifierRole = _index3.IdentifierRole.ObjectShorthandBlockScopedDeclaration;
          } else {
            identifierRole = _index3.IdentifierRole.ObjectShorthandFunctionScopedDeclaration;
          }
        } else {
          identifierRole = _index3.IdentifierRole.ObjectShorthand;
        }
        _base.state.tokens[_base.state.tokens.length - 1].identifierRole = identifierRole;
        _lval.parseMaybeDefault.call(void 0, isBlockScope, true);
      }
      function parseObjPropValue(isPattern, isBlockScope, objectContextId) {
        if (_base.isTypeScriptEnabled) {
          _typescript.tsStartParseObjPropValue.call(void 0);
        } else if (_base.isFlowEnabled) {
          _flow.flowStartParseObjPropValue.call(void 0);
        }
        const wasMethod = parseObjectMethod(isPattern, objectContextId);
        if (!wasMethod) {
          parseObjectProperty(isPattern, isBlockScope);
        }
      }
      function parsePropertyName(objectContextId) {
        if (_base.isFlowEnabled) {
          _flow.flowParseVariance.call(void 0);
        }
        if (_index3.eat.call(void 0, _types3.TokenType.bracketL)) {
          _base.state.tokens[_base.state.tokens.length - 1].contextId = objectContextId;
          parseMaybeAssign();
          _util.expect.call(void 0, _types3.TokenType.bracketR);
          _base.state.tokens[_base.state.tokens.length - 1].contextId = objectContextId;
        } else {
          if (_index3.match.call(void 0, _types3.TokenType.num) || _index3.match.call(void 0, _types3.TokenType.string) || _index3.match.call(void 0, _types3.TokenType.bigint) || _index3.match.call(void 0, _types3.TokenType.decimal)) {
            parseExprAtom();
          } else {
            parseMaybePrivateName();
          }
          _base.state.tokens[_base.state.tokens.length - 1].identifierRole = _index3.IdentifierRole.ObjectKey;
          _base.state.tokens[_base.state.tokens.length - 1].contextId = objectContextId;
        }
      }
      exports.parsePropertyName = parsePropertyName;
      function parseMethod(functionStart, isConstructor) {
        const funcContextId = _base.getNextContextId.call(void 0);
        _base.state.scopeDepth++;
        const startTokenIndex = _base.state.tokens.length;
        const allowModifiers = isConstructor;
        _statement.parseFunctionParams.call(void 0, allowModifiers, funcContextId);
        parseFunctionBodyAndFinish(functionStart, funcContextId);
        const endTokenIndex = _base.state.tokens.length;
        _base.state.scopes.push(new (0, _state.Scope)(startTokenIndex, endTokenIndex, true));
        _base.state.scopeDepth--;
      }
      exports.parseMethod = parseMethod;
      function parseArrowExpression(startTokenIndex) {
        parseFunctionBody(true);
        const endTokenIndex = _base.state.tokens.length;
        _base.state.scopes.push(new (0, _state.Scope)(startTokenIndex, endTokenIndex, true));
        _base.state.scopeDepth--;
      }
      exports.parseArrowExpression = parseArrowExpression;
      function parseFunctionBodyAndFinish(functionStart, funcContextId = 0) {
        if (_base.isTypeScriptEnabled) {
          _typescript.tsParseFunctionBodyAndFinish.call(void 0, functionStart, funcContextId);
        } else if (_base.isFlowEnabled) {
          _flow.flowParseFunctionBodyAndFinish.call(void 0, funcContextId);
        } else {
          parseFunctionBody(false, funcContextId);
        }
      }
      exports.parseFunctionBodyAndFinish = parseFunctionBodyAndFinish;
      function parseFunctionBody(allowExpression, funcContextId = 0) {
        const isExpression = allowExpression && !_index3.match.call(void 0, _types3.TokenType.braceL);
        if (isExpression) {
          parseMaybeAssign();
        } else {
          _statement.parseBlock.call(void 0, true, funcContextId);
        }
      }
      exports.parseFunctionBody = parseFunctionBody;
      function parseExprList(close, allowEmpty = false) {
        let first = true;
        while (!_index3.eat.call(void 0, close) && !_base.state.error) {
          if (first) {
            first = false;
          } else {
            _util.expect.call(void 0, _types3.TokenType.comma);
            if (_index3.eat.call(void 0, close))
              break;
          }
          parseExprListItem(allowEmpty);
        }
      }
      function parseExprListItem(allowEmpty) {
        if (allowEmpty && _index3.match.call(void 0, _types3.TokenType.comma)) {
        } else if (_index3.match.call(void 0, _types3.TokenType.ellipsis)) {
          _lval.parseSpread.call(void 0);
          parseParenItem();
        } else if (_index3.match.call(void 0, _types3.TokenType.question)) {
          _index3.next.call(void 0);
        } else {
          parseMaybeAssign(false, true);
        }
      }
      function parseIdentifier() {
        _index3.next.call(void 0);
        _base.state.tokens[_base.state.tokens.length - 1].type = _types3.TokenType.name;
      }
      exports.parseIdentifier = parseIdentifier;
      function parseAwait() {
        parseMaybeUnary();
      }
      function parseYield() {
        _index3.next.call(void 0);
        if (!_index3.match.call(void 0, _types3.TokenType.semi) && !_util.canInsertSemicolon.call(void 0)) {
          _index3.eat.call(void 0, _types3.TokenType.star);
          parseMaybeAssign();
        }
      }
      function parseModuleExpression() {
        _util.expectContextual.call(void 0, _keywords.ContextualKeyword._module);
        _util.expect.call(void 0, _types3.TokenType.braceL);
        _statement.parseBlockBody.call(void 0, _types3.TokenType.braceR);
      }
    }
  });

  // node_modules/sucrase/dist/parser/plugins/flow.js
  var require_flow = __commonJS({
    "node_modules/sucrase/dist/parser/plugins/flow.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var _index = require_tokenizer();
      var _keywords = require_keywords();
      var _types = require_types();
      var _base = require_base();
      var _expression = require_expression();
      var _statement = require_statement();
      var _util = require_util();
      function isMaybeDefaultImport(lookahead) {
        return (lookahead.type === _types.TokenType.name || !!(lookahead.type & _types.TokenType.IS_KEYWORD)) && lookahead.contextualKeyword !== _keywords.ContextualKeyword._from;
      }
      function flowParseTypeInitialiser(tok) {
        const oldIsType = _index.pushTypeContext.call(void 0, 0);
        _util.expect.call(void 0, tok || _types.TokenType.colon);
        flowParseType();
        _index.popTypeContext.call(void 0, oldIsType);
      }
      function flowParsePredicate() {
        _util.expect.call(void 0, _types.TokenType.modulo);
        _util.expectContextual.call(void 0, _keywords.ContextualKeyword._checks);
        if (_index.eat.call(void 0, _types.TokenType.parenL)) {
          _expression.parseExpression.call(void 0);
          _util.expect.call(void 0, _types.TokenType.parenR);
        }
      }
      function flowParseTypeAndPredicateInitialiser() {
        const oldIsType = _index.pushTypeContext.call(void 0, 0);
        _util.expect.call(void 0, _types.TokenType.colon);
        if (_index.match.call(void 0, _types.TokenType.modulo)) {
          flowParsePredicate();
        } else {
          flowParseType();
          if (_index.match.call(void 0, _types.TokenType.modulo)) {
            flowParsePredicate();
          }
        }
        _index.popTypeContext.call(void 0, oldIsType);
      }
      function flowParseDeclareClass() {
        _index.next.call(void 0);
        flowParseInterfaceish(true);
      }
      function flowParseDeclareFunction() {
        _index.next.call(void 0);
        _expression.parseIdentifier.call(void 0);
        if (_index.match.call(void 0, _types.TokenType.lessThan)) {
          flowParseTypeParameterDeclaration();
        }
        _util.expect.call(void 0, _types.TokenType.parenL);
        flowParseFunctionTypeParams();
        _util.expect.call(void 0, _types.TokenType.parenR);
        flowParseTypeAndPredicateInitialiser();
        _util.semicolon.call(void 0);
      }
      function flowParseDeclare() {
        if (_index.match.call(void 0, _types.TokenType._class)) {
          flowParseDeclareClass();
        } else if (_index.match.call(void 0, _types.TokenType._function)) {
          flowParseDeclareFunction();
        } else if (_index.match.call(void 0, _types.TokenType._var)) {
          flowParseDeclareVariable();
        } else if (_util.eatContextual.call(void 0, _keywords.ContextualKeyword._module)) {
          if (_index.eat.call(void 0, _types.TokenType.dot)) {
            flowParseDeclareModuleExports();
          } else {
            flowParseDeclareModule();
          }
        } else if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._type)) {
          flowParseDeclareTypeAlias();
        } else if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._opaque)) {
          flowParseDeclareOpaqueType();
        } else if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._interface)) {
          flowParseDeclareInterface();
        } else if (_index.match.call(void 0, _types.TokenType._export)) {
          flowParseDeclareExportDeclaration();
        } else {
          _util.unexpected.call(void 0);
        }
      }
      function flowParseDeclareVariable() {
        _index.next.call(void 0);
        flowParseTypeAnnotatableIdentifier();
        _util.semicolon.call(void 0);
      }
      function flowParseDeclareModule() {
        if (_index.match.call(void 0, _types.TokenType.string)) {
          _expression.parseExprAtom.call(void 0);
        } else {
          _expression.parseIdentifier.call(void 0);
        }
        _util.expect.call(void 0, _types.TokenType.braceL);
        while (!_index.match.call(void 0, _types.TokenType.braceR) && !_base.state.error) {
          if (_index.match.call(void 0, _types.TokenType._import)) {
            _index.next.call(void 0);
            _statement.parseImport.call(void 0);
          } else {
            _util.unexpected.call(void 0);
          }
        }
        _util.expect.call(void 0, _types.TokenType.braceR);
      }
      function flowParseDeclareExportDeclaration() {
        _util.expect.call(void 0, _types.TokenType._export);
        if (_index.eat.call(void 0, _types.TokenType._default)) {
          if (_index.match.call(void 0, _types.TokenType._function) || _index.match.call(void 0, _types.TokenType._class)) {
            flowParseDeclare();
          } else {
            flowParseType();
            _util.semicolon.call(void 0);
          }
        } else if (_index.match.call(void 0, _types.TokenType._var) || _index.match.call(void 0, _types.TokenType._function) || _index.match.call(void 0, _types.TokenType._class) || _util.isContextual.call(void 0, _keywords.ContextualKeyword._opaque)) {
          flowParseDeclare();
        } else if (_index.match.call(void 0, _types.TokenType.star) || _index.match.call(void 0, _types.TokenType.braceL) || _util.isContextual.call(void 0, _keywords.ContextualKeyword._interface) || _util.isContextual.call(void 0, _keywords.ContextualKeyword._type) || _util.isContextual.call(void 0, _keywords.ContextualKeyword._opaque)) {
          _statement.parseExport.call(void 0);
        } else {
          _util.unexpected.call(void 0);
        }
      }
      function flowParseDeclareModuleExports() {
        _util.expectContextual.call(void 0, _keywords.ContextualKeyword._exports);
        flowParseTypeAnnotation();
        _util.semicolon.call(void 0);
      }
      function flowParseDeclareTypeAlias() {
        _index.next.call(void 0);
        flowParseTypeAlias();
      }
      function flowParseDeclareOpaqueType() {
        _index.next.call(void 0);
        flowParseOpaqueType(true);
      }
      function flowParseDeclareInterface() {
        _index.next.call(void 0);
        flowParseInterfaceish();
      }
      function flowParseInterfaceish(isClass = false) {
        flowParseRestrictedIdentifier();
        if (_index.match.call(void 0, _types.TokenType.lessThan)) {
          flowParseTypeParameterDeclaration();
        }
        if (_index.eat.call(void 0, _types.TokenType._extends)) {
          do {
            flowParseInterfaceExtends();
          } while (!isClass && _index.eat.call(void 0, _types.TokenType.comma));
        }
        if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._mixins)) {
          _index.next.call(void 0);
          do {
            flowParseInterfaceExtends();
          } while (_index.eat.call(void 0, _types.TokenType.comma));
        }
        if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._implements)) {
          _index.next.call(void 0);
          do {
            flowParseInterfaceExtends();
          } while (_index.eat.call(void 0, _types.TokenType.comma));
        }
        flowParseObjectType(isClass, false, isClass);
      }
      function flowParseInterfaceExtends() {
        flowParseQualifiedTypeIdentifier(false);
        if (_index.match.call(void 0, _types.TokenType.lessThan)) {
          flowParseTypeParameterInstantiation();
        }
      }
      function flowParseInterface() {
        flowParseInterfaceish();
      }
      function flowParseRestrictedIdentifier() {
        _expression.parseIdentifier.call(void 0);
      }
      function flowParseTypeAlias() {
        flowParseRestrictedIdentifier();
        if (_index.match.call(void 0, _types.TokenType.lessThan)) {
          flowParseTypeParameterDeclaration();
        }
        flowParseTypeInitialiser(_types.TokenType.eq);
        _util.semicolon.call(void 0);
      }
      function flowParseOpaqueType(declare) {
        _util.expectContextual.call(void 0, _keywords.ContextualKeyword._type);
        flowParseRestrictedIdentifier();
        if (_index.match.call(void 0, _types.TokenType.lessThan)) {
          flowParseTypeParameterDeclaration();
        }
        if (_index.match.call(void 0, _types.TokenType.colon)) {
          flowParseTypeInitialiser(_types.TokenType.colon);
        }
        if (!declare) {
          flowParseTypeInitialiser(_types.TokenType.eq);
        }
        _util.semicolon.call(void 0);
      }
      function flowParseTypeParameter() {
        flowParseVariance();
        flowParseTypeAnnotatableIdentifier();
        if (_index.eat.call(void 0, _types.TokenType.eq)) {
          flowParseType();
        }
      }
      function flowParseTypeParameterDeclaration() {
        const oldIsType = _index.pushTypeContext.call(void 0, 0);
        if (_index.match.call(void 0, _types.TokenType.lessThan) || _index.match.call(void 0, _types.TokenType.typeParameterStart)) {
          _index.next.call(void 0);
        } else {
          _util.unexpected.call(void 0);
        }
        do {
          flowParseTypeParameter();
          if (!_index.match.call(void 0, _types.TokenType.greaterThan)) {
            _util.expect.call(void 0, _types.TokenType.comma);
          }
        } while (!_index.match.call(void 0, _types.TokenType.greaterThan) && !_base.state.error);
        _util.expect.call(void 0, _types.TokenType.greaterThan);
        _index.popTypeContext.call(void 0, oldIsType);
      }
      exports.flowParseTypeParameterDeclaration = flowParseTypeParameterDeclaration;
      function flowParseTypeParameterInstantiation() {
        const oldIsType = _index.pushTypeContext.call(void 0, 0);
        _util.expect.call(void 0, _types.TokenType.lessThan);
        while (!_index.match.call(void 0, _types.TokenType.greaterThan) && !_base.state.error) {
          flowParseType();
          if (!_index.match.call(void 0, _types.TokenType.greaterThan)) {
            _util.expect.call(void 0, _types.TokenType.comma);
          }
        }
        _util.expect.call(void 0, _types.TokenType.greaterThan);
        _index.popTypeContext.call(void 0, oldIsType);
      }
      function flowParseInterfaceType() {
        _util.expectContextual.call(void 0, _keywords.ContextualKeyword._interface);
        if (_index.eat.call(void 0, _types.TokenType._extends)) {
          do {
            flowParseInterfaceExtends();
          } while (_index.eat.call(void 0, _types.TokenType.comma));
        }
        flowParseObjectType(false, false, false);
      }
      function flowParseObjectPropertyKey() {
        if (_index.match.call(void 0, _types.TokenType.num) || _index.match.call(void 0, _types.TokenType.string)) {
          _expression.parseExprAtom.call(void 0);
        } else {
          _expression.parseIdentifier.call(void 0);
        }
      }
      function flowParseObjectTypeIndexer() {
        if (_index.lookaheadType.call(void 0) === _types.TokenType.colon) {
          flowParseObjectPropertyKey();
          flowParseTypeInitialiser();
        } else {
          flowParseType();
        }
        _util.expect.call(void 0, _types.TokenType.bracketR);
        flowParseTypeInitialiser();
      }
      function flowParseObjectTypeInternalSlot() {
        flowParseObjectPropertyKey();
        _util.expect.call(void 0, _types.TokenType.bracketR);
        _util.expect.call(void 0, _types.TokenType.bracketR);
        if (_index.match.call(void 0, _types.TokenType.lessThan) || _index.match.call(void 0, _types.TokenType.parenL)) {
          flowParseObjectTypeMethodish();
        } else {
          _index.eat.call(void 0, _types.TokenType.question);
          flowParseTypeInitialiser();
        }
      }
      function flowParseObjectTypeMethodish() {
        if (_index.match.call(void 0, _types.TokenType.lessThan)) {
          flowParseTypeParameterDeclaration();
        }
        _util.expect.call(void 0, _types.TokenType.parenL);
        while (!_index.match.call(void 0, _types.TokenType.parenR) && !_index.match.call(void 0, _types.TokenType.ellipsis) && !_base.state.error) {
          flowParseFunctionTypeParam();
          if (!_index.match.call(void 0, _types.TokenType.parenR)) {
            _util.expect.call(void 0, _types.TokenType.comma);
          }
        }
        if (_index.eat.call(void 0, _types.TokenType.ellipsis)) {
          flowParseFunctionTypeParam();
        }
        _util.expect.call(void 0, _types.TokenType.parenR);
        flowParseTypeInitialiser();
      }
      function flowParseObjectTypeCallProperty() {
        flowParseObjectTypeMethodish();
      }
      function flowParseObjectType(allowStatic, allowExact, allowProto) {
        let endDelim;
        if (allowExact && _index.match.call(void 0, _types.TokenType.braceBarL)) {
          _util.expect.call(void 0, _types.TokenType.braceBarL);
          endDelim = _types.TokenType.braceBarR;
        } else {
          _util.expect.call(void 0, _types.TokenType.braceL);
          endDelim = _types.TokenType.braceR;
        }
        while (!_index.match.call(void 0, endDelim) && !_base.state.error) {
          if (allowProto && _util.isContextual.call(void 0, _keywords.ContextualKeyword._proto)) {
            const lookahead = _index.lookaheadType.call(void 0);
            if (lookahead !== _types.TokenType.colon && lookahead !== _types.TokenType.question) {
              _index.next.call(void 0);
              allowStatic = false;
            }
          }
          if (allowStatic && _util.isContextual.call(void 0, _keywords.ContextualKeyword._static)) {
            const lookahead = _index.lookaheadType.call(void 0);
            if (lookahead !== _types.TokenType.colon && lookahead !== _types.TokenType.question) {
              _index.next.call(void 0);
            }
          }
          flowParseVariance();
          if (_index.eat.call(void 0, _types.TokenType.bracketL)) {
            if (_index.eat.call(void 0, _types.TokenType.bracketL)) {
              flowParseObjectTypeInternalSlot();
            } else {
              flowParseObjectTypeIndexer();
            }
          } else if (_index.match.call(void 0, _types.TokenType.parenL) || _index.match.call(void 0, _types.TokenType.lessThan)) {
            flowParseObjectTypeCallProperty();
          } else {
            if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._get) || _util.isContextual.call(void 0, _keywords.ContextualKeyword._set)) {
              const lookahead = _index.lookaheadType.call(void 0);
              if (lookahead === _types.TokenType.name || lookahead === _types.TokenType.string || lookahead === _types.TokenType.num) {
                _index.next.call(void 0);
              }
            }
            flowParseObjectTypeProperty();
          }
          flowObjectTypeSemicolon();
        }
        _util.expect.call(void 0, endDelim);
      }
      function flowParseObjectTypeProperty() {
        if (_index.match.call(void 0, _types.TokenType.ellipsis)) {
          _util.expect.call(void 0, _types.TokenType.ellipsis);
          if (!_index.eat.call(void 0, _types.TokenType.comma)) {
            _index.eat.call(void 0, _types.TokenType.semi);
          }
          if (_index.match.call(void 0, _types.TokenType.braceR)) {
            return;
          }
          flowParseType();
        } else {
          flowParseObjectPropertyKey();
          if (_index.match.call(void 0, _types.TokenType.lessThan) || _index.match.call(void 0, _types.TokenType.parenL)) {
            flowParseObjectTypeMethodish();
          } else {
            _index.eat.call(void 0, _types.TokenType.question);
            flowParseTypeInitialiser();
          }
        }
      }
      function flowObjectTypeSemicolon() {
        if (!_index.eat.call(void 0, _types.TokenType.semi) && !_index.eat.call(void 0, _types.TokenType.comma) && !_index.match.call(void 0, _types.TokenType.braceR) && !_index.match.call(void 0, _types.TokenType.braceBarR)) {
          _util.unexpected.call(void 0);
        }
      }
      function flowParseQualifiedTypeIdentifier(initialIdAlreadyParsed) {
        if (!initialIdAlreadyParsed) {
          _expression.parseIdentifier.call(void 0);
        }
        while (_index.eat.call(void 0, _types.TokenType.dot)) {
          _expression.parseIdentifier.call(void 0);
        }
      }
      function flowParseGenericType() {
        flowParseQualifiedTypeIdentifier(true);
        if (_index.match.call(void 0, _types.TokenType.lessThan)) {
          flowParseTypeParameterInstantiation();
        }
      }
      function flowParseTypeofType() {
        _util.expect.call(void 0, _types.TokenType._typeof);
        flowParsePrimaryType();
      }
      function flowParseTupleType() {
        _util.expect.call(void 0, _types.TokenType.bracketL);
        while (_base.state.pos < _base.input.length && !_index.match.call(void 0, _types.TokenType.bracketR)) {
          flowParseType();
          if (_index.match.call(void 0, _types.TokenType.bracketR)) {
            break;
          }
          _util.expect.call(void 0, _types.TokenType.comma);
        }
        _util.expect.call(void 0, _types.TokenType.bracketR);
      }
      function flowParseFunctionTypeParam() {
        const lookahead = _index.lookaheadType.call(void 0);
        if (lookahead === _types.TokenType.colon || lookahead === _types.TokenType.question) {
          _expression.parseIdentifier.call(void 0);
          _index.eat.call(void 0, _types.TokenType.question);
          flowParseTypeInitialiser();
        } else {
          flowParseType();
        }
      }
      function flowParseFunctionTypeParams() {
        while (!_index.match.call(void 0, _types.TokenType.parenR) && !_index.match.call(void 0, _types.TokenType.ellipsis) && !_base.state.error) {
          flowParseFunctionTypeParam();
          if (!_index.match.call(void 0, _types.TokenType.parenR)) {
            _util.expect.call(void 0, _types.TokenType.comma);
          }
        }
        if (_index.eat.call(void 0, _types.TokenType.ellipsis)) {
          flowParseFunctionTypeParam();
        }
      }
      function flowParsePrimaryType() {
        let isGroupedType = false;
        const oldNoAnonFunctionType = _base.state.noAnonFunctionType;
        switch (_base.state.type) {
          case _types.TokenType.name: {
            if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._interface)) {
              flowParseInterfaceType();
              return;
            }
            _expression.parseIdentifier.call(void 0);
            flowParseGenericType();
            return;
          }
          case _types.TokenType.braceL:
            flowParseObjectType(false, false, false);
            return;
          case _types.TokenType.braceBarL:
            flowParseObjectType(false, true, false);
            return;
          case _types.TokenType.bracketL:
            flowParseTupleType();
            return;
          case _types.TokenType.lessThan:
            flowParseTypeParameterDeclaration();
            _util.expect.call(void 0, _types.TokenType.parenL);
            flowParseFunctionTypeParams();
            _util.expect.call(void 0, _types.TokenType.parenR);
            _util.expect.call(void 0, _types.TokenType.arrow);
            flowParseType();
            return;
          case _types.TokenType.parenL:
            _index.next.call(void 0);
            if (!_index.match.call(void 0, _types.TokenType.parenR) && !_index.match.call(void 0, _types.TokenType.ellipsis)) {
              if (_index.match.call(void 0, _types.TokenType.name)) {
                const token = _index.lookaheadType.call(void 0);
                isGroupedType = token !== _types.TokenType.question && token !== _types.TokenType.colon;
              } else {
                isGroupedType = true;
              }
            }
            if (isGroupedType) {
              _base.state.noAnonFunctionType = false;
              flowParseType();
              _base.state.noAnonFunctionType = oldNoAnonFunctionType;
              if (_base.state.noAnonFunctionType || !(_index.match.call(void 0, _types.TokenType.comma) || _index.match.call(void 0, _types.TokenType.parenR) && _index.lookaheadType.call(void 0) === _types.TokenType.arrow)) {
                _util.expect.call(void 0, _types.TokenType.parenR);
                return;
              } else {
                _index.eat.call(void 0, _types.TokenType.comma);
              }
            }
            flowParseFunctionTypeParams();
            _util.expect.call(void 0, _types.TokenType.parenR);
            _util.expect.call(void 0, _types.TokenType.arrow);
            flowParseType();
            return;
          case _types.TokenType.minus:
            _index.next.call(void 0);
            _expression.parseLiteral.call(void 0);
            return;
          case _types.TokenType.string:
          case _types.TokenType.num:
          case _types.TokenType._true:
          case _types.TokenType._false:
          case _types.TokenType._null:
          case _types.TokenType._this:
          case _types.TokenType._void:
          case _types.TokenType.star:
            _index.next.call(void 0);
            return;
          default:
            if (_base.state.type === _types.TokenType._typeof) {
              flowParseTypeofType();
              return;
            } else if (_base.state.type & _types.TokenType.IS_KEYWORD) {
              _index.next.call(void 0);
              _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType.name;
              return;
            }
        }
        _util.unexpected.call(void 0);
      }
      function flowParsePostfixType() {
        flowParsePrimaryType();
        while (!_util.canInsertSemicolon.call(void 0) && (_index.match.call(void 0, _types.TokenType.bracketL) || _index.match.call(void 0, _types.TokenType.questionDot))) {
          _index.eat.call(void 0, _types.TokenType.questionDot);
          _util.expect.call(void 0, _types.TokenType.bracketL);
          if (_index.eat.call(void 0, _types.TokenType.bracketR)) {
          } else {
            flowParseType();
            _util.expect.call(void 0, _types.TokenType.bracketR);
          }
        }
      }
      function flowParsePrefixType() {
        if (_index.eat.call(void 0, _types.TokenType.question)) {
          flowParsePrefixType();
        } else {
          flowParsePostfixType();
        }
      }
      function flowParseAnonFunctionWithoutParens() {
        flowParsePrefixType();
        if (!_base.state.noAnonFunctionType && _index.eat.call(void 0, _types.TokenType.arrow)) {
          flowParseType();
        }
      }
      function flowParseIntersectionType() {
        _index.eat.call(void 0, _types.TokenType.bitwiseAND);
        flowParseAnonFunctionWithoutParens();
        while (_index.eat.call(void 0, _types.TokenType.bitwiseAND)) {
          flowParseAnonFunctionWithoutParens();
        }
      }
      function flowParseUnionType() {
        _index.eat.call(void 0, _types.TokenType.bitwiseOR);
        flowParseIntersectionType();
        while (_index.eat.call(void 0, _types.TokenType.bitwiseOR)) {
          flowParseIntersectionType();
        }
      }
      function flowParseType() {
        flowParseUnionType();
      }
      function flowParseTypeAnnotation() {
        flowParseTypeInitialiser();
      }
      exports.flowParseTypeAnnotation = flowParseTypeAnnotation;
      function flowParseTypeAnnotatableIdentifier() {
        _expression.parseIdentifier.call(void 0);
        if (_index.match.call(void 0, _types.TokenType.colon)) {
          flowParseTypeAnnotation();
        }
      }
      function flowParseVariance() {
        if (_index.match.call(void 0, _types.TokenType.plus) || _index.match.call(void 0, _types.TokenType.minus)) {
          _index.next.call(void 0);
          _base.state.tokens[_base.state.tokens.length - 1].isType = true;
        }
      }
      exports.flowParseVariance = flowParseVariance;
      function flowParseFunctionBodyAndFinish(funcContextId) {
        if (_index.match.call(void 0, _types.TokenType.colon)) {
          flowParseTypeAndPredicateInitialiser();
        }
        _expression.parseFunctionBody.call(void 0, false, funcContextId);
      }
      exports.flowParseFunctionBodyAndFinish = flowParseFunctionBodyAndFinish;
      function flowParseSubscript(startTokenIndex, noCalls, stopState) {
        if (_index.match.call(void 0, _types.TokenType.questionDot) && _index.lookaheadType.call(void 0) === _types.TokenType.lessThan) {
          if (noCalls) {
            stopState.stop = true;
            return;
          }
          _index.next.call(void 0);
          flowParseTypeParameterInstantiation();
          _util.expect.call(void 0, _types.TokenType.parenL);
          _expression.parseCallExpressionArguments.call(void 0);
          return;
        } else if (!noCalls && _index.match.call(void 0, _types.TokenType.lessThan)) {
          const snapshot = _base.state.snapshot();
          flowParseTypeParameterInstantiation();
          _util.expect.call(void 0, _types.TokenType.parenL);
          _expression.parseCallExpressionArguments.call(void 0);
          if (_base.state.error) {
            _base.state.restoreFromSnapshot(snapshot);
          } else {
            return;
          }
        }
        _expression.baseParseSubscript.call(void 0, startTokenIndex, noCalls, stopState);
      }
      exports.flowParseSubscript = flowParseSubscript;
      function flowStartParseNewArguments() {
        if (_index.match.call(void 0, _types.TokenType.lessThan)) {
          const snapshot = _base.state.snapshot();
          flowParseTypeParameterInstantiation();
          if (_base.state.error) {
            _base.state.restoreFromSnapshot(snapshot);
          }
        }
      }
      exports.flowStartParseNewArguments = flowStartParseNewArguments;
      function flowTryParseStatement() {
        if (_index.match.call(void 0, _types.TokenType.name) && _base.state.contextualKeyword === _keywords.ContextualKeyword._interface) {
          const oldIsType = _index.pushTypeContext.call(void 0, 0);
          _index.next.call(void 0);
          flowParseInterface();
          _index.popTypeContext.call(void 0, oldIsType);
          return true;
        } else {
          return false;
        }
      }
      exports.flowTryParseStatement = flowTryParseStatement;
      function flowParseIdentifierStatement(contextualKeyword) {
        if (contextualKeyword === _keywords.ContextualKeyword._declare) {
          if (_index.match.call(void 0, _types.TokenType._class) || _index.match.call(void 0, _types.TokenType.name) || _index.match.call(void 0, _types.TokenType._function) || _index.match.call(void 0, _types.TokenType._var) || _index.match.call(void 0, _types.TokenType._export)) {
            const oldIsType = _index.pushTypeContext.call(void 0, 1);
            flowParseDeclare();
            _index.popTypeContext.call(void 0, oldIsType);
          }
        } else if (_index.match.call(void 0, _types.TokenType.name)) {
          if (contextualKeyword === _keywords.ContextualKeyword._interface) {
            const oldIsType = _index.pushTypeContext.call(void 0, 1);
            flowParseInterface();
            _index.popTypeContext.call(void 0, oldIsType);
          } else if (contextualKeyword === _keywords.ContextualKeyword._type) {
            const oldIsType = _index.pushTypeContext.call(void 0, 1);
            flowParseTypeAlias();
            _index.popTypeContext.call(void 0, oldIsType);
          } else if (contextualKeyword === _keywords.ContextualKeyword._opaque) {
            const oldIsType = _index.pushTypeContext.call(void 0, 1);
            flowParseOpaqueType(false);
            _index.popTypeContext.call(void 0, oldIsType);
          }
        }
        _util.semicolon.call(void 0);
      }
      exports.flowParseIdentifierStatement = flowParseIdentifierStatement;
      function flowShouldParseExportDeclaration() {
        return _util.isContextual.call(void 0, _keywords.ContextualKeyword._type) || _util.isContextual.call(void 0, _keywords.ContextualKeyword._interface) || _util.isContextual.call(void 0, _keywords.ContextualKeyword._opaque);
      }
      exports.flowShouldParseExportDeclaration = flowShouldParseExportDeclaration;
      function flowShouldDisallowExportDefaultSpecifier() {
        return _index.match.call(void 0, _types.TokenType.name) && (_base.state.contextualKeyword === _keywords.ContextualKeyword._type || _base.state.contextualKeyword === _keywords.ContextualKeyword._interface || _base.state.contextualKeyword === _keywords.ContextualKeyword._opaque);
      }
      exports.flowShouldDisallowExportDefaultSpecifier = flowShouldDisallowExportDefaultSpecifier;
      function flowParseExportDeclaration() {
        if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._type)) {
          const oldIsType = _index.pushTypeContext.call(void 0, 1);
          _index.next.call(void 0);
          if (_index.match.call(void 0, _types.TokenType.braceL)) {
            _statement.parseExportSpecifiers.call(void 0);
            _statement.parseExportFrom.call(void 0);
          } else {
            flowParseTypeAlias();
          }
          _index.popTypeContext.call(void 0, oldIsType);
        } else if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._opaque)) {
          const oldIsType = _index.pushTypeContext.call(void 0, 1);
          _index.next.call(void 0);
          flowParseOpaqueType(false);
          _index.popTypeContext.call(void 0, oldIsType);
        } else if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._interface)) {
          const oldIsType = _index.pushTypeContext.call(void 0, 1);
          _index.next.call(void 0);
          flowParseInterface();
          _index.popTypeContext.call(void 0, oldIsType);
        } else {
          _statement.parseStatement.call(void 0, true);
        }
      }
      exports.flowParseExportDeclaration = flowParseExportDeclaration;
      function flowShouldParseExportStar() {
        return _index.match.call(void 0, _types.TokenType.star) || _util.isContextual.call(void 0, _keywords.ContextualKeyword._type) && _index.lookaheadType.call(void 0) === _types.TokenType.star;
      }
      exports.flowShouldParseExportStar = flowShouldParseExportStar;
      function flowParseExportStar() {
        if (_util.eatContextual.call(void 0, _keywords.ContextualKeyword._type)) {
          const oldIsType = _index.pushTypeContext.call(void 0, 2);
          _statement.baseParseExportStar.call(void 0);
          _index.popTypeContext.call(void 0, oldIsType);
        } else {
          _statement.baseParseExportStar.call(void 0);
        }
      }
      exports.flowParseExportStar = flowParseExportStar;
      function flowAfterParseClassSuper(hasSuper) {
        if (hasSuper && _index.match.call(void 0, _types.TokenType.lessThan)) {
          flowParseTypeParameterInstantiation();
        }
        if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._implements)) {
          const oldIsType = _index.pushTypeContext.call(void 0, 0);
          _index.next.call(void 0);
          _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._implements;
          do {
            flowParseRestrictedIdentifier();
            if (_index.match.call(void 0, _types.TokenType.lessThan)) {
              flowParseTypeParameterInstantiation();
            }
          } while (_index.eat.call(void 0, _types.TokenType.comma));
          _index.popTypeContext.call(void 0, oldIsType);
        }
      }
      exports.flowAfterParseClassSuper = flowAfterParseClassSuper;
      function flowStartParseObjPropValue() {
        if (_index.match.call(void 0, _types.TokenType.lessThan)) {
          flowParseTypeParameterDeclaration();
          if (!_index.match.call(void 0, _types.TokenType.parenL))
            _util.unexpected.call(void 0);
        }
      }
      exports.flowStartParseObjPropValue = flowStartParseObjPropValue;
      function flowParseAssignableListItemTypes() {
        const oldIsType = _index.pushTypeContext.call(void 0, 0);
        _index.eat.call(void 0, _types.TokenType.question);
        if (_index.match.call(void 0, _types.TokenType.colon)) {
          flowParseTypeAnnotation();
        }
        _index.popTypeContext.call(void 0, oldIsType);
      }
      exports.flowParseAssignableListItemTypes = flowParseAssignableListItemTypes;
      function flowStartParseImportSpecifiers() {
        if (_index.match.call(void 0, _types.TokenType._typeof) || _util.isContextual.call(void 0, _keywords.ContextualKeyword._type)) {
          const lh = _index.lookaheadTypeAndKeyword.call(void 0);
          if (isMaybeDefaultImport(lh) || lh.type === _types.TokenType.braceL || lh.type === _types.TokenType.star) {
            _index.next.call(void 0);
          }
        }
      }
      exports.flowStartParseImportSpecifiers = flowStartParseImportSpecifiers;
      function flowParseImportSpecifier() {
        const isTypeKeyword = _base.state.contextualKeyword === _keywords.ContextualKeyword._type || _base.state.type === _types.TokenType._typeof;
        if (isTypeKeyword) {
          _index.next.call(void 0);
        } else {
          _expression.parseIdentifier.call(void 0);
        }
        if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._as) && !_util.isLookaheadContextual.call(void 0, _keywords.ContextualKeyword._as)) {
          _expression.parseIdentifier.call(void 0);
          if (isTypeKeyword && !_index.match.call(void 0, _types.TokenType.name) && !(_base.state.type & _types.TokenType.IS_KEYWORD)) {
          } else {
            _expression.parseIdentifier.call(void 0);
          }
        } else if (isTypeKeyword && (_index.match.call(void 0, _types.TokenType.name) || !!(_base.state.type & _types.TokenType.IS_KEYWORD))) {
          _expression.parseIdentifier.call(void 0);
          if (_util.eatContextual.call(void 0, _keywords.ContextualKeyword._as)) {
            _expression.parseIdentifier.call(void 0);
          }
        }
      }
      exports.flowParseImportSpecifier = flowParseImportSpecifier;
      function flowStartParseFunctionParams() {
        if (_index.match.call(void 0, _types.TokenType.lessThan)) {
          const oldIsType = _index.pushTypeContext.call(void 0, 0);
          flowParseTypeParameterDeclaration();
          _index.popTypeContext.call(void 0, oldIsType);
        }
      }
      exports.flowStartParseFunctionParams = flowStartParseFunctionParams;
      function flowAfterParseVarHead() {
        if (_index.match.call(void 0, _types.TokenType.colon)) {
          flowParseTypeAnnotation();
        }
      }
      exports.flowAfterParseVarHead = flowAfterParseVarHead;
      function flowStartParseAsyncArrowFromCallExpression() {
        if (_index.match.call(void 0, _types.TokenType.colon)) {
          const oldNoAnonFunctionType = _base.state.noAnonFunctionType;
          _base.state.noAnonFunctionType = true;
          flowParseTypeAnnotation();
          _base.state.noAnonFunctionType = oldNoAnonFunctionType;
        }
      }
      exports.flowStartParseAsyncArrowFromCallExpression = flowStartParseAsyncArrowFromCallExpression;
      function flowParseMaybeAssign(noIn, isWithinParens) {
        if (_index.match.call(void 0, _types.TokenType.lessThan)) {
          const snapshot = _base.state.snapshot();
          let wasArrow = _expression.baseParseMaybeAssign.call(void 0, noIn, isWithinParens);
          if (_base.state.error) {
            _base.state.restoreFromSnapshot(snapshot);
            _base.state.type = _types.TokenType.typeParameterStart;
          } else {
            return wasArrow;
          }
          const oldIsType = _index.pushTypeContext.call(void 0, 0);
          flowParseTypeParameterDeclaration();
          _index.popTypeContext.call(void 0, oldIsType);
          wasArrow = _expression.baseParseMaybeAssign.call(void 0, noIn, isWithinParens);
          if (wasArrow) {
            return true;
          }
          _util.unexpected.call(void 0);
        }
        return _expression.baseParseMaybeAssign.call(void 0, noIn, isWithinParens);
      }
      exports.flowParseMaybeAssign = flowParseMaybeAssign;
      function flowParseArrow() {
        if (_index.match.call(void 0, _types.TokenType.colon)) {
          const oldIsType = _index.pushTypeContext.call(void 0, 0);
          const snapshot = _base.state.snapshot();
          const oldNoAnonFunctionType = _base.state.noAnonFunctionType;
          _base.state.noAnonFunctionType = true;
          flowParseTypeAndPredicateInitialiser();
          _base.state.noAnonFunctionType = oldNoAnonFunctionType;
          if (_util.canInsertSemicolon.call(void 0))
            _util.unexpected.call(void 0);
          if (!_index.match.call(void 0, _types.TokenType.arrow))
            _util.unexpected.call(void 0);
          if (_base.state.error) {
            _base.state.restoreFromSnapshot(snapshot);
          }
          _index.popTypeContext.call(void 0, oldIsType);
        }
        return _index.eat.call(void 0, _types.TokenType.arrow);
      }
      exports.flowParseArrow = flowParseArrow;
      function flowParseSubscripts(startTokenIndex, noCalls = false) {
        if (_base.state.tokens[_base.state.tokens.length - 1].contextualKeyword === _keywords.ContextualKeyword._async && _index.match.call(void 0, _types.TokenType.lessThan)) {
          const snapshot = _base.state.snapshot();
          const wasArrow = parseAsyncArrowWithTypeParameters();
          if (wasArrow && !_base.state.error) {
            return;
          }
          _base.state.restoreFromSnapshot(snapshot);
        }
        _expression.baseParseSubscripts.call(void 0, startTokenIndex, noCalls);
      }
      exports.flowParseSubscripts = flowParseSubscripts;
      function parseAsyncArrowWithTypeParameters() {
        _base.state.scopeDepth++;
        const startTokenIndex = _base.state.tokens.length;
        _statement.parseFunctionParams.call(void 0);
        if (!_expression.parseArrow.call(void 0)) {
          return false;
        }
        _expression.parseArrowExpression.call(void 0, startTokenIndex);
        return true;
      }
    }
  });

  // node_modules/sucrase/dist/parser/traverser/statement.js
  var require_statement = __commonJS({
    "node_modules/sucrase/dist/parser/traverser/statement.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var _index = require_parser();
      var _flow = require_flow();
      var _typescript = require_typescript();
      var _tokenizer = require_tokenizer();
      var _keywords = require_keywords();
      var _state = require_state();
      var _types = require_types();
      var _charcodes = require_charcodes();
      var _base = require_base();
      var _expression = require_expression();
      var _lval = require_lval();
      var _util = require_util();
      function parseTopLevel() {
        parseBlockBody(_types.TokenType.eof);
        _base.state.scopes.push(new (0, _state.Scope)(0, _base.state.tokens.length, true));
        if (_base.state.scopeDepth !== 0) {
          throw new Error(`Invalid scope depth at end of file: ${_base.state.scopeDepth}`);
        }
        return new (0, _index.File)(_base.state.tokens, _base.state.scopes);
      }
      exports.parseTopLevel = parseTopLevel;
      function parseStatement(declaration) {
        if (_base.isFlowEnabled) {
          if (_flow.flowTryParseStatement.call(void 0)) {
            return;
          }
        }
        if (_tokenizer.match.call(void 0, _types.TokenType.at)) {
          parseDecorators();
        }
        parseStatementContent(declaration);
      }
      exports.parseStatement = parseStatement;
      function parseStatementContent(declaration) {
        if (_base.isTypeScriptEnabled) {
          if (_typescript.tsTryParseStatementContent.call(void 0)) {
            return;
          }
        }
        const starttype = _base.state.type;
        switch (starttype) {
          case _types.TokenType._break:
          case _types.TokenType._continue:
            parseBreakContinueStatement();
            return;
          case _types.TokenType._debugger:
            parseDebuggerStatement();
            return;
          case _types.TokenType._do:
            parseDoStatement();
            return;
          case _types.TokenType._for:
            parseForStatement();
            return;
          case _types.TokenType._function:
            if (_tokenizer.lookaheadType.call(void 0) === _types.TokenType.dot)
              break;
            if (!declaration)
              _util.unexpected.call(void 0);
            parseFunctionStatement();
            return;
          case _types.TokenType._class:
            if (!declaration)
              _util.unexpected.call(void 0);
            parseClass(true);
            return;
          case _types.TokenType._if:
            parseIfStatement();
            return;
          case _types.TokenType._return:
            parseReturnStatement();
            return;
          case _types.TokenType._switch:
            parseSwitchStatement();
            return;
          case _types.TokenType._throw:
            parseThrowStatement();
            return;
          case _types.TokenType._try:
            parseTryStatement();
            return;
          case _types.TokenType._let:
          case _types.TokenType._const:
            if (!declaration)
              _util.unexpected.call(void 0);
          case _types.TokenType._var:
            parseVarStatement(starttype);
            return;
          case _types.TokenType._while:
            parseWhileStatement();
            return;
          case _types.TokenType.braceL:
            parseBlock();
            return;
          case _types.TokenType.semi:
            parseEmptyStatement();
            return;
          case _types.TokenType._export:
          case _types.TokenType._import: {
            const nextType = _tokenizer.lookaheadType.call(void 0);
            if (nextType === _types.TokenType.parenL || nextType === _types.TokenType.dot) {
              break;
            }
            _tokenizer.next.call(void 0);
            if (starttype === _types.TokenType._import) {
              parseImport();
            } else {
              parseExport();
            }
            return;
          }
          case _types.TokenType.name:
            if (_base.state.contextualKeyword === _keywords.ContextualKeyword._async) {
              const functionStart = _base.state.start;
              const snapshot = _base.state.snapshot();
              _tokenizer.next.call(void 0);
              if (_tokenizer.match.call(void 0, _types.TokenType._function) && !_util.canInsertSemicolon.call(void 0)) {
                _util.expect.call(void 0, _types.TokenType._function);
                parseFunction(functionStart, true);
                return;
              } else {
                _base.state.restoreFromSnapshot(snapshot);
              }
            }
          default:
            break;
        }
        const initialTokensLength = _base.state.tokens.length;
        _expression.parseExpression.call(void 0);
        let simpleName = null;
        if (_base.state.tokens.length === initialTokensLength + 1) {
          const token = _base.state.tokens[_base.state.tokens.length - 1];
          if (token.type === _types.TokenType.name) {
            simpleName = token.contextualKeyword;
          }
        }
        if (simpleName == null) {
          _util.semicolon.call(void 0);
          return;
        }
        if (_tokenizer.eat.call(void 0, _types.TokenType.colon)) {
          parseLabeledStatement();
        } else {
          parseIdentifierStatement(simpleName);
        }
      }
      function parseDecorators() {
        while (_tokenizer.match.call(void 0, _types.TokenType.at)) {
          parseDecorator();
        }
      }
      exports.parseDecorators = parseDecorators;
      function parseDecorator() {
        _tokenizer.next.call(void 0);
        if (_tokenizer.eat.call(void 0, _types.TokenType.parenL)) {
          _expression.parseExpression.call(void 0);
          _util.expect.call(void 0, _types.TokenType.parenR);
        } else {
          _expression.parseIdentifier.call(void 0);
          while (_tokenizer.eat.call(void 0, _types.TokenType.dot)) {
            _expression.parseIdentifier.call(void 0);
          }
        }
        parseMaybeDecoratorArguments();
      }
      function parseMaybeDecoratorArguments() {
        if (_base.isTypeScriptEnabled) {
          _typescript.tsParseMaybeDecoratorArguments.call(void 0);
        } else {
          baseParseMaybeDecoratorArguments();
        }
      }
      function baseParseMaybeDecoratorArguments() {
        if (_tokenizer.eat.call(void 0, _types.TokenType.parenL)) {
          _expression.parseCallExpressionArguments.call(void 0);
        }
      }
      exports.baseParseMaybeDecoratorArguments = baseParseMaybeDecoratorArguments;
      function parseBreakContinueStatement() {
        _tokenizer.next.call(void 0);
        if (!_util.isLineTerminator.call(void 0)) {
          _expression.parseIdentifier.call(void 0);
          _util.semicolon.call(void 0);
        }
      }
      function parseDebuggerStatement() {
        _tokenizer.next.call(void 0);
        _util.semicolon.call(void 0);
      }
      function parseDoStatement() {
        _tokenizer.next.call(void 0);
        parseStatement(false);
        _util.expect.call(void 0, _types.TokenType._while);
        _expression.parseParenExpression.call(void 0);
        _tokenizer.eat.call(void 0, _types.TokenType.semi);
      }
      function parseForStatement() {
        _base.state.scopeDepth++;
        const startTokenIndex = _base.state.tokens.length;
        parseAmbiguousForStatement();
        const endTokenIndex = _base.state.tokens.length;
        _base.state.scopes.push(new (0, _state.Scope)(startTokenIndex, endTokenIndex, false));
        _base.state.scopeDepth--;
      }
      function parseAmbiguousForStatement() {
        _tokenizer.next.call(void 0);
        let forAwait = false;
        if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._await)) {
          forAwait = true;
          _tokenizer.next.call(void 0);
        }
        _util.expect.call(void 0, _types.TokenType.parenL);
        if (_tokenizer.match.call(void 0, _types.TokenType.semi)) {
          if (forAwait) {
            _util.unexpected.call(void 0);
          }
          parseFor();
          return;
        }
        if (_tokenizer.match.call(void 0, _types.TokenType._var) || _tokenizer.match.call(void 0, _types.TokenType._let) || _tokenizer.match.call(void 0, _types.TokenType._const)) {
          const varKind = _base.state.type;
          _tokenizer.next.call(void 0);
          parseVar(true, varKind);
          if (_tokenizer.match.call(void 0, _types.TokenType._in) || _util.isContextual.call(void 0, _keywords.ContextualKeyword._of)) {
            parseForIn(forAwait);
            return;
          }
          parseFor();
          return;
        }
        _expression.parseExpression.call(void 0, true);
        if (_tokenizer.match.call(void 0, _types.TokenType._in) || _util.isContextual.call(void 0, _keywords.ContextualKeyword._of)) {
          parseForIn(forAwait);
          return;
        }
        if (forAwait) {
          _util.unexpected.call(void 0);
        }
        parseFor();
      }
      function parseFunctionStatement() {
        const functionStart = _base.state.start;
        _tokenizer.next.call(void 0);
        parseFunction(functionStart, true);
      }
      function parseIfStatement() {
        _tokenizer.next.call(void 0);
        _expression.parseParenExpression.call(void 0);
        parseStatement(false);
        if (_tokenizer.eat.call(void 0, _types.TokenType._else)) {
          parseStatement(false);
        }
      }
      function parseReturnStatement() {
        _tokenizer.next.call(void 0);
        if (!_util.isLineTerminator.call(void 0)) {
          _expression.parseExpression.call(void 0);
          _util.semicolon.call(void 0);
        }
      }
      function parseSwitchStatement() {
        _tokenizer.next.call(void 0);
        _expression.parseParenExpression.call(void 0);
        _base.state.scopeDepth++;
        const startTokenIndex = _base.state.tokens.length;
        _util.expect.call(void 0, _types.TokenType.braceL);
        while (!_tokenizer.match.call(void 0, _types.TokenType.braceR) && !_base.state.error) {
          if (_tokenizer.match.call(void 0, _types.TokenType._case) || _tokenizer.match.call(void 0, _types.TokenType._default)) {
            const isCase = _tokenizer.match.call(void 0, _types.TokenType._case);
            _tokenizer.next.call(void 0);
            if (isCase) {
              _expression.parseExpression.call(void 0);
            }
            _util.expect.call(void 0, _types.TokenType.colon);
          } else {
            parseStatement(true);
          }
        }
        _tokenizer.next.call(void 0);
        const endTokenIndex = _base.state.tokens.length;
        _base.state.scopes.push(new (0, _state.Scope)(startTokenIndex, endTokenIndex, false));
        _base.state.scopeDepth--;
      }
      function parseThrowStatement() {
        _tokenizer.next.call(void 0);
        _expression.parseExpression.call(void 0);
        _util.semicolon.call(void 0);
      }
      function parseCatchClauseParam() {
        _lval.parseBindingAtom.call(void 0, true);
        if (_base.isTypeScriptEnabled) {
          _typescript.tsTryParseTypeAnnotation.call(void 0);
        }
      }
      function parseTryStatement() {
        _tokenizer.next.call(void 0);
        parseBlock();
        if (_tokenizer.match.call(void 0, _types.TokenType._catch)) {
          _tokenizer.next.call(void 0);
          let catchBindingStartTokenIndex = null;
          if (_tokenizer.match.call(void 0, _types.TokenType.parenL)) {
            _base.state.scopeDepth++;
            catchBindingStartTokenIndex = _base.state.tokens.length;
            _util.expect.call(void 0, _types.TokenType.parenL);
            parseCatchClauseParam();
            _util.expect.call(void 0, _types.TokenType.parenR);
          }
          parseBlock();
          if (catchBindingStartTokenIndex != null) {
            const endTokenIndex = _base.state.tokens.length;
            _base.state.scopes.push(new (0, _state.Scope)(catchBindingStartTokenIndex, endTokenIndex, false));
            _base.state.scopeDepth--;
          }
        }
        if (_tokenizer.eat.call(void 0, _types.TokenType._finally)) {
          parseBlock();
        }
      }
      function parseVarStatement(kind) {
        _tokenizer.next.call(void 0);
        parseVar(false, kind);
        _util.semicolon.call(void 0);
      }
      exports.parseVarStatement = parseVarStatement;
      function parseWhileStatement() {
        _tokenizer.next.call(void 0);
        _expression.parseParenExpression.call(void 0);
        parseStatement(false);
      }
      function parseEmptyStatement() {
        _tokenizer.next.call(void 0);
      }
      function parseLabeledStatement() {
        parseStatement(true);
      }
      function parseIdentifierStatement(contextualKeyword) {
        if (_base.isTypeScriptEnabled) {
          _typescript.tsParseIdentifierStatement.call(void 0, contextualKeyword);
        } else if (_base.isFlowEnabled) {
          _flow.flowParseIdentifierStatement.call(void 0, contextualKeyword);
        } else {
          _util.semicolon.call(void 0);
        }
      }
      function parseBlock(isFunctionScope = false, contextId = 0) {
        const startTokenIndex = _base.state.tokens.length;
        _base.state.scopeDepth++;
        _util.expect.call(void 0, _types.TokenType.braceL);
        if (contextId) {
          _base.state.tokens[_base.state.tokens.length - 1].contextId = contextId;
        }
        parseBlockBody(_types.TokenType.braceR);
        if (contextId) {
          _base.state.tokens[_base.state.tokens.length - 1].contextId = contextId;
        }
        const endTokenIndex = _base.state.tokens.length;
        _base.state.scopes.push(new (0, _state.Scope)(startTokenIndex, endTokenIndex, isFunctionScope));
        _base.state.scopeDepth--;
      }
      exports.parseBlock = parseBlock;
      function parseBlockBody(end) {
        while (!_tokenizer.eat.call(void 0, end) && !_base.state.error) {
          parseStatement(true);
        }
      }
      exports.parseBlockBody = parseBlockBody;
      function parseFor() {
        _util.expect.call(void 0, _types.TokenType.semi);
        if (!_tokenizer.match.call(void 0, _types.TokenType.semi)) {
          _expression.parseExpression.call(void 0);
        }
        _util.expect.call(void 0, _types.TokenType.semi);
        if (!_tokenizer.match.call(void 0, _types.TokenType.parenR)) {
          _expression.parseExpression.call(void 0);
        }
        _util.expect.call(void 0, _types.TokenType.parenR);
        parseStatement(false);
      }
      function parseForIn(forAwait) {
        if (forAwait) {
          _util.eatContextual.call(void 0, _keywords.ContextualKeyword._of);
        } else {
          _tokenizer.next.call(void 0);
        }
        _expression.parseExpression.call(void 0);
        _util.expect.call(void 0, _types.TokenType.parenR);
        parseStatement(false);
      }
      function parseVar(isFor, kind) {
        while (true) {
          const isBlockScope = kind === _types.TokenType._const || kind === _types.TokenType._let;
          parseVarHead(isBlockScope);
          if (_tokenizer.eat.call(void 0, _types.TokenType.eq)) {
            const eqIndex = _base.state.tokens.length - 1;
            _expression.parseMaybeAssign.call(void 0, isFor);
            _base.state.tokens[eqIndex].rhsEndIndex = _base.state.tokens.length;
          }
          if (!_tokenizer.eat.call(void 0, _types.TokenType.comma)) {
            break;
          }
        }
      }
      function parseVarHead(isBlockScope) {
        _lval.parseBindingAtom.call(void 0, isBlockScope);
        if (_base.isTypeScriptEnabled) {
          _typescript.tsAfterParseVarHead.call(void 0);
        } else if (_base.isFlowEnabled) {
          _flow.flowAfterParseVarHead.call(void 0);
        }
      }
      function parseFunction(functionStart, isStatement, optionalId = false) {
        if (_tokenizer.match.call(void 0, _types.TokenType.star)) {
          _tokenizer.next.call(void 0);
        }
        if (isStatement && !optionalId && !_tokenizer.match.call(void 0, _types.TokenType.name) && !_tokenizer.match.call(void 0, _types.TokenType._yield)) {
          _util.unexpected.call(void 0);
        }
        let nameScopeStartTokenIndex = null;
        if (_tokenizer.match.call(void 0, _types.TokenType.name)) {
          if (!isStatement) {
            nameScopeStartTokenIndex = _base.state.tokens.length;
            _base.state.scopeDepth++;
          }
          _lval.parseBindingIdentifier.call(void 0, false);
        }
        const startTokenIndex = _base.state.tokens.length;
        _base.state.scopeDepth++;
        parseFunctionParams();
        _expression.parseFunctionBodyAndFinish.call(void 0, functionStart);
        const endTokenIndex = _base.state.tokens.length;
        _base.state.scopes.push(new (0, _state.Scope)(startTokenIndex, endTokenIndex, true));
        _base.state.scopeDepth--;
        if (nameScopeStartTokenIndex !== null) {
          _base.state.scopes.push(new (0, _state.Scope)(nameScopeStartTokenIndex, endTokenIndex, true));
          _base.state.scopeDepth--;
        }
      }
      exports.parseFunction = parseFunction;
      function parseFunctionParams(allowModifiers = false, funcContextId = 0) {
        if (_base.isTypeScriptEnabled) {
          _typescript.tsStartParseFunctionParams.call(void 0);
        } else if (_base.isFlowEnabled) {
          _flow.flowStartParseFunctionParams.call(void 0);
        }
        _util.expect.call(void 0, _types.TokenType.parenL);
        if (funcContextId) {
          _base.state.tokens[_base.state.tokens.length - 1].contextId = funcContextId;
        }
        _lval.parseBindingList.call(void 0, _types.TokenType.parenR, false, false, allowModifiers, funcContextId);
        if (funcContextId) {
          _base.state.tokens[_base.state.tokens.length - 1].contextId = funcContextId;
        }
      }
      exports.parseFunctionParams = parseFunctionParams;
      function parseClass(isStatement, optionalId = false) {
        const contextId = _base.getNextContextId.call(void 0);
        _tokenizer.next.call(void 0);
        _base.state.tokens[_base.state.tokens.length - 1].contextId = contextId;
        _base.state.tokens[_base.state.tokens.length - 1].isExpression = !isStatement;
        let nameScopeStartTokenIndex = null;
        if (!isStatement) {
          nameScopeStartTokenIndex = _base.state.tokens.length;
          _base.state.scopeDepth++;
        }
        parseClassId(isStatement, optionalId);
        parseClassSuper();
        const openBraceIndex = _base.state.tokens.length;
        parseClassBody(contextId);
        if (_base.state.error) {
          return;
        }
        _base.state.tokens[openBraceIndex].contextId = contextId;
        _base.state.tokens[_base.state.tokens.length - 1].contextId = contextId;
        if (nameScopeStartTokenIndex !== null) {
          const endTokenIndex = _base.state.tokens.length;
          _base.state.scopes.push(new (0, _state.Scope)(nameScopeStartTokenIndex, endTokenIndex, false));
          _base.state.scopeDepth--;
        }
      }
      exports.parseClass = parseClass;
      function isClassProperty() {
        return _tokenizer.match.call(void 0, _types.TokenType.eq) || _tokenizer.match.call(void 0, _types.TokenType.semi) || _tokenizer.match.call(void 0, _types.TokenType.braceR) || _tokenizer.match.call(void 0, _types.TokenType.bang) || _tokenizer.match.call(void 0, _types.TokenType.colon);
      }
      function isClassMethod() {
        return _tokenizer.match.call(void 0, _types.TokenType.parenL) || _tokenizer.match.call(void 0, _types.TokenType.lessThan);
      }
      function parseClassBody(classContextId) {
        _util.expect.call(void 0, _types.TokenType.braceL);
        while (!_tokenizer.eat.call(void 0, _types.TokenType.braceR) && !_base.state.error) {
          if (_tokenizer.eat.call(void 0, _types.TokenType.semi)) {
            continue;
          }
          if (_tokenizer.match.call(void 0, _types.TokenType.at)) {
            parseDecorator();
            continue;
          }
          const memberStart = _base.state.start;
          parseClassMember(memberStart, classContextId);
        }
      }
      function parseClassMember(memberStart, classContextId) {
        if (_base.isTypeScriptEnabled) {
          _typescript.tsParseModifiers.call(void 0, [
            _keywords.ContextualKeyword._declare,
            _keywords.ContextualKeyword._public,
            _keywords.ContextualKeyword._protected,
            _keywords.ContextualKeyword._private,
            _keywords.ContextualKeyword._override
          ]);
        }
        let isStatic = false;
        if (_tokenizer.match.call(void 0, _types.TokenType.name) && _base.state.contextualKeyword === _keywords.ContextualKeyword._static) {
          _expression.parseIdentifier.call(void 0);
          if (isClassMethod()) {
            parseClassMethod(memberStart, false);
            return;
          } else if (isClassProperty()) {
            parseClassProperty();
            return;
          }
          _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._static;
          isStatic = true;
          if (_tokenizer.match.call(void 0, _types.TokenType.braceL)) {
            _base.state.tokens[_base.state.tokens.length - 1].contextId = classContextId;
            parseBlock();
            return;
          }
        }
        parseClassMemberWithIsStatic(memberStart, isStatic, classContextId);
      }
      function parseClassMemberWithIsStatic(memberStart, isStatic, classContextId) {
        if (_base.isTypeScriptEnabled) {
          if (_typescript.tsTryParseClassMemberWithIsStatic.call(void 0, isStatic)) {
            return;
          }
        }
        if (_tokenizer.eat.call(void 0, _types.TokenType.star)) {
          parseClassPropertyName(classContextId);
          parseClassMethod(memberStart, false);
          return;
        }
        parseClassPropertyName(classContextId);
        let isConstructor = false;
        const token = _base.state.tokens[_base.state.tokens.length - 1];
        if (token.contextualKeyword === _keywords.ContextualKeyword._constructor) {
          isConstructor = true;
        }
        parsePostMemberNameModifiers();
        if (isClassMethod()) {
          parseClassMethod(memberStart, isConstructor);
        } else if (isClassProperty()) {
          parseClassProperty();
        } else if (token.contextualKeyword === _keywords.ContextualKeyword._async && !_util.isLineTerminator.call(void 0)) {
          _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._async;
          const isGenerator = _tokenizer.match.call(void 0, _types.TokenType.star);
          if (isGenerator) {
            _tokenizer.next.call(void 0);
          }
          parseClassPropertyName(classContextId);
          parsePostMemberNameModifiers();
          parseClassMethod(memberStart, false);
        } else if ((token.contextualKeyword === _keywords.ContextualKeyword._get || token.contextualKeyword === _keywords.ContextualKeyword._set) && !(_util.isLineTerminator.call(void 0) && _tokenizer.match.call(void 0, _types.TokenType.star))) {
          if (token.contextualKeyword === _keywords.ContextualKeyword._get) {
            _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._get;
          } else {
            _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._set;
          }
          parseClassPropertyName(classContextId);
          parseClassMethod(memberStart, false);
        } else if (_util.isLineTerminator.call(void 0)) {
          parseClassProperty();
        } else {
          _util.unexpected.call(void 0);
        }
      }
      function parseClassMethod(functionStart, isConstructor) {
        if (_base.isTypeScriptEnabled) {
          _typescript.tsTryParseTypeParameters.call(void 0);
        } else if (_base.isFlowEnabled) {
          if (_tokenizer.match.call(void 0, _types.TokenType.lessThan)) {
            _flow.flowParseTypeParameterDeclaration.call(void 0);
          }
        }
        _expression.parseMethod.call(void 0, functionStart, isConstructor);
      }
      function parseClassPropertyName(classContextId) {
        _expression.parsePropertyName.call(void 0, classContextId);
      }
      exports.parseClassPropertyName = parseClassPropertyName;
      function parsePostMemberNameModifiers() {
        if (_base.isTypeScriptEnabled) {
          const oldIsType = _tokenizer.pushTypeContext.call(void 0, 0);
          _tokenizer.eat.call(void 0, _types.TokenType.question);
          _tokenizer.popTypeContext.call(void 0, oldIsType);
        }
      }
      exports.parsePostMemberNameModifiers = parsePostMemberNameModifiers;
      function parseClassProperty() {
        if (_base.isTypeScriptEnabled) {
          _tokenizer.eatTypeToken.call(void 0, _types.TokenType.bang);
          _typescript.tsTryParseTypeAnnotation.call(void 0);
        } else if (_base.isFlowEnabled) {
          if (_tokenizer.match.call(void 0, _types.TokenType.colon)) {
            _flow.flowParseTypeAnnotation.call(void 0);
          }
        }
        if (_tokenizer.match.call(void 0, _types.TokenType.eq)) {
          const equalsTokenIndex = _base.state.tokens.length;
          _tokenizer.next.call(void 0);
          _expression.parseMaybeAssign.call(void 0);
          _base.state.tokens[equalsTokenIndex].rhsEndIndex = _base.state.tokens.length;
        }
        _util.semicolon.call(void 0);
      }
      exports.parseClassProperty = parseClassProperty;
      function parseClassId(isStatement, optionalId = false) {
        if (_base.isTypeScriptEnabled && (!isStatement || optionalId) && _util.isContextual.call(void 0, _keywords.ContextualKeyword._implements)) {
          return;
        }
        if (_tokenizer.match.call(void 0, _types.TokenType.name)) {
          _lval.parseBindingIdentifier.call(void 0, true);
        }
        if (_base.isTypeScriptEnabled) {
          _typescript.tsTryParseTypeParameters.call(void 0);
        } else if (_base.isFlowEnabled) {
          if (_tokenizer.match.call(void 0, _types.TokenType.lessThan)) {
            _flow.flowParseTypeParameterDeclaration.call(void 0);
          }
        }
      }
      function parseClassSuper() {
        let hasSuper = false;
        if (_tokenizer.eat.call(void 0, _types.TokenType._extends)) {
          _expression.parseExprSubscripts.call(void 0);
          hasSuper = true;
        } else {
          hasSuper = false;
        }
        if (_base.isTypeScriptEnabled) {
          _typescript.tsAfterParseClassSuper.call(void 0, hasSuper);
        } else if (_base.isFlowEnabled) {
          _flow.flowAfterParseClassSuper.call(void 0, hasSuper);
        }
      }
      function parseExport() {
        const exportIndex = _base.state.tokens.length - 1;
        if (_base.isTypeScriptEnabled) {
          if (_typescript.tsTryParseExport.call(void 0)) {
            return;
          }
        }
        if (shouldParseExportStar()) {
          parseExportStar();
        } else if (isExportDefaultSpecifier()) {
          _expression.parseIdentifier.call(void 0);
          if (_tokenizer.match.call(void 0, _types.TokenType.comma) && _tokenizer.lookaheadType.call(void 0) === _types.TokenType.star) {
            _util.expect.call(void 0, _types.TokenType.comma);
            _util.expect.call(void 0, _types.TokenType.star);
            _util.expectContextual.call(void 0, _keywords.ContextualKeyword._as);
            _expression.parseIdentifier.call(void 0);
          } else {
            parseExportSpecifiersMaybe();
          }
          parseExportFrom();
        } else if (_tokenizer.eat.call(void 0, _types.TokenType._default)) {
          parseExportDefaultExpression();
        } else if (shouldParseExportDeclaration()) {
          parseExportDeclaration();
        } else {
          parseExportSpecifiers();
          parseExportFrom();
        }
        _base.state.tokens[exportIndex].rhsEndIndex = _base.state.tokens.length;
      }
      exports.parseExport = parseExport;
      function parseExportDefaultExpression() {
        if (_base.isTypeScriptEnabled) {
          if (_typescript.tsTryParseExportDefaultExpression.call(void 0)) {
            return;
          }
        }
        const functionStart = _base.state.start;
        if (_tokenizer.eat.call(void 0, _types.TokenType._function)) {
          parseFunction(functionStart, true, true);
        } else if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._async) && _tokenizer.lookaheadType.call(void 0) === _types.TokenType._function) {
          _util.eatContextual.call(void 0, _keywords.ContextualKeyword._async);
          _tokenizer.eat.call(void 0, _types.TokenType._function);
          parseFunction(functionStart, true, true);
        } else if (_tokenizer.match.call(void 0, _types.TokenType._class)) {
          parseClass(true, true);
        } else if (_tokenizer.match.call(void 0, _types.TokenType.at)) {
          parseDecorators();
          parseClass(true, true);
        } else {
          _expression.parseMaybeAssign.call(void 0);
          _util.semicolon.call(void 0);
        }
      }
      function parseExportDeclaration() {
        if (_base.isTypeScriptEnabled) {
          _typescript.tsParseExportDeclaration.call(void 0);
        } else if (_base.isFlowEnabled) {
          _flow.flowParseExportDeclaration.call(void 0);
        } else {
          parseStatement(true);
        }
      }
      function isExportDefaultSpecifier() {
        if (_base.isTypeScriptEnabled && _typescript.tsIsDeclarationStart.call(void 0)) {
          return false;
        } else if (_base.isFlowEnabled && _flow.flowShouldDisallowExportDefaultSpecifier.call(void 0)) {
          return false;
        }
        if (_tokenizer.match.call(void 0, _types.TokenType.name)) {
          return _base.state.contextualKeyword !== _keywords.ContextualKeyword._async;
        }
        if (!_tokenizer.match.call(void 0, _types.TokenType._default)) {
          return false;
        }
        const _next = _tokenizer.nextTokenStart.call(void 0);
        const lookahead = _tokenizer.lookaheadTypeAndKeyword.call(void 0);
        const hasFrom = lookahead.type === _types.TokenType.name && lookahead.contextualKeyword === _keywords.ContextualKeyword._from;
        if (lookahead.type === _types.TokenType.comma) {
          return true;
        }
        if (hasFrom) {
          const nextAfterFrom = _base.input.charCodeAt(_tokenizer.nextTokenStartSince.call(void 0, _next + 4));
          return nextAfterFrom === _charcodes.charCodes.quotationMark || nextAfterFrom === _charcodes.charCodes.apostrophe;
        }
        return false;
      }
      function parseExportSpecifiersMaybe() {
        if (_tokenizer.eat.call(void 0, _types.TokenType.comma)) {
          parseExportSpecifiers();
        }
      }
      function parseExportFrom() {
        if (_util.eatContextual.call(void 0, _keywords.ContextualKeyword._from)) {
          _expression.parseExprAtom.call(void 0);
        }
        _util.semicolon.call(void 0);
      }
      exports.parseExportFrom = parseExportFrom;
      function shouldParseExportStar() {
        if (_base.isFlowEnabled) {
          return _flow.flowShouldParseExportStar.call(void 0);
        } else {
          return _tokenizer.match.call(void 0, _types.TokenType.star);
        }
      }
      function parseExportStar() {
        if (_base.isFlowEnabled) {
          _flow.flowParseExportStar.call(void 0);
        } else {
          baseParseExportStar();
        }
      }
      function baseParseExportStar() {
        _util.expect.call(void 0, _types.TokenType.star);
        if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._as)) {
          parseExportNamespace();
        } else {
          parseExportFrom();
        }
      }
      exports.baseParseExportStar = baseParseExportStar;
      function parseExportNamespace() {
        _tokenizer.next.call(void 0);
        _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._as;
        _expression.parseIdentifier.call(void 0);
        parseExportSpecifiersMaybe();
        parseExportFrom();
      }
      function shouldParseExportDeclaration() {
        return _base.isTypeScriptEnabled && _typescript.tsIsDeclarationStart.call(void 0) || _base.isFlowEnabled && _flow.flowShouldParseExportDeclaration.call(void 0) || _base.state.type === _types.TokenType._var || _base.state.type === _types.TokenType._const || _base.state.type === _types.TokenType._let || _base.state.type === _types.TokenType._function || _base.state.type === _types.TokenType._class || _util.isContextual.call(void 0, _keywords.ContextualKeyword._async) || _tokenizer.match.call(void 0, _types.TokenType.at);
      }
      function parseExportSpecifiers() {
        let first = true;
        _util.expect.call(void 0, _types.TokenType.braceL);
        while (!_tokenizer.eat.call(void 0, _types.TokenType.braceR) && !_base.state.error) {
          if (first) {
            first = false;
          } else {
            _util.expect.call(void 0, _types.TokenType.comma);
            if (_tokenizer.eat.call(void 0, _types.TokenType.braceR)) {
              break;
            }
          }
          _expression.parseIdentifier.call(void 0);
          _base.state.tokens[_base.state.tokens.length - 1].identifierRole = _tokenizer.IdentifierRole.ExportAccess;
          if (_util.eatContextual.call(void 0, _keywords.ContextualKeyword._as)) {
            _expression.parseIdentifier.call(void 0);
          }
        }
      }
      exports.parseExportSpecifiers = parseExportSpecifiers;
      function parseImport() {
        if (_base.isTypeScriptEnabled && _tokenizer.match.call(void 0, _types.TokenType.name) && _tokenizer.lookaheadType.call(void 0) === _types.TokenType.eq) {
          _typescript.tsParseImportEqualsDeclaration.call(void 0);
          return;
        }
        if (_base.isTypeScriptEnabled && _util.isContextual.call(void 0, _keywords.ContextualKeyword._type)) {
          const lookahead = _tokenizer.lookaheadType.call(void 0);
          if (lookahead === _types.TokenType.name) {
            _util.expectContextual.call(void 0, _keywords.ContextualKeyword._type);
            if (_tokenizer.lookaheadType.call(void 0) === _types.TokenType.eq) {
              _typescript.tsParseImportEqualsDeclaration.call(void 0);
              return;
            }
          } else if (lookahead === _types.TokenType.star || lookahead === _types.TokenType.braceL) {
            _util.expectContextual.call(void 0, _keywords.ContextualKeyword._type);
          }
        }
        if (_tokenizer.match.call(void 0, _types.TokenType.string)) {
          _expression.parseExprAtom.call(void 0);
        } else {
          parseImportSpecifiers();
          _util.expectContextual.call(void 0, _keywords.ContextualKeyword._from);
          _expression.parseExprAtom.call(void 0);
        }
        _util.semicolon.call(void 0);
      }
      exports.parseImport = parseImport;
      function shouldParseDefaultImport() {
        return _tokenizer.match.call(void 0, _types.TokenType.name);
      }
      function parseImportSpecifierLocal() {
        _lval.parseImportedIdentifier.call(void 0);
      }
      function parseImportSpecifiers() {
        if (_base.isFlowEnabled) {
          _flow.flowStartParseImportSpecifiers.call(void 0);
        }
        let first = true;
        if (shouldParseDefaultImport()) {
          parseImportSpecifierLocal();
          if (!_tokenizer.eat.call(void 0, _types.TokenType.comma))
            return;
        }
        if (_tokenizer.match.call(void 0, _types.TokenType.star)) {
          _tokenizer.next.call(void 0);
          _util.expectContextual.call(void 0, _keywords.ContextualKeyword._as);
          parseImportSpecifierLocal();
          return;
        }
        _util.expect.call(void 0, _types.TokenType.braceL);
        while (!_tokenizer.eat.call(void 0, _types.TokenType.braceR) && !_base.state.error) {
          if (first) {
            first = false;
          } else {
            if (_tokenizer.eat.call(void 0, _types.TokenType.colon)) {
              _util.unexpected.call(void 0, "ES2015 named imports do not destructure. Use another statement for destructuring after the import.");
            }
            _util.expect.call(void 0, _types.TokenType.comma);
            if (_tokenizer.eat.call(void 0, _types.TokenType.braceR)) {
              break;
            }
          }
          parseImportSpecifier();
        }
      }
      function parseImportSpecifier() {
        if (_base.isFlowEnabled) {
          _flow.flowParseImportSpecifier.call(void 0);
          return;
        }
        _lval.parseImportedIdentifier.call(void 0);
        if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._as)) {
          _base.state.tokens[_base.state.tokens.length - 1].identifierRole = _tokenizer.IdentifierRole.ImportAccess;
          _tokenizer.next.call(void 0);
          _lval.parseImportedIdentifier.call(void 0);
        }
      }
    }
  });

  // node_modules/sucrase/dist/parser/traverser/index.js
  var require_traverser = __commonJS({
    "node_modules/sucrase/dist/parser/traverser/index.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var _index = require_tokenizer();
      var _charcodes = require_charcodes();
      var _base = require_base();
      var _statement = require_statement();
      function parseFile() {
        if (_base.state.pos === 0 && _base.input.charCodeAt(0) === _charcodes.charCodes.numberSign && _base.input.charCodeAt(1) === _charcodes.charCodes.exclamationMark) {
          _index.skipLineComment.call(void 0, 2);
        }
        _index.nextToken.call(void 0);
        return _statement.parseTopLevel.call(void 0);
      }
      exports.parseFile = parseFile;
    }
  });

  // node_modules/sucrase/dist/parser/index.js
  var require_parser = __commonJS({
    "node_modules/sucrase/dist/parser/index.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var _base = require_base();
      var _index = require_traverser();
      var File = class {
        constructor(tokens, scopes) {
          this.tokens = tokens;
          this.scopes = scopes;
        }
      };
      exports.File = File;
      function parse2(input, isJSXEnabled, isTypeScriptEnabled, isFlowEnabled) {
        if (isFlowEnabled && isTypeScriptEnabled) {
          throw new Error("Cannot combine flow and typescript plugins.");
        }
        _base.initParser.call(void 0, input, isJSXEnabled, isTypeScriptEnabled, isFlowEnabled);
        const result = _index.parseFile.call(void 0);
        if (_base.state.error) {
          throw _base.augmentError.call(void 0, _base.state.error);
        }
        return result;
      }
      exports.parse = parse2;
    }
  });

  // node_modules/sucrase/dist/util/isAsyncOperation.js
  var require_isAsyncOperation = __commonJS({
    "node_modules/sucrase/dist/util/isAsyncOperation.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var _keywords = require_keywords();
      function isAsyncOperation(tokens) {
        let index = tokens.currentIndex();
        let depth = 0;
        const startToken = tokens.currentToken();
        do {
          const token = tokens.tokens[index];
          if (token.isOptionalChainStart) {
            depth++;
          }
          if (token.isOptionalChainEnd) {
            depth--;
          }
          depth += token.numNullishCoalesceStarts;
          depth -= token.numNullishCoalesceEnds;
          if (token.contextualKeyword === _keywords.ContextualKeyword._await && token.identifierRole == null && token.scopeDepth === startToken.scopeDepth) {
            return true;
          }
          index += 1;
        } while (depth > 0 && index < tokens.tokens.length);
        return false;
      }
      exports.default = isAsyncOperation;
    }
  });

  // node_modules/sucrase/dist/TokenProcessor.js
  var require_TokenProcessor = __commonJS({
    "node_modules/sucrase/dist/TokenProcessor.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : { default: obj };
      }
      var _types = require_types();
      var _isAsyncOperation = require_isAsyncOperation();
      var _isAsyncOperation2 = _interopRequireDefault(_isAsyncOperation);
      var TokenProcessor2 = class {
        __init() {
          this.resultCode = "";
        }
        __init2() {
          this.tokenIndex = 0;
        }
        constructor(code, tokens, isFlowEnabled, disableESTransforms, helperManager) {
          ;
          this.code = code;
          this.tokens = tokens;
          this.isFlowEnabled = isFlowEnabled;
          this.disableESTransforms = disableESTransforms;
          this.helperManager = helperManager;
          TokenProcessor2.prototype.__init.call(this);
          TokenProcessor2.prototype.__init2.call(this);
        }
        snapshot() {
          return { resultCode: this.resultCode, tokenIndex: this.tokenIndex };
        }
        restoreToSnapshot(snapshot) {
          this.resultCode = snapshot.resultCode;
          this.tokenIndex = snapshot.tokenIndex;
        }
        getResultCodeIndex() {
          return this.resultCode.length;
        }
        reset() {
          this.resultCode = "";
          this.tokenIndex = 0;
        }
        matchesContextualAtIndex(index, contextualKeyword) {
          return this.matches1AtIndex(index, _types.TokenType.name) && this.tokens[index].contextualKeyword === contextualKeyword;
        }
        identifierNameAtIndex(index) {
          return this.identifierNameForToken(this.tokens[index]);
        }
        identifierName() {
          return this.identifierNameForToken(this.currentToken());
        }
        identifierNameForToken(token) {
          return this.code.slice(token.start, token.end);
        }
        rawCodeForToken(token) {
          return this.code.slice(token.start, token.end);
        }
        stringValueAtIndex(index) {
          return this.stringValueForToken(this.tokens[index]);
        }
        stringValue() {
          return this.stringValueForToken(this.currentToken());
        }
        stringValueForToken(token) {
          return this.code.slice(token.start + 1, token.end - 1);
        }
        matches1AtIndex(index, t1) {
          return this.tokens[index].type === t1;
        }
        matches2AtIndex(index, t1, t2) {
          return this.tokens[index].type === t1 && this.tokens[index + 1].type === t2;
        }
        matches3AtIndex(index, t1, t2, t3) {
          return this.tokens[index].type === t1 && this.tokens[index + 1].type === t2 && this.tokens[index + 2].type === t3;
        }
        matches1(t1) {
          return this.tokens[this.tokenIndex].type === t1;
        }
        matches2(t1, t2) {
          return this.tokens[this.tokenIndex].type === t1 && this.tokens[this.tokenIndex + 1].type === t2;
        }
        matches3(t1, t2, t3) {
          return this.tokens[this.tokenIndex].type === t1 && this.tokens[this.tokenIndex + 1].type === t2 && this.tokens[this.tokenIndex + 2].type === t3;
        }
        matches4(t1, t2, t3, t4) {
          return this.tokens[this.tokenIndex].type === t1 && this.tokens[this.tokenIndex + 1].type === t2 && this.tokens[this.tokenIndex + 2].type === t3 && this.tokens[this.tokenIndex + 3].type === t4;
        }
        matches5(t1, t2, t3, t4, t5) {
          return this.tokens[this.tokenIndex].type === t1 && this.tokens[this.tokenIndex + 1].type === t2 && this.tokens[this.tokenIndex + 2].type === t3 && this.tokens[this.tokenIndex + 3].type === t4 && this.tokens[this.tokenIndex + 4].type === t5;
        }
        matchesContextual(contextualKeyword) {
          return this.matchesContextualAtIndex(this.tokenIndex, contextualKeyword);
        }
        matchesContextIdAndLabel(type, contextId) {
          return this.matches1(type) && this.currentToken().contextId === contextId;
        }
        previousWhitespaceAndComments() {
          let whitespaceAndComments = this.code.slice(this.tokenIndex > 0 ? this.tokens[this.tokenIndex - 1].end : 0, this.tokenIndex < this.tokens.length ? this.tokens[this.tokenIndex].start : this.code.length);
          if (this.isFlowEnabled) {
            whitespaceAndComments = whitespaceAndComments.replace(/@flow/g, "");
          }
          return whitespaceAndComments;
        }
        replaceToken(newCode) {
          this.resultCode += this.previousWhitespaceAndComments();
          this.appendTokenPrefix();
          this.resultCode += newCode;
          this.appendTokenSuffix();
          this.tokenIndex++;
        }
        replaceTokenTrimmingLeftWhitespace(newCode) {
          this.resultCode += this.previousWhitespaceAndComments().replace(/[^\r\n]/g, "");
          this.appendTokenPrefix();
          this.resultCode += newCode;
          this.appendTokenSuffix();
          this.tokenIndex++;
        }
        removeInitialToken() {
          this.replaceToken("");
        }
        removeToken() {
          this.replaceTokenTrimmingLeftWhitespace("");
        }
        copyExpectedToken(tokenType) {
          if (this.tokens[this.tokenIndex].type !== tokenType) {
            throw new Error(`Expected token ${tokenType}`);
          }
          this.copyToken();
        }
        copyToken() {
          this.resultCode += this.previousWhitespaceAndComments();
          this.appendTokenPrefix();
          this.resultCode += this.code.slice(this.tokens[this.tokenIndex].start, this.tokens[this.tokenIndex].end);
          this.appendTokenSuffix();
          this.tokenIndex++;
        }
        copyTokenWithPrefix(prefix) {
          this.resultCode += this.previousWhitespaceAndComments();
          this.appendTokenPrefix();
          this.resultCode += prefix;
          this.resultCode += this.code.slice(this.tokens[this.tokenIndex].start, this.tokens[this.tokenIndex].end);
          this.appendTokenSuffix();
          this.tokenIndex++;
        }
        appendTokenPrefix() {
          const token = this.currentToken();
          if (token.numNullishCoalesceStarts || token.isOptionalChainStart) {
            token.isAsyncOperation = _isAsyncOperation2.default.call(void 0, this);
          }
          if (this.disableESTransforms) {
            return;
          }
          if (token.numNullishCoalesceStarts) {
            for (let i = 0; i < token.numNullishCoalesceStarts; i++) {
              if (token.isAsyncOperation) {
                this.resultCode += "await ";
                this.resultCode += this.helperManager.getHelperName("asyncNullishCoalesce");
              } else {
                this.resultCode += this.helperManager.getHelperName("nullishCoalesce");
              }
              this.resultCode += "(";
            }
          }
          if (token.isOptionalChainStart) {
            if (token.isAsyncOperation) {
              this.resultCode += "await ";
            }
            if (this.tokenIndex > 0 && this.tokenAtRelativeIndex(-1).type === _types.TokenType._delete) {
              if (token.isAsyncOperation) {
                this.resultCode += this.helperManager.getHelperName("asyncOptionalChainDelete");
              } else {
                this.resultCode += this.helperManager.getHelperName("optionalChainDelete");
              }
            } else if (token.isAsyncOperation) {
              this.resultCode += this.helperManager.getHelperName("asyncOptionalChain");
            } else {
              this.resultCode += this.helperManager.getHelperName("optionalChain");
            }
            this.resultCode += "([";
          }
        }
        appendTokenSuffix() {
          const token = this.currentToken();
          if (token.isOptionalChainEnd && !this.disableESTransforms) {
            this.resultCode += "])";
          }
          if (token.numNullishCoalesceEnds && !this.disableESTransforms) {
            for (let i = 0; i < token.numNullishCoalesceEnds; i++) {
              this.resultCode += "))";
            }
          }
        }
        appendCode(code) {
          this.resultCode += code;
        }
        currentToken() {
          return this.tokens[this.tokenIndex];
        }
        currentTokenCode() {
          const token = this.currentToken();
          return this.code.slice(token.start, token.end);
        }
        tokenAtRelativeIndex(relativeIndex) {
          return this.tokens[this.tokenIndex + relativeIndex];
        }
        currentIndex() {
          return this.tokenIndex;
        }
        nextToken() {
          if (this.tokenIndex === this.tokens.length) {
            throw new Error("Unexpectedly reached end of input.");
          }
          this.tokenIndex++;
        }
        previousToken() {
          this.tokenIndex--;
        }
        finish() {
          if (this.tokenIndex !== this.tokens.length) {
            throw new Error("Tried to finish processing tokens before reaching the end.");
          }
          this.resultCode += this.previousWhitespaceAndComments();
          return this.resultCode;
        }
        isAtEnd() {
          return this.tokenIndex === this.tokens.length;
        }
      };
      exports.default = TokenProcessor2;
    }
  });

  // node_modules/sucrase/dist/util/getClassInfo.js
  var require_getClassInfo = __commonJS({
    "node_modules/sucrase/dist/util/getClassInfo.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var _keywords = require_keywords();
      var _types = require_types();
      function getClassInfo(rootTransformer, tokens, nameManager, disableESTransforms) {
        const snapshot = tokens.snapshot();
        const headerInfo = processClassHeader(tokens);
        let constructorInitializerStatements = [];
        const instanceInitializerNames = [];
        const staticInitializerNames = [];
        let constructorInsertPos = null;
        const fields = [];
        const rangesToRemove = [];
        const classContextId = tokens.currentToken().contextId;
        if (classContextId == null) {
          throw new Error("Expected non-null class context ID on class open-brace.");
        }
        tokens.nextToken();
        while (!tokens.matchesContextIdAndLabel(_types.TokenType.braceR, classContextId)) {
          if (tokens.matchesContextual(_keywords.ContextualKeyword._constructor) && !tokens.currentToken().isType) {
            ({ constructorInitializerStatements, constructorInsertPos } = processConstructor(tokens));
          } else if (tokens.matches1(_types.TokenType.semi)) {
            if (!disableESTransforms) {
              rangesToRemove.push({ start: tokens.currentIndex(), end: tokens.currentIndex() + 1 });
            }
            tokens.nextToken();
          } else if (tokens.currentToken().isType) {
            tokens.nextToken();
          } else {
            const statementStartIndex = tokens.currentIndex();
            let isStatic = false;
            let isESPrivate = false;
            let isDeclare = false;
            while (isAccessModifier(tokens.currentToken())) {
              if (tokens.matches1(_types.TokenType._static)) {
                isStatic = true;
              }
              if (tokens.matches1(_types.TokenType.hash)) {
                isESPrivate = true;
              }
              if (tokens.matches1(_types.TokenType._declare)) {
                isDeclare = true;
              }
              tokens.nextToken();
            }
            if (isStatic && tokens.matches1(_types.TokenType.braceL)) {
              skipToNextClassElement(tokens, classContextId);
              continue;
            }
            if (isESPrivate) {
              skipToNextClassElement(tokens, classContextId);
              continue;
            }
            if (tokens.matchesContextual(_keywords.ContextualKeyword._constructor) && !tokens.currentToken().isType) {
              ({ constructorInitializerStatements, constructorInsertPos } = processConstructor(tokens));
              continue;
            }
            const nameStartIndex = tokens.currentIndex();
            skipFieldName(tokens);
            if (tokens.matches1(_types.TokenType.lessThan) || tokens.matches1(_types.TokenType.parenL)) {
              skipToNextClassElement(tokens, classContextId);
              continue;
            }
            while (tokens.currentToken().isType) {
              tokens.nextToken();
            }
            if (tokens.matches1(_types.TokenType.eq)) {
              const equalsIndex = tokens.currentIndex();
              const valueEnd = tokens.currentToken().rhsEndIndex;
              if (valueEnd == null) {
                throw new Error("Expected rhsEndIndex on class field assignment.");
              }
              tokens.nextToken();
              while (tokens.currentIndex() < valueEnd) {
                rootTransformer.processToken();
              }
              let initializerName;
              if (isStatic) {
                initializerName = nameManager.claimFreeName("__initStatic");
                staticInitializerNames.push(initializerName);
              } else {
                initializerName = nameManager.claimFreeName("__init");
                instanceInitializerNames.push(initializerName);
              }
              fields.push({
                initializerName,
                equalsIndex,
                start: nameStartIndex,
                end: tokens.currentIndex()
              });
            } else if (!disableESTransforms || isDeclare) {
              rangesToRemove.push({ start: statementStartIndex, end: tokens.currentIndex() });
            }
          }
        }
        tokens.restoreToSnapshot(snapshot);
        if (disableESTransforms) {
          return {
            headerInfo,
            constructorInitializerStatements,
            instanceInitializerNames: [],
            staticInitializerNames: [],
            constructorInsertPos,
            fields: [],
            rangesToRemove
          };
        } else {
          return {
            headerInfo,
            constructorInitializerStatements,
            instanceInitializerNames,
            staticInitializerNames,
            constructorInsertPos,
            fields,
            rangesToRemove
          };
        }
      }
      exports.default = getClassInfo;
      function skipToNextClassElement(tokens, classContextId) {
        tokens.nextToken();
        while (tokens.currentToken().contextId !== classContextId) {
          tokens.nextToken();
        }
        while (isAccessModifier(tokens.tokenAtRelativeIndex(-1))) {
          tokens.previousToken();
        }
      }
      function processClassHeader(tokens) {
        const classToken = tokens.currentToken();
        const contextId = classToken.contextId;
        if (contextId == null) {
          throw new Error("Expected context ID on class token.");
        }
        const isExpression = classToken.isExpression;
        if (isExpression == null) {
          throw new Error("Expected isExpression on class token.");
        }
        let className = null;
        let hasSuperclass = false;
        tokens.nextToken();
        if (tokens.matches1(_types.TokenType.name)) {
          className = tokens.identifierName();
        }
        while (!tokens.matchesContextIdAndLabel(_types.TokenType.braceL, contextId)) {
          if (tokens.matches1(_types.TokenType._extends) && !tokens.currentToken().isType) {
            hasSuperclass = true;
          }
          tokens.nextToken();
        }
        return { isExpression, className, hasSuperclass };
      }
      function processConstructor(tokens) {
        const constructorInitializerStatements = [];
        tokens.nextToken();
        const constructorContextId = tokens.currentToken().contextId;
        if (constructorContextId == null) {
          throw new Error("Expected context ID on open-paren starting constructor params.");
        }
        while (!tokens.matchesContextIdAndLabel(_types.TokenType.parenR, constructorContextId)) {
          if (tokens.currentToken().contextId === constructorContextId) {
            tokens.nextToken();
            if (isAccessModifier(tokens.currentToken())) {
              tokens.nextToken();
              while (isAccessModifier(tokens.currentToken())) {
                tokens.nextToken();
              }
              const token = tokens.currentToken();
              if (token.type !== _types.TokenType.name) {
                throw new Error("Expected identifier after access modifiers in constructor arg.");
              }
              const name = tokens.identifierNameForToken(token);
              constructorInitializerStatements.push(`this.${name} = ${name}`);
            }
          } else {
            tokens.nextToken();
          }
        }
        tokens.nextToken();
        let constructorInsertPos = tokens.currentIndex();
        let foundSuperCall = false;
        while (!tokens.matchesContextIdAndLabel(_types.TokenType.braceR, constructorContextId)) {
          if (!foundSuperCall && tokens.matches2(_types.TokenType._super, _types.TokenType.parenL)) {
            tokens.nextToken();
            const superCallContextId = tokens.currentToken().contextId;
            if (superCallContextId == null) {
              throw new Error("Expected a context ID on the super call");
            }
            while (!tokens.matchesContextIdAndLabel(_types.TokenType.parenR, superCallContextId)) {
              tokens.nextToken();
            }
            constructorInsertPos = tokens.currentIndex();
            foundSuperCall = true;
          }
          tokens.nextToken();
        }
        tokens.nextToken();
        return { constructorInitializerStatements, constructorInsertPos };
      }
      function isAccessModifier(token) {
        return [
          _types.TokenType._async,
          _types.TokenType._get,
          _types.TokenType._set,
          _types.TokenType.plus,
          _types.TokenType.minus,
          _types.TokenType._readonly,
          _types.TokenType._static,
          _types.TokenType._public,
          _types.TokenType._private,
          _types.TokenType._protected,
          _types.TokenType._override,
          _types.TokenType._abstract,
          _types.TokenType.star,
          _types.TokenType._declare,
          _types.TokenType.hash
        ].includes(token.type);
      }
      function skipFieldName(tokens) {
        if (tokens.matches1(_types.TokenType.bracketL)) {
          const startToken = tokens.currentToken();
          const classContextId = startToken.contextId;
          if (classContextId == null) {
            throw new Error("Expected class context ID on computed name open bracket.");
          }
          while (!tokens.matchesContextIdAndLabel(_types.TokenType.bracketR, classContextId)) {
            tokens.nextToken();
          }
          tokens.nextToken();
        } else {
          tokens.nextToken();
        }
      }
    }
  });

  // node_modules/sucrase/dist/util/elideImportEquals.js
  var require_elideImportEquals = __commonJS({
    "node_modules/sucrase/dist/util/elideImportEquals.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var _types = require_types();
      function elideImportEquals(tokens) {
        tokens.removeInitialToken();
        tokens.removeToken();
        tokens.removeToken();
        tokens.removeToken();
        if (tokens.matches1(_types.TokenType.parenL)) {
          tokens.removeToken();
          tokens.removeToken();
          tokens.removeToken();
        } else {
          while (tokens.matches1(_types.TokenType.dot)) {
            tokens.removeToken();
            tokens.removeToken();
          }
        }
      }
      exports.default = elideImportEquals;
    }
  });

  // node_modules/sucrase/dist/util/getDeclarationInfo.js
  var require_getDeclarationInfo = __commonJS({
    "node_modules/sucrase/dist/util/getDeclarationInfo.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var _tokenizer = require_tokenizer();
      var _types = require_types();
      var EMPTY_DECLARATION_INFO = {
        typeDeclarations: new Set(),
        valueDeclarations: new Set()
      };
      exports.EMPTY_DECLARATION_INFO = EMPTY_DECLARATION_INFO;
      function getDeclarationInfo(tokens) {
        const typeDeclarations = new Set();
        const valueDeclarations = new Set();
        for (let i = 0; i < tokens.tokens.length; i++) {
          const token = tokens.tokens[i];
          if (token.type === _types.TokenType.name && _tokenizer.isTopLevelDeclaration.call(void 0, token)) {
            if (token.isType) {
              typeDeclarations.add(tokens.identifierNameForToken(token));
            } else {
              valueDeclarations.add(tokens.identifierNameForToken(token));
            }
          }
        }
        return { typeDeclarations, valueDeclarations };
      }
      exports.default = getDeclarationInfo;
    }
  });

  // node_modules/sucrase/dist/util/shouldElideDefaultExport.js
  var require_shouldElideDefaultExport = __commonJS({
    "node_modules/sucrase/dist/util/shouldElideDefaultExport.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var _types = require_types();
      function shouldElideDefaultExport(isTypeScriptTransformEnabled, tokens, declarationInfo) {
        if (!isTypeScriptTransformEnabled) {
          return false;
        }
        const exportToken = tokens.currentToken();
        if (exportToken.rhsEndIndex == null) {
          throw new Error("Expected non-null rhsEndIndex on export token.");
        }
        const numTokens = exportToken.rhsEndIndex - tokens.currentIndex();
        if (numTokens !== 3 && !(numTokens === 4 && tokens.matches1AtIndex(exportToken.rhsEndIndex - 1, _types.TokenType.semi))) {
          return false;
        }
        const identifierToken = tokens.tokenAtRelativeIndex(2);
        if (identifierToken.type !== _types.TokenType.name) {
          return false;
        }
        const exportedName = tokens.identifierNameForToken(identifierToken);
        return declarationInfo.typeDeclarations.has(exportedName) && !declarationInfo.valueDeclarations.has(exportedName);
      }
      exports.default = shouldElideDefaultExport;
    }
  });

  // node_modules/sucrase/dist/transformers/CJSImportTransformer.js
  var require_CJSImportTransformer = __commonJS({
    "node_modules/sucrase/dist/transformers/CJSImportTransformer.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : { default: obj };
      }
      var _tokenizer = require_tokenizer();
      var _keywords = require_keywords();
      var _types = require_types();
      var _elideImportEquals = require_elideImportEquals();
      var _elideImportEquals2 = _interopRequireDefault(_elideImportEquals);
      var _getDeclarationInfo = require_getDeclarationInfo();
      var _getDeclarationInfo2 = _interopRequireDefault(_getDeclarationInfo);
      var _shouldElideDefaultExport = require_shouldElideDefaultExport();
      var _shouldElideDefaultExport2 = _interopRequireDefault(_shouldElideDefaultExport);
      var _Transformer = require_Transformer();
      var _Transformer2 = _interopRequireDefault(_Transformer);
      var CJSImportTransformer = class extends _Transformer2.default {
        __init() {
          this.hadExport = false;
        }
        __init2() {
          this.hadNamedExport = false;
        }
        __init3() {
          this.hadDefaultExport = false;
        }
        constructor(rootTransformer, tokens, importProcessor, nameManager, reactHotLoaderTransformer, enableLegacyBabel5ModuleInterop, isTypeScriptTransformEnabled) {
          super();
          this.rootTransformer = rootTransformer;
          this.tokens = tokens;
          this.importProcessor = importProcessor;
          this.nameManager = nameManager;
          this.reactHotLoaderTransformer = reactHotLoaderTransformer;
          this.enableLegacyBabel5ModuleInterop = enableLegacyBabel5ModuleInterop;
          this.isTypeScriptTransformEnabled = isTypeScriptTransformEnabled;
          CJSImportTransformer.prototype.__init.call(this);
          CJSImportTransformer.prototype.__init2.call(this);
          CJSImportTransformer.prototype.__init3.call(this);
          ;
          this.declarationInfo = isTypeScriptTransformEnabled ? _getDeclarationInfo2.default.call(void 0, tokens) : _getDeclarationInfo.EMPTY_DECLARATION_INFO;
        }
        getPrefixCode() {
          let prefix = "";
          if (this.hadExport) {
            prefix += 'Object.defineProperty(exports, "__esModule", {value: true});';
          }
          return prefix;
        }
        getSuffixCode() {
          if (this.enableLegacyBabel5ModuleInterop && this.hadDefaultExport && !this.hadNamedExport) {
            return "\nmodule.exports = exports.default;\n";
          }
          return "";
        }
        process() {
          if (this.tokens.matches3(_types.TokenType._import, _types.TokenType.name, _types.TokenType.eq)) {
            return this.processImportEquals();
          }
          if (this.tokens.matches1(_types.TokenType._import)) {
            this.processImport();
            return true;
          }
          if (this.tokens.matches2(_types.TokenType._export, _types.TokenType.eq)) {
            this.tokens.replaceToken("module.exports");
            return true;
          }
          if (this.tokens.matches1(_types.TokenType._export) && !this.tokens.currentToken().isType) {
            this.hadExport = true;
            return this.processExport();
          }
          if (this.tokens.matches2(_types.TokenType.name, _types.TokenType.postIncDec)) {
            if (this.processPostIncDec()) {
              return true;
            }
          }
          if (this.tokens.matches1(_types.TokenType.name) || this.tokens.matches1(_types.TokenType.jsxName)) {
            return this.processIdentifier();
          }
          if (this.tokens.matches1(_types.TokenType.eq)) {
            return this.processAssignment();
          }
          if (this.tokens.matches1(_types.TokenType.assign)) {
            return this.processComplexAssignment();
          }
          if (this.tokens.matches1(_types.TokenType.preIncDec)) {
            return this.processPreIncDec();
          }
          return false;
        }
        processImportEquals() {
          const importName = this.tokens.identifierNameAtIndex(this.tokens.currentIndex() + 1);
          if (this.importProcessor.isTypeName(importName)) {
            _elideImportEquals2.default.call(void 0, this.tokens);
          } else {
            this.tokens.replaceToken("const");
          }
          return true;
        }
        processImport() {
          if (this.tokens.matches2(_types.TokenType._import, _types.TokenType.parenL)) {
            this.tokens.replaceToken("Promise.resolve().then(() => require");
            const contextId = this.tokens.currentToken().contextId;
            if (contextId == null) {
              throw new Error("Expected context ID on dynamic import invocation.");
            }
            this.tokens.copyToken();
            while (!this.tokens.matchesContextIdAndLabel(_types.TokenType.parenR, contextId)) {
              this.rootTransformer.processToken();
            }
            this.tokens.replaceToken("))");
            return;
          }
          const wasOnlyTypes = this.removeImportAndDetectIfType();
          if (wasOnlyTypes) {
            this.tokens.removeToken();
          } else {
            const path = this.tokens.stringValue();
            this.tokens.replaceTokenTrimmingLeftWhitespace(this.importProcessor.claimImportCode(path));
            this.tokens.appendCode(this.importProcessor.claimImportCode(path));
          }
          if (this.tokens.matches1(_types.TokenType.semi)) {
            this.tokens.removeToken();
          }
        }
        removeImportAndDetectIfType() {
          this.tokens.removeInitialToken();
          if (this.tokens.matchesContextual(_keywords.ContextualKeyword._type) && !this.tokens.matches1AtIndex(this.tokens.currentIndex() + 1, _types.TokenType.comma) && !this.tokens.matchesContextualAtIndex(this.tokens.currentIndex() + 1, _keywords.ContextualKeyword._from)) {
            this.removeRemainingImport();
            return true;
          }
          if (this.tokens.matches1(_types.TokenType.name) || this.tokens.matches1(_types.TokenType.star)) {
            this.removeRemainingImport();
            return false;
          }
          if (this.tokens.matches1(_types.TokenType.string)) {
            return false;
          }
          let foundNonType = false;
          while (!this.tokens.matches1(_types.TokenType.string)) {
            if (!foundNonType && this.tokens.matches1(_types.TokenType.braceL) || this.tokens.matches1(_types.TokenType.comma)) {
              this.tokens.removeToken();
              if (this.tokens.matches2(_types.TokenType.name, _types.TokenType.comma) || this.tokens.matches2(_types.TokenType.name, _types.TokenType.braceR) || this.tokens.matches4(_types.TokenType.name, _types.TokenType.name, _types.TokenType.name, _types.TokenType.comma) || this.tokens.matches4(_types.TokenType.name, _types.TokenType.name, _types.TokenType.name, _types.TokenType.braceR)) {
                foundNonType = true;
              }
            }
            this.tokens.removeToken();
          }
          return !foundNonType;
        }
        removeRemainingImport() {
          while (!this.tokens.matches1(_types.TokenType.string)) {
            this.tokens.removeToken();
          }
        }
        processIdentifier() {
          const token = this.tokens.currentToken();
          if (token.shadowsGlobal) {
            return false;
          }
          if (token.identifierRole === _tokenizer.IdentifierRole.ObjectShorthand) {
            return this.processObjectShorthand();
          }
          if (token.identifierRole !== _tokenizer.IdentifierRole.Access) {
            return false;
          }
          const replacement = this.importProcessor.getIdentifierReplacement(this.tokens.identifierNameForToken(token));
          if (!replacement) {
            return false;
          }
          let possibleOpenParenIndex = this.tokens.currentIndex() + 1;
          while (possibleOpenParenIndex < this.tokens.tokens.length && this.tokens.tokens[possibleOpenParenIndex].type === _types.TokenType.parenR) {
            possibleOpenParenIndex++;
          }
          if (this.tokens.tokens[possibleOpenParenIndex].type === _types.TokenType.parenL) {
            if (this.tokens.tokenAtRelativeIndex(1).type === _types.TokenType.parenL && this.tokens.tokenAtRelativeIndex(-1).type !== _types.TokenType._new) {
              this.tokens.replaceToken(`${replacement}.call(void 0, `);
              this.tokens.removeToken();
              this.rootTransformer.processBalancedCode();
              this.tokens.copyExpectedToken(_types.TokenType.parenR);
            } else {
              this.tokens.replaceToken(`(0, ${replacement})`);
            }
          } else {
            this.tokens.replaceToken(replacement);
          }
          return true;
        }
        processObjectShorthand() {
          const identifier = this.tokens.identifierName();
          const replacement = this.importProcessor.getIdentifierReplacement(identifier);
          if (!replacement) {
            return false;
          }
          this.tokens.replaceToken(`${identifier}: ${replacement}`);
          return true;
        }
        processExport() {
          if (this.tokens.matches2(_types.TokenType._export, _types.TokenType._enum) || this.tokens.matches3(_types.TokenType._export, _types.TokenType._const, _types.TokenType._enum)) {
            return false;
          }
          if (this.tokens.matches2(_types.TokenType._export, _types.TokenType._default)) {
            this.processExportDefault();
            this.hadDefaultExport = true;
            return true;
          }
          this.hadNamedExport = true;
          if (this.tokens.matches2(_types.TokenType._export, _types.TokenType._var) || this.tokens.matches2(_types.TokenType._export, _types.TokenType._let) || this.tokens.matches2(_types.TokenType._export, _types.TokenType._const)) {
            this.processExportVar();
            return true;
          } else if (this.tokens.matches2(_types.TokenType._export, _types.TokenType._function) || this.tokens.matches3(_types.TokenType._export, _types.TokenType.name, _types.TokenType._function)) {
            this.processExportFunction();
            return true;
          } else if (this.tokens.matches2(_types.TokenType._export, _types.TokenType._class) || this.tokens.matches3(_types.TokenType._export, _types.TokenType._abstract, _types.TokenType._class)) {
            this.processExportClass();
            return true;
          } else if (this.tokens.matches2(_types.TokenType._export, _types.TokenType.braceL)) {
            this.processExportBindings();
            return true;
          } else if (this.tokens.matches2(_types.TokenType._export, _types.TokenType.star)) {
            this.processExportStar();
            return true;
          } else if (this.tokens.matches3(_types.TokenType._export, _types.TokenType.name, _types.TokenType.braceL) && this.tokens.matchesContextualAtIndex(this.tokens.currentIndex() + 1, _keywords.ContextualKeyword._type)) {
            this.tokens.removeInitialToken();
            while (!this.tokens.matches1(_types.TokenType.braceR)) {
              this.tokens.removeToken();
            }
            this.tokens.removeToken();
            if (this.tokens.matchesContextual(_keywords.ContextualKeyword._from) && this.tokens.matches1AtIndex(this.tokens.currentIndex() + 1, _types.TokenType.string)) {
              this.tokens.removeToken();
              this.tokens.removeToken();
            }
            return true;
          } else {
            throw new Error("Unrecognized export syntax.");
          }
        }
        processAssignment() {
          const index = this.tokens.currentIndex();
          const identifierToken = this.tokens.tokens[index - 1];
          if (identifierToken.isType || identifierToken.type !== _types.TokenType.name) {
            return false;
          }
          if (identifierToken.shadowsGlobal) {
            return false;
          }
          if (index >= 2 && this.tokens.matches1AtIndex(index - 2, _types.TokenType.dot)) {
            return false;
          }
          if (index >= 2 && [_types.TokenType._var, _types.TokenType._let, _types.TokenType._const].includes(this.tokens.tokens[index - 2].type)) {
            return false;
          }
          const assignmentSnippet = this.importProcessor.resolveExportBinding(this.tokens.identifierNameForToken(identifierToken));
          if (!assignmentSnippet) {
            return false;
          }
          this.tokens.copyToken();
          this.tokens.appendCode(` ${assignmentSnippet} =`);
          return true;
        }
        processComplexAssignment() {
          const index = this.tokens.currentIndex();
          const identifierToken = this.tokens.tokens[index - 1];
          if (identifierToken.type !== _types.TokenType.name) {
            return false;
          }
          if (identifierToken.shadowsGlobal) {
            return false;
          }
          if (index >= 2 && this.tokens.matches1AtIndex(index - 2, _types.TokenType.dot)) {
            return false;
          }
          const assignmentSnippet = this.importProcessor.resolveExportBinding(this.tokens.identifierNameForToken(identifierToken));
          if (!assignmentSnippet) {
            return false;
          }
          this.tokens.appendCode(` = ${assignmentSnippet}`);
          this.tokens.copyToken();
          return true;
        }
        processPreIncDec() {
          const index = this.tokens.currentIndex();
          const identifierToken = this.tokens.tokens[index + 1];
          if (identifierToken.type !== _types.TokenType.name) {
            return false;
          }
          if (identifierToken.shadowsGlobal) {
            return false;
          }
          if (index + 2 < this.tokens.tokens.length && (this.tokens.matches1AtIndex(index + 2, _types.TokenType.dot) || this.tokens.matches1AtIndex(index + 2, _types.TokenType.bracketL) || this.tokens.matches1AtIndex(index + 2, _types.TokenType.parenL))) {
            return false;
          }
          const identifierName = this.tokens.identifierNameForToken(identifierToken);
          const assignmentSnippet = this.importProcessor.resolveExportBinding(identifierName);
          if (!assignmentSnippet) {
            return false;
          }
          this.tokens.appendCode(`${assignmentSnippet} = `);
          this.tokens.copyToken();
          return true;
        }
        processPostIncDec() {
          const index = this.tokens.currentIndex();
          const identifierToken = this.tokens.tokens[index];
          const operatorToken = this.tokens.tokens[index + 1];
          if (identifierToken.type !== _types.TokenType.name) {
            return false;
          }
          if (identifierToken.shadowsGlobal) {
            return false;
          }
          if (index >= 1 && this.tokens.matches1AtIndex(index - 1, _types.TokenType.dot)) {
            return false;
          }
          const identifierName = this.tokens.identifierNameForToken(identifierToken);
          const assignmentSnippet = this.importProcessor.resolveExportBinding(identifierName);
          if (!assignmentSnippet) {
            return false;
          }
          const operatorCode = this.tokens.rawCodeForToken(operatorToken);
          const base = this.importProcessor.getIdentifierReplacement(identifierName) || identifierName;
          if (operatorCode === "++") {
            this.tokens.replaceToken(`(${base} = ${assignmentSnippet} = ${base} + 1, ${base} - 1)`);
          } else if (operatorCode === "--") {
            this.tokens.replaceToken(`(${base} = ${assignmentSnippet} = ${base} - 1, ${base} + 1)`);
          } else {
            throw new Error(`Unexpected operator: ${operatorCode}`);
          }
          this.tokens.removeToken();
          return true;
        }
        processExportDefault() {
          if (this.tokens.matches4(_types.TokenType._export, _types.TokenType._default, _types.TokenType._function, _types.TokenType.name) || this.tokens.matches5(_types.TokenType._export, _types.TokenType._default, _types.TokenType.name, _types.TokenType._function, _types.TokenType.name) && this.tokens.matchesContextualAtIndex(this.tokens.currentIndex() + 2, _keywords.ContextualKeyword._async)) {
            this.tokens.removeInitialToken();
            this.tokens.removeToken();
            const name = this.processNamedFunction();
            this.tokens.appendCode(` exports.default = ${name};`);
          } else if (this.tokens.matches4(_types.TokenType._export, _types.TokenType._default, _types.TokenType._class, _types.TokenType.name) || this.tokens.matches5(_types.TokenType._export, _types.TokenType._default, _types.TokenType._abstract, _types.TokenType._class, _types.TokenType.name)) {
            this.tokens.removeInitialToken();
            this.tokens.removeToken();
            if (this.tokens.matches1(_types.TokenType._abstract)) {
              this.tokens.removeToken();
            }
            const name = this.rootTransformer.processNamedClass();
            this.tokens.appendCode(` exports.default = ${name};`);
          } else if (this.tokens.matches3(_types.TokenType._export, _types.TokenType._default, _types.TokenType.at)) {
            throw new Error("Export default statements with decorators are not yet supported.");
          } else if (_shouldElideDefaultExport2.default.call(void 0, this.isTypeScriptTransformEnabled, this.tokens, this.declarationInfo)) {
            this.tokens.removeInitialToken();
            this.tokens.removeToken();
            this.tokens.removeToken();
          } else if (this.reactHotLoaderTransformer) {
            const defaultVarName = this.nameManager.claimFreeName("_default");
            this.tokens.replaceToken(`let ${defaultVarName}; exports.`);
            this.tokens.copyToken();
            this.tokens.appendCode(` = ${defaultVarName} =`);
            this.reactHotLoaderTransformer.setExtractedDefaultExportName(defaultVarName);
          } else {
            this.tokens.replaceToken("exports.");
            this.tokens.copyToken();
            this.tokens.appendCode(" =");
          }
        }
        processExportVar() {
          if (this.isSimpleExportVar()) {
            this.processSimpleExportVar();
          } else {
            this.processComplexExportVar();
          }
        }
        isSimpleExportVar() {
          let tokenIndex = this.tokens.currentIndex();
          tokenIndex++;
          tokenIndex++;
          if (!this.tokens.matches1AtIndex(tokenIndex, _types.TokenType.name)) {
            return false;
          }
          tokenIndex++;
          while (tokenIndex < this.tokens.tokens.length && this.tokens.tokens[tokenIndex].isType) {
            tokenIndex++;
          }
          if (!this.tokens.matches1AtIndex(tokenIndex, _types.TokenType.eq)) {
            return false;
          }
          return true;
        }
        processSimpleExportVar() {
          this.tokens.removeInitialToken();
          this.tokens.copyToken();
          const varName = this.tokens.identifierName();
          while (!this.tokens.matches1(_types.TokenType.eq)) {
            this.rootTransformer.processToken();
          }
          const endIndex = this.tokens.currentToken().rhsEndIndex;
          if (endIndex == null) {
            throw new Error("Expected = token with an end index.");
          }
          while (this.tokens.currentIndex() < endIndex) {
            this.rootTransformer.processToken();
          }
          this.tokens.appendCode(`; exports.${varName} = ${varName}`);
        }
        processComplexExportVar() {
          this.tokens.removeInitialToken();
          this.tokens.removeToken();
          const needsParens = this.tokens.matches1(_types.TokenType.braceL);
          if (needsParens) {
            this.tokens.appendCode("(");
          }
          let depth = 0;
          while (true) {
            if (this.tokens.matches1(_types.TokenType.braceL) || this.tokens.matches1(_types.TokenType.dollarBraceL) || this.tokens.matches1(_types.TokenType.bracketL)) {
              depth++;
              this.tokens.copyToken();
            } else if (this.tokens.matches1(_types.TokenType.braceR) || this.tokens.matches1(_types.TokenType.bracketR)) {
              depth--;
              this.tokens.copyToken();
            } else if (depth === 0 && !this.tokens.matches1(_types.TokenType.name) && !this.tokens.currentToken().isType) {
              break;
            } else if (this.tokens.matches1(_types.TokenType.eq)) {
              const endIndex = this.tokens.currentToken().rhsEndIndex;
              if (endIndex == null) {
                throw new Error("Expected = token with an end index.");
              }
              while (this.tokens.currentIndex() < endIndex) {
                this.rootTransformer.processToken();
              }
            } else {
              const token = this.tokens.currentToken();
              if (_tokenizer.isDeclaration.call(void 0, token)) {
                const name = this.tokens.identifierName();
                let replacement = this.importProcessor.getIdentifierReplacement(name);
                if (replacement === null) {
                  throw new Error(`Expected a replacement for ${name} in \`export var\` syntax.`);
                }
                if (_tokenizer.isObjectShorthandDeclaration.call(void 0, token)) {
                  replacement = `${name}: ${replacement}`;
                }
                this.tokens.replaceToken(replacement);
              } else {
                this.rootTransformer.processToken();
              }
            }
          }
          if (needsParens) {
            const endIndex = this.tokens.currentToken().rhsEndIndex;
            if (endIndex == null) {
              throw new Error("Expected = token with an end index.");
            }
            while (this.tokens.currentIndex() < endIndex) {
              this.rootTransformer.processToken();
            }
            this.tokens.appendCode(")");
          }
        }
        processExportFunction() {
          this.tokens.replaceToken("");
          const name = this.processNamedFunction();
          this.tokens.appendCode(` exports.${name} = ${name};`);
        }
        processNamedFunction() {
          if (this.tokens.matches1(_types.TokenType._function)) {
            this.tokens.copyToken();
          } else if (this.tokens.matches2(_types.TokenType.name, _types.TokenType._function)) {
            if (!this.tokens.matchesContextual(_keywords.ContextualKeyword._async)) {
              throw new Error("Expected async keyword in function export.");
            }
            this.tokens.copyToken();
            this.tokens.copyToken();
          }
          if (this.tokens.matches1(_types.TokenType.star)) {
            this.tokens.copyToken();
          }
          if (!this.tokens.matches1(_types.TokenType.name)) {
            throw new Error("Expected identifier for exported function name.");
          }
          const name = this.tokens.identifierName();
          this.tokens.copyToken();
          if (this.tokens.currentToken().isType) {
            this.tokens.removeInitialToken();
            while (this.tokens.currentToken().isType) {
              this.tokens.removeToken();
            }
          }
          this.tokens.copyExpectedToken(_types.TokenType.parenL);
          this.rootTransformer.processBalancedCode();
          this.tokens.copyExpectedToken(_types.TokenType.parenR);
          this.rootTransformer.processPossibleTypeRange();
          this.tokens.copyExpectedToken(_types.TokenType.braceL);
          this.rootTransformer.processBalancedCode();
          this.tokens.copyExpectedToken(_types.TokenType.braceR);
          return name;
        }
        processExportClass() {
          this.tokens.removeInitialToken();
          if (this.tokens.matches1(_types.TokenType._abstract)) {
            this.tokens.removeToken();
          }
          const name = this.rootTransformer.processNamedClass();
          this.tokens.appendCode(` exports.${name} = ${name};`);
        }
        processExportBindings() {
          this.tokens.removeInitialToken();
          this.tokens.removeToken();
          const exportStatements = [];
          while (true) {
            if (this.tokens.matches1(_types.TokenType.braceR)) {
              this.tokens.removeToken();
              break;
            }
            const localName = this.tokens.identifierName();
            let exportedName;
            this.tokens.removeToken();
            if (this.tokens.matchesContextual(_keywords.ContextualKeyword._as)) {
              this.tokens.removeToken();
              exportedName = this.tokens.identifierName();
              this.tokens.removeToken();
            } else {
              exportedName = localName;
            }
            if (!this.shouldElideExportedIdentifier(localName)) {
              const newLocalName = this.importProcessor.getIdentifierReplacement(localName);
              exportStatements.push(`exports.${exportedName} = ${newLocalName || localName};`);
            }
            if (this.tokens.matches1(_types.TokenType.braceR)) {
              this.tokens.removeToken();
              break;
            }
            if (this.tokens.matches2(_types.TokenType.comma, _types.TokenType.braceR)) {
              this.tokens.removeToken();
              this.tokens.removeToken();
              break;
            } else if (this.tokens.matches1(_types.TokenType.comma)) {
              this.tokens.removeToken();
            } else {
              throw new Error(`Unexpected token: ${JSON.stringify(this.tokens.currentToken())}`);
            }
          }
          if (this.tokens.matchesContextual(_keywords.ContextualKeyword._from)) {
            this.tokens.removeToken();
            const path = this.tokens.stringValue();
            this.tokens.replaceTokenTrimmingLeftWhitespace(this.importProcessor.claimImportCode(path));
          } else {
            this.tokens.appendCode(exportStatements.join(" "));
          }
          if (this.tokens.matches1(_types.TokenType.semi)) {
            this.tokens.removeToken();
          }
        }
        processExportStar() {
          this.tokens.removeInitialToken();
          while (!this.tokens.matches1(_types.TokenType.string)) {
            this.tokens.removeToken();
          }
          const path = this.tokens.stringValue();
          this.tokens.replaceTokenTrimmingLeftWhitespace(this.importProcessor.claimImportCode(path));
          if (this.tokens.matches1(_types.TokenType.semi)) {
            this.tokens.removeToken();
          }
        }
        shouldElideExportedIdentifier(name) {
          return this.isTypeScriptTransformEnabled && !this.declarationInfo.valueDeclarations.has(name);
        }
      };
      exports.default = CJSImportTransformer;
    }
  });

  // node_modules/sucrase/dist/transformers/ESMImportTransformer.js
  var require_ESMImportTransformer = __commonJS({
    "node_modules/sucrase/dist/transformers/ESMImportTransformer.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : { default: obj };
      }
      var _keywords = require_keywords();
      var _types = require_types();
      var _elideImportEquals = require_elideImportEquals();
      var _elideImportEquals2 = _interopRequireDefault(_elideImportEquals);
      var _getDeclarationInfo = require_getDeclarationInfo();
      var _getDeclarationInfo2 = _interopRequireDefault(_getDeclarationInfo);
      var _getNonTypeIdentifiers = require_getNonTypeIdentifiers();
      var _shouldElideDefaultExport = require_shouldElideDefaultExport();
      var _shouldElideDefaultExport2 = _interopRequireDefault(_shouldElideDefaultExport);
      var _Transformer = require_Transformer();
      var _Transformer2 = _interopRequireDefault(_Transformer);
      var ESMImportTransformer = class extends _Transformer2.default {
        constructor(tokens, nameManager, reactHotLoaderTransformer, isTypeScriptTransformEnabled, options) {
          super();
          this.tokens = tokens;
          this.nameManager = nameManager;
          this.reactHotLoaderTransformer = reactHotLoaderTransformer;
          this.isTypeScriptTransformEnabled = isTypeScriptTransformEnabled;
          ;
          this.nonTypeIdentifiers = isTypeScriptTransformEnabled ? _getNonTypeIdentifiers.getNonTypeIdentifiers.call(void 0, tokens, options) : new Set();
          this.declarationInfo = isTypeScriptTransformEnabled ? _getDeclarationInfo2.default.call(void 0, tokens) : _getDeclarationInfo.EMPTY_DECLARATION_INFO;
        }
        process() {
          if (this.tokens.matches3(_types.TokenType._import, _types.TokenType.name, _types.TokenType.eq)) {
            return this.processImportEquals();
          }
          if (this.tokens.matches4(_types.TokenType._import, _types.TokenType.name, _types.TokenType.name, _types.TokenType.eq) && this.tokens.matchesContextualAtIndex(this.tokens.currentIndex() + 1, _keywords.ContextualKeyword._type)) {
            this.tokens.removeInitialToken();
            for (let i = 0; i < 7; i++) {
              this.tokens.removeToken();
            }
            return true;
          }
          if (this.tokens.matches2(_types.TokenType._export, _types.TokenType.eq)) {
            this.tokens.replaceToken("module.exports");
            return true;
          }
          if (this.tokens.matches5(_types.TokenType._export, _types.TokenType._import, _types.TokenType.name, _types.TokenType.name, _types.TokenType.eq) && this.tokens.matchesContextualAtIndex(this.tokens.currentIndex() + 2, _keywords.ContextualKeyword._type)) {
            this.tokens.removeInitialToken();
            for (let i = 0; i < 8; i++) {
              this.tokens.removeToken();
            }
            return true;
          }
          if (this.tokens.matches1(_types.TokenType._import)) {
            return this.processImport();
          }
          if (this.tokens.matches2(_types.TokenType._export, _types.TokenType._default)) {
            return this.processExportDefault();
          }
          if (this.tokens.matches2(_types.TokenType._export, _types.TokenType.braceL)) {
            return this.processNamedExports();
          }
          if (this.tokens.matches3(_types.TokenType._export, _types.TokenType.name, _types.TokenType.braceL) && this.tokens.matchesContextualAtIndex(this.tokens.currentIndex() + 1, _keywords.ContextualKeyword._type)) {
            this.tokens.removeInitialToken();
            while (!this.tokens.matches1(_types.TokenType.braceR)) {
              this.tokens.removeToken();
            }
            this.tokens.removeToken();
            if (this.tokens.matchesContextual(_keywords.ContextualKeyword._from) && this.tokens.matches1AtIndex(this.tokens.currentIndex() + 1, _types.TokenType.string)) {
              this.tokens.removeToken();
              this.tokens.removeToken();
            }
            return true;
          }
          return false;
        }
        processImportEquals() {
          const importName = this.tokens.identifierNameAtIndex(this.tokens.currentIndex() + 1);
          if (this.isTypeName(importName)) {
            _elideImportEquals2.default.call(void 0, this.tokens);
          } else {
            this.tokens.replaceToken("const");
          }
          return true;
        }
        processImport() {
          if (this.tokens.matches2(_types.TokenType._import, _types.TokenType.parenL)) {
            return false;
          }
          const snapshot = this.tokens.snapshot();
          const allImportsRemoved = this.removeImportTypeBindings();
          if (allImportsRemoved) {
            this.tokens.restoreToSnapshot(snapshot);
            while (!this.tokens.matches1(_types.TokenType.string)) {
              this.tokens.removeToken();
            }
            this.tokens.removeToken();
            if (this.tokens.matches1(_types.TokenType.semi)) {
              this.tokens.removeToken();
            }
          }
          return true;
        }
        removeImportTypeBindings() {
          this.tokens.copyExpectedToken(_types.TokenType._import);
          if (this.tokens.matchesContextual(_keywords.ContextualKeyword._type) && !this.tokens.matches1AtIndex(this.tokens.currentIndex() + 1, _types.TokenType.comma) && !this.tokens.matchesContextualAtIndex(this.tokens.currentIndex() + 1, _keywords.ContextualKeyword._from)) {
            return true;
          }
          if (this.tokens.matches1(_types.TokenType.string)) {
            this.tokens.copyToken();
            return false;
          }
          let foundNonTypeImport = false;
          if (this.tokens.matches1(_types.TokenType.name)) {
            if (this.isTypeName(this.tokens.identifierName())) {
              this.tokens.removeToken();
              if (this.tokens.matches1(_types.TokenType.comma)) {
                this.tokens.removeToken();
              }
            } else {
              foundNonTypeImport = true;
              this.tokens.copyToken();
              if (this.tokens.matches1(_types.TokenType.comma)) {
                this.tokens.copyToken();
              }
            }
          }
          if (this.tokens.matches1(_types.TokenType.star)) {
            if (this.isTypeName(this.tokens.identifierNameAtIndex(this.tokens.currentIndex() + 2))) {
              this.tokens.removeToken();
              this.tokens.removeToken();
              this.tokens.removeToken();
            } else {
              foundNonTypeImport = true;
              this.tokens.copyExpectedToken(_types.TokenType.star);
              this.tokens.copyExpectedToken(_types.TokenType.name);
              this.tokens.copyExpectedToken(_types.TokenType.name);
            }
          } else if (this.tokens.matches1(_types.TokenType.braceL)) {
            this.tokens.copyToken();
            while (!this.tokens.matches1(_types.TokenType.braceR)) {
              if (this.tokens.matches3(_types.TokenType.name, _types.TokenType.name, _types.TokenType.comma) || this.tokens.matches3(_types.TokenType.name, _types.TokenType.name, _types.TokenType.braceR)) {
                this.tokens.removeToken();
                this.tokens.removeToken();
                if (this.tokens.matches1(_types.TokenType.comma)) {
                  this.tokens.removeToken();
                }
              } else if (this.tokens.matches5(_types.TokenType.name, _types.TokenType.name, _types.TokenType.name, _types.TokenType.name, _types.TokenType.comma) || this.tokens.matches5(_types.TokenType.name, _types.TokenType.name, _types.TokenType.name, _types.TokenType.name, _types.TokenType.braceR)) {
                this.tokens.removeToken();
                this.tokens.removeToken();
                this.tokens.removeToken();
                this.tokens.removeToken();
                if (this.tokens.matches1(_types.TokenType.comma)) {
                  this.tokens.removeToken();
                }
              } else if (this.tokens.matches2(_types.TokenType.name, _types.TokenType.comma) || this.tokens.matches2(_types.TokenType.name, _types.TokenType.braceR)) {
                if (this.isTypeName(this.tokens.identifierName())) {
                  this.tokens.removeToken();
                  if (this.tokens.matches1(_types.TokenType.comma)) {
                    this.tokens.removeToken();
                  }
                } else {
                  foundNonTypeImport = true;
                  this.tokens.copyToken();
                  if (this.tokens.matches1(_types.TokenType.comma)) {
                    this.tokens.copyToken();
                  }
                }
              } else if (this.tokens.matches4(_types.TokenType.name, _types.TokenType.name, _types.TokenType.name, _types.TokenType.comma) || this.tokens.matches4(_types.TokenType.name, _types.TokenType.name, _types.TokenType.name, _types.TokenType.braceR)) {
                if (this.isTypeName(this.tokens.identifierNameAtIndex(this.tokens.currentIndex() + 2))) {
                  this.tokens.removeToken();
                  this.tokens.removeToken();
                  this.tokens.removeToken();
                  if (this.tokens.matches1(_types.TokenType.comma)) {
                    this.tokens.removeToken();
                  }
                } else {
                  foundNonTypeImport = true;
                  this.tokens.copyToken();
                  this.tokens.copyToken();
                  this.tokens.copyToken();
                  if (this.tokens.matches1(_types.TokenType.comma)) {
                    this.tokens.copyToken();
                  }
                }
              } else {
                throw new Error("Unexpected import form.");
              }
            }
            this.tokens.copyExpectedToken(_types.TokenType.braceR);
          }
          return !foundNonTypeImport;
        }
        isTypeName(name) {
          return this.isTypeScriptTransformEnabled && !this.nonTypeIdentifiers.has(name);
        }
        processExportDefault() {
          if (_shouldElideDefaultExport2.default.call(void 0, this.isTypeScriptTransformEnabled, this.tokens, this.declarationInfo)) {
            this.tokens.removeInitialToken();
            this.tokens.removeToken();
            this.tokens.removeToken();
            return true;
          }
          const alreadyHasName = this.tokens.matches4(_types.TokenType._export, _types.TokenType._default, _types.TokenType._function, _types.TokenType.name) || this.tokens.matches5(_types.TokenType._export, _types.TokenType._default, _types.TokenType.name, _types.TokenType._function, _types.TokenType.name) && this.tokens.matchesContextualAtIndex(this.tokens.currentIndex() + 2, _keywords.ContextualKeyword._async) || this.tokens.matches4(_types.TokenType._export, _types.TokenType._default, _types.TokenType._class, _types.TokenType.name) || this.tokens.matches5(_types.TokenType._export, _types.TokenType._default, _types.TokenType._abstract, _types.TokenType._class, _types.TokenType.name);
          if (!alreadyHasName && this.reactHotLoaderTransformer) {
            const defaultVarName = this.nameManager.claimFreeName("_default");
            this.tokens.replaceToken(`let ${defaultVarName}; export`);
            this.tokens.copyToken();
            this.tokens.appendCode(` ${defaultVarName} =`);
            this.reactHotLoaderTransformer.setExtractedDefaultExportName(defaultVarName);
            return true;
          }
          return false;
        }
        processNamedExports() {
          if (!this.isTypeScriptTransformEnabled) {
            return false;
          }
          this.tokens.copyExpectedToken(_types.TokenType._export);
          this.tokens.copyExpectedToken(_types.TokenType.braceL);
          while (!this.tokens.matches1(_types.TokenType.braceR)) {
            if (!this.tokens.matches1(_types.TokenType.name)) {
              throw new Error("Expected identifier at the start of named export.");
            }
            if (this.shouldElideExportedName(this.tokens.identifierName())) {
              while (!this.tokens.matches1(_types.TokenType.comma) && !this.tokens.matches1(_types.TokenType.braceR) && !this.tokens.isAtEnd()) {
                this.tokens.removeToken();
              }
              if (this.tokens.matches1(_types.TokenType.comma)) {
                this.tokens.removeToken();
              }
            } else {
              while (!this.tokens.matches1(_types.TokenType.comma) && !this.tokens.matches1(_types.TokenType.braceR) && !this.tokens.isAtEnd()) {
                this.tokens.copyToken();
              }
              if (this.tokens.matches1(_types.TokenType.comma)) {
                this.tokens.copyToken();
              }
            }
          }
          this.tokens.copyExpectedToken(_types.TokenType.braceR);
          return true;
        }
        shouldElideExportedName(name) {
          return this.isTypeScriptTransformEnabled && this.declarationInfo.typeDeclarations.has(name) && !this.declarationInfo.valueDeclarations.has(name);
        }
      };
      exports.default = ESMImportTransformer;
    }
  });

  // node_modules/sucrase/dist/transformers/FlowTransformer.js
  var require_FlowTransformer = __commonJS({
    "node_modules/sucrase/dist/transformers/FlowTransformer.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : { default: obj };
      }
      var _Transformer = require_Transformer();
      var _Transformer2 = _interopRequireDefault(_Transformer);
      var FlowTransformer = class extends _Transformer2.default {
        constructor(rootTransformer, tokens) {
          super();
          this.rootTransformer = rootTransformer;
          this.tokens = tokens;
          ;
        }
        process() {
          return this.rootTransformer.processPossibleArrowParamEnd() || this.rootTransformer.processPossibleAsyncArrowWithTypeParams() || this.rootTransformer.processPossibleTypeRange();
        }
      };
      exports.default = FlowTransformer;
    }
  });

  // node_modules/sucrase/dist/transformers/JestHoistTransformer.js
  var require_JestHoistTransformer = __commonJS({
    "node_modules/sucrase/dist/transformers/JestHoistTransformer.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : { default: obj };
      }
      function _optionalChain(ops) {
        let lastAccessLHS = void 0;
        let value = ops[0];
        let i = 1;
        while (i < ops.length) {
          const op = ops[i];
          const fn = ops[i + 1];
          i += 2;
          if ((op === "optionalAccess" || op === "optionalCall") && value == null) {
            return void 0;
          }
          if (op === "access" || op === "optionalAccess") {
            lastAccessLHS = value;
            value = fn(value);
          } else if (op === "call" || op === "optionalCall") {
            value = fn((...args) => value.call(lastAccessLHS, ...args));
            lastAccessLHS = void 0;
          }
        }
        return value;
      }
      var _types = require_types();
      var _Transformer = require_Transformer();
      var _Transformer2 = _interopRequireDefault(_Transformer);
      var JEST_GLOBAL_NAME = "jest";
      var HOISTED_METHODS = ["mock", "unmock", "enableAutomock", "disableAutomock"];
      var JestHoistTransformer = class extends _Transformer2.default {
        __init() {
          this.hoistedFunctionNames = [];
        }
        constructor(rootTransformer, tokens, nameManager, importProcessor) {
          super();
          this.rootTransformer = rootTransformer;
          this.tokens = tokens;
          this.nameManager = nameManager;
          this.importProcessor = importProcessor;
          JestHoistTransformer.prototype.__init.call(this);
          ;
        }
        process() {
          if (this.tokens.currentToken().scopeDepth === 0 && this.tokens.matches4(_types.TokenType.name, _types.TokenType.dot, _types.TokenType.name, _types.TokenType.parenL) && this.tokens.identifierName() === JEST_GLOBAL_NAME) {
            if (_optionalChain([this, "access", (_) => _.importProcessor, "optionalAccess", (_2) => _2.getGlobalNames, "call", (_3) => _3(), "optionalAccess", (_4) => _4.has, "call", (_5) => _5(JEST_GLOBAL_NAME)])) {
              return false;
            }
            return this.extractHoistedCalls();
          }
          return false;
        }
        getHoistedCode() {
          if (this.hoistedFunctionNames.length > 0) {
            return this.hoistedFunctionNames.map((name) => `${name}();`).join("");
          }
          return "";
        }
        extractHoistedCalls() {
          this.tokens.removeToken();
          let followsNonHoistedJestCall = false;
          while (this.tokens.matches3(_types.TokenType.dot, _types.TokenType.name, _types.TokenType.parenL)) {
            const methodName = this.tokens.identifierNameAtIndex(this.tokens.currentIndex() + 1);
            const shouldHoist = HOISTED_METHODS.includes(methodName);
            if (shouldHoist) {
              const hoistedFunctionName = this.nameManager.claimFreeName("__jestHoist");
              this.hoistedFunctionNames.push(hoistedFunctionName);
              this.tokens.replaceToken(`function ${hoistedFunctionName}(){${JEST_GLOBAL_NAME}.`);
              this.tokens.copyToken();
              this.tokens.copyToken();
              this.rootTransformer.processBalancedCode();
              this.tokens.copyExpectedToken(_types.TokenType.parenR);
              this.tokens.appendCode(";}");
              followsNonHoistedJestCall = false;
            } else {
              if (followsNonHoistedJestCall) {
                this.tokens.copyToken();
              } else {
                this.tokens.replaceToken(`${JEST_GLOBAL_NAME}.`);
              }
              this.tokens.copyToken();
              this.tokens.copyToken();
              this.rootTransformer.processBalancedCode();
              this.tokens.copyExpectedToken(_types.TokenType.parenR);
              followsNonHoistedJestCall = true;
            }
          }
          return true;
        }
      };
      exports.default = JestHoistTransformer;
    }
  });

  // node_modules/sucrase/dist/transformers/NumericSeparatorTransformer.js
  var require_NumericSeparatorTransformer = __commonJS({
    "node_modules/sucrase/dist/transformers/NumericSeparatorTransformer.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : { default: obj };
      }
      var _types = require_types();
      var _Transformer = require_Transformer();
      var _Transformer2 = _interopRequireDefault(_Transformer);
      var NumericSeparatorTransformer = class extends _Transformer2.default {
        constructor(tokens) {
          super();
          this.tokens = tokens;
          ;
        }
        process() {
          if (this.tokens.matches1(_types.TokenType.num)) {
            const code = this.tokens.currentTokenCode();
            if (code.includes("_")) {
              this.tokens.replaceToken(code.replace(/_/g, ""));
              return true;
            }
          }
          return false;
        }
      };
      exports.default = NumericSeparatorTransformer;
    }
  });

  // node_modules/sucrase/dist/transformers/OptionalCatchBindingTransformer.js
  var require_OptionalCatchBindingTransformer = __commonJS({
    "node_modules/sucrase/dist/transformers/OptionalCatchBindingTransformer.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : { default: obj };
      }
      var _types = require_types();
      var _Transformer = require_Transformer();
      var _Transformer2 = _interopRequireDefault(_Transformer);
      var OptionalCatchBindingTransformer = class extends _Transformer2.default {
        constructor(tokens, nameManager) {
          super();
          this.tokens = tokens;
          this.nameManager = nameManager;
          ;
        }
        process() {
          if (this.tokens.matches2(_types.TokenType._catch, _types.TokenType.braceL)) {
            this.tokens.copyToken();
            this.tokens.appendCode(` (${this.nameManager.claimFreeName("e")})`);
            return true;
          }
          return false;
        }
      };
      exports.default = OptionalCatchBindingTransformer;
    }
  });

  // node_modules/sucrase/dist/transformers/OptionalChainingNullishTransformer.js
  var require_OptionalChainingNullishTransformer = __commonJS({
    "node_modules/sucrase/dist/transformers/OptionalChainingNullishTransformer.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : { default: obj };
      }
      var _types = require_types();
      var _Transformer = require_Transformer();
      var _Transformer2 = _interopRequireDefault(_Transformer);
      var OptionalChainingNullishTransformer = class extends _Transformer2.default {
        constructor(tokens, nameManager) {
          super();
          this.tokens = tokens;
          this.nameManager = nameManager;
          ;
        }
        process() {
          if (this.tokens.matches1(_types.TokenType.nullishCoalescing)) {
            const token2 = this.tokens.currentToken();
            if (this.tokens.tokens[token2.nullishStartIndex].isAsyncOperation) {
              this.tokens.replaceTokenTrimmingLeftWhitespace(", async () => (");
            } else {
              this.tokens.replaceTokenTrimmingLeftWhitespace(", () => (");
            }
            return true;
          }
          if (this.tokens.matches1(_types.TokenType._delete)) {
            const nextToken = this.tokens.tokenAtRelativeIndex(1);
            if (nextToken.isOptionalChainStart) {
              this.tokens.removeInitialToken();
              return true;
            }
          }
          const token = this.tokens.currentToken();
          const chainStart = token.subscriptStartIndex;
          if (chainStart != null && this.tokens.tokens[chainStart].isOptionalChainStart && this.tokens.tokenAtRelativeIndex(-1).type !== _types.TokenType._super) {
            const param = this.nameManager.claimFreeName("_");
            let arrowStartSnippet;
            if (chainStart > 0 && this.tokens.matches1AtIndex(chainStart - 1, _types.TokenType._delete) && this.isLastSubscriptInChain()) {
              arrowStartSnippet = `${param} => delete ${param}`;
            } else {
              arrowStartSnippet = `${param} => ${param}`;
            }
            if (this.tokens.tokens[chainStart].isAsyncOperation) {
              arrowStartSnippet = `async ${arrowStartSnippet}`;
            }
            if (this.tokens.matches2(_types.TokenType.questionDot, _types.TokenType.parenL) || this.tokens.matches2(_types.TokenType.questionDot, _types.TokenType.lessThan)) {
              if (this.justSkippedSuper()) {
                this.tokens.appendCode(".bind(this)");
              }
              this.tokens.replaceTokenTrimmingLeftWhitespace(`, 'optionalCall', ${arrowStartSnippet}`);
            } else if (this.tokens.matches2(_types.TokenType.questionDot, _types.TokenType.bracketL)) {
              this.tokens.replaceTokenTrimmingLeftWhitespace(`, 'optionalAccess', ${arrowStartSnippet}`);
            } else if (this.tokens.matches1(_types.TokenType.questionDot)) {
              this.tokens.replaceTokenTrimmingLeftWhitespace(`, 'optionalAccess', ${arrowStartSnippet}.`);
            } else if (this.tokens.matches1(_types.TokenType.dot)) {
              this.tokens.replaceTokenTrimmingLeftWhitespace(`, 'access', ${arrowStartSnippet}.`);
            } else if (this.tokens.matches1(_types.TokenType.bracketL)) {
              this.tokens.replaceTokenTrimmingLeftWhitespace(`, 'access', ${arrowStartSnippet}[`);
            } else if (this.tokens.matches1(_types.TokenType.parenL)) {
              if (this.justSkippedSuper()) {
                this.tokens.appendCode(".bind(this)");
              }
              this.tokens.replaceTokenTrimmingLeftWhitespace(`, 'call', ${arrowStartSnippet}(`);
            } else {
              throw new Error("Unexpected subscript operator in optional chain.");
            }
            return true;
          }
          return false;
        }
        isLastSubscriptInChain() {
          let depth = 0;
          for (let i = this.tokens.currentIndex() + 1; ; i++) {
            if (i >= this.tokens.tokens.length) {
              throw new Error("Reached the end of the code while finding the end of the access chain.");
            }
            if (this.tokens.tokens[i].isOptionalChainStart) {
              depth++;
            } else if (this.tokens.tokens[i].isOptionalChainEnd) {
              depth--;
            }
            if (depth < 0) {
              return true;
            }
            if (depth === 0 && this.tokens.tokens[i].subscriptStartIndex != null) {
              return false;
            }
          }
        }
        justSkippedSuper() {
          let depth = 0;
          let index = this.tokens.currentIndex() - 1;
          while (true) {
            if (index < 0) {
              throw new Error("Reached the start of the code while finding the start of the access chain.");
            }
            if (this.tokens.tokens[index].isOptionalChainStart) {
              depth--;
            } else if (this.tokens.tokens[index].isOptionalChainEnd) {
              depth++;
            }
            if (depth < 0) {
              return false;
            }
            if (depth === 0 && this.tokens.tokens[index].subscriptStartIndex != null) {
              return this.tokens.tokens[index - 1].type === _types.TokenType._super;
            }
            index--;
          }
        }
      };
      exports.default = OptionalChainingNullishTransformer;
    }
  });

  // node_modules/sucrase/dist/transformers/ReactDisplayNameTransformer.js
  var require_ReactDisplayNameTransformer = __commonJS({
    "node_modules/sucrase/dist/transformers/ReactDisplayNameTransformer.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : { default: obj };
      }
      var _tokenizer = require_tokenizer();
      var _types = require_types();
      var _Transformer = require_Transformer();
      var _Transformer2 = _interopRequireDefault(_Transformer);
      var ReactDisplayNameTransformer = class extends _Transformer2.default {
        constructor(rootTransformer, tokens, importProcessor, options) {
          super();
          this.rootTransformer = rootTransformer;
          this.tokens = tokens;
          this.importProcessor = importProcessor;
          this.options = options;
          ;
        }
        process() {
          const startIndex = this.tokens.currentIndex();
          if (this.tokens.identifierName() === "createReactClass") {
            const newName = this.importProcessor && this.importProcessor.getIdentifierReplacement("createReactClass");
            if (newName) {
              this.tokens.replaceToken(`(0, ${newName})`);
            } else {
              this.tokens.copyToken();
            }
            this.tryProcessCreateClassCall(startIndex);
            return true;
          }
          if (this.tokens.matches3(_types.TokenType.name, _types.TokenType.dot, _types.TokenType.name) && this.tokens.identifierName() === "React" && this.tokens.identifierNameAtIndex(this.tokens.currentIndex() + 2) === "createClass") {
            const newName = this.importProcessor ? this.importProcessor.getIdentifierReplacement("React") || "React" : "React";
            if (newName) {
              this.tokens.replaceToken(newName);
              this.tokens.copyToken();
              this.tokens.copyToken();
            } else {
              this.tokens.copyToken();
              this.tokens.copyToken();
              this.tokens.copyToken();
            }
            this.tryProcessCreateClassCall(startIndex);
            return true;
          }
          return false;
        }
        tryProcessCreateClassCall(startIndex) {
          const displayName = this.findDisplayName(startIndex);
          if (!displayName) {
            return;
          }
          if (this.classNeedsDisplayName()) {
            this.tokens.copyExpectedToken(_types.TokenType.parenL);
            this.tokens.copyExpectedToken(_types.TokenType.braceL);
            this.tokens.appendCode(`displayName: '${displayName}',`);
            this.rootTransformer.processBalancedCode();
            this.tokens.copyExpectedToken(_types.TokenType.braceR);
            this.tokens.copyExpectedToken(_types.TokenType.parenR);
          }
        }
        findDisplayName(startIndex) {
          if (startIndex < 2) {
            return null;
          }
          if (this.tokens.matches2AtIndex(startIndex - 2, _types.TokenType.name, _types.TokenType.eq)) {
            return this.tokens.identifierNameAtIndex(startIndex - 2);
          }
          if (startIndex >= 2 && this.tokens.tokens[startIndex - 2].identifierRole === _tokenizer.IdentifierRole.ObjectKey) {
            return this.tokens.identifierNameAtIndex(startIndex - 2);
          }
          if (this.tokens.matches2AtIndex(startIndex - 2, _types.TokenType._export, _types.TokenType._default)) {
            return this.getDisplayNameFromFilename();
          }
          return null;
        }
        getDisplayNameFromFilename() {
          const filePath = this.options.filePath || "unknown";
          const pathSegments = filePath.split("/");
          const filename = pathSegments[pathSegments.length - 1];
          const dotIndex = filename.lastIndexOf(".");
          const baseFilename = dotIndex === -1 ? filename : filename.slice(0, dotIndex);
          if (baseFilename === "index" && pathSegments[pathSegments.length - 2]) {
            return pathSegments[pathSegments.length - 2];
          } else {
            return baseFilename;
          }
        }
        classNeedsDisplayName() {
          let index = this.tokens.currentIndex();
          if (!this.tokens.matches2(_types.TokenType.parenL, _types.TokenType.braceL)) {
            return false;
          }
          const objectStartIndex = index + 1;
          const objectContextId = this.tokens.tokens[objectStartIndex].contextId;
          if (objectContextId == null) {
            throw new Error("Expected non-null context ID on object open-brace.");
          }
          for (; index < this.tokens.tokens.length; index++) {
            const token = this.tokens.tokens[index];
            if (token.type === _types.TokenType.braceR && token.contextId === objectContextId) {
              index++;
              break;
            }
            if (this.tokens.identifierNameAtIndex(index) === "displayName" && this.tokens.tokens[index].identifierRole === _tokenizer.IdentifierRole.ObjectKey && token.contextId === objectContextId) {
              return false;
            }
          }
          if (index === this.tokens.tokens.length) {
            throw new Error("Unexpected end of input when processing React class.");
          }
          return this.tokens.matches1AtIndex(index, _types.TokenType.parenR) || this.tokens.matches2AtIndex(index, _types.TokenType.comma, _types.TokenType.parenR);
        }
      };
      exports.default = ReactDisplayNameTransformer;
    }
  });

  // node_modules/sucrase/dist/transformers/ReactHotLoaderTransformer.js
  var require_ReactHotLoaderTransformer = __commonJS({
    "node_modules/sucrase/dist/transformers/ReactHotLoaderTransformer.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : { default: obj };
      }
      var _tokenizer = require_tokenizer();
      var _Transformer = require_Transformer();
      var _Transformer2 = _interopRequireDefault(_Transformer);
      var ReactHotLoaderTransformer = class extends _Transformer2.default {
        __init() {
          this.extractedDefaultExportName = null;
        }
        constructor(tokens, filePath) {
          super();
          this.tokens = tokens;
          this.filePath = filePath;
          ReactHotLoaderTransformer.prototype.__init.call(this);
          ;
        }
        setExtractedDefaultExportName(extractedDefaultExportName) {
          this.extractedDefaultExportName = extractedDefaultExportName;
        }
        getPrefixCode() {
          return `
      (function () {
        var enterModule = require('react-hot-loader').enterModule;
        enterModule && enterModule(module);
      })();`.replace(/\s+/g, " ").trim();
        }
        getSuffixCode() {
          const topLevelNames = new Set();
          for (const token of this.tokens.tokens) {
            if (!token.isType && _tokenizer.isTopLevelDeclaration.call(void 0, token) && token.identifierRole !== _tokenizer.IdentifierRole.ImportDeclaration) {
              topLevelNames.add(this.tokens.identifierNameForToken(token));
            }
          }
          const namesToRegister = Array.from(topLevelNames).map((name) => ({
            variableName: name,
            uniqueLocalName: name
          }));
          if (this.extractedDefaultExportName) {
            namesToRegister.push({
              variableName: this.extractedDefaultExportName,
              uniqueLocalName: "default"
            });
          }
          return `
;(function () {
  var reactHotLoader = require('react-hot-loader').default;
  var leaveModule = require('react-hot-loader').leaveModule;
  if (!reactHotLoader) {
    return;
  }
${namesToRegister.map(({ variableName, uniqueLocalName }) => `  reactHotLoader.register(${variableName}, "${uniqueLocalName}", ${JSON.stringify(this.filePath || "")});`).join("\n")}
  leaveModule(module);
})();`;
        }
        process() {
          return false;
        }
      };
      exports.default = ReactHotLoaderTransformer;
    }
  });

  // node_modules/sucrase/dist/util/isIdentifier.js
  var require_isIdentifier = __commonJS({
    "node_modules/sucrase/dist/util/isIdentifier.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var _identifier = require_identifier();
      var RESERVED_WORDS = new Set([
        "break",
        "case",
        "catch",
        "class",
        "const",
        "continue",
        "debugger",
        "default",
        "delete",
        "do",
        "else",
        "export",
        "extends",
        "finally",
        "for",
        "function",
        "if",
        "import",
        "in",
        "instanceof",
        "new",
        "return",
        "super",
        "switch",
        "this",
        "throw",
        "try",
        "typeof",
        "var",
        "void",
        "while",
        "with",
        "yield",
        "enum",
        "implements",
        "interface",
        "let",
        "package",
        "private",
        "protected",
        "public",
        "static",
        "await",
        "false",
        "null",
        "true"
      ]);
      function isIdentifier(name) {
        if (name.length === 0) {
          return false;
        }
        if (!_identifier.IS_IDENTIFIER_START[name.charCodeAt(0)]) {
          return false;
        }
        for (let i = 1; i < name.length; i++) {
          if (!_identifier.IS_IDENTIFIER_CHAR[name.charCodeAt(i)]) {
            return false;
          }
        }
        return !RESERVED_WORDS.has(name);
      }
      exports.default = isIdentifier;
    }
  });

  // node_modules/sucrase/dist/transformers/TypeScriptTransformer.js
  var require_TypeScriptTransformer = __commonJS({
    "node_modules/sucrase/dist/transformers/TypeScriptTransformer.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : { default: obj };
      }
      var _types = require_types();
      var _isIdentifier = require_isIdentifier();
      var _isIdentifier2 = _interopRequireDefault(_isIdentifier);
      var _Transformer = require_Transformer();
      var _Transformer2 = _interopRequireDefault(_Transformer);
      var TypeScriptTransformer = class extends _Transformer2.default {
        constructor(rootTransformer, tokens, isImportsTransformEnabled) {
          super();
          this.rootTransformer = rootTransformer;
          this.tokens = tokens;
          this.isImportsTransformEnabled = isImportsTransformEnabled;
          ;
        }
        process() {
          if (this.rootTransformer.processPossibleArrowParamEnd() || this.rootTransformer.processPossibleAsyncArrowWithTypeParams() || this.rootTransformer.processPossibleTypeRange()) {
            return true;
          }
          if (this.tokens.matches1(_types.TokenType._public) || this.tokens.matches1(_types.TokenType._protected) || this.tokens.matches1(_types.TokenType._private) || this.tokens.matches1(_types.TokenType._abstract) || this.tokens.matches1(_types.TokenType._readonly) || this.tokens.matches1(_types.TokenType._override) || this.tokens.matches1(_types.TokenType.nonNullAssertion)) {
            this.tokens.removeInitialToken();
            return true;
          }
          if (this.tokens.matches1(_types.TokenType._enum) || this.tokens.matches2(_types.TokenType._const, _types.TokenType._enum)) {
            this.processEnum();
            return true;
          }
          if (this.tokens.matches2(_types.TokenType._export, _types.TokenType._enum) || this.tokens.matches3(_types.TokenType._export, _types.TokenType._const, _types.TokenType._enum)) {
            this.processEnum(true);
            return true;
          }
          return false;
        }
        processEnum(isExport = false) {
          this.tokens.removeInitialToken();
          while (this.tokens.matches1(_types.TokenType._const) || this.tokens.matches1(_types.TokenType._enum)) {
            this.tokens.removeToken();
          }
          const enumName = this.tokens.identifierName();
          this.tokens.removeToken();
          if (isExport && !this.isImportsTransformEnabled) {
            this.tokens.appendCode("export ");
          }
          this.tokens.appendCode(`var ${enumName}; (function (${enumName})`);
          this.tokens.copyExpectedToken(_types.TokenType.braceL);
          this.processEnumBody(enumName);
          this.tokens.copyExpectedToken(_types.TokenType.braceR);
          if (isExport && this.isImportsTransformEnabled) {
            this.tokens.appendCode(`)(${enumName} || (exports.${enumName} = ${enumName} = {}));`);
          } else {
            this.tokens.appendCode(`)(${enumName} || (${enumName} = {}));`);
          }
        }
        processEnumBody(enumName) {
          let previousValueCode = null;
          while (true) {
            if (this.tokens.matches1(_types.TokenType.braceR)) {
              break;
            }
            const { nameStringCode, variableName } = this.extractEnumKeyInfo(this.tokens.currentToken());
            this.tokens.removeInitialToken();
            if (this.tokens.matches3(_types.TokenType.eq, _types.TokenType.string, _types.TokenType.comma) || this.tokens.matches3(_types.TokenType.eq, _types.TokenType.string, _types.TokenType.braceR)) {
              this.processStringLiteralEnumMember(enumName, nameStringCode, variableName);
            } else if (this.tokens.matches1(_types.TokenType.eq)) {
              this.processExplicitValueEnumMember(enumName, nameStringCode, variableName);
            } else {
              this.processImplicitValueEnumMember(enumName, nameStringCode, variableName, previousValueCode);
            }
            if (this.tokens.matches1(_types.TokenType.comma)) {
              this.tokens.removeToken();
            }
            if (variableName != null) {
              previousValueCode = variableName;
            } else {
              previousValueCode = `${enumName}[${nameStringCode}]`;
            }
          }
        }
        extractEnumKeyInfo(nameToken) {
          if (nameToken.type === _types.TokenType.name) {
            const name = this.tokens.identifierNameForToken(nameToken);
            return {
              nameStringCode: `"${name}"`,
              variableName: _isIdentifier2.default.call(void 0, name) ? name : null
            };
          } else if (nameToken.type === _types.TokenType.string) {
            const name = this.tokens.stringValueForToken(nameToken);
            return {
              nameStringCode: this.tokens.code.slice(nameToken.start, nameToken.end),
              variableName: _isIdentifier2.default.call(void 0, name) ? name : null
            };
          } else {
            throw new Error("Expected name or string at beginning of enum element.");
          }
        }
        processStringLiteralEnumMember(enumName, nameStringCode, variableName) {
          if (variableName != null) {
            this.tokens.appendCode(`const ${variableName}`);
            this.tokens.copyToken();
            this.tokens.copyToken();
            this.tokens.appendCode(`; ${enumName}[${nameStringCode}] = ${variableName};`);
          } else {
            this.tokens.appendCode(`${enumName}[${nameStringCode}]`);
            this.tokens.copyToken();
            this.tokens.copyToken();
            this.tokens.appendCode(";");
          }
        }
        processExplicitValueEnumMember(enumName, nameStringCode, variableName) {
          const rhsEndIndex = this.tokens.currentToken().rhsEndIndex;
          if (rhsEndIndex == null) {
            throw new Error("Expected rhsEndIndex on enum assign.");
          }
          if (variableName != null) {
            this.tokens.appendCode(`const ${variableName}`);
            this.tokens.copyToken();
            while (this.tokens.currentIndex() < rhsEndIndex) {
              this.rootTransformer.processToken();
            }
            this.tokens.appendCode(`; ${enumName}[${enumName}[${nameStringCode}] = ${variableName}] = ${nameStringCode};`);
          } else {
            this.tokens.appendCode(`${enumName}[${enumName}[${nameStringCode}]`);
            this.tokens.copyToken();
            while (this.tokens.currentIndex() < rhsEndIndex) {
              this.rootTransformer.processToken();
            }
            this.tokens.appendCode(`] = ${nameStringCode};`);
          }
        }
        processImplicitValueEnumMember(enumName, nameStringCode, variableName, previousValueCode) {
          let valueCode = previousValueCode != null ? `${previousValueCode} + 1` : "0";
          if (variableName != null) {
            this.tokens.appendCode(`const ${variableName} = ${valueCode}; `);
            valueCode = variableName;
          }
          this.tokens.appendCode(`${enumName}[${enumName}[${nameStringCode}] = ${valueCode}] = ${nameStringCode};`);
        }
      };
      exports.default = TypeScriptTransformer;
    }
  });

  // node_modules/sucrase/dist/transformers/RootTransformer.js
  var require_RootTransformer = __commonJS({
    "node_modules/sucrase/dist/transformers/RootTransformer.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : { default: obj };
      }
      var _keywords = require_keywords();
      var _types = require_types();
      var _getClassInfo = require_getClassInfo();
      var _getClassInfo2 = _interopRequireDefault(_getClassInfo);
      var _CJSImportTransformer = require_CJSImportTransformer();
      var _CJSImportTransformer2 = _interopRequireDefault(_CJSImportTransformer);
      var _ESMImportTransformer = require_ESMImportTransformer();
      var _ESMImportTransformer2 = _interopRequireDefault(_ESMImportTransformer);
      var _FlowTransformer = require_FlowTransformer();
      var _FlowTransformer2 = _interopRequireDefault(_FlowTransformer);
      var _JestHoistTransformer = require_JestHoistTransformer();
      var _JestHoistTransformer2 = _interopRequireDefault(_JestHoistTransformer);
      var _JSXTransformer = require_JSXTransformer();
      var _JSXTransformer2 = _interopRequireDefault(_JSXTransformer);
      var _NumericSeparatorTransformer = require_NumericSeparatorTransformer();
      var _NumericSeparatorTransformer2 = _interopRequireDefault(_NumericSeparatorTransformer);
      var _OptionalCatchBindingTransformer = require_OptionalCatchBindingTransformer();
      var _OptionalCatchBindingTransformer2 = _interopRequireDefault(_OptionalCatchBindingTransformer);
      var _OptionalChainingNullishTransformer = require_OptionalChainingNullishTransformer();
      var _OptionalChainingNullishTransformer2 = _interopRequireDefault(_OptionalChainingNullishTransformer);
      var _ReactDisplayNameTransformer = require_ReactDisplayNameTransformer();
      var _ReactDisplayNameTransformer2 = _interopRequireDefault(_ReactDisplayNameTransformer);
      var _ReactHotLoaderTransformer = require_ReactHotLoaderTransformer();
      var _ReactHotLoaderTransformer2 = _interopRequireDefault(_ReactHotLoaderTransformer);
      var _TypeScriptTransformer = require_TypeScriptTransformer();
      var _TypeScriptTransformer2 = _interopRequireDefault(_TypeScriptTransformer);
      var RootTransformer2 = class {
        __init() {
          this.transformers = [];
        }
        __init2() {
          this.generatedVariables = [];
        }
        constructor(sucraseContext, transforms, enableLegacyBabel5ModuleInterop, options) {
          ;
          RootTransformer2.prototype.__init.call(this);
          RootTransformer2.prototype.__init2.call(this);
          this.nameManager = sucraseContext.nameManager;
          this.helperManager = sucraseContext.helperManager;
          const { tokenProcessor, importProcessor } = sucraseContext;
          this.tokens = tokenProcessor;
          this.isImportsTransformEnabled = transforms.includes("imports");
          this.isReactHotLoaderTransformEnabled = transforms.includes("react-hot-loader");
          this.disableESTransforms = Boolean(options.disableESTransforms);
          if (!options.disableESTransforms) {
            this.transformers.push(new (0, _OptionalChainingNullishTransformer2.default)(tokenProcessor, this.nameManager));
            this.transformers.push(new (0, _NumericSeparatorTransformer2.default)(tokenProcessor));
            this.transformers.push(new (0, _OptionalCatchBindingTransformer2.default)(tokenProcessor, this.nameManager));
          }
          if (transforms.includes("jsx")) {
            this.transformers.push(new (0, _JSXTransformer2.default)(this, tokenProcessor, importProcessor, this.nameManager, options));
            this.transformers.push(new (0, _ReactDisplayNameTransformer2.default)(this, tokenProcessor, importProcessor, options));
          }
          let reactHotLoaderTransformer = null;
          if (transforms.includes("react-hot-loader")) {
            if (!options.filePath) {
              throw new Error("filePath is required when using the react-hot-loader transform.");
            }
            reactHotLoaderTransformer = new (0, _ReactHotLoaderTransformer2.default)(tokenProcessor, options.filePath);
            this.transformers.push(reactHotLoaderTransformer);
          }
          if (transforms.includes("imports")) {
            if (importProcessor === null) {
              throw new Error("Expected non-null importProcessor with imports transform enabled.");
            }
            this.transformers.push(new (0, _CJSImportTransformer2.default)(this, tokenProcessor, importProcessor, this.nameManager, reactHotLoaderTransformer, enableLegacyBabel5ModuleInterop, transforms.includes("typescript")));
          } else {
            this.transformers.push(new (0, _ESMImportTransformer2.default)(tokenProcessor, this.nameManager, reactHotLoaderTransformer, transforms.includes("typescript"), options));
          }
          if (transforms.includes("flow")) {
            this.transformers.push(new (0, _FlowTransformer2.default)(this, tokenProcessor));
          }
          if (transforms.includes("typescript")) {
            this.transformers.push(new (0, _TypeScriptTransformer2.default)(this, tokenProcessor, transforms.includes("imports")));
          }
          if (transforms.includes("jest")) {
            this.transformers.push(new (0, _JestHoistTransformer2.default)(this, tokenProcessor, this.nameManager, importProcessor));
          }
        }
        transform() {
          this.tokens.reset();
          this.processBalancedCode();
          const shouldAddUseStrict = this.isImportsTransformEnabled;
          let prefix = shouldAddUseStrict ? '"use strict";' : "";
          for (const transformer of this.transformers) {
            prefix += transformer.getPrefixCode();
          }
          prefix += this.helperManager.emitHelpers();
          prefix += this.generatedVariables.map((v) => ` var ${v};`).join("");
          for (const transformer of this.transformers) {
            prefix += transformer.getHoistedCode();
          }
          let suffix = "";
          for (const transformer of this.transformers) {
            suffix += transformer.getSuffixCode();
          }
          let code = this.tokens.finish();
          if (code.startsWith("#!")) {
            let newlineIndex = code.indexOf("\n");
            if (newlineIndex === -1) {
              newlineIndex = code.length;
              code += "\n";
            }
            return code.slice(0, newlineIndex + 1) + prefix + code.slice(newlineIndex + 1) + suffix;
          } else {
            return prefix + this.tokens.finish() + suffix;
          }
        }
        processBalancedCode() {
          let braceDepth = 0;
          let parenDepth = 0;
          while (!this.tokens.isAtEnd()) {
            if (this.tokens.matches1(_types.TokenType.braceL) || this.tokens.matches1(_types.TokenType.dollarBraceL)) {
              braceDepth++;
            } else if (this.tokens.matches1(_types.TokenType.braceR)) {
              if (braceDepth === 0) {
                return;
              }
              braceDepth--;
            }
            if (this.tokens.matches1(_types.TokenType.parenL)) {
              parenDepth++;
            } else if (this.tokens.matches1(_types.TokenType.parenR)) {
              if (parenDepth === 0) {
                return;
              }
              parenDepth--;
            }
            this.processToken();
          }
        }
        processToken() {
          if (this.tokens.matches1(_types.TokenType._class)) {
            this.processClass();
            return;
          }
          for (const transformer of this.transformers) {
            const wasProcessed = transformer.process();
            if (wasProcessed) {
              return;
            }
          }
          this.tokens.copyToken();
        }
        processNamedClass() {
          if (!this.tokens.matches2(_types.TokenType._class, _types.TokenType.name)) {
            throw new Error("Expected identifier for exported class name.");
          }
          const name = this.tokens.identifierNameAtIndex(this.tokens.currentIndex() + 1);
          this.processClass();
          return name;
        }
        processClass() {
          const classInfo = _getClassInfo2.default.call(void 0, this, this.tokens, this.nameManager, this.disableESTransforms);
          const needsCommaExpression = (classInfo.headerInfo.isExpression || !classInfo.headerInfo.className) && classInfo.staticInitializerNames.length + classInfo.instanceInitializerNames.length > 0;
          let className = classInfo.headerInfo.className;
          if (needsCommaExpression) {
            className = this.nameManager.claimFreeName("_class");
            this.generatedVariables.push(className);
            this.tokens.appendCode(` (${className} =`);
          }
          const classToken = this.tokens.currentToken();
          const contextId = classToken.contextId;
          if (contextId == null) {
            throw new Error("Expected class to have a context ID.");
          }
          this.tokens.copyExpectedToken(_types.TokenType._class);
          while (!this.tokens.matchesContextIdAndLabel(_types.TokenType.braceL, contextId)) {
            this.processToken();
          }
          this.processClassBody(classInfo, className);
          const staticInitializerStatements = classInfo.staticInitializerNames.map((name) => `${className}.${name}()`);
          if (needsCommaExpression) {
            this.tokens.appendCode(`, ${staticInitializerStatements.map((s) => `${s}, `).join("")}${className})`);
          } else if (classInfo.staticInitializerNames.length > 0) {
            this.tokens.appendCode(` ${staticInitializerStatements.map((s) => `${s};`).join(" ")}`);
          }
        }
        processClassBody(classInfo, className) {
          const {
            headerInfo,
            constructorInsertPos,
            constructorInitializerStatements,
            fields,
            instanceInitializerNames,
            rangesToRemove
          } = classInfo;
          let fieldIndex = 0;
          let rangeToRemoveIndex = 0;
          const classContextId = this.tokens.currentToken().contextId;
          if (classContextId == null) {
            throw new Error("Expected non-null context ID on class.");
          }
          this.tokens.copyExpectedToken(_types.TokenType.braceL);
          if (this.isReactHotLoaderTransformEnabled) {
            this.tokens.appendCode("__reactstandin__regenerateByEval(key, code) {this[key] = eval(code);}");
          }
          const needsConstructorInit = constructorInitializerStatements.length + instanceInitializerNames.length > 0;
          if (constructorInsertPos === null && needsConstructorInit) {
            const constructorInitializersCode = this.makeConstructorInitCode(constructorInitializerStatements, instanceInitializerNames, className);
            if (headerInfo.hasSuperclass) {
              const argsName = this.nameManager.claimFreeName("args");
              this.tokens.appendCode(`constructor(...${argsName}) { super(...${argsName}); ${constructorInitializersCode}; }`);
            } else {
              this.tokens.appendCode(`constructor() { ${constructorInitializersCode}; }`);
            }
          }
          while (!this.tokens.matchesContextIdAndLabel(_types.TokenType.braceR, classContextId)) {
            if (fieldIndex < fields.length && this.tokens.currentIndex() === fields[fieldIndex].start) {
              let needsCloseBrace = false;
              if (this.tokens.matches1(_types.TokenType.bracketL)) {
                this.tokens.copyTokenWithPrefix(`${fields[fieldIndex].initializerName}() {this`);
              } else if (this.tokens.matches1(_types.TokenType.string) || this.tokens.matches1(_types.TokenType.num)) {
                this.tokens.copyTokenWithPrefix(`${fields[fieldIndex].initializerName}() {this[`);
                needsCloseBrace = true;
              } else {
                this.tokens.copyTokenWithPrefix(`${fields[fieldIndex].initializerName}() {this.`);
              }
              while (this.tokens.currentIndex() < fields[fieldIndex].end) {
                if (needsCloseBrace && this.tokens.currentIndex() === fields[fieldIndex].equalsIndex) {
                  this.tokens.appendCode("]");
                }
                this.processToken();
              }
              this.tokens.appendCode("}");
              fieldIndex++;
            } else if (rangeToRemoveIndex < rangesToRemove.length && this.tokens.currentIndex() >= rangesToRemove[rangeToRemoveIndex].start) {
              if (this.tokens.currentIndex() < rangesToRemove[rangeToRemoveIndex].end) {
                this.tokens.removeInitialToken();
              }
              while (this.tokens.currentIndex() < rangesToRemove[rangeToRemoveIndex].end) {
                this.tokens.removeToken();
              }
              rangeToRemoveIndex++;
            } else if (this.tokens.currentIndex() === constructorInsertPos) {
              this.tokens.copyToken();
              if (needsConstructorInit) {
                this.tokens.appendCode(`;${this.makeConstructorInitCode(constructorInitializerStatements, instanceInitializerNames, className)};`);
              }
              this.processToken();
            } else {
              this.processToken();
            }
          }
          this.tokens.copyExpectedToken(_types.TokenType.braceR);
        }
        makeConstructorInitCode(constructorInitializerStatements, instanceInitializerNames, className) {
          return [
            ...constructorInitializerStatements,
            ...instanceInitializerNames.map((name) => `${className}.prototype.${name}.call(this)`)
          ].join(";");
        }
        processPossibleArrowParamEnd() {
          if (this.tokens.matches2(_types.TokenType.parenR, _types.TokenType.colon) && this.tokens.tokenAtRelativeIndex(1).isType) {
            let nextNonTypeIndex = this.tokens.currentIndex() + 1;
            while (this.tokens.tokens[nextNonTypeIndex].isType) {
              nextNonTypeIndex++;
            }
            if (this.tokens.matches1AtIndex(nextNonTypeIndex, _types.TokenType.arrow)) {
              this.tokens.removeInitialToken();
              while (this.tokens.currentIndex() < nextNonTypeIndex) {
                this.tokens.removeToken();
              }
              this.tokens.replaceTokenTrimmingLeftWhitespace(") =>");
              return true;
            }
          }
          return false;
        }
        processPossibleAsyncArrowWithTypeParams() {
          if (!this.tokens.matchesContextual(_keywords.ContextualKeyword._async) && !this.tokens.matches1(_types.TokenType._async)) {
            return false;
          }
          const nextToken = this.tokens.tokenAtRelativeIndex(1);
          if (nextToken.type !== _types.TokenType.lessThan || !nextToken.isType) {
            return false;
          }
          let nextNonTypeIndex = this.tokens.currentIndex() + 1;
          while (this.tokens.tokens[nextNonTypeIndex].isType) {
            nextNonTypeIndex++;
          }
          if (this.tokens.matches1AtIndex(nextNonTypeIndex, _types.TokenType.parenL)) {
            this.tokens.replaceToken("async (");
            this.tokens.removeInitialToken();
            while (this.tokens.currentIndex() < nextNonTypeIndex) {
              this.tokens.removeToken();
            }
            this.tokens.removeToken();
            this.processBalancedCode();
            this.processToken();
            return true;
          }
          return false;
        }
        processPossibleTypeRange() {
          if (this.tokens.currentToken().isType) {
            this.tokens.removeInitialToken();
            while (this.tokens.currentToken().isType) {
              this.tokens.removeToken();
            }
            return true;
          }
          return false;
        }
      };
      exports.default = RootTransformer2;
    }
  });

  // node_modules/lines-and-columns/dist/index.js
  var require_dist2 = __commonJS({
    "node_modules/lines-and-columns/dist/index.js"(exports) {
      "use strict";
      var LF = "\n";
      var CR = "\r";
      var LinesAndColumns = function() {
        function LinesAndColumns2(string) {
          this.string = string;
          var offsets = [0];
          for (var offset = 0; offset < string.length; ) {
            switch (string[offset]) {
              case LF:
                offset += LF.length;
                offsets.push(offset);
                break;
              case CR:
                offset += CR.length;
                if (string[offset] === LF) {
                  offset += LF.length;
                }
                offsets.push(offset);
                break;
              default:
                offset++;
                break;
            }
          }
          this.offsets = offsets;
        }
        LinesAndColumns2.prototype.locationForIndex = function(index) {
          if (index < 0 || index > this.string.length) {
            return null;
          }
          var line = 0;
          var offsets = this.offsets;
          while (offsets[line + 1] <= index) {
            line++;
          }
          var column = index - offsets[line];
          return { line, column };
        };
        LinesAndColumns2.prototype.indexForLocation = function(location) {
          var line = location.line, column = location.column;
          if (line < 0 || line >= this.offsets.length) {
            return null;
          }
          if (column < 0 || column > this.lengthOfLine(line)) {
            return null;
          }
          return this.offsets[line] + column;
        };
        LinesAndColumns2.prototype.lengthOfLine = function(line) {
          var offset = this.offsets[line];
          var nextOffset = line === this.offsets.length - 1 ? this.string.length : this.offsets[line + 1];
          return nextOffset - offset;
        };
        return LinesAndColumns2;
      }();
      exports.__esModule = true;
      exports["default"] = LinesAndColumns;
    }
  });

  // node_modules/sucrase/dist/util/formatTokens.js
  var require_formatTokens = __commonJS({
    "node_modules/sucrase/dist/util/formatTokens.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : { default: obj };
      }
      var _linesandcolumns = require_dist2();
      var _linesandcolumns2 = _interopRequireDefault(_linesandcolumns);
      var _types = require_types();
      function formatTokens2(code, tokens) {
        if (tokens.length === 0) {
          return "";
        }
        const tokenKeys = Object.keys(tokens[0]).filter((k) => k !== "type" && k !== "value" && k !== "start" && k !== "end" && k !== "loc");
        const typeKeys = Object.keys(tokens[0].type).filter((k) => k !== "label" && k !== "keyword");
        const headings = ["Location", "Label", "Raw", ...tokenKeys, ...typeKeys];
        const lines = new (0, _linesandcolumns2.default)(code);
        const rows = [headings, ...tokens.map(getTokenComponents)];
        const padding = headings.map(() => 0);
        for (const components of rows) {
          for (let i = 0; i < components.length; i++) {
            padding[i] = Math.max(padding[i], components[i].length);
          }
        }
        return rows.map((components) => components.map((component, i) => component.padEnd(padding[i])).join(" ")).join("\n");
        function getTokenComponents(token) {
          const raw = code.slice(token.start, token.end);
          return [
            formatRange(token.start, token.end),
            _types.formatTokenType.call(void 0, token.type),
            truncate(String(raw), 14),
            ...tokenKeys.map((key) => formatValue(token[key], key)),
            ...typeKeys.map((key) => formatValue(token.type[key], key))
          ];
        }
        function formatValue(value, key) {
          if (value === true) {
            return key;
          } else if (value === false || value === null) {
            return "";
          } else {
            return String(value);
          }
        }
        function formatRange(start, end) {
          return `${formatPos(start)}-${formatPos(end)}`;
        }
        function formatPos(pos) {
          const location = lines.locationForIndex(pos);
          if (!location) {
            return "Unknown";
          } else {
            return `${location.line + 1}:${location.column + 1}`;
          }
        }
      }
      exports.default = formatTokens2;
      function truncate(s, length) {
        if (s.length > length) {
          return `${s.slice(0, length - 3)}...`;
        } else {
          return s;
        }
      }
    }
  });

  // node_modules/sucrase/dist/util/getTSImportedNames.js
  var require_getTSImportedNames = __commonJS({
    "node_modules/sucrase/dist/util/getTSImportedNames.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var _keywords = require_keywords();
      var _types = require_types();
      function getTSImportedNames2(tokens) {
        const importedNames = new Set();
        for (let i = 0; i < tokens.tokens.length; i++) {
          if (tokens.matches1AtIndex(i, _types.TokenType._import) && !tokens.matches3AtIndex(i, _types.TokenType._import, _types.TokenType.name, _types.TokenType.eq)) {
            collectNamesForImport(tokens, i, importedNames);
          }
        }
        return importedNames;
      }
      exports.default = getTSImportedNames2;
      function collectNamesForImport(tokens, index, importedNames) {
        index++;
        if (tokens.matches1AtIndex(index, _types.TokenType.parenL)) {
          return;
        }
        if (tokens.matches1AtIndex(index, _types.TokenType.name)) {
          importedNames.add(tokens.identifierNameAtIndex(index));
          index++;
          if (tokens.matches1AtIndex(index, _types.TokenType.comma)) {
            index++;
          }
        }
        if (tokens.matches1AtIndex(index, _types.TokenType.star)) {
          index += 2;
          importedNames.add(tokens.identifierNameAtIndex(index));
          index++;
        }
        if (tokens.matches1AtIndex(index, _types.TokenType.braceL)) {
          index++;
          collectNamesForNamedImport(tokens, index, importedNames);
        }
      }
      function collectNamesForNamedImport(tokens, index, importedNames) {
        while (true) {
          if (tokens.matches1AtIndex(index, _types.TokenType.braceR)) {
            return;
          }
          let name = tokens.identifierNameAtIndex(index);
          index++;
          if (tokens.matchesContextualAtIndex(index, _keywords.ContextualKeyword._as)) {
            index++;
            name = tokens.identifierNameAtIndex(index);
            index++;
          }
          importedNames.add(name);
          if (tokens.matches2AtIndex(index, _types.TokenType.comma, _types.TokenType.braceR)) {
            return;
          } else if (tokens.matches1AtIndex(index, _types.TokenType.braceR)) {
            return;
          } else if (tokens.matches1AtIndex(index, _types.TokenType.comma)) {
            index++;
          } else {
            throw new Error(`Unexpected token: ${JSON.stringify(tokens.tokens[index])}`);
          }
        }
      }
    }
  });

  // node_modules/@b9g/crank/crank.js
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
    return value == null ? [] : Array.isArray(value) ? value : typeof value === "string" || typeof value[Symbol.iterator] !== "function" ? [value] : [...value];
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
  var Element2 = class {
    constructor(tag, props, key, ref, static_) {
      this.tag = tag;
      this.props = props;
      this.key = key;
      this.ref = ref;
      this.static_ = static_;
    }
  };
  Element2.prototype.$$typeof = ElementSymbol;
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
            if (props[name] != null) {
              key = props[name];
            }
            break;
          case "crank-ref":
          case "c-ref":
            if (typeof props[name] === "function") {
              ref = props[name];
            }
            break;
          case "crank-static":
          case "c-static":
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
    return new Element2(tag, props1, key, ref, static_);
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
      this.value = void 0;
      this.ctx = void 0;
      this.children = void 0;
      this.cached = void 0;
      this.fallback = void 0;
      this.inflight = void 0;
      this.onCommit = void 0;
    }
  };
  function getValue(ret) {
    if (typeof ret.fallback !== "undefined") {
      return typeof ret.fallback === "object" ? getValue(ret.fallback) : ret.fallback;
    } else if (ret.el.tag === Portal) {
      return;
    } else if (typeof ret.el.tag !== "function" && ret.el.tag !== Fragment) {
      return ret.value;
    }
    return unwrap(getChildValues(ret));
  }
  function getChildValues(ret) {
    if (ret.cached) {
      return wrap(ret.cached);
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
      ret.cached = unwrap(values1);
    }
    return values1;
  }
  var defaultRendererImpl = {
    create() {
      throw new Error("Not implemented");
    },
    scope: IDENTITY,
    read: IDENTITY,
    escape: IDENTITY,
    parse: IDENTITY,
    patch: NOOP,
    arrange: NOOP,
    dispose: NOOP,
    flush: NOOP
  };
  var $RendererImpl = Symbol.for("crank.RendererImpl");
  var Renderer = class {
    constructor(impl2) {
      this.cache = new WeakMap();
      this[$RendererImpl] = {
        ...defaultRendererImpl,
        ...impl2
      };
    }
    render(children, root, bridge) {
      let ret;
      const ctx = bridge && bridge[$ContextImpl];
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
      const impl2 = this[$RendererImpl];
      const childValues = diffChildren(impl2, root, ret, ctx, impl2.scope(void 0, Portal, ret.el.props), ret, children);
      if (isPromiseLike(childValues)) {
        return childValues.then((childValues2) => commitRootRender(impl2, root, ctx, ret, childValues2, oldProps));
      }
      return commitRootRender(impl2, root, ctx, ret, childValues, oldProps);
    }
  };
  function commitRootRender(renderer2, root, ctx, ret, childValues, oldProps) {
    if (root !== void 0) {
      renderer2.arrange(Portal, root, ret.el.props, childValues, oldProps, wrap(ret.cached));
      flush(renderer2, root);
    }
    ret.cached = unwrap(childValues);
    if (root == null) {
      unmount(renderer2, ret, ctx, ret);
    }
    return renderer2.read(ret.cached);
  }
  function diffChildren(renderer2, root, host, ctx, scope, parent, children) {
    const oldRetained = wrap(parent.children);
    const newRetained = [];
    const newChildren = arrayify(children);
    const values = [];
    let graveyard;
    let childrenByKey;
    let seenKeys;
    let isAsync = false;
    let oi = 0, oldLength = oldRetained.length;
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
            (seenKeys = seenKeys || new Set()).add(newKey);
          }
        }
      }
      let value;
      if (typeof child === "object") {
        if (typeof ret === "object" && child.static_) {
          ret.el = child;
          value = getInflightValue(ret);
        } else if (child.tag === Copy) {
          value = getInflightValue(ret);
        } else {
          let oldProps;
          if (typeof ret === "object" && ret.el.tag === child.tag) {
            oldProps = ret.el.props;
            ret.el = child;
          } else {
            if (typeof ret === "object") {
              (graveyard = graveyard || []).push(ret);
            }
            const fallback = ret;
            ret = new Retainer(child);
            ret.fallback = fallback;
          }
          if (child.tag === Raw) {
            value = updateRaw(renderer2, ret, scope, oldProps);
          } else if (child.tag === Fragment) {
            value = updateFragment(renderer2, root, host, ctx, scope, ret);
          } else if (typeof child.tag === "function") {
            value = updateComponent(renderer2, root, host, ctx, scope, ret, oldProps);
          } else {
            value = updateHost(renderer2, root, ctx, scope, ret, oldProps);
          }
        }
        const ref = child.ref;
        if (isPromiseLike(value)) {
          isAsync = true;
          if (typeof ref === "function") {
            value = value.then((value2) => {
              ref(renderer2.read(value2));
              return value2;
            });
          }
        } else if (typeof ref === "function") {
          ref(renderer2.read(value));
        }
      } else {
        if (typeof ret === "object") {
          (graveyard = graveyard || []).push(ret);
        }
        if (typeof child === "string") {
          value = ret = renderer2.escape(child, scope);
        } else {
          ret = void 0;
        }
      }
      values[ni] = value;
      newRetained[ni] = ret;
    }
    for (; oi < oldLength; oi++) {
      const ret = oldRetained[oi];
      if (typeof ret === "object" && typeof ret.el.key === "undefined") {
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
            unmount(renderer2, host, ctx, graveyard[i]);
          }
        }
      });
      let onChildValues;
      childValues1 = Promise.race([
        childValues1,
        new Promise((resolve) => onChildValues = resolve)
      ]);
      if (parent.onCommit) {
        parent.onCommit(childValues1);
      }
      parent.onCommit = onChildValues;
      return childValues1.then((childValues) => {
        parent.inflight = parent.fallback = void 0;
        return normalize(childValues);
      });
    }
    if (graveyard) {
      for (let i = 0; i < graveyard.length; i++) {
        unmount(renderer2, host, ctx, graveyard[i]);
      }
    }
    if (parent.onCommit) {
      parent.onCommit(values);
      parent.onCommit = void 0;
    }
    parent.inflight = parent.fallback = void 0;
    return normalize(values);
  }
  function createChildrenByKey(children, offset) {
    const childrenByKey = new Map();
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
    } else if (child.inflight) {
      return child.inflight;
    }
    return getValue(child);
  }
  function updateRaw(renderer2, ret, scope, oldProps) {
    const props = ret.el.props;
    if (typeof props.value === "string") {
      if (!oldProps || oldProps.value !== props.value) {
        ret.value = renderer2.parse(props.value, scope);
      }
    } else {
      ret.value = props.value;
    }
    return ret.value;
  }
  function updateFragment(renderer2, root, host, ctx, scope, ret) {
    const childValues = diffChildren(renderer2, root, host, ctx, scope, ret, ret.el.props.children);
    if (isPromiseLike(childValues)) {
      ret.inflight = childValues.then((childValues2) => unwrap(childValues2));
      return ret.inflight;
    }
    return unwrap(childValues);
  }
  function updateHost(renderer2, root, ctx, scope, ret, oldProps) {
    const el = ret.el;
    const tag = el.tag;
    if (el.tag === Portal) {
      root = ret.value = el.props.root;
    } else if (!oldProps) {
      ret.value = renderer2.create(tag, el.props, scope);
    }
    scope = renderer2.scope(scope, tag, el.props);
    const childValues = diffChildren(renderer2, root, ret, ctx, scope, ret, ret.el.props.children);
    if (isPromiseLike(childValues)) {
      ret.inflight = childValues.then((childValues2) => commitHost(renderer2, scope, ret, childValues2, oldProps));
      return ret.inflight;
    }
    return commitHost(renderer2, scope, ret, childValues, oldProps);
  }
  function commitHost(renderer2, scope, ret, childValues, oldProps) {
    const tag = ret.el.tag;
    const value = ret.value;
    let props = ret.el.props;
    let copied;
    if (tag !== Portal) {
      for (const propName in { ...oldProps, ...props }) {
        const propValue = props[propName];
        if (propValue === Copy) {
          (copied = copied || new Set()).add(propName);
        } else if (propName !== "children") {
          renderer2.patch(tag, value, propName, propValue, oldProps && oldProps[propName], scope);
        }
      }
    }
    if (copied) {
      props = { ...ret.el.props };
      for (const name of copied) {
        props[name] = oldProps && oldProps[name];
      }
      ret.el = new Element2(tag, props, ret.el.key, ret.el.ref);
    }
    renderer2.arrange(tag, value, props, childValues, oldProps, wrap(ret.cached));
    ret.cached = unwrap(childValues);
    if (tag === Portal) {
      flush(renderer2, ret.value);
      return;
    }
    return value;
  }
  function flush(renderer2, root, initiator) {
    renderer2.flush(root);
    if (typeof root !== "object" || root === null) {
      return;
    }
    const flushMap = flushMaps.get(root);
    if (flushMap) {
      if (initiator) {
        const flushMap1 = new Map();
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
        const value = renderer2.read(getValue(ctx.ret));
        for (const callback of callbacks) {
          callback(value);
        }
      }
    }
  }
  function unmount(renderer2, host, ctx, ret) {
    if (typeof ret.el.tag === "function") {
      ctx = ret.ctx;
      unmountComponent(ctx);
    } else if (ret.el.tag === Portal) {
      host = ret;
      renderer2.arrange(Portal, host.value, host.el.props, [], host.el.props, wrap(host.cached));
      flush(renderer2, host.value);
    } else if (ret.el.tag !== Fragment) {
      if (isEventTarget(ret.value)) {
        const records = getListenerRecords(ctx, host);
        for (let i = 0; i < records.length; i++) {
          const record = records[i];
          ret.value.removeEventListener(record.type, record.callback, record.options);
        }
      }
      renderer2.dispose(ret.el.tag, ret.value, ret.el.props);
      host = ret;
    }
    const children = wrap(ret.children);
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (typeof child === "object") {
        unmount(renderer2, host, ctx, child);
      }
    }
  }
  var IsUpdating = 1 << 0;
  var IsExecuting = 1 << 1;
  var IsIterating = 1 << 2;
  var IsAvailable = 1 << 3;
  var IsDone = 1 << 4;
  var IsErrored = 1 << 5;
  var IsUnmounted = 1 << 6;
  var IsSyncGen = 1 << 7;
  var IsAsyncGen = 1 << 8;
  var IsScheduling = 1 << 9;
  var IsSchedulingRefresh = 1 << 10;
  var provisionMaps = new WeakMap();
  var scheduleMap = new WeakMap();
  var cleanupMap = new WeakMap();
  var flushMaps = new WeakMap();
  var ContextImpl = class {
    constructor(renderer2, root, host, parent, scope, ret) {
      this.f = 0;
      this.ctx = new Context(this);
      this.renderer = renderer2;
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
      this.onAvailable = void 0;
    }
  };
  var $ContextImpl = Symbol.for("crank.ContextImpl");
  var Context = class {
    constructor(impl2) {
      this[$ContextImpl] = impl2;
    }
    get props() {
      return this[$ContextImpl].ret.el.props;
    }
    get value() {
      return this[$ContextImpl].renderer.read(getValue(this[$ContextImpl].ret));
    }
    *[Symbol.iterator]() {
      const impl2 = this[$ContextImpl];
      while (!(impl2.f & IsDone)) {
        if (impl2.f & IsIterating) {
          throw new Error("Context iterated twice without a yield");
        } else if (impl2.f & IsAsyncGen) {
          throw new Error("Use for await\u2026of in async generator components");
        }
        impl2.f |= IsIterating;
        yield impl2.ret.el.props;
      }
    }
    async *[Symbol.asyncIterator]() {
      const impl2 = this[$ContextImpl];
      do {
        if (impl2.f & IsIterating) {
          throw new Error("Context iterated twice without a yield");
        } else if (impl2.f & IsSyncGen) {
          throw new Error("Use for\u2026of in sync generator components");
        }
        impl2.f |= IsIterating;
        if (impl2.f & IsAvailable) {
          impl2.f &= ~IsAvailable;
        } else {
          await new Promise((resolve) => impl2.onAvailable = resolve);
          if (impl2.f & IsDone) {
            break;
          }
        }
        yield impl2.ret.el.props;
      } while (!(impl2.f & IsDone));
    }
    refresh() {
      const impl2 = this[$ContextImpl];
      if (impl2.f & IsUnmounted) {
        console.error("Component is unmounted");
        return impl2.renderer.read(void 0);
      } else if (impl2.f & IsExecuting) {
        console.error("Component is already executing");
        return this.value;
      }
      resumeCtxIterator(impl2);
      const value = runComponent(impl2);
      if (isPromiseLike(value)) {
        return value.then((value2) => impl2.renderer.read(value2));
      }
      return impl2.renderer.read(value);
    }
    schedule(callback) {
      const impl2 = this[$ContextImpl];
      let callbacks = scheduleMap.get(impl2);
      if (!callbacks) {
        callbacks = new Set();
        scheduleMap.set(impl2, callbacks);
      }
      callbacks.add(callback);
    }
    flush(callback) {
      const impl2 = this[$ContextImpl];
      if (typeof impl2.root !== "object" || impl2.root === null) {
        return;
      }
      let flushMap = flushMaps.get(impl2.root);
      if (!flushMap) {
        flushMap = new Map();
        flushMaps.set(impl2.root, flushMap);
      }
      let callbacks = flushMap.get(impl2);
      if (!callbacks) {
        callbacks = new Set();
        flushMap.set(impl2, callbacks);
      }
      callbacks.add(callback);
    }
    cleanup(callback) {
      const impl2 = this[$ContextImpl];
      let callbacks = cleanupMap.get(impl2);
      if (!callbacks) {
        callbacks = new Set();
        cleanupMap.set(impl2, callbacks);
      }
      callbacks.add(callback);
    }
    consume(key) {
      for (let parent = this[$ContextImpl].parent; parent !== void 0; parent = parent.parent) {
        const provisions = provisionMaps.get(parent);
        if (provisions && provisions.has(key)) {
          return provisions.get(key);
        }
      }
    }
    provide(key, value) {
      const impl2 = this[$ContextImpl];
      let provisions = provisionMaps.get(impl2);
      if (!provisions) {
        provisions = new Map();
        provisionMaps.set(impl2, provisions);
      }
      provisions.set(key, value);
    }
    addEventListener(type, listener, options) {
      return addEventListener(this[$ContextImpl], type, listener, options);
    }
    removeEventListener(type, listener, options) {
      return removeEventListener(this[$ContextImpl], type, listener, options);
    }
    dispatchEvent(ev) {
      return dispatchEvent(this[$ContextImpl], ev);
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
  function updateComponent(renderer2, root, host, parent, scope, ret, oldProps) {
    let ctx;
    if (oldProps) {
      ctx = ret.ctx;
      if (ctx.f & IsExecuting) {
        console.error("Component is already executing");
        return ret.cached;
      }
    } else {
      ctx = ret.ctx = new ContextImpl(renderer2, root, host, parent, scope, ret);
    }
    ctx.f |= IsUpdating;
    resumeCtxIterator(ctx);
    return runComponent(ctx);
  }
  function updateComponentChildren(ctx, children) {
    if (ctx.f & IsUnmounted || ctx.f & IsErrored) {
      return;
    } else if (children === void 0) {
      console.error("A component has returned or yielded undefined. If this was intentional, return or yield null instead.");
    }
    let childValues;
    ctx.f |= IsExecuting;
    try {
      childValues = diffChildren(ctx.renderer, ctx.root, ctx.host, ctx, ctx.scope, ctx.ret, narrow(children));
    } finally {
      ctx.f &= ~IsExecuting;
    }
    if (isPromiseLike(childValues)) {
      ctx.ret.inflight = childValues.then((childValues2) => commitComponent(ctx, childValues2));
      return ctx.ret.inflight;
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
    const oldValues = wrap(ctx.ret.cached);
    let value = ctx.ret.cached = unwrap(values);
    if (ctx.f & IsScheduling) {
      ctx.f |= IsSchedulingRefresh;
    } else if (!(ctx.f & IsUpdating)) {
      if (!valuesEqual(oldValues, values)) {
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
        const oldHostValues = wrap(host.cached);
        invalidate(ctx, host);
        const hostValues = getChildValues(host);
        ctx.renderer.arrange(host.el.tag, host.value, host.el.props, hostValues, host.el.props, oldHostValues);
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
      parent.ret.cached = void 0;
    }
    host.cached = void 0;
  }
  function valuesEqual(values1, values2) {
    if (values1.length !== values2.length) {
      return false;
    }
    for (let i = 0; i < values1.length; i++) {
      const value1 = values1[i];
      const value2 = values2[i];
      if (value1 !== value2) {
        return false;
      }
    }
    return true;
  }
  function runComponent(ctx) {
    if (!ctx.inflightBlock) {
      try {
        const [block, value] = stepComponent(ctx);
        if (block) {
          ctx.inflightBlock = block.catch((err) => {
            if (!(ctx.f & IsUpdating)) {
              return propagateError(ctx.parent, err);
            }
          }).finally(() => advanceComponent(ctx));
          ctx.inflightValue = value;
        }
        return value;
      } catch (err) {
        if (!(ctx.f & IsUpdating)) {
          return propagateError(ctx.parent, err);
        }
        throw err;
      }
    } else if (ctx.f & IsAsyncGen) {
      return ctx.inflightValue;
    } else if (!ctx.enqueuedBlock) {
      let resolve;
      ctx.enqueuedBlock = ctx.inflightBlock.then(() => {
        try {
          const [block, value] = stepComponent(ctx);
          resolve(value);
          if (block) {
            return block.catch((err) => {
              if (!(ctx.f & IsUpdating)) {
                return propagateError(ctx.parent, err);
              }
            });
          }
        } catch (err) {
          if (!(ctx.f & IsUpdating)) {
            return propagateError(ctx.parent, err);
          }
        }
      }).finally(() => advanceComponent(ctx));
      ctx.enqueuedValue = new Promise((resolve1) => resolve = resolve1);
    }
    return ctx.enqueuedValue;
  }
  function stepComponent(ctx) {
    const ret = ctx.ret;
    if (ctx.f & IsDone) {
      return [void 0, getValue(ret)];
    }
    const initial = !ctx.iterator;
    if (initial) {
      ctx.f |= IsExecuting;
      clearEventListeners(ctx);
      let result;
      try {
        result = ret.el.tag.call(ctx.ctx, ret.el.props);
      } catch (err) {
        ctx.f |= IsErrored;
        throw err;
      } finally {
        ctx.f &= ~IsExecuting;
      }
      if (isIteratorLike(result)) {
        ctx.iterator = result;
      } else if (isPromiseLike(result)) {
        const result1 = result instanceof Promise ? result : Promise.resolve(result);
        const value2 = result1.then((result2) => updateComponentChildren(ctx, result2), (err) => {
          ctx.f |= IsErrored;
          throw err;
        });
        return [result1, value2];
      } else {
        return [void 0, updateComponentChildren(ctx, result)];
      }
    }
    let oldValue;
    if (initial) {
      oldValue = void 0;
    } else if (ctx.ret.inflight) {
      oldValue = ctx.ret.inflight.then((value2) => ctx.renderer.read(value2), () => ctx.renderer.read(void 0));
    } else {
      oldValue = ctx.renderer.read(getValue(ret));
    }
    let iteration;
    ctx.f |= IsExecuting;
    try {
      iteration = ctx.iterator.next(oldValue);
    } catch (err) {
      ctx.f |= IsDone | IsErrored;
      throw err;
    } finally {
      ctx.f &= ~IsExecuting;
    }
    if (isPromiseLike(iteration)) {
      if (initial) {
        ctx.f |= IsAsyncGen;
      }
      const value2 = iteration.then((iteration2) => {
        if (!(ctx.f & IsIterating)) {
          ctx.f &= ~IsAvailable;
        }
        ctx.f &= ~IsIterating;
        if (iteration2.done) {
          ctx.f |= IsDone;
        }
        try {
          const value3 = updateComponentChildren(ctx, iteration2.value);
          if (isPromiseLike(value3)) {
            return value3.catch((err) => handleChildError(ctx, err));
          }
          return value3;
        } catch (err) {
          return handleChildError(ctx, err);
        }
      }, (err) => {
        ctx.f |= IsDone | IsErrored;
        throw err;
      });
      return [iteration, value2];
    }
    if (initial) {
      ctx.f |= IsSyncGen;
    }
    ctx.f &= ~IsIterating;
    if (iteration.done) {
      ctx.f |= IsDone;
    }
    let value;
    try {
      value = updateComponentChildren(ctx, iteration.value);
      if (isPromiseLike(value)) {
        value = value.catch((err) => handleChildError(ctx, err));
      }
    } catch (err) {
      value = handleChildError(ctx, err);
    }
    if (isPromiseLike(value)) {
      return [value.catch(NOOP), value];
    }
    return [void 0, value];
  }
  function advanceComponent(ctx) {
    ctx.inflightBlock = ctx.enqueuedBlock;
    ctx.inflightValue = ctx.enqueuedValue;
    ctx.enqueuedBlock = void 0;
    ctx.enqueuedValue = void 0;
    if (ctx.f & IsAsyncGen && !(ctx.f & IsDone) && !(ctx.f & IsUnmounted)) {
      runComponent(ctx);
    }
  }
  function resumeCtxIterator(ctx) {
    if (ctx.onAvailable) {
      ctx.onAvailable();
      ctx.onAvailable = void 0;
    } else {
      ctx.f |= IsAvailable;
    }
  }
  function unmountComponent(ctx) {
    ctx.f |= IsUnmounted;
    clearEventListeners(ctx);
    const callbacks = cleanupMap.get(ctx);
    if (callbacks) {
      cleanupMap.delete(ctx);
      const value = ctx.renderer.read(getValue(ctx.ret));
      for (const callback of callbacks) {
        callback(value);
      }
    }
    if (!(ctx.f & IsDone)) {
      ctx.f |= IsDone;
      resumeCtxIterator(ctx);
      if (ctx.iterator && typeof ctx.iterator.return === "function") {
        ctx.f |= IsExecuting;
        try {
          const iteration = ctx.iterator.return();
          if (isPromiseLike(iteration)) {
            iteration.catch((err) => propagateError(ctx.parent, err));
          }
        } finally {
          ctx.f &= ~IsExecuting;
        }
      }
    }
  }
  var NONE = 0;
  var CAPTURING_PHASE = 1;
  var AT_TARGET = 2;
  var BUBBLING_PHASE = 3;
  var listenersMap = new WeakMap();
  function addEventListener(ctx, type, listener, options) {
    let listeners;
    if (listener == null) {
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
    const record = { type, callback, listener, options };
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
  function removeEventListener(ctx, type, listener, options) {
    const listeners = listenersMap.get(ctx);
    if (listener == null || listeners == null) {
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
  function dispatchEvent(ctx, ev) {
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
    setEventProperty(ev, "target", ctx.ctx);
    try {
      setEventProperty(ev, "eventPhase", CAPTURING_PHASE);
      for (let i = path.length - 1; i >= 0; i--) {
        const target = path[i];
        const listeners = listenersMap.get(target);
        if (listeners) {
          setEventProperty(ev, "currentTarget", target.ctx);
          for (const record of listeners) {
            if (record.type === ev.type && record.options.capture) {
              record.callback.call(target.ctx, ev);
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
        const listeners = listenersMap.get(ctx);
        if (listeners) {
          setEventProperty(ev, "eventPhase", AT_TARGET);
          setEventProperty(ev, "currentTarget", ctx.ctx);
          for (const record of listeners) {
            if (record.type === ev.type) {
              record.callback.call(ctx.ctx, ev);
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
            setEventProperty(ev, "currentTarget", target.ctx);
            for (const record of listeners) {
              if (record.type === ev.type && !record.options.capture) {
                record.callback.call(target.ctx, ev);
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
    } catch (err) {
      console.error(err);
    } finally {
      setEventProperty(ev, "eventPhase", NONE);
      setEventProperty(ev, "currentTarget", null);
      return !ev.defaultPrevented;
    }
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
    if (ctx.f & IsDone || !ctx.iterator || typeof ctx.iterator.throw !== "function") {
      throw err;
    }
    resumeCtxIterator(ctx);
    let iteration;
    try {
      ctx.f |= IsExecuting;
      iteration = ctx.iterator.throw(err);
    } catch (err2) {
      ctx.f |= IsDone | IsErrored;
      throw err2;
    } finally {
      ctx.f &= ~IsExecuting;
    }
    if (isPromiseLike(iteration)) {
      return iteration.then((iteration2) => {
        if (iteration2.done) {
          ctx.f |= IsDone;
        }
        return updateComponentChildren(ctx, iteration2.value);
      }, (err2) => {
        ctx.f |= IsDone | IsErrored;
        throw err2;
      });
    }
    if (iteration.done) {
      ctx.f |= IsDone;
    }
    return updateComponentChildren(ctx, iteration.value);
  }
  function propagateError(ctx, err) {
    if (ctx === void 0) {
      throw err;
    }
    let result;
    try {
      result = handleChildError(ctx, err);
    } catch (err2) {
      return propagateError(ctx.parent, err2);
    }
    if (isPromiseLike(result)) {
      return result.catch((err2) => propagateError(ctx.parent, err2));
    }
    return result;
  }

  // node_modules/@b9g/crank/dom.js
  var SVG_NAMESPACE = "http://www.w3.org/2000/svg";
  var impl = {
    parse(text) {
      if (typeof document.createRange === "function") {
        const fragment = document.createRange().createContextualFragment(text);
        return Array.from(fragment.childNodes);
      } else {
        const childNodes = new DOMParser().parseFromString(text, "text/html").body.childNodes;
        return Array.from(childNodes);
      }
    },
    scope(scope, tag) {
      switch (tag) {
        case Portal:
        case "foreignObject":
          return void 0;
        case "svg":
          return SVG_NAMESPACE;
        default:
          return scope;
      }
    },
    create(tag, _props, ns) {
      if (typeof tag !== "string") {
        throw new Error(`Unknown tag: ${tag.toString()}`);
      } else if (tag.toLowerCase() === "svg") {
        ns = SVG_NAMESPACE;
      }
      return ns ? document.createElementNS(ns, tag) : document.createElement(tag);
    },
    patch(_tag, node, name, value, oldValue, scope) {
      const isSVG = scope === SVG_NAMESPACE;
      switch (name) {
        case "style": {
          const style = node.style;
          if (style == null) {
            node.setAttribute("style", value);
          } else if (value == null || value === false) {
            node.removeAttribute("style");
          } else if (value === true) {
            node.setAttribute("style", "");
          } else if (typeof value === "string") {
            if (style.cssText !== value) {
              style.cssText = value;
            }
          } else {
            if (typeof oldValue === "string") {
              style.cssText = "";
            }
            for (const styleName in { ...oldValue, ...value }) {
              const styleValue = value && value[styleName];
              if (styleValue == null) {
                style.removeProperty(styleName);
              } else if (style.getPropertyValue(styleName) !== styleValue) {
                style.setProperty(styleName, styleValue);
              }
            }
          }
          break;
        }
        case "class":
        case "className":
          if (value === true) {
            node.setAttribute("class", "");
          } else if (value == null) {
            node.removeAttribute("class");
          } else if (!isSVG) {
            if (node.className !== value) {
              node["className"] = value;
            }
          } else if (node.getAttribute("class") !== value) {
            node.setAttribute("class", value);
          }
          break;
        case "innerHTML":
          if (value !== oldValue) {
            node.innerHTML = value;
          }
          break;
        default: {
          if (name in node && !(typeof value === "string" && typeof node[name] === "boolean")) {
            try {
              if (node[name] !== value) {
                node[name] = value;
              }
              return;
            } catch (err) {
            }
          }
          if (value === true) {
            value = "";
          } else if (value == null || value === false) {
            node.removeAttribute(name);
            return;
          }
          if (node.getAttribute(name) !== value) {
            node.setAttribute(name, value);
          }
        }
      }
    },
    arrange(tag, node, props, children, _oldProps, oldChildren) {
      if (tag === Portal && (node == null || typeof node.nodeType !== "number")) {
        throw new TypeError(`Portal root is not a node. Received: ${JSON.stringify(node && node.toString())}`);
      }
      if (!("innerHTML" in props) && ("children" in props || oldChildren && oldChildren.length)) {
        if (children.length === 0) {
          node.textContent = "";
        } else {
          let oldChild = node.firstChild;
          let i = 0;
          while (oldChild !== null && i < children.length) {
            const newChild = children[i];
            if (oldChild === newChild) {
              oldChild = oldChild.nextSibling;
              i++;
            } else if (typeof newChild === "string") {
              if (oldChild.nodeType === Node.TEXT_NODE) {
                if (oldChild.data !== newChild) {
                  oldChild.data = newChild;
                }
                oldChild = oldChild.nextSibling;
              } else {
                node.insertBefore(document.createTextNode(newChild), oldChild);
              }
              i++;
            } else if (oldChild.nodeType === Node.TEXT_NODE) {
              const nextSibling = oldChild.nextSibling;
              node.removeChild(oldChild);
              oldChild = nextSibling;
            } else {
              node.insertBefore(newChild, oldChild);
              i++;
              if (oldChild !== children[i]) {
                const nextSibling = oldChild.nextSibling;
                node.removeChild(oldChild);
                oldChild = nextSibling;
              }
            }
          }
          while (oldChild !== null) {
            const nextSibling = oldChild.nextSibling;
            node.removeChild(oldChild);
            oldChild = nextSibling;
          }
          for (; i < children.length; i++) {
            const newChild = children[i];
            node.appendChild(typeof newChild === "string" ? document.createTextNode(newChild) : newChild);
          }
        }
      }
    }
  };
  var DOMRenderer = class extends Renderer {
    constructor() {
      super(impl);
    }
    render(children, root, ctx) {
      if (root == null || typeof root.nodeType !== "number") {
        throw new TypeError(`Render root is not a node. Received: ${JSON.stringify(root && root.toString())}`);
      }
      return super.render(children, root, ctx);
    }
  };
  var renderer = new DOMRenderer();

  // client/index.tsx
  var import_prismjs2 = __toModule(require_prism());

  // node_modules/prismjs/components/prism-javascript.js
  Prism.languages.javascript = Prism.languages.extend("clike", {
    "class-name": [
      Prism.languages.clike["class-name"],
      {
        pattern: /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$A-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\.(?:prototype|constructor))/,
        lookbehind: true
      }
    ],
    "keyword": [
      {
        pattern: /((?:^|\})\s*)catch\b/,
        lookbehind: true
      },
      {
        pattern: /(^|[^.]|\.\.\.\s*)\b(?:as|assert(?=\s*\{)|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally(?=\s*(?:\{|$))|for|from(?=\s*(?:['"]|$))|function|(?:get|set)(?=\s*(?:[#\[$\w\xA0-\uFFFF]|$))|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,
        lookbehind: true
      }
    ],
    "function": /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,
    "number": /\b(?:(?:0[xX](?:[\dA-Fa-f](?:_[\dA-Fa-f])?)+|0[bB](?:[01](?:_[01])?)+|0[oO](?:[0-7](?:_[0-7])?)+)n?|(?:\d(?:_\d)?)+n|NaN|Infinity)\b|(?:\b(?:\d(?:_\d)?)+\.?(?:\d(?:_\d)?)*|\B\.(?:\d(?:_\d)?)+)(?:[Ee][+-]?(?:\d(?:_\d)?)+)?/,
    "operator": /--|\+\+|\*\*=?|=>|&&=?|\|\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?\?=?|\?\.?|[~:]/
  });
  Prism.languages.javascript["class-name"][0].pattern = /(\b(?:class|interface|extends|implements|instanceof|new)\s+)[\w.\\]+/;
  Prism.languages.insertBefore("javascript", "keyword", {
    "regex": {
      pattern: /((?:^|[^$\w\xA0-\uFFFF."'\])\s]|\b(?:return|yield))\s*)\/(?:\[(?:[^\]\\\r\n]|\\.)*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}(?=(?:\s|\/\*(?:[^*]|\*(?!\/))*\*\/)*(?:$|[\r\n,.;:})\]]|\/\/))/,
      lookbehind: true,
      greedy: true,
      inside: {
        "regex-source": {
          pattern: /^(\/)[\s\S]+(?=\/[a-z]*$)/,
          lookbehind: true,
          alias: "language-regex",
          inside: Prism.languages.regex
        },
        "regex-delimiter": /^\/|\/$/,
        "regex-flags": /^[a-z]+$/
      }
    },
    "function-variable": {
      pattern: /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)\s*=>))/,
      alias: "function"
    },
    "parameter": [
      {
        pattern: /(function(?:\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)?\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\))/,
        lookbehind: true,
        inside: Prism.languages.javascript
      },
      {
        pattern: /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$a-z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*=>)/i,
        lookbehind: true,
        inside: Prism.languages.javascript
      },
      {
        pattern: /(\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*=>)/,
        lookbehind: true,
        inside: Prism.languages.javascript
      },
      {
        pattern: /((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*\{)/,
        lookbehind: true,
        inside: Prism.languages.javascript
      }
    ],
    "constant": /\b[A-Z](?:[A-Z_]|\dx?)*\b/
  });
  Prism.languages.insertBefore("javascript", "string", {
    "hashbang": {
      pattern: /^#!.*/,
      greedy: true,
      alias: "comment"
    },
    "template-string": {
      pattern: /`(?:\\[\s\S]|\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}|(?!\$\{)[^\\`])*`/,
      greedy: true,
      inside: {
        "template-punctuation": {
          pattern: /^`|`$/,
          alias: "string"
        },
        "interpolation": {
          pattern: /((?:^|[^\\])(?:\\{2})*)\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}/,
          lookbehind: true,
          inside: {
            "interpolation-punctuation": {
              pattern: /^\$\{|\}$/,
              alias: "punctuation"
            },
            rest: Prism.languages.javascript
          }
        },
        "string": /[\s\S]+/
      }
    }
  });
  if (Prism.languages.markup) {
    Prism.languages.markup.tag.addInlined("script", "javascript");
    Prism.languages.markup.tag.addAttribute(/on(?:abort|blur|change|click|composition(?:end|start|update)|dblclick|error|focus(?:in|out)?|key(?:down|up)|load|mouse(?:down|enter|leave|move|out|over|up)|reset|resize|scroll|select|slotchange|submit|unload|wheel)/.source, "javascript");
  }
  Prism.languages.js = Prism.languages.javascript;

  // node_modules/prismjs/components/prism-jsx.js
  (function(Prism4) {
    var javascript = Prism4.util.clone(Prism4.languages.javascript);
    var space = /(?:\s|\/\/.*(?!.)|\/\*(?:[^*]|\*(?!\/))\*\/)/.source;
    var braces = /(?:\{(?:\{(?:\{[^{}]*\}|[^{}])*\}|[^{}])*\})/.source;
    var spread = /(?:\{<S>*\.{3}(?:[^{}]|<BRACES>)*\})/.source;
    function re(source, flags) {
      source = source.replace(/<S>/g, function() {
        return space;
      }).replace(/<BRACES>/g, function() {
        return braces;
      }).replace(/<SPREAD>/g, function() {
        return spread;
      });
      return RegExp(source, flags);
    }
    spread = re(spread).source;
    Prism4.languages.jsx = Prism4.languages.extend("markup", javascript);
    Prism4.languages.jsx.tag.pattern = re(/<\/?(?:[\w.:-]+(?:<S>+(?:[\w.:$-]+(?:=(?:"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*'|[^\s{'"/>=]+|<BRACES>))?|<SPREAD>))*<S>*\/?)?>/.source);
    Prism4.languages.jsx.tag.inside["tag"].pattern = /^<\/?[^\s>\/]*/i;
    Prism4.languages.jsx.tag.inside["attr-value"].pattern = /=(?!\{)(?:"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*'|[^\s'">]+)/i;
    Prism4.languages.jsx.tag.inside["tag"].inside["class-name"] = /^[A-Z]\w*(?:\.[A-Z]\w*)*$/;
    Prism4.languages.jsx.tag.inside["comment"] = javascript["comment"];
    Prism4.languages.insertBefore("inside", "attr-name", {
      "spread": {
        pattern: re(/<SPREAD>/.source),
        inside: Prism4.languages.jsx
      }
    }, Prism4.languages.jsx.tag);
    Prism4.languages.insertBefore("inside", "special-attr", {
      "script": {
        pattern: re(/=<BRACES>/.source),
        inside: {
          "script-punctuation": {
            pattern: /^=(?=\{)/,
            alias: "punctuation"
          },
          rest: Prism4.languages.jsx
        },
        "alias": "language-javascript"
      }
    }, Prism4.languages.jsx.tag);
    var stringifyToken = function(token) {
      if (!token) {
        return "";
      }
      if (typeof token === "string") {
        return token;
      }
      if (typeof token.content === "string") {
        return token.content;
      }
      return token.content.map(stringifyToken).join("");
    };
    var walkTokens = function(tokens) {
      var openedTags = [];
      for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];
        var notTagNorBrace = false;
        if (typeof token !== "string") {
          if (token.type === "tag" && token.content[0] && token.content[0].type === "tag") {
            if (token.content[0].content[0].content === "</") {
              if (openedTags.length > 0 && openedTags[openedTags.length - 1].tagName === stringifyToken(token.content[0].content[1])) {
                openedTags.pop();
              }
            } else {
              if (token.content[token.content.length - 1].content === "/>") {
              } else {
                openedTags.push({
                  tagName: stringifyToken(token.content[0].content[1]),
                  openedBraces: 0
                });
              }
            }
          } else if (openedTags.length > 0 && token.type === "punctuation" && token.content === "{") {
            openedTags[openedTags.length - 1].openedBraces++;
          } else if (openedTags.length > 0 && openedTags[openedTags.length - 1].openedBraces > 0 && token.type === "punctuation" && token.content === "}") {
            openedTags[openedTags.length - 1].openedBraces--;
          } else {
            notTagNorBrace = true;
          }
        }
        if (notTagNorBrace || typeof token === "string") {
          if (openedTags.length > 0 && openedTags[openedTags.length - 1].openedBraces === 0) {
            var plainText = stringifyToken(token);
            if (i < tokens.length - 1 && (typeof tokens[i + 1] === "string" || tokens[i + 1].type === "plain-text")) {
              plainText += stringifyToken(tokens[i + 1]);
              tokens.splice(i + 1, 1);
            }
            if (i > 0 && (typeof tokens[i - 1] === "string" || tokens[i - 1].type === "plain-text")) {
              plainText = stringifyToken(tokens[i - 1]) + plainText;
              tokens.splice(i - 1, 1);
              i--;
            }
            tokens[i] = new Prism4.Token("plain-text", plainText, null, plainText);
          }
        }
        if (token.content && typeof token.content !== "string") {
          walkTokens(token.content);
        }
      }
    };
    Prism4.hooks.add("after-tokenize", function(env) {
      if (env.language !== "jsx" && env.language !== "tsx") {
        return;
      }
      walkTokens(env.tokens);
    });
  })(Prism);

  // node_modules/prismjs/components/prism-typescript.js
  (function(Prism4) {
    Prism4.languages.typescript = Prism4.languages.extend("javascript", {
      "class-name": {
        pattern: /(\b(?:class|extends|implements|instanceof|interface|new|type)\s+)(?!keyof\b)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?:\s*<(?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)*>)?/,
        lookbehind: true,
        greedy: true,
        inside: null
      },
      "builtin": /\b(?:string|Function|any|number|boolean|Array|symbol|console|Promise|unknown|never)\b/
    });
    Prism4.languages.typescript.keyword.push(/\b(?:abstract|as|declare|implements|is|keyof|readonly|require)\b/, /\b(?:asserts|infer|interface|module|namespace|type)\b(?=\s*(?:[{_$a-zA-Z\xA0-\uFFFF]|$))/, /\btype\b(?=\s*(?:[\{*]|$))/);
    delete Prism4.languages.typescript["parameter"];
    var typeInside = Prism4.languages.extend("typescript", {});
    delete typeInside["class-name"];
    Prism4.languages.typescript["class-name"].inside = typeInside;
    Prism4.languages.insertBefore("typescript", "function", {
      "decorator": {
        pattern: /@[$\w\xA0-\uFFFF]+/,
        inside: {
          "at": {
            pattern: /^@/,
            alias: "operator"
          },
          "function": /^[\s\S]+/
        }
      },
      "generic-function": {
        pattern: /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*<(?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)*>(?=\s*\()/,
        greedy: true,
        inside: {
          "function": /^#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*/,
          "generic": {
            pattern: /<[\s\S]+/,
            alias: "class-name",
            inside: typeInside
          }
        }
      }
    });
    Prism4.languages.ts = Prism4.languages.typescript;
  })(Prism);

  // node_modules/prismjs/components/prism-tsx.js
  (function(Prism4) {
    var typescript = Prism4.util.clone(Prism4.languages.typescript);
    Prism4.languages.tsx = Prism4.languages.extend("jsx", typescript);
    var tag = Prism4.languages.tsx.tag;
    tag.pattern = RegExp(/(^|[^\w$]|(?=<\/))/.source + "(?:" + tag.pattern.source + ")", tag.pattern.flags);
    tag.lookbehind = true;
  })(Prism);

  // node_modules/prismjs/components/prism-diff.js
  (function(Prism4) {
    Prism4.languages.diff = {
      "coord": [
        /^(?:\*{3}|-{3}|\+{3}).*$/m,
        /^@@.*@@$/m,
        /^\d.*$/m
      ]
    };
    var PREFIXES = {
      "deleted-sign": "-",
      "deleted-arrow": "<",
      "inserted-sign": "+",
      "inserted-arrow": ">",
      "unchanged": " ",
      "diff": "!"
    };
    Object.keys(PREFIXES).forEach(function(name) {
      var prefix = PREFIXES[name];
      var alias = [];
      if (!/^\w+$/.test(name)) {
        alias.push(/\w+/.exec(name)[0]);
      }
      if (name === "diff") {
        alias.push("bold");
      }
      Prism4.languages.diff[name] = {
        pattern: RegExp("^(?:[" + prefix + "].*(?:\r\n?|\n|(?![\\s\\S])))+", "m"),
        alias,
        inside: {
          "line": {
            pattern: /(.)(?=[\s\S]).*(?:\r\n?|\n)?/,
            lookbehind: true
          },
          "prefix": {
            pattern: /[\s\S]/,
            alias: /\w+/.exec(name)[0]
          }
        }
      };
    });
    Object.defineProperty(Prism4.languages.diff, "PREFIXES", {
      value: PREFIXES
    });
  })(Prism);

  // node_modules/prismjs/components/prism-bash.js
  (function(Prism4) {
    var envVars = "\\b(?:BASH|BASHOPTS|BASH_ALIASES|BASH_ARGC|BASH_ARGV|BASH_CMDS|BASH_COMPLETION_COMPAT_DIR|BASH_LINENO|BASH_REMATCH|BASH_SOURCE|BASH_VERSINFO|BASH_VERSION|COLORTERM|COLUMNS|COMP_WORDBREAKS|DBUS_SESSION_BUS_ADDRESS|DEFAULTS_PATH|DESKTOP_SESSION|DIRSTACK|DISPLAY|EUID|GDMSESSION|GDM_LANG|GNOME_KEYRING_CONTROL|GNOME_KEYRING_PID|GPG_AGENT_INFO|GROUPS|HISTCONTROL|HISTFILE|HISTFILESIZE|HISTSIZE|HOME|HOSTNAME|HOSTTYPE|IFS|INSTANCE|JOB|LANG|LANGUAGE|LC_ADDRESS|LC_ALL|LC_IDENTIFICATION|LC_MEASUREMENT|LC_MONETARY|LC_NAME|LC_NUMERIC|LC_PAPER|LC_TELEPHONE|LC_TIME|LESSCLOSE|LESSOPEN|LINES|LOGNAME|LS_COLORS|MACHTYPE|MAILCHECK|MANDATORY_PATH|NO_AT_BRIDGE|OLDPWD|OPTERR|OPTIND|ORBIT_SOCKETDIR|OSTYPE|PAPERSIZE|PATH|PIPESTATUS|PPID|PS1|PS2|PS3|PS4|PWD|RANDOM|REPLY|SECONDS|SELINUX_INIT|SESSION|SESSIONTYPE|SESSION_MANAGER|SHELL|SHELLOPTS|SHLVL|SSH_AUTH_SOCK|TERM|UID|UPSTART_EVENTS|UPSTART_INSTANCE|UPSTART_JOB|UPSTART_SESSION|USER|WINDOWID|XAUTHORITY|XDG_CONFIG_DIRS|XDG_CURRENT_DESKTOP|XDG_DATA_DIRS|XDG_GREETER_DATA_DIR|XDG_MENU_PREFIX|XDG_RUNTIME_DIR|XDG_SEAT|XDG_SEAT_PATH|XDG_SESSION_DESKTOP|XDG_SESSION_ID|XDG_SESSION_PATH|XDG_SESSION_TYPE|XDG_VTNR|XMODIFIERS)\\b";
    var commandAfterHeredoc = {
      pattern: /(^(["']?)\w+\2)[ \t]+\S.*/,
      lookbehind: true,
      alias: "punctuation",
      inside: null
    };
    var insideString = {
      "bash": commandAfterHeredoc,
      "environment": {
        pattern: RegExp("\\$" + envVars),
        alias: "constant"
      },
      "variable": [
        {
          pattern: /\$?\(\([\s\S]+?\)\)/,
          greedy: true,
          inside: {
            "variable": [
              {
                pattern: /(^\$\(\([\s\S]+)\)\)/,
                lookbehind: true
              },
              /^\$\(\(/
            ],
            "number": /\b0x[\dA-Fa-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:[Ee]-?\d+)?/,
            "operator": /--|\+\+|\*\*=?|<<=?|>>=?|&&|\|\||[=!+\-*/%<>^&|]=?|[?~:]/,
            "punctuation": /\(\(?|\)\)?|,|;/
          }
        },
        {
          pattern: /\$\((?:\([^)]+\)|[^()])+\)|`[^`]+`/,
          greedy: true,
          inside: {
            "variable": /^\$\(|^`|\)$|`$/
          }
        },
        {
          pattern: /\$\{[^}]+\}/,
          greedy: true,
          inside: {
            "operator": /:[-=?+]?|[!\/]|##?|%%?|\^\^?|,,?/,
            "punctuation": /[\[\]]/,
            "environment": {
              pattern: RegExp("(\\{)" + envVars),
              lookbehind: true,
              alias: "constant"
            }
          }
        },
        /\$(?:\w+|[#?*!@$])/
      ],
      "entity": /\\(?:[abceEfnrtv\\"]|O?[0-7]{1,3}|x[0-9a-fA-F]{1,2}|u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8})/
    };
    Prism4.languages.bash = {
      "shebang": {
        pattern: /^#!\s*\/.*/,
        alias: "important"
      },
      "comment": {
        pattern: /(^|[^"{\\$])#.*/,
        lookbehind: true
      },
      "function-name": [
        {
          pattern: /(\bfunction\s+)[\w-]+(?=(?:\s*\(?:\s*\))?\s*\{)/,
          lookbehind: true,
          alias: "function"
        },
        {
          pattern: /\b[\w-]+(?=\s*\(\s*\)\s*\{)/,
          alias: "function"
        }
      ],
      "for-or-select": {
        pattern: /(\b(?:for|select)\s+)\w+(?=\s+in\s)/,
        alias: "variable",
        lookbehind: true
      },
      "assign-left": {
        pattern: /(^|[\s;|&]|[<>]\()\w+(?=\+?=)/,
        inside: {
          "environment": {
            pattern: RegExp("(^|[\\s;|&]|[<>]\\()" + envVars),
            lookbehind: true,
            alias: "constant"
          }
        },
        alias: "variable",
        lookbehind: true
      },
      "string": [
        {
          pattern: /((?:^|[^<])<<-?\s*)(\w+)\s[\s\S]*?(?:\r?\n|\r)\2/,
          lookbehind: true,
          greedy: true,
          inside: insideString
        },
        {
          pattern: /((?:^|[^<])<<-?\s*)(["'])(\w+)\2\s[\s\S]*?(?:\r?\n|\r)\3/,
          lookbehind: true,
          greedy: true,
          inside: {
            "bash": commandAfterHeredoc
          }
        },
        {
          pattern: /(^|[^\\](?:\\\\)*)"(?:\\[\s\S]|\$\([^)]+\)|\$(?!\()|`[^`]+`|[^"\\`$])*"/,
          lookbehind: true,
          greedy: true,
          inside: insideString
        },
        {
          pattern: /(^|[^$\\])'[^']*'/,
          lookbehind: true,
          greedy: true
        },
        {
          pattern: /\$'(?:[^'\\]|\\[\s\S])*'/,
          greedy: true,
          inside: {
            "entity": insideString.entity
          }
        }
      ],
      "environment": {
        pattern: RegExp("\\$?" + envVars),
        alias: "constant"
      },
      "variable": insideString.variable,
      "function": {
        pattern: /(^|[\s;|&]|[<>]\()(?:add|apropos|apt|aptitude|apt-cache|apt-get|aspell|automysqlbackup|awk|basename|bash|bc|bconsole|bg|bzip2|cal|cat|cfdisk|chgrp|chkconfig|chmod|chown|chroot|cksum|clear|cmp|column|comm|composer|cp|cron|crontab|csplit|curl|cut|date|dc|dd|ddrescue|debootstrap|df|diff|diff3|dig|dir|dircolors|dirname|dirs|dmesg|du|egrep|eject|env|ethtool|expand|expect|expr|fdformat|fdisk|fg|fgrep|file|find|fmt|fold|format|free|fsck|ftp|fuser|gawk|git|gparted|grep|groupadd|groupdel|groupmod|groups|grub-mkconfig|gzip|halt|head|hg|history|host|hostname|htop|iconv|id|ifconfig|ifdown|ifup|import|install|ip|jobs|join|kill|killall|less|link|ln|locate|logname|logrotate|look|lpc|lpr|lprint|lprintd|lprintq|lprm|ls|lsof|lynx|make|man|mc|mdadm|mkconfig|mkdir|mke2fs|mkfifo|mkfs|mkisofs|mknod|mkswap|mmv|more|most|mount|mtools|mtr|mutt|mv|nano|nc|netstat|nice|nl|nohup|notify-send|npm|nslookup|op|open|parted|passwd|paste|pathchk|ping|pkill|pnpm|popd|pr|printcap|printenv|ps|pushd|pv|quota|quotacheck|quotactl|ram|rar|rcp|reboot|remsync|rename|renice|rev|rm|rmdir|rpm|rsync|scp|screen|sdiff|sed|sendmail|seq|service|sftp|sh|shellcheck|shuf|shutdown|sleep|slocate|sort|split|ssh|stat|strace|su|sudo|sum|suspend|swapon|sync|tac|tail|tar|tee|time|timeout|top|touch|tr|traceroute|tsort|tty|umount|uname|unexpand|uniq|units|unrar|unshar|unzip|update-grub|uptime|useradd|userdel|usermod|users|uudecode|uuencode|v|vdir|vi|vim|virsh|vmstat|wait|watch|wc|wget|whereis|which|who|whoami|write|xargs|xdg-open|yarn|yes|zenity|zip|zsh|zypper)(?=$|[)\s;|&])/,
        lookbehind: true
      },
      "keyword": {
        pattern: /(^|[\s;|&]|[<>]\()(?:if|then|else|elif|fi|for|while|in|case|esac|function|select|do|done|until)(?=$|[)\s;|&])/,
        lookbehind: true
      },
      "builtin": {
        pattern: /(^|[\s;|&]|[<>]\()(?:\.|:|break|cd|continue|eval|exec|exit|export|getopts|hash|pwd|readonly|return|shift|test|times|trap|umask|unset|alias|bind|builtin|caller|command|declare|echo|enable|help|let|local|logout|mapfile|printf|read|readarray|source|type|typeset|ulimit|unalias|set|shopt)(?=$|[)\s;|&])/,
        lookbehind: true,
        alias: "class-name"
      },
      "boolean": {
        pattern: /(^|[\s;|&]|[<>]\()(?:true|false)(?=$|[)\s;|&])/,
        lookbehind: true
      },
      "file-descriptor": {
        pattern: /\B&\d\b/,
        alias: "important"
      },
      "operator": {
        pattern: /\d?<>|>\||\+=|=[=~]?|!=?|<<[<-]?|[&\d]?>>|\d[<>]&?|[<>][&=]?|&[>&]?|\|[&|]?/,
        inside: {
          "file-descriptor": {
            pattern: /^\d/,
            alias: "important"
          }
        }
      },
      "punctuation": /\$?\(\(?|\)\)?|\.\.|[{}[\];\\]/,
      "number": {
        pattern: /(^|\s)(?:[1-9]\d*|0)(?:[.,]\d+)?\b/,
        lookbehind: true
      }
    };
    commandAfterHeredoc.inside = Prism4.languages.bash;
    var toBeCopied = [
      "comment",
      "function-name",
      "for-or-select",
      "assign-left",
      "string",
      "environment",
      "function",
      "keyword",
      "builtin",
      "boolean",
      "file-descriptor",
      "operator",
      "punctuation",
      "number"
    ];
    var inside = insideString.variable[1].inside;
    for (var i = 0; i < toBeCopied.length; i++) {
      inside[toBeCopied[i]] = Prism4.languages.bash[toBeCopied[i]];
    }
    Prism4.languages.shell = Prism4.languages.bash;
  })(Prism);

  // node_modules/@b9g/revise/subseq.js
  var Subseq = class {
    constructor(sizes) {
      const [size, includedSize, excludedSize] = measure(sizes);
      this.size = size;
      this.includedSize = includedSize;
      this.excludedSize = excludedSize;
      this.sizes = sizes;
    }
    print() {
      let result = "";
      for (let i = 0; i < this.sizes.length; i++) {
        if (i % 2 === 0) {
          result += "=".repeat(this.sizes[i]);
        } else {
          result += "+".repeat(this.sizes[i]);
        }
      }
      return result;
    }
    contains(offset) {
      if (offset < 0) {
        return false;
      }
      for (let i = 0; i < this.sizes.length; i++) {
        offset -= this.sizes[i];
        if (offset < 0) {
          return i % 2 === 1;
        }
      }
      return false;
    }
    clear() {
      return new Subseq(this.size ? [this.size] : []);
    }
    fill() {
      return new Subseq(this.size ? [0, this.size] : []);
    }
    complement() {
      const sizes = this.sizes[0] === 0 ? this.sizes.slice(1) : [0, ...this.sizes];
      return new Subseq(sizes);
    }
    align(that) {
      if (this.size !== that.size) {
        throw new Error("Size mismatch");
      }
      const result = [];
      const length1 = this.sizes.length;
      const length2 = that.sizes.length;
      for (let i1 = 0, i2 = 0, size1 = 0, size2 = 0, flag1 = true, flag2 = true; i1 < length1 || i2 < length2; ) {
        if (size1 === 0) {
          if (i1 >= length1) {
            throw new Error("Size mismatch");
          }
          size1 = this.sizes[i1++];
          flag1 = !flag1;
        }
        if (size2 === 0) {
          if (i2 >= length2) {
            throw new Error("Size mismatch");
          }
          size2 = that.sizes[i2++];
          flag2 = !flag2;
        }
        if (size1 < size2) {
          if (size1) {
            result.push([size1, flag1, flag2]);
          }
          size2 = size2 - size1;
          size1 = 0;
        } else if (size1 > size2) {
          if (size2) {
            result.push([size2, flag1, flag2]);
          }
          size1 = size1 - size2;
          size2 = 0;
        } else {
          if (size1) {
            result.push([size1, flag1, flag2]);
          }
          size1 = size2 = 0;
        }
      }
      return result;
    }
    union(that) {
      const sizes = [];
      for (const [size, flag1, flag2] of this.align(that)) {
        pushSegment(sizes, size, flag1 || flag2);
      }
      return new Subseq(sizes);
    }
    intersection(that) {
      const sizes = [];
      for (const [size, flag1, flag2] of this.align(that)) {
        pushSegment(sizes, size, flag1 && flag2);
      }
      return new Subseq(sizes);
    }
    difference(that) {
      const sizes = [];
      for (const [size, flag1, flag2] of this.align(that)) {
        pushSegment(sizes, size, flag1 && !flag2);
      }
      return new Subseq(sizes);
    }
    shrink(that) {
      if (this.size !== that.size) {
        throw new Error("Size mismatch");
      }
      const sizes = [];
      for (const [size, flag1, flag2] of this.align(that)) {
        if (!flag2) {
          pushSegment(sizes, size, flag1);
        }
      }
      return new Subseq(sizes);
    }
    expand(that) {
      if (this.size !== that.excludedSize) {
        throw new Error("Size mismatch");
      }
      const sizes = [];
      const length1 = this.sizes.length;
      const length2 = that.sizes.length;
      for (let i1 = 0, i2 = 0, size1 = 0, flag1 = true, flag2 = true; i2 < length2; i2++) {
        let size2 = that.sizes[i2];
        flag2 = !flag2;
        if (flag2) {
          pushSegment(sizes, size2, false);
        } else {
          while (size2) {
            if (size1 === 0) {
              if (i1 >= length1) {
                throw new Error("Size mismatch");
              }
              size1 = this.sizes[i1++];
              flag1 = !flag1;
            }
            const size = Math.min(size1, size2);
            pushSegment(sizes, size, flag1);
            size1 -= size;
            size2 -= size;
          }
        }
      }
      return new Subseq(sizes);
    }
    interleave(that) {
      if (this.excludedSize !== that.excludedSize) {
        throw new Error("Size mismatch");
      }
      const sizes1 = [];
      const sizes2 = [];
      const length1 = this.sizes.length;
      const length2 = that.sizes.length;
      for (let i1 = 0, i2 = 0, size1 = 0, size2 = 0, flag1 = true, flag2 = true; i1 < length1 || i2 < length2; ) {
        if (size1 === 0 && i1 < length1) {
          size1 = this.sizes[i1++];
          flag1 = !flag1;
        }
        if (size2 === 0 && i2 < length2) {
          size2 = that.sizes[i2++];
          flag2 = !flag2;
        }
        if (flag1 && flag2) {
          pushSegment(sizes1, size1, true);
          pushSegment(sizes1, size2, false);
          pushSegment(sizes2, size1, false);
          pushSegment(sizes2, size2, true);
          size1 = size2 = 0;
        } else if (flag1) {
          pushSegment(sizes1, size1, true);
          pushSegment(sizes2, size1, false);
          size1 = 0;
        } else if (flag2) {
          pushSegment(sizes1, size2, false);
          pushSegment(sizes2, size2, true);
          size2 = 0;
        } else {
          const size = Math.min(size1, size2);
          pushSegment(sizes1, size, false);
          pushSegment(sizes2, size, false);
          size1 -= size;
          size2 -= size;
        }
      }
      return [new Subseq(sizes1), new Subseq(sizes2)];
    }
  };
  Subseq.pushSegment = pushSegment;
  function pushSegment(sizes, size, flag) {
    if (size < 0) {
      throw new RangeError("Negative size");
    } else if (size === 0) {
      return;
    } else if (!sizes.length) {
      if (flag) {
        sizes.push(0, size);
      } else {
        sizes.push(size);
      }
    } else {
      const flag1 = sizes.length % 2 === 0;
      if (flag === flag1) {
        sizes[sizes.length - 1] += size;
      } else {
        sizes.push(size);
      }
    }
  }
  function measure(sizes) {
    let size = 0, includedSize = 0, excludedSize = 0;
    for (let i = 0; i < sizes.length; i++) {
      const s = sizes[i];
      size += s;
      if (i % 2 === 0) {
        excludedSize += s;
      } else {
        includedSize += s;
      }
    }
    return [size, includedSize, excludedSize];
  }

  // node_modules/@b9g/revise/edit.js
  var Edit = class {
    constructor(parts, deleted) {
      this.parts = parts;
      this.deleted = deleted;
    }
    static synthesize(insertSeq, inserted, deleteSeq, deleted) {
      if (insertSeq.includedSize !== inserted.length) {
        throw new Error("insertSeq and inserted string do not match in length");
      } else if (deleted !== void 0 && deleteSeq.includedSize !== deleted.length) {
        throw new Error("deleteSeq and deleted string do not match in length");
      } else if (deleteSeq.size !== insertSeq.excludedSize) {
        throw new Error("deleteSeq and insertSeq do not match in length");
      }
      const parts = [];
      let insertIndex = 0;
      let retainIndex = 0;
      let needsLength = true;
      for (const [length, deleting, inserting] of deleteSeq.expand(insertSeq).align(insertSeq)) {
        if (inserting) {
          parts.push(inserted.slice(insertIndex, insertIndex + length));
          insertIndex += length;
        } else {
          if (!deleting) {
            parts.push(retainIndex, retainIndex + length);
          }
          retainIndex += length;
          needsLength = deleting;
        }
      }
      if (needsLength) {
        parts.push(retainIndex);
      }
      return new Edit(parts, deleted);
    }
    static build(text, inserted, from, to = from) {
      const insertSizes = [];
      Subseq.pushSegment(insertSizes, from, false);
      Subseq.pushSegment(insertSizes, inserted.length, true);
      Subseq.pushSegment(insertSizes, to - from, false);
      Subseq.pushSegment(insertSizes, text.length - to, false);
      const deleteSizes = [];
      Subseq.pushSegment(deleteSizes, from, false);
      Subseq.pushSegment(deleteSizes, to - from, true);
      Subseq.pushSegment(deleteSizes, text.length - to, false);
      const deleted = text.slice(from, to);
      return Edit.synthesize(new Subseq(insertSizes), inserted, new Subseq(deleteSizes), deleted);
    }
    static diff(text1, text2, hint) {
      let prefix = commonPrefixLength(text1, text2);
      let suffix = commonSuffixLength(text1, text2);
      if (prefix + suffix > Math.min(text1.length, text2.length)) {
        if (hint !== void 0 && hint > -1) {
          prefix = Math.min(prefix, hint);
        }
        suffix = commonSuffixLength(text1.slice(prefix), text2.slice(prefix));
      }
      return Edit.build(text1, text2.slice(prefix, text2.length - suffix), prefix, text1.length - suffix);
    }
    get inserted() {
      let text = "";
      for (let i = 0; i < this.parts.length; i++) {
        if (typeof this.parts[i] === "string") {
          text += this.parts[i];
        }
      }
      return text;
    }
    operations() {
      const operations = [];
      let retaining = false;
      let index = 0;
      let deleteStart = 0;
      for (let i = 0; i < this.parts.length; i++) {
        const part = this.parts[i];
        if (typeof part === "number") {
          if (part < index) {
            throw new TypeError("Malformed edit");
          } else if (part > index) {
            if (retaining) {
              operations.push({ type: "retain", start: index, end: part });
            } else {
              const value = typeof this.deleted === "undefined" ? void 0 : this.deleted.slice(deleteStart, part);
              operations.push({
                type: "delete",
                start: index,
                end: part,
                value
              });
              deleteStart = part;
            }
          }
          index = part;
          retaining = !retaining;
        } else {
          operations.push({ type: "insert", start: index, value: part });
        }
      }
      return operations;
    }
    apply(text) {
      let text1 = "";
      const operations = this.operations();
      for (let i = 0; i < operations.length; i++) {
        const op = operations[i];
        switch (op.type) {
          case "retain":
            text1 += text.slice(op.start, op.end);
            break;
          case "insert":
            text1 += op.value;
            break;
        }
      }
      return text1;
    }
    factor() {
      const insertSizes = [];
      const deleteSizes = [];
      let inserted = "";
      const operations = this.operations();
      for (let i = 0; i < operations.length; i++) {
        const op = operations[i];
        switch (op.type) {
          case "retain": {
            const length = op.end - op.start;
            Subseq.pushSegment(insertSizes, length, false);
            Subseq.pushSegment(deleteSizes, length, false);
            break;
          }
          case "delete": {
            const length = op.end - op.start;
            Subseq.pushSegment(insertSizes, length, false);
            Subseq.pushSegment(deleteSizes, length, true);
            break;
          }
          case "insert":
            Subseq.pushSegment(insertSizes, op.value.length, true);
            inserted += op.value;
            break;
          default:
            throw new TypeError("Invalid operation type");
        }
      }
      const insertSeq = new Subseq(insertSizes);
      const deleteSeq = new Subseq(deleteSizes);
      return [insertSeq, inserted, deleteSeq, this.deleted];
    }
    normalize() {
      if (typeof this.deleted === "undefined") {
        throw new Error("Missing deleted property");
      }
      const insertSizes = [];
      const deleteSizes = [];
      let inserted = "";
      let deleted = "";
      let prevInserted;
      const operations = this.operations();
      for (let i = 0; i < operations.length; i++) {
        const op = operations[i];
        switch (op.type) {
          case "insert": {
            prevInserted = op.value;
            break;
          }
          case "retain": {
            if (prevInserted !== void 0) {
              Subseq.pushSegment(insertSizes, prevInserted.length, true);
              inserted += prevInserted;
              prevInserted = void 0;
            }
            Subseq.pushSegment(insertSizes, op.end - op.start, false);
            Subseq.pushSegment(deleteSizes, op.end - op.start, false);
            break;
          }
          case "delete": {
            const length = op.end - op.start;
            let prefix = 0;
            if (prevInserted !== void 0) {
              prefix = commonPrefixLength(prevInserted, op.value);
              Subseq.pushSegment(insertSizes, prefix, false);
              Subseq.pushSegment(insertSizes, prevInserted.length - prefix, true);
              inserted += prevInserted.slice(prefix);
              prevInserted = void 0;
            }
            deleted += op.value.slice(prefix);
            Subseq.pushSegment(deleteSizes, prefix, false);
            Subseq.pushSegment(deleteSizes, length - prefix, true);
            Subseq.pushSegment(insertSizes, length - prefix, false);
            break;
          }
          default: {
            throw new TypeError("Invalid operation type");
          }
        }
      }
      if (prevInserted !== void 0) {
        Subseq.pushSegment(insertSizes, prevInserted.length, true);
        inserted += prevInserted;
      }
      const insertSeq = new Subseq(insertSizes);
      const deleteSeq = new Subseq(deleteSizes);
      return Edit.synthesize(insertSeq, inserted, deleteSeq, deleted);
    }
    compose(that) {
      let [insertSeq1, inserted1, deleteSeq1, deleted1] = this.factor();
      let [insertSeq2, inserted2, deleteSeq2, deleted2] = that.factor();
      deleteSeq1 = deleteSeq1.expand(insertSeq1);
      deleteSeq2 = deleteSeq2.expand(deleteSeq1);
      [deleteSeq1, insertSeq2] = deleteSeq1.interleave(insertSeq2);
      deleteSeq2 = deleteSeq2.expand(insertSeq2);
      insertSeq1 = insertSeq1.expand(insertSeq2);
      {
        const toggleSeq = insertSeq1.intersection(deleteSeq2);
        if (toggleSeq.includedSize) {
          deleteSeq1 = deleteSeq1.shrink(toggleSeq);
          inserted1 = erase(insertSeq1, inserted1, toggleSeq);
          insertSeq1 = insertSeq1.shrink(toggleSeq);
          deleteSeq2 = deleteSeq2.shrink(toggleSeq);
          insertSeq2 = insertSeq2.shrink(toggleSeq);
        }
      }
      const insertSeq = insertSeq1.union(insertSeq2);
      const inserted = consolidate(insertSeq1, inserted1, insertSeq2, inserted2);
      const deleteSeq = deleteSeq1.union(deleteSeq2).shrink(insertSeq);
      const deleted = deleted1 != null && deleted2 != null ? consolidate(deleteSeq1, deleted1, deleteSeq2, deleted2) : void 0;
      return Edit.synthesize(insertSeq, inserted, deleteSeq, deleted).normalize();
    }
    invert() {
      if (typeof this.deleted === "undefined") {
        throw new Error("Missing deleted property");
      }
      let [insertSeq, inserted, deleteSeq, deleted] = this.factor();
      deleteSeq = deleteSeq.expand(insertSeq);
      insertSeq = insertSeq.shrink(deleteSeq);
      return Edit.synthesize(deleteSeq, deleted, insertSeq, inserted);
    }
  };
  function consolidate(subseq1, text1, subseq2, text2) {
    let i1 = 0;
    let i2 = 0;
    let result = "";
    for (const [size, flag1, flag2] of subseq1.align(subseq2)) {
      if (flag1 && flag2) {
        throw new Error("Overlapping subseqs");
      } else if (flag1) {
        result += text1.slice(i1, i1 + size);
        i1 += size;
      } else if (flag2) {
        result += text2.slice(i2, i2 + size);
        i2 += size;
      }
    }
    return result;
  }
  function erase(subseq1, str, subseq2) {
    let i = 0;
    let result = "";
    for (const [size, flag1, flag2] of subseq1.align(subseq2)) {
      if (flag1) {
        if (!flag2) {
          result += str.slice(i, i + size);
        }
        i += size;
      } else if (flag2) {
        throw new Error("Non-overlapping subseqs");
      }
    }
    return result;
  }
  function commonPrefixLength(text1, text2) {
    const length = Math.min(text1.length, text2.length);
    for (let i = 0; i < length; i++) {
      if (text1[i] !== text2[i]) {
        return i;
      }
    }
    return length;
  }
  function commonSuffixLength(text1, text2) {
    const length1 = text1.length;
    const length2 = text2.length;
    const length = Math.min(length1, length2);
    for (let i = 0; i < length; i++) {
      if (text1[length1 - i - 1] !== text2[length2 - i - 1]) {
        return i;
      }
    }
    return length;
  }

  // node_modules/@b9g/revise/contentarea.js
  var ContentEvent = class extends CustomEvent {
    constructor(typeArg, eventInit) {
      super(typeArg, { bubbles: true, ...eventInit });
    }
  };
  var IS_VALID = 1 << 0;
  var PREPENDS_NEWLINE = 1 << 1;
  var APPENDS_NEWLINE = 1 << 2;
  var NodeInfo = class {
    constructor(offset) {
      this.flags = 0;
      this.size = 0;
      this.offset = offset;
    }
  };
  var $slot = Symbol.for("revise$slot");
  var $cache = Symbol.for("revise$cache");
  var $value = Symbol.for("revise$value");
  var $observer = Symbol.for("revise$observer");
  var $selectionStart = Symbol.for("revise$selectionStart");
  var $onselectionchange = Symbol.for("revise$onselectionchange");
  var css = `:host {
	display: contents;
	white-space: pre-wrap;
	white-space: break-spaces;
	overflow-wrap: break-word;
}`;
  var ContentAreaElement = class extends HTMLElement {
    constructor() {
      super();
      {
        const slot = document.createElement("slot");
        const shadow = this.attachShadow({ mode: "closed" });
        const style = document.createElement("style");
        style.textContent = css;
        shadow.appendChild(style);
        slot.contentEditable = this.contentEditable;
        shadow.appendChild(slot);
        this[$slot] = slot;
      }
      this[$cache] = new Map();
      this[$value] = "";
      this[$observer] = new MutationObserver((records) => {
        validate(this, null, records);
      });
      this[$selectionStart] = 0;
      this[$onselectionchange] = () => {
        validate(this);
        this[$selectionStart] = getSelectionRange(this, this[$cache]).selectionStart;
      };
    }
    static get observedAttributes() {
      return ["contenteditable"];
    }
    connectedCallback() {
      this[$observer].observe(this, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: [
          "data-content",
          "data-contentbefore",
          "data-contentafter"
        ]
      });
      this[$value] = getValue2(this, this[$cache], "");
      this[$selectionStart] = getSelectionRange(this, this[$cache]).selectionStart;
      document.addEventListener("selectionchange", this[$onselectionchange], true);
    }
    disconnectedCallback() {
      this[$cache].clear();
      this[$value] = "";
      this[$observer].disconnect();
      if (document) {
        document.removeEventListener("selectionchange", this[$onselectionchange], true);
      }
    }
    attributeChangedCallback(name) {
      switch (name) {
        case "contenteditable": {
          const slot = this[$slot];
          slot.contentEditable = this.contentEditable;
          break;
        }
      }
    }
    get value() {
      validate(this);
      return this[$value];
    }
    get selectionStart() {
      validate(this);
      return getSelectionRange(this, this[$cache]).selectionStart;
    }
    set selectionStart(selectionStart) {
      validate(this);
      const selectionRange = getSelectionRange(this, this[$cache]);
      setSelectionRange(this, this[$cache], selectionStart, selectionRange.selectionEnd, selectionRange.selectionDirection);
    }
    get selectionEnd() {
      validate(this);
      return getSelectionRange(this, this[$cache]).selectionEnd;
    }
    set selectionEnd(selectionEnd) {
      validate(this);
      const selectionRange = getSelectionRange(this, this[$cache]);
      setSelectionRange(this, this[$cache], selectionRange.selectionStart, selectionEnd, selectionRange.selectionDirection);
    }
    get selectionDirection() {
      validate(this);
      return getSelectionRange(this, this[$cache]).selectionDirection;
    }
    set selectionDirection(selectionDirection) {
      validate(this);
      const selectionRange = getSelectionRange(this, this[$cache]);
      setSelectionRange(this, this[$cache], selectionRange.selectionStart, selectionRange.selectionEnd, selectionDirection);
    }
    getSelectionRange() {
      validate(this);
      return getSelectionRange(this, this[$cache]);
    }
    setSelectionRange(selectionStart, selectionEnd, selectionDirection = "none") {
      validate(this);
      setSelectionRange(this, this[$cache], selectionStart, selectionEnd, selectionDirection);
    }
    indexAt(node, offset) {
      validate(this);
      const cache = this[$cache];
      return indexAt(this, cache, node, offset);
    }
    nodeOffsetAt(index) {
      validate(this);
      const cache = this[$cache];
      return nodeOffsetAt(this, cache, index);
    }
    source(source) {
      return validate(this, source, this[$observer].takeRecords());
    }
  };
  var NEWLINE = "\n";
  var BLOCKLIKE_ELEMENTS = new Set([
    "ADDRESS",
    "ARTICLE",
    "ASIDE",
    "BLOCKQUOTE",
    "CAPTION",
    "DETAILS",
    "DIALOG",
    "DD",
    "DIV",
    "DL",
    "DT",
    "FIELDSET",
    "FIGCAPTION",
    "FIGURE",
    "FOOTER",
    "FORM",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "HEADER",
    "HGROUP",
    "HR",
    "LI",
    "MAIN",
    "NAV",
    "OL",
    "P",
    "PRE",
    "SECTION",
    "TABLE",
    "TR",
    "UL"
  ]);
  function validate(root, source = null, records) {
    const cache = root[$cache];
    let delay = false;
    if (records === void 0) {
      delay = true;
      records = root[$observer].takeRecords();
    }
    if (!invalidate2(root, cache, records)) {
      return false;
    }
    const oldValue = root[$value];
    const oldSelectionStart = root[$selectionStart];
    const value = root[$value] = getValue2(root, cache, oldValue);
    const selectionStart = getSelectionRange(root, cache).selectionStart;
    const hint = Math.min(oldSelectionStart, selectionStart);
    const edit = Edit.diff(oldValue, value, hint);
    const ev = new ContentEvent("contentchange", { detail: { edit, source } });
    if (delay) {
      Promise.resolve().then(() => root.dispatchEvent(ev));
    } else {
      root.dispatchEvent(ev);
    }
    return true;
  }
  function invalidate2(root, cache, records) {
    if (!cache.get(root)) {
      return true;
    }
    let invalid = false;
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      for (let j = 0; j < record.addedNodes.length; j++) {
        clear(record.addedNodes[j], cache);
      }
      for (let j = 0; j < record.removedNodes.length; j++) {
        clear(record.removedNodes[j], cache);
      }
      let node = record.target;
      if (node === root) {
        invalid = true;
        continue;
      } else if (!root.contains(node)) {
        clear(node, cache);
        continue;
      }
      for (; node !== root; node = node.parentNode) {
        if (!cache.has(node)) {
          break;
        }
        const info = cache.get(node);
        if (info) {
          info.flags &= ~IS_VALID;
        }
        invalid = true;
      }
    }
    if (invalid) {
      const info = cache.get(root);
      info.flags &= ~IS_VALID;
    }
    return invalid;
  }
  function getValue2(root, cache, oldContent) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let content = "";
    let hasNewline = false;
    let offset = 0;
    let oldIndex = 0;
    let relativeOldIndex = 0;
    let info = cache.get(root);
    if (info === void 0) {
      info = new NodeInfo(offset);
      cache.set(root, info);
    }
    const stack = [];
    for (let node = root, descending = true; node !== null; ) {
      while (descending && !(info.flags & IS_VALID)) {
        if (node.nodeType === Node.TEXT_NODE || node.hasAttribute("data-content")) {
          break;
        }
        const prependsNewline = !!offset && !hasNewline && isBlocklikeElement(node);
        if (prependsNewline) {
          content += NEWLINE;
          hasNewline = true;
          offset += NEWLINE.length;
          info.offset += NEWLINE.length;
          info.flags |= PREPENDS_NEWLINE;
        } else {
          info.flags &= ~PREPENDS_NEWLINE;
        }
        if (node = walker.firstChild()) {
          descending = true;
        } else {
          node = walker.currentNode;
          break;
        }
        stack.push({ relativeOldIndex, info });
        relativeOldIndex = oldIndex;
        offset = 0;
        info = cache.get(node);
        if (info === void 0) {
          info = new NodeInfo(offset);
          cache.set(node, info);
        } else {
          if (info.offset > 0) {
            oldIndex += info.offset;
          }
          info.offset = offset;
        }
      }
      if (info.flags & IS_VALID) {
        const length = info.size;
        if (oldIndex + info.size > oldContent.length) {
          throw new Error("String length mismatch");
        }
        const prependsNewline = !!offset && !hasNewline && isBlocklikeElement(node);
        if (prependsNewline) {
          content += NEWLINE;
          hasNewline = true;
          offset += NEWLINE.length;
          info.offset += NEWLINE.length;
          info.flags |= PREPENDS_NEWLINE;
        } else {
          info.flags &= ~PREPENDS_NEWLINE;
        }
        const oldContent1 = oldContent.slice(oldIndex, oldIndex + length);
        content += oldContent1;
        offset += length;
        oldIndex += length;
        if (oldContent1.length) {
          hasNewline = oldContent1.endsWith(NEWLINE);
        }
      } else {
        let appendsNewline = false;
        if (node.nodeType === Node.TEXT_NODE) {
          const content1 = node.data;
          content += content1;
          offset += content1.length;
          if (content1.length) {
            hasNewline = content1.endsWith(NEWLINE);
          }
        } else if (node.hasAttribute("data-content")) {
          const content1 = node.getAttribute("data-content") || "";
          content += content1;
          offset += content1.length;
          if (content1.length) {
            hasNewline = content1.endsWith(NEWLINE);
          }
        } else if (!hasNewline && isBlocklikeElement(node)) {
          content += NEWLINE;
          offset += NEWLINE.length;
          hasNewline = true;
          appendsNewline = true;
        } else if (node.nodeName === "BR") {
          content += NEWLINE;
          offset += NEWLINE.length;
          hasNewline = true;
        }
        info.size = offset - info.offset;
        info.flags |= IS_VALID;
        info.flags = appendsNewline ? info.flags | APPENDS_NEWLINE : info.flags & ~APPENDS_NEWLINE;
      }
      if (node = walker.nextSibling()) {
        descending = true;
        info = cache.get(node);
        if (info === void 0) {
          info = new NodeInfo(offset);
          cache.set(node, info);
        } else {
          const oldOffset = oldIndex - relativeOldIndex;
          if (info.offset > oldOffset) {
            oldIndex += info.offset - oldOffset;
          } else if (info.offset < oldOffset) {
            throw new Error("Offset is before old offset");
          }
          info.offset = offset;
        }
      } else {
        descending = false;
        if (walker.currentNode !== root) {
          if (!stack.length) {
            throw new Error("Stack is empty");
          }
          ({ relativeOldIndex, info } = stack.pop());
          offset = info.offset + offset;
          node = walker.parentNode();
        }
      }
    }
    return content;
  }
  function isBlocklikeElement(node) {
    return node.nodeType === Node.ELEMENT_NODE && BLOCKLIKE_ELEMENTS.has(node.nodeName);
  }
  function clear(parent, cache) {
    const walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let node = parent; node !== null; node = walker.nextNode()) {
      cache.delete(node);
    }
  }
  function indexAt(root, cache, node, offset) {
    if (node == null || !root.contains(node)) {
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
      const info = cache.get(node);
      index = offset + info.offset;
      node = node.parentNode;
    } else {
      if (offset <= 0) {
        index = 0;
      } else if (offset >= node.childNodes.length) {
        const info = cache.get(node);
        index = info.size;
        if (info.flags & APPENDS_NEWLINE) {
          index -= NEWLINE.length;
        }
      } else {
        let child = node.childNodes[offset];
        while (child !== null && !cache.has(child)) {
          child = child.previousSibling;
        }
        if (child === null) {
          index = 0;
        } else {
          node = child;
          const info = cache.get(node);
          index = info.flags & PREPENDS_NEWLINE ? -1 : 0;
        }
      }
    }
    for (; node !== root; node = node.parentNode) {
      const info = cache.get(node);
      index += info.offset;
    }
    return index;
  }
  function nodeOffsetAt(root, cache, index) {
    const [node, offset] = findNodeOffset(root, cache, index);
    if (node && node.nodeName === "BR") {
      return nodeOffsetFromChild(node);
    }
    return [node, offset];
  }
  function findNodeOffset(root, cache, index) {
    if (index < 0) {
      return [null, 0];
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let node2 = root; node2 !== null; ) {
      const info = cache.get(node2);
      if (info == null) {
        return nodeOffsetFromChild(node2, index > 0);
      } else if (info.flags & PREPENDS_NEWLINE) {
        index -= NEWLINE.length;
      }
      if (index < 0) {
        const previousSibling = walker.previousSibling();
        if (!previousSibling) {
          throw new Error("Previous sibling missing");
        }
        return [previousSibling, getNodeLength(previousSibling)];
      } else if (index === info.size && node2.nodeType === Node.TEXT_NODE) {
        return [node2, node2.data.length];
      } else if (index >= info.size) {
        index -= info.size;
        const nextSibling = walker.nextSibling();
        if (nextSibling === null) {
          if (node2 === root) {
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
  function getSelectionRange(root, cache) {
    const selection = window.getSelection();
    if (!selection) {
      return { selectionStart: 0, selectionEnd: 0, selectionDirection: "none" };
    }
    const { focusNode, focusOffset, anchorNode, anchorOffset, isCollapsed } = selection;
    const focus = Math.max(0, indexAt(root, cache, focusNode, focusOffset));
    const anchor = isCollapsed ? focus : Math.max(0, indexAt(root, cache, anchorNode, anchorOffset));
    return {
      selectionStart: Math.min(focus, anchor),
      selectionEnd: Math.max(focus, anchor),
      selectionDirection: focus < anchor ? "backward" : focus > anchor ? "forward" : "none"
    };
  }
  function setSelectionRange(root, cache, selectionStart, selectionEnd, selectionDirection) {
    const selection = window.getSelection();
    if (!selection) {
      return;
    }
    selectionStart = Math.max(0, selectionStart || 0);
    selectionEnd = Math.max(0, selectionEnd || 0);
    if (selectionEnd < selectionStart) {
      selectionStart = selectionEnd;
    }
    const [focusIndex, anchorIndex] = selectionDirection === "backward" ? [selectionStart, selectionEnd] : [selectionEnd, selectionStart];
    if (focusIndex === anchorIndex) {
      const [node, offset] = nodeOffsetAt(root, cache, focusIndex);
      selection.collapse(node, offset);
    } else {
      const [anchorNode, anchorOffset] = nodeOffsetAt(root, cache, anchorIndex);
      const [focusNode, focusOffset] = nodeOffsetAt(root, cache, focusIndex);
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

  // node_modules/@b9g/revise/keyer.js
  var Keyer = class {
    constructor() {
      this.nextKey = 0;
      this.keys = [];
    }
    keyAt(i) {
      if (typeof this.keys[i] === "undefined") {
        this.keys[i] = this.nextKey++;
      }
      return this.keys[i];
    }
    transform(edit) {
      const operations = edit.operations();
      for (let i = operations.length - 1; i >= 0; i--) {
        const op = operations[i];
        switch (op.type) {
          case "delete": {
            this.keys.splice(op.start + 1, op.end - op.start);
            break;
          }
          case "insert": {
            this.keys.length = Math.max(this.keys.length, op.start + 1);
            this.keys = this.keys.slice(0, op.start + 1).concat(new Array(op.value.length)).concat(this.keys.slice(op.start + 1));
            break;
          }
        }
      }
    }
  };

  // node_modules/@b9g/revise/history.js
  function isNoop(edit) {
    const operations = edit.operations();
    return operations.length === 1 && operations[0].type === "retain";
  }
  function isComplex(edit) {
    let count = 0;
    for (const op of edit.operations()) {
      if (op.type !== "retain") {
        count++;
        if (count > 1) {
          return true;
        }
      }
    }
    return false;
  }
  var EditHistory = class {
    constructor() {
      this.current = void 0;
      this.undoStack = [];
      this.redoStack = [];
    }
    checkpoint() {
      if (this.current) {
        this.undoStack.push(this.current);
        this.current = void 0;
      }
    }
    append(edit) {
      if (isNoop(edit)) {
        return;
      } else if (this.redoStack.length) {
        this.redoStack.length = 0;
      }
      if (this.current) {
        const oldEdit = this.current;
        if (!isComplex(oldEdit) && !isComplex(edit)) {
          this.current = oldEdit.compose(edit);
          return;
        } else {
          this.checkpoint();
        }
      }
      this.current = edit;
    }
    canUndo() {
      return !!(this.current || this.undoStack.length);
    }
    undo() {
      this.checkpoint();
      const edit = this.undoStack.pop();
      if (edit) {
        this.redoStack.push(edit);
        return edit.invert();
      }
    }
    canRedo() {
      return !!this.redoStack.length;
    }
    redo() {
      this.checkpoint();
      const edit = this.redoStack.pop();
      if (edit) {
        this.undoStack.push(edit);
        return edit;
      }
    }
  };

  // shared/prism.tsx
  var import_prismjs = __toModule(require_prism());

  // shared/contentarea.tsx
  function* ContentArea({ value, children, selectionRange, renderSource }) {
    let composing = false;
    this.addEventListener("compositionstart", () => {
      composing = true;
    });
    this.addEventListener("compositionend", () => {
      composing = false;
      Promise.resolve().then(() => this.refresh());
    });
    let oldSelectionRange;
    for ({
      value,
      children,
      selectionRange = oldSelectionRange,
      renderSource
    } of this) {
      this.flush((area2) => {
        if (typeof renderSource === "string") {
          area2.source(renderSource);
        }
        if (typeof value === "string" && value !== area2.value) {
          console.error(`Expected value ${JSON.stringify(value)} but received ${JSON.stringify(area2.value)} from the DOM`);
        }
        if (selectionRange) {
          area2.setSelectionRange(selectionRange.selectionStart, selectionRange.selectionEnd, selectionRange.selectionDirection);
        }
      });
      const area = yield /* @__PURE__ */ createElement("content-area", {
        "c-static": composing
      }, children);
      oldSelectionRange = area.getSelectionRange();
    }
  }

  // node_modules/sucrase/dist/index.mjs
  var import_CJSImportProcessor = __toModule(require_CJSImportProcessor());
  var import_computeSourceMap = __toModule(require_computeSourceMap());
  var import_HelperManager = __toModule(require_HelperManager());
  var import_identifyShadowedGlobals = __toModule(require_identifyShadowedGlobals());
  var import_NameManager = __toModule(require_NameManager());
  var import_Options = __toModule(require_Options());
  var import_parser = __toModule(require_parser());
  var import_TokenProcessor = __toModule(require_TokenProcessor());
  var import_RootTransformer = __toModule(require_RootTransformer());
  var import_formatTokens = __toModule(require_formatTokens());
  var import_getTSImportedNames = __toModule(require_getTSImportedNames());
  function transform(code, options) {
    (0, import_Options.validateOptions)(options);
    try {
      const sucraseContext = getSucraseContext(code, options);
      const transformer = new import_RootTransformer.default(sucraseContext, options.transforms, Boolean(options.enableLegacyBabel5ModuleInterop), options);
      let result = { code: transformer.transform() };
      if (options.sourceMapOptions) {
        if (!options.filePath) {
          throw new Error("filePath must be specified when generating a source map.");
        }
        result = {
          ...result,
          sourceMap: (0, import_computeSourceMap.default)(result.code, options.filePath, options.sourceMapOptions)
        };
      }
      return result;
    } catch (e) {
      if (options.filePath) {
        e.message = `Error transforming ${options.filePath}: ${e.message}`;
      }
      throw e;
    }
  }
  function getSucraseContext(code, options) {
    const isJSXEnabled = options.transforms.includes("jsx");
    const isTypeScriptEnabled = options.transforms.includes("typescript");
    const isFlowEnabled = options.transforms.includes("flow");
    const disableESTransforms = options.disableESTransforms === true;
    const file = (0, import_parser.parse)(code, isJSXEnabled, isTypeScriptEnabled, isFlowEnabled);
    const tokens = file.tokens;
    const scopes = file.scopes;
    const nameManager = new import_NameManager.default(code, tokens);
    const helperManager = new import_HelperManager.HelperManager(nameManager);
    const tokenProcessor = new import_TokenProcessor.default(code, tokens, isFlowEnabled, disableESTransforms, helperManager);
    const enableLegacyTypeScriptModuleInterop = Boolean(options.enableLegacyTypeScriptModuleInterop);
    let importProcessor = null;
    if (options.transforms.includes("imports")) {
      importProcessor = new import_CJSImportProcessor.default(nameManager, tokenProcessor, enableLegacyTypeScriptModuleInterop, options, options.transforms.includes("typescript"), helperManager);
      importProcessor.preprocessTokens();
      (0, import_identifyShadowedGlobals.default)(tokenProcessor, scopes, importProcessor.getGlobalNames());
      if (options.transforms.includes("typescript")) {
        importProcessor.pruneTypeOnlyImports();
      }
    } else if (options.transforms.includes("typescript")) {
      (0, import_identifyShadowedGlobals.default)(tokenProcessor, scopes, (0, import_getTSImportedNames.default)(tokenProcessor));
    }
    return { tokenProcessor, scopes, nameManager, importProcessor, helperManager };
  }

  // shared/prism.tsx
  function* Preview({ value }) {
    let iframe;
    for ({ value } of this) {
      this.flush(() => {
        const document1 = iframe.contentDocument;
        if (document1 == null) {
          return;
        }
        try {
          const parsed = transform(value, {
            transforms: ["jsx", "typescript"],
            jsxPragma: "createElement",
            jsxFragmentPragma: "''"
          });
          document1.write(`
					<style>
						body {
							color: #f5f9ff;
						}
					</style>
				`);
          document1.write(`<script type="module">${parsed.code}<\/script>`);
          document1.close();
        } catch (err) {
          console.error(err);
        }
      });
      yield /* @__PURE__ */ createElement("iframe", {
        class: "preview",
        "c-ref": (iframe1) => iframe = iframe1,
        src: "about:blank"
      });
    }
  }
  function* CodeBlock({ value, lang }) {
    let selectionRange;
    let area;
    let renderSource;
    const editHistory = new EditHistory();
    const keyer = new Keyer();
    let rest;
    {
      const i = lang.indexOf(" ");
      if (i === -1) {
        rest = "";
      } else {
        [lang, rest] = [lang.slice(0, i), lang.slice(i + 1)];
      }
    }
    const isLive = rest === "live";
    this.addEventListener("beforeinput", (ev) => {
      if (!isLive) {
        ev.preventDefault();
      }
    });
    this.addEventListener("contentchange", (ev) => {
      if (!isLive) {
        this.refresh();
        return;
      }
      const { edit, source } = ev.detail;
      keyer.transform(edit);
      if (source === "render") {
        return;
      } else if (source !== "history") {
        editHistory.append(edit);
      }
      value = ev.target.value;
      this.refresh();
    });
    this.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        let { value: value1, selectionStart: selectionStart1, selectionEnd } = area;
        if (selectionStart1 !== selectionEnd) {
          return;
        }
        const prev = value.slice(0, selectionStart1);
        const tabMatch = prev.match(/[\r\n]?([^\S\r\n]*).*$/);
        const prevMatch = prev.match(/({|\(|\[)([^\S\r\n]*)$/);
        if (prevMatch) {
          ev.preventDefault();
          const next = value1.slice(selectionStart1);
          const startBracket = prevMatch[1];
          const startWhitespace = prevMatch[2];
          let insertBefore = "\n";
          if (tabMatch) {
            insertBefore += tabMatch[1] + "  ";
          }
          let edit = Edit.build(value1, insertBefore, selectionStart1, selectionStart1 + startWhitespace.length);
          selectionStart1 -= startWhitespace.length;
          selectionStart1 += insertBefore.length;
          const closingMap = {
            "{": "}",
            "(": ")",
            "[": "]"
          };
          let closing = closingMap[startBracket];
          if (closing !== "}") {
            closing = "\\" + closing;
          }
          const nextMatch = next.match(new RegExp(String.raw`^([^\S\r\n]*)${closing}`));
          if (nextMatch) {
            const value2 = edit.apply(value1);
            const endWhitespace = nextMatch[1];
            const insertAfter = tabMatch ? "\n" + tabMatch[1] : "\n";
            const edit1 = Edit.build(value2, insertAfter, selectionStart1, selectionStart1 + endWhitespace.length);
            edit = edit.compose(edit1);
          }
          value = edit.apply(value1);
          selectionRange = {
            selectionStart: selectionStart1,
            selectionEnd: selectionStart1,
            selectionDirection: "none"
          };
          this.refresh();
        } else if (tabMatch && tabMatch[1].length) {
          ev.preventDefault();
          const insertBefore = "\n" + tabMatch[1];
          const edit = Edit.build(value1, insertBefore, selectionStart1);
          value = edit.apply(value1);
          selectionRange = {
            selectionStart: selectionStart1 + insertBefore.length,
            selectionEnd: selectionStart1 + insertBefore.length,
            selectionDirection: "none"
          };
          this.refresh();
        }
      }
    });
    this.addEventListener("beforeinput", (ev) => {
      switch (ev.inputType) {
        case "historyUndo": {
          ev.preventDefault();
          const edit = editHistory.undo();
          if (edit) {
            selectionRange = selectionRangeFromEdit(edit);
            value = edit.apply(value);
            renderSource = "history";
            this.refresh();
          }
          break;
        }
        case "historyRedo": {
          ev.preventDefault();
          const edit = editHistory.redo();
          if (edit) {
            value = edit.apply(value);
            selectionRange = selectionRangeFromEdit(edit);
            renderSource = "history";
            this.refresh();
          }
          break;
        }
      }
    });
    checkpointEditHistoryBySelection(this, editHistory);
    for ({ lang } of this) {
      this.schedule(() => {
        selectionRange = void 0;
        renderSource = void 0;
      });
      value = value.match(/(?:\r|\n|\r\n)$/) ? value : value + "\n";
      let rest2;
      {
        const i = lang.indexOf(" ");
        if (i === -1) {
          rest2 = "";
        } else {
          [lang, rest2] = [lang.slice(0, i), lang.slice(i + 1)];
        }
      }
      const grammar = import_prismjs.default.languages[lang];
      let lines;
      if (grammar == null) {
        lines = [];
      } else {
        lines = splitLines(import_prismjs.default.tokenize(value || "", grammar));
      }
      const isClient = typeof document !== "undefined";
      const isLive2 = rest2 === "live";
      let cursor = 0;
      let className = "editable";
      if (isLive2) {
        className += " editable-live";
      }
      yield /* @__PURE__ */ createElement("div", {
        class: "playground"
      }, /* @__PURE__ */ createElement(ContentArea, {
        "c-ref": (area1) => area = area1,
        value,
        renderSource,
        selectionRange
      }, /* @__PURE__ */ createElement("pre", {
        class: className,
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        spellcheck: "false",
        contenteditable: isClient && isLive2
      }, lines.map((line) => {
        const key = keyer.keyAt(cursor);
        const length = line.reduce((l, t) => l + t.length, 0);
        cursor += length + 1;
        return /* @__PURE__ */ createElement("div", {
          "c-key": key
        }, /* @__PURE__ */ createElement("code", null, printTokens(line)), /* @__PURE__ */ createElement("br", null));
      }))), typeof document !== "undefined" && rest2 === "live" && /* @__PURE__ */ createElement(Preview, {
        value
      }));
    }
  }
  import_prismjs.default.manual = true;
  function splitLinesRec(tokens) {
    let currentLine = [];
    const lines = [currentLine];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (typeof token === "string") {
        const split = token.split(/\r\n|\r|\n/);
        for (let j = 0; j < split.length; j++) {
          if (j > 0) {
            lines.push(currentLine = []);
          }
          const token1 = split[j];
          if (token1) {
            currentLine.push(token1);
          }
        }
      } else {
        const split = splitLinesRec(wrapContent(token.content));
        if (split.length > 1) {
          for (let j = 0; j < split.length; j++) {
            if (j > 0) {
              lines.push(currentLine = []);
            }
            const line = split[j];
            if (line.length) {
              const token1 = new import_prismjs.default.Token(token.type, unwrapContent(line), token.alias);
              token1.length = line.reduce((l, t) => l + t.length, 0);
              currentLine.push(token1);
            }
          }
        } else {
          currentLine.push(token);
        }
      }
    }
    return lines;
  }
  function wrapContent(content) {
    return Array.isArray(content) ? content : [content];
  }
  function unwrapContent(content) {
    if (content.length === 0) {
      return "";
    } else if (content.length === 1 && typeof content[0] === "string") {
      return content[0];
    }
    return content;
  }
  function splitLines(tokens) {
    const lines = splitLinesRec(tokens);
    if (lines.length && !lines[lines.length - 1].length) {
      lines.pop();
    }
    return lines;
  }
  function printTokens(tokens) {
    const result = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (typeof token === "string") {
        result.push(token);
      } else {
        const children = Array.isArray(token.content) ? printTokens(token.content) : token.content;
        let className = "token " + token.type;
        if (Array.isArray(token.alias)) {
          className += " " + token.alias.join(" ");
        } else if (typeof token.alias === "string") {
          className += " " + token.alias;
        }
        result.push(/* @__PURE__ */ createElement("span", {
          class: className
        }, children));
      }
    }
    return result;
  }
  function checkpointEditHistoryBySelection(ctx, editHistory) {
    let oldSelectionRange;
    let area;
    ctx.addEventListener("contentchange", () => {
      oldSelectionRange = area.getSelectionRange();
    });
    const onselectionchange = () => {
      if (!area) {
        return;
      }
      const newSelectionRange = area.getSelectionRange();
      if (oldSelectionRange && (oldSelectionRange.selectionStart !== newSelectionRange.selectionStart || oldSelectionRange.selectionEnd !== newSelectionRange.selectionEnd || oldSelectionRange.selectionDirection !== newSelectionRange.selectionDirection)) {
        editHistory.checkpoint();
      }
      oldSelectionRange = newSelectionRange;
    };
    ctx.schedule((el) => {
      if (typeof document !== "undefined") {
        area = el.querySelector("content-area");
      }
    });
    if (typeof document !== "undefined") {
      document.addEventListener("selectionchange", onselectionchange);
      ctx.cleanup(() => {
        document.removeEventListener("selectionchange", onselectionchange);
      });
    }
  }
  function selectionRangeFromEdit(edit) {
    const operations = edit.operations();
    let index = 0;
    let start;
    let end;
    for (const op of operations) {
      switch (op.type) {
        case "delete": {
          if (start === void 0) {
            start = index;
          }
          break;
        }
        case "insert": {
          if (start === void 0) {
            start = index;
          }
          index += op.value.length;
          end = index;
          break;
        }
        case "retain": {
          index += op.end - op.start;
          break;
        }
      }
    }
    if (start !== void 0 && end !== void 0) {
      return {
        selectionStart: start,
        selectionEnd: end,
        selectionDirection: "forward"
      };
    } else if (start !== void 0) {
      return {
        selectionStart: start,
        selectionEnd: start,
        selectionDirection: "none"
      };
    }
    return void 0;
  }

  // client/index.tsx
  import_prismjs2.default.manual = true;
  if (!window.customElements.get("content-area")) {
    window.customElements.define("content-area", ContentAreaElement);
  }
  for (const el of Array.from(document.querySelectorAll(".codeblock"))) {
    const { code, lang } = el.dataset;
    if (code != null && lang != null) {
      renderer.render(/* @__PURE__ */ createElement(CodeBlock, {
        value: code,
        lang
      }), el);
    }
  }
})();
/**
 * Prism: Lightweight, robust, elegant syntax highlighting
 *
 * @license MIT <https://opensource.org/licenses/MIT>
 * @author Lea Verou <https://lea.verou.me>
 * @namespace
 * @public
 */
//# sourceMappingURL=index-FZKVRLRI.js.map
