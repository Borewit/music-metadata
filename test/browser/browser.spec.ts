localStorage.debug = 'music-metadata-browser:*';
import { Readable } from 'stream';
import http from 'stream-http';
import { parseBlob, parseNodeStream, fetchFromUrl, IOptions, IAudioMetadata, orderTags, ratingToStars } from '../../lib/browser.js';
import * as testData from '../test-data.js';

import { expect } from 'chai';

function httpGetByUrl(url: string): Promise<Readable> {
  // Assume URL
  return new Promise(resolve => {
    http.get(url, stream => {
      resolve(stream);
    });
  });
}

const urlInBloom = 'https://raw.githubusercontent.com/Borewit/music-metadata/master/test/samples/Nirvana - In Bloom - 2-sec.ogg';

function getAsBlob(url: string): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.responseType = 'blob'; // force the HTTP response, response-type header to be blob
    xhr.onload = () => {
      resolve(xhr.response); // xhr.response is now a blob object
    };
    xhr.onerror = () => {
      reject(new Error(`Failed download url=${url}`));
    };
    xhr.send();
  });
}

interface IParserTest {
  methodDescription: string;

  parseUrl(audioTrackUrl: string, options?: IOptions): Promise<IAudioMetadata>;
}

const parsers: IParserTest[] = [
  {
    methodDescription: 'parseStream()',
    parseUrl: async (audioTrackUrl, options) => {
      const stream = await httpGetByUrl(audioTrackUrl);
      return parseNodeStream(stream, (stream as any).type, options);
    }
  },
  {
    methodDescription: 'parseBlob()',
    parseUrl: async (audioTrackUrl, options) => {
      const blob = await getAsBlob(audioTrackUrl);
      return parseBlob(blob, options);
    }
  },
  {
    methodDescription: 'parseBlob() without blob.stream being implemented',
    parseUrl: async (audioTrackUrl, options) => {
      const blob = await getAsBlob(audioTrackUrl);
      blob.stream = undefined; // Simulate `stream()` not being implemented by browser (e.g. Safari < 14.1)
      return parseBlob(blob, options);
    }
  },
  {
    methodDescription: 'fetchFromUrl()',
    parseUrl: (audioTrackUrl, options) => {
      return fetchFromUrl(audioTrackUrl, options);
    }
  }
];

describe('music-metadata-browser', () => {

  describe('Parse Ogg audio track: Nirvana - In Bloom', () => {

    parsers.forEach(parser => {

      it(parser.methodDescription, async () => {
        const metadata = await parser.parseUrl(urlInBloom);

        expect(metadata.format.tagTypes).to.equal(['vorbis'], 'expect Vorbis metadata header');
        expect(metadata.format.duration).to.equal(2.0, 'duration should be 2.0 sec');
        expect(metadata.format.sampleRate).to.equal(44100, 'sample-rate should be 44.1 kHz');
        expect(metadata.format.numberOfChannels).to.equal(2, 'number of channels should be 2 (stereo)');
        expect(metadata.format.bitrate).to.equal(64000, 'bitrate should be 64 kbit/sec');

        expect(metadata.common.title).to.equal('In Bloom');
        expect(metadata.common.artist).to.equal('Nirvana');
        expect(metadata.common.albumartist).to.equal('Nirvana', 'common.albumartist');
        expect(metadata.common.album).to.equal('Nevermind', 'common.album');
        expect(metadata.common.year).to.equal(1991, 'common.year');
        expect(metadata.common.track).to.equal({no: 2, of: 12}, 'common.track');
        expect(metadata.common.disk).to.equal({no: 1, of: 1}, 'common.disk');
        expect(metadata.common.genre).to.equal(['Grunge', 'Alternative'], 'genre');
        expect(metadata.common.picture[0].format).to.equal('image/jpeg', 'picture format');
        expect(metadata.common.picture[0].data.length).to.equal(30966, 'picture length');
        expect(metadata.common.barcode).to.equal('0720642442524', 'common.barcode (including leading zero)');
        expect(metadata.common.asin).to.equal('B000003TA4', 'common.asin');
        expect(metadata.common.catalognumber).to.equal(['GED24425'], 'common.asin');
        expect(metadata.common.isrc).to.equal(['USGF19942502'], 'common.isrc');

        // Make sure the orderTags is working
        const vorbisTags = orderTags(metadata.native.vorbis);

        expect(vorbisTags.TRACKNUMBER).to.equal(['2'], 'vorbis.TRACKNUMBER');
        expect(vorbisTags.TRACKTOTAL).to.equal(['12'], 'vorbis.TRACKTOTAL');

      });
    });
  });

  it('Should expose the `ratingToStars()`', () => {
    expect(ratingToStars(1.0)).to.equal(5);
  });

});

describe('Parse Tiuqottigeloot Vol 24 tracks', () => {

  parsers.forEach(parser => {

    describe(`Parser: ${parser.methodDescription}`, () => {

      testData.tracks.forEach(track => {
        it(`track ${track.metaData.artist} - ${track.metaData.title}`, async () => {
          const url = testData.providers.netlify.getUrl(track);
          const metadata = await parser.parseUrl(url);
          expect(metadata.common.artist).to.equal(track.metaData.artist);
          expect(metadata.common.title).to.equal(track.metaData.title);
        });
      });
    });

  });

});
