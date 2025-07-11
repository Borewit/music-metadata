import initDebug from 'debug';
import * as Token from 'token-types';

import { BasicParser } from '../common/BasicParser.js';
import { Genres } from '../id3v1/ID3v1Parser.js';
import { Atom } from './Atom.js';
import * as AtomToken from './AtomToken.js';
import { ChapterTrackReferenceBox, Mp4ContentError, } from './AtomToken.js';
import { type AnyTagValue, type IChapter, type ITrackInfo, TrackType } from '../type.js';

import type { IGetToken } from '@tokenizer/token';
import { uint8ArrayToHex, uint8ArrayToString } from 'uint8array-extras';

const debug = initDebug('music-metadata:parser:MP4');
const tagFormat = 'iTunes';

interface IEncoder {
  lossy: boolean;
  format: string;
}

interface ISoundSampleDescription {
  dataFormat: string;
  dataReferenceIndex: number;
  description?: {
    numAudioChannels: number;
    /**
     * Number of bits in each uncompressed sound sample
     */
    sampleSize?: number;
    /**
     * Compression ID
     */
    compressionId?: number;
    packetSize?: number;
    sampleRate: number;
  };
}

interface ITrackDescription {
  header: AtomToken.ITrackHeaderAtom;
  soundSampleDescription: ISoundSampleDescription[];
  media: {
    header?: AtomToken.IAtomMdhd;
  },
  chapterList: number[];
  chunkOffsetTable: number[];
  sampleSize: number;
  sampleSizeTable: number[];
  sampleToChunkTable: AtomToken.ISampleToChunk[];
  timeToSampleTable: AtomToken.ITimeToSampleToken[];
  handler: AtomToken.IHandlerBox;
  fragments: {trackRun: AtomToken.ITrackRunBox, header: AtomToken.ITrackFragmentHeaderBox}[];
}

type IAtomParser = (payloadLength: number) => Promise<void>;

const encoderDict: { [dataFormatId: string]: IEncoder; } = {
  raw: {
    lossy: false,
    format: 'raw'
  },
  MAC3: {
    lossy: true,
    format: 'MACE 3:1'
  },
  MAC6: {
    lossy: true,
    format: 'MACE 6:1'
  },
  ima4: {
    lossy: true,
    format: 'IMA 4:1'
  },
  ulaw: {
    lossy: true,
    format: 'uLaw 2:1'
  },
  alaw: {
    lossy: true,
    format: 'uLaw 2:1'
  },
  Qclp: {
    lossy: true,
    format: 'QUALCOMM PureVoice'
  },
  '.mp3': {
    lossy: true,
    format: 'MPEG-1 layer 3'
  },
  alac: {
    lossy: false,
    format: 'ALAC'
  },
  'ac-3': {
    lossy: true,
    format: 'AC-3'
  },
  mp4a: {
    lossy: true,
    format: 'MPEG-4/AAC'
  },
  mp4s: {
    lossy: true,
    format: 'MP4S'
  },
  // Closed Captioning Media, https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap3/qtff3.html#//apple_ref/doc/uid/TP40000939-CH205-SW87
  c608: {
    lossy: true,
    format: 'CEA-608'
  },
  c708: {
    lossy: true,
    format: 'CEA-708'
  }
};

function distinct(value: AnyTagValue, index: number, self: AnyTagValue[]) {
  return self.indexOf(value) === index;
}

/*
 * Parser for the MP4 (MPEG-4 Part 14) container format
 * Standard: ISO/IEC 14496-14
 * supporting:
 * - QuickTime container
 * - MP4 File Format
 * - 3GPP file format
 * - 3GPP2 file format
 *
 * MPEG-4 Audio / Part 3 (.m4a)& MPEG 4 Video (m4v, mp4) extension.
 * Support for Apple iTunes tags as found in a M4A/M4V files.
 * Ref:
 *   https://en.wikipedia.org/wiki/ISO_base_media_file_format
 *   https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/Metadata/Metadata.html
 *   http://atomicparsley.sourceforge.net/mpeg-4files.html
 *   https://github.com/sergiomb2/libmp4v2/wiki/iTunesMetadata
 *   https://wiki.multimedia.cx/index.php/QuickTime_container
 */
