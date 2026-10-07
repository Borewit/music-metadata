import type { TagType } from '../common/GenericTagTypes.js';
import { type INativeMetadataCollector, MetadataCollector } from '../common/MetadataCollector.js';
import type { AnyTagValue, FormatId, INativeTags, IQualityInformation } from '../type.js';

/** Keep format values local to a logical stream while sharing tags and warnings. */
export class OggStreamMetadata extends MetadataCollector {
  declare public readonly native: INativeTags;
  declare public readonly quality: IQualityInformation;
  public constructor(private readonly parent: INativeMetadataCollector) {
    super();
    this.native = parent.native;
    this.quality = parent.quality;
  }

  public override setFormat(key: FormatId, value: AnyTagValue): void {
    super.setFormat(key, value);
    // One logical stream cannot rule out the presence of another media type.
    if ((key !== 'hasAudio' && key !== 'hasVideo') || value === true) {
      this.parent.setFormat(key, value);
    }
  }

  public override registerTagType(tagType: TagType): void {
    this.parent.registerTagType(tagType);
  }

  public override addTag(tagType: TagType, tagId: string, value: AnyTagValue): Promise<void> {
    return this.parent.addTag(tagType, tagId, value);
  }

  public override addWarning(warning: string): void {
    this.parent.addWarning(warning);
  }
}
