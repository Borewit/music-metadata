import * as assert from 'assert';
import * as Token from 'token-types';
import * as _debug from 'debug';
import { INativeMetadataCollector } from '../common/MetadataCollector';
import { ITokenizer } from 'strtok3/lib/type';
import { IOptions } from '../type';
import { ITokenParser } from '../ParserFactory';
import { BasicParser } from '../common/BasicParser';
import {
  ICuePoint, ICueTrackPosition, IEBML,
  IHeader,
  IMetaSeekInformation,
  ISeekHead,
  ISegment,
  ISegmentInformation, ISimpleTag, ITag, ITarget,
  ITrackAudio,
  ITrackEntry, ITrackVideo, TargetType
} from './types';

const debug = _debug('music-metadata:parser:ebml');

/**
 * Extensible Binary Meta Language (EBML) parser
 * https://en.wikipedia.org/wiki/Extensible_Binary_Meta_Language
 * http://matroska.sourceforge.net/technical/specs/rfc/index.html
 *
 * WEBM VP8 AUDIO FILE
 */
export class EbmlParser extends BasicParser {

  private padding: number = 0;

  /**
   * Initialize parser with output (metadata), input (tokenizer) & parsing options (options).
   * @param {INativeMetadataCollector} metadata Output
   * @param {ITokenizer} tokenizer Input
   * @param {IOptions} options Parsing options
   */
  public init(metadata: INativeMetadataCollector, tokenizer: ITokenizer, options: IOptions): ITokenParser {
    super.init(metadata, tokenizer, options);
    return this;
  }

  public async parse(): Promise<void> {
    const masterElement = await this.readElement();
    assert.equal(masterElement.id, 0x1A45DFA3, 'EBML signature');
    const ebml = await this.parseEbml(1, this.tokenizer.fileSize);
    this.metadata.setFormat('container', `EBML/${ebml.docType}`);
    if (ebml.segments.length > 0) {
      const segment = ebml.segments[0];
      const audioTracks = segment.tracks.filter(track => track.audio);
      if (audioTracks.length > 0) {
        const audioTrack = audioTracks[0];
        this.metadata.setFormat('codec', audioTrack.codecID.replace('A_', ''));
        this.metadata.setFormat('sampleRate', audioTrack.audio.samplingFrequency);
        this.metadata.setFormat('numberOfChannels', audioTrack.audio.channels);
      }
      if (segment.tags) {
        segment.tags.forEach(tag => {
          if (tag.targets.targetType) {
            const targetType = TargetType[tag.targets.targetType];
            tag.simpleTags.filter(st => st.tagString).forEach(st => {
              this.addTag(`${targetType}:${st.name}`, st.tagString);
            });
          }
        });
      }
    }
  }

  private async readVintData(): Promise<Buffer> {
    const msb = await this.tokenizer.peekNumber(Token.UINT8);
    let mask = 0x80;
    let ic = 1;

    // Calculate VINT_WIDTH
    while ((msb & mask) === 0) {
      ++ic;
      mask >>= 1;
    }

    const id = Buffer.alloc(ic);
    await this.tokenizer.readBuffer(id);
    return id;
  }

  private async readElement(): Promise<IHeader> {
    const id = await this.readVintData();
    const lenField = await this.readVintData();
    lenField[0] ^= 0x80 >> (lenField.length - 1);
    const nrLen = Math.min(6, lenField.length); // JavaScript can max read 6 bytes integer
    return {
      id: id.readUIntBE(0, id.length),
      len: lenField.readUIntBE(lenField.length - nrLen, nrLen)
    };
  }

  private async parseEbml(level: number, posDone: number): Promise<IEBML> {
    const ebml: IEBML = {segments: []};
    while (this.tokenizer.position < posDone) {
      const e = await this.readElement();
      switch (e.id) {
        case 0x18538067:
          const segment = await this.parseSegment(level + 1, this.tokenizer.position + e.len);
          const duration = segment.segmentInfo.duration * segment.segmentInfo.timecodeScale / 1000000000;
          this.metadata.setFormat('duration', duration);
          ebml.segments.push(segment);
          break;
        case 0x4286:
          ebml.version = await this.tokenizer.readNumber(Token.UINT8);
          break;
        case 0x4282:
          ebml.docType = await this.tokenizer.readToken(new Token.StringType(e.len, 'utf-8'));
          break;
        case 0xec: // void
          this.padding += e.len;
          await this.tokenizer.ignore(e.len); // ignore void
          break;
        default:
          debug(`parseEbml: level=${level} unknown element: id=${e.id.toString(16)}`);
          await this.tokenizer.ignore(e.len); // ignore payload
      }
    }
    return ebml;
  }

