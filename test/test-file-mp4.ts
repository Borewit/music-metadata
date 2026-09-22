import { rejects } from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { promisify } from 'node:util';
import { assert } from 'chai';
import { EndOfStreamError, fromBuffer, fromStream } from 'strtok3';

import * as mm from '../lib/index.js';
import { Atom } from '../lib/mp4/Atom.js';
import { Mp4ContentError, StsdAtom, TrackHeaderAtom } from '../lib/mp4/AtomToken.js';
import { Parsers } from './metadata-parsers.js';
import { makeByteReadableStreamFromFile, makeDefaultReadableStreamFromFile, samplePath } from './util.js';

const mp4Samples = path.join(samplePath, 'mp4');

describe('Parse MPEG-4 files with iTunes metadata', () => {
  describe('Parse MPEG-4 files (.m4a)', () => {
    function checkFormat(format: mm.IFormat) {
      assert.deepEqual(format.lossless, false);
      assert.deepEqual(format.container, 'M4A/isom/iso2', 'container');
      assert.deepEqual(format.codec, 'MPEG-4/AAC', 'codec');
      assert.deepEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
      assert.deepEqual(format.sampleRate, 44100, 'format.sampleRate');
      assert.deepEqual(format.tagTypes, ['iTunes'], 'format.tagTypes');
      assert.approximately(format.duration!, 2.206, 1 / 500, 'format.duration');
      assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
      assert.deepEqual(format.bitsPerSample, 16, 'format.bitsPerSample');
      assert.approximately(format.bitrate!, 148000, 500, 'Calculate bit-rate');
      assert.deepEqual(format.hasAudio, true, 'format.hasAudio');
      assert.deepEqual(format.hasVideo, false, 'format.hasVideo');
    }

    function checkCommon(common: mm.ICommonTagsResult) {
      assert.strictEqual(common.title, 'Voodoo People (Pendulum Remix)', 'title');
      assert.strictEqual(common.artist, 'The Prodigy', 'artist');
      assert.strictEqual(common.albumartist, 'Pendulum', 'albumartist');
      assert.strictEqual(common.album, 'Voodoo People', 'album');
      assert.strictEqual(common.year, 2005, 'year');
      assert.strictEqual(common.track.no, 1, 'track no');
      assert.strictEqual(common.track.of, 12, 'track of');
      assert.strictEqual(common.disk.no, 1, 'disk no');
      assert.strictEqual(common.disk.of, 1, 'disk of');
      assert.strictEqual(common.genre![0], 'Electronic', 'genre');
      assert.strictEqual(common.picture![0].format, 'image/jpeg', 'picture 0 format');
      assert.strictEqual(common.picture![0].data.length, 196450, 'picture 0 length');
      assert.strictEqual(common.picture![1].format, 'image/jpeg', 'picture 1 format');
      assert.strictEqual(common.picture![1].data.length, 196450, 'picture 1 length');
    }

    function checkNativeTags(native: mm.INativeTagDict) {
      assert.ok(native, 'Native m4a tags should be present');

      assert.deepEqual(native.trkn, ['1/12'], 'm4a.trkn');
      assert.deepEqual(native.disk, ['1/1'], 'm4a.disk');
      assert.deepEqual(native.tmpo, [0], 'm4a.tmpo');
      assert.deepEqual(native.gnre, ['Electronic'], 'm4a.gnre');
      assert.deepEqual(native.stik, [1], 'm4a.stik');
      assert.deepEqual(native['©alb'], ['Voodoo People'], 'm4a.©alb');
      assert.deepEqual(native.aART, ['Pendulum'], 'm4a.aART');
      assert.deepEqual(native['©ART'], ['The Prodigy'], 'm4a.©ART');
      assert.deepEqual(native['©cmt'], ['(Pendulum Remix)'], 'm4a.©cmt');
      assert.deepEqual(native['©wrt'], ['Liam Howlett'], 'm4a.©wrt');
      assert.deepEqual(
        native['----:com.apple.iTunes:iTunNORM'],
        [' 0000120A 00001299 00007365 0000712F 0002D88B 0002D88B 00007F2B 00007F2C 0003C770 0001F5C7'],
        'm4a.----:com.apple.iTunes:iTunNORM'
      );
      assert.deepEqual(native['©nam'], ['Voodoo People (Pendulum Remix)'], 'm4a.©nam');
      assert.deepEqual(native['©too'], ['Lavf52.36.0'], 'm4a.©too');
      assert.deepEqual(native['©day'], ['2005'], 'm4a.@day');

      // Check album art
      assert.isDefined(native.covr);
      assert.strictEqual((native.covr[0] as mm.IPicture).format, 'image/jpeg', 'm4a.covr.format');
      assert.strictEqual((native.covr[0] as mm.IPicture).data.length, 196450, 'm4a.covr.data.length');
    }

    Parsers.forEach(parser => {
      it(parser.description, async function () {
        const filePath = path.join(mp4Samples, 'id4.m4a');

        const { native, format, common } = await parser.parse(() => this.skip(), filePath, 'audio/mp4');
        assert.ok(native, 'Native m4a tags should be present');

        checkFormat(format);
        checkCommon(common);
        checkNativeTags(mm.orderTags(native.iTunes));
      });
    });

    // Known-size Web Streams are covered by Parsers above. Omitting size models
    // an HTTP response without Content-Length, without relying on a remote host.
    for (const [description, makeStream] of [
      ['byte', makeByteReadableStreamFromFile],
      ['default', makeDefaultReadableStreamFromFile]
    ] as const) {
      it(`parseWebStream from ${description} ReadableStream without file size`, async () => {
        const { stream } = await makeStream(path.join(mp4Samples, 'id4.m4a'));
        try {
          const { native, format, common } = await mm.parseWebStream(stream, { mimeType: 'audio/mp4' });
          checkFormat(format);
          checkCommon(common);
          checkNativeTags(mm.orderTags(native.iTunes));
        } finally {
          await stream.cancel();
        }
      });
    }
  });

  /**
   * Ref: https://github.com/Borewit/music-metadata/issues/74
   */
  describe('should decode 8-byte unsigned integer', () => {
    Parsers.forEach(parser => {
      it(parser.description, async function () {
        const filePath = path.join(mp4Samples, 'issue-74.m4a');

        const { format, common, native } = await parser.parse(() => this.skip(), filePath, 'audio/mp4');

        assert.deepEqual(format.container, 'isom/iso2/mp41', 'format.container');
        assert.deepEqual(format.codec, 'MPEG-4/AAC', 'format.codec');
        assert.deepEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
        assert.deepEqual(format.sampleRate, 44100, 'format.sampleRate');
        assert.deepEqual(format.bitsPerSample, 16, 'format.bitsPerSample');
        assert.deepEqual(format.hasAudio, true, 'format.hasAudio');
        assert.deepEqual(format.hasVideo, false, 'format.hasVideo');

        assert.isDefined(native.iTunes, 'Native m4a tags should be present');
        assert.isAtLeast(native.iTunes.length, 1);

        assert.deepEqual(common.album, "Live at Tom's Bullpen in Dover, DE (2016-04-30)");
        assert.deepEqual(common.albumartist, "They Say We're Sinking");
        assert.deepEqual(common.comment, [
          { text: 'youtube rip\r\nSource: https://www.youtube.com/playlist?list=PLZ4QPxwBgg9TfsFVAArOBfuve_0e7zQaV' }
        ]);
      });
    });
  });

  /**
   * Ref: https://github.com/Borewit/music-metadata/issues/79
   */
  describe('should be able to extract the composer and artist', () => {
    Parsers.forEach(parser => {
      it(parser.description, async function () {
        const filePath = path.join(mp4Samples, 'issue-79.m4a');

        const { common, format } = await parser.parse(() => this.skip(), filePath, 'audio/mp4');

        assert.deepEqual(format.container, 'M4A/mp42/isom', 'format.container');
        assert.deepEqual(format.codec, 'MPEG-4/AAC', 'format.codec');
        assert.deepEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
        assert.deepEqual(format.sampleRate, 44100, 'format.sampleRate');
        assert.deepEqual(format.bitsPerSample, 16, 'format.bitsPerSample');
        assert.deepEqual(format.hasAudio, true, 'format.hasAudio');
        assert.deepEqual(format.hasVideo, false, 'format.hasVideo');

        assert.strictEqual(common.title, 'Uprising');
        assert.deepEqual(common.composer, ['Muse']);
        assert.deepEqual(common.artists, ['Muse']);
        assert.deepEqual(common.genre, ['Rock']);
        assert.strictEqual(common.date, '2009');
        assert.strictEqual(common.encodedby, 'iTunes 8.2.0.23, QuickTime 7.6.2');
        assert.deepEqual(common.disk, { no: 1, of: 1 });
        assert.deepEqual(common.track, { no: 1, of: null });
      });
    });
  });

  describe('Parse MPEG-4 Audio Book files (.m4b)', () => {
    describe('audio book from issue issue #127', () => {
      Parsers.forEach(parser => {
        it(parser.description, async function () {
          const filePath = path.join(mp4Samples, 'issue-127.m4b');

          const { common, format, native } = await parser.parse(() => this.skip(), filePath, 'audio/mp4');

          assert.deepEqual(format.container, 'M4A/3gp5/isom', 'format.container');
          assert.deepEqual(format.codec, 'MPEG-4/AAC', 'format.codec');
          assert.deepEqual(format.hasAudio, true, 'format.hasAudio');
          assert.deepEqual(format.hasVideo, false, 'format.hasVideo');

          assert.strictEqual(common.title, 'GloriesIreland00-12_librivox');
          assert.deepEqual(common.artists, ['Joseph Dunn']);
          assert.deepEqual(common.genre, ['Audiobook']);
          assert.strictEqual(common.encodedby, 'Chapter and Verse V 1.5');
          assert.deepEqual(common.disk, { no: null, of: null });
          assert.deepEqual(common.track, { no: 1, of: null });
          assert.deepEqual(common.comment, [{ text: 'https://archive.org/details/glories_of_ireland_1801_librivox' }]);

          const iTunes = mm.orderTags(native.iTunes);
          assert.deepEqual(iTunes.stik, [2], 'iTunes.stik = 2 = Audiobook'); // Ref: http://www.zoyinc.com/?p=1004
        });
      });
    });

    describe('Parse chapters', async () => {
      /**
       * Source audio-book: https://librivox.org/the-babys-songbook-by-walter-crane/
       */
      describe('BabysSongbook_librivox.m4b', async () => {
        function checkMetadata(metadata: mm.IAudioMetadata) {
          const { common, format } = metadata;

          assert.deepEqual(format.container, 'M4A/3gp5/isom', 'format.container');
          assert.deepEqual(format.codec, 'MPEG-4/AAC', 'format.codec');
          assert.approximately(format.duration!, 991.213, 1 / 500, 'format.duration');
          assert.deepEqual(format.hasAudio, true, 'format.hasAudio');
          assert.deepEqual(format.hasVideo, false, 'format.hasVideo');

          assert.strictEqual(common.title, 'Babys Songbook', 'common.title');
          assert.deepEqual(common.artists, ['Walter Crane'], 'common.artists');
          assert.deepEqual(common.genre, ['Audiobook']);
          assert.strictEqual(common.encodedby, 'Chapter and Verse V 1.5');
          assert.deepEqual(common.disk, { no: null, of: null }, 'common.disk');
          assert.deepEqual(common.track, { no: null, of: null }, 'common.track');
          assert.isUndefined(common.comment, 'common.comment');

          const iTunes = mm.orderTags(metadata.native.iTunes);
          assert.deepEqual(iTunes.stik, [2], 'iTunes.stik = 2 = Audiobook'); // Ref: http://www.zoyinc.com/?p=1004

          assert.deepEqual(format.chapters, [
            {
              sampleOffset: 45056,
              timeScale: 44100,
              start: 0,
              title: "01 - Baby's Opera: 01 - Girls and Boys"
            },
            {
              sampleOffset: 2695168,
              timeScale: 44100,
              start: 2690214,
              title: "02 - Baby's Opera: 02 - The Mulberry Bush"
            },
            {
              sampleOffset: 5083136,
              timeScale: 44100,
              start: 5072343,
              title: "03 - Baby's Opera: 03 - Oranges and Lemons"
            },
            {
              sampleOffset: 8352768,
              timeScale: 44100,
              start: 8335466,
              title: "04 - Baby's Opera: 04 - St. Paul's Steeple"
            },
            {
              sampleOffset: 10544128,
              timeScale: 44100,
              start: 10539994,
              title: "05 - Baby's Opera: 05 - My Lady's Garden"
            },
            {
              sampleOffset: 12284928,
              timeScale: 44100,
              start: 12260367,
              title: "06 - Baby's Opera: 12 - Dickory Dock"
            },
            {
              sampleOffset: 14125056,
              timeScale: 44100,
              start: 14112293,
              title: "07 - Baby's Opera: 22 - Baa!Baa!Black Sheep"
            },
            {
              sampleOffset: 16410624,
              timeScale: 44100,
              start: 16405319,
              title: "08 - Baby's Bouquet: 01 - Dedication and Polly put the Kettle On"
            },
            {
              sampleOffset: 19068928,
              timeScale: 44100,
              start: 19051667,
              title: "09 - Baby's Bouquet: 02 - Hot Cross Buns"
            },
            {
              sampleOffset: 21685248,
              timeScale: 44100,
              start: 21653824,
              title: "10 - Baby's Bouquet: 03 - The Little Woman and the Pedlar"
            },
            {
              sampleOffset: 30461952,
              timeScale: 44100,
              start: 30429742,
              title: "11 - Baby's Bouquet: 04 - The Little Disaster"
            },
            {
              sampleOffset: 37761024,
              timeScale: 44100,
              start: 37750318,
              title: "12 - Baby's Bouquet: 05 - The Old Woman of Norwich"
            },
            {
              sampleOffset: 39628800,
              timeScale: 44100,
              start: 39602731,
              title: "13 - Baby's Bouquet: 12 - Lucy Locket"
            },
            {
              sampleOffset: 41500672,
              timeScale: 44100,
              start: 41498151,
              title: "14 - Baby's Bouquet: 18 - The North Wind & the Robin"
            }
          ]);
        }

        const filePath = path.join(mp4Samples, 'BabysSongbook_librivox.m4b');

        it('from a file', async () => {
          let metadata: mm.IAudioMetadata;
          const stream = fs.createReadStream(filePath);
          try {
            metadata = await mm.parseStream(stream, { mimeType: 'audio/mp4' }, { includeChapters: true });
          } finally {
            stream.close();
          }
          checkMetadata(metadata);
        });

        it('from a stream', async () => {
          const stream = fs.createReadStream(filePath);
          const metadata = await mm.parseStream(stream, { mimeType: 'audio/mp4' }, { includeChapters: true });
          stream.close();

          checkMetadata(metadata);
        });
      });
    });
  });

  describe('Parse MPEG-4 Video (.mp4)', () => {
    describe('Parse TV episode', () => {
      Parsers.forEach(parser => {
        it(parser.description, async function () {
          const filePath = path.join(mp4Samples, 'Mr. Pickles S02E07 My Dear Boy.mp4');

          const { common, format, native } = await parser.parse(() => this.skip(), filePath, 'video/mp4');

          assert.deepEqual(format.container, 'mp42/isom', 'format.container');
          assert.deepEqual(format.codec, 'MPEG-4/AAC+AC-3+CEA-608', 'format.codec');
          assert.deepEqual(format.hasAudio, true, 'format.hasAudio');
          assert.deepEqual(format.hasVideo, true, 'format.hasVideo');

          assert.deepEqual(common.title, 'My Dear Boy');
          assert.deepEqual(common.tvEpisode, 7);
          assert.deepEqual(common.tvEpisodeId, '017');
          assert.deepEqual(common.tvSeason, 2);
          assert.deepEqual(common.tvShow, 'Mr. Pickles');

          assert.deepEqual(common.artist, 'Mr. Pickles');
          assert.deepEqual(common.artists, ['Mr. Pickles']);
          assert.deepEqual(common.albumartist, 'Mr. Pickles');
          assert.deepEqual(common.copyright, '© & TM - Cartoon Network - 2016');

          const iTunes = mm.orderTags(native.iTunes);
          assert.deepEqual(iTunes.stik, [10], 'iTunes.stik = 10 = TV Show'); // Ref: http://www.zoyinc.com/?p=1004
        });
      });
    });
  });

  describe('Parse Apple’s QuickTime File Format', () => {
    Parsers.forEach(parser => {
      it(parser.description, async () => {
        const filePath = path.join(mp4Samples, 'sample_640x360.mov');
        const { format } = await mm.parseFile(filePath);
        assert.strictEqual(format.container, 'qt');
      });
    });
  });

  describe('should support extended atom header', () => {
    Parsers.forEach(parser => {
      it(parser.description, async function () {
        const filePath = path.join(mp4Samples, 'issue-133.m4a');

        const { format } = await parser.parse(() => this.skip(), filePath, 'video/mp4');
        assert.deepEqual(format.container, 'M4A/mp42/isom', 'format.container');
        assert.deepEqual(format.codec, 'MPEG-4/AAC', 'format.codec');
        assert.deepEqual(format.hasAudio, true, 'format.hasAudio');
        assert.deepEqual(format.hasVideo, false, 'format.hasVideo');
      });
    });
  });

  describe("Handle dashed atom-ID's", () => {
    Parsers.forEach(parser => {
      it(parser.description, async function () {
        const filePath = path.join(mp4Samples, 'issue-151.m4a');

        const { format, common } = await parser.parse(() => this.skip(), filePath, 'video/mp4');
        assert.deepEqual(format.container, 'mp42/isom', 'format.container');
        assert.deepEqual(format.codec, 'MPEG-4/AAC+MP4S', 'format.codec');
        assert.deepEqual(format.hasAudio, true, 'format.hasAudio');
        assert.deepEqual(format.hasVideo, false, 'format.hasVideo');

        assert.deepEqual(common.album, 'We Don`t Need to Whisper');
        assert.deepEqual(common.albumartist, 'Angels and Airwaves');
        assert.deepEqual(common.artist, 'Angels and Airwaves');
        assert.deepEqual(common.artists, ['Angels and Airwaves']);
        assert.strictEqual(common.bpm, 89);
        assert.deepEqual(common.genre, ['Rock']);
        assert.strictEqual(common.title, 'Distraction');
      });
    });
  });

  describe('Parse Trumpsta (Djuro Remix)', () => {
    Parsers.forEach(parser => {
      it(parser.description, async function () {
        const filePath = path.join(mp4Samples, '01. Trumpsta (Djuro Remix).m4a');

        const { format, common } = await parser.parse(() => this.skip(), filePath, 'audio/m4a');

        assert.deepEqual(format.container, 'M4A/mp42/isom', 'format.container');
        assert.deepEqual(format.codec, 'MPEG-4/AAC', 'format.codec');
        assert.deepEqual(format.hasAudio, true, 'format.hasAudio');
        assert.deepEqual(format.hasVideo, false, 'format.hasVideo');

        assert.deepEqual(common.album, 'Trumpsta (Remixes)');
        assert.deepEqual(common.albumartist, 'Contiez');
        assert.deepEqual(common.artist, 'Contiez');
        assert.deepEqual(common.artists, ['Contiez']);
        assert.strictEqual(common.title, 'Trumpsta (Djuro Remix)');
      });
    });
  });

  /**
   * Related issue: https://github.com/Borewit/music-metadata/issues/318
   */
  it('Be able to handle garbage behind mdat root atom', async () => {
    /**
     * Sample file with 1024 zeroes appended
     */
    const m4aFile = path.join(mp4Samples, 'issue-318.m4a');

    const metadata = await mm.parseFile(m4aFile);
    const { format, common, quality } = metadata;
    assert.strictEqual(format.container, 'M4A/mp42/isom', 'format.container');
    assert.strictEqual(format.codec, 'MPEG-4/AAC', 'format.codec');
    assert.deepEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
    assert.deepEqual(format.sampleRate, 44100, 'format.sampleRate');
    assert.deepEqual(format.bitsPerSample, 16, 'format.bitsPerSample');
    assert.deepEqual(format.tagTypes, ['iTunes'], 'format.tagTypes');
    assert.deepEqual(format.hasAudio, true, 'format.hasAudio');
    assert.deepEqual(format.hasVideo, false, 'format.hasVideo');

    assert.strictEqual(common.artist, 'Tool', 'common.artist');
    assert.strictEqual(common.title, 'Fear Inoculum', 'common.title');

    assert.includeDeepMembers(
      quality.warnings,
      [{ message: 'Error at offset=117501: box.id=0' }],
      'check for warning regarding box.id=0'
    );
  });

  // https://github.com/Borewit/music-metadata/issues/387
  it('Handle box.id = 0000', async () => {
    const { format, common } = await mm.parseFile(path.join(mp4Samples, 'issue-387.m4a'));
    assert.strictEqual(format.container, 'M4A/mp42/isom', 'format.container');
    assert.strictEqual(format.codec, 'MPEG-4/AAC', 'format.codec');
    assert.approximately(format.duration!, 224.00290249433107, 1 / 200, 'format.duration');
    assert.approximately(format.sampleRate!, 44100, 1 / 200, 'format.sampleRate');
    assert.deepEqual(format.hasAudio, true, 'format.hasAudio');
    assert.deepEqual(format.hasVideo, false, 'format.hasVideo');

    assert.strictEqual(common.artist, 'Chris Brown', 'common.artist');
    assert.strictEqual(common.title, 'Look At Me Now', 'common.title');
    assert.strictEqual(common.album, 'Look At Me Now (feat. Lil Wayne & Busta Rhymes) - Single', 'common.album');
  });

  it('Extract creation and modified time', async () => {
    const filePath = path.join(mp4Samples, 'Apple  voice memo.m4a');

    const { format, native } = await mm.parseFile(filePath);

    assert.strictEqual(format.container, 'M4A/isom/mp42', 'format.container');
    assert.strictEqual(format.codec, 'MPEG-4/AAC', 'format.codec');
    assert.approximately(format.duration!, 1.024, 1 / 2000, 'format.duration');
    assert.strictEqual(format.sampleRate, 48000, 'format.sampleRate');
    assert.deepEqual(format.hasAudio, true, 'format.hasAudio');
    assert.deepEqual(format.hasVideo, false, 'format.hasVideo');

    assert.strictEqual(format.creationTime!.toISOString(), '2021-01-02T17:42:46.000Z', 'format.modificationTime');
    assert.strictEqual(format.modificationTime!.toISOString(), '2021-01-02T17:43:25.000Z', 'format.modificationTime');

    const iTunes = mm.orderTags(native.iTunes);
    assert.strictEqual(iTunes.date[0], '2021-01-02T17:42:05Z', 'moov.udta.date');
  });

  // https://github.com/Borewit/music-metadata/issues/744
  it('Select the audio track from mp4', async () => {
    const filePath = path.join(mp4Samples, 'issue-744.mp4');

    const { format } = await mm.parseFile(filePath);

    assert.strictEqual(format.container, 'isom/iso2/mp41', 'format.container');
    assert.strictEqual(format.codec, 'MPEG-4/AAC', 'format.codec');
    assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
    assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
    assert.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample');
    assert.approximately(format.duration!, 360.8, 1 / 20, 'format.duration');
    assert.deepEqual(format.hasAudio, true, 'format.hasAudio');
    assert.deepEqual(format.hasVideo, true, 'format.hasVideo');
  });

  // https://github.com/Borewit/music-metadata/issues/749
  it('Handle 0 length box', async () => {
    const filePath = path.join(mp4Samples, 'issue-749.m4a');

    // The stripped fixture is missing the last 16 bytes declared by moov/udta/meta.
    // Reject that truncation, then restore the tail to exercise its size-zero final box.
    await rejects(mm.parseFile(filePath), /Atom size exceeds remaining bytes/);
    const buffer = Buffer.concat([fs.readFileSync(filePath), Buffer.alloc(16)]);
    const { format, common } = await mm.parseBuffer(buffer, 'audio/mp4');

    assert.strictEqual(format.container, 'M4A/mp42/isom', 'format.container');
    assert.strictEqual(format.codec, 'MPEG-4/AAC', 'format.codec');
    assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
    assert.strictEqual(format.sampleRate, 48000, 'format.sampleRate');
    assert.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample');
    assert.approximately(format.duration!, 1563.16, 1 / 200, 'format.duration');
    assert.deepEqual(format.hasAudio, true, 'format.hasAudio');
    assert.deepEqual(format.hasVideo, false, 'format.hasVideo');

    assert.strictEqual('S2E32 : Audio', common.title, 'common.title');
  });

  it('moov.udta.meta.ilst.rate mapping', async () => {
    const filePath = path.join(samplePath, 'rating', 'testcase.m4a');
    const { format, common } = await mm.parseFile(filePath);

    assert.deepEqual(format.hasAudio, true, 'format.hasAudio');
    assert.deepEqual(format.hasVideo, false, 'format.hasVideo');

    assert.isDefined(common.rating, 'Expect rating property to be present');
    assert.equal(common.rating[0].rating, 0.8, 'Vorbis tag rating score of 80%');
    assert.equal(mm.ratingToStars(common.rating[0].rating), 4, 'Vorbis tag rating conversion');
  });

  it("'stsd' atom: Handle empty sample entry description", async () => {
    const filePath = path.join(mp4Samples, 'frag_bunny.mp4');
    const { format, common } = await mm.parseFile(filePath);

    assert.strictEqual(format.container, 'mp42/avc1/iso5', 'format.container');
    assert.strictEqual(format.codec, 'MPEG-4/AAC', 'format.codec');
    assert.deepEqual(format.hasAudio, true, 'format.hasAudio');
    assert.deepEqual(format.hasVideo, true, 'format.hasVideo');
    assert.approximately(format.duration!, 60.13968253968254, 1 / 1000000, 'format.duration');

    assert.strictEqual(common.title, undefined, 'common.title');
  });

  it('should be able handle fragmented duration', async () => {
    const filePath = path.join(mp4Samples, 'fragmented-duration.mp4');
    const { format } = await mm.parseFile(filePath);

    assert.strictEqual(format.container, 'isom/iso6/iso2/avc1/mp41', 'format.container');
    assert.strictEqual(format.codec, 'MPEG-4/AAC', 'format.codec');
    assert.approximately(format.duration!, 96.98331065759638, 1 / 1000000, 'format.duration');
    assert.strictEqual(format.hasAudio, true, 'format.hasAudio');
    assert.strictEqual(format.hasVideo, true, 'format.hasVideo');
    assert.approximately(format.bitrate!, 127947, 1 / 2, 'format.bitrate');
  });

  it('bitrate id4.m4a', async () => {
    const filePath = path.join(mp4Samples, 'id4.m4a');
    const { format } = await mm.parseFile(filePath, { duration: true });

    assert.strictEqual(format.container, 'M4A/isom/iso2', 'format.container');
    assert.strictEqual(format.codec, 'MPEG-4/AAC', 'format.codec');
    assert.strictEqual(format.hasAudio, true, 'format.hasAudio');
    assert.strictEqual(format.hasVideo, false, 'format.hasVideo');
    assert.approximately(format.bitrate!, 147916, 1, 'format.bitrate');
  });

  // https://github.com/Borewit/music-metadata/issues/2672
  it("'tkhd' atom version 1: keep track-id of each track distinct", async () => {
    // Version 1 tkhd atoms have 64-bit creation/modification times; reading the
    // track-id at the version 0 offset yields 0 for every track, making the
    // chapter text track overwrite the audio track.
    const filePath = path.join(mp4Samples, 'issue-2672.m4b');
    const { format } = await mm.parseFile(filePath);

    assert.strictEqual(format.container, 'isom/iso2/mp41', 'format.container');
    assert.strictEqual(format.codec, 'MPEG-4/AAC', 'format.codec');
    assert.strictEqual(format.numberOfChannels, 1, 'format.numberOfChannels');
    assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
    assert.approximately(format.duration!, 4, 1 / 1000, 'format.duration');
    assert.strictEqual(format.hasAudio, true, 'format.hasAudio');
    assert.strictEqual(format.hasVideo, false, 'format.hasVideo');
  });
});

