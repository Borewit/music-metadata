import {} from "mocha";
import {assert} from 'chai';
import * as common from '../lib/common';

const findZero = common.default.findZero;

const t = assert;

describe("find zero", () => {

  it("should find terminator in ascii encoded string", () => {
    const buf = new Buffer([0xFF, 0xFF, 0xFF, 0x00]);
    t.equal(findZero(buf, 0, buf.length, 'ascii'), 3);
  });

  it("find terminator in middle of ascii encoded string", () => {
    const buf = new Buffer([0xFF, 0xFF, 0x00, 0xFF, 0xFF]);
    t.equal(findZero(buf, 0, buf.length, 'ascii'), 2);
  });

  it("return offset to end if nothing is found", () => {
    const buf = new Buffer([0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
    t.equal(findZero(buf, 0, buf.length, 'ascii'), buf.length);
  });

  it("find terminator in utf16le encoded string", () => {
    const buf = new Buffer([0x68, 0x00, 0x65, 0x00, 0x6C, 0x00, 0x6C, 0x00, 0x6F, 0x00, 0x00, 0x00]);
    t.equal(findZero(buf, 0, buf.length, 'utf16'), 10);
  });

  it("find terminator in utf16be encoded string", () => {
    const buf = new Buffer([0x00, 0x68, 0x00, 0x65, 0x00, 0x6C, 0x00, 0x6C, 0x00, 0x00]);
    t.equal(findZero(buf, 0, buf.length, 'utf16'), 8);
  });

});
