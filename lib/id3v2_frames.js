var Buffer       = require('buffer').Buffer;
var strtok       = require('strtok2');
var common       = require('./common');
var findZero     = common.findZero;
var decodeString = common.decodeString;

exports.readData = function readData(b, type, flags, major) {
  var encoding;
  var length = b.length;
  var offset = 0;
  var output = [];

  if (type[0] === 'T') {
    type = 'T*';
    encoding = getTextEncoding(b[0]);
  }

  switch (type) {
    case 'T*':
      var text = decodeString(b, encoding, 1, length).text;
      //trim any whitespace and any leading or trailing null characters
      text = text.trim().replace(/^\x00+/,'').replace(/\x00+$/,'');
      text = text.replace(/^\uFEFF/, ''); //REMOVE BOM
      // id3v2.4 defines that multiple T* values are separted by 0x00
      output = text.split(/\x00/g);
      break;

    case 'PIC':
    case 'APIC':
      var pic = {};
      encoding = getTextEncoding(b[0]);
      
      offset += 1;
        
      switch (major) {
        case 2:
          pic.format = decodeString(b, encoding, offset, offset + 3).text;
          offset += 3;
          break;
        case 3:
        case 4:
          pic.format = decodeString(b, encoding, offset, findZero(b, offset, length, encoding));
          offset += 1 + pic.format.length;
          pic.format = pic.format.text;
          break;
      }
    
      pic.type = common.PICTURE_TYPE[b[offset]];
      offset += 1;
    
      pic.description = decodeString(b, encoding, offset, findZero(b, offset, length, encoding));
      offset += 1 + pic.description.length;
      pic.description = pic.description.text;
    
      pic.data = new Buffer(b.slice(offset, length));
      output = [pic];
      break;

    case 'COM':
    case 'COMM':
      var comment = {};

      encoding = getTextEncoding(b[0]);
      offset +=1;

      comment.language = decodeString(b, encoding, offset, offset + 3).text;
      offset += 3;
      
      comment.short_description = decodeString(
        b, encoding, offset, findZero(b, offset, length, encoding));
      offset += 1 + comment.short_description.length;
      comment.short_description = comment.short_description.text.trim().replace(/\x00/g,'');
      comment.text = decodeString(b, encoding, offset, length).text.trim().replace(/\x00/g,'');
      output = [comment];
      break;

    case 'CNT':
    case 'PCNT':
      output = [strtok.UINT32_BE.get(b, 0)];
      break;

    case 'ULT':
    case 'USLT':
      var lyrics  = {};
        
      encoding = getTextEncoding(b[0]);
      offset += 1;

      lyrics.language = decodeString(b, encoding, offset, offset + 3).text;
      offset += 3;
        
      lyrics.descriptor = decodeString(b, encoding, offset, findZero(b, offset, length, encoding));
      offset += 1 + lyrics.descriptor.length;        
      lyrics.descriptor = lyrics.descriptor.text;
        
      lyrics.text = decodeString(b, encoding, offset, length);
      lyrics.text = lyrics.text.text;
        
      output = [lyrics];
      break;
  }

  return output;
};

function getTextEncoding(byte) {
  switch (byte) {
    case 0x00:
      return 'iso-8859-1'; //binary
    case 0x01:
    case 0x02:
      return 'utf16'; //01 = with bom, 02 = without bom
    case 0x03:
      return 'utf8';
    default:
      return 'utf8';
  }
}
