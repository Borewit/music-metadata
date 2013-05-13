var strtok = require('strtok');
var common = require('./common');

module.exports = function (stream, callback) {
  strtok.parse(stream, function (v, cb) {
    try {
      // we can stop processing atoms once we get to the end of the ilst atom
      if (cb.metaAtomsTotalLength >= cb.atomContainerLength - 8) {
        callback('done');
        return strtok.DONE;
      }

      // the very first thing we expect to see is the first atom's length
      if (!v) {
        cb.metaAtomsTotalLength = 0;
        cb.state = 0;
        return strtok.UINT32_BE;
      }

      switch (cb.state) {
        case -1: // skip
          cb.state = 0;
          return strtok.UINT32_BE;

        case 0: // atom length
          cb.atomLength = v;
          cb.state++;
          return new strtok.StringType(4, 'binary');

        case 1: // atom name
          cb.atomName = v;

          // meta has 4 bytes padding at the start (skip)
          if (v === 'meta') {
            cb.state = -1; // what to do for skip?
            return new strtok.BufferType(4);
          }

          if (!~CONTAINER_ATOMS.indexOf(v)) {
            // whats the num for ilst?
            cb.state = (cb.atomContainer === 'ilst') ? 2 : -1;
            return new strtok.BufferType(cb.atomLength - 8);
          }

          // dig into container atoms
          cb.atomContainer = v;
          cb.atomContainerLength = cb.atomLength;
          cb.state--;
          return strtok.UINT32_BE;

        case 2: // ilst atom
          cb.metaAtomsTotalLength += cb.atomLength;
          var result = processMetaAtom(v, cb.atomName, cb.atomLength - 8);
          if (result.length > 0) {
            for (var i = 0; i < result.length; i++) {
              callback(cb.atomName, result[i]);
            }
          }
          cb.state = 0;
          return strtok.UINT32_BE;
      }

      // if we ever get this this point something bad has happened
      throw new Error('error parsing');

    } catch (exception) {
      callback('done', exception);
      return strtok.DONE;
    }
  })
}

function processMetaAtom (data, atomName, atomLength) {
  var result = [];
  var offset = 0;

  // ignore proprietary iTunes atoms (for now)
  if (atomName == '----') return result;

  while (offset < atomLength) {
    var length = strtok.UINT32_BE.get(data, offset);
    var type = TYPES[strtok.UINT32_BE.get(data, offset + 8)];

    var content = (function processMetaDataAtom (data, type, atomName) {
      switch (type) {
        case 'text':
          return data.toString('utf8', 4);

        case 'uint8':
          if (atomName === 'gnre') {
            var genreInt = strtok.UINT16_BE.get(data, 4);
            return common.GENRES[genreInt - 1];
          }
          if (atomName === 'trkn' || atomName == 'disk') {
            return data[7] + '/' + data[9];
          }

          return strtok.UINT16_BE.get(data, 4);

        case 'jpeg':
        case 'png':
          return {
            format: 'image/' + type,
            data: data.slice(4)
          };
      }
    })(data.slice(offset + 12, offset + length), type, atomName);

    result.push(content);
    offset += length;
  }

  return result;
}

var TYPES = {
  '0': 'uint8',
  '1': 'text',
  '13': 'jpeg',
  '14': 'png',
  '21': 'uint8'
}

var CONTAINER_ATOMS = ['moov', 'udta', 'meta', 'ilst'];