// config.js
module.exports = {
  source: [`kda/**/*.json`],
  platforms: {
    css: {
      transformGroup: "css",
      buildPath: "build/",
      files: [
        {
          format: "json/nested",
          destination: "kda-design-system.tokens.json",
        }
      ]
    }
  }
}