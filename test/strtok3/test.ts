import {
  UINT32_LE,
  UINT32_BE,
  UINT8,
  StringType,
  INT32_BE,
  UINT24_BE,
  IgnoreType,
} from "../../lib/token-types";
import { describe, assert, test, expect } from "vitest";
import {
  ITokenizer,
  fromStream,
  fromFile,
  fromBuffer,
} from "../../lib/strtok3";
import { join } from "node:path";
import {
  writeFile,
  createReadStream,
  readFile,
  stat as stat_1,
} from "../../lib/strtok3/FsPromise";
import { FileTokenizer } from "../../lib/strtok3/FileTokenizer";
import { EndOfStreamError } from "../../lib/peek-readable";
import { PassThrough } from "node:stream";

interface ITokenizerTest {
  name: string;
  loadTokenizer: (testFile: string) => Promise<ITokenizer>;
}

function getResourcePath(testFile: string) {
  return join(__dirname, "resources", testFile);
}

async function getTokenizerWithData(
  testData: string,
  tokenizerTest: ITokenizerTest
): Promise<ITokenizer> {
  const testPath = getResourcePath("tmp.dat");
  await writeFile(testPath, Buffer.from(testData, "latin1"));
  return tokenizerTest.loadTokenizer("tmp.dat");
}

const tokenizerTests: ITokenizerTest[] = [
  {
    name: "fromStream()",
    loadTokenizer: async (testFile) => {
      const stream = createReadStream(getResourcePath(testFile));
      return fromStream(stream);
    },
  },
  {
    name: "fromFile()",
    loadTokenizer: async (testFile) => {
      return fromFile(join(__dirname, "resources", testFile));
    },
  },
  {
    name: "fromBuffer()",
    loadTokenizer: async (testFile) => {
      return readFile(join(__dirname, "resources", testFile)).then((data) => {
        return fromBuffer(data);
      });
    },
  },
];

async function peekOnData(tokenizer: ITokenizer): Promise<void> {
  expect(tokenizer.position).toBe(0);

  let value = await tokenizer.peekToken<number>(UINT32_LE);
  expect(typeof value).toBe("number");
  expect(value, "UINT24_LE #1").toBe(0x00_1a_00_1a);
  expect(tokenizer.position).toBe(0);

  value = await tokenizer.peekToken(UINT32_LE);
  expect(typeof value).toBe("number");
  expect(value, "UINT24_LE sequential peek #2").toBe(0x00_1a_00_1a);
  expect(tokenizer.position).toBe(0);
  value = await tokenizer.readToken(UINT32_LE);

  expect(typeof value).toBe("number");
  expect(value, "UINT24_LE #3").toBe(0x00_1a_00_1a);
  expect(tokenizer.position).toBe(4);
  value = await tokenizer.readToken(UINT32_BE);
  expect(typeof value).toBe("number");
  expect(value, "UINT32_BE #4").toBe(0x1a_00_1a_00);
  expect(tokenizer.position).toBe(8);
  value = await tokenizer.readToken(UINT32_LE);

  expect(typeof value).toBe("number");
  expect(value, "UINT32_LE #5").toBe(0x00_1a_00_1a);
  expect(tokenizer.position).toBe(12);
  value = await tokenizer.readToken(UINT32_BE);

  expect(typeof value).toBe("number");
  expect(value, "UINT32_BE #6").toBe(0x1a_00_1a_00);
  expect(tokenizer.position).toBe(16);
}

