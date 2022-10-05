import { BasicParser } from "../common/BasicParser";
import initDebug from "../debug";
import { codecListObject } from "../parse-unit/asf/codec-list";
import { contentDescriptionObject } from "../parse-unit/asf/content-description";
import { extendedContentDescriptionObject } from "../parse-unit/asf/extended-content-description";
import { extendedStreamPropertiesObject } from "../parse-unit/asf/extended-stream-properties";
import { filePropertiesObject } from "../parse-unit/asf/file-properties";
import {
  ASF_Index_Placeholder_Object,
  CodecListObject,
  CompatibilityObject,
  ContentDescriptionObject,
  ExtendedContentDescriptionObject,
  ExtendedStreamPropertiesObject,
  FilePropertiesObject,
  HeaderExtensionObject,
  HeaderObject,
  MetadataLibraryObject,
  MetadataObject,
  PaddingObject,
  StreamBitratePropertiesObject,
  StreamPropertiesObject,
} from "../parse-unit/asf/guid";
import { headerExtensionObject } from "../parse-unit/asf/header-extension";
import { metadataObject } from "../parse-unit/asf/metadata";
import { asfObjectHeader } from "../parse-unit/asf/object-header";
import { streamPropertiesObject } from "../parse-unit/asf/stream-properties";
import { asfTopLevelHeaderObject } from "../parse-unit/asf/top-level-header";
import { readUnitFromTokenizer } from "../parse-unit/utility/read-unit";
import { ITag, TrackType } from "../type";

const debug = initDebug("music-metadata:parser:ASF");
const headerType = "asf";

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
    const header = await readUnitFromTokenizer(this.tokenizer, asfTopLevelHeaderObject);
    if (header.id !== HeaderObject) {
      throw new Error("expected asf header; but was not found; got: " + header.id);
    }
    try {
      await this.parseObjectHeader(header.numberOfHeaderObjects);
    } catch (error) {
      debug("Error while parsing ASF: %s", error);
    }
  }

  private async parseObjectHeader(numberOfObjectHeaders: number): Promise<void> {
    do {
      // Parse common header of the ASF Object (3.1)
      const { id, size } = await readUnitFromTokenizer(this.tokenizer, asfObjectHeader);

      const bodySize = size - asfObjectHeader[0];
      // Parse data part of the ASF Object
      debug("header GUID=%s", id);
      switch (id) {
        case FilePropertiesObject: {
          // 3.2
          const fpo = await readUnitFromTokenizer(this.tokenizer, filePropertiesObject(bodySize));
          this.metadata.setFormat("duration", Number(fpo.playDuration / 1000n) / 10_000 - Number(fpo.preroll) / 1000);
          this.metadata.setFormat("bitrate", fpo.maximumBitrate);
          break;
        }

        case StreamPropertiesObject: {
          // 3.3
          const spo = await readUnitFromTokenizer(this.tokenizer, streamPropertiesObject(bodySize));
          this.metadata.setFormat("container", "ASF/" + spo.streamType);
          break;
        }

        case HeaderExtensionObject: {
          // 3.4
          const extHeader = await readUnitFromTokenizer(this.tokenizer, headerExtensionObject);
          await this.parseExtensionObject(extHeader.extensionDataSize);
          break;
        }

        case ContentDescriptionObject: {
          // 3.10
          const tags = await readUnitFromTokenizer(this.tokenizer, contentDescriptionObject(bodySize));
          this.addTags(tags);
          break;
        }

        case ExtendedContentDescriptionObject: {
          // 3.11
          const tags = await readUnitFromTokenizer(this.tokenizer, extendedContentDescriptionObject(bodySize));
          this.addTags(tags);
          break;
        }

        case CodecListObject: {
          const { codecs } = await readUnitFromTokenizer(this.tokenizer, codecListObject(bodySize));
          for (const codec of codecs) {
            this.metadata.addStreamInfo({
              type: codec.videoCodec ? TrackType.video : TrackType.audio,
              codecName: codec.codecName,
            });
          }
          const audioCodecs = codecs
            .filter((codec) => codec.audioCodec)
            .map((codec) => codec.codecName)
            .join("/");
          this.metadata.setFormat("codec", audioCodecs);
          break;
        }

        case StreamBitratePropertiesObject:
          // ToDo?
          await this.tokenizer.ignore(bodySize);
          break;

        case PaddingObject:
          // ToDo: register bytes pad
          debug("Padding: %s bytes", bodySize);
          await this.tokenizer.ignore(bodySize);
          break;

        default:
          this.metadata.addWarning("Ignore ASF-Object-GUID: " + id);
          debug("Ignore ASF-Object-GUID: %s", id);
          await this.tokenizer.ignore(bodySize);
      }
    } while (--numberOfObjectHeaders);
    // done
  }

  private addTags(tags: ITag[]) {
    for (const tag of tags) {
      this.metadata.addTag(headerType, tag.id, tag.value);
    }
  }

  private async parseExtensionObject(extensionSize: number): Promise<void> {
    do {
      // Parse common header of the ASF Object (3.1)
      const { id, size } = await readUnitFromTokenizer(this.tokenizer, asfObjectHeader);

      const remaining = size - asfObjectHeader[0];
      // Parse data part of the ASF Object
      switch (id) {
        case ExtendedStreamPropertiesObject: // 4.1
          // ToDo: extended stream header properties are ignored
          await readUnitFromTokenizer(this.tokenizer, extendedStreamPropertiesObject(remaining));
          break;

        case MetadataObject:
        case MetadataLibraryObject: {
          // 4.7, 4.8
          const moTags = await readUnitFromTokenizer(this.tokenizer, metadataObject(remaining));
          this.addTags(moTags);
          break;
        }

        case PaddingObject:
          // ToDo: register bytes pad
          await this.tokenizer.ignore(remaining);
          break;

        case CompatibilityObject:
          void this.tokenizer.ignore(remaining);
          break;

        case ASF_Index_Placeholder_Object:
          await this.tokenizer.ignore(remaining);
          break;

        default:
          this.metadata.addWarning("Ignore ASF-Object-GUID: " + id);
          // console.log("Ignore ASF-Object-GUID: %s", header.objectId.str);
          await this.tokenizer.ignore(remaining);
          break;
      }
      extensionSize -= size;
    } while (extensionSize > 0);
  }
}
