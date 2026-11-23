import initDebug from 'debug';
import { normalizeLyricsTag, parseLyrics } from '../lrc/LyricsParser.js';
import {
  type AnyTagValue,
  type IAudioMetadata,
  type IComment,
  type ICommonTagsResult,
  type IFormat,
  type INativeTags,
  type IOptions,
  type IPicture,
  type IQualityInformation,
  type ITrackInfo,
  type ITypedNativeTags,
  TrackTypeValueToKeyMap
} from '../type.js';
import { getMaxMetadataEntries } from './Allocation.js';
import { CombinedTagMapper } from './CombinedTagMapper.js';
import { CommonTagMapper } from './GenericTagMapper.js';
import { type IGenericTag, isSingleton, isUnique, type TagType } from './GenericTagTypes.js';
import { detectImageType } from './MediaFileType.js';
import { normalizeBitrate } from './TrackInfo.js';
import { toNativeTyped, toRatio } from './Util.js';
import { VorbisMovement } from './VorbisMovement.js';

const debug = initDebug('music-metadata:collector');

type SingularArtistId = 'artist' | 'albumArtist';
type PluralArtistId = 'artists' | 'albumArtists';

const TagPriority: TagType[] = [
  'matroska',
  'APEv2',
  'vorbis',
  'ID3v2.4',
  'ID3v2.3',
  'ID3v2.2',
  'exif',
  'asf',
  'iTunes',
  'AIFF',
  'CAF',
  'ID3v1'
];

/**
 * Combines all generic-tag-mappers for each tag type
 */

export interface IWarningCollector {
  /**
   * Register parser warning
   * @param warning
   */
  addWarning(warning: string): void;
}

export interface INativeMetadataCollector extends IWarningCollector {
  /**
   * Only use this for reading
   */
  readonly format: IFormat;

  readonly common: ICommonTagsResult;

  readonly native: INativeTags;

  readonly quality: IQualityInformation;

  /**
   * @returns {boolean} true if one or more tags have been found
   */
  hasAny(): boolean;

  setFormat<K extends keyof IFormat>(key: K, value: IFormat[K]): void;

  registerTagType(tagType: TagType): void;

  addTag(tagType: TagType, tagId: string, value: AnyTagValue): Promise<void>;

  /** Map a derived common value without adding a synthetic native tag. */
  postMap(tagType: TagType, tag: IGenericTag): Promise<void>;

  addStreamInfo(streamInfo: ITrackInfo): void;

  setAudioOnly(): void;
}

/**
 * Provided to the parser to update the metadata result.
 * Responsible for notifying observers synchronously after updates.
 */
export class MetadataCollector implements INativeMetadataCollector {
  public readonly format: IFormat = {
    tagTypes: [],
    trackInfo: []
  };

  public readonly native: INativeTags = {};

  private readonly vorbisMovement = new VorbisMovement();

  public get nativeTyped(): ITypedNativeTags {
    return toNativeTyped(this.native);
  }

  public readonly common: ICommonTagsResult = {};

  public readonly quality: IQualityInformation = {
    warnings: []
  };

  /**
   * Keeps track of origin priority for each mapped id
   */
  private readonly commonOrigin: {
    [id: string]: number;
  } = {};

  /**
   * Maps a tag type to a priority
   */
  private readonly originPriority: {
    [tagType: string]: number;
  } = {};

  private tagMapper = new CombinedTagMapper();

  private opts?: IOptions;

  public constructor(opts?: IOptions) {
    this.opts = opts;
    let priority = 1;
    for (const tagType of TagPriority) {
      this.originPriority[tagType] = priority++;
    }
    this.originPriority.artificial = 500; // Filled using alternative tags
    this.originPriority.id3v1 = 600; // Consider as the worst because of the field length limit
  }

  /**
   * @returns {boolean} true if one or more tags have been found
   */
  public hasAny() {
    return Object.keys(this.native).length > 0;
  }

  public addStreamInfo(streamInfo: ITrackInfo) {
    debug(
      `streamInfo: type=${streamInfo.type ? TrackTypeValueToKeyMap[streamInfo.type] : '?'}, codec=${streamInfo.codecName}`
    );
    if (normalizeBitrate(streamInfo.bitrate) === undefined) {
      delete streamInfo.bitrate;
    }
    this.format.trackInfo.push(streamInfo);
  }