describe('Sample Description (stsd) atom: entry table', () => {
  const textEncoder = new TextEncoder();

  /**
   * A sample entry: 32-bit size, 4-character data format, 6 reserved bytes and the data reference index.
   * A SampleEntry extends Box, so the size covers the size field itself.
   *
   * Ref: ISO/IEC 14496-12, 8.5.2
   */
  function sampleEntry(dataFormat: string, size: number, dataReferenceIndex: number): Uint8Array {
    const entry = new Uint8Array(size);
    const view = new DataView(entry.buffer);
    view.setUint32(0, size);
    entry.set(textEncoder.encode(dataFormat), 4);
    view.setUint16(14, dataReferenceIndex);
    return entry;
  }

  function sampleDescription(...entries: Uint8Array[]): Uint8Array {
    const buf = new Uint8Array(8 + entries.reduce((total, entry) => total + entry.length, 0));
    new DataView(buf.buffer).setUint32(4, entries.length); // entry_count
    let offset = 8;
    for (const entry of entries) {
      buf.set(entry, offset);
      offset += entry.length;
    }
    return buf;
  }

  it('reads a single sample entry', () => {
    const buf = sampleDescription(sampleEntry('mp4a', 36, 1));

    const { header, table } = new StsdAtom(buf.length).get(buf, 0);

    assert.strictEqual(header.numberOfEntries, 1, 'numberOfEntries');
    assert.deepEqual(
      table.map(entry => entry.dataFormat),
      ['mp4a'],
      'dataFormat'
    );
  });

  it('rejects GHSA-f94x-6692-553q without blocking the process', async () => {
    // Use a separate process: a synchronous loop cannot be stopped by Mocha's timeout.
    const script = `
      import { strict as assert } from 'node:assert';
      import { parseBuffer, UnexpectedFileContentError } from ${JSON.stringify(new URL('../lib/index.js', import.meta.url).href)};
      const buffer = Buffer.from('00000010667479704d34412000000000000000207374736400000000ffffffff000000006d7034610000000000000001', 'hex');
      await assert.rejects(parseBuffer(buffer, {mimeType: 'audio/mp4'}), error =>
        error instanceof UnexpectedFileContentError && /Invalid stsd sample entry size: 0/.test(error.message));
    `;
    await promisify(execFile)(
      process.execPath,
      [...process.execArgv, '--max-old-space-size=512', '--input-type=module', '--eval', script],
      {
        timeout: 10000,
        killSignal: 'SIGKILL'
      }
    );
  });

  for (const size of [0, 1, 4, 15, 17, 0xffffffff]) {
    it(`rejects a sample entry declaring an invalid size of ${size}`, () => {
      const buf = sampleDescription(sampleEntry('mp4a', 16, 1));
      new DataView(buf.buffer).setUint32(8, size);

      assert.throws(() => new StsdAtom(buf.length).get(buf, 0), Mp4ContentError, 'Invalid stsd sample entry size');
    });
  }

  it('accepts an empty table and a minimum-size sample entry', () => {
    const empty = sampleDescription();
    assert.isEmpty(new StsdAtom(empty.length).get(empty, 0).table);
    const buf = sampleDescription(sampleEntry('mett', 16, 1));
    assert.deepEqual(new StsdAtom(buf.length).get(buf, 0).table, [
      {
        dataFormat: 'mett',
        dataReferenceIndex: 1,
        description: undefined
      }
    ]);
  });

  it('rejects an entry count exceeding the available entries', () => {
    const buf = sampleDescription(sampleEntry('mp4a', 16, 1));
    new DataView(buf.buffer).setUint32(4, 0xffffffff);

    assert.throws(() => new StsdAtom(buf.length).get(buf, 0), Mp4ContentError, 'Truncated stsd sample entry');
  });

  it('checks the atom boundary at a nonzero offset, ignoring bytes after the atom', () => {
    const payload = sampleDescription(sampleEntry('mp4a', 36, 1));
    const buf = new Uint8Array(payload.length + 16);
    buf.set(payload, 8);

    assert.lengthOf(new StsdAtom(payload.length).get(buf, 8).table, 1);
    assert.throws(
      () => new StsdAtom(payload.length - 1).get(buf, 8),
      Mp4ContentError,
      'Invalid stsd sample entry size'
    );
  });

  it('rejects a truncated stsd header', () => {
    assert.throws(() => new StsdAtom(7).get(new Uint8Array(8), 0), Mp4ContentError, 'Truncated stsd header');
  });

  it('rejects a truncated sample entry size field', () => {
    const buf = sampleDescription(new Uint8Array(3));
    assert.throws(() => new StsdAtom(buf.length).get(buf, 0), Mp4ContentError, 'Truncated stsd sample entry');
  });

  // Each entry is located from the size of the one before it, so an error in that arithmetic
  // only shows up from the second entry onwards
  it('reads every entry of a table holding more than one, of differing sizes', () => {
    const buf = sampleDescription(sampleEntry('mp4a', 36, 1), sampleEntry('ac-3', 48, 2), sampleEntry('alac', 20, 3));

    const { header, table } = new StsdAtom(buf.length).get(buf, 0);

    assert.strictEqual(header.numberOfEntries, 3, 'numberOfEntries');
    assert.deepEqual(
      table.map(entry => entry.dataFormat),
      ['mp4a', 'ac-3', 'alac'],
      'dataFormat'
    );
    assert.deepEqual(
      table.map(entry => entry.dataReferenceIndex),
      [1, 2, 3],
      'dataReferenceIndex'
    );
  });
});