export class MP4Parser extends BasicParser {

  private static read_BE_Integer(array: Uint8Array, signed: boolean): number {
    const integerType = (signed ? 'INT' : 'UINT') + array.length * 8 + (array.length > 1 ? '_BE' : '');
    const token: IGetToken<number | bigint> = (Token as unknown as { [id: string]: IGetToken<number | bigint> })[integerType];
    if (!token) {
      throw new Mp4ContentError(`Token for integer type not found: "${integerType}"`);
    }
    return Number(token.get(array, 0));
  }

  private audioLengthInBytes: number | undefined;
  private tracks = new Map<number, ITrackDescription>();
  private hasVideoTrack = false;
  private hasAudioTrack = true;


  public async parse(): Promise<void> {

    this.hasVideoTrack = false;
    this.hasAudioTrack = true;
    this.tracks.clear();

    let remainingFileSize = this.tokenizer.fileInfo.size || 0;

    while (!this.tokenizer.fileInfo.size || remainingFileSize > 0) {
      try {
        const token = await this.tokenizer.peekToken<AtomToken.IAtomHeader>(AtomToken.Header);
        if (token.name === '\0\0\0\0') {
          const errMsg = `Error at offset=${this.tokenizer.position}: box.id=0`;
          debug(errMsg);
          this.addWarning(errMsg);
          break;
        }
      } catch (error) {
        if (error instanceof Error) {
          const errMsg = `Error at offset=${this.tokenizer.position}: ${error.message}`;
          debug(errMsg);
          this.addWarning(errMsg);
        } else throw error;
        break;
      }
      const rootAtom = await Atom.readAtom(this.tokenizer, (atom, remaining) => this.handleAtom(atom, remaining), null, remainingFileSize);
      remainingFileSize -= rootAtom.header.length === BigInt(0) ? remainingFileSize : Number(rootAtom.header.length);
    }

    // Post process metadata
    const formatList: string[] = [];
    this.tracks.forEach(track => {
      const trackFormats: string[] = [];

      track.soundSampleDescription.forEach(ssd => {
        const streamInfo: ITrackInfo = {};
        const encoderInfo = encoderDict[ssd.dataFormat];
        if (encoderInfo) {
          trackFormats.push(encoderInfo.format);
          streamInfo.codecName = encoderInfo.format;
        } else {
          streamInfo.codecName = `<${ssd.dataFormat}>`;
        }
        if (ssd.description) {
          const {description} = ssd;
          if (description.sampleRate > 0) {
            streamInfo.type = TrackType.audio;
            streamInfo.audio = {
              samplingFrequency: description.sampleRate,
              bitDepth: description.sampleSize,
              channels: description.numAudioChannels
            };
          }
        }
        this.metadata.addStreamInfo(streamInfo);
      });

      if (trackFormats.length >= 1) {
        formatList.push(trackFormats.join('/'));
      }
    });

    if (formatList.length > 0) {
      this.metadata.setFormat('codec', formatList.filter(distinct).join('+'));
    }

    const audioTracks = [...this.tracks.values()].filter(track => {
      return track.soundSampleDescription.length >= 1 && track.soundSampleDescription[0].description && track.soundSampleDescription[0].description.numAudioChannels > 0;
    });

    if (audioTracks.length >= 1) {
      const audioTrack = audioTracks[0];

      if (audioTrack.media.header && audioTrack.media.header.timeScale > 0) {
        if (audioTrack.media.header.duration > 0) {
          debug('Using duration defined on audio track');
          const duration = audioTrack.media.header.duration / audioTrack.media.header.timeScale; // calculate duration in seconds
          this.metadata.setFormat('duration', duration);
        } else if (audioTrack.fragments.length > 0) {
          debug('Calculate duration defined in track fragments');

          let totalTimeUnits = 0;
          for (const fragment of audioTrack.fragments) {
            const defaultDuration = fragment.header.defaultSampleDuration;

            for (const sample of fragment.trackRun.samples) {
              const dur = sample.sampleDuration ?? defaultDuration;

              if (dur == null) {
                throw new Error("Missing sampleDuration and no default_sample_duration in tfhd");
              }

              totalTimeUnits += dur;
            }
          }
          this.metadata.setFormat('duration', totalTimeUnits / audioTrack.media.header.timeScale);
        }
      }

      const ssd = audioTrack.soundSampleDescription[0];
      if (ssd.description && audioTrack.media.header) {
        this.metadata.setFormat('sampleRate', ssd.description.sampleRate);
        this.metadata.setFormat('bitsPerSample', ssd.description.sampleSize);
        this.metadata.setFormat('numberOfChannels', ssd.description.numAudioChannels);

        if (audioTrack.media.header.timeScale === 0 && audioTrack.timeToSampleTable.length > 0) {
          const totalSampleSize = audioTrack.timeToSampleTable
            .map(ttstEntry => ttstEntry.count * ttstEntry.duration)
            .reduce((total, sampleSize) => total + sampleSize);
          const duration = totalSampleSize / ssd.description.sampleRate;
          this.metadata.setFormat('duration', duration);
        }
      }
      const encoderInfo = encoderDict[ssd.dataFormat];
      if (encoderInfo) {
        this.metadata.setFormat('lossless', !encoderInfo.lossy);
      }

      this.calculateBitRate();
    }

    this.metadata.setFormat('hasAudio', this.hasAudioTrack);
    this.metadata.setFormat('hasVideo', this.hasVideoTrack);
  }

