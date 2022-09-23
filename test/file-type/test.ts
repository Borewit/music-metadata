import { Buffer } from "node:buffer";
import { readFileSync, createReadStream } from "node:fs";
import { join } from "node:path";

import { test, expect, describe } from "vitest";

import {
  fileTypeFromBuffer,
  fileTypeFromStream,
  fileTypeFromFile,
  fileTypeStream,
  FileExtension,
} from "../../lib/file-type";
import { SourceStream } from "../util";

import { streamToBuffer } from "./util";

// Define an entry here only if the fixture has a different
// name than `fixture` or if you want multiple fixtures
const names: Record<FileExtension, string[]> = {
  aac: ["fixture-adts-mpeg2", "fixture-adts-mpeg4", "fixture-adts-mpeg4-2", "fixture-id3v2"],
  asar: ["fixture", "fixture2"],
  arw: ["fixture-sony-zv-e10"],
  cr3: ["fixture"],
  dng: ["fixture-Leica-M10"],
  epub: ["fixture", "fixture-crlf"],
  nef: ["fixture", "fixture2", "fixture3", "fixture4"],
  "3gp": ["fixture", "fixture2"],
  woff2: ["fixture", "fixture-otto"],
  woff: ["fixture", "fixture-otto"],
  eot: ["fixture", "fixture-0x20001"],
  mov: ["fixture", "fixture-mjpeg", "fixture-moov"],
  mp2: ["fixture", "fixture-mpa"],
  mp3: ["fixture", "fixture-mp2l3", "fixture-ffe3"],
  mp4: ["fixture-imovie", "fixture-isom", "fixture-isomv2", "fixture-mp4v2", "fixture-dash"],
  mts: ["fixture-raw", "fixture-bdav"],
  tif: ["fixture-big-endian", "fixture-little-endian"],
  gz: ["fixture.tar"],
  xz: ["fixture.tar"],
  lz: ["fixture.tar"],
  Z: ["fixture.tar"],
  zst: ["fixture.tar"],
  mkv: ["fixture", "fixture2"],
  mpg: ["fixture", "fixture2", "fixture.ps", "fixture.sub"],
  heic: ["fixture-mif1", "fixture-msf1", "fixture-heic"],
  ape: ["fixture-monkeysaudio"],
  mpc: ["fixture-sv7", "fixture-sv8"],
  pcap: ["fixture-big-endian", "fixture-little-endian"],
  png: ["fixture", "fixture-itxt"],
  tar: ["fixture", "fixture-v7", "fixture-spaces"],
  mie: ["fixture-big-endian", "fixture-little-endian"],
  m4a: [
    "fixture-babys-songbook.m4b", // Actually it's an `.m4b`
  ],
  flac: [
    "fixture",
    "fixture-id3v2", // FLAC prefixed with ID3v2 header
  ],
  docx: ["fixture", "fixture2", "fixture-office365"],
  pptx: ["fixture", "fixture2", "fixture-office365"],
  xlsx: ["fixture", "fixture2", "fixture-office365"],
  ogx: [
    "fixture-unknown-ogg", // Manipulated fixture to unrecognized Ogg based file
  ],
  avif: [
    "fixture-yuv420-8bit", // Multiple bit-depths and/or subsamplings
    "fixture-sequence",
  ],
  eps: ["fixture", "fixture2"],
  cfb: ["fixture.msi", "fixture.xls", "fixture.doc", "fixture.ppt", "fixture-2.doc"],
  asf: ["fixture", "fixture.wma", "fixture.wmv"],
  ai: [
    "fixture-normal", // Normal AI
    "fixture-without-pdf-compatibility", // AI without the PDF compatibility (cannot be opened by PDF viewers I guess)
  ],
  jxl: [
    "fixture", // Image data stored within JXL container
    "fixture2", // Bare image data with no container
  ],
  pdf: [
    "fixture",
    "fixture-adobe-illustrator", // PDF saved from Adobe Illustrator, using the default "[Illustrator Default]" preset
    "fixture-smallest", // PDF saved from Adobe Illustrator, using the preset "smallest PDF"
    "fixture-fast-web", // PDF saved from Adobe Illustrator, using the default "[Illustrator Default"] preset, but enabling "Optimize for Fast Web View"
    "fixture-printed", // PDF printed from Adobe Illustrator, but with a PDF printer.
  ],
  webm: [
    "fixture-null", // EBML DocType with trailing null character
  ],
  xml: [
    "fixture",
    "fixture-utf8-bom", // UTF-8 with BOM
    "fixture-utf16-be-bom", // UTF-16 little endian encoded XML, with BOM
    "fixture-utf16-le-bom", // UTF-16 big endian encoded XML, with BOM
  ],

  jpg: ["fixture"],
  apng: ["fixture"],
  gif: ["fixture"],
  webp: ["fixture"],
  flif: ["fixture"],
  xcf: ["fixture"],
  cr2: ["fixture"],
  orf: ["fixture"],
  rw2: ["fixture"],
  raf: ["fixture"],
  bmp: ["fixture"],
  icns: ["fixture"],
  jxr: ["fixture"],
  psd: ["fixture"],
  indd: ["fixture"],
  zip: ["fixture"],
  rar: ["fixture"],
  bz2: ["fixture"],
  "7z": ["fixture"],
  dmg: ["fixture"],
  mid: ["fixture"],
  avi: ["fixture"],
  oga: ["fixture"],
  ogg: ["fixture"],
  ogv: ["fixture"],
  opus: ["fixture"],
  wav: ["fixture"],
  spx: ["fixture"],
  amr: ["fixture"],
  elf: ["fixture"],
  exe: ["fixture"],
  swf: ["fixture"],
  rtf: ["fixture"],
  wasm: ["fixture"],
  ttf: ["fixture"],
  otf: ["fixture"],
  ico: ["fixture"],
  flv: ["fixture"],
  ps: ["fixture"],
  sqlite: ["fixture"],
  nes: ["fixture"],
  crx: ["fixture"],
  xpi: ["fixture"],
  cab: ["fixture"],
  deb: ["fixture"],
  ar: ["fixture"],
  rpm: ["fixture"],
  mxf: ["fixture"],
  blend: ["fixture"],
  bpg: ["fixture"],
  "3g2": ["fixture"],
  jp2: ["fixture"],
  jpm: ["fixture"],
  jpx: ["fixture"],
  mj2: ["fixture"],
  aif: ["fixture"],
  qcp: ["fixture"],
  odt: ["fixture"],
  ods: ["fixture"],
  odp: ["fixture"],
  mobi: ["fixture"],
  cur: ["fixture"],
  ktx: ["fixture"],
  wv: ["fixture"],
  dcm: ["fixture"],
  ics: ["fixture"],
  glb: ["fixture"],
  dsf: ["fixture"],
  lnk: ["fixture"],
  alias: ["fixture"],
  voc: ["fixture"],
  ac3: ["fixture"],
  m4v: ["fixture"],
  m4p: ["fixture"],
  m4b: ["fixture"],
  f4v: ["fixture"],
  f4p: ["fixture"],
  f4b: ["fixture"],
  f4a: ["fixture"],
  ogm: ["fixture"],
  arrow: ["fixture"],
  shp: ["fixture"],
  mp1: ["fixture"],
  it: ["fixture"],
  s3m: ["fixture"],
  xm: ["fixture"],
  skp: ["fixture"],
  lzh: ["fixture"],
  pgp: ["fixture"],
  stl: ["fixture"],
  chm: ["fixture"],
  "3mf": ["fixture"],
  vcf: ["fixture"],
};

