'use strict'
var strtok = require('strtok2')
var common = require('./common')
var equal = require('deep-equal')

var decodeString = common.decodeString

module.exports = function (stream, callback, done) {
  var currentState = startState

  strtok.parse(stream, function (v, cb) {
    currentState = currentState.parse(callback, v, done)
    return currentState.getExpectedType()
  })
}

var startState = {
  parse: function (callback) {
    return idState
  }
}

var finishedState = {
  parse: function (callback) {
    return this
  },
  getExpectedType: function () {
    return strtok.DONE
  }
}

var idState = {
  parse: function (callback, data, done) {
    if (!equal(common.asfGuidBuf, data)) {
      done(new Error('expected asf header but was not found'))
      return finishedState
    }
    return headerDataState
  },
  getExpectedType: function () {
    return new strtok.BufferType(common.asfGuidBuf.length)
  }
}

function ReadObjectState (size, objectCount) {
  this.size = size
  this.objectCount = objectCount
}

ReadObjectState.prototype.parse = function (callback, data, done) {
  var guid = data.slice(0, 16)
  var size = readUInt64LE(data, 16)
  var State = stateByGuid(guid) || IgnoreObjectState
  this.objectCount -= 1
  this.size -= size
  var nextState = (this.objectCount <= 0) ? finishedState : this
  return new State(nextState, size - 24)
}

ReadObjectState.prototype.getExpectedType = function () {
  return new strtok.BufferType(24)
}

var headerDataState = {
  parse: function (callback, data, done) {
    var size = readUInt64LE(data, 0)
    var objectCount = data.readUInt32LE(8)
    return new ReadObjectState(size, objectCount)
  },
  getExpectedType: function () {
    // 8 bytes size
    // 4 bytes object count
    // 2 bytes ignore
    return new strtok.BufferType(14)
  }
}

function IgnoreObjectState (nextState, size) {
  this.nextState = nextState
  this.size = size
}

IgnoreObjectState.prototype.parse = function (callback, data, done) {
  if (this.nextState === finishedState) done()
  return this.nextState
}

IgnoreObjectState.prototype.getExpectedType = function () {
  return new strtok.IgnoreType(this.size)
}

function ContentDescriptionObjectState (nextState, size) {
  this.nextState = nextState
  this.size = size
}

var contentDescTags = ['Title', 'Author', 'Copyright', 'Description', 'Rating']
ContentDescriptionObjectState.prototype.parse = function (callback, data, done) {
  var lengths = [
    data.readUInt16LE(0),
    data.readUInt16LE(2),
    data.readUInt16LE(4),
    data.readUInt16LE(6),
    data.readUInt16LE(8)
  ]
  var pos = 10
  for (var i = 0; i < contentDescTags.length; i += 1) {
    var tagName = contentDescTags[i]
    var length = lengths[i]
    var end = pos + length
    if (length > 0) {
      var value = parseUnicodeAttr(data.slice(pos, end))
      callback(tagName, value)
    }
    pos = end
  }
  if (this.nextState === finishedState) done()
  return this.nextState
}

ContentDescriptionObjectState.prototype.getExpectedType = function () {
  return new strtok.BufferType(this.size)
}

ContentDescriptionObjectState.guid = new Buffer([
  0x33, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11,
  0xA6, 0xD9, 0x00, 0xAA, 0x00, 0x62, 0xCE, 0x6C
])

function ExtendedContentDescriptionObjectState (nextState, size) {
  this.nextState = nextState
  this.size = size
}

var attributeParsers = [
  parseUnicodeAttr,
  parseByteArrayAttr,
  parseBoolAttr,
  parseDWordAttr,
  parseQWordAttr,
  parseWordAttr,
  parseByteArrayAttr
]

ExtendedContentDescriptionObjectState.prototype.parse = function (callback, data, done) {
  var attrCount = data.readUInt16LE(0)
  var pos = 2
  for (var i = 0; i < attrCount; i += 1) {
    var nameLen = data.readUInt16LE(pos)
    pos += 2
    var name = parseUnicodeAttr(data.slice(pos, pos + nameLen))
    pos += nameLen
    var valueType = data.readUInt16LE(pos)
    pos += 2
    var valueLen = data.readUInt16LE(pos)
    pos += 2
    var value = data.slice(pos, pos + valueLen)
    pos += valueLen
    var parseAttr = attributeParsers[valueType]
    if (!parseAttr) {
      done(new Error('unexpected value type: ' + valueType))
      return finishedState
    }
    var attr = parseAttr(value)
    callback(name, attr)
  }
  if (this.nextState === finishedState) done()
  return this.nextState
}

ExtendedContentDescriptionObjectState.prototype.getExpectedType = function () {
  return new strtok.BufferType(this.size)
}

ExtendedContentDescriptionObjectState.guid = new Buffer([
  0x40, 0xA4, 0xD0, 0xD2, 0x07, 0xE3, 0xD2, 0x11,
  0x97, 0xF0, 0x00, 0xA0, 0xC9, 0x5E, 0xA8, 0x50
])

function FilePropertiesObject (nextState, size) {
  this.nextState = nextState
  this.size = size
}

FilePropertiesObject.prototype.parse = function (callback, data, done) {
  // in miliseconds
  var playDuration = parseQWordAttr(data.slice(40, 48)) / 10000
  callback('duration', playDuration / 1000)

  if (this.nextState === finishedState) done()
  return this.nextState
}

FilePropertiesObject.prototype.getExpectedType = function () {
  return new strtok.BufferType(this.size)
}

FilePropertiesObject.guid = new Buffer([
  0xA1, 0xDC, 0xAB, 0x8C, 0x47, 0xA9, 0xCF, 0x11,
  0x8E, 0xE4, 0x00, 0xC0, 0x0C, 0x20, 0x53, 0x65
])

var guidStates = [
  FilePropertiesObject,
  ContentDescriptionObjectState,
  ExtendedContentDescriptionObjectState
]
function stateByGuid (guidBuf) {
  for (var i = 0; i < guidStates.length; i += 1) {
    var GuidState = guidStates[i]
    if (equal(GuidState.guid, guidBuf)) return GuidState
  }
  return null
}

function parseUnicodeAttr (buf) {
  return common.stripNulls(decodeString(buf, 'utf16le'))
}

function parseByteArrayAttr (buf) {
  var newBuf = new Buffer(buf.length)
  buf.copy(newBuf)
  return newBuf
}

function parseBoolAttr (buf) {
  return parseDWordAttr(buf) === 1
}

function parseDWordAttr (buf) {
  return buf.readUInt32LE(0)
}

function parseQWordAttr (buf) {
  return readUInt64LE(buf, 0)
}

function parseWordAttr (buf) {
  return buf.readUInt16LE(0)
}

function readUInt64LE (buffer, offset) {
  var high = buffer.slice(offset, offset + 4).readUInt32LE(0)
  var low = buffer.slice(offset + 4, offset + 8).readUInt32LE(0)
  var maxuint32 = Math.pow(2, 32)
  return ((low * maxuint32) + (high >>> 0))
}