  public async handleAtom(atom: Atom, remaining: number): Promise<void> {
    if (atom.parent) {
      switch (atom.parent.header.name) {
        case 'ilst':
        case '<id>':
          return this.parseMetadataItemData(atom);
         case 'moov':
           switch(atom.header.name) {
             case 'trak':
               return this.parseTrackBox(atom);
           }
           break;
        case 'moof':
          switch(atom.header.name) {
            case 'traf':
              return this.parseTrackFragmentBox(atom);
          }
      }
    }

    // const payloadLength = atom.getPayloadLength(remaining);

    if (this.atomParsers[atom.header.name]) {
      return this.atomParsers[atom.header.name](remaining);
    }
    debug(`No parser for atom path=${atom.atomPath}, payload-len=${remaining}, ignoring atom`);
    await this.tokenizer.ignore(remaining);
  }

  private getTrackDescription(): ITrackDescription {
    // ToDo: pick the right track, not the last track!!!!
    const tracks = [...this.tracks.values()];
    return tracks[tracks.length - 1];
  }

  private calculateBitRate() {
    if (this.audioLengthInBytes && this.metadata.format.duration) {
      this.metadata.setFormat('bitrate', 8 * this.audioLengthInBytes / this.metadata.format.duration);
    }
  }

  private async addTag(id: string, value: AnyTagValue): Promise<void> {
    await this.metadata.addTag(tagFormat, id, value);
  }

  private addWarning(message: string) {
    debug(`Warning: ${message}`);
    this.metadata.addWarning(message);
  }

