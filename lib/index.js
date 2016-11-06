/* jshint maxlen: 300 */
'use strict'
var events = require('events')
var common = require('./common')
var strtok = require('strtok2')
var through = require('through')
var fs = require('fs')

module.exports = function (stream, opts, callback) {
  if (typeof opts === 'function') {
    callback = opts
    opts = {}
  }

  var emitter = new events.EventEmitter()

  var fsize = function (cb) {
    if (opts.fileSize) {
      process.nextTick(function () {
        cb(opts.fileSize)
      })
    } else if (stream.hasOwnProperty('path')) {
      fs.stat(stream.path, function (err, stats) {
        if (err) throw err
        cb(stats.size)
      })
    } else if (stream.hasOwnProperty('fileSize')) {
      stream.fileSize(cb)
    } else if (opts.duration) {
      emitter.emit(
        'done',
        new Error('for non file streams, specify the size of the stream with a fileSize option'))
    }
  }

  // pipe to an internal stream so we aren't messing
  // with the stream passed to us by our users
  var istream = stream.pipe(through(null, null, {autoDestroy: false}))

  var metadata = {
    title: '',
    artist: [],
    albumartist: [],
    album: '',
    year: '',
    track: { no: 0, of: 0 },
    genre: [],
    disk: { no: 0, of: 0 },
    picture: [],
    duration: 0
  }

  var aliased = {}

  var hasReadData = false
  istream.once('data', function (result) {
    hasReadData = true
    var parser = common.getParserForMediaType(headerTypes, result)
    parser(istream, function (type, tag, value) {
      if (value === null) return
      var aliases = getCommonName(type, tag)
      if (aliases !== undefined) {
        if (aliases.indexOf(tag) === -1) {
          // emit original event & value
          emitter.emit(tag, value)
        }
        aliases.forEach(function (alias) {
          // emit original event & value
          buildAliases(alias, tag, value, aliased)
        })
      } else {
        // emit original event & value
        emitter.emit(tag, value)
      }
    }, done, opts.hasOwnProperty('duration'), fsize)
    // re-emitting the first data chunk so the
    // parser picks the stream up from the start
    istream.emit('data', result)
  })

  istream.on('end', function () {
    if (!hasReadData) {
      done(new Error('Could not read any data from this stream'))
    }
  })

  istream.on('close', onClose)

  function onClose () {
    done(new Error('Unexpected end of stream'))
  }

  function done (exception) {
    istream.removeListener('close', onClose)

    // We only emit aliased events once the 'done' event has been raised,
    // this is because an alias like 'artist' could have values split
    // over many data chunks.
    for (var _alias in aliased) {
      if (aliased.hasOwnProperty(_alias)) {
        var val
        if (_alias === 'title' || _alias === 'album' ||
          _alias === 'year' || _alias === 'duration') {
          val = aliased[_alias][0]
        } else {
          val = aliased[_alias]
        }

        emitter.emit(_alias, val)

        if (metadata.hasOwnProperty(_alias)) {
          metadata[_alias] = val
        }
      }
    }

    if (callback) {
      callback(exception, metadata)
    }
    return strtok.DONE
  }

  return emitter
}

