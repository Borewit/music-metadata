import type { DecodedElement } from '../ebml/types.js';
import type { TrackType } from '../type.js';
import type { matroskaDtd } from './MatroskaDtd.js';

export type { TrackTypeKey } from '../type.js';
export { TrackType, TrackTypeValueToKeyMap } from '../type.js';

export type IMatroskaDoc = DecodedElement<typeof matroskaDtd>;
export type IMatroskaSegment = NonNullable<IMatroskaDoc['segment']>;
export type ISeekHead = NonNullable<IMatroskaSegment['seekHead']>[number];
export type ISeek = NonNullable<ISeekHead['seek']>[number];
export type ISegmentInformation = NonNullable<IMatroskaSegment['info']>;
export type ITrackElement = NonNullable<IMatroskaSegment['tracks']>;
export type IDecodedTrackEntry = NonNullable<ITrackElement['entries']>[number];

/** A decoded entry is promoted only after validating these mandatory fields. */
export type ITrackEntry = IDecodedTrackEntry & { trackNumber: number; codecID: string; trackType: TrackType };
export type ITrackVideo = NonNullable<IDecodedTrackEntry['video']>;
export type ITrackAudio = NonNullable<IDecodedTrackEntry['audio']>;
export type ICuePoint = NonNullable<NonNullable<IMatroskaSegment['cues']>['cuePoint']>[number];
export type ICueTrackPosition = NonNullable<ICuePoint['positions']>[number];
export type ICueReference = NonNullable<ICueTrackPosition['reference']>[number];
export type ITags = NonNullable<IMatroskaSegment['tags']>[number];
export type ITag = NonNullable<ITags['tag']>[number];
export type ITarget = NonNullable<ITag['target']>;
export type ISimpleTag = NonNullable<ITag['simpleTags']>[number];
export type IAttachments = NonNullable<IMatroskaSegment['attachments']>;
export type IDecodedAttachedFile = NonNullable<IAttachments['attachedFiles']>[number];
export type IAttachedFile = IDecodedAttachedFile & {
  name: string;
  mimeType: string;
  data: Uint8Array;
  uid: Uint8Array;
};

export const TargetType = {
  10: 'shot',
  20: 'scene',
  30: 'track',
  40: 'part',
  50: 'album',
  60: 'edition',
  70: 'collection'
};
