const https = require('https');
const util = require('util');
const mm = require('../../lib'); // music-metadata

const audioUrl = 'https://github.com/Borewit/music-metadata/raw/master/test/samples/MusicBrainz%20-%20Beth%20Hart%20-%20Sinner\'s%20Prayer%20%5Bid3v2.3%5D.V2.mp3';

function httpGet (url) {
  return new Promise(function (resolve, reject) {
    https.get(url, function (res) {
      switch (res.statusCode) {
        case 200:
          resolve(res);
          break;
        case 302: // redirect
          resolve(httpGet(res.headers.location));
          break;
        default:
          reject(new Error('Unexpected status-code:' + res.statusCode));
      }
    });
  });
}

// Stream MP3 sample file from GitHub via HTTP
httpGet(audioUrl, {native: true}).then(metadata => {
  // Parse the MP3 audio stream
  const mimeType = metadata.headers['content-type'];
  console.log('Parsing: ' + mimeType);
  return mm.parseStream(metadata, mimeType, {native: true})
    .then(metadata => {
      // Print the metadata result
      console.log(util.inspect(metadata, {showHidden: false, depth: null}));
    });
}).catch(function (err) {
  // Oops, something went wrong
  console.error(err.message);
});