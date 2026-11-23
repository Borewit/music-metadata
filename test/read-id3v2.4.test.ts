import path from 'node:path';
import { assert } from 'vitest';
import { MetadataCollector } from '../lib/common/MetadataCollector.js';
import * as mm from '../lib/index.js';
import { samplePath } from './helpers/util.js';

describe('Decode MP3/ID3v2.4', () => {
  it('should decode id3v2.4', () => {
    const filename = 'mp3/id3v2.4.mp3';
    const filePath = path.join(samplePath, filename);

    return mm.parseFile(filePath, { duration: true }).then(metadata => {
      assert.deepEqual(metadata.format.tagTypes, ['ID3v2.4', 'ID3v1'], 'format.tagTypes');
      assert.strictEqual(metadata.format.duration, 0.7836734693877551, 'format.format.duration');
      assert.strictEqual(metadata.format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
      assert.strictEqual(metadata.format.bitrate, 128000, 'format.bitrate = 128 kbit/sec');
      assert.strictEqual(metadata.format.codecProfile, 'CBR', 'format.codecProfile = CBR');
      assert.strictEqual(metadata.format.container, 'MPEG', 'format.container');
      assert.strictEqual(metadata.format.codec, 'MPEG 1 Layer 3', 'format.codec');
      assert.strictEqual(metadata.format.tool, 'LAME 3.98r', 'format.tool');
      assert.strictEqual(metadata.format.numberOfChannels, 2, 'format.numberOfChannels = 2');

      assert.strictEqual(metadata.common.title, 'Home', 'title');
      assert.strictEqual(metadata.common.artist, 'Explo', 'common.artist');
      assert.deepEqual(metadata.common.artists, ['Explo', 'ions', 'nodejsftws'], 'common.artists');
      assert.strictEqual(metadata.common.albumArtist, 'Soundtrack', 'albumArtist');
      assert.strictEqual(metadata.common.album, 'Friday Night Lights [Original Movie Soundtrack]', 'album');
      assert.strictEqual(metadata.common.year, 2004, 'year');
      assert.deepEqual(metadata.common.trackNumber, 5, 'common.trackNumber');
      assert.deepEqual(metadata.common.discNumber, 1, 'common.discNumber');
      assert.deepEqual(metadata.common.genres, ['Soundtrack', 'OST'], 'common.genre');
      assert.strictEqual(metadata.common.picture[0].format, 'image/jpeg', 'common.picture 0 format');
      assert.strictEqual(metadata.common.picture[0].data.length, 80938, 'common.picture 0 length');
      assert.strictEqual(metadata.common.picture[1].format, 'image/jpeg', 'common.picture 1 format');
      assert.strictEqual(metadata.common.picture[1].data.length, 80938, 'common.picture 1 length');
    });
  });

  // Issue: https://github.com/Borewit/music-metadata/issues/502
  it('COMM mapping', async () => {
    const filePath = path.join(samplePath, 'mp3', 'issue-502.mp3');
    const { common } = await mm.parseFile(filePath);
    assert.deepEqual(
      common.comments,
      [
        {
          descriptor: 'iTunPGAP',
          language: 'eng',
          text: '0'
        },
        {
          descriptor: 'iTunNORM',
          language: 'eng',
          text: ' 000003B5 000003DA 00002F21 00003563 000023B6 0000D74E 00007267 000077A0 0000D7B6 0000D7B6'
        },
        {
          descriptor: 'iTunSMPB',
          language: 'eng',
          text: ' 00000000 00000210 0000084C 00000000006E6BA4 00000000 00641054 00000000 00000000 00000000 00000000 00000000 00000000'
        },
        {
          descriptor: '',
          language: 'eng',
          text: 'CLEAN'
        }
      ],
      'common.comment'
    );
  });

  it('should respect skipCovers-flag', () => {
    const filename = 'mp3/id3v2.4.mp3';
    const filePath = path.join(samplePath, filename);

    return mm.parseFile(filePath, { duration: true, skipCovers: true }).then(result => {
      assert.isUndefined(result.common.picture, 'common.picture should be undefined');
    });
  });

  it('Support PCNT variable length', async () => {
    const filePath = path.join(samplePath, 'mp3', 'issue-2497.mp3');

    const metadata = await mm.parseFile(filePath, { duration: true });
    const { format, common } = metadata;

    assert.deepEqual(format.container, 'MPEG', 'format.container');
    assert.deepEqual(format.codec, 'MPEG 1 Layer 3', 'format.codec');
    assert.deepEqual(common.playCounter, 48, 'format.playCounter');
  });

  it('Map TXXX:ISRC', async () => {
    const filename = 'issue-802.mp3';
    const filePath = path.join(samplePath, 'mp3', filename);

    const { common, native } = await mm.parseFile(filePath);
    const id3v24 = native['ID3v2.4'];
    assert.isDefined(id3v24, 'ID3v2.4 presence');
    assert.strictEqual(
      id3v24.filter(tag => {
        return tag.id === 'TSRC';
      }).length,
      0,
      'ID3v2.4 tag TSRC not defined'
    );
    assert.strictEqual(
      id3v24.filter(tag => {
        return tag.id === 'TXXX:ISRC';
      }).length,
      1,
      'ID3v2.4 tag TXXX:ISRC to be defined'
    );
    assert.includeDeepMembers(common.isrcs, ['DEAE61300058'], 'ISRC');
  });

  it('should support multiple album artists (TPE2)', async () => {
    const filePath = path.join(samplePath, 'mp3/id3v2.4-with-multiple-album-artists-null-separated.mp3');
    const { common } = await mm.parseFile(filePath);

    assert.strictEqual(common.albumArtist, 'ArtistOne', 'common.albumartist');
    assert.deepEqual(common.albumArtists, ['ArtistOne', 'ArtistTwo'], 'common.albumartists');
  });

  // https://id3.org/id3v2.4.0-frame
  it('4.8. Unsynchronised lyrics/text transcription', async () => {
    const { common, native } = await mm.parseFile(
      path.join(samplePath, "mp3/MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.4].V2.mp3")
    );
    const lyrics =
      'Lord, have mercy, Lord, have mercy on me\nLord, have mercy, Lord, have mercy on me\n' +
      "Well, if I've done somebody wrong\nLord, have mercy if you please\n\n" +
      'I used to have plenty of money\nThe finest clothes in town\n' +
      'Bad luck and trouble overtook me\nAnd God, look at me now\n\n' +
      "Please have mercy, Lord, have mercy on me\nAnd if I've done somebody wrong\nLord, have mercy if you please\n\n" +
      "Keep on working, my child\nOh, in the morning, oh\nLord, have mercy\n\nIf I've been a bad girl, baby\nYeah, I'll change my ways\n" +
      "Don't want bad luck and trouble\nOn me all my days\n\n" +
      "Please have mercy, Lord, have mercy on me\nAnd if I've done somebody wrong\nLord, have mercy if you please\n" +
      'Have mercy on me';

    // Check native IDv2.4 tag
    const id3v23 = mm.orderTags(native['ID3v2.4']);
    assert.isDefined(id3v23.USLT, 'Should contain ID3v2.4 USLT tag');
    assert.deepEqual(id3v23.USLT[0], {
      descriptor: "Sinner's Prayer",
      language: 'eng',
      text: lyrics
    });

    // Check mapping to common IDv2.3 tag
    assert.isDefined(common.lyrics, 'Should map tag id3v23.USLT to common.lyrics');
    assert.strictEqual(common.lyrics[0].descriptor, "Sinner's Prayer", 'common.lyrics[0].descriptor');
    assert.strictEqual(common.lyrics[0].language, 'eng', 'common.lyrics[0].language');
    assert.strictEqual(common.lyrics[0].text, lyrics);
  });

  it('should trim the NUL padding of a TXXX frame in linear time', async () => {
    // Intended defect: a TXXX value holding a long run of NUL bytes followed by one
    // non-NUL byte. Trimming that run with /\x00+$/ retries the whole run at every
    // starting offset, so the parse is quadratic in the length of the run.
    const nulCount = 512 * 1024;
    const value = new Uint8Array(nulCount + 3);
    value[value.length - 1] = 0x41; // 'A', so the run does not sit at the end of the value

    const synchSafe = (size: number) =>
      Uint8Array.from([(size >>> 21) & 0x7f, (size >>> 14) & 0x7f, (size >>> 7) & 0x7f, size & 0x7f]);
    const ascii = (text: string) => Uint8Array.from(text, character => character.charCodeAt(0));

    const frame = [ascii('TXXX'), synchSafe(value.length), new Uint8Array(2), value];
    const frameSize = frame.reduce((total, part) => total + part.length, 0) - 10;
    const parts = [ascii('ID3'), Uint8Array.from([4, 0, 0]), synchSafe(frameSize + 10), ...frame];

    const mp3 = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
    let offset = 0;
    for (const part of parts) {
      mp3.set(part, offset);
      offset += part.length;
    }

    const { native } = await mm.parseBuffer(mp3, { mimeType: 'audio/mpeg' }, { maxMetadataEntries: nulCount + 1 });
    const textFrames = (native['ID3v2.4'] ?? []).filter(tag => tag.id === 'TXXX');
    assert.lengthOf(textFrames, nulCount + 1, 'empty values retain their positions');
    assert.strictEqual(textFrames[textFrames.length - 1].value, 'A', 'the byte after the NUL run survives');
  });

  describe('frame size written as a plain 32-bit integer', () => {
    // Intended defect: ID3v2.4 section 4 requires a synchsafe frame size, but iTunes and other writers store
    // the size as a plain 32-bit integer, like ID3v2.3. Sizes below 128 are the same in both encodings.
    const ascii = (text: string) => Uint8Array.from(text, character => character.charCodeAt(0));
    const synchSafe = (size: number) =>
      Uint8Array.from([(size >>> 21) & 0x7f, (size >>> 14) & 0x7f, (size >>> 7) & 0x7f, size & 0x7f]);
    const uint32 = (size: number) =>
      Uint8Array.from([size >>> 24, (size >>> 16) & 0xff, (size >>> 8) & 0xff, size & 0xff]);

    function makeTag(title: string): Uint8Array {
      const titleData = ascii(`\x00${title}`); // ISO-8859-1
      const artistData = ascii('\x00Artist');
      const parts = [
        ascii('TIT2'),
        uint32(titleData.length),
        new Uint8Array(2),
        titleData,
        ascii('TPE1'),
        uint32(artistData.length),
        new Uint8Array(2),
        artistData
      ];
      const tagSize = parts.reduce((total, part) => total + part.length, 0);
      parts.unshift(ascii('ID3'), Uint8Array.from([4, 0, 0]), synchSafe(tagSize));
      const tag = new Uint8Array(tagSize + 10);
      let offset = 0;
      for (const part of parts) {
        tag.set(part, offset);
        offset += part.length;
      }
      return tag;
    }

    it('should read frame sizes written as plain 32-bit integers, as iTunes does', async () => {
      // Fixture: valid MP3 with an ID3v2.4 tag whose frame sizes are plain 32-bit integers.
      // TIT2 has 200 payload bytes (0x000000C8: a size byte with its most significant bit set),
      // TALB has 256 (0x00000100: read as synchsafe it is 128, which ends inside the album text).
      const filePath = path.join(samplePath, 'mp3/id3v2.4-itunes-plain-frame-size.mp3');
      const { common, quality } = await mm.parseFile(filePath);
      assert.strictEqual(
        common.title,
        'Frame size written as a plain 32-bit integer by iTunes '.repeat(4).slice(0, 199),
        'common.title'
      );
      assert.strictEqual(common.album, 'Not a synchsafe integer '.repeat(12).slice(0, 255), 'common.album');
      assert.strictEqual(common.artist, 'Artist', 'common.artist');
      assert.deepEqual(common.genres, ['Silence'], 'common.genre');
      assert.deepEqual(
        quality.warnings.map(warning => warning.message),
        [
          'ID3v2.4 frame TIT2 size is not a synchsafe integer, read it as a plain 32-bit integer',
          'ID3v2.4 frame TALB size is not a synchsafe integer, read it as a plain 32-bit integer'
        ],
        'quality.warnings'
      );
    });

    it('should not take frame-ID-like text at the synchsafe end for the next frame', async () => {
      const title = 'T'.repeat(255); // 'TTTT' at synchsafe 128 has no frame size that fits in the tag
      const { common } = await mm.parseBuffer(makeTag(title), { mimeType: 'audio/mpeg' });
      assert.strictEqual(common.title, title, 'common.title');
      assert.strictEqual(common.artist, 'Artist', 'common.artist');
    });

    it('should not take a zero byte at the synchsafe end for padding', async () => {
      const title = `${'t'.repeat(127)}\x00${'t'.repeat(127)}`; // zero byte at synchsafe 128, text after it
      const { common } = await mm.parseBuffer(makeTag(title), { mimeType: 'audio/mpeg' });
      assert.strictEqual(common.artist, 'Artist', 'common.artist');
    });

    it('should read a candidate frame size with its most significant bit set as a plain integer', async () => {
      // Title frame: plain size 336 (synchsafe reading 208). At payload offset 208 sits a 'TPE1' header
      // with size bytes 00 00 00 FF: as synchsafe 127 fits in the tag, but the plain 255 does not.
      const fakeHeader = 'TPE1\x00\x00\x00\xff\x00\x00';
      const title = `${'t'.repeat(207)}${fakeHeader}${'t'.repeat(335 - 207 - fakeHeader.length)}`;
      const { common } = await mm.parseBuffer(makeTag(title), { mimeType: 'audio/mpeg' });
      assert.strictEqual(common.artist, 'Artist', 'common.artist');
    });
  });

  // https://github.com/Borewit/music-metadata/pull/544
  describe('Common tag mappings', () => {
    for (const tagType of ['ID3v2.3', 'ID3v2.4'] as const) {
      it(`should merge case-insensitive TXXX:PERFORMER values with performer:instrument (${tagType})`, async () => {
        const metadata = new MetadataCollector({});
        await metadata.addTag(tagType, 'TXXX:PERFORMER', 'Explosions In The Sky');
        await metadata.addTag(tagType, 'TXXX:Performer', 'Guest (guitar)');
        await metadata.addTag(tagType, 'TXXX:performer', 'Another Guest (vocals)');
        await metadata.addTag(tagType, 'TXXX:PERFORMER:INSTRUMENT', 'Guest (guitar)');

        assert.deepEqual(metadata.common['performer:instrument'], [
          'Explosions In The Sky',
          'Guest (guitar)',
          'Another Guest (vocals)'
        ]);
        assert.isUndefined(metadata.common.artist, 'performer credits do not replace the artist');
      });
    }

    it('Movement Name', () => {
      const filename = 'mp3/pr-544-id3v24.mp3';
      const filePath = path.join(samplePath, filename);

      return mm.parseFile(filePath).then(metadata => {
        assert.strictEqual(metadata.common.movement, 'Movement Name', 'metadata.common.movement');
      });
    });

    it('Movement Index', () => {
      const filename = 'mp3/pr-544-id3v24.mp3';
      const filePath = path.join(samplePath, filename);

      return mm.parseFile(filePath).then(metadata => {
        assert.deepEqual(metadata.common.movementNumber, 1, 'metadata.common.movementNumber');
        assert.deepEqual(metadata.common.movementTotal, 4, 'metadata.common.movementTotal');
      });
    });

    it('Podcast', () => {
      const filename = 'mp3/pr-544-id3v24.mp3';
      const filePath = path.join(samplePath, filename);

      return mm.parseFile(filePath).then(metadata => {
        assert.strictEqual(metadata.common.podcast, true, 'metadata.common.podcast');
      });
    });

    it('Podcast Category', () => {
      const filename = 'mp3/pr-544-id3v24.mp3';
      const filePath = path.join(samplePath, filename);

      return mm.parseFile(filePath).then(metadata => {
        assert.deepEqual(metadata.common.categories, ['Podcast Category'], 'metadata.common.category');
      });
    });

    it('Podcast Identifier', () => {
      const filename = 'mp3/pr-544-id3v24.mp3';
      const filePath = path.join(samplePath, filename);

      return mm.parseFile(filePath).then(metadata => {
        assert.strictEqual(metadata.common.podcastId, '1234', 'metadata.common.podcastId');
      });
    });

    it('Podcast Keywords', () => {
      const filename = 'mp3/pr-544-id3v24.mp3';
      const filePath = path.join(samplePath, filename);

      return mm.parseFile(filePath).then(metadata => {
        assert.deepEqual(metadata.common.keywords, ['Podcast Keywords'], 'metadata.common.keywords');
      });
    });

    it('Podcast Url', () => {
      const filename = 'mp3/pr-544-id3v24.mp3';
      const filePath = path.join(samplePath, filename);

      return mm.parseFile(filePath).then(metadata => {
        assert.strictEqual(metadata.common.podcastUrl, 'http://podcast.url', 'metadata.common.podcasturl');
      });
    });

    it('Short Description', () => {
      const filename = 'mp3/pr-544-id3v24.mp3';
      const filePath = path.join(samplePath, filename);

      return mm.parseFile(filePath).then(metadata => {
        assert.deepEqual(metadata.common.subtitles, ['Short Description'], 'metadata.common.subscription');
      });
    });

    it('Long Description', () => {
      const filename = 'mp3/pr-544-id3v24.mp3';
      const filePath = path.join(samplePath, filename);

      return mm.parseFile(filePath).then(metadata => {
        assert.deepEqual(metadata.common.description, ['Long Description'], 'metadata.common.description');
      });
    });

    it('Album Artist Sort', () => {
      const filename = 'mp3/pr-544-id3v24.mp3';
      const filePath = path.join(samplePath, filename);

      return mm.parseFile(filePath).then(metadata => {
        assert.strictEqual(metadata.common.albumArtistSort, 'Album Artist Sort', 'metadata.common.albumartistsort');
      });
    });

    it('Album Sort', () => {
      const filename = 'mp3/pr-544-id3v24.mp3';
      const filePath = path.join(samplePath, filename);

      return mm.parseFile(filePath).then(metadata => {
        assert.strictEqual(metadata.common.albumSort, 'Album Sort', 'metadata.common.albumsort');
      });
    });

    it('Artist Sort', () => {
      const filename = 'mp3/pr-544-id3v24.mp3';
      const filePath = path.join(samplePath, filename);

      return mm.parseFile(filePath).then(metadata => {
        assert.strictEqual(metadata.common.artistSort, 'Artist Sort', 'metadata.common.artistsort');
      });
    });

    it('Composer Sort', () => {
      const filename = 'mp3/pr-544-id3v24.mp3';
      const filePath = path.join(samplePath, filename);

      return mm.parseFile(filePath).then(metadata => {
        assert.deepEqual(metadata.common.composerSort, 'Composer Sort', 'metadata.common.composersort');
      });
    });

    it('Title Sort', () => {
      const filename = 'mp3/pr-544-id3v24.mp3';
      const filePath = path.join(samplePath, filename);

      return mm.parseFile(filePath).then(metadata => {
        assert.strictEqual(metadata.common.titleSort, 'Title Sort', 'metadata.common.titlesort');
      });
    });

    it('Copyright', () => {
      const filename = 'mp3/pr-544-id3v24.mp3';
      const filePath = path.join(samplePath, filename);

      return mm.parseFile(filePath).then(metadata => {
        assert.strictEqual(metadata.common.copyright, 'Copyright', 'metadata.common.copyright');
      });
    });

    it('Compilation', () => {
      const filename = 'mp3/pr-544-id3v24.mp3';
      const filePath = path.join(samplePath, filename);

      return mm.parseFile(filePath).then(metadata => {
        assert.strictEqual(metadata.common.compilation, true, 'metadata.common.compilation');
      });
    });

    it('Comment', () => {
      const filename = 'mp3/pr-544-id3v24.mp3';
      const filePath = path.join(samplePath, filename);

      return mm.parseFile(filePath).then(metadata => {
        assert.deepEqual(
          metadata.common.comments,
          [
            {
              descriptor: '',
              language: 'eng',
              text: 'Tagged with Mp3tag v3.01'
            }
          ],
          'metadata.common.comment'
        );
      });
    });

    it('Release time', () => {
      const filename = 'mp3/pr-544-id3v24.mp3';
      const filePath = path.join(samplePath, filename);

      return mm.parseFile(filePath).then(metadata => {
        assert.strictEqual(metadata.common.releaseDate, '2020-06-29T00:00:00.000Z', 'metadata.common.date');
      });
    });

    it('Original Album', () => {
      const filename = 'mp3/pr-544-id3v24.mp3';
      const filePath = path.join(samplePath, filename);

      return mm.parseFile(filePath).then(metadata => {
        assert.strictEqual(metadata.common.originalAlbum, 'Original Album', 'metadata.common.originalAlbum');
      });
    });
  });
});
