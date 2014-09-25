var strtok = require('strtok2');
var parser = require('./id3v2_frames');
var common = require('./common');
var BitArray = require('node-bitarray');
var equal = require('deep-equal');

module.exports = function (stream, callback, done, readDuration, fileSize) {

  var frameCount = 0;
  var audioFrameHeader;
  var bitrates = [];

  strtok.parse(stream, function (v, cb) {
    if (!v) {
      cb.state = 0;
      return new strtok.BufferType(10);
    }

    switch (cb.state) {
      case 0: // header
        if (v.toString('ascii', 0, 3) !== 'ID3') {
          return done(new Error('expected id3 header but was not found'));
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
        cb.state = 1;
        return new strtok.BufferType(cb.id3Header.size);

      case 1: // id3 data
        parseMetadata(v, cb.id3Header, callback);
        if (readDuration) {
          cb.state = 2;
          return new strtok.BufferType(4);
        }
        return done();

      case 1.5:
        var shiftedBuffer = new Buffer(4);
        cb.frameFragment.copy(shiftedBuffer, 0, 1);
        v.copy(shiftedBuffer, 3);
        v = shiftedBuffer;
        cb.state = 2;

      /* falls through */
      case 2: // audio frame header

        // we have found the id3 tag at the end of the file, ignore
        if (v.slice(0, 3).toString() === 'TAG') {
          return strtok.DONE;
        }

        var bts = BitArray.fromBuffer(v);

        var syncWordBits = bts.slice(0, 11);
        if (sum(syncWordBits) != 11) {
          // keep scanning for frame header, id3 tag may
          // have some padding (0x00) at the end
          return seekFirstAudioFrame();
        }

        var header = {
          'version': readMpegVersion(bts.slice(11, 13)),
          'layer': readLayer(bts.slice(13, 15)),
          'protection': !bts.__bits[15],
          'padding': !!bts.__bits[22],
          'mode': readMode(bts.slice(22, 24))
        }

        if (isNaN(header.version) || isNaN(header.layer)) {
          return seekFirstAudioFrame();
        }

        // mp3 files are only found in MPEG1/2 Layer 3
        if ((header.version !== 1 && header.version !== 2) || header.layer !== 3) {
          return seekFirstAudioFrame();
        }

        header.samples_per_frame = calcSamplesPerFrame(
          header.version, header.layer);

        header.bitrate = common.id3BitrateCalculator(
          bts.slice(16, 20), header.version, header.layer);
        if (isNaN(header.bitrate)) {
          return seekFirstAudioFrame();
        }

        header.sample_rate = common.samplingRateCalculator(
          bts.slice(20, 22), header.version);
        if (isNaN(header.sample_rate)) {
          return seekFirstAudioFrame();
        }

        header.slot_size = calcSlotSize(header.layer);

        header.sideinfo_length = calculateSideInfoLength(
          header.layer, header.mode, header.version);

        var bps = header.samples_per_frame / 8.0;
        var fsize = (bps * (header.bitrate * 1000) / header.sample_rate) +
          ((header.padding) ? header.slot_size : 0);
        header.frame_size = Math.floor(fsize);

        audioFrameHeader = header;
        frameCount++;
        bitrates.push(header.bitrate);

        // xtra header only exists in first frame
        if (frameCount === 1) {
          cb.offset = header.sideinfo_length;
          cb.state = 3;
          return new strtok.BufferType(header.sideinfo_length);
        }

        // the stream is CBR if the first 3 frame bitrates are the same
        if (readDuration && fileSize && frameCount === 3 && areAllSame(bitrates)) {
          fileSize(function (size) {
            // subtract non audio stream data from duration calculation
            size = size - cb.id3Header.size;
            var kbps = (header.bitrate * 1000) / 8;
            callback('duration', Math.round(size / kbps));
            cb(done());
          })
          return strtok.DEFER;
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

        cb.state = 5;
        return new strtok.BufferType(header.frame_size - 4);

      case 3: // side information
        cb.offset += 12;
        cb.state = 4;
        return new strtok.BufferType(12);

      case 4: // xtra / info header
        cb.state = 5;
        var frameDataLeft = audioFrameHeader.frame_size - 4 - cb.offset;

        var id = v.toString('ascii', 0, 4);
        if (id !== 'Xtra' && id !== 'Info' && id !== 'Xing') {
          return new strtok.BufferType(frameDataLeft);
        }

        var bits = BitArray.fromBuffer(v.slice(4, 8));
        // frames field is not present
        if (bits.__bits[bits.__bits.length-1] !== 1) {
          return new strtok.BufferType(frameDataLeft);
        }

        var numFrames = v.readUInt32BE(8);
        var ah = audioFrameHeader;
        callback('duration', calcDuration(numFrames, ah.samples_per_frame, ah.sample_rate));
        return done();

      case 5: // skip frame data
        cb.state = 2;
        return new strtok.BufferType(4);
    }

    function seekFirstAudioFrame() {
      if (frameCount) {
        return done(new Error('expected frame header but was not found'));
      }

      cb.frameFragment = v;
      cb.state = 1.5;
      return new strtok.BufferType(1);
    }
  });
};

function areAllSame (array) {
  var first = array[0];
  return array.every(function (element) {
    return element === first;
  });
}

function calcDuration (numFrames, samplesPerFrame, sampleRate) {
  return Math.round(numFrames * (samplesPerFrame / sampleRate));
}

function parseMetadata (data, header, callback) {
  var offset = 0;

  if (header.xheader) {
    offset += data.readUInt32BE(0);
  }

  while (true) {
    if (offset === data.length) break;
    var frameHeaderBytes = data.slice(offset, offset += getFrameHeaderLength(header.major));
    var frameHeader = readFrameHeader(frameHeaderBytes, header.major);

    // Last frame. Check first char is a letter, bit of defensive programming  
    if (frameHeader.id === '' || frameHeader.id === '\u0000\u0000\u0000\u0000' ||
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.search(frameHeader.id[0]) === -1) {
      break;
    }

    var frameDataBytes = data.slice(offset, offset += frameHeader.length);
    var frameData = readFrameData(frameDataBytes, frameHeader, header.major);

    /*jshint loopfunc:true */
    frameData.forEach(function (val) {
      callback(frameHeader.id, val);
    })
  }
}

function readFrameData (v, frameHeader, majorVer) {
  switch (majorVer) {
    case 2:
      return parser.readData(v, frameHeader.id, null, majorVer);
    case 3:
    case 4:
      if (frameHeader.flags.format.unsync) {
        v = common.removeUnsyncBytes(v);
      }
      if (frameHeader.flags.format.data_length_indicator) {
        v = v.slice(4, v.length);
      }
      return parser.readData(v, frameHeader.id, frameHeader.flags, majorVer);
  }
}

function readFrameHeader (v, majorVer) {
  var header = {};
  switch (majorVer) {
    case 2:
      header.id = v.toString('ascii', 0, 3);
      header.length = common.strtokUINT24_BE.get(v, 3, 6);
      break;
    case 3:
      header.id = v.toString('ascii', 0, 4);
      header.length = strtok.UINT32_BE.get(v, 4, 8);
      header.flags = readFrameFlags(v.slice(8, 10));
      break;
    case 4:
      header.id = v.toString('ascii', 0, 4);
      header.length = common.strtokINT32SYNCSAFE.get(v, 4, 8);
      header.flags = readFrameFlags(v.slice(8, 10));
      break;
  }
  return header;
}

function getFrameHeaderLength (majorVer) {
  switch (majorVer) {
    case 2:
      return 6;
    case 3:
    case 4:
      return 10;
    default:
      return done(new Error('header version is incorrect'));
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

function sum (array) {
  var result = 0;
  for (var i = 0; i < array.length; i++) {
    result += array[i]
  }
  return result;
}

function readMpegVersion (bits) {
  if (equal(bits, [0, 0])) {
    return 2.5;
  } else if (equal(bits, [0, 1])) {
    return 'reserved';
  } else if (equal(bits, [1, 0])) {
    return 2;
  } else if (equal(bits, [1, 1])) {
    return 1;
  }
}

function readLayer (bits) {
  if (equal(bits, [0, 0])) {
    return 'reserved';
  } else if (equal(bits, [0, 1])) {
    return 3;
  } else if (equal(bits, [1, 0])) {
    return 2;
  } else if (equal(bits, [1, 1])) {
    return 1;
  }
}

function readMode (bits) {
  if (equal(bits, [0, 0])) {
    return 'stereo';
  } else if (equal(bits, [0, 1])) {
    return 'joint_stereo';
  } else if (equal(bits, [1, 0])) {
    return 'dual_channel';
  } else if (equal(bits, [1, 1])) {
    return 'mono';
  }
}

function calcSamplesPerFrame (version, layer) {
  if (layer === 1) return 384;
  if (layer === 2) return 1152;
  if (layer === 3 && version === 1) return 1152;
  if (layer === 3 && (version === 2 || version === 2.5)) return 576;
}

function calculateSideInfoLength (layer, mode, version) {
  if (layer !== 3) return 2;
  if (['stereo', 'joint_stereo', 'dual_channel'].indexOf(mode) >= 0) {
    if (version === 1) {
      return 32;
    } else if (version === 2 || version === 2.5) {
      return 17;
    }
  } else if (mode === 'mono') {
    if (version === 1) {
      return 17;
    } else if (version === 2 || version === 2.5) {
      return 9;
    }
  }
}

function calcSlotSize (layer) {
  if (layer === 0) return 'reserved';
  if (layer === 1) return 4;
  if (layer === 2) return 1;
  if (layer === 3) return 1;
}
