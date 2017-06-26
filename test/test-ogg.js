"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var mm = require("../src");
var path = require('path');
it("should decode ogg audio-file", function () {
    var filename = 'oggy.ogg';
    var filePath = path.join(__dirname, 'samples', filename);
    function checkFormat(format) {
        chai_1.assert.strictEqual(format.headerType, 'vorbis', 'format.headerType');
        chai_1.assert.strictEqual(format.duration, 97391.54861678004, 'format.duration = ~97391 sec'); // ToDO: check this
        chai_1.assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
        chai_1.assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels = 2 (stereo)');
        chai_1.assert.strictEqual(format.bitrate, 64000, 'bitrate = 64 kbit/sec');
    }
    function checkCommon(common) {
        chai_1.assert.strictEqual(common.title, 'In Bloom', 'common.title');
        chai_1.assert.strictEqual(common.artist, 'Nirvana', 'common.artist');
        chai_1.assert.strictEqual(common.albumartist, 'Nirvana', 'common.albumartist');
        chai_1.assert.strictEqual(common.album, 'Nevermind', 'common.album');
        chai_1.assert.strictEqual(common.year, 1991, 'common.year');
        chai_1.assert.deepEqual(common.track, { no: 1, of: 12 }, 'common.track');
        chai_1.assert.deepEqual(common.disk, { no: 1, of: null }, 'common.disk');
        chai_1.assert.deepEqual(common.genre, ['Grunge', 'Alternative'], 'genre');
        chai_1.assert.strictEqual(common.picture[0].format, 'jpg', 'picture format');
        chai_1.assert.strictEqual(common.picture[0].data.length, 30966, 'picture length');
    }
    function checkVorbisTags(vorbis) {
        chai_1.assert.deepEqual(vorbis.TRACKNUMBER, ['1'], 'vorbis.TRACKNUMBER');
        chai_1.assert.deepEqual(vorbis.TRACKTOTAL, ['12'], 'vorbis.TRACKTOTAL');
        chai_1.assert.deepEqual(vorbis.ALBUM, ['Nevermind'], 'vorbis.ALBUM');
        chai_1.assert.deepEqual(vorbis.COMMENT, ["Nirvana's Greatest Album", 'And their greatest song'], 'vorbis.COMMENT');
        chai_1.assert.deepEqual(vorbis.GENRE, ['Grunge', 'Alternative'], 'vorbis.GENRE');
        chai_1.assert.deepEqual(vorbis.TITLE, ['In Bloom'], 'vorbis.TITLE');
        var cover = vorbis.METADATA_BLOCK_PICTURE[0];
        chai_1.assert.strictEqual(cover.format, 'image/jpeg', 'vorbis.METADATA_BLOCK_PICTURE format');
        chai_1.assert.strictEqual(cover.type, 'Cover (back)', 'vorbis.METADATA_BLOCK_PICTURE headerType');
        chai_1.assert.strictEqual(cover.description, 'little willy', 'raw METADATA_BLOCK_PICTURE description');
        // test exact contents too
        chai_1.assert.strictEqual(cover.data.length, 30966, 'vorbis.METADATA_BLOCK_PICTURE length');
        chai_1.assert.strictEqual(cover.data[0], 255, 'vorbis.METADATA_BLOCK_PICTURE data 0');
        chai_1.assert.strictEqual(cover.data[1], 216, 'vorbis.METADATA_BLOCK_PICTURE data 1');
        chai_1.assert.strictEqual(cover.data[cover.data.length - 1], 217, 'vorbis.METADATA_BLOCK_PICTURE data -1');
        chai_1.assert.strictEqual(cover.data[cover.data.length - 2], 255, 'vorbis.METADATA_BLOCK_PICTURE data -2');
    }
    function mapNativeTags(nativeTags) {
        var tags = {};
        nativeTags.forEach(function (tag) {
            (tags[tag.id] = (tags[tag.id] || [])).push(tag.value);
        });
        return tags;
    }
    return mm.parseFile(filePath).then(function (result) {
        checkFormat(result.format);
        checkCommon(result.common);
        checkVorbisTags(mapNativeTags(result.native.vorbis));
    });
});
//# sourceMappingURL=test-ogg.js.map