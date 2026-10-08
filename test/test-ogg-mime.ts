import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { assert } from 'chai';
import { fromBuffer } from 'strtok3';
import * as mm from '../lib/index.js';
import { ParserFactory } from '../lib/ParserFactory.js';
import { samplePath } from './util.js';

const fixture = path.join(samplePath, 'ogg', 'ogg-vorbis-skeleton-v3.ogg');

describe('application/ogg parser selection', () => {
  for (const mime of ['application/ogg', 'application/ogg; codecs=vorbis']) {
    it(`selects the Ogg parser for ${mime}`, () => {
      assert.strictEqual(new ParserFactory().findLoaderForContentType(mime)?.parserType, 'ogg');
    });
  }

  it('includes application/ogg in supported MIME types', () => {
    assert.include(mm.getSupportedMimeTypes(), 'application/ogg');
  });

  for (const mime of [undefined, 'application/ogg']) {
    for (const streamInput of [false, true]) {
      it(`parses Skeleton in a ${streamInput ? 'stream' : 'buffer'} ${mime ? 'with a MIME hint' : 'by content'}`, async () => {
        const data = await readFile(fixture);
        const { format } = streamInput
          ? await mm.parseStream(Readable.from([data], { objectMode: false }), mime)
          : await mm.parseBuffer(data, mime);
        assert.strictEqual(format.container, 'Ogg');
        assert.strictEqual(format.codec, 'Vorbis I');
        assert.strictEqual(format.sampleRate, 8000);
        assert.strictEqual(format.numberOfChannels, 1);
      });
    }
  }

  it('parses Skeleton from an unhinted tokenizer', async () => {
    const { format } = await mm.parseFromTokenizer(fromBuffer(await readFile(fixture)));
    assert.strictEqual(format.container, 'Ogg');
    assert.strictEqual(format.codec, 'Vorbis I');
    assert.strictEqual(format.sampleRate, 8000);
    assert.strictEqual(format.numberOfChannels, 1);
  });
});
