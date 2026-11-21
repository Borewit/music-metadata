import { Readable } from 'node:stream';
import { fromBuffer, fromStream } from 'strtok3';
import { UINT32_BE, Uint8ArrayType } from 'token-types';
import { describe, expect, it, vi } from 'vitest';
import { TokenizerCache } from '../lib/common/TokenizerCache.js';

describe('TokenizerCache', () => {
  function bufferCache(data = Uint8Array.of(0, 0, 0, 1, 0, 0, 0, 2)) {
    const tokenizer = fromBuffer(data);
    return { tokenizer, cache: new TokenizerCache(tokenizer) };
  }

  describe('buffering', () => {
    it('uses a larger lookahead for random-access tokenizers', () => {
      const { cache } = bufferCache();
      expect(cache.buffer.length).toBe(16384);
    });

    it('uses a bounded lookahead for forward-only streams', async () => {
      const tokenizer = await fromStream(Readable.from([Uint8Array.of(1, 2, 3)]));
      const cache = new TokenizerCache(tokenizer);
      expect(cache.buffer.length).toBe(1024);
      expect(cache.supportsRandomAccess()).toBe(false);
      expect(() => cache.setPosition(0)).toThrow('Tokenizer does not support random access');
      await cache.abort();
    });

    it('serves peek and read requests from the refreshed window', async () => {
      const { cache, tokenizer } = bufferCache();
      const peekBuffer = vi.spyOn(tokenizer, 'peekBuffer');
      const readBuffer = vi.spyOn(tokenizer, 'readBuffer');
      const ignore = vi.spyOn(tokenizer, 'ignore');
      await cache.refresh();
      expect(peekBuffer).toHaveBeenCalledTimes(1);
      peekBuffer.mockClear();
      readBuffer.mockClear();

      const peeked = new Uint8Array(4);
      expect(await cache.peekBuffer(peeked)).toBe(4);
      expect(Array.from(peeked)).toEqual([0, 0, 0, 1]);
      expect(cache.position).toBe(0);

      const read = new Uint8Array(4);
      expect(await cache.readBuffer(read)).toBe(4);
      expect(Array.from(read)).toEqual([0, 0, 0, 1]);
      expect(cache.position).toBe(4);
      expect(peekBuffer).not.toHaveBeenCalled();
      expect(readBuffer).not.toHaveBeenCalled();
      expect(ignore).toHaveBeenCalledExactlyOnceWith(4);
    });

    it('falls back for position-specific and out-of-window buffer requests', async () => {
      const { cache } = bufferCache();
      await cache.refresh();

      const positioned = new Uint8Array(4);
      expect(await cache.peekBuffer(positioned, { position: 4 })).toBe(4);
      expect(Array.from(positioned)).toEqual([0, 0, 0, 2]);
      expect(cache.position).toBe(0);

      const short = new Uint8Array(16);
      expect(await cache.peekBuffer(short, { length: 16, mayBeLess: true })).toBe(8);
      expect(cache.position).toBe(0);

      const read = new Uint8Array(4);
      expect(await cache.readBuffer(read, { position: 4 })).toBe(4);
      expect(Array.from(read)).toEqual([0, 0, 0, 2]);
      expect(cache.position).toBe(8);
    });
  });

  describe('token helpers', () => {
    it('serves validated tokens from the refreshed window', async () => {
      const { cache, tokenizer } = bufferCache();
      const peekBuffer = vi.spyOn(tokenizer, 'peekBuffer');
      const readBuffer = vi.spyOn(tokenizer, 'readBuffer');
      const peekToken = vi.spyOn(tokenizer, 'peekToken');
      const readToken = vi.spyOn(tokenizer, 'readToken');
      const ignore = vi.spyOn(tokenizer, 'ignore');
      await cache.refresh();

      expect(await cache.peekToken(UINT32_BE)).toBe(1);
      expect(peekToken).toHaveBeenCalledTimes(1);
      for (const spy of [peekBuffer, readBuffer, peekToken, readToken]) {
        spy.mockClear();
      }

      expect(await cache.peekToken(UINT32_BE, 0)).toBe(1);
      expect(cache.position).toBe(0);
      expect(await cache.readToken(UINT32_BE)).toBe(1);
      expect(cache.position).toBe(4);
      expect(await cache.readToken(UINT32_BE)).toBe(2);
      expect(cache.position).toBe(8);
      for (const spy of [peekBuffer, readBuffer, peekToken, readToken]) {
        expect(spy).not.toHaveBeenCalled();
      }
      expect(ignore.mock.calls).toEqual([[4], [4]]);
    });

    it('falls back for token reads at another position', async () => {
      const { cache } = bufferCache();
      await cache.refresh();

      expect(await cache.peekToken(UINT32_BE, 4)).toBe(2);
      expect(cache.position).toBe(0);
      expect(await cache.readToken(UINT32_BE, 4)).toBe(2);
      expect(cache.position).toBe(8);
    });

    it('returns peeked token results that remain valid after refresh', async () => {
      const { cache } = bufferCache(Uint8Array.of(1, 2, 3, 4, 5, 6, 7, 8));
      const token = new Uint8ArrayType(4);
      await cache.peekToken(token);
      await cache.refresh();

      const peeked = await cache.peekToken(token);
      await cache.ignore(4);
      await cache.refresh();
      expect(Array.from(peeked)).toEqual([1, 2, 3, 4]);
    });

    it('returns read token results that remain valid after refresh', async () => {
      const { cache } = bufferCache(Uint8Array.of(1, 2, 3, 4, 5, 6, 7, 8));
      const token = new Uint8ArrayType(4);
      await cache.peekToken(token);
      await cache.refresh();

      const read = await cache.readToken(token);
      await cache.refresh();
      expect(Array.from(read)).toEqual([1, 2, 3, 4]);
    });

    it('delegates numeric reads to the source numeric buffer', async () => {
      const tokenizer = fromBuffer(Uint8Array.of(0, 0, 0, 1, 0, 0, 0, 2), { maxBufferSize: 3 });
      const cache = new TokenizerCache(tokenizer);
      expect(await cache.peekNumber(UINT32_BE)).toBe(1);
      expect(await cache.readNumber(UINT32_BE)).toBe(1);
      expect(await cache.peekNumber(UINT32_BE)).toBe(2);
    });
  });

  describe('delegation and lifecycle', () => {
    it('delegates tokenizer metadata, position and random-access support', async () => {
      const { tokenizer, cache } = bufferCache();
      expect(cache.fileInfo).toBe(tokenizer.fileInfo);
      expect(cache.position).toBe(0);
      expect(cache.supportsRandomAccess()).toBe(true);
      await cache.readBuffer(new Uint8Array(1));
      expect(cache.position).toBe(1);
    });

    it('delegates ignore, setPosition and close', async () => {
      const { cache } = bufferCache();
      await cache.refresh();

      expect(await cache.ignore(4)).toBe(4);
      expect(cache.position).toBe(4);
      cache.setPosition(0);
      expect(cache.position).toBe(0);
      await cache.close();
    });
  });
});
