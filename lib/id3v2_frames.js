var Buffer = require('buffer').Buffer,
    strtok = require('strtok'),
    common = require('./common'),
    findZero = common.findZero,
    decodeString = common.decodeString;

exports.readData = function readData(b, type, flags, major) {
  var encoding;
  var length = b.length;
  var orig_type = type;
  var offset = 0;
          
  if (type[0] === 'T') {
    type = 'T*';
    encoding = getTextEncoding(b[0]);
  }

  switch (type) {
    case 'T*':
      var text = decodeString(b, encoding, 1, length).text;
      //trim any whitespace and any leading or trailing null characters
      text = text.trim().replace(/^\x00+/,'').replace(/\x00+$/,'');
      //convert nulls into /
      text = text.replace(/\x00/g, '/');
      return text;
      
    case 'PIC':
    case 'APIC':
      var pic = {};
        
      switch (major) {
        case 2:
          encoding = getTextEncoding(b[0]);
          offset += 1;
          pic.format = b.toString(encoding, offset, offset + 3);
          offset += 3;
          break;
        case 3:
          encoding = getTextEncoding(b[0]);
          offset += 1;
          pic.format = decodeString(b, encoding, offset, findZero(b, offset, length));
          pic.format = pic.format.text;
          offset += 1 + pic.format.length;
          break;
        case 4:
          encoding = getTextEncoding(b[0]);
          offset += 1;
          pic.format = decodeString(b, encoding, offset, findZero(b, offset, length));
          pic.format = pic.format.text;
          offset += 1 + pic.format.length;
          break;
      }
    
      pic.type = common.PICTURE_TYPE[b[offset]];
      offset += 1;
    
      pic.description = decodeString(b, encoding, offset, findZero(b, offset, length));
      pic.description = pic.description.text;
      offset += 1 + pic.description.length;
    
      pic.data = b.slice(offset, length);
      return pic;

    case 'COM': case 'COMM':
      var comment = {};

      encoding = getTextEncoding(b[0]);
      offset +=1;

      comment.language = b.toString(encoding, offset, offset + 3);
      offset += 3;

      comment.short_description = decodeString(b, encoding, offset, findZero(b, offset, length));
      offset += 1 + comment.short_description.length;
      comment.short_description = comment.short_description.text.trim().replace(/\x00/g,'');
      comment.text = decodeString(b, encoding, offset, length).text.trim().replace(/\x00/g,'');
      return comment;

    case 'CNT':
    case 'PCNT':
      return strtok.UINT32_BE.get(b, 0);

    case 'ULT':
    case 'USLT':
      var lyrics  = {};
        
      encoding = getTextEncoding(b[0]);
      offset += 1;

      lyrics.language = b.toString(encoding, offset, offset + 3);
      offset += 3;
        
      lyrics.descriptor = decodeString(b, encoding, offset, findZero(b, offset, length));
      offset += 1 + lyrics.descriptor.length;        
      lyrics.descriptor = lyrics.descriptor.text;
        
      lyrics.text = decodeString(b, encoding, offset, length);
      lyrics.text = lyrics.text.text;
        
      return lyrics;
  }
};

var getTextEncoding = function(byte) {
  switch (byte) {
    case 0x00:
      return 'ascii';
    case 0x01: case 0x02:
      return 'utf16';
    case 0x03:
      return 'utf8';
    default:
      return 'utf8';
  }
};