
var assert = require('assert')
var typer = require('..')

var invalidTypes = [
  ' ',
  'null',
  'undefined',
  '/',
  'text/;plain',
  'text/"plain"',
  'text/p£ain',
  'text/(plain)',
  'text/@plain',
  'text/plain,wrong'
]

describe('typer.format(obj)', function () {
  it('should format basic type', function () {
    var str = typer.format({ type: 'text', subtype: 'html' })
    assert.strictEqual(str, 'text/html')
  })

  it('should format type with suffix', function () {
    var str = typer.format({ type: 'image', subtype: 'svg', suffix: 'xml' })
    assert.strictEqual(str, 'image/svg+xml')
  })

  it('should require argument', function () {
    assert.throws(typer.format.bind(null), /obj.*required/)
  })

  it('should reject non-objects', function () {
    assert.throws(typer.format.bind(null, 7), /obj.*required/)
  })

  it('should require type', function () {
    assert.throws(typer.format.bind(null, {}), /invalid type/)
  })

  it('should reject invalid type', function () {
    assert.throws(typer.format.bind(null, { type: 'text/' }), /invalid type/)
  })

  it('should require subtype', function () {
    assert.throws(typer.format.bind(null, { type: 'text' }), /invalid subtype/)
  })

  it('should reject invalid subtype', function () {
    var obj = { type: 'text', subtype: 'html/' }
    assert.throws(typer.format.bind(null, obj), /invalid subtype/)
  })

  it('should reject invalid suffix', function () {
    var obj = { type: 'image', subtype: 'svg', suffix: 'xml\\' }
    assert.throws(typer.format.bind(null, obj), /invalid suffix/)
  })
})

describe('typer.parse(string)', function () {
  it('should parse basic type', function () {
    var type = typer.parse('text/html')
    assert.strictEqual(type.type, 'text')
    assert.strictEqual(type.subtype, 'html')
  })

  it('should parse with suffix', function () {
    var type = typer.parse('image/svg+xml')
    assert.strictEqual(type.type, 'image')
    assert.strictEqual(type.subtype, 'svg')
    assert.strictEqual(type.suffix, 'xml')
  })

  it('should lower-case type', function () {
    var type = typer.parse('IMAGE/SVG+XML')
    assert.strictEqual(type.type, 'image')
    assert.strictEqual(type.subtype, 'svg')
    assert.strictEqual(type.suffix, 'xml')
  })

  invalidTypes.forEach(function (type) {
    it('should throw on invalid media type ' + JSON.stringify(type), function () {
      assert.throws(typer.parse.bind(null, type), /invalid media type/)
    })
  })

  it('should require argument', function () {
    assert.throws(typer.parse.bind(null), /string.*required/)
  })

  it('should reject non-strings', function () {
    assert.throws(typer.parse.bind(null, 7), /string.*required/)
  })
})

describe('typer.test(string)', function () {
  it('should pass basic type', function () {
    assert.strictEqual(typer.test('text/html'), true)
  })

  it('should pass with suffix', function () {
    assert.strictEqual(typer.test('image/svg+xml'), true)
  })

  it('should pass upper-case type', function () {
    assert.strictEqual(typer.test('IMAGE/SVG+XML'), true)
  })

  invalidTypes.forEach(function (type) {
    it('should fail invalid media type ' + JSON.stringify(type), function () {
      assert.strictEqual(typer.test(type), false)
    })
  })

  it('should require argument', function () {
    assert.throws(typer.test.bind(null), /string.*required/)
  })

  it('should reject non-strings', function () {
    assert.throws(typer.test.bind(null, 7), /string.*required/)
  })
})