  /**
   * Parse data of Meta-item-list-atom (item of 'ilst' atom)
   * @param metaAtom
   * Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW8
   */
  private parseMetadataItemData(metaAtom: Atom): Promise<void> {

    let tagKey = metaAtom.header.name;

    return metaAtom.readAtoms(this.tokenizer, async (child, remaining) => {
      const payLoadLength = child.getPayloadLength(remaining);
      switch (child.header.name) {
        case 'data': // value atom
          return this.parseValueAtom(tagKey, child);

        case 'name': // name atom (optional)
        case 'mean':
        case 'rate': {
          const name = await this.tokenizer.readToken<AtomToken.INameAtom>(new AtomToken.NameAtom(payLoadLength));
          tagKey += `:${name.name}`;
          break;
        }

        default: {
          const uint8Array = await this.tokenizer.readToken<Uint8Array>(new Token.Uint8ArrayType(payLoadLength));
          this.addWarning(`Unsupported meta-item: ${tagKey}[${child.header.name}] => value=${uint8ArrayToHex(uint8Array)} ascii=${uint8ArrayToString(uint8Array, 'ascii')}`);
        }
      }

    }, metaAtom.getPayloadLength(0));
  }

  private async parseValueAtom(tagKey: string, metaAtom: Atom): Promise<void> {
    const dataAtom = await this.tokenizer.readToken(new AtomToken.DataAtom(Number(metaAtom.header.length) - AtomToken.Header.len));

    if (dataAtom.type.set !== 0) {
      throw new Mp4ContentError(`Unsupported type-set != 0: ${dataAtom.type.set}`);
    }

    // Use well-known-type table
    // Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW35
    switch (dataAtom.type.type) {

      case 0: // reserved: Reserved for use where no type needs to be indicated
        switch (tagKey) {
          case 'trkn':
          case 'disk': {
            const num = Token.UINT8.get(dataAtom.value, 3);
            const of = Token.UINT8.get(dataAtom.value, 5);
            // console.log("  %s[data] = %s/%s", tagKey, num, of);
            await this.addTag(tagKey, `${num}/${of}`);
            break;
          }

          case 'gnre': {
            const genreInt = Token.UINT8.get(dataAtom.value, 1);
            const genreStr = Genres[genreInt - 1];
            // console.log("  %s[data] = %s", tagKey, genreStr);
            await this.addTag(tagKey, genreStr);
            break;
          }

          case 'rate': {
            const rate = new TextDecoder('ascii').decode(dataAtom.value);
            await this.addTag(tagKey, rate);
            break;
          }

          default:
            debug(`unknown proprietary value type for: ${metaAtom.atomPath}`);
        }
        break;

      case 1: // UTF-8: Without any count or NULL terminator
      case 18: // Unknown: Found in m4b in combination with a '©gen' tag
        await this.addTag(tagKey, new TextDecoder('utf-8').decode(dataAtom.value));
        break;

      case 13: // JPEG
        if (this.options.skipCovers)
          break;
        await this.addTag(tagKey, {
          format: 'image/jpeg',
          data: Uint8Array.from(dataAtom.value)
        });
        break;

      case 14: // PNG
        if (this.options.skipCovers)
          break;
        await this.addTag(tagKey, {
          format: 'image/png',
          data: Uint8Array.from(dataAtom.value)
        });
        break;

      case 21: // BE Signed Integer
        await this.addTag(tagKey, MP4Parser.read_BE_Integer(dataAtom.value, true));
        break;

      case 22: // BE Unsigned Integer
        await this.addTag(tagKey, MP4Parser.read_BE_Integer(dataAtom.value, false));
        break;

      case 65: // An 8-bit signed integer
        await this.addTag(tagKey, Token.UINT8.get(dataAtom.value, 0));
        break;

      case 66: // A big-endian 16-bit signed integer
        await this.addTag(tagKey, Token.UINT16_BE.get(dataAtom.value, 0));
        break;

      case 67: // A big-endian 32-bit signed integer
        await this.addTag(tagKey, Token.UINT32_BE.get(dataAtom.value, 0));
        break;

      default:
        this.addWarning(`atom key=${tagKey}, has unknown well-known-type (data-type): ${dataAtom.type.type}`);
    }
  }

