'use strict'
var Buffer = require('buffer').Buffer
var strtok = require('strtok2')
var common = require('./common')
var findZero = common.findZero
var decodeString = common.decodeString

exports.readData = function readData (b, type, flags, major) {
  var encoding = getTextEncoding(b[0])
  var length = b.length
  var offset = 0
  var output = []
  var nullTerminatorLength = getNullTerminatorLength(encoding)
  var fzero
  var out = {}

  switch (type !== 'TXXX' && type[0] === 'T' ? 'T*' : type) {
    case 'T*': // 4.2.1. Text information frames - details
      var text = decodeString(b.slice(1), encoding).replace(/\x00+$/, '')
      // id3v2.4 defines that multiple T* values are separated by 0x00
      output = text.split(/\x00/g)
      break

    case 'TXXX':
      output = readIdentifierAndData(b, offset + 1, length, encoding)
      output = [{
        description: output.id,
        text: decodeString(output.data, encoding).replace(/\x00+$/, '') }]
      break

    case 'PIC':
    case 'APIC':
      var pic = {}

      offset += 1

      switch (major) {
        case 2:
          pic.format = decodeString(b.slice(offset, offset + 3), encoding)
          offset += 3
          break
        case 3:
        case 4:
          var enc = 'iso-8859-1'
          fzero = findZero(b, offset, length, enc)
          pic.format = decodeString(b.slice(offset, fzero), enc)
          offset = fzero + 1
          break
      }

      pic.type = common.PICTURE_TYPE[b[offset]]
      offset += 1

      fzero = findZero(b, offset, length, encoding)
      pic.description = decodeString(b.slice(offset, fzero), encoding)
      offset = fzero + nullTerminatorLength

      pic.data = new Buffer(b.slice(offset, length))
      output = [pic]
      break

    case 'CNT':
    case 'PCNT':
      output = [strtok.UINT32_BE.get(b, 0)]
      break

    case 'SYLT':
      // skip text encoding (1 byte),
      //      language (3 bytes),
      //      time stamp format (1 byte),
      //      content type (1 byte),
      //      content descriptor (1 byte)
      offset += 7

      output = []
      while (offset < length) {
        var txt = b.slice(offset, offset = findZero(b, offset, length, encoding))
        offset += 5 // push offset forward one +  4 byte timestamp
        output.push(decodeString(txt, encoding))
      }
      break

    case 'ULT':
    case 'USLT':
    case 'COM':
    case 'COMM':

      offset += 1

      out.language = decodeString(b.slice(offset, offset + 3), 'iso-8859-1')
      offset += 3

      fzero = findZero(b, offset, length, encoding)
      out.description = decodeString(b.slice(offset, fzero), encoding)
      offset = fzero + nullTerminatorLength

      out.text = decodeString(b.slice(offset, length), encoding).replace(/\x00+$/, '')

      output = [out]
      break

    case 'UFID':
      output = readIdentifierAndData(b, offset, length, 'iso-8859-1')
      output = [{owner_identifier: output.id, identifier: output.data }]

      break

    case 'PRIV': // private frame
      output = readIdentifierAndData(b, offset, length, 'iso-8859-1')
      output = [{owner_identifier: output.id, data: output.data }]
      break
  }

  return output
}

function readIdentifierAndData (b, offset, length, encoding) {
  var fzero = findZero(b, offset, length, encoding)

  var id = decodeString(b.slice(offset, fzero), encoding)
  offset = fzero + getNullTerminatorLength(encoding)

  return {id: id, data: b.slice(offset, length)}
}

function getTextEncoding (byte) {
  switch (byte) {
    case 0x00:
      return 'iso-8859-1' // binary
    case 0x01:
    case 0x02:
      return 'utf16' // 01 = with bom, 02 = without bom
    case 0x03:
      return 'utf8'
    default:
      return 'utf8'
  }
}

function getNullTerminatorLength (enc) {
  switch (enc) {
    case 'utf16':
      return 2
    default:
      return 1
  }
}