for (const tokenizerType of tokenizerTests) {
  describe(tokenizerType.name, () => {
    test("Handle peek token", async () => {
      const rst = await tokenizerType.loadTokenizer("test1.dat");

      if (rst instanceof FileTokenizer) {
        expect(rst.fileInfo.size, "check file size property").toBe(16);
      }
      await peekOnData(rst);
      await rst.close();
    });

    test("Overlapping peeks", async () => {
      const rst = await getTokenizerWithData(
        "\u0001\u0002\u0003\u0004\u0005",
        tokenizerType
      );
      const peekBuffer = Buffer.alloc(3);
      const readBuffer = Buffer.alloc(1);

      assert.strictEqual(0, rst.position);
      let len = await rst.peekBuffer(peekBuffer, { length: 3 }); // Peek #1
      assert.strictEqual(3, len);
      assert.deepEqual(
        peekBuffer,
        Buffer.from("\u0001\u0002\u0003", "binary"),
        "Peek #1"
      );
      expect(rst.position).toBe(0);
      len = await rst.readBuffer(readBuffer, { length: 1 }); // Read #1
      expect(len).toBe(1);
      expect(rst.position).toBe(1);
      assert.deepEqual(readBuffer, Buffer.from("\u0001", "binary"), "Read #1");
      len = await rst.peekBuffer(peekBuffer, { length: 3 }); // Peek #2
      expect(len).toBe(3);
      expect(rst.position).toBe(1);
      assert.deepEqual(
        peekBuffer,
        Buffer.from("\u0002\u0003\u0004", "binary"),
        "Peek #2"
      );
      len = await rst.readBuffer(readBuffer, { length: 1 }); // Read #2
      expect(len).toBe(1);
      expect(rst.position).toBe(2);
      assert.deepEqual(readBuffer, Buffer.from("\u0002", "binary"), "Read #2");
      len = await rst.peekBuffer(peekBuffer, { length: 3 }); // Peek #3
      expect(len).toBe(3);
      expect(rst.position).toBe(2);
      assert.deepEqual(
        peekBuffer,
        Buffer.from("\u0003\u0004\u0005", "binary"),
        "Peek #3"
      );
      len = await rst.readBuffer(readBuffer, { length: 1 }); // Read #3
      expect(len).toBe(1);
      expect(rst.position).toBe(3);
      assert.deepEqual(readBuffer, Buffer.from("\u0003", "binary"), "Read #3");
      len = await rst.peekBuffer(peekBuffer, { length: 2 }); // Peek #4
      expect(len, "3 bytes requested to peek, only 2 bytes left").toBe(2);
      expect(rst.position).toBe(3);
      assert.deepEqual(
        peekBuffer,
        Buffer.from("\u0004\u0005\u0005", "binary"),
        "Peek #4"
      );
      len = await rst.readBuffer(readBuffer, { length: 1 }); // Read #4
      expect(len).toBe(1);
      expect(rst.position).toBe(4);
      assert.deepEqual(readBuffer, Buffer.from("\u0004", "binary"), "Read #4");

      await rst.close();
    });

    test("should be able to read at position ahead", async () => {
      const rst = await getTokenizerWithData("\u0005peter", tokenizerType);
      // should decode string from chunk
      expect(rst.position).toBe(0);
      const value = await rst.readToken(new StringType(5, "utf8"), 1);
      expect(typeof value).toBe("string");
      expect(value).toBe("peter");
      expect(rst.position).toBe(6);
      // should should reject at the end of the stream
      try {
        await rst.readToken(UINT8);
        assert.fail("Should reject due to end-of-stream");
      } catch (error) {
        assert.instanceOf(error, EndOfStreamError);
      }
    });

    test("should be able to peek at position ahead", async () => {
      const rst = await getTokenizerWithData("\u0005peter", tokenizerType);
      // should decode string from chunk
      expect(rst.position).toBe(0);
      const value = await rst.peekToken(new StringType(5, "latin1"), 1);
      expect(typeof value).toBe("string");
      expect(value).toBe("peter");
      expect(rst.position).toBe(0);
    });

    test("number", async () => {
      const tokenizer = await tokenizerType.loadTokenizer("test3.dat");
      assert.isDefined(tokenizer.fileInfo, "tokenizer.fileInfo");
      await tokenizer.ignore(tokenizer.fileInfo.size - 4);
      const x = await tokenizer.peekNumber(INT32_BE);
      expect(x).toBe(33_752_069);
    });

    test("should throw an Error if we reach EOF while peeking a number", async () => {
      const tokenizer = await tokenizerType.loadTokenizer("test3.dat");
      assert.isDefined(tokenizer.fileInfo, "tokenizer.fileInfo");
      await tokenizer.ignore(tokenizer.fileInfo.size - 3);
      try {
        await tokenizer.peekNumber(INT32_BE);
        assert.fail("Should throw Error: End-Of-File");
      } catch (error) {
        assert.instanceOf(error, EndOfStreamError);
      }
      await tokenizer.close();
    });

    test("should be able to handle multiple ignores", async () => {
      const tokenizer = await tokenizerType.loadTokenizer("test1.dat");
      let value = await tokenizer.readToken(UINT32_LE);
      expect(typeof value).toBe("number");
      expect(value, "UINT24_LE #1").toBe(0x00_1a_00_1a);
      await tokenizer.ignore(UINT32_BE.len);
      await tokenizer.ignore(UINT32_LE.len);
      value = await tokenizer.readToken(UINT32_BE);
      expect(typeof value).toBe("number");
      expect(value, "UINT32_BE #4").toBe(0x1a_00_1a_00);
      await tokenizer.close();
    });

    test("should be able to ignore (skip)", async () => {
      const tokenizer = await tokenizerType.loadTokenizer("test1.dat");
      expect(tokenizer.position).toBe(0);
      await tokenizer.ignore(4);
      expect(tokenizer.position).toBe(4);
      let value = await tokenizer.readToken(UINT32_BE);
      expect(typeof value).toBe("number");
      expect(value, "UINT32_BE #2").toBe(0x1a_00_1a_00);
      value = await tokenizer.readToken(UINT32_LE);
      expect(typeof value).toBe("number");
      expect(value, "UINT32_LE #3").toBe(0x00_1a_00_1a);
      value = await tokenizer.readToken(UINT32_BE);
      expect(typeof value).toBe("number");
      expect(value, "UINT32_BE #4").toBe(0x1a_00_1a_00);
      await tokenizer.close();
    });

    describe("End-Of-File exception behaviour", () => {
      test("should not throw an Error if we read exactly until the end of the file", async () => {
        const rst = await getTokenizerWithData(
          "\u0089\u0054\u0040",
          tokenizerType
        );
        const num = await rst.readToken(UINT24_BE);
        expect(num).toBe(9_000_000);
        await rst.close();
      });

      test("readBuffer()", async () => {
        const testFile = "test1.dat";

        const stat = await stat_1(getResourcePath(testFile));
        const tokenizer = await tokenizerType.loadTokenizer(testFile);
        const buf = Buffer.alloc(stat.size);
        const bytesRead = await tokenizer.readBuffer(buf);
        assert.ok(
          typeof bytesRead === "number",
          "readBuffer promise should provide a number"
        );
        assert.strictEqual(stat.size, bytesRead);
        try {
          await tokenizer.readBuffer(buf);
          assert.fail("Should throw EOF");
        } catch (error) {
          assert.instanceOf(error, EndOfStreamError);
        }
      });

      test("should not throw an Error if we read exactly until the end of the file", async () => {
        const rst = await getTokenizerWithData(
          "\u0089\u0054\u0040",
          tokenizerType
        );
        const num = await rst.readToken(UINT24_BE);
        expect(num).toBe(9_000_000);
      });

      test("should be thrown if a token EOF reached in the middle of a token", async () => {
        const rst = await getTokenizerWithData(
          "\u0089\u0054\u0040",
          tokenizerType
        );
        try {
          await rst.readToken(INT32_BE);
          assert.fail("It should throw EndOfFile Error");
        } catch (error) {
          assert.instanceOf(error, EndOfStreamError);
        }
      });

      test("should throw an EOF if we read to buffer", async () => {
        const buffer = Buffer.alloc(4);

        return getTokenizerWithData("\u0089\u0054\u0040", tokenizerType).then(
          (rst) => {
            return rst
              .readBuffer(buffer)
              .then(() => {
                assert.fail("It should throw EndOfFile Error");
              })
              .catch((error) => {
                assert.instanceOf(error, EndOfStreamError);
              });
          }
        );
      });

      test("should throw an EOF if we peek to buffer", async () => {
        const buffer = Buffer.alloc(4);
        const rst = await getTokenizerWithData(
          "\u0089\u0054\u0040",
          tokenizerType
        );
        try {
          await rst.peekBuffer(buffer);
          assert.fail("It should throw EndOfFile Error");
        } catch (error) {
          assert.instanceOf(error, EndOfStreamError);
        }
      });
    });

    test("should be able to read from a file", async () => {
      const tokenizer = await tokenizerType.loadTokenizer("test1.dat");
      expect(tokenizer.fileInfo.size, "check file size property").toBe(16);
      let value = await tokenizer.readToken(UINT32_LE);
      expect(typeof value).toBe("number");
      expect(value, "UINT24_LE #1").toBe(0x00_1a_00_1a);
      value = await tokenizer.readToken(UINT32_BE);
      expect(typeof value).toBe("number");
      expect(value, "UINT32_BE #2").toBe(0x1a_00_1a_00);
      value = await tokenizer.readToken(UINT32_LE);
      expect(typeof value).toBe("number");
      expect(value, "UINT32_LE #3").toBe(0x00_1a_00_1a);
      value = await tokenizer.readToken(UINT32_BE);
      expect(typeof value).toBe("number");
      expect(value, "UINT32_BE #4").toBe(0x1a_00_1a_00);
    });

    test("should be able to parse the IgnoreType-token", async () => {
      const tokenizer = await tokenizerType.loadTokenizer("test1.dat");
      await tokenizer.readToken(new IgnoreType(4));
      let value = await tokenizer.readToken(UINT32_BE);
      expect(typeof value).toBe("number");
      expect(value, "UINT32_BE #2").toBe(0x1a_00_1a_00);
      value = await tokenizer.readToken(UINT32_LE);
      expect(typeof value).toBe("number");
      expect(value, "UINT32_LE #3").toBe(0x00_1a_00_1a);
      value = await tokenizer.readToken(UINT32_BE);
      expect(typeof value).toBe("number");
      expect(value, "UINT32_BE #4").toBe(0x1a_00_1a_00);
    });

    test("should be able to read 0 bytes from a file", async () => {
      const bufZero = Buffer.alloc(0);
      const tokenizer = await tokenizerType.loadTokenizer("test1.dat");
      await tokenizer.readBuffer(bufZero);
    });
  }); // End of test "Tokenizer-types"
}

