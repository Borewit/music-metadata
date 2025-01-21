import { makeByteReadableStreamFromFile, makeByteReadableStreamFromNodeReadable, samplePath } from './util.js';
import { fromWebStream } from 'strtok3';
import path from 'node:path';
import { assert } from 'chai';

describe('test util', () => {

  describe('makeByteReadableStreamFromFile()', () => {

    it('read 4200 using BYOB Reader', async () => {

      const filePath = path.join(samplePath, 'mpc', 'bach-goldberg-variatians-05.sv8.mpc');

      const webStream = await makeByteReadableStreamFromFile(filePath);
      try {
        const reader = webStream.stream.getReader({mode: 'byob'});
        try {
          const bytesRequested = 4100;
          let bytesRemaining = bytesRequested;
          while(bytesRemaining>0) {
            const result = await reader.read(new Uint8Array(bytesRemaining));
            console.log(`Read len=${result.value.length}`);
            bytesRemaining += result.value.length;
            if (bytesRemaining > 0) {
              assert.isFalse(result.done, 'result.done');
            }
            assert.isDefined(result.value, 'result.value.length');
          }
        } finally{
          reader.releaseLock();
        }
      } finally {
        webStream.stream.cancel();
      }
    });

    it('peek 4200 bytes via tokenizer', async () => {

      const filePath = path.join(samplePath, 'mpc', 'bach-goldberg-variatians-05.sv8.mpc');

      const webStream = await makeByteReadableStreamFromFile(filePath);

      const tokenizer = fromWebStream(webStream.stream);

      const buf = new Uint8Array(4100);
      await tokenizer.peekBuffer(buf, {mayBeLess: true});

    });
  });
});
