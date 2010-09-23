var common     = require('./common'),
    parser     = require('./id3v2_frames'),
    strtok     = require('strtok'),
    isBitSetAt = common.isBitSetAt,
    getInt24   = common.getInt24;

exports.readTags = function readTags () {
  var buffer = this.buffer,
      offset = 0,
      id3,
      frames;

  var version = buffer[3];
  if (version > 4) return {};

  id3 = {
    version:    '2.' + version + '.' + buffer[4],
    major:      version,
    unsync:     isBitSetAt(buffer, 5, 7),
    xheader:    isBitSetAt(buffer, 5, 6),
    xindicator: isBitSetAt(buffer, 5, 5),
    size:       readTagSize(buffer, 6)
  };
  offset += 10;

  if (id3.xheader) {
    offset += strtok.UINT32_BE.get(buffer, offset) + 4;
  }

  frames = id3.unsync ? {} : readFrames(buffer, id3, offset, id3.size - 10);
  frames.id3 = id3;

  return frames;
};

var readFrames = function readFrames (b, id3, offset, end) {
  var frames = {},
      frame_data_size,
      major  = id3.major,
      flags,
      frame,
      frame_header_size,
      frame_offset,
      parsed_data;

  while (offset < end) {
    flags         = null;
    frame_offset  = offset;
    frame         = {
      id:          null,
      size:        null,
      description: null,
      data:        null
    };

    switch (major) {
      case 2:
        frame.id          = b.toString('ascii', frame_offset, frame_offset + 3);
        frame.size        = getInt24(b, frame_offset + 3, true);
        frame_header_size = 6;
        break;

      case 3:
        frame.id          = b.toString('ascii', frame_offset, frame_offset + 4);
        frame.size        = strtok.UINT32_BE.get(b, frame_offset + 4);
        frame_header_size = 10;
        break;

      case 4:
        frame.id          = b.toString('ascii', frame_offset, frame_offset + 4);
        frame.size        = readTagSize(b, frame_offset + 4);
        frame_header_size = 10;
        break;
    }

    // Last frame
    if (frame.id === '' || frame.id === '\u0000\u0000\u0000\u0000') break;

    // Advance to next frame
    offset += frame_header_size + frame.size;

    if (major > 2) {
      flags = readFrameFlags(b, frame_offset + 8);
    }

    frame_offset += frame_header_size;

    if (flags && flags.format.data_length_indicator) {
      frame_data_size =  readTagSize(b, frame_offset);
      frame_offset    += 4;
      frame.size      -= 4;
    }

    if (flags && flags.format.unsync) {
      // Unimplemented
      continue;
    }

    // Parse data
    try {
      frame.data = parser.readData(b, frame.id, frame_offset, frame.size, flags, major);
    } catch (error) {
      // Couldn't parse frame :/
      continue;
    }
    frame.description = FRAMES[frame.id] || 'Unknown';

    if (frames.hasOwnProperty(frame.id)) {
      if (frames[frame.id].id) {
        frames[frame.id] = [frames[frame.id]];
      }
      frames[frame.id].push(frame);
    } else {
      frames[frame.id] = frame;
    }
  } // End while

  return frames;
};

var readTagSize = exports.readTagSize = function readTagSize (buffer, offset) {
  offset || (offset = 6);

  var byte1 = buffer[offset],
      byte2 = buffer[offset + 1],
      byte3 = buffer[offset + 2],
      byte4 = buffer[offset + 3];

  return byte4 & 0x7f           |
         ((byte3 & 0x7f) << 7)  |
         ((byte2 & 0x7f) << 14) |
         ((byte1 & 0x7f) << 21);
};

var readFrameFlags = function readFrameFlags (b, offset) {
  return {
    message: {
        tag_alter_preservation:  isBitSetAt(b, offset, 6),
        file_alter_preservation: isBitSetAt(b, offset, 5),
        read_only:               isBitSetAt(b, offset, 4)
    },
    format:  {
        grouping_identity:       isBitSetAt(b, offset + 1, 7),
        compression:             isBitSetAt(b, offset + 1, 3),
        encryption:              isBitSetAt(b, offset + 1, 2),
        unsync:                  isBitSetAt(b, offset + 1, 1),
        data_length_indicator:   isBitSetAt(b, offset + 1, 0)
    }
  };
};