  private async parseTrackBox(trakBox: Atom): Promise<void> {
    // @ts-ignore
    const track: ITrackDescription = {
      media: {},
      fragments: []
    };

    await trakBox.readAtoms(this.tokenizer, async (child, remaining) => {
      const payLoadLength = child.getPayloadLength(remaining);
      switch (child.header.name) {

        case 'chap': {
          const chap = await this.tokenizer.readToken(new ChapterTrackReferenceBox(remaining));
          track.chapterList = chap;
          break;
        }

        case 'tkhd': // TrackHeaderBox
          track.header = await this.tokenizer.readToken(new AtomToken.TrackHeaderAtom(payLoadLength));
          break;

        case 'hdlr': // TrackHeaderBox
          track.handler = await this.tokenizer.readToken(new AtomToken.HandlerBox(payLoadLength));
          switch (track.handler.handlerType) {
            case 'audi':
              debug('Contains audio track');
              this.hasAudioTrack = true;
              break;
            case 'vide':
              debug('Contains video track');
              this.hasVideoTrack = true;
              break;
          }
          break;

        case 'mdhd': { // Parse media header (mdhd) box
          const mdhd_data = await this.tokenizer.readToken(new AtomToken.MdhdAtom(payLoadLength));
          track.media.header = mdhd_data;
          break;
        }

        case 'stco': {
           const stco = await this.tokenizer.readToken(new AtomToken.StcoAtom(payLoadLength));
           track.chunkOffsetTable = stco.entries; // remember chunk offsets
           break;
        }

        case 'stsc': { // sample-to-Chunk box
          const stsc = await this.tokenizer.readToken(new AtomToken.StscAtom(payLoadLength));
          track.sampleToChunkTable = stsc.entries;
          break;
        }

        case 'stsd': { // sample description box
          const stsd = await this.tokenizer.readToken(new AtomToken.StsdAtom(payLoadLength));
          track.soundSampleDescription = stsd.table.map(dfEntry => this.parseSoundSampleDescription(dfEntry));
          break;
        }

        case 'stts': { // time-to-sample table
          const stts = await this.tokenizer.readToken(new AtomToken.SttsAtom(payLoadLength));
          track.timeToSampleTable = stts.entries;
          break;
        }

        case 'stsz': {
          const stsz = await this.tokenizer.readToken(new AtomToken.StszAtom(payLoadLength));
          track.sampleSize = stsz.sampleSize;
          track.sampleSizeTable = stsz.entries;
          break;
        }

        case 'dinf':
        case 'vmhd':
        case 'smhd':
          debug(`Ignoring: ${child.header.name}`);
          await this.tokenizer.ignore(payLoadLength);
          break;

        default: {
          debug(`Unexpected track box: ${child.header.name}`);
          await this.tokenizer.ignore(payLoadLength);
        }
      }

    }, trakBox.getPayloadLength(0));
    // Register track
    this.tracks.set(track.header.trackId, track);
  }

  private parseTrackFragmentBox(trafBox: Atom): Promise<void> {
    let tfhd: AtomToken.ITrackFragmentHeaderBox;
    return trafBox.readAtoms(this.tokenizer, async (child, remaining) => {
      const payLoadLength = child.getPayloadLength(remaining);
      switch (child.header.name) {

        case 'tfhd': { // TrackFragmentHeaderBox
          const fragmentHeaderBox = new AtomToken.TrackFragmentHeaderBox(child.getPayloadLength(remaining));
          tfhd = await this.tokenizer.readToken(fragmentHeaderBox);
          break;
        }

        case 'tfdt': // TrackFragmentBaseMediaDecodeTimeBo
          await this.tokenizer.ignore(payLoadLength);
          break;

        case 'trun': { // TrackRunBox
          const trackRunBox = new AtomToken.TrackRunBox(payLoadLength);
          const trun = await this.tokenizer.readToken(trackRunBox);
          if (tfhd) {
            const track = this.tracks.get(tfhd.trackId);
            track?.fragments.push({header: tfhd, trackRun: trun});
          }
          break;
        }

        default: {
          debug(`Unexpected box: ${child.header.name}`);
          await this.tokenizer.ignore(payLoadLength);
        }
      }

    }, trafBox.getPayloadLength(0));
  }

