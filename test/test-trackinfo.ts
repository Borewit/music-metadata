import { assert } from 'chai';
import path from 'node:path';

import { TrackType } from '../lib/type.js';
import * as mm from '../lib/index.js';
import { samplePath } from './util.js';

const path_samples = path.join(samplePath);

describe('format.trackInfo', () => {

  describe('Containers', () => {

    describe('ASF', () => {

      const path_asf = path.join(path_samples, 'asf');

      it('wma', async () => {
        const filePath = path.join(path_asf, 'issue_57.wma');
        const {format} = await mm.parseFile(filePath);

        assert.includeDeepOrderedMembers(format.trackInfo, [
          {
            codecName: 'Windows Media Audio 9.2',
            type: TrackType.audio
          }
        ], 'format.trackInfo');
      });

      it('elephant.asf', async () => {
        const filePath = path.join(path_asf, 'elephant.asf');
        const {format} = await mm.parseFile(filePath);

        assert.includeDeepOrderedMembers(format.trackInfo, [
          {
            codecName: 'Windows Media Audio V2',
            type: TrackType.audio
          },
          {
            codecName: 'Microsoft MPEG-4 Video Codec V3',
            type: TrackType.video
          }
        ], 'format.trackInfo');
      });

    });

    describe('Matroska', () => {

      it('WebM', async () => {
        const filePath = path.join(path_samples, 'matroska', 'big-buck-bunny_trailer-short.vp8.webm');
        const {format} = await mm.parseFile(filePath);

        assert.includeDeepOrderedMembers(format.trackInfo, [
          {
            audio: undefined,
            codecName: 'VP8',
            codecSettings: undefined,
            flagDefault: undefined,
            flagEnabled: undefined,
            flagLacing: undefined,
            language: undefined,
            name: undefined,
            type: TrackType.video,
            video: {
              displayHeight: 360,
              displayWidth: 640,
              pixelHeight: 360,
              pixelWidth: 640
            }
          },
          {
            audio: {
              samplingFrequency: 44100
            },
            codecName: 'VORBIS',
            codecSettings: undefined,
            flagDefault: undefined,
            flagEnabled: undefined,
            flagLacing: undefined,
            language: undefined,
            name: undefined,
            type: TrackType.audio,
            video: undefined
          }
        ], 'format.trackInfo');
      });

      it('matroska-test-w1-test5-short.mkv', async () => {
        const filePath = path.join(path_samples, 'matroska', 'matroska-test-w1-test5-short.mkv');
        const {format} = await mm.parseFile(filePath);

        assert.includeDeepOrderedMembers(format.trackInfo, [
          {
            audio: undefined,
            codecName: 'MPEG4/ISO/AVC',
            codecSettings: undefined,
            flagDefault: undefined,
            flagEnabled: undefined,
            flagLacing: false,
            language: 'und',
            name: undefined,
            type: TrackType.video,
            video: {
              displayHeight: 576,
              displayWidth: 1024,
              pixelHeight: 576,
              pixelWidth: 1024
            }
          },
          {
            audio: {
              channels: 2,
              samplingFrequency: 48000
            },
            codecName: 'AAC',
            codecSettings: undefined,
            flagDefault: undefined,
            flagEnabled: undefined,
            flagLacing: undefined,
            language: 'und',
            name: undefined,
            type: TrackType.audio,
            video: undefined
          },
          {
            audio: undefined,
            codecName: 'S_TEXT/UTF8',
            codecSettings: undefined,
            flagDefault: undefined,
            flagEnabled: undefined,
            flagLacing: false,
            language: undefined,
            name: undefined,
            type: TrackType.subtitle,
            video: undefined
          },
          {
            audio: undefined,
            codecName: 'S_TEXT/UTF8',
            codecSettings: undefined,
            flagDefault: false,
            flagEnabled: undefined,
            flagLacing: false,
            language: 'hun',
            name: undefined,
            type: TrackType.subtitle,
            video: undefined
          },
          {
            audio: undefined,
            codecName: 'S_TEXT/UTF8',
            codecSettings: undefined,
            flagDefault: false,
            flagEnabled: undefined,
            flagLacing: false,
            language: 'ger',
            name: undefined,
            type: 17,
            video: undefined
          },
          {
            audio: undefined,
            codecName: 'S_TEXT/UTF8',
            codecSettings: undefined,
            flagDefault: false,
            flagEnabled: undefined,
            flagLacing: false,
            language: 'fre',
            name: undefined,
            type: TrackType.subtitle,
            video: undefined
          },
          {
            audio: undefined,
            codecName: 'S_TEXT/UTF8',
            codecSettings: undefined,
            flagDefault: false,
            flagEnabled: undefined,
            flagLacing: false,
            language: 'spa',
            name: undefined,
            type: TrackType.subtitle,
            video: undefined
          },
          {
            audio: undefined,
            codecName: 'S_TEXT/UTF8',
            codecSettings: undefined,
            flagDefault: false,
            flagEnabled: undefined,
            flagLacing: false,
            name: undefined,
            language: 'ita',
            type: TrackType.subtitle,
            video: undefined
          },
          {
            audio: {
              outputSamplingFrequency: 44100,
              samplingFrequency: 22050
            },
            codecName: 'AAC',
            codecSettings: undefined,
            flagDefault: false,
            flagEnabled: undefined,
            flagLacing: undefined,
            language: undefined,
            name: 'Commentary',
            type: TrackType.audio,
            video: undefined
          },
          {
            audio: undefined,
            codecName: 'S_TEXT/UTF8',
            codecSettings: undefined,
            flagDefault: false,
            flagEnabled: undefined,
            flagLacing: false,
            language: 'jpn',
            name: undefined,
            type: TrackType.subtitle,
            video: undefined
          },
          {
            audio: undefined,
            codecName: 'S_TEXT/UTF8',
            codecSettings: undefined,
            flagDefault: false,
            flagEnabled: undefined,
            flagLacing: false,
            language: 'und',
            name: undefined,
            type: TrackType.subtitle,
            video: undefined
          }
        ], 'format.trackInfo');
      });

    });

    describe('MPEG-4', () => {

      it('.mp4: "Mr. Pickles S02E07 My Dear Boy.mp4"', async () => {
        const filePath = path.join(path_samples, 'mp4', 'Mr. Pickles S02E07 My Dear Boy.mp4');
        const {format} = await mm.parseFile(filePath);

        assert.includeDeepOrderedMembers(format.trackInfo, [
          {
            audio: {
              bitDepth: 16,
              channels: 2,
              samplingFrequency: 48000
            },
            codecName: 'MPEG-4/AAC',
            type: TrackType.audio
          },
          {
            audio: {
              bitDepth: 0,
              channels: 0,
              samplingFrequency: 1916.1076
            },
            codecName: '<avc1>',
            type: TrackType.audio
          },
          {
            audio: {
              bitDepth: 16,
              channels: 2,
              samplingFrequency: 48000
            },
            codecName: 'AC-3',
            type: TrackType.audio
          },
          {
            codecName: 'CEA-608'
          }
        ], 'format.trackInfo');
      });

    });

  });

});
