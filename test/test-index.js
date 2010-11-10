var id3 = require('../lib/index'),
    testCase = require('nodeunit').testCase;

module.exports = testCase({
    setUp: function(){
        this.id3 = new id3(require('fs').createReadStream('samples/id3v2.3.mp3'));
		this.executor = function(frameName, expected, test, deep){
			test.expect(1);
			this.id3.on(frameName, function(result){
				(deep) ? test.deepEqual(result, expected) : test.equal(result, expected);
				test.done();
			});
			this.id3.parse();
		};
    },
	'album': function(test){
		this.executor('album', 'Friday Night Lights [Original Movie Soundtrack]', test);
    },
	'artist': function(test){
		this.executor('artist', 'Explosions In The Sky/Another/And Another', test);
    },
    'albumartist': function(test){
        this.executor('albumartist', 'Soundtrack', test);
    },
    'composer': function(test){
        this.executor('composer', 'Explosions in the Sky', test);
    },
    'disk': function(test){
        this.executor('disk', '1/1', test);
    },
    'genre': function(test){
        this.executor('genre', 'Soundtrack', test);
    },
    'title': function(test){
        this.executor('title', 'Home', test);
    },
    'track': function(test){
        this.executor('track', 5, test);
    },
    'year': function(test){
        this.executor('year', 2004, test);
    },
    'picture': function(test){
        test.expect(4);
        this.id3.on('picture', function(result){
            test.equal(result.format, 'image/jpg');
            test.equal(result.type, 'Cover (front)');
            test.equal(result.description, '');
            test.equal(result.data.length, 80938);
            test.done();
        });
        this.id3.parse();
    },
    'metadata': function(test){
        test.expect(2);
        this.id3.on('metadata', function(result){
            test.equal(result.albumartist, 'Soundtrack');
            test.done();
        });
        this.id3.parse();
    }
});