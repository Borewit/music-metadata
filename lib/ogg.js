var fs = require('fs');
var util = require('util');
var events = require('events');
var strtok = require('strtok');
var common = require('./common');

var Ogg = module.exports = function(stream) {
  events.EventEmitter.call(this);
  this.stream = stream;
  this.parse();
};

util.inherits(Ogg, events.EventEmitter);

Ogg.prototype.parse = function() {
  var self = this;

  // 3mb buffer for metadata
  var bigBuf = new Buffer(3145728);
  var copy_offset = 0;

  try {
    // top level parser that handles the parsing of pages
    strtok.parse(self.stream, function(v, cb) {
      if (!v) {
        cb.commentsRead = 0;
        cb.position = 'header'; //read first OggS header
        return new strtok.BufferType(27);
      }

      if (cb.position === 'header') {
        cb.header = {
          type: v.toString('utf-8', 0, 4),
          version: v[4],
          packet_flag: v[5],
          pcm_sample_pos: 'not_implemented',
          stream_serial_num: strtok.UINT32_LE.get(v, 14),
          page_number: strtok.UINT32_LE.get(v, 18),
          check_sum: strtok.UINT32_LE.get(v, 22),
          segments: v[26]
        };

        //read segment table
        cb.position = 'segments';
        return new strtok.BufferType(cb.header.segments);
      }

      if (cb.position === 'segments') {
        var pageLen = 0;
        for (var i = 0; i < v.length; i++) {
          pageLen += v[i];
        }

        cb.position = 'page_data';
        return new strtok.BufferType(pageLen);
      }

      //TODO: fix this crappy hack, we should be emitting
      //      data and parsing it with another parser
      //      but that isn't working atm. What we are doing
      //      here is attempting to read all the metadata
      //      everytime we read a ogg page.
      //      
      if (cb.position === 'page_data') {
        if (cb.header.page_number >= 1) {
          v.copy(bigBuf, copy_offset);
          copy_offset += v.length;
          try {
            parseMetadata();
            self.emit('done');
            return strtok.DONE;
          } catch (ex) {}
        }

        cb.position = 'header';
        return new strtok.BufferType(27);
      }
    })

    function parseMetadata() {
      var offset = 0;
      var header = bigBuf.slice(offset, 7);
      var vendor_len = bigBuf.readUInt32LE(offset += 7);
      var vendor_string = bigBuf.slice(offset += 4, offset + vendor_len).toString();
      var comments_length = bigBuf.readUInt32LE(offset += vendor_len);

      offset += 4;

      var comments = [];
      var comments_read = 0;
      for (var i = 0; i < comments_length; i++) {
        comments_read++;

        var comment_length = bigBuf.readUInt32LE(offset);
        var comment = bigBuf.slice(offset += 4, offset + comment_length).toString();

        var sp = comment.indexOf('=');
        var split = [comment.slice(0, sp), comment.slice(sp + 1)];

        if (split[0] === 'METADATA_BLOCK_PICTURE') {
          var decoded = new Buffer(split[1], 'base64');
          var picture = common.readVorbisPicture(decoded);
          split[1] = picture;
        }

        comments.push({
          key: split[0].toUpperCase(),
          value: split[1]
        });

        if (comments_read === comments_length) {
          for (var i = 0; i < comments.length; i++) {
            self.emit(comments[i].key, comments[i].value);
          }
          return;
        }

        offset += comment_length;
      }
    }
  } catch (exception) {
    self.emit('done', exception);
    return strtok.DONE;
  }
}