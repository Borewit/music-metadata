'use strict';

import ReadableStream = NodeJS.ReadableStream;
import {INativeAudioMetadata, ITag, IFormat, IOptions} from "../index";
import {ITokenizer} from "strtok3";
import {ITokenParser} from "../ParserFactory";
import GUID from "./GUID";
import * as AsfObject from "./AsfObject";

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
export class AsfParser implements ITokenParser {

  public static headerType = 'asf';

  public static getInstance(): AsfParser {
    return new AsfParser();
  }

  /**
   * Print GUID in format like "B503BF5F-2EA9-CF11-8EE3-00C00C205365"
   * @param objectId Binary GUID
   * @returns {string} GUID as dashed hexadecimal representation
   */
  private static guidToString(objectId: Buffer): string {
    return objectId.slice(0, 4).toString('hex').toUpperCase() + "-"
      + objectId.slice(4, 6).toString('hex').toUpperCase() + "-"
      + objectId.slice(6, 8).toString('hex').toUpperCase() + "-"
      + objectId.slice(8, 10).toString('hex').toUpperCase() + "-"
      + objectId.slice(10, 16).toString('hex').toUpperCase();
  }

  private tokenizer: ITokenizer;

  private numberOfObjectHeaders: number;

  private tags: ITag[] = [];

  private warnings: string[] = []; // ToDo: make these part of the parsing result

  private format: IFormat = {
    headerType: "asf"
  };

  public parse(tokenizer: ITokenizer, options: IOptions): Promise<INativeAudioMetadata> {

    this.tokenizer = tokenizer;

    return this.paresTopLevelHeaderObject();
  }

  private paresTopLevelHeaderObject(): Promise<INativeAudioMetadata> {
    return this.tokenizer.readToken<AsfObject.IAsfTopLevelObjectHeader>(AsfObject.TopLevelHeaderObjectToken).then((header) => {
      if (!header.objectId.equals(GUID.HeaderObject)) {
        throw new Error('expected asf header; but was not found; got: ' + header.objectId.str);
      }
      this.numberOfObjectHeaders = header.numberOfHeaderObjects;
      return this.parseObjectHeader();
    });
  }

  private parseObjectHeader(): Promise<INativeAudioMetadata> {
    // Parse common header of the ASF Object (3.1)
    return this.tokenizer.readToken<AsfObject.IAsfObjectHeader>(AsfObject.HeaderObjectToken).then((header) => {
      // Parse data part of the ASF Object
      switch (header.objectId.str) {

        case AsfObject.FilePropertiesObject.guid.str: // 3.2
          return this.tokenizer.readToken<AsfObject.IFilePropertiesObject>(new AsfObject.FilePropertiesObject(header)).then((fpo) => {
            this.format.duration = fpo.playDuration / 10000000;
            this.format.bitrate = fpo.maximumBitrate;
          });

        case AsfObject.StreamPropertiesObject.guid.str: // 3.3
          return this.tokenizer.readToken<AsfObject.IStreamPropertiesObject>(new AsfObject.StreamPropertiesObject(header)).then(() => {
            return null; // ToDo
          });

        case AsfObject.HeaderExtensionObject.guid.str: // 3.4
          return this.tokenizer.readToken<AsfObject.IHeaderExtensionObject>(new AsfObject.HeaderExtensionObject(header)).then(() => {
            return this.parseObjectHeader();
          });

        case AsfObject.ContentDescriptionObjectState.guid.str: // 3.10
          return this.tokenizer.readToken<ITag[]>(new AsfObject.ContentDescriptionObjectState(header)).then((tags) => {
            this.tags = this.tags.concat(tags);
          });

        case AsfObject.ExtendedContentDescriptionObjectState.guid.str: // 3.11
          return this.tokenizer.readToken<ITag[]>(new AsfObject.ExtendedContentDescriptionObjectState(header)).then((tags) => {
            this.tags = this.tags.concat(tags);
          });

        case AsfObject.ExtendedStreamPropertiesObjectState.guid.str: // 4.1
          return this.tokenizer.readToken<AsfObject.IExtendedStreamPropertiesObject>(new AsfObject.ExtendedStreamPropertiesObjectState(header)).then((cd) => {
            return null;
          });

        case AsfObject.MetadataObjectState.guid.str: // 4.7
          return this.tokenizer.readToken<ITag[]>(new AsfObject.MetadataObjectState(header)).then((tags) => {
            this.tags = this.tags.concat(tags);
          });

        case AsfObject.MetadataLibraryObjectState.guid.str: // 4.8
          return this.tokenizer.readToken<ITag[]>(new AsfObject.MetadataLibraryObjectState(header)).then((tags) => {
            this.tags = this.tags.concat(tags);
          });

        case GUID.PaddingObject.str:
          // ToDo: register bytes pad
          return this.tokenizer.ignore(header.objectSize - AsfObject.HeaderObjectToken.len);

        default:
          this.warnings.push("Ignore ASF-Object-GUID: " + header.objectId.str);
          // console.log("Ignore ASF-Object-GUID: %s", header.objectId.str);
          return this.tokenizer.readToken<void>(new AsfObject.IgnoreObjectState(header));
      }
    }).then(() => {
      if (--this.numberOfObjectHeaders > 0) {
        return this.parseObjectHeader();
      } else {
        // done
        return {
          format: this.format,
          native: {
            asf: this.tags
          }
        };
      }
    });
  }
}
