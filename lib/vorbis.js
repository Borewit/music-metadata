var strtok = require('strtok'),
    fs = require('fs'),
    sys = require('sys'),
    common = require('./common'),
    isBitSetAt = common.isBitSetAt;
    
var vorbis = function(stream) {
    this.stream = stream;
};

module.exports = vorbis;

vorbis.prototype = new process.EventEmitter();

vorbis.prototype.parse = function() {
    var self = this;
    
    strtok.parse(self.stream, function(v, cb) {
        if (v === undefined) {
            cb.position = 'header'; //read first OggS header
            return new strtok.BufferType(27);
        }
        
        if (cb.position === 'header') {
            var header = {
                type: v.toString('utf-8', 0, 4),
                version: v[4],
                packet_flag: v[5],
                pcm_sample_pos: 'not_implemented',
                stream_serial_num: strtok.UINT32_LE.get(v, 14),
                page_number: strtok.UINT32_LE.get(v, 18),
                check_sum: strtok.UINT32_LE.get(v, 22),
                segments: v[26]
            };
            
            //read segment table
            cb.position = 'segments';
            return new strtok.BufferType(header.segments);
        }
        
        if(cb.position === 'segments') {
            cb.position = 'pagecontent';
            cb.pageLength = 0;
            
            //remember the page length incase the metadata
            //spans across multiple pages
            for(var i=0; i<= v.length -1; i++) {
                cb.pageLength += v[i];
            }
            
            if(!cb.onData) {
                //now read the header id
                return new strtok.BufferType(7);
            }
        }
        
        if (cb.position === 'pagecontent') {
            cb.pageStartPos = v.offset;
            
            //test to see if we are on metadata or something else
            if(cb.onData) {
                cb.position = 'data';
                return new strtok.BufferType(cb.pageLength);
            }
            
            //identification header (skip)
            if(v[0] === 1) {
                cb.position = 'skiptoheader';
                return new strtok.BufferType(cb.pageLength - 7);
            //metadata header
            } else if(v[0] === 3) {
                //set our current page offset incase we need to read 
                //into the next page
                cb.position = 'vendorlen'; //read vendor length
                return new strtok.BufferType(4);
            }
        }
        
        if (cb.position === 'skiptoheader') {
            //ignore data and move to next header
            cb.position = 'header';
            return new strtok.BufferType(27);
        }
        
        if (cb.position === 'vendorlen') {
            cb.position = 'vendorstring';
            var vendorLength = strtok.UINT32_LE.get(v, 0);
            return new strtok.BufferType(vendorLength);
        }
        
        if (cb.position === 'vendorstring') {
            cb.position = 'commentcount';
            return new strtok.BufferType(4);
        }
        
        if (cb.position === 'commentcount') {
            cb.position = 'commentlength';
            cb.commentCount = strtok.UINT32_LE.get(v, 0);
            //now read the length of the first comment
            return new strtok.BufferType(4);
        }
        
        if (cb.position === 'commentlength') {
            cb.position = 'comment';
            cb.comLength = strtok.UINT32_LE.get(v, 0);

            cb.pageDataRemaining = (cb.pageLength - (v.offset - cb.pageStartPos)) - 4;
            
            if(cb.comLength > cb.pageDataRemaining) {
                cb.position = 'data';
                return new strtok.BufferType(cb.pageDataRemaining);
            }

            return new strtok.BufferType(cb.comLength);
        }
        
        if(cb.position === 'data') {
            //store the data for further use
            if (cb.commentData === undefined) {
                cb.commentData = v;
            } else {
                var tempBuf = new Buffer(cb.commentData.length + v.length);
                cb.commentData.copy(tempBuf, 0, 0);
                v.copy(tempBuf, cb.commentData.length);
                cb.commentData = tempBuf;
            }
            
            if(cb.comLength <= cb.commentData.length) {
                cb.position = 'comment';
            }else {
                cb.position = 'header';
                cb.onData = true;
                //we have read all the data in the current page
                //so read the next page header
                return new strtok.BufferType(27);   
            }
        }
        
        if(cb.position === 'comment') {
            commentString = (cb.onData) ? cb.commentData.toString('utf-8') 
                                        : v.toString('utf-8');

            (cb.commentsRead !== undefined) ? cb.commentsRead++ 
                                            : cb.commentsRead = 1;
            
            var split = commentString.split('=');

            if(split[0] === 'METADATA_BLOCK_PICTURE') {  
                var picture = {},
                    decoded = new Buffer(split[1], 'base64'),
                    offset = 0;
                    
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
                
                var picDataLen = strtok.UINT32_BE.get(decoded, offset);
                offset += 4;

                picture.data = decoded.slice(offset, offset + picDataLen);
        
                split[1] = picture;
            } 
            
            self.emit(split[0].toUpperCase(), split[1]);
            
            if(cb.commentsRead === cb.commentCount) {
                self.emit('done');
                return strtok.DONE;
            }
            
            cb.position = 'commentlength';
            return new strtok.BufferType(4);
        }
    });
};