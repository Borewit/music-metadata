import { CaseInsensitiveTagMap } from '../common/CaseInsensitiveTagMap.js';
import type { INativeTagMap } from '../common/GenericTagTypes.js';
import type { IWarningCollector } from '../common/MetadataCollector.js';
import type { ITag } from '../type.js';

/**
 * EBML Tag map
 */
const ebmlTagMap: INativeTagMap = {
  'segment:title': 'title',
  'album:ARTIST': 'albumArtist',
  'album:ARTISTSORT': 'albumArtistSort',
  'album:TITLE': 'album',
  'album:DATE_RECORDED': 'originalDate',
  'album:DATE_RELEASED': 'releaseDate',
  'album:PART_NUMBER': 'discNumber',
  'album:TOTAL_PARTS': 'trackTotal',
  // Flat names written by ffmpeg, and tools built on it such as yt-dlp
  'track:ALBUM': 'album',
  'track:ALBUM_ARTIST': 'albumArtist',
  'track:COMPOSER': 'composers',
  'track:DATE': 'date',
  'track:DISC': 'discNumber',
  'track:ARTIST': 'artist',
  'track:ARTISTSORT': 'artistSort',
  'track:TITLE': 'title',
  'track:PART_NUMBER': 'trackNumber',
  'track:MUSICBRAINZ_TRACKID': 'mbRecordingId',
  'track:MUSICBRAINZ_ALBUMID': 'mbReleaseId',
  'track:MUSICBRAINZ_ARTISTID': 'mbArtistId',
  'track:PUBLISHER': 'labels',
  'track:GENRE': 'genres',
  'track:ENCODER': 'encodedBy',
  'track:ENCODER_OPTIONS': 'encoderSettings',
  'edition:TOTAL_PARTS': 'discTotal',
  picture: 'picture'
};

export class MatroskaTagMapper extends CaseInsensitiveTagMap {
  public constructor() {
    super(['matroska'], ebmlTagMap);
  }

  public override mapGenericTag(tag: ITag, warnings: IWarningCollector) {
    if (tag.id.toUpperCase() === 'TRACK:DATE' && typeof tag.value !== 'string') {
      return null;
    }
    return super.mapGenericTag(tag, warnings);
  }
}
