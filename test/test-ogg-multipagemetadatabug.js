"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var mm = require("../src");
var path = require('path');
var t = chai_1.assert;
it("ogg-multipage-metadata-bug", function () {
    var filename = 'ogg-multipagemetadata-bug.ogg';
    var filePath = path.join(__dirname, 'samples', filename);
    return mm.parseFile(filePath).then(function (result) {
        t.strictEqual(result.common.title, 'Modestep - To The Stars (Break the Noize & The Autobots Remix)', 'title');
        t.strictEqual(result.common.artist, 'Break The Noize & The Autobots', 'artist');
        t.strictEqual(result.common.albumartist, 'Modestep', 'albumartist');
        t.strictEqual(result.common.album, 'To The Stars', 'album');
        t.strictEqual(result.common.date, '2011-01-01', 'year');
        t.strictEqual(result.common.track.no, 2, 'track no');
        t.strictEqual(result.common.track.of, 5, 'track of');
        t.strictEqual(result.common.disk.no, 1, 'disk no');
        t.strictEqual(result.common.disk.of, 1, 'disk of');
        t.strictEqual(result.common.genre[0], 'Dubstep', 'genre');
        t.strictEqual(result.common.picture[0].format, 'jpg', 'picture format');
        t.strictEqual(result.common.picture[0].data.length, 207439, 'picture length');
        t.end();
    });
});
//# sourceMappingURL=test-ogg-multipagemetadatabug.js.map