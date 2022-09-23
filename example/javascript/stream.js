import https from 'https';
import { inspect } from 'util';
import { parseStream } from '../../lib/index.js';  // music-metadata

const audioUrl =
  "https://github.com/Borewit/music-metadata/raw/master/test/samples/MusicBrainz%20-%20Beth%20Hart%20-%20Sinner's%20Prayer%20%5Bid3v2.3%5D.V2.mp3";

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      switch (res.statusCode) {
        case 200:
          resolve(res);
          break;
        case 302: // redirect
          resolve(httpGet(res.headers.location));
          break;
        default:
          reject(new Error("Unexpected status-code:" + res.statusCode));
      }
    });
  });
}

(async () => {
  try {
    // Stream MP3 sample file from GitHub via HTTP
    const stream = await httpGet(audioUrl);
    const metadata = await parseStream(stream);
    console.log(inspect(metadata, { showHidden: false, depth: null }));
  } catch(error) {
    // Oops, something went wrong
    console.error(error.message);
  }
})();
