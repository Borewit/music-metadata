import { EventEmitter } from "node:events";
import { createReadStream } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";

import { describe, test, expect } from "vitest";

import { EndOfStreamError } from "../../lib/peek-readable/EndOfFileStream";
import { StreamReader } from "../../lib/peek-readable/StreamReader";
import { SourceStream } from "../util";

test("should throw an exception if constructor argument is not a stream", () => {
  class MyEmitter extends EventEmitter {}

  const notStream = new MyEmitter();

  expect(() => new StreamReader(notStream as any)).toThrowError("Expected an instance of stream.Readable");
});

test("should be able to handle 0 byte read request", async () => {
  const streamReader = new StreamReader(new SourceStream("abcdefg"));

  const buf = new Uint8Array(0);
  const bytesRead = await streamReader.read(buf, 0, 0);
  expect(bytesRead, "Should return").toBe(0);
});

test("read from a streamed data chunk", async () => {
  expect.assertions(5);

  // 6 bytes source
  const sourceStream = new SourceStream("\u0005peter");
  const streamReader = new StreamReader(sourceStream);

  // read only one byte from the chunk
  let uint8Array = new Uint8Array(1);
  let bytesRead = await streamReader.read(uint8Array, 0, 1);
  expect(bytesRead, "Should read 1 byte").toBe(1);
  expect(uint8Array[0], "0x05 == 5").toBe(5);

  // should decode string from chunk
  uint8Array = new Uint8Array(5);
  bytesRead = await streamReader.read(uint8Array, 0, 5);
  expect(bytesRead, "Should read 5 bytes").toBe(5);
  expect(Buffer.from(uint8Array).toString("latin1")).toBe("peter");

  // should should reject at the end of the stream
  uint8Array = new Uint8Array(1);
  await expect(() => streamReader.read(uint8Array, 0, 1)).rejects.toBeInstanceOf(EndOfStreamError);
});

describe("concurrent reads", () => {
  test("should support concurrent reads", async () => {
    const sourceStream = new SourceStream("\u0000\u0001\u0002\u0003\u0004\u0005\u0006\u0007\u0008\u0009");
    const streamReader = new StreamReader(sourceStream);

    for (let i = 0; i < 10; ++i) {
      const uint8Array = new Uint8Array(1);
      await streamReader.read(uint8Array, 0, 1);

      expect(uint8Array[0]).toBe(i);
    }
  });
});

describe("disjoint", () => {
  const TESTTAB: [number[]][] = [
    [[1, 1, 1, 1]],
    [[4]],
    [[1, 1, 1, 1, 4]],
    [[2, 2]],
    [[3, 3, 3, 3]],
    [[1, 4, 3]],
    [[5]],
    [[5, 5, 5]],
  ];

  // A net.Stream workalike that emits the indefinitely repeating string
  // '\x01\x02\x03\x04' in chunks specified by the 'lens' array param.
  class LensSourceStream extends Readable {
    public nvals: number;
    private buf: Buffer;

    public constructor(private lens: number[]) {
      super();

      this.nvals = Math.floor(lens.reduce((a, b) => a + b) / 4);
      const data = Array.from({ length: this.nvals }, () => [0x01, 0x02, 0x03, 0x04]).flat();

      this.buf = Buffer.from(data);
    }

    public override _read() {
      if (this.lens.length === 0) {
        this.push(null); // push the EOF-signaling `null` chunk
        return;
      }

      const len = this.lens.shift();
      const b = this.buf.subarray(0, len);
      this.buf = this.buf.subarray(len, this.buf.length);

      this.push(b);
    }
  }

  test.each(TESTTAB)("should parse disjoint %j", async (aaa) => {
    const stream = new LensSourceStream(aaa);
    const reader = new StreamReader(stream);
    const buffer = new Uint8Array(4);

    try {
      let bytesRead = await reader.read(buffer, 0, 4);
      while ((bytesRead = await reader.read(buffer, 0, 4))) {
        expect(bytesRead).toBe(4);
        expect(new DataView(buffer.buffer).getUint32(0, false)).toBe(16_909_060);
      }
    } catch (error) {
      expect(error).toBeInstanceOf(EndOfStreamError);
    }
  });
});

