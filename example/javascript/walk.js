const walk = require('walk');
const path = require('path');
const mm = require('../../lib'); // music-metadata

const walker = walk.walk('M:\\');

let filesParsed = 0;

walker.on('file', function (root, fileStats, next) {

  switch (path.extname(fileStats.name)) {
    case '.mp3':
    case '.m4a':
    case '.wav':
    case '.ogg':
    case '.flac':
      // Queue (asynchronous call) parsing of metadata
      const fn = path.join(root, fileStats.name);
      mm.parseFile(fn).then(metadata => {
        // console.log(util.inspect(metadata, { showHidden: false, depth: null }));
        console.log('Parsed %s files, last file: %s', ++filesParsed, fn);
        next(); // asynchronous call completed, 'release' next
      }).catch(function (err) {
        console.error('Error parsing:  %s', fn);
        console.error(err.message);
        next();
      });
      break;

    default:
      next(); // Go to next file, no asynchronous call 'queued'
  }
});