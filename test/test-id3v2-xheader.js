"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var mm = require("../src");
var path = require('path');
var t = chai_1.assert;
it("should be able to read id3v2 files with extended headers", function () {
    var filename = 'id3v2-xheader.mp3';
    var filePath = path.join(__dirname, 'samples', filename);
    return mm.parseFile(filePath, { duration: true }).then(function (result) {
        t.strictEqual(result.format.duration, 0.4969375, 'format.duration');
        t.strictEqual(result.common.title, 'title', 'common.title');
        t.deepEqual(result.common.track, { no: null, of: null }, 'common.track');
        t.deepEqual(result.common.disk, { no: null, of: null }, 'common.disk');
    });
});
//# sourceMappingURL=test-id3v2-xheader.js.map