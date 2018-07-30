'use strict';

import {INativeAudioMetadata, ITag, IFormat, IOptions} from "../index";
import {ITokenizer} from "strtok3";
import {ITokenParser} from "../ParserFactory";
import GUID from "./GUID";
import * as AsfObject from "./AsfObject";
import {Promise} from "es6-promise";
import * as _debug from "debug";
import {IMetadataCollector} from "../common/MetadataCollector";
import {BasicParser} from "../common/BasicParser";

const debug = _debug("music-metadata:parser:ASF");

const headerType = 'asf';


/**
 * Windows Media Metadata Usage Guidelines
 *   Ref: https://msdn.microsoft.com/en-us/library/ms867702.aspx
 *
 * Ref:
 *   https://tools.ietf.org/html/draft-fleischman-asf-01
 *   https://hwiegman.home.xs4all.nl/fileformats/asf/ASF_Specification.pdf
 *   http://drang.s4.xrea.com/program/tips/id3tag/wmp/index.html
 *   https://msdn.microsoft.com/en-us/library/windows/desktop/ee663575(v=vs.85).aspx
 */
export class AsfParser extends BasicParser {

  public parse(): Promise<void> {
    return this.tokenizer.readToken<AsfObject.IAsfTopLevelObjectHeader>(AsfObject.TopLevelHeaderObjectToken).then(header => {
      if (!header.objectId.equals(GUID.HeaderObject)) {
        throw new Error('expected asf header; but was not found; got: ' + header.objectId.str);
      }
      return this.parseObjectHeader(header.numberOfHeaderObjects).catch(err => {
          debug("Error while parsing ASF: %s", err);
        });

    });
  }

  private parseObjectHeader(numberOfObjectHeaders: number): Promise<INativeAudioMetadata> {
    // Parse common header of the ASF Object (3.1)
    return this.tokenizer.readToken<AsfObject.IAsfObjectHeader>(AsfObject.HeaderObjectToken).then(header => {
      // Parse data part of the ASF Object
      debug("header GUID=%s", header.objectId.str);
      switch (header.objectId.str) {

        case AsfObject.FilePropertiesObject.guid.str: // 3.2
          return this.tokenizer.readToken<AsfObject.IFilePropertiesObject>(new AsfObject.FilePropertiesObject(header)).then(fpo => {
            this.metadata.setFormat('duration', fpo.playDuration / 10000000);
            this.metadata.setFormat('bitrate' , fpo.maximumBitrate);
          });

        case AsfObject.StreamPropertiesObject.guid.str: // 3.3
          return this.tokenizer.readToken<AsfObject.IStreamPropertiesObject>(new AsfObject.StreamPropertiesObject(header)).then(spo => {
            this.metadata.setFormat('dataformat', 'ASF/' + spo.streamType);
          });

        case AsfObject.HeaderExtensionObject.guid.str: // 3.4
          return this.tokenizer.readToken<AsfObject.IHeaderExtensionObject>(new AsfObject.HeaderExtensionObject()).then(extHeader => {
            return this.parseExtensionObject(extHeader.extensionDataSize);
          });

        case AsfObject.ContentDescriptionObjectState.guid.str: // 3.10
          return this.tokenizer.readToken<ITag[]>(new AsfObject.ContentDescriptionObjectState(header)).then(tags => {
            this.addTags(tags);
          });

        case AsfObject.ExtendedContentDescriptionObjectState.guid.str: // 3.11
          return this.tokenizer.readToken<ITag[]>(new AsfObject.ExtendedContentDescriptionObjectState(header)).then(tags => {
            this.addTags(tags);
            return header.objectSize;
          });

        case GUID.CodecListObject.str:
          // ToDo?
          return this.tokenizer.ignore(header.objectSize - AsfObject.HeaderObjectToken.len);

        case GUID.StreamBitratePropertiesObject.str:
          // ToDo?
          return this.tokenizer.ignore(header.objectSize - AsfObject.HeaderObjectToken.len);

        case GUID.PaddingObject.str:
          // ToDo: register bytes pad
          debug("Padding: %s bytes", header.objectSize - AsfObject.HeaderObjectToken.len);
          return this.tokenizer.ignore(header.objectSize - AsfObject.HeaderObjectToken.len);

        default:
          this.warnings.push("Ignore ASF-Object-GUID: " + header.objectId.str);
          debug("Ignore ASF-Object-GUID: %s", header.objectId.str);
          return this.tokenizer.readToken<void>(new AsfObject.IgnoreObjectState(header));
      }
    }).then(() => {
      --numberOfObjectHeaders;
      if (numberOfObjectHeaders > 0) {
        return this.parseObjectHeader(numberOfObjectHeaders);
      }
      // done
    });
  }



  private addTags(tags: ITag[]) {
    tags.forEach(tag => {
      this.metadata.addTag(headerType, tag.id, tag.value);
    });
  }

  private parseExtensionObject(extensionSize: number): Promise<number> {
    // Parse common header of the ASF Object (3.1)
    return this.tokenizer.readToken<AsfObject.IAsfObjectHeader>(AsfObject.HeaderObjectToken).then(header => {
      // Parse data part of the ASF Object
      switch (header.objectId.str) {

        case AsfObject.ExtendedStreamPropertiesObjectState.guid.str: // 4.1
          return this.tokenizer.readToken<AsfObject.IExtendedStreamPropertiesObject>(new AsfObject.ExtendedStreamPropertiesObjectState(header)).then(cd => {
            return header.objectSize;
          });

        case AsfObject.MetadataObjectState.guid.str: // 4.7
          return this.tokenizer.readToken<ITag[]>(new AsfObject.MetadataObjectState(header)).then(tags => {
            this.addTags(tags);
            return header.objectSize;
          });

        case AsfObject.MetadataLibraryObjectState.guid.str: // 4.8
          return this.tokenizer.readToken<ITag[]>(new AsfObject.MetadataLibraryObjectState(header)).then(tags => {
            this.addTags(tags);
            return header.objectSize;
          });

        case GUID.PaddingObject.str:
          // ToDo: register bytes pad
          return this.tokenizer.ignore(header.objectSize - AsfObject.HeaderObjectToken.len).then(() => header.objectSize);

        case GUID.CompatibilityObject.str:
          return this.tokenizer.ignore(header.objectSize - AsfObject.HeaderObjectToken.len).then(() => header.objectSize);

        case GUID.ASF_Index_Placeholder_Object.str:
          return this.tokenizer.ignore(header.objectSize - AsfObject.HeaderObjectToken.len).then(() => header.objectSize);

        default:
          this.warnings.push("Ignore ASF-Object-GUID: " + header.objectId.str);
          // console.log("Ignore ASF-Object-GUID: %s", header.objectId.str);
          return this.tokenizer.readToken<void>(new AsfObject.IgnoreObjectState(header));
      }
    }).then(objectSize => {
      extensionSize -= objectSize;
      if (extensionSize > 0) {
        return this.parseExtensionObject(extensionSize);
      } else {
        // done
        return 0;
      }
    });
  }
}