  private async parseSegment(level: number, posDone: number): Promise<ISegment> {
    const segment: ISegment = {};
    while (this.tokenizer.position < posDone) {
      const e = await this.readElement();
      switch (e.id) {
        case 0x114d9b74: // Meta Seek Information: SeekHead
          segment.metaSeekInfo = await this.parseMetaSeekInformation(level + 1, this.tokenizer.position + e.len);
          break;
        case 0x1654ae6b: // Track
          segment.tracks = await this.parseTracks(level + 1, this.tokenizer.position + e.len);
          break;
        case 0x1549a966: // Segment Information
          segment.segmentInfo = await this.parseSegmentInformation(level + 1, this.tokenizer.position + e.len);
          // this.metadata.setFormat('duration', segInfo.duration / segInfo.timecodeScale);
          break;
        case 0x1f43b675: // Cluster
          await this.tokenizer.ignore(e.len); // ignore payload
          break;
        case 0x1c53bb6b: // Cueing Data
          segment.cues = await this.parseCueingData(level + 1, this.tokenizer.position + e.len);
          break;
        case 0x1254c367: // Tagging
          segment.tags = await this.parseTags(level + 1, this.tokenizer.position + e.len);
          break;
        case 0xec: // void
          this.padding += e.len;
          await this.tokenizer.ignore(e.len); // ignore void
          break;
        default:
          debug(`parseSegment: level=${level} unknown element: id=${e.id.toString(16)}`);
          await this.tokenizer.ignore(e.len); // ignore payload
      }
    }
    return segment;
  }

  private async parseMetaSeekInformation(level: number, posDone: number): Promise<IMetaSeekInformation> {
    const metaSeekInfo: IMetaSeekInformation = {
      seekHeads: []
    };
    while (this.tokenizer.position < posDone) {
      const e = await this.readElement();
      switch (e.id) {
        case 0x4dbb: // Seek container
          metaSeekInfo.seekHeads.push(await this.parseSeekHead(level + 1, this.tokenizer.position + e.len));
          break;
        default:
          debug(`parseMetaSeekInformation: level=${level} unknown element: id=${e.id.toString(16)}`);
          await this.tokenizer.ignore(e.len); // ignore payload
      }
    }
    return metaSeekInfo;
  }

  private async parseSeekHead(level: number, posDone: number): Promise<ISeekHead> {
    const seekHead: ISeekHead = {};
    while (this.tokenizer.position < posDone) {
      const e = await this.readElement();
      switch (e.id) {
        case 0x53ab: // SeekID
          seekHead.id = await this.readBuffer(e);
          break;
        case 0x53ac: // SeekPosition
          seekHead.position = await this.readUint(e);
          break;
        default:
          debug(`parseSeekHead: level=${level} unknown element: id=${e.id.toString(16)}`);
          await this.tokenizer.ignore(e.len); // ignore payload
      }
    }
    return seekHead;
  }

  private async parseSegmentInformation(level: number, posDone: number): Promise<ISegmentInformation> {

    const segInfo: ISegmentInformation = {};

    while (this.tokenizer.position < posDone) {
      const e = await this.readElement();
      switch (e.id) {
        case 0x73a4: // SegmentUID
          segInfo.uid = await this.readBuffer(e);
          break;
        case 0x4489: // Duration
          segInfo.duration = await this.readFloat(e);
          break;
        case 0x2ad7b1: // TimecodeScale
          segInfo.timecodeScale = await this.readUint(e);
          break;
        case 0x4461: // DateUTC
          segInfo.dateUTC = await this.tokenizer.readNumber(Token.UINT64_BE);
          break;
        case 0x7ba9: // Title
          segInfo.title = await this.readString(e);
          break;
        case 0x4d80: // MuxingApp
          segInfo.muxingApp = await this.readString(e);
          break;
        case 0x5741: // WritingApp
          segInfo.writingApp = await this.readString(e);
          break;
        default:
          debug(`parseSegmentInformation: level=${level} unknown element: id=${e.id.toString(16)}`);
          await this.tokenizer.ignore(e.len); // ignore payload
      }
    }
    return segInfo;
  }