function buildAliases (alias, event, value, aliased) {
  // we need to do something special for these events
  var cleaned
  if (event === 'TRACKTOTAL' || event === 'TOTALTRACKS' ||
      event === 'DISCTOTAL' || events === 'TOTALDISCS') {
    var evt
    if (event === 'TRACKTOTAL' || event === 'TOTALTRACKS') evt = 'track'
    if (event === 'DISCTOTAL' || event === 'TOTALDISCS') evt = 'disk'

    cleaned = parseInt(value, 10)
    if (isNaN(cleaned)) cleaned = 0
    if (!aliased.hasOwnProperty(evt)) {
      aliased[evt] = { no: 0, of: cleaned }
    } else {
      aliased[evt].of = cleaned
    }
  }

  // if the event has been aliased then we need to clean it before
  // it is emitted to the user. e.g. genre (20) -> Electronic
  if (alias) {
    cleaned = value
    if (alias === 'genre') cleaned = common.parseGenre(value)
    if (alias === 'picture') cleaned = cleanupPicture(value)

    if (alias === 'track' || alias === 'disk') {
      cleaned = cleanupTrack(value)

      if (aliased[alias]) {
        aliased[alias].no = cleaned.no
        return
      } else {
        aliased[alias] = cleaned
        return
      }
    }

    // if we haven't previously seen this tag then
    // initialize it to an array, ready for values to be entered
    if (!aliased.hasOwnProperty(alias)) {
      aliased[alias] = []
    }

    if (cleaned.constructor === Array) {
      aliased[alias] = cleaned
    } else {
      aliased[alias].push(cleaned)
    }
  }
}

