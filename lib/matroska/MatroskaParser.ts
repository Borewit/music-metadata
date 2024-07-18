import { Float32_BE, Float64_BE, StringType, UINT8 } from 'token-types';
import initDebug from 'debug';
import type { ITokenizer } from 'strtok3';

import { INativeMetadataCollector } from '../common/MetadataCollector.js';
import { BasicParser } from '../common/BasicParser.js';
import * as matroskaDtd from './MatroskaDtd.js';
import { DataType, IContainerType, IHeader, IMatroskaDoc, ITree, TargetType, TrackType } from './types.js';

import { IOptions, ITrackInfo } from '../type.js';
import { ITokenParser } from '../ParserFactory.js';
import * as Token from 'token-types';

const debug = initDebug('music-metadata:parser:matroska');

/**
 * Extensible Binary Meta Language (EBML) parser
 * https://en.wikipedia.org/wiki/Extensible_Binary_Meta_Language
 * http://matroska.sourceforge.net/technical/specs/rfc/index.html
 *
 * WEBM VP8 AUDIO FILE
 */
export class MatroskaParser extends BasicParser {

  private padding: number = 0;

  private parserMap = new Map<DataType, (e: IHeader) => Promise<any>>();

  private ebmlMaxIDLength = 4;
  private ebmlMaxSizeLength = 8;

  constructor() {
    super();
    this.parserMap.set(DataType.uint, e => this.readUint(e));
    this.parserMap.set(DataType.string, e => this.readString(e));
    this.parserMap.set(DataType.binary, e => this.readBuffer(e));
    this.parserMap.set(DataType.uid, async e => this.readBuffer(e));
    this.parserMap.set(DataType.bool, e => this.readFlag(e));
    this.parserMap.set(DataType.float, e => this.readFloat(e));
  }

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
    const containerSize = this.tokenizer.fileInfo.size ?? Number.MAX_SAFE_INTEGER;
    const matroska = await this.parseContainer(matroskaDtd.elements, containerSize, []) as any as IMatroskaDoc;

