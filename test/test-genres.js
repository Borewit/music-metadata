var assert = require('./assert-ext'),
    parseGenre = require('../lib/common').parseGenre,
    testHelper = require('./testHelper');

testHelper.expected = 8;

var simple = 'Electronic';
assert.strictEqual(parseGenre(simple), 'Electronic');

var separated = 'Electronic/Rock';
assert.strictEqual(parseGenre(separated), 'Electronic/Rock');

var singleIndexed = '(0)';
assert.strictEqual(parseGenre(singleIndexed), 'Blues');

var indexed = '(0)(1)(2)';
assert.strictEqual(parseGenre(indexed), 'Blues/Classic Rock/Country');

var refined = '(4)Eurodisco';
assert.strictEqual(parseGenre(refined), 'Disco/Eurodisco');

var refinedPlus = '(4)Eurodisco(0)Mopey';
assert.strictEqual(parseGenre(refinedPlus), 'Disco/Eurodisco/Blues/Mopey');

var keywords = ('(RX)(CR)');
assert.strictEqual(parseGenre(keywords), 'RX/CR');

var newSplit = ('RX/CR');
assert.strictEqual(parseGenre(newSplit), 'RX/CR');





