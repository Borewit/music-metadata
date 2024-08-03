import MusepackParser from './musepack/index.js';
import { AIFFParser } from './aiff/AiffParser.js';
import { APEv2Parser } from './apev2/APEv2Parser.js';
import { AsfParser } from './asf/AsfParser.js';
import { FlacParser } from './flac/FlacParser.js';
import { MP4Parser } from './mp4/MP4Parser.js';
import { MpegParser } from './mpeg/MpegParser.js';
import { OggParser } from './ogg/OggParser.js';
import { WaveParser } from './wav/WaveParser.js';
import { WavPackParser } from './wavpack/WavPackParser.js';
import { DsfParser } from './dsf/DsfParser.js';
import { DsdiffParser } from './dsdiff/DsdiffParser.js';
import { MatroskaParser } from './matroska/MatroskaParser.js';
import { BasicParserConstructor } from './common/BasicParser.js';

export {
    AIFFParser,
    APEv2Parser,
    AsfParser,
    FlacParser,
    MP4Parser,
    MpegParser,
    OggParser,
    WaveParser,
    WavPackParser,
    DsfParser,
    DsdiffParser,
    MatroskaParser,
    MusepackParser
}

export const ALL_PARSERS: BasicParserConstructor[] = [
    AIFFParser,
    APEv2Parser,
    AsfParser,
    FlacParser,
    MP4Parser,
    MpegParser,
    OggParser,
    WaveParser,
    WavPackParser,
    DsfParser,
    DsdiffParser,
    MatroskaParser,
    MusepackParser
]