var path = require('path')
var fs = require('fs')
var mm = require('..')
var test = require('tape')

test('id4', function (t) {
  t.plan(33)

  var filename = 'id4.m4a';
  var filePath = path.join(__dirname, 'samples', filename);

  mm.parseFile(filePath, { duration: true }).then(function (result) {

    t.strictEqual(result.format.duration, 2.2058956916099772, 'format.duration')

    t.strictEqual(result.common.title, 'Voodoo People (Pendulum Remix)', 'title')
    t.strictEqual(result.common.artist, 'The Prodigy', 'artist')
    t.strictEqual(result.common.albumartist, 'Pendulum', 'albumartist')
    t.strictEqual(result.common.album, 'Voodoo People', 'album')
    t.strictEqual(result.common.year, 2005, 'year')
    t.strictEqual(result.common.track.no, 1, 'track no')
    t.strictEqual(result.common.track.of, 12, 'track of')
    t.strictEqual(result.common.disk.no, 1, 'disk no')
    t.strictEqual(result.common.disk.of, 1, 'disk of')
    t.strictEqual(result.common.genre[0], 'Electronic', 'genre')
    t.strictEqual(result.common.picture[0].format, 'jpg', 'picture 0 format')
    t.strictEqual(result.common.picture[0].data.length, 196450, 'picture 0 length')
    t.strictEqual(result.common.picture[1].format, 'jpg', 'picture 1 format')
    t.strictEqual(result.common.picture[1].data.length, 196450, 'picture 1 length')

    var native = result.native.m4a;
    t.ok(native, 'Native m4a tags should be present')

    i=0;
    t.deepEqual(native[i++], {id: 'trkn', value: '1/12'}, 'm4a.trkn');
    t.deepEqual(native[i++], {id: 'disk', value: '1/1'}, 'm4a.disk');
    t.deepEqual(native[i++], {id: 'tmpo', value: 0}, 'm4a.tmpo');
    t.deepEqual(native[i++], {id: 'gnre', value: 'Electronic'}, 'm4a.gnre');
    t.deepEqual(native[i++], {id: 'stik', value: 1}, 'm4a.stik');
    t.deepEqual(native[i++], {id: '©alb', value: 'Voodoo People'}, 'm4a.©alb');
    t.deepEqual(native[i++], {id: 'aART', value: 'Pendulum'}, 'm4a.aART');
    t.deepEqual(native[i++], {id: '©ART', value: 'The Prodigy'}, 'm4a.©ART');
    t.deepEqual(native[i++], {id: '©cmt', value: '(Pendulum Remix)'}, 'm4a.©cmt');
    t.deepEqual(native[i++], {id: '©wrt', value: 'Liam Howlett'}, 'm4a.©wrt');
    t.deepEqual(native[i++], {id: '----:com.apple.iTunes:iTunNORM', value: ' 0000120A 00001299 00007365 0000712F 0002D88B 0002D88B 00007F2B 00007F2C 0003C770 0001F5C7'}, 'm4a.----:com.apple.iTunes:iTunNORM');
    t.deepEqual(native[i++], {id: '©nam', value: 'Voodoo People (Pendulum Remix)'}, 'm4a.©nam');
    t.deepEqual(native[i++], {id: '©too', value: 'Lavf52.36.0'}, 'm4a.©too');
    t.deepEqual(native[i++], {id: '©day', value: '2005'}, 'm4a.@day');

    var covr = native[i++];
    t.strictEqual(covr.id, 'covr', 'm4a.covr');
    t.strictEqual(covr.value.format, 'image/jpeg', 'm4a.covr.format');
    t.strictEqual(covr.value.data.length, 196450, 'm4a.covr.data.length');

    t.end()
  }).catch(function (err) {
    t.error(err, 'no error')
  });

  /*
    // raw tests
    .on('trkn', function (result) {
      t.strictEqual(result, '1/12', 'raw trkn')
    })
    .on('tmpo', function (result) {
      t.strictEqual(result, 0, 'raw tmpo')
    })
    .on('gnre', function (result) {
      t.strictEqual(result, 'Electronic', 'raw gnre')
    })
    .on('stik', function (result) {
      t.strictEqual(result, 1, 'raw stik')
    })
    .on('©alb', function (result) {
      t.strictEqual(result, 'Voodoo People', 'raw ©alb')
    })
    .on('©ART', function (result) {
      t.strictEqual(result, 'The Prodigy', 'raw ©ART')
    })
    .on('aART', function (result) {
      t.strictEqual(result, 'Pendulum', 'raw aART')
    })
    .on('©cmt', function (result) {
      t.strictEqual(result, '(Pendulum Remix)', 'raw ©cmt')
    })
    .on('©wrt', function (result) {
      t.strictEqual(result, 'Liam Howlett', 'raw ©wrt')
    })
    .on('©nam', function (result) {
      t.strictEqual(result, 'Voodoo People (Pendulum Remix)', 'raw ©nam')
    })
    .on('©too', function (result) {
      t.strictEqual(result, 'Lavf52.36.0', 'raw ©too')
    })
    .on('©day', function (result) {
      t.strictEqual(result, '2005', 'raw ©day')
    })
    // raised twice (exact same content)
    .on('covr', function (result) {
      t.strictEqual(result.format, 'image/jpeg', 'raw covr format (asserted twice)')
      t.strictEqual(result.data.length, 196450, 'raw covr length (asserted twice)')
    })*/
})