var FRAMES = exports.FRAMES = {
  // v2.2
  "BUF" : "Recommended buffer size",
  "CNT" : "Play counter",
  "COM" : "Comments",
  "CRA" : "Audio encryption",
  "CRM" : "Encrypted meta frame",
  "ETC" : "Event timing codes",
  "EQU" : "Equalization",
  "GEO" : "General encapsulated object",
  "IPL" : "Involved people list",
  "LNK" : "Linked information",
  "MCI" : "Music CD Identifier",
  "MLL" : "MPEG location lookup table",
  "PIC" : "Attached picture",
  "POP" : "Popularimeter",
  "REV" : "Reverb",
  "RVA" : "Relative volume adjustment",
  "SLT" : "Synchronized lyric/text",
  "STC" : "Synced tempo codes",
  "TAL" : "Album/Movie/Show title",
  "TBP" : "BPM (Beats Per Minute)",
  "TCM" : "Composer",
  "TCO" : "Content type",
  "TCR" : "Copyright message",
  "TDA" : "Date",
  "TDY" : "Playlist delay",
  "TEN" : "Encoded by",
  "TFT" : "File type",
  "TIM" : "Time",
  "TKE" : "Initial key",
  "TLA" : "Language(s)",
  "TLE" : "Length",
  "TMT" : "Media type",
  "TOA" : "Original artist(s)/performer(s)",
  "TOF" : "Original filename",
  "TOL" : "Original Lyricist(s)/text writer(s)",
  "TOR" : "Original release year",
  "TOT" : "Original album/Movie/Show title",
  "TP1" : "Lead artist(s)/Lead performer(s)/Soloist(s)/Performing group",
  "TP2" : "Band/Orchestra/Accompaniment",
  "TP3" : "Conductor/Performer refinement",
  "TP4" : "Interpreted, remixed, or otherwise modified by",
  "TPA" : "Part of a set",
  "TPB" : "Publisher",
  "TRC" : "ISRC (International Standard Recording Code)",
  "TRD" : "Recording dates",
  "TRK" : "Track number/Position in set",
  "TSI" : "Size",
  "TSS" : "Software/hardware and settings used for encoding",
  "TT1" : "Content group description",
  "TT2" : "Title/Songname/Content description",
  "TT3" : "Subtitle/Description refinement",
  "TXT" : "Lyricist/text writer",
  "TXX" : "User defined text information frame",
  "TYE" : "Year",
  "UFI" : "Unique file identifier",
  "ULT" : "Unsychronized lyric/text transcription",
  "WAF" : "Official audio file webpage",
  "WAR" : "Official artist/performer webpage",
  "WAS" : "Official audio source webpage",
  "WCM" : "Commercial information",
  "WCP" : "Copyright/Legal information",
  "WPB" : "Publishers official webpage",
  "WXX" : "User defined URL link frame",
  // v2.3
  "AENC" : "Audio encryption",
  "APIC" : "Attached picture",
  "COMM" : "Comments",
  "COMR" : "Commercial frame",
  "ENCR" : "Encryption method registration",
  "EQUA" : "Equalization",
  "ETCO" : "Event timing codes",
  "GEOB" : "General encapsulated object",
  "GRID" : "Group identification registration",
  "IPLS" : "Involved people list",
  "LINK" : "Linked information",
  "MCDI" : "Music CD identifier",
  "MLLT" : "MPEG location lookup table",
  "OWNE" : "Ownership frame",
  "PRIV" : "Private frame",
  "PCNT" : "Play counter",
  "POPM" : "Popularimeter",
  "POSS" : "Position synchronisation frame",
  "RBUF" : "Recommended buffer size",
  "RVAD" : "Relative volume adjustment",
  "RVRB" : "Reverb",
  "SYLT" : "Synchronized lyric/text",
  "SYTC" : "Synchronized tempo codes",
  "TALB" : "Album/Movie/Show title",
  "TBPM" : "BPM (beats per minute)",
  "TCOM" : "Composer",
  "TCON" : "Content type",
  "TCOP" : "Copyright message",
  "TDAT" : "Date",
  "TDLY" : "Playlist delay",
  "TENC" : "Encoded by",
  "TEXT" : "Lyricist/Text writer",
  "TFLT" : "File type",
  "TIME" : "Time",
  "TIT1" : "Content group description",
  "TIT2" : "Title/songname/content description",
  "TIT3" : "Subtitle/Description refinement",
  "TKEY" : "Initial key",
  "TLAN" : "Language(s)",
  "TLEN" : "Length",
  "TMED" : "Media type",
  "TOAL" : "Original album/movie/show title",
  "TOFN" : "Original filename",
  "TOLY" : "Original lyricist(s)/text writer(s)",
  "TOPE" : "Original artist(s)/performer(s)",
  "TORY" : "Original release year",
  "TOWN" : "File owner/licensee",
  "TPE1" : "Lead performer(s)/Soloist(s)",
  "TPE2" : "Band/orchestra/accompaniment",
  "TPE3" : "Conductor/performer refinement",
  "TPE4" : "Interpreted, remixed, or otherwise modified by",
  "TPOS" : "Part of a set",
  "TPUB" : "Publisher",
  "TRCK" : "Track number/Position in set",
  "TRDA" : "Recording dates",
  "TRSN" : "Internet radio station name",
  "TRSO" : "Internet radio station owner",
  "TSIZ" : "Size",
  "TSRC" : "ISRC (international standard recording code)",
  "TSSE" : "Software/Hardware and settings used for encoding",
  "TYER" : "Year",
  "TXXX" : "User defined text information frame",
  "UFID" : "Unique file identifier",
  "USER" : "Terms of use",
  "USLT" : "Unsychronized lyric/text transcription",
  "WCOM" : "Commercial information",
  "WCOP" : "Copyright/Legal information",
  "WOAF" : "Official audio file webpage",
  "WOAR" : "Official artist/performer webpage",
  "WOAS" : "Official audio source webpage",
  "WORS" : "Official internet radio station homepage",
  "WPAY" : "Payment",
  "WPUB" : "Publishers official webpage",
  "WXXX" : "User defined URL link frame"
};