describe('Track Header (tkhd) atom', () => {
  const MAC_EPOCH_OFFSET = 2082844800; // seconds between 1904-01-01 and 1970-01-01

  for (const [version, minimumLength] of [
    [0, 38],
    [1, 50]
  ]) {
    it(`rejects truncated version ${version} headers at every field boundary`, () => {
      for (let length = 0; length < minimumLength; ++length) {
        const buf = new Uint8Array(length);
        if (length > 0) {
          buf[0] = version;
        }
        assert.throws(() => new TrackHeaderAtom(length).get(buf, 0), Mp4ContentError, 'Truncated tkhd header');
      }
    });

    it(`respects version ${version} atom and buffer boundaries at a nonzero offset`, () => {
      const off = 8;
      const buf = new Uint8Array(off + minimumLength + 8);
      buf[off] = version;
      new DataView(buf.buffer).setUint16(off + minimumLength - 2, 256);

      assert.strictEqual(new TrackHeaderAtom(minimumLength).get(buf, off).volume, 256);
      assert.throws(
        () => new TrackHeaderAtom(minimumLength - 1).get(buf, off),
        Mp4ContentError,
        'Truncated tkhd header'
      );
      assert.throws(
        () => new TrackHeaderAtom(minimumLength).get(buf.subarray(0, off + minimumLength - 1), off),
        Mp4ContentError,
        'Truncated tkhd header'
      );
    });

    it(`rejects issue #2747 version ${version} through parseBuffer with a parse error`, async () => {
      function box(name: string, body: Buffer): Buffer {
        const buf = Buffer.alloc(8 + body.length);
        buf.writeUInt32BE(buf.length);
        buf.write(name, 4, 4, 'ascii');
        body.copy(buf, 8);
        return buf;
      }

      for (const length of [0, 4, 30, minimumLength - 1]) {
        const body = Buffer.alloc(length);
        if (length > 0) {
          body[0] = version;
        }
        const buf = Buffer.concat([
          box('ftyp', Buffer.from('M4A \0\0\0\0M4A isom')),
          box('moov', box('trak', box('tkhd', body)))
        ]);

        await rejects(
          mm.parseBuffer(buf, { mimeType: 'audio/mp4' }),
          error => error instanceof mm.UnexpectedFileContentError && /Truncated tkhd header/.test(error.message)
        );
      }
    });
  }

  it('reads version 1 (64-bit) creation time, modification time, track ID and duration at the right offsets', () => {
    const buf = new Uint8Array(64);
    const view = new DataView(buf.buffer);
    buf[0] = 1; // version
    buf[3] = 0x07; // flags (track enabled, in movie, in preview)
    view.setBigUint64(4, BigInt(MAC_EPOCH_OFFSET + 1_500_000_000)); // creation time
    view.setBigUint64(12, BigInt(MAC_EPOCH_OFFSET + 1_600_000_000)); // modification time
    view.setUint32(20, 7); // track ID
    view.setBigUint64(28, BigInt(5_000_000_000)); // duration (exceeds 32 bits)

    const header = new TrackHeaderAtom(buf.length).get(buf, 0);

    assert.strictEqual(header.version, 1, 'version');
    assert.strictEqual(header.trackId, 7, 'trackId');
    assert.strictEqual(header.duration, 5_000_000_000, 'duration');
    assert.strictEqual(header.creationTime.getTime(), 1_500_000_000 * 1000, 'creationTime');
    assert.strictEqual(header.modificationTime.getTime(), 1_600_000_000 * 1000, 'modificationTime');
  });

  it('reads version 0 (32-bit) track ID and duration', () => {
    const buf = new Uint8Array(64);
    const view = new DataView(buf.buffer);
    buf[0] = 0; // version
    buf[3] = 0x07; // flags
    view.setUint32(4, MAC_EPOCH_OFFSET + 1000); // creation time
    view.setUint32(8, MAC_EPOCH_OFFSET + 2000); // modification time
    view.setUint32(12, 3); // track ID
    view.setUint32(20, 12345); // duration

    const header = new TrackHeaderAtom(buf.length).get(buf, 0);

    assert.strictEqual(header.version, 0, 'version');
    assert.strictEqual(header.trackId, 3, 'trackId');
    assert.strictEqual(header.duration, 12345, 'duration');
    assert.strictEqual(header.creationTime.getTime(), 1000 * 1000, 'creationTime');
    assert.strictEqual(header.modificationTime.getTime(), 2000 * 1000, 'modificationTime');
  });

  it('throws on an unsupported version', () => {
    const buf = new Uint8Array(64);
    buf[0] = 2; // version

    assert.throws(() => new TrackHeaderAtom(buf.length).get(buf, 0), /Invalid tkhd version header/);
  });
});

