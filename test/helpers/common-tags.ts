import type { ICommonTagsResult, TagPatch } from '../../lib/index.js';

// Adding a common field upstream makes this fixture fail compilation until a value is tested.
export const fullCommon = {
  mbComposerId: ['Example A', 'Example B'],
  mbOriginalArtistId: ['Example A', 'Example B'],
  mbOriginalReleaseId: 'Example',
  directors: ['Example A', 'Example B'],
  originalFilename: 'Example',
  itunesCddb1: 'Example',
  replayGainAlbumRange: 8.5,
  replayGainTrackRange: 8.5,
  replayGainReferenceLoudness: 8.5,
  trackNumber: 2,
  trackTotal: 12,
  discNumber: 2,
  discTotal: 12,
  year: 2026,
  title: 'Example',
  artist: 'Example',
  artists: ['Example A', 'Example B'],
  albumArtist: 'Example',
  albumArtists: ['Example A', 'Example B'],
  album: 'Example',
  date: '2026-01-02',
  originalDate: '2000-01-02',
  originalYear: 2000,
  releaseDate: '2026-01-02',
  comments: [
    {
      language: 'eng',
      descriptor: 'Description',
      text: 'Comment'
    }
  ],
  genres: ['Example A', 'Example B'],
  composers: ['Example A', 'Example B'],
  lyrics: [
    {
      language: 'eng',
      descriptor: 'Lyrics',
      text: 'Words',
      contentType: 1,
      timeStampFormat: 2,
      syncText: []
    }
  ],
  albumSort: 'Example',
  titleSort: 'Example',
  work: 'Example',
  artistSort: 'Example',
  albumArtistSort: 'Example',
  composerSort: 'Example',
  lyricists: ['Example A', 'Example B'],
  writers: ['Example A', 'Example B'],
  conductors: ['Example A', 'Example B'],
  remixers: ['Example A', 'Example B'],
  arrangers: ['Example A', 'Example B'],
  engineers: ['Example A', 'Example B'],
  publishers: ['Example A', 'Example B'],
  producers: ['Example A', 'Example B'],
  djMixers: ['DJ One', 'DJ Two'],
  mixers: ['Example A', 'Example B'],
  technicians: ['Example A', 'Example B'],
  labels: ['Example A', 'Example B'],
  grouping: 'Example',
  subtitles: ['Subtitle'],
  description: ['Example A', 'Example B'],
  longDescription: 'Example',
  discSubtitle: ['Example A', 'Example B'],
  compilation: true,
  rating: [
    {
      source: 'listener@example.com',
      rating: 0.5
    }
  ],
  bpm: 12,
  mood: 'Example',
  media: 'Example',
  catalogNumber: ['Example A', 'Example B'],
  tvShow: 'tvShow value',
  tvShowSort: 'tvShowSort value',
  tvSeason: 2,
  tvEpisode: 7,
  tvEpisodeId: 'tvEpisodeId value',
  tvNetwork: 'tvNetwork value',
  podcast: true,
  podcastUrl: 'https://example.org/podcast.xml',
  releaseStatus: 'Example',
  releaseType: ['Example A', 'Example B'],
  releaseCountry: 'Example',
  script: 'Example',
  language: 'Example',
  copyright: 'Example',
  license: 'Example',
  encodedBy: 'Example',
  encoderSettings: 'Example',
  gapless: true,
  barcode: 'Example',
  isrcs: ['Example A', 'Example B'],
  asin: 'Example',
  mbRecordingId: 'Example',
  mbReleaseTrackId: 'Example',
  mbReleaseId: 'Example',
  mbArtistId: ['Example A', 'Example B'],
  mbAlbumArtistId: ['Example A', 'Example B'],
  mbReleaseGroupId: 'Example',
  mbWorkId: 'Example',
  mbTrmId: 'mbTrmId value',
  mbDiscId: 'Example',
  acoustId: 'acoustId value',
  acoustIdFingerprint: 'acoustIdFingerprint value',
  musicIpPuid: 'musicIpPuid value',
  musicIpFingerprint: 'musicIpFingerprint value',
  website: 'Example',
  'performer:instrument': ['Example A', 'Example B'],
  averageLevel: 12,
  peakLevel: 12,
  notes: ['Example A', 'Example B'],
  originalAlbum: 'Example',
  originalArtist: 'Original Artist',
  discogsArtistId: [12, 13],
  discogsReleaseId: 12,
  discogsLabelId: 12,
  discogsMasterReleaseId: 12,
  discogsVotes: 12,
  discogsRating: 12,
  replayGainTrackGainRatio: 0.5,
  replayGainTrackPeakRatio: 0.5,
  replayGainTrackGain: {
    ratio: 0.5,
    dB: -3.010299956639812
  },
  replayGainTrackPeak: {
    ratio: 0.5,
    dB: -3.010299956639812
  },
  replayGainAlbumGain: {
    ratio: 0.5,
    dB: -3.010299956639812
  },
  replayGainAlbumPeak: {
    ratio: 0.5,
    dB: -3.010299956639812
  },
  replayGainUndo: {
    leftChannel: -2,
    rightChannel: 3
  },
  replayGainTrackMinMax: [12, 13],
  replayGainAlbumMinMax: [21, 34],
  key: 'Example',
  categories: ['Example A', 'Example B'],
  hdVideo: 12,
  keywords: ['Example A', 'Example B'],
  movement: 'Example',
  movementNumber: 2,
  movementTotal: 12,
  podcastId: 'Example',
  showMovement: true,
  stik: 12,
  playCounter: 12
} satisfies Omit<Required<ICommonTagsResult>, 'picture'>;

export const completePatch: TagPatch = {
  ...fullCommon,
  picture: [
    {
      format: 'image/png',
      data: Uint8Array.from(
        Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF1sAAAAASUVORK5CYII=',
          'base64'
        )
      ),
      type: 'Cover (front)'
    }
  ]
};