// Define an entry here only if the file type has potential
// for false-positives
const falsePositives: Partial<Record<FileExtension, string[]>> = {
  png: ["fixture-corrupt"],
};

async function checkBufferLike(type: FileExtension, bufferLike: Uint8Array | ArrayBuffer | Buffer) {
  const fileType = await fileTypeFromBuffer(bufferLike);
  expect(fileType.ext).toBe(type);
  expect(fileType.mime).toBeTypeOf("string");
}

const cases = Object.entries(names).flatMap(([type, typenames]) =>
  typenames.map((name) => [name, type] as [string, FileExtension])
);

const falsePositivesCases = Object.entries(falsePositives).flatMap(([type, typenames]) =>
  typenames.map((name) => [name, type] as [string, FileExtension])
);

describe.each(cases)("%s.%s", (name, type) => {
  const filePath = join(__dirname, "fixture", `${name}.${type}`);
  test("fromFile", async () => {
    const fileType = await fileTypeFromFile(filePath);
    expect(fileType.ext).toBe(type);
    expect(fileType.mime).toBeTypeOf("string");
  });

  test("fromBuffer Buffer", async () => {
    const chunk = readFileSync(filePath);
    await checkBufferLike(type, chunk);
  });

  test("fromBuffer Uint8Array", async () => {
    const chunk = readFileSync(filePath);
    await checkBufferLike(type, new Uint8Array(chunk));
  });

  test.skip("fromBuffer ArrayBuffer.slice", async () => {
    const chunk = readFileSync(filePath);
    await checkBufferLike(type, chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength));
  });

  test("fromStream", async () => {
    const fileType = await fileTypeFromStream(createReadStream(filePath));

    expect(fileType, `identify ${name}.${type}`).toBeTruthy();
    expect(fileType.ext, "fileType.ext").toBe(type);
    expect(fileType.mime, "fileType.mime").toBeTypeOf("string");
  });

  test("fileTypeStream", async () => {
    const readableStream = await fileTypeStream(createReadStream(filePath));
    const fileStream = createReadStream(filePath);

    const [bufferA, bufferB] = await Promise.all([streamToBuffer(readableStream), streamToBuffer(fileStream)]);

    expect(bufferA.equals(bufferB)).toBe(true);
  });
});

