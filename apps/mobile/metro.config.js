const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const sharedTypesPath = path.resolve(projectRoot, '..', '..', 'packages', 'shared-types');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [sharedTypesPath];
config.resolver.extraNodeModules = {
  '@resqnet/shared-types': sharedTypesPath,
};

module.exports = config;
