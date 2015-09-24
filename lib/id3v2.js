'use strict'
var strtok = require('strtok2')
var parser = require('./id3v2_frames')
var common = require('./common')

module.exports = function (stream, callback, done, readDuration, fileSize) {
  var frameCount = 0
  var audioFrameHeader
  var bitrates = []

  strtok.parse(stream, function (v, cb) {
    if (v === undefined) {
      cb.state = 0
      return new strtok.BufferType(10)
    }

    switch (cb.state) {
      case 0: // header
        if (v.toString('ascii', 0, 3) !== 'ID3') {
          return done(new Error('expected id3 header but was not found'))
        }
        cb.id3Header = {
          version: '2.' + v[3] + '.' + v[4],
          major: v[3],
          unsync: common.strtokBITSET.get(v, 5, 7),
          xheader: common.strtokBITSET.get(v, 5, 6),
          xindicator: common.strtokBITSET.get(v, 5, 5),
          footer: common.strtokBITSET.get(v, 5, 4),
          size: common.strtokINT32SYNCSAFE.get(v, 6)
        }
        cb.state = 1
        return new strtok.BufferType(cb.id3Header.size)

      case 1: // id3 data
        parseMetadata(v, cb.id3Header, done).map(function (obj) {
          callback.apply(this, obj)
        })
        if (readDuration) {
          cb.state = 2
          return new strtok.BufferType(4)
        }
        return done()

      case 1.5:
        var shiftedBuffer = new Buffer(4)
        cb.frameFragment.copy(shiftedBuffer, 0, 1)
        v.copy(shiftedBuffer, 3)
        v = shiftedBuffer
        cb.state = 2

      /* falls through */
      case 2: // audio frame header

        // we have found the id3 tag at the end of the file, ignore
        if (v.slice(0, 3).toString() === 'TAG') {
          return strtok.DONE
        }

        // first 11 bits should all be set (frame sync)
        if ((v[0] === 0xFF && (v[1] & 0xE0) === 0xE0) !== true) {
          // keep scanning for frame header, id3 tag may
          // have some padding (0x00) at the end
          return seekFirstAudioFrame(done)
        }

        var header = {
          'version': readMpegVersion(v[1]),
          'layer': readLayer(v[1]),
          'protection': !(v[1] & 0x1),
          'padding': !!((v[2] & 0x02) >> 1),
          'mode': readMode(v[3])
        }

        if (isNaN(header.version) || isNaN(header.layer)) {
          return seekFirstAudioFrame(done)
        }

        // mp3 files are only found in MPEG1/2 Layer 3
        if ((header.version !== 1 && header.version !== 2) || header.layer !== 3) {
          return seekFirstAudioFrame(done)
        }

        header.samples_per_frame = calcSamplesPerFrame(
          header.version, header.layer)

        header.bitrate = id3BitrateCalculator(v[2], header.version, header.layer)
        if (isNaN(header.bitrate)) {
          return seekFirstAudioFrame(done)
        }

        header.sample_rate = samplingRateCalculator(v[2], header.version)
        if (isNaN(header.sample_rate)) {
          return seekFirstAudioFrame(done)
        }

        header.slot_size = calcSlotSize(header.layer)

        header.sideinfo_length = calculateSideInfoLength(
          header.layer, header.mode, header.version)

        var bps = header.samples_per_frame / 8.0
        var fsize = (bps * (header.bitrate * 1000) / header.sample_rate) +
          ((header.padding) ? header.slot_size : 0)
        header.frame_size = Math.floor(fsize)

        audioFrameHeader = header
        frameCount++
        bitrates.push(header.bitrate)

        // xtra header only exists in first frame
        if (frameCount === 1) {
          cb.offset = header.sideinfo_length
          cb.state = 3
          return new strtok.BufferType(header.sideinfo_length)
        }

        // the stream is CBR if the first 3 frame bitrates are the same
        if (readDuration && fileSize && frameCount === 3 && areAllSame(bitrates)) {
          fileSize(function (size) {
            // subtract non audio stream data from duration calculation
            size = size - cb.id3Header.size
            var kbps = (header.bitrate * 1000) / 8
            callback('duration', size / kbps)
            cb(done())
          })
          return strtok.DEFER
        }

        // once we know the file is VBR attach listener to end of
        // stream so we can do the duration calculation when we
        // have counted all the frames
        if (readDuration && frameCount === 4) {
          stream.once('end', function () {
            callback('duration', calcDuration(frameCount,
              header.samples_per_frame, header.sample_rate))
            done()
          })
        }

        cb.state = 5
        return new strtok.IgnoreType(header.frame_size - 4)

      case 3: // side information
        cb.offset += 12
        cb.state = 4
        return new strtok.BufferType(12)

      case 4: // xtra / info header
        cb.state = 5
        var frameDataLeft = audioFrameHeader.frame_size - 4 - cb.offset

        var id = v.toString('ascii', 0, 4)
        if (id !== 'Xtra' && id !== 'Info' && id !== 'Xing') {
          return new strtok.IgnoreType(frameDataLeft)
        }

        // frames field is not present
        if ((v[7] & 0x01) !== 1) {
          return new strtok.IgnoreType(frameDataLeft)
        }

        var numFrames = v.readUInt32BE(8)
        var ah = audioFrameHeader
        callback('duration', calcDuration(numFrames, ah.samples_per_frame, ah.sample_rate))
        return done()

      case 5: // skip frame data
        cb.state = 2
        return new strtok.BufferType(4)
    }

    function seekFirstAudioFrame (done) {
      if (frameCount) {
        return done(new Error('expected frame header but was not found'))
      }

      cb.frameFragment = v
      cb.state = 1.5
      return new strtok.BufferType(1)
    }
  })
}

