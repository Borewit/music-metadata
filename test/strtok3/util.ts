import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { fromBuffer } from "../../lib/strtok3/fromBuffer";
import { fromFile } from "../../lib/strtok3/fromFile";
import { fromStream } from "../../lib/strtok3/fromStream";

import type { ITokenizer } from "../../lib/strtok3/types";

type LoadTokenizer = (testFile: string) => Promise<ITokenizer>;

function getResourcePath(testFile: string) {
  return join(__dirname, "resources", testFile);
}

export async function getTokenizerWithData(testName: string, loadTokenizer: LoadTokenizer): Promise<ITokenizer> {
  const testFile = `${testName}.dat`;
  return loadTokenizer(testFile);
}

export const tokenizerCases: [string, LoadTokenizer][] = [
  ["File", async (testFile) => fromFile(getResourcePath(testFile))],
  ["Stream", async (testFile) => fromStream(createReadStream(getResourcePath(testFile)))],
  ["Buffer", async (testFile) => fromBuffer(await readFile(getResourcePath(testFile)))],
];
