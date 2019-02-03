import * as mm from '../../src';
import * as util from 'util';

mm.parseFile('../test/samples/MusicBrainz-multiartist [id3v2.4].V2.mp3', {native: true})
  .then(metadata => {
    console.log(util.inspect(metadata, {showHidden: false, depth: null}));
  })
  .catch(err => {
    console.error(err.message);
  });
