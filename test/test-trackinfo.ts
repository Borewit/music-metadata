import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { assert } from 'chai';
import { fromBuffer } from 'strtok3';
import { MetadataCollector } from '../lib/common/MetadataCollector.js';
import { createAudioTrackInfo } from '../lib/common/TrackInfo.js';
import * as mm from '../lib/index.js';
import { OggParser } from '../lib/ogg/OggParser.js';
import { IdentificationHeader } from '../lib/ogg/vorbis/Vorbis.js';
import { samplePath } from './util.js';

const { TrackType } = mm;

describe('format.trackInfo', () => {
  describe('Bitrate normalization', () => {
    for (const bitrate of [
      undefined,
      0,
      -1,
      -128000,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      0.5,
      128000
    ]) {
      it(`normalizes ${bitrate} for explicit tracks and single-stream fallback`, () => {
        const metadata = new MetadataCollector();
        if (bitrate !== undefined) {
          metadata.setFormat('bitrate', bitrate);
        }
        metadata.addStreamInfo({ type: TrackType.audio, bitrate });
        const fallback = createAudioTrackInfo(metadata.format);
        for (const track of [metadata.format.trackInfo[0], fallback]) {
          if (bitrate !== undefined && Number.isFinite(bitrate) && bitrate > 0) {
            assert.strictEqual(track.bitrate, bitrate);
          } else {
            assert.notProperty(track, 'bitrate');
          }
        }
        assert.isTrue(Object.is(metadata.format.bitrate, bitrate));
      });
    }

    it('decodes signed Vorbis bitrate hints before mapping them to tracks', () => {
      const data = new Uint8Array(IdentificationHeader.len);
      const view = new DataView(data.buffer);
      view.setInt32(9, -1, true);
      view.setInt32(13, -128000, true);
      view.setInt32(17, 64000, true);
      const header = IdentificationHeader.get(data, 0);
      assert.include(header, { bitrateMax: -1, bitrateNominal: -128000, bitrateMin: 64000 });
      const metadata = new MetadataCollector();
      metadata.setFormat('bitrate', header.bitrateNominal);
      assert.notProperty(createAudioTrackInfo(metadata.format), 'bitrate');
    });
  });

  describe('Single audio streams', () => {
    const samples = [
      'id3v2.4.mp3',
      "MusicBrainz - Beth Hart - Sinner's Prayer.flac",
      "MusicBrainz - Beth Hart - Sinner's Prayer.ape",
      'wav/alaw.wav',
      'aiff/M1F1-int8-AFsp.aif',
      "wavpack/MusicBrainz - Beth Hart - Sinner's Prayer.wv",
      'mpc/apev2.sv7.mpc',
      'mpc/bach-goldberg-variatians-05.sv8.mpc',
      'dsf/2L-110_stereo-5644k-1b_04_0.1-sec.dsf',
      'dsdiff/DSD64.dff'
    ];
    for (const sample of samples) {
      it(sample, async () => {
        const { format } = await mm.parseFile(path.join(samplePath, sample), { duration: true });
        assert.lengthOf(format.trackInfo, 1);
        const [track] = format.trackInfo;
        assert.strictEqual(track.type, TrackType.audio);
        assert.isUndefined(track.video);
        assert.strictEqual(track.codecName, format.codec);
        assert.strictEqual(track.codecProfile, format.codecProfile);
        assert.strictEqual(track.duration, format.duration);
        assert.strictEqual(track.bitrate, format.bitrate);
        assert.strictEqual(track.lossless, format.lossless);
        assert.strictEqual(track.audio.samplingFrequency, format.sampleRate);
        assert.strictEqual(track.audio.channels, format.numberOfChannels);
        assert.strictEqual(track.audio.bitDepth, format.bitsPerSample);
        assert.strictEqual(track.audio.numberOfSamples, format.numberOfSamples);
      });
    }

    it('returns identical tracks from file, buffer and stream APIs', async () => {
      const file = path.join(samplePath, 'id3v2.4.mp3');
      const buffer = await readFile(file);
      const options = { duration: true };
      const fileMetadata = await mm.parseFile(file, options);
      const bufferMetadata = await mm.parseBuffer(buffer, { path: file }, options);
      const streamMetadata = await mm.parseStream(
        Readable.from([buffer], { objectMode: false }),
        { path: file, size: buffer.length },
        options
      );
      assert.deepEqual(bufferMetadata.format.trackInfo, fileMetadata.format.trackInfo);
      assert.deepEqual(streamMetadata.format.trackInfo, fileMetadata.format.trackInfo);
    });
  });

  describe('ASF', () => {
    it('describes audio stream properties', async () => {
      const { format } = await mm.parseFile(path.join(samplePath, 'asf', 'issue_57.wma'));
      assert.deepEqual(format.trackInfo, [
        {
          id: 1,
          type: TrackType.audio,
          codecId: '0x0161',
          codecName: 'Windows Media Audio 9.2',
          bitrate: 128639,
          audio: { bitDepth: 16, channels: 2, samplingFrequency: 44100 }
        }
      ]);
    });

    it('describes audio and video streams', async () => {
      const { format } = await mm.parseFile(path.join(samplePath, 'asf', 'elephant.asf'));
      assert.lengthOf(format.trackInfo, 2);
      const [audio, video] = format.trackInfo;
      assert.include(audio, { id: 1, type: TrackType.audio, codecName: 'Windows Media Audio V2' });
      assert.deepEqual(audio.audio, { bitDepth: 16, channels: 1, samplingFrequency: 8000 });
      assert.include(video, {
        id: 2,
        type: TrackType.video,
        codecId: 'MP43',
        codecName: 'Microsoft MPEG-4 Video Codec V3'
      });
      assert.deepEqual(video.video, { pixelWidth: 160, pixelHeight: 120 });
      assert.isUndefined(video.audio);
    });
  });

  describe('Matroska', () => {
    it('describes WebM tracks and applies container defaults', async () => {
      const { format } = await mm.parseFile(path.join(samplePath, 'matroska', 'big-buck-bunny_trailer-short.vp8.webm'));
      assert.lengthOf(format.trackInfo, 2);
      const [video, audio] = format.trackInfo;
      assert.include(video, { id: 1, type: TrackType.video, codecId: 'V_VP8', codecName: 'VP8' });
      assert.deepEqual(video.video, {
        displayHeight: 360,
        displayWidth: 640,
        pixelHeight: 360,
        pixelWidth: 640,
        frameRate: 25
      });
      assert.include(audio, { id: 2, type: TrackType.audio, codecId: 'A_VORBIS', codecName: 'Vorbis' });
      assert.deepEqual(audio.audio, { channels: 1, samplingFrequency: 44100 });
      for (const track of format.trackInfo) {
        assert.include(track, {
          flagDefault: true,
          flagEnabled: true,
          flagLacing: true,
          flagForced: false,
          language: 'eng'
        });
      }
    });

    it('keeps commentary, subtitles and their languages separate', async () => {
      const { format } = await mm.parseFile(path.join(samplePath, 'matroska', 'matroska-test-w1-test5-short.mkv'));
      assert.lengthOf(format.trackInfo, 11);
      const [video, audio, ...others] = format.trackInfo;
      assert.include(video, {
        id: 1,
        type: TrackType.video,
        codecId: 'V_MPEG4/ISO/AVC',
        flagLacing: false,
        duration: 2,
        bitrate: 8008580
      });
      assert.include(video.video, { pixelWidth: 1024, pixelHeight: 576 });
      assert.deepEqual(audio.audio, { channels: 2, samplingFrequency: 48000 });
      const subtitles = others.filter(track => track.type === TrackType.subtitle);
      assert.lengthOf(subtitles, 8);
      assert.deepEqual(
        subtitles.map(track => track.language),
        ['eng', 'hun', 'ger', 'fre', 'spa', 'ita', 'jpn', 'und']
      );
      assert.isTrue(subtitles.every(track => track.codecId === 'S_TEXT/UTF8' && !track.audio && !track.video));
      const commentary = others.find(track => track.type === TrackType.audio);
      assert.include(commentary, { id: 9, name: 'Commentary', flagDefault: false });
      assert.deepEqual(commentary.audio, { channels: 1, outputSamplingFrequency: 44100, samplingFrequency: 22050 });
    });
  });

  describe('MPEG-4', () => {
    it('describes audio, video and caption tracks independently', async () => {
      const { format } = await mm.parseFile(path.join(samplePath, 'mp4', 'Mr. Pickles S02E07 My Dear Boy.mp4'));
      assert.lengthOf(format.trackInfo, 4);
      const [audio, video, alternateAudio, captions] = format.trackInfo;
      assert.include(audio, {
        id: 1,
        type: TrackType.audio,
        codecId: 'mp4a',
        codecName: 'MPEG-4/AAC',
        language: 'eng',
        flagEnabled: true,
        lossless: false
      });
      assert.deepEqual(audio.audio, { bitDepth: 16, channels: 2, samplingFrequency: 48000 });
      assert.approximately(audio.duration, 679.4, 0.001);
      assert.approximately(audio.bitrate, 124766.37, 0.01);
      assert.include(video, { id: 2, type: TrackType.video, codecId: 'avc1', codecName: '<avc1>' });
      assert.include(video.video, { pixelWidth: 1916, pixelHeight: 1076, displayWidth: 1916, displayHeight: 1076 });
      assert.approximately(video.video.frameRate, 23.97603721, 0.000001);
      assert.approximately(video.duration, 679.3867, 0.001);
      assert.approximately(video.bitrate, 5105810.91, 0.01);
      assert.isUndefined(video.audio);
      assert.include(alternateAudio, { id: 3, type: TrackType.audio, codecName: 'AC-3', flagEnabled: false });
      assert.deepEqual(alternateAudio.audio, { bitDepth: 16, channels: 2, samplingFrequency: 48000 });
      assert.include(captions, { id: 4, type: TrackType.subtitle, codecName: 'CEA-608' });
      assert.isUndefined(captions.audio);
    });
  });

  describe('Ogg', () => {
    for (const { filename, hasAudio, hasVideo } of [
      { filename: 'audio.vorbis.ogg', hasAudio: true, hasVideo: false },
      { filename: 'audio.opus.ogg', hasAudio: true, hasVideo: false },
      { filename: 'audio.speex.ogg', hasAudio: true, hasVideo: false },
      { filename: 'audio.flac.ogg', hasAudio: true, hasVideo: false },
      { filename: 'ogg-vorbis-skeleton-v3.ogg', hasAudio: true, hasVideo: false },
      { filename: 'ogg-theora-skeleton-v3.ogg', hasAudio: false, hasVideo: true },
      { filename: 'short.ogv', hasAudio: true, hasVideo: true }
    ]) {
      it(`finalizes media presence in the Ogg parser for ${filename}`, async () => {
        const data = await readFile(path.join(samplePath, 'ogg', filename));
        const updates: { hasAudio: boolean[]; hasVideo: boolean[] } = { hasAudio: [], hasVideo: [] };
        const options = {
          observer: (event: mm.IMetadataEvent) => {
            if (event.tag.type === 'format' && (event.tag.id === 'hasAudio' || event.tag.id === 'hasVideo')) {
              updates[event.tag.id].push(event.tag.value as boolean);
            }
          }
        };
        const metadata = new MetadataCollector(options);
        await new OggParser(metadata, fromBuffer(data), options).parse();
        assert.strictEqual(metadata.format.hasAudio, hasAudio);
        assert.strictEqual(metadata.format.hasVideo, hasVideo);
        assert.deepEqual(updates.hasAudio, [hasAudio]);
        assert.deepEqual(updates.hasVideo, [hasVideo]);
      });
    }

    for (const codec of ['vorbis', 'opus', 'speex', 'flac']) {
      it(codec, async () => {
        const { format } = await mm.parseFile(path.join(samplePath, 'ogg', `audio.${codec}.ogg`), { duration: true });
        assert.lengthOf(format.trackInfo, 1);
        const [track] = format.trackInfo;
        assert.strictEqual(track.type, TrackType.audio);
        assert.isNumber(track.id);
        assert.strictEqual(track.codecName, format.codec);
        assert.strictEqual(track.audio.channels, format.numberOfChannels);
        assert.strictEqual(track.audio.samplingFrequency, format.sampleRate);
        assert.strictEqual(track.duration, format.duration);
        if (codec === 'opus') {
          assert.strictEqual(track.audio.outputSamplingFrequency, 48000);
        }
      });
    }

    function page(serial: number, flags: number, granule: number, data: Uint8Array = new Uint8Array()): Uint8Array {
      const result = new Uint8Array(27 + (data.length > 0 ? 1 : 0) + data.length);
      const view = new DataView(result.buffer);
      result.set(new TextEncoder().encode('OggS'));
      result[5] = flags;
      view.setBigUint64(6, granule < 0 ? 0xffffffffffffffffn : BigInt(granule), true);
      view.setUint32(14, serial, true);
      if (data.length > 0) {
        result[26] = 1;
        result[27] = data.length;
        result.set(data, 28);
      }
      return result;
    }
    function opusIdentification(): Uint8Array {
      const data = new Uint8Array(19);
      data.set(new TextEncoder().encode('OpusHead'));
      data[8] = 1;
      data[9] = 2;
      const view = new DataView(data.buffer);
      view.setUint16(10, 312, true);
      view.setUint32(12, 48000, true);
      return data;
    }

    function opusComments(): Uint8Array {
      const data = new Uint8Array(16);
      data.set(new TextEncoder().encode('OpusTags'));
      return data;
    }

    for (const videoFirst of [false, true]) {
      it(`preserves video presence when mixing Theora and Opus (video first=${videoFirst})`, async () => {
        const sample = await readFile(path.join(samplePath, 'ogg', 'ogg-theora-skeleton-v3.ogg'));
        const identificationOffset = sample.indexOf(Buffer.from([0x80, ...Buffer.from('theora')]));
        assert.isAtLeast(identificationOffset, 0);
        const video = page(2, 2, 0, sample.subarray(identificationOffset, identificationOffset + 42));
        const audio = page(1, 2, 0, opusIdentification());
        const data = Buffer.concat([
          ...(videoFirst ? [video, audio] : [audio, video]),
          page(1, 0, 0, opusComments()),
          page(2, 4, 0),
          page(1, 4, 96000)
        ]);
        const updates: boolean[] = [];
        const { format } = await mm.parseBuffer(
          data,
          { mimeType: 'audio/ogg' },
          {
            observer: event => {
              if (event.tag.type === 'format' && event.tag.id === 'hasVideo') {
                updates.push(event.tag.value as boolean);
              }
            }
          }
        );
        assert.isTrue(format.hasAudio);
        assert.isTrue(format.hasVideo);
        assert.deepEqual(updates, [true]);
        assert.sameMembers(
          format.trackInfo.map(track => track.type),
          [TrackType.audio, TrackType.video]
        );
      });
    }

    it('keeps Opus track bitrate independent of Skeleton and input size', async () => {
      const opusPages = [
        page(1, 2, 0, opusIdentification()),
        page(1, 0, 0, opusComments()),
        page(1, 4, 96000 + 312, new Uint8Array(40))
      ];
      const bare = Buffer.concat(opusPages);
      const skeleton = Buffer.concat([
        page(10, 2, 0, new TextEncoder().encode('fishead')),
        ...opusPages,
        page(10, 4, 0, new Uint8Array(80))
      ]);
      for (const data of [bare, skeleton]) {
        for (const streamInput of [false, true]) {
          const { format } = streamInput
            ? await mm.parseStream(
                Readable.from([data], { objectMode: false }),
                { mimeType: 'audio/ogg' },
                { duration: true }
              )
            : await mm.parseBuffer(data, { mimeType: 'audio/ogg' }, { duration: true });
          assert.lengthOf(format.trackInfo, 1);
          assert.include(format.trackInfo[0], { id: 1, duration: 2, bitrate: ((19 + 16 + 40) * 8) / 2 });
        }
      }
    });

    it('omits Opus bitrate when scanning stops before the complete stream', async () => {
      const pages = [page(1, 2, 0, opusIdentification()), page(1, 0, 0, opusComments())];
      for (let sequence = 2; sequence < 15; ++sequence) {
        const data = page(1, sequence === 14 ? 4 : 0, 312 + (sequence - 1) * 48000, new Uint8Array(40));
        new DataView(data.buffer).setUint32(18, sequence, true);
        pages.push(data);
      }
      const data = Buffer.concat(pages);
      const early = await mm.parseBuffer(data, { mimeType: 'audio/ogg' });
      assert.isUndefined(early.format.trackInfo[0].duration);
      assert.isUndefined(early.format.trackInfo[0].bitrate);
      const complete = await mm.parseBuffer(data, { mimeType: 'audio/ogg' }, { duration: true });
      assert.strictEqual(complete.format.trackInfo[0].duration, 13);
      assert.strictEqual(complete.format.trackInfo[0].bitrate, ((19 + 16 + 13 * 40) * 8) / 13);
    });

    it('omits Opus bitrate when EOF arrives before the logical stream EOS', async () => {
      const data = Buffer.concat([
        page(1, 2, 0, opusIdentification()),
        page(1, 0, 0, opusComments()),
        page(1, 0, 96000 + 312, new Uint8Array(40))
      ]);
      for (const streamInput of [false, true]) {
        const { format, quality } = streamInput
          ? await mm.parseStream(
              Readable.from([data], { objectMode: false }),
              { mimeType: 'audio/ogg' },
              { duration: true }
            )
          : await mm.parseBuffer(data, { mimeType: 'audio/ogg' }, { duration: true });
        assert.strictEqual(format.trackInfo[0].duration, 2, 'The last granule still provides timing');
        assert.isUndefined(format.trackInfo[0].bitrate, 'A partial payload cannot provide a complete track bitrate');
        assert.isTrue(quality.warnings.some(warning => warning.message.includes('before reaching last page')));
      }
    });

    it('requires EOS separately for each Opus track when a multiplexed file ends early', async () => {
      const data = Buffer.concat([
        page(1, 2, 0, opusIdentification()),
        page(2, 2, 0, opusIdentification()),
        page(1, 0, 0, opusComments()),
        page(2, 0, 0, opusComments()),
        page(1, 4, 96000 + 312, new Uint8Array(40)),
        page(2, 0, 48000 + 312, new Uint8Array(80))
      ]);
      const { format } = await mm.parseBuffer(data, { mimeType: 'audio/ogg' }, { duration: true });
      assert.include(format.trackInfo[0], { id: 1, duration: 2, bitrate: ((19 + 16 + 40) * 8) / 2 });
      assert.include(format.trackInfo[1], { id: 2, duration: 1 });
      assert.isUndefined(format.trackInfo[1].bitrate);
    });

    it('keeps an Opus bitrate when EOS coincides with the early-stop threshold', async () => {
      const pages = [page(1, 2, 0, opusIdentification()), page(1, 0, 0, opusComments())];
      for (let sequence = 2; sequence <= 13; ++sequence) {
        const next = page(1, sequence === 13 ? 4 : 0, 312 + (sequence - 1) * 48000, new Uint8Array(40));
        new DataView(next.buffer).setUint32(18, sequence, true);
        pages.push(next);
      }
      const data = Buffer.concat(pages);
      const early = await mm.parseBuffer(data, { mimeType: 'audio/ogg' });
      const complete = await mm.parseBuffer(data, { mimeType: 'audio/ogg' }, { duration: true });
      assert.strictEqual(early.format.trackInfo[0].duration, 12);
      assert.strictEqual(early.format.trackInfo[0].bitrate, ((19 + 16 + 12 * 40) * 8) / 12);
      assert.deepEqual(early.format.trackInfo, complete.format.trackInfo);
    });

    it('keeps a completed Opus bitrate when another logical stream stops early', async () => {
      const pages = [
        page(1, 2, 0, opusIdentification()),
        page(2, 2, 0, opusIdentification()),
        page(1, 0, 0, opusComments()),
        page(2, 0, 0, opusComments()),
        page(1, 4, 96000 + 312, new Uint8Array(40))
      ];
      for (let sequence = 2; sequence <= 14; ++sequence) {
        const next = page(2, sequence === 14 ? 4 : 0, 312 + (sequence - 1) * 48000, new Uint8Array(80));
        new DataView(next.buffer).setUint32(18, sequence, true);
        pages.push(next);
      }
      const { format } = await mm.parseBuffer(Buffer.concat(pages), { mimeType: 'audio/ogg' });
      assert.include(format.trackInfo[0], { id: 1, duration: 2, bitrate: ((19 + 16 + 40) * 8) / 2 });
      assert.isUndefined(format.trackInfo[1].bitrate);
    });

    it('calculates separate Opus bitrates in multiplexed streams', async () => {
      const data = Buffer.concat([
        page(1, 2, 0, opusIdentification()),
        page(2, 2, 0, opusIdentification()),
        page(1, 0, 0, opusComments()),
        page(2, 0, 0, opusComments()),
        page(1, 4, 96000 + 312, new Uint8Array(40)),
        page(2, 4, 48000 + 312, new Uint8Array(80))
      ]);
      const { format } = await mm.parseBuffer(data, { mimeType: 'audio/ogg' }, { duration: true });
      assert.include(format.trackInfo[0], { id: 1, duration: 2, bitrate: ((19 + 16 + 40) * 8) / 2 });
      assert.include(format.trackInfo[1], { id: 2, duration: 1, bitrate: (19 + 16 + 80) * 8 });
    });

    function theora(revision = 1, shift = 6, denominator = 1): Uint8Array {
      const data = new Uint8Array(42);
      data[0] = 0x80;
      data.set(new TextEncoder().encode('theora'), 1);
      data.set([3, 2, revision], 7);
      const view = new DataView(data.buffer);
      view.setUint16(10, 40);
      view.setUint16(12, 30);
      data.set([0, 2, 128, 0, 1, 224], 14);
      view.setUint32(22, 25);
      view.setUint32(26, denominator);
      view.setUint16(40, shift << 5);
      return data;
    }

    for (const videoFirst of [false, true]) {
      it(`preserves audio duration with longer Theora video (video first=${videoFirst})`, async () => {
        const video = page(2, 2, 0, theora());
        const audio = page(1, 2, 0, opusIdentification());
        const data = Buffer.concat([
          ...(videoFirst ? [video, audio] : [audio, video]),
          page(1, 0, 0, opusComments()),
          page(2, 4, 75 * 64),
          page(1, 4, 96000 + 312)
        ]);
        const { format } = await mm.parseBuffer(data, { mimeType: 'video/ogg' }, { duration: true });
        assert.strictEqual(format.duration, 2);
        assert.strictEqual(format.trackInfo.find(track => track.type === TrackType.audio).duration, 2);
        assert.strictEqual(format.trackInfo.find(track => track.type === TrackType.video).duration, 3);
        assert.strictEqual(format.containerDuration, 3);
        assert.strictEqual(format.overallBitrate, (data.length * 8) / 3);
      });
    }

    for (const revision of [0, 1]) {
      it(`decodes Theora granules for version 3.2.${revision}`, async () => {
        const granule = (50 - Number(revision === 0)) * 64;
        const data = Buffer.concat([page(1, 2, 0, theora(revision)), page(1, 4, granule, Uint8Array.from([0, 1]))]);
        const { format } = await mm.parseBuffer(data, { mimeType: 'video/ogg' }, { duration: true });
        assert.include(format.trackInfo[0], { duration: 2, bitrate: 176 });
        assert.strictEqual(format.trackInfo[0].video.frameRate, 25);
        assert.strictEqual(format.containerDuration, 2);
        assert.strictEqual(format.overallBitrate, (data.length * 8) / 2);
      });
    }

    it('retains the last valid Theora granule when the final page has none', async () => {
      const data = Buffer.concat([page(1, 2, 0, theora()), page(1, 0, 50 * 64), page(1, 4, -1)]);
      const { format } = await mm.parseBuffer(data, { mimeType: 'video/ogg' }, { duration: true });
      assert.strictEqual(format.trackInfo[0].duration, 2);
    });

    it('uses the last Theora granule when EOF arrives before EOS', async () => {
      const data = Buffer.concat([page(1, 2, 0, theora()), page(1, 0, 50 * 64, Uint8Array.from([0, 1]))]);
      const { format, quality } = await mm.parseBuffer(data, { mimeType: 'video/ogg' }, { duration: true });
      assert.include(format.trackInfo[0], { duration: 2, bitrate: 176 });
      assert.strictEqual(format.containerDuration, 2);
      assert.isTrue(quality.warnings.some(warning => warning.message.includes('before reaching last page')));
    });

    it('omits Theora bitrate when scanning stops early after a valid granule', async () => {
      const pages = [page(1, 2, 0, theora())];
      for (let sequence = 1; sequence <= 14; ++sequence) {
        const next = page(1, sequence === 14 ? 4 : 0, (sequence === 14 ? 75 : 50) * 64, Uint8Array.from([0, 1]));
        new DataView(next.buffer).setUint32(18, sequence, true);
        pages.push(next);
      }
      const data = Buffer.concat(pages);
      const early = await mm.parseBuffer(data, { mimeType: 'video/ogg' });
      assert.isUndefined(early.format.trackInfo[0].duration);
      assert.isUndefined(early.format.trackInfo[0].bitrate);
      const complete = await mm.parseBuffer(data, { mimeType: 'video/ogg' }, { duration: true });
      assert.include(complete.format.trackInfo[0], { duration: 3, bitrate: ((42 + 14 * 2) * 8) / 3 });
    });

    it('keeps Theora bitrate when EOS coincides with the early-stop threshold', async () => {
      const pages = [page(1, 2, 0, theora())];
      for (let sequence = 1; sequence <= 13; ++sequence) {
        const next = page(1, sequence === 13 ? 4 : 0, 50 * 64, Uint8Array.from([0, 1]));
        new DataView(next.buffer).setUint32(18, sequence, true);
        pages.push(next);
      }
      const data = Buffer.concat(pages);
      const early = await mm.parseBuffer(data, { mimeType: 'video/ogg' });
      const complete = await mm.parseBuffer(data, { mimeType: 'video/ogg' }, { duration: true });
      assert.include(early.format.trackInfo[0], { duration: 2, bitrate: ((42 + 13 * 2) * 8) / 2 });
      assert.deepEqual(early.format.trackInfo, complete.format.trackInfo);
    });

    it('handles Theora granule shifts beyond 32-bit arithmetic', async () => {
      const data = Buffer.concat([page(1, 2, 0, theora(1, 31)), page(1, 4, 50 * 2 ** 31)]);
      const { format } = await mm.parseBuffer(data, { mimeType: 'video/ogg' }, { duration: true });
      assert.strictEqual(format.trackInfo[0].duration, 2);
    });

    it('leaves invalid Theora frame timing unknown', async () => {
      const data = Buffer.concat([page(1, 2, 0, theora(1, 6, 0)), page(1, 4, 50 * 64)]);
      const { format } = await mm.parseBuffer(data, { mimeType: 'video/ogg' }, { duration: true });
      assert.isUndefined(format.trackInfo[0].duration);
      assert.isUndefined(format.trackInfo[0].video.frameRate);
      assert.isUndefined(format.overallBitrate);
    });

    it('scans Theora timing past metadata pages when duration is requested', async () => {
      const pages = [page(1, 2, 0, theora())];
      for (let sequence = 1; sequence <= 14; ++sequence) {
        const next = page(1, sequence === 14 ? 4 : 0, sequence === 14 ? 50 * 64 : -1);
        new DataView(next.buffer).setUint32(18, sequence, true);
        pages.push(next);
      }
      const data = Buffer.concat(pages);
      const early = await mm.parseBuffer(data, { mimeType: 'video/ogg' });
      assert.isUndefined(early.format.trackInfo[0].duration);
      const complete = await mm.parseBuffer(data, { mimeType: 'video/ogg' }, { duration: true });
      assert.strictEqual(complete.format.trackInfo[0].duration, 2);
    });

    function identification(rate: number, channels: number): Uint8Array {
      const result = new Uint8Array(30);
      result.set(new TextEncoder().encode('vorbis'), 1);
      result[0] = 1;
      result[11] = channels;
      new DataView(result.buffer).setUint32(12, rate, true);
      result[29] = 1;
      return result;
    }

    it("uses each audio stream's own sample rate to calculate its duration", async () => {
      const data = Buffer.concat([
        page(1, 2, 0, identification(48000, 2)),
        page(2, 2, 0, identification(22050, 1)),
        page(1, 4, 96000),
        page(2, 4, 22050)
      ]);
      const { format } = await mm.parseBuffer(data, { mimeType: 'audio/ogg' }, { duration: true });
      assert.lengthOf(format.trackInfo, 2);
      assert.include(format.trackInfo[0], { id: 1, duration: 2 });
      assert.deepEqual(format.trackInfo[0].audio, { samplingFrequency: 48000, channels: 2, numberOfSamples: 96000 });
      assert.include(format.trackInfo[1], { id: 2, duration: 1 });
      assert.deepEqual(format.trackInfo[1].audio, { samplingFrequency: 22050, channels: 1, numberOfSamples: 22050 });
    });

    it('does not describe Skeleton metadata as a video track', async () => {
      const data = Buffer.concat([
        page(10, 2, 0, new TextEncoder().encode('fishead')),
        page(1, 2, 0, identification(48000, 2)),
        page(10, 4, 0),
        page(1, 4, 96000)
      ]);
      const { format } = await mm.parseBuffer(data, { mimeType: 'audio/ogg' }, { duration: true });
      assert.lengthOf(format.trackInfo, 1);
      assert.include(format.trackInfo[0], { id: 1, type: TrackType.audio, duration: 2 });
      assert.isFalse(format.hasVideo);
    });

    it('returns video and overall statistics consistently across file, buffer and stream APIs', async () => {
      const file = path.join(samplePath, 'ogg', 'short.ogv');
      const data = await readFile(file);
      const options = { duration: true };
      const expected = (await mm.parseFile(file, options)).format;
      const results = await Promise.all([
        mm.parseBuffer(data, { path: file }, options),
        mm.parseStream(Readable.from([data], { objectMode: false }), { path: file, size: data.length }, options),
        mm.parseWebStream(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(data);
              controller.close();
            }
          }),
          { mimeType: 'video/ogg', size: data.length },
          options
        )
      ]);
      for (const { format } of results) {
        assert.deepEqual(format.trackInfo, expected.trackInfo);
        assert.strictEqual(format.containerDuration, expected.containerDuration);
        assert.strictEqual(format.overallBitrate, expected.overallBitrate);
      }
      const unknownSize = await mm.parseStream(Readable.from([data], { objectMode: false }), { path: file }, options);
      assert.strictEqual(unknownSize.format.containerDuration, expected.containerDuration);
      assert.isUndefined(unknownSize.format.overallBitrate);
    });

    it('keeps multiplexed audio and video properties separate', async () => {
      const { format } = await mm.parseFile(path.join(samplePath, 'ogg', 'short.ogv'), { duration: true });
      assert.lengthOf(format.trackInfo, 2);
      const [video, audio] = format.trackInfo;
      assert.include(video, { id: 6499, type: TrackType.video, codecName: 'Theora' });
      assert.deepEqual(video.video, {
        pixelWidth: 640,
        pixelHeight: 480,
        displayWidth: 640,
        displayHeight: 480,
        frameRate: 30
      });
      assert.isUndefined(video.audio);
      assert.include(audio, { id: 8012, type: TrackType.audio, codecName: 'Vorbis I', bitrate: 80000 });
      assert.deepEqual(audio.audio, { channels: 2, samplingFrequency: 44100, numberOfSamples: 253952 });
      assert.approximately(audio.duration, 5.75855, 0.00001);
      assert.approximately(video.duration, 5.5666667, 0.000001);
      assert.approximately(video.bitrate, 1994257.72455, 0.001);
      assert.strictEqual(format.containerDuration, audio.duration);
      assert.approximately(format.overallBitrate, 2017786, 1);
      assert.isTrue(format.hasAudio);
      assert.isTrue(format.hasVideo);
    });
  });
});
