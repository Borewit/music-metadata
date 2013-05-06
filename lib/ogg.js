var fs = require('fs');
var util = require('util');
var events = require('events');
var strtok = require('strtok');
var common = require('./common');

module.exports = function (stream, callback) {
  var innerStream = new events.EventEmitter();

  // top level parser that handles the parsing of pages
  strtok.parse(stream, function (v, cb) {
    try {
      if (!v) {
        cb.state = 0;
        return new strtok.BufferType(27);
      }

      switch (cb.state) {
        case 0: // header
          cb.header = {
            type: v.toString(0, 4),
            version: v[4],
            packet_flag: v[5],
            pcm_sample_pos: 'not_implemented',
            stream_serial_num: strtok.UINT32_LE.get(v, 14),
            page_number: strtok.UINT32_LE.get(v, 18),
            check_sum: strtok.UINT32_LE.get(v, 22),
            segments: v[26]
          }
          cb.state++;
          return new strtok.BufferType(cb.header.segments);

        case 1: // segments
          var pageLen = 0;
          for (var i = 0; i < v.length; i++) {
            pageLen += v[i];
          }
          cb.state++;
          return new strtok.BufferType(pageLen);

        case 2: // page data
          if (cb.header.page_number >= 1) {
            innerStream.emit('data', new Buffer(v));
          }
          cb.state = 0;
          return new strtok.BufferType(27);
      }
    } catch (exception) {
      callback('done', exception);
      return strtok.DONE;
    }
  })

  // Second level parser that handles the parsing of metadata.
  // The top level parser emits data that this parser should
  // handle.
  strtok.parse(innerStream, function (v, cb) {
    try {
      if (!v) {
        cb.commentsRead = 0;
        cb.state = 0;
        return new strtok.BufferType(7);
      }

      switch (cb.state) {
        case 0: // type
          cb.state++;
          return strtok.UINT32_LE;

        case 1: // vendor length
          cb.state++;
          return new strtok.StringType(v);

        case 2: // vendor string
          cb.state++;
          return strtok.UINT32_LE;

        case 3: // user comment list length
          cb.commentsLength = v;
          cb.state++;
          return strtok.UINT32_LE;

        case 4: // comment length
          cb.state++;
          return new strtok.StringType(v);

        case 5: // comment
          cb.commentsRead++;

          var idx = v.indexOf('=');
          var key = v.slice(0, idx).toUpperCase();
          var value = v.slice(idx+1);

          if (key === 'METADATA_BLOCK_PICTURE') {
            value = common.readVorbisPicture(new Buffer(value, 'base64'));
          }

          callback(key, value);

          if (cb.commentsRead === cb.commentsLength) {
            callback('done');
            return strtok.DONE;
          }

          cb.state--; // back to comment length
          return strtok.UINT32_LE;
      }
    } catch (exception) {
      callback('done', exception);
      return strtok.DONE;
    }
  })
}