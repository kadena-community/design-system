const { resolve, relative, join } = require('path');
const { readFileSync, writeFileSync } = require('fs');
const { readdir } = require('fs').promises;
const set = require('lodash/set')
const get = require('lodash/get')

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
    const description = (content.match(/description="(.*?)"/) ?? [])[1];
    return {
      path: svg,
      folder: relative('./icons', svg).split('/').slice(0, -1).concat(name),
      file,
      content,
      name,
      description: description ?? ''
    }
  });

  const jsonFile = svgs.reduce((memo, svg) => {
    set(memo, svg.folder.join('.'), {
      "$type": "icon",
      "$description": svg.description,
      "$value": svg.content,
      ...get(memo, svg.folder.join('.'))
    })
    return memo;
  }, {});


  const result = {
    kda: {
      foundation: { icon: jsonFile }
    }
  }

  const writeFile = join(__dirname, './tokens/foundation/icon.tokens.json')
  writeFileSync(writeFile, JSON.stringify(result, null, 2), 'utf8')
})()

