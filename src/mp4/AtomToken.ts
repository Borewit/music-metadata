import * as Token from 'token-types';
import {FourCcToken} from '../common/FourCC';

import * as initDebug from 'debug';

const debug = initDebug('music-metadata:parser:MP4:atom');

export interface IAtomHeader {
  length: number,
  name: string
}

export interface IAtomFtyp {
  type: string
}

/**
 * Common interface for the mvhd (Movie Header) & mdhd (Media) atom
 */
export interface IAtomMxhd {

  /**
   * A 1-byte specification of the version of this movie header atom.
   */
  version: number,

  /**
   * Three bytes of space for future movie header flags.
   */
  flags: number,

  /**
   * A 32-bit integer that specifies (in seconds since midnight, January 1, 1904) when the media atom was created.
   * It is strongly recommended that this value should be specified using coordinated universal time (UTC).
   */
  creationTime: number,

  /**
   * A 32-bit integer that specifies (in seconds since midnight, January 1, 1904) when the media atom was changed.
   * It is strongly recommended that this value should be specified using coordinated universal time (UTC).
   */
  modificationTime: number,

  /**
   * A time value that indicates the time scale for this media—that is, the number of time units that pass per second in its time coordinate system.
   */
  timeScale: number,

  /**
   * Duration: the duration of this media in units of its time scale.
   */
  duration: number,
}

/**
 * Interface for the parsed Movie Header Atom (mvhd)
 */
export interface IAtomMvhd extends IAtomMxhd {

  /**
   * Preferred rate: a 32-bit fixed-point number that specifies the rate at which to play this movie.
   * A value of 1.0 indicates normal rate.
   */
  preferredRate: number,

  /**
   * Preferred volume: A 16-bit fixed-point number that specifies how loud to play this movie’s sound.
   * A value of 1.0 indicates full volume.
   */
  preferredVolume: number,

  /**
   * Reserved: Ten bytes reserved for use by Apple. Set to 0.
   */
  // reserved: number,

  /**
   *  Matrix structure: The matrix structure associated with this movie.
   *  A matrix shows how to map points from one coordinate space into another.
   *  See Matrices for a discussion of how display matrices are used in QuickTime.
   */
  // matrixStructure: ???;

  /**
   * Preview time: The time value in the movie at which the preview begins.
   */
  previewTime: number,

  /**
   * Preview duration: The duration of the movie preview in movie time scale units.
   */
  previewDuration: number;

  /**
   * Poster time: The time value of the time of the movie poster.
   */
  posterTime: number,

  /**
   * selection time: The time value for the start time of the current selection.
   */
  selectionTime: number,

  /**
   * Selection duration:  The duration of the current selection in movie time scale units.
   */
  selectionDuration: number,

  /**
   * Current time:  The time value for current time position within the movie.
   */
  currentTime: number

  /**
   * Next track ID:  A 32-bit integer that indicates a value to use for the track ID number of the next track added to this movie. Note that 0 is not a valid track ID value.
   */
  nextTrackID: number
}

/**
 * Interface for the metadata header atom: 'mhdr'
 * Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW13
 */
export interface IMovieHeaderAtom {

  /**
   * One byte that is set to 0.
   */
  version: number,

  /**
   * Three bytes that are set to 0.
   */
  flags: number,
  /**
   * A 32-bit unsigned integer indicating the value to use for the item ID of the next item created or assigned an item ID.
   * If the value is all ones, it indicates that future additions will require a search for an unused item ID.
   */
  nextItemID: number
}

export const Header: Token.IToken<IAtomHeader> = {
  len: 8,

  get: (buf: Buffer, off: number): IAtomHeader => {
    const length = Token.UINT32_BE.get(buf, off);
    if (length < 0)
      throw new Error("Invalid atom header length");

    return {
      length,
      name: FourCcToken.get(buf, off + 4)
    };
  },

  put: (buf: Buffer, off: number, hdr: IAtomHeader) => {
    Token.UINT32_BE.put(buf, off, hdr.length);
    return FourCcToken.put(buf, off + 4, hdr.name);
  }
};

/**
 * Ref: https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap1/qtff1.html#//apple_ref/doc/uid/TP40000939-CH203-38190
 */
export const ExtendedSize = Token.UINT64_BE;

export const ftyp: Token.IGetToken<IAtomFtyp> = {
  len: 4,

  get: (buf: Buffer, off: number): IAtomFtyp => {
    return {
      type: new Token.StringType(4, "ascii").get(buf, off)
    };
  }
};

