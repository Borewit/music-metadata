var strtok = require('strtok'),
    common = require('./common'),
    fs = require('fs'),
    sys = require('sys');

var Id4 = module.exports = function(stream) {
  this.stream = stream;
  this.parse();
};

Id4.prototype = new process.EventEmitter();

Id4.prototype.parse = function() {
  var self = this;
  
  strtok.parse(self.stream, function(v, cb) {
    try {
      //the very first thing we expect to see is the first atom's length
      if (v === undefined) {
        cb.metaAtomsTotalLength = 0;
        cb.position = 'atomlength';
        return strtok.UINT32_BE;
      }
      
      if(cb.position === 'skip') {
        cb.position = 'atomlength';
        return strtok.UINT32_BE;
      }
      
      if(cb.position === 'atomlength') {
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
        var result = processMetaAtom(v, cb.atomName);
        cb.metaAtomsTotalLength += cb.atomLength;
        self.emit(cb.atomName, result);
        cb.position = 'atomlength';
        return strtok.UINT32_BE;
      }
      
      //if we ever get this this point something bad has happened
      throw new Exception('error parsing');

    } catch(exception) { 
      self.emit('error', exception);
      self.emit('done');
      return strtok.DONE;
    }
  });
};

function processMetaAtom(data, atomName) {
  var length = strtok.UINT32_BE.get(data, 0);
  var type = TYPES[strtok.UINT32_BE.get(data, 8)];

  switch (type) {
    case 'text' :
      return data.toString('utf8', 16, length);
    case 'uint8' :
      if (atomName === 'gnre') {
        var genreInt = strtok.UINT16_BE.get(data, 16);
        return common.GENRES[genreInt -1];
      }

      if (atomName === 'trkn' || atomName == 'disk') {
        return data[19] + '/' + data [21]; // 1/1
      }

      return strtok.UINT16_BE.get(data, 16);

    case 'jpeg' : case 'png' :
      return {
        format : 'image/' + type,
        data : data.slice(16, length)
      };
  }
};

var TYPES = {
  '0' : 'uint8',
  '1' : 'text',
  '13' : 'jpeg',
  '14' : 'png',
  '21' : 'uint8'
};

var CONTAINER_ATOMS = [
  'moov',
  'udta',
  'meta',
  'ilst'
];