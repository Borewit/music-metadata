const mm = require('../../lib'); // music-metadata
const util = require('util');

mm.parseFile('../test/samples/MusicBrainz-multiartist [id3v2.4].V2.mp3')
  .then(function (metadata) {
    console.log(util.inspect(metadata, { showHidden: false, depth: null }));
  })
  .catch(function (err) {
    console.err(err.message);
  });