describe.each(falsePositivesCases)("%s.%s", (name, type) => {
  const filePath = join(__dirname, "fixture", `${name}.${type}`);

  test(`false positive - from file`, async () => {
    await expect(fileTypeFromFile(filePath)).resolves.toBeUndefined();
  });

  test(`false positive - from buffer Buffer`, async () => {
    const chunk = readFileSync(filePath);
    await expect(fileTypeFromBuffer(chunk)).resolves.toBeUndefined();
  });

  test(`false positive - from buffer Uint8Array`, async () => {
    const chunk = readFileSync(filePath);
    await expect(fileTypeFromBuffer(new Uint8Array(chunk))).resolves.toBeUndefined();
  });

  test.skip(`false positive - from buffer ArrayBufferLike`, async () => {
    const chunk = readFileSync(filePath);
    await expect(fileTypeFromBuffer(chunk.buffer)).resolves.toBeUndefined();
  });
});

test("validate the input argument type", async () => {
  await expect(fileTypeFromBuffer(Buffer.from("x"))).resolves.not.toThrow();
  await expect(fileTypeFromBuffer(new Uint8Array())).resolves.not.toThrow();
  await expect(fileTypeFromBuffer(new ArrayBuffer(0))).resolves.not.toThrow();
});

test("odd file sizes", async () => {
  const oddFileSizes = [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 255, 256, 257, 511, 512, 513];

  for (const size of oddFileSizes) {
    const buffer = Buffer.alloc(size);
    const stream = new SourceStream(buffer);

    await expect(fileTypeFromBuffer(buffer), `fromBuffer: File size: ${size} bytes`).resolves.not.toThrow();

    await expect(fileTypeFromStream(stream), `fromStream: File size: ${size} bytes`).resolves.not.toThrow();
  }
});
