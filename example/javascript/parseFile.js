import { parseFile } from '../../lib/index.js';  // music-metadata
import { inspect } from 'util';

(async () => {
  try {
    const metadata = await parseFile('../../test/samples/MusicBrainz - Beth Hart - Sinner\'s Prayer [id3v2.3].V2.mp3');
    console.log(inspect(metadata, { showHidden: false, depth: null }));
  } catch (error) {
    console.error(error.message);
  }
})();

