var drop = require('drag-and-drop-files');
var musicmetadata = require('../lib');

drop(document, function (files) {
  var mm = new musicmetadata(files[0])

  mm.on('metadata', function (result) {
    var picture = result.picture[0];
    var url = URL.createObjectURL(new Blob([picture.data], {'type': 'image/' + picture.format}));
    var image = document.getElementById('myimg');
    image.src = url;

    var div = document.getElementById('info');
    div.innerText = JSON.stringify(result, undefined, 2);
  })
  mm.on('done', function (err) {
    if (err) throw err;
  })
});