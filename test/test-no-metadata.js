var path = require('path')
var fs = require('fs')
var mm = require('..')
var test = require('tape')

test("Should reject files that can't be parsed", function (t) {
  t.plan(0)

  var sample = (process.browser) ?
    new window.Blob([fs.readFileSync(__filename)])
    : fs.createReadStream(path.join(__filename))

  var filePath = __filename;

  // Run with default options
  mm.parseFile(filePath).then(function (result) {
    t.fail("Should reject a file which cannot be parsed");
  }).catch(function (err) {
    t.end();
  });

})
