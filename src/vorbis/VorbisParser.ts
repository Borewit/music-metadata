'use strict';
import * as Vorbis from './Vorbis';
import {ITokenParser} from "../ParserFactory";
import * as strtok3 from "strtok3";
import {IFormat, INativeAudioMetadata, IOptions, ITag} from "../index";
import {Promise} from "es6-promise";
import {endOfStream} from "then-read-stream";
import * as Token from "token-types";

/**
 * Vorbis 1 Parser.
 * Used by OggParser
 */
export class VorbisParser implements ITokenParser {

  private format: IFormat = {};
  private tags: ITag[] = [];

  private tokenizer: strtok3.ITokenizer;
  private options: IOptions;

  public parse(tokenizer: strtok3.ITokenizer, options: IOptions): Promise<INativeAudioMetadata> {

    this.tokenizer = tokenizer;
    this.options = options;

    return this.parseHeaderPacket().then(() => {
      return {
        format: this.format,
        native: {
          vorbis: this.tags
        }
      };
    });
  }

  /**
   * Vorbis 1 parser
   * @param pageLength
   * @returns {Promise<void>}
   */
  private parseHeaderPacket(): Promise<void> {

    return this.tokenizer.readToken<Vorbis.ICommonHeader>(Vorbis.CommonHeader).then(header => {
      if (header.vorbis !== 'vorbis')
        throw new Error('Metadata does not look like Vorbis');

      return this.parsePacket(header.packetType).then(res => {
        if (!res.done) {
          return this.parseHeaderPacket();
        }
      });
    }).catch(err => {
      if (err.message === endOfStream) {
        return;
      } else
        throw err;
    });
  }

  private parsePacket(packetType: number): Promise<{ len: number, done: boolean }> {
    switch (packetType) {

      case 1: //  type 1: the identification header
        return this.parseVorbisInfo().then(len => {
          return {len, done: false};
        });

      case 3: //  type 3: comment header
        return this.parseUserCommentList().then(len => {
          return {len, done: true};
        });

      case 5: // type 5: setup header type
        throw new Error("'setup header type' not implemented");
    }
  }

  private parseVorbisInfo(): Promise<number> {
    return this.tokenizer.readToken<Vorbis.IFormatInfo>(Vorbis.IdentificationHeader).then(vi => {
      this.format.sampleRate = vi.sampleRate;
      this.format.bitrate = vi.bitrateNominal;
      this.format.numberOfChannels = vi.channelMode;
      return Vorbis.IdentificationHeader.len;
    });
  }

  /**
   * Ref: https://xiph.org/vorbis/doc/Vorbis_I_spec.html#x1-840005.2
   * @returns {Promise<number>}
   */
  private parseUserCommentList(): Promise<number> {

    return this.tokenizer.readToken<number>(Token.UINT32_LE).then(strLen => {
      return this.tokenizer.readToken<string>(new Token.StringType(strLen, 'utf-8')).then((vendorString: string) => {
        return this.tokenizer.readToken<number>(Token.UINT32_LE).then(userCommentListLength => {
          return this.parseUserComment(userCommentListLength).then(len => {
            return 2 * Token.UINT32_LE.len + strLen + len;
          });
        });
      });
    });
  }

  private parseUserComment(userCommentListLength: number): Promise<number> {
    return this.tokenizer.readToken<number>(Token.UINT32_LE).then(strLen => {
      return this.tokenizer.readToken<string>(new Token.StringType(strLen, 'utf-8')).then(v => {
        const idx = v.indexOf('=');
        const key = v.slice(0, idx).toUpperCase();
        let value: any = v.slice(idx + 1);

        if (key === 'METADATA_BLOCK_PICTURE') {
          value = this.options.skipCovers ? null : Vorbis.VorbisPictureToken.fromBase64(value);
        }

        if (value !== null)
          this.tags.push({id: key, value});

        const len = Token.UINT32_LE.len + strLen;
        if (--userCommentListLength > 0) {
          // if we don't want to read the duration
          // then tell the parent stream to stop
          // stop = !readDuration;
          return this.parseUserComment(userCommentListLength).then(recLen => {
            return len + recLen;
          });
        }
        return strLen;
      });
    });
  }
}
