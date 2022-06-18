import * as Token from "../../lib/token-types";
import { describe, assert, it } from "vitest";
import * as strtok3 from "../../lib/strtok3";
import Path from "node:path";
import * as fs from "../../lib/strtok3/FsPromise";
import { FileTokenizer } from "../../lib/strtok3/FileTokenizer";
import { EndOfStreamError } from "../../lib/peek-readable";
import { PassThrough } from "node:stream";

interface ITokenizerTest {
  name: string;
  loadTokenizer: (testFile: string) => Promise<strtok3.ITokenizer>;
}

function getResourcePath(testFile: string) {
  return Path.join(__dirname, "resources", testFile);
}

async function getTokenizerWithData(
  testData: string,
  test: ITokenizerTest
): Promise<strtok3.ITokenizer> {
  const testPath = getResourcePath("tmp.dat");
  await fs.writeFile(testPath, Buffer.from(testData, "latin1"));
  return test.loadTokenizer("tmp.dat");
}

const tokenizerTests: ITokenizerTest[] = [
  {
    name: "fromStream()",
    loadTokenizer: async (testFile) => {
      const stream = fs.createReadStream(getResourcePath(testFile));
      return strtok3.fromStream(stream);
    },
  },
  {
    name: "fromFile()",
    loadTokenizer: async (testFile) => {
      return strtok3.fromFile(Path.join(__dirname, "resources", testFile));
    },
  },
  {
    name: "fromBuffer()",
    loadTokenizer: async (testFile) => {
      return fs
        .readFile(Path.join(__dirname, "resources", testFile))
        .then((data) => {
          return strtok3.fromBuffer(data);
        });
    },
  },
];

async function peekOnData(tokenizer: strtok3.ITokenizer): Promise<void> {
  assert.strictEqual(tokenizer.position, 0);

  let value = await tokenizer.peekToken<number>(Token.UINT32_LE);
  assert.strictEqual(typeof value, "number");
  assert.strictEqual(value, 0x00_1a_00_1a, "UINT24_LE #1");
  assert.strictEqual(tokenizer.position, 0);

  value = await tokenizer.peekToken(Token.UINT32_LE);
  assert.strictEqual(typeof value, "number");
  assert.strictEqual(value, 0x00_1a_00_1a, "UINT24_LE sequential peek #2");
  assert.strictEqual(tokenizer.position, 0);
  value = await tokenizer.readToken(Token.UINT32_LE);

  assert.strictEqual(typeof value, "number");
  assert.strictEqual(value, 0x00_1a_00_1a, "UINT24_LE #3");
  assert.strictEqual(tokenizer.position, 4);
  value = await tokenizer.readToken(Token.UINT32_BE);
  assert.strictEqual(typeof value, "number");
  assert.strictEqual(value, 0x1a_00_1a_00, "UINT32_BE #4");
  assert.strictEqual(tokenizer.position, 8);
  value = await tokenizer.readToken(Token.UINT32_LE);

  assert.strictEqual(typeof value, "number");
  assert.strictEqual(value, 0x00_1a_00_1a, "UINT32_LE #5");
  assert.strictEqual(tokenizer.position, 12);
  value = await tokenizer.readToken(Token.UINT32_BE);

  assert.strictEqual(typeof value, "number");
  assert.strictEqual(value, 0x1a_00_1a_00, "UINT32_BE #6");
  assert.strictEqual(tokenizer.position, 16);
}

