(function () {
  'use strict';
  angular.module('ParsePartyApp.services').factory('CodeMirrorWrapper', [
    '$',
    '$q',
    'Counter',
    'jsBridge',
    function ($, $q, Counter, jsBridge) {
      var CSSignal, CodeMirrorWrapperr;
      $(function () {
        $.Color.fn.toJSON = function () {
          var rgba;
          rgba = this.rgba();
          return {
            r: rgba[0],
            g: rgba[1],
            b: rgba[2],
            a: rgba[3]
          };
        };
      });
      CSSignal = function () {
        function CSSignal(name) {
          this.ds = [];
          this._subscribers = [];
          this._name = name;
          this._mainD = null;
        }
        CSSignal.prototype._nextsForDeferred = function (d) {
          var w, _this = this;
          w = this._subscribers.filter(function (sub) {
            if (sub.sFilter === 'next' && sub.d === d) {
              return true;
            } else {
              return false;
            }
          });
          return w;
        };
        CSSignal.prototype._fireElses = function (d) {
          var e, ns, _i, _len, _ref, _this = this;
          ns = this._nextsForDeferred(d);
          if (ns.length === 0) {
            _ref = this._subscribers.filter(function (sub) {
              if (sub.sFilter === 'else') {
                return true;
              } else {
                return false;
              }
            });
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              e = _ref[_i];
              d.promise.then(e.callback);
            }
          }
        };
        CSSignal.prototype._addSubscriber = function (callback, sFilter) {
          var d, data, e, validDs, _i, _len, _ref, _this = this;
          try {
            data = {};
            data.callback = callback;
            data.sFilter = function () {
              if (sFilter) {
                return sFilter;
              } else {
                throw 'ERROR: sFilter value ' + JSON.stringify(sFilter) + ' is not valid.';
              }
            }();
            if (sFilter === 'signal') {
              this._d();
            } else if (sFilter === 'next') {
              validDs = [];
              _ref = this.ds;
              for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                d = _ref[_i];
                if (this._nextsForDeferred(d).length === 0) {
                  validDs.push(d);
                }
              }
              d = validDs.length > 0 ? validDs[0] : this._d($q.defer());
              d.promise.then(callback);
              data.d = d;
            }
            this._subscribers.push(data);
          } catch (_error) {
            e = _error;
            jsBridge.then(function (jsBridge) {
              jsBridge.send(String(e));
            });
          }
          return this.p();
        };
        CSSignal.prototype._d = function (newD) {
          var d, ds, e, _this = this;
          try {
            ds = this.ds;
            if (newD) {
              ds.push(newD);
            }
            if (ds.length === 0) {
              ds.push($q.defer());
            }
            d = ds[0];
            if (!this._mainD || this._mainD !== d) {
              this._mainD = d;
              this._setupD(d);
            }
          } catch (_error) {
            e = _error;
            jsBridge.then(function (jsBridge) {
              jsBridge.send(String(e));
            });
          }
          return newD != null ? newD : d;
        };
        CSSignal.prototype._setupD = function (d) {
          var _this = this;
          d.promise.then(function () {
            var s, subscribedSignals, _i, _len;
            _this._fireElses(d);
            subscribedSignals = _this._subscribers.filter(function (sub) {
              if (sub.sFilter === 'signal') {
                return true;
              } else {
                return false;
              }
            });
            for (_i = 0, _len = subscribedSignals.length; _i < _len; _i++) {
              s = subscribedSignals[_i];
              d.promise.then(s.callback);
            }
          });
          d.promise['finally'](function () {
            var i, s, _i, _len, _ref;
            _ref = _this._nextsForDeferred(d);
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              s = _ref[_i];
              s.d = null;
              i = _this._subscribers.indexOf(s);
              if (i !== -1) {
                _this._subscribers.splice(i, 1);
              }
            }
            i = _this.ds.indexOf(d);
            if (i !== -1) {
              _this.ds.splice(i, 1);
            }
          });
        };
        CSSignal.prototype.p = function () {
          return this._d().promise;
        };
        CSSignal.prototype.s = function () {
          return this._newProxyPromise('signal');
        };
        CSSignal.prototype.next = function () {
          return this._newProxyPromise('next');
        };
        CSSignal.prototype['else'] = function () {
          return this._newProxyPromise('else');
        };
        CSSignal.prototype._newProxyPromise = function (label) {
          var data, _this = this;
          data = {};
          data.then = function (callback) {
            _this._addSubscriber(callback, label);
            return data;
          };
          return data;
        };
        return CSSignal;
      }();
      CodeMirrorWrapperr = function () {
        function CodeMirrorWrapperr(args) {
          var _ref;
          if (args == null) {
            args = {};
          }
          this.CodeMirror = (_ref = args.CodeMirror) != null ? _ref : CodeMirror;
          this._cm = null;
          this.doc = null;
          this.display = null;
          this._selectedRanges = null;
          this._changeObj = null;
          this._proxyListeners = [];
          this._listeners = [];
          this.signals = {};
          this.signals.change = new CSSignal('change');
          this.signals.cursorActivity = new CSSignal('cursorActivity');
          if (args.com) {
            this.cm(args.cm);
          }
        }
        CodeMirrorWrapperr.prototype.cm = function (cm) {
          var beforeSC, cA, cha, _this = this;
          if (cm && cm !== this._cm) {
            this._cm = cm;
            this.doc = this._cm.doc;
            this.display = this._cm.display;
            beforeSC = 'beforeSelectionChange';
            cA = 'cursorActivity';
            cha = 'change';
            this.on(beforeSC, function (cm, selection) {
              _this._selectedRanges = _this.selectedRanges();
            });
            this.on(cA, function (cm) {
              var cAData, data, selectedRanges;
              data = {};
              data.cm = _this;
              if (_this._changeObj) {
                data.change = _this._changeObj;
              }
              selectedRanges = _this.selectedRanges();
              if (_this._selectedRanges && !_this.constructor.areSelectedRangesEqual(selectedRanges, _this._selectedRanges)) {
                cAData = {};
                cAData.ranges = selectedRanges;
                cAData.oldRanges = _this._selectedRanges;
                data.cursorActivity = cAData;
              }
              _this._selectedRanges = null;
              _this._changeObj = null;
              _this.signals.cursorActivity._d().resolve(data);
            });
            this.on(cha, function (cm, change) {
              var data;
              _this._changeObj = change;
              data = {};
              data.cm = _this;
              data.change = change;
              _this.signals.change._d().resolve(data);
            });
          }
          return this._cm;
        };
        CodeMirrorWrapperr.prototype.getTokenAt = function (position, precise) {
          if (precise == null) {
            precise = { precise: false };
          }
          return this._cm.getTokenAt(position, precise);
        };
        CodeMirrorWrapperr.prototype.getMode = function () {
          return this._cm.getMode();
        };
        CodeMirrorWrapperr.prototype.setOption = function (option, val) {
          return this._cm.setOption(option, val);
        };
        CodeMirrorWrapperr.prototype.on = function (event, callback) {
          return this._cm.on(event, callback);
        };
        CodeMirrorWrapperr.prototype.operation = function (funct) {
          return this._cm.operation(funct);
        };
        CodeMirrorWrapperr.prototype.getRange = function (range, seperator) {
          return this.constructor.getRange(this, range, seperator);
        };
        CodeMirrorWrapperr.getRange = function (cm, range, seperator) {
          var end, start;
          start = cm.doc.posFromIndex(range.location);
          end = cm.doc.posFromIndex(range.maxEdge());
          if (seperator != null) {
            return cm.doc.getRange(start, end, seperator);
          } else {
            return cm.doc.getRange(start, end);
          }
        };
        CodeMirrorWrapperr.prototype.tokenize = function (string, mode) {
          var tokens;
          tokens = [];
          this.CodeMirror.runMode(string, mode, function (text, styleClass, state) {
            tokens.push({
              text: text,
              styleClass: styleClass,
              state: state
            });
          });
          return tokens;
        };
        CodeMirrorWrapperr.prototype.parse = function (range) {
          return this.constructor.parse(this, range);
        };
        CodeMirrorWrapperr.parse = function (cm, range) {
          var cssData, gr, t, tokens, totalGlobalRange, _i, _len, _this = this;
          tokens = [];
          cssData = [];
          cm._parseLoop(range, function (pos, token) {
            var key, tokenCSSData, tsl, _i, _len, _ref;
            tsl = token.string.length;
            tokenCSSData = _this.tokenCSSData(token);
            token.globalRange = new CSRange(cm.doc.indexFromPos({
              line: pos.line,
              ch: token.start
            }), tsl);
            _ref = [
              'classes',
              'color'
            ];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              key = _ref[_i];
              if (token[key] != null) {
                jsBridge.then(function (jsBridge) {
                  jsBridge.send('WARNING: Token key "' + JSON.stringify(key) + '" already exists, and will be overwritten. That should never happen. Fix your key names.');
                });
              }
            }
            if (tokenCSSData) {
              if (tokenCSSData.classes != null) {
                token.classes = tokenCSSData.classes;
              }
              if (tokenCSSData.properties.color != null) {
                token.color = tokenCSSData.properties.color;
              }
            }
            if (tokenCSSData != null && Object.keys(tokenCSSData.properties).length > 0) {
              cssData.push(tokenCSSData);
            }
            tokens.push(token);
          });
          totalGlobalRange = this.globalRangeOfTokens(tokens);
          for (_i = 0, _len = tokens.length; _i < _len; _i++) {
            t = tokens[_i];
            gr = t.globalRange;
            t.localRange = new CSRange(gr.location - totalGlobalRange.location, gr.length);
          }
          return tokens;
        };
        CodeMirrorWrapperr.prototype._parseLoop = function (range, callback) {
          var end, i, index, maxEdge, pos, token, tsl;
          i = range.location + 1;
          end = range.length > 0 ? range.maxEdge() + 1 : range.maxEdge() + 2;
          while (i < end) {
            pos = this.doc.posFromIndex(c.i);
            token = this.getTokenAt(pos, { precise: true });
            tsl = token.string.length;
            index = this.doc.indexFromPos({
              line: pos.line,
              ch: token.start
            });
            maxEdge = index + tsl;
            callback(pos, token);
            i = maxEdge + 1 > i ? maxEdge + 1 : i + 1;
          }
        };
        CodeMirrorWrapperr.globalRangeOfTokens = function (tokens) {
          var end, globalLocations, globalMaxEdges, start, t;
          t = [].concat(tokens);
          globalLocations = t.map(function (t) {
            return t.globalRange.location;
          });
          globalMaxEdges = t.map(function (t) {
            return t.globalRange.maxEdge();
          });
          globalLocations.sort(function (a, b) {
            return a - b;
          });
          globalMaxEdges.sort(function (a, b) {
            return b - a;
          });
          start = globalLocations[0];
          end = globalMaxEdges[0];
          return new CSRange(start, end - start);
        };
        CodeMirrorWrapperr.prototype.replaceCharacters = function (args) {
          if (args == null) {
            args = {
              string: null,
              range: null,
              event: null
            };
          }
          args.cm = this;
          return this.constructor.replaceCharacters(args);
        };
        CodeMirrorWrapperr.replaceCharacters = function (args) {
          var cm, e, endPos, r, s, startPos;
          if (args == null) {
            args = {
              cm: null,
              string: null,
              range: null,
              event: null
            };
          }
          cm = args.cm;
          s = args.string;
          r = args.range;
          e = args.event;
          startPos = cm.doc.posFromIndex(r.location);
          endPos = cm.doc.posFromIndex(r.maxEdge());
          jsBridge.then(function (jsBridge) {
            if (e === 'keypress') {
              jsBridge.send('keypress');
            }
          });
          return cm.doc.replaceRange(s, startPos, endPos);
        };
        CodeMirrorWrapperr.prototype.cursor = function (context) {
          if (context == null) {
            context = null;
          }
          return this.constructor.cursor(this, context);
        };
        CodeMirrorWrapperr.cursor = function (cm, context) {
          var point, pos;
          if (context == null) {
            context = null;
          }
          pos = context ? cm.doc.getCursor(context) : cm.doc.getCursor();
          point = {};
          point.pos = pos;
          point.line = pos.line;
          point.ch = pos.ch;
          point.location = cm.doc.indexFromPos(pos);
          point.index = point.location;
          return point;
        };
        CodeMirrorWrapperr.prototype.selectedRanges = function (selectedRanges) {
          return this.constructor.selectedRanges(this, selectedRanges);
        };
        CodeMirrorWrapperr.selectedRanges = function (cm, selectedRanges) {
          var affinity, anchorPos, cursorAnchor, cursorEnd, cursorHead, cursorStart, direction, end, headPos, r, rs, start;
          rs = selectedRanges ? [].concat(selectedRanges) : null;
          if (rs && rs.length > 0) {
            r = rs[0];
            start = cm.doc.posFromIndex(r.location);
            end = cm.doc.posFromIndex(r.maxEdge());
            anchorPos = start;
            headPos = anchorPos;
            direction = function () {
              if (r.direction === 'up' || r.direction === 'down') {
                return r.direction;
              } else {
                throw 'ERROR: Invalid direction value ' + r.direction + '.';
              }
            }();
            if (r.length > 0) {
              anchorPos = direction === 'down' ? start : end;
              headPos = direction === 'up' ? start : end;
            }
            cm.doc.setSelection(anchorPos, headPos);
          }
          rs = [];
          cursorHead = cm.cursor().index;
          cursorAnchor = cm.cursor('anchor').index;
          cursorStart = cm.cursor('start').index;
          cursorEnd = cm.cursor('end').index;
          affinity = cursorAnchor < cursorHead ? 'down' : 'up';
          r = new CSRange({
            location: cursorStart,
            length: cursorEnd - cursorStart,
            attributes: { affinity: affinity }
          });
          rs.push(r);
          return rs;
        };
        CodeMirrorWrapperr.bodyCSSData = function () {
          var el;
          el = $('body');
          return {
            tag: 'body',
            properties: { color: $.Color(el, 'color').toJSON() }
          };
        };
        CodeMirrorWrapperr.tokenCSSData = function (token) {
          var className, classNames, classes, data, el, _i, _len, _ref;
          classNames = token.className;
          data = {};
          data.classes = [];
          data.properties = {};
          if (classNames != null) {
            _ref = classNames.split(' ');
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              className = _ref[_i];
              data.classes.push('cm-' + className);
            }
          }
          if (data.classes.length > 0) {
            classes = data.classes.map(function (cssC) {
              return '.' + cssC;
            });
            el = $(classes.join(' '));
            data.properties.color = $.Color(el, 'color').toJSON();
          }
          return data;
        };
        CodeMirrorWrapperr.areSelectedRangesEqual = function (ranges1, ranges2) {
          var idx, range1, range2, sameDirection, sameLength, sameLocation, _i, _ref;
          ranges1 = [].concat(ranges1);
          ranges2 = [].concat(ranges2);
          if (ranges1.length !== ranges2.length || ranges1.length === 0) {
            return false;
          }
          for (idx = _i = 0, _ref = ranges1.length; 0 <= _ref ? _i < _ref : _i > _ref; idx = 0 <= _ref ? ++_i : --_i) {
            range1 = ranges1[idx];
            range2 = ranges2[idx];
            sameLocation = range1.location === range2.location ? true : false;
            sameLength = range1.length === range2.length ? true : false;
            sameDirection = range1.direction === range2.direction ? true : false;
            if (!sameLocation || !sameLength || !sameDirection) {
              return false;
            }
          }
          return true;
        };
        return CodeMirrorWrapperr;
      }();
      return CodeMirrorWrapperr;
    }
  ]);
}.call(this));