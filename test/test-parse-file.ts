import { rejects } from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { assert } from 'chai';
import { NotRegularFileError } from 'strtok3';

import { parseFile } from '../lib/index.js';
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
    it(`rejects a FIFO ${replaceBeforeOpen ? 'substituted before opening' : 'without a writer'} and closes its handle`, function () {
      if (process.platform === 'win32') {
        this.skip();
      }
      const fifoPath = path.join(directory, 'audio.fifo');
      const result = spawnSync('mkfifo', [fifoPath], { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);

      // A child process timeout bounds the test even if file opening blocks.
      const script = `
        import assert from 'node:assert/strict';
        import fs from 'node:fs/promises';
        const fifoPath = ${JSON.stringify(fifoPath)};
        const filePath = ${JSON.stringify(path.join(directory, 'audio.flac'))};
        const replaceBeforeOpen = ${replaceBeforeOpen};
        if (replaceBeforeOpen) {
          await fs.copyFile(${JSON.stringify(path.join(samplePath, 'flac.flac'))}, filePath);
        }
        const originalOpen = fs.open.bind(fs);
        let handle;
        fs.open = async (...args) => {
          if (replaceBeforeOpen) {
            await fs.unlink(filePath);
            await fs.symlink(fifoPath, filePath);
          }
          handle = await originalOpen(...args);
          return handle;
        };
        const {parseFile} = await import(${JSON.stringify(new URL('../lib/index.js', import.meta.url).href)});
        const {NotRegularFileError} = await import('strtok3');
        await assert.rejects(parseFile(replaceBeforeOpen ? filePath : fifoPath), NotRegularFileError);
        assert.equal(handle.fd, -1);
      `;
      const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
        encoding: 'utf8',
        timeout: 5000
      });
      assert.isUndefined(child.error, child.error?.message);
      assert.isNull(child.signal);
      assert.equal(child.status, 0, child.stderr);
    });
  }
});
