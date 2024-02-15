const { resolve, relative, join } = require('path');
const { readFileSync } = require('fs');
const { readdir } = require('fs').promises;
const set = require('lodash/set')
const get = require('lodash/get');
const { writeFile } = require('fs/promises');

async function getFiles(dir) {
  const dirents = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = resolve(dir, dirent.name);
    return dirent.isDirectory() ? getFiles(res) : res;
  }));
  return Array.prototype.concat(...files);
}

(async function () {
  const icons = await getFiles('./icons');
  const svgs = icons.filter(x => x.endsWith('.svg')).map(svg => {
    const content = readFileSync(svg, 'utf8');
    const file = relative('./icons', svg).split('/').pop();
    const name = (content.match(/name="(.*?)"/) ?? [])[1] ?? file.replace('.svg', '');
    const style = (content.match(/data\-style="(.*?)"/) ?? [])[1];
    const description = (content.match(/description="(.*?)"/) ?? [])[1];
    const width = +(content.match(/width="(.*?)"/) ?? [])[1];
    const height = +(content.match(/height="(.*?)"/) ?? [])[1];

    return {
      path: svg,
      folder: relative('./icons', svg).split('/').slice(0, -1).concat(`${style}_${name}`),
      file,
      style,
      content,
      name,
      dimensions: { width, height },
      description: description ?? ''
    }
  });

  const jsonFile = svgs.reduce((memo, svg) => {
    set(memo, svg.folder.join('.'), {
      "$type": "icon",
      "$name": svg.name,
      "$description": svg.description,
      "$style": svg.style,
      "$value": svg.content,
      "$dimensions": svg.dimensions,
      ...get(memo, svg.folder.join('.'))
    })
    return memo;
  }, {});

  Object.keys(jsonFile).forEach(async (iconType) => {
    const writeFilePath = join(__dirname, `./tokens/foundation/icon/${iconType}/svg.${iconType}.tokens.json`)
    await writeFile(writeFilePath, JSON.stringify({
      kda: {
        foundation: {
          icon: {
            [iconType]: jsonFile[iconType]
          }
        }
      }
    }, null, 2), { flag: 'w', encoding: 'utf-8' })
  })
})()
