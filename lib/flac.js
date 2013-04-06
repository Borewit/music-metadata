var util = require('util');
var events = require('events');
var strtok = require('strtok');
var fs = require('fs');
var common = require('./common');

var Flac = module.exports = function(stream) {
  events.EventEmitter.call(this);
  this.stream = stream;
  this.parse();
};

util.inherits(Flac, events.EventEmitter);

Flac.prototype.parse = function() {
  var self = this;

  strtok.parse(self.stream, function(v, cb) {
    try {
      if (!v) {
        cb.position = 'ID';
        return new strtok.StringType(4);
      }

      if (cb.position === 'ID') {
        if (v !== 'fLaC') {
          throw new Error('expected flac header but was not found');
        }

        cb.position = 'METADATA_BLOCK_HEADER';
        return new strtok.BufferType(4);
      }

      if (cb.position === 'METADATA_BLOCK_HEADER') {
        cb.blockHeader = {
          last_metadata_block: (v[0] & 0x80) == 0x80,
          block_type: v[0] & 0x7f,
          length: strtok.UINT24_BE.get(v, 1)
        }

        if (cb.blockHeader.last_metadata_block) {
          self.emit('done');
          return strtok.DONE;
        }

        cb.position = 'METADATA_BLOCK_DATA';
        return new strtok.BufferType(cb.blockHeader.length);
      }

      if (cb.position === 'METADATA_BLOCK_DATA') {
        if (cb.blockHeader.block_type === 4) {
          var offset = 0;
          var vendorLen = strtok.UINT32_LE.get(v, offset);
          offset += 4;
          var vendorString = v.toString('utf8', offset, offset += vendorLen);
          var commentListLength = strtok.UINT32_LE.get(v, offset);
          offset += 4;

          for (var i = 0; i < commentListLength; i++) {
            var len = strtok.UINT32_LE.get(v, offset);
            offset += 4;
            var comment = v.toString('utf8', offset, offset += len);
            var split = comment.split('=');
            self.emit(split[0].toUpperCase(), split[1]);
          }
        }
        if (cb.blockHeader.block_type === 6) {
          var picture = common.readVorbisPicture(v);
          self.emit('METADATA_BLOCK_PICTURE', picture);
        }

        cb.position = 'METADATA_BLOCK_HEADER';
        return new strtok.BufferType(4);
      }


    } catch (exception) {
      self.emit('done', exception);
      return strtok.DONE;
    }
  });
};