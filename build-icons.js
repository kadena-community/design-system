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

function makeIconsReadme(template, iconFilenames, templateFilename) {
  const headerStopText = '## Icons';
  let headerStopIdx = template.indexOf(headerStopText);
  if (headerStopIdx === -1) {
    throw new Error(`The template stop line "${headerStopText}" was not found in the Icons readme template: ${templateFilename}`);
  }
  let readmeContents = `${template.slice(0, headerStopIdx)}${headerStopText}\n\n`;
  const iconSection = iconFilenames.map(iconFilename => {
    const absoluteIconsPath = resolve(__dirname, 'icons');
    const relativeFilename = relative(absoluteIconsPath, iconFilename);
    let iconName = iconFilename.substr(iconFilename.lastIndexOf('/')+1);
    iconName = iconName.replace('.svg', '').replace(/[_-]/g, ' ');
    return `![${iconName}](https://raw.githubusercontent.com/kadena-community/design-system/main/icons/${relativeFilename} "${iconName}")`;
  });
  return readmeContents + iconSection.join('\n');
}

(async function () {
  const iconFilenames = (await getFiles('./icons')).filter(x => x.endsWith('.svg'));
  const svgs = iconFilenames.map(svg => {
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
    }), { flag: 'w', encoding: 'utf-8' })
  })

  const writeSVGFilePath = join(__dirname, `./builds/tokens/kda-design-system.raw.svg.tokens.json`)
  await writeFile(writeSVGFilePath, JSON.stringify({ kda: { foundation: { icon: jsonFile } } }), { flag: 'w', encoding: 'utf-8' })

  const readmeTemplateFilename = join(__dirname, './icons/README.md.template');
  const readmeFilename = join(__dirname, './icons/README.md');
  const template = readFileSync(readmeTemplateFilename).toString();
  const readmeContents = makeIconsReadme(template, iconFilenames, readmeTemplateFilename);
  writeFileSync(readmeFilename, readmeContents);
})()
