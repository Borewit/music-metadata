import { CaseInsensitiveTagMap } from '../common/CaseInsensitiveTagMap.js';
import type { INativeTagMap } from '../common/GenericTagTypes.js';
import type { IPicture, ITag } from '../type.js';

/**
 * APEv2 tag mappings
 */
export const apev2TagMap: INativeTagMap = {
  MUSICBRAINZ_COMPOSERID: 'mbComposerId',
  MUSICBRAINZ_ORIGINALARTISTID: 'mbOriginalArtistId',
  MUSICBRAINZ_ORIGINALALBUMID: 'mbOriginalReleaseId',
  DIRECTOR: 'directors',
  ORIGINALFILENAME: 'originalFilename',
  ITUNES_CDDB_1: 'itunesCddb1',
  REPLAYGAIN_ALBUM_RANGE: 'replayGainAlbumRange',
  REPLAYGAIN_TRACK_RANGE: 'replayGainTrackRange',
  REPLAYGAIN_REFERENCE_LOUDNESS: 'replayGainReferenceLoudness',
  Title: 'title',
  Artist: 'artist',
  Artists: 'artists',
  'Album Artist': 'albumArtist',
  Key: 'key',
  'Original Artist': 'originalArtist',
  Originalalbum: 'originalAlbum',
  MOVEMENTNAME: 'movement',
  MOVEMENT: 'movementNumber',
  MOVEMENTNUMBER: 'movementNumber',
  MOVEMENTTOTAL: 'movementTotal',
  SHOWMOVEMENT: 'showMovement',
  'Album Artists': 'albumArtists',
  ALBUMARTISTS: 'albumArtists',
  Album: 'album',
  Year: 'date',
  Date: 'date',
  Originalyear: 'originalYear',
  Originaldate: 'originalDate',
  Releasedate: 'releaseDate',
  Comment: 'comments',
  Track: 'trackNumber',
  Disc: 'discNumber',
  DISCNUMBER: 'discNumber', // ToDo: backwards compatibility', valid tag?
  Genre: 'genres',
  'Cover Art (Front)': 'picture',
  'Cover Art (Back)': 'picture',
  Composer: 'composers',
  Lyrics: 'lyrics',
  ALBUMSORT: 'albumSort',
  TITLESORT: 'titleSort',
  WORK: 'work',
  ARTISTSORT: 'artistSort',
  ALBUMARTISTSORT: 'albumArtistSort',
  COMPOSERSORT: 'composerSort',
  Lyricist: 'lyricists',
  Writer: 'writers',
  Conductor: 'conductors',
  Performer: 'performer:instrument',
  MixArtist: 'remixers',
  Arranger: 'arrangers',
  Engineer: 'engineers',
  Producer: 'producers',
  DJMixer: 'djMixers',
  Mixer: 'mixers',
  Label: 'labels',
  Grouping: 'grouping',
  Subtitle: 'subtitles',
  DiscSubtitle: 'discSubtitle',
  Compilation: 'compilation',
  BPM: 'bpm',
  Mood: 'mood',
  Media: 'media',
  CatalogNumber: 'catalogNumber',
  MUSICBRAINZ_ALBUMSTATUS: 'releaseStatus',
  MUSICBRAINZ_ALBUMTYPE: 'releaseType',
  RELEASECOUNTRY: 'releaseCountry',
  Script: 'script',
  Language: 'language',
  Copyright: 'copyright',
  LICENSE: 'license',
  EncodedBy: 'encodedBy',
  EncoderSettings: 'encoderSettings',
  Barcode: 'barcode',
  ISRC: 'isrcs',
  ASIN: 'asin',
  musicbrainz_trackid: 'mbRecordingId',
  musicbrainz_releasetrackid: 'mbReleaseTrackId',
  MUSICBRAINZ_ALBUMID: 'mbReleaseId',
  MUSICBRAINZ_ARTISTID: 'mbArtistId',
  MUSICBRAINZ_ALBUMARTISTID: 'mbAlbumArtistId',
  MUSICBRAINZ_RELEASEGROUPID: 'mbReleaseGroupId',
  MUSICBRAINZ_WORKID: 'mbWorkId',
  MUSICBRAINZ_TRMID: 'mbTrmId',
  MUSICBRAINZ_DISCID: 'mbDiscId',
  Acoustid_Id: 'acoustId',
  ACOUSTID_FINGERPRINT: 'acoustIdFingerprint',
  MUSICIP_PUID: 'musicIpPuid',
  Weblink: 'website',
  REPLAYGAIN_TRACK_GAIN: 'replayGainTrackGain',
  REPLAYGAIN_TRACK_PEAK: 'replayGainTrackPeak',
  REPLAYGAIN_ALBUM_GAIN: 'replayGainAlbumGain',
  REPLAYGAIN_ALBUM_PEAK: 'replayGainAlbumPeak',
  MP3GAIN_ALBUM_MINMAX: 'replayGainAlbumMinMax',
  MP3GAIN_MINMAX: 'replayGainTrackMinMax',
  MP3GAIN_UNDO: 'replayGainUndo'
};

export class APEv2TagMapper extends CaseInsensitiveTagMap {
  public constructor() {
    super(['APEv2'], apev2TagMap);
  }

  protected override postMap(tag: ITag): void {
    const key = tag.id.toUpperCase();
    if (
      (key === 'COVER ART (FRONT)' || key === 'COVER ART (BACK)') &&
      typeof tag.value === 'object' &&
      tag.value !== null
    ) {
      (tag.value as IPicture).type = key === 'COVER ART (FRONT)' ? 'Cover (front)' : 'Cover (back)';
    }
  }
}
