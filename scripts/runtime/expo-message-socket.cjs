// Development tools need a Metro server; RevenueCat Test Store does not.
// Keep Expo's WebSocket behavior unchanged for actual development-server loads.
const getDevServer = require('expo/src/async-require/getDevServer').default;
const embeddedTestStore = __DEV__
  && process.env.EXPO_PUBLIC_REVENUECAT_MODE === 'test-store'
  && !getDevServer().bundleLoadedFromServer;
if (!embeddedTestStore) {
  require('expo/src/async-require/messageSocket.native');
}