/**
 * Token: Movie Header Atom
 */
export const mhdr: Token.IGetToken<IMovieHeaderAtom> = {
  len: 8,

  get: (buf: Buffer, off: number): IMovieHeaderAtom => {
    return {
      version: Token.UINT8.get(buf, off + 0),
      flags: Token.UINT24_BE.get(buf, off + 1),
      nextItemID: Token.UINT32_BE.get(buf, off + 4)
    };
  }
};

/**
 * Base class for 'fixed' length atoms.
 * In some cases these atoms are longer then the sum of the described fields.
 * Issue: https://github.com/Borewit/music-metadata/issues/120
 */
export abstract class FixedLengthAtom {
  /**
   *
   * @param {number} len Length as specified in the size field
   * @param {number} expLen Total length of sum of specified fields in the standard
   */
  protected constructor(public len: number, expLen: number, atomId: string) {
    if (len < expLen) {
      throw new Error(`Atom ${atomId} expected to be ${expLen}, but specifies ${len} bytes long.`);
    } else if (len > expLen) {
      debug(`Warning: atom ${atomId} expected to be ${expLen}, but was actually ${len} bytes long.`);
    }
  }
}

/**
 * Interface for the parsed Movie Header Atom (mdhd)
 */
export interface IAtomMdhd extends IAtomMxhd {
  /**
   * A 16-bit integer that specifies the language code for this media.
   * See Language Code Values for valid language codes.
   * Also see Extended Language Tag Atom for the preferred code to use here if an extended language tag is also included in the media atom.
   * Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/QTFFChap4/qtff4.html#//apple_ref/doc/uid/TP40000939-CH206-34353
   */
  language: number,

  quality: number
}

/**
 * Token: Media Header Atom
 * Ref:
 *   https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap2/qtff2.html#//apple_ref/doc/uid/TP40000939-CH204-SW34
 *   https://wiki.multimedia.cx/index.php/QuickTime_container#mdhd
 */
export class MdhdAtom extends FixedLengthAtom implements Token.IGetToken<IAtomMdhd> {

  public constructor(public len: number) {
    super(len, 24, 'mdhd');
  }

  public get(buf: Buffer, off: number): IAtomMdhd {
    return {
      version: Token.UINT8.get(buf, off + 0),
      flags: Token.UINT24_BE.get(buf, off + 1),
      creationTime: Token.UINT32_BE.get(buf, off + 4),
      modificationTime: Token.UINT32_BE.get(buf, off + 8),
      timeScale: Token.UINT32_BE.get(buf, off + 12),
      duration: Token.UINT32_BE.get(buf, off + 16),
      language: Token.UINT16_BE.get(buf, off + 20),
      quality: Token.UINT16_BE.get(buf, off + 22)
    };
  }
}

/**
 * Token: Movie Header Atom
 */
export class MvhdAtom extends FixedLengthAtom implements Token.IGetToken<IAtomMvhd> {

  public constructor(public len: number) {
    super(len, 100, 'mvhd');
  }

  public get(buf: Buffer, off: number): IAtomMvhd {
    return {
      version: Token.UINT8.get(buf, off + 0),
      flags: Token.UINT24_BE.get(buf, off + 1),
      creationTime: Token.UINT32_BE.get(buf, off + 4),
      modificationTime: Token.UINT32_BE.get(buf, off + 8),
      timeScale: Token.UINT32_BE.get(buf, off + 12),
      duration: Token.UINT32_BE.get(buf, off + 16),
      preferredRate: Token.UINT32_BE.get(buf, off + 20),
      preferredVolume: Token.UINT16_BE.get(buf, off + 24),
      // ignore reserver: 10 bytes
      // ignore matrix structure: 36 bytes
      previewTime: Token.UINT32_BE.get(buf, off + 72),
      previewDuration: Token.UINT32_BE.get(buf, off + 76),
      posterTime: Token.UINT32_BE.get(buf, off + 80),
      selectionTime: Token.UINT32_BE.get(buf, off + 84),
      selectionDuration: Token.UINT32_BE.get(buf, off + 88),
      currentTime: Token.UINT32_BE.get(buf, off + 92),
      nextTrackID: Token.UINT32_BE.get(buf, off + 96)
    };
  }

}

/**
 * Data Atom Structure ('data')
 * Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW32
 */
