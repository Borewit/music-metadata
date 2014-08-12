var strtok = require('strtok2');
var bufferEqual = require('buffer-equal');
var equal = require('deep-equal');
var int53 = require('int53');

var asfGuidBuf = new Buffer([
    0x30, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11,
    0xA6, 0xD9, 0x00, 0xAA, 0x00, 0x62, 0xCE, 0x6C
  ]);
exports.asfGuidBuf = asfGuidBuf;

exports.getParserForMediaType = function (types, header) {
  for (var i = 0; i < types.length; i += 1) {
    var type = types[i];
    var offset = type.offset || 0;
    if (header.length >= offset + type.buf.length &&
        bufferEqual(header.slice(offset, offset + type.buf.length), type.buf))
    {
      return type.tag;
    }
  }
  // default to id3v1.1 if we cannot detect any other tags
  return require('./id3v1');
}

exports.streamOnRealEnd = function(stream, callback) {
  stream.on('end', done);
  stream.on('close', done);
  function done() {
    stream.removeListener('end', done);
    stream.removeListener('close', done);
    callback();
  }
};

exports.readVorbisPicture = function (buffer) {
  var picture = {};
  var offset = 0;

  picture.type = PICTURE_TYPE[strtok.UINT32_BE.get(buffer, 0)];

  var mimeLen = strtok.UINT32_BE.get(buffer, offset += 4);
  picture.format = buffer.toString('utf-8', offset += 4, offset + mimeLen);

  var descLen = strtok.UINT32_BE.get(buffer, offset += mimeLen);
  picture.description = buffer.toString('utf-8', offset += 4, offset + descLen);

  picture.width = strtok.UINT32_BE.get(buffer, offset += descLen);
  picture.height = strtok.UINT32_BE.get(buffer, offset += 4);
  picture.colour_depth = strtok.UINT32_BE.get(buffer, offset += 4);
  picture.indexed_color = strtok.UINT32_BE.get(buffer, offset += 4);

  var picDataLen = strtok.UINT32_BE.get(buffer, offset += 4);
  picture.data = buffer.slice(offset += 4, offset + picDataLen);

  return picture;
}

exports.removeUnsyncBytes = function (buffer) {
  var readI = 0;
  var writeI = 0;
  while (readI < buffer.length -1) {
    if (readI !== writeI) {
      buffer[writeI] = buffer[readI];
    }
    readI += (buffer[readI] === 0xFF && buffer[readI + 1] === 0) ? 2 : 1;
    writeI++;
  }
  if (readI < buffer.length) {
    buffer[writeI++] = buffer[readI++];
  }
  return buffer.slice(0, writeI);
}

exports.findZero = function (buffer, start, end, encoding) {
  var i = start;
  if (encoding === 'utf16') {
    while (buffer[i] !== 0 || buffer[i+1] !== 0) {
      if (i >= end) return end;
      i++;
    }
  } else {
    while (buffer[i] !== 0) {
      if (i >= end) return end;
      i++;
    }
  }
  return i;
}

var decodeString = exports.decodeString = function (b, encoding, start, end) {
  var text = '';
  if (encoding == 'utf16') {
    text = readUTF16String(b.slice(start, end));
  } else {
    var enc = (encoding == 'iso-8859-1') ? 'binary' : 'utf8';
    text = b.toString(enc, start, end);
  }
  return { text : text, length : end - start }
}

exports.parseGenre = function (origVal) {
  // match everything inside parentheses
  var split = origVal.trim().split(/\((.*?)\)/g)
    .filter(function (val) { return val !== ''; });

  var array = [];
  for (var i = 0; i < split.length; i++) {
    var cur = split[i];
    if (!isNaN(parseInt(cur))) cur = GENRES[cur];
    array.push(cur);
  }

  return array.join('/');
}

var readUTF16String = exports.readUTF16String = function (buffer) {
  var offset = 0;
  if (buffer[0] === 0xFE && buffer[1] === 0xFF) { // big endian
    buffer = swapBytes(buffer);
    offset = 2;
  } else if (buffer[0] === 0xFF && buffer[1] === 0xFE) { // little endian
    offset = 2;
  }
  return buffer.toString('ucs2', offset);
}

function swapBytes(buffer) {
  var l = buffer.length;
  if (l & 0x01) {
    throw new Error('Buffer length must be even');
  }
  for (var i = 0; i < l; i += 2) {
    var a = buffer[i];
    buffer[i] = buffer[i+1];
    buffer[i+1] = a;
  }
  return buffer;
}

exports.stripNulls = function(str) {
  str = str.replace(/^\x00+/g, "");
  str = str.replace(/\x00+$/g, "");
  return str;
}

