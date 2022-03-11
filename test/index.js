/* eslint-disable node/no-unpublished-require */

const assert = require('assert')
const { it, describe } = require('mocha')
const Metalsmith = require('metalsmith')
const metadata = require('../lib')

describe('@metalsmith/metadata', function () {
  it('should parse JSON', function (done) {
    const m = Metalsmith('test/fixtures/json').use(metadata({ file: 'src/data.json' }))
    m.build(function (err) {
      if (err) return done(err)
      assert.deepStrictEqual(m.metadata().file, { string: 'string' })
      done()
    })
  })

  it('should parse YAML', function (done) {
    const m = Metalsmith('test/fixtures/yaml').use(metadata({ file: 'src/data.yaml' }))
    m.build(function (err) {
      if (err) return done(err)
      assert.deepStrictEqual(m.metadata().file, { string: 'string' })
      done()
    })
  })

  it('should parse TOML', function (done) {
    // run this test locally after running "npm i toml"
    it.skip()
    const m = Metalsmith('test/fixtures/toml').use(metadata({ file: 'src/data.toml' }))
    m.build(function (err) {
      if (err) return done(err)
      assert.deepStrictEqual(m.metadata().file, { string: 'string' })
      done()
    })
  })

  it('should resolve relative paths to metalsmith.directory()', function (done) {
    const m = Metalsmith('test/fixtures/yaml').use(metadata({ file: './src/data.yaml' }))
    m.build(function (err) {
      if (err) return done(err)
      assert.deepStrictEqual(m.metadata().file, { string: 'string' })
      done()
    })
  })

  it('should resolve absolute paths to metalsmith.directory()', function (done) {
    const m = Metalsmith('test/fixtures/yaml')
    m.use(metadata({ file: m.directory() + '/src/data.yaml' }))
    m.build(function (err) {
      if (err) return done(err)
      assert.deepStrictEqual(m.metadata().file, { string: 'string' })
      done()
    })
  })

  it('should parse a file even if the key exists if the file is in the bundle', function (done) {
    const m = Metalsmith('test/fixtures/duplicate')
      .use(metadata({ file: 'src/data.json' }))
      .use(metadata({ file: 'src/data2.json' }))
    m.build(function (err) {
      if (err) return done(err)
      assert.deepStrictEqual(m.metadata().file, { string: 'string2' })
      done()
    })
  })

  it('should parse nested path', function (done) {
    const m = Metalsmith('test/fixtures/nested').use(metadata({ file: 'src/path/data.yaml' }))
    m.build(function (err) {
      if (err) return done(err)
      assert.deepStrictEqual(m.metadata().file, { string: 'string' })
      done()
    })
  })

  it('should parse deep nested path', function (done) {
    const m = Metalsmith('test/fixtures/deep-nested').use(
      metadata({ file: 'src/path/path/data.yaml' })
    )
    m.build(function (err) {
      if (err) return done(err)
      assert.deepStrictEqual(m.metadata().file, { string: 'string' })
      done()
    })
  })

  it('should allow merging files into an array', function (done) {
    const m = Metalsmith('test/fixtures/array-merge').use(metadata({ arr: 'src/metadata' }))
    m.build(function (err) {
      if (err) return done(err)
      assert.deepStrictEqual(m.metadata().arr, [{ id: 1 }, { id: 2 }])
      done()
    })
  })

  it('should allow merging files into a nested object', function (done) {
    const m = Metalsmith('test/fixtures/object-merge').use(metadata({ config: 'src/metadata' }))
    m.build(function (err) {
      if (err) return done(err)
      assert.deepStrictEqual(m.metadata().config, {
        metatags: [{ name: 'description', value: 'Hello world' }],
        navitems: [
          { uri: '/', label: 'Home' },
          { uri: '/about', label: 'About' }
        ]
      })
      done()
    })
  })

  it('should allow merging metadata into a nested keypath', function (done) {
    const m = Metalsmith('test/fixtures/nested-keypath').use(
      metadata({ 'config.metadata': 'src/metadata.yml' })
    )
    m.build(function (err) {
      if (err) return done(err)
      assert.deepStrictEqual(m.metadata().config, { metadata: { string: 'string' } })
      done()
    })
  })

  it('should support nested directories through multiple entries', function (done) {
    const m = Metalsmith('test/fixtures/nested-directories').use(
      metadata({
        'config.metadata.extra': 'data',
        'config.metadata.extra.yaml': 'data/nested'
      })
    )
    m.build(function (err) {
      if (err) return done(err)
      assert.deepStrictEqual(m.metadata().config, {
        metadata: { extra: { json: 'string', yaml: { bool: true } } }
      })
      done()
    })
  })

  describe('External metadata', function () {
    it('should add an external file to metadata', function (done) {
      const m = Metalsmith('test/fixtures/external-file').use(metadata({ data: 'data/test.json' }))
      m.build(function (err) {
        if (err) return done(err)
        assert.deepStrictEqual(m.metadata().data, { json: 'string' })
        done()
      })
    })

    it('should add all external files in a folder', function (done) {
      const m = Metalsmith('test/fixtures/external-folder').use(metadata({ data: 'data' }))
      m.build(function (err) {
        if (err) return done(err)
        assert.deepStrictEqual(m.metadata().data, { json: 'string', yaml: { bool: true } })
        done()
      })
    })
  })

  describe('Error handling', function () {
    it('should error for unsupported extensions', function (done) {
      Metalsmith('test/fixtures/unsupported-ext')
        .use(metadata({ file: 'src/data.txt' }))
        .build(function (err) {
          assert(err)
          assert(err.message.startsWith('unsupported data format'))
          done()
        })
    })

    it('should error when TOML is not installed', function (done) {
      // run this test locally by removing it.skip & running "npm remove toml"
      it.skip()
      const Metalsmith = require('metalsmith')
      Metalsmith('test/fixtures/toml')
        .use(metadata({ file: 'src/data.toml' }))
        .build(function (err) {
          if (!err) done(new Error('No error was thrown'))
          assert(err)
          assert(err.message.startsWith('To use toml you must install it first'))
          done()
        })
    })

    it('should error for malformed data', function (done) {
      Metalsmith('test/fixtures/malformed')
        .use(metadata({ file: 'src/data.json' }))
        .build(function (err) {
          if (!err) done(new Error('No error was thrown'))
          assert(err.message.startsWith('malformed data'))
          done()
        })
    })

    it('should error for single-file entries that are not found', function (done) {
      Metalsmith('test/fixtures/incorrect-path')
        .use(metadata({ file: 'src/data-incorrect.json' }))
        .build(function (err) {
          if (!err) done(new Error('No error was thrown'))
          assert(err.message.startsWith('No matching file found for entry'))
          done()
        })
    })

    it('should error for single-file entries that are not found (outside source dir)', function (done) {
      Metalsmith('test/fixtures/incorrect-path')
        .use(metadata({ file: 'data-incorrect.json' }))
        .build(function (err) {
          if (!err) done(new Error('No error was thrown'))
          assert(err.message.startsWith('No matching file found for entry'))
          done()
        })
    })
  })
})
