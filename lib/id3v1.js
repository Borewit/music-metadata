var common = require('./common'),
      findZero = common.findZero;

module.exports = {
    readTags: function () {
        var buffer = this.buffer,
              offset = buffer.length - 128,
              header = buffer.toString('binary', offset, offset + 3),
              tags = {};

        if ('TAG' !== header) return tags;

        // Skip header
        offset += 3;

        // Title
        tags.title = buffer.toString('ascii', offset, findZero(buffer, offset, offset + 30));
        offset += 30;

        // Artist
        tags.artist = buffer.toString('ascii', offset, findZero(buffer, offset, offset + 30));
        offset += 30;

        // Album
        tags.album = buffer.toString('ascii', offset, findZero(buffer, offset, offset + 30));
        offset += 30;

        // Year
        tags.year = buffer.toString('ascii', offset, findZero(buffer, offset, offset + 4));
        offset += 4;

        // Comment
        tags.comment = buffer.toString('ascii', offset, findZero(buffer, offset, offset + 28));

        // Track
        tags.track = buffer[buffer.length - 2];

        //Genre
        tags.genre = common.GENRES[buffer[buffer.length - 1]];

        return tags;
    }
};