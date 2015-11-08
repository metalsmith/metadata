
var yaml = require('js-yaml');
var fs = require('fs');
var path = require('path');

/**
 * Expose `plugin`.
 */

module.exports = plugin;

/**
 * Supported metadata parsers.
 */

var parsers = {
  '.json': JSON.parse,
  '.yaml': yaml.safeLoad,
  '.yml': yaml.safeLoad
};

/**
 * Metalsmith plugin to load metadata from files.
 *
 * @param {Object} opts
 * @return {Function}
 */

function plugin(opts, externalSrc){
  opts = opts || {};
  externalSrc = externalSrc || false;

  return function(files, metalsmith, done){
    var metadata = metalsmith.metadata();
    var exts = Object.keys(parsers);

    for (var key in opts) {
      var file = path.normalize(opts[key]);
      var ext = path.extname(file);
      if (!~exts.indexOf(ext)) throw new Error('unsupported metadata type "' + ext + '"');
      if (!externalSrc && !files[file]) throw new Error(
        'file "' + file + '" not found in Metalsmith source: ' + metalsmith._source
      );

      var parse = parsers[ext];

      if (!externalSrc) {
        var str = files[file].contents.toString();
        delete files[file];
      } else {
        var str = fs.readFileSync(file).toString();
      }

      try {
        var data = parse(str);
      } catch (e) {
        return done(new Error('malformed data in "' + file + '"'));
      }

      metadata[key] = data;
    }

    done();
  };
}
