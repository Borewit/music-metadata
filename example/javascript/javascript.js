const mm = require('../../lib'); // music-metadata
const util = require('util');

(async () => {
  try {
    const metadata = await mm.parseFile('../../test/samples/MusicBrainz - Beth Hart - Sinner\'s Prayer [id3v2.3].V2.mp3');
    console.log(util.inspect(metadata, { showHidden: false, depth: null }));
  } catch (error) {
    console.error(error.message);
  }
})();