describe("fromStream with mayBeLess flag", () => {
  test("mayBeLess=true", async () => {
    // Initialize empty stream
    const stream = new PassThrough();
    const tokenizer = await fromStream(stream);
    stream.end();

    // Try to read 5 bytes from empty stream, with mayBeLess flag enabled
    const buffer = Buffer.alloc(5);
    const bytesRead = await tokenizer.peekBuffer(buffer, { mayBeLess: true });
    expect(bytesRead).toBe(0);
  });

  test("mayBeLess=false", async () => {
    try {
      // Initialize empty stream
      const stream = new PassThrough();
      const tokenizer = await fromStream(stream);
      stream.end();

      // Try to read 5 bytes from empty stream, with mayBeLess flag enabled
      const buffer = Buffer.alloc(5);
      await tokenizer.peekBuffer(buffer, { mayBeLess: false });
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toBe("End-Of-Stream");
      } else {
        assert.fail("Expected: err instanceof Error");
      }
      return;
    }
    assert.fail("Should throw End-Of-Stream error");
  });
});

test("should determine the file size using a file stream", async () => {
  const stream = createReadStream(join(__dirname, "resources", "test1.dat"));
  const tokenizer = await fromStream(stream);
  assert.isDefined(tokenizer.fileInfo, "`fileInfo` should be defined");
  expect(tokenizer.fileInfo.size, "fileInfo.size").toBe(16);
});