function areAllSame (array) {
  var first = array[0]
  return array.every(function (element) {
    return element === first
  })
}

function calcDuration (numFrames, samplesPerFrame, sampleRate) {
  return Math.round(numFrames * (samplesPerFrame / sampleRate))
}

function parseMetadata (data, header, done) {
  var offset = 0
  var frames = []

  if (header.xheader) {
    offset += data.readUInt32BE(0)
  }

  while (true) {
    if (offset === data.length) break
    var frameHeaderBytes = data.slice(offset, offset += getFrameHeaderLength(header.major, done))
    var frameHeader = readFrameHeader(frameHeaderBytes, header.major)

    // Last frame. Check first char is a letter, bit of defensive programming
    if (frameHeader.id === '' || frameHeader.id === '\u0000\u0000\u0000\u0000' ||
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(frameHeader.id[0]) === -1) {
      break
    }

    var frameDataBytes = data.slice(offset, offset += frameHeader.length)
    var frameData = readFrameData(frameDataBytes, frameHeader, header.major)
    for (var pos in frameData) {
      if (frameData.hasOwnProperty(pos)) {
        frames.push([frameHeader.id, frameData[pos]])
      }
    }
  }
  return frames
}

function readFrameData (v, frameHeader, majorVer) {
  switch (majorVer) {
    case 2:
      return parser.readData(v, frameHeader.id, null, majorVer)
    case 3:
    case 4:
      if (frameHeader.flags.format.unsync) {
        v = common.removeUnsyncBytes(v)
      }
      if (frameHeader.flags.format.data_length_indicator) {
        v = v.slice(4, v.length)
      }
      return parser.readData(v, frameHeader.id, frameHeader.flags, majorVer)
  }
}

function readFrameHeader (v, majorVer) {
  var header = {}
  switch (majorVer) {
    case 2:
      header.id = v.toString('ascii', 0, 3)
      header.length = common.strtokUINT24_BE.get(v, 3, 6)
    break
    case 3:
      header.id = v.toString('ascii', 0, 4)
      header.length = strtok.UINT32_BE.get(v, 4, 8)
      header.flags = readFrameFlags(v.slice(8, 10))
    break
    case 4:
      header.id = v.toString('ascii', 0, 4)
      header.length = common.strtokINT32SYNCSAFE.get(v, 4, 8)
      header.flags = readFrameFlags(v.slice(8, 10))
    break
  }
  return header
}

function getFrameHeaderLength (majorVer, done) {
  switch (majorVer) {
    case 2:
      return 6
    case 3:
    case 4:
      return 10
    default:
      return done(new Error('header version is incorrect'))
  }
}

function readFrameFlags (b) {
  return {
    status: {
      tag_alter_preservation: common.strtokBITSET.get(b, 0, 6),
      file_alter_preservation: common.strtokBITSET.get(b, 0, 5),
      read_only: common.strtokBITSET.get(b, 0, 4)
    },
    format: {
      grouping_identity: common.strtokBITSET.get(b, 1, 7),
      compression: common.strtokBITSET.get(b, 1, 3),
      encryption: common.strtokBITSET.get(b, 1, 2),
      unsync: common.strtokBITSET.get(b, 1, 1),
      data_length_indicator: common.strtokBITSET.get(b, 1, 0)
    }
  }
}

