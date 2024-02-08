function init(dest) {
  const StyleDictionary = require('style-dictionary').extend({
    source: [dest],
    platforms: {
      KDA_TOKENS: {
        transformGroup: "KDA_TOKENS",
        buildPath: "builds/tokens/",
        files: [
          {
            format: "json/nested",
            destination: "kda-design-system.tokens.json",
          }
        ]
      }
    },
  });
  StyleDictionary.registerTransform({
    name: 'createTokens',
    type: 'attribute',
    transitive: false,
    transformer: function () { }
  });

  StyleDictionary.registerTransformGroup({
    name: 'KDA_TOKENS',
    transforms: [
      'createTokens',
      'attribute/cti',
      'name/cti/kebab',
      'time/seconds',
      'content/icon',
      'size/rem',
      'color/css',
    ]
  })
  StyleDictionary.buildAllPlatforms();
}

module.exports = init;
