import { CaseInsensitiveTagMap } from '../common/CaseInsensitiveTagMap.js';
import type { INativeTagMap } from '../common/GenericTagTypes.js';
import type { IWarningCollector } from '../common/MetadataCollector.js';
import type { ITag } from '../type.js';

/**
 * EBML Tag map
 */
const ebmlTagMap: INativeTagMap = {
  'segment:title': 'title',
  'album:ARTIST': 'albumartist',
  'album:ARTISTSORT': 'albumartistsort',
  'album:TITLE': 'album',
  'album:DATE_RECORDED': 'originaldate',
  'album:DATE_RELEASED': 'releasedate',
  'album:PART_NUMBER': 'disk',
  'album:TOTAL_PARTS': 'totaltracks',
  // Flat names written by ffmpeg, and tools built on it such as yt-dlp
  'track:ALBUM': 'album',
  'track:ALBUM_ARTIST': 'albumartist',
  'track:COMPOSER': 'composer',
  'track:DATE': 'date',
  'track:DISC': 'disk',
  'track:ARTIST': 'artist',
  'track:ARTISTSORT': 'artistsort',
  'track:TITLE': 'title',
  'track:PART_NUMBER': 'track',
  'track:MUSICBRAINZ_TRACKID': 'musicbrainz_recordingid',
  'track:MUSICBRAINZ_ALBUMID': 'musicbrainz_albumid',
  'track:MUSICBRAINZ_ARTISTID': 'musicbrainz_artistid',
  'track:PUBLISHER': 'label',
  'track:GENRE': 'genre',
  'track:ENCODER': 'encodedby',
  'track:ENCODER_OPTIONS': 'encodersettings',
  'edition:TOTAL_PARTS': 'totaldiscs',
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
