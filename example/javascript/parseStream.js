import { parseStream } from '../../lib/index.js';  // music-metadata

let someReadStream; // Node.js stream

(async () => {
  try {
    const metadata = await parseStream(someReadStream, {mimeType: 'audio/mpeg', size: 26838});
    console.log(metadata);
  } catch (error) {
    console.error(error.message);
  }
})();
