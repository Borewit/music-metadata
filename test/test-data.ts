export interface IProvider {
  name: string,
  getUrl: (track: ITrack) => string;
}

export interface ITrack {
  folder: string,
  track: string,
  duration: number,
  metaData: {
    title: string,
    artist: string
  }
}

export const tracks: ITrack[] = [
  {
    folder: 'Various Artists - 2009 - netBloc Vol 24_ tiuqottigeloot [MP3-V2]',
    track: '01 - Diablo Swing Orchestra - Heroines.mp3',
    duration: 322.612245,
    metaData: {
      title: 'Heroines',
      artist: 'Diablo Swing Orchestra'
    }
  },
  {
    folder: 'Various Artists - 2008 - netBloc Vol 13 - Color in a World of Monochrome [AAC-40]',
    track: '1.02. Solid Ground.m4a',
    duration: 13407768 / 44100,
    metaData: {
      title: 'Solid Ground',
      artist: 'Poxfil'
    }
  }
];

export const providers: { [providerId: string]: IProvider; } = {
  netlify: {
    name: 'Netlify',
    getUrl: track => 'https://test-audio.netlify.app' + '/' + encodeURI(track.folder) + '/' + encodeURI(track.track)
  }
};
