
exports.findZero = function (buffer, start, end) {
  var i = start;
  while (buffer[i] !== 0) {
    if (i >= end) {
      return end;
    }
    i++;
  }
  return i;
};

exports.isBitSetAt = function isBitSetAt (b, offset, bit) {
  return (b[offset] & (1 << bit)) !== 0;
};

exports.getInt24 = function getInt24 (b, offset, big_endian) {
  var byte1 = b[offset],
      byte2 = b[offset + 1],
      byte3 = b[offset + 2];

  var int = big_endian ?
            (((byte1 << 8) + byte2) << 8) + byte3 :
            (((byte3 << 8) + byte2) << 8) + byte1;
  if (int < 0) int += 16777216;
  return int;
};

var decodeString = exports.decodeString = function decodeString(b, charset, start, end) {
  switch (charset) {
    case 'ascii':
      return {
        text:   b.toString(charset, start, end),
        length: end - start
      };
    case 'utf16':
      var bytes = getBytes(b, start, end);
      return {
        text:   readUTF16String(bytes),
        length: bytes.length
      };
    case 'utf8':
      var text = b.toString(charset, start, end);
      return {
        text:   text,
        length: Buffer.byteLength(text)
      };
  }
};

var getBytes = function getBytes (b, start, end) {
  var i = start,
      a = [];

  while (i <= end) {
    a.push(b[i]);
    i++;
  }

  return a;
};

var readUTF16String = function readUTF16String (bytes) {
  var ix      = 0,
      offset1 = 1,
      offset2 = 0,
      maxBytes = bytes.length;

  if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
    bigEndian = true;
    ix        = 2;
    offset1   = 0;
    offset2   = 1;
  } else if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
    bigEndian = false;
    ix = 2;
  }

  var str = '';
  for (var j = 0; ix < maxBytes; j++) {
    var byte1 = bytes[ix + offset1],
        byte2 = bytes[ix + offset2],
        word1 = (byte1 << 8) + byte2;
    ix += 2;

    if (word1 === 0x0000) {
      break;
    } else if (byte1 < 0xD8 || byte1 >= 0xE0) {
      str += String.fromCharCode(word1);
    } else {
      var byte3 = bytes[ix+offset1],
          byte4 = bytes[ix+offset2],
          word2 = (byte3 << 8) + byte4;
      ix += 2;
      str += String.fromCharCode(word1, word2);
    }
  }
  return str;
};
