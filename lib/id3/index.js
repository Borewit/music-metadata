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

ID3File.prototype.parse = function parse () {
  try {
    this.tags = this.getTags();
  } catch (error) {
    try {
      this.tags = this.getTags();
    } catch (error) {
      return false;
    }
  }
  return true;
};

ID3File.prototype.get = function get (name, arr) {
  if (!this.tags) return null;

  if (this.version === 'id3v1' ||
      this.version === 'id4') {
    return this.tags[name] || null;
  } else {
    var i = 0,
        length;

    if (ID3v2_ALIAS.hasOwnProperty(name)) {
      name = ID3v2_ALIAS[name];
    }

    if (name instanceof Array) {
      for (length = name.length; i < length; i++) {
        if (this.tags.hasOwnProperty(name[i])) {
          var data = this.tags[name[i]].data;
          return arr !== true && data instanceof Array ? data[0] : data;
        }
      }
    } else if (this.tags.hasOwnProperty(name)) {
      var data = this.tags[name].data;
      return arr !== true && data instanceof Array ? data[0] : data;
    }
  }

  return null;
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
};

var ID3v2_ALIAS = exports.ID3v2_ALIAS = {
  "title"  : ["TIT2", "TT2"],
  "artist" : ["TPE1", "TP1"],
  "album"  : ["TALB", "TAL"],
  "year"   : ["TYER", "TYE"],
  "comment": ["COMM", "COM"],
  "track"  : ["TRCK", "TRK"],
  "genre"  : ["TCON", "TCO"],
  "picture": ["APIC", "PIC"],
  "lyrics" : ["USLT", "ULT"]
};
