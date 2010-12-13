var ID3File = function(stream) {
    this.stream = stream;
};
module.exports = ID3File;

ID3File.prototype = new process.EventEmitter();

ID3File.prototype.parse = function() {
    var self = this,
        metadata = STANDARDMETADATA;
        
    this.stream.once('data', function(result){
        var version = 'id3v1';     
        if ('ID3' === result.toString('binary', 0, 3)) {
            version = 'id3v2';
        } else if ('ftypM4A' === result.toString('binary', 4, 11)) {
            version = 'id4';
        }
        
        var module = require('./' + version);
        var processor = new module(self.stream);
        
        processor.emit = function() {
            var event = arguments[0];
            var value = arguments[1];
            
            //emit original event
            self.emit(event, value);
       
            //rewrite to new alias
            var mappedTo;
            for(var i in MAPPINGS){
                if (MAPPINGS.hasOwnProperty(i)) {
                    var current = MAPPINGS[i];
                    if(current.from.indexOf(event) > -1){
                        mappedTo = current.to;
                        break;
                    }
                }
            }

            self.emit(mappedTo, value);

            if(metadata[mappedTo] !== undefined){
                metadata[mappedTo] = value;
            }
        };
        processor.parse();
      
        //re-emitting the same data event so the correct id3 processor picks up the stream from the start
        //is it possible that the id3 processor could pick up the NEXT event before the first one is re-emitted?
        self.stream.emit('data', result);
    });

    var done = false;
    
    self.on('done', function(){
        self.emit('metadata', metadata);
        done = true;
    });
    
    //for legacy reasons, this should be removed once all processors emit done events themselves
    self.stream.on('end', function(){
        if(!done){
            self.emit('metadata', metadata);
        } 
    });
};

var STANDARDMETADATA = {title : '', artist : '', albumartist : '', album : '', 
                        year : '', track : '', disk : '', genre : ''};

//mappings for common metadata types(id3v2.3,id3v2.2,id4)
var MAPPINGS = [
    {'to' : 'title',        'from' : ["TIT2", "TT2", "©nam"] },
    {'to' : 'artist',       'from' : ["TPE1", "TP1", "©ART"] }, 
    {'to' : 'albumartist',  'from' : ["TPE2", "TP2", "aART"] }, 
    {'to' : 'album',        'from' : ["TALB", "TAL", "©alb"] }, 
    {'to' : 'year',         'from' : ["TYER", "TYE", "©day"] }, 
    {'to' : 'comment',      'from' : ["COMM", "COM", "©cmt"] }, 
    {'to' : 'track',        'from' : ["TRCK", "TRK", "trkn"] }, 
    {'to' : 'disk',         'from' : ["TPOS", "TPA", "disk"] }, 
    {'to' : 'genre',        'from' : ["TCON", "TCO", "©gen", "gnre"] }, 
    {'to' : 'picture',      'from' : ["APIC", "PIC", "covr"] }, 
    {'to' : 'composer',     'from' : ["TCOM", "TCM", "©wrt"] }
];