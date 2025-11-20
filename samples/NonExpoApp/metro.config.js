const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const escape = require('escape-string-regexp');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const pak = require('../../package.json');

const root = path.resolve(__dirname, '..', '..');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const modules = Object.keys({
  ...pak.peerDependencies,
});

module.exports = mergeConfig(getDefaultConfig(__dirname), {
  projectRoot: __dirname,
  watchFolders: [root],

  resolver: {
    blockList: exclusionList(
      modules.map(
        (m) =>
          new RegExp(`^${escape(path.join(root, 'node_modules', m))}\\/.*$`)
      )
    ),

    extraNodeModules: modules.reduce((acc, name) => {
      acc[name] = path.join(__dirname, 'node_modules', name);
      return acc;
    }, {}),
  },

  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
});
