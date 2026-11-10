import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Picture, TagPatch } from '../lib/index.js';
import { InvalidFileError, InvalidPatchError, parseFile, updateFile } from '../lib/index.js';
import { applyVorbisPatch } from '../lib/write/mapping/vorbis.js';
import {
  parseVorbisComment,
  parseVorbisCommentWithSuffix,
  serializeVorbisComment
} from '../lib/write/vorbis/comment.js';
import { extractAudio, extractBlocks } from './helpers/flac.js';

describe('Vorbis Comment codec', () => {
  it('round-trips vendor and repeated fields', () => {
    const fields = {
      vendor: 'vendor with ünicode',
      comments: [
        { key: 'TITLE', value: 'Title with ünicode' },
        { key: 'ARTIST', value: 'A' },
        { key: 'ARTIST', value: 'B' },
        { key: 'EMPTY', value: '' }
      ]
    };

    const encoded = serializeVorbisComment(fields);
    expect(parseVorbisComment(encoded)).toEqual(fields);
  });

  it('uses the parser entry limit for serialized comments', () => {
    const comments = new Array(1000000).fill({ key: 'A', value: '' });
    const encoded = serializeVorbisComment({ vendor: '', comments });
    expect(parseVorbisComment(encoded).comments).toHaveLength(1000000);
    comments.push({ key: 'TITLE', value: 'Added' });
    expect(() => serializeVorbisComment({ vendor: '', comments })).toThrow(
      'Vorbis comment count 1000001 exceeds entry limit 1000000'
    );
  }, 30000);

  it('rejects malformed comments', () => {
    const encoded = serializeVorbisComment({
      vendor: 'v',
      comments: [{ key: 'BROKEN', value: 'x' }]
    });
    // Replace the field separator with a normal character.
    const separator = encoded.indexOf(0x3d);
    expect(separator).toBeGreaterThan(0);
    encoded[separator] = 0x5a;
    expect(() => parseVorbisComment(encoded)).toThrow(InvalidFileError);
  });

  it('rejects trailing bytes', () => {
    const encoded = serializeVorbisComment({ vendor: 'v', comments: [{ key: 'TITLE', value: 'x' }] });
    const withTrailing = new Uint8Array(encoded.length + 1);
    withTrailing.set(encoded);
    expect(() => parseVorbisComment(withTrailing)).toThrow(InvalidFileError);
  });

  it('parseVorbisCommentWithSuffix rejects truncated vendor length', () => {
    // Not enough bytes for the vendor length field (needs 4 bytes)
    const data = new Uint8Array([5, 0, 0]); // only 3 bytes
    expect(() => parseVorbisCommentWithSuffix(data)).toThrow('Truncated Vorbis comment vendor length');
  });

  it('parseVorbisCommentWithSuffix rejects vendor length exceeding remaining data', () => {
    // vendor length = 10 (little-endian: 10,0,0,0) but only 4 bytes remain
    const data = new Uint8Array([10, 0, 0, 0, 0, 0, 0, 0]);
    expect(() => parseVorbisCommentWithSuffix(data)).toThrow('Vorbis comment vendor length 10 exceeds remaining data');
  });

  it('parseVorbisCommentWithSuffix rejects comment count exceeding entry limit', () => {
    // Need enough remaining data to pass readLength check, then MAX_COMMENTS check triggers
    // MAX_COMMENTS = 1,000,000. Use count = 1,000,001 with sufficient dummy data.
    const count = 1000001;
    const data = new Uint8Array(8 + count * 4); // vendor(4) + count(4) + count*4 bytes for entry lengths
    data.set([0, 0, 0, 0], 0); // vendor = 0
    data.set([count & 0xff, (count >> 8) & 0xff, (count >> 16) & 0xff, (count >> 24) & 0xff], 4); // count = 1000001
    expect(() => parseVorbisCommentWithSuffix(data)).toThrow(
      'Vorbis comment count 1000001 exceeds entry limit 1000000'
    );
  });

  it('parseVorbisCommentWithSuffix rejects comment count exceeding remaining data', () => {
    // vendor=0 (4 bytes), comment count=1000 (little-endian: 232,3,0,0) but no entry data
    const data = new Uint8Array([0, 0, 0, 0, 232, 3, 0, 0]);
    expect(() => parseVorbisCommentWithSuffix(data)).toThrow(
      'Vorbis comment comment count length 1000 exceeds remaining data'
    );
  });

  it('parseVorbisCommentWithSuffix rejects comment count exceeding available entry-length fields', () => {
    // Empty vendor, count = 2, but only one 4-byte entry-length field remains.
    const data = new Uint8Array([0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0]);
    expect(() => parseVorbisCommentWithSuffix(data)).toThrow('Vorbis comment count 2 exceeds remaining data');
  });

  it('parseVorbisCommentWithSuffix parses suffix correctly', () => {
    const fields = { vendor: 'test', comments: [{ key: 'TITLE', value: 'Song' }] };
    const encoded = serializeVorbisComment(fields);
    const suffix = new Uint8Array([1, 2, 3, 4]);
    const withSuffix = new Uint8Array(encoded.length + suffix.length);
    withSuffix.set(encoded);
    withSuffix.set(suffix, encoded.length);
    const result = parseVorbisCommentWithSuffix(withSuffix);
    expect(result.vendor).toBe('test');
    expect(result.comments).toEqual([{ key: 'TITLE', value: 'Song' }]);
    expect(result.suffix).toEqual(suffix);
  });
});

