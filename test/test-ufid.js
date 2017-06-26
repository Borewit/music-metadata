"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var mm = require("../src");
var path = require('path');
var t = chai_1.assert;
it("id3v2.4", function () {
    var filename = '29 - Dominator.mp3';
    var filePath = path.join(__dirname, 'samples', filename);
    function mapNativeTags(nativeTags) {
        var tags = {};
        nativeTags.forEach(function (tag) {
            (tags[tag.id] = (tags[tag.id] || [])).push(tag.value);
        });
        return tags;
    }
    return mm.parseFile(filePath).then(function (result) {
        var nativeTags = mapNativeTags(result.native["id3v2.3"]);
        t.equal(nativeTags.UFID.length, 1);
        t.deepEqual(nativeTags.UFID[0], {
            'owner_identifier': 'http://musicbrainz.org',
            'identifier': new Buffer([0x33, 0x66, 0x32, 0x33, 0x66, 0x32, 0x63, 0x66, 0x2d,
                0x32, 0x61, 0x34, 0x36, 0x2d, 0x34, 0x38, 0x65, 0x63, 0x2d, 0x38, 0x36, 0x33,
                0x65, 0x2d, 0x36, 0x65, 0x63, 0x34, 0x33, 0x31, 0x62, 0x35, 0x66, 0x65, 0x63,
                0x61])
        }, 'UFID');
    });
});
//# sourceMappingURL=test-ufid.js.map