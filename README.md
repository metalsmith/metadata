# @metalsmith/metadata

A metalsmith plugin to load global metadata from files and directories.

[![metalsmith: plugin][metalsmith-badge]][metalsmith-url]
[![npm: version][npm-badge]][npm-url]
[![travis: build][ci-badge]][ci-url]
[![code coverage][codecov-badge]][codecov-url]
[![license: MIT][license-badge]][license-url]

- Reads, parses and merges data files into global metadata and removes them from the build (when applicable).
- Supports JSON, YAML and TOML files. [TOML parser](https://www.npmjs.com/package/toml) needs to be installed separately.
- Supports dot-notated metadata keypath targets as option keys, eg `{'config.nav': 'src/config/nav.yml'}`


## Installation

NPM:

```bash
npm install @metalsmith/metadata
```

Yarn:

```bash
yarn add @metalsmith/metadata
```

## Usage

Pass the options to `Metalsmith#use`. The options object is in the format `{ 'metadata.key': 'path/to/(file.ext|dir)' }`. Relative file/directory paths are resolved to `metalsmith.directory()`. Directory option keys will include direct children of the directory, see [Mapping nested metadata directories](#mapping-nested-metadata-directories) for creating nested directory structures.

```js
const Metalsmith = require('metalsmith')
const metadata = require('@metalsmith/metadata')

Metalsmith(__dirname)
  .use(
    metadata({
      // in-source JSON file
      jsonFile: 'src/data/a-json-file.json',
      // out-of-source YAML file at nested keypath
      'nested.yamlFile': 'some-directory/a-yaml-file.yaml',
      // out-of-source directory
      aDirectory: 'some-directory/a-directory'
    })
  )
  .build((err) => {
    console.log(metalsmith.metadata())
    // logs { jsonFile: {...}, nested: { yamlFile: {...}}, aDirectory: {...} }
  })
```
Files inside `metalsmith.source()` will be considered metadata and thus removed from the build output.

### Plugin order

Typically, you want to use this plugin somewhere at the start of the chain, before any rendering plugins run, like [@metalsmith/layouts](https://github.com/metalsmith/layouts) or [@metalsmith/in-place](https://github.com/metalsmith/in-place).

### Merging metadata files into objects

You can merge metadata files into objects by making the root of the data file an object. For example, given the following 2 files:

<table>
  <tr><th><code>src/themes/red.json</code></th><th><code>src/themes/blue.json</code></th></tr>
  <tr>
    <td>
      <pre>{
  "red": {
    "primary-color": "#FF0000"
  }
}</pre>
    </td>
    <td>
      <pre>{
  "blue": {
    "primary-color": "#00FF00"
  }
}</pre>
    </td>
  </tr>
</table>

with a usage like `metalsmith.use(metadata({ themes: 'src/themes' }))`, `metalsmith.metadata().themes` will be `{ red: {"primary-color": #00FF00"}, blue: {"primary-color": "#00FF00"}}`.

### Merging metadata files into arrays

You can merge metadata files into an array by making the root of the data file an array. For example, given the following 2 files:

<table>
  <tr><th><code>src/themes/red.json</code></th><th><code>src/themes/blue.json</code></th></tr>
  <tr>
    <td>
      <pre>[
  {
    "primary-color": "#FF0000"
  }
]</pre>
    </td>
    <td>
      <pre>[
  {
    "primary-color": "#00FF00"
  }
]</pre>
    </td>
  </tr>
</table>

with a usage like `metalsmith.use(metadata({ themes: 'src/themes' }))`, `metalsmith.metadata().themes` will be `[{"primary-color": #00FF00"}, {"primary-color": "#00FF00"}]`.

### Mapping nested metadata directories

You can map nested metadata directories by specifying multiple options:

```js
metalsmith.use(metadata({
  'config': 'src/config',
  'config.theme': 'src/config/theme',
  'config.theme.summer': 'src/config/theme/summer',
  'config.constants': 'src/config/constants.yaml'
}))
```

The resulting metadata will have a structure like: 

```js
{
  ...otherMetadata,
  config: {
    ...metadata_from_config_dir
    theme: {
      ...metadata_from_config_theme_dir
      summer: { ...metadata_from_config_theme_summer_dir }
    }
  },
  constants: {
    ...metadata_from_config_constants_file
  }
}
```

## Debug

To enable debug logs, set the `DEBUG` environment variable to `@metalsmith/metadata`:

Linux/Mac:

```bash
DEBUG=@metalsmith/metadata
```

Windows:

```batch
set "DEBUG=@metalsmith/metadata"
```

## CLI Usage

To use this plugin with the Metalsmith CLI,add the `@metalsmith/metadata` key to your `metalsmith.json` plugins. Each key in the dictionary of options will be the key for the global metadata object, like so:

```json
{
  "plugins": {
    "@metalsmith/metadata": {
      "authors": "src/authors.json",
      "categories": "src/categories.yaml",
      "customers": "external_data/customers"
    }
  }
}
```

## License

[MIT][license-url]

[npm-badge]: https://img.shields.io/npm/v/@metalsmith/metadata.svg
[npm-url]: https://www.npmjs.com/package/@metalsmith/metadata
[ci-badge]: https://github.com/metalsmith/metalsmith/actions/workflows/test.yml/badge.svg
[ci-url]: https://github.com/metalsmith/metalsmith/actions/workflows/test.yml
[metalsmith-badge]: https://img.shields.io/badge/metalsmith-core_plugin-green.svg?longCache=true
[metalsmith-url]: https://metalsmith.io
[codecov-badge]: https://img.shields.io/coveralls/github/metalsmith/metadata
[codecov-url]: https://coveralls.io/github/metalsmith/metadata
[license-badge]: https://img.shields.io/github/license/metalsmith/metadata
[license-url]: LICENSE
