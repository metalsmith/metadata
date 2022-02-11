/* global describe, it */

'use strict';

const chai = require('chai');
const metalsmith = require('metalsmith');
const mdMeta = require('../lib');
const inplace = require('metalsmith-in-place');
const layouts = require('@metalsmith/layouts');
const fs = require('fs');
const path = require('path');
const expect = chai.expect;

const fixture = path.resolve.bind(path, __dirname, 'fixtures');

const templateConfig = {
  engineOptions: {
    path: [`${fixture()}/layouts`]
  }
};

function file(_path) {
  return fs.readFileSync(fixture(_path), 'utf8');
}

describe('metalsmith-metadata', () => {
  it('should parse local JSON', (done) => {
    metalsmith(fixture())
      .use(
        mdMeta({
          localJSON: './src/data/json-test.json'
        })
      )
      .use(inplace(templateConfig))
      .use(layouts(templateConfig))
      .build((err) => {
        if (err) {
          return done(err);
        }
        expect(file('build/json-test.html')).to.be.eql(file('expected/json-test.html'));

        done();
      });
  });

  it('should parse local YAML', (done) => {
    metalsmith(fixture())
      .use(
        mdMeta({
          localYAML: './src/data/yaml-test.yaml'
        })
      )
      .use(inplace(templateConfig))
      .use(layouts(templateConfig))
      .build((err) => {
        if (err) {
          return done(err);
        }
        expect(file('build/yaml-test.html')).to.be.eql(file('expected/yaml-test.html'));

        done();
      });
  });

  it('should parse local TOML', (done) => {
    metalsmith(fixture())
      .use(
        mdMeta({
          localTOML: './src/data/toml-test.toml'
        })
      )
      .use(inplace(templateConfig))
      .use(layouts(templateConfig))
      .build((err) => {
        if (err) {
          return done(err);
        }
        expect(file('build/toml-test.html')).to.be.eql(file('expected/toml-test.html'));

        done();
      });
  });

  it('should parse local JSON files in a folder', (done) => {
    metalsmith(fixture())
      .use(
        mdMeta({
          localFolder: './src/data/folder-test'
        })
      )
      .use(inplace(templateConfig))
      .use(layouts(templateConfig))
      .build((err) => {
        if (err) {
          return done(err);
        }
        expect(file('build/local-folder-test.html')).to.be.eql(
          file('expected/local-folder-test.html')
        );

        done();
      });
  });

  it('should parse local JSON, YAML and TOML files in a folder', (done) => {
    metalsmith(fixture())
      .use(
        mdMeta({
          localMixedFolder: './src/data/folder-mixed-files-test'
        })
      )
      .use(inplace(templateConfig))
      .use(layouts(templateConfig))
      .build((err) => {
        if (err) {
          return done(err);
        }
        expect(file('build/local-mixed-folder-test.html')).to.be.eql(
          file('expected/local-mixed-folder-test.html')
        );

        done();
      });
  });

  it('should parse external JSON', (done) => {
    metalsmith(fixture())
      .use(
        mdMeta({
          externalJSON: './external/ext-json-test.json'
        })
      )
      .use(inplace(templateConfig))
      .use(layouts(templateConfig))
      .build((err) => {
        if (err) {
          return done(err);
        }
        expect(file('build/external-json-test.html')).to.be.eql(
          file('expected/external-json-test.html')
        );

        done();
      });
  });

  it('should parse external TOML', (done) => {
    metalsmith(fixture())
      .use(
        mdMeta({
          externalTOML: './external/ext-toml-test.toml'
        })
      )
      .use(inplace(templateConfig))
      .use(layouts(templateConfig))
      .build((err) => {
        if (err) {
          return done(err);
        }
        expect(file('build/external-toml-test.html')).to.be.eql(
          file('expected/external-toml-test.html')
        );

        done();
      });
  });

  it('should parse external YAML', (done) => {
    metalsmith(fixture())
      .use(
        mdMeta({
          externalYAML: './external/ext-yaml-test.yaml'
        })
      )
      .use(inplace(templateConfig))
      .use(layouts(templateConfig))
      .build((err) => {
        if (err) {
          return done(err);
        }
        expect(file('build/external-yaml-test.html')).to.be.eql(
          file('expected/external-yaml-test.html')
        );

        done();
      });
  });

  it('should parse files in an external folder', (done) => {
    metalsmith(fixture())
      .use(
        mdMeta({
          externalFolder: './external/folder-test'
        })
      )
      .use(inplace(templateConfig))
      .use(layouts(templateConfig))
      .build((err) => {
        if (err) {
          return done(err);
        }
        expect(file('build/external-folder-test.html')).to.be.eql(
          file('expected/external-folder-test.html')
        );

        done();
      });
  });
});