exports.strtokUINT24_BE = {
  len: 3,
  get: function(buf, off) {
    return (((buf[off] << 8) + buf[off + 1]) << 8) + buf[off + 2];
  }
}

exports.strtokBITSET = {
  len: 1,
  get: function(buf, off, bit) {
    return (buf[off] & (1 << bit)) !== 0;
  }
}

exports.strtokINT32SYNCSAFE = {
  len: 4,
  get: function(buf, off) {
    return buf[off + 3] & 0x7f | ((buf[off + 2]) << 7) |
      ((buf[off + 1]) << 14) | ((buf[off]) << 21);
  }
}

var PICTURE_TYPE = exports.PICTURE_TYPE = [
  "Other",
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
]

var GENRES = exports.GENRES = [
  'Blues','Classic Rock','Country','Dance','Disco','Funk','Grunge','Hip-Hop',
  'Jazz','Metal','New Age','Oldies','Other','Pop','R&B','Rap','Reggae','Rock',
  'Techno','Industrial','Alternative','Ska','Death Metal','Pranks','Soundtrack',
  'Euro-Techno','Ambient','Trip-Hop','Vocal','Jazz+Funk','Fusion','Trance',
  'Classical','Instrumental','Acid','House','Game','Sound Clip','Gospel','Noise',
  'Alt. Rock','Bass','Soul','Punk','Space','Meditative','Instrumental Pop',
  'Instrumental Rock','Ethnic','Gothic','Darkwave','Techno-Industrial',
  'Electronic','Pop-Folk','Eurodance','Dream','Southern Rock','Comedy','Cult',
  'Gangsta Rap','Top 40','Christian Rap','Pop/Funk','Jungle','Native American',
  'Cabaret','New Wave','Psychedelic','Rave','Showtunes','Trailer','Lo-Fi','Tribal',
  'Acid Punk','Acid Jazz','Polka','Retro','Musical','Rock & Roll','Hard Rock',
  'Folk','Folk/Rock','National Folk','Swing','Fast-Fusion','Bebob','Latin','Revival',
  'Celtic','Bluegrass','Avantgarde','Gothic Rock','Progressive Rock','Psychedelic Rock',
  'Symphonic Rock','Slow Rock','Big Band','Chorus','Easy Listening','Acoustic','Humour',
  'Speech','Chanson','Opera','Chamber Music','Sonata','Symphony','Booty Bass','Primus',
  'Porn Groove','Satire','Slow Jam','Club','Tango','Samba','Folklore',
  'Ballad','Power Ballad','Rhythmic Soul','Freestyle','Duet','Punk Rock','Drum Solo',
  'A Cappella','Euro-House','Dance Hall','Goa','Drum & Bass','Club-House',
  'Hardcore','Terror','Indie','BritPop','Negerpunk','Polsk Punk','Beat',
  'Christian Gangsta Rap','Heavy Metal','Black Metal','Crossover','Contemporary Christian',
  'Christian Rock','Merengue','Salsa','Thrash Metal','Anime','JPop','Synthpop'
]

