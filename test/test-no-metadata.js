"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var mm = require("../src");
var path = require('path');
var t = chai_1.assert;
it("should reject files that can't be parsed", function () {
    var filePath = path.join(__dirname, 'samples', __filename);
    // Run with default options
    return mm.parseFile(filePath).then(function (result) {
        throw new Error("Should reject a file which cannot be parsed");
    }).catch(function (err) {
        return;
    });
});
//# sourceMappingURL=test-no-metadata.js.map