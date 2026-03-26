import initDebug from 'debug';
import { EndOfStreamError } from 'strtok3';

import { type ITag, TrackType } from '../type.js';
import AsfGuid from './AsfGuid.js';
import * as AsfObject from './AsfObject.js';
import { BasicParser } from '../common/BasicParser.js';
import { AsfContentParseError } from './AsfObject.js';

const debug = initDebug('music-metadata:parser:ASF');
const headerType = 'asf';
const maxAsfMetadataObjectSize = 16 * 1024 * 1024;

/**
 * Windows Media Metadata Usage Guidelines
 * - Ref: https://msdn.microsoft.com/en-us/library/ms867702.aspx
 *
 * Ref:
 * - https://tools.ietf.org/html/draft-fleischman-asf-01
 * - https://hwiegman.home.xs4all.nl/fileformats/asf/ASF_Specification.pdf
 * - http://drang.s4.xrea.com/program/tips/id3tag/wmp/index.html
 * - https://msdn.microsoft.com/en-us/library/windows/desktop/ee663575(v=vs.85).aspx
 */
export class AsfParser extends BasicParser {

  public async parse() {
    const header = await this.tokenizer.readToken<AsfObject.IAsfTopLevelObjectHeader>(AsfObject.TopLevelHeaderObjectToken);
    if (!header.objectId.equals(AsfGuid.HeaderObject)) {
      throw new AsfContentParseError(`expected asf header; but was not found; got: ${header.objectId.str}`);
    }
    if (header.numberOfHeaderObjects < 1 || header.numberOfHeaderObjects > 10000) {
      throw new AsfContentParseError(
        `Unrealistic number of ASF header objects: ${header.numberOfHeaderObjects}`
      );
    }
    await this.parseObjectHeaders(
      header.numberOfHeaderObjects,
      header.objectSize - AsfObject.TopLevelHeaderObjectToken.len
    );
  }

  private async parseObjectHeaders(numberOfObjectHeaders: number, remainingHeaderSize: number): Promise<void> {
    let tags: ITag[];
    for (let index = 0; index < numberOfObjectHeaders; ++index) {
      const { header, payloadSize } = await this.readObjectHeader(remainingHeaderSize, 'header');
      // Parse data part of the ASF Object
      debug('header GUID=%s', header.objectId.str);
      switch (header.objectId.str) {

        case AsfObject.FilePropertiesObject.guid.str: { // 3.2
          this.validateAllocationSize(payloadSize, 'File Properties Object');
          const fpo = await this.tokenizer.readToken<AsfObject.IFilePropertiesObject>(new AsfObject.FilePropertiesObject(header));
          this.metadata.setFormat('duration',  Number(fpo.playDuration / BigInt(1000)) / 10000 - Number(fpo.preroll) / 1000);
          this.metadata.setFormat('bitrate', fpo.maximumBitrate);
          break;
        }

        case AsfObject.StreamPropertiesObject.guid.str: { // 3.3
          this.validateAllocationSize(payloadSize, 'Stream Properties Object');
          const spo = await this.tokenizer.readToken<AsfObject.IStreamPropertiesObject>(new AsfObject.StreamPropertiesObject(header));
          this.metadata.setFormat('container', `ASF/${spo.streamType}`);
          break;
        }

        case AsfObject.HeaderExtensionObject.guid.str: { // 3.4
          const extensionHeaderToken = new AsfObject.HeaderExtensionObject();
          if (payloadSize < extensionHeaderToken.len) {
            throw new AsfContentParseError(
              `ASF Header Extension Object payload is too small: ${payloadSize} bytes`
            );
          }
          const extHeader = await this.tokenizer.readToken<AsfObject.IHeaderExtensionObject>(extensionHeaderToken);
          const expectedExtensionSize = payloadSize - extensionHeaderToken.len;
          if (extHeader.extensionDataSize !== expectedExtensionSize) {
            throw new AsfContentParseError(
              `ASF extension data size ${extHeader.extensionDataSize} does not match enclosing payload size ${expectedExtensionSize}`
            );
          }
          await this.parseExtensionObject(extHeader.extensionDataSize);
          break;
        }

        case AsfObject.ContentDescriptionObjectState.guid.str: // 3.10
          this.validateAllocationSize(payloadSize, 'Content Description Object');
          tags = await this.tokenizer.readToken<ITag[]>(new AsfObject.ContentDescriptionObjectState(header));
          await this.addTags(tags);
          break;

        case AsfObject.ExtendedContentDescriptionObjectState.guid.str: // 3.11
          this.validateAllocationSize(payloadSize, 'Extended Content Description Object');
          tags = await this.tokenizer.readToken<ITag[]>(new AsfObject.ExtendedContentDescriptionObjectState(header));
          await this.addTags(tags);
          break;

        case AsfGuid.CodecListObject.str: {
          this.validateAllocationSize(payloadSize, 'Codec List Object');
          let codecs: AsfObject.ICodecEntry[];
          try {
            codecs = await AsfObject.readCodecEntries(this.tokenizer, payloadSize);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new AsfContentParseError(`Invalid ASF Codec List Object: ${message}`);
          }
          codecs.forEach(codec => {
            this.metadata.addStreamInfo({
              type: codec.type.videoCodec ? TrackType.video : TrackType.audio,
              codecName: codec.codecName
            });
          });
          const audioCodecs = codecs.filter(codec => codec.type.audioCodec).map(codec => codec.codecName).join('/');
          this.metadata.setFormat('codec', audioCodecs);
          break;
        }

        case AsfGuid.StreamBitratePropertiesObject.str:
          // ToDo?
          await this.ignorePayload(payloadSize, 'Stream Bitrate Properties Object');
          break;

        case AsfGuid.PaddingObject.str:
          // ToDo: register bytes pad
          debug('Padding: %s bytes', payloadSize);
          await this.ignorePayload(payloadSize, 'Padding Object');
          break;

        default:
          this.metadata.addWarning(`Ignore ASF-Object-GUID: ${header.objectId.str}`);
          debug('Ignore ASF-Object-GUID: %s', header.objectId.str);
          await this.ignorePayload(payloadSize, `object ${header.objectId.str}`);
      }
      remainingHeaderSize -= header.objectSize;
    }
    if (remainingHeaderSize !== 0) {
      throw new AsfContentParseError(
        `ASF header child objects leave ${remainingHeaderSize} payload byte(s) unaccounted`
      );
    }
  }

