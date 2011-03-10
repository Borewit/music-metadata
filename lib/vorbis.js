var strtok = require('strtok'),
    fs = require('fs'),
    sys = require('sys'),
    common = require('./common'),
    isBitSetAt = common.isBitSetAt;
    
var vorbis = function(stream){
    this.stream = stream;
};

module.exports = vorbis;

vorbis.prototype = new process.EventEmitter();

vorbis.prototype.parse = function() {
    var self = this;
    
    strtok.parse(self.stream, function(v,cb){
        if(v === undefined){
            //read vorbis header
            cb.position = 'header';
            return new strtok.BufferType(27);
        }
        
        if(cb.position === 'header')
        {
            var header = {
                type: v.toString('utf-8',0,4),
                version: v[4],
                packet_flag: readHeaderPacketFlag(v,5),
                pcm_sample_pos: 'not_implemented',
                stream_serial_num: strtok.UINT32_LE.get(v,14),
                page_number: strtok.UINT32_LE.get(v,18),
                check_sum: strtok.UINT32_LE.get(v,22),
                segments: v[26]
            };
            
            throw new Error('uh oh');
            
            //read segment table
            cb.position = 'segments';
            return new strtok.BufferType(header.segments);
        }
        
        if (cb.position === 'segments'){
            //ignore the segments and read header id '1vorbis' etc
            cb.position = 'headerid';
            return new strtok.BufferType(7);
        }
        
        if (cb.idHeader){
            cb.idHeader = false; 
            //now read metadata frame
            return new strtok.BufferType(27);
        }
        
        if (cb.vendorLen){
            cb.vendorLen = false;
            
            cb.vendorString = true;
            return new strtok.StringType(v);
        }
        
        if (cb.vendorString){
            cb.vendorString = false;
            
            cb.commentCount = true;
            return strtok.UINT32_LE;
        }
        
        if (cb.commentCount){
            cb.commentCount = false;
            cb.commentsRead = 0;
            
            //now read the length of the first comment
            cb.commentLength = true;
            return strtok.UINT32_LE;
        }
        
        if (cb.commentLength){
            cb.commentLength = false;
            cb.comment = true;
            console.log('comment length: ' + v);
            return new strtok.StringType(v);
        }
        
        if(cb.comment){
            cb.comment = false;
            cb.commentsRead++;
            
            if(cb.commentsRead === cb.commentCount){
                return strtok.DONE;
            }
            
            

            var split = v.split('=');
            
            console.log('total length: ' + split[1].length);

            if(split[0] !== 'METADATA_BLOCK_PICTURE'){
                console.log(split);
            }
                       
            if(split[0] === 'METADATA_BLOCK_PICTURE'){
            
                var picture = {},
                    decoded = new Buffer(split[1], 'base64'),
                    offset = 0;
                    
                console.log(decoded.length);
                    
                picture.format = common.PICTURE_TYPE[strtok.UINT32_BE.get(decoded, 0)];
                offset += 4;
                var mimeLen = strtok.UINT32_BE.get(decoded, offset);
                offset += 4;
                picture.type = decoded.toString('utf-8', offset, offset + mimeLen);
                offset += mimeLen;
                var descLen = strtok.UINT32_BE.get(decoded, offset);
                offset += 4;
                picture.description = decoded.toString('utf-8', offset, offset + descLen);
                offset += descLen;
                picture.width = strtok.UINT32_BE.get(decoded, offset);
                offset += 4;
                picture.height = strtok.UINT32_BE.get(decoded, offset);
                offset += 4;
                picture.colour_depth = strtok.UINT32_BE.get(decoded, offset);
                offset += 4;
                picture.indexed_color = strtok.UINT32_BE.get(decoded, offset);
                offset += 4;
                
                console.log(picture);
                
                
                var picDataLen = strtok.UINT32_BE.get(decoded, offset);
                offset += 4;
                console.log(picDataLen);
                

                console.log(decoded.length);
                console.log(offset + picDataLen);
                
                offset +=4;
                picture.data = decoded.slice(offset);
                
                console.log(picture.data.length);
                split[1] = picture;
                
                //console.log(picture.data.length);
            }
              
            self.emit(split[0].toUpperCase(), split[1]);
            cb.commentLength = true;
            return strtok.UINT32_LE;
        }
        
        //header id
        if (cb.position === 'headerid'){
            //identification header (skip);
            if(v[0] === 1){
                cb.idHeader = true;
                return new strtok.BufferType(23);
            }
            //metadata header
            if(v[0] === 3){
                //read vendor length
                cb.vendorLen = true;
                return strtok.UINT32_LE;
            }
        }
    });
};

var readHeaderPacketFlag = function(buffer, offset){
    if(isBitSetAt(buffer,offset,0)){
        return 'continued';
    }
    if(isBitSetAt(buffer,offset,1)){
        return 'first';
    }
    if(isBitSetAt(buffer,offset,2)){
        return 'last';
    }
    return '';
}