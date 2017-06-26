"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var mm = require("../src");
var t = chai_1.assert;
var path = require('path');
it("should be able to read metadata with unknown encoding", function () {
    var filename = 'bug-unkown encoding.mp3';
    var filePath = path.join(__dirname, 'samples', filename);
    return mm.parseFile(filePath).then(function (result) {
        t.strictEqual(result.common.title, '808', 'title');
        t.strictEqual(result.common.artist, 'Benga', 'artist');
        t.strictEqual(result.common.albumartist, 'Benga', 'albumartist');
        t.strictEqual(result.common.album, 'Phaze One', 'album');
        t.strictEqual(result.common.year, 2010, 'year');
        t.strictEqual(result.common.track.no, 4, 'track no');
        t.strictEqual(result.common.track.of, 8, 'track of');
        t.strictEqual(result.common.genre[0], 'Dubstep', 'genre');
        t.strictEqual(result.common.picture[0].format, 'jpg', 'picture format');
        t.strictEqual(result.common.picture[0].data.length, 6761, 'picture length');
    });
});
//# sourceMappingURL=test-unknownencoding.js.map