var Buffer = require('buffer').Buffer,
      strtok = require('strtok'),
      common = require('./common'),
      findZero = common.findZero,
      decodeString = common.decodeString;

exports.readData = function readData (b, type, encoding, flags, major) {
    major || (major = 3);
    var length = b.length;

    var orig_type = type;
    if (type[0] === 'T') type = 'T*';

    switch (type) {
        case 'PIC':
        case 'APIC':
            var offset = 0,
                  pic = {};

            switch (major) {
                case 2:
                    pic.format =  b.toString('ascii', offset, offset + 3);
                    offset += 3;
                    break;
                case 3:
                case 4:
                    pic.format =  decodeString(b, encoding, offset, findZero(b, offset, length));
                    offset += 1 + pic.format.length;
                    pic.format =  pic.format.text;
                    break;
            }

            pic.type =  PICTURE_TYPE[b[offset]];
            offset   += 1;

            pic.description =  decodeString(b, encoding, offset, findZero(b, offset, length));
            offset += 1 + pic.description.length;
            pic.description =  pic.description.text;
            pic.data = data = b.slice(offset, length);
            return pic;

        case 'COM':
        case 'COMM':
            var offset = 0,
                  comment = {};

            comment.language = b.toString('ascii', offset, offset + 3);
            offset += 3;

            comment.short_description = decodeString(b, encoding, offset, findZero(b, offset, length));
            offset += 1 + comment.short_description.length;
            comment.short_description = comment.short_description.text.trim().replace(/\x00/g,'');
            comment.text = decodeString(b, encoding, offset, length).text.trim().replace(/\x00/g,'');
            return comment;

        case 'CNT':
        case 'PCNT':
            return strtok.UINT32_BE.get(b, 0);

        case 'T*':
            var decoded = decodeString(b, encoding, 0, length).text;
            //trim any whitespace and any leading or trailing null characters
            decoded = decoded.trim().replace(/^\x00+/,'').replace(/\x00+$/,'');
            //convert to an array split by null characters
            text = decoded.split(/\x00/g);

        switch(orig_type) {
            case 'TCO':
            case 'TCON':
                var split = text[0].trim().split(/\((.*?)\)/g).filter(function(val) { return val !== ''; });	
                //match everything inside parentheses	
                var paired = [];
                for(var i in split){
                    var cur = split[i];
                    if(!isNaN(parseInt(cur))){
                        var result = common.GENRES[cur];
                        i++;
                        cur = split[i];
                        //if we can't convert the string to an int then we know its a proper string
                        if(cur !== undefined && isNaN(parseInt(cur))){
                            //we have found a proper string next to a number, probably the refinement
                            if(cur[0] === '('){
                                cur = cur.substring(1);
                            }
                            result = cur;
                        }
                        paired.push(result);
                    }
                }
                if(paired.length > 0) text = paired;
        }
    
        return text;

        case 'ULT':
        case 'USLT':
            var offset = 0,
                  lyrics  = {};

            lyrics.language = b.toString('ascii', offset, offset + 3);
            offset += 3;
            lyrics.descriptor =  decodeString(b, encoding, offset, findZero(b, offset, length));
            offset += 1 + lyrics.descriptor.length;
            lyrics.descriptor =  lyrics.descriptor.text;
            lyrics.text = decodeString(b, encoding, offset, length);
            lyrics.text = lyrics.text.text;
            return lyrics;
    }
};

var PICTURE_TYPE = exports.PICTURE_TYPE = [
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