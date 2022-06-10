import initDebug from "debug";

import { BasicParser } from "../../common/BasicParser";
import { APEv2Parser } from "../../apev2/APEv2Parser";

import { BitReader } from "./BitReader";
import * as SV7 from "./StreamVersion7";

const debug = initDebug("music-metadata:parser:musepack");

export class MpcSv7Parser extends BasicParser {
  private bitreader: BitReader;
  private audioLength: number = 0;
  private duration: number;

  public async parse(): Promise<void> {
    const header = await this.tokenizer.readToken<SV7.IHeader>(SV7.Header);

    if (header.signature !== "MP+") throw new Error("Unexpected magic number");
    debug(
      `stream-version=${header.streamMajorVersion}.${header.streamMinorVersion}`
    );
    this.metadata.setFormat("container", "Musepack, SV7");
    this.metadata.setFormat("sampleRate", header.sampleFrequency);
    const numberOfSamples =
      1152 * (header.frameCount - 1) + header.lastFrameLength;
    this.metadata.setFormat("numberOfSamples", numberOfSamples);
    this.duration = numberOfSamples / header.sampleFrequency;
    this.metadata.setFormat("duration", this.duration);
    this.bitreader = new BitReader(this.tokenizer);
    this.metadata.setFormat(
      "numberOfChannels",
      header.midSideStereo || header.intensityStereo ? 2 : 1
    );
    const version = await this.bitreader.read(8);
    this.metadata.setFormat("codec", (version / 100).toFixed(2));
    await this.skipAudioData(header.frameCount);
    debug(
      `End of audio stream, switching to APEv2, offset=${this.tokenizer.position}`
    );
    return APEv2Parser.tryParseApeHeader(
      this.metadata,
      this.tokenizer,
      this.options
    );
  }

  private async skipAudioData(frameCount): Promise<void> {
    while (frameCount-- > 0) {
      const frameLength = await this.bitreader.read(20);
      this.audioLength += 20 + frameLength;
      await this.bitreader.ignore(frameLength);
    }
    // last frame
    const lastFrameLength = await this.bitreader.read(11);
    this.audioLength += lastFrameLength;
    this.metadata.setFormat("bitrate", this.audioLength / this.duration);
  }
}
