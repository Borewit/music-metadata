export interface IHeader {
  id: number;
  len: number;
}

export interface ISeekHead {
  id?: Buffer;
  position?: number;
}

export interface IMetaSeekInformation {
  seekHeads: ISeekHead[];
}

export interface ISegmentInformation {
  uid?: Buffer;
  timecodeScale?: number;
  duration?: number;
  dateUTC?: number;
  title?: string;
  muxingApp?: string;
  writingApp?: string;
}

export interface ITrackEntry {
  uid?: Buffer;
  trackNumber?: number;
  trackType?: number;
  audio?: ITrackAudio;
  video?: ITrackVideo;
  flagEnabled?: boolean;
  flagDefault?: boolean;
  flagLacing?: boolean;
  defaultDuration?: number;
  trackTimecodeScale?: number;
  name?: string;
  language?: string;
  codecID?: string;
  codecPrivate?: Buffer;
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
  colourSpace?: Buffer;
  gammaValue?: number;
}

export interface ITrackAudio {
  samplingFrequency?: number;
  outputSamplingFrequency?: number;
  channels?: number;
  channelPositions?: Buffer;
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
  tagString?: string;
  tagBinary?: Buffer;
  language?: string;
  tagDefault?: boolean;
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

export interface ITarget {
  trackUID?: Buffer;
  chapterUID?: Buffer;
  attachmentUID?: Buffer;
  targetType?: TargetType;
}

export interface ITag {
  targets: ITarget;
  simpleTags: ISimpleTag[]
}

export interface ISegment {
  metaSeekInfo?: IMetaSeekInformation;
  seekHeads?: ISeekHead[]
  segmentInfo?: ISegmentInformation;
  tracks?: ITrackEntry[];
  tags?: ITag[];
  cues?: ICuePoint[];
}

export interface IEBML {
  version?: number;
  readVersion?: number;
  maxIDLength?: number;
  maxSizeLength?: Buffer;
  docType?: string;
  docTypeVersion?: number;
  docTypeReadVersion?: number;
  segments: ISegment[]
}
