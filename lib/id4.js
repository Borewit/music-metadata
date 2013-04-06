var util = require('util');
var events = require('events');
var strtok = require('strtok');
var common = require('./common');
var fs = require('fs');

var Id4 = module.exports = function(stream) {
  events.EventEmitter.call(this);
  this.stream = stream;
  this.parse();
};

util.inherits(Id4, events.EventEmitter);

Id4.prototype.parse = function() {
  var self = this;

  strtok.parse(self.stream, function(v, cb) {
    try {
      //the very first thing we expect to see is the first atom's length
      if (!v) {
        cb.metaAtomsTotalLength = 0;
        cb.position = 'atomlength';
        return strtok.UINT32_BE;
      }

      if (cb.position === 'skip') {
        cb.position = 'atomlength';
        return strtok.UINT32_BE;
      }

      if (cb.position === 'atomlength') {
        cb.position = 'atomname';
        cb.atomLength = v;
        return new strtok.StringType(4, 'binary');
      }

      if (cb.position === 'atomname') {
        cb.atomName = v;

        //meta has 4 bytes padding at the start (skip)
        if (v === 'meta') {
          cb.position = 'skip';
          return new strtok.BufferType(4);
        }

        if (!~CONTAINER_ATOMS.indexOf(v)) {
          cb.position = (cb.atomContainer === 'ilst') ? 'ilstatom' : 'skip';
          return new strtok.BufferType(cb.atomLength - 8);
        }

        //dig into container atoms
        cb.atomContainer = v;
        cb.atomContainerLength = cb.atomLength;
        cb.position = 'atomlength';
        return strtok.UINT32_BE;
      }

      //we can stop processing atoms once we get to the end of the ilst atom
      if (cb.metaAtomsTotalLength >= cb.atomContainerLength - 8) {
        self.emit('done');
        return strtok.DONE;
      }

      //only process atoms that fall under the ilst atom (metadata)
      if (cb.position === 'ilstatom') {
        cb.metaAtomsTotalLength += cb.atomLength;

        var result = processMetaAtom(v, cb.atomName, cb.atomLength - 8);
        if (result.length > 0) {
          for (var i = 0; i < result.length; i++) {
            self.emit(cb.atomName, result[i]);
          }
        }

        cb.position = 'atomlength';
        return strtok.UINT32_BE;
      }

      //if we ever get this this point something bad has happened
      throw new Error('error parsing');

    } catch (exception) {
      self.emit('done', exception);
      return strtok.DONE;
    }
  });
};

function processMetaAtom(data, atomName, atomLength) {
  var result = [];
  var offset = 0;

  //ignore proprietary iTunes atoms (for now)
  if (atomName == '----') return result;

  while (offset < atomLength) {
    var length = strtok.UINT32_BE.get(data, offset);
    var type = TYPES[strtok.UINT32_BE.get(data, offset + 8)];

    var content = (function processMetaDataAtom(data, type, atomName) {
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
};

var CONTAINER_ATOMS = [
  'moov',
  'udta',
  'meta',
  'ilst'];