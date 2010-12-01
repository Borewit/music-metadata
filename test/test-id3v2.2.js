var id3 = require('../lib/id3v2'),
      testCase = require('nodeunit').testCase;

module.exports = testCase({
    setUp: function(){
        this.id3 = new id3(require('fs').createReadStream('samples/id3v2.2.mp3'));
        this.executor = function(frameName, expected, test){
            test.expect(1);
            this.id3.on(frameName, function(result){
                test.equal(result, expected);
                test.done();
            });
            this.id3.parse();
        };
    },
    'TP1': function(test){
        this.executor('TP1', 'Shiny Toy Guns', test);
    },
    'TRK': function(test){
        this.executor('TRK', '1/11', test);
    },
    'TYE': function(test){
        this.executor('TYE', 2006, test);
    },
    'TEN': function(test){
        this.executor('TEN', 'iTunes v7.0.2.16', test);
    },
    'TCO': function(test){
        this.executor('TCO', 'Alternative', test);
    },
    'TAL': function(test){
        this.executor('TAL', 'We Are Pilots', test);
    },
    'TT2': function(test){
        this.executor('TT2', 'You Are The One', test);
    },
    'PIC': function(test){
        test.expect(4);
        this.id3.on('PIC', function(result){
            test.equal(result.format, 'JPG');
            test.equal(result.type, 'Other');
            test.equal(result.description, '');
            test.equal(result.data.length, 99738);     
            test.done();
        });
        this.id3.parse();
    },
    'ULT': function(test){
        test.expect(3);
        this.id3.on('ULT', function(result){
            test.equal(result.descriptor, '');
            test.equal(result.language, 'eng');
            test.equal(result.text.length, 832); //skipping testing exact contents, bit naughty
            test.done();
        });
        this.id3.parse();
    },
    'COM': function(test){
        test.expect(12);
        var counter = 0;
        this.id3.on('COM', function(result){  
            test.equal(result.language, 'eng');
            switch(counter){
                case 0:
                    test.equal(result.short_description, 'iTunPGAP');
                    test.equal(result.text, '0');
                    break;
                case 1:
                    test.equal(result.short_description, 'iTunNORM');
                    test.equal(result.text, '0000299C 0000291D 0000DBE0 0000D6BA 0003C378 0003C2C1 0000902A 00008F1B 00012FC6 00015FBC');
                    break;
                case 2:
                    test.equal(result.short_description, 'iTunSMPB');
                    test.equal(result.text, '00000000 00000210 00000AD4 0000000000B6499C 00000000 006327AD 00000000 00000000 00000000 00000000 00000000 00000000');
                    break;
                case 3:
                    test.equal(result.short_description, 'iTunes_CDDB_IDs');
                    test.equal(result.text, '11+3ABC77F16B8A2F0F1E1A1EBAB868A98F+8210091');
                    test.done();
                    break;
            }
            counter++;    
        });
        this.id3.parse();
    }
});