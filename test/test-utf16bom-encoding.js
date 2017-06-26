"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var mm = require("../src");
var path = require('path');
var t = chai_1.assert;
it("should read utf16bom encoded metadata correctly", function () {
    var filename = 'bug-utf16bom-encoding.mp3';
    var filePath = path.join(__dirname, 'samples', filename);
    return mm.parseFile(filePath).then(function (result) {
        t.equal(result.common.title, "It's All Over You Know", 'title');
        t.equal(result.common.artist, 'The Apers', 'artist');
        t.deepEqual(result.common.artists, ['The Apers'], 'artist');
        t.equal(result.common.albumartist, 'The Apers', 'albumartist');
        t.equal(result.common.album, 'Reanimate My Heart', 'album');
        t.equal(result.common.year, 2007, 'year');
        t.deepEqual(result.common.track, { no: 1, of: null }, 'track');
        t.deepEqual(result.common.genre, ['Punk Rock'], 'genre');
    });
});
//# sourceMappingURL=test-utf16bom-encoding.js.map