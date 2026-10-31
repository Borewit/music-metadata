import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { assert } from 'chai';
import { parseBuffer } from '../lib/index.js';
import { samplePath } from './shared/util.js';

// Replicate the duration contract used by OpenClaw's Matrix media integration:
// https://github.com/openclaw/openclaw/blob/6e298fbd79e0d4896b438555434eeccb90de4f2e/extensions/matrix/src/matrix/send/media.test.ts
// Fixtures contain 441 packets/frames at 44,100 Hz, with an odd-sized JUNK
// chunk before COMM. IMA4 packets contain 64 decoded frames per channel.
// OpenClaw currently corrects Apple packet counts in its application adapter;
// assert the expected duration directly here so that workaround is unnecessary.
describe('OpenClaw integration: Matrix media duration', () => {
  for (const { name, durationMs, channels } of [
    { name: 'ima4-mono', durationMs: 640, channels: 1 },
    { name: 'ima4-stereo', durationMs: 640, channels: 2 },
    { name: 'ima4-decoded-frames', durationMs: 640, channels: 1 },
    { name: 'alaw', durationMs: 10, channels: 1 },
    { name: 'ulaw', durationMs: 10, channels: 1 },
    { name: 'ima4-malformed-packets', durationMs: 10, channels: 1 }
  ]) {
    it(`resolves ${name} to ${durationMs} ms`, async () => {
      const fileName = `openclaw-${name}.aifc`;
      const buffer = await readFile(path.join(samplePath, 'aiff', fileName));
      // Keep the public API, hints and options identical to resolveMediaDurationMs.
      const { format, common } = await parseBuffer(
        buffer,
        { mimeType: 'audio/aiff', size: buffer.byteLength, path: fileName },
        { duration: true, skipCovers: true }
      );
      assert.strictEqual(format.container, 'AIFF-C');
      assert.strictEqual(format.sampleRate, 44100);
      assert.strictEqual(format.numberOfChannels, channels);
      assert.strictEqual(common.title, `OpenClaw duration regression: ${name}`);
      assert.isNumber(format.duration);
      assert.isTrue(Number.isFinite(format.duration));
      assert.strictEqual(Math.max(0, Math.round(format.duration! * 1000)), durationMs);
    });
  }
});
