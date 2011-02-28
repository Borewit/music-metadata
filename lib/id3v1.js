var common = require('./common'),
    findZero = common.findZero;
     
var id3v1 = function(stream){
    this.stream = stream;
};

module.exports = id3v1;

id3v1.prototype = new process.EventEmitter();

id3v1.prototype.parse = function(){
    var self = this;

	self.stream.on('data', function(data){
		self.stream.on('end', function(){
			if(self.stream.bufferSize >= 128){
				var offset = data.length - 128;
				var header = data.toString('utf8', offset, offset += 3);
				
				if(header === 'TAG'){
					var title = data.toString('ascii', offset, findZero(data, offset, offset += 30));
					self.emit('title', title);
					
					var artist = data.toString('ascii', offset, findZero(data, offset, offset += 30));
					self.emit('artist', artist);
					
					var album = data.toString('ascii', offset, findZero(data, offset, offset += 30));
					self.emit('album', album);
					
					var year = data.toString('ascii', offset, findZero(data, offset, offset += 4));
					self.emit('year', year);
					
					var comment = data.toString('ascii', offset, findZero(data, offset, offset + 28));
					self.emit('comment', comment);
					
					var track = data[data.length - 2];
					self.emit('track', track);
					
					var genre = common.GENRES[data[data.length - 1]];
					self.emit('genre', genre);
                    
                    self.emit('done');
				}
			}
		});
	});
}