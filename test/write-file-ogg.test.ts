import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { InvalidFileError, orderTags, parseBuffer, updateBuffer, updateFile } from '../lib/index.js';
import { openSource } from '../lib/write/core/source.js';
import { serializePicture } from '../lib/write/flac/picture.js';
import { buildOggUpdate, crc } from '../lib/write/ogg/ogg.js';
import { parseVorbisCommentWithSuffix } from '../lib/write/vorbis/comment.js';
import { readTags } from './helpers/read.js';

interface OggPage {
  offset: number;
  end: number;
  header: Uint8Array;
  laces: number[];
  body: Uint8Array;
}

function readPages(data: Uint8Array): OggPage[] {
  const pages: OggPage[] = [];
  for (let offset = 0; offset < data.length; ) {
    const segmentCount = data[offset + 26]!;
    const laces = Array.from(data.subarray(offset + 27, offset + 27 + segmentCount));
    const bodySize = laces.reduce((sum, length) => sum + length, 0);
    const end = offset + 27 + segmentCount + bodySize;
    pages.push({
      offset,
      end,
      header: Uint8Array.from(data.subarray(offset, offset + 27)),
      laces,
      body: Uint8Array.from(data.subarray(offset + 27 + segmentCount, end))
    });
    offset = end;
  }
  return pages;
}

function buildPage(header: Uint8Array, laces: readonly number[], body: Uint8Array): Uint8Array {
  const page = new Uint8Array(27 + laces.length + body.length);
  page.set(header.subarray(0, 27));
  page[26] = laces.length;
  page.set(laces, 27);
  page.set(body, 27 + laces.length);
  page.fill(0, 22, 26);
  new DataView(page.buffer).setUint32(22, crc(page), true);
  return page;
}

function pageGranule(page: OggPage): bigint {
  return new DataView(page.header.buffer, page.header.byteOffset, page.header.byteLength).getBigInt64(6, true);
}

function withOpusTagsSuffix(data: Uint8Array, suffix: Uint8Array): Uint8Array {
  const target = readPages(data).find(page => Buffer.from(page.body.subarray(0, 8)).toString() === 'OpusTags');
  if (!target) {
    throw new Error('OpusTags page not found');
  }
  if (target.laces.length !== 1) {
    throw new Error('Expected OpusTags to occupy its own page');
  }
  const last = target.laces[target.laces.length - 1]!;
  const laces = target.laces.slice(0, -1);
  let remaining = last + suffix.length;
  while (remaining >= 255) {
    laces.push(255);
    remaining -= 255;
  }
  laces.push(remaining);
  const page = buildPage(target.header, laces, Buffer.concat([target.body, suffix]));
  return Buffer.concat([data.subarray(0, target.offset), page, data.subarray(target.end)]);
}

function withVorbisCommentSuffix(data: Uint8Array, suffix: Uint8Array): Uint8Array {
  const target = readPages(data).find(
    page => page.body[0] === 3 && Buffer.from(page.body.subarray(1, 7)).toString() === 'vorbis'
  );
  if (!target) {
    throw new Error('Vorbis comments page not found');
  }
  const original = commentPacket(data);
  const packet = Buffer.concat([original.subarray(0, -1), suffix]);
  // Retain any setup packet sharing this page with the original comments.
  const body = Buffer.concat([packet, target.body.subarray(original.length)]);
  const laces = [
    ...new Array(Math.floor(packet.length / 255)).fill(255),
    packet.length % 255,
    ...target.laces.slice(Math.floor(original.length / 255) + 1)
  ];
  const page = buildPage(target.header, laces, body);
  return Buffer.concat([data.subarray(0, target.offset), page, data.subarray(target.end)]);
}

