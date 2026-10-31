import path from 'node:path';
import { Readable } from 'node:stream';
import { assert, expect } from 'chai';
import { fromBuffer, fromFile, fromStream } from 'strtok3';
import type { IFormat, INativeTagDict } from '../lib/index.js';
import * as mm from '../lib/index.js';
import { Parsers } from './shared/metadata-parsers.js';
import { samplePath } from './shared/util.js';

const wavSamples = path.join(samplePath, 'wav');

describe('Parse RIFF/WAVE audio format', () => {
  it('rejects an allocating chunk that exceeds its RIFF container', async () => {
    const file = Buffer.alloc(20);
    file.write('RIFF');
    file.writeUInt32LE(12, 4);
    file.write('WAVEfmt ', 8);
    file.writeUInt32LE(0xffffffff, 16);
    await expect(mm.parseBuffer(file, 'audio/wav')).to.be.rejectedWith(
      mm.UnexpectedFileContentError,
      'Chunk fmt  size 4294967295 exceeds remaining RIFF data 0'
    );
  });

  it('rejects an INFO value exceeding its LIST container before reading it', async () => {
    const file = Buffer.alloc(32);
    file.write('RIFF');
    file.writeUInt32LE(24, 4);
    file.write('WAVELIST', 8);
    file.writeUInt32LE(12, 16);
    file.write('INFOINAM', 20);
    file.writeUInt32LE(0xffffffff, 28);
    await expect(mm.parseBuffer(file, 'audio/wav')).to.be.rejectedWith(
      mm.UnexpectedFileContentError,
      'RIFF INFO tag size exceeds remaining LIST data'
    );
  });

  function checkExifTags(exif: INativeTagDict) {
    assert.deepEqual(exif.IART, ['Beth Hart & Joe Bonamassa'], 'exif.IART');
    assert.deepEqual(exif.ICRD, ['2011'], 'exif.ICRD');
    assert.deepEqual(exif.INAM, ["Sinner's Prayer"], 'exif.INAM');
    assert.deepEqual(exif.IPRD, ["Don't Explain"], 'exif.IPRD');
    assert.deepEqual(exif.ITRK, ['1/10'], 'exif.ITRK');
  }

  /**
   * Looks like RIFF/WAV not fully supported yet in MusicBrainz Picard: https://tickets.metabrainz.org/browse/PICARD-653?jql=text%20~%20%22RIFF%22.
   * This file has been fixed with Mp3Tag to have a valid ID3v2.3 tag
   */
  it('should parse LIST-INFO (EXIF)', async () => {
    const filename = "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.3].wav";
    const filePath = path.join(samplePath, filename);

    function checkFormat(format: IFormat) {
      assert.deepEqual(format.container, 'WAVE', 'format.container');
      assert.deepEqual(format.codec, 'PCM', 'format.codec');
      assert.strictEqual(format.lossless, true);
      assert.sameMembers(format.tagTypes, ['exif', 'ID3v2.3'], "format.tagTypes = ['exif', 'ID3v2.3']");
      assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
      assert.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample = 16 bits');
      assert.strictEqual(format.bitrate, 1411200, 'format.bitrate = 1411200 bits/s');
      assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels = 2 channels');
      assert.strictEqual(format.numberOfSamples, 93624, 'format.numberOfSamples = 93624');
      assert.strictEqual(
        format.duration,
        2.1229931972789116,
        'format.duration = ~2.123 seconds (checked with Adobe Audition)'
      );
      assert.isTrue(format.hasAudio, 'format.hasAudio');
      assert.isFalse(format.hasVideo, 'format.hasAudio');
    }

    // Parse wma/asf file
    const metadata = await mm.parseFile(filePath);
    // Check wma format
    checkFormat(metadata.format);
    // Check native tags
    checkExifTags(mm.orderTags(metadata.native.exif));
  });

  // Issue https://github.com/Borewit/music-metadata/issues/75
  it('should be able to handle complex nested chunk structures', async () => {
    const filePath = path.join(samplePath, 'issue_75.wav');

    const metadata = await mm.parseFile(filePath);
    assert.deepEqual(metadata.format.container, 'WAVE', 'format.container');
    assert.deepEqual(metadata.format.codec, 'PCM', 'format.codec');
  });

  it('should map RIFF tags to common', async () => {
    // Metadata edited with Adobe Audition CC 2018.1
    const filePath = path.join(samplePath, 'riff_adobe_audition.wav');

    const metadata = await mm.parseFile(filePath);
    const format = metadata.format;
    assert.strictEqual(format.lossless, true);
    assert.deepEqual(format.container, 'WAVE', 'format.container');
    assert.deepEqual(format.codec, 'PCM', 'format.codec');
    assert.deepEqual(format.bitsPerSample, 24);
    assert.deepEqual(format.sampleRate, 48000);
    assert.strictEqual(format.bitrate, 2304000, 'format.bitrate = 2304000 bits/s');
    assert.deepEqual(format.numberOfSamples, 13171);
    assert.deepEqual(format.duration, 0.27439583333333334, '~2.274 (checked with Adobe Audition)');
    assert.deepEqual(format.tagTypes, ['exif']);

    const exif = mm.orderTags(metadata.native.exif);
    assert.deepEqual(exif.IART, ['Wolfgang Amadeus Mozart'], 'exif.IART: Original Artist');
    assert.deepEqual(exif.ICMS, ['Louis Walker'], 'exif.ICMS: Commissioned');
    assert.deepEqual(exif.ICMT, ['Comments here!'], 'exif.ICMT: Comments');
    assert.deepEqual(exif.ICOP, ['Copyright 2018']);
    assert.deepEqual(exif.ICRD, ['2018-04-26T13:26:19-05:00']);
    assert.deepEqual(exif.IENG, ['Engineer'], 'exif.IENG: Engineer');
    assert.deepEqual(exif.IARL, ['https://github.com/borewit/music-metadata'], 'exif.IARL: Archival Location');
    assert.deepEqual(exif.IGNR, ['Blues'], 'exif.IGNR: Genre');
    assert.deepEqual(exif.IKEY, ['neat; cool; riff; tags'], 'exif.IKEY: Keywords');
    assert.deepEqual(exif.IMED, ['CD'], 'exif.IMED: Original Medium');
    assert.deepEqual(exif.INAM, ['The Magic Flute'], 'exif.INAM: Display Title');
    assert.deepEqual(exif.IPRD, ['La clemenzo di Tito'], 'exif.IPRD: Product');
    assert.deepEqual(exif.ISBJ, ['An opera in two acts'], 'exif.ISBJ: Subject');
    assert.deepEqual(exif.ISFT, ['Adobe Audition CC 2018.1 (Macintosh)']);
    assert.deepEqual(exif.ISRC, ['Foo Bar'], 'exif.ISRC Source Supplier');
    assert.deepEqual(exif.ITCH, ['Technician'], 'exif.ITCH: Technician');

    const common = metadata.common;
    assert.deepEqual(common.artists, ['Wolfgang Amadeus Mozart']);
    assert.deepEqual(common.title, 'The Magic Flute');
    assert.deepEqual(common.album, 'La clemenzo di Tito');
    assert.deepEqual(common.date, '2018-04-26T13:26:19-05:00');
    assert.deepEqual(common.year, 2018);
    assert.deepEqual(common.encodedby, 'Adobe Audition CC 2018.1 (Macintosh)');
    assert.deepEqual(common.comment, [{ text: 'Comments here!' }]);
    assert.deepEqual(common.genre, ['Blues']);
    assert.deepEqual(common.engineer, ['Engineer']);
    assert.deepEqual(common.technician, ['Technician']);
    assert.deepEqual(common.media, 'CD');
  });

  it('should handle be able to handle odd chunk & padding', async () => {
    const filePath = path.join(samplePath, 'issue-161.wav');

    const metadata = await mm.parseFile(filePath, { duration: true });
    const format = metadata.format;
    assert.strictEqual(format.container, 'WAVE', 'format.container');
    assert.strictEqual(format.codec, 'PCM', 'format.codec');
    assert.strictEqual(format.lossless, true);
    assert.strictEqual(format.sampleRate, 48000);
    assert.strictEqual(format.bitsPerSample, 24);
    assert.strictEqual(format.bitrate, 2304000, 'format.bitrate = 2304000 bits/s');
    assert.strictEqual(format.numberOfSamples, 363448);
    assert.strictEqual(metadata.format.duration!, format.numberOfSamples! / format.sampleRate!, "file's duration");
  });

  describe('RIFF INFO copyright and source semantics', () => {
    const cases = [
      ['latin1', '© 2026 Mötley', '© 2026 Mötley'],
      ['windows1252', '© 2026 “Mötley” – 10 €', '© 2026 “Mötley” – 10 €'],
      ['utf8-after-info', '© 2026 音楽', '© 2026 音楽'],
      ['no-terminator', '© 2026X', '© 2026X'],
      ['id3-first', '© 2026 ID3', '© 2026 INFO'],
      ['info-first', '© 2026 ID3', '© 2026 INFO €'],
      ['repeated', '© 2026 Mötley', '© 2026 Mötley']
    ];
    for (const [name, copyright, infoCopyright] of cases) {
      for (const parser of Parsers) {
        it(`${name} (${parser.description})`, async function () {
          const { common, native, format } = await parser.parse(
            () => this.skip(),
            path.join(wavSamples, `info-copyright-${name}.wav`),
            'audio/wav'
          );
          assert.strictEqual(common.copyright, copyright);
          assert.strictEqual(common.title, 'After copyright');
          assert.strictEqual(format.numberOfSamples, 800);
          assert.strictEqual(format.duration, 0.1);
          const exif = mm.orderTags(native.exif);
          assert.deepEqual(exif.ICOP, name === 'repeated' ? ['First copyright', infoCopyright] : [infoCopyright]);
          assert.deepEqual(
            exif.ISRC,
            ['USXYZ2600002'],
            'RIFF source is preserved even when it resembles a recording code'
          );
          if (name === 'id3-first' || name === 'info-first') {
            const id3 = mm.orderTags(native['ID3v2.3']);
            assert.deepEqual(id3.TCOP, ['© 2026 ID3']);
            assert.deepEqual(id3.TSRC, ['USABC2600001']);
            assert.deepEqual(common.isrc, ['USABC2600001']);
          } else {
            assert.isUndefined(common.isrc, 'RIFF source/supplier is not a recording identifier');
          }
        });
      }
    }
    for (const [name, copyright] of [
      ['riff_adobe_audition.wav', 'Copyright 2018'],
      ['issue-161.wav', '2018']
    ]) {
      for (const parser of Parsers) {
        it(`maps existing ${name} (${parser.description})`, async function () {
          const { common, native } = await parser.parse(() => this.skip(), path.join(samplePath, name), 'audio/wav');
          assert.strictEqual(common.copyright, copyright);
          assert.deepEqual(mm.orderTags(native.exif).ICOP, [copyright]);
          assert.isUndefined(common.isrc);
        });
      }
    }
    for (const parser of Parsers) {
      it(`omits unsupported-code-page copyright (${parser.description})`, async function () {
        const { common, native, quality, format } = await parser.parse(
          () => this.skip(),
          path.join(wavSamples, 'info-copyright-unsupported.wav'),
          'audio/wav'
        );
        assert.isUndefined(common.copyright);
        assert.isUndefined(common.isrc);
        assert.isUndefined(native.exif);
        assert.strictEqual(format.numberOfSamples, 800);
        assert.includeDeepMembers(quality.warnings, [
          { message: 'Unsupported RIFF CSET code page: 1251; LIST/INFO tags will be omitted' }
        ]);
      });
    }
    it('preserves the lifetime of a caller-owned tokenizer', async () => {
      const tokenizer = await fromFile(path.join(wavSamples, 'info-copyright-utf8-after-info.wav'));
      const close = tokenizer.close.bind(tokenizer);
      let closed = false;
      tokenizer.close = async () => {
        closed = true;
        await close();
      };
      try {
        const { common } = await mm.parseFromTokenizer(tokenizer);
        assert.strictEqual(common.copyright, '© 2026 音楽');
        assert.isFalse(closed);
        assert.isAbove(tokenizer.position, 0);
      } finally {
        await close();
      }
    });
  });

  describe('LIST/INFO character encoding', () => {
    const samples = [
      { file: 'cest_latin1-default.wav', title: 'Mötley' },
      { file: 'cest_latin1-zero.wav', title: 'Mötley' },
      { file: 'cest_latin1-explicit.wav', title: 'Mötley' },
      { file: 'cest_windows1252.wav', title: '“Mötley” – 10 €' },
      { file: 'cest_windows1252-after-info.wav', title: '“Mötley” – 10 €' },
      { file: 'cest_utf8-after-info.wav', title: '音楽 – Mötley' }
    ];

    it('limits deferred INFO entries independently of buffered bytes', async () => {
      const chunk = (id: string, payload: Buffer): Buffer => {
        const header = Buffer.alloc(8);
        header.write(id, 'ascii');
        header.writeUInt32LE(payload.length, 4);
        return Buffer.concat([header, payload, payload.length % 2 === 0 ? Buffer.alloc(0) : Buffer.alloc(1)]);
      };
      const info = chunk(
        'LIST',
        Buffer.concat([Buffer.from('INFO'), chunk('INAM', Buffer.alloc(300)), chunk('IART', Buffer.alloc(300))])
      );
      const body = Buffer.concat([Buffer.from('WAVE'), info]);
      const header = Buffer.alloc(8);
      header.write('RIFF');
      header.writeUInt32LE(body.length, 4);

      try {
        await mm.parseBuffer(Buffer.concat([header, body]), { mimeType: 'audio/wav' }, { maxMetadataEntries: 1 });
        assert.fail('Expected deferred INFO allocation error');
      } catch (error) {
        assert.include((error as Error).message, 'Pending RIFF INFO tag count exceeds entry limit');
      }
      await mm.parseBuffer(
        Buffer.concat([header, body]),
        { mimeType: 'audio/wav' },
        { maxMemoryAllocation: 512, maxMetadataEntries: 2 }
      );
    });

    for (const sample of samples) {
      describe(sample.file, () => {
        for (const parser of Parsers) {
          it(parser.description, async function () {
            const metadata = await parser.parse(() => this.skip(), path.join(wavSamples, sample.file), 'audio/wav');
            assert.strictEqual(metadata.common.title, sample.title);
            assert.strictEqual(metadata.common.artist, 'Björk');
            const native = mm.orderTags(metadata.native.exif);
            assert.deepEqual(native.INAM, [sample.title]);
            assert.deepEqual(native.IART, ['Björk']);
            assert.strictEqual(metadata.format.sampleRate, 8000);
            assert.strictEqual(metadata.format.numberOfSamples, 800);
            assert.strictEqual(metadata.format.duration, 0.1);
            assert.isFalse(metadata.quality.warnings.some(warning => warning.message.includes('CSET')));
          });
        }
      });
    }

    it('should warn and omit INFO values for an unsupported code page', async () => {
      const metadata = await mm.parseFile(path.join(wavSamples, 'cest_unsupported1251.wav'));
      assert.isUndefined(metadata.common.title);
      assert.isUndefined(metadata.native.exif);
      assert.includeDeepMembers(metadata.quality.warnings, [
        { message: 'Unsupported RIFF CSET code page: 1251; LIST/INFO tags will be omitted' }
      ]);
      assert.strictEqual(metadata.format.numberOfSamples, 800);
      assert.strictEqual(metadata.format.duration, 0.1);
    });

    it('should reject a CSET chunk declaring fewer than 8 bytes', async () => {
      try {
        await mm.parseFile(path.join(wavSamples, 'cest_truncated-cset.wav'));
        assert.fail('Expected an invalid CSET error');
      } catch (error) {
        assert.instanceOf(error, mm.UnexpectedFileContentError);
        assert.match((error as Error).message, /CSET chunk must contain at least 8 bytes/);
      }
    });

    it('should tolerate a truncated CSET payload', async () => {
      const riff = Buffer.concat([
        Buffer.from('RIFF', 'ascii'),
        Buffer.from([20, 0, 0, 0]), // Declared RIFF size includes the complete CSET payload.
        Buffer.from('WAVECSET', 'ascii'),
        Buffer.from([8, 0, 0, 0, 0xe4, 0x04])
      ]);
      // Only two of the eight declared CSET bytes are present. The parser tolerates EOF.
      const metadata = await mm.parseBuffer(riff, { mimeType: 'audio/wav' });
      assert.strictEqual(metadata.format.container, 'WAVE');
      assert.isUndefined(metadata.native.exif);
    });
  });

  describe('non-PCM', () => {
    it('should parse Microsoft 4-bit ADPCM encoded', () => {
      const filePath = path.join(samplePath, 'issue-92.wav');

      return mm.parseFile(filePath, { duration: true }).then(metadata => {
        const format = metadata.format;
        assert.strictEqual(format.container, 'WAVE', 'format.container');
        assert.strictEqual(format.codec, 'ADPCM', 'format.codec');
        assert.strictEqual(format.lossless, false);
        assert.strictEqual(format.sampleRate, 22050);
        assert.strictEqual(format.bitrate, 89240, 'format.bitrate = 89240 bits/s');
        assert.strictEqual(format.bitsPerSample, 4);
        assert.strictEqual(format.numberOfSamples, 4660260);
        assert.strictEqual(
          metadata.format.duration!,
          format.numberOfSamples! / format.sampleRate!,
          "file's duration is 3'31\""
        );
      });
    });

    it('should parse A-law encoded (wFormatTag=0x0006)', async () => {
      const filePath = path.join(wavSamples, 'alaw.wav');
      const { format } = await mm.parseFile(filePath);
      assert.strictEqual(format.container, 'WAVE', 'format.container');
      assert.strictEqual(format.codec, 'ALAW', 'format.codec');
      assert.strictEqual(format.lossless, false);
      assert.strictEqual(format.sampleRate, 44100);
      assert.strictEqual(format.numberOfChannels, 2);
      assert.strictEqual(format.bitsPerSample, 8);
      assert.strictEqual(format.bitrate, 705600, 'format.bitrate = 705600 bits/s');
    });

    it('should parse μ-law encoded (wFormatTag=0x0007)', async () => {
      const filePath = path.join(wavSamples, 'mulaw.wav');
      const { format } = await mm.parseFile(filePath);
      assert.strictEqual(format.container, 'WAVE', 'format.container');
      assert.strictEqual(format.codec, 'MULAW', 'format.codec');
      assert.strictEqual(format.lossless, false);
      assert.strictEqual(format.sampleRate, 44100);
      assert.strictEqual(format.numberOfChannels, 2);
      assert.strictEqual(format.bitsPerSample, 8);
      assert.strictEqual(format.bitrate, 705600, 'format.bitrate = 705600 bits/s');
    });

    it('should parse IMA/DVI ADPCM encoded (wFormatTag=0x0011)', async () => {
      const filePath = path.join(wavSamples, 'dvi_adpcm.wav');
      const { format } = await mm.parseFile(filePath);
      assert.strictEqual(format.container, 'WAVE', 'format.container');
      assert.strictEqual(format.codec, 'DVI_ADPCM', 'format.codec');
      assert.strictEqual(format.lossless, false);
      assert.strictEqual(format.sampleRate, 44100);
      assert.strictEqual(format.numberOfChannels, 2);
      assert.strictEqual(format.bitsPerSample, 4);
      assert.strictEqual(format.bitrate, 128000, 'format.bitrate = 128000 bits/s');
    });

    it('should parse GSM 06.10 encoded (wFormatTag=0x0031)', async () => {
      const filePath = path.join(wavSamples, 'gsm610.wav');
      const { format } = await mm.parseFile(filePath);
      assert.strictEqual(format.container, 'WAVE', 'format.container');
      assert.strictEqual(format.codec, 'GSM610', 'format.codec');
      assert.strictEqual(format.lossless, false);
      assert.strictEqual(format.sampleRate, 8000);
      assert.strictEqual(format.numberOfChannels, 1);
      assert.strictEqual(format.bitrate, 13000, 'format.bitrate = 13000 bits/s');
    });

    /**
     * FFmpeg's libmp3lame in WAV container leaves nAvgBytesPerSec=0;
     * the parser falls back to dataSize × 8 / duration
     */
    it('should parse MPEG Layer 3 encoded (wFormatTag=0x0055)', async () => {
      const filePath = path.join(wavSamples, 'mpeglayer3.wav');
      const { format } = await mm.parseFile(filePath);
      assert.strictEqual(format.container, 'WAVE', 'format.container');
      assert.strictEqual(format.codec, 'MPEGLAYER3', 'format.codec');
      assert.strictEqual(format.lossless, false);
      assert.strictEqual(format.sampleRate, 44100);
      assert.strictEqual(format.numberOfChannels, 2);
      assert.approximately(format.bitrate ?? 0, 128000, 10000, 'format.bitrate ≈ 128000 bits/s');
    });
  });

  // https://github.com/Borewit/music-metadata/issues/707
  it('should handle missing chunk-size', async () => {
    const filePath = path.join(wavSamples, 'ffmpeg-missing-chunksize.wav');

    const { format } = await mm.parseFile(filePath);

    assert.strictEqual(format.container, 'WAVE', 'format.container');
    assert.strictEqual(format.codec, 'PCM', 'format.codec');
    assert.strictEqual(format.duration, 27648 / 44100, 'format.duration');
    assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
    assert.strictEqual(format.bitrate, 1411200, 'format.bitrate = 1411200 bits/s');
  });

  it('should handle odd list-type ID in LIST chunk', async () => {
    const filePath = path.join(wavSamples, 'odd-list-type.wav');

    const { format } = await mm.parseFile(filePath);

    assert.strictEqual(format.container, 'WAVE', 'format.container');
    assert.strictEqual(format.codec, 'PCM', 'format.codec');
    assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
    assert.strictEqual(format.bitrate, 2116800, 'format.bitrate = 2116800 bits/s');
    assert.approximately(format.duration!, 3 / 44100, 1 / 20000, 'format.duration');
  });

  // https://github.com/Borewit/music-metadata/issues/819
  it('Duration despite wrong chunk size', async () => {
    const filePath = path.join(wavSamples, 'issue-819.wav');

    const { format } = await mm.parseFile(filePath);

    assert.strictEqual(format.container, 'WAVE');
    assert.strictEqual(format.codec, 'PCM');
    assert.strictEqual(format.bitrate, 256000, 'format.bitrate = 256000 bits/s');
    // assert.strictEqual(format.numberOfSamples, 2158080, 'format.numberOfSamples');
    assert.approximately(format.duration!, 2478 / 16000, 5 / 1000, 'format.duration');
  });

  // https://github.com/Borewit/music-metadata/issues/1163
  it('Support chunk size larger then BWF extension', async () => {
    // const filePath = path.join(wavSamples, 'unreadable-tags.wav');
    const filePath = path.join(wavSamples, 'issue-1163.bwf');
    const { format, common, native } = await mm.parseFile(filePath);

    assert.strictEqual(format.container, 'WAVE', 'format.container');
    assert.strictEqual(format.codec, 'PCM', 'format.codec');

    assert.strictEqual(common.artist, 'Some Composer', 'common.artists');
    assert.strictEqual(common.title, 'Title Redacted', 'common.title');
    assert.deepStrictEqual(common.track, { no: 1, of: 12 }, 'common.track');

    const exif = mm.orderTags(native.exif);
    assert.deepStrictEqual(exif['bext.originator'], ['Pro Tools'], 'BWF: exif.bext.originator');
  });

  // https://github.com/Borewit/music-metadata/pull/1572
  it("Should map 'IPRT' RIFF Tag to common", async () => {
    const filePath = path.join(wavSamples, 'riff-iprt-tag.wav');
    const { common } = await mm.parseFile(filePath);

    assert.strictEqual(common.track.no, 1, 'common.track.no');
    assert.strictEqual(common.track.of, 2, 'common.track.no');
  });

  describe('Chunk boundaries and padding', () => {
    function chunk(id: string, payload: Buffer, size = payload.length): Buffer {
      const header = Buffer.alloc(8);
      header.write(id);
      header.writeUInt32LE(size, 4);
      return Buffer.concat([header, payload, Buffer.alloc(size & 1)]);
    }

    function wave(...chunks: Buffer[]): Buffer {
      const format = Buffer.alloc(16);
      format.writeUInt16LE(1, 0); // PCM
      format.writeUInt16LE(1, 2); // Mono
      format.writeUInt32LE(8000, 4);
      format.writeUInt32LE(16000, 8);
      format.writeUInt16LE(2, 12);
      format.writeUInt16LE(16, 14);
      return chunk('RIFF', Buffer.concat([Buffer.from('WAVE'), chunk('fmt ', format), ...chunks]));
    }

    for (const source of ['buffer', 'stream', 'advertised stream']) {
      async function tokenize(data: Buffer) {
        return source === 'buffer'
          ? fromBuffer(data, { fileInfo: { mimeType: 'audio/wav' } })
          : fromStream(Readable.from([data], { objectMode: false }), {
              fileInfo: { mimeType: 'audio/wav', size: source === 'advertised stream' ? data.length : undefined }
            });
      }

      it(`does not report a size warning for a valid final data chunk (${source})`, async () => {
        const tokenizer = await tokenize(wave(chunk('data', Buffer.alloc(8))));
        try {
          const { format, quality } = await mm.parseFromTokenizer(tokenizer);
          assert.strictEqual(format.numberOfSamples, 4);
          assert.isEmpty(quality.warnings);
        } finally {
          await tokenizer.close();
        }
      });

      it(`accounts for odd padding without reading tags after the RIFF boundary (${source})`, async () => {
        const data = wave(
          ...Array.from({ length: 8 }, () => chunk('JUNK', Buffer.from([0]))),
          chunk('data', Buffer.alloc(8))
        );
        const outside = chunk('LIST', Buffer.concat([Buffer.from('INFO'), chunk('INAM', Buffer.from('Outside\0'))]));
        const tokenizer = await tokenize(Buffer.concat([data, outside]));
        try {
          const { common, format } = await mm.parseFromTokenizer(tokenizer);
          assert.strictEqual(format.numberOfSamples, 4);
          assert.isUndefined(common.title);
          assert.strictEqual(tokenizer.position, data.length);
        } finally {
          await tokenizer.close();
        }
      });

      it(`preserves duration recovery and warnings for an oversized audio chunk (${source})`, async () => {
        const tokenizer = await tokenize(wave(chunk('data', Buffer.alloc(8), 16)));
        try {
          const { format, quality } = await mm.parseFromTokenizer(tokenizer);
          assert.includeDeepMembers(quality.warnings, [{ message: 'Data chunk size exceeds file size' }]);
          if (source !== 'stream') {
            assert.strictEqual(format.numberOfSamples, 4);
            assert.strictEqual(format.duration, 4 / 8000);
            assert.includeDeepMembers(quality.warnings, [{ message: 'data chunk length exceeding file length' }]);
          }
        } finally {
          await tokenizer.close();
        }
      });
    }
  });
});
