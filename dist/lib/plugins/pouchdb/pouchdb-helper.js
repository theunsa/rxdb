"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.POUCH_HASH_KEY = exports.POUCHDB_LOCAL_PREFIX = exports.POUCHDB_DESIGN_PREFIX = exports.OPEN_POUCHDB_STORAGE_INSTANCES = void 0;
exports.getEventKey = getEventKey;
exports.pouchChangeRowToChangeEvent = pouchChangeRowToChangeEvent;
exports.pouchChangeRowToChangeStreamEvent = pouchChangeRowToChangeStreamEvent;
exports.pouchDocumentDataToRxDocumentData = pouchDocumentDataToRxDocumentData;
exports.pouchHash = pouchHash;
exports.pouchStripLocalFlagFromPrimary = pouchStripLocalFlagFromPrimary;
exports.pouchSwapIdToPrimary = pouchSwapIdToPrimary;
exports.pouchSwapPrimaryToId = pouchSwapPrimaryToId;
exports.primarySwapPouchDbQuerySelector = primarySwapPouchDbQuerySelector;
exports.rxDocumentDataToPouchDocumentData = rxDocumentDataToPouchDocumentData;
exports.writeAttachmentsToAttachments = writeAttachmentsToAttachments;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _pouchdbMd = require("pouchdb-md5");

var _util = require("../../util");

var _rxError = require("../../rx-error");

/**
 * Used to check in tests if all instances have been cleaned up.
 */
var OPEN_POUCHDB_STORAGE_INSTANCES = new Set();
/**
 * prefix of local pouchdb documents
 */

exports.OPEN_POUCHDB_STORAGE_INSTANCES = OPEN_POUCHDB_STORAGE_INSTANCES;
var POUCHDB_LOCAL_PREFIX = '_local/';
/**
 * Pouchdb stores indexes as design documents,
 * we have to filter them out and not return the
 * design documents to the outside.
 */

exports.POUCHDB_LOCAL_PREFIX = POUCHDB_LOCAL_PREFIX;
var POUCHDB_DESIGN_PREFIX = '_design/';
exports.POUCHDB_DESIGN_PREFIX = POUCHDB_DESIGN_PREFIX;

function pouchSwapIdToPrimary(primaryKey, docData) {
  if (primaryKey === '_id' || docData[primaryKey]) {
    return docData;
  }

  docData = (0, _util.flatClone)(docData);
  docData[primaryKey] = docData._id;
  delete docData._id;
  return docData;
}

function pouchDocumentDataToRxDocumentData(primaryKey, pouchDoc) {
  var useDoc = pouchSwapIdToPrimary(primaryKey, pouchDoc); // always flat clone becaues we mutate the _attachments property.

  useDoc = (0, _util.flatClone)(useDoc);
  delete useDoc._revisions;
  useDoc._attachments = {};

  if (pouchDoc._attachments) {
    Object.entries(pouchDoc._attachments).forEach(function (_ref) {
      var key = _ref[0],
          value = _ref[1];

      if (value.data) {
        useDoc._attachments[key] = {
          data: value.data,
          type: value.type ? value.type : value.content_type
        };
      } else {
        useDoc._attachments[key] = {
          digest: value.digest,
          // TODO why do we need to access value.type?
          type: value.type ? value.type : value.content_type,
          length: value.length
        };
      }
    });
  }

  return useDoc;
}

function rxDocumentDataToPouchDocumentData(primaryKey, doc) {
  var pouchDoc = pouchSwapPrimaryToId(primaryKey, doc); // always flat clone becaues we mutate the _attachments property.

  pouchDoc = (0, _util.flatClone)(pouchDoc);
  pouchDoc._attachments = {};

  if (doc._attachments) {
    Object.entries(doc._attachments).forEach(function (_ref2) {
      var key = _ref2[0],
          value = _ref2[1];
      var useValue = value;

      if (useValue.data) {
        pouchDoc._attachments[key] = {
          data: useValue.data,
          content_type: useValue.type
        };
      } else {
        pouchDoc._attachments[key] = {
          digest: useValue.digest,
          content_type: useValue.type,
          length: useValue.length,
          stub: true
        };
      }
    });
  }

  return pouchDoc;
}
/**
 * Swaps the primaryKey of the document
 * to the _id property.
 */


function pouchSwapPrimaryToId(primaryKey, docData) {
  // optimisation shortcut
  if (primaryKey === '_id') {
    return docData;
  }

  var idValue = docData[primaryKey];
  var ret = (0, _util.flatClone)(docData);
  delete ret[primaryKey];
  ret._id = idValue;
  return ret;
}
/**
 * in:  '_local/foobar'
 * out: 'foobar'
 */


function pouchStripLocalFlagFromPrimary(str) {
  return str.substring(POUCHDB_LOCAL_PREFIX.length);
}

function getEventKey(isLocal, primary, revision) {
  // TODO remove this check this should never happen
  if (!primary) {
    throw new Error('primary missing !!');
  }

  var prefix = isLocal ? 'local' : 'non-local';
  var eventKey = prefix + '|' + primary + '|' + revision;
  return eventKey;
}

