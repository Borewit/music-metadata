import path from 'node:path';
import { assert } from 'chai';
import type { IPicture } from '../lib/index.js';
import * as mm from '../lib/index.js';
import { samplePath } from './util.js';

describe('Decode MP3/ID3v2.4', () => {
  it('should decode id3v2.4', () => {
    const filename = 'id3v2.4.mp3';
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
      assert.strictEqual(metadata.common.albumartist, 'Soundtrack', 'albumartist');
      assert.strictEqual(metadata.common.album, 'Friday Night Lights [Original Movie Soundtrack]', 'album');
      assert.strictEqual(metadata.common.year, 2004, 'year');
      assert.deepEqual(metadata.common.track, { no: 5, of: null }, 'common.track');
      assert.deepEqual(metadata.common.disk, { no: 1, of: 1 }, 'common.disk');
      assert.deepEqual(metadata.common.genre, ['Soundtrack', 'OST'], 'common.genres');
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
      common.comment,
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
    const filename = 'id3v2.4.mp3';
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
    assert.includeDeepMembers(common.isrc, ['DEAE61300058'], 'ISRC');
  });

  it('should support multiple album artists (TPE2)', async () => {
    const filePath = path.join(samplePath, 'id3v2.4-with-multiple-album-artists-null-separated.mp3');
    const { common } = await mm.parseFile(filePath);

    assert.strictEqual(common.albumartist, 'ArtistOne', 'common.albumartist');
    assert.deepEqual(common.albumartists, ['ArtistOne', 'ArtistTwo'], 'common.albumartists');
  });

  // https://id3.org/id3v2.4.0-frame
  it('4.8. Unsynchronised lyrics/text transcription', async () => {
    const { common, native } = await mm.parseFile(
      path.join(samplePath, "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.4].V2.mp3")
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

  describe('MusicBrainz tags', () => {
    it('should MusicBrainz tags with id3v2.4', async () => {
      const filename = 'id3v2.4-musicbrainz.mp3';
      const filePath = path.join(samplePath, filename);

      const metadata = await mm.parseFile(filePath, { duration: true });
      const { common, format } = metadata;

      assert.deepEqual(format.duration, 0.7836734693877551, 'format.duration');

      assert.deepEqual(common.title, 'Home', 'common.title');
      assert.deepEqual(common.artist, 'Explosions in the Sky', 'common.artist');
      assert.deepEqual(common.albumartist, 'Explosions in the Sky', 'common.albumartist');
      assert.deepEqual(common.album, 'Friday Night Lights: Original Motion Picture Soundtrack', 'common.album');
      assert.deepEqual(common.year, 2004, 'common.year');
      assert.deepEqual(common.date, '2004-10-12', 'common.date');
      assert.deepEqual(common.track, { no: 5, of: 14 }, 'common.track');
      assert.deepEqual(common.disk, { no: 1, of: 1 }, 'common.disk');
      assert.deepEqual(common.genre, ['Soundtrack', 'OST'], 'common.genre');
      assert.deepEqual(common.picture[0].format, 'image/jpeg', 'common.picture 0 format');
      assert.deepEqual(common.picture[0].data.length, 75818, 'common.picture 0 length');

      assert.deepEqual(common.barcode, '602498644102', 'common.barcode');
      assert.deepEqual(common.isrc, ['USUG10400421'], 'common.isrc');
      assert.deepEqual(common.label, ['Hip-O Records'], 'common.label');
      assert.deepEqual(common.catalognumber, ['B0003663-02'], 'common.catalognumber');
      assert.deepEqual(common.releasecountry, 'US', 'common.releasecountry');
      assert.deepEqual(common.media, 'CD', 'common.media');
      assert.deepEqual(common.musicbrainz_artistid, ['4236acde-2ce2-441c-a3d4-38d55f1b5474'], 'MusicBrainz Artist Id');
      assert.deepEqual(
        common.musicbrainz_recordingid,
        '84851150-a196-48fa-ada5-1a012b1cd9ed',
        'MusicBrainz Recording Id'
      );
      assert.deepEqual(
        common.musicbrainz_albumartistid,
        ['4236acde-2ce2-441c-a3d4-38d55f1b5474'],
        'MusicBrainz Release Artist Id'
      );
      assert.deepEqual(
        common.musicbrainz_releasegroupid,
        'afe7c5d8-f8bc-32cf-b77d-8fb8561989a7',
        'MusicBrainz Release Group Id'
      );
      assert.deepEqual(common.musicbrainz_albumid, '2644f258-0619-4beb-a150-0c0069ca6699', 'MusicBrainz Release Id');
      assert.deepEqual(common.musicbrainz_trackid, 'd87d56d0-9bd3-3199-8ff3-d03dff3abb13', 'MusicBrainz Track Id');

      const native = metadata.native['ID3v2.4'];
      assert.ok(native, 'Native id3v2.4 tags should be present');

      let i = 0;
      assert.deepEqual(native[i++], { id: 'TIT2', value: 'Home' }, "['ID3v2.4'].TIT2");
      assert.deepEqual(native[i++], { id: 'TPE1', value: 'Explosions in the Sky' }, "['ID3v2.4'].TPE1");
      assert.deepEqual(native[i++], { id: 'TRCK', value: '5/14' }, "['ID3v2.4'].TRCK");
      assert.deepEqual(
        native[i++],
        {
          id: 'TALB',
          value: 'Friday Night Lights: Original Motion Picture Soundtrack'
        },
        "['ID3v2.4'].TALB"
      );
      assert.deepEqual(native[i++], { id: 'TPOS', value: '1/1' }, "['ID3v2.4'].TPOS");
      assert.deepEqual(native[i++], { id: 'TDRC', value: '2004-10-12' }, "['ID3v2.4'].TDRC");
      assert.deepEqual(native[i++], { id: 'TCON', value: 'Soundtrack' }, "['ID3v2.4'].TCON #1");
      assert.deepEqual(native[i++], { id: 'TCON', value: 'OST' }, "['ID3v2.4'].TCON #2");

      {
        const picTag = native[i++];
        assert.strictEqual(picTag.id, 'APIC', "['ID3v2.4'].APIC #1");
        const pic = picTag.value as IPicture;
        assert.deepEqual(pic.format, 'image/jpeg', "['ID3v2.4'].APIC #1 format");
        assert.deepEqual(pic.type, 'Cover (front)', "['ID3v2.4'].APIC #1 tagTypes");
        assert.deepEqual(pic.description, '', "['ID3v2.4'].APIC #1 description");
        assert.deepEqual(pic.data.length, 75818, "['ID3v2.4'].APIC #1 length");
      }

      assert.deepEqual(
        native[i++],
        {
          id: 'PRIV',
          value: { data: Uint8Array.from([0x02, 0x00, 0x00, 0x00]), owner_identifier: 'AverageLevel' }
        },
        "['ID3v2.4'].PRIV.AverageLevel"
      );
      assert.deepEqual(
        native[i++],
        {
          id: 'PRIV',
          value: { data: Uint8Array.from([0x08, 0x00, 0x00, 0x00]), owner_identifier: 'PeakValue' }
        },
        "['ID3v2.4'].PRIV.PeakValue"
      );
      assert.deepEqual(native[i++], { id: 'TCOM', value: 'Explosions in the Sky' }, "['ID3v2.4'].TCOM");
      assert.deepEqual(native[i++], { id: 'TDOR', value: '2004-10-12' }, "['ID3v2.4'].TDOR");
      assert.deepEqual(
        native[i++],
        {
          id: 'TIPL',
          value: { producer: ['Brian Grazer', 'Brian Reitzell', 'Peter Berg'] }
        },
        "['ID3v2.4'].TIPL"
      );
      assert.deepEqual(native[i++], { id: 'TMED', value: 'CD' }, "['ID3v2.4'].TIPL");
      assert.deepEqual(native[i++], { id: 'TPE2', value: 'Explosions in the Sky' }, "['ID3v2.4'].TPE2");
      assert.deepEqual(native[i++], { id: 'TPUB', value: 'Hip-O Records' }, "['ID3v2.4'].TPUB");
      assert.deepEqual(native[i++], { id: 'TSO2', value: 'Explosions in the Sky' }, "['ID3v2.4'].TSO2");
      assert.deepEqual(native[i++], { id: 'TSOP', value: 'Explosions in the Sky' }, "['ID3v2.4'].TSOP");
      assert.deepEqual(native[i++], { id: 'TSRC', value: 'USUG10400421' }, "['ID3v2.4'].TSRC");
      assert.deepEqual(native[i++], { id: 'TXXX:ASIN', value: 'B000649YAM' }, "['ID3v2.4'].TXXX:ASIN");
      assert.deepEqual(native[i++], { id: 'TXXX:Artists', value: 'Explosions in the Sky' }, "['ID3v2.4'].TXXX:Artists");
      assert.deepEqual(native[i++], { id: 'TXXX:BARCODE', value: '602498644102' }, "['ID3v2.4'].TXXX:BARCODE");
      assert.deepEqual(
        native[i++],
        { id: 'TXXX:CATALOGNUMBER', value: 'B0003663-02' },
        "['ID3v2.4'].TXXX:CATALOGNUMBER"
      );
      assert.deepEqual(
        native[i++],
        {
          id: 'TXXX:MusicBrainz Album Artist Id',
          value: '4236acde-2ce2-441c-a3d4-38d55f1b5474'
        },
        "['ID3v2.4'].TXXX:MusicBrainz Album Artist Id"
      );
      assert.deepEqual(
        native[i++],
        {
          id: 'TXXX:MusicBrainz Album Id',
          value: '2644f258-0619-4beb-a150-0c0069ca6699'
        },
        "['ID3v2.4'].TXXX:MusicBrainz Album Id"
      );
      assert.deepEqual(
        native[i++],
        {
          id: 'TXXX:MusicBrainz Album Release Country',
          value: 'US'
        },
        "['ID3v2.4'].TXXX:MusicBrainz Album Release Country"
      );
      assert.deepEqual(
        native[i++],
        {
          id: 'TXXX:MusicBrainz Album Status',
          value: 'official'
        },
        "['ID3v2.4'].TXXX:MusicBrainz Album Status"
      );
      assert.deepEqual(
        native[i++],
        {
          id: 'TXXX:MusicBrainz Album Type',
          value: 'album'
        },
        "['ID3v2.4'].TXXX:MusicBrainz Album Type #1"
      );
      assert.deepEqual(
        native[i++],
        {
          id: 'TXXX:MusicBrainz Album Type',
          value: 'soundtrack'
        },
        "['ID3v2.4'].TXXX:MusicBrainz Album Type #2"
      );
      assert.deepEqual(
        native[i++],
        {
          id: 'TXXX:MusicBrainz Artist Id',
          value: '4236acde-2ce2-441c-a3d4-38d55f1b5474'
        },
        "['ID3v2.4'].MusicBrainz Artist Id"
      );
      assert.deepEqual(
        native[i++],
        {
          id: 'TXXX:MusicBrainz Release Group Id',
          value: 'afe7c5d8-f8bc-32cf-b77d-8fb8561989a7'
        },
        "['ID3v2.4'].MusicBrainz Release Group Id"
      );
      assert.deepEqual(
        native[i++],
        {
          id: 'TXXX:MusicBrainz Release Track Id',
          value: 'd87d56d0-9bd3-3199-8ff3-d03dff3abb13'
        },
        "['ID3v2.4'].MusicBrainz Release Track Id"
      );
      assert.deepEqual(native[i++], { id: 'TXXX:PERFORMER', value: 'Explosions In The Sky' }, "['ID3v2.4'].PERFORMER");
      assert.deepEqual(native[i++], { id: 'TXXX:SCRIPT', value: 'Latn' }, "['ID3v2.4'].'SCRIPT");
      assert.deepEqual(native[i++], { id: 'TXXX:originalyear', value: '2004' }, "['ID3v2.4'].'originalyear");
      assert.deepEqual(
        native[i++],
        {
          id: 'UFID',
          value: {
            identifier: Uint8Array.from([
              0x38, 0x34, 0x38, 0x35, 0x31, 0x31, 0x35, 0x30, 0x2d, 0x61, 0x31, 0x39, 0x36, 0x2d, 0x34, 0x38, 0x66,
              0x61, 0x2d, 0x61, 0x64, 0x61, 0x35, 0x2d, 0x31, 0x61, 0x30, 0x31, 0x32, 0x62, 0x31, 0x63, 0x64, 0x39,
              0x65, 0x64
            ]),
            owner_identifier: 'http://musicbrainz.org'
          }
        },
        "['ID3v2.4'].UFID"
      );
      assert.deepEqual(native[i], undefined, 'End of metadata');
    });
  });

  // https://github.com/Borewit/music-metadata/pull/544
  describe('Common tag mappings', () => {
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
        assert.deepEqual(metadata.common.movementIndex, { no: 1, of: 4 }, 'metadata.common.movementIndex');
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
        assert.deepEqual(metadata.common.category, ['Podcast Category'], 'metadata.common.category');
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
        assert.strictEqual(metadata.common.podcasturl, 'http://podcast.url', 'metadata.common.podcasturl');
      });
    });

    it('Short Description', () => {
      const filename = 'mp3/pr-544-id3v24.mp3';
      const filePath = path.join(samplePath, filename);

      return mm.parseFile(filePath).then(metadata => {
        assert.deepEqual(metadata.common.subtitle, ['Short Description'], 'metadata.common.subscription');
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
        assert.strictEqual(metadata.common.albumartistsort, 'Album Artist Sort', 'metadata.common.albumartistsort');
      });
    });

    it('Album Sort', () => {
      const filename = 'mp3/pr-544-id3v24.mp3';
      const filePath = path.join(samplePath, filename);

      return mm.parseFile(filePath).then(metadata => {
        assert.strictEqual(metadata.common.albumsort, 'Album Sort', 'metadata.common.albumsort');
      });
    });

    it('Artist Sort', () => {
      const filename = 'mp3/pr-544-id3v24.mp3';
      const filePath = path.join(samplePath, filename);

      return mm.parseFile(filePath).then(metadata => {
        assert.strictEqual(metadata.common.artistsort, 'Artist Sort', 'metadata.common.artistsort');
      });
    });

    it('Composer Sort', () => {
      const filename = 'mp3/pr-544-id3v24.mp3';
      const filePath = path.join(samplePath, filename);

      return mm.parseFile(filePath).then(metadata => {
        assert.deepEqual(metadata.common.composersort, 'Composer Sort', 'metadata.common.composersort');
      });
    });

    it('Title Sort', () => {
      const filename = 'mp3/pr-544-id3v24.mp3';
      const filePath = path.join(samplePath, filename);

      return mm.parseFile(filePath).then(metadata => {
        assert.strictEqual(metadata.common.titlesort, 'Title Sort', 'metadata.common.titlesort');
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
          metadata.common.comment,
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
        assert.strictEqual(metadata.common.releasedate, '2020-06-29T00:00:00.000Z', 'metadata.common.date');
      });
    });

    it('Original Album', () => {
      const filename = 'mp3/pr-544-id3v24.mp3';
      const filePath = path.join(samplePath, filename);

      return mm.parseFile(filePath).then(metadata => {
        assert.strictEqual(metadata.common.originalalbum, 'Original Album', 'metadata.common.originalalbum');
      });
    });
  });
});
