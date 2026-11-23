import type { ICommonTagsResult, TagPatch } from '../../lib/index.js';

// Adding a common field upstream makes this fixture fail compilation until a value is tested.
export const fullCommon = {
  track: {
    no: 2,
    of: 12
  },
  disk: {
    no: 2,
    of: 12
  },
  year: 2026,
  title: 'Example',
  artist: 'Example',
  artists: ['Example A', 'Example B'],
  albumartist: 'Example',
  albumartists: ['Example A', 'Example B'],
  album: 'Example',
  date: '2026-01-02',
  originaldate: '2000-01-02',
  originalyear: 2000,
  releasedate: '2026-01-02',
  comment: [
    {
      language: 'eng',
      descriptor: 'Description',
      text: 'Comment'
    }
  ],
  genre: ['Example A', 'Example B'],
  composer: ['Example A', 'Example B'],
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
  albumsort: 'Example',
  titlesort: 'Example',
  work: 'Example',
  artistsort: 'Example',
  albumartistsort: 'Example',
  composersort: 'Example',
  lyricist: ['Example A', 'Example B'],
  writer: ['Example A', 'Example B'],
  conductor: ['Example A', 'Example B'],
  remixer: ['Example A', 'Example B'],
  arranger: ['Example A', 'Example B'],
  engineer: ['Example A', 'Example B'],
  publisher: ['Example A', 'Example B'],
  producer: ['Example A', 'Example B'],
  djmixer: ['DJ One', 'DJ Two'],
  mixer: ['Example A', 'Example B'],
  technician: ['Example A', 'Example B'],
  label: ['Example A', 'Example B'],
  grouping: 'Example',
  subtitle: ['Subtitle'],
  description: ['Example A', 'Example B'],
  longDescription: 'Example',
  discsubtitle: ['Example A', 'Example B'],
  totaltracks: '12',
  totaldiscs: '12',
  movementTotal: 12,
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
  catalognumber: ['Example A', 'Example B'],
  tvShow: 'tvShow value',
  tvShowSort: 'tvShowSort value',
  tvSeason: 2,
  tvEpisode: 7,
  tvEpisodeId: 'tvEpisodeId value',
  tvNetwork: 'tvNetwork value',
  podcast: true,
  podcasturl: 'https://example.org/podcast.xml',
  releasestatus: 'Example',
  releasetype: ['Example A', 'Example B'],
  releasecountry: 'Example',
  script: 'Example',
  language: 'Example',
  copyright: 'Example',
  license: 'Example',
  encodedby: 'Example',
  encodersettings: 'Example',
  gapless: true,
  barcode: 'Example',
  isrc: ['Example A', 'Example B'],
  asin: 'Example',
  musicbrainz_recordingid: 'Example',
  musicbrainz_trackid: 'Example',
  musicbrainz_albumid: 'Example',
  musicbrainz_artistid: ['Example A', 'Example B'],
  musicbrainz_albumartistid: ['Example A', 'Example B'],
  musicbrainz_releasegroupid: 'Example',
  musicbrainz_workid: 'Example',
  musicbrainz_trmid: 'musicbrainz_trmid value',
  musicbrainz_discid: 'Example',
  acoustid_id: 'acoustid_id value',
  acoustid_fingerprint: 'acoustid_fingerprint value',
  musicip_puid: 'musicip_puid value',
  musicip_fingerprint: 'musicip_fingerprint value',
  website: 'Example',
  'performer:instrument': ['Example A', 'Example B'],
  averageLevel: 12,
  peakLevel: 12,
  notes: ['Example A', 'Example B'],
  originalalbum: 'Example',
  originalartist: 'Original Artist',
  discogs_artist_id: [12, 13],
  discogs_release_id: 12,
  discogs_label_id: 12,
  discogs_master_release_id: 12,
  discogs_votes: 12,
  discogs_rating: 12,
  replaygain_track_gain_ratio: 0.5,
  replaygain_track_peak_ratio: 0.5,
  replaygain_track_gain: {
    ratio: 0.5,
    dB: -3.010299956639812
  },
  replaygain_track_peak: {
    ratio: 0.5,
    dB: -3.010299956639812
  },
  replaygain_album_gain: {
    ratio: 0.5,
    dB: -3.010299956639812
  },
  replaygain_album_peak: {
    ratio: 0.5,
    dB: -3.010299956639812
  },
  replaygain_undo: {
    leftChannel: -2,
    rightChannel: 3
  },
  replaygain_track_minmax: [12, 13],
  replaygain_album_minmax: [21, 34],
  key: 'Example',
  category: ['Example A', 'Example B'],
  hdVideo: 12,
  keywords: ['Example A', 'Example B'],
  movement: 'Example',
  movementIndex: {
    no: 2,
    of: 12
  },
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