  private async parseTracks(level: number, posDone: number): Promise<ITrackEntry[]> {

    const trackEntries: ITrackEntry[] = [];

    while (this.tokenizer.position < posDone) {
      const e = await this.readElement();
      switch (e.id) {
        case 0xae: // TrackEntry
          const trackEntry = await this.parseTrackEntry(level + 1, this.tokenizer.position + e.len);
          trackEntries.push(trackEntry);
          break;
        default:
          debug(`parseTracks: level=${level} unknown element: id=${e.id.toString(16)}`);
          await this.tokenizer.ignore(e.len); // ignore payload
      }
    }
    return trackEntries;
  }

  private async parseTrackEntry(level: number, posDone: number): Promise<ITrackEntry> {

    const trackEntry: ITrackEntry = {};

    while (this.tokenizer.position < posDone) {
      const e = await this.readElement();
      switch (e.id) {
        case 0xe0: // Video container
          trackEntry.video = await this.parseTrackVideo(level + 1, this.tokenizer.position + e.len);
          break;
        case 0xe1: // Audio container
          trackEntry.audio = await this.parseTrackAudio(level + 1, this.tokenizer.position + e.len);
          break;
        case 0xd7: // TrackNumber
          trackEntry.trackNumber = await this.readUint(e);
          break;
        case 0x83: // TrackType
          trackEntry.trackType = await this.readUint(e);
          break;
        case 0x73c5: // TrackUID
          trackEntry.uid = await this.readBuffer(e);
          break;
        case 0xb9: // FlagEnabled
          trackEntry.flagEnabled = await this.readFlag(e);
          break;
        case 0x88: // FlagDefault
          trackEntry.flagDefault = await this.readFlag(e);
          break;
        case 0x9c: // FlagLacing
          trackEntry.flagLacing = await this.readFlag(e);
          break;
        case 0x23e383: // DefaultDuration
          trackEntry.defaultDuration = await this.readUint(e);
          break;
        case 0x23314f: // TrackTimecodeScale
          trackEntry.trackTimecodeScale = await this.readUint(e);
          break;
        case 0x536e: // Name
          trackEntry.name = await this.readString(e);
          break;
        case 0x22b59c: // Language
          trackEntry.language = await this.readString(e);
          break;
        case 0x86: // codecID
          trackEntry.codecID = await this.readString(e);
          break;
        case 0x63a2: // CodecPrivate
          trackEntry.codecPrivate = await this.readBuffer(e);
          break;
        case 0x258688: // CodecName
          trackEntry.codecName = await this.readString(e);
          break;
        case 0x3a9697: // CodecSettings
          trackEntry.codecSettings = await this.readString(e);
          break;
        case 0x3b4040: // CodecInfoURL
          trackEntry.codecInfoUrl = await this.readString(e);
          break;
        case 0x26b240: // CodecInfoURL
          trackEntry.codecDownloadUrl = await this.readString(e);
          break;
        default:
          debug(`parseTrackEntry: level=${level} unknown element: id=${e.id.toString(16)}`);
          await this.tokenizer.ignore(e.len); // ignore payload
      }
    }
    return trackEntry;
  }

