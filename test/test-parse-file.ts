import { rejects } from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { assert } from 'chai';
import { NotRegularFileError } from 'strtok3';

import { parseFile } from '../lib/index.js';
import { runIsolatedRegression } from './isolated-regression.js';
import { samplePath } from './util.js';

describe('parseFile filesystem objects', () => {
  let directory: string;

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'music-metadata-parse-file-'));
  });

  afterEach(async () => {
    await fs.rm(directory, { recursive: true, force: true });
  });

  it('parses regular files', async () => {
    const metadata = await parseFile(path.join(samplePath, 'flac.flac'));
    assert.equal(metadata.format.container, 'FLAC');
  });

  it('rejects directories with NotRegularFileError', async () => {
    await rejects(parseFile(directory), NotRegularFileError);
  });

  it('preserves file-opening errors', async () => {
    await rejects(parseFile(path.join(directory, 'missing.flac')), { code: 'ENOENT' });
  });

  it('parses symlinks to regular files', async function () {
    if (process.platform === 'win32') {
      this.skip();
    }
    const linkPath = path.join(directory, 'link.flac');
    await fs.symlink(path.join(samplePath, 'flac.flac'), linkPath);
    const metadata = await parseFile(linkPath);
    assert.equal(metadata.format.container, 'FLAC');
  });

  for (const replaceBeforeOpen of [false, true]) {
    it(`rejects a FIFO ${replaceBeforeOpen ? 'substituted before opening' : 'without a writer'} and closes its handle`, async function () {
      if (process.platform === 'win32') {
        this.skip();
      }
      const fifoPath = path.join(directory, 'audio.fifo');
      const result = spawnSync('mkfifo', [fifoPath], { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);

      await runIsolatedRegression(
        async (
          parserUrl: string,
          fifoPath: string,
          filePath: string,
          samplePath: string,
          replaceBeforeOpen: boolean
        ) => {
          const assert: typeof import('node:assert/strict') = (await import('node:assert/strict')).default;
          const { default: fs } = await import('node:fs/promises');
          const { NotRegularFileError } = await import('strtok3');
          if (replaceBeforeOpen) {
            await fs.copyFile(samplePath, filePath);
          }
          const originalOpen = fs.open.bind(fs);
          let handle: Awaited<ReturnType<typeof fs.open>>;
          fs.open = async (...args) => {
            if (replaceBeforeOpen) {
              await fs.unlink(filePath);
              await fs.symlink(fifoPath, filePath);
            }
            handle = await originalOpen(...args);
            return handle;
          };
          const { parseFile } = (await import(parserUrl)) as typeof import('../lib/index.js');
          await assert.rejects(parseFile(replaceBeforeOpen ? filePath : fifoPath), NotRegularFileError);
          assert.equal(handle.fd, -1);
        },
        [
          new URL('../lib/index.js', import.meta.url).href,
          fifoPath,
          path.join(directory, 'audio.flac'),
          path.join(samplePath, 'flac.flac'),
          replaceBeforeOpen
        ],
        { timeout: 5000, baseUrl: import.meta.url }
      );
    });
  }
});
