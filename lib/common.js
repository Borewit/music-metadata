
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

exports.GENRES = ['Blues','Classic Rock','Country','Dance','Disco','Funk','Grunge','Hip-Hop',
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
	'Christian Rock','Merengue','Salsa','Thrash Metal','Anime','JPop','Synthpop'];