export interface IDataAtom {
  /**
   * Type Indicator
   * Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW28
   */
  type: {
    /**
     * The set of types from which the type is drawn
     * If 0, type is drawn from the well-known set of types.
     */
    set: number, // ToDo: enum?
    type: number
  },
  /**
   * Locale Indicator
   */
  locale: number,
  /**
   * An array of bytes containing the value of the metadata.
   */
  value: Buffer;
}

/**
 * Data Atom Structure
 */
export class DataAtom implements Token.IGetToken<IDataAtom> {

  public constructor(public len: number) {
  }

  public get(buf: Buffer, off: number): IDataAtom {
    return {
      type: {
        set: Token.UINT8.get(buf, off + 0),
        type: Token.UINT24_BE.get(buf, off + 1)
      },
      locale: Token.UINT24_BE.get(buf, off + 4),
      value: new Token.BufferType(this.len - 8).get(buf, off + 8)
    };
  }
}

/**
 * Data Atom Structure ('data')
 * Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW32
 */
export interface INameAtom {

  /**
   * One byte that is set to 0.
   */
  version: number,

  /**
   * Three bytes that are set to 0.
   */
  flags: number,

  /**
   * An array of bytes containing the value of the metadata.
   */
  name: string;
}

/**
 * Data Atom Structure
 * Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW31
 */
export class NameAtom implements Token.IGetToken<INameAtom> {

  public constructor(public len: number) {
  }

  public get(buf: Buffer, off: number): INameAtom {
    return {
      version: Token.UINT8.get(buf, off),
      flags: Token.UINT24_BE.get(buf, off + 1),
      name: new Token.StringType(this.len - 4, "utf-8").get(buf, off + 4)
    };
  }
}

/**
 * Track Header Atoms interface
 * Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/QTFFChap2/qtff2.html#//apple_ref/doc/uid/TP40000939-CH204-25550
 */
export interface ITrackHeaderAtom {

  /**
   * One byte that is set to 0.
   */
  version: number,

  /**
   * Three bytes that are set to 0.
   */
  flags: number,

  /**
   * Creation Time
   */
  creationTime: number;

  /**
   * Modification Time
   */
  modificationTime: number;

  /**
   * TrackID
   */
  trackId: number;

  /**
   * A time value that indicates the duration of this track (in the movie’s time coordinate system).
   * Note that this property is derived from the track’s edits. The value of this field is equal to the sum of the
   * durations of all of the track’s edits. If there is no edit list, then the duration is the sum of the sample
   * durations, converted into the movie timescale.
   */
  duration: number;

  /**
   * A 16-bit integer that indicates this track’s spatial priority in its movie.
   * The QuickTime Movie Toolbox uses this value to determine how tracks overlay one another.
   * Tracks with lower layer values are displayed in front of tracks with higher layer values.
   */
  layer: number;

  /**
   * A 16-bit integer that identifies a collection of movie tracks that contain alternate data for one another.
   * This same identifier appears in each 'tkhd' atom of the other tracks in the group.
   * QuickTime chooses one track from the group to be used when the movie is played.
   * The choice may be based on such considerations as playback quality, language, or the capabilities of the computer.
   * A value of zero indicates that the track is not in an alternate track group.
   */
  alternateGroup: number,

  /**
   * A 16-bit fixed-point value that indicates how loudly this track’s sound is to be played.
   * A value of 1.0 indicates normal volume.
   */
  volume: number
}

/**
 * Track Header Atoms structure
 * Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/QTFFChap2/qtff2.html#//apple_ref/doc/uid/TP40000939-CH204-25550
 */
export class TrackHeaderAtom implements Token.IGetToken<ITrackHeaderAtom> {

  public constructor(public len: number) {
  }

  public get(buf: Buffer, off: number): ITrackHeaderAtom {
    return {
      version: Token.UINT8.get(buf, off),
      flags: Token.UINT24_BE.get(buf, off + 1),
      creationTime: Token.UINT32_BE.get(buf, off + 4),
      modificationTime: Token.UINT32_BE.get(buf, off + 8),
      trackId: Token.UINT32_BE.get(buf, off + 12),
      // reserved 4 bytes
      duration: Token.UINT32_BE.get(buf, off + 20),
      layer: Token.UINT16_BE.get(buf, off + 24),
      alternateGroup: Token.UINT16_BE.get(buf, off + 26),
      volume: Token.UINT16_BE.get(buf, off + 28) // ToDo: fixed point
      // ToDo: add remaining fields
    };
  }
}

