var util = require('util');
var common = require('./common');

module.exports = function (stream, callback) {
  var endData = null;
  stream.on('data', function (data) {
    endData = data;
  });
  stream.onRealEnd(function () {
    try {
      var offset = endData.length - 128;
      var header = endData.toString('ascii', offset, offset += 3);
      if (header !== 'TAG') {
        throw new Error('Expected id3v1.1 header but was not found.');
      }

      var title = endData.toString('ascii', offset, offset += 30);
      callback('title', title.trim().replace(/\x00/g, ''));

      var artist = endData.toString('ascii', offset, offset += 30);
      callback('artist', artist.trim().replace(/\x00/g, ''));

      var album = endData.toString('ascii', offset, offset += 30);
      callback('album', album.trim().replace(/\x00/g, ''));

      var year = endData.toString('ascii', offset, offset += 4);
      callback('year', year.trim().replace(/\x00/g, ''));

      var comment = endData.toString('ascii', offset, offset += 28);
      callback('comment', comment.trim().replace(/\x00/g, ''));

      var track = endData[endData.length - 2];
      callback('track', track);

      if (endData[endData.length - 1] in common.GENRES) {
        var genre = common.GENRES[endData[endData.length - 1]];
        callback('genre', genre);
      }

      callback('done');
    } catch (exception) {
      callback('done', exception);
    }
  });
}