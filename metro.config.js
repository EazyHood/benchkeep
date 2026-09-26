const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const expoRoot = path.dirname(require.resolve('expo/package.json'));
const messageSocket = path.join(expoRoot, 'src/async-require/messageSocket.native.ts');
const embeddedSafeSocket = path.join(__dirname, 'scripts/runtime/expo-message-socket.cjs');

// Expo 57 assumes every development bundle came from Metro. The standalone
// Test Store APK deliberately embeds development JS, so guard only that socket.
// A normal Metro session still runs Expo's original implementation.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolved = context.resolveRequest(context, moduleName, platform);
  if (platform === 'android' && resolved.type === 'sourceFile'
    && path.normalize(resolved.filePath) === path.normalize(messageSocket)
    && path.normalize(context.originModulePath) !== path.normalize(embeddedSafeSocket)) {
    return { type: 'sourceFile', filePath: embeddedSafeSocket };
  }
  return resolved;
};

module.exports = config;
