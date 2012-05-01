var binary = require('binary'),
    fs     = require('fs'),
    common = require('./common');
    events = require('events');
    util   = require('util');
    
    
var Ogg = module.exports = function(stream) {
    this.stream = stream;
    this.parse();
};

Ogg.prototype = new process.EventEmitter();

Ogg.prototype.parse = function() {
  var self = this;

  var innerStream = new events.EventEmitter();

  var found_metadata_page = false;

  // top level parser that handles the parsing of pages
  binary.stream(self.stream)
    .loop(function(end, vars) {
      this.buffer('capture_pattern', 4)
      .word8('stream_structire_version')
      .word8('header_type_flag')
      .word64lu('absolute_granule_position')
      .word32lu('stream_serial_number')
      .word32lu('page_sequence_no')
      .word32lu('page_checksum')
      .word8('page_segments')
      .buffer('segments', 'page_segments')
      .tap(function (vars) {

        var page_len = 0;
        for (var i=0; i < vars['segments'].length; i++) {
          page_len += vars['segments'][i];
        }

        // now we have the page length we can now read
        // all the page data
        this.buffer('page_data', page_len)
        .tap(function(vars) {

          //the metadata always starts on the second page
          //so start emitting data from then
          if (vars['page_sequence_no'] === 1) {
            found_metadata_page = true;
          }

          if (found_metadata_page) {
            innerStream.emit('data', vars['page_data']);
          };
        });
      });
    });

  var comments_read = 0;

  // Second level parser that handles the parsing of metadata.
  // The top level parser emits data that this parser should
  // handle.
  binary.stream(innerStream)
    .buffer('type', 7)
    .word32lu('vendor_length')
    .buffer('vendor_string', 'vendor_length')
    .word32lu('user_comment_list_length')
    .loop(function(end, vars) {
      this.word32lu('comment_length')
      .buffer('comment', 'comment_length')
      .tap(function(vars) {
        comments_read++;
      
        var comm = vars['comment'].toString();

        // make sure we only split the string on the first
        // occurrence of = otherwise we may split in the
        // middle of the data!
        var i = comm.indexOf('=');
        var split = [comm.slice(0, i), comm.slice(i+1)];

        if (split[0] === 'METADATA_BLOCK_PICTURE') {  
          var decoded = new Buffer(split[1], 'base64');
          var picture = common.readVorbisPicture(decoded);
          split[1] = picture;
        }
              
        self.emit(split[0].toUpperCase(), split[1]);

        if (comments_read === vars['user_comment_list_length']) {
          end();
        };
      })
    })
    .word8('framing_bit')
    .tap(function(vars) {
      if (vars['framing_bit'] === 1) {
        self.emit('done');
      } else {
        self.emit('done', new Error('Expected to find framing bit at end of metadata'));
      }
    })
}