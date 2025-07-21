import { assert } from 'chai';

import { type IAudioMetadata, parseWebStream } from '../lib/index.js';

const isBun = typeof globalThis.Bun !== 'undefined';

const radioStream = {
  https: {
    mp3: {
      _128kb: 'https://audio-edge-kef8b.ams.s.radiomast.io/ref-128k-mp3-stereo'
    },
    ogg: {
      flac: 'https://streams.radiomast.io/ref-lossless-ogg-flac-stereo',
      opus: 'https://streams.radiomast.io/ref-64k-ogg-opus-stereo',
      vorbis: 'https://streams.radiomast.io/ref-64k-ogg-vorbis-stereo'
    },
    aac_lc: 'https://streams.radiomast.io/ref-128k-aaclc-stereo-preroll'
  }
};

describe('peek radio streams', async function () {
  this.timeout(10000);

  async function fetchRadioStream(url: string): Promise<IAudioMetadata> {
    const response = await fetch(url);
    const contentType = response.headers.get('Content-Type');
    const contentLength = response.headers.get('Content-Length');
    assert.isTrue(response.ok, 'HTTP status 200');
    return parseWebStream(response.body, {
      mimeType: contentType,
      size: contentLength ? Number.parseInt(contentLength, 10) : undefined
    });
  }

  it('should be able to peek an MP3', async function (){
    if (isBun) this.skip(); // Hangs in Bun

    const {format} = await fetchRadioStream(radioStream.https.mp3._128kb);
    assert.strictEqual(format.container, 'MPEG', 'format.container');
    assert.strictEqual(format.codec, 'MPEG 1 Layer 3', 'format.container');
    assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
    assert.strictEqual(format.bitrate, 128000, 'format.bitrate');
  });

  it('should be able to peek an Ogg/FLAC', async function () {
    if (isBun) this.skip(); // Hangs in Bun

    const {format} = await fetchRadioStream(radioStream.https.ogg.flac);
    assert.strictEqual(format.container, 'Ogg', 'format.container');
    assert.strictEqual(format.codec, 'FLAC', 'format.container');
    assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
  });

  it('should be able to peek an Ogg/Opus', async function () {
    if (isBun) this.skip(); // Hangs in Bun

    const {format} = await fetchRadioStream(radioStream.https.ogg.opus);
    assert.strictEqual(format.container, 'Ogg', 'format.container');
    assert.strictEqual(format.codec, 'Opus', 'format.container');
    assert.strictEqual(format.sampleRate, 48000, 'format.sampleRate');
  });

  it('should be able to peek an Ogg/Vorbis', async function () {
    if (isBun) this.skip(); // Hangs in Bun

    const {format} = await fetchRadioStream(radioStream.https.ogg.vorbis);
    assert.strictEqual(format.container, 'Ogg', 'format.container');
    assert.strictEqual(format.codec, 'Vorbis I', 'format.container');
    assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
  });

  it('should be able to peek an ADTS/AAC', async function () {
    if (isBun) this.skip(); // Hangs in Bun

    const {format} = await fetchRadioStream(radioStream.https.aac_lc);
    assert.strictEqual(format.container, 'ADTS/MPEG-4', 'format.container');
    assert.strictEqual(format.codec, 'AAC', 'format.container');
    assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
  });

});