  private atomParsers: { [id: string]: IAtomParser; } = {
    /**
     * Parse movie header (mvhd) atom
     * Ref: https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap2/qtff2.html#//apple_ref/doc/uid/TP40000939-CH204-56313
     */
    mvhd: async (len: number) => {
      const mvhd = await this.tokenizer.readToken<AtomToken.IAtomMvhd>(new AtomToken.MvhdAtom(len));
      this.metadata.setFormat('creationTime', mvhd.creationTime);
      this.metadata.setFormat('modificationTime', mvhd.modificationTime);
    },

    chap: async (len: number) => {

      const td = this.getTrackDescription();

      const trackIds: number[] = [];
      while (len >= Token.UINT32_BE.len) {
        trackIds.push(await this.tokenizer.readNumber(Token.UINT32_BE));
        len -= Token.UINT32_BE.len;
      }

      td.chapterList = trackIds;
    },

    /**
     * Parse mdat atom.
     * Will scan for chapters
     */
    mdat: async (len: number) => {

      this.audioLengthInBytes = len;
      this.calculateBitRate();

      if (this.options.includeChapters) {
        const trackWithChapters = [...this.tracks.values()].filter(track => track.chapterList);
        if (trackWithChapters.length === 1) {
          const chapterTrackIds = trackWithChapters[0].chapterList;
          const chapterTracks = [...this.tracks.values()].filter(track => chapterTrackIds.indexOf(track.header.trackId) !== -1);
          if (chapterTracks.length === 1) {
            return this.parseChapterTrack(chapterTracks[0], trackWithChapters[0], len);
          }
        }
      }
      await this.tokenizer.ignore(len);
    },

    ftyp: async (len: number) => {
      const types = [];
      while (len > 0) {
        const ftype = await this.tokenizer.readToken<AtomToken.IAtomFtyp>(AtomToken.ftyp);
        len -= AtomToken.ftyp.len;
        const value = ftype.type.replace(/\W/g, '');
        if (value.length > 0) {
          types.push(value); // unshift for backward compatibility
        }
      }
      debug(`ftyp: ${types.join('/')}`);
      const x = types.filter(distinct).join('/');
      this.metadata.setFormat('container', x);
    },

    /**
     * Parse sample description atom
     */
    stsd: async (len: number) => {
      const stsd = await this.tokenizer.readToken<AtomToken.IAtomStsd>(new AtomToken.StsdAtom(len));
      const trackDescription = this.getTrackDescription();
      trackDescription.soundSampleDescription = stsd.table.map(dfEntry => this.parseSoundSampleDescription(dfEntry));
    },

    /**
     * Parse sample-sizes atom ('stsz')
     */
    stsz: async (len: number) => {
      const stsz = await this.tokenizer.readToken<AtomToken.IStszAtom>(new AtomToken.StszAtom(len));
      const td = this.getTrackDescription();
      td.sampleSize = stsz.sampleSize;
      td.sampleSizeTable = stsz.entries;
    },

    date: async (len: number) => {
      const date = await this.tokenizer.readToken(new Token.StringType(len, 'utf-8'));
      await this.addTag('date', date);
    }
  };


  /**
   * @param sampleDescription
   * Ref: https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap3/qtff3.html#//apple_ref/doc/uid/TP40000939-CH205-128916
   */
  private parseSoundSampleDescription(sampleDescription: AtomToken.ISampleDescription): ISoundSampleDescription {

    const ssd: ISoundSampleDescription = {
      dataFormat: sampleDescription.dataFormat,
      dataReferenceIndex: sampleDescription.dataReferenceIndex
    };

    let offset = 0;
    if (sampleDescription.description) {
      const version = AtomToken.SoundSampleDescriptionVersion.get(sampleDescription.description, offset);
      offset += AtomToken.SoundSampleDescriptionVersion.len;

      if (version.version === 0 || version.version === 1) {
        // Sound Sample Description (Version 0)
        ssd.description = AtomToken.SoundSampleDescriptionV0.get(sampleDescription.description, offset);
      } else {
        debug(`Warning: sound-sample-description ${version} not implemented`);
      }
    }
    return ssd;
  }