  private async addTags(tags: ITag[]): Promise<void> {
    await Promise.all(tags.map(({ id, value }) => this.metadata.addTag(headerType, id, value)));
  }

  private async readObjectHeader(remainingSize: number, containerType: 'header' | 'extension'): Promise<{
    header: AsfObject.IAsfObjectHeader;
    payloadSize: number;
  }> {
    if (remainingSize < AsfObject.HeaderObjectToken.len) {
      throw new AsfContentParseError(
        `Insufficient ASF ${containerType} data for an object header: ${remainingSize} bytes`
      );
    }
    const header = await this.tokenizer.readToken<AsfObject.IAsfObjectHeader>(AsfObject.HeaderObjectToken);
    if (header.objectSize > remainingSize) {
      throw new AsfContentParseError(
        `ASF ${containerType} object size ${header.objectSize} exceeds remaining ${containerType} payload size ${remainingSize}`
      );
    }
    return {
      header,
      payloadSize: this.validatePayloadAvailability(header, `${containerType} object`)
    };
  }

  private validatePayloadAvailability(header: AsfObject.IAsfObjectHeader, objectType: string): number {
    const payloadSize = header.objectSize - AsfObject.HeaderObjectToken.len;
    const fileSize = this.tokenizer.fileInfo.size;
    if (fileSize !== undefined) {
      const available = fileSize - this.tokenizer.position;
      if (payloadSize > available) {
        throw new AsfContentParseError(
          `ASF ${objectType} payload size ${payloadSize} exceeds available input size ${available}`
        );
      }
    }
    return payloadSize;
  }

  private validateAllocationSize(payloadSize: number, objectType: string): void {
    if (payloadSize > maxAsfMetadataObjectSize) {
      throw new AsfContentParseError(
        `ASF ${objectType} payload size ${payloadSize} exceeds allocation limit ${maxAsfMetadataObjectSize}`
      );
    }
  }

  private async ignorePayload(payloadSize: number, objectType: string): Promise<void> {
    let ignored: number;
    try {
      ignored = await this.tokenizer.ignore(payloadSize);
    } catch (error) {
      if (error instanceof EndOfStreamError) {
        throw new AsfContentParseError(`Unexpected end of ASF ${objectType}`);
      }
      throw error;
    }
    if (ignored !== payloadSize) {
      throw new AsfContentParseError(
        `Unexpected end of ASF ${objectType}; missing ${payloadSize - ignored} bytes`
      );
    }
  }

  private async parseExtensionObject(extensionSize: number): Promise<void> {
    while (extensionSize > 0) {
      const { header, payloadSize } = await this.readObjectHeader(extensionSize, 'extension');
      // Parse data part of the ASF Object
      switch (header.objectId.str) {

        case AsfObject.ExtendedStreamPropertiesObjectState.guid.str: // 4.1
          // ToDo: extended stream header properties are ignored
          this.validateAllocationSize(payloadSize, 'Extended Stream Properties Object');
          await this.tokenizer.readToken<AsfObject.IExtendedStreamPropertiesObject>(new AsfObject.ExtendedStreamPropertiesObjectState(header));
          break;

        case AsfObject.MetadataObjectState.guid.str: { // 4.7
          this.validateAllocationSize(payloadSize, 'Metadata Object');
          const moTags = await this.tokenizer.readToken<ITag[]>(new AsfObject.MetadataObjectState(header));
          await this.addTags(moTags);
          break;
        }

        case AsfObject.MetadataLibraryObjectState.guid.str: { // 4.8
          this.validateAllocationSize(payloadSize, 'Metadata Library Object');
          const mlTags = await this.tokenizer.readToken<ITag[]>(new AsfObject.MetadataLibraryObjectState(header));
          await this.addTags(mlTags);
          break;
        }

        case AsfGuid.PaddingObject.str:
          // ToDo: register bytes pad
          await this.ignorePayload(payloadSize, 'extension Padding Object');
          break;

        case AsfGuid.CompatibilityObject.str:
          await this.ignorePayload(payloadSize, 'Compatibility Object');
          break;

        case AsfGuid.ASF_Index_Placeholder_Object.str:
          await this.ignorePayload(payloadSize, 'Index Placeholder Object');
          break;

        default:
          this.metadata.addWarning(`Ignore ASF-Object-GUID: ${header.objectId.str}`);
          // console.log("Ignore ASF-Object-GUID: %s", header.objectId.str);
          await this.ignorePayload(payloadSize, `extension object ${header.objectId.str}`);
          break;
      }
      extensionSize -= header.objectSize;
    }
  }
}
