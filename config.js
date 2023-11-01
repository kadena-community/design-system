// config.js
module.exports = {
  source: [`tokens/**/*.json`],
  platforms: {
    css: {
      transformGroup: "css",
      buildPath: "builds/tokens/",
      files: [
        {
          format: "json/nested",
          destination: "kda-design-system.tokens.json",
        }
      ]
    }
  }
}