  private async parseChapterTrack(chapterTrack: ITrackDescription, track: ITrackDescription, len: number): Promise<void> {
    if (!chapterTrack.sampleSize) {
      if (chapterTrack.chunkOffsetTable.length !== chapterTrack.sampleSizeTable.length)
        throw new Error('Expected equal chunk-offset-table & sample-size-table length.');
    }
    const chapters: IChapter[] = [];
    for (let i = 0; i < chapterTrack.chunkOffsetTable.length && len > 0; ++i) {
      const start = chapterTrack.timeToSampleTable
        .slice(0, i)
        .reduce((acc, cur) => acc + cur.duration, 0);

      const chunkOffset = chapterTrack.chunkOffsetTable[i];
      const nextChunkLen = chunkOffset - this.tokenizer.position;
      const sampleSize = chapterTrack.sampleSize > 0 ? chapterTrack.sampleSize : chapterTrack.sampleSizeTable[i];
      len -= nextChunkLen + sampleSize;
      if (len < 0) throw new Mp4ContentError('Chapter chunk exceeding token length');
      await this.tokenizer.ignore(nextChunkLen);
      const title = await this.tokenizer.readToken(new AtomToken.ChapterText(sampleSize));
      debug(`Chapter ${i + 1}: ${title}`);
      const chapter = {
        title,
        timeScale: chapterTrack.media.header ? chapterTrack.media.header.timeScale : 0,
        start,
        sampleOffset: this.findSampleOffset(track, this.tokenizer.position)
      };
      debug(`Chapter title=${chapter.title}, offset=${chapter.sampleOffset}/${track.header.duration}`); // ToDo, use media duration if required!!!
      chapters.push(chapter);
    }
    this.metadata.setFormat('chapters', chapters);
    await this.tokenizer.ignore(len);
  }

  private findSampleOffset(track: ITrackDescription, chapterOffset: number): number {

    let chunkIndex = 0;
    while (chunkIndex < track.chunkOffsetTable.length && track.chunkOffsetTable[chunkIndex] < chapterOffset) {
      ++chunkIndex;
    }

    return this.getChunkDuration(chunkIndex + 1, track);
  }

  private getChunkDuration(chunkId: number, track: ITrackDescription): number {
    let ttsi = 0;
    let ttsc = track.timeToSampleTable[ttsi].count;
    let ttsd = track.timeToSampleTable[ttsi].duration;
    let curChunkId = 1;
    let samplesPerChunk = this.getSamplesPerChunk(curChunkId, track.sampleToChunkTable);
    let totalDuration = 0;
    while (curChunkId < chunkId) {
      const nrOfSamples = Math.min(ttsc, samplesPerChunk);
      totalDuration += nrOfSamples * ttsd;
      ttsc -= nrOfSamples;
      samplesPerChunk -= nrOfSamples;
      if (samplesPerChunk === 0) {
        ++curChunkId;
        samplesPerChunk = this.getSamplesPerChunk(curChunkId, track.sampleToChunkTable);
      } else {
        ++ttsi;
        ttsc = track.timeToSampleTable[ttsi].count;
        ttsd = track.timeToSampleTable[ttsi].duration;
      }
    }
    return totalDuration;
  }

  private getSamplesPerChunk(chunkId: number, stcTable: AtomToken.ISampleToChunk[]): number {
    for (let i = 0; i < stcTable.length - 1; ++i) {
      if (chunkId >= stcTable[i].firstChunk && chunkId < stcTable[i + 1].firstChunk) {
        return stcTable[i].samplesPerChunk;
      }
    }
    return stcTable[stcTable.length - 1].samplesPerChunk;
  }
}
