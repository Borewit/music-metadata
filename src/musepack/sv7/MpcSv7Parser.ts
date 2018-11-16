'use strict';

import * as initDebug from 'debug';
import * as assert from 'assert';

import { BasicParser } from '../../common/BasicParser';
import * as SV7 from './StreamVersion7';
import { APEv2Parser } from '../../apev2/APEv2Parser';
import { BitReader } from './BitReader';

const debug = initDebug('music-metadata:parser:musepack');

export class MpcSv7Parser extends BasicParser {

  private bitreader: BitReader;
  private audioLength: number = 0;
  private duration: number;

  public parse(): Promise<void> {

    return this.tokenizer.readToken(SV7.Header)
      .then(header => {
        assert.equal(header.signature, 'MP+', 'Magic number');
        debug(`stream-version=${header.streamMajorVersion}.${header.streamMinorVersion}`);
        this.metadata.setFormat('dataformat', 'Musepack, SV7');
        this.metadata.setFormat('sampleRate', header.sampleFrequency);
        const numberOfSamples = 1152 * (header.frameCount - 1) + header.lastFrameLength;
        this.metadata.setFormat('numberOfSamples', numberOfSamples);
        this.duration = numberOfSamples / header.sampleFrequency;
        this.metadata.setFormat('duration', this.duration);
        this.bitreader = new BitReader(this.tokenizer);
        this.metadata.setFormat('numberOfChannels', header.midSideStereo || header.intensityStereo ? 2 : 1);
        return this.bitreader.read(8).then(version => {
          this.metadata.setFormat('encoder', (version / 100).toFixed(2));
          return this.skipAudioData(header.frameCount);
        });
      }).then(() => {
        debug(`End of audio stream, switching to APEv2, offset=${this.tokenizer.position}`);

        if (this.tokenizer.fileSize) {
          const remaining = this.tokenizer.fileSize - this.tokenizer.position;
          const buffer = Buffer.alloc(remaining);
          return this.tokenizer.readBuffer(buffer).then(size => {

            return APEv2Parser.parseTagFooter(this.metadata, buffer, !this.options.skipCovers);
          });
        }
      });
  }

  private skipAudioData(frameCount): Promise<void> {
    if (frameCount > 0) {
      return this.bitreader.read(20).then(frameLength => {
        this.audioLength += 20 + frameLength;
        return this.bitreader.ignore(frameLength);
      }).then(() => this.skipAudioData(--frameCount));
    } else {
      // last frame
      return this.bitreader.read(11).then(lastFrameLength => {
        this.audioLength += lastFrameLength;
        this.metadata.setFormat('bitrate', this.audioLength / this.duration);
      });
    }
  }
}