  public setFormat<K extends keyof IFormat>(key: K, value: IFormat[K]): void {
    // Objects may have been mutated in place, so only skip unchanged primitives.
    if ((value === null || typeof value !== 'object') && Object.is(this.format[key], value)) {
      return;
    }
    debug(`format: ${key} = ${value}`);
    // Allow internal writes while preserving each property's value type.
    (this.format as { -readonly [P in keyof IFormat]: IFormat[P] })[key] = value;

    if (this.opts?.observer) {
      this.opts.observer({ metadata: this, tag: { type: 'format', id: key, value } });
    }
  }

  public setAudioOnly() {
    this.setFormat('hasAudio', true);
    this.setFormat('hasVideo', false);
  }

  public registerTagType(tagType: TagType): void {
    if (!this.format.tagTypes.includes(tagType)) {
      this.format.tagTypes.push(tagType);
    }
  }

  public async addTag(tagType: TagType, tagId: string, value: AnyTagValue): Promise<void> {
    debug('tag %s.%s = %o', tagType, tagId, value);
    if (!this.native[tagType]) {
      this.registerTagType(tagType);
      this.native[tagType] = [];
    }
    this.native[tagType].push({ id: tagId, value });

    await this.toCommon(tagType, tagId, value);
  }

  public addWarning(warning: string) {
    this.quality.warnings.push({ message: warning });
  }

  public async postMap(tagType: TagType | 'artificial', tag: IGenericTag): Promise<void> {
    // Common tag (alias) found

    // check if we need to do something special with common tag
    // if the event has been aliased then we need to clean it before
    // it is emitted to the user. e.g. genre (20) -> Electronic
    switch (tag.id) {
      case 'artist':
        return this.handleSingularArtistTag(tagType, tag, 'artist', 'artists');

      case 'albumArtist':
        return this.handleSingularArtistTag(tagType, tag, 'albumArtist', 'albumArtists');

      case 'artists':
        return this.handlePluralArtistTag(tagType, tag, 'artist', 'artists');

      case 'albumArtists':
        return this.handlePluralArtistTag(tagType, tag, 'albumArtist', 'albumArtists');

      case 'picture':
        return this.postFixPicture(tag.value as IPicture).then(picture => {
          if (picture !== null) {
            tag.value = picture;
            this.setGenericTag(tagType, tag);
          }
        });

      case 'trackTotal':
      case 'discTotal':
      case 'movementTotal': {
        const total = CommonTagMapper.toIntOrNull(tag.value as string);
        if (total !== null) {
          this.setGenericTag(tagType, { id: tag.id, value: total });
        }
        return;
      }

      case 'trackNumber':
      case 'discNumber':
      case 'movementNumber': {
        const pair = CommonTagMapper.normalizeTrack(tag.value as string);
        if (pair.no !== null) {
          this.setGenericTag(tagType, { id: tag.id, value: pair.no });
        }
        const totalId =
          tag.id === 'trackNumber' ? 'trackTotal' : tag.id === 'discNumber' ? 'discTotal' : 'movementTotal';
        if (
          pair.of !== null &&
          (this.common[totalId] === undefined || this.originPriority[tagType] < this.commonOrigin[totalId])
        ) {
          this.setGenericTag(tagType, { id: totalId, value: pair.of });
        }
        return;
      }

      case 'bpm':
      case 'year':
      case 'originalYear':
        tag.value = Number.parseInt(tag.value as string, 10);
        break;

      case 'date': {
        // ToDo: be more strict on 'YYYY...'
        const year = Number.parseInt((tag.value as string).substr(0, 4), 10);
        if (!Number.isNaN(year)) {
          this.common.year = year;
        }
        break;
      }

      case 'tvSeason':
      case 'tvEpisode':
      case 'hdVideo':
      case 'stik':
      case 'playCounter':
      case 'discogsLabelId':
      case 'discogsReleaseId':
      case 'discogsMasterReleaseId':
      case 'discogsArtistId':
      case 'discogsVotes':
        tag.value = typeof tag.value === 'string' ? Number.parseInt(tag.value, 10) : tag.value;
        break;

      case 'averageLevel':
      case 'peakLevel': {
        const value = typeof tag.value === 'string' && tag.value.trim() ? Number(tag.value) : tag.value;
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          return;
        }
        tag.value = value;
        break;
      }

      case 'discogsRating':
        tag.value = typeof tag.value === 'string' ? Number.parseFloat(tag.value) : tag.value;
        break;

      case 'replayGainTrackGain':
      case 'replayGainTrackPeak':
      case 'replayGainAlbumGain':
      case 'replayGainAlbumPeak': {
        const ratio = toRatio(tag.value as string);
        if (!ratio) {
          this.addWarning(`Invalid ReplayGain value for ${tagType}.${tag.id}`);
          return;
        }
        tag.value = ratio;
        break;
      }

      case 'replayGainAlbumRange':
      case 'replayGainTrackRange':
      case 'replayGainReferenceLoudness': {
        const unit = tag.id === 'replayGainReferenceLoudness' ? 'dB' : '(?:dB|LU)';
        const match =
          typeof tag.value === 'string'
            ? tag.value
                .trim()
                .match(new RegExp(`^([+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:e[+-]?\\d+)?)\\s*(?:${unit})?$`, 'i'))
            : null;
        const value = typeof tag.value === 'number' ? tag.value : match ? Number(match[1]) : Number.NaN;
        if (!Number.isFinite(value) || (tag.id !== 'replayGainReferenceLoudness' && value < 0)) {
          this.addWarning(`Invalid ReplayGain value for ${tagType}.${tag.id}`);
          return;
        }
        tag.value = value;
        break;
      }

      case 'replayGainAlbumMinMax':
      case 'replayGainTrackMinMax':
        tag.value = (tag.value as string).split(',', 2).map(v => Number.parseInt(v, 10));
        break;

      case 'replayGainUndo': {
        const minMix = (tag.value as string).split(',', 2).map(v => Number.parseInt(v, 10));
        tag.value = {
          leftChannel: minMix[0],
          rightChannel: minMix[1]
        };
        break;
      }

      case 'gapless': // iTunes gap-less flag
      case 'compilation':
      case 'podcast':
      case 'showMovement':
        tag.value = tag.value === '1' || tag.value === 1 || tag.value === true; // boolean
        break;

      case 'isrcs': {
        // Only keep unique values
        const commonTag = this.common[tag.id];
        if (commonTag && commonTag.indexOf(tag.value as string) !== -1) {
          return;
        }
        break;
      }

      case 'comments':
        if (typeof tag.value === 'string') {
          tag.value = { text: tag.value };
        }
        if ((tag.value as IComment).descriptor === 'iTunes_CDDB_1') {
          this.setGenericTag(tagType, { id: 'itunesCddb1', value: (tag.value as IComment).text ?? '' });
        }
        if ((tag.value as IComment).descriptor === 'iTunPGAP') {
          this.setGenericTag(tagType, { id: 'gapless', value: (tag.value as IComment).text === '1' });
        }
        break;

      case 'lyrics':
        if (typeof tag.value === 'string') {
          tag.value = parseLyrics(tag.value, getMaxMetadataEntries(this.opts ?? {}));
        } else if (tag.value && typeof tag.value === 'object' && !Array.isArray(tag.value)) {
          tag.value = normalizeLyricsTag(tag.value as IComment);
        }
        break;

      default:
      // nothing to do
    }

