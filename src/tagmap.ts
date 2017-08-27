import {AsfTagMap} from "./asf/AsfTagMap";
import {ID3v1TagMap} from "./id3v1/ID3v1TagMap";
import {ID3v22TagMap} from "./id3v2/ID3v22TagMap";
import {ID3v24TagMap} from "./id3v2/ID3v24TagMap";
import {MP4TagMap} from "./mp4/MP4TagMap";
import {VorbisTagMap} from "./vorbis/VorbisTagMap";
import {APEv2TagMap} from "./apev2/APEv2TagMap";
import {RiffInfoTagMap} from "./riff/RiffInfoTagMap";
export type TagType = 'vorbis' | 'ID3v1.1' | 'ID3v2.2' | 'ID3v2.3' | 'ID3v2.4' | 'APEv2' | 'asf' | 'iTunes MP4';

export type CommonTag = 'track' | 'disk' | 'year' | 'title' | 'artist' | 'artists' | 'albumartist' | 'album' | 'date' | 'originaldate' |
  'originalyear' | 'comment' | 'genre' | 'picture' | 'composer' | 'lyrics' | 'albumsort' | 'titlesort' | 'work' |
  'artistsort' | 'albumartistsort' | 'composersort' | 'lyricist' | 'writer' | 'conductor' | 'remixer' |
  'arranger' | 'engineer' | 'producer' | 'djmixer' | 'mixer' | 'label' | 'grouping' | 'subtitle' |
  'discsubtitle' | 'totaltracks' | 'totaldiscs' | 'compilation' | '_rating' | 'bpm' |
  'mood' | 'media' | 'catalognumber' | 'show' | 'showsort' | 'podcast' | 'podcasturl' |
  'releasestatus' | 'releasetype' | 'releasecountry' | 'script' | 'language' |
  'copyright' | 'license' | 'encodedby' | 'encodersettings' | 'gapless' | 'barcode' |
  'isrc' | 'asin' | 'musicbrainz_recordingid' | 'musicbrainz_trackid' | 'musicbrainz_albumid' |
  'musicbrainz_artistid' | 'musicbrainz_albumartistid' | 'musicbrainz_releasegroupid' |
  'musicbrainz_workid' | 'musicbrainz_trmid' | 'musicbrainz_discid' | 'acoustid_id' |
  'acoustid_fingerprint' | 'musicip_puid' | 'musicip_fingerprint' | 'website' | 'performer:instrument' |
  'peakLevel' | 'averageLevel' | 'notes' | 'key' | 'originalalbum' | 'originalartist';

export const TagPriority = ['APEv2', 'vorbis', 'ID3v2.4', 'ID3v2.3', 'ID3v2.2', 'asf', 'iTunes MP4', 'ID3v1.1'];

export interface INativeTagMap {
  [index: string]: CommonTag;
}

export interface ITagInfo {
  multiple: boolean;
}

export interface ITagInfoMap {
  [index: string]: ITagInfo;
}

interface INativeTagMappings {
  asf: INativeTagMap,
  APEv2: INativeTagMap,
  'ID3v1.1': INativeTagMap,
  'ID3v2.2': INativeTagMap,
  'ID3v2.3': INativeTagMap,
  'ID3v2.4': INativeTagMap,
  'iTunes MP4': INativeTagMap,
  vorbis: INativeTagMap,
  exif: INativeTagMap
}

/**
 * tagmap maps native meta tags to generic common types
 */
export default class TagMap {

  public static getCommonTag(tag: CommonTag): ITagInfo {
    return TagMap.commonTags[tag];
  }

  public static isCommonTag(tag: string): boolean {
    return TagMap.commonTags[tag] !== undefined;
  }

  /**
   * @param alias Name of common tag
   * @returns {boolean|*} true if given alias is mapped as a singleton', otherwise false
   */
  public static isSingleton(alias: CommonTag): boolean {
    return TagMap.commonTags.hasOwnProperty(alias) && !TagMap.commonTags[alias].multiple;
  }

