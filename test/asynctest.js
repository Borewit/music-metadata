var strtok = require('strtok'),
    fs = require('fs'),
    id4 = require('../lib/id4'),
    id3v2 = require('../lib/id3v2'),
    ID3File = require('../lib/index'),
    genres = require('../lib/common').GENRES;
        

var tst = new id4(require('fs').createReadStream('./samples/id4.m4a'));

if('©' == '©'){
    console.log("haggis");
}

var copyright = new Buffer(2);
copyright[1] = 0xA9;

console.log(copyright.toString());

//console.log('©'.charCodeAt());

tst.on('TP1', function(result){
    console.log(result);
});

tst.on('©wrt', function(result){
    console.log('HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHA');
});

tst.on('trkn', function(result){
    console.log('HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHA');
});

tst.parse();

//var id3z = new require('../lib/index.js').ID3File();


// var testid3v23 = new id3v2(fs.createReadStream('./samples/id3v2.3.mp3'));

// testid3v23.on('TALB', function(result){
    // console.log(result);
// });

// testid3v23.parse();


// testid3.on('covr', function(result){
	// console.log(result);
    // var output = fs.createWriteStream('myfile.jpg');
    // output.write(result.data);
    // output.end();
// });
// testid3.on('�alb', function(result){
	// console.log(result);
// });

// testid3.on('�day', function(result){
	// console.log(result);
// });

// testid3.on('trkn', function(result){
	// console.log(result);
// });

// testid3.on('gnre', function(result){
	// console.log(result);
// });

// testid3.on('disk', function(result){
	// console.log(result);
// });

// testid3.on('�nam', function(result){
    // console.log('faggle');
	// console.log(result);
// });

// testid3.on('�cmt', function(result){
	// console.log(result);
// });

// testid3.on('©wrt', function(result){
    // console.log('wuuuurt');
	// console.log(result);
// });

// testid3.on('aART', function(result){
	// console.log(result);
// });

// testid3.on('�ART', function(result){
	// console.log(result);
// });