    if (tag.value !== null) {
      this.setGenericTag(tagType, tag);
    }
  }

  /**
   * Convert native tags to common tags
   * @returns {IAudioMetadata} Native + common tags
   */
  public toCommonMetadata(): IAudioMetadata {
    return {
      format: this.format,
      native: this.native,
      get nativeTyped() {
        return toNativeTyped(this.native);
      },
      quality: this.quality,
      common: this.common
    };
  }

  /**
   * Handle singular artist tags (artist, albumartist) and cross-populate to plural form
   */
  private handleSingularArtistTag(
    tagType: TagType | 'artificial',
    tag: IGenericTag,
    singularId: SingularArtistId,
    pluralId: PluralArtistId
  ): Promise<void> | void {
    if (this.commonOrigin[singularId] === this.originPriority[tagType]) {
      // Assume the singular field is used as plural (multiple values from same source)
      return this.postMap('artificial', { id: pluralId, value: tag.value });
    }

    if (!this.common[pluralId]) {
      // Fill plural using singular source
      this.setGenericTag('artificial', { id: pluralId, value: tag.value });
    }

    this.setGenericTag(tagType, tag);
  }

  /**
   * Handle plural artist tags (artists, albumartists) and cross-populate to singular form
   */
  private handlePluralArtistTag(
    tagType: TagType | 'artificial',
    tag: IGenericTag,
    singularId: SingularArtistId,
    pluralId: PluralArtistId
  ): void {
    if (!this.common[singularId] || this.commonOrigin[singularId] === this.originPriority.artificial) {
      if (!this.common[pluralId] || this.common[pluralId].indexOf(tag.value as string) === -1) {
        // Fill singular using plural source
        const values = (this.common[pluralId] || []).concat([tag.value as string]);
        const value = joinArtists(values);
        this.setGenericTag('artificial', { id: singularId, value });
      }
    }

    this.setGenericTag(tagType, tag);
  }

  /**
   * Fix some common issues with picture object
   * @param picture Picture
   */
  private async postFixPicture(picture: IPicture): Promise<IPicture | null> {
    if (picture.data && picture.data.length > 0) {
      if (!picture.format) {
        const mimeType = detectImageType(picture.data);
        if (mimeType) {
          picture.format = mimeType;
        } else {
          return null;
        }
      }
      picture.format = picture.format.toLocaleLowerCase();
      switch (picture.format) {
        case 'image/jpg':
          picture.format = 'image/jpeg'; // ToDo: register warning
      }
      return picture;
    }
    this.addWarning('Empty picture tag found');
    return null;
  }

  /**
   * Convert native tag to common tags
   */
  private async toCommon(tagType: TagType, tagId: string, value: AnyTagValue): Promise<void> {
    // Expand involved-person roles for mapping without adding synthetic native tags.
    if (
      ((tagType === 'ID3v2.2' && tagId === 'IPL') ||
        (tagType === 'ID3v2.3' && tagId === 'IPLS') ||
        (tagType === 'ID3v2.4' && (tagId === 'TIPL' || tagId === 'TMCL'))) &&
      value !== null &&
      typeof value === 'object'
    ) {
      for (const [role, people] of Object.entries(value)) {
        if (Array.isArray(people)) {
          for (const person of people) {
            if (typeof person === 'string' && person.length > 0) {
              const credit = this.tagMapper.mapTag(tagType, { id: `${tagId}:${role}`, value: person }, this);
              if (credit) {
                await this.postMap(tagType, credit);
              } else if (tagId !== 'TIPL') {
                // In ID3v2.3, IPLS combines production roles and instrument
                // credits. In ID3v2.4, TMCL contains only musician credits.
                await this.postMap(tagType, {
                  id: 'performer:instrument',
                  value: role && role.toLowerCase() !== 'performer' ? `${person} (${role})` : person
                });
              }
            }
          }
        }
      }
      return;
    }

    if (tagType === 'vorbis' && this.vorbisMovement.add(tagId, String(value))) {
      const movement = this.vorbisMovement.value;
      if (movement.name !== undefined) {
        await this.postMap(tagType, { id: 'movement', value: movement.name });
      }
      // Selection already resolves embedded versus dedicated totals.
      if (movement.index.of === null) {
        delete this.common.movementTotal;
      } else {
        await this.postMap(tagType, { id: 'movementTotal', value: String(movement.index.of) });
      }
      await this.postMap(tagType, { id: 'movementNumber', value: String(movement.index.no ?? '') });
      return;
    }

    const tag = { id: tagId, value };

    const genericTag = this.tagMapper.mapTag(tagType, tag, this);

    if (genericTag) {
      if (Array.isArray(genericTag.value)) {
        for (const value of genericTag.value) {
          await this.postMap(tagType, { id: genericTag.id, value });
        }
      } else {
        await this.postMap(tagType, genericTag);
      }
    }
  }

  /**
   * Set generic tag
   */
  private setGenericTag(tagType: TagType | 'artificial', tag: IGenericTag) {
    debug(`common.${tag.id} = ${tag.value}`);
    const prio0 = this.commonOrigin[tag.id] || 1000;
    const prio1 = this.originPriority[tagType];

    if (isSingleton(tag.id)) {
      if (prio1 <= prio0) {
        (this.common[tag.id] as unknown) = tag.value;
        this.commonOrigin[tag.id] = prio1;
      } else {
        return debug(`Ignore native tag (singleton): ${tagType}.${tag.id} = ${tag.value}`);
      }
    } else {
      if (prio1 === prio0) {
        if (!isUnique(tag.id) || (this.common[tag.id] as unknown[]).indexOf(tag.value) === -1) {
          (this.common[tag.id] as unknown[]).push(tag.value);
        } else {
          return debug(`Ignore duplicate value: ${tagType}.${tag.id} = ${tag.value}`);
        }
        // no effect? this.commonOrigin[tag.id] = prio1;
      } else if (prio1 < prio0) {
        (this.common[tag.id] as unknown[]) = [tag.value];
        this.commonOrigin[tag.id] = prio1;
      } else {
        return debug(`Ignore native tag (list): ${tagType}.${tag.id} = ${tag.value}`);
      }
    }
    this.notifyCommonTag(tag);
  }

  private notifyCommonTag(tag: IGenericTag): void {
    if (this.opts?.observer) {
      this.opts.observer({ metadata: this, tag: { type: 'common', id: tag.id, value: tag.value } });
    }
  }
}

export function joinArtists(artists: string[]): string {
  if (artists.length > 2) {
    return `${artists.slice(0, artists.length - 1).join(', ')} & ${artists[artists.length - 1]}`;
  }
  return artists.join(' & ');
}
