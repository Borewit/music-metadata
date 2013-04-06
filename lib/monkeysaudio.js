var util = require('util');
var events = require('events');
var common = require('./common');
var strtok = require('strtok');

var MonkeysAudio = module.exports = function(stream) {
  events.EventEmitter.call(this);
  this.stream = stream;
  this.parse();
};

util.inherits(MonkeysAudio, events.EventEmitter);

MonkeysAudio.prototype.parse = function() {
  var self = this,
    bufs = [],
    dataLen = 0;

  //TODO: need to be able to parse the tag if its at the start of the file

  this.stream.on('data', function(data) {
    bufs.push(data);
    dataLen += data.length;
  });

  this.stream.onRealEnd(parse);

  function parse() {
    try {
      var buffer = common.joinBuffers(bufs, dataLen);
      var offset = buffer.length - 32;

      if ('APETAGEX' !== buffer.toString('utf8', offset, offset += 8)) {
        throw new Error('expected APE header but wasn\'t found');
      }

      var footer = {
        version: strtok.UINT32_LE.get(buffer, offset, offset + 4),
        size: strtok.UINT32_LE.get(buffer, offset + 4, offset + 8),
        count: strtok.UINT32_LE.get(buffer, offset + 8, offset + 12)
      }

      //go 'back' to where the 'tags' start
      offset = buffer.length - footer.size;

      for (var i = 0; i < footer.count; i++) {
        var size = strtok.UINT32_LE.get(buffer, offset, offset += 4);
        var flags = strtok.UINT32_LE.get(buffer, offset, offset += 4);
        var kind = (flags & 6) >> 1;

        var zero = common.findZero(buffer, offset, buffer.length);
        var key = buffer.toString('ascii', offset, zero);
        offset = zero + 1;

        var value;
        if (kind === 0) { // utf-8 textstring
          value = buffer.toString('utf8', offset, offset += size);
          value = value.replace(/\x00/g, '/');
        } else if (kind === 1) { //binary (probably artwork)
          if (key === 'Cover Art (Front)' || key === 'Cover Art (Back)') {
            var picData = buffer.slice(offset, offset + size);

            var off = 0;
            var zero = common.findZero(picData, off, picData.length);
            var description = picData.toString('utf8', off, zero);
            off = zero + 1;

            var picture = {
              description: description,
              data: picData.slice(off)
            };

            value = picture;
            offset += size;
          }
        }
        self.emit(key, value);
      }

      self.emit('done');
      return strtok.DONE;

    } catch (exception) {
      self.emit('done', exception);
      return strtok.DONE;
    }
  }
}