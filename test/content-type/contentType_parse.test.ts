
var assert = require('assert')
var contentType = require('..')
var deepEqual = require('deep-equal')

var invalidTypes = [
  ' ',
  'null',
  'undefined',
  '/',
  'text / plain',
  'text/;plain',
  'text/"plain"',
  'text/p£ain',
  'text/(plain)',
  'text/@plain',
  'text/plain,wrong'
]

describe('contentType.parse(string)', function () {
  it('should parse basic type', function () {
    var type = contentType.parse('text/html')
    assert.strictEqual(type.type, 'text/html')
  })

  it('should parse with suffix', function () {
    var type = contentType.parse('image/svg+xml')
    assert.strictEqual(type.type, 'image/svg+xml')
  })

  it('should parse basic type with surrounding OWS', function () {
    var type = contentType.parse(' text/html ')
    assert.strictEqual(type.type, 'text/html')
  })

  it('should parse parameters', function () {
    var type = contentType.parse('text/html; charset=utf-8; foo=bar')
    assert.strictEqual(type.type, 'text/html')
    deepEqual(type.parameters, {
      charset: 'utf-8',
      foo: 'bar'
    })
  })

  it('should parse parameters with extra LWS', function () {
    var type = contentType.parse('text/html ; charset=utf-8 ; foo=bar')
    assert.strictEqual(type.type, 'text/html')
    deepEqual(type.parameters, {
      charset: 'utf-8',
      foo: 'bar'
    })
  })

  it('should lower-case type', function () {
    var type = contentType.parse('IMAGE/SVG+XML')
    assert.strictEqual(type.type, 'image/svg+xml')
  })

  it('should lower-case parameter names', function () {
    var type = contentType.parse('text/html; Charset=UTF-8')
    assert.strictEqual(type.type, 'text/html')
    deepEqual(type.parameters, {
      charset: 'UTF-8'
    })
  })

  it('should unquote parameter values', function () {
    var type = contentType.parse('text/html; charset="UTF-8"')
    assert.strictEqual(type.type, 'text/html')
    deepEqual(type.parameters, {
      charset: 'UTF-8'
    })
  })

  it('should unquote parameter values with escapes', function () {
    var type = contentType.parse('text/html; charset = "UT\\F-\\\\\\"8\\""')
    assert.strictEqual(type.type, 'text/html')
    deepEqual(type.parameters, {
      charset: 'UTF-\\"8"'
    })
  })

  it('should handle balanced quotes', function () {
    var type = contentType.parse('text/html; param="charset=\\"utf-8\\"; foo=bar"; bar=foo')
    assert.strictEqual(type.type, 'text/html')
    deepEqual(type.parameters, {
      param: 'charset="utf-8"; foo=bar',
      bar: 'foo'
    })
  })

  invalidTypes.forEach(function (type) {
    it('should throw on invalid media type ' + type, function () {
      assert.throws(contentType.parse.bind(null, type), /invalid media type/)
    })
  })

  it('should throw on invalid parameter format', function () {
    assert.throws(contentType.parse.bind(null, 'text/plain; foo="bar'), /invalid parameter format/)
    assert.throws(contentType.parse.bind(null, 'text/plain; profile=http://localhost; foo=bar'), /invalid parameter format/)
    assert.throws(contentType.parse.bind(null, 'text/plain; profile=http://localhost'), /invalid parameter format/)
  })

  it('should require argument', function () {
    assert.throws(contentType.parse.bind(null), /string.*required/)
  })

  it('should reject non-strings', function () {
    assert.throws(contentType.parse.bind(null, 7), /string.*required/)
  })
})

describe('contentType.parse(req)', function () {
  it('should parse content-type header', function () {
    var req = { headers: { 'content-type': 'text/html' } }
    var type = contentType.parse(req)
    assert.strictEqual(type.type, 'text/html')
  })

  it('should reject objects without headers property', function () {
    assert.throws(contentType.parse.bind(null, {}), /content-type header is missing/)
  })

  it('should reject missing content-type', function () {
    var req = { headers: {} }
    assert.throws(contentType.parse.bind(null, req), /content-type header is missing/)
  })
})

describe('contentType.parse(res)', function () {
  it('should parse content-type header', function () {
    var res = { getHeader: function () { return 'text/html' } }
    var type = contentType.parse(res)
    assert.strictEqual(type.type, 'text/html')
  })

  it('should reject objects without getHeader method', function () {
    assert.throws(contentType.parse.bind(null, {}), /content-type header is missing/)
  })

  it('should reject missing content-type', function () {
    var res = { getHeader: function () {} }
    assert.throws(contentType.parse.bind(null, res), /content-type header is missing/)
  })
})
