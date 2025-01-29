import { createReadStream } from 'node:fs';
import { textDecode } from '@borewit/text-codec';
import { assert } from 'chai';
import { FourCcToken } from '../lib/common/FourCC.js';
import * as util from '../lib/common/Util.js';
import { dbToRatio, ratioToDb, toRatio } from '../lib/common/Util.js';

import { closeReadStream } from './util.js';

const t = assert;

describe('shared utility functionality', () => {
  it('awaits file stream closure before EOF and tolerates repeated cleanup', async () => {
    const stream = createReadStream(new URL('./samples/mp4/BabysSongbook_librivox.m4b', import.meta.url));
    await closeReadStream(stream);
    assert.isTrue(stream.closed);
    assert.isFalse(stream.readableEnded);
    await closeReadStream(stream);
  });

  it('waits for close without reporting a cleanup-time stream error', async () => {
    const stream = createReadStream(new URL('./samples/does-not-exist', import.meta.url));
    await closeReadStream(stream);
    assert.isTrue(stream.closed);
  });

  describe('splitText', () => {
    it('counts nonempty values and preserves the context with multi-character separators', () => {
      const reservations: [number, string][] = [];
      const values = util.splitText('||First||||Second||', '||', 'credits', (count, context) => {
        reservations.push([count, context]);
      });
      assert.deepEqual(values, ['First', 'Second']);
      assert.deepEqual(reservations, [[2, 'credits']]);
    });

    for (const text of ['', '||', '||First||||Second||']) {
      it(`preserves and counts every segment in ${JSON.stringify(text)}`, () => {
        const expected = text.split('||');
        const reservations: [number, string][] = [];
        const values = util.splitText(
          text,
          '||',
          'credits',
          (count, context) => {
            reservations.push([count, context]);
          },
          { keepEmpty: true }
        );
        assert.deepEqual(values, expected);
        assert.deepEqual(reservations, [[expected.length, 'credits']]);
      });
    }

    for (const text of ['', '||||']) {
      it(`reserves one empty result for ${JSON.stringify(text)} by default`, () => {
        const reservations: number[] = [];
        const values = util.splitText(text, '||', 'credits', count => reservations.push(count));
        assert.deepEqual(values, ['']);
        assert.deepEqual(reservations, [1]);
      });
    }

    it('rejects an empty separator instead of looping indefinitely', () => {
      assert.throws(() => util.splitText('value', '', 'test', () => undefined), RangeError);
    });
  });

  describe('find zero', () => {
    const findZero = util.findZero;

    it('should find terminator in ascii encoded string', () => {
      const buf = Uint8Array.from([0xff, 0xff, 0xff, 0x00]);
      t.equal(findZero(buf, 'ascii'), 3);
    });

    it('find terminator in middle of ascii encoded string', () => {
      const buf = Uint8Array.from([0xff, 0xff, 0x00, 0xff, 0xff]);
      t.equal(findZero(buf, 'ascii'), 2);
    });

    it('return offset to end if nothing is found', () => {
      const buf = Uint8Array.from([0xff, 0xff, 0xff, 0xff, 0xff]);
      t.equal(findZero(buf, 'ascii'), buf.length);
    });

    it('find terminator in utf16le encoded string', () => {
      const buf = Uint8Array.from([0x68, 0x00, 0x65, 0x00, 0x6c, 0x00, 0x6c, 0x00, 0x6f, 0x00, 0x00, 0x00]);
      t.equal(findZero(buf, 'utf-16le'), 10);
    });

    it('find terminator in utf16be encoded string', () => {
      const buf = Uint8Array.from([0x00, 0x68, 0x00, 0x65, 0x00, 0x6c, 0x00, 0x6c, 0x00, 0x00]);
      t.equal(findZero(buf, 'utf-16le'), 8);
    });
  });

  describe('getBitAllignedNumber', () => {
    it('reads every field contained in one byte', () => {
      const buf = new Uint8Array(2);
      for (let value = 0; value < 256; ++value) {
        buf[1] = value;
        const bits = value.toString(2).padStart(8, '0');
        for (let offset = 0; offset < 8; ++offset) {
          for (let length = 1; length <= 8 - offset; ++length) {
            const expected = Number.parseInt(bits.slice(offset, offset + length), 2);
            t.strictEqual(util.getBitAllignedNumber(buf, 1, offset, length), expected);
          }
        }
      }
    });

    it('reads fields across bytes and normalizes bit offsets beyond the first byte', () => {
      const buf = Uint8Array.from([0xff, 0xca, 0x75, 0x39, 0xe0, 0xab, 0xcd, 0x12, 0x34]);
      const bits = Array.from(buf, value => value.toString(2).padStart(8, '0')).join('');
      for (const byteOffset of [0, 1]) {
        for (const bitOffset of [0, 3, 7, 8, 15, 28]) {
          for (const length of [1, 7, 8, 9, 11, 16, 20, 24, 32]) {
            const start = byteOffset * 8 + bitOffset;
            const expected = Number.parseInt(bits.slice(start, start + length), 2) | 0;
            t.strictEqual(util.getBitAllignedNumber(buf, byteOffset, bitOffset, length), expected);
          }
        }
      }
    });
  });

  describe('stripNulls', () => {
    it('should strip nulls', () => {
      const tests = [
        {
          str: 'foo',
          expected: 'foo'
        },
        {
          str: 'derp\x00\x00',
          expected: 'derp'
        },
        {
          str: '\x00\x00harkaaa\x00',
          expected: 'harkaaa'
        },
        {
          str: '\x00joystick',
          expected: 'joystick'
        }
      ];
      tests.forEach(test => {
        t.strictEqual(util.stripNulls(test.str), test.expected);
      });
    });
  });

  describe('FourCC token', () => {
    it('should be able to encode FourCC token', () => {
      const buffer = new Uint8Array(4);
      FourCcToken.put(buffer, 0, 'abcd');
      t.deepEqual(textDecode(buffer, 'latin1'), 'abcd');
    });
  });

  it('a2hex', () => {
    t.equal(util.a2hex('\x00\x01ABC\x02'), '00 01 41 42 43 02');
  });

  describe('ReplayGain ratio conversions', () => {
    it('Convert ratio to dB', () => {
      assert.approximately(ratioToDb(0.99914551), -0.00371259, 0.000000005);
    });

    it('Convert dB to ratio', () => {
      assert.approximately(dbToRatio(-7.03), 0.1981527, 0.000000005);
    });

    it('Convert dB string value to IRatio', () => {
      assert.deepEqual(toRatio('-7.03 dB'), {
        dB: -7.03,
        ratio: 0.1981527025805098
      });
      assert.deepEqual(toRatio('xxx'), { dB: Number.NaN, ratio: Number.NaN });
    });
  });
});
