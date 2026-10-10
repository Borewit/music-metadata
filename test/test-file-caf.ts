import path from 'node:path';
import { Readable } from 'node:stream';
import { assert, expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as CafToken from '../lib/caf/CafToken.js';
import * as mm from '../lib/index.js';
import { Parsers } from './metadata-parsers.js';
import { samplePath } from './util.js';

use(chaiAsPromised);

const cafSamplePath = path.join(samplePath, 'caf');
const cafMimeType = 'audio/caf';

// CAFChannelLabel, the values used by the channel layout fixtures
const channelLeft = 1;
const channelRight = 2;
const channelCenter = 3;
const channelLeftSurround = 4;
const channelRightSurround = 5;
const channelCenterSurround = 6;
const channelUseCoordinates = 100;

const fileHeader = Buffer.concat([Buffer.from('caff', 'latin1'), Buffer.from([0, 1, 0, 0])]);

function chunkHeader(type: string, size: number): Buffer {
  const header = Buffer.alloc(12);
  header.write(type, 0, 4, 'latin1');
  header.writeBigInt64BE(BigInt(size), 4);
  return header;
}

const audioDescription = (() => {
  const desc = Buffer.alloc(32);
  desc.writeDoubleBE(8000, 0);
  desc.write('lpcm', 8, 4, 'latin1');
  desc.writeUInt32BE(1, 16); // mBytesPerPacket
  desc.writeUInt32BE(1, 20); // mFramesPerPacket
  desc.writeUInt32BE(1, 24); // mChannelsPerFrame
  desc.writeUInt32BE(8, 28); // mBitsPerChannel
  return desc;
})();

function channelDescription(
  channelLabel: number,
  channelFlags = 0,
  coordinates: [number, number, number] = [0, 0, 0]
): CafToken.IChannelDescription {
  return { channelLabel, channelFlags, coordinates };
}

function parseSyntheticCaf(...chunks: Buffer[]): Promise<mm.IAudioMetadata> {
  return mm.parseBuffer(new Uint8Array(Buffer.concat([fileHeader, ...chunks])), { mimeType: cafMimeType });
}

function infoBody(entries: [string, string][]): Buffer {
  const pairs: Buffer[] = [];
  for (const [key, value] of entries) {
    pairs.push(Buffer.from(`${key}\0${value}\0`, 'utf8'));
  }
  const count = Buffer.alloc(4);
  count.writeUInt32BE(entries.length, 0);
  return Buffer.concat([count, ...pairs]);
}

describe('Parse CAF (Core Audio File Format)', () => {
  interface ICafFormat {
    codec: string;
    lossless: boolean;
    sampleRate: number;
    numberOfChannels: number;
    bitsPerSample?: number;
    numberOfSamples: number;
    duration: number;
    bitrate: number;
  }

  function checkFormat(format: mm.IFormat, expected: ICafFormat) {
    assert.strictEqual(format.container, 'CAF', 'format.container');
    assert.strictEqual(format.codec, expected.codec, 'format.codec');
    assert.strictEqual(format.lossless, expected.lossless, 'format.lossless');
    assert.strictEqual(format.sampleRate, expected.sampleRate, 'format.sampleRate');
    assert.strictEqual(format.numberOfChannels, expected.numberOfChannels, 'format.numberOfChannels');
    assert.strictEqual(format.bitsPerSample, expected.bitsPerSample, 'format.bitsPerSample');
    assert.strictEqual(format.numberOfSamples, expected.numberOfSamples, 'format.numberOfSamples');
    assert.approximately(format.duration!, expected.duration, 1e-9, 'format.duration');
    assert.approximately(format.bitrate!, expected.bitrate, 1, 'format.bitrate');
    assert.isTrue(format.hasAudio, 'format.hasAudio');
    assert.isFalse(format.hasVideo, 'format.hasVideo');
    assert.deepEqual(format.tagTypes, ['CAF'], 'format.tagTypes');
  }

  describe('LPCM', () => {
    const cases: { file: string; format: ICafFormat }[] = [
      {
        file: 'lpcm-le-16bit.caf',
        format: {
          codec: 'PCM',
          lossless: true,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitsPerSample: 16,
          numberOfSamples: 4410,
          duration: 0.1,
          bitrate: 1411200
        }
      },
      {
        file: 'lpcm-be-16bit.caf',
        format: {
          codec: 'PCM',
          lossless: true,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitsPerSample: 16,
          numberOfSamples: 4410,
          duration: 0.1,
          bitrate: 1411200
        }
      },
      {
        file: 'lpcm-be-24bit.caf',
        format: {
          codec: 'PCM',
          lossless: true,
          sampleRate: 48000,
          numberOfChannels: 1,
          bitsPerSample: 24,
          numberOfSamples: 4800,
          duration: 0.1,
          bitrate: 1152000
        }
      },
      {
        file: 'lpcm-float32.caf',
        format: {
          codec: 'PCM',
          lossless: true,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitsPerSample: 32,
          numberOfSamples: 4410,
          duration: 0.1,
          bitrate: 2822400
        }
      },
      {
        file: 'lpcm-float64.caf',
        format: {
          codec: 'PCM',
          lossless: true,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitsPerSample: 64,
          numberOfSamples: 4410,
          duration: 0.1,
          bitrate: 5644800
        }
      },
      {
        file: 'ulaw.caf',
        format: {
          codec: 'ITU-T G.711 mu-law',
          lossless: false,
          sampleRate: 8000,
          numberOfChannels: 1,
          bitsPerSample: 8,
          numberOfSamples: 800,
          duration: 0.1,
          bitrate: 64000
        }
      },
      {
        file: 'alaw.caf',
        format: {
          codec: 'ITU-T G.711 A-law',
          lossless: false,
          sampleRate: 8000,
          numberOfChannels: 1,
          bitsPerSample: 8,
          numberOfSamples: 800,
          duration: 0.1,
          bitrate: 64000
        }
      }
    ];

    for (const { file, format } of cases) {
      it(`parses ${file}`, async () => {
        const metadata = await mm.parseFile(path.join(cafSamplePath, file));
        checkFormat(metadata.format, format);
      });
    }
  });

  describe('Compressed formats', () => {
    it('parses an AAC file', async () => {
      const { format } = await mm.parseFile(path.join(cafSamplePath, 'aac.caf'));
      checkFormat(format, {
        codec: 'AAC',
        lossless: false,
        sampleRate: 44100,
        numberOfChannels: 2,
        numberOfSamples: 4410,
        duration: 0.1,
        bitrate: 53600
      });
    });

    it('parses an ALAC file', async () => {
      const { format } = await mm.parseFile(path.join(cafSamplePath, 'alac.caf'));
      checkFormat(format, {
        codec: 'ALAC',
        lossless: true,
        sampleRate: 44100,
        numberOfChannels: 2,
        numberOfSamples: 4410,
        duration: 0.1,
        bitrate: 148560
      });
    });

    it('parses an IMA4 file', async () => {
      const { format } = await mm.parseFile(path.join(cafSamplePath, 'ima4.caf'));
      checkFormat(format, {
        codec: 'IMA4 ADPCM',
        lossless: false,
        sampleRate: 44100,
        numberOfChannels: 2,
        numberOfSamples: 4410,
        duration: 0.1,
        bitrate: 375360
      });
    });
  });

  describe('Packet Table chunk', () => {
    it('uses mNumberValidFrames for the duration', async () => {
      const { format } = await mm.parseFile(path.join(cafSamplePath, 'alac.caf'));
      assert.strictEqual(format.numberOfSamples, 4410, 'format.numberOfSamples');
    });

    it('falls back to the constant bitrate when the packet count is zero', async () => {
      // The packet table declares no packets, so the frame count follows from
      // mBytesPerPacket and mFramesPerPacket instead
      const { format } = await mm.parseFile(path.join(cafSamplePath, 'pakt-zero-packets.caf'));
      assert.strictEqual(format.numberOfSamples, 4480, 'format.numberOfSamples');
      assert.approximately(format.duration!, 4480 / 22050, 1e-9, 'format.duration');
      assert.approximately(format.bitrate!, 187425, 1, 'format.bitrate');
    });

    it('omits the duration when mNumberValidFrames is negative', async () => {
      // A variable bitrate format has no constant bitrate to fall back on
      const { format } = await mm.parseFile(path.join(cafSamplePath, 'flac-negative-valid-frames.caf'));
      assert.isUndefined(format.numberOfSamples, 'format.numberOfSamples');
      assert.isUndefined(format.duration, 'format.duration');
      assert.isUndefined(format.bitrate, 'format.bitrate');
      assert.strictEqual(format.codec, 'FLAC', 'format.codec');
      assert.strictEqual(format.lossless, true, 'format.lossless');
    });

    it('rejects a truncated variable length integer', async () => {
      await expect(mm.parseFile(path.join(cafSamplePath, 'malformed-truncated-pakt.caf'))).to.be.rejectedWith(
        mm.UnexpectedFileContentError,
        /Packet Table data section holds 1 byte\(s\) for 2 packet table entries/
      );
    });
  });

  describe('Information chunk', () => {
    it('maps the documented keys to common tags', async () => {
      const { common } = await mm.parseFile(path.join(cafSamplePath, 'info-tags.caf'));
      assert.strictEqual(common.title, 'Fixture Piece');
      assert.strictEqual(common.artist, 'Able Baker');
      assert.strictEqual(common.album, 'The Book of Fixtures');
      assert.deepEqual(common.track, { no: 7, of: null });
      assert.strictEqual(common.bpm, 120);
      assert.strictEqual(common.key, 'Cm');
      assert.strictEqual(common.year, 2004);
      assert.strictEqual(common.date, '2004-06-01T12:00:00Z');
      assert.deepEqual(common.composer, ['Charlie Delta']);
      assert.deepEqual(common.lyricist, ['Echo Foxtrot']);
      assert.deepEqual(common.genre, ['Jazz']);
      assert.strictEqual(common.copyright, 'Copyright 2004 The CoolBandName');
      assert.strictEqual(common.encodersettings, 'Fixture Encoder v4.2');
      assert.strictEqual(common.encodedby, 'Fixture App v1.0');
    });

    it('keeps a comma separated value intact', async () => {
      const { common } = await mm.parseFile(path.join(cafSamplePath, 'info-tags.caf'));
      assert.deepEqual(common.comment, [{ text: 'first note, second note' }]);
    });

    it('splits comma separated values of list keys', async () => {
      const body = infoBody([
        ['artist', 'Able Baker,Charlie Delta'],
        ['composer', 'Charlie Delta,Echo Foxtrot'],
        ['lyricist', 'Echo Foxtrot,Golf Hotel'],
        ['genre', 'Jazz,Rock'],
        ['title', 'Split Title'],
        ['comments', 'first note, second note']
      ]);
      const { common, native } = await parseSyntheticCaf(
        chunkHeader('desc', 32),
        audioDescription,
        chunkHeader('info', body.length),
        body
      );
      assert.deepEqual(common.artists, ['Able Baker', 'Charlie Delta']);
      assert.deepEqual(common.composer, ['Charlie Delta', 'Echo Foxtrot']);
      assert.deepEqual(common.lyricist, ['Echo Foxtrot', 'Golf Hotel']);
      assert.deepEqual(common.genre, ['Jazz', 'Rock']);
      assert.strictEqual(common.title, 'Split Title');
      // Freeform text keeps its literal comma
      assert.deepEqual(common.comment, [{ text: 'first note, second note' }]);
      // Native values stay intact
      const info = new Map(native.CAF.map(tag => [tag.id, tag.value]));
      assert.strictEqual(info.get('artist'), 'Able Baker,Charlie Delta');
      assert.strictEqual(info.get('composer'), 'Charlie Delta,Echo Foxtrot');
    });

    it('preserves every entry as a native tag', async () => {
      const { native } = await mm.parseFile(path.join(cafSamplePath, 'info-tags.caf'));
      const entries = native.CAF;
      assert.lengthOf(entries, 21);

      const info = new Map(entries.map(tag => [tag.id, tag.value]));
      assert.strictEqual(info.get('title'), 'Fixture Piece');
      assert.strictEqual(info.get('nominal bit rate'), '128 kbits');
      assert.strictEqual(info.get('channel layout'), '5.1 Surround');
      // Undocumented keys Apple reserves, and ones written by third party tools
      assert.strictEqual(info.get('.hidden reserved key'), 'reserved value');
      assert.strictEqual(info.get('ApplicationKey'), 'application value');
      assert.strictEqual(info.get('approximate duration in seconds'), '0.064');
    });

    it('reads a channel layout and an information chunk from the same file', async () => {
      const { native } = await mm.parseFile(path.join(cafSamplePath, 'mpeg4-aac-control.caf'));
      assert.deepEqual(native.CAF, [
        { id: 'channelLayoutTag', value: 6619138 }, // kAudioChannelLayoutTag_Mono
        { id: 'channelLayoutBitmap', value: 0 },
        { id: 'encoder', value: 'Lavf63.1.102' }
      ]);
    });
  });

  describe('Channel Layout chunk', () => {
    it('reads the layout tag, bitmap and descriptions', async () => {
      const { native } = await mm.parseFile(path.join(cafSamplePath, 'chan-descriptions.caf'));
      assert.deepEqual(native.CAF, [
        { id: 'channelLayoutTag', value: 1245190 }, // kAudioChannelLayoutTag_5_1
        { id: 'channelLayoutBitmap', value: 63 },
        {
          id: 'channelLayoutDescriptions',
          value: [
            channelDescription(channelLeft),
            channelDescription(channelRight),
            channelDescription(channelCenter),
            channelDescription(channelLeftSurround),
            channelDescription(channelRightSurround),
            channelDescription(channelCenterSurround)
          ]
        }
      ]);
    });

    it('keeps the flags and coordinates of a description', async () => {
      const body = Buffer.alloc(12 + 20);
      body.writeUInt32BE(0, 4);
      body.writeUInt32BE(1, 8);
      body.writeUInt32BE(channelUseCoordinates, 12);
      body.writeUInt32BE(3, 16);
      body.writeFloatBE(1.5, 20);
      body.writeFloatBE(2.5, 24);
      body.writeFloatBE(3.5, 28);
      const { native } = await parseSyntheticCaf(
        chunkHeader('desc', 32),
        audioDescription,
        chunkHeader('chan', body.length),
        body
      );
      assert.deepEqual(native.CAF, [
        { id: 'channelLayoutTag', value: 0 },
        { id: 'channelLayoutBitmap', value: 0 },
        {
          id: 'channelLayoutDescriptions',
          value: [channelDescription(channelUseCoordinates, 3, [1.5, 2.5, 3.5])]
        }
      ]);
    });

    it('reads descriptions that outnumber the channel bitmap', async () => {
      // The bitmap covers 3 channels, the descriptions cover 4
      const { native, format } = await mm.parseFile(path.join(cafSamplePath, 'chan-bitmap-layout.caf'));
      assert.deepEqual(native.CAF, [
        { id: 'channelLayoutTag', value: 65536 }, // kAudioChannelLayoutTag_Quadraphonic
        { id: 'channelLayoutBitmap', value: 7 },
        {
          id: 'channelLayoutDescriptions',
          value: [
            channelDescription(channelLeft),
            channelDescription(channelRight),
            channelDescription(channelCenter),
            channelDescription(channelRightSurround)
          ]
        }
      ]);
      // The channel count always comes from the audio description
      assert.strictEqual(format.numberOfChannels, 4, 'format.numberOfChannels');
    });

    it('omits the descriptions when the chunk declares none', async () => {
      // A mpeg4-aac-control sample has a channel layout without descriptions
      const { native } = await mm.parseFile(path.join(cafSamplePath, 'mpeg4-aac-control.caf'));
      const descriptions = native.CAF.find(tag => tag.id === 'channelLayoutDescriptions');
      assert.isUndefined(descriptions, 'channelLayoutDescriptions');
    });
  });

  describe('Audio Data chunk', () => {
    it('accepts a data chunk that runs to the end of the file', async () => {
      const { format } = await mm.parseFile(path.join(cafSamplePath, 'data-unknown-size.caf'));
      assert.strictEqual(format.numberOfSamples, 512, 'format.numberOfSamples');
      assert.strictEqual(format.duration, 0.064, 'format.duration');
      assert.approximately(format.bitrate!, 64000, 1, 'format.bitrate');
    });
  });

  describe('Unknown chunks', () => {
    it('skips a uuid and a free chunk', async () => {
      const { format } = await mm.parseFile(path.join(cafSamplePath, 'unknown-chunk.caf'));
      assert.strictEqual(format.numberOfSamples, 512, 'format.numberOfSamples');
      assert.strictEqual(format.duration, 0.064, 'format.duration');
    });

    it('skips the magic cookie of a FLAC file', async () => {
      const { format, native } = await mm.parseFile(path.join(cafSamplePath, 'flac-negative-valid-frames.caf'));
      assert.strictEqual(format.codec, 'FLAC', 'format.codec');
      // Everything after the skipped chunks is still read
      assert.isDefined(native.CAF, 'native.CAF');
    });
  });

  describe('Packet Table variable length integers', () => {
    // A zero means the value is variable, and is then stored per packet
    const variable = (bytesPerPacket: number, framesPerPacket: number): CafToken.IAudioDescription => ({
      sampleRate: 44100,
      formatId: 'lpcm',
      formatFlags: 0,
      bytesPerPacket,
      framesPerPacket,
      channelsPerFrame: 2,
      bitsPerChannel: 16
    });
    const bytesVariable = variable(0, 1);
    const bothVariable = variable(0, 0);
    const constant = variable(4, 1);

    it('accepts a value that spans multiple bytes', () => {
      // 128 encodes as 0x81 0x00, the high-order bit marks the continuation
      assert.strictEqual(CafToken.decodePacketTableEntries(new Uint8Array([0x81, 0x00]), bytesVariable, 1), 2);
    });

    it('accepts a value that spans three bytes', () => {
      assert.strictEqual(CafToken.decodePacketTableEntries(new Uint8Array([0x81, 0x80, 0x00]), bytesVariable, 1), 3);
    });

    it('counts one entry per packet', () => {
      const body = new Uint8Array([0x01, 0x81, 0x00]);
      assert.strictEqual(CafToken.decodePacketTableEntries(body, bytesVariable, 2), 3);
    });

    it('counts two entries per packet when both values are variable', () => {
      const body = new Uint8Array([0x81, 0x00, 0x02]);
      assert.strictEqual(CafToken.decodePacketTableEntries(body, bothVariable, 1), 3);
    });

    it('ignores trailing space reserved by the chunk', () => {
      const body = new Uint8Array([0x01, 0xff, 0xff]);
      assert.strictEqual(CafToken.decodePacketTableEntries(body, bytesVariable, 1), 1);
    });

    it('reads no entries for a format with a constant packet size', () => {
      assert.strictEqual(CafToken.decodePacketTableEntries(new Uint8Array(0), constant, 16), 0);
    });

    it('rejects an entry that continues past the data section', () => {
      expect(() => CafToken.decodePacketTableEntries(new Uint8Array([0x81]), bytesVariable, 1)).to.throw(
        CafToken.CafContentError,
        /Packet Table data section ends in the middle of a variable length integer/
      );
    });
  });

  describe('Unrecognised format ID', () => {
    function fileWithFormatId(formatId: string): Uint8Array {
      const fileHeader = Buffer.concat([Buffer.from('caff', 'latin1'), Buffer.from([0, 1, 0, 0])]);
      const chunkHeader = (type: string, size: number): Buffer => {
        const header = Buffer.alloc(12);
        header.write(type, 0, 4, 'latin1');
        header.writeBigInt64BE(BigInt(size), 4);
        return header;
      };
      const desc = Buffer.alloc(32);
      desc.writeDoubleBE(48000, 0);
      desc.write(formatId, 8, 4, 'latin1');
      desc.writeUInt32BE(4, 16); // mBytesPerPacket
      desc.writeUInt32BE(1024, 20); // mFramesPerPacket
      desc.writeUInt32BE(2, 24); // mChannelsPerFrame
      desc.writeUInt32BE(24, 28); // mBitsPerChannel
      const data = Buffer.alloc(4 + 4096);
      data.writeInt32BE(0, 0); // mEditCount
      return new Uint8Array(
        Buffer.concat([fileHeader, chunkHeader('desc', 32), desc, chunkHeader('data', data.length), data])
      );
    }

    it('reports an unknown format ID as the codec', async () => {
      const { format } = await mm.parseBuffer(fileWithFormatId('zzzz'), { mimeType: cafMimeType });
      assert.strictEqual(format.codec, 'zzzz', 'format.codec');
    });

    it('does not claim losslessness for an unknown format ID', async () => {
      const { format } = await mm.parseBuffer(fileWithFormatId('zzzz'), { mimeType: cafMimeType });
      assert.isUndefined(format.lossless, 'format.lossless');
    });

    it('still derives the remaining format fields', async () => {
      const { format } = await mm.parseBuffer(fileWithFormatId('zzzz'), { mimeType: cafMimeType });
      assert.strictEqual(format.sampleRate, 48000, 'format.sampleRate');
      assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
      assert.strictEqual(format.bitsPerSample, 24, 'format.bitsPerSample');
      // 1024 frames per packet over 4096 bytes of 4 byte packets
      assert.strictEqual(format.numberOfSamples, 1024 * 1024, 'format.numberOfSamples');
    });
  });

  describe('Security hardening', () => {
    it('rejects an invalid file-type', async () => {
      const file = Buffer.concat([Buffer.from('cafx', 'latin1'), fileHeader.subarray(4)]);
      await expect(mm.parseBuffer(new Uint8Array(file), { mimeType: cafMimeType })).to.be.rejectedWith(
        mm.UnexpectedFileContentError,
        /Invalid file-type, expected 'caff', found 'cafx'/
      );
    });

    it('rejects a file that does not start with an Audio Description chunk', async () => {
      const file = Buffer.concat([fileHeader, chunkHeader('free', 8), Buffer.alloc(8)]);
      await expect(mm.parseBuffer(new Uint8Array(file), { mimeType: cafMimeType })).to.be.rejectedWith(
        mm.UnexpectedFileContentError,
        /Expected an Audio Description chunk, found 'free'/
      );
    });

    it('rejects a file without an Audio Description chunk', async () => {
      await expect(mm.parseBuffer(new Uint8Array(fileHeader), { mimeType: cafMimeType })).to.be.rejectedWith(
        mm.UnexpectedFileContentError,
        /Missing Audio Description chunk/
      );
    });

    it('rejects an Audio Description chunk that is too small', async () => {
      const file = Buffer.concat([fileHeader, chunkHeader('desc', 24), audioDescription.subarray(0, 24)]);
      await expect(mm.parseBuffer(new Uint8Array(file), { mimeType: cafMimeType })).to.be.rejectedWith(
        mm.UnexpectedFileContentError,
        /Audio Description chunk size 24 is smaller than 32/
      );
    });

    it('rejects a truncated Audio Description chunk', async () => {
      const file = Buffer.concat([fileHeader, chunkHeader('desc', 32), audioDescription.subarray(0, 24)]);
      await expect(mm.parseBuffer(new Uint8Array(file), { mimeType: cafMimeType })).to.be.rejectedWith(
        mm.UnexpectedFileContentError,
        /Missing Audio Description chunk/
      );
    });

    it('rejects an Audio Data chunk that is too small to hold mEditCount', async () => {
      const file = Buffer.concat([fileHeader, chunkHeader('desc', 32), audioDescription, chunkHeader('data', 2)]);
      await expect(mm.parseBuffer(new Uint8Array(file), { mimeType: cafMimeType })).to.be.rejectedWith(
        mm.UnexpectedFileContentError,
        /Audio Data chunk size 2 is too small to hold mEditCount/
      );
    });

    it('rejects an unknown chunk that declares an unknown size', async () => {
      const file = Buffer.concat([fileHeader, chunkHeader('desc', 32), audioDescription, chunkHeader('uuid', -1)]);
      await expect(mm.parseBuffer(new Uint8Array(file), { mimeType: cafMimeType })).to.be.rejectedWith(
        mm.UnexpectedFileContentError,
        /Chunk size -1 may only be -1 for an Audio Data chunk/
      );
    });

    it('rejects an Information chunk that is too small to hold mNumEntries', async () => {
      const file = Buffer.concat([fileHeader, chunkHeader('desc', 32), audioDescription, chunkHeader('info', 2)]);
      await expect(mm.parseBuffer(new Uint8Array(file), { mimeType: cafMimeType })).to.be.rejectedWith(
        mm.UnexpectedFileContentError,
        /Information chunk size 2 is too small to hold mNumEntries/
      );
    });

    it('rejects an Information chunk with an unterminated string', async () => {
      const body = Buffer.from([0, 0, 0, 1, 0x6b, 0x65, 0x79]); // mNumEntries = 1, then "key" without a NUL
      const file = Buffer.concat([
        fileHeader,
        chunkHeader('desc', 32),
        audioDescription,
        chunkHeader('info', body.length),
        body
      ]);
      await expect(mm.parseBuffer(new Uint8Array(file), { mimeType: cafMimeType })).to.be.rejectedWith(
        mm.UnexpectedFileContentError,
        /Information chunk contains an unterminated string/
      );
    });

    it('rejects an Information chunk whose size exceeds the input', async () => {
      const file = Buffer.concat([
        fileHeader,
        chunkHeader('desc', 32),
        audioDescription,
        chunkHeader('info', 64 * 1024 * 1024)
      ]);
      await expect(mm.parseBuffer(new Uint8Array(file), { mimeType: cafMimeType })).to.be.rejectedWith(
        mm.UnexpectedFileContentError,
        /Information chunk size 67108864 exceeds available input size 0/
      );
    });

    it('rejects a Packet Table chunk whose size exceeds the input', async () => {
      const file = Buffer.concat([
        fileHeader,
        chunkHeader('desc', 32),
        audioDescription,
        chunkHeader('pakt', 64 * 1024 * 1024)
      ]);
      await expect(mm.parseBuffer(new Uint8Array(file), { mimeType: cafMimeType })).to.be.rejectedWith(
        mm.UnexpectedFileContentError,
        /Packet Table chunk size 67108864 exceeds available input size 0/
      );
    });

    it('rejects a Channel Layout chunk whose description array exceeds the input', async () => {
      const body = Buffer.alloc(12);
      body.writeUInt32BE(0, 4); // mChannelBitmap
      body.writeUInt32BE(1, 8); // mNumberChannelDescriptions, one 20 byte description missing
      const file = Buffer.concat([
        fileHeader,
        chunkHeader('desc', 32),
        audioDescription,
        chunkHeader('chan', 32),
        body
      ]);
      await expect(mm.parseBuffer(new Uint8Array(file), { mimeType: cafMimeType })).to.be.rejectedWith(
        mm.UnexpectedFileContentError,
        /Channel Layout chunk size 32 exceeds available input size 12/
      );
    });

    it('rejects a Channel Layout chunk whose descriptions exceed its size', async () => {
      const body = Buffer.alloc(12);
      body.writeUInt32BE(0, 4); // mChannelBitmap
      body.writeUInt32BE(4, 8); // mNumberChannelDescriptions, needs 48 more bytes
      const file = Buffer.concat([
        fileHeader,
        chunkHeader('desc', 32),
        audioDescription,
        chunkHeader('chan', 12),
        body
      ]);
      await expect(mm.parseBuffer(new Uint8Array(file), { mimeType: cafMimeType })).to.be.rejectedWith(
        mm.UnexpectedFileContentError,
        /Channel Layout chunk declares 4 description\(s\) which exceed its size of 12/
      );
    });

    it('rejects a Channel Layout chunk that is too small to hold its header', async () => {
      const file = Buffer.concat([fileHeader, chunkHeader('desc', 32), audioDescription, chunkHeader('chan', 8)]);
      await expect(mm.parseBuffer(new Uint8Array(file), { mimeType: cafMimeType })).to.be.rejectedWith(
        mm.UnexpectedFileContentError,
        /Channel Layout chunk size 8 is smaller than 12/
      );
    });

    it('rejects a Channel Layout chunk with an incomplete description array', async () => {
      const body = Buffer.alloc(12 + 8);
      body.writeUInt32BE(0, 4);
      body.writeUInt32BE(2, 8); // 2 descriptions need 24 bytes, only 8 available
      const file = Buffer.concat([
        fileHeader,
        chunkHeader('desc', 32),
        audioDescription,
        chunkHeader('chan', 20),
        body
      ]);
      await expect(mm.parseBuffer(new Uint8Array(file), { mimeType: cafMimeType })).to.be.rejectedWith(
        mm.UnexpectedFileContentError,
        /Channel Layout chunk declares 2 description\(s\) which exceed its size of 20/
      );
    });

    it('rejects a description array that is shorter than its declared count', () => {
      expect(() => CafToken.parseChannelDescriptions(new Uint8Array(8), 2)).to.throw(
        CafToken.CafContentError,
        /Channel Layout chunk declares 2 description\(s\) for 8 byte\(s\)/
      );
    });

    it('rejects a Packet Table chunk that is too small to hold its header', async () => {
      const file = Buffer.concat([fileHeader, chunkHeader('desc', 32), audioDescription, chunkHeader('pakt', 8)]);
      await expect(mm.parseBuffer(new Uint8Array(file), { mimeType: cafMimeType })).to.be.rejectedWith(
        mm.UnexpectedFileContentError,
        /Packet Table chunk size 8 is smaller than 24/
      );
    });

    it('omits derived format fields when the description has no frame count', async () => {
      const file = Buffer.concat([fileHeader, chunkHeader('desc', 32), audioDescription]);
      const { format } = await mm.parseBuffer(new Uint8Array(file), { mimeType: cafMimeType });
      assert.isUndefined(format.numberOfSamples, 'format.numberOfSamples');
      assert.isUndefined(format.duration, 'format.duration');
      assert.isUndefined(format.bitrate, 'format.bitrate');
    });

    it('omits derived format fields for a non-positive sample rate', async () => {
      const zeroRateDescription = Buffer.from(audioDescription);
      zeroRateDescription.writeDoubleBE(0, 0);
      const file = Buffer.concat([fileHeader, chunkHeader('desc', 32), zeroRateDescription]);
      const { format } = await mm.parseBuffer(new Uint8Array(file), { mimeType: cafMimeType });
      assert.isUndefined(format.numberOfSamples, 'format.numberOfSamples');
      assert.isUndefined(format.duration, 'format.duration');
      assert.isUndefined(format.bitrate, 'format.bitrate');
    });

    it('reassembles a large Information chunk from a stream in bounded pieces', async () => {
      const value = 'x'.repeat(100000);
      const body = infoBody([['artist', value]]);
      assert.isAbove(body.length, 64 * 1024, 'body larger than a single bounded read');
      const file = Buffer.concat([
        fileHeader,
        chunkHeader('desc', 32),
        audioDescription,
        chunkHeader('info', body.length),
        body
      ]);
      const { common } = await mm.parseStream(Readable.from([file], { objectMode: false }), { mimeType: cafMimeType });
      assert.deepEqual(common.artists, [value]);
    });

    it('handles an unknown-size data chunk from a stream without a known length', async () => {
      const data = Buffer.alloc(4 + 512);
      const file = Buffer.concat([
        fileHeader,
        chunkHeader('desc', 32),
        audioDescription,
        chunkHeader('data', -1),
        data
      ]);
      const { format } = await mm.parseStream(Readable.from([file], { objectMode: false }), { mimeType: cafMimeType });
      assert.isUndefined(format.numberOfSamples, 'format.numberOfSamples');
      assert.isUndefined(format.duration, 'format.duration');
      assert.isUndefined(format.bitrate, 'format.bitrate');
    });
  });

  describe('Parsers', () => {
    const files = [
      'lpcm-le-16bit.caf',
      'ima4.caf',
      'pakt-zero-packets.caf',
      'info-tags.caf',
      'chan-descriptions.caf',
      'data-unknown-size.caf',
      'unknown-chunk.caf',
      'flac-negative-valid-frames.caf'
    ];

    for (const file of files) {
      describe(file, () => {
        Parsers.forEach(parser => {
          it(parser.description, async function () {
            const { format } = await parser.parse(() => this.skip(), path.join(cafSamplePath, file), cafMimeType);
            assert.strictEqual(format.container, 'CAF', 'format.container');
            assert.isAbove(format.sampleRate!, 0, 'format.sampleRate');
          });
        });
      });
    }

    it('detects the audio/caf mime-type', async () => {
      const buffer = new Uint8Array(
        await import('node:fs').then(fs => fs.promises.readFile(path.join(cafSamplePath, 'lpcm-le-16bit.caf')))
      );
      const { format } = await mm.parseBuffer(buffer, { mimeType: cafMimeType });
      assert.strictEqual(format.container, 'CAF', 'format.container');
    });
  });
});
