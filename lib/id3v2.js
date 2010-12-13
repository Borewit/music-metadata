var strtok = require('strtok'),
      fs = require('fs'),
      parser = require('./id3v2_frames'),
      common = require('./common'),
      isBitSetAt = common.isBitSetAt;
      
var id3v2 = function(stream){
    this.stream = stream;
};

module.exports = id3v2;

id3v2.prototype = new process.EventEmitter();

id3v2.prototype.parse = function(){
    var self = this;
    strtok.parse(self.stream, function(v,cb){
        if (v === undefined){
            return new strtok.StringType(3, 'ascii');
        }
        
        if (v === 'ID3'){
            cb.header = true;
            return new strtok.BufferType(7);
        }
        
        if(cb.header){
            cb.header = false;
            //root header
            if (v[0] > 4){ 
                return strtok.DONE;
            }

            var id3 = {
                version: '2.' + v[0] + '.' + v[1],
                major: v[0],
                unsync: strtok.BITSET.get(v, 2, 7),
                xheader: strtok.BITSET.get(v, 2, 6),
                xindicator: strtok.BITSET.get(v, 2, 5),
                footer: isBitSetAt(v, 2 , 4),
                size: strtok.INT32SYNCSAFE.get(v,3)
            };

            cb.major = id3.major;

            if (id3.xheader){
                cb.xheader = true;
                return strtok.UINT32_BE;
            }
            
            //expect the first frames name next
            switch (id3.major){
                case 2 :
                    return new strtok.StringType(3, 'ascii');
                case 3 :
                    return new strtok.StringType(4, 'ascii');
                case 4 :
                    return new strtok.StringType(4, 'ascii');
            }
            
            return strtok.DONE;
        }
        
        if(cb.xheader){
            cb.xheader = false;
            //skip xheader
            return new strtok.BufferType(v);
        }

        //frame buffer
        if (typeof v === 'object' && v.length === cb.frameLength){
            var frame, encoding;
            switch (cb.major){
                case 2 :
                    encoding = getTextEncoding(v[0]);
                    frame = parser.readData(v.slice(1,v.length), cb.frameId, encoding , null, cb.major);
                    self.emit(cb.frameId, frame);
                    return new strtok.StringType(3, 'ascii');
                case 3 : case 4:
                    var sliced = v.slice(0,2);
                    var frameFlags = readFrameFlags(v.slice(0,2));
                    encoding = getTextEncoding(v[2]);
                    frame = parser.readData(v.slice(3,v.length), cb.frameId, encoding, frameFlags, cb.major);
                    self.emit(cb.frameId, frame);
                    return new strtok.StringType(4, 'ascii');
            }
        }
        
        if (typeof v === 'number'){
            //read frame including header next
            if(v > 0){
                cb.frameLength = (cb.major > 2) ? v + 2 : v;
                return new strtok.BufferType(cb.frameLength);
            }else{
                return strtok.DONE;
            }   
        }
        
        if (typeof v === 'string'){
            cb.frameId = v;
            
            // Last frame
            if (v === '' || v === '\u0000\u0000\u0000\u0000'){ 
                return strtok.DONE;
            }
            
            //check first char is a letter, bit of defensive programming             
            if('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.search(v[0]) === -1){ 
                return strtok.DONE;
            }
            
            switch (cb.major){
                case 2 :
                    return strtok.UINT24_BE;
                case 3 :
                    return strtok.UINT32_BE;
                case 4 :
                    return strtok.INT32SYNCSAFE;
            }
        }
        
    });
};

var getTextEncoding = function getTextEncoding (byte) {
    switch (byte) {
        case 0x00:
            // ISO-8859-1
            return 'ascii';
        case 0x01: case 0x02:
            return 'utf16';
        case 0x03:
            return 'utf8';
        default:
            return 'utf8';
    }
};

var readFrameFlags = function(b) {
    return {
        status: {
            tag_alter_preservation: isBitSetAt(b, 0, 6),
            file_alter_preservation: isBitSetAt(b, 0, 5),
            read_only: isBitSetAt(b, 0, 4)
        },
        format: {
            grouping_identity: isBitSetAt(b, 1, 7),
            compression: isBitSetAt(b, 1, 3),
            encryption: isBitSetAt(b, 1, 2),
            unsync: isBitSetAt(b, 1, 1),
            data_length_indicator: isBitSetAt(b, 1, 0)
        }
    };
};

strtok.UINT24_BE = {
    len : 3,
    get : function(buf, off) {
        return  (((buf[off] << 8) + buf[off + 1]) << 8) + buf[off + 2];
    }
};

strtok.BITSET = {
    len : 1,
    get : function(buf, off, bit) {
        return (buf[off] & (1 << bit)) !== 0;
    }
};

strtok.INT32SYNCSAFE = {
    len : 4,
    get : function (buf, off) {
        return buf[off + 3]   & 0x7f | 
             ((buf[off + 2]) << 7) | 
             ((buf[off + 1]) << 14) | 
             ((buf[off])     << 21);
    }
};