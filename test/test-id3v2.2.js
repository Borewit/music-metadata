var id3v2 = require('../lib/index'),
      fs = require('fs');
      
exports['id3v2.2'] = function(test){
    test.numAssertions = 32;
    
    var id3 = new id3v2(fs.createReadStream('samples/id3v2.2.mp3'));
    
    id3.on('metadata', function(result){
        test.equal(result.title, 'You Are The One');
        test.equal(result.artist, 'Shiny Toy Guns');
        test.equal(result.album, 'We Are Pilots');
        test.equal(result.year, 2006);
        test.equal(result.track, '1/11');
        test.equal(result.genre, 'Alternative');
    });
    
    id3.on('TP1', function(result){
        test.equal(result, 'Shiny Toy Guns', 'TP1 failed');
    });
    
    id3.on('TRK', function(result){
        test.equal(result, '1/11', 'TRK failed');
    });
    
    id3.on('TYE', function(result){
        test.equal(result, 2006, 'TYE failed');
    });
    
    id3.on('TEN', function(result){
        test.equal(result, 'iTunes v7.0.2.16', 'TEN failed');
    });
    
    id3.on('TCO', function(result){
        test.equal(result, 'Alternative', 'TCO failed');
    });
    
    id3.on('TAL', function(result){
        test.equal(result, 'We Are Pilots', 'TAL failed');
    });
    
    id3.on('TT2', function(result){
        test.equal(result, 'You Are The One', 'TT2 failed');
    });
    
    id3.on('PIC', function(result){
        test.equal(result.format, 'JPG', 'PIC format failed');
        test.equal(result.type, 'Other', 'PIC type failed');
        test.equal(result.description, '', 'PIC description failed');
        test.equal(result.data.length, 99738, 'PIC data length failed');     
    });
    
    id3.on('ULT', function(result){
        test.equal(result.descriptor, '', 'ULT descriptor failed');
        test.equal(result.language, 'eng', 'ULT language failed');
         //skipping testing exact contents, bit naughty
        test.equal(result.text.length, 832, 'ULT text length failed');    
    });
    
    var comCounter = 0;
    //there are 3 comment frames in this file so we need to test all 3 events
    id3.on('COM', function(result){
        test.equal(result.language, 'eng');
        switch(comCounter){
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
                break;
        }
        comCounter++;    
    });
    
    id3.on('done', function(){
        test.finish();
    });

    id3.parse();
}

if (module == require.main) {
  require('async_testing').run(__filename, process.ARGV);
}