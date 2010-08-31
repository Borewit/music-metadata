var strtok   = require('strtok'),
    common   = require('./common'),
    getInt24 = common.getInt24;

exports.readTags = function readTags () {
  var tag = {};
  readAtom(this.buffer, tag, 0, this.buffer.length);
  return tag;
};

var readAtom = function readAtom (b, tag, offset, length, indent) {
  var seek   = offset,
      atom_size,
      atom_name;

  indent = indent === undefined ? '' : indent + '  ';

  while (seek < offset + length) {
    atom_offset = seek;

    atom_size = strtok.UINT32_BE.get(b, seek);
    if (atom_size === 0) return;

    if (b[seek + 4] === 169) {
      atom_name = b.toString('ascii', seek + 5, seek + 5 + 3);
    } else {
      atom_name = b.toString('ascii', seek + 4, seek + 4 + 4);
    }

    if (~CONTAINER_ATOMS.indexOf(atom_name)) {
      if (atom_name === 'meta') seek += 4;
      return readAtom(b, tag, seek + 8, atom_size - 8, indent);
    }

    if (ATOMS[atom_name]) {
      var klass = getInt24(b, seek + 16 + 1, true),
          atom  = ATOMS[atom_name],
          type  = TYPES[klass];

      if (atom_name === 'trkn') {
        tag[atom[0]] = b[seek + 16 + 11];
        tag['count'] = b[seek + 16 + 13];
      } else {
        var data_start = seek + 16 + 4 + 4,
            data_end   = atom_size - 16 - 4 - 4;

        switch (type) {
          case 'text':
            tag[atom[0]] = b.toString('utf8', data_start, data_start + data_end);
            break;
          case 'uint8':
            tag[atom[0]] = strtok.UINT16_BE.get(b, data_start);
            break;
          case 'jpeg':
          case 'png':
            tag[atom[0]] = {
              format: 'image/' + type,
              data:   b.slice(data_start, data_start + data_end)
            };
            break;
        }
      }
    }

    seek += atom_size;
  }
};

var TYPES = exports.TYPES = {
  '0'     : 'uint8',
  '1'     : 'text',
  '13'    : 'jpeg',
  '14'    : 'png',
  '21'    : 'uint8'
};

var CONTAINER_ATOMS = exports.CONTAINER_ATOMS = [
  'moov',
  'udta',
  'meta',
  'ilst'
];

var ATOMS = exports.ATOMS = {
  'alb': ['album'],
  'art': ['artist'],
  'ART': ['artist'],
  'aART': ['artist'],
  'day': ['year'],
  'nam': ['title'],
  'gen': ['genre'],
  'trkn': ['track'],
  'wrt': ['composer'],
  'too': ['encoder'],
  'cprt': ['copyright'],
  'covr': ['picture'],
  'grp': ['grouping'],
  'keyw': ['keyword'],
  'lyr': ['lyrics'],
  'gen': ['genre']
};