  private async parseTrackVideo(level: number, posDone: number): Promise<ITrackVideo> {
    const video: ITrackVideo = {};

    while (this.tokenizer.position < posDone) {
      const e = await this.readElement();
      switch (e.id) {
        case 0x9a:
          video.flagInterlaced = await this.readFlag(e);
          break;
        case 0x53b8:
          video.stereoMode = await this.readUint(e);
          break;
        case 0xb0:
          video.pixelWidth = await this.readUint(e);
          break;
        case 0xba:
          video.pixelHeight = await this.readUint(e);
          break;
        case 0x54b0:
          video.displayWidth = await this.readUint(e);
          break;
        case 0x54ba:
          video.displayHeight = await this.readUint(e);
          break;
        case 0x54b3:
          video.aspectRatioType = await this.readUint(e);
          break;
        case 0x2eb524:
          video.colourSpace = await this.readBuffer(e);
          break;
        case 0x2fb523:
          video.gammaValue = await this.readFloat(e);
          break;
        default:
          debug(`parseTrackAudio: level=${level} unknown element: id=${e.id.toString(16)}`);
          await this.tokenizer.ignore(e.len); // ignore payload
      }
    }
    return video;
  }

  private async parseTrackAudio(level: number, posDone: number): Promise<ITrackAudio> {

    const trackAudio: ITrackAudio = {};

    while (this.tokenizer.position < posDone) {
      const e = await this.readElement();
      switch (e.id) {
        case 0xb5: // SamplingFrequency
          trackAudio.samplingFrequency = await this.readFloat(e);
          break;
        case 0x78b5: // OutputSamplingFrequency
          trackAudio.outputSamplingFrequency = await this.readFloat(e);
          break;
        case 0x94: // Channels
        case 0x9f: // https://www.matroska.org/technical/specs/index.html
          trackAudio.channels = await this.readUint(e);
          break;
        case 0x7d7b: // ChannelPositions
          trackAudio.channelPositions = await this.readBuffer(e);
          break;
        case 0x6264: // BitDepth
          trackAudio.bitDepth = await this.readUint(e);
          break;
        default:
          debug(`parseTrackAudio: level=${level} unknown element: id=${e.id.toString(16)}`);
          await this.tokenizer.ignore(e.len); // ignore payload
      }
    }
    return trackAudio;
  }

  private async parseCueingData(level: number, posDone: number): Promise<ICuePoint[]> {
    const cuePoints: ICuePoint[] = [];
    while (this.tokenizer.position < posDone) {
      const e = await this.readElement();
      debug(`level=${level}, id=${e.id.toString(16)}`);
      switch (e.id) {
        case 0xbb: // CuePoint
          cuePoints.push(await this.parseCuePoint(level + 1, this.tokenizer.position + e.len));
          break;
        default:
          debug(`parseCueingData: level=${level} unknown element: id=${e.id.toString(16)}`);
          await this.tokenizer.ignore(e.len); // ignore payload
      }
    }
    return cuePoints;
  }

  private async parseCuePoint(level: number, posDone: number): Promise<ICuePoint> {
    const cuePoint: ICuePoint = {
      cueTrackPositions: []
    };
    while (this.tokenizer.position < posDone) {
      const e = await this.readElement();
      switch (e.id) {
        case 0xb3: // CueTime
          cuePoint.cueTime = await this.readUint(e);
          break;
        case 0xb7: // CueTrackPosition
          cuePoint.cueTrackPositions.push(await this.parseCueTrackPosition(level + 1, this.tokenizer.position + e.len));
          break;
        default:
          debug(`parseCueingData: level=${level} unknown element: id=${e.id.toString(16)}`);
          await this.tokenizer.ignore(e.len); // ignore payload
      }
    }
    return cuePoint;
  }

  private async parseCueTrackPosition(level: number, posDone: number): Promise<ICueTrackPosition> {
    const position: ICueTrackPosition = {};
    while (this.tokenizer.position < posDone) {
      const e = await this.readElement();
      switch (e.id) {
        case 0xf7: // CueTrack
          position.cueTrack = await this.readUint(e);
          break;
        case 0xf1: // CueClusterPosition
          position.cueClusterPosition = await this.readUint(e);
          break;
        case 0x5378: // CueBlockNumber
          position.cueBlockNumber = await this.readUint(e);
          break;
        case 0xea: // CueCodecState
          position.cueCodecState = await this.readUint(e);
          break;
        default:
          debug(`parseCueTrackPosition: level=${level} unknown element: id=${e.id.toString(16)}`);
          await this.tokenizer.ignore(e.len); // ignore payload
      }
    }
    return position;
  }

