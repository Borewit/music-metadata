import type { IEbmlDoc } from '../ebml/types.js';

export interface ISeek {
  id: Uint8Array;
  position: number;
}

export interface ISeekHead {
  seek: ISeek[];
}

export interface ISegmentInformation {
  uid?: Uint8Array;
  timecodeScale?: number;
  duration?: number;
  dateUTC?: number;
  title?: string;
  muxingApp?: string;
  writingApp?: string;
}

export interface ITrackEntry {
  uid?: Uint8Array;
  trackNumber: number;
  trackType?: TrackType;
  audio: ITrackAudio;
  video?: ITrackVideo;
  flagEnabled?: boolean;
  flagDefault?: boolean;
  flagLacing?: boolean;
  defaultDuration?: number;
  trackTimecodeScale?: number;
  name?: string;
  language?: string;
  codecID: string;
  codecPrivate?: Uint8Array;
  codecName?: string;
  codecSettings?: string;
  codecInfoUrl?: string;
  codecDownloadUrl?: string;
  codecDecodeAll?: string;
  trackOverlay?: string;
}

export interface ITrackVideo {
  flagInterlaced?: boolean;
  stereoMode?: number;
  pixelWidth?: number;
  pixelHeight?: number;
  displayWidth?: number;
  displayHeight?: number;
  displayUnit?: number;
  aspectRatioType?: number;
  colourSpace?: Uint8Array;
  gammaValue?: number;
}

export interface ITrackAudio {
  samplingFrequency?: number;
  outputSamplingFrequency?: number;
  channels?: number;
  channelPositions?: Uint8Array;
  bitDepth?: number;
}

export interface ICuePoint {
  cueTime?: number;
  cueTrackPositions: ICueTrackPosition[]
}

export interface ICueTrackPosition {
  cueTrack?: number;
  cueClusterPosition?: number;
  cueBlockNumber?: number;
  cueCodecState?: number;
  cueReference?: ICueReference;
}

export interface ICueReference {
  cueRefTime?: number;
  cueRefCluster?: number;
  cueRefNumber?: number;
  cueRefCodecState?: number;
}

export interface ISimpleTag {
  name?: string;
  'string'?: string;
  binary?: Uint8Array;
  language?: string;
  default?: boolean;
}

export const TargetType = {
  10: 'shot',
  20: 'scene',
  30: 'track',
  40: 'part',
  50: 'album',
  60: 'edition',
  70: 'collection'
}

export const TrackType = {
  video: 0x01,
  audio: 0x02,
  complex: 0x03,
  logo: 0x04,
  subtitle: 0x11,
  button: 0x12,
  control: 0x20
};
export type TrackType = typeof TrackType[keyof typeof TrackType];
export type TrackTypeKey = keyof typeof TrackType;

export const TrackTypeValueToKeyMap: Record<TrackType, TrackTypeKey> = {
  [TrackType.video]: 'video',
  [TrackType.audio]: 'audio',
  [TrackType.complex]: 'complex',
  [TrackType.logo]: 'logo',
  [TrackType.subtitle]: 'subtitle',
  [TrackType.button]: 'button',
  [TrackType.control]: 'control'
}

export interface ITarget {
  trackUID?: Uint8Array;
  chapterUID?: Uint8Array;
  attachmentUID?: Uint8Array;
  targetTypeValue?: keyof typeof TargetType;
  targetType?: string;
}

export interface ITag {
  target: ITarget;
  simpleTags: ISimpleTag[]
}

export interface ITags {
  tag: ITag[];
}

export interface ITrackElement {
  entries?: ITrackEntry[];
}

export interface IAttachmedFile {
  description?: string;
  name: string;
  mimeType: string;
  data: Uint8Array;
  uid: string;
}

export interface IAttachments {
  attachedFiles: IAttachmedFile[];
}

export interface IMatroskaSegment {
  metaSeekInfo?: ISeekHead;
  seekHeads?: ISeek[]
  info?: ISegmentInformation;
  tracks?: ITrackElement;
  tags?: ITags;
  cues?: ICuePoint[];
  attachments?: IAttachments
}

export interface IMatroskaDoc extends IEbmlDoc {
  segment: IMatroskaSegment
}
