var strtok = require('strtok'),
    common = require('./common'),
    fs = require('fs'),
    sys = require('sys');

var id4 = function(stream){
    this.stream = stream;
};

module.exports = id4;

id4.prototype = new process.EventEmitter();

id4.prototype.parse = function() {
    var self = this,
        metaAtomsTotal = 0;

    strtok.parse(self.stream, function(v,cb){
        //the very first thing we expect to see is the first atom's length
        if (v === undefined){ 
            return strtok.UINT32_BE;
        }

        if (typeof v === 'string'){
            cb.atomName = v;

            //meta has 4 bytes padding at the start (skip)
            if (v === 'meta'){ 
                return new strtok.BufferType(4);
            }

            //skip container atoms
            if (!~CONTAINER_ATOMS.indexOf(v)){
                return new strtok.BufferType(cb.atomLength - 8);
            }else{
                cb.atomContainer = v;
                cb.atomContainerLength = cb.atomLength;
            }
        }
        
        //we can stop processing atoms once we get to the end of the ilst atom
        if(metaAtomsTotal >= cb.atomContainerLength - 8){
            self.emit('done');
            return strtok.DONE;
        }
        
        //only process atoms that fall under the ilst atom (metadata)
        if (typeof v === 'object' && cb.atomContainer ==='ilst'){
            var result = processMetaAtom(v, cb.atomName);
            metaAtomsTotal += cb.atomLength;
            self.emit(cb.atomName, result);
        }

        //expect the atom name next
        if (!cb.atomLength || cb.atomLength === -1){
            cb.atomLength = v;
            return new strtok.StringType(4, 'binary');
        }

        cb.atomLength = -1;
        return strtok.UINT32_BE;
    });

    function processMetaAtom(data, atomName){
        var length = strtok.UINT32_BE.get(data, 0);
        var type = TYPES[strtok.UINT32_BE.get(data, 8)];

        switch (type){
            case 'text' :
            return data.toString('utf8', 16, length);
            case 'uint8' :
                if (atomName === 'gnre'){
                    var genreInt = strtok.UINT16_BE.get(data, 16);
                    return common.GENRES[genreInt -1];
                }

                if (atomName === 'trkn' || atomName == 'disk'){
                    return [ data[19], data[21] ];
                }

                return strtok.UINT16_BE.get(data, 16);

            case 'jpeg' : case 'png' :
                return {
                    format : 'image/' + type,
                    data : data.slice(16, length)
                };
        }
    }

    var TYPES = {
        '0' : 'uint8',
        '1' : 'text',
        '13' : 'jpeg',
        '14' : 'png',
        '21' : 'uint8'
    };

    var CONTAINER_ATOMS = [
        'moov',
        'udta',
        'meta',
        'ilst'
    ];
};
