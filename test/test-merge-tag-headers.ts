import * as path from "path";
import * as mm from "../lib";
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

  describe('mergeTagHeaders option', () => {
    const testSample = path.join(issueDir, "Dethklok-mergeTagHeaders.mp3");
    /**
     * About the sample:
     * - Has ID3v1.1 and ID3v2.4 tag headers.
     * - Album is set in ID3v1.1 but not in ID3v2.4
     * - Artist in ID3v1.1 is different than in ID3v2.4
     */
    it("should merge multiple headers information when true", () => {
      const options = { mergeTagHeaders: true, native: true };
      return mm.parseFile(testSample, options).then(metadata => {
        const id3v24 = metadata.native['ID3v2.4'];
        const id3v11 = metadata.native['ID3v1.1'];
        const expectedAlbum = id3v11.filter(tag => tag.id === 'album').pop().value;
        const expectedArtist = id3v24.filter(tag => tag.id === 'TPE1').pop().value;
        t.strictEqual(metadata.common.album, expectedAlbum);
        t.strictEqual(metadata.common.artist, expectedArtist);
      });
    });

    it("should NOT merge multiple headers information when undefined", () => {
      const options = { native: true };
      return mm.parseFile(testSample, options).then(metadata => {
        const id3v24 = metadata.native['ID3v2.4'];
        const expectedArtist = id3v24.filter(tag => tag.id === 'TPE1').pop().value;
        t.isUndefined(metadata.common.album);
        t.strictEqual(metadata.common.artist, expectedArtist);
      });
    });

    it("should NOT merge multiple headers information when false", () => {
      const options = { mergeTagHeaders: false, native: true };
      return mm.parseFile(testSample, options).then(metadata => {
        const id3v24 = metadata.native['ID3v2.4'];
        const expectedArtist = id3v24.filter(tag => tag.id === 'TPE1').pop().value;
        t.isUndefined(metadata.common.album);
        t.strictEqual(metadata.common.artist, expectedArtist);
      });
    });
  });

});
