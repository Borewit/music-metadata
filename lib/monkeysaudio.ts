'use strict'
var common = require('./common')
var strtok = require('strtok2')
var type = 'APEv2' // ToDo: version should be made dynamic, APE may also contain ID3

var ape = {}

/**
 * APETag version history / supported formats
 *
 *  1.0 (1000) - Original APE tag spec.  Fully supported by this code.
 *  2.0 (2000) - Refined APE tag spec (better streaming support, UTF encoding). Fully supported by this code.
 *
 *  Notes:
 *  - also supports reading of ID3v1.1 tags
 *  - all saving done in the APE Tag format using CURRENT_APE_TAG_VERSION
 *
 * APE File Format Overview: (pieces in order -- only valid for the latest version APE files)
 *
 * JUNK - any amount of "junk" before the APE_DESCRIPTOR (so people that put ID3v2 tags on the files aren't hosed)
 * APE_DESCRIPTOR - defines the sizes (and offsets) of all the pieces, as well as the MD5 checksum
 * APE_HEADER - describes all of the necessary information about the APE file
 * SEEK TABLE - the table that represents seek offsets [optional]
 * HEADER DATA - the pre-audio data from the original file [optional]
 * APE FRAMES - the actual compressed audio (broken into frames for seekability)
 * TERMINATING DATA - the post-audio data from the original file [optional]
 * TAG - describes all the properties of the file [optional]
 */

module.exports = function (stream, callback, done) {

  strtok.parse(stream, function (v, cb) {
    if (v === undefined) {
      cb.state = 'descriptor'
      return Ape.descriptor
    }

    switch (cb.state) {
      case 'descriptor':
        if (v.ID !== 'MAC ') {
          throw new Error('Expected MAC on beginning of file') // ToDo: strip/parse JUNK
        }
        ape.descriptor = v
        var lenExp = v.descriptorBytes - ape.descriptor.len
        if (lenExp > 0) {
          cb.state = 'descriptorExpansion'
          return new strtok.IgnoreType(lenExp)
        } else {
          cb.state = 'header'
          return Ape.header
        }
        cb.state = 'descriptorExpansion'
        return new strtok.IgnoreType(lenExp)

      case 'descriptorExpansion':
        cb.state = 'header'
        return Ape.header

      case 'header':
        ape.header = v
        callback('format', 'tagType', type)
        callback('format', 'bitsPerSample', v.bitsPerSample)
        callback('format', 'sampleRate', v.sampleRate)
        callback('format', 'numberOfChannels', v.channel)
        callback('format', 'duration', calculateDuration(v))
        var forwardBytes = ape.descriptor.seekTableBytes + ape.descriptor.headerDataBytes +
          ape.descriptor.apeFrameDataBytes + ape.descriptor.terminatingDataBytes
        cb.state = 'skipData'
        return new strtok.IgnoreType(forwardBytes)

      case 'skipData':
        cb.state = 'tagFooter'
        return Ape.tagFooter

      case 'tagFooter':
        if (v.ID !== 'APETAGEX') {
          done(new Error('Expected footer to start with APETAGEX '))
        }
        ape.footer = v
        cb.state = 'tagField'
        return Ape.tagField(v)

      case 'tagField':
        parseTags(ape.footer, v, callback)
        done()
        break

      default:
        done(new Error('Illegal state: ' + cb.state))
    }
    return 0
  })
}

