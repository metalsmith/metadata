# metalsmith-metadata

A metalsmith plugin to load global metadata from files and directories.

- Files and directories must be located in the metalsmith root directory.
- Supports JSON, YAML and TOML files
- Content of files in directories will be concatenated into a single metadata object

**Metadata must be included above metalsmith-layouts and metalsmith-in-place and other plugins that use metadata.**

## Installation

```bash
$ npm install metalsmith-metadata
```

## CLI Usage

Install via npm and then add the `metalsmith-metadata` key to your `metalsmith.json` plugins. Each key in the dictionary of options will be the key for the global metadata object, like so:

```json
{
  "plugins": {
    "metalsmith-metadata": {
      "authors": "./path/to/authors.json",
      "categories": "./path/to/categories.yaml",
      "customers": "./path/to/directory/with/customer/files"
    }
  }
}
```

## Javascript Usage

Pass the options to `Metalsmith#use`. **File/directory paths are referencing the Metalsmith root directory**.

```js
const metadata = require("metalsmith-metadata");

metalsmith.use(
  metadata({
    jsonFile: "./src/data/a-json-file.json",
    yamlFile: "./some-directory/a-yaml-file.yaml",
    aDirectory: "./some-directory/a-directory",
  })
);
```

> **Note**: In the example above the first option `jsonFile` is located in the Metalsmith source directory. The following two options are located in some directory in the Metalsmith root.

## Examples

### a-json-file.json

```
[
  {
    "title": "Nibh Justo Sit Dolor"
  },
  {
    "title": "Venenatis Consectetur"
  },
  {
    "title": "Tortor Mattis Amet Ullamcorper"
  }
]
```

will be available in the metadata like this:

```js
jsonFile: [
  { title: "Nibh Justo Sit Dolor" },
  { title: "Venenatis Consectetur" },
  { title: "Tortor Mattis Amet Ullamcorper" },
];
```

### a-yaml-file.yaml (or a-yaml-file.yml)

```yaml
title: "Local YAML test file"
Dolorfusce:
  Curabitur: "blandit tempus"
  Porttitor: "More Voodoo"
  Purus:
    - "Euismod"
    - "Quam Ipsum"
```

will be available in the metadata like this:

```js
yamlTest: {
  title: 'Local YAML test file',
  Dolorfusce: {
    Curabitur: 'blandit tempus',
    Porttitor: 'More Voodoo',
    Purus: ["Euismod", "Quam Ipsum"]
  }
}
```

### a-toml-file.toml

```toml
# This is a TOML document

title = "Local TOML test file"

[owner]
name = "Tom Preston-Werner"
dob = 1979-05-27T07:32:00-08:00

[database]
enabled = true
ports = [ 8000, 8001, 8002 ]
data = [ ["delta", "phi"], [3.14] ]
temp_targets = { cpu = 79.5, case = 72.0 }

[servers]

[servers.alpha]
ip = "10.0.0.1"
role = "frontend"

[servers.beta]
ip = "10.0.0.2"
role = "backend"

```

will be available in the metadata like this:

```js
tomlTest: {
  title: 'Local TOML test file',
  owner: { name: 'Tom Preston-Werner', dob: '1979-05-27T15:32:00.000Z' },
  database: {
    enabled: true,
    ports: [8000,8001,8002],
    data: [["delta","phi"],[3.14]],
    temp_targets: {"cpu":79.5,"case":72}
  },
  servers: { alpha: {"ip":"10.0.0.1","role":"frontend"}, beta: {"ip":"10.0.0.2","role":"backend"}}
}
```

### Directory with files

```
a-directory
  - file1.json
  - file2.json
  - file3.json
```

### file1.json

```
{
    "title": "Fringilla Etiam Sollicitudin"
}
```

### file2.json

```
{
    "title": "Pharetra Egestas Mollis"
}
```

### file3.json

```
{
    "title": "Sem Venenatis Tortor"
}
```

will be available in the metadata like this:

```js
aDirectory: [
    { title: 'Fringilla Etiam Sollicitudin' },
    { title: 'Pharetra Egestas Mollis' },
    { title: 'Sem Venenatis Tortor' }
  ],
```

## License

MIT