var mappings =
{
  vorbis: {
    'duration': ['duration'],

    'TITLE': ['title'],
    'ARTIST': ['artist'],
    'ALBUMARTIST': ['albumartist'],
    'ALBUM': ['album'],
    'DATE': ['date', 'year'], // backward compatibility
    'ORIGINALDATE': ['originaldate'],
    'ORIGINALYEAR': ['originalyear'],
    'COMMENT': ['comment'],
    'TRACKNUMBER': ['track'],
    'DISCNUMBER': ['disk'],
    'GENRE': ['genre'],
    'METADATA_BLOCK_PICTURE': ['picture'],
    'COMPOSER': ['composer'],
    'LYRICS': ['lyrics'],
    'ALBUMSORT': ['albumsort'],
    'TITLESORT': ['titlesort'],
    'WORK': ['work'],
    'ARTISTSORT': ['artistsort'],
    'ALBUMARTISTSORT': ['albumartistsort'],
    'COMPOSERSORT': ['composersort'],
    'LYRICIST': ['lyricist'],
    'WRITER': ['writer'],
    'CONDUCTOR': ['conductor'],
    'PERFORMER=artist (instrument)': ['performer:instrument'], // ToDo
    'REMIXER': ['remixer'],
    'ARRANGER': ['arranger'],
    'ENGINEER': ['engineer'],
    'PRODUCER': ['producer'],
    'DJMIXER': ['djmixer'],
    'MIXER': ['mixer'],
    'LABEL': ['label'],
    'GROUPING': ['grouping'],
    'SUBTITLE': ['subtitle'],
    'DISCSUBTITLE': ['discsubtitle'],
    'TRACKTOTAL': ['totaltracks'],
    'DISCTOTAL': ['totaldiscs'],
    'COMPILATION': ['compilation'],
    'RATING:user@email': ['_rating'],
    'BPM': ['bpm'],
    'MOOD': ['mood'],
    'MEDIA': ['media'],
    'CATALOGNUMBER': ['catalognumber'],
    'RELEASESTATUS': ['releasestatus'],
    'RELEASETYPE': ['releasetype'],
    'RELEASECOUNTRY': ['releasecountry'],
    'SCRIPT': ['script'],
    'LANGUAGE': ['language'],
    'COPYRIGHT': ['copyright'],
    'LICENSE': ['license'],
    'ENCODEDBY': ['encodedby'],
    'ENCODERSETTINGS': ['encodersettings'],
    'BARCODE': ['barcode'],
    'ISRC': ['isrc'],
    'ASIN': ['asin'],
    'MUSICBRAINZ_TRACKID': ['musicbrainz_recordingid'],
    'MUSICBRAINZ_RELEASETRACKID': ['musicbrainz_trackid'],
    'MUSICBRAINZ_ALBUMID': ['musicbrainz_albumid'],
    'MUSICBRAINZ_ARTISTID': ['musicbrainz_artistid'],
    'MUSICBRAINZ_ALBUMARTISTID': ['musicbrainz_albumartistid'],
    'MUSICBRAINZ_RELEASEGROUPID': ['musicbrainz_releasegroupid'],
    'MUSICBRAINZ_WORKID': ['musicbrainz_workid'],
    'MUSICBRAINZ_TRMID': ['musicbrainz_trmid'],
    'MUSICBRAINZ_DISCID': ['musicbrainz_discid'],
    'ACOUSTID_ID': ['acoustid_id'],
    'ACOUSTID_FINGERPRINT': ['acoustid_fingerprint'],
    'MUSICIP_PUID': ['musicip_puid'],
    'FINGERPRINT=MusicMagic Fingerprint {fingerprint}': ['musicip_fingerprint'], // ToDo
    'WEBSITE': ['website']

  },
  'id3v1.1': {
    'title': ['title'],
    'artist': ['artist'],
    'album': ['album'],
    'year': ['year'],
    'comment': ['comment'],
    'track': ['track'],
    'genre': ['genre']
  },
  'id3v2.2': {
    'TT2': ['title'],
    'TP1': ['artist'],
    'TP2': ['albumartist'],
    'TAL': ['album'],
    'TYE': ['date', 'year'],
    'COM': ['comment'],
    'TRK': ['track'],
    'TPA': ['disk'],
    'TCO': ['genre'],
    'PIC': ['picture'],
    'TCM': ['composer'],

    'TOR': ['originaldate'],
    'TOT': ['work'],
    'TXT': ['lyricist'],
    'TP3': ['conductor'],
    'TPB': ['label'],
    'TT1': ['grouping'],
    'TT3': ['subtitle'],
    'TLA': ['language'],
    'TCR': ['copyright'],
    'WCP': ['license'],
    'TEN': ['encodedby'],
    'TSS': ['encodersettings'],
    'WAR': ['website']
  },
  'id3v2.4': {
    // special
    'duration': ['duration'],

    // id3v2.3
    'TIT2': [ 'title' ],
    'TPE1': [ 'artist' ],
    'TPE2': [ 'albumartist' ],
    'TALB': [ 'album' ],
    'TDRV': [ 'date', 'year' ], // ToDo: improve 'year' mapping
    'TORY': [ 'originaldate' ],
    'COMM:description': [ 'comment' ],
    'TRCK': [ 'track' ],
    'TPOS': [ 'disk' ],
    'TCON': [ 'genre' ],
    'APIC': [ 'picture' ],
    'TCOM': [ 'composer' ],
    'USLT:description': [ 'lyrics' ],
    'TSOA': [ 'albumsort' ],
    'TSOT': [ 'titlesort' ],
    'TOAL': [ 'work' ],
    'TSOP': [ 'artistsort' ],
    'TSO2': [ 'albumartistsort' ],
    'TSOC': [ 'composersort' ],
    'TEXT': [ 'lyricist' ],
    'TXXX:Writer': [ 'writer' ],
    'TPE3': [ 'conductor' ],
    'IPLS:instrument': [ 'performer:instrument' ],
    'TPE4': [ 'remixer' ],
    'IPLS:arranger': [ 'arranger' ],
    'IPLS:engineer': [ 'engineer' ],
    'IPLS:producer': [ 'producer' ],
    'IPLS:DJ-mix': [ 'djmixer' ],
    'IPLS:mix': [ 'mixer' ],
    'TPUB': [ 'label' ],
    'TIT1': [ 'grouping' ],
    'TIT3': [ 'subtitle' ],
    // 'TRCK': ['totaltracks'],
    // 'TPOS': ['totaldiscs'],
    'TCMP': [ 'compilation' ],
    'POPM': [ '_rating' ],
    'TBPM': [ 'bpm' ],
    'TMED': [ 'media' ],
    'TXXX:CATALOGNUMBER': [ 'catalognumber' ],
    'TXXX:MusicBrainz Album Status': [ 'releasestatus' ],
    'TXXX:MusicBrainz Album Type': [ 'releasetype' ],
    'TXXX:MusicBrainz Album Release Country': [ 'releasecountry' ],
    'TXXX:SCRIPT': [ 'script' ],
    'TLAN': [ 'language' ],
    'TCOP': [ 'copyright' ],
    'WCOP': [ 'license' ],
    'TENC': [ 'encodedby' ],
    'TSSE': [ 'encodersettings' ],
    'TXXX:BARCODE': [ 'barcode' ],
    'TSRC': [ 'isrc' ],
    'TXXX:ASIN': [ 'asin' ],
    'UFID:http://musicbrainz.org': [ 'musicbrainz_recordingid' ],
    'TXXX:MusicBrainz Release Track Id': [ 'musicbrainz_trackid' ],
    'TXXX:MusicBrainz Album Id': [ 'musicbrainz_albumid' ],
    'TXXX:MusicBrainz Artist Id': [ 'musicbrainz_artistid' ],
    'TXXX:MusicBrainz Album Artist Id': [ 'musicbrainz_albumartistid' ],
    'TXXX:MusicBrainz Release Group Id': [ 'musicbrainz_releasegroupid' ],
    'TXXX:MusicBrainz Work Id': [ 'musicbrainz_workid' ],
    'TXXX:MusicBrainz TRM Id': [ 'musicbrainz_trmid' ],
    'TXXX:MusicBrainz Disc Id': [ 'musicbrainz_discid' ],
    'TXXX:Acoustid Id': [ 'acoustid_id' ],
    'TXXX:Acoustid Fingerprint': [ 'acoustid_fingerprint' ],
    'TXXX:MusicIP PUID': [ 'musicip_puid' ],
    'TXXX:MusicMagic Fingerprint': [ 'musicip_fingerprint' ],
    'WOAR': [ 'website' ],

    // id3v2.4
    'TDRC': ['year'],
    'TYER': [ 'date', 'year' ], // ToDo: improve 'year' mapping
    'TDOR': [ 'originaldate' ],
    'TMCL:instrument': [ 'performer:instrument' ],
    'TIPL:arranger': [ 'arranger' ],
    'TIPL:engineer': [ 'engineer' ],
    'TIPL:producer': [ 'producer' ],
    'TIPL:DJ-mix': [ 'djmixer' ],
    'TIPL:mix': [ 'mixer' ],
    'TMOO': [ 'mood' ],

      // additional mappings:
    'SYLT': ['lyrics']

  },
  // ToDo: capitalization tricky
  'APEv2': {
    // special
    'duration': ['duration'],
    // MusicBrainz tag mappings:
    'Title': ['title'],
    'Artist': ['artist'],
    'Album Artist': ['albumartist'],
    'Album': ['album'],
    'Year': ['date', 'year'], // ToDo: improve 'year' mapping
    'ORIGINALYEAR': ['originalyear'],
    'Comment': ['comment'],
    'Track': ['track'],
    'Disc': ['disk'],
    'DISCNUMBER': ['disk'], // ToDo: backwards compatibility, valid tag?
    'Genre': ['genre'],
    'Cover Art (Front)': ['picture'],
    'Cover Art (Back)': ['picture'],
    'Composer': ['composer'],
    'Lyrics': ['lyrics'],
    'ALBUMSORT': ['albumsort'],
    'TITLESORT': ['titlesort'],
    'WORK': ['work'],
    'ARTISTSORT': ['artistsort'],
    'ALBUMARTISTSORT': ['albumartistsort'],
    'COMPOSERSORT': ['composersort'],
    'Lyricist': ['lyricist'],
    'Writer': ['writer'],
    'Conductor': ['conductor'],
    'Performer=artist (instrument)': ['performer:instrument'],
    'MixArtist': ['remixer'],
    'Arranger': ['arranger'],
    'Engineer': ['engineer'],
    'Producer': ['producer'],
    'DJMixer': ['djmixer'],
    'Mixer': ['mixer'],
    'Label': ['label'],
    'Grouping': ['grouping'],
    'Subtitle': ['subtitle'],
    'DiscSubtitle': ['discsubtitle'],
    'Compilation': ['compilation'],
    'BPM': ['bpm'],
    'Mood': ['mood'],
    'Media': ['media'],
    'CatalogNumber': ['catalognumber'],
    'MUSICBRAINZ_ALBUMSTATUS': ['releasestatus'],
    'MUSICBRAINZ_ALBUMTYPE': ['releasetype'],
    'RELEASECOUNTRY': ['releasecountry'],
    'Script': ['script'],
    'Language': ['language'],
    'Copyright': ['copyright'],
    'LICENSE': ['license'],
    'EncodedBy': ['encodedby'],
    'EncoderSettings': ['encodersettings'],
    'Barcode': ['barcode'],
    'ISRC': ['isrc'],
    'ASIN': ['asin'],
    'MUSICBRAINZ_TRACKID': ['musicbrainz_recordingid'],
    'MUSICBRAINZ_RELEASETRACKID': ['musicbrainz_trackid'],
    'MUSICBRAINZ_ALBUMID': ['musicbrainz_albumid'],
    'MUSICBRAINZ_ARTISTID': ['musicbrainz_artistid'],
    'MUSICBRAINZ_ALBUMARTISTID': ['musicbrainz_albumartistid'],
    'MUSICBRAINZ_RELEASEGROUPID': ['musicbrainz_releasegroupid'],
    'MUSICBRAINZ_WORKID': ['musicbrainz_workid'],
    'MUSICBRAINZ_TRMID': ['musicbrainz_trmid'],
    'MUSICBRAINZ_DISCID': ['musicbrainz_discid'],
    'ACOUSTID_ID': ['acoustid_id'],
    'ACOUSTID_FINGERPRINT': ['acoustid_fingerprint'],
    'MUSICIP_PUID': ['musicip_puid'],
    'Weblink': ['website']
  },
  // ToDo: capitalization tricky
  'asf': {
    // special
    'duration': ['duration'],
    // MusicBrainz tag mappings:
    'Title': ['title'],
    'Author': ['artist'],
    'WM/AlbumArtist': ['albumartist'],
    'WM/AlbumTitle': ['album'],
    'WM/Year': ['date', 'year'],
    'WM/OriginalReleaseTime': ['originaldate'],
    'WM/OriginalReleaseYear': ['originalyear'],
    'Description': ['comment'],
    'WM/TrackNumber': ['track'],
    'WM/PartOfSet': ['disk'],
    'WM/Genre': ['genre'],
    'WM/Composer': ['composer'],
    'WM/Lyrics': ['lyrics'],
    'WM/AlbumSortOrder': ['albumsort'],
    'WM/TitleSortOrder': ['titlesort'],
    'WM/ArtistSortOrder': ['artistsort'],
    'WM/AlbumArtistSortOrder': ['albumartistsort'],
    'WM/ComposerSortOrder': ['composersort'],
    'WM/Writer': ['lyricist'],
    'WM/Conductor': ['conductor'],
    'WM/ModifiedBy': ['remixer'],
    'WM/Engineer': ['engineer'],
    'WM/Producer': ['producer'],
    'WM/DJMixer': ['djmixer'],
    'WM/Mixer': ['mixer'],
    'WM/Publisher': ['label'],
    'WM/ContentGroupDescription': ['grouping'],
    'WM/SubTitle': ['subtitle'],
    'WM/SetSubTitle': ['discsubtitle'],
    // 'WM/PartOfSet': ['totaldiscs'],
    'WM/IsCompilation': ['compilation'],
    'WM/SharedUserRating': ['_rating'],
    'WM/BeatsPerMinute': ['bpm'],
    'WM/Mood': ['mood'],
    'WM/Media': ['media'],
    'WM/CatalogNo': ['catalognumber'],
    'MusicBrainz/Album Status': ['releasestatus'],
    'MusicBrainz/Album Type': ['releasetype'],
    'MusicBrainz/Album Release Country': ['releasecountry'],
    'WM/Script': ['script'],
    'WM/Language': ['language'],
    'Copyright': ['copyright'],
    'LICENSE': ['license'],
    'WM/EncodedBy': ['encodedby'],
    'WM/EncodingSettings': ['encodersettings'],
    'WM/Barcode': ['barcode'],
    'WM/ISRC': ['isrc'],
    'MusicBrainz/Track Id': ['musicbrainz_recordingid'],
    'MusicBrainz/Release Track Id': ['musicbrainz_trackid'],
    'MusicBrainz/Album Id': ['musicbrainz_albumid'],
    'MusicBrainz/Artist Id': ['musicbrainz_artistid'],
    'MusicBrainz/Album Artist Id': ['musicbrainz_albumartistid'],
    'MusicBrainz/Release Group Id': ['musicbrainz_releasegroupid'],
    'MusicBrainz/Work Id': ['musicbrainz_workid'],
    'MusicBrainz/TRM Id': ['musicbrainz_trmid'],
    'MusicBrainz/Disc Id': ['musicbrainz_discid'],
    'Acoustid/Id': ['acoustid_id'],
    'Acoustid/Fingerprint': ['acoustid_fingerprint'],
    'MusicIP/PUID': ['musicip_puid']
  },
  m4a: {
    'duration': ['duration'],

    '©nam': ['title'],
    '©ART': ['artist'],
    'aART': ['albumartist'],
    '©alb': ['album'],
    '©day': ['date', 'year'], // ToDo: review this mapping
    '©cmt': ['comment'],
    'trkn': ['track', 'totaltracks'],
    'disk': ['disk', 'totaldiscs'],
    '©gen': ['genre'],
    'covr': ['picture'],
    '©wrt': ['composer'],
    '©lyr': ['lyrics'],
    'soal': ['albumsort'],
    'sonm': ['titlesort'],
    'soar': ['artistsort'],
    'soaa': ['albumartistsort'],
    'soco': ['composersort'],
    '----:com.apple.iTunes:LYRICIST': ['lyricist'],
    '----:com.apple.iTunes:CONDUCTOR': ['conductor'],
    '----:com.apple.iTunes:REMIXER': ['remixer'],
    '----:com.apple.iTunes:ENGINEER': ['engineer'],
    '----:com.apple.iTunes:PRODUCER': ['producer'],
    '----:com.apple.iTunes:DJMIXER': ['djmixer'],
    '----:com.apple.iTunes:MIXER': ['mixer'],
    '----:com.apple.iTunes:LABEL': ['label'],
    '©grp': ['grouping'],
    '----:com.apple.iTunes:SUBTITLE': ['subtitle'],
    '----:com.apple.iTunes:DISCSUBTITLE': ['discsubtitle'],
    'cpil': ['compilation'],
    'tmpo': ['bpm'],
    '----:com.apple.iTunes:MOOD': ['mood'],
    '----:com.apple.iTunes:MEDIA': ['media'],
    '----:com.apple.iTunes:CATALOGNUMBER': ['catalognumber'],
    'tvsh': ['show'],
    'sosn': ['showsort'],
    'pcst': ['podcast'],
    'purl': ['podcasturl'],
    '----:com.apple.iTunes:MusicBrainz Album Status': ['releasestatus'],
    '----:com.apple.iTunes:MusicBrainz Album Type': ['releasetype'],
    '----:com.apple.iTunes:MusicBrainz Album Release Country': ['releasecountry'],
    '----:com.apple.iTunes:SCRIPT': ['script'],
    '----:com.apple.iTunes:LANGUAGE': ['language'],
    'cprt': ['copyright'],
    '----:com.apple.iTunes:LICENSE': ['license'],
    '©too': ['encodedby'],
    'pgap': ['gapless'],
    '----:com.apple.iTunes:BARCODE': ['barcode'],
    '----:com.apple.iTunes:ISRC': ['isrc'],
    '----:com.apple.iTunes:ASIN': ['asin'],
    '----:com.apple.iTunes:MusicBrainz Track Id': ['musicbrainz_recordingid'],
    '----:com.apple.iTunes:MusicBrainz Release Track Id': ['musicbrainz_trackid'],
    '----:com.apple.iTunes:MusicBrainz Album Id': ['musicbrainz_albumid'],
    '----:com.apple.iTunes:MusicBrainz Artist Id': ['musicbrainz_artistid'],
    '----:com.apple.iTunes:MusicBrainz Album Artist Id': ['musicbrainz_albumartistid'],
    '----:com.apple.iTunes:MusicBrainz Release Group Id': ['musicbrainz_releasegroupid'],
    '----:com.apple.iTunes:MusicBrainz Work Id': ['musicbrainz_workid'],
    '----:com.apple.iTunes:MusicBrainz TRM Id': ['musicbrainz_trmid'],
    '----:com.apple.iTunes:MusicBrainz Disc Id': ['musicbrainz_discid'],
    '----:com.apple.iTunes:Acoustid Id': ['acoustid_id'],
    '----:com.apple.iTunes:Acoustid Fingerprint': ['acoustid_fingerprint'],
    '----:com.apple.iTunes:MusicIP PUID': ['musicip_puid'],
    '----:com.apple.iTunes:fingerprint': ['musicip_fingerprint'],
    // Additional mappings:
    'gnre': ['genre'] // ToDo: check mapping
  }
}

