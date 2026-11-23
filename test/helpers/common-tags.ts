import type { ICommonTagsResult, TagPatch } from '../../lib/index.js';

// Adding a common field upstream makes this fixture fail compilation until a value is tested.
export const fullCommon = {
  mbComposerId: ['mbComposerId A', 'mbComposerId B'],
  mbOriginalArtistId: ['mbOriginalArtistId A', 'mbOriginalArtistId B'],
  mbOriginalReleaseId: 'mbOriginalReleaseId value',
  directors: ['directors A', 'directors B'],
  originalFilename: 'originalFilename value',
  itunesCddb1: 'itunesCddb1 value',
  replayGainAlbumRange: 8.5,
  replayGainTrackRange: 5.5,
  replayGainReferenceLoudness: 89,
  trackNumber: 2,
  trackTotal: 12,
  discNumber: 1,
  discTotal: 3,
  year: 2026,
  title: 'title value',
  artist: 'Track A feat. Track B',
  artists: ['Track A', 'Track B'],
  albumArtist: 'Album A & Album B',
  albumArtists: ['Album A', 'Album B'],
  album: 'album value',
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
  genres: ['genres A', 'genres B'],
  composers: ['composers A', 'composers B'],
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
  albumSort: 'albumSort value',
  titleSort: 'titleSort value',
  work: 'work value',
  artistSort: 'artistSort value',
  albumArtistSort: 'albumArtistSort value',
  composerSort: 'composerSort value',
  lyricists: ['lyricists A', 'lyricists B'],
  writers: ['writers A', 'writers B'],
  conductors: ['conductors A', 'conductors B'],
  remixers: ['remixers A', 'remixers B'],
  arrangers: ['arrangers A', 'arrangers B'],
  engineers: ['engineers A', 'engineers B'],
  publishers: ['publishers A', 'publishers B'],
  producers: ['producers A', 'producers B'],
  djMixers: ['djMixers A', 'djMixers B'],
  mixers: ['mixers A', 'mixers B'],
  technicians: ['technicians A', 'technicians B'],
  labels: ['labels A', 'labels B'],
  grouping: 'grouping value',
  subtitles: ['Subtitle'],
  description: ['description A', 'description B'],
  longDescription: 'longDescription value',
  discSubtitle: ['discSubtitle A', 'discSubtitle B'],
  compilation: true,
  rating: [
    {
      source: 'listener@example.com',
      rating: 0.5
    }
  ],
  bpm: 12,
  mood: 'mood value',
  media: 'media value',
  catalogNumber: ['catalogNumber A', 'catalogNumber B'],
  tvShow: 'tvShow value',
  tvShowSort: 'tvShowSort value',
  tvSeason: 2,
  tvEpisode: 7,
  tvEpisodeId: 'tvEpisodeId value',
  tvNetwork: 'tvNetwork value',
  podcast: true,
  podcastUrl: 'https://example.org/podcast.xml',
  releaseStatus: 'releaseStatus value',
  releaseType: ['releaseType A', 'releaseType B'],
  releaseCountry: 'releaseCountry value',
  script: 'script value',
  language: 'language value',
  copyright: 'copyright value',
  license: 'license value',
  encodedBy: 'encodedBy value',
  encoderSettings: 'encoderSettings value',
  gapless: true,
  barcode: 'barcode value',
  isrcs: ['isrcs A', 'isrcs B'],
  asin: 'asin value',
  mbRecordingId: 'mbRecordingId value',
  mbReleaseTrackId: 'mbReleaseTrackId value',
  mbReleaseId: 'mbReleaseId value',
  mbArtistId: ['mbArtistId A', 'mbArtistId B'],
  mbAlbumArtistId: ['mbAlbumArtistId A', 'mbAlbumArtistId B'],
  mbReleaseGroupId: 'mbReleaseGroupId value',
  mbWorkId: 'mbWorkId value',
  mbTrmId: 'mbTrmId value',
  mbDiscId: 'mbDiscId value',
  acoustId: 'acoustId value',
  acoustIdFingerprint: 'acoustIdFingerprint value',
  musicIpPuid: 'musicIpPuid value',
  musicIpFingerprint: 'musicIpFingerprint value',
  website: 'website value',
  'performer:instrument': ['Example A', 'Example B'],
  averageLevel: 12,
  peakLevel: 12,
  notes: ['notes A', 'notes B'],
  originalAlbum: 'originalAlbum value',
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
  key: 'key value',
  categories: ['categories A', 'categories B'],
  hdVideo: 12,
  keywords: ['keywords A', 'keywords B'],
  movement: 'movement value',
  movementNumber: 4,
  movementTotal: 5,
  podcastId: 'podcastId value',
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
