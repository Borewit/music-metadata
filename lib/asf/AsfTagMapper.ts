import { CommonTagMapper } from '../common/GenericTagMapper.js';
import type { INativeTagMap } from '../common/GenericTagTypes.js';
import type { IWarningCollector } from '../common/MetadataCollector.js';
import { toRatio } from '../common/Util.js';
import type { IRating, ITag } from '../type.js';

/**
 * ASF Metadata tag mappings.
 * See http://msdn.microsoft.com/en-us/library/ms867702.aspx
 */
export const asfTagMap: INativeTagMap = {
  'MusicBrainz/Composer Id': 'mbComposerId',
  'MusicBrainz/Original Artist Id': 'mbOriginalArtistId',
  'MusicBrainz/Original Album Id': 'mbOriginalReleaseId',
  'WM/Director': 'directors',
  'WM/OriginalFilename': 'originalFilename',
  REPLAYGAIN_ALBUM_RANGE: 'replayGainAlbumRange',
  replaygain_album_range: 'replayGainAlbumRange',
  REPLAYGAIN_TRACK_RANGE: 'replayGainTrackRange',
  replaygain_track_range: 'replayGainTrackRange',
  REPLAYGAIN_REFERENCE_LOUDNESS: 'replayGainReferenceLoudness',
  replaygain_reference_loudness: 'replayGainReferenceLoudness',
  Title: 'title',
  Author: 'artist',
  'WM/AlbumArtist': 'albumArtist',
  'WM/ALBUMARTISTS': 'albumArtists',
  'WM/AlbumArtists': 'albumArtists',
  'WM/AlbumTitle': 'album',
  'WM/Year': 'date', // changed to 'year' to 'date' based on Picard mappings; ToDo: check me
  'WM/OriginalReleaseTime': 'originalDate',
  'WM/OriginalReleaseYear': 'originalYear',
  Description: 'comments',
  'WM/TrackNumber': 'trackNumber',
  TotalTracks: 'trackTotal',
  'WM/PartOfSet': 'discNumber',
  'WM/Genre': 'genres',
  'WM/Composer': 'composers',
  'WM/Lyrics_Synchronised': 'lyrics',
  'WM/Lyrics': 'lyrics',
  'WM/AlbumSortOrder': 'albumSort',
  'WM/TitleSortOrder': 'titleSort',
  'WM/ArtistSortOrder': 'artistSort',
  'WM/AlbumArtistSortOrder': 'albumArtistSort',
  'WM/ComposerSortOrder': 'composerSort',
  'WM/Writer': 'lyricists',
  'WM/Conductor': 'conductors',
  'WM/ModifiedBy': 'remixers',
  'WM/Engineer': 'engineers',
  'WM/Producer': 'producers',
  'WM/DJMixer': 'djMixers',
  'WM/Mixer': 'mixers',
  'WM/Publisher': 'labels',
  'WM/ContentGroupDescription': 'grouping',
  'WM/SubTitle': 'subtitles',
  'WM/SetSubTitle': 'discSubtitle',
  REPLAYGAIN_TRACK_GAIN: 'replayGainTrackGain',
  REPLAYGAIN_TRACK_PEAK: 'replayGainTrackPeak',
  REPLAYGAIN_ALBUM_GAIN: 'replayGainAlbumGain',
  REPLAYGAIN_ALBUM_PEAK: 'replayGainAlbumPeak',
  replaygain_track_gain: 'replayGainTrackGain',
  replaygain_track_peak: 'replayGainTrackPeak',
  replaygain_album_gain: 'replayGainAlbumGain',
  replaygain_album_peak: 'replayGainAlbumPeak',
  'WM/IsCompilation': 'compilation',
  'WM/SharedUserRating': 'rating',
  POPULARIMETER: 'rating',
  'WM/BeatsPerMinute': 'bpm',
  'WM/Mood': 'mood',
  'WM/Media': 'media',
  'WM/CatalogNo': 'catalogNumber',
  'MusicBrainz/Album Status': 'releaseStatus',
  'MusicBrainz/Album Type': 'releaseType',
  'MusicBrainz/Album Release Country': 'releaseCountry',
  'WM/Script': 'script',
  'WM/Language': 'language',
  Copyright: 'copyright',
  LICENSE: 'license',
  'WM/EncodedBy': 'encodedBy',
  'WM/EncodingSettings': 'encoderSettings',
  'WM/Barcode': 'barcode',
  'WM/ISRC': 'isrcs',
  'MusicBrainz/Track Id': 'mbRecordingId',
  'MusicBrainz/Release Track Id': 'mbReleaseTrackId',
  'MusicBrainz/Album Id': 'mbReleaseId',
  'MusicBrainz/Artist Id': 'mbArtistId',
  'MusicBrainz/Album Artist Id': 'mbAlbumArtistId',
  'MusicBrainz/Release Group Id': 'mbReleaseGroupId',
  'MusicBrainz/Work Id': 'mbWorkId',
  'MusicBrainz/TRM Id': 'mbTrmId',
  'MusicBrainz/Disc Id': 'mbDiscId',
  'Acoustid/Id': 'acoustId',
  'Acoustid/Fingerprint': 'acoustIdFingerprint',
  'MusicIP/PUID': 'musicIpPuid',
  'WM/ARTISTS': 'artists',
  ARTISTS: 'artists',

  'WM/InitialKey': 'key',
  ASIN: 'asin',
  'WM/Work': 'work',
  'WM/AuthorURL': 'website',

  'WM/Picture': 'picture'
};

