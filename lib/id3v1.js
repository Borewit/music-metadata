var util = require('util');
var events = require('events');
var common = require('./common');

var Id3v1 = module.exports = function(stream) {
  events.EventEmitter.call(this);
  this.stream = stream;
  this.parse();
};

util.inherits(Id3v1, events.EventEmitter);

Id3v1.prototype.parse = function() {
  var self = this,
    endData = null;

  self.stream.on('data', function(data) {
    endData = data;
  });

  self.stream.onRealEnd(function() {
    parse(endData);
  });

  function parse(data) {
    try {
      var offset = data.length - 128;

      var header = data.toString('ascii', offset, offset += 3);

      if (header !== 'TAG') {
        throw new Error('Expected id3v1.1 header but was not found.');
      }

      var title = data.toString('ascii', offset, offset += 30);
      self.emit('title', title.trim().replace(/\x00/g, ''));

      var artist = data.toString('ascii', offset, offset += 30);
      self.emit('artist', artist.trim().replace(/\x00/g, ''));

      var album = data.toString('ascii', offset, offset += 30);
      self.emit('album', album.trim().replace(/\x00/g, ''));

      var year = data.toString('ascii', offset, offset += 4);
      self.emit('year', year.trim().replace(/\x00/g, ''));

      var comment = data.toString('ascii', offset, offset += 28);
      self.emit('comment', comment.trim().replace(/\x00/g, ''));

      var track = data[data.length - 2];
      self.emit('track', track);

      if (data[data.length - 1] in common.GENRES) {
        var genre = common.GENRES[data[data.length - 1]];
        self.emit('genre', genre);
      }

      self.emit('done');

    } catch (exception) {
      self.emit('done', exception);
    }
  }
}