describe("peek", () => {
  test("should be able to read a peeked chunk", async () => {
    const sourceStream = new SourceStream("\u0005peter");
    const streamReader = new StreamReader(sourceStream);

    const uint8Array = new Uint8Array(1);

    let bytesRead = await streamReader.peek(uint8Array, 0, 1);
    expect(bytesRead, "Should peek exactly one byte").toBe(1);
    expect(uint8Array[0], "0x05 == 5").toBe(5);
    bytesRead = await streamReader.read(uint8Array, 0, 1);
    expect(bytesRead, "Should re-read the peaked byte").toBe(1);
    expect(uint8Array[0], "0x05 == 5").toBe(5);
  });

  test("should be able to read a larger chunk overlapping the peeked chunk", async () => {
    const sourceStream = new SourceStream("\u0005peter");
    const streamReader = new StreamReader(sourceStream);

    const uint8Array = new Uint8Array(6).fill(0);

    let bytesRead = await streamReader.peek(uint8Array, 0, 1);
    expect(bytesRead, "Should peek exactly one byte").toBe(1);
    expect(uint8Array[0], "0x05 == 5").toBe(5);
    bytesRead = await streamReader.read(uint8Array, 0, 6);
    expect(bytesRead, "Should overlap the peaked byte").toBe(6);
    expect(Buffer.from(uint8Array.buffer).toString("latin1")).toBe("\u0005peter");
  });

  test("should be able to read a smaller chunk then the overlapping peeked chunk", async () => {
    const sourceStream = new SourceStream("\u0005peter");
    const streamReader = new StreamReader(sourceStream);

    const uint8Array = new Uint8Array(6).fill(0);

    let bytesRead = await streamReader.peek(uint8Array, 0, 2);
    expect(bytesRead, "Should peek 2 bytes").toBe(2);
    expect(uint8Array[0], "0x05 == 5").toBe(5);
    bytesRead = await streamReader.read(uint8Array, 0, 1);
    expect(bytesRead, "Should read only 1 byte").toBe(1);
    expect(uint8Array[0], "0x05 == 5").toBe(5);
    bytesRead = await streamReader.read(uint8Array, 1, 5);
    expect(bytesRead, "Should read remaining 5 byte").toBe(5);
    expect(Buffer.from(uint8Array.buffer).toString("latin1")).toBe("\u0005peter");
  });

  test("should be able to handle overlapping peeks", async () => {
    const buffer = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05]);
    const sourceStream = new SourceStream(buffer);
    const streamReader = new StreamReader(sourceStream);

    const peekBufferShort = new Uint8Array(1);
    const peekBuffer = new Uint8Array(3);
    const readBuffer = new Uint8Array(1);

    let len = await streamReader.peek(peekBuffer, 0, 3); // Peek #1
    expect(len).toBe(3);
    expect(peekBuffer, "Peek #1").toEqual(new Uint8Array([0x01, 0x02, 0x03]));

    len = await streamReader.peek(peekBufferShort, 0, 1); // Peek #2
    expect(len).toBe(1);
    expect(peekBufferShort, "Peek #2").toEqual(new Uint8Array([0x01]));

    len = await streamReader.read(readBuffer, 0, 1); // Read #1
    expect(len).toBe(1);
    expect(readBuffer, "Read #1").toEqual(new Uint8Array([0x01]));

    len = await streamReader.peek(peekBuffer, 0, 3); // Peek #3
    expect(len).toBe(3);
    expect(peekBuffer, "Peek #3").toEqual(new Uint8Array([0x02, 0x03, 0x04]));

    len = await streamReader.read(readBuffer, 0, 1); // Read #2
    expect(len).toBe(1);
    expect(readBuffer, "Read #2").toEqual(new Uint8Array([0x02]));

    len = await streamReader.peek(peekBuffer, 0, 3); // Peek #3
    expect(len).toBe(3);
    expect(peekBuffer, "Peek #3").toEqual(new Uint8Array([0x03, 0x04, 0x05]));

    len = await streamReader.read(readBuffer, 0, 1); // Read #3
    expect(len).toBe(1);
    expect(readBuffer, "Read #3").toEqual(new Uint8Array([0x03]));

    len = await streamReader.peek(peekBuffer, 0, 2); // Peek #4
    expect(len, "3 bytes requested to peek, only 2 bytes left").toBe(2);
    expect(peekBuffer, "Peek #4").toEqual(new Uint8Array([0x04, 0x05, 0x05]));

    len = await streamReader.read(readBuffer, 0, 1); // Read #4
    expect(len).toBe(1);
    expect(readBuffer, "Read #4").toEqual(new Uint8Array([0x04]));
  });
});

