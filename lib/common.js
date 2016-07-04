'use strict'
var strtok = require('strtok2')
var equal = require('deep-equal')
var windows1252decoder = require('./windows1252decoder')

var asfGuidBuf = new Buffer([
  0x30, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11,
  0xA6, 0xD9, 0x00, 0xAA, 0x00, 0x62, 0xCE, 0x6C
])
exports.asfGuidBuf = asfGuidBuf

exports.getParserForMediaType = function (types, header) {
  for (var i = 0; i < types.length; i += 1) {
    var type = types[i]
    var offset = type.offset || 0
    if (header.length >= offset + type.buf.length &&
      equal(header.slice(offset, offset + type.buf.length), type.buf)) {
      return type.tag
    }
  }
  // default to id3v1.1 if we cannot detect any other tags
  return require('./id3v1')
}

exports.streamOnRealEnd = function (stream, callback) {
  stream.on('end', done)
  stream.on('close', done)
  function done () {
    stream.removeListener('end', done)
    stream.removeListener('close', done)
    callback()
  }
}

exports.readVorbisPicture = function (buffer) {
  var picture = {}
  var offset = 0

  picture.type = PICTURE_TYPE[strtok.UINT32_BE.get(buffer, 0)]

  var mimeLen = strtok.UINT32_BE.get(buffer, offset += 4)
  picture.format = buffer.toString('utf-8', offset += 4, offset + mimeLen)

  var descLen = strtok.UINT32_BE.get(buffer, offset += mimeLen)
  picture.description = buffer.toString('utf-8', offset += 4, offset + descLen)

  picture.width = strtok.UINT32_BE.get(buffer, offset += descLen)
  picture.height = strtok.UINT32_BE.get(buffer, offset += 4)
  picture.colour_depth = strtok.UINT32_BE.get(buffer, offset += 4)
  picture.indexed_color = strtok.UINT32_BE.get(buffer, offset += 4)

  var picDataLen = strtok.UINT32_BE.get(buffer, offset += 4)
  picture.data = new Buffer(buffer.slice(offset += 4, offset + picDataLen))

  return picture
}

exports.removeUnsyncBytes = function (buffer) {
  var readI = 0
  var writeI = 0
  while (readI < buffer.length - 1) {
    if (readI !== writeI) {
      buffer[writeI] = buffer[readI]
    }
    readI += (buffer[readI] === 0xFF && buffer[readI + 1] === 0) ? 2 : 1
    writeI++
  }
  if (readI < buffer.length) {
    buffer[writeI++] = buffer[readI++]
  }
  return buffer.slice(0, writeI)
}

exports.findZero = function (buffer, start, end, encoding) {
  var i = start
  if (encoding === 'utf16') {
    while (buffer[i] !== 0 || buffer[i + 1] !== 0) {
      if (i >= end) return end
      i += 2
    }
    return i
  } else {
    while (buffer[i] !== 0) {
      if (i >= end) return end
      i++
    }
    return i
  }
}

exports.sum = function (arr) {
  var s = 0
  var i
  for (i = 0; i < arr.length; i++) {
    s += arr[i]
  }
  return s
}

function swapBytes (buffer) {
  var l = buffer.length
  if (l & 0x01) {
    throw new Error('Buffer length must be even')
  }
  for (var i = 0; i < l; i += 2) {
    var a = buffer[i]
    buffer[i] = buffer[i + 1]
    buffer[i + 1] = a
  }
  return buffer
}

var readUTF16String = exports.readUTF16String = function (buffer) {
  var offset = 0
  if (buffer[0] === 0xFE && buffer[1] === 0xFF) { // big endian
    buffer = swapBytes(buffer)
    offset = 2
  } else if (buffer[0] === 0xFF && buffer[1] === 0xFE) { // little endian
    offset = 2
  }
  return buffer.toString('ucs2', offset)
}

exports.decodeString = function (buffer, encoding) {
  // annoying workaround for a double BOM issue
  // https://github.com/leetreveil/musicmetadata/issues/84
  if (buffer[0] === 0xFF && buffer[1] === 0xFE && buffer[2] === 0xFE && buffer[3] === 0xFF) {
    buffer = buffer.slice(2)
  }

  if (encoding === 'utf16le' || encoding === 'utf16') {
    return readUTF16String(buffer)
  } else if (encoding === 'utf8') {
    return buffer.toString('utf8')
  } else if (encoding === 'iso-8859-1') {
    return windows1252decoder(buffer)
  }

  throw Error(encoding + ' encoding is not supported!')
}

exports.parseGenre = function (origVal) {
  // match everything inside parentheses
  var split = origVal.trim().split(/\((.*?)\)/g)
    .filter(function (val) { return val !== '' })

  var array = []
  for (var i = 0; i < split.length; i++) {
    var cur = split[i]
    if (/^\d+$/.test(cur) && !isNaN(parseInt(cur, 10))) {
      cur = GENRES[cur]
    }
    array.push(cur)
  }

  return array
    .filter(function (val) { return val !== undefined })
    .join('/')
}

exports.stripNulls = function (str) {
  str = str.replace(/^\x00+/g, '')
  str = str.replace(/\x00+$/g, '')
  return str
}

