"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var mm = require("../src");
var path = require('path');
var t = chai_1.assert;
it("zero bytes", function () {
    var filename = 'zerobytes';
    var filePath = path.join(__dirname, 'samples', filename);
    return mm.parseFile(filePath).then(function (result) {
        throw new Error("should throw an exception");
    }).catch(function (err) {
        t.equal(err.message, 'Extension  not supported.');
    });
});
//# sourceMappingURL=test-zerobytes.js.map