describe("EndOfStream Error", () => {
  test("should not throw an EndOfStream Error if we read exactly until the end of the stream", async () => {
    const sourceStream = new SourceStream(Buffer.from([0x89, 0x54, 0x40]));
    const streamReader = new StreamReader(sourceStream);

    const res = new Uint8Array(3);

    const len = await streamReader.peek(res, 0, 3);
    expect(len).toBe(3);
  });

  test("should return a partial result from a stream if EOF is reached", async () => {
    const sourceStream = new SourceStream(Buffer.from([0x89, 0x54, 0x40]));
    const streamReader = new StreamReader(sourceStream);

    const res = new Uint8Array(4);

    const len = await streamReader.peek(res, 0, 4);
    expect(len, "should indicate only 3 bytes are actually peeked").toBe(3);
  });

  test("should return a partial result from a stream if EOF is reached", async () => {
    const sourceStream = new SourceStream(Buffer.from([0x89, 0x54, 0x40]));
    const streamReader = new StreamReader(sourceStream);

    const res = new Uint8Array(4);

    const len = await streamReader.read(res, 0, 4);
    expect(len, "should indicate only 3 bytes are actually read").toBe(3);
  });

  // mocha+chaiだとエラーが出ない
  test.skip("should return a partial result from a stream if EOF is reached", async () => {
    const sourceStream = new SourceStream(Buffer.from([0x89, 0x54, 0x40]));
    const streamReader = new StreamReader(sourceStream);

    const res = new Uint8Array(4);

    let len = await streamReader.peek(res, 0, 4);
    expect(len, "should indicate only 3 bytes are actually peeked").toBe(3);
    len = await streamReader.read(res, 0, 4);
    expect(len, "should indicate only 3 bytes are actually read").toBe(3);
  });
});

describe("file-stream", () => {
  const path_test3 = join(__dirname, "resources", "test3.dat");
  const fileSize = 5;
  const uint8Array = new Uint8Array(17);

  test("should return a partial size, if full length cannot be read", async () => {
    const fileReadStream = createReadStream(path_test3);
    const streamReader = new StreamReader(fileReadStream);
    const actualRead = await streamReader.read(uint8Array, 0, 17);
    expect(actualRead).toBe(fileSize);
    fileReadStream.close();
  });
});

describe("exception", () => {
  const path_test3 = join(__dirname, "resources", "test3.dat");
  const uint8Array = new Uint8Array(17);

  test("handle stream closed", async () => {
    const fileReadStream = createReadStream(path_test3);
    const streamReader = new StreamReader(fileReadStream);
    fileReadStream.close(); // Sabotage stream

    await expect(() => streamReader.read(uint8Array, 0, 17)).rejects.toThrow("Stream closed");
  });

  test("handle stream error", async () => {
    const path_test4 = join(__dirname, "resources", "file-does-not-exist");

    const fileReadStream = createReadStream(path_test4);
    const streamReader = new StreamReader(fileReadStream);

    await expect(() => streamReader.read(uint8Array, 0, 17)).rejects.toHaveProperty("code", "ENOENT");
  });
});
