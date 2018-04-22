import * as path from "path";
import * as mm from "../src";
import {assert} from "chai";

const t = assert;
const issueDir = path.join(__dirname, "samples");

describe('Merge tag headers', () => {

  /**
   * issue_77_empty_tag.mp3 (metadata of: 'Like Spinning Plates (Live)'):
   *   Has an empty ID3v2.3 tag and a ID3v1.1 tag.
   */
  it("should ignore empty tag headers", () => {
    const options = { mergeTagHeaders: true, native: true };
    return mm.parseFile(path.join(issueDir, 'issue_77_empty_tag.mp3'), options).then(metadata => {
      t.strictEqual(metadata.common.title, 'Like Spinning Plates (Live)');
      t.strictEqual(metadata.common.album, 'I Might Be Wrong');
      t.strictEqual(metadata.common.artist, 'Radiohead');
    });
  });

});
