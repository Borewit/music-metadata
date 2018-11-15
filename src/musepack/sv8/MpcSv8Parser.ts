'use strict';

import * as initDebug from 'debug';
import * as assert from 'assert';

import { BasicParser } from '../../common/BasicParser';
import * as SV8 from './StreamVersion8';
import { APEv2Parser } from '../../apev2/APEv2Parser';
import { FourCcToken } from '../../common/FourCC';

const debug = initDebug('music-metadata:parser:musepack');

export class MpcSv8Parser extends BasicParser {

  private audioLength: number = 0;

  public parse(): Promise<void> {

    return this.tokenizer.readToken(FourCcToken)
      .then(signature => {
        assert.equal(signature, 'MPCK', 'Magic number');
        this.metadata.setFormat('dataformat', 'Musepack, SV8');
        return this.parsePacket();
      });
  }

  private parsePacket(): Promise<void> {

    const sv8reader = new SV8.StreamReader(this.tokenizer);

    return sv8reader.readPacketHeader()
      .then(header => {
        debug(`packet-header key=${header.key}, payloadLength=${header.payloadLength}`);
        switch (header.key) {
          case 'SH': // Stream Header
            return sv8reader.readStreamHeader(header.payloadLength).then(sh => {
              this.metadata.setFormat('numberOfSamples', sh.sampleCount);
              this.metadata.setFormat('sampleRate', sh.sampleFrequency);
              this.metadata.setFormat('duration', sh.sampleCount / sh.sampleFrequency);
              this.metadata.setFormat('numberOfChannels', sh.channelCount);
              return this.parsePacket();
            });

          case 'AP': // Audio Packet
            this.audioLength += header.payloadLength;
            break;

          case 'RG': // Replaygain
          case 'EI': // Encoder Info
          case 'SO': // Seek Table Offset
          case 'ST': // Seek Table
          case 'CT': // Chapter-Tag
            break;

          case 'SE': // Stream End
            this.metadata.setFormat('bitrate', this.audioLength * 8 / this.metadata.format.duration);
            return APEv2Parser.parseTagHeader(this.metadata, this.tokenizer, this.options);

          default:
            throw new Error(`Unexpected header: ${header.key}`);
        }
        return this.tokenizer.ignore(header.payloadLength).then(() => this.parsePacket());
      });
  }

}
