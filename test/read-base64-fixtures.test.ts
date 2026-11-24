import { createHash } from 'node:crypto';
import path from 'node:path';
import { assert, vi } from 'vitest';
import { decodeBase64 } from '../lib/common/Base64.js';
import { parseFile } from '../lib/index.js';
import { VorbisPictureToken } from '../lib/ogg/vorbis/Vorbis.js';
import { VorbisStream } from '../lib/ogg/vorbis/VorbisStream.js';
import { samplePath } from './helpers/util.js';

const fixtures = [
  {
    file: "ogg/MusicBrainz - Beth Hart - Sinner's Prayer.ogg",
    hashes: [
      '3e4d47098a5ae2eacec77219a698d63d70e9f8cd6e042cb551723dbc79b31d85',
      'a30697084e0bdab8c3d420f0d192beb8abd72fbbff64f65f8d7001cf75a1c903'
    ]
  },
  {
    file: 'flac/issue-266.flac',
    hashes: ['e49f4daf5eaf036f11f9dae40859a56536573c2f809604ed61bfcd4dc3ccbd56']
  },
  {
    file: 'ogg/issue-2638.ogg',
    hashes: ['3eb263cd527034b01ad9b23bb649d4adc316eefb7ae04940709921f264b00d47']
  },
  {
    file: 'ogg/issue_70.ogg',
    hashes: ['3bf3cb4580199c3013869e47b95d647aa26f59b6bd56c2cd000dc6df34cef1c2']
  },
  {
    file: 'ogg/nirvana-2sec.opus.ogg',
    hashes: ['22143011368eb1d97c12338980d923033809a388677660f866d0403b1e5aca87']
  },
  {
    file: 'ogg/nirvana-2sec.vorbis.ogg',
    hashes: ['22143011368eb1d97c12338980d923033809a388677660f866d0403b1e5aca87']
  },
  {
    file: 'ogg/ogg-multipagemetadata-bug.ogg',
    hashes: ['9514985ae496f927d54a43ab55634619977de388814726ad128f62ce7ad5ef17']
  }
];

function decodeInBrowser(value: string): Uint8Array {
  // Disable Buffer only during the synchronous decoder, not Node file I/O.
  try {
    vi.stubGlobal('Buffer', undefined);
    return decodeBase64(value);
  } finally {
    vi.unstubAllGlobals();
  }
}

describe('Real-world base64 artwork without custom recovery', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  for (const fixture of fixtures) {
    it(`keeps Node and browser artwork identical for ${fixture.file}`, async () => {
      const filePath = path.join(samplePath, fixture.file);
      const nodeMetadata = await parseFile(filePath);
      const hashes: string[] = [];
      vi.spyOn(VorbisPictureToken, 'fromBase64').mockImplementation(value => {
        const decoded = decodeInBrowser(value);
        hashes.push(createHash('sha256').update(decoded).digest('hex'));
        return VorbisPictureToken.fromBuffer(decoded);
      });

      const browserMetadata = await parseFile(filePath);
      assert.deepEqual(hashes, fixture.hashes, 'complete decoded FLAC PICTURE blocks');
      assert.deepEqual(browserMetadata, nodeMetadata, 'artwork, tags, format and warnings');
      assert.isNotEmpty(browserMetadata.common.picture, 'artwork must not be silently dropped');
    });

    it(`warns and finishes parsing when browser artwork is malformed in ${fixture.file}`, async () => {
      const filePath = path.join(samplePath, fixture.file);
      // The reference skips only base64 comments, preserving any separate
      // binary FLAC PICTURE block in the same fixture.
      const addTag = VorbisStream.prototype.addTag;
      const skip = vi.spyOn(VorbisStream.prototype, 'addTag').mockImplementation(function (id, value) {
        return id === 'METADATA_BLOCK_PICTURE' && typeof value === 'string'
          ? Promise.resolve()
          : addTag.call(this, id, value);
      });
      const expected = await parseFile(filePath, { duration: true });
      skip.mockRestore();
      // Corrupt only the base64 text presented to the decoder, leaving container
      // lengths and Ogg page checksums untouched.
      const decode = vi.spyOn(VorbisPictureToken, 'fromBase64').mockImplementation(value => {
        const invalid = `${value.slice(0, 4)}!${value.slice(4)}`;
        return VorbisPictureToken.fromBuffer(decodeInBrowser(invalid));
      });

      const actual = await parseFile(filePath, { duration: true });

      assert.lengthOf(decode.mock.calls, fixture.hashes.length);
      const warning = 'Invalid base64 in METADATA_BLOCK_PICTURE; picture skipped';
      assert.deepEqual(
        actual.quality.warnings.filter(entry => entry.message === warning),
        fixture.hashes.map(() => ({ message: warning }))
      );
      assert.deepEqual(
        {
          ...actual,
          quality: {
            ...actual.quality,
            warnings: actual.quality.warnings.filter(entry => entry.message !== warning)
          }
        },
        expected
      );
    });
  }
});
