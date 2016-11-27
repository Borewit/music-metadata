var windows1252 = [8364, 129, 8218, 402, 8222, 8230, 8224, 8225, 710, 8240, 352,
8249, 338, 141, 381, 143, 144, 8216, 8217, 8220, 8221, 8226, 8211, 8212, 732,
8482, 353, 8250, 339, 157, 382, 376, 160, 161, 162, 163, 164, 165, 166, 167, 168,
169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184,
185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200,
201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216,
217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232,
233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247,
248, 249, 250, 251, 252, 253, 254, 255]

function inRange (a, min, max) {
  return min <= a && a <= max
}

function codePointToString (cp) {
  if (cp <= 0xFFFF) {
    return String.fromCharCode(cp)
  } else {
    cp -= 0x10000
    return String.fromCharCode((cp >> 10) + 0xD800, (cp & 0x3FF) + 0xDC00)
  }
}

function singleByteDecoder (bite, index) {
  if (inRange(bite, 0x00, 0x7F)) {
    return bite
  }

  var code_point = index[bite - 0x80]
  if (code_point === null) {
    throw Error('invaliding encoding')
  }

  return code_point
}

module.exports = function (buffer) {
  var str = ''
  for (var i = 0; i < buffer.length; i++) {
    str += codePointToString(singleByteDecoder(buffer[i], windows1252))
  }
  return str
}
