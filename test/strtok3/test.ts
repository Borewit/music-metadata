import {
  UINT32_LE,
  UINT32_BE,
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

for (const tokenizerType of tokenizerTests) {
  describe(tokenizerType.name, () => {
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