  private static commonTags: ITagInfoMap =
  {
    year: {multiple: false},
    track: {multiple: false},
    disk: {multiple: false},

    title: {multiple: false},
    artist: {multiple: false},
    artists: {multiple: true},
    albumartist: {multiple: false},
    album: {multiple: false},
    date: {multiple: false},
    originaldate: {multiple: false},
    originalyear: {multiple: false},
    comment: {multiple: true},
    genre: {multiple: true},
    picture: {multiple: true},
    composer: {multiple: true},
    lyrics: {multiple: true},
    albumsort: {multiple: false},
    titlesort: {multiple: false},
    work: {multiple: false},
    artistsort: {multiple: false},
    albumartistsort: {multiple: false},
    composersort: {multiple: true},
    lyricist: {multiple: true},
    writer: {multiple: true},
    conductor: {multiple: true},
    remixer: {multiple: true},
    arranger: {multiple: true},
    engineer: {multiple: true},
    producer: {multiple: true},
    djmixer: {multiple: true},
    mixer: {multiple: true},
    label: {multiple: false},
    grouping: {multiple: false},
    subtitle: {multiple: false},
    discsubtitle: {multiple: false},
    totaltracks: {multiple: false},
    totaldiscs: {multiple: false},
    compilation: {multiple: false},
    _rating: {multiple: false},
    bpm: {multiple: false},
    mood: {multiple: false},
    media: {multiple: false},
    catalognumber: {multiple: false},
    show: {multiple: false},
    showsort: {multiple: false},
    podcast: {multiple: false},
    podcasturl: {multiple: false},
    releasestatus: {multiple: false},
    releasetype: {multiple: true},
    releasecountry: {multiple: false},
    script: {multiple: false},
    language: {multiple: false},
    copyright: {multiple: false},
    license: {multiple: false},
    encodedby: {multiple: false},
    encodersettings: {multiple: false},
    gapless: {multiple: false},
    barcode: {multiple: false},
    isrc: {multiple: false},
    asin: {multiple: false},
    musicbrainz_recordingid: {multiple: false},
    musicbrainz_trackid: {multiple: false},
    musicbrainz_albumid: {multiple: false},
    musicbrainz_artistid: {multiple: true},
    musicbrainz_albumartistid: {multiple: true},
    musicbrainz_releasegroupid: {multiple: false},
    musicbrainz_workid: {multiple: false},
    musicbrainz_trmid: {multiple: false},
    musicbrainz_discid: {multiple: false},
    acoustid_id: {multiple: false},
    acoustid_fingerprint: {multiple: false},
    musicip_puid: {multiple: false},
    musicip_fingerprint: {multiple: false},
    website: {multiple: false},
    'performer:instrument': {multiple: true},
    averageLevel: {multiple: false},
    peakLevel: {multiple: false},
    notes: {multiple: true},

    key: {multiple: false},
    originalalbum: {multiple: false},
    originalartist: {multiple: false}

  };

  private static capitalizeTags(map: INativeTagMap): INativeTagMap {
    const newMap: INativeTagMap = {};
    for (const tag in map) {
      if (map.hasOwnProperty(tag)) {
        newMap[tag.toUpperCase()] = map[tag];
      }
    }
    return newMap;
  }

  private mappings: INativeTagMappings;

  constructor() {
    // Normalize (post-process) common tag mappings
    this.mappings = {
      asf: AsfTagMap,
      APEv2: TagMap.capitalizeTags(APEv2TagMap), // capitalize 'APEv2' tags for case insensitive tag matching
      'ID3v1.1': ID3v1TagMap,
      'ID3v2.2': ID3v22TagMap,
      'ID3v2.3': ID3v24TagMap,
      'ID3v2.4': ID3v24TagMap,
      'iTunes MP4': MP4TagMap,
      exif: RiffInfoTagMap,
      vorbis: VorbisTagMap
    };
  }

  /**
   * Test if native tag tagTypes is a singleton
   * @param type e.g.: 'iTunes MP4' | 'asf' | 'ID3v1.1' | 'ID3v2.4' | 'vorbis'
   * @param  tag Native tag name', e.g. 'TITLE'
   * @returns {boolean} true is we can safely assume that it is a  singleton
   */
  public isNativeSingleton(type, tag): boolean {
    switch (type) {
      case 'format':
        return true;
      case 'ID3v2.3':
        switch (tag) {
          case 'IPLS':
            return true;
        }
      case 'ID3v2.4':
        switch (tag) {
          case 'TIPL':
          case 'TMCL':
            return true;
        }
    }
    const alias = this.getCommonName(type, tag);
    return alias && !TagMap.commonTags[alias].multiple;
  }

  /**
   * @tagTypes Native header tagTypes: e.g.: 'm4a' | 'asf' | 'ID3v1.1' | 'vorbis'
   * @tag  Native header tag
   * @return common tag name (alias)
   */
  public getCommonName(type: TagType, tag: string): CommonTag {
    if (!this.mappings[type]) {
      throw new Error('Illegal TagType: ' + type);
    }
    return this.mappings[type][type === 'APEv2' ? tag.toUpperCase() : tag];
  }
}
