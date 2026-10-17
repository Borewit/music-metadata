import { Readable } from 'node:stream';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { assert, expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { EndOfStreamError, fromStream } from 'strtok3';
import { parseFromTokenizer } from '../lib/index.js';

use(chaiAsPromised);

function element(id: string, ...parts: Uint8Array[]): Buffer {
  const payload = Buffer.concat(parts);
  const size = Buffer.alloc(2);
  size.writeUInt16BE(0x4000 | payload.length);
  return Buffer.concat([Buffer.from(id, 'hex'), size, payload]);
}

function tags(name: string, value: string): Buffer {
  return element(
    '1254c367',
    element('7373', element('67c8', element('45a3', Buffer.from(name)), element('4487', Buffer.from(value))))
  );
}

function indexedSample(withIndex = true, withPrefix = false) {
  const header = element('1a45dfa3', element('4282', Buffer.from('matroska')));
  const clusterPayload = new Uint8Array([1, 2, 3]);
  const cluster = element('1f43b675', clusterPayload);
  const unindexedTags = tags('TITLE', 'Unindexed title');
  const indexedTags = tags('ARTIST', 'Indexed artist');
  const seekHead = (position: number): Buffer => {
    const offset = Buffer.alloc(2);
    offset.writeUInt16BE(position);
    return element(
      '114d9b74',
      element('4dbb', element('53ab', Buffer.from('1254c367', 'hex')), element('53ac', offset))
    );
  };
  // SeekPosition is relative to the segment payload; a fixed-width value keeps the head size stable.
  const prefix = withPrefix ? element('ec', new Uint8Array(17)) : new Uint8Array();
  const seek = withIndex
    ? seekHead(prefix.length + seekHead(0).length + cluster.length + unindexedTags.length)
    : new Uint8Array();
  const data = Buffer.concat([header, element('18538067', prefix, seek, cluster, unindexedTags, indexedTags)]);
  const skipEnd = data.length - indexedTags.length;
  return { data, skipStart: skipEnd - unindexedTags.length - clusterPayload.length, skipEnd };
}

async function streamSample(withIndex = true, withPrefix = false) {
  const sample = indexedSample(withIndex, withPrefix);
  const tokenizer = await fromStream(Readable.from([sample.data], { objectMode: false }), {
    fileInfo: { mimeType: 'video/x-matroska' }
  });
  return { ...sample, tokenizer };
}

describe('Matroska indexed stream skips', () => {
  it('resolves index positions relative to the Segment when SeekHead is not its first child', async () => {
    const { tokenizer } = await streamSample(true, true);
    try {
      const { common } = await parseFromTokenizer(tokenizer, { mkvUseIndex: true });
      assert.strictEqual(common.artist, 'Indexed artist');
      assert.isUndefined(common.title);
    } finally {
      await tokenizer.close();
    }
  });

  it('waits for a delayed indexed skip before reading the next header', async () => {
    const { tokenizer, skipStart, skipEnd } = await streamSample();
    const ignore = tokenizer.ignore.bind(tokenizer);
    const peekNumber = tokenizer.peekNumber.bind(tokenizer);
    let skipStarted = false;
    let skipFinished = false;
    tokenizer.ignore = async length => {
      if (tokenizer.position === skipStart && length === skipEnd - skipStart) {
        skipStarted = true;
        await nextTurn();
        const ignored = await ignore(length);
        skipFinished = true;
        return ignored;
      }
      return ignore(length);
    };
    tokenizer.peekNumber = token => {
      assert.isFalse(skipStarted && !skipFinished, 'must finish the indexed skip before reading another header');
      return peekNumber(token);
    };
    try {
      const { common } = await parseFromTokenizer(tokenizer, { mkvUseIndex: true });
      assert.isTrue(skipFinished, 'must exercise the indexed skip');
      assert.strictEqual(common.artist, 'Indexed artist');
      assert.isUndefined(common.title, 'unindexed metadata remains skipped');
    } finally {
      await tokenizer.close();
    }
  });

  for (const error of [new Error('Indexed skip failed'), new EndOfStreamError()]) {
    it(`propagates indexed skip rejection (${error.name})`, async () => {
      const { tokenizer, skipStart, skipEnd } = await streamSample();
      const ignore = tokenizer.ignore.bind(tokenizer);
      let skipAttempted = false;
      tokenizer.ignore = async length => {
        if (tokenizer.position === skipStart && length === skipEnd - skipStart) {
          skipAttempted = true;
          await nextTurn();
          throw error;
        }
        return ignore(length);
      };
      try {
        await expect(parseFromTokenizer(tokenizer, { mkvUseIndex: true })).to.be.rejectedWith(error);
        assert.isTrue(skipAttempted, 'must exercise the indexed skip');
      } finally {
        await tokenizer.close();
      }
    });
  }

  for (const [withIndex, mkvUseIndex] of [
    [true, false],
    [false, true]
  ]) {
    it(`preserves unindexed metadata with SeekHead=${withIndex}, mkvUseIndex=${mkvUseIndex}`, async () => {
      const { tokenizer } = await streamSample(withIndex);
      try {
        const { common } = await parseFromTokenizer(tokenizer, { mkvUseIndex });
        assert.strictEqual(common.artist, 'Indexed artist');
        assert.strictEqual(common.title, 'Unindexed title');
      } finally {
        await tokenizer.close();
      }
    });
  }
});