describe('Vorbis tag mapping', () => {
  it('applies common tags and preserves unknown fields', () => {
    const fields = {
      vendor: 'v',
      comments: [
        { key: 'TITLE', value: 'Old' },
        { key: 'UNKNOWN', value: 'keep' },
        { key: 'ARTIST', value: 'Old artist' }
      ]
    };

    const updated = applyVorbisPatch(fields, {
      title: 'New',
      artists: ['A', 'B'],
      genre: ['Rock'],
      track: { no: 2, of: 10 },
      native: { CUSTOM: ['one', 'two'] }
    });

    expect(updated.comments).toEqual([
      { key: 'TITLE', value: 'New' },
      { key: 'UNKNOWN', value: 'keep' },
      { key: 'ARTIST', value: 'A' },
      { key: 'ARTIST', value: 'B' },
      { key: 'GENRE', value: 'Rock' },
      { key: 'TRACKNUMBER', value: '2' },
      { key: 'TRACKTOTAL', value: '10' },
      { key: 'TOTALTRACKS', value: '10' },
      { key: 'CUSTOM', value: 'one' },
      { key: 'CUSTOM', value: 'two' }
    ]);
  });

  it('appends picture comments without exceeding the argument limit', () => {
    const pictureComments = Array.from({ length: 180000 }, (_, index) => ({
      key: 'METADATA_BLOCK_PICTURE',
      value: String(index)
    }));
    const updated = applyVorbisPatch(
      { vendor: 'v', comments: [{ key: 'CUSTOM', value: 'keep' }] },
      { picture: [] },
      { pictureComments }
    );
    expect(updated.comments).toHaveLength(pictureComments.length + 1);
    expect(updated.comments[0]).toEqual({ key: 'CUSTOM', value: 'keep' });
    expect(updated.comments.slice(1)).toEqual(pictureComments);
  });

  it.each([{ picture: null }, { picture: [] }])(
    'removes all artwork comments on an explicit picture update $picture',
    ({ picture }) => {
      const fields = {
        vendor: 'v',
        comments: [
          { key: 'METADATA_BLOCK_PICTURE', value: 'old' },
          { key: 'coverart', value: 'legacy' },
          { key: 'CoVeRaRtMiMe', value: 'image/png' },
          { key: 'CUSTOM', value: 'keep' }
        ]
      };
      expect(applyVorbisPatch(fields, { title: 'Unrelated' }).comments.slice(0, 3)).toEqual(
        fields.comments.slice(0, 3)
      );
      expect(applyVorbisPatch(fields, { picture }).comments).toEqual([{ key: 'CUSTOM', value: 'keep' }]);
      expect(
        applyVorbisPatch(
          fields,
          {
            picture,
            native: { COVERART: 'explicit', COVERARTMIME: 'image/jpeg' }
          },
          { pictureComments: [{ key: 'METADATA_BLOCK_PICTURE', value: 'new' }] }
        ).comments
      ).toEqual([
        { key: 'CUSTOM', value: 'keep' },
        { key: 'METADATA_BLOCK_PICTURE', value: 'new' },
        { key: 'COVERART', value: 'explicit' },
        { key: 'COVERARTMIME', value: 'image/jpeg' }
      ]);
    }
  );

  it('removes fields with null', () => {
    const fields = {
      vendor: 'v',
      comments: [
        { key: 'TITLE', value: 'Old' },
        { key: 'ARTIST', value: 'A' },
        { key: 'ARTIST', value: 'B' }
      ]
    };

    const updated = applyVorbisPatch(fields, { title: null, artist: null, track: null });
    expect(updated.comments).toEqual([]);
  });

  it('maps ratings and rejects invalid normalized values', () => {
    expect(
      applyVorbisPatch(
        { vendor: 'v', comments: [] },
        {
          rating: [{ rating: 0.6 }, { source: 'user@example.org', rating: 1 }]
        }
      ).comments
    ).toEqual([
      { key: 'RATING', value: '60' },
      { key: 'RATING:user@example.org', value: '1' }
    ]);
    for (const rating of [-1, 2, Number.NaN]) {
      expect(() =>
        applyVorbisPatch(
          { vendor: 'v', comments: [] },
          {
            rating: [{ rating }]
          }
        )
      ).toThrow(InvalidPatchError);
    }
  });

  it('rejects invalid native field names', () => {
    expect(() => applyVorbisPatch({ vendor: 'v', comments: [] }, { native: { 'BAD=NAME': 'x' } })).toThrow(
      InvalidPatchError
    );
    expect(() => applyVorbisPatch({ vendor: 'v', comments: [] }, { native: { 'BAD\nNAME': 'x' } })).toThrow(
      InvalidPatchError
    );
  });

  it('rejects multiple values for single-value fields', () => {
    expect(() => applyVorbisPatch({ vendor: 'v', comments: [] }, { title: ['A', 'B'] })).toThrow(InvalidPatchError);
  });
});

