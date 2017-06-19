import * as strtok from 'strtok2';
import common from './common';
import {IStreamParser, TagCallback} from './parser';

enum State {
  skip = -1,
  atomLength = 0,
  atomName = 1,
  ilstAtom = 2,
  mdhdAtom = 3
}

type IMetaDataAtom = string | {format: string, data: Buffer};

class Id4Parser implements IStreamParser {

  public static type = 'm4a';

  public static getInstance(): Id4Parser {
    return new Id4Parser();
  }

  private static Types: { [index: number]: string } = {
    0: 'uint8',
    1: 'text',
    13: 'jpeg',
    14: 'png',
    21: 'uint8'
  };

  private static ContainerAtoms = ['moov', 'udta', 'meta', 'ilst', 'trak', 'mdia'];

  public parse(stream, callback: TagCallback, done?, readDuration?, fileSize?) {
    strtok.parse(stream, (v, cb) => {
      // the very first thing we expect to see is the first atom's length
      if (!v) {
        cb.metaAtomsTotalLength = 0;
        cb.state = 0;
        return strtok.UINT32_BE;
      }

      switch (cb.state) {
        case State.skip: // skip
          cb.state = State.atomLength;
          return strtok.UINT32_BE;

        case State.atomLength: // atom length
          cb.atomLength = v;
          cb.state++;
          return new strtok.BufferType(4);

        case State.atomName: // atom name
          v = v.toString('binary');
          cb.atomName = v;

          // meta has 4 bytes padding at the start (skip)
          if (v === 'meta') {
            cb.state = State.skip;
            return new strtok.IgnoreType(4);
          }

          if (readDuration) {
            if (v === 'mdhd') {
              cb.state = State.mdhdAtom;
              return new strtok.BufferType(cb.atomLength - 8);
            }
          }

          if (!~Id4Parser.ContainerAtoms.indexOf(v)) {
            if (cb.atomContainer === 'ilst') {
              cb.state = State.ilstAtom;
              return new strtok.BufferType(cb.atomLength - 8);
            }
            cb.state = State.skip;
            return new strtok.IgnoreType(cb.atomLength - 8);
          }

          // dig into container atoms
          cb.atomContainer = v;
          cb.atomContainerLength = cb.atomLength;
          cb.state--;
          return strtok.UINT32_BE;

        case State.ilstAtom: // ilst atom
          cb.metaAtomsTotalLength += cb.atomLength;
          let results;
          try {
            results = this.processMetaAtom(v, cb.atomName, cb.atomLength - 8);
          } catch (err) {
            return done(err);
          }

          if (results.length > 0) {
            for (const result of results) {
              callback(Id4Parser.type, cb.atomName, result);
            }
          }

          // we can stop processing atoms once we get to the end of the ilst atom
          if (cb.metaAtomsTotalLength >= cb.atomContainerLength - 8) {
            return done();
          }

          cb.state = State.atomLength;
          return strtok.UINT32_BE;

        case State.mdhdAtom: // mdhd atom
          // TODO: support version 1
          const sampleRate = v.readUInt32BE(12);
          const duration = v.readUInt32BE(16);
          callback('format', 'duration', duration / sampleRate);
          callback('format', 'sampleRate', sampleRate); // ToDo: add to test
          cb.state = State.atomLength;
          return strtok.UINT32_BE;

        default:
          return done(new Error('illegal state:' + cb.state));

      }
    });
  }

  private processMetaAtom(data: Buffer, atomName: string, atomLength: number): IMetaDataAtom[] {
    const result = [];
    let offset = 0;

    // ignore proprietary iTunes atoms (for now)
    if (atomName === '----') return result;

    while (offset < atomLength) {
      const length = strtok.UINT32_BE.get(data, offset);
      const contType = Id4Parser.Types[strtok.UINT32_BE.get(data, offset + 8)];

      const content = this.processMetaDataAtom(data.slice(offset + 12, offset + length), contType, atomName);

      result.push(content);
      offset += length;
    }

    return result;
  }

  private processMetaDataAtom(data: Buffer, type: string, atomName: string): IMetaDataAtom | number {
    switch (type) {
      case 'text':
        return data.toString('utf8', 4);

      case 'uint8':
        if (atomName === 'gnre') {
          const genreInt = strtok.UINT8.get(data, 5);
          return common.GENRES[genreInt - 1];
        }
        if (atomName === 'trkn' || atomName === 'disk') {
          return data[7] + '/' + data[9];
        }

        return strtok.UINT8.get(data, 4);

      case 'jpeg':
      case 'png':
        return {
          format: 'image/' + type,
          data: new Buffer(data.slice(4))
        };

      default:
        throw new Error('Unexpected type: ' + type);
    }
  }
}

module.exports = Id4Parser.getInstance();
