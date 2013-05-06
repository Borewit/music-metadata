var strtok = require('strtok');
var common = require('./common');

module.exports = function (stream, callback) {
  var currentState = startState;

  strtok.parse(stream, function (v, cb) {
    try {
      currentState = currentState.parse(callback, v);
    } catch (exception) {
      currentState = finishedState;
      callback('done', exception);
    }
    return currentState.getExpectedType();
  })
}

var DataDecoder = function (data) {
  this.data = data;
  this.offset = 0;
}

DataDecoder.prototype.readInt32 = function () {
  var value = strtok.UINT32_LE.get(this.data, this.offset);
  this.offset += 4;
  return value;
}

DataDecoder.prototype.readStringUtf8 = function () {
  var len = this.readInt32();
  var value = this.data.toString('utf8', this.offset, this.offset + len);
  this.offset += len;
  return value;
};

var finishedState = {
  parse: function (callback) {
    return this;
  },
  getExpectedType: function () {
    return strtok.DONE;
  }
}

var BlockDataState = function (type, length, nextStateFactory) {
  this.type = type;
  this.length = length;
  this.nextStateFactory = nextStateFactory;
}

BlockDataState.prototype.parse = function (callback, data) {
  if (this.type === 4) {
    var decoder = new DataDecoder(data);
    var vendorString = decoder.readStringUtf8();
    var commentListLength = decoder.readInt32();
    var comment;
    var split;
    var i;

    for (i = 0; i < commentListLength; i++) {
      comment = decoder.readStringUtf8();
      split = comment.split('=');
      callback(split[0].toUpperCase(), split[1]);
    }
  } else if (this.type === 6) {
    var picture = common.readVorbisPicture(data);
    callback('METADATA_BLOCK_PICTURE', picture);
  }

  return this.nextStateFactory();
}

BlockDataState.prototype.getExpectedType = function () {
  return new strtok.BufferType(this.length);
}

var blockHeaderState = {
  parse: function (callback, data) {
    var header = {
      lastBlock: (data[0] & 0x80) == 0x80,
      type: data[0] & 0x7f,
      length: strtok.UINT24_BE.get(data, 1)
    }
    var followingStateFactory = header.lastBlock ? function() {
        callback('done');
        return finishedState;
      } : function() {
        return blockHeaderState;
      }

    return new BlockDataState(header.type, header.length, followingStateFactory);
  },
  getExpectedType: function () {
    return new strtok.BufferType(4);
  }
}

var idState = {
  parse: function (callback, data) {
    if (data !== 'fLaC') {
      throw new Error('expected flac header but was not found');
    }
    return blockHeaderState;
  },
  getExpectedType: function () {
    return new strtok.StringType(4);
  }
};

var startState = {
  parse: function (callback) {
    return idState;
  },
  getExpectedType: function () {
    return strtok.DONE;
  }
}