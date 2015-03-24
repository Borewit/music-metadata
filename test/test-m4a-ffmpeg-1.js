var path = require('path')
var fs = require('fs')
var mm = require('..')
var test = require('prova')

test('error handling', function (t) {
  t.plan(1)

  var sample = (process.browser) ?
    new window.Blob([fs.readFileSync(__dirname + '/samples/Simpsons01x01.m4a')])
    : fs.createReadStream(path.join(__dirname, '/samples/Simpsons01x01.m4a'))

  mm(sample, function (err) {
    t.error(err)
    t.end()
  })
})
