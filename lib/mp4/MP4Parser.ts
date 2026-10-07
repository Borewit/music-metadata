import { textDecode } from '@borewit/text-codec';
import type { IGetToken } from '@tokenizer/token';
import initDebug from 'debug';
import type { IRandomAccessTokenizer } from 'strtok3';
import * as Token from 'token-types';
import { uint8ArrayToHex } from 'uint8array-extras';
import { BasicParser } from '../common/BasicParser.js';
import { Genres } from '../id3v1/ID3v1Parser.js';
import { type AnyTagValue, type IChapter, type ITrackInfo, TrackType } from '../type.js';
import { Atom } from './Atom.js';
import * as AtomToken from './AtomToken.js';
import { ChapterTrackReferenceBox, Mp4ContentError } from './AtomToken.js';

const debug = initDebug('music-metadata:parser:MP4');
const tagFormat = 'iTunes';

interface IMediaDataRange {
  offset: number;
  end: number;
}

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
  sampleDescriptions?: AtomToken.ISampleDescription[];
  media: {
    header?: AtomToken.IAtomMdhd;
  };
  chapterList?: number[];
  chunkOffsetTable: number[];
  sampleSize: number;
  sampleCount?: number;
  sampleSizeTable: number[];
  sampleToChunkTable: AtomToken.ISampleToChunk[];
  timeToSampleTable: AtomToken.ITimeToSampleToken[];
  handler?: AtomToken.IHandlerBox;
  fragments: { trackRun: AtomToken.ITrackRunBox; header: AtomToken.ITrackFragmentHeaderBox }[];

  samples?: number;
  sampleRate?: number;
  duration?: number;
  sizeInBytes?: number;
}

type IAtomParser = (payloadLength: number) => Promise<void>;