function capitalizeAttributes (obj) {
  var newObj = {}
  for (var key in obj) {
    newObj[key.toUpperCase()] = obj[key]
  }
  return newObj
}

// Normalize (post-process) common tag mappings

// capitalize 'APEv2' tags for relax matching
mappings.APEv2 = capitalizeAttributes(mappings.APEv2)

// 'id3v2.3' & 'id3v2.4' are combined
mappings['id3v2.3'] = mappings['id3v2.4']

function getCommonName (type, tag) {
  if (!mappings.hasOwnProperty(type)) {
    throw new Error('Illegal header type: ' + type)
  }
  return mappings[type][type === 'APEv2' ? tag.toUpperCase() : tag]
}

// TODO: a string of 1of1 would fail to be converted
// converts 1/10 to no : 1, of : 10
// or 1 to no : 1, of : 0
function cleanupTrack (origVal) {
  var split = origVal.toString().split('/')
  return {
    no: parseInt(split[0], 10) || 0,
    of: parseInt(split[1], 10) || 0
  }
}

function cleanupPicture (picture) {
  var newFormat
  if (picture.format) {
    var split = picture.format.toLowerCase().split('/')
    newFormat = (split.length > 1) ? split[1] : split[0]
    if (newFormat === 'jpeg') newFormat = 'jpg'
  } else {
    newFormat = 'jpg'
  }
  return { format: newFormat, data: picture.data }
}

var headerTypes = [
  {
    buf: common.asfGuidBuf,
    tag: require('./asf')
  },
  {
    buf: new Buffer('ID3'),
    tag: require('./id3v2')
  },
  {
    buf: new Buffer('ftypM4A'),
    tag: require('./id4'),
    offset: 4
  },
  {
    buf: new Buffer('ftypmp42'),
    tag: require('./id4'),
    offset: 4
  },
  {
    buf: new Buffer('OggS'),
    tag: require('./ogg')
  },
  {
    buf: new Buffer('fLaC'),
    tag: require('./flac')
  },
  {
    buf: new Buffer('MAC'),
    tag: require('./monkeysaudio')
  }
]
