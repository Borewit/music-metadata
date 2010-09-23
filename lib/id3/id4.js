var strtok   = require('strtok'),
    common   = require('./common'),
    getInt24 = common.getInt24;

exports.readTags = function readTags () {
  var tag = {};
  readAtom(this.buffer, tag, 0, this.buffer.length);
  return tag;
};

var readAtom = function readAtom (b, tag, offset, length, indent) {
  var seek = offset,
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

    var klass = getInt24(b, seek + 16 + 1, true),
      type  = TYPES[klass];

    if (atom_name === 'trkn' || atom_name === 'disk') {
      tag[atom_name] = {};
      tag[atom_name].num = b[seek + 16 + 11];
      var total = b[seek + 16 + 13];
      tag[atom_name].of = (total == 0) ? 1 : total;
    } else {
      var data_start = seek + 16 + 4 + 4,
        data_end   = atom_size - 16 - 4 - 4;

        switch (type) {
          case 'text':
            tag[atom_name] = b.toString('utf8', data_start, data_start + data_end);
            break;
          case 'uint8':
            tag[atom_name] = strtok.UINT16_BE.get(b, data_start);
            //lookup genre name
            if(atom_name === 'gnre') tag[atom_name] = common.GENRES[tag[atom_name]-1];
            break;
          case 'jpeg':
          case 'png':
            tag[atom_name] = {
              format: 'image/' + type,
              data: b.slice(data_start, data_start + data_end)
            };
            break;
        }
    }
    seek += atom_size;
  }
};

var TYPES = {
  '0'     : 'uint8',
  '1'     : 'text',
  '13'    : 'jpeg',
  '14'    : 'png',
  '21'    : 'uint8'
};

var CONTAINER_ATOMS = [
  'moov',
  'udta',
  'meta',
  'ilst'
];
