var id3 = require('../lib/id3v2'),
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
	'TALB': function(test){
		this.executor('TALB', 'Friday Night Lights [Original Movie Soundtrack]', test);
    },
	'TPE1': function(test){
		this.executor('TPE1', 'Explosions In The Sky/Another/And Another', test);
    },
    'TPE2': function(test){
        this.executor('TPE2', 'Soundtrack', test);
    },
    'TCOM': function(test){
        this.executor('TCOM', 'Explosions in the Sky', test);
    },
    'TPOS': function(test){
        this.executor('TPOS', '1/1', test);
    },
    'TCON': function(test){
        this.executor('TCON', 'Soundtrack', test);
    },
    'TIT2': function(test){
        this.executor('TIT2', 'Home', test);
    },
    'TRCK': function(test){
        this.executor('TRCK', 5, test);
    },
    'TYER': function(test){
        this.executor('TYER', 2004, test);
    },
    'APIC': function(test){
        test.expect(4);
        this.id3.on('APIC', function(result){
            test.equal(result.format, 'image/jpg');
            test.equal(result.type, 'Cover (front)');
            test.equal(result.description, '');
            test.equal(result.data.length, 80938);
            test.done()
        });
        this.id3.parse();
    }
    //TODO: test/impl for TXXX
});    

