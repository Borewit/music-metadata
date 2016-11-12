/* jshint maxlen: 140 */
'use strict'

var test = require('tape')
var tagmap = require('../lib/tagmap')

test('tagmap', function (t) {
  t.plan(5)

  // Check mappings
  t.doesNotThrow(function () {
    for (var type in tagmap.mappings) {
      var typeMap = tagmap.mappings[type]
      for (var tag in typeMap) {
        var commonType = typeMap[tag]
        if (!tagmap.common.hasOwnProperty(commonType)) {
          throw 'Unknown common type in mapping ' + type + '.' + tag + ' => ' + commonType
        }
      }
    }
  })

  // common tags, singleton
  t.ok(tagmap.isSingleton('title'), 'common tag "title" is a singleton')
  t.ok(!tagmap.isSingleton('artist'), 'common tag "artist" is not a singleton')

  // native tags, singleton
  t.ok(tagmap.isNativeSingleton('vorbis', 'TITLE'), 'Vorbis tag "TITLE" is a singleton')
  t.ok(!tagmap.isNativeSingleton('vorbis', 'ARTIST'), 'Vorbis tag "ARTIST" is not a singleton')

})
