var strtok = require('strtok2');
var parser = require('./id3v2_frames');
var common = require('./common');

module.exports = function (stream, callback, done) {
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

        cb.header = {
          version: '2.' + v[3] + '.' + v[4],
          major: v[3],
          unsync: common.strtokBITSET.get(v, 5, 7),
          xheader: common.strtokBITSET.get(v, 5, 6),
          xindicator: common.strtokBITSET.get(v, 5, 5),
          footer: common.strtokBITSET.get(v, 5, 4),
          size: common.strtokINT32SYNCSAFE.get(v, 6)
        };

        cb.state = 1;
        return new strtok.BufferType(cb.header.size);

      case 1: // id3 data
        parseMetadata(v, cb.header, callback);
        return done()
    }
  })
}

function parseMetadata (data, header, callback) {
  var offset = 0;

  if (header.xheader) {
    offset += data.readUInt32BE(0);
  }

  while (true) {
    var frameHeaderBytes = data.slice(offset, offset += getFrameHeaderLength(header.major));
    var frameHeader = readFrameHeader(frameHeaderBytes, header.major);

    // Last frame. Check first char is a letter, bit of defensive programming  
    if (frameHeader.id === '' || frameHeader.id === '\u0000\u0000\u0000\u0000'
        || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.search(frameHeader.id[0]) === -1) {
      return;
    }

    var frameDataBytes = data.slice(offset, offset += frameHeader.length);
    var frameData = readFrameData(frameDataBytes, frameHeader, header.major);
    callback(frameHeader.id, frameData);
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
