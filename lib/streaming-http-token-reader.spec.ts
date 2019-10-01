// localStorage.debug = '*';

import * as mm from 'music-metadata-browser';
import { IStreamingHttpConfig, StreamingHttpTokenReader } from './streaming-http-token-reader';

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
      const streamingHttpTokenReader = new StreamingHttpTokenReader(audioTrackUrl, config);
      return streamingHttpTokenReader.init().then(() => {
        return mm.parseFromTokenizer(streamingHttpTokenReader, streamingHttpTokenReader.contentType, options);
      });
    },
    enable: true
  }
];

const webAmpTracks = [
  {
    url:
      '01_Diablo_Swing_Orchestra_-_Heroines.mp3',
    duration: 322.612245,
    metaData: {
      title: 'Heroines',
      artist: 'Diablo Swing Orchestra'
    }
  },
  {
    url: '02_Eclectek_-_We_Are_Going_to_Eclecfunk_Your_Ass.mp3',
    duration: 190.093061,
    metaData: {
      title: 'We Are Going to Eclecfunk Your Ass',
      artist: 'Eclectek'
    }
  },
  {
    url: '03_Auto-Pilot_-_Seventeen.mp3',
    duration: 214.622041,
    metaData: {
      title: 'Seventeen',
      artist: 'Auto-Pilot'
    }
  },
  {
    url: '04_Muha_-_Microphone.mp3',
    duration: 181.838367,
    metaData: {
      title: 'Microphone',
      artist: 'Muha'
    }
  },
  {
    url: '05_Just_Plain_Ant_-_Stumble.mp3',
    duration: 86.047347,
    metaData: {
      title: 'Stumble',
      artist: 'Just Plain Ant'
    }
  },
  {
    url:
      '06_Sleaze_-_God_Damn.mp3',
    duration: 226.795102,
    metaData: {
      title: 'God Damn',
      artist: 'Sleaze'
    }
  },
  {
    url:
      '07_Juanitos_-_Hola_Hola_Bossa_Nova.mp3',
    duration: 207.072653,
    metaData: {
      title: 'Hola Hola Bossa Nova',
      artist: 'Juanitos'
    }
  },
  {
    url:
      '08_Entertainment_for_the_Braindead_-_Resolutions_(Chris_Summer_remix).mp3',
    duration: 314.331429,
    metaData: {
      title: 'Resolutions (Chris Summer remix)',
      artist: 'Entertainment for the Braindead'
    }
  },
  {
    url:
      '09_Nobara_Hayakawa_-_Trail.mp3',
    duration: 204.042449,
    metaData: {
      title: 'Trail',
      artist: 'Nobara Hayakawa'
    }
  },
  {
    url:
      '10_Paper_Navy_-_Tongue_Tied.mp3',
    duration: 201.116735,
    metaData: {
      title: 'Tongue Tied',
      artist: 'Paper Navy'
    }
  },
  {
    url:
      '11_60_Tigres_-_Garage.mp3',
    duration: 245.394286,
    metaData: {
      title: 'Garage',
      artist: '60 Tigres'
    }
  },
  {
    url:
      '12_CM_aka_Creative_-_The_Cycle_(feat._Mista_Mista).mp3',
    duration: 221.44,
    metaData: {
      title: 'The Cycle (feat. Mista Mista)',
      artist: 'CM aka Creative'
    }
  }
];

describe('streaming-http-token-reader', () => {

  const netlify: IProvider = {
    name: 'Netlify',
    getUrl: url => 'https://netbloc-vol24.netlify.com/' + url
  };

  describe('Parse WebAmp tracks', () => {

    const profiles: IFetchProfile[] = [
      {
        provider: netlify,
        config:
          {
            avoidHeadRequests: false
          }
      },
      {
        provider: netlify,
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

            webAmpTracks.forEach(track => {
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

  describe('Parse WebAmp tracks parallel', () => {

    parsers.forEach(parser => {
      if (!parser.enable) {
        return;
      }
      it(`Parser: ${parser.methodDescription}`, () => {

        return Promise.all(webAmpTracks.map(track => {
          return parser.parseUrl(netlify.getUrl(track.url)).then(metadata => {
            expect(metadata.common.artist).toEqual(track.metaData.artist);
            expect(metadata.common.title).toEqual(track.metaData.title);
          });
        }));
      });

    });

  });

});
