import { rejects } from 'node:assert/strict';
import { assert } from 'chai';
import { fromBuffer } from 'strtok3';
import { MetadataCollector } from '../lib/common/MetadataCollector.js';
import { FlacParser } from '../lib/flac/FlacParser.js';
import { PageHeader } from '../lib/ogg/OggToken.js';
import { OpusStream } from '../lib/ogg/opus/OpusStream.js';
import { SpeexStream } from '../lib/ogg/speex/SpeexStream.js';
import { VorbisDecoder } from '../lib/ogg/vorbis/VorbisDecoder.js';
import { VorbisStream } from '../lib/ogg/vorbis/VorbisStream.js';
import { UnexpectedFileContentError } from '../lib/ParseError.js';
import type { IOptions } from '../lib/type.js';

function uint32(value: number): Buffer {
  const data = Buffer.alloc(4);
  data.writeUInt32LE(value);
  return data;
}

function text(value: string): Buffer {
  const data = Buffer.from(value);
  return Buffer.concat([uint32(data.length), data]);
}

function commentList(vendor: string, comments: string[]): Buffer {
  return Buffer.concat([text(vendor), uint32(comments.length), ...comments.map(text)]);
}

const readers = [
  {
    name: 'FLAC',
    prefix: Buffer.alloc(0),
    create: (metadata: MetadataCollector, options: IOptions) =>
      new FlacParser(metadata, fromBuffer(Buffer.alloc(0)), options)
  },
  {
    name: 'Vorbis',
    prefix: Buffer.from('\x03vorbis'),
    create: (metadata: MetadataCollector, options: IOptions) => new VorbisStream(metadata, options)
  },
  {
    name: 'Opus',
    prefix: Buffer.from('OpusTags'),
    create: (metadata: MetadataCollector, options: IOptions) =>
      new OpusStream(metadata, options, fromBuffer(Buffer.alloc(0)))
  },
  {
    name: 'Speex',
    prefix: Buffer.alloc(0),
    create: (metadata: MetadataCollector, options: IOptions) =>
      new SpeexStream(metadata, options, fromBuffer(Buffer.alloc(0)))
  }
];

function pictureComment(): string {
  const data = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
  const mime = Buffer.from('image/jpeg');
  const header = Buffer.alloc(8);
  header.writeUInt32BE(3); // Front cover
  header.writeUInt32BE(mime.length, 4);
  const properties = Buffer.alloc(24);
  // Empty description, width, height, depth, indexed colours, data length.
  properties.writeUInt32BE(1, 4);
  properties.writeUInt32BE(1, 8);
  properties.writeUInt32BE(24, 12);
  properties.writeUInt32BE(data.length, 20);
  return `METADATA_BLOCK_PICTURE=${Buffer.concat([header, mime, properties, data]).toString('base64')}`;
}

