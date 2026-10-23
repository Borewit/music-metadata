import { rejects } from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { assert } from 'chai';
import { fromBuffer } from 'strtok3';
import { MetadataCollector } from '../lib/common/MetadataCollector.js';
import { parseBuffer, parseStream } from '../lib/index.js';
import { PageHeader } from '../lib/ogg/OggToken.js';
import { SpeexStream } from '../lib/ogg/speex/SpeexStream.js';
import { TheoraStream } from '../lib/ogg/theora/TheoraStream.js';
import { VorbisStream } from '../lib/ogg/vorbis/VorbisStream.js';
import { UnexpectedFileContentError } from '../lib/ParseError.js';
import { samplePath } from './util.js';

class PacketReader extends VorbisStream {
  public packet(data: Uint8Array) {
    return this.parseFullPage(data);
  }
}

describe('Truncated Ogg metadata', () => {
  it('does not decode an empty flush after an identification-only stream', async () => {
    const parser = new VorbisStream(new MetadataCollector({}), {});
    await parser.flush();
  });

  for (const length of [0, 1, 6]) {
    it(`rejects a ${length}-byte metadata header with a content error`, async () => {
      const parser = new PacketReader(new MetadataCollector({}), {});
      const data = Buffer.alloc(length, 3);
      await rejects(parser.packet(data), UnexpectedFileContentError);
    });
  }

  it('ignores short audio packets without decoding them as metadata', async () => {
    const parser = new PacketReader(new MetadataCollector({}), {});
    await parser.packet(Buffer.from([0]));
  });

  for (const length of [0, 1, 6, 7, 29]) {
    it(`rejects a ${length}-byte first Vorbis packet before decoding fixed fields`, async () => {
      const parser = new VorbisStream(new MetadataCollector({}), {});
      const header = PageHeader.get(Buffer.alloc(PageHeader.len), 0);
      header.headerType.firstPage = true;
      const data = Buffer.alloc(length);
      Buffer.from('\x01vorbis').copy(data);
      await rejects(parser.parsePage(header, data), {
        name: 'UnexpectedFileContentError',
        fileType: 'Vorbis',
        message: length < 7 ? 'Truncated Vorbis packet header' : 'Truncated Vorbis identification header'
      });
    });
  }

  it('accepts an exact-length Vorbis identification packet', async () => {
    const metadata = new MetadataCollector({});
    const parser = new VorbisStream(metadata, {});
    const header = PageHeader.get(Buffer.alloc(PageHeader.len), 0);
    header.headerType.firstPage = true;
    const data = Buffer.alloc(30);
    data.write('\x01vorbis', 0, 'ascii');
    data[11] = 2;
    data.writeUInt32LE(44100, 12);
    await parser.parsePage(header, data);
    assert.equal(metadata.format.numberOfChannels, 2);
    assert.equal(metadata.format.sampleRate, 44100);
  });

  for (const [codec, length] of [
    ['Speex', 79],
    ['Theora', 41]
  ] as const) {
    it(`rejects a short ${codec} identification header`, async () => {
      const metadata = new MetadataCollector({});
      const tokenizer = fromBuffer(Buffer.alloc(0));
      const parser =
        codec === 'Speex' ? new SpeexStream(metadata, {}, tokenizer) : new TheoraStream(metadata, {}, tokenizer);
      const header = PageHeader.get(Buffer.alloc(PageHeader.len), 0);
      header.headerType.firstPage = true;
      await rejects(
        parser.parsePage(header, Buffer.alloc(length)),
        error => error instanceof UnexpectedFileContentError && error.fileType === codec
      );
    });
  }

  it('checks a metadata header assembled across continued pages', async () => {
    const parser = new VorbisStream(new MetadataCollector({}), {});
    const header = PageHeader.get(Buffer.alloc(PageHeader.len), 0);
    await parser.parsePage(header, Buffer.from([3]));
    header.headerType.continued = true;
    header.headerType.lastPage = true;
    await rejects(parser.parsePage(header, Buffer.from('vor')), UnexpectedFileContentError);
  });

  for (const length of [64, 1024]) {
    it(`preserves partial Vorbis metadata from a ${length}-byte file/stream prefix`, async () => {
      const input = (await readFile(path.join(samplePath, 'ogg/audio.vorbis.ogg'))).subarray(0, length);
      for (const metadata of [
        await parseBuffer(input, { path: 'x.ogg' }, { duration: true }),
        await parseStream(Readable.from([input], { objectMode: false }), { path: 'x.ogg' }, { duration: true })
      ]) {
        assert.equal(metadata.format.codec, 'Vorbis I');
        assert.equal(metadata.format.sampleRate, 44100);
      }
    });
  }
});
