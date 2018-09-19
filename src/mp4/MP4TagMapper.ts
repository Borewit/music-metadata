import {INativeTagMap} from '../common/GenericTagTypes';
import {CommonTagMapper} from '../common/GenericTagMapper';

/**
 * Ref: https://github.com/sergiomb2/libmp4v2/wiki/iTunesMetadata
 */
const mp4TagMap: INativeTagMap = {
  '©nam': 'title',
  '©ART': 'artist',
  aART: 'albumartist',
  /**
   * ToDo: Album artist seems to be stored here while Picard documentation says: aART
   */
  '----:com.apple.iTunes:Band': 'albumartist',
  '©alb': 'album',
  '©day': 'date',
  '©cmt': 'comment',
  trkn: 'track',
  disk: 'disk',
  '©gen': 'genre',
  covr: 'picture',
  '©wrt': 'composer',
  '©lyr': 'lyrics',
  soal: 'albumsort',
  sonm: 'titlesort',
  soar: 'artistsort',
  soaa: 'albumartistsort',
  soco: 'composersort',
  '----:com.apple.iTunes:LYRICIST': 'lyricist',
  '----:com.apple.iTunes:CONDUCTOR': 'conductor',
  '----:com.apple.iTunes:REMIXER': 'remixer',
  '----:com.apple.iTunes:ENGINEER': 'engineer',
  '----:com.apple.iTunes:PRODUCER': 'producer',
  '----:com.apple.iTunes:DJMIXER': 'djmixer',
  '----:com.apple.iTunes:MIXER': 'mixer',
  '----:com.apple.iTunes:LABEL': 'label',
  '©grp': 'grouping',
  '----:com.apple.iTunes:SUBTITLE': 'subtitle',
  '----:com.apple.iTunes:DISCSUBTITLE': 'discsubtitle',
  cpil: 'compilation',
  tmpo: 'bpm',
  '----:com.apple.iTunes:MOOD': 'mood',
  '----:com.apple.iTunes:MEDIA': 'media',
  '----:com.apple.iTunes:CATALOGNUMBER': 'catalognumber',
  tvsh: 'tvShow',
  tvsn: 'tvSeason',
  tves: 'tvEpisode',
  sosn: 'tvShowSort',
  tven: 'tvEpisodeId',
  tvnn: 'tvNetwork',
  pcst: 'podcast',
  purl: 'podcasturl',
  '----:com.apple.iTunes:MusicBrainz Album Status': 'releasestatus',
  '----:com.apple.iTunes:MusicBrainz Album Type': 'releasetype',
  '----:com.apple.iTunes:MusicBrainz Album Release Country': 'releasecountry',
  '----:com.apple.iTunes:SCRIPT': 'script',
  '----:com.apple.iTunes:LANGUAGE': 'language',
  cprt: 'copyright',
  '----:com.apple.iTunes:LICENSE': 'license',
  '©too': 'encodedby',
  pgap: 'gapless',
  '----:com.apple.iTunes:BARCODE': 'barcode',
  '----:com.apple.iTunes:ISRC': 'isrc',
  '----:com.apple.iTunes:ASIN': 'asin',
  '----:com.apple.iTunes:NOTES': 'comment',
  '----:com.apple.iTunes:MusicBrainz Track Id': 'musicbrainz_recordingid',
  '----:com.apple.iTunes:MusicBrainz Release Track Id': 'musicbrainz_trackid',
  '----:com.apple.iTunes:MusicBrainz Album Id': 'musicbrainz_albumid',
  '----:com.apple.iTunes:MusicBrainz Artist Id': 'musicbrainz_artistid',
  '----:com.apple.iTunes:MusicBrainz Album Artist Id': 'musicbrainz_albumartistid',
  '----:com.apple.iTunes:MusicBrainz Release Group Id': 'musicbrainz_releasegroupid',
  '----:com.apple.iTunes:MusicBrainz Work Id': 'musicbrainz_workid',
  '----:com.apple.iTunes:MusicBrainz TRM Id': 'musicbrainz_trmid',
  '----:com.apple.iTunes:MusicBrainz Disc Id': 'musicbrainz_discid',
  '----:com.apple.iTunes:Acoustid Id': 'acoustid_id',
  '----:com.apple.iTunes:Acoustid Fingerprint': 'acoustid_fingerprint',
  '----:com.apple.iTunes:MusicIP PUID': 'musicip_puid',
  '----:com.apple.iTunes:fingerprint': 'musicip_fingerprint',
  // Additional mappings:
  gnre: 'genre', // ToDo: check mapping

  '----:com.apple.iTunes:ALBUMARTISTSORT': 'albumartistsort',
  '----:com.apple.iTunes:ARTISTS': 'artists',
  '----:com.apple.iTunes:ORIGINALDATE': 'originaldate',
  '----:com.apple.iTunes:ORIGINALYEAR': 'originalyear',
  // '----:com.apple.iTunes:PERFORMER': 'performer'
  desc: 'description',
  ldes: 'description'
};

export const tagType = 'iTunes';

export class MP4TagMapper extends CommonTagMapper {

  public constructor() {
    super([tagType],  mp4TagMap);
  }

}