const encoderDict: { [dataFormatId: string]: IEncoder } = {
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

/**
 * Determine if a track carries audio.
 *
 * Ref: ISO/IEC 14496-12, 8.5.2: the sample entries in a sample description box are track-type specific,
 * selected by the handler type of the enclosing track. Only an audio track holds an AudioSampleEntry.
 * Both the 'soun' and 'audi' handler types are treated as audio.
 *
 * Falls back to the sample description when no handler box was found, preserving the previous behavior.
 */
function isAudioTrack(track: ITrackDescription): boolean {
  const [ssd] = track.soundSampleDescription ?? [];
  if (!ssd) {
    return false;
  }
  if (track.handler) {
    return track.handler.handlerType === 'soun' || track.handler.handlerType === 'audi';
  }
  return !!ssd.description && ssd.description.numAudioChannels > 0;
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
    const token: IGetToken<number | bigint> = (Token as unknown as { [id: string]: IGetToken<number | bigint> })[
      integerType
    ];
    if (!token) {
      throw new Mp4ContentError(`Token for integer type not found: "${integerType}"`);
    }
    return Number(token.get(array, 0));
  }

  // Metadata and sample tables are buffered; media data is skipped separately.
  // A bound is also necessary for streams whose total size is unknown.
  private validatePayloadLength(length: number): void {
    if (!Number.isSafeInteger(length) || length < 0 || length > 64 * 1024 * 1024) {
      throw new Mp4ContentError(`Atom payload exceeds the 64 MiB buffering limit: ${length}`);
    }
  }

  private async readToken<T>(token: IGetToken<T>, position?: number): Promise<T> {
    this.validatePayloadLength(token.len);
    return this.tokenizer.readToken(token, position);
  }

  private tracks = new Map<number, ITrackDescription>();
  private mediaDataRanges: IMediaDataRange[] = [];
  private streamedChapters = new Map<number, IChapter>();
  private streamedChapterCount?: number;
  private hasVideoTrack = false;
  private hasAudioTrack = false;

  public async parse(): Promise<void> {
    this.hasVideoTrack = false;
    this.hasAudioTrack = false;
    this.tracks.clear();
    this.mediaDataRanges = [];
    this.streamedChapters.clear();
    this.streamedChapterCount = undefined;

    let remainingFileSize = this.tokenizer.fileInfo.size ?? Number.POSITIVE_INFINITY;

    while (remainingFileSize > 0) {
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
        } else {
          throw error;
        }
        break;
      }
      const rootAtom = await Atom.readAtom(
        this.tokenizer,
        (atom, remaining) => this.handleAtom(atom, remaining),
        null,
        remainingFileSize
      );
      remainingFileSize = rootAtom.header.length === 0n ? 0 : remainingFileSize - Number(rootAtom.header.length);
    }

    if (this.mediaDataRanges.length > 0) {
      // Track references and sample tables may follow the media data in a trailing moov box.
      const tokenizer = this.tokenizer as IRandomAccessTokenizer;
      const position = tokenizer.position;
      try {
        await this.parseChapters(this.mediaDataRanges);
      } finally {
        tokenizer.setPosition(position);
      }
    }

    if (this.streamedChapterCount !== undefined && this.streamedChapters.size !== this.streamedChapterCount) {
      throw new Mp4ContentError('Chapter chunk exceeding media data bounds');
    }

    // Post process metadata
    const formatList: string[] = [];
    this.tracks.forEach(track => {
      const trackFormats: string[] = [];

      // Sample descriptions are alternative encodings of one track, not separate tracks.
      for (const ssd of track.soundSampleDescription) {
        const encoderInfo = encoderDict[ssd.dataFormat];
        if (encoderInfo) {
          trackFormats.push(encoderInfo.format);
        }
      }

      if (trackFormats.length >= 1) {
        formatList.push(trackFormats.join('/'));
      }
    });

    if (formatList.length > 0) {
      this.metadata.setFormat('codec', formatList.filter(distinct).join('+'));
    }

    const audioTracks = [...this.tracks.values()].filter(isAudioTrack);

    // Calculate duration and bitrate of audio tracks
    for (const audioTrack of audioTracks) {
      if (audioTrack.media.header && audioTrack.media.header.timeScale > 0) {
        audioTrack.sampleRate = audioTrack.media.header.timeScale;
        if (
          audioTrack.media.header.duration > 0 &&
          audioTrack.media.header.duration !== 0xffffffff &&
          audioTrack.media.header.duration !== Number(0xffffffffffffffffn)
        ) {
          debug('Using duration defined on audio track');
          audioTrack.samples = audioTrack.media.header.duration;
          audioTrack.duration = audioTrack.samples / audioTrack.sampleRate;
        }

        if (audioTrack.fragments.length > 0) {
          debug('Calculate duration defined in track fragments');

          let totalTimeUnits = 0;
          audioTrack.sizeInBytes = 0;
          for (const fragment of audioTrack.fragments) {
            for (const sample of fragment.trackRun.samples) {
              const dur = sample.sampleDuration ?? fragment.header.defaultSampleDuration ?? 0;
              const size = sample.sampleSize ?? fragment.header.defaultSampleSize ?? 0;
              if (dur === 0) {
                throw new Error('Missing sampleDuration and no defaultSampleDuration in track fragment header');
              }
              if (size === 0) {
                throw new Error('Missing sampleSize and no defaultSampleSize in track fragment header');
              }

              totalTimeUnits += dur;
              audioTrack.sizeInBytes += size;
            }
          }
          if (!audioTrack.samples) {
            audioTrack.samples = totalTimeUnits;
          }
          if (!audioTrack.duration) {
            audioTrack.duration = totalTimeUnits / audioTrack.sampleRate;
          }
        } else if (audioTrack.sampleSizeTable.length > 0) {
          audioTrack.sizeInBytes = audioTrack.sampleSizeTable.reduce((sum, n) => sum + n, 0);
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
          audioTrack.duration = totalSampleSize / ssd.description.sampleRate;
        }
      }
      const encoderInfo = encoderDict[ssd.dataFormat];
      if (encoderInfo) {
        this.metadata.setFormat('lossless', !encoderInfo.lossy);
      }
    }

    if (audioTracks.length >= 1) {
      const firstAudioTrack = audioTracks[0];
      if (firstAudioTrack.duration) {
        this.metadata.setFormat('duration', firstAudioTrack.duration);
        if (firstAudioTrack.sizeInBytes) {
          this.metadata.setFormat('bitrate', (8 * firstAudioTrack.sizeInBytes) / firstAudioTrack.duration);
        }
      }
    }

    for (const track of this.tracks.values()) {
      this.metadata.addStreamInfo(this.getTrackInfo(track));
    }

    this.metadata.setFormat('hasAudio', this.hasAudioTrack || audioTracks.length > 0);
    this.metadata.setFormat('hasVideo', this.hasVideoTrack);
  }

  public async handleAtom(atom: Atom, remaining: number): Promise<void> {
    if (atom.parent) {
      switch (atom.parent.header.name) {
        case 'ilst':
        case '<id>':
          return this.parseMetadataItemData(atom);
        case 'moov':
          switch (atom.header.name) {
            case 'trak':
              return this.parseTrackBox(atom);
            case 'udta':
              return this.parseTrackBox(atom);
          }
          break;
        case 'moof':
          switch (atom.header.name) {
            case 'traf':
              return this.parseTrackFragmentBox(atom);
          }
      }
    }

    if (this.atomParsers[atom.header.name]) {
      if (atom.header.name !== 'mdat') {
        this.validatePayloadLength(remaining);
      }
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

    return metaAtom.readAtoms(
      this.tokenizer,
      async child => {
        const payLoadLength = child.getPayloadLength();
        switch (child.header.name) {
          case 'data': // value atom
            return this.parseValueAtom(tagKey, child);

          case 'name': // name atom (optional)
          case 'mean':
          case 'rate': {
            const name = await this.readToken<AtomToken.INameAtom>(new AtomToken.NameAtom(payLoadLength));
            tagKey += `:${name.name}`;
            break;
          }

          default: {
            const uint8Array = await this.readToken<Uint8Array>(new Token.Uint8ArrayType(payLoadLength));
            this.addWarning(
              `Unsupported meta-item: ${tagKey}[${child.header.name}] => value=${uint8ArrayToHex(uint8Array)} ascii=${textDecode(uint8Array, 'ascii')}`
            );
          }
        }
      },
      metaAtom.getPayloadLength()
    );
  }

  private async parseValueAtom(tagKey: string, metaAtom: Atom): Promise<void> {
    const dataAtom = await this.readToken(new AtomToken.DataAtom(metaAtom.getPayloadLength()));

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
            const rate = textDecode(dataAtom.value, 'ascii');
            await this.addTag(tagKey, rate);
            break;
          }

          default:
            debug(`unknown proprietary value type for: ${metaAtom.atomPath}`);
        }
        break;

      case 1: // UTF-8: Without any count or NULL terminator
      case 18: // Unknown: Found in m4b in combination with a '©gen' tag
        await this.addTag(tagKey, textDecode(dataAtom.value));
        break;

      case 13: // JPEG
        if (this.options.skipCovers) {
          break;
        }
        await this.addTag(tagKey, {
          format: 'image/jpeg',
          data: Uint8Array.from(dataAtom.value)
        });
        break;

      case 14: // PNG
        if (this.options.skipCovers) {
          break;
        }
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

  private getTrackInfo(track: ITrackDescription): ITrackInfo {
    const info: ITrackInfo = {
      id: track.header.trackId,
      flagEnabled: (track.header.flags & 1) !== 0
    };
    switch (track.handler?.handlerType) {
      case 'soun':
      case 'audi':
        info.type = TrackType.audio;
        break;
      case 'vide':
        info.type = TrackType.video;
        break;
      case 'text':
      case 'sbtl':
      case 'subt':
      case 'clcp':
        info.type = TrackType.subtitle;
        break;
      case 'meta':
      case 'mdta':
        info.type = TrackType.metadata;
        break;
      default:
        if (isAudioTrack(track)) {
          info.type = TrackType.audio;
        }
    }

    const mediaHeader = track.media.header;
    if (mediaHeader) {
      if (
        mediaHeader.timeScale > 0 &&
        mediaHeader.duration > 0 &&
        mediaHeader.duration !== 0xffffffff &&
        mediaHeader.duration !== Number(0xffffffffffffffffn)
      ) {
        info.duration = mediaHeader.duration / mediaHeader.timeScale;
      }
      // ISO BMFF stores three lowercase letters in three 5-bit fields.
      const letters = [10, 5, 0].map(shift => (mediaHeader.language >> shift) & 0x1f);
      if (letters.every(letter => letter >= 1 && letter <= 26)) {
        info.language = String.fromCharCode(...letters.map(letter => letter + 0x60));
      }
    }
    if (track.duration !== undefined) {
      info.duration = track.duration;
    }
    const size =
      track.sizeInBytes ??
      (track.sampleSize > 0 && track.sampleCount !== undefined
        ? track.sampleSize * track.sampleCount
        : track.sampleSizeTable.length > 0
          ? track.sampleSizeTable.reduce((sum, value) => sum + value, 0)
          : undefined);
    if (size !== undefined && info.duration && info.duration > 0) {
      info.bitrate = (8 * size) / info.duration;
    }

    const ssd = track.soundSampleDescription[0];
    if (ssd) {
      info.codecId = ssd.dataFormat;
      const encoder = encoderDict[ssd.dataFormat];
      info.codecName = encoder?.format ?? `<${ssd.dataFormat}>`;
      if (info.type === TrackType.audio) {
        if (encoder) {
          info.lossless = !encoder.lossy;
        }
        if (ssd.description) {
          info.audio = {};
          if (ssd.description.sampleRate > 0) {
            info.audio.samplingFrequency = ssd.description.sampleRate;
          }
          if (ssd.description.numAudioChannels > 0) {
            info.audio.channels = ssd.description.numAudioChannels;
          }
          if (ssd.description.sampleSize && ssd.description.sampleSize > 0) {
            info.audio.bitDepth = ssd.description.sampleSize;
          }
        }
      }
    }
    // A VisualSampleEntry has width and height 16 bytes after the SampleEntry base.
    const description = track.sampleDescriptions?.[0]?.description;
    if (info.type === TrackType.video && description && description.length >= 20) {
      const pixelWidth = Token.UINT16_BE.get(description, 16);
      const pixelHeight = Token.UINT16_BE.get(description, 18);
      if (pixelWidth > 0 && pixelHeight > 0) {
        info.video = { pixelWidth, pixelHeight };
      }
    }
    return info;
  }

  private async parseTrackBox(trakBox: Atom): Promise<void> {
    // The handler and header can occur in any order; resolve them after parsing the track.
    const track: Omit<ITrackDescription, 'header'> & { header?: AtomToken.ITrackHeaderAtom } = {
      media: {},
      fragments: [],
      soundSampleDescription: [],
      chunkOffsetTable: [],
      sampleSize: 0,
      sampleSizeTable: [],
      sampleToChunkTable: [],
      timeToSampleTable: []
    };

    await trakBox.readAtoms(
      this.tokenizer,
      async child => {
        const payLoadLength = child.getPayloadLength();
        switch (child.header.name) {
          case 'chap': {
            const chap = await this.readToken(new ChapterTrackReferenceBox(payLoadLength));
            track.chapterList = chap;
            break;
          }

          case 'tkhd': // TrackHeaderBox
            track.header = await this.readToken(new AtomToken.TrackHeaderAtom(payLoadLength));
            break;

          case 'hdlr': // TrackHeaderBox
            track.handler = await this.readToken(new AtomToken.HandlerBox(payLoadLength));

            if (track.handler.handlerType === 'audi' || track.handler.handlerType === 'soun') {
              this.hasAudioTrack = true;
            } else if (track.handler.handlerType === 'vide') {
              this.hasVideoTrack = true;
            }
            break;

          case 'mdhd': {
            // Parse media header (mdhd) box
            const mdhd_data = await this.readToken(new AtomToken.MdhdAtom(payLoadLength));
            track.media.header = mdhd_data;
            break;
          }

          case 'stco': {
            const stco = await this.readToken(new AtomToken.StcoAtom(payLoadLength));
            track.chunkOffsetTable = stco.entries; // remember chunk offsets
            break;
          }

          case 'stsc': {
            // sample-to-Chunk box
            const stsc = await this.readToken(new AtomToken.StscAtom(payLoadLength));
            track.sampleToChunkTable = stsc.entries;
            break;
          }

          case 'stsd': {
            // sample description box
            const stsd = await this.readToken(new AtomToken.StsdAtom(payLoadLength));
            track.sampleDescriptions = stsd.table;
            track.soundSampleDescription = stsd.table.map(dfEntry => this.parseSoundSampleDescription(dfEntry));
            break;
          }

          case 'stts': {
            // time-to-sample table
            const stts = await this.readToken(new AtomToken.SttsAtom(payLoadLength));
            track.timeToSampleTable = stts.entries;
            break;
          }

          case 'stsz': {
            const stsz = await this.readToken(new AtomToken.StszAtom(payLoadLength));
            track.sampleSize = stsz.sampleSize;
            track.sampleCount = stsz.numberOfEntries;
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
      },
      trakBox.getPayloadLength()
    );
    // Register track
    if (track.header) {
      this.tracks.set(track.header.trackId, { ...track, header: track.header });
    }
  }

  private parseTrackFragmentBox(trafBox: Atom): Promise<void> {
    let tfhd: AtomToken.ITrackFragmentHeaderBox;
    return trafBox.readAtoms(
      this.tokenizer,
      async child => {
        const payLoadLength = child.getPayloadLength();
        switch (child.header.name) {
          case 'tfhd': {
            // TrackFragmentHeaderBox
            const fragmentHeaderBox = new AtomToken.TrackFragmentHeaderBox(child.getPayloadLength());
            tfhd = await this.readToken(fragmentHeaderBox);
            break;
          }

          case 'tfdt': // TrackFragmentBaseMediaDecodeTimeBo
            await this.tokenizer.ignore(payLoadLength);
            break;

          case 'trun': {
            // TrackRunBox
            const trackRunBox = new AtomToken.TrackRunBox(payLoadLength);
            const trun = await this.readToken(trackRunBox);
            if (tfhd) {
              const track = this.tracks.get(tfhd.trackId);
              track?.fragments.push({ header: tfhd, trackRun: trun });
            }
            break;
          }

          default: {
            debug(`Unexpected box: ${child.header.name}`);
            await this.tokenizer.ignore(payLoadLength);
          }
        }
      },
      trafBox.getPayloadLength()
    );
  }

  private atomParsers: { [id: string]: IAtomParser } = {
    /**
     * Parse movie header (mvhd) atom
     * Ref: https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap2/qtff2.html#//apple_ref/doc/uid/TP40000939-CH204-56313
     */
    mvhd: async (len: number) => {
      const mvhd = await this.readToken<AtomToken.IAtomMvhd>(new AtomToken.MvhdAtom(len));
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
      const range = { offset: this.tokenizer.position, end: this.tokenizer.position + len };
      if (this.options.includeChapters) {
        if (this.tokenizer.supportsRandomAccess()) {
          this.mediaDataRanges.push(range);
        } else {
          await this.parseChapters([range], true);
        }
      }
      await this.tokenizer.ignore(range.end - this.tokenizer.position);
    },

    ftyp: async (len: number) => {
      if (len < 8 || len % AtomToken.ftyp.len !== 0) {
        throw new Mp4ContentError(`Invalid ftyp payload length: ${len}`);
      }
      const types = [];
      while (len > 0) {
        const ftype = await this.readToken<AtomToken.IAtomFtyp>(AtomToken.ftyp);
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
      const stsd = await this.readToken<AtomToken.IAtomStsd>(new AtomToken.StsdAtom(len));
      const trackDescription = this.getTrackDescription();
      trackDescription.soundSampleDescription = stsd.table.map(dfEntry => this.parseSoundSampleDescription(dfEntry));
    },

    /**
     * Parse sample-sizes atom ('stsz')
     */
    stsz: async (len: number) => {
      const stsz = await this.readToken<AtomToken.IStszAtom>(new AtomToken.StszAtom(len));
      const td = this.getTrackDescription();
      td.sampleSize = stsz.sampleSize;
      td.sampleCount = stsz.numberOfEntries;
      td.sampleSizeTable = stsz.entries;
    },

    date: async (len: number) => {
      const date = await this.readToken(new Token.StringType(len, 'utf-8'));
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
    const { description } = sampleDescription;
    // Only an AudioSampleEntry carries a sound sample description; it is at least 20 bytes beyond the
    // 16-byte SampleEntry base. A shorter description belongs to another sample entry class, or is truncated.
    if (description && description.length >= AtomToken.SoundSampleDescriptionVersion.len) {
      const version = AtomToken.SoundSampleDescriptionVersion.get(description, offset);
      offset += AtomToken.SoundSampleDescriptionVersion.len;

      if (version.version === 0 || version.version === 1) {
        // Sound Sample Description (Version 0)
        if (description.length >= offset + AtomToken.SoundSampleDescriptionV0.len) {
          ssd.description = AtomToken.SoundSampleDescriptionV0.get(description, offset);
        } else {
          debug(`Warning: sound-sample-description too short: ${description.length} bytes`);
        }
      } else {
        debug(`Warning: sound-sample-description ${version} not implemented`);
      }
    }
    return ssd;
  }

  private async parseChapters(mediaDataRanges: IMediaDataRange[], forwardOnly = false): Promise<void> {
    const tracks = [...this.tracks.values()];
    const trackWithChapters = tracks.filter(track => track.chapterList);
    if (trackWithChapters.length === 1) {
      const track = trackWithChapters[0];
      const chapterTracks = tracks.filter(chapterTrack =>
        (track.chapterList ?? []).includes(chapterTrack.header.trackId)
      );
      if (chapterTracks.length === 1) {
        await this.parseChapterTrack(chapterTracks[0], track, mediaDataRanges, forwardOnly);
      }
    }
  }

  private async parseChapterTrack(
    chapterTrack: ITrackDescription,
    track: ITrackDescription,
    mediaDataRanges: IMediaDataRange[],
    forwardOnly: boolean
  ): Promise<void> {
    if (!chapterTrack.sampleSize) {
      if (chapterTrack.chunkOffsetTable.length !== chapterTrack.sampleSizeTable.length) {
        throw new Error('Expected equal chunk-offset-table & sample-size-table length.');
      }
    }
    if (forwardOnly) {
      this.streamedChapterCount = chapterTrack.chunkOffsetTable.length;
    }
    const chapters: IChapter[] = [];
    for (let i = 0; i < chapterTrack.chunkOffsetTable.length; ++i) {
      const start = chapterTrack.timeToSampleTable.slice(0, i).reduce((acc, cur) => acc + cur.duration, 0);

      const chunkOffset = chapterTrack.chunkOffsetTable[i];
      if (forwardOnly) {
        // Completed samples belong to earlier payloads; future samples wait for their mdat.
        if (this.streamedChapters.has(i) || chunkOffset >= mediaDataRanges[0].end) {
          continue;
        }
        if (chunkOffset < this.tokenizer.position) {
          throw new Mp4ContentError('Chapter chunk exceeding media data bounds');
        }
      }
      const sampleSize = chapterTrack.sampleSize > 0 ? chapterTrack.sampleSize : chapterTrack.sampleSizeTable[i];
      if (!mediaDataRanges.some(range => chunkOffset >= range.offset && chunkOffset + sampleSize <= range.end)) {
        throw new Mp4ContentError('Chapter chunk exceeding media data bounds');
      }
      const title = await this.readToken(new AtomToken.ChapterText(sampleSize), chunkOffset);
      debug(`Chapter ${i + 1}: ${title}`);
      const chapter = {
        title,
        timeScale: chapterTrack.media.header ? chapterTrack.media.header.timeScale : 0,
        start,
        sampleOffset: this.findSampleOffset(track, this.tokenizer.position)
      };
      debug(`Chapter title=${chapter.title}, offset=${chapter.sampleOffset}/${track.header.duration}`); // ToDo, use media duration if required!!!
      if (forwardOnly) {
        this.streamedChapters.set(i, chapter);
      } else {
        chapters.push(chapter);
      }
    }
    if (!forwardOnly) {
      this.metadata.setFormat('chapters', chapters);
    } else if (this.streamedChapters.size === chapterTrack.chunkOffsetTable.length) {
      this.metadata.setFormat(
        'chapters',
        [...this.streamedChapters].sort(([left], [right]) => left - right).map(([, chapter]) => chapter)
      );
    }
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