  private async parseTags(level: number, posDone: number): Promise<ITag[]> {
    const tags: ITag[] = [];
    while (this.tokenizer.position < posDone) {
      const e = await this.readElement();
      switch (e.id) {
        case 0x7373: // Tag
          tags.push(await this.parseTag(level + 1, this.tokenizer.position + e.len));
          break;
        default:
          debug(`parseCueingData: level=${level} unknown element: id=${e.id.toString(16)}`);
          await this.tokenizer.ignore(e.len); // ignore payload
      }
    }
    return tags;
  }

  private async parseTag(level: number, posDone: number): Promise<ITag> {
    const tag: ITag = {
      targets: null,
      simpleTags: []
    };
    while (this.tokenizer.position < posDone) {
      const e = await this.readElement();
      switch (e.id) {
        case 0x63c0:
          tag.targets = await this.parseTarget(level + 1, this.tokenizer.position + e.len);
          break;
        case 0x67c8:
          tag.simpleTags.push(await this. parseSimpleTag(level + 1, this.tokenizer.position + e.len));
          break;
        default:
          debug(`parseTag: level=${level} unknown element: id=${e.id.toString(16)}`);
          await this.tokenizer.ignore(e.len); // ignore payload
      }
    }
    return tag;
  }

  private async parseTarget(level: number, posDone: number): Promise<ITarget> {
    const target: ITarget = {};
    while (this.tokenizer.position < posDone) {
      const e = await this.readElement();
      switch (e.id) {
        case 0x63c5:
          target.trackUID = await this.readBuffer(e);
          break;
        case 0x63c4:
          target.chapterUID = await this.readBuffer(e);
          break;
        case 0x63c6:
          target.attachmentUID = await this.readBuffer(e);
          break;
        case 0x68ca:
          target.targetType = await this.readUint(e);
          break;
        default:
          debug(`parseTarget: level=${level} unknown element: id=${e.id.toString(16)}`);
          await this.tokenizer.ignore(e.len); // ignore payload
      }
    }
    return target;
  }

  private async parseSimpleTag(level: number, posDone: number): Promise<ISimpleTag> {
    const simpleTag: ISimpleTag = {};
    while (this.tokenizer.position < posDone) {
      const e = await this.readElement();
      switch (e.id) {
        case 0x45a3:
          simpleTag.name = await this.readString(e);
          break;
        case 0x4487:
          simpleTag.tagString = await this.readString(e);
          break;
        case 0x4485:
          simpleTag.tagBinary = await this.readBuffer(e);
          break;
        case 0x447a:
          simpleTag.language = await this.readString(e);
          break;
        case 0x4484:
          simpleTag.tagDefault = await this.readFlag(e);
          break;
        default:
          debug(`parseSimpleTag: level=${level} unknown element: id=${e.id.toString(16)}`);
          await this.tokenizer.ignore(e.len); // ignore payload
      }
    }
    return simpleTag;
  }

  private async readFloat(e: IHeader) {
    switch (e.len) {
      case 0:
        return 0.0;
      case 4:
        return this.tokenizer.readNumber(Token.Float32_BE);
      case 8:
        return this.tokenizer.readNumber(Token.Float64_BE);
      case 10:
        return this.tokenizer.readNumber(Token.Float64_BE);
      default:
        throw new Error(`Invalid IEEE-754 float length: ${e.len}`);
    }
  }

  private async readFlag(e: IHeader): Promise<boolean> {
    return (await this.readUint(e)) === 1;
  }

  private async readUint(e: IHeader): Promise<number> {
    const buf = await this.readBuffer(e);
    const nrLen = Math.min(6, e.len); // JavaScript can max read 6 bytes integer
    return buf.readUIntBE(e.len - nrLen, nrLen);
  }

  private async readString(e: IHeader): Promise<string> {
    return this.tokenizer.readToken(new Token.StringType(e.len, 'utf-8'));
  }

  private async readBuffer(e: IHeader): Promise<Buffer> {
    const buf = Buffer.alloc(e.len);
    await this.tokenizer.readBuffer(buf);
    return buf;
  }

  private addTag(tagId: string, value: any) {
    this.metadata.addTag('EBML', tagId, value);
  }
}
