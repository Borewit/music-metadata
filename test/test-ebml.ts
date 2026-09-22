import {execFile} from 'node:child_process';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {Readable} from 'node:stream';
import {promisify} from 'node:util';
import {assert, expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {fromBuffer, fromStream} from 'strtok3';

import {EbmlContentError, EbmlIterator, ParseAction} from '../lib/ebml/EbmlIterator.js';
import {DataType, type IElementType} from '../lib/ebml/types.js';

use(chaiAsPromised);

const listener = {
  startNext: () => ParseAction.ReadNext,
  elementValue: async () => undefined
};

function leafDtd(value: DataType): IElementType {
  return {name: 'root', container: {0x81: {name: 'leaf', value}}};
}

async function runScript(script: string): Promise<void> {
  // Bun loads TypeScript natively and uses a different --loader syntax.
  const runtimeArgs = process.versions.bun ? [] : ['--loader', 'ts-node/esm', '--input-type=module'];
  await promisify(execFile)(process.execPath, [...runtimeArgs, '--eval', script], {timeout: 30000});
}

describe('EBML leaf lengths (GHSA-37v6-24wr-3x83)', () => {
  for (const [name, type] of Object.entries(DataType)) {
    it(`rejects a ${name} leaf extending past the file`, async () => {
      const tokenizer = fromBuffer(new Uint8Array([0x81, 0x84, 1]));
      const iterator = new EbmlIterator(tokenizer);
      await expect(iterator.iterate(leafDtd(type), 100, listener))
        .to.be.rejectedWith(EbmlContentError, 'Invalid element length: 4');
      assert.strictEqual(tokenizer.position, 2, 'must reject before reading the leaf');
    });

    it(`rejects a ${name} leaf extending past its container`, async () => {
      const tokenizer = fromBuffer(new Uint8Array([0x81, 0x84, 0, 0, 0, 0]));
      const iterator = new EbmlIterator(tokenizer);
      await expect(iterator.iterate(leafDtd(type), 3, listener))
        .to.be.rejectedWith(EbmlContentError, 'Invalid element length: 4');
      assert.strictEqual(tokenizer.position, 2, 'must reject before reading the leaf');
    });
  }

  it('checks the container boundary when the stream size is unknown', async () => {
    const tokenizer = await fromStream(Readable.from([new Uint8Array([0x81, 0x84, 1])], {objectMode: false}));
    try {
      assert.isUndefined(tokenizer.fileInfo.size);
      await expect(new EbmlIterator(tokenizer).iterate(leafDtd(DataType.binary), 3, listener))
        .to.be.rejectedWith(EbmlContentError, 'Invalid element length: 4');
    } finally {
      await tokenizer.close();
    }
  });

  it('accepts a leaf ending exactly at the file and container boundary', async () => {
    const tokenizer = fromBuffer(new Uint8Array([0x81, 0x81, 42]));
    const tree = await new EbmlIterator(tokenizer).iterate(leafDtd(DataType.uint), 3, listener);
    assert.strictEqual(tree.leaf, 42);
  });

  it('accepts an empty leaf at the end of the file', async () => {
    const tokenizer = fromBuffer(new Uint8Array([0x81, 0x80]));
    const tree = await new EbmlIterator(tokenizer).iterate(leafDtd(DataType.string), 2, listener);
    assert.strictEqual(tree.leaf, '');
  });

  it('preserves the ancestor boundary when a nested container claims a larger size', async () => {
    const tokenizer = await fromStream(Readable.from([
      new Uint8Array([0x82, 0x85, 0x83, 0xff, 0x81, 0x84, 1, 2, 3, 4])
    ], {objectMode: false}));
    const dtd: IElementType = {name: 'root', container: {
      0x82: {name: 'outer', container: {
        0x83: {name: 'inner', container: leafDtd(DataType.binary).container}
      }}
    }};
    try {
      await expect(new EbmlIterator(tokenizer).iterate(dtd, Number.MAX_SAFE_INTEGER, listener))
        .to.be.rejectedWith(EbmlContentError, 'Invalid element length: 4');
      assert.strictEqual(tokenizer.position, 6);
    } finally {
      await tokenizer.close();
    }
  });

  for (const size of [undefined, 64 * 1024 ** 3]) {
    for (const type of [DataType.binary, DataType.string]) {
      it(`reads a valid multi-chunk ${type === DataType.string ? 'string' : 'binary'} leaf from a stream (${size === undefined ? 'unknown size' : 'advertised size'})`, async () => {
        const payload = new Uint8Array(65539).fill(0x61);
        // Put a multibyte UTF-8 character across the chunk boundary.
        payload.set([0xe2, 0x82, 0xac], 65535);
        const tokenizer = await fromStream(Readable.from([
          new Uint8Array([0x81, 0x21, 0x00, 0x03]), payload
        ], {objectMode: false}), {fileInfo: {size}});
        const readBuffer = tokenizer.readBuffer.bind(tokenizer);
        tokenizer.readBuffer = async (buffer, options) => {
          assert.isAtMost(buffer.length, 64 * 1024, 'stream reads must use bounded buffers');
          return readBuffer(buffer, options);
        };
        try {
          const tree = await new EbmlIterator(tokenizer).iterate(leafDtd(type), Number.MAX_SAFE_INTEGER, listener);
          assert.deepEqual(tree.leaf, type === DataType.string ? `${'a'.repeat(65535)}€a` : payload);
        } finally {
          await tokenizer.close();
        }
      });
    }
  }

  for (const api of ['parseStream', 'parseWebStream']) {
    for (const size of [undefined, 64 * 1024 ** 3]) {
      for (const [name, id] of [['uint', [0x2a, 0xd7, 0xb1]], ['string', [0x7b, 0xa9]], ['uid', [0x73, 0xa4]]] as const) {
        it(`${api} rejects a truncated 32 GiB ${name} leaf inside oversized containers (${size === undefined ? 'unknown size' : 'advertised size'})`, async () => {
          // Exercise both unknown and untrustworthy advertised sizes through the public APIs.
          // Both Segment and Info claim 64 GiB; the leaf claims 32 GiB.
          const bytes = [
            0x1a, 0x45, 0xdf, 0xa3, 0x87, 0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d,
            0x18, 0x53, 0x80, 0x67, 0x02, 0x00, 0x10, 0, 0, 0, 0,
            0x15, 0x49, 0xa9, 0x66, 0x02, 0x00, 0x10, 0, 0, 0, 0,
            ...id, 0x04, 0x08, 0, 0, 0, 0, 1
          ];
          await runScript(`
            import {strict as assert} from 'node:assert';
            import {Readable} from 'node:stream';
            import {ReadableStream} from 'node:stream/web';
            import {EndOfStreamError} from 'strtok3';
            import {${api}} from ${JSON.stringify(new URL('../lib/index.js', import.meta.url).href)};
            const bytes = new Uint8Array(${JSON.stringify(bytes)});
            const stream = ${api === 'parseStream'
              ? 'Readable.from([bytes], {objectMode: false})'
              : 'new ReadableStream({start(controller) { controller.enqueue(bytes); controller.close(); }})'};
            await assert.rejects(${api}(stream, ${JSON.stringify({mimeType: 'video/webm', size})}), EndOfStreamError);
          `);
        });
      }
    }
  }

  for (const [name, id] of [['uint', 0xf7], ['string', 0x82]] as const) {
    it(`parseFile rejects a 32 GiB ${name} leaf without aborting the process`, async () => {
      const directory = await mkdtemp(path.join(tmpdir(), 'music-metadata-ebml-'));
      const filePath = path.join(directory, 'oversized.webm');
      try {
        // An EBML header, a valid WebM docType, then a leaf
        // claiming 32 GiB with only one payload byte present.
        await writeFile(filePath, new Uint8Array([
          0x1a, 0x45, 0xdf, 0xa3, 0x90,
          0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d,
          0x42, id, 0x04, 0x08, 0x00, 0x00, 0x00, 0x00, 0x01
        ]));
        // Isolate the fatal V8 abort in case the allocation check regresses.
        const script = `
          import {strict as assert} from 'node:assert';
          import {parseFile} from ${JSON.stringify(new URL('../lib/index.js', import.meta.url).href)};
          import {EbmlContentError} from ${JSON.stringify(new URL('../lib/ebml/EbmlIterator.js', import.meta.url).href)};
          await assert.rejects(parseFile(${JSON.stringify(filePath)}), {
            name: new EbmlContentError('').name,
            message: 'Invalid element length: 34359738368'
          });
        `;
        await runScript(script);
      } finally {
        await rm(directory, {recursive: true, force: true});
      }
    });
  }

  it('reads a large leaf incrementally when random access size is unknown', async () => {
    const payload = new Uint8Array(65539).fill(0x61);

    const data = new Uint8Array(4 + payload.length);
    data.set([0x81, 0x21, 0x00, 0x03]);
    data.set(payload, 4);

    const tokenizer = fromBuffer(data);
    tokenizer.fileInfo.size = undefined;

    const tree = await new EbmlIterator(tokenizer)
      .iterate(leafDtd(DataType.binary), Number.MAX_SAFE_INTEGER, listener);

    assert.deepEqual(tree.leaf, payload);
  });

});
