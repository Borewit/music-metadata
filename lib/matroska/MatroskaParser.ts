import initDebug from 'debug';

import { BasicParser } from '../common/BasicParser.js';
import { EbmlIterator, ParseAction } from '../ebml/EbmlIterator.js';
import type { AnyTagValue, ITrackInfo } from '../type.js';
import { matroskaDtd } from './MatroskaDtd.js';
import { type IDecodedTrackEntry, type ISeekHead, type ITrackEntry, TargetType, TrackType } from './types.js';

const debug = initDebug('music-metadata:parser:matroska');
const targetTypes: Readonly<Record<number, string | undefined>> = TargetType;

function isCompleteTrack(entry: IDecodedTrackEntry): entry is ITrackEntry {
  return (
    typeof entry.trackNumber === 'number' &&
    Number.isSafeInteger(entry.trackNumber) &&
    entry.trackNumber > 0 &&
    typeof entry.codecID === 'string' &&
    entry.codecID.length > 0 &&
    Object.values(TrackType).some(type => type === entry.trackType)
  );
}

/**
 * Extensible Binary Meta Language (EBML) parser
 * https://en.wikipedia.org/wiki/Extensible_Binary_Meta_Language
 * http://matroska.sourceforge.net/technical/specs/rfc/index.html
 *
 * WEBM VP8 AUDIO FILE
 */
export class MatroskaParser extends BasicParser {
  private tracksByUid = new Map<string, ITrackInfo>();
  private trackStatistics = new Map<string, Map<string, string>>();
  private seekHead: ISeekHead | undefined;
  private seekHeadOffset = 0;
  /**
   * Use index to skip multiple segment/cluster elements at once.
   * Significant performance impact
   */
  private flagUseIndexToSkipClusters = this.options.mkvUseIndex ?? false;