describe('Sample Description (stsd) atom', () => {
  const textEncoder = new TextEncoder();
  const timeScale = 44100;

  function concat(...parts: Uint8Array[]): Uint8Array {
    const buf = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
    let offset = 0;
    for (const part of parts) {
      buf.set(part, offset);
      offset += part.length;
    }
    return buf;
  }

  /**
   * Build a box: 32-bit size, 4-character type, then the payload.
   */
  function box(type: string, ...payloads: Uint8Array[]): Uint8Array {
    const header = new Uint8Array(8);
    const body = concat(...payloads);
    new DataView(header.buffer).setUint32(0, header.length + body.length);
    header.set(textEncoder.encode(type), 4);
    return concat(header, body);
  }

  function handlerBox(handlerType: string): Uint8Array {
    const payload = new Uint8Array(24);
    payload.set(textEncoder.encode(handlerType), 8);
    return box('hdlr', payload);
  }

  function trackHeaderBox(trackId: number): Uint8Array {
    const payload = new Uint8Array(84);
    new DataView(payload.buffer).setUint32(12, trackId);
    return box('tkhd', payload);
  }

  function mediaHeaderBox(): Uint8Array {
    const payload = new Uint8Array(24);
    const view = new DataView(payload.buffer);
    view.setUint32(12, timeScale);
    view.setUint32(16, timeScale); // duration: one second
    return box('mdhd', payload);
  }

  function sampleSizeBox(): Uint8Array {
    return box('stsz', new Uint8Array(12)); // sample_size and sample_count both zero
  }

  /**
   * A sample description box holding a single entry of the given size.
   *
   * Ref: ISO/IEC 14496-12, 8.5.2. A SampleEntry is 16 bytes: the box header, 6 reserved bytes and the
   * data reference index. An AudioSampleEntry adds 20 bytes on top, whereas other sample entry classes,
   * such as a MetaDataSampleEntry, may be no larger than the 16-byte base.
   */
  function sampleDescriptionBox(dataFormat: string, entrySize: number, audioLike = false): Uint8Array {
    const header = new Uint8Array(8);
    new DataView(header.buffer).setUint32(4, 1); // entry_count

    const entry = new Uint8Array(entrySize);
    const view = new DataView(entry.buffer);
    view.setUint32(0, entrySize);
    entry.set(textEncoder.encode(dataFormat), 4);
    view.setUint16(14, 1); // data_reference_index

    if (audioLike) {
      // Populate the bytes an AudioSampleEntry would use, to prove they are not read from a non-audio track
      view.setUint16(24, 2); // channel count
      view.setUint16(26, 16); // sample size
      view.setUint16(32, timeScale); // sample rate
    }
    return box('stsd', header, entry);
  }

  interface ITrackSpec {
    handler: string;
    dataFormat: string;
    entrySize: number;
    audioLike?: boolean;
    handlerAfterMinf?: boolean;
  }

  const videoTrack: ITrackSpec = { handler: 'vide', dataFormat: 'avc1', entrySize: 36 };

  function trackBox(trackId: number, spec: ITrackSpec): Uint8Array {
    const hdlr = handlerBox(spec.handler);
    const stbl = box('stbl', sampleDescriptionBox(spec.dataFormat, spec.entrySize, spec.audioLike), sampleSizeBox());
    const minf = box('minf', stbl);
    // Readers are required to accept any box order
    const mdia = spec.handlerAfterMinf
      ? box('mdia', mediaHeaderBox(), minf, hdlr)
      : box('mdia', hdlr, mediaHeaderBox(), minf);
    return box('trak', trackHeaderBox(trackId), mdia);
  }

  function mp4(...tracks: ITrackSpec[]): Uint8Array {
    const ftyp = box(
      'ftyp',
      textEncoder.encode('isom'),
      new Uint8Array([0, 0, 2, 0]),
      textEncoder.encode('isomiso2mp41')
    );
    const moov = box('moov', ...tracks.map((spec, index) => trackBox(index + 1, spec)));
    return concat(ftyp, moov, box('mdat', new Uint8Array(8)));
  }

  // A metadata sample entry is not an AudioSampleEntry, and may be shorter than one
  for (const entrySize of [16, 18, 24, 34, 36]) {
    it(`parses a metadata sample entry of ${entrySize} bytes`, async () => {
      const buf = mp4(videoTrack, { handler: 'meta', dataFormat: 'djmd', entrySize });

      const { format } = await mm.parseBuffer(buf, { mimeType: 'video/mp4' });

      assert.strictEqual(format.hasVideo, true, 'format.hasVideo');
      assert.isUndefined(format.numberOfChannels, 'format.numberOfChannels');
    });
  }

  it('does not derive audio properties from a metadata track', async () => {
    const buf = mp4(videoTrack, { handler: 'meta', dataFormat: 'djmd', entrySize: 36, audioLike: true });

    const { format } = await mm.parseBuffer(buf, { mimeType: 'video/mp4' });

    assert.isUndefined(format.numberOfChannels, 'format.numberOfChannels');
    assert.isUndefined(format.sampleRate, 'format.sampleRate');
    assert.isUndefined(format.bitsPerSample, 'format.bitsPerSample');
    assert.isUndefined(format.trackInfo[1].audio, 'metadata track is not described as audio');
  });

  it('derives audio properties from a sound track', async () => {
    const buf = mp4(videoTrack, { handler: 'soun', dataFormat: 'mp4a', entrySize: 36, audioLike: true });

    const { format } = await mm.parseBuffer(buf, { mimeType: 'video/mp4' });

    assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
    assert.strictEqual(format.sampleRate, timeScale, 'format.sampleRate');
    assert.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample');
  });

  it('reports the data format of a non-audio track', async () => {
    const buf = mp4(videoTrack, { handler: 'meta', dataFormat: 'djmd', entrySize: 20 });

    const { format } = await mm.parseBuffer(buf, { mimeType: 'video/mp4' });

    assert.strictEqual(format.trackInfo[0].codecName, '<avc1>', 'video track codec name');
    assert.strictEqual(format.trackInfo[1].codecName, '<djmd>', 'metadata track codec name');
  });

  it('handles the handler box declared after the media information box', async () => {
    const buf = mp4(videoTrack, {
      handler: 'soun',
      dataFormat: 'mp4a',
      entrySize: 36,
      audioLike: true,
      handlerAfterMinf: true
    });

    const { format } = await mm.parseBuffer(buf, { mimeType: 'video/mp4' });

    assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
    assert.strictEqual(format.sampleRate, timeScale, 'format.sampleRate');
  });
});

