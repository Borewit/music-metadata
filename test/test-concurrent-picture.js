"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var mm = require("../src");
var fs = require("fs-extra");
var path = require('path');
var t = chai_1.assert;
it("should handle concurrent parsing of pictures", function () {
    var files = [path.join(__dirname, 'samples', 'flac.flac'), path.join(__dirname, 'samples', 'flac-bug.flac')];
    var promises = [];
    files.forEach(function (file) {
        promises.push(mm.parseFile(file).then(function (result) {
            return fs.readFile(file + '.jpg').then(function (data) {
                t.deepEqual(result.common.picture[0].data, data, 'check picture');
            });
        }));
    });
    return Promise.all(promises);
});
//# sourceMappingURL=test-concurrent-picture.js.map