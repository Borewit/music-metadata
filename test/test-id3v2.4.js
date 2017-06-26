"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var mm = require("../src");
var path = require('path');
var t = chai_1.assert;
it("should decode id3v2.4", function () {
    var filename = 'id3v2.4.mp3';
    var filePath = path.join(__dirname, 'samples', filename);
    return mm.parseFile(filePath, { duration: true }).then(function (result) {
        t.strictEqual(result.format.headerType, 'id3v2.4', 'format.headerType');
        t.strictEqual(result.format.duration, 1, 'format.format.duration');
        t.strictEqual(result.format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
        t.strictEqual(result.format.bitrate, 128000, 'format.bitrate = 128 kbit/sec');
        t.strictEqual(result.format.codecProfile, 'CBR', 'format.codecProfile = CBR');
        t.strictEqual(result.format.encoder, 'LAME3.98r', 'format.encoder = LAME3.98r');
        t.strictEqual(result.format.numberOfChannels, 2, 'format.numberOfChannels = 2');
        t.strictEqual(result.common.title, 'Home', 'title');
        t.strictEqual(result.common.artist, undefined, 'common.artist');
        t.deepEqual(result.common.artists, ['Explo', 'ions', 'nodejsftws'], 'common.artists');
        t.strictEqual(result.common.albumartist, 'Soundtrack', 'albumartist');
        t.strictEqual(result.common.album, 'Friday Night Lights [Original Movie Soundtrack]', 'album');
        t.strictEqual(result.common.year, 2004, 'year');
        t.deepEqual(result.common.track, { no: 5, of: null }, 'common.track');
        t.deepEqual(result.common.disk, { no: 1, of: 1 }, 'common.disk');
        t.deepEqual(result.common.genre, ['Soundtrack', 'OST'], 'common.genres');
        t.strictEqual(result.common.picture[0].format, 'jpg', 'common.picture 0 format');
        t.strictEqual(result.common.picture[0].data.length, 80938, 'common.picture 0 length');
        t.strictEqual(result.common.picture[1].format, 'jpg', 'common.picture 1 format');
        t.strictEqual(result.common.picture[1].data.length, 80938, 'common.picture 1 length');
    });
});
//# sourceMappingURL=test-id3v2.4.js.map