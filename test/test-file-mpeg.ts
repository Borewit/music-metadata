import fs from 'node:fs';
import path from 'node:path';
import { PassThrough, Readable } from 'node:stream';
import { assert } from 'chai';
import { fromBuffer } from 'strtok3';
import type { IPopularimeter } from '../lib/id3v2/FrameParser.js';
import { ID3v24TagMapper } from '../lib/id3v2/ID3v24TagMapper.js';
import * as mm from '../lib/index.js';
import { MpegContentError, MpegFrameHeader } from '../lib/mpeg/MpegFrameHeader.js';
import { Parsers } from './metadata-parsers.js';
import { SourceStream, samplePath } from './util.js';

const t = assert;

describe('Parse MPEG', () => {
  it('should reject a reserved MPEG version with a content error', () => {
    assert.throws(
      () => new MpegFrameHeader(Uint8Array.of(0xff, 0xeb, 0x90, 0x00)),
      MpegContentError,
      'Cannot determine bit-rate'
    );
  });

  it('should parse MPEG-1 Audio Layer II ', async () => {
    /**
     * No errors found in file.
     *
     * ---------------------------
     * MPEG-length:        8359
     * Sample-rate:       44100
     * frame_size:         418
     * Samples per frame  1152
     *
     * Summary:
     * ===============
     * Total number of frames: 20, unpadded: 1, padded: 19
     * File is CBR. Bitrate of each frame is 128 kbps.
     * Exact length: 00:00
     *
     * FooBar: 22559 samples
     * Audacity: 23040 samples (assumed to be correct)
     *
     * Using CBR calculation: 23392.29375; same as Mutagen
     */
    const filePath = path.join(samplePath, '1971 - 003 - Sweet - Co-Co - CannaPower.mp2');

    const { format } = await mm.parseFile(filePath, { duration: true });

    t.deepEqual(format.tagTypes, ['ID3v2.3', 'ID3v1'], 'Tags: ID3v1 & ID3v2.3');
    t.strictEqual(format.container, 'MPEG', 'format.container = MPEG');
    t.strictEqual(format.codec, 'MPEG 1 Layer 2', 'format.codec = MPEG-1 Audio Layer II');
    t.strictEqual(format.bitrate, 128000, 'format.bitrate = 128 kbit/sec');
    t.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
    t.strictEqual(format.numberOfSamples, 23040, 'format.numberOfSamples = 23040');
    t.strictEqual(format.duration, 0.5224489795918368, 'duration [seconds]'); // validated 2017-04-09
    assert.isTrue(format.hasAudio, 'format.hasAudio');
    assert.isFalse(format.hasVideo, 'format.hasAudio');
  });

  describe('MPEG frame sync efficiency', () => {
    const emptyStreamSize = 5 * 1024 * 1024;
    const buf = new Uint8Array(emptyStreamSize).fill(0);

    it('should sync efficient from a stream', async () => {
      const streamReader = new SourceStream(buf);

      await mm.parseStream(streamReader, { mimeType: 'audio/mpeg' }, { duration: true });
    });

    it('should sync efficient, from a file', async () => {
      const tmpFilePath = path.join(samplePath, 'zeroes.mp3');

      fs.writeFileSync(tmpFilePath, buf);
      try {
        await mm.parseFile(tmpFilePath, { duration: true });
      } finally {
        fs.unlinkSync(tmpFilePath);
      }
    });
  });

  describe('mpeg parsing fails for irrelevant attributes #14', () => {
    it("should decode 04 - You Don't Know.mp3", async () => {
      /**
       * File has id3v2.3 & id3v1 tags
       * First frame is 224 kbps, rest 320 kbps
       * After id3v2.3, lots of 0 padding
       */

      const filePath = path.join(samplePath, "04 - You Don't Know.mp3");

      function checkFormat(format: mm.IFormat) {
        t.deepEqual(format.tagTypes, ['ID3v2.3', 'ID3v1'], 'format.tagTypes');
        t.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
        t.strictEqual(format.numberOfSamples, 9098496, 'format.numberOfSamples'); // FooBar says 3:26.329 seconds (9.099.119 samples)
        t.approximately(format.duration!, 206.3, 1 / 10, 'format.duration'); // FooBar says 3:26.329 seconds (9.099.119 samples)
        t.strictEqual(format.bitrate, 320000, 'format.bitrate = 128 kbit/sec');
        t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels 2 (stereo)');

        // t.strictEqual(format.codec, 'LAME3.91', 'format.codec');
        // t.strictEqual(format.codecProfile, 'CBR', 'format.codecProfile');
      }

      function checkCommon(common: mm.ICommonTagsResult) {
        t.strictEqual(common.title, "You Don't Know", 'common.title');
        t.deepEqual(common.artists, ['Reel Big Fish'], 'common.artists');
        t.strictEqual(common.albumartist, 'Reel Big Fish', 'common.albumartist');
        t.strictEqual(common.album, 'Why Do They Rock So Hard?', 'common.album');
        t.strictEqual(common.year, 1998, 'common.year');
        t.strictEqual(common.track.no, 4, 'common.track.no');
        t.strictEqual(common.track.of, null, 'common.track.of');
        t.strictEqual(common.disk.no, null, 'common.disk.no');
        t.strictEqual(common.disk.of, null, 'common.disk.of');
        t.deepEqual(common.genre, ['Ska-Punk'], 'common.genre');
        t.deepEqual(
          common.comment,
          [
            {
              descriptor: '',
              language: 'eng',
              text: 'Jive'
            }
          ],
          'common.genre'
        );
      }

      function checkID3v1(id3v1: mm.INativeTagDict) {
        t.deepEqual(id3v1.artist, ['Reel Big Fish'], 'id3v1.artist');
        t.deepEqual(id3v1.title, ["You Don't Know"], 'id3v1.title');
        t.deepEqual(id3v1.album, ['Why Do They Rock So Hard?'], 'id3v1.album');
        t.deepEqual(id3v1.year, ['1998'], '(id3v1.year');
        t.deepEqual(id3v1.track, [4], 'id3v1.track');
        t.deepEqual(id3v1.comment, ['000010DF 00000B5A 00007784'], 'id3v1.comment');
      }

      function checkID3v23(id3v23: mm.INativeTagDict) {
        t.deepEqual(id3v23.TPE2, ['Reel Big Fish'], 'native: TPE2');
        t.deepEqual(id3v23.TIT2, ["You Don't Know"], 'native: TIT2');
        t.deepEqual(id3v23.TALB, ['Why Do They Rock So Hard?'], 'native: TALB');
        t.deepEqual(id3v23.TPE1, ['Reel Big Fish'], 'native: TPE1');
        t.deepEqual(id3v23.TCON, ['Ska-Punk'], 'native: TCON');
        t.deepEqual(id3v23.TYER, ['1998'], 'native: TYER');
        t.deepEqual(id3v23.TCOM, ['CA'], 'native: TCOM'); // ToDo: common property?
        t.deepEqual(id3v23.TRCK, ['04'], 'native: TRCK');
        t.deepEqual(id3v23.COMM, [{ descriptor: '', language: 'eng', text: 'Jive' }], 'native: COMM');
      }

      const result = await mm.parseFile(filePath, { duration: true });

      checkFormat(result.format);
      checkCommon(result.common);
      checkID3v23(mm.orderTags(result.native['ID3v2.3']));
      checkID3v1(mm.orderTags(result.native.ID3v1));
    });

    it("should decode 07 - I'm Cool.mp3", async () => {
      // 'LAME3.91' found on position 81BCF=531407

      const filePath = path.join(samplePath, "07 - I'm Cool.mp3");

      function checkFormat(format: mm.IFormat) {
        t.deepEqual(format.tagTypes, ['ID3v2.3', 'ID3v1'], 'format.type');
        t.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
        // t.strictEqual(format.numberOfSamples, 8040655, 'format.numberOfSamples'); // FooBar says 8.040.655 samples
        t.approximately(format.duration!, 200.9, 1 / 10, 'format.duration'); // FooBar says 3:26.329 seconds
        t.strictEqual(format.bitrate, 320000, 'format.bitrate = 128 kbit/sec');
        t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels 2 (stereo)');
        // t.strictEqual(format.codec, 'LAME3.98r', 'format.codec'); // 'LAME3.91' found on position 81BCF=531407// 'LAME3.91' found on position 81BCF=531407
        // t.strictEqual(format.codecProfile, 'CBR', 'format.codecProfile');
      }

      function checkCommon(common: mm.ICommonTagsResult) {
        t.strictEqual(common.title, "I'm Cool", 'common.title');
        t.deepEqual(common.artists, ['Reel Big Fish'], 'common.artists');
        t.strictEqual(common.albumartist, 'Reel Big Fish', 'common.albumartist');
        t.strictEqual(common.album, 'Why Do They Rock So Hard?', 'common.album');
        t.strictEqual(common.year, 1998, 'common.year');
        t.strictEqual(common.track.no, 7, 'common.track.no');
        t.strictEqual(common.track.of, null, 'common.track.of');
        t.strictEqual(common.disk.no, null, 'common.disk.no');
        t.strictEqual(common.disk.of, null, 'common.disk.of');
        t.deepEqual(common.genre, ['Ska-Punk'], 'common.genre');
        t.deepEqual(common.comment, [{ descriptor: '', language: 'eng', text: 'Jive' }], 'common.comment');
      }

      function checkID3v23(native: mm.INativeTagDict) {
        t.deepEqual(native.TPE2, ['Reel Big Fish'], 'native: TPE2');
        t.deepEqual(native.TIT2, ["I'm Cool"], 'native: TIT2');
        t.deepEqual(native.TALB, ['Why Do They Rock So Hard?'], 'native: TALB');
        t.deepEqual(native.TPE1, ['Reel Big Fish'], 'native: TPE1');
        t.deepEqual(native.TCON, ['Ska-Punk'], 'native: TCON');
        t.deepEqual(native.TYER, ['1998'], 'native: TYER');
        t.deepEqual(native.TCOM, ['CA'], 'native: TCOM');
        t.deepEqual(native.TRCK, ['07'], 'native: TRCK');
        t.deepEqual(native.COMM, [{ descriptor: '', language: 'eng', text: 'Jive' }], 'native: COMM');
      }

      const result = await mm.parseFile(filePath, { duration: true });

      checkFormat(result.format);
      checkCommon(result.common);
      checkID3v23(mm.orderTags(result.native['ID3v2.3']));
    });
  });

  /**
   * Related to issue #38
   */
  describe('Handle corrupt MPEG-frames', () => {
    it('should handle corrupt frame causing negative frame data left', () => {
      /* ------------[outofbounds.mp3]-------------------------------------------
       Frame 2 header expected at byte 2465, but found at byte 3343.
       Frame 1 (bytes 2048-3343) was 1295 bytes long (expected 417 bytes).

       Frame 17 header expected at byte 19017, but found at byte 19019.
       Frame 16 (bytes 17972-19019) was 1047 bytes long (expected 1045 bytes).

       Frame 18 header expected at byte 20064, but found at byte 21107.
       Frame 17 (bytes 19019-21107) was 2088 bytes long (expected 1045 bytes).

       Summary:
       ===============
       Total number of frames: 19, unpadded: 3, padded: 16
       File is VBR. Average bitrate is 309 kbps.
       Exact length: 00:00
       ------------------------------------------------------------------------*/
      const filePath = path.join(samplePath, 'outofbounds.mp3');

      function checkFormat(format: mm.IFormat) {
        t.deepEqual(format.tagTypes, ['ID3v2.3', 'ID3v1'], 'format.type');
        t.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
        t.strictEqual(format.bitrate, 320000, 'format.bitrate = 128 kbit/sec');
        t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels 2 (stereo)');
      }

      return mm.parseFile(filePath, { duration: true }).then(metadata => {
        checkFormat(metadata.format);
      });
    });
  });

  const issueDir = path.join(samplePath);

  /**
   * Related to issue #39
   */
  describe('Multiple ID3 tags: ID3v2.3, ID3v2.4 & ID3v1', () => {
    function checkFormat(format: mm.IFormat, expectedDuration: number) {
      t.deepEqual(format.tagTypes, ['ID3v2.3', 'ID3v2.4', 'ID3v1'], 'format.tagTypes');
      t.strictEqual(format.duration, expectedDuration, 'format.duration');
      t.deepEqual(format.container, 'MPEG', 'format.container');
      t.deepEqual(format.codec, 'MPEG 1 Layer 3', 'format.codec');
      t.strictEqual(format.lossless, false, 'format.lossless');
      t.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
      t.strictEqual(format.bitrate, 320000, 'format.bitrate = 160 kbit/sec');
      t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels 2 (stereo)');
    }

    it('should parse multiple tag headers: ID3v2.3, ID3v2.4 & ID3v1', async () => {
      const metadata = await mm.parseFile(path.join(issueDir, 'id3-multi-02.mp3'));
      checkFormat(metadata.format, 230.29551020408164);
    });

    /**
     * Test on multiple headers: ID3v1, ID3v2.3, ID3v2.4 & ID3v2.4 ( 2x ID3v2.4 !! )
     */
    it('should decode mp3_01 with 2x ID3v2.4 header', async () => {
      // ToDo: currently second ID3v2.4 is overwritten. Either make both headers accessible or generate warning
      const metadata = await mm.parseFile(path.join(issueDir, 'id3-multi-01.mp3'));
      checkFormat(metadata.format, 0.1306122448979592);
    });
  });

  /**
   * Test decoding popularimeter
   */
  describe('POPM decoding', () => {
    it('check mapping function', () => {
      assert.deepEqual(
        ID3v24TagMapper.toRating({ email: 'user1@bla.com', rating: 0 } as IPopularimeter),
        {
          source: 'user1@bla.com',
          rating: undefined
        },
        'unknown rating'
      );
      assert.deepEqual(
        ID3v24TagMapper.toRating({ email: 'user1@bla.com', rating: 1 } as IPopularimeter),
        {
          source: 'user1@bla.com',
          rating: 0 / 255
        },
        'lowest rating'
      );
      assert.deepEqual(
        ID3v24TagMapper.toRating({ email: 'user1@bla.com', rating: 255 } as IPopularimeter),
        {
          source: 'user1@bla.com',
          rating: 1
        },
        'highest rating'
      );
    });

    it("from 'Yeahs-It's Blitz!.mp3'", async () => {
      const metadata = await mm.parseFile(path.join(issueDir, "02-Yeahs-It's Blitz! 2.mp3"), {
        duration: false
      });
      const idv23 = mm.orderTags(metadata.native['ID3v2.3']);
      assert.deepEqual(idv23.POPM[0], { email: 'no@email', rating: 128, counter: 0 }, 'ID3v2.3 POPM');
      assert.approximately(metadata.common.rating![0].rating!, 0.5, 1 / (2 * 254), 'Common rating');
    });

    it("from 'id3v2-lyrics.mp3'", async () => {
      const metadata = await mm.parseFile(path.join(issueDir, 'id3v2-lyrics.mp3'), { duration: false });
      const idv23 = mm.orderTags(metadata.native['ID3v2.3']);
      // Native rating value
      assert.deepEqual(idv23.POPM[0], { email: 'MusicBee', rating: 255, counter: 0 }, 'ID3v2.3 POPM');
      // Common rating value
      assert.approximately(metadata.common.rating![0].rating!, 1, 0, 'Common rating');
    });

    it('decode POPM without a counter field', async () => {
      const filePath = path.join(issueDir, 'issue-100.mp3');

      const metadata = await mm.parseFile(filePath, { duration: true });
      const idv23 = mm.orderTags(metadata.native['ID3v2.3']);
      assert.deepEqual(
        idv23.POPM[0],
        {
          counter: undefined,
          email: 'Windows Media Player 9 Series',
          rating: 255
        },
        'ID3v2.3 POPM'
      );
    });
  });

  describe('Calculate / read duration', () => {
    describe('headerless late VBR', () => {
      const filename = path.join(issueDir, 'mp3', 'late-vbr-no-xing.mp3');
      it('returns live MPEG metadata without waiting for duration or EOF', async () => {
        const stream = new PassThrough();
        stream.write(fs.readFileSync(filename));
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          const { format, common } = await Promise.race([
            mm.parseStream(stream, 'audio/mpeg', { duration: false, skipPostHeaders: true }),
            new Promise<never>((_, reject) => {
              timer = setTimeout(() => reject(new Error('Parser waited for live audio EOF')), 1000);
            })
          ]);
          assert.strictEqual(common.title, 'Late bitrate change');
          assert.strictEqual(format.sampleRate, 44100);
          assert.isUndefined(format.duration);
          assert.isFalse(stream.readableEnded);
        } finally {
          clearTimeout(timer);
          stream.destroy();
        }
      });
      for (const parser of Parsers) {
        it(`scans past the initial CBR region (${parser.description})`, async function () {
          const { format, common } = await parser.parse(() => this.skip(), filename, 'audio/mpeg', { duration: true });
          assert.strictEqual(common.title, 'Late bitrate change');
          assert.strictEqual(format.numberOfSamples, 156 * 1152);
          assert.strictEqual(format.duration, (156 * 1152) / 44100);
          assert.strictEqual(format.codecProfile, 'VBR');
        });
      }
      for (const missing of [1, 20]) {
        it(`does not count a partial final MPEG frame missing ${missing} bytes`, async () => {
          const data = fs.readFileSync(filename);
          const { format } = await mm.parseBuffer(data.subarray(0, -missing), 'audio/mpeg', { duration: true });
          assert.strictEqual(format.numberOfSamples, 155 * 1152);
          assert.strictEqual(format.duration, (155 * 1152) / 44100);
        });
      }
      it('keeps the size-based fast estimate when scanning is not requested', async () => {
        const { format } = await mm.parseFile(filename);
        assert.strictEqual(format.codecProfile, 'CBR');
        assert.isBelow(format.duration!, 3);
      });
      for (const tagged of [false, true]) {
        it(`counts a complete 104-byte last frame${tagged ? ' before ID3v1' : ''}`, async () => {
          // Remove the last two complete frames (261 + 208 bytes), leaving a valid frame boundary.
          const file = fs.readFileSync(filename).subarray(0, -469);
          const footer = Buffer.alloc(128);
          footer.write('TAG');
          const data = tagged ? Buffer.concat([file, footer]) : file;
          const { format } = await mm.parseBuffer(data, 'audio/mpeg', { duration: true });
          assert.strictEqual(format.numberOfSamples, 154 * 1152);
          assert.strictEqual(format.duration, (154 * 1152) / 44100);
        });
      }
      for (const source of ['buffer', 'sized stream', 'unknown-size stream'] as const) {
        it(`preserves ID3v1 after an incomplete last frame (${source})`, async () => {
          // Leave the final 104-byte frame ten bytes short, followed by a real ID3v1 tag.
          const file = fs.readFileSync(filename).subarray(0, -469 - 10);
          const footer = Buffer.alloc(128);
          footer.write('TAG');
          footer.write('Retained footer artist', 33);
          const data = Buffer.concat([file, footer]);
          const metadata =
            source === 'buffer'
              ? await mm.parseBuffer(data, 'audio/mpeg', { duration: true })
              : await mm.parseStream(
                  Readable.from([data], { objectMode: false }),
                  { mimeType: 'audio/mpeg', size: source === 'sized stream' ? data.length : undefined },
                  { duration: true }
                );
          assert.strictEqual(metadata.format.numberOfSamples, 153 * 1152);
          assert.strictEqual(metadata.format.duration, (153 * 1152) / 44100);
          // The current ID3v1 reader needs a known total size.
          if (source !== 'unknown-size stream') {
            assert.strictEqual(metadata.common.artist, 'Retained footer artist');
          }
        });
      }
      it('does not classify a differing fourth complete frame as CBR', async () => {
        const file = fs.readFileSync(filename);
        const tagEnd = 10 + file[9];
        let offset = tagEnd;
        for (let frame = 0; frame < 3; ++frame) {
          offset += new MpegFrameHeader(file.subarray(offset, offset + 4)).frameSize;
        }
        const data = Buffer.concat([file.subarray(0, offset), file.subarray(tagEnd + 32600)]);
        const fast = await mm.parseBuffer(data, 'audio/mpeg');
        assert.notStrictEqual(fast.format.codecProfile, 'CBR');
        assert.isUndefined(fast.format.duration);
        const scanned = await mm.parseBuffer(data, 'audio/mpeg', { duration: true });
        assert.strictEqual(scanned.format.numberOfSamples, 81 * 1152);
        assert.strictEqual(scanned.format.codecProfile, 'VBR');
      });
      it('preserves complete-frame metadata when the fourth frame is truncated', async () => {
        const file = fs.readFileSync(filename);
        let offset = 10 + file[9];
        for (let frame = 0; frame < 3; ++frame) {
          offset += new MpegFrameHeader(file.subarray(offset, offset + 4)).frameSize;
        }
        const data = Buffer.from(file.subarray(0, offset + 200));
        data[offset + 2] |= 0x04; // Reject a partial frame with a different sample rate.
        const { format } = await mm.parseStream(Readable.from([data], { objectMode: false }), 'audio/mpeg', {
          duration: true
        });
        assert.strictEqual(format.numberOfSamples, 3 * 1152);
        assert.strictEqual(format.sampleRate, 44100);
        assert.strictEqual(format.duration, (3 * 1152) / 44100);
      });
      for (const randomAccess of [false, true]) {
        it(`honors a short custom tokenizer read (random access=${randomAccess})`, async () => {
          const data = fs.readFileSync(filename);
          const frameOffset = 10 + data[9] + 32600;
          const tokenizer = fromBuffer(data);
          tokenizer.supportsRandomAccess = () => randomAccess;
          let closed = false;
          tokenizer.close = async () => {
            closed = true;
          };
          const read = tokenizer.readBuffer.bind(tokenizer);
          const ignore = tokenizer.ignore.bind(tokenizer);
          if (randomAccess) {
            tokenizer.readBuffer = (buffer, options) =>
              options?.length === 1 && options.position! > frameOffset ? Promise.resolve(0) : read(buffer, options);
          } else {
            tokenizer.ignore = length =>
              tokenizer.position > frameOffset && length > 32 ? ignore(length - 1) : ignore(length);
          }
          const { format } = await mm.parseFromTokenizer(tokenizer, { duration: true });
          assert.strictEqual(format.numberOfSamples, 78 * 1152);
          assert.strictEqual(format.bitrate, 128000);
          assert.isFalse(closed, 'caller owns the tokenizer');
        });
      }
      it('ignores the rate and channel mode of a truncated final frame', async () => {
        const file = fs.readFileSync(filename);
        const frameOffset = 10 + file[9] + 32600;
        const data = Buffer.from(file.subarray(0, frameOffset + 200));
        data[frameOffset + 2] |= 0x04; // 48 kHz instead of 44.1 kHz
        data[frameOffset + 3] &= 0x3f; // Stereo instead of mono
        for (const stream of [false, true]) {
          const { format } = stream
            ? await mm.parseStream(Readable.from([data], { objectMode: false }), 'audio/mpeg', { duration: true })
            : await mm.parseBuffer(data, 'audio/mpeg', { duration: true });
          assert.strictEqual(format.sampleRate, 44100);
          assert.strictEqual(format.numberOfChannels, 1);
          assert.strictEqual(format.bitrate, 128000);
          assert.strictEqual(format.duration, (78 * 1152) / 44100);
        }
      });
      it('does not classify a truncated differing-bitrate frame as VBR', async () => {
        const file = fs.readFileSync(filename);
        const tagEnd = 10 + file[9];
        // The complete two-second CBR portion is 32600 bytes; the next frame needs 731 bytes.
        const data = file.subarray(0, tagEnd + 32600 + 200);
        const { format } = await mm.parseBuffer(data, 'audio/mpeg', { duration: true });
        assert.strictEqual(format.numberOfSamples, 78 * 1152);
        assert.strictEqual(format.codecProfile, 'CBR');
        assert.strictEqual(format.bitrate, 128000);
      });
    });
    describe('VBR read from Xing header', () => {
      const filePath = path.join(issueDir, 'id3v2-xheader.mp3');

      Parsers.forEach(parser => {
        it(parser.description, async function () {
          const { format } = await parser.parse(() => this.skip(), filePath, 'audio/mpeg', { duration: false });
          assert.strictEqual(format.duration, 0.4963265306122449);
        });
      });
    });

    it('VBR: based on frame count if duration flag is set', async () => {
      const filePath = path.join(issueDir, 'Dethklok-mergeTagHeaders.mp3');
      // Wrap stream around buffer, to prevent the `stream.path` is provided
      const buffer = fs.readFileSync(filePath);
      const stream = new SourceStream(buffer);

      const metadata = await mm.parseStream(stream, { mimeType: 'audio/mpeg' }, { duration: true });
      // Changed expected result from 34.66 to 34.64, to 34,69 (strtok3@10.2.0) after updating strtok3
      assert.approximately(metadata.format.duration!, 34.69, 5 / 1000);
    });
  });

  it('It should be able to decode MPEG 2.5 Layer III', async () => {
    const filePath = path.join(issueDir, 'mp3', 'issue-347.mp3');
    const { format } = await mm.parseFile(filePath);
    assert.strictEqual(format.container, 'MPEG', 'format.container');
    assert.strictEqual(format.codec, 'MPEG 2.5 Layer 3', 'format.codec');
    assert.strictEqual(format.codecProfile, 'CBR', 'format.codec');
    assert.deepEqual(format.numberOfChannels, 1, 'format.numberOfChannels');
    assert.deepEqual(format.sampleRate, 8000, 'format.sampleRate');
    assert.deepEqual(format.tagTypes, [], 'format.tagTypes');
  });
});