function commentPacket(data: Uint8Array): Uint8Array {
  const pending: Uint8Array[] = [];
  let packetIndex = 0;
  for (const page of readPages(data)) {
    let position = 0;
    for (const length of page.laces) {
      pending.push(page.body.subarray(position, position + length));
      position += length;
      if (length === 255) {
        continue;
      }
      const packet = Buffer.concat(pending);
      pending.length = 0;
      if (packetIndex === 1) {
        return packet;
      }
      packetIndex++;
    }
  }
  throw new Error('Comment packet not found');
}

function expectValidPages(data: Uint8Array, allowContinuedPage = -1): void {
  const pages = readPages(data);
  expect(pages.length).toBeGreaterThan(0);
  let sequence = 0;
  let continued = false;
  pages.forEach((page, index) => {
    const view = new DataView(page.header.buffer, page.header.byteOffset, page.header.byteLength);
    expect(view.getUint32(18, true)).toBe(sequence++);
    expect(Boolean(page.header[5]! & 1)).toBe(continued || index === allowContinuedPage);
    expect(Boolean(page.header[5]! & 2)).toBe(index === 0);
    expect(Boolean(page.header[5]! & 4)).toBe(index === pages.length - 1);
    const copy = Uint8Array.from(data.subarray(page.offset, page.end));
    copy.fill(0, 22, 26);
    expect(crc(copy)).toBe(view.getUint32(22, true));
    continued = page.laces.length > 0 ? page.laces[page.laces.length - 1] === 255 : Boolean(page.header[5]! & 1);
  });
  expect(sequence).toBe(pages.length);
}

