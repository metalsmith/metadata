
var assert = require('assert');
var exists = require('fs').existsSync;
var Metalsmith = require('metalsmith');
var metadata = require('..');

describe('metalsmith-metadata', function(){
  it('should error for malformed data', function(done){
    var m = Metalsmith('test/fixtures/malformed').use(metadata({ file: 'data.json' }));
    m.build(function(err){
      assert(err);
      assert(~err.message.indexOf('malformed data'));
      assert(!exists('test/fixtures/malformed/build'));
      done();
    });
  });

  it('should parse JSON', function(done){
    var m = Metalsmith('test/fixtures/json').use(metadata({ file: 'data.json' }));
    m.build(function(err){
      if (err) return done(err);
      assert.deepEqual(m.metadata().file, { string: 'string' });
      assert(!exists('test/fixtures/json/build'));
      done();
    });
  });

  it('should not parse a file if the key already exists in the metadata', function(done){
    var m = Metalsmith('test/fixtures/json')
      .use(metadata({ file: 'data.json' }))
      .use(metadata({ file: 'missing.json' }));
    m.build(function(err){
      if (err) return done(err);
      assert.deepEqual(m.metadata().file, { string: 'string' });
      assert(!exists('test/fixtures/json/build'));
      done();
    });
  });

  it('should parse a file even if the key exists if the file is in the bundle', function(done){
    var m = Metalsmith('test/fixtures/duplicate')
      .use(metadata({ file: 'data.json' }))
      .use(metadata({ file: 'data2.json' }));
    m.build(function(err){
      if (err) return done(err);
      assert.deepEqual(m.metadata().file, { string: 'string2' });
      assert(!exists('test/fixtures/json/build'));
      done();
    });
  });

  it('should parse YAML', function(done){
    var m = Metalsmith('test/fixtures/yaml').use(metadata({ file: 'data.yaml' }));
    m.build(function(err){
      if (err) return done(err);
      assert.deepEqual(m.metadata().file, { string: 'string' });
      assert(!exists('test/fixtures/yaml/build'));
      done();
    });
  });

  it('should parse nested path', function(done){
    var m = Metalsmith('test/fixtures/nested').use(metadata({ file: 'path/data.yaml' }));
    m.build(function(err){
      if (err) return done(err);
      assert.deepEqual(m.metadata().file, { string: 'string' });
      assert(!exists('test/fixtures/nested/build'));
      done();
    });
  });

  it('should parse nested path with backslash', function(done){
    var m = Metalsmith('test/fixtures/nested').use(metadata({ file: 'path\\data.yaml' }));
    m.build(function(err){
      if (err) return done(err);
      assert.deepEqual(m.metadata().file, { string: 'string' });
      assert(!exists('test/fixtures/nested/build'));
      done();
    });
  });

  it('should parse deep nested path', function(done){
    var m = Metalsmith('test/fixtures/deep-nested').use(metadata({ file: 'path/path/data.yaml' }));
    m.build(function(err){
      if (err) return done(err);
      assert.deepEqual(m.metadata().file, { string: 'string' });
      assert(!exists('test/fixtures/deep-nested/build'));
      done();
    });
  });
});