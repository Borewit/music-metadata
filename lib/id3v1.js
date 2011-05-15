var common = require('./common');

var Id3v1 = module.exports = function (stream) {
    this.stream = stream;
    this.parse();
};

Id3v1.prototype = new process.EventEmitter();

Id3v1.prototype.parse = function () {
  var self = this,
      bufs = [],
      dataLen = 0;

  this.stream.on('data', function (data) {
    bufs.push(data);
    dataLen += data.length;
  });

  var called = false;

  this.stream.on('end', function () {
    if (!called) parse();
    called = true;
  });

  this.stream.on('close', function () {
    if (!called) parse();
    called = true;
  });

  function parse() {
    try {
      var data = common.joinBuffers(bufs, dataLen);
      var offset = data.length - 128;

      var header = data.toString('utf8', offset, offset += 3);

      if (header === 'TAG') {
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

        var genre = common.GENRES[data[data.length - 1]];
        self.emit('genre', genre);

        self.emit('done');
      }
    } catch (exception) {
      self.emit('done', exception);
    }
  }
}