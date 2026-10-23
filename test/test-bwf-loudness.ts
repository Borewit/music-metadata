import { rejects } from 'node:assert/strict';
import { Readable } from 'node:stream';
import { assert } from 'chai';
import { parseBuffer, parseStream } from '../lib/index.js';
import { UnexpectedFileContentError } from '../lib/ParseError.js';
import { BroadcastAudioExtensionChunk } from '../lib/wav/BwfChunk.js';

function chunk(id: string, data: Buffer): Buffer {
  const header = Buffer.alloc(8);
  header.write(id);
  header.writeUInt32LE(data.length, 4);
  return Buffer.concat([header, data, Buffer.alloc(data.length & 1)]);
}

function wave(bext: Buffer): Buffer {
  return chunk(
    'RIFF',
    Buffer.concat([
      Buffer.from('WAVE'),
      chunk('bext', bext),
      chunk('LIST', Buffer.concat([Buffer.from('INFO'), chunk('INAM', Buffer.from('Following title\0'))]))
    ])
  );
}

const fields = [
  'loudnessValue',
  'loudnessRange',
  'maxTruePeakLevel',
  'maxMomentaryLoudness',
  'maxShortTermLoudness'
] as const;

function header(version = 2, values = [-2300, 700, -100, -1800, -2000], length = 602): Buffer {
  const data = Buffer.alloc(length);
  data.writeUInt16LE(version, 346);
  if (length >= 422) {
    for (const [index, value] of values.entries()) {
      data.writeInt16LE(value, 412 + index * 2);
    }
  }
  return data;
}

describe('BWF loudness', () => {
  for (const streamed of [false, true]) {
    it(`decodes all five signed values and preserves the next chunk (stream=${streamed})`, async () => {
      const data = wave(header());
      const metadata = streamed
        ? await parseStream(Readable.from([data], { objectMode: false }), 'audio/wav')
        : await parseBuffer(data, 'audio/wav');
      const tags = Object.fromEntries(metadata.native.exif.map(tag => [tag.id, tag.value]));
      assert.deepEqual(
        fields.map(field => tags[`bext.${field}`]),
        [-2300, 700, -100, -1800, -2000]
      );
      assert.equal(metadata.common.title, 'Following title');
      assert.isUndefined(metadata.common.replaygain_track_gain);
    });
  }

  for (const version of [0, 1]) {
    it(`does not interpret reserved version ${version} bytes as loudness`, () => {
      const data = header(version);
      const result = new BroadcastAudioExtensionChunk(data.length).get(data, 0);
      for (const field of fields) {
        assert.notProperty(result, field);
      }
    });
    it(`accepts a short historical version ${version} base header`, async () => {
      const metadata = await parseBuffer(wave(header(version, [], 348)), 'audio/wav');
      assert.equal(metadata.common.title, 'Following title');
    });
  }

  for (const value of [32767, -32768, -10000, 10000]) {
    it(`omits out-of-range or unused loudness value ${value}`, () => {
      const data = header(2, new Array(5).fill(value));
      const result = new BroadcastAudioExtensionChunk(data.length).get(data, 0);
      for (const field of fields) {
        assert.notProperty(result, field);
      }
    });
  }

  it('checks range independently and keeps valid boundary values', () => {
    const data = header(2, [-9999, -1, 9999, 0, -1]);
    const result = new BroadcastAudioExtensionChunk(data.length).get(data, 0);
    assert.equal(result.loudnessValue, -9999);
    assert.notProperty(result, 'loudnessRange');
    assert.equal(result.maxTruePeakLevel, 9999);
    assert.equal(result.maxMomentaryLoudness, 0);
    assert.equal(result.maxShortTermLoudness, -1);
  });

  it('respects nonzero input and view offsets', () => {
    const data = Buffer.concat([Buffer.alloc(7), header(), Buffer.alloc(10)]).subarray(3);
    const result = new BroadcastAudioExtensionChunk(602).get(data, 4);
    assert.equal(result.loudnessRange, 700);
    assert.equal(result.maxShortTermLoudness, -2000);
  });

  for (const length of [0, 347, 348, 412, 420, 421]) {
    it(`rejects a ${length}-byte v2 header without consuming the next chunk`, async () => {
      const data = length >= 348 ? header(2, [], length) : Buffer.alloc(length);
      await rejects(parseBuffer(wave(data), 'audio/wav'), UnexpectedFileContentError);
    });
  }
});
