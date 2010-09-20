var common   = require('./common'),
    findZero = common.findZero;

module.exports = {
  readTags: function () {
    var buffer = this.buffer,
        offset = buffer.length - 128,
        header = buffer.toString('binary', offset, offset + 3),
        tags   = {};

    if ('TAG' !== header) return tags;

    // Skip header
    offset += 3;

    // Title
    tags.title =  buffer.toString('ascii', offset, findZero(buffer, offset, offset + 30));
    offset     += 30;

    // Artist
    tags.artist =  buffer.toString('ascii', offset, findZero(buffer, offset, offset + 30));
    offset      += 30;

    // Album
    tags.artist =  buffer.toString('ascii', offset, findZero(buffer, offset, offset + 30));
    offset      += 30;

    // Year
    tags.year =  +buffer.toString('ascii', offset, findZero(buffer, offset, offset + 4));
    offset    += 4;

    // Comment, Track
    if (0 === buffer[offset + 29]) {
      tags.comment = buffer.toString('ascii', offset, findZero(buffer, offset, offset + 28));
      tags.track   = buffer[offset + 29];
    } else {
      tags.comment = buffer.toString('ascii', offset, findZero(buffer, offset, offset + 30));
      tags.track   = 0;
    }

    tags.genre = common.GENRES[buffer[buffer.length - 1]];

    return tags;
  }
};
