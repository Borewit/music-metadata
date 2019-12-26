import {INativeTagMap} from '../common/GenericTagTypes';
import { CaseInsensitiveTagMap } from '../common/CaseInsensitiveTagMap';

/**
 * EBML Tag map
 */
const ebmlTagMap: INativeTagMap = {
  'album:ARITST': 'albumartist',
  'album:ARITSTSORT': 'albumartistsort',
  'album:TITLE': 'album',
  'album:DATE_RECORDED': 'originaldate',
  'track:ARTIST': 'artist',
  'track:ARTISTSORT' : 'artistsort',
  'track:TITLE': 'title',
  'track:PART_NUMBER': 'track',
  'track:MUSICBRAINZ_TRACKID': 'musicbrainz_recordingid',
  'track:MUSICBRAINZ_ALBUMID': 'musicbrainz_albumid',
  'track:MUSICBRAINZ_ARTISTID': 'musicbrainz_artistid',
  'track:PUBLISHER': 'label'
};

export class MatroskaTagMapper extends CaseInsensitiveTagMap {

  public constructor() {
    super(['matroska'], ebmlTagMap);
  }

}
