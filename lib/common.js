var strtok = require('strtok'),
    stream = require('stream');

stream.Stream.prototype.onRealEnd = function(callback) {
  var called = false;
  
  this.on('end', function() {
    if (!called) callback();
    called = true;
  });

  this.on('close', function() {
    if (!called) callback();
    called = true;
  });
};


exports.joinBuffers = function(buffers, totalLength) {
  var result = new Buffer(totalLength);
  
  var pos = 0
  for (var i=0; i < buffers.length; i++) {
    buffers[i].copy(result, pos);
    pos += buffers[i].length;
  }
  
  return result;
}

exports.readVorbisPicture = function(buffer) {
  var picture = {},
      offset = 0;

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

exports.removeUnsyncBytes = function(buffer) {
  var readI = 0,
      writeI = 0;
  
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
};

exports.findZero = function(buffer, start, end, encoding) {
  var i = start;

  if (encoding === 'utf16') {
    while (buffer[i] !== 0 || buffer[i+1] !== 0) {
      body();
    }
  } else {
    while (buffer[i] !== 0) {
      body();
    }
  }
  
  function body() {
    if (i >= end) {
      return end;
    }
    i++;
  }
  
  return i;
};

exports.isBitSetAt = function(b, offset, bit) {
  return (b[offset] & (1 << bit)) !== 0;
};

var decodeString = exports.decodeString = function(b, encoding, start, end) {
  var map = {
    'iso-8859-1' : 'binary',
    'utf16' : 'ucs2',
    'utf8' : 'utf8'
  };
  
  var text = b.toString(map[encoding], start, end);
  
  return {
    text : text,
    length : end - start
  };
};

exports.parseGenre = function(origVal) {
  //match everything inside parentheses	
  var split = origVal.trim().split(/\((.*?)\)/g)
    .filter(function(val) { return val !== ''; });
  
  var array = [];
  for (var i=0; i < split.length; i++) {
    var cur = split[i];
    if (!isNaN(parseInt(cur))) cur = GENRES[cur];
    array.push(cur);
  }
  return array.join('/');
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
];

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
];