function pouchChangeRowToChangeEvent(primaryKey, pouchDoc) {
  if (!pouchDoc) {
    throw (0, _rxError.newRxError)('SNH', {
      args: {
        pouchDoc: pouchDoc
      }
    });
  }

  var id = pouchDoc._id;
  var doc = pouchDocumentDataToRxDocumentData(primaryKey, pouchDoc);
  var revHeight = doc._rev ? (0, _util.getHeightOfRevision)(doc._rev) : 1;

  if (pouchDoc._deleted) {
    return {
      operation: 'DELETE',
      id: id,
      doc: null,
      previous: doc
    };
  } else if (revHeight === 1) {
    return {
      operation: 'INSERT',
      id: id,
      doc: doc,
      previous: null
    };
  } else {
    return {
      operation: 'UPDATE',
      id: id,
      doc: doc,
      previous: 'UNKNOWN'
    };
  }
}

function pouchChangeRowToChangeStreamEvent(primaryKey, pouchRow) {
  var doc = pouchRow.doc;

  if (!doc) {
    throw (0, _rxError.newRxError)('SNH', {
      args: {
        pouchRow: pouchRow
      }
    });
  }

  var revHeight = (0, _util.getHeightOfRevision)(doc._rev);

  if (pouchRow.deleted) {
    var previousDoc = (0, _util.flatClone)(pouchDocumentDataToRxDocumentData(primaryKey, pouchRow.doc));
    delete previousDoc._deleted;
    var ev = {
      sequence: pouchRow.seq,
      id: pouchRow.id,
      operation: 'DELETE',
      doc: null,
      previous: previousDoc
    };
    return ev;
  } else if (revHeight === 1) {
    var _ev = {
      sequence: pouchRow.seq,
      id: pouchRow.id,
      operation: 'INSERT',
      doc: pouchDocumentDataToRxDocumentData(primaryKey, pouchRow.doc),
      previous: null
    };
    return _ev;
  } else {
    var _ev2 = {
      sequence: pouchRow.seq,
      id: pouchRow.id,
      operation: 'UPDATE',
      doc: pouchDocumentDataToRxDocumentData(primaryKey, pouchRow.doc),
      previous: 'UNKNOWN'
    };
    return _ev2;
  }
}
/**
 * Runs a primary swap with transform all custom primaryKey occurences
 * into '_id'
 * @recursive
 */


function primarySwapPouchDbQuerySelector(selector, primaryKey) {
  if (primaryKey === '_id') {
    return selector;
  }

  if (Array.isArray(selector)) {
    return selector.map(function (item) {
      return primarySwapPouchDbQuerySelector(item, primaryKey);
    });
  } else if (typeof selector === 'object') {
    var ret = {};
    Object.entries(selector).forEach(function (_ref3) {
      var k = _ref3[0],
          v = _ref3[1];

      if (k === primaryKey) {
        ret._id = v;
      } else {
        if (k.startsWith('$')) {
          ret[k] = primarySwapPouchDbQuerySelector(v, primaryKey);
        } else {
          ret[k] = v;
        }
      }
    });
    return ret;
  } else {
    return selector;
  }
}

function pouchHash(data) {
  return new Promise(function (res) {
    (0, _pouchdbMd.binaryMd5)(data, function (digest) {
      res(digest);
    });
  });
}

var POUCH_HASH_KEY = 'md5';
exports.POUCH_HASH_KEY = POUCH_HASH_KEY;

function writeAttachmentsToAttachments(_x) {
  return _writeAttachmentsToAttachments.apply(this, arguments);
}

function _writeAttachmentsToAttachments() {
  _writeAttachmentsToAttachments = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(attachments) {
    var ret;
    return _regenerator["default"].wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            if (attachments) {
              _context2.next = 2;
              break;
            }

            return _context2.abrupt("return", {});

          case 2:
            ret = {};
            _context2.next = 5;
            return Promise.all(Object.entries(attachments).map( /*#__PURE__*/function () {
              var _ref5 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(_ref4) {
                var key, obj, asWrite, _yield$Promise$all, hash, asString, length;

                return _regenerator["default"].wrap(function _callee$(_context) {
                  while (1) {
                    switch (_context.prev = _context.next) {
                      case 0:
                        key = _ref4[0], obj = _ref4[1];

                        if (obj.type) {
                          _context.next = 3;
                          break;
                        }

                        throw (0, _rxError.newRxError)('SNH', {
                          args: {
                            obj: obj
                          }
                        });

                      case 3:
                        if (!obj.data) {
                          _context.next = 14;
                          break;
                        }

                        asWrite = obj;
                        _context.next = 7;
                        return Promise.all([pouchHash(asWrite.data), _util.blobBufferUtil.toString(asWrite.data)]);

                      case 7:
                        _yield$Promise$all = _context.sent;
                        hash = _yield$Promise$all[0];
                        asString = _yield$Promise$all[1];
                        length = asString.length;
                        ret[key] = {
                          digest: POUCH_HASH_KEY + '-' + hash,
                          length: length,
                          type: asWrite.type
                        };
                        _context.next = 15;
                        break;

                      case 14:
                        ret[key] = obj;

                      case 15:
                      case "end":
                        return _context.stop();
                    }
                  }
                }, _callee);
              }));

              return function (_x2) {
                return _ref5.apply(this, arguments);
              };
            }()));

          case 5:
            return _context2.abrupt("return", ret);

          case 6:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));
  return _writeAttachmentsToAttachments.apply(this, arguments);
}
//# sourceMappingURL=pouchdb-helper.js.map