function readMpegVersion (byte) {
  var bits = (byte & 0x18) >> 3

  if (bits === 0x00) {
    return 2.5
  } else if (bits === 0x01) {
    return 'reserved'
  } else if (bits === 0x02) {
    return 2
  } else if (bits === 0x03) {
    return 1
  }
}

function readLayer (byte) {
  var bits = (byte & 0x6) >> 1

  if (bits === 0x00) {
    return 'reserved'
  } else if (bits === 0x01) {
    return 3
  } else if (bits === 0x02) {
    return 2
  } else if (bits === 0x03) {
    return 1
  }
}

function readMode (byte) {
  var bits = (byte & 0xC0) >> 6
  if (bits === 0x00) {
    return 'stereo'
  } else if (bits === 0x01) {
    return 'joint_stereo'
  } else if (bits === 0x02) {
    return 'dual_channel'
  } else if (bits === 0x03) {
    return 'mono'
  }
}

function calcSamplesPerFrame (version, layer) {
  if (layer === 1) return 384
  if (layer === 2) return 1152
  if (layer === 3 && version === 1) return 1152
  if (layer === 3 && (version === 2 || version === 2.5)) return 576
}

function calculateSideInfoLength (layer, mode, version) {
  if (layer !== 3) return 2
  if (['stereo', 'joint_stereo', 'dual_channel'].indexOf(mode) >= 0) {
    if (version === 1) {
      return 32
    } else if (version === 2 || version === 2.5) {
      return 17
    }
  } else if (mode === 'mono') {
    if (version === 1) {
      return 17
    } else if (version === 2 || version === 2.5) {
      return 9
    }
  }
}

function calcSlotSize (layer) {
  if (layer === 0) return 'reserved'
  if (layer === 1) return 4
  if (layer === 2) return 1
  if (layer === 3) return 1
}

// [bits][mpegversion + layer] = bitrate
var bitrate_index = {
    0x01: {'11': 32, '12': 32, '13': 32, '21': 32, '22': 8, '23': 8},
    0x02: {'11': 64, '12': 48, '13': 40, '21': 48, '22': 16, '23': 16},
    0x03: {'11': 96, '12': 56, '13': 48, '21': 56, '22': 24, '23': 24},
    0x04: {'11': 128, '12': 64, '13': 56, '21': 64, '22': 32, '23': 32},
    0x05: {'11': 160, '12': 80, '13': 64, '21': 80, '22': 40, '23': 40},
    0x06: {'11': 192, '12': 96, '13': 80, '21': 96, '22': 48, '23': 48},
    0x07: {'11': 224, '12': 112, '13': 96, '21': 112, '22': 56, '23': 56},
    0x08: {'11': 256, '12': 128, '13': 112, '21': 128, '22': 64, '23': 64},
    0x09: {'11': 288, '12': 160, '13': 128, '21': 144, '22': 80, '23': 80},
    0x0A: {'11': 320, '12': 192, '13': 160, '21': 160, '22': 96, '23': 96},
    0x0B: {'11': 352, '12': 224, '13': 192, '21': 176, '22': 112, '23': 112},
    0x0C: {'11': 384, '12': 256, '13': 224, '21': 192, '22': 128, '23': 128},
    0x0D: {'11': 416, '12': 320, '13': 256, '21': 224, '22': 144, '23': 144},
    0x0E: {'11': 448, '12': 384, '13': 320, '21': 256, '22': 160, '23': 160}
  }

function id3BitrateCalculator (byte, mpegVersion, layer) {
  var bits = (byte & 0xF0) >> 4
  if (bits === 0x00) return 'free'
  if (bits === 0x0F) return 'reserved'
  return bitrate_index[bits][mpegVersion.toString() + layer]
}

// [version][bits] == sampling rate
var sampling_rate_freq_index = {
    1: {0x00: 44100, 0x01: 48000, 0x02: 32000},
    2: {0x00: 22050, 0x01: 24000, 0x02: 16000},
    2.5: {0x00: 11025, 0x01: 12000, 0x02: 8000}
}

function samplingRateCalculator (byte, version) {
  var bits = (byte & 0xC) >> 2
  if (bits === 0x03) return 'reserved'
  return sampling_rate_freq_index[version][bits]
}
