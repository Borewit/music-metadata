import { assert } from 'chai';
import path from 'node:path';

import * as mm from '../lib/index.js';
import { samplePath } from './util.js';
import { parseWebStream } from '../lib/index.js';

// https://www.radiomast.io/reference-streams
const STREAM_URL = 'https://audio-edge-kef8b.ams.s.radiomast.io/ref-128k-mp3-stereo';

const radioStream = {
  https: {
    mp3: {
      _128kb: 'https://audio-edge-kef8b.ams.s.radiomast.io/ref-128k-mp3-stereo'
    },
    ogg: {
      flac: 'https://streams.radiomast.io/ref-lossless-ogg-flac-stereo',
      opus: 'https://streams.radiomast.io/ref-64k-ogg-opus-stereo'
    }
  }
};

const radioMastMp3_128kb = 'https://audio-edge-kef8b.ams.s.radiomast.io/ref-128k-mp3-stereo';
const radioMastMp3_128kb_preroll	 = 'https://audio-edge-kef8b.ams.s.radiomast.io/ref-128k-mp3-stereo-preroll';
const oggFlacStreamUrl = 'http://stream.radioparadise.com/mellow-flacm';

describe('peek radio stream', async function () {
  this.timeout(10000);

  it('should be able to peek an MP3', async () => {
    const response = await fetch(radioStream.https.mp3._128kb);
    const contentType = response.headers.get('Content-Type');
    const contentLength = response.headers.get('Content-Length');
    assert.isTrue(response.ok, 'HTTP status 200');
    const {format, common} = await parseWebStream(response.body, {
      mimeType: contentType,
      size: contentLength ? parseInt(contentLength, 10) : undefined
    });
    assert.strictEqual(format.container, '', 'format.container');
    assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
    assert.strictEqual(format.bitrate, 44100, 'format.bitrate');
  });

});