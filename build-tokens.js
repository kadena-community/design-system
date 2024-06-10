
const { resolve, join } = require('path');
const { writeFile } = require('fs/promises');
const { readFileSync } = require('fs');
const { readdir, rmdir, unlink } = require('fs').promises;
const set = require('lodash/set')
const merge = require('lodash/merge')
const isObject = require('lodash/isObject');
const { isArray } = require('lodash');

const StyleDictionary = require('./build-style-dictionary-tokens');

const buildPath = './builds/tokens'
const excludeExportPaths = [];

async function getFiles(dir) {
  const dirents = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = resolve(dir, dirent.name);
    return dirent.isDirectory() ? getFiles(res) : res;
  }));
  return Array.prototype.concat(...files);
}

async function removeDirectoryContents(directory) {
  try {
    const items = await readdir(directory, { withFileTypes: true });

    for (const item of items) {
      const itemPath = join(directory, item.name);

      if (item.isDirectory()) {
        await removeDirectoryContents(itemPath);
        await rmdir(itemPath);
      } else {
        await unlink(itemPath);
      }
    }
  } catch (error) {
    console.error(`Error removing contents of ${directory}:`, error);
  }
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

async function createExportFiles() {
  try {
    const content = readFileSync(`${buildPath}/kda-design-system.tokens.json`, 'utf8');

    await removeDirectoryContents(buildPath + '/export');

    if (content) {
      const rawData = JSON.parse(content).kda.foundation;

      Object.keys(rawData).filter(foundationItemKey => !excludeExportPaths.includes(foundationItemKey)).forEach(async (foundationItemKey) => {
        const foundationItemExportPath = join(__dirname, `${buildPath}/export/${foundationItemKey}.tokens.json`)
        await writeFile(foundationItemExportPath, JSON.stringify({
          kda: {
            foundation: {
              [foundationItemKey]: rawData[foundationItemKey]
            },
          },
        }), { flag: 'w', encoding: 'utf-8' })
      })
    }

  } catch (error) {
    console.error(`Error while exporting tokens.`, error)
  }
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

  const destPath = `${buildPath}/kda-design-system.raw.tokens.json`;
  const writeFilePath = join(__dirname, destPath);
  await writeFile(writeFilePath, JSON.stringify(result), { flag: 'w', encoding: 'utf-8' })

  StyleDictionary(destPath)

  createExportFiles()

})()
