import type { INativeMetadataCollector, MetadataCollector } from '../../lib/common/MetadataCollector.js';
import type { OggStreamMetadata } from '../../lib/ogg/OggStreamMetadata.js';

// Compile-only checks for the interface, implementation and stream override.
export function checkFormatAssignments(
  collector: INativeMetadataCollector,
  implementation: MetadataCollector,
  stream: OggStreamMetadata
): void {
  collector.setFormat('sampleRate', 44100);
  implementation.setFormat('container', 'FLAC');
  stream.setFormat('hasAudio', true);
  collector.setFormat('creationTime', new Date());
  implementation.setFormat('chapters', [{ title: 'Intro', start: 0 }]);
  stream.setFormat('trackInfo', []);
  collector.setFormat('duration', undefined);

  // @ts-expect-error Numeric format fields cannot contain strings.
  collector.setFormat('sampleRate', '44100');
  // @ts-expect-error Sample counts must be converted to numbers by the parser.
  collector.setFormat('numberOfSamples', 44100n);
  // @ts-expect-error The implementation must preserve the key/value relationship.
  implementation.setFormat('container', 42);
  // @ts-expect-error The stream override must preserve the key/value relationship.
  stream.setFormat('hasAudio', 'true');
  // @ts-expect-error Chapter values must be chapter arrays.
  collector.setFormat('chapters', 'Intro');
  // @ts-expect-error Creation times must be dates.
  implementation.setFormat('creationTime', 0);
  // @ts-expect-error Only format keys are accepted.
  stream.setFormat('title', 'Intro');
}