export class AsfTagMapper extends CommonTagMapper {
  public static toRating(rating: string | number): IRating {
    const value = typeof rating === 'number' ? rating : Number.parseFloat(rating);
    if (!Number.isFinite(value) || value <= 0) {
      return { rating: undefined };
    }
    return { rating: value / 99 };
  }

  public constructor() {
    super(['asf'], asfTagMap);
  }

  protected postMap(tag: ITag, warnings: IWarningCollector): void {
    if (/^replayGain(Track|Album)(Gain|Peak)$/.test(this.getCommonName(tag.id) ?? '')) {
      const value =
        typeof tag.value === 'string'
          ? tag.value.trim().match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s*(dB)?$/i)
          : null;
      const normalized = value ? `${value[1]}${value[2] ? ' dB' : ''}` : undefined;
      const ratio = normalized ? toRatio(normalized) : undefined;
      // A silent peak of zero is valid (its dB value is -Infinity).
      if (!ratio || !Number.isFinite(ratio.ratio) || Number.isNaN(ratio.dB)) {
        warnings.addWarning(`Invalid ASF ReplayGain value for ${tag.id}`);
        tag.id = ''; // Keep invalid values native without mapping them to common metadata.
      } else {
        tag.value = normalized;
      }
    }

    // Picard writes synchronized lyrics as text. Binary ASF lyric payloads
    // need their own decoder and must not be treated as an ILyricsTag object.
    if (tag.id === 'WM/Lyrics_Synchronised' && typeof tag.value !== 'string') {
      warnings.addWarning('Unsupported binary ASF synchronized lyrics');
      tag.id = '';
    }
    switch (tag.id) {
      case 'POPULARIMETER': {
        // popm-style attribute, written by e.g. foobar2000; value is "email|rating|counter"
        const [email, rating] = (tag.value as string).split('|', 2);
        const value = Number(rating);
        const valid = /^\d+$/.test(rating) && Number.isInteger(value) && value >= 0 && value <= 255;
        if (!valid) {
          warnings.addWarning(`Invalid ASF POPULARIMETER rating: ${rating}`);
        }
        tag.value = {
          source: email,
          rating: valid && value > 0 ? ((value - 1) / 254) * CommonTagMapper.maxRatingScore : undefined
        };
        break;
      }
      case 'WM/SharedUserRating': {
        const keys = tag.id.split(':', 2);
        tag.value = AsfTagMapper.toRating(tag.value as string | number);
        tag.id = keys[0];
        break;
      }
    }
  }
}
