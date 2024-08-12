export interface IHeader {
  id: number;
  len: number;
}

export enum DataType { 'string' = 0, uint = 1, uid = 2, bool = 3, binary = 4, float = 5}

export interface IElementType<T> {
  readonly name: string;
  readonly value?: DataType;
  readonly container?: IContainerType;
  readonly multiple?: boolean;
}

export interface IContainerType { [id: number]: IElementType<string | number | boolean | Uint8Array>; }

export interface ITree { [name: string]: string | number | boolean | Uint8Array | ITree | ITree[]; }

export type ValueType = string | number | Uint8Array | boolean | ITree | ITree[];

export interface ISeekHead {
  id?: Uint8Array;
  position?: number;
}

export interface IMetaSeekInformation {
  seekHeads: ISeekHead[];
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

export enum TargetType {
  shot = 10,
  scene = 20,
  track = 30,
  part = 40,
  album = 50,
  edition = 60,
  collection = 70
}

export enum TrackType {
  video = 0x01,
  audio = 0x02,
  complex = 0x03,
  logo = 0x04,
  subtitle= 0x11,
  button = 0x12,
  control = 0x20
}

export type TrackTypeKey = keyof TrackType;

export interface ITarget {
  trackUID?: Uint8Array;
  chapterUID?: Uint8Array;
  attachmentUID?: Uint8Array;
  targetTypeValue?: TargetType;
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
  metaSeekInfo?: IMetaSeekInformation;
  seekHeads?: ISeekHead[]
  info?: ISegmentInformation;
  tracks?: ITrackElement;
  tags?: ITags;
  cues?: ICuePoint[];
  attachments?: IAttachments
}

export interface IEbmlElements {
  version?: number;
  readVersion?: number;
  maxIDWidth?: number;
  maxSizeWidth?: number;
  docType?: string;
  docTypeVersion?: number;
  docTypeReadVersion?: number;
}

export interface IEbmlDoc {
  ebml: IEbmlElements
}

export interface IMatroskaDoc extends IEbmlDoc {
  segment: IMatroskaSegment
}
