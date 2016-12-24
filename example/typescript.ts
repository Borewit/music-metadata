import * as fs from 'fs';
import * as mm from '..';
import * as util from 'util';

let audioStream = fs.createReadStream('../test/samples/MusicBrainz-multiartist [id3v2.4].V2.mp3');

// create a new music-metadata parser from a node ReadStream
mm.parseStream(audioStream, {native: true}, (err, metadata) => {
  // important note, the stream is not closed by default. To prevent leaks, you must close it yourself
  audioStream.close();
  if (err) throw err;

  console.log(util.inspect(metadata, {showHidden: false, depth: null}));
});
