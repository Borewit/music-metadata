import { parseFile } from "../../lib/index.js";
import { inspect } from "util";

(async () => {
  try {
    const metadata = await parseFile("../test/samples/MusicBrainz-multiartist [id3v2.4].V2.mp3");
    console.log(inspect(metadata, { showHidden: false, depth: null }));
  } catch (error) {
    console.error(error.message);
  }
})();
