/* eslint-env node, mocha */

const assert = require('assert')
const Metalsmith = require('metalsmith')
const metadata = require('..')
const { name } = require('../package.json')

describe('@metalsmith/metadata', function () {
  it('should export a named plugin function matching package.json name', function () {
    const namechars = name.split('/')[1]
    const camelCased = namechars.split('').reduce((str, char, i) => {
      str += namechars[i - 1] === '-' ? char.toUpperCase() : char === '-' ? '' : char
      return str
    }, '')
    assert.deepStrictEqual(metadata().name, camelCased)
  })

  it('should parse JSON', function (done) {
    const m = Metalsmith('test/fixtures/json')
      .env('DEBUG', process.env.DEBUG)
      .use(metadata({ file: 'src/data.json' }))
    m.build(function (err) {
      if (err) return done(err)
      assert.deepStrictEqual(m.metadata().file, { string: 'string' })
      done()
    })
  })

  it('should parse YAML', function (done) {
    const m = Metalsmith('test/fixtures/yaml')
      .env('DEBUG', process.env.DEBUG)
      .use(metadata({ file: 'src/data.yaml' }))
    m.build(function (err) {
      if (err) return done(err)
      assert.deepStrictEqual(m.metadata().file, { string: 'string' })
      done()
    })
  })

  it('should parse TOML', function (done) {
    // run this test locally after running "npm i toml" & removing this.skip
    this.skip()
    const m = Metalsmith('test/fixtures/toml')
      .env('DEBUG', process.env.DEBUG)
      .use(metadata({ file: 'src/data.toml' }))
    m.build(function (err) {
      if (err) return done(err)
      assert.deepStrictEqual(m.metadata().file, { string: 'string' })
      done()
    })
  })

  it('should resolve relative paths to metalsmith.directory()', function (done) {
    const m = Metalsmith('test/fixtures/yaml')
      .env('DEBUG', process.env.DEBUG)
      .use(metadata({ file: './src/data.yaml' }))
    m.build(function (err) {
      if (err) return done(err)
      assert.deepStrictEqual(m.metadata().file, { string: 'string' })
      done()
    })
  })

  it('should resolve absolute paths to metalsmith.directory()', function (done) {
    const m = Metalsmith('test/fixtures/yaml')
    m.env('DEBUG', process.env.DEBUG)
    m.use(metadata({ file: m.directory() + '/src/data.yaml' }))
    m.build(function (err) {
      if (err) return done(err)
      assert.deepStrictEqual(m.metadata().file, { string: 'string' })
      done()
    })
  })

  it('should parse a file even if the key exists if the file is in the bundle', function (done) {
    const m = Metalsmith('test/fixtures/duplicate')
      .env('DEBUG', process.env.DEBUG)
      .use(metadata({ file: 'src/data.json' }))
      .use(metadata({ file: 'src/data2.json' }))
    m.build(function (err) {
      if (err) return done(err)
      assert.deepStrictEqual(m.metadata().file, { string: 'string2' })
      done()
    })
  })

  it('should parse nested path', function (done) {
    const m = Metalsmith('test/fixtures/nested')
      .env('DEBUG', process.env.DEBUG)
      .use(metadata({ file: 'src/path/data.yaml' }))
    m.build(function (err) {
      if (err) return done(err)
      try {
      assert.deepStrictEqual(m.metadata().file, { string: 'string' })
      done()
      } catch (err) {
        done(err)
      }
    })
  })

  it('should parse deep nested path', function (done) {
    const m = Metalsmith('test/fixtures/deep-nested')
      .env('DEBUG', process.env.DEBUG)
      .use(metadata({ file: 'src/path/path/data.yaml' }))
    m.build(function (err) {
      if (err) return done(err)
      assert.deepStrictEqual(m.metadata().file, { string: 'string' })
      done()
    })
  })

  it('should allow merging files into an array', function (done) {
    const m = Metalsmith('test/fixtures/array-merge')
      .env('DEBUG', process.env.DEBUG)
      .use(metadata({ arr: 'src/metadata' }))
    m.build(function (err) {
      if (err) return done(err)
      assert.deepStrictEqual(m.metadata().arr, [{ id: 1 }, { id: 2 }])
      done()
    })
  })

  it('should allow merging files into a nested object', function (done) {
    const m = Metalsmith('test/fixtures/object-merge')
      .env('DEBUG', process.env.DEBUG)
      .use(metadata({ config: 'src/metadata' }))
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
    const m = Metalsmith('test/fixtures/nested-keypath')
      .env('DEBUG', process.env.DEBUG)
      .use(metadata({ 'config.metadata': 'src/metadata.yml' }))
    m.build(function (err) {
      if (err) return done(err)
      assert.deepStrictEqual(m.metadata().config, { metadata: { string: 'string' } })
      done()
    })
  })

  it('should support nested directories through multiple entries', function (done) {
    const m = Metalsmith('test/fixtures/nested-directories')
      .env('DEBUG', process.env.DEBUG)
      .use(
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

  it('should handle repeat runs on the same Metalsmith metadata (no duplicates)', function (done) {
    const m = Metalsmith('test/fixtures/object-merge')
    const plugin = metadata({ config: 'src/metadata' })

    m.metadata({
      config: {
        navitems: [
          { uri: '/products', label: 'products' }
        ]
      }
    })
    m.use(plugin)
    m.env('DEBUG', '@metalsmith/metadata')
    m.process()
      .then(() => m.process())
      .then(() => {
        assert.deepStrictEqual(m.metadata().config, {
          metatags: [{ name: 'description', value: 'Hello world' }],
          navitems: [
            { uri: '/products', label: 'products' },
            { uri: '/', label: 'Home' },
            { uri: '/about', label: 'About' }
          ]
        })
        done()
      })
      .catch(done)
  })

  it('should handle single runs on different Metalsmith instances\' metadata', function (done) {
    const plugin = metadata({ config: 'src/metadata' })

    function singleRun() {
      const m = Metalsmith('test/fixtures/object-merge')
      m.metadata({
        config: {
          navitems: [
            { uri: '/products', label: 'products' }
          ]
        }
      })
      m.use(plugin)
      m.env('DEBUG', '@metalsmith/metadata')
      return m.process().then(() => m.metadata())
    }

    Promise.all([singleRun(), singleRun()])
      .then(([meta1, meta2]) => {
        const expected = {
          metatags: [{ name: 'description', value: 'Hello world' }],
          navitems: [
            { uri: '/products', label: 'products' },
            { uri: '/', label: 'Home' },
            { uri: '/about', label: 'About' }
          ]
        }
        assert.deepStrictEqual(meta1.config, expected, 'meta1')
        assert.deepStrictEqual(meta2.config, expected, 'meta2')
        done()
      })
      .catch(done)
  })
})

describe('External metadata', function () {
  it('should add an external file to metadata', function (done) {
    const m = Metalsmith('test/fixtures/external-file')
      .env('DEBUG', process.env.DEBUG)
      .use(metadata({ data: 'data/test.json' }))
    m.build(function (err) {
      if (err) return done(err)
      assert.deepStrictEqual(m.metadata().data, { json: 'string' })
      done()
    })
  })

  it('should add all external files in a folder', function (done) {
    const m = Metalsmith('test/fixtures/external-folder')
      .env('DEBUG', process.env.DEBUG)
      .use(metadata({ data: 'data' }))
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
      .env('DEBUG', process.env.DEBUG)
      .use(metadata({ file: 'src/data.txt' }))
      .build(function (err) {
        assert(err)
        assert(err.message.startsWith('Unsupported data format'))
        done()
      })
  })

  it('should error when TOML is not installed', function (done) {
    // run this test locally by removing this.skip & running "npm remove toml"
    this.skip()
    const Metalsmith = require('metalsmith')
    Metalsmith('test/fixtures/toml')
      .env('DEBUG', process.env.DEBUG)
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
      .env('DEBUG', process.env.DEBUG)
      .use(metadata({ file: 'src/data.json' }))
      .build(function (err) {
        if (!err) done(new Error('No error was thrown'))
        assert(err.message.startsWith('malformed data'))
        done()
      })
  })

  it('should error for single-file entries that are not found', function (done) {
    Metalsmith('test/fixtures/incorrect-path')
      .env('DEBUG', process.env.DEBUG)
      .use(metadata({ file: 'src/data-incorrect.json' }))
      .build(function (err) {
        if (!err) done(new Error('No error was thrown'))
        assert(err.message.startsWith('No matching file found for entry'))
        done()
      })
  })

  it('should error for single-file entries that are not found (outside source dir)', function (done) {
    Metalsmith('test/fixtures/incorrect-path')
      .env('DEBUG', process.env.DEBUG)
      .use(metadata({ file: 'data-incorrect.json' }))
      .build(function (err) {
        if (!err) done(new Error('No error was thrown'))
        assert(err.message.startsWith('No matching file found for entry'))
        done()
      })
  })
})
