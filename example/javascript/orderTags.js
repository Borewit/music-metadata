import { parseFile, orderTags } from '../../lib/index.js';  // music-metadata
import { inspect } from 'util';

(async () => {
  try {
    const metadata = await parseFile('../../test/samples/MusicBrainz - Beth Hart - Sinner\'s Prayer [id3v2.3].V2.mp3');
    const orderedTags = orderTags(metadata.native['ID3v2.3']);
    console.log(inspect(orderedTags, { showHidden: false, depth: null }));
  } catch (error) {
    console.error(error.message);
  }
})();
