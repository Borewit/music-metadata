var id4 = require('../lib/id4'),
      testCase = require('nodeunit').testCase;

module.exports = testCase({
    setUp: function(){
        this.id3 = new id4(require('fs').createReadStream('samples/id4.m4a'));
		this.executor = function(frameName, expected, test, deep){
			test.expect(1);
			this.id3.on(frameName, function(result){
				(deep) ? test.deepEqual(result, expected) : test.equal(result, expected);
				test.done();
			});
			this.id3.parse();
		};
    },
	'trkn': function(test){
		this.executor('trkn', [1,0], test, true);
    },
	'disk': function(test){
		this.executor('disk', [1,1], test, true);
    },
    'tmpo': function(test){
        this.executor('tmpo', 0, test);
    },
    'gnre': function(test){
		this.executor('gnre', 'Electronic', test);
    },
    'stik': function(test){
        this.executor('stik', 256, test);
    },
    '©alb': function(test){
		this.executor('©alb', 'Voodoo People', test);
    },
    '©ART': function(test){
		this.executor('©ART', 'The Prodigy', test);
    },
    'aART': function(test){
		this.executor('aART', 'Pendulum', test);
    },
    '©cmt': function(test){
        this.executor('©cmt', '(Pendulum Remix)', test);
    },
    '©wrt': function(test){
		this.executor('©wrt', 'Liam Howlett', test);
    },
    '©nam': function(test){
		this.executor('©nam', 'Voodoo People (Pendulum Remix)', test);
    },
    '©too': function(test){
		this.executor('©too', 'Lavf52.36.0', test);
    },
    '©day': function(test){
		this.executor('©day', 2005, test);
    },
    'covr': function(test){
        test.expect(2);
        this.id3.on('covr', function(result){
            test.equal(result.format, 'image/jpeg');
            test.equal(result.data.length, 196450);     
            test.done();
        });
        this.id3.parse();
    }
});
