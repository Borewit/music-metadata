/* jshint node:true, sub:true, globalstrict:true */
"use strict";

var util = require('util');
var events = require('events');
var strtok = require('strtok');
var common = require('./common');

var DataDecoder = function(data) {
  this.data = data;
  this.offset = 0;
};

DataDecoder.prototype.readInt32 = function() {
  var value = strtok.UINT32_LE.get(this.data, this.offset);

  this.offset += 4;

  return value;
};

DataDecoder.prototype.readStringUtf8 = function() {
  var len = this.readInt32();
  var value = this.data.toString('utf8', this.offset, this.offset + len);

  this.offset += len;

  return value;
};

var finishedState = {
  parse: function(context) {
    return this;
  },
  getExpectedType: function() {
    return strtok.DONE;
  }
};

var BlockDataState = function(type, length, nextStateFactory) {
  this.type = type;
  this.length = length;
  this.nextStateFactory = nextStateFactory;
};

BlockDataState.prototype.parse = function(context, data) {
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
      context.emit(split[0].toUpperCase(), split[1]);
    }
  } else if (this.type === 6) {
    var picture = common.readVorbisPicture(data);
    context.emit('METADATA_BLOCK_PICTURE', picture);
  }

  return this.nextStateFactory();
};

BlockDataState.prototype.getExpectedType = function() {
  return new strtok.BufferType(this.length);
};

var blockHeaderState = {
  parse: function(context, data) {
    var header = {
      lastBlock: (data[0] & 0x80) == 0x80,
      type: data[0] & 0x7f,
      length: strtok.UINT24_BE.get(data, 1)
    };
    var followingStateFactory = header.lastBlock ? function() {
        context.emit('done');
        return finishedState;
      } : function() {
        return blockHeaderState;
      };

    return new BlockDataState(header.type, header.length, followingStateFactory);
  },
  getExpectedType: function() {
    return new strtok.BufferType(4);
  }
};

var idState = {
  parse: function(context, data) {
    if (data !== 'fLaC') {
      throw new Error('expected flac header but was not found');
    }

    return blockHeaderState;
  },
  getExpectedType: function() {
    return new strtok.StringType(4);
  }
};

var startState = {
  parse: function(context) {
    return idState;
  },
  getExpectedType: function() {
    return strtok.DONE;
  }
};

var Flac = module.exports = function(stream) {
  events.EventEmitter.call(this);
  this.stream = stream;

  this.currentState = startState;

  this.parse();
};

util.inherits(Flac, events.EventEmitter);

Flac.prototype.parse = function() {
  var self = this;

  strtok.parse(self.stream, function(v, cb) {
    try {
      self.currentState = self.currentState.parse(self, v);
    } catch (exception) {
      self.currentState = finishedState;
      self.emit('done', exception);
    }
    return self.currentState.getExpectedType();
  });
};