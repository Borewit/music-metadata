"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var mm = require("../src");
var path = require('path');
var t = chai_1.assert;
it("should decode non-ascii-characters", function () {
    var filename = 'bug-non ascii chars.mp3';
    var filePath = path.join(__dirname, 'samples', filename);
    return mm.parseFile(filePath).then(function (result) {
        t.deepEqual(result.common.artist, undefined, 'common.artist');
        t.deepEqual(result.common.artists, ['Janelle Monáe', 'Roman Gianarthur', 'Nate Wonder', 'Roman Gianarthur'], 'common.artists');
    });
});
//# sourceMappingURL=test-nonasciichars.js.map