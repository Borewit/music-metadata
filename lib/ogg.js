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
  var innerStream = new events.EventEmitter();

  try {

    // top level parser that handles the parsing of pages
    strtok.parse(self.stream, function (v, cb) {
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
 
      if (cb.position === 'page_data') {
        if (cb.header.page_number >= 1) {
          innerStream.emit('data', new Buffer(v));
        }
        cb.position = 'header';
        return new strtok.BufferType(27);
      }
    })

    // Second level parser that handles the parsing of metadata.
    // The top level parser emits data that this parser should
    // handle.
    strtok.parse(innerStream, function (v, cb) {
      if (!v) {
        cb.position = 'type'; //read first OggS header
        return new strtok.BufferType(7);
      }

      if (cb.position === 'type') {
        cb.position = 'vendor_length';
        return strtok.UINT32_LE;
      }

      if (cb.position === 'vendor_length') {
        cb.position = 'vendor_string';
        return new strtok.StringType(v);
      }

      if (cb.position === 'vendor_string') {
        cb.position = 'user_comment_list_length';
        return strtok.UINT32_LE;
      }

      if (cb.position === 'user_comment_list_length') {
        cb.commentsLength = v;
        cb.position = 'comment_length';
        return strtok.UINT32_LE;
      }

      if (cb.position === 'comment_length') {
        cb.position = 'comment';
        return new strtok.StringType(v);
      }

      if (cb.position === 'comment') {
        cb.commentsRead = cb.commentsRead || 0;
        cb.commentsRead++;

        var idx = v.indexOf('=');
        var key = v.slice(0, idx).toUpperCase();
        var value = v.slice(idx+1);

        if (key === 'METADATA_BLOCK_PICTURE') {
          value = common.readVorbisPicture(new Buffer(value, 'base64'));
        }
        
        self.emit(key, value);

        if (cb.commentsRead === cb.commentsLength) {
          self.emit('done');
          return strtok.DONE;
        }

        cb.position = 'comment_length';
        return strtok.UINT32_LE;
      }
    })
  } catch (exception) {
    self.emit('done', exception);
    return strtok.DONE;
  }
}