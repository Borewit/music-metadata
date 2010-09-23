var Buffer       = require('buffer').Buffer,
    strtok       = require('strtok'),
    common       = require('./common'),
    findZero     = common.findZero,
    decodeString = common.decodeString;

exports.readData = function readData (b, type, offset, length, flags, major) {
  major || (major = 3);

  var orig_type = type;
  if (type[0] === 'T') {
    type = 'T*';
  }

  switch (type) {
    case 'PIC':
    case 'APIC':
      var start   = offset,
          charset = getTextEncoding(b[offset]),
          pic     = {};
      offset += 1;

      switch (major) {
        case 2:
          pic.format =  b.toString('ascii', offset, offset + 3);
          offset     += 4;
          break;
        case 3:
        case 4:
          pic.format =  decodeString(b, charset, offset, findZero(b, offset, start + length));
          offset     += 1 + pic.format.length;
          pic.format =  pic.format.text;
          break;
      }

      pic.type =  PICTURE_TYPE[b[offset]];
      offset   += 1;

      pic.description =  decodeString(b, charset, offset, findZero(b, offset, start + length));
      offset          += 1 + pic.description.length;
      pic.description =  pic.description.text;

      var data;
      Object.defineProperty(pic, 'data', {
        get: function () {
          return data || (data = b.slice(offset, start + length));
        }
      });
      return pic;

    case 'COM':
    case 'COMM':
      var start   = offset,
          charset = getTextEncoding(b[offset]),
          comment = {};
      offset += 1;

      comment.language = b.toString('ascii', offset, offset + 3);
      offset += 3;

      comment.short_description = decodeString(b, charset, offset, findZero(b, offset, start + length));
      offset += 1 + comment.short_description.length;
      comment.short_description = comment.short_description.text;

      comment.text = decodeString(b, charset, offset, start + length).text;
      return comment;

    case 'CNT':
    case 'PCNT':
      return strtok.UINT32_BE.get(b, offset);

    case 'T*':
      var charset = getTextEncoding(b[offset]),
          start = offset,
          text;
      offset += 1;

      if (b[start + length - 1] === 0 &&
          (start + length - 1) >= offset) {
        text = decodeString(b, charset, offset, start + length - 1).text;
      } else {
        text = decodeString(b, charset, offset, start + length).text;
      }

      switch (orig_type) {
        case 'TCO':
        case 'TCON':
          return text.replace(/^\(\d+\)/, '');
      }

      return text;

    case 'ULT':
    case 'USLT':
      var start   = offset,
          charset = getTextEncoding(b[offset]),
          lyrics  = {};
      offset += 1;

      lyrics.language = b.toString('ascii', offset, offset + 3);
      offset += 3;

      lyrics.descriptor =  decodeString(b, charset, offset, findZero(b, offset, start + length));
      offset            += 1 + lyrics.descriptor.length;
      lyrics.descriptor =  lyrics.descriptor.text;

      lyrics.text = decodeString(b, charset, offset, start + length);
      return lyrics;
  }
};

var getTextEncoding = function getTextEncoding (byte) {
  switch (byte) {
    case 0x00:
      // ISO-8859-1
      return 'ascii';
    case 0x01:
      // UTF-16
      return 'utf16';
    case 0x02:
      // UTF-16BE
      return 'utf16';
    case 0x03:
      // UTF-8
      return 'utf8';
  }
  return 'utf8';
};

var PICTURE_TYPE = exports.PICTURE_TYPE = [
  "32x32 pixels 'file icon' (PNG only)",
  "Other file icon",
  "Cover (front)",
  "Cover (back)",
  "Leaflet page",
  "Media (e.g. lable side of CD)",
  "Lead artist/lead performer/soloist",
  "Artist/performer",
  "Conductor",
  "Band/Orchestra",
  "Composer",
  "Lyricist/text writer",
  "Recording Location",
  "During recording",
  "During performance",
  "Movie/video screen capture",
  "A bright coloured fish",
  "Illustration",
  "Band/artist logotype",
  "Publisher/Studio logotype"
];