describe('MP4 atom size validation (GHSA-qc8q-pw95-mq6c)', () => {
  function box(name: string, payload: Buffer = Buffer.alloc(0), size?: bigint, extended = false): Buffer {
    const header = Buffer.alloc(extended ? 16 : 8);
    header.writeUInt32BE(extended ? 1 : Number(size ?? BigInt(header.length + payload.length)));
    header.write(name, 4, 'latin1');
    if (extended) {
      header.writeBigUInt64BE(size ?? BigInt(header.length + payload.length), 8);
    }
    return Buffer.concat([header, payload]);
  }

  for (const stream of [false, true]) {
    describe(stream ? 'unknown-size stream' : 'buffer', () => {
      async function rejectBeforeAllocation(buffer: Buffer, message: RegExp): Promise<void> {
        const tokenizer = stream
          ? await fromStream(Readable.from([buffer], { objectMode: false }))
          : fromBuffer(buffer);
        tokenizer.fileInfo.mimeType = 'audio/mp4';
        const readToken = tokenizer.readToken.bind(tokenizer);
        tokenizer.readToken = (token, position) => {
          // Fail safely if a regression attempts to allocate an attacker-sized buffer.
          assert.ok(token.len <= 1024, `Unvalidated allocation: ${token.len}`);
          return readToken(token, position);
        };
        try {
          await rejects(
            mm.parseFromTokenizer(tokenizer),
            error => error instanceof Mp4ContentError && message.test(error.message)
          );
        } finally {
          await tokenizer.close();
        }
      }

      for (const name of ['mvhd', 'stsd', 'stsz', 'date', 'ftyp', 'chap']) {
        for (const size of [0xffffffffffffffffn, 0x20000000000000n, 0x10000000n]) {
          it(`rejects ${name} with extended size ${size} before allocation`, async () => {
            await rejectBeforeAllocation(box(name, Buffer.alloc(0), size, true), /size exceeds|buffering limit/);
          });
        }
        it(`rejects oversized normal ${name} before allocation`, async () => {
          await rejectBeforeAllocation(box(name, Buffer.alloc(0), 0xffffffffn), /size exceeds|buffering limit/);
        });
      }

      for (const size of [2n, 7n]) {
        it(`rejects normal size ${size} smaller than its header`, async () => {
          await rejectBeforeAllocation(box('date', Buffer.alloc(0), size), /Invalid atom size/);
        });
      }
      for (const size of [0n, 1n, 8n, 15n]) {
        it(`rejects extended size ${size} smaller than its header`, async () => {
          await rejectBeforeAllocation(box('date', Buffer.alloc(0), size, true), /Invalid atom size/);
        });
      }

      it('rejects a child crossing its parent even when bytes follow the parent', async () => {
        const parent = box('moov', box('date', Buffer.alloc(0), 32n));
        await rejectBeforeAllocation(Buffer.concat([parent, box('free', Buffer.alloc(32))]), /size exceeds remaining/);
      });

      it('rejects a truncated child header', async () => {
        await rejectBeforeAllocation(box('moov', Buffer.alloc(7)), /Truncated atom header/);
      });

      it('rejects an extended header crossing its parent', async () => {
        await rejectBeforeAllocation(
          box('moov', box('date', Buffer.alloc(0), 16n, true).subarray(0, 8)),
          /Truncated extended atom header/
        );
      });

      it('caps a metadata payload even inside a large declared container', async () => {
        const child = box('date', Buffer.alloc(0), 64n * 1024n * 1024n + 9n);
        await rejectBeforeAllocation(box('moov', child, 0x10000000n), /size exceeds|buffering limit/);
      });
    });
  }

  describe('open-ended containers', () => {
    async function parseStream(payload: Buffer): Promise<mm.IAudioMetadata> {
      const stream = Readable.from([box('moov', payload, 0n)], { objectMode: false });
      try {
        return await mm.parseStream(stream, { mimeType: 'audio/mp4' });
      } finally {
        stream.destroy();
      }
    }

    it('accepts clean EOF after finite children', async () => {
      const { native, format } = await parseStream(Buffer.concat([box('date', Buffer.from('2026')), box('free')]));
      assert.deepEqual(native.iTunes, [{ id: 'date', value: '2026' }]);
      assert.isTrue(format.hasAudio, 'Post-processing completed');
    });

    it('accepts an empty container', async () => {
      await parseStream(Buffer.alloc(0));
    });

    it('accepts nested open-ended containers', async () => {
      const { native } = await parseStream(box('udta', box('date', Buffer.from('2026')), 0n));
      assert.deepEqual(native.iTunes, [{ id: 'date', value: '2026' }]);
    });

    for (const length of [1, 2, 3, 4, 5, 6, 7]) {
      it(`rejects a partial child header of ${length} bytes`, async () => {
        await rejects(parseStream(box('free').subarray(0, length)), /Truncated atom header/);
      });
    }

    it('does not swallow EOF in an extended child header', async () => {
      await rejects(parseStream(box('date', Buffer.alloc(0), 16n, true).subarray(0, 12)), EndOfStreamError);
    });

    it('does not swallow EOF in a child payload', async () => {
      await rejects(parseStream(box('date', Buffer.from('abc'), 16n)), EndOfStreamError);
    });
  });

  for (const length of [0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 11]) {
    it(`rejects an ftyp payload of ${length} bytes before reading brands`, async () => {
      const tokenizer = fromBuffer(
        Buffer.concat([box('ftyp', Buffer.alloc(length)), box('date', Buffer.from('2026'))]),
        { fileInfo: { mimeType: 'audio/mp4' } }
      );
      await rejects(mm.parseFromTokenizer(tokenizer), /Invalid ftyp payload length/);
      assert.strictEqual(tokenizer.position, 8, 'Only the atom header was consumed');
    });
  }

  for (const name of ['ftyp', 'chap']) {
    it(`rejects an oversized incremental ${name} before consuming its payload`, async () => {
      const tokenizer = await fromStream(
        Readable.from([box(name, Buffer.alloc(8), 64n * 1024n * 1024n + 12n)], { objectMode: false })
      );
      tokenizer.fileInfo.mimeType = 'audio/mp4';
      try {
        await rejects(
          mm.parseFromTokenizer(tokenizer),
          error => error instanceof Mp4ContentError && /buffering limit/.test(error.message)
        );
        assert.strictEqual(tokenizer.position, 8, 'Only the atom header was consumed');
      } finally {
        await tokenizer.close();
      }
    });
  }

  it('accepts an eight-byte ftyp payload and preserves the following sibling', async () => {
    const { format, native } = await mm.parseBuffer(
      Buffer.concat([box('ftyp', Buffer.from([0x4d, 0x34, 0x41, 0x20, 0, 0, 0, 0])), box('date', Buffer.from('2026'))]),
      'audio/mp4'
    );
    assert.strictEqual(format.container, 'M4A');
    assert.deepEqual(native.iTunes, [{ id: 'date', value: '2026' }]);
  });

  it('dispatches large media payloads without applying the metadata limit', async () => {
    const size = 128n * 1024n * 1024n;
    const tokenizer = await fromStream(
      Readable.from([box('mdat', Buffer.alloc(0), size, true)], { objectMode: false })
    );
    tokenizer.fileInfo.mimeType = 'audio/mp4';
    let skipped = 0;
    tokenizer.ignore = async length => {
      skipped += length;
      return length;
    };
    try {
      await mm.parseFromTokenizer(tokenizer);
      assert.strictEqual(skipped, Number(size) - 16);
    } finally {
      await tokenizer.close();
    }
  });

  it('checks the remaining file bytes at a nonzero offset', async () => {
    const tokenizer = fromBuffer(Buffer.concat([box('free'), box('date', Buffer.alloc(0), 16n)]));
    await tokenizer.ignore(8);
    await rejects(
      Atom.readAtom(tokenizer, async () => assert.fail('Must not dispatch'), null, 100),
      /size exceeds remaining/
    );
  });

  it('accepts a size-zero container and child ending exactly at the boundary', async () => {
    const { native } = await mm.parseBuffer(box('moov', box('date', Buffer.from('2026'), 0n), 0n), 'audio/mp4');
    assert.deepEqual(native.iTunes, [{ id: 'date', value: '2026' }]);
  });

  it('accepts an extended metadata data atom and preserves the following sibling', async () => {
    const dataHeader = Buffer.alloc(8);
    dataHeader.writeUInt32BE(1); // UTF-8 data type
    const title = box('©nam', box('data', Buffer.concat([dataHeader, Buffer.from('Title')]), undefined, true));
    const { common, native } = await mm.parseBuffer(
      box('moov', Buffer.concat([box('ilst', title), box('date', Buffer.from('2026'))])),
      'audio/mp4'
    );
    assert.strictEqual(common.title, 'Title');
    assert.deepEqual(
      native.iTunes.find(tag => tag.id === 'date'),
      { id: 'date', value: '2026' }
    );
  });

  it('does not apply the metadata buffering limit to media data', async () => {
    const size = 128n * 1024n * 1024n;
    const tokenizer = await fromStream(
      Readable.from([box('mdat', Buffer.alloc(0), size, true)], { objectMode: false })
    );
    try {
      await Atom.readAtom(
        tokenizer,
        async (atom, length) => {
          assert.strictEqual(atom.header.name, 'mdat');
          assert.strictEqual(length, Number(size) - 16);
        },
        null,
        Number.POSITIVE_INFINITY
      );
    } finally {
      await tokenizer.close();
    }
  });
});
