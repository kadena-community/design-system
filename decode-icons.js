const { resolve, join } = require('path');
const { readFileSync } = require('fs');
const { readdir } = require('fs').promises;
const { writeFile, mkdir } = require('fs/promises');

const [, , sourceDir, targetDir] = process.argv;
const iconStyle = process.argv[4] || 'custom';
const iconSize = Number(process.argv[5]) || 24;

if (!sourceDir || !targetDir) {
  console.error('Please provide a json file and a target directory');
  process.exit(1);
} else {
  const sourceDirMatchesDirectory = sourceDir.match(/\/([^/]+)$/);
  const targetDirMatchesDirectory = targetDir.match(/\/([^/]+)$/);

  if (!sourceDirMatchesDirectory || !targetDirMatchesDirectory) {
    console.error('Please provide a valid json file and a target directory');
    process.exit(1);
  }

  if (isNaN(iconSize)) {
    console.error('Please provide a valid icon size');
    process.exit(1);
  }
}

function transformIconAttributes(icon) {
  icon = icon.replace(/<\?xml[^>]*\?>\s*/, '');
  icon = icon.replace(/<!DOCTYPE [^>]*>\s*/, '');

  const viewBoxMatch = icon.match(/viewBox="([\d\s.]+)"/);

  if (viewBoxMatch) {
    const viewBoxValues = viewBoxMatch[1].split(' ').map(Number);
    const viewBoxWidth = viewBoxValues[2];
    const viewBoxHeight = viewBoxValues[3];
    const newHeight = iconSize;
    const newWidth = (viewBoxWidth / viewBoxHeight) * newHeight;

    icon = icon.replace(/height="[\d.]+px?"/, `height="${newHeight}px"`);
    icon = icon.replace(/width="[\d.]+px?"/, `width="${newWidth}px"`);

    const svgTagMatch = icon.match(/<svg[^>]*>/);

    if (svgTagMatch) {
      const [svgTag] = svgTagMatch;
      const hasWidth = /width="[\d.]+(px)?"/.test(svgTag);
      const hasHeight = /height="[\d.]+(px)?"/.test(svgTag);
      let newSvgTag = svgTag;

      if (!hasWidth) {
        newSvgTag = newSvgTag.replace('<svg', `<svg width="${newWidth}px"`);
      } else {
        newSvgTag = newSvgTag.replace(/width="[\d.]+(px)?"/, `width="${newWidth}px"`);
      }

      if (!hasHeight) {
        newSvgTag = newSvgTag.replace('<svg', `<svg height="${newHeight}px"`);
      } else {
        newSvgTag = newSvgTag.replace(/height="[\d.]+(px)?"/, `height="${newHeight}px"`);
      }

      icon = icon.replace(svgTag, newSvgTag);
    }
  }

  return icon.replace('<svg ', `<svg data-style="${iconStyle}" `)
}

async function getFiles(dir) {
  const dirents = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = resolve(dir, dirent.name);
    return dirent.isDirectory() ? getFiles(res) : res;
  }));
  return Array.prototype.concat(...files);
}

function toCamelCase(str) {
  const words = str.split(' ');
  const firstWord = words[0].toLowerCase();
  const capitalizedWords = words.slice(1).map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );

  return firstWord + capitalizedWords.join('');
}

(async function () {
  const iconFilenames = (await getFiles(sourceDir)).filter(x => x.endsWith('.json'));
  const svgs = iconFilenames.reduce((allIcons, jsonFile) => {
    const jsonContent = readFileSync(jsonFile, 'utf8');
    const content = JSON.parse(jsonContent);

    const icons = Object.values(content);

    const decodedIcons = icons.reduce((icons, icon) => {
      if (icon.icon_dark) {
        const [, base64StringDark] = icon.icon_dark.split(',');
        const [, base64StringLight] = icon.icon_light.split(',');
        return [
          ...icons,
          {
            name: toCamelCase(icon.name),
            content_dark: transformIconAttributes(atob(base64StringDark)),
            content_light: transformIconAttributes(atob(base64StringLight)),
          }
        ]
      }

      return icons
    }, []);

    return [
      ...allIcons,
      ...decodedIcons,
    ]
  }, []);

  Object.values(svgs).forEach(async (svg) => {
    const directoryPath = `${targetDir}/${svg.name}`
    await mkdir(directoryPath, { recursive: true });

    const writeFilePathDark = join(__dirname, `${directoryPath}/dark.svg`)
    await writeFile(writeFilePathDark, svg.content_dark, { flag: 'w', encoding: 'utf-8' })

    const writeFilePathLight = join(__dirname, `${directoryPath}/light.svg`)
    await writeFile(writeFilePathLight, svg.content_light, { flag: 'w', encoding: 'utf-8' })
  });
})()
