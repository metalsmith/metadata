import { promises } from 'fs'
import merge from 'deepmerge'
import createDebug from 'debug'
import yaml from 'js-yaml'
import { relative, extname, basename, join } from 'path'
import module, { createRequire } from 'module'

const debug = createDebug('@metalsmith/metadata')

const { readdir, readFile } = promises
let toml

// support for dynamic imports landed in Node 13.2.0, and was available with --experimental-modules flag in 12.0.0
// ideally all the loaders should be refactored to be async, and loaded only when the plugin runs
const req = module.require || createRequire(import.meta.url)

try {
  toml = req('toml')
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
  '.toml': toml.parse
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
  let meta

  return function metadata(files, metalsmith, done) {
    const filePromises = []
    const dirPromises = []

    // the same metalsmith instance always returns the same metadata object,
    // if it is metalsmith.use'd twice, or the pipeline is rerun with metalsmith.watch
    // the data has already been loaded successfully
    if (meta === metalsmith.metadata()) {
      debug('Detected repeat run, skipping.')
      done()
      return
    }

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
        let newMetadata = {}
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
          newMetadata = merge(newMetadata, newMeta)
          debug('Adding metadata from file "%s" at key "%s": %O', path, key, parsed)

          if (delete files[path]) {
            debug('Removed metadata file at "%s"', path)
          }
        })

        meta = metalsmith.metadata()
        const merged = merge(meta, newMetadata)
        metalsmith.metadata(merged)
        done()
      })
      .catch(done)
  }
}

export default initMetadata