exports.strtokUINT24_BE = {
  len: 3,
  get: function (buf, off) {
    return (((buf[off] << 8) + buf[off + 1]) << 8) + buf[off + 2]
  }
}

exports.strtokBITSET = {
  len: 1,
  get: function (buf, off, bit) {
    return (buf[off] & (1 << bit)) !== 0
  }
}

exports.strtokINT32SYNCSAFE = {
  len: 4,
  get: function (buf, off) {
    return buf[off + 3] & 0x7f | ((buf[off + 2]) << 7) |
        ((buf[off + 1]) << 14) | ((buf[off]) << 21)
  }
}

var PICTURE_TYPE = exports.PICTURE_TYPE = [
  'Other',
  "32x32 pixels 'file icon' (PNG only)",
  'Other file icon',
  'Cover (front)',
  'Cover (back)',
  'Leaflet page',
  'Media (e.g. lable side of CD)',
  'Lead artist/lead performer/soloist',
  'Artist/performer',
  'Conductor',
  'Band/Orchestra',
  'Composer',
  'Lyricist/text writer',
  'Recording Location',
  'During recording',
  'During performance',
  'Movie/video screen capture',
  'A bright coloured fish',
  'Illustration',
  'Band/artist logotype',
  'Publisher/Studio logotype'
]

var GENRES = exports.GENRES = [
  'Blues', 'Classic Rock', 'Country', 'Dance', 'Disco', 'Funk', 'Grunge', 'Hip-Hop',
  'Jazz', 'Metal', 'New Age', 'Oldies', 'Other', 'Pop', 'R&B', 'Rap', 'Reggae', 'Rock',
  'Techno', 'Industrial', 'Alternative', 'Ska', 'Death Metal', 'Pranks', 'Soundtrack',
  'Euro-Techno', 'Ambient', 'Trip-Hop', 'Vocal', 'Jazz+Funk', 'Fusion', 'Trance',
  'Classical', 'Instrumental', 'Acid', 'House', 'Game', 'Sound Clip', 'Gospel', 'Noise',
  'Alt. Rock', 'Bass', 'Soul', 'Punk', 'Space', 'Meditative', 'Instrumental Pop',
  'Instrumental Rock', 'Ethnic', 'Gothic', 'Darkwave', 'Techno-Industrial',
  'Electronic', 'Pop-Folk', 'Eurodance', 'Dream', 'Southern Rock', 'Comedy', 'Cult',
  'Gangsta Rap', 'Top 40', 'Christian Rap', 'Pop/Funk', 'Jungle', 'Native American',
  'Cabaret', 'New Wave', 'Psychedelic', 'Rave', 'Showtunes', 'Trailer', 'Lo-Fi', 'Tribal',
  'Acid Punk', 'Acid Jazz', 'Polka', 'Retro', 'Musical', 'Rock & Roll', 'Hard Rock',
  'Folk', 'Folk/Rock', 'National Folk', 'Swing', 'Fast-Fusion', 'Bebob', 'Latin', 'Revival',
  'Celtic', 'Bluegrass', 'Avantgarde', 'Gothic Rock', 'Progressive Rock', 'Psychedelic Rock',
  'Symphonic Rock', 'Slow Rock', 'Big Band', 'Chorus', 'Easy Listening', 'Acoustic', 'Humour',
  'Speech', 'Chanson', 'Opera', 'Chamber Music', 'Sonata', 'Symphony', 'Booty Bass', 'Primus',
  'Porn Groove', 'Satire', 'Slow Jam', 'Club', 'Tango', 'Samba', 'Folklore',
  'Ballad', 'Power Ballad', 'Rhythmic Soul', 'Freestyle', 'Duet', 'Punk Rock', 'Drum Solo',
  'A Cappella', 'Euro-House', 'Dance Hall', 'Goa', 'Drum & Bass', 'Club-House',
  'Hardcore', 'Terror', 'Indie', 'BritPop', 'Negerpunk', 'Polsk Punk', 'Beat',
  'Christian Gangsta Rap', 'Heavy Metal', 'Black Metal', 'Crossover', 'Contemporary Christian',
  'Christian Rock', 'Merengue', 'Salsa', 'Thrash Metal', 'Anime', 'JPop', 'Synthpop',
  'Abstract', 'Art Rock', 'Baroque', 'Bhangra', 'Big Beat', 'Breakbeat', 'Chillout',
  'Downtempo', 'Dub', 'EBM', 'Eclectic', 'Electro', 'Electroclash', 'Emo', 'Experimental',
  'Garage', 'Global', 'IDM', 'Illbient', 'Industro-Goth', 'Jam Band', 'Krautrock',
  'Leftfield', 'Lounge', 'Math Rock', 'New Romantic', 'Nu-Breakz', 'Post-Punk', 'Post-Rock',
  'Psytrance', 'Shoegaze', 'Space Rock', 'Trop Rock', 'World Music', 'Neoclassical', 'Audiobook',
  'Audio Theatre', 'Neue Deutsche Welle', 'Podcast', 'Indie Rock', 'G-Funk', 'Dubstep',
  'Garage Rock', 'Psybient'
]