var Ape = {

  /**
   * APE_DESCRIPTOR: defines the sizes (and offsets) of all the pieces, as well as the MD5 checksum
   */
  descriptor: {
    len: 52,

    get: function (buf, off) {
      return {
        // should equal 'MAC '
        ID: new strtok.StringType(4, 'ascii').get(buf, off),
        // version number * 1000 (3.81 = 3810) (remember that 4-byte alignment causes this to take 4-bytes)
        version: strtok.UINT32_LE.get(buf, off + 4) / 1000,
        // the number of descriptor bytes (allows later expansion of this header)
        descriptorBytes: strtok.UINT32_LE.get(buf, off + 8),
        // the number of header APE_HEADER bytes
        headerBytes: strtok.UINT32_LE.get(buf, off + 12),
        // the number of header APE_HEADER bytes
        seekTableBytes: strtok.UINT32_LE.get(buf, off + 16),
        // the number of header data bytes (from original file)
        headerDataBytes: strtok.UINT32_LE.get(buf, off + 20),
        // the number of bytes of APE frame data
        apeFrameDataBytes: strtok.UINT32_LE.get(buf, off + 24),
        // the high order number of APE frame data bytes
        apeFrameDataBytesHigh: strtok.UINT32_LE.get(buf, off + 28),
        // the terminating data of the file (not including tag data)
        terminatingDataBytes: strtok.UINT32_LE.get(buf, off + 32),
        // the MD5 hash of the file (see notes for usage... it's a littly tricky)
        fileMD5: new strtok.BufferType(16).get(buf, off + 36)
      }
    }
  },

  /**
   * APE_HEADER: describes all of the necessary information about the APE file
   */
  header: {
    len: 24,

    get: function (buf, off) {
      return {
        // the compression level (see defines I.E. COMPRESSION_LEVEL_FAST)
        compressionLevel: strtok.UINT16_LE.get(buf, off),
        // any format flags (for future use)
        formatFlags: strtok.UINT16_LE.get(buf, off + 2),
        // the number of audio blocks in one frame
        blocksPerFrame: strtok.UINT32_LE.get(buf, off + 4),
        // the number of audio blocks in the final frame
        finalFrameBlocks: strtok.UINT32_LE.get(buf, off + 8),
        // the total number of frames
        totalFrames: strtok.UINT32_LE.get(buf, off + 12),
        // the bits per sample (typically 16)
        bitsPerSample: strtok.UINT16_LE.get(buf, off + 16),
        // the number of channels (1 or 2)
        channel: strtok.UINT16_LE.get(buf, off + 18),
        // the sample rate (typically 44100)
        sampleRate: strtok.UINT32_LE.get(buf, off + 20)
      }
    }
  },

  /**
   * TAG: describes all the properties of the file [optional]
   */
  tagFooter: {
    len: 32,

    get: function (buf, off) {
      return {
        // should equal 'APETAGEX'
        ID: new strtok.StringType(8, 'ascii').get(buf, off),
        // equals CURRENT_APE_TAG_VERSION
        version: strtok.UINT32_LE.get(buf, off + 8),
        // the complete size of the tag, including this footer (excludes header)
        size: strtok.UINT32_LE.get(buf, off + 12),
        // the number of fields in the tag
        fields: strtok.UINT32_LE.get(buf, off + 16),
        // reserved for later use (must be zero)
        reserved: new strtok.BufferType(12).get(buf, off + 20) // ToDo: what is this???
      }
    }
  },

  tagField: function (footer) {
    return new strtok.BufferType(footer.size - Ape.tagFooter.len)
  }
}

/**
 * Calculate the media file duration
 * @param ah ApeHeader
 * @return {number} duration in seconds
 */
function calculateDuration (ah) {
  var duration = ah.totalFrames > 1 ? ah.blocksPerFrame * (ah.totalFrames - 1) : 0
  duration += ah.finalFrameBlocks
  return duration / ah.sampleRate
}

function parseTags (footer, buffer, callback) {
  var offset = 0

  for (var i = 0; i < footer.fields; i++) {
    var size = strtok.UINT32_LE.get(buffer, offset, offset += 4)
    var flags = parseTagFlags(strtok.UINT32_LE.get(buffer, offset, offset += 4))

    var zero = common.findZero(buffer, offset, buffer.length)
    var key = buffer.toString('ascii', offset, zero)
    offset = zero + 1

    switch (flags.dataType) {
      case 'text_utf8': { // utf-8 textstring
        var value = buffer.toString('utf8', offset, offset += size)
        var values = value.split(/\x00/g)

        /*jshint loopfunc:true */
        values.forEach(function (val) {
          callback(type, key, val)
        })
      }
        break
      case 'binary': { // binary (probably artwork)
        if (key === 'Cover Art (Front)' || key === 'Cover Art (Back)') {
          var picData = buffer.slice(offset, offset + size)

          var off = 0
          zero = common.findZero(picData, off, picData.length)
          var description = picData.toString('utf8', off, zero)
          off = zero + 1

          var picture = {
            description: description,
            data: new Buffer(picData.slice(off))
          }

          offset += size
          callback(type, key, picture)
        }
      }
        break
    }
  }
}

function parseTagFlags (flags) {
  return {
    containsHeader: isBitSet(flags, 31),
    containsFooter: isBitSet(flags, 30),
    isHeader: isBitSet(flags, 31),
    readOnly: isBitSet(flags, 0),
    dataType: getDataType((flags & 6) >> 1)
  }
}

function getDataType (type) {
  var types = ['text_utf8', 'binary', 'external_info', 'reserved']
  return types[type]
}

/**
 * @param num {number}
 * @param bit 0 is least significant bit (LSB)
 * @return {boolean} true if bit is 1; otherwise false
 */
function isBitSet (num, bit) {
  return (num & 1 << bit) !== 0
}
