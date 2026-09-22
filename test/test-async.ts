import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { assert } from 'chai';

import * as mm from '../lib/index.js';
import type { IMetadataEventTag } from '../lib/type.js';
import { samplePath } from './util.js';

describe('Asynchronous observer updates', () => {
  describe('WAVE metadata before audio', () => {
    async function openSample(filename: string) {
      const bytes = await readFile(path.join(samplePath, 'wav', filename));
      let offset = 12;
      while (bytes.toString('ascii', offset, offset + 4) !== 'data') {
        const size = bytes.readUInt32LE(offset + 4);
        offset += 8 + size + (size & 1);
      }
      const dataStart = offset + 8;
      let headerSent = false;
      let audioRequested = false;
      const stream = new ReadableStream<Uint8Array>(
        {
          pull(controller) {
            if (!headerSent) {
              headerSent = true;
              controller.enqueue(bytes.subarray(0, dataStart));
            } else {
              audioRequested = true;
              controller.enqueue(bytes.subarray(dataStart));
              controller.close();
            }
          }
        },
        { highWaterMark: 0 }
      );
      return { stream, audioRequested: () => audioRequested };
    }

    for (const sample of [
      { file: 'cest_id3-before-data.wav', titles: ['ID3 observer title'], tagTypes: ['ID3v2.3'] },
      { file: 'cest_info-id3-cset-before-data.wav', titles: ['ID3 observer title'], tagTypes: ['exif', 'ID3v2.3'] },
      {
        file: 'cest_cset-info-id3-before-data.wav',
        titles: ['“Mötley” – 10 €', 'ID3 observer title'],
        tagTypes: ['exif', 'ID3v2.3']
      },
      { file: 'cest_info-id3-no-cset.wav', titles: ['ID3 observer title'], tagTypes: ['exif', 'ID3v2.3'] }
    ]) {
      it(sample.file, async () => {
        const source = await openSample(sample.file);
        const titles: unknown[] = [];
        const beforeAudio: boolean[] = [];
        const metadata = await mm.parseWebStream(
          source.stream,
          { mimeType: 'audio/wav' },
          {
            observer(event) {
              if (event.tag.type === 'common' && event.tag.id === 'title') {
                titles.push(event.tag.value);
                beforeAudio.push(!source.audioRequested());
              }
            }
          }
        );
        assert.deepEqual(titles, sample.titles);
        assert.deepEqual(
          beforeAudio,
          sample.titles.map(() => true)
        );
        assert.deepEqual(metadata.format.tagTypes, sample.tagTypes);
        assert.strictEqual(metadata.common.title, 'ID3 observer title');
        if (sample.tagTypes.includes('exif')) {
          const expectedInfoTitle = sample.file === 'cest_info-id3-no-cset.wav' ? 'Mötley' : '“Mötley” – 10 €';
          assert.deepEqual(mm.orderTags(metadata.native.exif).INAM, [expectedInfoTitle]);
        }
      });
    }

    for (const file of ['cest_invalid-id3-before-data.wav', 'cest_info-invalid-id3-no-cset.wav']) {
      it(`should reject malformed ID3 before requesting audio: ${file}`, async () => {
        const source = await openSample(file);
        try {
          await mm.parseWebStream(source.stream, { mimeType: 'audio/wav' });
          assert.fail('Expected an invalid ID3 error');
        } catch (error) {
          assert.instanceOf(error, mm.UnexpectedFileContentError);
          assert.match((error as Error).message, /expected ID3-header/);
        }
        assert.isFalse(source.audioRequested());
      });
    }
  });

  const flacFilePath = path.join(samplePath, 'flac.flac');

  it('decode a FLAC audio file', async () => {
    const eventTags: IMetadataEventTag[] = [];

    await mm.parseFile(flacFilePath, {
      observer: event => {
        eventTags.push(event.tag);
        if (event.tag.id === 'picture') {
          event.tag.value = null;
        }
      }
    });

    assert.deepEqual(eventTags, [
      {
        id: 'container',
        type: 'format',
        value: 'FLAC'
      },
      {
        id: 'codec',
        type: 'format',
        value: 'FLAC'
      },
      {
        id: 'hasAudio',
        type: 'format',
        value: true
      },
      {
        id: 'lossless',
        type: 'format',
        value: true
      },
      {
        id: 'numberOfChannels',
        type: 'format',
        value: 2
      },
      {
        id: 'bitsPerSample',
        type: 'format',
        value: 16
      },
      {
        id: 'sampleRate',
        type: 'format',
        value: 44100
      },
      {
        id: 'duration',
        type: 'format',
        value: 271.7733333333333
      },
      {
        id: 'tool',
        type: 'format',
        value: 'reference libFLAC 1.2.1 20070917'
      },
      {
        id: 'album',
        type: 'common',
        value: 'Congratulations'
      },
      {
        id: 'artists',
        type: 'common',
        value: 'MGMT'
      },
      {
        id: 'artist',
        type: 'common',
        value: 'MGMT'
      },
      {
        id: 'comment',
        type: 'common',
        value: { text: 'EAC-Secure Mode=should ignore equal sign' }
      },
      {
        id: 'genre',
        type: 'common',
        value: 'Alt. Rock'
      },
      {
        id: 'title',
        type: 'common',
        value: 'Brian Eno'
      },
      {
        id: 'date',
        type: 'common',
        value: '2010'
      },
      {
        id: 'picture',
        type: 'common',
        value: null
      },
      {
        id: 'bitrate',
        type: 'format',
        value: 3529.912181720061
      },
      {
        id: 'hasVideo',
        type: 'format',
        value: false
      }
    ]);
  });
});
