'use strict';

const debug = require('debug')('metalsmith-metameta');
const {
  promises: { readFile, readdir }
} = require('fs');
const { relative, join, extname: extension, sep, basename, dirname } = require('path');
const yaml = require('js-yaml');
const toml = require('toml');

/**
 * @typedef Options
 * @property {String} key
 */

/** @type {Options} */
const defaults = {};

/**
 * Normalize plugin options
 * @param {Options} [options]
 * @returns {Object}
 */
function normalizeOptions(options) {
  return Object.assign({}, defaults, options || {});
}

/**
 * groupMetadataSources
 * Function to split array values into four groups
 * - local files in Metalsmith source folder
 * - local directories in Metalsmith source folder
 * - external files outside Metalsmith source folder but in Metalsmith directory
 * - external directories outside Metalsmith source folder but in Metalsmith directory
 * 
 * @param {array} arr 
 * @param {function} filter 
 * 
 */
function groupMetadataSources(arr, src) {
  return arr.reduce((accu, value) => {
    // local file
    if(!!extension(value.path) && value.path.startsWith(src)) {
      accu[0].push(value);
    }
    // local directory
    if(!extension(value.path) && value.path.startsWith(src)) {
      accu[1].push(value);
    }
    // external file
    if(!!extension(value.path) && !value.path.startsWith(src)) {
      accu[2].push(value);
    }
    // external directory
    if(!extension(value.path) && !value.path.startsWith(src)) {
      accu[3].push(value);
    }
    return accu;
  }, [[],[],[],[]]);
}

/**
 * YAML to JSON
 * @param {*} string - YAML file
 * @returns .json string
 */
function yamlToJSON(string) {
  try {
    return yaml.load(string);
  } catch (e) {
    throw `error converting yaml to json: ${e}`;
  }
}

/**
 * TOML to JSON
 * @param {*} string - TOML file
 * @returns .json string
 */
function tomlToJSON(string) {
  try {
    return toml.parse(string);
  } catch (e) {
    throw `error converting toml to json: ${e}`;
  }
}

/**
 * toJson
 * Converts YAML, YML, TOML and filebuffer to JSON
 * @param {string} file 
 * @param {string} ext 
 * @returns JSON object literal
 */
function toJson(file, ext) {
  let fileContent;

  switch (ext) {
    case '.yaml':
    case '.yml':
      try {
        fileContent = yamlToJSON(file);
      } catch(e) {
        debug(e);
      }
      break;
    case '.toml':
      try { // remove object prototype
        fileContent = JSON.parse(JSON.stringify(tomlToJSON(file)));
      } catch(e) {
        debug(e);
      }
      break;
    case '.json':
      try {
        fileContent = JSON.parse(file.toString()); // remove line breaks etc from the filebuffer
      } catch(e) {
        debug(e);
      }
      break;
    default:
      fileContent = "";
      debug("Unsupported file type");
  }

  return fileContent;
}

/**
 * getExternalFile
 * Reads file content in either .json, .yaml, .yml or .toml format
 * @param {*} filePath
 * @returns Content of the file in .json
 */
async function getExternalFile(filePath) {
  const fileExtension = extension(filePath);
  const fileBuffer = await readFile(filePath);

  return toJson(fileBuffer, fileExtension);
}

/**
 * getDirectoryFiles
 * @param {*} directoryPath
 * @returns List of all files in the directory
 */
async function getDirectoryFiles(directoryPath) {
  const fileList = await readdir(directoryPath);
  return await getDirectoryFilesContent(directoryPath, fileList);
}

/**
 * getDirectoryFilesContent
 * @param {*} directoryPath
 * @param {*} fileList
 * @returns The content of all files in a directory
 */
async function getDirectoryFilesContent(directoryPath, fileList) {
  const fileContent = await fileList.map(async (file) => {
    return await getExternalFile(join(directoryPath, file));
  });
  return await Promise.all(fileContent);
}

/**
 * getFileObject
 * @param {*} filePath
 * @param {*} optionKey
 * @param {*} allMetadata
 * @returns promise to push metafile object to metalsmith metadata object
 */
async function getFileObject(filePath, optionKey, allMetadata) {
  return getExternalFile(filePath).then((fileBuffer) => {
    allMetadata[optionKey] = fileBuffer;
  });
}

/**
 * getDirectoryObject
 * @param {*} directoryPath
 * @param {*} optionKey
 * @param {*} allMetadata
 * @returns promise to push concatenated metafile object of all directory files to metalsmith metadata object
 */
