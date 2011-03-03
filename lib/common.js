exports.removeUnsyncBytes = function(bytes) {
    var output = [],
        safe = true;
    
    for (var i = 0; i < bytes.length ; i++) {
        var val = bytes[i];
        if(safe){
            output.push(val);
            safe = (val !== 0xFF);
        }else{
            if(val !== 0x00){
                output.push(val);
            }else{
                //console.log('found unsync byte at: ' + i);
            }
            safe = true;
        }
    }
    return new Buffer(output);
};

exports.findZero = function (buffer, start, end) {
    var i = start;
    while (buffer[i] !== 0) {
        if (i >= end) {
            return end;
        }
        i++;
    }
    return i;
};

exports.isBitSetAt = function isBitSetAt (b, offset, bit) {
    return (b[offset] & (1 << bit)) !== 0;
};

var readUTF16String = function readUTF16String (bytes) {
    var ix = 0,
        offset1 = 1,
        offset2 = 0,
        maxBytes = bytes.length;

    if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
        bigEndian = true;
        ix = 2;
        offset1 = 0;
        offset2 = 1;
    } else if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
        bigEndian = false;
        ix = 2;
    }

    var str = '';
    for (var j = 0; ix < maxBytes; j++) {
        var byte1 = bytes[ix + offset1],
        byte2 = bytes[ix + offset2],
        word1 = (byte1 << 8) + byte2;
        ix += 2;

        if (word1 === 0x0000) {
            break;
        } else if (byte1 < 0xD8 || byte1 >= 0xE0) {
            str += String.fromCharCode(word1);
        } else {
            var byte3 = bytes[ix+offset1],
            byte4 = bytes[ix+offset2],
            word2 = (byte3 << 8) + byte4;
            ix += 2;
            str += String.fromCharCode(word1, word2);
        }
    }
    return str;
};

var decodeString = exports.decodeString = function decodeString(b, charset, start, end) {
    var text;
    switch (charset) {
        case 'ascii':
            return {
                text: b.toString(charset, start, end),
                length: end - start
            };
        case 'utf16':
            var bytes = b.slice(start, end);
            text = readUTF16String(bytes);
            return {
                text: text,
                length: text.length
            };
        case 'utf8':
            text = b.toString(charset, start, end);
            return {
                text: text,
                length: Buffer.byteLength(text)
            };
    }
};

exports.PICTURE_TYPE = [
    "Other",
    "32x32 pixels 'file icon' (PNG only)",
    "Other file icon",
    "Cover (front)",
    "Cover (back)",
    "Leaflet page",
    "Media (e.g. lable side of CD)",
    "Lead artist/lead performer/soloist",
    "Artist/performer",
    "Conductor",
    "Band/Orchestra",
    "Composer",
    "Lyricist/text writer",
    "Recording Location",
    "During recording",
    "During performance",
    "Movie/video screen capture",
    "A bright coloured fish",
    "Illustration",
    "Band/artist logotype",
    "Publisher/Studio logotype"
];

exports.GENRES = ['Blues','Classic Rock','Country','Dance','Disco','Funk','Grunge','Hip-Hop',
    'Jazz','Metal','New Age','Oldies','Other','Pop','R&B','Rap','Reggae','Rock',
    'Techno','Industrial','Alternative','Ska','Death Metal','Pranks','Soundtrack',
    'Euro-Techno','Ambient','Trip-Hop','Vocal','Jazz+Funk','Fusion','Trance',
    'Classical','Instrumental','Acid','House','Game','Sound Clip','Gospel','Noise',
    'Alt. Rock','Bass','Soul','Punk','Space','Meditative','Instrumental Pop',
    'Instrumental Rock','Ethnic','Gothic','Darkwave','Techno-Industrial',
    'Electronic','Pop-Folk','Eurodance','Dream','Southern Rock','Comedy','Cult',
    'Gangsta Rap','Top 40','Christian Rap','Pop/Funk','Jungle','Native American',
    'Cabaret','New Wave','Psychedelic','Rave','Showtunes','Trailer','Lo-Fi','Tribal',
    'Acid Punk','Acid Jazz','Polka','Retro','Musical','Rock & Roll','Hard Rock',
    'Folk','Folk/Rock','National Folk','Swing','Fast-Fusion','Bebob','Latin','Revival',
    'Celtic','Bluegrass','Avantgarde','Gothic Rock','Progressive Rock','Psychedelic Rock',
    'Symphonic Rock','Slow Rock','Big Band','Chorus','Easy Listening','Acoustic','Humour',
    'Speech','Chanson','Opera','Chamber Music','Sonata','Symphony','Booty Bass','Primus',
    'Porn Groove','Satire','Slow Jam','Club','Tango','Samba','Folklore',
    'Ballad','Power Ballad','Rhythmic Soul','Freestyle','Duet','Punk Rock','Drum Solo',
    'A Cappella','Euro-House','Dance Hall','Goa','Drum & Bass','Club-House',
    'Hardcore','Terror','Indie','BritPop','Negerpunk','Polsk Punk','Beat',
    'Christian Gangsta Rap','Heavy Metal','Black Metal','Crossover','Contemporary Christian',
    'Christian Rock','Merengue','Salsa','Thrash Metal','Anime','JPop','Synthpop'];