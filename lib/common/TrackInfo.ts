import { type IFormat, type ITrackInfo, TrackType } from '../type.js';
import type { INativeMetadataCollector } from './MetadataCollector.js';

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

/** Derive whole-file statistics without treating an audio bitrate as a video bitrate. */
export function finalizeContainerInfo(metadata: INativeMetadataCollector, fileSize?: number): void {
  const { format } = metadata;
  let duration = format.containerDuration;
  if (duration === undefined) {
    const durations = format.trackInfo
      .filter(track => track.type === TrackType.audio || track.type === TrackType.video)
      .map(track => track.duration);
    if (
      durations.length > 0 &&
      durations.every(
        (duration): duration is number => duration !== undefined && duration > 0 && Number.isFinite(duration)
      )
    ) {
      duration = durations.reduce((maximum, trackDuration) => Math.max(maximum, trackDuration), 0);
    } else if (!format.hasVideo) {
      duration = format.duration;
    }
  }
  if (duration !== undefined && Number.isFinite(duration) && duration > 0) {
    metadata.setFormat('containerDuration', duration);
    if (format.duration === undefined) {
      metadata.setFormat('duration', duration);
    }
    if (fileSize !== undefined && Number.isSafeInteger(fileSize) && fileSize > 0) {
      const bitrate = (8 * fileSize) / duration;
      if (Number.isFinite(bitrate)) {
        metadata.setFormat('overallBitrate', bitrate);
      }
    }
  }
}