// Independent scenarios inspired by quodlibet/mutagen at
// ada28b2cc92c515f3f26640a6feef6516d195872:
// tests/test__vorbis.py (Tistag, TVComment, TVCommentDict) and
// tests/test_flac.py (test_ooming_vc_header, test_force_grow/shrink).
// FLAC comment blocks have no Ogg framing byte; malformed input is strict here.
describe('Mutagen-inspired Vorbis regressions', () => {
  it('accepts an empty vendor and comment list without an Ogg framing byte', () => {
    expect(parseVorbisComment(new Uint8Array(8))).toEqual({ vendor: '', comments: [] });
  });

  it('rejects every truncated prefix of a complete comment block', () => {
    const encoded = serializeVorbisComment({ vendor: '编码器', comments: [{ key: 'TITLE', value: '曲目 🎵' }] });
    for (let length = 0; length < encoded.length; length++) {
      expect(() => parseVorbisComment(encoded.subarray(0, length)), `length ${length}`).toThrow(InvalidFileError);
    }
  });

  it.each(['vendor length', 'comment count', 'comment length'])(
    'rejects an oversized %s without allocating it',
    field => {
      const encoded = Buffer.from(serializeVorbisComment({ vendor: '', comments: [{ key: 'TITLE', value: 'x' }] }));
      const offset = field === 'vendor length' ? 0 : field === 'comment count' ? 4 : 8;
      encoded.writeUInt32LE(0xffffffff, offset);
      expect(() => parseVorbisComment(encoded)).toThrow(InvalidFileError);
    }
  );

  it('preserves equals signs and Unicode in values, with UTF-8 byte lengths', () => {
    const fields = { vendor: '厂牌', comments: [{ key: 'LYRICS', value: '第一行=🎵=第二行' }] };
    const encoded = Buffer.from(serializeVorbisComment(fields));
    expect(encoded.readUInt32LE(0)).toBe(Buffer.byteLength(fields.vendor));
    const lengthOffset = 4 + Buffer.byteLength(fields.vendor) + 4;
    expect(encoded.readUInt32LE(lengthOffset)).toBe(Buffer.byteLength(`LYRICS=${fields.comments[0]!.value}`));
    expect(parseVorbisComment(encoded)).toEqual(fields);
  });

  it.each(['', 'BAD=KEY', 'BAD~KEY', 'BAD\x1fKEY', 'BAD\x7fKEY', '曲目'])(
    'rejects invalid native field name %j',
    key => {
      expect(() => applyVorbisPatch({ vendor: '', comments: [] }, { native: { [key]: 'value' } })).toThrow(
        InvalidPatchError
      );
    }
  );

  it.each([' ', '!custom{}[]-_()*&', '}'])('accepts printable field name %j', key => {
    const updated = applyVorbisPatch({ vendor: '', comments: [] }, { native: { [key]: 'value' } });
    expect(parseVorbisComment(serializeVorbisComment(updated))).toEqual({
      vendor: '',
      comments: [{ key, value: 'value' }]
    });
  });

  it('replaces mixed-case duplicate fields together without mutating the source', () => {
    const fields = {
      vendor: 'original encoder',
      comments: [
        { key: 'aRtIsT', value: 'Old first' },
        { key: 'CUSTOM', value: 'untouched' },
        { key: 'ARTIST', value: 'Old second' },
        { key: 'artist', value: 'Old third' }
      ]
    };
    const original = structuredClone(fields);
    const updated = applyVorbisPatch(fields, { native: { ArTiSt: ['New first', 'New second'] } });
    expect(updated).toEqual({
      vendor: fields.vendor,
      comments: [
        { key: 'ArTiSt', value: 'New first' },
        { key: 'ArTiSt', value: 'New second' },
        { key: 'CUSTOM', value: 'untouched' }
      ]
    });
    expect(fields).toEqual(original);
    expect(applyVorbisPatch(updated, { native: { aRTIST: null } })).toEqual({
      vendor: fields.vendor,
      comments: [{ key: 'CUSTOM', value: 'untouched' }]
    });
  });

  it('grows and shrinks repeated FLAC fields while preserving vendor and audio', async () => {
    await withUntaggedCopy(async target => {
      // Inspect the actual stored block as well as the independent reader result.
      const readFields = async () =>
        parseVorbisComment(extractBlocks(await readFile(target)).find(block => block.type === 4)!.data);
      const values = Array.from({ length: 32 }, (_, index) => `${index}:${'长歌词 🎵='.repeat(1024)}`);
      await updateFile(target, { title: '保留的标题', native: { LARGE: values } }, { padding: 0 });
      const grownSize = (await readFile(target)).length;
      const grown = await readFields();
      expect(grown.comments.filter(comment => comment.key === 'LARGE').map(comment => comment.value)).toEqual(values);
      expect((await parseFile(target)).common.title).toBe('保留的标题');

      await updateFile(target, { native: { large: 'small' } }, { padding: 0 });
      expect((await readFile(target)).length).toBeLessThan(grownSize);
      const shrunk = await readFields();
      expect(shrunk.vendor).toBe(grown.vendor);
      expect(shrunk.comments.filter(comment => comment.key.toUpperCase() === 'LARGE')).toEqual([
        { key: 'large', value: 'small' }
      ]);
      expect((await parseFile(target)).common.title).toBe('保留的标题');

      await updateFile(target, { native: { LARGE: null } }, { padding: 0 });
      expect((await readFields()).comments.some(comment => comment.key.toUpperCase() === 'LARGE')).toBe(false);
      expect((await parseFile(target)).common.title).toBe('保留的标题');
    });
  });
});

