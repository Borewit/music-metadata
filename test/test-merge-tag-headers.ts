import * as path from 'path';
import { assert } from 'chai';

import * as mm from '../lib';
import { samplePath } from './util';

const issueDir = path.join(samplePath);

describe('Merge tag headers', () => {

  /**
   * issue_77_empty_tag.mp3 (metadata of: 'Like Spinning Plates (Live)'):
   * Has an empty ID3v2.3 tag and a ID3v1 tag.
   */
  it('should ignore empty tag headers', async () => {
    const metadata = await mm.parseFile(path.join(issueDir, 'issue_77_empty_tag.mp3'));
    assert.strictEqual(metadata.common.title, 'Like Spinning Plates (Live)');
    assert.strictEqual(metadata.common.album, 'I Might Be Wrong');
    assert.strictEqual(metadata.common.artist, 'Radiohead');
  });

  describe('mergeTagHeaders option', () => {
    const testSample = path.join(issueDir, 'Dethklok-mergeTagHeaders.mp3');
    /**
     * About the sample:
     * - Has ID3v1 and ID3v2.4 tag headers.
     * - Album is set in ID3v1 but not in ID3v2.4
     * - Artist in ID3v1 is different than in ID3v2.4
     */
    it('should merge multiple headers information when true', async () => {
      const metadata = await mm.parseFile(testSample);
      const id3v24 = metadata.native['ID3v2.4'];
      const id3v11 = metadata.native.ID3v1;
      const expectedAlbum = id3v11.filter(tag => tag.id === 'album').pop().value;
      const expectedArtist = id3v24.filter(tag => tag.id === 'TPE1').pop().value;
      assert.strictEqual(metadata.common.album, expectedAlbum);
      assert.strictEqual(metadata.common.artist, expectedArtist);
    });

  });

});