describe('Shared Vorbis comment decoding', () => {
  it('yields comments without consuming format-specific trailing bytes', () => {
    const packet = commentList('Vendor', ['title=Héllo=world', 'ARTIST=Artist']);
    const decoder = new VorbisDecoder(Buffer.concat([Buffer.from([0xaa]), packet, Buffer.from([1, 0xff])]), 1);
    const { vendor, comments } = decoder.parseCommentList();
    assert.strictEqual(vendor, 'Vendor');
    assert.deepEqual(comments.next(), {
      value: { key: 'TITLE', value: 'Héllo=world', len: text('title=Héllo=world').length },
      done: false
    });
    assert.deepEqual(comments.next(), {
      value: { key: 'ARTIST', value: 'Artist', len: text('ARTIST=Artist').length },
      done: false
    });
    assert.isTrue(comments.next().done);
    assert.strictEqual(decoder.remaining, 2);
  });

  for (const reader of readers) {
    describe(reader.name, () => {
      function setup(options: IOptions = {}) {
        const metadata = new MetadataCollector(options);
        const parser = reader.create(metadata, options);
        return {
          metadata,
          parser,
          parse: async (data: Uint8Array) => {
            if (parser instanceof FlacParser) {
              await parser.parseComment(data);
            } else {
              await parser.parsePage(
                PageHeader.get(Buffer.alloc(PageHeader.len), 0),
                Buffer.concat([reader.prefix, data])
              );
              await parser.flush();
            }
          }
        };
      }

      it('preserves comment order, UTF-8, embedded equals signs and tool policy', async () => {
        const { metadata, parser, parse } = setup();
        await parse(commentList('Vendor', ['title=Héllo=world', 'ARTIST=First', 'ARTIST=Second', 'ENCODER=Encoder']));
        assert.strictEqual(metadata.common.title, 'Héllo=world');
        assert.deepEqual(metadata.common.artists, ['First', 'Second']);
        assert.deepEqual(
          metadata.native.vorbis.map(tag => tag.id),
          ['TITLE', 'ARTIST', 'ARTIST', 'ENCODER']
        );
        assert.strictEqual(metadata.format.tool, reader.name === 'FLAC' ? 'Encoder' : undefined);
        if (parser instanceof VorbisStream) {
          assert.isTrue(parser.isMetadataComplete);
        }
      });

      for (const vendor of ['', 'Vendor']) {
        it(`accepts an empty list with vendor=${JSON.stringify(vendor)}`, async () => {
          const { metadata, parse } = setup();
          metadata.setFormat('tool', 'Existing tool');
          await parse(commentList(vendor, []));
          assert.strictEqual(metadata.format.tool, reader.name === 'FLAC' && vendor ? vendor : 'Existing tool');
          assert.isUndefined(metadata.native.vorbis);
        });
      }

      it('decodes picture comments through the existing picture handler', async () => {
        const { metadata, parse } = setup();
        await parse(commentList('Vendor', [pictureComment()]));
        const picture = metadata.common.picture[0];
        assert.strictEqual(picture.format, 'image/jpeg');
        assert.strictEqual(picture.type, 'Cover (front)');
        assert.deepEqual(picture.data, new Uint8Array([0xff, 0xd8, 0xff, 0xd9]));
      });

      it('skips covers before decoding Base64', async () => {
        const { metadata, parse } = setup({ skipCovers: true });
        await parse(commentList('Vendor', ['METADATA_BLOCK_PICTURE=!invalid Base64', 'TITLE=Kept']));
        assert.isUndefined(metadata.common.picture);
        assert.deepEqual(
          metadata.native.vorbis.map(tag => tag.id),
          ['TITLE']
        );
        assert.strictEqual(metadata.common.title, 'Kept');
      });

      for (const [name, payload, message, countError] of [
        ['vendor length', Buffer.alloc(3), 'Truncated Vorbis comment length', false],
        ['vendor string', uint32(5), 'Vorbis comment length 5 exceeds remaining data 0', false],
        ['comment count', uint32(0), 'Truncated Vorbis comment length', false],
        [
          'forged count',
          Buffer.concat([uint32(0), uint32(0xffffffff)]),
          'Vorbis comment count 4294967295 exceeds remaining data',
          true
        ],
        [
          'comment string',
          Buffer.concat([uint32(0), uint32(1), uint32(5)]),
          'Vorbis comment length 5 exceeds remaining data 0',
          false
        ],
        [
          'later comment length',
          Buffer.concat([uint32(0), uint32(2), text('a'), Buffer.alloc(3)]),
          'Truncated Vorbis comment length',
          false
        ]
      ] as const) {
        it(`rejects malformed ${name} with a structured error`, async () => {
          const { parser, parse } = setup();
          await rejects(parse(payload), error => {
            assert.instanceOf(error, UnexpectedFileContentError);
            assert.strictEqual(error.message, message);
            assert.strictEqual(error.fileType, reader.name === 'FLAC' && countError ? 'FLAC' : 'Vorbis');
            return true;
          });
          if (parser instanceof VorbisStream) {
            assert.isFalse(parser.isMetadataComplete);
          }
        });
      }
    });
  }
});
