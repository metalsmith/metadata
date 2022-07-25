'use strict'

const debug = require('debug')('@metalsmith/metadata')
const merge = require('deepmerge')
const {
  promises: { readdir, readFile }
} = require('fs')
const { relative, extname, basename, join } = require('path')
const yaml = require('js-yaml')
let toml

try {
  toml = require('toml').parse
} catch (err) {
  toml = () => {
    throw new Error('To use toml you must install it first, run "npm i toml"')
  }
}

/**
 * Supported metadata parsers.
 */
const parsers = {
  '.json': JSON.parse,
  '.yaml': yaml.load,
  '.yml': yaml.load,
  '.toml': toml
}
const extglob = `**/*{${Object.keys(parsers).join(',')}}`

/**
 * @typedef Options
 * @property {String} key
 */

/** @type {Options} */
const defaults = {}

/**
 * Normalize plugin options
 * @param {Options} [options]
 * @returns {Object}
 */
function normalizeOptions(options) {
  return Object.assign({}, defaults, options || {})
}

/**
 * A Metalsmith plugin to load global metadata from files
 *
 * @example
 * ```js
 * // inside metalsmith.source()
 * metalsmith.use(metadata({ 'config': 'src/config.json' }))
 * // inside metalsmith.directory()
 * metalsmith.use(metadata({ 'config': 'config.json' }))
 * // target a keypath
 * metalsmith.use(metadata({ 'config.nav.items': 'navitems.yaml' }))
 * ```
 * @param {Options} options
 * @returns {import('metalsmith').Plugin}
 */
function initMetadata(options = {}) {
  options = normalizeOptions(options)
  if (Object.keys(options).length === 0) {
    debug('Found no metadata options')
    return function metadata() {}
  }
  debug('Running with options: %O', options)

  return function metadata(files, metalsmith, done) {
    const filePromises = []
    const dirPromises = []

    // get metalsmith source directory
    const relpath = (path, root) => relative(root || metalsmith.directory(), metalsmith.path(path))

    // fast in-source error handling first
    for (const filepath of Object.values(options)) {
      const ext = extname(basename(filepath))
      const srcPath = relpath(filepath, metalsmith.source())

      if (ext) {
        if (!metalsmith.match(extglob, filepath).length) {
          done(new Error(`Unsupported data format "${ext}" for entry "${filepath}"`))
        }
        if (!srcPath.startsWith('..') && !Object.prototype.hasOwnProperty.call(files, srcPath)) {
          done(new Error('No matching file found for entry "' + relpath(filepath) + '"'))
        }
      }
    }

    // create array with all option values relative to metalsmith directory
    Object.entries(options).forEach(([dest, filepath]) => {
      const srcPath = relpath(filepath, metalsmith.source())
      const absPath = metalsmith.path(filepath)
      const ext = extname(basename(srcPath))

      // it's local
      if (!srcPath.startsWith('..')) {
        // it's a single file
        if (ext) {
          filePromises.push(
            Promise.resolve({
              path: srcPath,
              key: dest,
              file: files[srcPath]
            })
          )

          // it's a directory
        } else {
          const matches = metalsmith.match(`${srcPath}/${extglob}`)
          if (!matches.length) {
            debug('No matching files found for entry "%s"', filepath)
          }
          matches.forEach((filepath) => {
            filePromises.push(
              Promise.resolve({
                path: filepath,
                key: dest,
                file: files[filepath]
              })
            )
          })
        }
        // it's external
      } else {
        // it's a single file
        if (extname(filepath)) {
          const fileread = readFile(absPath)
            .then((file) => ({
              path: relpath(filepath),
              key: dest,
              file: { contents: file }
            }))
            .catch(() =>
              done(new Error('No matching file found for entry "' + relpath(filepath) + '"'))
            )
          filePromises.push(fileread)
          // it's a directory
        } else {
          // for ext dirs, just push the file listings, flatten them afterwards
          dirPromises.push(
            readdir(absPath)
              .then((filelist) => {
                const matches = metalsmith.match(extglob, filelist)
                if (!matches.length) {
                  debug('No matching files found for entry "%s"', relpath(filepath))
                }
                return matches.map((f) => ({
                  path: join(relpath(absPath), f),
                  key: dest
                }))
              })
              .catch((err) => done(err))
          )
        }
      }
    })

    // flatten file listings first, these are relatively inexpensive
    Promise.all(dirPromises)
      .then((filelists) => {
        filelists.forEach((filelist) => {
          const matches = metalsmith.match(
            extglob,
            filelist.map((f) => f.path)
          )
          filePromises.push(
            ...matches.map((filepath) =>
              readFile(metalsmith.path(filepath))
                .then((file) => ({
                  path: filepath,
                  key: filelist.find((f) => f.path === filepath).key,
                  file: { contents: file }
                }))
                .catch((err) => done(err))
            )
          )
        })
        return Promise.all(filePromises)
      })
      .then((allFiles) => {
        const metadata = metalsmith.metadata()
        allFiles.forEach(({ key, file, path }) => {
          let parsed
          try {
            const parser = parsers[extname(path)]
            parsed = parser(file.contents.toString())
          } catch (err) {
            done(
              err.message.startsWith('To use toml')
                ? err
                : new Error('malformed data in "' + path + '"')
            )
          }

          const newMeta = {},
            keypath = key.split('.')
          let current = newMeta
          while (keypath.length) {
            const k = keypath.shift()
            current[k] = keypath.length ? {} : parsed
            current = current[k]
          }
          debug('Adding metadata from file "%s" at key "%s": %O', path, key, parsed)
          Object.assign(metadata, merge(metadata, newMeta))
          if (delete files[path]) {
            debug('Removed metadata file at "%s"', path)
          }
        })
        done()
      })
      .catch(done)
  }
}

module.exports = initMetadata