describe.each(['vorbis.ogg', 'opus.opus'])('Ogg %s', codec => {
  const fixture = () => readFile(new URL(`./samples/ogg/generated-${codec}`, import.meta.url));
  const titleHeaderSize = codec === 'opus.opus' ? 72 : 74;
  const lacingBoundaryLengths = [1, 2, 3].flatMap(multiple => {
    const boundary = 255 * multiple - titleHeaderSize;
    return [boundary - 1, boundary, boundary + 1];
  });

  it('grows comments across pages and removes fields on repeated saves', async () => {
    const input = await fixture();
    const saved = await updateBuffer(input, { title: 'x'.repeat(100000), native: { CUSTOM: ['one', 'two'] } });
    expect((await readTags(saved)).common.title).toHaveLength(100000);
    const cleared = await updateBuffer(saved, { title: null });
    const tags = await readTags(cleared);
    expect(tags.common.title).toBeUndefined();
    expect(orderTags(tags.native.vorbis ?? []).CUSTOM).toEqual(['one', 'two']);
    expect(await fixture()).toEqual(input);
  });

  it('preserves EOS on header-only streams across growing and shrinking saves', async () => {
    const input = await fixture();
    const pages = readPages(input);
    const audioIndex = pages.findIndex(page => pageGranule(page) > 0n);
    expect(audioIndex).toBeGreaterThan(0);
    const lastHeader = pages[audioIndex - 1]!;
    lastHeader.header[5] = lastHeader.header[5]! | 4;
    const headerOnly = Buffer.concat([
      input.subarray(0, lastHeader.offset),
      buildPage(lastHeader.header, lastHeader.laces, lastHeader.body)
    ]);
    expectValidPages(headerOnly);
    const grown = await updateBuffer(headerOnly, { title: 'x'.repeat(100000) });
    expectValidPages(grown);
    const shrunk = await updateBuffer(grown, { title: null });
    expectValidPages(shrunk);
    expectValidPages(await updateBuffer(shrunk, { title: 'Saved again' }));
  });

  it('rejects unfinished audio followed by an empty continued EOS page', async () => {
    const input = await fixture();
    const audio = readPages(input).find(page => pageGranule(page) > 0n)!;
    audio.header[5] = 0;
    audio.header.fill(255, 6, 14); // No packet finishes on this page.
    const fragment = buildPage(audio.header, [255], audio.body.subarray(0, 255));
    const view = new DataView(audio.header.buffer);
    view.setUint32(18, view.getUint32(18, true) + 1, true);
    audio.header[5] = 1 | 4;
    const truncated = Buffer.concat([
      input.subarray(0, audio.offset),
      fragment,
      buildPage(audio.header, [], new Uint8Array())
    ]);
    expectValidPages(truncated);
    await expect(updateBuffer(truncated, { title: 'Truncated' }).then(() => 'accepted')).rejects.toThrow(
      'Incomplete Ogg stream'
    );
  });

  it('preserves continuation through an empty page between audio fragments', async () => {
    const input = await fixture();
    const audio = readPages(input).find(page => pageGranule(page) > 0n)!;
    audio.header[5] = 0;
    audio.header.fill(255, 6, 14);
    const fragment = buildPage(audio.header, [255], audio.body.subarray(0, 255));
    const view = new DataView(audio.header.buffer);
    view.setUint32(18, view.getUint32(18, true) + 1, true);
    audio.header[5] = 1;
    const empty = buildPage(audio.header, [], new Uint8Array());
    view.setUint32(18, view.getUint32(18, true) + 1, true);
    view.setBigInt64(6, 1n, true);
    audio.header[5] = 1 | 4;
    const complete = Buffer.concat([
      input.subarray(0, audio.offset),
      fragment,
      empty,
      buildPage(audio.header, [1], audio.body.subarray(255, 256))
    ]);
    expectValidPages(complete);
    const saved = await updateBuffer(complete, { title: 'Complete' });
    expectValidPages(saved);
    const savedAudio = readPages(saved).slice(-3);
    expect(savedAudio.map(page => page.laces)).toEqual([[255], [], [1]]);
    expect(Buffer.concat(savedAudio.map(page => page.body))).toEqual(Buffer.from(audio.body.subarray(0, 256)));
    expectValidPages(await updateBuffer(saved, { title: 'Saved again' }));
  });

  it('keeps display artists and individual artists separate when both are supplied', async () => {
    const output = await updateBuffer(await fixture(), {
      artist: 'Display artist',
      artists: ['Artist A', 'Artist B']
    });
    const tags = await readTags(output);
    expect(tags.common.artist).toBe('Display artist');
    expect(tags.common.artists).toEqual(['Artist A', 'Artist B']);
    expect(tags.native.vorbis?.filter(tag => tag.id === 'ARTIST').map(tag => tag.value)).toEqual(['Display artist']);
    expect(tags.native.vorbis?.filter(tag => tag.id === 'ARTISTS').map(tag => tag.value)).toEqual([
      'Artist A',
      'Artist B'
    ]);
  });

  it.each([false, true])('preserves incoming continuation on an empty first audio page, EOS=%s', async eos => {
    const input = await fixture();
    const pages = readPages(input);
    const audioIndex = pages.findIndex(page => pageGranule(page) > 0n);
    const firstAudio = pages[audioIndex]!;
    const header = Uint8Array.from(firstAudio.header);
    header[5] = 1 | (eos ? 4 : 0);
    header.fill(255, 6, 14);
    const empty = buildPage(header, [], new Uint8Array());
    const tail = eos
      ? []
      : pages.slice(audioIndex).map((page, index) => {
          const view = new DataView(page.header.buffer);
          view.setUint32(18, view.getUint32(18, true) + 1, true);
          if (index === 0) {
            page.header[5] = page.header[5]! | 1;
          }
          return buildPage(page.header, page.laces, page.body);
        });
    const joined = Buffer.concat([input.subarray(0, firstAudio.offset), empty, ...tail]);
    if (eos) {
      await expect(updateBuffer(joined, {}).then(() => 'accepted')).rejects.toThrow('Incomplete Ogg stream');
    } else {
      const output = await updateBuffer(joined, { title: 'Joined empty page' });
      expectValidPages(output, readPages(output).length - tail.length - 1);
      expectValidPages(await updateBuffer(output, {}), readPages(output).length - tail.length - 1);
    }
  });

  it.runIf(codec === 'vorbis.ogg').each([7, 29])('rejects a %i-byte Vorbis identification header', async length => {
    const input = await fixture();
    const first = readPages(input)[0]!;
    const invalid = Buffer.concat([
      buildPage(first.header, [length], first.body.subarray(0, length)),
      input.subarray(first.end)
    ]);
    await expect(updateBuffer(invalid, {}).then(() => 'accepted')).rejects.toThrow(InvalidFileError);
  });

  it.runIf(codec === 'opus.opus').each([19, 20, 21, 22])(
    'rejects a %i-byte mapped stereo Opus identification header before file replacement',
    async length => {
      const input = await fixture();
      const first = readPages(input)[0]!;
      const packet = new Uint8Array(length);
      packet.set(first.body);
      packet[9] = 2;
      packet[18] = 1;
      if (length > 19) {
        packet[19] = 1;
      }
      if (length > 20) {
        packet[20] = 1;
      }
      const invalid = Buffer.concat([buildPage(first.header, [length], packet), input.subarray(first.end)]);
      await expect(updateBuffer(invalid, {}).then(() => 'accepted')).rejects.toThrow(InvalidFileError);
      const directory = await mkdtemp(path.join(tmpdir(), 'ogg-invalid-head-'));
      const target = path.join(directory, codec);
      try {
        await writeFile(target, invalid);
        await expect(updateFile(target, {}, { backup: true })).rejects.toThrow(InvalidFileError);
        expect(await readFile(target)).toEqual(invalid);
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    }
  );

  it.runIf(codec === 'opus.opus')('preserves complete mapped Opus identification headers', async () => {
    const input = await fixture();
    const first = readPages(input)[0]!;
    const packet = new Uint8Array(23);
    packet.set(first.body);
    packet[9] = 2;
    packet.set([1, 1, 1, 0, 1], 18); // Family, stream counts, and one mapping per channel.
    const mapped = Buffer.concat([buildPage(first.header, [23], packet), input.subarray(first.end)]);
    const output = await updateBuffer(mapped, {});
    expect(readPages(output)[0]!.body).toEqual(packet);
    expectValidPages(output);
  });

  it('retains only header bytes for source-backed audio chunks', async () => {
    const source = await openSource(await fixture());
    try {
      const { chunks } = await buildOggUpdate(source, { title: 'Streaming' });
      let audioChunks = 0;
      chunks.forEach((chunk, index) => {
        if (chunk instanceof Uint8Array) {
          return;
        }
        const header = chunks[index - 1];
        expect(header).toBeInstanceOf(Uint8Array);
        if (!(header instanceof Uint8Array)) {
          throw new Error('Missing audio header');
        }
        expect(header.buffer.byteLength).toBe(header.byteLength);
        expect(header.byteLength).toBe(27 + header[26]!);
        audioChunks++;
      });
      expect(audioChunks).toBeGreaterThan(0);
    } finally {
      await source.close();
    }
  });

  it('can re-edit a header containing more fragments than the argument limit', async () => {
    const saved = await updateBuffer(await fixture(), { title: 'x'.repeat(40 * 1024 * 1024) });
    const cleared = await updateBuffer(saved, { title: null });
    expect((await readTags(cleared)).common.title).toBeUndefined();
    expectValidPages(cleared);
  }, 30000);

  it('rejects rewritten headers exceeding 64 MiB', async () => {
    // Do not let a failed rejection assertion format a 64 MiB result.
    await expect(
      updateBuffer(await fixture(), { title: 'x'.repeat(64 * 1024 * 1024) }).then(() => 'accepted')
    ).rejects.toThrow('Ogg header packet exceeds 64 MiB');
  }, 30000);

  it('preserves audio pages and timing when comments grow', async () => {
    const input = await fixture();
    const output = await updateBuffer(input, { title: 'x'.repeat(100000) });
    const audioPages = (data: Uint8Array) =>
      readPages(data)
        .filter(page => pageGranule(page) > 0n)
        .map(page => {
          const copy = Uint8Array.from(data.subarray(page.offset, page.end));
          copy.fill(0, 18, 26); // Sequence and CRC change after repagination.
          return Array.from(copy);
        });
    expect(audioPages(output)).toEqual(audioPages(input));
  });

  it.runIf(codec === 'vorbis.ogg')('preserves the payload of a zero-granule audio page', async () => {
    const input = await fixture();
    const audio = readPages(input).find(page => pageGranule(page) > 0n)!;
    const firstLength = audio.laces[0]!;
    expect(firstLength).toBeLessThan(255);
    const header = Uint8Array.from(audio.header);
    header[5] = 0;
    new DataView(header.buffer).setBigInt64(6, 0n, true);
    // The first Vorbis audio packet initializes the overlap buffer and emits no samples.
    const zero = buildPage(header, [firstLength], audio.body.subarray(0, firstLength));
    const view = new DataView(audio.header.buffer);
    view.setUint32(18, view.getUint32(18, true) + 1, true);
    const remaining = buildPage(audio.header, audio.laces.slice(1), audio.body.subarray(firstLength));
    const mutated = Buffer.concat([input.subarray(0, audio.offset), zero, remaining]);
    expectValidPages(mutated);
    const output = await updateBuffer(mutated, { title: 'x'.repeat(100000) });
    expectValidPages(output);
    const normalizedAudio = (data: Uint8Array) =>
      readPages(data)
        .slice(-2)
        .map(page => {
          const copy = Uint8Array.from(data.subarray(page.offset, page.end));
          copy.fill(0, 18, 26);
          return copy;
        });
    expect(pageGranule(readPages(output).at(-2)!)).toBe(0n);
    expect(normalizedAudio(output)).toEqual(normalizedAudio(mutated));
  });

  it('round-trips pictures and preserves them on unrelated edits', async () => {
    const data = Buffer.from('89504e470d0a1a0a', 'hex');
    const saved = await updateBuffer(await fixture(), {
      picture: [{ format: 'image/png', type: 'Cover (front)', description: 'Cover', data }]
    });
    const changed = await updateBuffer(saved, { title: 'Unicode 日本語' });
    const pictures = (await readTags(changed)).common.picture!;
    expect(pictures).toHaveLength(1);
    expect(pictures[0]!.format).toBe('image/png');
    expect(pictures[0]!.description).toBe('Cover');
    expect(Buffer.from(pictures[0]!.data)).toEqual(data);
    expect((await readTags(await updateBuffer(changed, { picture: null }))).common.picture).toBeUndefined();
  });

  it('lets a native picture override the common picture patch', async () => {
    const data = Buffer.from('89504e470d0a1a0a', 'hex');
    const common = { format: 'image/png', type: 'Cover (front)', description: 'common', data };
    const native = { ...common, description: 'native' };
    const nativeValue = Buffer.from(serializePicture(native)).toString('base64');
    const output = await updateBuffer(await fixture(), {
      picture: [common],
      native: { METADATA_BLOCK_PICTURE: nativeValue }
    });
    const tags = await readTags(output);
    expect(tags.native.vorbis?.filter(tag => tag.id === 'METADATA_BLOCK_PICTURE')).toHaveLength(1);
    expect(tags.common.picture).toHaveLength(1);
    expect(tags.common.picture![0]!.description).toBe('native');

    const removed = await updateBuffer(await fixture(), {
      picture: [common],
      native: { METADATA_BLOCK_PICTURE: null }
    });
    expect((await readTags(removed)).common.picture).toBeUndefined();
  });

  it('computes the CRC stored in existing Ogg pages', async () => {
    const data = await fixture();
    for (const page of readPages(data)) {
      const view = new DataView(page.header.buffer, page.header.byteOffset, page.header.byteLength);
      const copy = Uint8Array.from(data.subarray(page.offset, page.end));
      copy.fill(0, 22, 26);
      expect(crc(copy)).toBe(view.getUint32(22, true));
    }
  });

  it('writes contiguous sequences and valid checksums after repagination', async () => {
    expectValidPages(await updateBuffer(await fixture(), { title: 'x'.repeat(100000) }));
  });

  it.each(lacingBoundaryLengths)('repaginates a %i-character title across a lacing boundary', async length => {
    const output = await updateBuffer(await fixture(), { title: 'x'.repeat(length) });
    expect((await readTags(output)).common.title).toBe('x'.repeat(length));
    expectValidPages(output);
  });

  it('accepts a continued first audio page from a joined live stream', async () => {
    const input = await fixture();
    const pages = readPages(input);
    const firstAudio = pages.findIndex(page => pageGranule(page) > 0n);
    expect(firstAudio).toBeGreaterThan(0);
    const target = pages[firstAudio]!;
    const header = Uint8Array.from(target.header);
    header[5] = header[5]! | 1;
    const page = buildPage(header, target.laces, target.body);
    const mutated = Buffer.concat([input.subarray(0, target.offset), page, input.subarray(target.end)]);
    const output = await updateBuffer(mutated, { title: 'Joined' });
    expect((await readTags(output)).common.title).toBe('Joined');
    const outputFirstAudio = readPages(output).findIndex(outputPage => pageGranule(outputPage) > 0n);
    expect(Boolean(readPages(output)[outputFirstAudio]!.header[5]! & 1)).toBe(true);
    expectValidPages(output, outputFirstAudio);
  });

  it('rejects multiplexed streams', async () => {
    const input = await fixture();
    const pages = readPages(input);
    const target = pages[pages.length - 1]!;
    const header = Uint8Array.from(target.header);
    const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
    view.setUint32(14, view.getUint32(14, true) + 1, true);
    const page = buildPage(header, target.laces, target.body);
    const mutated = Buffer.concat([input.subarray(0, target.offset), page, input.subarray(target.end)]);
    await expect(updateBuffer(mutated, {})).rejects.toThrow('Multiplexed');
  });

  it.each([true, false])('supports file writes with atomic=%s, backups and dry runs', async atomic => {
    const directory = await mkdtemp(path.join(tmpdir(), 'ogg-write-'));
    const target = path.join(directory, codec);
    try {
      const input = await fixture();
      await writeFile(target, input);
      const dry = await updateFile(target, { title: 'Dry run' }, { dryRun: true, atomic });
      expect(dry.format).toBe('ogg');
      expect(await readFile(target)).toEqual(input);
      await updateFile(target, { title: 'Saved' }, { backup: true, atomic });
      expect(await readFile(`${target}.bak`)).toEqual(input);
      expect((await readTags(target)).common.title).toBe('Saved');
      const saved = await readFile(target);
      await expect(updateFile(target, {}, { padding: 0 })).rejects.toThrow('padding');
      expect(await readFile(target)).toEqual(saved);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('keeps duration, sample rate and channels through growth and shrinkage', async () => {
    const input = await fixture();
    const before = await parseBuffer(input);
    const large = await updateBuffer(input, { title: 'x'.repeat(130000) });
    const small = await updateBuffer(large, { title: null });
    const after = await parseBuffer(small);
    expect(after.format.duration).toBe(before.format.duration);
    expect(after.format.sampleRate).toBe(before.format.sampleRate);
    expect(after.format.numberOfChannels).toBe(before.format.numberOfChannels);
  });

  it('rejects truncated pages, missing EOS and unsupported write options', async () => {
    const input = await fixture();
    await expect(updateBuffer(input.subarray(0, input.length - 1), {})).rejects.toThrow();
    for (const options of [{ padding: 0 }, { replaceId3: true }, { stripFlacId3: true }]) {
      await expect(updateBuffer(input, {}, options)).rejects.toThrow('Ogg does not support');
    }
    // Removing the last complete page leaves valid checksums but no end of stream.
    let offset = 0;
    let last = 0;
    while (offset < input.length) {
      last = offset;
      const segments = input[offset + 26]!;
      offset += 27 + segments + input.subarray(offset + 27, offset + 27 + segments).reduce((a, b) => a + b, 0);
    }
    await expect(updateBuffer(input.subarray(0, last), {})).rejects.toThrow('Incomplete');
  });

  it('rejects checksum damage and chained streams', async () => {
    const input = await fixture();
    const damaged = Buffer.from(input);
    damaged[30] = damaged[30]! ^ 1;
    await expect(updateBuffer(damaged, {})).rejects.toThrow();
    await expect(updateBuffer(Buffer.concat([input, input]), {})).rejects.toThrow('Chained');
  });

  it.runIf(codec === 'vorbis.ogg').each([1, 3, 255])(
    'accepts Vorbis framing byte %i followed by padding',
    async framing => {
      const padded = withVorbisCommentSuffix(await fixture(), Uint8Array.from([framing, ...new Array(300).fill(0)]));
      const output = await updateBuffer(padded, { title: 'Padded Vorbis' });
      expect((await readTags(output)).common.title).toBe('Padded Vorbis');
      const suffix = parseVorbisCommentWithSuffix(commentPacket(output).subarray(7)).suffix;
      expect(Array.from(suffix)).toEqual([framing, ...new Array(300).fill(0)]);
      expectValidPages(output);
      const cleared = await updateBuffer(output, { title: null });
      expect((await readTags(cleared)).common.title).toBeUndefined();
    }
  );

  it.runIf(codec === 'vorbis.ogg').each([{ suffix: [] }, { suffix: [0, 0, 1] }, { suffix: [2, 0, 1] }])(
    'rejects missing or unset Vorbis framing in suffix $suffix',
    async ({ suffix }) => {
      const invalid = withVorbisCommentSuffix(await fixture(), Uint8Array.from(suffix));
      await expect(updateBuffer(invalid, {})).rejects.toThrow('Missing Vorbis comment framing bit');
    }
  );

  it.runIf(codec === 'opus.opus')('preserves OpusTags padding and binary suffixes', async () => {
    const suffix = Uint8Array.of(0, 0, 0, 0, 1, 2, 3, 255);
    const padded = withOpusTagsSuffix(await fixture(), suffix);
    const output = await updateBuffer(padded, { title: 'Padded' });
    expect((await readTags(output)).common.title).toBe('Padded');
    expect(Array.from(parseVorbisCommentWithSuffix(commentPacket(output).subarray(8)).suffix)).toEqual(
      Array.from(suffix)
    );
    expectValidPages(output);
  });
});

// Small, checksummed empty pages exercise the retained-chunk budget without
// requiring a multi-gigabyte audio fixture.
async function withEmptyAudioPages(codec: string, pageCount: number): Promise<Uint8Array> {
  const input = await readFile(new URL(`./samples/ogg/generated-${codec}`, import.meta.url));
  const pages = readPages(input);
  const audioIndex = pages.findIndex(page => pageGranule(page) > 0n);
  const firstAudio = pages[audioIndex]!;
  const header = Uint8Array.from(firstAudio.header);
  const view = new DataView(header.buffer);
  view.setBigInt64(6, -1n, true);
  const audio = new Uint8Array((pageCount - audioIndex) * 27);
  for (let index = audioIndex; index < pageCount; index++) {
    view.setUint32(18, index, true);
    header[5] = index === pageCount - 1 ? 4 : 0;
    audio.set(buildPage(header, [], new Uint8Array()), (index - audioIndex) * 27);
  }
  return Buffer.concat([input.subarray(0, firstAudio.offset), audio]);
}

describe('Ogg page budget', () => {
  it('accepts exactly 100000 input and output pages', async () => {
    const input = await withEmptyAudioPages('opus.opus', 100000);
    const source = await openSource(input);
    try {
      const update = await buildOggUpdate(source, {});
      expect(update.chunks).toHaveLength(2 + 2 * (100000 - 2));
    } finally {
      await source.close();
    }
  }, 30000);

  it('rejects output pagination exceeding the limit even when input is within it', async () => {
    // The comment and setup packets share a page in this input but are
    // regenerated on separate pages, adding one page to the output.
    const input = await withEmptyAudioPages('vorbis.ogg', 100000);
    await expect(updateBuffer(input, {}).then(() => 'accepted')).rejects.toThrow('Ogg page count exceeds limit');
  }, 30000);

  it.each(['buffer', 'file', 'dry run'])(
    'rejects 100001 input pages during a %s update',
    async mode => {
      const input = await withEmptyAudioPages('opus.opus', 100001);
      if (mode === 'buffer') {
        await expect(updateBuffer(input, {}).then(() => 'accepted')).rejects.toThrow('Ogg page count exceeds limit');
        return;
      }
      const directory = await mkdtemp(path.join(tmpdir(), 'ogg-page-budget-'));
      const target = path.join(directory, 'input.opus');
      try {
        await writeFile(target, input);
        await expect(updateFile(target, {}, { dryRun: mode === 'dry run', backup: true })).rejects.toThrow(
          'Ogg page count exceeds limit'
        );
        expect(await readFile(target)).toEqual(input);
        expect(await readdir(directory)).toEqual(['input.opus']);
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    },
    60000
  );
});

// A header-only Opus stream with exactly the parser's entry limit, comfortably
// below the byte and page budgets. Build the comments directly so this fixture
// does not depend on the serializer whose limit is being tested.
async function withMaximumCommentCount(): Promise<Uint8Array> {
  const input = await readFile(new URL('./samples/ogg/generated-opus.opus', import.meta.url));
  const pages = readPages(input);
  const packet = new Uint8Array(16 + 6 * 1000000);
  packet.set(Buffer.from('OpusTags'));
  new DataView(packet.buffer).setUint32(12, 1000000, true);
  for (let offset = 16; offset < packet.length; offset += 6) {
    packet.set([2, 0, 0, 0, 65, 61], offset); // Length followed by A=.
  }
  const laces = [...new Array(Math.floor(packet.length / 255)).fill(255), packet.length % 255];
  const result: Uint8Array[] = [input.subarray(0, pages[0]!.end)];
  let position = 0;
  for (let index = 0; index < laces.length; index += 255) {
    const table = laces.slice(index, index + 255);
    const length = table.reduce((sum, lace) => sum + lace, 0);
    const header = Uint8Array.from(pages[1]!.header);
    const final = index + 255 >= laces.length;
    header[5] = (index > 0 ? 1 : 0) | (final ? 4 : 0);
    if (!final) {
      header.fill(255, 6, 14);
    }
    new DataView(header.buffer).setUint32(18, result.length, true);
    result.push(buildPage(header, table, packet.subarray(position, position + length)));
    position += length;
  }
  return Buffer.concat(result);
}

it('rejects a final comment count above the parser limit before replacing a file', async () => {
  const input = await withMaximumCommentCount();
  expectValidPages(input);
  // Deleting the repeated entries also demonstrates that the boundary input
  // itself is accepted and can still be rewritten below the limit.
  const reduced = await updateBuffer(input, { native: { A: null }, title: 'Reeditable' });
  expectValidPages(await updateBuffer(reduced, {}));
  const message = 'Vorbis comment count 1000001 exceeds entry limit 1000000';
  await expect(updateBuffer(input, { title: 'Added' }).then(() => 'accepted')).rejects.toThrow(message);
  const directory = await mkdtemp(path.join(tmpdir(), 'ogg-comment-budget-'));
  const target = path.join(directory, 'input.opus');
  try {
    await writeFile(target, input);
    for (const options of [{ dryRun: true }, { atomic: true }, { atomic: false }]) {
      await expect(updateFile(target, { title: 'Added' }, { ...options, backup: true })).rejects.toThrow(message);
      expect(await readFile(target)).toEqual(input);
      expect(await readdir(directory)).toEqual(['input.opus']);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 30000);
