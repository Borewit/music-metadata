"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var mm = require("../src");
var path = require('path');
var t = chai_1.assert;
it("should decode asf", function () {
    var filePath = path.join(__dirname, 'samples', 'asf.wma');
    function checkFormat(format) {
        t.strictEqual(format.duration, 244.885, 'format.duration');
        t.strictEqual(format.bitrate, 192639, 'format.bitrate');
    }
    function checkCommon(common) {
        t.strictEqual(common.title, "Don't Bring Me Down", 'common.title');
        t.deepEqual(common.artist, 'Electric Light Orchestra', 'common.artist');
        t.deepEqual(common.albumartist, 'Electric Light Orchestra', 'common.albumartist');
        t.strictEqual(common.album, 'Discovery', 'common.album');
        t.strictEqual(common.year, 2001, 'common.year');
        t.deepEqual(common.track, { no: 9, of: null }, 'common.track 9/0');
        t.deepEqual(common.disk, { no: null, of: null }, 'common.disk 0/0');
        t.deepEqual(common.genre, ['Rock'], 'common.genre');
    }
    function getNativeTags(native, tagId) {
        return native.filter(function (tag) { return tag.id === tagId; }).map(function (tag) { return tag.value; });
    }
    function checkNative(native) {
        t.deepEqual(getNativeTags(native, 'WM/AlbumTitle'), ['Discovery'], 'native: WM/AlbumTitle');
        t.deepEqual(getNativeTags(native, 'WM/BeatsPerMinute'), [117], 'native: WM/BeatsPerMinute');
        t.deepEqual(getNativeTags(native, 'REPLAYGAIN_TRACK_GAIN'), ['-4.7 dB'], 'native: REPLAYGAIN_TRACK_GAIN');
    }
    return mm.parseFile(filePath).then(function (result) {
        checkFormat(result.format);
        checkCommon(result.common);
        checkNative(result.native.asf);
    });
});
//# sourceMappingURL=test-asf.js.map