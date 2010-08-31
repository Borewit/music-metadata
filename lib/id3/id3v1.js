var common   = require('./common'),
    findZero = common.findZero;

module.exports = {
  readTags: function () {
    var buffer = this.buffer,
        offset = buffer.length - 128,
        header = buffer.toString('binary', offset, offset + 3),
        tags   = {};

    if ('TAG' !== header) return tags;

    // Skip header
    offset += 3;

    // Title
    tags.title =  buffer.toString('ascii', offset, findZero(buffer, offset, offset + 30));
    offset     += 30;

    // Artist
    tags.artist =  buffer.toString('ascii', offset, findZero(buffer, offset, offset + 30));
    offset      += 30;

    // Album
    tags.artist =  buffer.toString('ascii', offset, findZero(buffer, offset, offset + 30));
    offset      += 30;

    // Year
    tags.year =  +buffer.toString('ascii', offset, findZero(buffer, offset, offset + 4));
    offset    += 4;

    // Comment, Track
    if (0 === buffer[offset + 29]) {
      tags.comment = buffer.toString('ascii', offset, findZero(buffer, offset, offset + 28));
      tags.track   = buffer[offset + 29];
    } else {
      tags.comment = buffer.toString('ascii', offset, findZero(buffer, offset, offset + 30));
      tags.track   = 0;
    }

    tags.genre = GENRES[buffer[buffer.length - 1]];

    return tags;
  }
};

var GENRES = exports.GENRES = [
  "Blues","Classic Rock","Country","Dance","Disco","Funk","Grunge",
  "Hip-Hop","Jazz","Metal","New Age","Oldies","Other","Pop","R&B",
  "Rap","Reggae","Rock","Techno","Industrial","Alternative","Ska",
  "Death Metal","Pranks","Soundtrack","Euro-Techno","Ambient",
  "Trip-Hop","Vocal","Jazz+Funk","Fusion","Trance","Classical",
  "Instrumental","Acid","House","Game","Sound Clip","Gospel",
  "Noise","AlternRock","Bass","Soul","Punk","Space","Meditative",
  "Instrumental Pop","Instrumental Rock","Ethnic","Gothic",
  "Darkwave","Techno-Industrial","Electronic","Pop-Folk",
  "Eurodance","Dream","Southern Rock","Comedy","Cult","Gangsta",
  "Top 40","Christian Rap","Pop/Funk","Jungle","Native American",
  "Cabaret","New Wave","Psychadelic","Rave","Showtunes","Trailer",
  "Lo-Fi","Tribal","Acid Punk","Acid Jazz","Polka","Retro",
  "Musical","Rock & Roll","Hard Rock","Folk","Folk-Rock",
  "National Folk","Swing","Fast Fusion","Bebob","Latin","Revival",
  "Celtic","Bluegrass","Avantgarde","Gothic Rock","Progressive Rock",
  "Psychedelic Rock","Symphonic Rock","Slow Rock","Big Band",
  "Chorus","Easy Listening","Acoustic","Humour","Speech","Chanson",
  "Opera","Chamber Music","Sonata","Symphony","Booty Bass","Primus",
  "Porn Groove","Satire","Slow Jam","Club","Tango","Samba",
  "Folklore","Ballad","Power Ballad","Rhythmic Soul","Freestyle",
  "Duet","Punk Rock","Drum Solo","Acapella","Euro-House","Dance Hall"
];

