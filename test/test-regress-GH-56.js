"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var mm = require("../src");
var fs = require("fs-extra");
var path = require('path');
var t = chai_1.assert;
it("should calculate duration for a VBR encoded MP3", function () {
    var filename = 'regress-GH-56.mp3';
    var filePath = path.join(__dirname, 'samples', filename);
    var stream = fs.createReadStream(filePath);
    return mm.parseStream(stream, 'audio/mpeg', { duration: true }).then(function (result) {
        t.strictEqual(result.format.duration, 373.329375, 'format.duration');
        stream.close();
    });
});
//# sourceMappingURL=test-regress-GH-56.js.map