/**
 * Atom: Sample Description Atom ('stsd')
 */
interface IAtomStsdHeader {
  version: number;
  flags: number;
  numberOfEntries: number;
}

/**
 * Atom: Sample Description Atom ('stsd')
 * Ref: https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap2/qtff2.html#//apple_ref/doc/uid/TP40000939-CH204-25691
 */
const stsdHeader: Token.IGetToken<IAtomStsdHeader> = {
  len: 8,

  get: (buf: Buffer, off: number): IAtomStsdHeader => {
    return {
      version: Token.UINT8.get(buf, off + 0),
      flags: Token.UINT24_BE.get(buf, off + 1),
      numberOfEntries: Token.UINT32_BE.get(buf, off + 4)
    };
  }
};

/**
 * Atom: Sample Description Atom ('stsd')
 */
export interface ISampleDescription {
  dataFormat: string;
  dataReferenceIndex: number;
  description: Buffer;
}

export interface IAtomStsd {
  header: IAtomStsdHeader;
  table: ISampleDescription[];
}

/**
 * Atom: Sample Description Atom ('stsd')
 * Ref: https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap2/qtff2.html#//apple_ref/doc/uid/TP40000939-CH204-25691
 */
class SampleDescriptionTable implements Token.IGetToken<ISampleDescription> {

  public constructor(public len: number) {
  }

  public get(buf: Buffer, off: number): ISampleDescription {

    return {
      dataFormat: FourCcToken.get(buf, off),
      dataReferenceIndex: Token.UINT16_BE.get(buf, off + 10),
      description: new Token.BufferType(this.len - 12).get(buf, off + 12)
    };
  }
}

/**
 * Atom: Sample Description Atom ('stsd')
 * Ref: https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap2/qtff2.html#//apple_ref/doc/uid/TP40000939-CH204-25691
 */
export class StsdAtom implements Token.IGetToken<IAtomStsd> {

  public constructor(public len: number) {
  }

  public get(buf: Buffer, off: number): IAtomStsd {

    const header = stsdHeader.get(buf, off);
    off += stsdHeader.len;

    const table: ISampleDescription[] = [];

    for (let n = 0; n < header.numberOfEntries; ++n) {
      const size = Token.UINT32_BE.get(buf, off); // Sample description size
      off += Token.UINT32_BE.len;
      table.push(new SampleDescriptionTable(size).get(buf, off));
      off += size;
    }

    return {
      header,
      table
    };
  }
}

export interface ISoundSampleDescriptionVersion {
  version: number;
  revision: number;
  vendor: number;
}

/**
 * Common Sound Sample Description (version & revision)
 * Ref: https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap3/qtff3.html#//apple_ref/doc/uid/TP40000939-CH205-57317
 */
export const SoundSampleDescriptionVersion: Token.IGetToken<ISoundSampleDescriptionVersion> = {

  len: 8,

  get(buf: Buffer, off: number): ISoundSampleDescriptionVersion {
    return {
      version: Token.INT16_BE.get(buf, off),
      revision: Token.INT16_BE.get(buf, off + 2),
      vendor: Token.INT32_BE.get(buf, off + 4)
    };
  }
};

export interface ISoundSampleDescriptionV0 {
  numAudioChannels: number;
  /**
   *  number of bits in each uncompressed sound sample
   */
  sampleSize: number;
  /**
   * Compression ID
   */
  compressionId: number;

  packetSize: number;

  sampleRate: number;
}

/**
 * Sound Sample Description (Version 0)
 * Ref: https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap3/qtff3.html#//apple_ref/doc/uid/TP40000939-CH205-130736
 */
export const SoundSampleDescriptionV0: Token.IGetToken<ISoundSampleDescriptionV0> = {

  len: 12,

  get(buf: Buffer, off: number): ISoundSampleDescriptionV0 {
    return {
      numAudioChannels: Token.INT16_BE.get(buf, off + 0),
      sampleSize: Token.INT16_BE.get(buf, off + 2),
      compressionId: Token.INT16_BE.get(buf, off + 4),
      packetSize: Token.INT16_BE.get(buf, off + 6),
      sampleRate: Token.UINT16_BE.get(buf, off + 8) + Token.UINT16_BE.get(buf, off + 10) / 10000
    };
  }
};
