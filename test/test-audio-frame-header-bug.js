"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var mm = require("../src");
var path = require('path');
var t = chai_1.assert;
it("should handle audio-frame-header-bug", function () {
    var filePath = path.join(__dirname, 'samples', 'audio-frame-header-bug.mp3');
    return mm.parseFile(filePath, { duration: true }).then(function (result) {
        t.strictEqual(result.format.duration, 200.59591666666665);
    });
});
//# sourceMappingURL=test-audio-frame-header-bug.js.map