    this.metadata.setFormat('container', `EBML/${matroska.ebml.docType}`);
    if (matroska.segment) {

      const info = matroska.segment.info;
      if (info) {
        const timecodeScale = info.timecodeScale ? info.timecodeScale :1000000;
        if (typeof info.duration === 'number') {
          const duration = info.duration * timecodeScale / 1000000000;
          await this.addTag('segment:title', info.title);
          this.metadata.setFormat('duration', Number(duration));
        }
      }

      const audioTracks = matroska.segment.tracks;
      if (audioTracks && audioTracks.entries) {

        audioTracks.entries.forEach(entry => {
          const stream: ITrackInfo = {
            codecName: entry.codecID.replace('A_', '').replace('V_', ''),
            codecSettings: entry.codecSettings,
            flagDefault: entry.flagDefault,
            flagLacing: entry.flagLacing,
            flagEnabled: entry.flagEnabled,
            language: entry.language,
            name: entry.name,
            type: entry.trackType,
            audio: entry.audio,
            video: entry.video
          };
          this.metadata.addStreamInfo(stream);
        });

        const audioTrack = audioTracks.entries
          .filter(entry => {
            return entry.trackType === TrackType.audio.valueOf();
          })
          .reduce((acc, cur) => {
            if (!acc) {
              return cur;
            }
            if (!acc.flagDefault && cur.flagDefault) {
              return cur;
            }
            if (cur.trackNumber && cur.trackNumber < acc.trackNumber) {
              return cur;
            }
            return acc;
          }, null);

        if (audioTrack) {
          this.metadata.setFormat('codec', audioTrack.codecID.replace('A_', ''));
          this.metadata.setFormat('sampleRate', audioTrack.audio.samplingFrequency);
          this.metadata.setFormat('numberOfChannels', audioTrack.audio.channels);
        }

        if (matroska.segment.tags) {
          await Promise.all(matroska.segment.tags.tag.map(async tag => {
            const target = tag.target;
            const targetType = target?.targetTypeValue ? TargetType[target.targetTypeValue] : (target?.targetType ? target.targetType : 'track');
            await Promise.all(tag.simpleTags.map(async simpleTag => {
              const value = simpleTag.string ? simpleTag.string : simpleTag.binary;
              await this.addTag(`${targetType}:${simpleTag.name}`, value);
            }));
          }));
        }

        if (matroska.segment.attachments) {
          await Promise.all(matroska.segment.attachments.attachedFiles
            .filter(file => file.mimeType.startsWith('image/'))
            .map(file => this.addTag('picture', {
              data: file.data,
              format: file.mimeType,
              description: file.description,
              name: file.name
            })));
        }
      }
    }
  }

  private async parseContainer(container: IContainerType, posDone: number, path: string[]): Promise<ITree> {
    const tree: ITree = {};
    while (this.tokenizer.position < posDone) {
      let element: IHeader;
      try {
        element = await this.readElement();
      } catch (error) {
        if (error.message === 'End-Of-Stream') {
          break;
        }
        throw error;
      }
      const type = container[element.id];
      if (type) {
        debug(`Element: name=${type.name}, container=${!!type.container}`);
        if (type.container) {
          const res = await this.parseContainer(type.container, element.len >= 0 ? this.tokenizer.position + element.len : -1, path.concat([type.name]));
          if (type.multiple) {
            if (!tree[type.name]) {
              tree[type.name] = [];
            }
            (tree[type.name] as ITree[]).push(res);
          } else {
            tree[type.name] = res;
          }
        } else {
          tree[type.name] = await this.parserMap.get(type.value)(element);
        }
      } else {
        switch (element.id) {
          case 0xec: // void
            this.padding += element.len;
            await this.tokenizer.ignore(element.len);
            break;
          default:
            debug(`parseEbml: path=${path.join('/')}, unknown element: id=${element.id.toString(16)}`);
            this.padding += element.len;
            await this.tokenizer.ignore(element.len);
        }
      }
    }
    return tree;
  }

  private async readVintData(maxLength: number): Promise<Uint8Array> {
    const msb = await this.tokenizer.peekNumber(UINT8);
    let mask = 0x80;
    let oc = 1;

    // Calculate VINT_WIDTH
    while ((msb & mask) === 0) {
      if (oc > maxLength) {
        throw new Error('VINT value exceeding maximum size');
      }
      ++oc;
      mask >>= 1;
    }
    const id = new Uint8Array(oc);
    await this.tokenizer.readBuffer(id);
    return id;
  }

  private async readElement(): Promise<IHeader> {
    const id = await this.readVintData(this.ebmlMaxIDLength);
    const lenField = await this.readVintData(this.ebmlMaxSizeLength);
    lenField[0] ^= 0x80 >> (lenField.length - 1);
    return {
      id: MatroskaParser.readUIntBE(id, id.length),
      len: MatroskaParser.readUIntBE(lenField, lenField.length)
    };
  }

  private async readFloat(e: IHeader) {
    switch (e.len) {
      case 0:
        return 0.0;
      case 4:
        return this.tokenizer.readNumber(Float32_BE);
      case 8:
        return this.tokenizer.readNumber(Float64_BE);
      case 10:
        return this.tokenizer.readNumber(Float64_BE);
      default:
        throw new Error(`Invalid IEEE-754 float length: ${e.len}`);
    }
  }

  private async readFlag(e: IHeader): Promise<boolean> {
    return (await this.readUint(e)) === 1;
  }

  private async readUint(e: IHeader): Promise<number> {
    const buf = await this.readBuffer(e);
    return MatroskaParser.readUIntBE(buf, e.len);
  }

  private async readString(e: IHeader): Promise<string> {
    const rawString = await this.tokenizer.readToken(new StringType(e.len, 'utf-8'));
    return rawString.replace(/\x00.*$/g, '');
  }

  private async readBuffer(e: IHeader): Promise<Uint8Array> {
    const buf = new Uint8Array(e.len);
    await this.tokenizer.readBuffer(buf);
    return buf;
  }

  private async addTag(tagId: string, value: any): Promise<void> {
    await this.metadata.addTag('matroska', tagId, value);
  }

  private static readUIntBE(buf: Uint8Array, len: number): number {
    return Number(MatroskaParser.readUIntBeAsBigInt(buf, len));
  }

  /**
   * Reeds an unsigned integer from a big endian buffer of length `len`
   * @param buf Buffer to decode from
   * @param len Number of bytes
   * @private
   */
  private static readUIntBeAsBigInt(buf: Uint8Array, len: number): bigint {
    const normalizedNumber = new Uint8Array(8);
    const cleanNumber = buf.subarray(0, len);
    try {
      normalizedNumber.set(cleanNumber, 8 - len);
      return Token.UINT64_BE.get(normalizedNumber, 0);
    } catch(error) {
      return BigInt(-1);
    }
  }
}
