
const { resolve, join } = require('path');
const { writeFile } = require('fs/promises');
const { readFileSync } = require('fs');
const { readdir } = require('fs').promises;
const set = require('lodash/set')
const merge = require('lodash/merge')
const isObject = require('lodash/isObject');
const { isArray } = require('lodash');

const StyleDictionary = require('./build-style-dictionary-tokens')

async function getFiles(dir) {
  const dirents = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = resolve(dir, dirent.name);
    return dirent.isDirectory() ? getFiles(res) : res;
  }));
  return Array.prototype.concat(...files);
}

function getAllValues(obj) {
  let result = {};

  function traverse(obj, currentObj, path = '', parentKey = '', parentObj = {}) {
    for (const key in obj) {
      const newPath = path ? `${path}.${key}` : key;
      if (isObject(obj[key]) && !isArray(obj[key])) {
        currentObj[key] = {};
        traverse(obj[key], currentObj[key], newPath, key, currentObj);
      } else if (isArray(obj[key])) {
        if (parentKey === '$extensions') {
          if (obj.hasOwnProperty('generators')) {
            if (isArray(obj.generators)) {
              const rootPath = path.split('.').filter(d => d != '$extensions').join('.')
              obj.generators.forEach(({ type, value }) => {
                Object.keys(value).forEach((generatorKey) => {
                  set(
                    result,
                    `${rootPath}${generatorKey}`,
                    {
                      $type: parentObj['$type'],
                      $value: `{${rootPath}}`,
                      $extensions: {
                        [type]: value[generatorKey],
                      }
                    },
                  )
                })
              });
            }
          }
        }

        currentObj[key] = [];
        traverse(obj[key], currentObj[key], newPath, key, currentObj);
      } else {
        currentObj[key] = obj[key];
      }
    }
  }

  traverse(obj, result);
  return result;
}

(async function () {
  const tokens = await getFiles('./tokens');

  const jsons = tokens.filter(x => x.endsWith('.tokens.json')).map(jsonFile => {
    const content = readFileSync(jsonFile, 'utf8');
    return {
      path: jsonFile,
      content,
    }
  });

  const result = jsons.reduce((data, jsonFile) => {
    try {
      return merge(data, getAllValues(JSON.parse(jsonFile.content)))
    } catch (error) {
      return data
    }
  }, {});

  const destPath = './builds/tokens/kda-design-system.raw.tokens.json'
  const writeFileContent = join(__dirname, destPath)
  await writeFile(writeFileContent, JSON.stringify(result, null, 2), { flag: 'w', encoding: 'utf-8' })
  StyleDictionary(destPath)
})()
