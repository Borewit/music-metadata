"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var common = require("../src/common");
var findZero = common.default.findZero;
var t = chai_1.assert;
describe("find zero", function () {
    it("should find terminator in ascii encoded string", function () {
        var buf = new Buffer([0xFF, 0xFF, 0xFF, 0x00]);
        t.equal(findZero(buf, 0, buf.length, 'ascii'), 3);
    });
    it("find terminator in middle of ascii encoded string", function () {
        var buf = new Buffer([0xFF, 0xFF, 0x00, 0xFF, 0xFF]);
        t.equal(findZero(buf, 0, buf.length, 'ascii'), 2);
    });
    it("return offset to end if nothing is found", function () {
        var buf = new Buffer([0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
        t.equal(findZero(buf, 0, buf.length, 'ascii'), buf.length);
    });
    it("find terminator in utf16le encoded string", function () {
        var buf = new Buffer([0x68, 0x00, 0x65, 0x00, 0x6C, 0x00, 0x6C, 0x00, 0x6F, 0x00, 0x00, 0x00]);
        t.equal(findZero(buf, 0, buf.length, 'utf16'), 10);
    });
    it("find terminator in utf16be encoded string", function () {
        var buf = new Buffer([0x00, 0x68, 0x00, 0x65, 0x00, 0x6C, 0x00, 0x6C, 0x00, 0x00]);
        t.equal(findZero(buf, 0, buf.length, 'utf16'), 8);
    });
});
//# sourceMappingURL=test-findzero.js.map