var util = require('util');
var events = require('events');
var strtok = require('strtok');
var fs = require('fs');
var parser = require('./id3v2_frames');
var common = require('./common');

var Id3v2 = module.exports = function(stream) {
  events.EventEmitter.call(this);
  this.stream = stream;
  this.parse();
};

util.inherits(Id3v2, events.EventEmitter);

Id3v2.prototype.parse = function() {
  var self = this;
  strtok.parse(self.stream, function(v, cb) {
    try {
      if (!v) {
        cb.position = 'header';
        return new strtok.BufferType(10);
      }

      if (cb.position === 'header') {
        if (v.toString('ascii', 0, 3) !== 'ID3') {
          throw new Error('expected id3 header but was not found');
        }

        cb.header = {
          version: '2.' + v[3] + '.' + v[4],
          major: v[3],
          unsync: strtok.BITSET.get(v, 5, 7),
          xheader: strtok.BITSET.get(v, 5, 6),
          xindicator: strtok.BITSET.get(v, 5, 5),
          footer: strtok.BITSET.get(v, 5, 4),
          size: strtok.INT32SYNCSAFE.get(v, 6)
        };

        if (cb.header.xheader) {
          cb.position = 'xheader';
          return strtok.UINT32_BE;
        }

        //expect the first frames header next
        cb.position = 'frameheader';
        switch (cb.header.major) {
          case 2:
            return new strtok.BufferType(6);
          case 3:
          case 4:
            return new strtok.BufferType(10);
          default:
            throw new Error('header version is incorrect');
        }
      }

      if (cb.position === 'xheader') {
        cb.position = 'frameheader';
        //TODO: this will not work because we do not detect raw objects
        //our code will fail on mp3's with xheaders
        return new strtok.BufferType(v); //skip xheader
      }

      if (cb.position === 'frameheader') {
        cb.position = 'framedata';
        var header = cb.frameHeader = {};

        switch (cb.header.major) {
          case 2:
            header.id = v.toString('ascii', 0, 3);
            header.length = strtok.UINT24_BE.get(v, 3, 6);
            break;
          case 3:
            header.id = v.toString('ascii', 0, 4);
            header.length = strtok.UINT32_BE.get(v, 4, 8);
            header.flags = readFrameFlags(v.slice(8, 10));
            break;
          case 4:
            header.id = v.toString('ascii', 0, 4);
            header.length = strtok.INT32SYNCSAFE.get(v, 4, 8);
            header.flags = readFrameFlags(v.slice(8, 10));
            break;
        }

        // Last frame. Check first char is a letter, bit of defensive programming  
        if (header.id === '' || header.id === '\u0000\u0000\u0000\u0000' || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.search(header.id[0]) === -1) {

          self.emit('done');
          return strtok.DONE;
        }

        return new strtok.BufferType(header.length);
      }

      if (cb.position === 'framedata') {
        cb.position = 'frameheader';

        var frame, encoding;
        switch (cb.header.major) {
          case 2:
            frame = parser.readData(v, cb.frameHeader.id, null, cb.header.major);
            self.emit(cb.frameHeader.id, frame);
            return new strtok.BufferType(6);
          case 3:
          case 4:
            if (cb.frameHeader.flags.format.unsync) {
              v = common.removeUnsyncBytes(v);
            }

            if (cb.frameHeader.flags.format.data_length_indicator) {
              v = v.slice(4, v.length); //TODO: do we need to do something with this?
            }

            frame = parser.readData(v, cb.frameHeader.id, cb.frameHeader.flags, cb.header.major);
            self.emit(cb.frameHeader.id, frame);
            return new strtok.BufferType(10);
        }
      }
    } catch (exception) {
      self.emit('done', exception);
      return strtok.DONE;
    }
  });
};

function readFrameFlags(b) {
  return {
    status: {
      tag_alter_preservation: strtok.BITSET.get(b, 0, 6),
      file_alter_preservation: strtok.BITSET.get(b, 0, 5),
      read_only: strtok.BITSET.get(b, 0, 4)
    },
    format: {
      grouping_identity: strtok.BITSET.get(b, 1, 7),
      compression: strtok.BITSET.get(b, 1, 3),
      encryption: strtok.BITSET.get(b, 1, 2),
      unsync: strtok.BITSET.get(b, 1, 1),
      data_length_indicator: strtok.BITSET.get(b, 1, 0)
    }
  };
};