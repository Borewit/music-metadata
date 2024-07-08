import initDebug from 'debug';

import { ITag, TrackType } from '../type.js';
import GUID from './GUID.js';
import * as AsfObject from './AsfObject.js';
import { BasicParser } from '../common/BasicParser.js';

const debug = initDebug('music-metadata:parser:ASF');
const headerType = 'asf';

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
    if (!header.objectId.equals(GUID.HeaderObject)) {
      throw new Error('expected asf header; but was not found; got: ' + header.objectId.str);
    }
    try {
      await this.parseObjectHeader(header.numberOfHeaderObjects);
    } catch (err) {
      debug('Error while parsing ASF: %s', err);
    }
  }

  private async parseObjectHeader(numberOfObjectHeaders: number): Promise<void> {

    let tags: ITag[];
    do {
      // Parse common header of the ASF Object (3.1)
      const header = await this.tokenizer.readToken<AsfObject.IAsfObjectHeader>(AsfObject.HeaderObjectToken);
      // Parse data part of the ASF Object
      debug('header GUID=%s', header.objectId.str);
      switch (header.objectId.str) {

        case AsfObject.FilePropertiesObject.guid.str: // 3.2
          const fpo = await this.tokenizer.readToken<AsfObject.IFilePropertiesObject>(new AsfObject.FilePropertiesObject(header));
          this.metadata.setFormat('duration',  Number(fpo.playDuration / BigInt(1000)) / 10000 - Number(fpo.preroll) / 1000);
          this.metadata.setFormat('bitrate', fpo.maximumBitrate);
          break;

        case AsfObject.StreamPropertiesObject.guid.str: // 3.3
          const spo = await this.tokenizer.readToken<AsfObject.IStreamPropertiesObject>(new AsfObject.StreamPropertiesObject(header));
          this.metadata.setFormat('container', 'ASF/' + spo.streamType);
          break;

        case AsfObject.HeaderExtensionObject.guid.str: // 3.4
          const extHeader = await this.tokenizer.readToken<AsfObject.IHeaderExtensionObject>(new AsfObject.HeaderExtensionObject());
          await this.parseExtensionObject(extHeader.extensionDataSize);
          break;

        case AsfObject.ContentDescriptionObjectState.guid.str: // 3.10
          tags = await this.tokenizer.readToken<ITag[]>(new AsfObject.ContentDescriptionObjectState(header));
          await this.addTags(tags);
          break;

        case AsfObject.ExtendedContentDescriptionObjectState.guid.str: // 3.11
          tags = await this.tokenizer.readToken<ITag[]>(new AsfObject.ExtendedContentDescriptionObjectState(header));
          await this.addTags(tags);
          break;

        case GUID.CodecListObject.str:
          const codecs = await AsfObject.readCodecEntries(this.tokenizer);
          codecs.forEach(codec => {
            this.metadata.addStreamInfo({
              type: codec.type.videoCodec ? TrackType.video : TrackType.audio,
              codecName: codec.codecName
            });
          });
          const audioCodecs = codecs.filter(codec => codec.type.audioCodec).map(codec => codec.codecName).join('/');
          this.metadata.setFormat('codec', audioCodecs);
          break;

        case GUID.StreamBitratePropertiesObject.str:
          // ToDo?
          await this.tokenizer.ignore(header.objectSize - AsfObject.HeaderObjectToken.len);
          break;

        case GUID.PaddingObject.str:
          // ToDo: register bytes pad
          debug('Padding: %s bytes', header.objectSize - AsfObject.HeaderObjectToken.len);
          await this.tokenizer.ignore(header.objectSize - AsfObject.HeaderObjectToken.len);
          break;

        default:
          this.metadata.addWarning('Ignore ASF-Object-GUID: ' + header.objectId.str);
          debug('Ignore ASF-Object-GUID: %s', header.objectId.str);
          await this.tokenizer.readToken<void>(new AsfObject.IgnoreObjectState(header));
      }
    } while (--numberOfObjectHeaders);
    // done
  }

  private async addTags(tags: ITag[]): Promise<void> {
    await Promise.all(tags.map(({ id, value }) => this.metadata.addTag(headerType, id, value)));
  }

  private async parseExtensionObject(extensionSize: number): Promise<void> {

    do {
      // Parse common header of the ASF Object (3.1)
      const header = await this.tokenizer.readToken<AsfObject.IAsfObjectHeader>(AsfObject.HeaderObjectToken);
      const remaining = header.objectSize - AsfObject.HeaderObjectToken.len;
      // Parse data part of the ASF Object
      switch (header.objectId.str) {

        case AsfObject.ExtendedStreamPropertiesObjectState.guid.str: // 4.1
          // ToDo: extended stream header properties are ignored
          await this.tokenizer.readToken<AsfObject.IExtendedStreamPropertiesObject>(new AsfObject.ExtendedStreamPropertiesObjectState(header));
          break;

        case AsfObject.MetadataObjectState.guid.str: // 4.7
          const moTags = await this.tokenizer.readToken<ITag[]>(new AsfObject.MetadataObjectState(header));
          await this.addTags(moTags);
          break;

        case AsfObject.MetadataLibraryObjectState.guid.str: // 4.8
          const mlTags = await this.tokenizer.readToken<ITag[]>(new AsfObject.MetadataLibraryObjectState(header));
          await this.addTags(mlTags);
          break;

        case GUID.PaddingObject.str:
          // ToDo: register bytes pad
          await this.tokenizer.ignore(remaining);
          break;

        case GUID.CompatibilityObject.str:
          this.tokenizer.ignore(remaining);
          break;

        case GUID.ASF_Index_Placeholder_Object.str:
          await this.tokenizer.ignore(remaining);
          break;

        default:
          this.metadata.addWarning('Ignore ASF-Object-GUID: ' + header.objectId.str);
          // console.log("Ignore ASF-Object-GUID: %s", header.objectId.str);
          await this.tokenizer.readToken<void>(new AsfObject.IgnoreObjectState(header));
          break;
      }
      extensionSize -= header.objectSize;
    } while (extensionSize > 0);
  }
}