for (const tokenizerType of tokenizerTests) {
  describe(tokenizerType.name, () => {
    describe("tokenizer read options", () => {
      it("option.offset", async () => {
        const buf = Buffer.alloc(7);
        const rst = await getTokenizerWithData(
          "\u0001\u0002\u0003\u0004\u0005\u0006",
          tokenizerType
        );
        assert.strictEqual(
          await rst.readBuffer(buf, { length: 6, offset: 1 }),
          6
        );
      });

      it("option.length", async () => {
        const buf = Buffer.alloc(7);
        const rst = await getTokenizerWithData(
          "\u0001\u0002\u0003\u0004\u0005\u0006",
          tokenizerType
        );
        assert.strictEqual(await rst.readBuffer(buf, { length: 2 }), 2);
      });

      it("default length", async () => {
        const buf = Buffer.alloc(6);
        const rst = await getTokenizerWithData(
          "\u0001\u0002\u0003\u0004\u0005\u0006",
          tokenizerType
        );
        assert.strictEqual(
          await rst.readBuffer(buf, { offset: 1 }),
          5,
          "default length = buffer.length - option.offset"
        );
      });

      it("option.maybeLess = true", async () => {
        const buffer = Buffer.alloc(4);
        const rst = await getTokenizerWithData(
          "\u0089\u0054\u0040",
          tokenizerType
        );
        const len = await rst.readBuffer(buffer, { mayBeLess: true });
        assert.strictEqual(
          len,
          3,
          "should return 3 because no more bytes are available"
        );
      });

      it("option.position", async () => {
        const buffer = Buffer.alloc(5);
        const rst = await getTokenizerWithData(
          "\u0001\u0002\u0003\u0004\u0005\u0006",
          tokenizerType
        );
        const len = await rst.readBuffer(buffer, { position: 1 });
        assert.strictEqual(len, 5, "return value");
        assert.strictEqual(
          buffer.toString("binary"),
          "\u0002\u0003\u0004\u0005\u0006"
        );
      });
    });

    describe("tokenizer peek options", () => {
      it("option.offset", async () => {
        const buf = Buffer.alloc(7);
        const rst = await getTokenizerWithData(
          "\u0001\u0002\u0003\u0004\u0005\u0006",
          tokenizerType
        );
        assert.strictEqual(
          await rst.peekBuffer(buf, { length: 6, offset: 1 }),
          6
        );
      });

      it("option.length", async () => {
        const buf = Buffer.alloc(7);
        const rst = await getTokenizerWithData(
          "\u0001\u0002\u0003\u0004\u0005\u0006",
          tokenizerType
        );
        assert.strictEqual(await rst.peekBuffer(buf, { length: 2 }), 2);
      });

      it("default length", async () => {
        const buf = Buffer.alloc(6);
        const rst = await getTokenizerWithData(
          "\u0001\u0002\u0003\u0004\u0005\u0006",
          tokenizerType
        );
        assert.strictEqual(
          await rst.peekBuffer(buf, { offset: 1 }),
          5,
          "default length = buffer.length - option.offset"
        );
      });

      it("option.maybeLess = true", async () => {
        const buffer = Buffer.alloc(4);
        const rst = await getTokenizerWithData(
          "\u0089\u0054\u0040",
          tokenizerType
        );
        const len = await rst.peekBuffer(buffer, { mayBeLess: true });
        assert.strictEqual(
          len,
          3,
          "should return 3 because no more bytes are available"
        );
      });

      it("option.position", async () => {
        const buffer = Buffer.alloc(5);
        const rst = await getTokenizerWithData(
          "\u0001\u0002\u0003\u0004\u0005\u0006",
          tokenizerType
        );
        const len = await rst.peekBuffer(buffer, { position: 1 });
        assert.strictEqual(len, 5, "return value");
        assert.strictEqual(
          buffer.toString("binary"),
          "\u0002\u0003\u0004\u0005\u0006"
        );
      });
    });

    it("should decode buffer", async () => {
      const rst = await getTokenizerWithData("\u0005peter", tokenizerType);
      // should decode UINT8 from chunk
      assert.strictEqual(rst.position, 0);
      let value: string | number = await rst.readToken(Token.UINT8);
      assert.strictEqual(typeof value, "number");
      assert.strictEqual(value, 5, "0x05 == 5");
      // should decode string from chunk
      assert.strictEqual(rst.position, 1);
      value = await rst.readToken(new Token.StringType(5, "utf-8"));
      assert.strictEqual(typeof value, "string");
      assert.strictEqual(value, "peter");
      assert.strictEqual(rst.position, 6);
      // should should reject at the end of the stream
      try {
        await rst.readToken(Token.UINT8);
        assert.fail("Should reject due to end-of-stream");
      } catch (error) {
        assert.instanceOf(error, EndOfStreamError);
      }
    });

    it("should be able to read from an absolute offset", async () => {
      const rst = await getTokenizerWithData("\u0005peter", tokenizerType);
      // should decode UINT8 from chunk
      assert.strictEqual(rst.position, 0);
      const value: string | number = await rst.readToken(
        new Token.StringType(5, "utf-8"),
        1
      );
      assert.strictEqual(typeof value, "string");
      assert.strictEqual(value, "peter");
      assert.strictEqual(rst.position, 6);

      try {
        await rst.readToken(Token.UINT8);
        assert.fail("Should reject due to end-of-stream");
      } catch (error) {
        assert.instanceOf(error, EndOfStreamError);
      }
    });

    it("should pick length from buffer, if length is not explicit defined", async () => {
      const rst = await getTokenizerWithData("\u0005peter", tokenizerType);

      const buf = Buffer.alloc(4);

      // should decode UINT8 from chunk
      assert.strictEqual(rst.position, 0);
      const bufferLength = await rst.readBuffer(buf);
      assert.strictEqual(bufferLength, buf.length);
      assert.strictEqual(rst.position, buf.length);
    });

    it("should contain fileSize if constructed from file-read-stream", async () => {
      // ToDo
      const rst = await tokenizerType.loadTokenizer("test1.dat");
      assert.strictEqual(
        rst.fileInfo.size,
        16,
        " ReadStreamTokenizer.fileSize.size"
      );

      await rst.close();
    });

    describe("Parsing binary numbers", () => {
      it("should encode signed 8-bit integer (INT8)", () => {
        const b = Buffer.alloc(1);

        Token.INT8.put(b, 0, 0x00);
        assert.strictEqual(b.toString("binary"), "\u0000");

        Token.INT8.put(b, 0, 0x22);
        assert.strictEqual(b.toString("binary"), "\u0022");

        Token.INT8.put(b, 0, -0x22);
        assert.strictEqual(b.toString("binary"), "\u00DE");
      });

      it("should decode signed 8-bit integer (INT8)", async () => {
        const rst = await getTokenizerWithData(
          "\u0000\u007F\u0080\u00FF\u0081",
          tokenizerType
        );

        let value: number = await rst.readToken(Token.INT8);
        assert.strictEqual(typeof value, "number");
        assert.strictEqual(value, 0, "INT8 #1 == 0");
        value = await rst.readToken(Token.INT8);
        assert.strictEqual(typeof value, "number");
        assert.strictEqual(value, 127, "INT8 #2 == 127");
        value = await rst.readToken(Token.INT8);
        assert.strictEqual(typeof value, "number");
        assert.strictEqual(value, -128, "INT8 #3 == -128");
        value = await rst.readToken(Token.INT8);
        assert.strictEqual(typeof value, "number");
        assert.strictEqual(value, -1, "INT8 #4 == -1");
        value = await rst.readToken(Token.INT8);
        assert.strictEqual(typeof value, "number");
        assert.strictEqual(value, -127, "INT8 #5 == -127");

        await rst.close();
      });

      it("should encode signed 16-bit big-endian integer (INT16_BE)", () => {
        const b = Buffer.alloc(2);

        Token.INT16_BE.put(b, 0, 0x00);
        assert.strictEqual(b.toString("binary"), "\u0000\u0000");

        Token.INT16_BE.put(b, 0, 0x0f_0b);
        assert.strictEqual(b.toString("binary"), "\u000F\u000B");

        Token.INT16_BE.put(b, 0, -0x0f_0b);
        assert.strictEqual(b.toString("binary"), "\u00F0\u00F5");
      });

      it("should decode signed 16-bit big-endian integer (INT16_BE)", async () => {
        const rst = await getTokenizerWithData(
          "\u000A\u001A\u0000\u0000\u00FF\u00FF\u0080\u0000",
          tokenizerType
        );

        let value: number = await rst.readToken(Token.INT16_BE);
        assert.strictEqual(typeof value, "number");
        assert.strictEqual(value, 2586, "INT16_BE#1");
        value = await rst.readToken(Token.INT16_BE);
        assert.strictEqual(typeof value, "number");
        assert.strictEqual(value, 0, "INT16_BE#2");
        value = await rst.readToken(Token.INT16_BE);
        assert.strictEqual(typeof value, "number");
        assert.strictEqual(value, -1, "INT16_BE#3");
        value = await rst.readToken(Token.INT16_BE);
        assert.strictEqual(typeof value, "number");
        assert.strictEqual(value, -32_768, "INT16_BE#4");

        await rst.close();
      });

      it("should encode signed 24-bit big-endian integer (INT24_BE)", async () => {
        const b = Buffer.alloc(3);

        Token.INT24_BE.put(b, 0, 0x00);
        assert.strictEqual(b.toString("binary"), "\u0000\u0000\u0000");

        Token.INT24_BE.put(b, 0, 0x0f_0b_a0);
        assert.strictEqual(b.toString("binary"), "\u000F\u000B\u00A0");

        Token.INT24_BE.put(b, 0, -0x0f_0b_cc);
        assert.strictEqual(b.toString("binary"), "\u00F0\u00F4\u0034");
      });

      it("should decode signed 24-bit big-endian integer (INT24_BE)", async () => {
        const rst = await getTokenizerWithData(
          "\u0000\u0000\u0000\u00FF\u00FF\u00FF\u0010\u0000\u00FF\u0080\u0000\u0000",
          tokenizerType
        );

        let value: number = await rst.readToken(Token.INT24_BE);
        assert.strictEqual(typeof value, "number");
        assert.strictEqual(value, 0, "INT24_BE#1");
        value = await rst.readToken(Token.INT24_BE);
        assert.strictEqual(typeof value, "number");
        assert.strictEqual(value, -1, "INT24_BE#2");
        value = await rst.readToken(Token.INT24_BE);
        assert.strictEqual(typeof value, "number");
        assert.strictEqual(value, 1_048_831, "INT24_BE#3");
        value = await rst.readToken(Token.INT24_BE);
        assert.strictEqual(typeof value, "number");
        assert.strictEqual(value, -8_388_608, "INT24_BE#4");
        await rst.close();
      });

      // ToDo: test decoding: INT24_LE

      it("should encode signed 32-bit big-endian integer (INT32_BE)", () => {
        const b = Buffer.alloc(4);

        Token.INT32_BE.put(b, 0, 0x00);
        assert.strictEqual(b.toString("binary"), "\u0000\u0000\u0000\u0000");

        Token.INT32_BE.put(b, 0, 0x0f_0b_cc_a0);
        assert.strictEqual(b.toString("binary"), "\u000F\u000B\u00CC\u00A0");

        Token.INT32_BE.put(b, 0, -0x0f_0b_cc_a0);
        assert.strictEqual(b.toString("binary"), "\u00F0\u00F4\u0033\u0060");
      });

      it("should decode signed 32-bit big-endian integer (INT32_BE)", async () => {
        const rst = await getTokenizerWithData(
          "\u0000\u0000\u0000\u0000\u00FF\u00FF\u00FF\u00FF\u0000\u0010\u0000\u00FF\u0080\u0000\u0000\u0000",
          tokenizerType
        );

        let value: number = await rst.readToken(Token.INT32_BE);
        assert.strictEqual(typeof value, "number");
        assert.strictEqual(value, 0, "INT32_BE #1");
        value = await rst.readToken(Token.INT32_BE);
        assert.strictEqual(typeof value, "number");
        assert.strictEqual(value, -1, "INT32_BE #2");
        value = await rst.readToken(Token.INT32_BE);
        assert.strictEqual(typeof value, "number");
        assert.strictEqual(value, 1_048_831, "INT32_BE #3");
        value = await rst.readToken(Token.INT32_BE);
        assert.strictEqual(typeof value, "number");
        assert.strictEqual(value, -2_147_483_648, "INT32_BE #4");
        await rst.close();
      });

      it("should encode signed 8-bit big-endian integer (INT8)", () => {
        const b = Buffer.alloc(1);

        Token.UINT8.put(b, 0, 0x00);
        assert.strictEqual(b.toString("binary"), "\u0000");

        Token.UINT8.put(b, 0, 0xff);
        assert.strictEqual(b.toString("binary"), "\u00FF");
      });

      it("should decode unsigned 8-bit integer (UINT8)", async () => {
        const rst = await getTokenizerWithData(
          "\u0000\u001A\u00FF",
          tokenizerType
        );

        let value: number = await rst.readToken(Token.UINT8);
        assert.strictEqual(typeof value, "number");
        assert.strictEqual(value, 0, "UINT8 #1");
        value = await rst.readToken(Token.UINT8);
        assert.strictEqual(typeof value, "number");
        assert.strictEqual(value, 26, "UINT8 #2");
        value = await rst.readToken(Token.UINT8);
        assert.strictEqual(typeof value, "number");
        assert.strictEqual(value, 255, "UINT8 #3");
        await rst.close();
      });

      it("should encode unsigned 16-bit big-endian integer (UINT16_LE)", () => {
        const b = Buffer.alloc(4);

        Token.UINT16_LE.put(b, 0, 0x00);
        Token.UINT16_LE.put(b, 2, 0xff_aa);
        assert.strictEqual(b.toString("binary"), "\u0000\u0000\u00AA\u00FF");
      });

      it("should encode unsigned 16-bit little-endian integer (UINT16_BE)", () => {
        const b = Buffer.alloc(4);
        Token.UINT16_BE.put(b, 0, 0xf);
        Token.UINT16_BE.put(b, 2, 0xff_aa);
        assert.strictEqual(b.toString("binary"), "\u0000\u000F\u00FF\u00AA");
      });

      it("should encode unsigned 16-bit mixed little/big-endian integers", () => {
        const b = Buffer.alloc(4);
        Token.UINT16_BE.put(b, 0, 0xff_aa);
        Token.UINT16_LE.put(b, 2, 0xff_aa);
        assert.strictEqual(b.toString("binary"), "\u00FF\u00AA\u00AA\u00FF");
      });

      it("should decode unsigned mixed 16-bit big/little-endian integer", async () => {
        const rst = await getTokenizerWithData(
          "\u001A\u0000\u001A\u0000\u001A\u0000\u001A\u0000",
          tokenizerType
        );

        let value: number = await rst.readToken(Token.UINT16_LE);
        assert.strictEqual(typeof value, "number");
        assert.strictEqual(value, 0x00_1a, "UINT16_LE #1");
        value = await rst.readToken(Token.UINT16_BE);
        assert.strictEqual(typeof value, "number");
        assert.strictEqual(value, 0x1a_00, "UINT16_BE #2");
        value = await rst.readToken(Token.UINT16_LE);
        assert.strictEqual(typeof value, "number");
        assert.strictEqual(value, 0x00_1a, "UINT16_BE #3");
        value = await rst.readToken(Token.UINT16_BE);
        assert.strictEqual(typeof value, "number");
        assert.strictEqual(value, 0x1a_00, "UINT16_LE #4");

        await rst.close();
      });

      it("should encode unsigned 24-bit little-endian integer (UINT24_LE)", () => {
        const b = Buffer.alloc(3);

        Token.UINT24_LE.put(b, 0, 0x00);
        assert.strictEqual(b.toString("binary"), "\u0000\u0000\u0000");

        Token.UINT24_LE.put(b, 0, 0xff);
        assert.strictEqual(b.toString("binary"), "\u00FF\u0000\u0000");

        Token.UINT24_LE.put(b, 0, 0xaa_bb_cc);
        assert.strictEqual(b.toString("binary"), "\u00CC\u00BB\u00AA");
      });

      it("should encode unsigned 24-bit big-endian integer (UINT24_BE)", () => {
        const b = Buffer.alloc(3);

        Token.UINT24_BE.put(b, 0, 0x00);
        assert.strictEqual(b.toString("binary"), "\u0000\u0000\u0000");

        Token.UINT24_BE.put(b, 0, 0xff);
        assert.strictEqual(b.toString("binary"), "\u0000\u0000\u00FF");

        Token.UINT24_BE.put(b, 0, 0xaa_bb_cc);
        assert.strictEqual(b.toString("binary"), "\u00AA\u00BB\u00CC");
      });

      it("should decode signed 24-bit big/little-endian integer (UINT24_LE/INT24_BE)", async () => {
        const rst = await getTokenizerWithData(
          "\u001A\u001A\u0000\u001A\u001A\u0000\u001A\u001A\u0000\u001A\u001A\u0000",
          tokenizerType
        );

        let value: number = await rst.readToken(Token.UINT24_LE);
        assert.strictEqual(typeof value, "number");
        assert.strictEqual(value, 0x00_1a_1a, "INT24_LE#1");
        value = await rst.readToken(Token.UINT24_BE);
        assert.strictEqual(typeof value, "number");
        assert.strictEqual(value, 0x1a_1a_00, "INT24_BE#2");
        value = await rst.readToken(Token.UINT24_LE);
        assert.strictEqual(typeof value, "number");
        assert.strictEqual(value, 0x00_1a_1a, "INT24_LE#3");
        value = await rst.readToken(Token.UINT24_BE);
        assert.strictEqual(typeof value, "number");
        assert.strictEqual(value, 0x1a_1a_00, "INT24_BE#4");

        await rst.close();
      });

      it("should encode unsigned 32-bit little-endian integer (UINT32_LE)", () => {
        const b = Buffer.alloc(4);

        Token.UINT32_LE.put(b, 0, 0x00);
        assert.strictEqual(b.toString("binary"), "\u0000\u0000\u0000\u0000");

        Token.UINT32_LE.put(b, 0, 0xff);
        assert.strictEqual(b.toString("binary"), "\u00FF\u0000\u0000\u0000");

        Token.UINT32_LE.put(b, 0, 0xaa_bb_cc_dd);
        assert.strictEqual(b.toString("binary"), "\u00DD\u00CC\u00BB\u00AA");
      });

      it("should encode unsigned 32-bit big-endian integer (INT32_BE)", () => {
        const b = Buffer.alloc(4);

        Token.UINT32_BE.put(b, 0, 0x00);
        assert.strictEqual(b.toString("binary"), "\u0000\u0000\u0000\u0000");

        Token.UINT32_BE.put(b, 0, 0xff);
        assert.strictEqual(b.toString("binary"), "\u0000\u0000\u0000\u00FF");

        Token.UINT32_BE.put(b, 0, 0xaa_bb_cc_dd);
        assert.strictEqual(b.toString("binary"), "\u00AA\u00BB\u00CC\u00DD");
      });

      it("should decode unsigned 32-bit little/big-endian integer (UINT32_LE/UINT32_BE)", async () => {
        const rst = await getTokenizerWithData(
          "\u001A\u0000\u001A\u0000\u001A\u0000\u001A\u0000\u001A\u0000\u001A\u0000\u001A\u0000\u001A\u0000",
          tokenizerType
        );

        let value: number = await rst.readToken(Token.UINT32_LE);
        assert.strictEqual(typeof value, "number");
        assert.strictEqual(value, 0x00_1a_00_1a, "UINT24_LE #1");
        value = await rst.readToken(Token.UINT32_BE);
        assert.strictEqual(typeof value, "number");
        assert.strictEqual(value, 0x1a_00_1a_00, "UINT32_BE #2");
        value = await rst.readToken(Token.UINT32_LE);
        assert.strictEqual(typeof value, "number");
        assert.strictEqual(value, 0x00_1a_00_1a, "UINT32_LE #3");
        value = await rst.readToken(Token.UINT32_BE);
        assert.strictEqual(typeof value, "number");
        assert.strictEqual(value, 0x1a_00_1a_00, "UINT32_BE #4");

        await rst.close();
      });
    });

    it("Transparency", async function () {
      // this.timeout(5000);

      const size = 10 * 1024;
      const buf = Buffer.alloc(size);

      for (let i = 0; i < size; ++i) {
        buf[i] = i % 255;
      }

      const testFile = "test2.dat";
      const pathTestFile = Path.join(__dirname, "resources", testFile);
      await fs.writeFile(pathTestFile, buf);

      const rst = await tokenizerType.loadTokenizer(testFile);
      let expected = 0;

      try {
        do {
          const v = await rst.readNumber(Token.UINT8);
          assert.strictEqual(v, expected % 255, "offset=" + expected);
          ++expected;
        } while (true);
      } catch (error) {
        assert.instanceOf(error, EndOfStreamError);
        assert.strictEqual(expected, size, "total number of parsed bytes");
      }

      await rst.close();
    }, 5000);

    it("Handle peek token", async () => {
      const rst = await tokenizerType.loadTokenizer("test1.dat");

      if (rst instanceof FileTokenizer) {
        assert.strictEqual(rst.fileInfo.size, 16, "check file size property");
      }
      await peekOnData(rst);
      await rst.close();
    });

    it("Overlapping peeks", async () => {
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
      assert.strictEqual(rst.position, 0);
      len = await rst.readBuffer(readBuffer, { length: 1 }); // Read #1
      assert.strictEqual(len, 1);
      assert.strictEqual(rst.position, 1);
      assert.deepEqual(readBuffer, Buffer.from("\u0001", "binary"), "Read #1");
      len = await rst.peekBuffer(peekBuffer, { length: 3 }); // Peek #2
      assert.strictEqual(len, 3);
      assert.strictEqual(rst.position, 1);
      assert.deepEqual(
        peekBuffer,
        Buffer.from("\u0002\u0003\u0004", "binary"),
        "Peek #2"
      );
      len = await rst.readBuffer(readBuffer, { length: 1 }); // Read #2
      assert.strictEqual(len, 1);
      assert.strictEqual(rst.position, 2);
      assert.deepEqual(readBuffer, Buffer.from("\u0002", "binary"), "Read #2");
      len = await rst.peekBuffer(peekBuffer, { length: 3 }); // Peek #3
      assert.strictEqual(len, 3);
      assert.strictEqual(rst.position, 2);
      assert.deepEqual(
        peekBuffer,
        Buffer.from("\u0003\u0004\u0005", "binary"),
        "Peek #3"
      );
      len = await rst.readBuffer(readBuffer, { length: 1 }); // Read #3
      assert.strictEqual(len, 1);
      assert.strictEqual(rst.position, 3);
      assert.deepEqual(readBuffer, Buffer.from("\u0003", "binary"), "Read #3");
      len = await rst.peekBuffer(peekBuffer, { length: 2 }); // Peek #4
      assert.strictEqual(
        len,
        2,
        "3 bytes requested to peek, only 2 bytes left"
      );
      assert.strictEqual(rst.position, 3);
      assert.deepEqual(
        peekBuffer,
        Buffer.from("\u0004\u0005\u0005", "binary"),
        "Peek #4"
      );
      len = await rst.readBuffer(readBuffer, { length: 1 }); // Read #4
      assert.strictEqual(len, 1);
      assert.strictEqual(rst.position, 4);
      assert.deepEqual(readBuffer, Buffer.from("\u0004", "binary"), "Read #4");

      await rst.close();
    });

    it("should be able to read at position ahead", async () => {
      const rst = await getTokenizerWithData("\u0005peter", tokenizerType);
      // should decode string from chunk
      assert.strictEqual(rst.position, 0);
      const value = await rst.readToken(new Token.StringType(5, "utf-8"), 1);
      assert.strictEqual(typeof value, "string");
      assert.strictEqual(value, "peter");
      assert.strictEqual(rst.position, 6);
      // should should reject at the end of the stream
      try {
        await rst.readToken(Token.UINT8);
        assert.fail("Should reject due to end-of-stream");
      } catch (error) {
        assert.instanceOf(error, EndOfStreamError);
      }
    });

    it("should be able to peek at position ahead", async () => {
      const rst = await getTokenizerWithData("\u0005peter", tokenizerType);
      // should decode string from chunk
      assert.strictEqual(rst.position, 0);
      const value = await rst.peekToken(new Token.StringType(5, "latin1"), 1);
      assert.strictEqual(typeof value, "string");
      assert.strictEqual(value, "peter");
      assert.strictEqual(rst.position, 0);
    });

    it("number", async () => {
      const tokenizer = await tokenizerType.loadTokenizer("test3.dat");
      assert.isDefined(tokenizer.fileInfo, "tokenizer.fileInfo");
      // @ts-ignore
      await tokenizer.ignore(tokenizer.fileInfo.size - 4);
      const x = await tokenizer.peekNumber(Token.INT32_BE);
      assert.strictEqual(x, 33_752_069);
    });

    it("should throw an Error if we reach EOF while peeking a number", async () => {
      const tokenizer = await tokenizerType.loadTokenizer("test3.dat");
      assert.isDefined(tokenizer.fileInfo, "tokenizer.fileInfo");
      // @ts-ignore
      await tokenizer.ignore(tokenizer.fileInfo.size - 3);
      try {
        await tokenizer.peekNumber(Token.INT32_BE);
        assert.fail("Should throw Error: End-Of-File");
      } catch (error) {
        assert.instanceOf(error, EndOfStreamError);
      }
      await tokenizer.close();
    });

    it("should be able to handle multiple ignores", async () => {
      const tokenizer = await tokenizerType.loadTokenizer("test1.dat");
      let value = await tokenizer.readToken(Token.UINT32_LE);
      assert.strictEqual(typeof value, "number");
      assert.strictEqual(value, 0x00_1a_00_1a, "UINT24_LE #1");
      await tokenizer.ignore(Token.UINT32_BE.len);
      await tokenizer.ignore(Token.UINT32_LE.len);
      value = await tokenizer.readToken(Token.UINT32_BE);
      assert.strictEqual(typeof value, "number");
      assert.strictEqual(value, 0x1a_00_1a_00, "UINT32_BE #4");
      await tokenizer.close();
    });

    it("should be able to ignore (skip)", async () => {
      const tokenizer = await tokenizerType.loadTokenizer("test1.dat");
      assert.strictEqual(tokenizer.position, 0);
      await tokenizer.ignore(4);
      assert.strictEqual(tokenizer.position, 4);
      let value = await tokenizer.readToken(Token.UINT32_BE);
      assert.strictEqual(typeof value, "number");
      assert.strictEqual(value, 0x1a_00_1a_00, "UINT32_BE #2");
      value = await tokenizer.readToken(Token.UINT32_LE);
      assert.strictEqual(typeof value, "number");
      assert.strictEqual(value, 0x00_1a_00_1a, "UINT32_LE #3");
      value = await tokenizer.readToken(Token.UINT32_BE);
      assert.strictEqual(typeof value, "number");
      assert.strictEqual(value, 0x1a_00_1a_00, "UINT32_BE #4");
      await tokenizer.close();
    });

    describe("End-Of-File exception behaviour", () => {
      it("should not throw an Error if we read exactly until the end of the file", async () => {
        const rst = await getTokenizerWithData(
          "\u0089\u0054\u0040",
          tokenizerType
        );
        const num = await rst.readToken(Token.UINT24_BE);
        assert.strictEqual(num, 9_000_000);
        await rst.close();
      });

      it("readBuffer()", async () => {
        const testFile = "test1.dat";

        const stat = await fs.stat(getResourcePath(testFile));
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

      it("should not throw an Error if we read exactly until the end of the file", async () => {
        const rst = await getTokenizerWithData(
          "\u0089\u0054\u0040",
          tokenizerType
        );
        const num = await rst.readToken(Token.UINT24_BE);
        assert.strictEqual(num, 9_000_000);
      });

      it("should be thrown if a token EOF reached in the middle of a token", async () => {
        const rst = await getTokenizerWithData(
          "\u0089\u0054\u0040",
          tokenizerType
        );
        try {
          await rst.readToken(Token.INT32_BE);
          assert.fail("It should throw EndOfFile Error");
        } catch (error) {
          assert.instanceOf(error, EndOfStreamError);
        }
      });

      it("should throw an EOF if we read to buffer", async () => {
        const buffer = Buffer.alloc(4);

        return getTokenizerWithData("\u0089\u0054\u0040", tokenizerType).then(
          (rst) => {
            return rst
              .readBuffer(buffer)
              .then((len) => {
                assert.fail("It should throw EndOfFile Error");
              })
              .catch((error) => {
                assert.instanceOf(error, EndOfStreamError);
              });
          }
        );
      });

      it("should throw an EOF if we peek to buffer", async () => {
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

    it("should be able to read from a file", async () => {
      const tokenizer = await tokenizerType.loadTokenizer("test1.dat");
      assert.strictEqual(
        tokenizer.fileInfo.size,
        16,
        "check file size property"
      );
      let value = await tokenizer.readToken(Token.UINT32_LE);
      assert.strictEqual(typeof value, "number");
      assert.strictEqual(value, 0x00_1a_00_1a, "UINT24_LE #1");
      value = await tokenizer.readToken(Token.UINT32_BE);
      assert.strictEqual(typeof value, "number");
      assert.strictEqual(value, 0x1a_00_1a_00, "UINT32_BE #2");
      value = await tokenizer.readToken(Token.UINT32_LE);
      assert.strictEqual(typeof value, "number");
      assert.strictEqual(value, 0x00_1a_00_1a, "UINT32_LE #3");
      value = await tokenizer.readToken(Token.UINT32_BE);
      assert.strictEqual(typeof value, "number");
      assert.strictEqual(value, 0x1a_00_1a_00, "UINT32_BE #4");
    });

    it("should be able to parse the IgnoreType-token", async () => {
      const tokenizer = await tokenizerType.loadTokenizer("test1.dat");
      await tokenizer.readToken(new Token.IgnoreType(4));
      let value = await tokenizer.readToken(Token.UINT32_BE);
      assert.strictEqual(typeof value, "number");
      assert.strictEqual(value, 0x1a_00_1a_00, "UINT32_BE #2");
      value = await tokenizer.readToken(Token.UINT32_LE);
      assert.strictEqual(typeof value, "number");
      assert.strictEqual(value, 0x00_1a_00_1a, "UINT32_LE #3");
      value = await tokenizer.readToken(Token.UINT32_BE);
      assert.strictEqual(typeof value, "number");
      assert.strictEqual(value, 0x1a_00_1a_00, "UINT32_BE #4");
    });

    it("should be able to read 0 bytes from a file", async () => {
      const bufZero = Buffer.alloc(0);
      const tokenizer = await tokenizerType.loadTokenizer("test1.dat");
      await tokenizer.readBuffer(bufZero);
    });
  }); // End of test "Tokenizer-types"
}

describe("fromStream with mayBeLess flag", () => {
  it("mayBeLess=true", async () => {
    // Initialize empty stream
    const stream = new PassThrough();
    const tokenizer = await strtok3.fromStream(stream);
    stream.end();

    // Try to read 5 bytes from empty stream, with mayBeLess flag enabled
    const buffer = Buffer.alloc(5);
    const bytesRead = await tokenizer.peekBuffer(buffer, { mayBeLess: true });
    assert.strictEqual(bytesRead, 0);
  });

  it("mayBeLess=false", async () => {
    try {
      // Initialize empty stream
      const stream = new PassThrough();
      const tokenizer = await strtok3.fromStream(stream);
      stream.end();

      // Try to read 5 bytes from empty stream, with mayBeLess flag enabled
      const buffer = Buffer.alloc(5);
      await tokenizer.peekBuffer(buffer, { mayBeLess: false });
    } catch (error) {
      if (error instanceof Error) {
        assert.strictEqual(error.message, "End-Of-Stream");
      } else {
        assert.fail("Expected: err instanceof Error");
      }
      return;
    }
    assert.fail("Should throw End-Of-Stream error");
  });
});

it("should determine the file size using a file stream", async () => {
  const stream = fs.createReadStream(
    Path.join(__dirname, "resources", "test1.dat")
  );
  const tokenizer = await strtok3.fromStream(stream);
  assert.isDefined(tokenizer.fileInfo, "`fileInfo` should be defined");
  assert.strictEqual(tokenizer.fileInfo.size, 16, "fileInfo.size");
});
