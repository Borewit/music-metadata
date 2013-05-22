var strtok = require('strtok');
var stream = require('stream');

exports.detectMediaType = function (header) {
  // default to id3v1.1 if we cannot detect any other tags
  var tag = 'id3v1';
  if ('ID3' === header.slice(0, 3)) {
    tag = 'id3v2';
  } else if ('ftypM4A' === header.slice(4, 11)) {
    tag = 'id4';
  } else if ('ftypmp42' === header.slice(4, 12)) {
      tag = 'id4'
  } else if ('OggS' === header.slice(0, 4)) {
    tag = 'ogg';
  } else if ('fLaC' === header.slice(0, 4)) {
    tag = 'flac';
  } else if ('MAC' === header.slice(0, 3)) {
    tag = 'monkeysaudio';
  }
  return tag;
}

stream.Stream.prototype.onRealEnd = function (callback) {
  var called = false;
  this.on('end', function() {
    if (!called) callback();
    called = true;
  })
  this.on('close', function() {
    if (!called) callback();
    called = true;
  })
}

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

exports.isBitSetAt = function (b, offset, bit) {
  return (b[offset] & (1 << bit)) !== 0;
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

function swapBytes (buffer) {
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

var readUTF16String = exports.readUTF16String = function (bytes) {
  // bom detection (big endian)
  if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
    bytes = swapBytes(bytes);
  }
  return bytes.toString('utf16le');
}

strtok.UINT24_BE = {
  len: 3,
  get: function(buf, off) {
    return (((buf[off] << 8) + buf[off + 1]) << 8) + buf[off + 2];
  }
}

strtok.BITSET = {
  len: 1,
  get: function(buf, off, bit) {
    return (buf[off] & (1 << bit)) !== 0;
  }
}

strtok.INT32SYNCSAFE = {
  len: 4,
  get: function(buf, off) {
    return buf[off + 3] & 0x7f | ((buf[off + 2]) << 7) | ((buf[off + 1]) << 14) | ((buf[off]) << 21);
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