import { assert } from 'chai';
import * as mm from '../lib/index.js';

/**
 * Build a minimal AIFF holding a single text chunk.
 */
function buildAiff(chunkId: string, text: Uint8Array): Uint8Array {
  const comm = new Uint8Array([
    0x00, 0x01, // numChannels
    0x00, 0x00, 0x00, 0x10, // numSampleFrames
    0x00, 0x08, // sampleSize
    0x40, 0x0e, 0xac, 0x44, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 // 44100 Hz
  ]);
  const ssnd = new Uint8Array(8 + 16);
  const chunks: [string, Uint8Array][] = [['COMM', comm], [chunkId, text], ['SSND', ssnd]];
  const body: number[] = [];
  for (const [id, data] of chunks) {
    for (const c of id) body.push(c.charCodeAt(0));
    body.push((data.length >>> 24) & 0xff, (data.length >>> 16) & 0xff, (data.length >>> 8) & 0xff, data.length & 0xff);
    body.push(...data);
    if (data.length % 2 === 1) body.push(0);
  }
  const out: number[] = [];
  for (const c of 'FORM') out.push(c.charCodeAt(0));
  const formSize = 4 + body.length;
  out.push((formSize >>> 24) & 0xff, (formSize >>> 16) & 0xff, (formSize >>> 8) & 0xff, formSize & 0xff);
  for (const c of 'AIFF') out.push(c.charCodeAt(0));
  out.push(...body);
  return new Uint8Array(out);
}

describe('AIFF text chunk decoding', () => {

  it('should decode an ISO-8859-1 NAME chunk without dropping the 8th bit', async () => {
    // "Mötley" encoded as ISO-8859-1: 0xf6 is U+00F6 LATIN SMALL LETTER O WITH DIAERESIS
    const name = new Uint8Array([0x4d, 0xf6, 0x74, 0x6c, 0x65, 0x79]);
    const { common } = await mm.parseBuffer(buildAiff('NAME', name), { mimeType: 'audio/aiff' });
    assert.strictEqual(common.title, 'Mötley');
  });

});
