import { BasicParser } from "../common/BasicParser";
import { readUintBE } from "../compat/buffer";
import initDebug from "../debug";
import { EndOfStreamError } from "../peek-readable";
import { Float32_BE, Float64_BE, UINT8 } from "../token-types";
import { Utf8StringType } from "../token-types/string";

import { elements } from "./MatroskaDtd";
import { DataType, IContainerType, IHeader, IMatroskaDoc, ITrackEntry, ITree, TargetType, TrackType } from "./types";

import type { INativeMetadataCollector } from "../common/INativeMetadataCollector";
import type { ITokenParser } from "../ParserFactory";
import type { ITokenizer } from "../strtok3/types";
import type { IOptions, ITrackInfo } from "../type";

const debug = initDebug("music-metadata:parser:matroska");

/**
 * Extensible Binary Meta Language (EBML) parser
 * https://en.wikipedia.org/wiki/Extensible_Binary_Meta_Language
 * http://matroska.sourceforge.net/technical/specs/rfc/index.html
 *
 * WEBM VP8 AUDIO FILE
 */
export class MatroskaParser extends BasicParser {
  private padding = 0;

  private parserMap = new Map<DataType, (e: IHeader) => Promise<any>>();

  private ebmlMaxIDLength = 4;
  private ebmlMaxSizeLength = 8;

  constructor() {
    super();
    this.parserMap.set(DataType.uint, (e) => this.readUint(e));
    this.parserMap.set(DataType.string, (e) => this.readString(e));
    this.parserMap.set(DataType.binary, (e) => this.readBuffer(e));
    this.parserMap.set(DataType.uid, async (e) => (await this.readUint(e)) === 1);
    this.parserMap.set(DataType.bool, (e) => this.readFlag(e));
    this.parserMap.set(DataType.float, (e) => this.readFloat(e));
  }

  /**
   * Initialize parser with output (metadata), input (tokenizer) & parsing options (options).
   * @param {INativeMetadataCollector} metadata Output
   * @param {ITokenizer} tokenizer Input
   * @param {IOptions} options Parsing options
   * @returns
   */
  public override init(metadata: INativeMetadataCollector, tokenizer: ITokenizer, options: IOptions): ITokenParser {
    super.init(metadata, tokenizer, options);
    return this;
  }

  public async parse(): Promise<void> {
    const matroska = (await this.parseContainer(elements, this.tokenizer.fileInfo.size, [])) as any as IMatroskaDoc;

    this.metadata.setFormat("container", `EBML/${matroska.ebml.docType}`);
    if (matroska.segment) {
      const info = matroska.segment.info;
      if (info) {
        const timecodeScale = info.timecodeScale ?? 1_000_000;
        const duration = (info.duration * timecodeScale) / 1_000_000_000;
        this.addTag("segment:title", info.title);
        this.metadata.setFormat("duration", duration);
      }

      const audioTracks = matroska.segment.tracks;
      if (audioTracks?.entries) {
        for (const entry of audioTracks.entries) {
          const stream: ITrackInfo = {
            codecName: entry.codecID.replace("A_", "").replace("V_", ""),
            codecSettings: entry.codecSettings,
            flagDefault: entry.flagDefault,
            flagLacing: entry.flagLacing,
            flagEnabled: entry.flagEnabled,
            language: entry.language,
            name: entry.name,
            type: entry.trackType,
            audio: entry.audio,
            video: entry.video,
          };
          this.metadata.addStreamInfo(stream);
        }

        const audioTrack = audioTracks.entries
          .filter((entry) => {
            return entry.trackType === TrackType.audio.valueOf();
          })
          // eslint-disable-next-line unicorn/no-array-reduce
          .reduce<ITrackEntry | null>((previousValue, currentValue) => {
            if (!previousValue) {
              return currentValue;
            }
            if (!previousValue.flagDefault && currentValue.flagDefault) {
              return currentValue;
            }
            if (currentValue.trackNumber && currentValue.trackNumber < previousValue.trackNumber) {
              return currentValue;
            }
            return previousValue;
          }, null);

        if (audioTrack) {
          this.metadata.setFormat("codec", audioTrack.codecID.replace("A_", ""));
          this.metadata.setFormat("sampleRate", audioTrack.audio.samplingFrequency);
          this.metadata.setFormat("numberOfChannels", audioTrack.audio.channels);
        }

        if (matroska.segment.tags) {
          for (const tag of matroska.segment.tags.tag) {
            const target = tag.target;
            const targetType = target?.targetTypeValue
              ? TargetType[target.targetTypeValue]
              : target?.targetType ?? "track";
            for (const simpleTag of tag.simpleTags) {
              const value = simpleTag.string ?? simpleTag.binary;
              this.addTag(`${targetType}:${simpleTag.name}`, value);
            }
          }
        }

        if (matroska.segment.attachments) {
          for (const picture of matroska.segment.attachments.attachedFiles
            .filter((file) => file.mimeType.startsWith("image/"))
            .map((file) => {
              return {
                data: file.data,
                format: file.mimeType,
                description: file.description,
                name: file.name,
              };
            })) {
            this.addTag("picture", picture);
          }
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
        if (error instanceof EndOfStreamError) {
          break;
        }
        throw error;
      }
      const type = container[element.id];
      if (type) {
        debug(`Element: name=${type.name}, container=${!!type.container}`);
        if (type.container) {
          const res = await this.parseContainer(
            type.container,
            element.len >= 0 ? this.tokenizer.position + element.len : -1,
            [...path, type.name]
          );
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
            debug(`parseEbml: path=${path.join("/")}, unknown element: id=${element.id.toString(16)}`);
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
        throw new Error("VINT value exceeding maximum size");
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
    const nrLen = Math.min(6, lenField.length); // JavaScript can max read 6 bytes integer
    return {
      id: readUintBE(id, 0, id.length),
      len: readUintBE(lenField, lenField.length - nrLen, nrLen),
    };
  }

  private isMaxValue(vintData: Uint8Array) {
    if (vintData.length === this.ebmlMaxSizeLength) {
      for (let n = 1; n < this.ebmlMaxSizeLength; ++n) {
        if (vintData[n] !== 0xff) return false;
      }
      return true;
    }
    return false;
  }

  private async readFloat(e: IHeader) {
    switch (e.len) {
      case 0:
        return 0;
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
    const nrLen = Math.min(6, e.len); // JavaScript can max read 6 bytes integer
    return readUintBE(buf, e.len - nrLen, nrLen);
  }

  private async readString(e: IHeader): Promise<string> {
    const rawString = await this.tokenizer.readToken(new Utf8StringType(e.len));
    return rawString.replace(/\00.*$/g, "");
  }

  private async readBuffer(e: IHeader): Promise<Uint8Array> {
    const buf = new Uint8Array(e.len);
    await this.tokenizer.readBuffer(buf);
    return buf;
  }

  private addTag(tagId: string, value: any) {
    this.metadata.addTag("matroska", tagId, value);
  }
}
