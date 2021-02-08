import * as mm from '../../lib';
import * as util from 'util';

(async () => {
  try {
    const metadata = await mm.parseFile('../test/samples/MusicBrainz-multiartist [id3v2.4].V2.mp3');
    console.log(util.inspect(metadata, { showHidden: false, depth: null }));
  } catch (error) {
    console.error(error.message);
  }
})();
