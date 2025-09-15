import { assert } from 'chai';
import path from 'node:path';

import * as mm from '../lib/index.js';
import { samplePath } from './util.js';
import type { IMetadataEventTag } from '../lib/type.js';

describe('Asynchronous observer updates', () => {

  const flacFilePath = path.join(samplePath, 'flac.flac');

  it('decode a FLAC audio file', async () => {

    const eventTags: IMetadataEventTag[] = [];

    await mm.parseFile(flacFilePath, {
      observer: (event => {
        eventTags.push(event.tag);
        if (event.tag.id === 'picture') {
          event.tag.value = null;
        }
      })
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
        value: {text: 'EAC-Secure Mode=should ignore equal sign'}
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