async function getDirectoryObject(directoryPath, optionKey, allMetadata) {
  return getDirectoryFiles(directoryPath)
    .then((fileBuffers) => {

      const groupMetadata = [];
      fileBuffers.forEach((fileBuffer) => {
        groupMetadata.push(fileBuffer);
      });

      if (groupMetadata.length) {
        allMetadata[optionKey] = groupMetadata;
      } else {
        done(`No files found in this directory "${key}"`);
      }
    })
    .catch((e) => {
      debug(e);
    });
}

/**
 * A Metalsmith plugin to read files with metadata
 *
 * Files containing metadata must be located in the Metalsmith root directory.
 * Content of files located in the Metalsmith source directory (local files) is readily available
 * in the files object while files outside the source directory (external files) are read fropm disk.
 *
 * Files are specified via option entries like: site: "./data/siteMetadata.json"
 * The resulting meta object will then be something like this:
 * {
 *  site: {
 *    "title":"New MetalsmithStarter",
 *    "description":"Metalsmith Starter Website",
 *     "author":"werner@glinka.co",
 *     "siteURL":"https://newmsnunjucks.netlify.app/",
 *      ...
 * }
 *
 * Directories may also be specified like this: example: "./data/example". In this case
 * the plugin will read all files in the directory and concatenate them into a single file object.
 *
 *
 * @param {Options} options
 * @returns {import('metalsmith').Plugin}
 */

function initMetadata(options) {
  options = normalizeOptions(options);
  debug("Receiving options: %O", options)

  return function metameta(files, metalsmith, done) {
    // return if no options
    if(Object.keys(options).length === 0) {
      debug("Found no metadata options");
      done();
    }

    const allMetadata = metalsmith.metadata();

    // array to hold all active promises during external file reads. Will be
    // used with Promise.allSettled to invoke done()
    const allPromises = [];

    // create array with all option values relative to metalsmith directory
    const allOptions = Object.keys(options).map(key => (
      {
        "key": key,
        "path": relative(metalsmith.directory(), options[key])
      }
    ));

    // get metalsmith source directory
    const metalsmithSource = relative(metalsmith.directory(), metalsmith.source());

    // group option values into local/external files/directories
    const [localFiles, localDirs, externalFiles, externalDirs] = groupMetadataSources(allOptions, metalsmithSource);

    localFiles.forEach(function(file){
      // option path is relative to metalsmith root
      // convert dir path to be relative to metalsmith source as in files object key
      const filePath = relative(metalsmith.source(), file.path);
      const fileExtension = extension(filePath);

      // get the data from file object
      const metadata = toJson(files[filePath].contents, fileExtension);

      // to temp meta object
      allMetadata[file.key] = metadata;

      debug("Adding these local files to metadata: %O", metadata);

      // ... and remove this file from the metalsmith build process
      delete files[file.key];
    });

    localDirs.forEach(function(dir) {
      // option path is relative to metalsmith root
      // convert dir path to be relative to metalsmith source
      const filePath = relative(metalsmith.source(), dir.path);

      const groupMetadata = [];
      Object.keys(files).forEach(function (file) {
        const fileExtension = extension(file);
        if (file.includes(filePath)) {
          // get the data from file object
          const metadata = toJson(files[file].contents, fileExtension);

          debug("Adding these local directories to metadata: %O", metadata);

          groupMetadata.push(metadata);
          
        }
      });

      if (groupMetadata.length) {
        allMetadata[dir.key] = groupMetadata;
      } else {
        done(`No files found in this directory "${dir}"`);
      }
    });

    externalFiles.forEach(function(file) {
      const extFilePromise = getFileObject(file.path, file.key, allMetadata);

      // add this promise to allPromises array. Will be later used with Promise.allSettled to invoke done()
      allPromises.push(extFilePromise);
    });

    externalDirs.forEach(function(dir) {
      // get content of all files in this directory, concatenated into one metadata object
      //const directoryPath = join(metalsmith.directory(), dir.path);
      const extDirectoryPromise = getDirectoryObject(dir.path, dir.key, allMetadata);

      // add this promise to allPromises array. Will be later used with Promise.allSettled to invoke done()
      allPromises.push(extDirectoryPromise);
    });

    // Promise.all is used to invoke done()
    Promise.allSettled(allPromises).then(() => done());
  };
}

module.exports = initMetadata;
