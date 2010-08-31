var ID3 = require('../lib/id3'),
    fs  = require('fs');

var file_3v1 = fs.readFileSync(__dirname + '/sample3v1'),
    file_3v2 = fs.readFileSync(__dirname + '/sample3v2'),
    file_4   = fs.readFileSync(__dirname + '/sample4');

var id3_3v1 = new ID3(file_3v1),
    id3_3v2 = new ID3(file_3v2),
    id3_4     = new ID3(file_4);

console.log(id3_3v1.getTags());
console.log(id3_3v2.getTags());
console.log(id3_4.getTags());
