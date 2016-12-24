var fs = require('fs');
var mm = require('..');
const util = require('util')

var audioStream = fs.createReadStream('../test/samples/MusicBrainz-multiartist [id3v2.4].V2.mp3')

// create a new music-metadata from a node ReadStream
mm.parseStream(audioStream, {native: true}, function (err, metadata) {
  // important note, the stream is not closed by default. To prevent leaks, you must close it yourself
  audioStream.close();
  if (err) throw err;

  console.log(util.inspect(metadata, {showHidden: false, depth: null}));
});