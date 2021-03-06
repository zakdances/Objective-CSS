(function () {
  'use strict';
  angular.module('ParsePartyApp.controllers').controller('MyCtrl1', [
    '$',
    '$q',
    'jsBridge',
    'cm1',
    'CMOperation',
    'CMModeOp',
    'CMRangeOp',
    'CMSelectedRangesOp',
    'CMDocLengthOp',
    'cm1OpsQueue',
    'cm1Repo',
    function ($, $q, jsBridge, cm1, CMOperation, CMModeOp, CMRangeOp, CMSelectedRangesOp, CMDocLengthOp, cm1OpsQueue, cm1Repo) {
      cm1.ready.then(function () {
        var logRequestsDEBUG, _this = this;
        jsBridge.registerHandler('request', function (data, callback) {
          return function (rqOpsj) {
            var e;
            if (!data.request && !data.requests) {
              throw function (error) {
                callback(error);
                return error;
              }('ERROR: No requests specified.');
            }
            if (data.request) {
              rqOpsj = rqOpsj.concat(data.request);
            }
            if (data.requests) {
              rqOpsj = rqOpsj.concat(data.requests);
            }
            jsBridge.send('registerHandler requests(' + rqOpsj.length + '): ' + JSON.stringify(rqOpsj));
            jsBridge.send('Beginning the loop...');
            try {
              (function (rqOps) {
                return rqOpsj.every(function (opj, idx, arr) {
                  return function (type, cid, prevOp, nextOp, prevOpCID, nextOpCID, op, checkRepoOp, commitToRepoOp, callbackOp, c) {
                    var e;
                    try {
                      jsBridge.send('Found request for ' + type + '. Processing...');
                      prevOpCID = prevOp && prevOp.commit ? prevOp.commit.id : null;
                      nextOpCID = nextOp && nextOp.commit ? nextOp.commit.id : null;
                      c.source = 'ParseParty';
                      switch (type) {
                      case 'tokenize':
                        op = new CMTokenizeOP(cm1);
                        break;
                      case 'parse':
                        op = new CMParseRangeOp(cm1);
                        opj.commit || (opj.commit = c);
                        break;
                      case 'range':
                        op = new CMRangeOp(cm1);
                        if (opj.string != null) {
                          opj.commit || (opj.commit = c);
                        }
                        break;
                      case 'cursor':
                        throw 'This feature (cursor) is not yet implimented. It might not ever be. Use selectedRanges instead.';
                        break;
                      case 'selectedRanges':
                        op = new CMSelectedRangesOp(cm1);
                        if (opj.range || opj.ranges) {
                          opj.commit || (opj.commit = c);
                        }
                        break;
                      case 'mode':
                        op = new CMModeOp(cm1);
                        break;
                      case 'docLength':
                        op = new CMDocLengthOp(cm1);
                      }
                      if (op) {
                        rqOps.push(op);
                        cid = opj.commit ? opj.commit.id : null;
                        if (cid != null) {
                          if (cid !== prevOpCID) {
                            checkRepoOp = new CMOperation(cm1, 'checkRepo');
                            checkRepoOp.p = checkRepoOp.p.then(function (cid) {
                              var e;
                              try {
                                jsBridge.send('*** Checking for duplicate commits with ID: ' + cid + '...***');
                                if (cm1Repo.getChangeOrCommit(cid)) {
                                  throw '*** Change is already commited to the repo! Abandoning. ***';
                                }
                                jsBridge.send('*** No duplicate changes/commits found in the repo. ***');
                              } catch (_error) {
                                e = _error;
                                return CMOperation.errorPromise(e);
                              }
                              return true;
                            });
                            (function (cro, cid) {
                              return cm1OpsQueue.swapOut(cro)['finally'](function () {
                                cro._d.resolve(cid);
                              });
                            }(checkRepoOp, cid));
                          }
                          (function (op, opj) {
                            return cm1OpsQueue.swapOut(op).then(function () {
                              op._d.resolve(opj);
                            }, function (e) {
                              jsBridge.send('Op rejected correctly');
                              op._d.reject(e);
                              return e;
                            });
                          }(op, opj));
                        } else {
                          (function (op, opj) {
                            return cm1OpsQueue.swapOut(op)['finally'](function () {
                              op._d.resolve(opj);
                            });
                          }(op, opj));
                        }
                        if (cid != null && cid !== nextOpCID) {
                          commitToRepoOp = new CMOperation(cm1, 'commitToRepo');
                          commitToRepoOp.p = commitToRepoOp.p.then(function (_arg) {
                            var cid, e;
                            cid = _arg.commit.id;
                            try {
                              jsBridge.send('Pushing commit with ID: ' + cid);
                              return cm1Repo.addAndCommit(new MGITCommit(cid));
                            } catch (_error) {
                              e = _error;
                              return CMOperation.errorPromise(e);
                            }
                          });
                          (function (ctro, opj) {
                            return cm1OpsQueue.swapOut(ctro).then(function () {
                              jsBridge.send('commitToRepoOp resolved. All systems go.');
                              ctro._d.resolve(opj);
                            }, function (e) {
                              jsBridge.send('commitToRepoOp rejected correctly');
                              ctro._d.reject(e);
                              return e;
                            });
                          }(commitToRepoOp, opj));
                        }
                        if (idx === arr.length - 1) {
                          callbackOp = new CMOperation(cm1);
                          callbackOp.type = function () {
                            return 'callbackOp';
                          };
                          callbackOp.p = function (rqOps, d) {
                            return callbackOp.p.then(function () {
                              var e;
                              try {
                                rqOps = rqOps.map(function (op, idx, arr) {
                                  return function (d) {
                                    return op.p.then(function (data) {
                                      var k, v;
                                      for (k in data) {
                                        v = data[k];
                                        d[k] = v;
                                      }
                                      return d;
                                    }, function (error) {
                                      d.type || (d.type = op.type());
                                      d.error = error;
                                    })['finally'](function () {
                                    }).then(function () {
                                      return d;
                                    });
                                  }({});
                                });
                                (function (data) {
                                  return $q.all(rqOps).then(function (da) {
                                    data.requests = da;
                                    logRequestsDEBUG('registerHandler response: ', data);
                                    d.resolve(callback(data));
                                  });
                                }({}));
                              } catch (_error) {
                                e = _error;
                                return CMOperation.errorPromise(e);
                              }
                              return d.promise;
                            }, function (e) {
                              data = {};
                              data.e = e;
                              data.requests = rqOps.map(function (op) {
                                return {
                                  type: op.type,
                                  error: e
                                };
                              });
                              callback(data);
                              return error;
                            });
                          }(rqOps, $q.defer());
                          cm1OpsQueue.swapOut(callbackOp)['finally'](function () {
                            callbackOp._d.resolve();
                          });
                        }
                      }
                    } catch (_error) {
                      e = _error;
                      jsBridge.send(String(e));
                    }
                    return true;
                  }(opj.type, null, arr[idx - 1], arr[idx + 1], null, null, null, null, null, null, new MGITCommit());
                });
              }([]));
            } catch (_error) {
              e = _error;
              jsBridge.send(String(e));
              callback(String(e));
              throw String(e);
            }
          }([]);
        });
        $('html, body, .ng-view').css({
          'width': '100%',
          'height': '100%',
          'padding': '0',
          'margin': '0'
        });
        logRequestsDEBUG = function (label, data, string) {
          var op, _i, _len, _ref;
          if (string == null) {
            string = '';
          }
          _ref = data.requests;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            op = _ref[_i];
            if (op._type === 'parse') {
              string = string + op.toJSON().tokens.length + ' tokens.\n';
            } else {
              string = string + JSON.stringify(op) + '\n';
            }
          }
          if (string.length > 0) {
            jsBridge.send(label + ' ' + string);
          }
        };
        cm1.signals.change['else']().then(function (args) {
          var change, cm, e, rop;
          cm = args.cm;
          change = args.change;
          jsBridge.send('change else -> -> -> ' + JSON.stringify(cm1.doc.getValue().length));
          return;
          try {
            rop = new CMRangeOp(cm1);
            rop.run = function () {
              var data;
              data = {};
              data.type = rop._type;
              data.string = change.text.join('\n');
              data.oldString = change.removed.join('\n');
              data.range = new CSRange(cm.doc.indexFromPos(change.from), data.string.length);
              rop._postData.resolve(data);
            };
            rop._done = $q.defer();
            rop.done().then(function (rop) {
              var data;
              data = {};
              data.requests = [].concat(rop);
              logRequestsDEBUG('callHandler outgoing ops: ', data);
              jsBridge.callHandler('action', data, function () {
                rop._done.resolve(rop);
              });
            });
            cm1OpsQueue.addOp(rop);
          } catch (_error) {
            e = _error;
            jsBridge.send(String(e));
          }
        });
        cm1.signals.cursorActivity['else']().then(function (args) {
          var callbackOp, cursorActivity, e, h, oldRanges, ranges;
          try {
            jsBridge.send('cursorActivity else -> -> -> ' + cm1.doc.getValue().length + ' ' + JSON.stringify(args.cursorActivity));
            cursorActivity = args.cursorActivity;
            if (cursorActivity) {
              ranges = cursorActivity.ranges;
            }
            if (cursorActivity) {
              oldRanges = cursorActivity.oldRanges;
            }
            return;
            if (ranges && oldRanges) {
              (function (data, sop) {
                return sop.p = sop.p.then(function () {
                  data.type = sop.type();
                  data.ranges = ranges;
                  data.oldRanges = oldRanges;
                  sop._done.resolve(data);
                });
              }({}, new CMSelectedRangesOp(cm1)));
              (function (commitOp, commit) {
                var cod;
                commitOp.run = function () {
                  var e;
                  try {
                    cm1Repo.addAndCommit(commit);
                  } catch (_error) {
                    e = _error;
                    jsBridge.send(String(e));
                  }
                  commitOp._done.resolve();
                };
                cod = $q.all([
                  commitOp.done(),
                  sop.done()
                ]);
                commitOp.done = function () {
                  return cod;
                };
              }(new CMOperation(cm1), new MGITCommit()));
              sop.done().then(function () {
                commitOp.run();
              });
              callbackOp = new CMOperation(cm1);
              callbackOp.run = function (data) {
                logRequestsDEBUG('callHandler outgoing ops: ', data);
                jsBridge.callHandler('action', data, function () {
                  callbackOp._done.resolve(true);
                });
              };
              $q.all([
                sop.done(),
                commitOp.done()
              ]).then(function (args) {
                callbackOp.run(args[0]);
              });
              h = cm1OpsQueue.hook();
              cm1OpsQueue.addOp([
                sop,
                commitOp,
                callbackOp
              ]);
              h['finally'](function () {
                sop.run();
              });
            }
          } catch (_error) {
            e = _error;
            jsBridge.send(String(e));
          }
        });
        cm1.signals.cursorActivity.s().then(function (args) {
        });
        jsBridge.send('calling ready...');
        jsBridge.send('readyy');
        jsBridge.send('Ready called!');
      });
    }
  ]).constant('routes', [{
      controller: 'MyCtrl1',
      resolve: {
        jsBridge: function (jsBridge) {
          return jsBridge;
        },
        JQueryReady: function (JQueryReady) {
          return JQueryReady;
        }
      }
    }]);
}.call(this));