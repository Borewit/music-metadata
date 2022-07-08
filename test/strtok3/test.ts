import { UINT32_LE, UINT32_BE, IgnoreType } from "../../lib/token-types";
import { describe, assert, test, expect } from "vitest";
import {
  ITokenizer,
  fromStream,
  fromFile,
  fromBuffer,
} from "../../lib/strtok3";
import { join } from "node:path";
import { createReadStream, readFile } from "../../lib/strtok3/FsPromise";
import { PassThrough } from "node:stream";

interface ITokenizerTest {
  name: string;
  loadTokenizer: (testFile: string) => Promise<ITokenizer>;
}

function getResourcePath(testFile: string) {
  return join(__dirname, "resources", testFile);
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
