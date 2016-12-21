/* jshint maxlen: 140 */
'use strict'

var test = require('tape')
var TagMap = require('../lib/tagmap').default

test('tagmap', function (t) {
  t.plan(6)

  // Check mappings
  t.doesNotThrow(function () {
    for (var type in TagMap.mappings) {
      var typeMap = TagMap.mappings[type]
      for (var tag in typeMap) {
        var commonType = typeMap[tag]
        if (!TagMap.common.hasOwnProperty(commonType)) {
          throw 'Unknown common headerType in mapping ' + type + '.' + tag + ' => ' + commonType
        }
      }
    }
  })

  // common tags, singleton
  t.ok(TagMap.isSingleton('title'), 'common tag "title" is a singleton')
  t.ok(TagMap.isSingleton('artist'), 'common tag "artist" is a singleton')
  t.ok(!TagMap.isSingleton('artists'), 'common tag "artists" is not a singleton')

  var tagMap = new TagMap

  // native tags, singleton
  t.ok(tagMap.isNativeSingleton('vorbis', 'TITLE'), 'Vorbis tag "TITLE" is a singleton')
  t.ok(!tagMap.isNativeSingleton('vorbis', ' METADATA_BLOCK_PICTURE'), 'Vorbis tag " METADATA_BLOCK_PICTURE" is not a singleton')

})
