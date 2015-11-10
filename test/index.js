
var assert = require('assert');
var exists = require('fs').existsSync;
var Metalsmith = require('metalsmith');
var metadata = require('..');

describe('metalsmith-metadata', function(){
  it('should error for malformed data', function(done){
    var m = Metalsmith('test/fixtures/malformed').use(metadata({ files: {file: 'data.json'} }));
    m.build(function(err){
      assert(err);
      assert(~err.message.indexOf('malformed data'));
      assert(!exists('test/fixtures/malformed/build'));
      done();
    });
  });

  it('should parse JSON', function(done){
    var m = Metalsmith('test/fixtures/json').use(metadata({ files: {file: 'data.json'} }));
    m.build(function(err){
      if (err) return done(err);
      assert.deepEqual(m.metadata().file, { string: 'string' });
      assert(!exists('test/fixtures/json/build'));
      done();
    });
  });

  it('should parse YAML', function(done){
    var m = Metalsmith('test/fixtures/yaml').use(metadata({ files: {file: 'data.yaml'} }));
    m.build(function(err){
      if (err) return done(err);
      assert.deepEqual(m.metadata().file, { string: 'string' });
      assert(!exists('test/fixtures/yaml/build'));
      done();
    });
  });

  it('should load from a normalized subdirectory path', function(done){
    var m = Metalsmith('test/fixtures/subdir').use(metadata({ files: {file: './path/to/file/data.json'} }));
    m.build(function(err){
      if (err) return done(err);
      assert.deepEqual(m.metadata().file, { string: 'string' });
      assert(!exists('test/fixtures/subdir/build'));
      done();
    });
  });

  it('should load from an external directory path', function(done){
    var m = Metalsmith('test/fixtures/altpath').use(metadata({
      files: { file: 'test/fixtures/altpath/data.json'},
      config: { isExternalSrc: true }
    }));
    m.build(function(err){
      if (err) return done(err);
      assert.deepEqual(m.metadata().file, { string: 'string' });
      assert(!exists('test/fixtures/altpath/build'));
      done();
    });
  });

});
