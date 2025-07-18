import { assert } from 'chai';

import * as util from '../lib/common/Util.js';
import { FourCcToken } from '../lib/common/FourCC.js';

const t = assert;

describe('shared utility functionality', () => {

  describe('find zero', () => {

    const findZero = util.findZero;

    it('should find terminator in ascii encoded string', () => {
      const buf = Uint8Array.from([0xFF, 0xFF, 0xFF, 0x00]);
      t.equal(findZero(buf, 0, buf.length, 'ascii'), 3);
    });

    it('find terminator in middle of ascii encoded string', () => {
      const buf = Uint8Array.from([0xFF, 0xFF, 0x00, 0xFF, 0xFF]);
      t.equal(findZero(buf, 0, buf.length, 'ascii'), 2);
    });

    it('return offset to end if nothing is found', () => {
      const buf = Uint8Array.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
      t.equal(findZero(buf, 0, buf.length, 'ascii'), buf.length);
    });

    it('find terminator in utf16le encoded string', () => {
      const buf = Uint8Array.from([0x68, 0x00, 0x65, 0x00, 0x6C, 0x00, 0x6C, 0x00, 0x6F, 0x00, 0x00, 0x00]);
      t.equal(findZero(buf, 0, buf.length, 'utf-16le'), 10);
    });

    it('find terminator in utf16be encoded string', () => {
      const buf = Uint8Array.from([0x00, 0x68, 0x00, 0x65, 0x00, 0x6C, 0x00, 0x6C, 0x00, 0x00]);
      t.equal(findZero(buf, 0, buf.length, 'utf-16le'), 8);
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
      t.deepEqual(new TextDecoder('latin1').decode(buffer), 'abcd');
    });

  });

  it('a2hex', () => {
    t.equal(util.a2hex('\x00\x01ABC\x02'), '00 01 41 42 43 02');
  });

});
