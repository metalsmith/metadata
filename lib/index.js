'use strict';

const debug = require('debug')('metalsmith-metadata');
const {promises: {readFile, readdir}} = require('fs');
const path = require('path');
const extension = path.extname;
const yaml = require('js-yaml');
const toml = require('toml');


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
  return Object.assign({}, defaults, options || {});
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
    throw(`error converting yaml to json: ${e}`);
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
    throw(`error converting toml to json: ${e}`);
  }
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
  let fileContent;
  
  switch (fileExtension) {
    case ".yaml" :
    case ".yml"  : 
      fileContent = yamlToJSON(fileBuffer);
      break;
    case ".toml" :
      fileContent = tomlToJSON(fileBuffer);
      break;
    case ".json" :
      fileContent = JSON.parse(fileBuffer.toString()); // remove line breaks etc from the filebuffer
      break;
    default:
      fileContent = JSON.parse(fileBuffer.toString());
  }
  return fileContent;
};

/**
 * getDirectoryFiles
 * @param {*} directoryPath 
 * @returns List of all files in the directory
 */
async function getDirectoryFiles(directoryPath) {
  const fileList =  await readdir(directoryPath);
  return await getDirectoryFilesContent(directoryPath, fileList);

};

/**
 * getDirectoryFilesContent
 * @param {*} directoryPath 
 * @param {*} fileList 
 * @returns The content of all files in a directory
 */
async function getDirectoryFilesContent(directoryPath, fileList) {
  const fileContent = await fileList.map(async file => {
    return await getExternalFile(path.join(directoryPath, file)); 
  });
  return await Promise.all(fileContent);
};

/**
 * getFileObject
 * @param {*} filePath 
 * @param {*} optionKey 
 * @param {*} allMetadata 
 * @returns promise to push metafile object to metalsmith metadata object
 */
async function getFileObject(filePath, optionKey, allMetadata) {
  return getExternalFile(filePath)
    .then(fileBuffer => {
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
    .then(fileBuffers => {
      const groupMetadata = [];
      fileBuffers.forEach(fileBuffer => {
        groupMetadata.push(fileBuffer); 
      })

      if (groupMetadata.length) {
        allMetadata[optionKey] = groupMetadata;
      }
      else {
        done(`No files found in this directory "${key}"`);
      }
    })
    .catch(e => {
      done(e.message);
    });
};
  

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

function initMetadata(options){
  options = normalizeOptions(options);

  return function metameta(files, metalsmith, done){
    const allMetadata = metalsmith.metadata();

    // array to hold all active promises during external file reads. Will be
    // used with Promise.allSettled to invoke done()
    const allPromises = [];

    // loop over all options/metadata files/directories
    Object.keys(options).forEach(function(optionKey) {

      // check if file is located inside the metalsmith source directory
      const metaFilePath = options[optionKey];

      const msDirectory = metalsmith.directory();
      const srcDirectory = metalsmith.source();
      const msSourceFolder = srcDirectory.replace(msDirectory, ".");

      const isLocal = metaFilePath.startsWith(msSourceFolder);

      // flag to be reset when valid filepath is detected
      let validFilepath = false;
  
      /*
       * if file or directory is local we can get the metadata from the metalsmith file object
       */
      if (isLocal) {
        // get object key from the options
        const key = metaFilePath.replace(`${msSourceFolder}/`, "");

        // check if the optionKey element has a file exension
        const fileExtension = extension(metaFilePath);
        if ( fileExtension ) {
          if ( fileExtension === ".json" || fileExtension === ".yaml" || fileExtension === ".yml" || fileExtension === ".toml") {
            let metadata;
            // get the data from file object
            try {
              metadata = files[key].contents.toString();
            } catch (error) {
              done(error);
            }

            if ( fileExtension === ".yaml" || fileExtension === ".yml" ) {
              metadata = JSON.stringify(yamlToJSON(metadata));
            }

            if ( fileExtension === ".toml" ) {
              metadata = JSON.stringify(toml.parse(metadata));
            }

            // to temp meta object
            allMetadata[optionKey] = JSON.parse(metadata);
            // ... and remove this file from the metalsmith build process
            delete files[key];

            // indicate filepath is valid
            validFilepath = true;
          }
        } else {
          // assume this is a directory, all files in this directory will be concatenated into one 
          // metadata object
          const groupMetadata = [];
          Object.keys(files).forEach(function(file) {
            if (file.includes(key)) {
              groupMetadata.push(JSON.parse(files[file].contents.toString()));
            }
          });

          if (groupMetadata.length) {
            allMetadata[optionKey] = groupMetadata;
          }
          else {
            done(`No files found in this directory "${key}"`);
          }

          // indicate filepath is valid
          validFilepath = true;
        }
      } else {
      /*
       * isExternal
       * if file or directory is external we get the metadata from respective files
       */

        // get object key
        const key = metaFilePath.slice(2);

        // check if the optionKey has a file exension
        const fileExtension = extension(metaFilePath);
        if ( fileExtension ) {
          if ( fileExtension === ".json" || fileExtension === ".yaml" || fileExtension === ".yml" || fileExtension === ".toml") {
            // read external file content and store in metadata object
            const filePath = path.join(metalsmith._directory, key);
            const extFilePromise = getFileObject(filePath, optionKey, allMetadata)

            // add this promise to allPromises array. Will be later used with Promise.allSettled to invoke done()
            allPromises.push(extFilePromise);

            // indicate filepath is valid
            validFilepath = true;
          } 
        } else {
          // assume this is a directory
          // get content of all files in this directory, concatenated into one metadata object
          const directoryPath = path.join(metalsmith._directory, key);
          const extDirectoryPromise =  getDirectoryObject(directoryPath, optionKey, allMetadata);
           
          // add this promise to allPromises array. Will be later used with Promise.allSettled to invoke done()
          allPromises.push(extDirectoryPromise);

          // indicate filepath is valid
          validFilepath = true;
        }
      }

      if (!validFilepath) {
        done(`${metaFilePath} is not a valid metafile path. Path must be relative to Metalsmith root`);
      }
    });
    
    // Promise.allSettled is used to invoke done()
    Promise.allSettled(allPromises).then(() => done());
  };
}

module.exports = initMetadata;