const bethHartSample = path.join(import.meta.dirname, 'samples', "flac/MusicBrainz - Beth Hart - Sinner's Prayer.flac");

describe('Beth Hart FLAC metadata transfer', () => {
  it('writes all native metadata to a new, untagged file', async () => {
    await withUntaggedCopy(async (target, before) => {
      const native: Record<string, string[]> = {};
      const pictures: Picture[] = [];
      expect(Object.keys(before.native)).toEqual(['vorbis']);
      for (const tag of before.native.vorbis!) {
        if (tag.id === 'METADATA_BLOCK_PICTURE') {
          pictures.push(tag.value as Picture);
        } else {
          expect(typeof tag.value, tag.id).toBe('string');
          (native[tag.id] ??= []).push(tag.value as string);
        }
      }

      await updateFile(target, { native, picture: pictures });
      const after = await parseFile(target);
      // Block placement may change; preserve every value and its order
      // within each field, including both picture payloads.
      const group = (tags: typeof before.native) => {
        const result: Record<string, unknown[]> = {};
        for (const tag of tags.vorbis ?? []) {
          (result[tag.id] ??= []).push(tag.value);
        }
        return result;
      };
      expect(group(after.native)).toEqual(group(before.native));
      expect(after.common).toEqual(before.common);
    });
  });

  it('writes common metadata to a new file with identical music-metadata common output', async () => {
    const { common } = await parseFile(bethHartSample);
    await withUntaggedCopy(async target => {
      // No native fallback or common-to-Vorbis translation in the test.
      // The reader's full common type includes shapes outside TagPatch;
      // this fixture's complete common result must nevertheless round-trip.
      await updateFile(target, common as unknown as TagPatch);

      const { common: writtenCommon } = await parseFile(target);
      expect(writtenCommon).toEqual(common);
    });
  });
});

async function withUntaggedCopy(
  verify: (target: string, before: Awaited<ReturnType<typeof parseFile>>) => Promise<void>
): Promise<void> {
  const directory = await mkdtemp(path.join(tmpdir(), 'metadata-transfer-'));
  try {
    const input = await readFile(bethHartSample);
    const before = await parseFile(bethHartSample);
    // Retain the actual STREAMINFO and audio, but no comments or pictures.
    const streamInfo = extractBlocks(input).find(block => block.type === 0)!;
    const bare = Buffer.concat([
      Buffer.from([0x66, 0x4c, 0x61, 0x43, 0x80, 0, 0, 34]),
      streamInfo.data,
      extractAudio(input)
    ]);
    const target = path.join(directory, 'output.flac');
    await writeFile(target, bare);
    const empty = await parseFile(target);
    expect(empty.native).toEqual({});
    expect(empty.common.picture).toBeUndefined();

    await verify(target, before);

    expect(Buffer.from(extractAudio(await readFile(target)))).toEqual(Buffer.from(extractAudio(input)));
    expect(await readFile(bethHartSample)).toEqual(input);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
