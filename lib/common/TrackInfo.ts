import { type IFormat, type ITrackInfo, TrackType } from '../type.js';

/** Return a bitrate only when it conveys a finite, positive value. */
export function normalizeBitrate(bitrate: number | undefined): number | undefined {
  return bitrate !== undefined && Number.isFinite(bitrate) && bitrate > 0 ? bitrate : undefined;
}

/** Map the format of a single audio stream to the shared track abstraction. */
export function createAudioTrackInfo(format: IFormat): ITrackInfo {
  const audio: NonNullable<ITrackInfo['audio']> = {};
  const track: ITrackInfo = { type: TrackType.audio, audio };
  if (format.codec !== undefined) {
    track.codecName = format.codec;
  }
  if (format.codecProfile !== undefined) {
    track.codecProfile = format.codecProfile;
  }
  if (format.duration !== undefined) {
    track.duration = format.duration;
  }
  const bitrate = normalizeBitrate(format.bitrate);
  if (bitrate !== undefined) {
    track.bitrate = bitrate;
  }
  if (format.lossless !== undefined) {
    track.lossless = format.lossless;
  }
  if (format.sampleRate !== undefined) {
    audio.samplingFrequency = format.sampleRate;
  }
  if (format.numberOfChannels !== undefined) {
    audio.channels = format.numberOfChannels;
  }
  if (format.bitsPerSample !== undefined) {
    audio.bitDepth = format.bitsPerSample;
  }
  if (format.numberOfSamples !== undefined) {
    audio.numberOfSamples = format.numberOfSamples;
  }
  return track;
}
