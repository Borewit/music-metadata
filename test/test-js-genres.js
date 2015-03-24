var parseGenre = require('../lib/common').parseGenre
var test = require('prova')

test('should be able to parse genres', function (t) {
  var tests = {
    'Electronic': 'Electronic',
    'Electronic/Rock': 'Electronic/Rock',
    '(0)': 'Blues',
    '(0)(1)(2)': 'Blues/Classic Rock/Country',
    '(0)(160)(2)': 'Blues/Electroclash/Country',
    '(0)(192)(2)': 'Blues/Country',
    '(0)(255)(2)': 'Blues/Country',
    '(4)Eurodisco': 'Disco/Eurodisco',
    '(4)Eurodisco(0)Mopey': 'Disco/Eurodisco/Blues/Mopey',
    '(RX)(CR)': 'RX/CR',
    '1stuff': '1stuff',
    'RX/CR': 'RX/CR'
  }
  for (var test in tests) {
    t.strictEqual(parseGenre(test), tests[test], test)
  }
  t.end()
})
