// localStorage.debug = '*';

import * as mm from 'music-metadata-browser';
import { IStreamingHttpConfig, StreamingHttpTokenReader } from './streaming-http-token-reader';
import {tiuqottigeloot_vol24_Tracks, providers} from '../node/test/test-data';

interface IParserTest {
  methodDescription: string;
  enable?: boolean;

  parseUrl(audioTrackUrl: string, config?: IStreamingHttpConfig, options?: mm.IOptions): Promise<mm.IAudioMetadata>;
}

interface IProvider {
  name: string,
  getUrl: (url: string) => string;
}

interface IFetchProfile {
  config: IStreamingHttpConfig;
  provider: IProvider;
}

const parsers: IParserTest[] = [
  {
    methodDescription: 'StreamingHttpTokenReader => parseTokenizer()',
    parseUrl: (audioTrackUrl, config, options) => {
      const streamingHttpTokenReader = StreamingHttpTokenReader.fromUrl(audioTrackUrl, config);
      return streamingHttpTokenReader.init().then(() => {
        return mm.parseFromTokenizer(streamingHttpTokenReader, streamingHttpTokenReader.contentType, options);
      });
    },
    enable: true
  }
];

describe('streaming-http-token-reader', () => {

  describe('Parse WebAmp tracks', () => {

    const profiles: IFetchProfile[] = [
      {
        provider: providers.netlify,
        config:
          {
            avoidHeadRequests: false
          }
      },
      {
        provider: providers.netlify,
        config:
          {
            avoidHeadRequests: true
          }
      }
    ];

    profiles.forEach(profile => {

      describe(`provider=${profile.provider.name} avoid-HEAD-request=${profile.config.avoidHeadRequests}`, () => {

        parsers.forEach(parser => {
          if (!parser.enable) {
            return;
          }
          describe(`Parser: ${parser.methodDescription}`, () => {

            tiuqottigeloot_vol24_Tracks.forEach(track => {
              const url = profile.provider.getUrl(track.url);
              it(`track ${track.metaData.artist} - ${track.metaData.title} from url: ${url}`, () => {
                return parser.parseUrl(url, profile.config).then(metadata => {
                  expect(metadata.common.artist).toEqual(track.metaData.artist);
                  expect(metadata.common.title).toEqual(track.metaData.title);
                });
              });
            });
          });

        });

      });
    });
  });

});