  public async parse(): Promise<void> {
    const containerSize = this.tokenizer.fileInfo.size ?? Number.MAX_SAFE_INTEGER;

    const matroskaIterator = new EbmlIterator(this.tokenizer, this.options);
    debug('Initializing DTD end MatroskaIterator');
    await matroskaIterator.iterate(matroskaDtd, containerSize, {
      startNext: async element => {
        switch (element.id) {
          // case 0x1f43b675: // cluster
          case 0x1c53bb6b: // Cueing Data
            debug(`Skip element: name=${element.name}, id=0x${element.id.toString(16)}`);
            return ParseAction.IgnoreElement;
          case 0x1f43b675: // cluster
            if (this.flagUseIndexToSkipClusters && this.seekHead) {
              const index = (this.seekHead.seek ?? []).find(
                index => index.position !== undefined && index.position + this.seekHeadOffset > this.tokenizer.position
              );
              if (index?.position !== undefined) {
                // Go to next index position
                const ignoreSize = index.position + this.seekHeadOffset - this.tokenizer.position;
                debug(`Use index to go to next position, ignoring ${ignoreSize} bytes`);
                await this.tokenizer.ignore(ignoreSize);
                return ParseAction.SkipElement;
              }
            }
            return ParseAction.IgnoreElement;
          default:
            return ParseAction.ReadNext;
        }
      },
      onElement: async event => {
        debug(`Received: name=${event.element.name}, value=${event.value}`);
        switch (event.id) {
          case 0x4282: // docType
            this.metadata.setFormat('container', `EBML/${event.value}`);
            break;

          case 0x114d9b74:
            this.seekHead = event.value;
            this.seekHeadOffset = event.offset;
            break;

          case 0x1549a966:
            {
              // Info (Segment Information)
              const info = event.value;
              if (info.title !== undefined) {
                await this.addTag('segment:title', info.title);
              }
              const timecodeScale = info.timecodeScale ? info.timecodeScale : 1000000;
              if (typeof info.duration === 'number') {
                const duration = (info.duration * timecodeScale) / 1000000000;
                if (Number.isFinite(duration) && duration > 0) {
                  this.metadata.setFormat('duration', duration);
                  this.metadata.setFormat('containerDuration', duration);
                }
              }
            }
            break;

          case 0x1654ae6b:
            {
              // tracks
              const audioTracks = event.value;
              if (audioTracks?.entries) {
                const entries = audioTracks.entries
                  .filter(entry => {
                    if (isCompleteTrack(entry)) {
                      return true;
                    }
                    this.metadata.addWarning('Ignoring Matroska track without valid TrackNumber, TrackType or CodecID');
                    return false;
                  })
                  .filter(isCompleteTrack);
                entries.forEach(entry => {
                  const stream: ITrackInfo = {
                    id: entry.trackNumber,
                    codecId: entry.codecID,
                    codecName: entry.codecName ?? entry.codecID.replace(/^[AV]_/, ''),
                    codecSettings: entry.codecSettings,
                    flagDefault: entry.flagDefault ?? true,
                    flagLacing: entry.flagLacing ?? true,
                    flagEnabled: entry.flagEnabled ?? true,
                    flagForced: entry.flagForced ?? false,
                    language: entry.languageIETF ?? entry.language ?? 'eng',
                    name: entry.name,
                    type: entry.trackType,
                    audio:
                      entry.trackType === TrackType.audio
                        ? {
                            ...entry.audio,
                            samplingFrequency: entry.audio?.samplingFrequency ?? 8000,
                            channels: entry.audio?.channels ?? 1
                          }
                        : undefined,
                    video:
                      entry.trackType === TrackType.video && entry.video
                        ? {
                            ...entry.video,
                            flagInterlaced:
                              entry.video.flagInterlaced === 1
                                ? true
                                : entry.video.flagInterlaced === 2
                                  ? false
                                  : undefined
                          }
                        : undefined
                  };
                  if (stream.video && entry.defaultDuration && entry.defaultDuration > 0) {
                    stream.video = { ...stream.video, frameRate: 1e9 / entry.defaultDuration };
                  }
                  if (entry.uid) {
                    this.tracksByUid.set(this.uidKey(entry.uid), stream);
                  }
                  this.metadata.addStreamInfo(stream);
                });

                const audioTrack = entries
                  .filter(entry => entry.trackType === TrackType.audio && entry.flagEnabled !== false)
                  .reduce((acc: ITrackEntry | null, cur: ITrackEntry): ITrackEntry => {
                    if (!acc) {
                      return cur;
                    }
                    const currentDefault = cur.flagDefault ?? true;
                    const previousDefault = acc.flagDefault ?? true;
                    if (currentDefault !== previousDefault) {
                      return currentDefault ? cur : acc;
                    }
                    if (cur.trackNumber < acc.trackNumber) {
                      return cur;
                    }
                    return acc;
                  }, null);

                if (audioTrack) {
                  this.metadata.setFormat('codec', audioTrack.codecID.replace(/^A_/, ''));
                  this.metadata.setFormat('hasAudio', true);
                  this.metadata.setFormat(
                    'sampleRate',
                    audioTrack.audio?.outputSamplingFrequency ?? audioTrack.audio?.samplingFrequency ?? 8000
                  );
                  this.metadata.setFormat('numberOfChannels', audioTrack.audio?.channels ?? 1);
                  if (audioTrack.audio?.bitDepth !== undefined) {
                    this.metadata.setFormat('bitsPerSample', audioTrack.audio.bitDepth);
                  }
                }
              }
            }
            break;

          case 0x1254c367:
            {
              // tags
              const tags = event.value;
              await Promise.all(
                (tags.tag ?? []).map(async tag => {
                  const target = tag.target;
                  for (const uid of target?.tagTrackUID ?? []) {
                    const key = this.uidKey(uid);
                    if (key !== '0') {
                      const statistics = this.trackStatistics.get(key) ?? new Map<string, string>();
                      for (const simpleTag of tag.simpleTags ?? []) {
                        if (simpleTag.name && typeof simpleTag.string === 'string') {
                          statistics.set(simpleTag.name.toUpperCase(), simpleTag.string);
                        }
                      }
                      this.trackStatistics.set(key, statistics);
                    }
                  }
                  const targetType = target?.targetTypeValue
                    ? (targetTypes[target.targetTypeValue] ?? 'track')
                    : target?.targetType
                      ? target.targetType
                      : 'track';
                  await Promise.all(
                    (tag.simpleTags ?? []).map(async simpleTag => {
                      const value = simpleTag.string ?? simpleTag.binary;
                      if (simpleTag.name && value !== undefined) {
                        await this.addTag(`${targetType}:${simpleTag.name}`, value);
                      }
                    })
                  );
                })
              );
            }
            break;

          case 0x1941a469:
            {
              // attachments
              const attachments = event.value;
              for (const file of attachments.attachedFiles ?? []) {
                if (file.mimeType?.startsWith('image/') && file.data) {
                  await this.addTag('picture', {
                    data: file.data,
                    format: file.mimeType,
                    description: file.description,
                    name: file.name
                  });
                }
              }
            }
            break;
        }
      }
    });
    this.applyTrackStatistics();
  }

  private uidKey(uid: Uint8Array): string {
    return (
      Array.from(uid, byte => byte.toString(16).padStart(2, '0'))
        .join('')
        .replace(/^0+/, '') || '0'
    );
  }

  private applyTrackStatistics(): void {
    for (const [uid, tags] of this.trackStatistics) {
      const track = this.tracksByUid.get(uid);
      if (!track) {
        continue;
      }
      const duration = tags.get('DURATION')?.match(/^(\d+):([0-5]\d):([0-5]\d(?:\.\d+)?)$/);
      if (duration) {
        const seconds = Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]);
        if (Number.isFinite(seconds) && seconds > 0) {
          track.duration = seconds;
        }
      }
      const number = (name: string): number | undefined => {
        const value = tags.get(name);
        if (value && /^\d+$/.test(value)) {
          const result = Number(value);
          if (Number.isSafeInteger(result) && result >= 0) {
            return result;
          }
        }
        return undefined;
      };
      const bitrate = number('BPS');
      const size = number('NUMBER_OF_BYTES');
      if (bitrate !== undefined && bitrate > 0) {
        track.bitrate = bitrate;
      } else if (size !== undefined && track.duration) {
        track.bitrate = (size * 8) / track.duration;
      }
      const frames = number('NUMBER_OF_FRAMES');
      if (track.video && frames !== undefined && frames > 0 && track.duration) {
        track.video.frameRate ??= frames / track.duration;
      }
    }
  }

  private async addTag(tagId: string, value: AnyTagValue): Promise<void> {
    await this.metadata.addTag('matroska', tagId, value);
  }
}
