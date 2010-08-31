var Buffer = require('buffer').Buffer,
    fs     = require('fs'),
    id3v1  = require('./id3v1'),
    id3v2  = require('./id3v2'),
    id4    = require('./id4');

var ID3File = function ID3File(buffer) {
  this.buffer  = buffer;
  this.version = this.getID3Version();
};

module.exports = ID3File;

ID3File.prototype.getID3Version = function getID3Version () {
  if ('ID3' === this.buffer.toString('binary', 0, 3)) {
    return 'id3v2';
  } else if ('ftypM4A' === this.buffer.toString('binary', 4, 11)) {
    return 'id4';
  }
  return 'id3v1';
};

ID3File.prototype.getTags = function getTags(version) {
  version || (version = this.version);
  var parser;

  switch (version) {
    case 'id3v1':
      return id3v1.readTags.call(this);
      break;
    case 'id3v2':
      return id3v2.readTags.call(this);
      break;
    case 'id4':
      return id4.readTags.call(this);
    default:
      return {};
  }
}
