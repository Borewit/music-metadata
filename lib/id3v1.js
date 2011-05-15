var common = require('./common');
     
var Id3v1 = module.exports = function(stream) {
  this.stream = stream;
  this.parse();
};

Id3v1.prototype = new process.EventEmitter();

Id3v1.prototype.parse = function() {
  var self = this;

  //TODO: this implementation is totally broken because of the way
  //close / end is called on streams
	self.stream.on('data', function(data) {
	  self.stream.on('end', function() {
		  if (self.stream.bufferSize >= 128) {
        var offset = data.length - 128;
        var header = data.toString('utf8', offset, offset += 3);
				
				if (header === 'TAG') {
					var title = data.toString('ascii', offset, offset += 30);
					self.emit('title', title.trim().replace(/\x00/g,''));
					
					var artist = data.toString('ascii', offset, offset += 30);
					self.emit('artist', artist.trim().replace(/\x00/g,''));
				
					var album = data.toString('ascii', offset, offset += 30);
					self.emit('album', album.trim().replace(/\x00/g,''));
					
					var year = data.toString('ascii', offset, offset += 4);
					self.emit('year', year.trim().replace(/\x00/g,''));
					
					var comment = data.toString('ascii', offset, offset += 28);
					self.emit('comment', comment.trim().replace(/\x00/g,''));
					
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