exports.id3BitrateCalculator = function (bits, mpegVersion, layer) {
  if (equal(bits, [0, 0, 0, 0])) {
    return 'free';
  }
  if (equal(bits, [1, 1, 1, 1])) {
    return 'reserved';
  }
  if (mpegVersion === 1 && layer === 1) {
    if (equal(bits, [0, 0, 0, 1])) return 32;
    if (equal(bits, [0, 0, 1, 0])) return 64;
    if (equal(bits, [0, 0, 1, 1])) return 96;
    if (equal(bits, [0, 1, 0, 0])) return 128;
    if (equal(bits, [0, 1, 0, 1])) return 160;
    if (equal(bits, [0, 1, 1, 0])) return 192;
    if (equal(bits, [0, 1, 1, 1])) return 224;
    if (equal(bits, [1, 0, 0, 0])) return 256;
    if (equal(bits, [1, 0, 0, 1])) return 288;
    if (equal(bits, [1, 0, 1, 0])) return 320;
    if (equal(bits, [1, 0, 1, 1])) return 352;
    if (equal(bits, [1, 1, 0, 0])) return 384;
    if (equal(bits, [1, 1, 0, 1])) return 416;
    if (equal(bits, [1, 1, 1, 0])) return 448;
  } else if (mpegVersion === 1 && layer === 2) {
    if (equal(bits, [0, 0, 0, 1])) return 32;
    if (equal(bits, [0, 0, 1, 0])) return 48;
    if (equal(bits, [0, 0, 1, 1])) return 56;
    if (equal(bits, [0, 1, 0, 0])) return 64;
    if (equal(bits, [0, 1, 0, 1])) return 80;
    if (equal(bits, [0, 1, 1, 0])) return 96;
    if (equal(bits, [0, 1, 1, 1])) return 112;
    if (equal(bits, [1, 0, 0, 0])) return 128;
    if (equal(bits, [1, 0, 0, 1])) return 160;
    if (equal(bits, [1, 0, 1, 0])) return 192;
    if (equal(bits, [1, 0, 1, 1])) return 224;
    if (equal(bits, [1, 1, 0, 0])) return 256;
    if (equal(bits, [1, 1, 0, 1])) return 320;
    if (equal(bits, [1, 1, 1, 0])) return 384;
  } else if (mpegVersion === 1 && layer === 3) {
    if (equal(bits, [0, 0, 0, 1])) return 32;
    if (equal(bits, [0, 0, 1, 0])) return 40;
    if (equal(bits, [0, 0, 1, 1])) return 48;
    if (equal(bits, [0, 1, 0, 0])) return 56;
    if (equal(bits, [0, 1, 0, 1])) return 64;
    if (equal(bits, [0, 1, 1, 0])) return 80;
    if (equal(bits, [0, 1, 1, 1])) return 96;
    if (equal(bits, [1, 0, 0, 0])) return 112;
    if (equal(bits, [1, 0, 0, 1])) return 128;
    if (equal(bits, [1, 0, 1, 0])) return 160;
    if (equal(bits, [1, 0, 1, 1])) return 192;
    if (equal(bits, [1, 1, 0, 0])) return 224;
    if (equal(bits, [1, 1, 0, 1])) return 256;
    if (equal(bits, [1, 1, 1, 0])) return 320;
  } else if (mpegVersion === 2 && layer === 1) {
    if (equal(bits, [0, 0, 0, 1])) return 32;
    if (equal(bits, [0, 0, 1, 0])) return 48;
    if (equal(bits, [0, 0, 1, 1])) return 56;
    if (equal(bits, [0, 1, 0, 0])) return 64;
    if (equal(bits, [0, 1, 0, 1])) return 80;
    if (equal(bits, [0, 1, 1, 0])) return 96;
    if (equal(bits, [0, 1, 1, 1])) return 112;
    if (equal(bits, [1, 0, 0, 0])) return 128;
    if (equal(bits, [1, 0, 0, 1])) return 144;
    if (equal(bits, [1, 0, 1, 0])) return 160;
    if (equal(bits, [1, 0, 1, 1])) return 176;
    if (equal(bits, [1, 1, 0, 0])) return 192;
    if (equal(bits, [1, 1, 0, 1])) return 224;
    if (equal(bits, [1, 1, 1, 0])) return 256;
  } else if (mpegVersion === 2 && (layer === 2 || layer === 3)) {
    if (equal(bits, [0, 0, 0, 1])) return 8;
    if (equal(bits, [0, 0, 1, 0])) return 16;
    if (equal(bits, [0, 0, 1, 1])) return 24;
    if (equal(bits, [0, 1, 0, 0])) return 32;
    if (equal(bits, [0, 1, 0, 1])) return 40;
    if (equal(bits, [0, 1, 1, 0])) return 48;
    if (equal(bits, [0, 1, 1, 1])) return 56;
    if (equal(bits, [1, 0, 0, 0])) return 64;
    if (equal(bits, [1, 0, 0, 1])) return 80;
    if (equal(bits, [1, 0, 1, 0])) return 96;
    if (equal(bits, [1, 0, 1, 1])) return 112;
    if (equal(bits, [1, 1, 0, 0])) return 128;
    if (equal(bits, [1, 1, 0, 1])) return 144;
    if (equal(bits, [1, 1, 1, 0])) return 160;
  }
}

exports.samplingRateCalculator = function (bits, mpegVersion) {
  if (equal(bits, [1, 1])) {
    return 'reserved';
  }
  if (mpegVersion === 1) {
    if (equal(bits, [0, 0])) return 44100;
    if (equal(bits, [0, 1])) return 48000;
    if (equal(bits, [1, 0])) return 32000;
  } else if (mpegVersion === 2) {
    if (equal(bits, [0, 0])) return 22050;
    if (equal(bits, [0, 1])) return 24000;
    if (equal(bits, [1, 0])) return 16000;
  } else if (mpegVersion === 2.5) {
    if (equal(bits, [0, 0])) return 11025;
    if (equal(bits, [0, 1])) return 12000;
    if (equal(bits, [1, 0])) return 8000;
  }
}
