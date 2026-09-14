export const PLUS_ENTITLEMENT = 'benchkeep_plus';
export const PLUS_OFFERING = 'default';
export const PLUS_PACKAGE = '$rc_lifetime';

export type PurchaseStore = 'apple' | 'google' | 'galaxy' | 'test';
export type PurchaseConfiguration = {
  apiKey: string;
  store: PurchaseStore;
  sandbox: boolean;
  galaxyTest: boolean;
};

export type PurchaseEnvironment = {
  platform: string;
  isExpoGo: boolean;
  isDevelopment: boolean;
  mode?: string;
  androidStore?: string;
  iosKey?: string;
  googleKey?: string;
  galaxyKey?: string;
  testKey?: string;
};

export type ConfigurationResult =
  | { available: true; config: PurchaseConfiguration }
  | { available: false; reason: string };

/** Never infer that an Expo Go preview, a missing key or a test key is a live store. */
export function resolvePurchaseConfiguration(env: PurchaseEnvironment): ConfigurationResult {
  const mode = env.mode?.trim() || 'production';
  if (env.platform === 'web' && env.isDevelopment && mode === 'test-store') {
    const apiKey = env.testKey?.trim();
    if (apiKey?.startsWith('test_') && apiKey.length > 5 && !/\s/.test(apiKey)) {
      return { available: true, config: { apiKey, store: 'test', sandbox: true, galaxyTest: false } };
    }
  }
  if (env.platform !== 'ios' && env.platform !== 'android') {
    return { available: false, reason: 'Full bench purchases are available in the native app. Your projects remain available here.' };
  }
  if (env.isExpoGo) {
    return { available: false, reason: 'Purchases need the installed Benchkeep app. This preview cannot buy or restore Full bench.' };
  }
  if (!['production', 'test-store', 'galaxy-test'].includes(mode)) {
    return { available: false, reason: 'The store configuration is unavailable. Please try an updated app.' };
  }
  if (mode !== 'production' && !env.isDevelopment) {
    return { available: false, reason: 'Test purchases are disabled in this release. Please install a correctly configured app.' };
  }
  let store: PurchaseStore;
  let key: string | undefined;
  if (mode === 'test-store') {
    store = 'test';
    key = env.testKey;
  } else if (env.platform === 'ios') {
    if (mode === 'galaxy-test') {
      return { available: false, reason: 'Galaxy test purchases are only available on Android.' };
    }
    store = 'apple';
    key = env.iosKey;
  } else {
    const androidStore = env.androidStore?.trim() || 'google';
    if (androidStore !== 'google' && androidStore !== 'galaxy') {
      return { available: false, reason: 'The Android store configuration is unavailable.' };
    }
    if (mode === 'galaxy-test' && androidStore !== 'galaxy') {
      return { available: false, reason: 'Galaxy test purchases require the Galaxy Store build.' };
    }
    store = androidStore;
    key = store === 'google' ? env.googleKey : env.galaxyKey;
  }
  const apiKey = key?.trim();
  // Secret REST keys never belong in the app. Do not guess a Galaxy key prefix:
  // the SDK validates the platform key and any failed validation grants no access.
  if (!apiKey || apiKey.startsWith('sk_') || /\s/.test(apiKey)
    || (store === 'test' ? !apiKey.startsWith('test_') || apiKey.length <= 5 : apiKey.startsWith('test_'))) {
    return { available: false, reason: 'Full bench is not available from this build yet. No purchase has been made.' };
  }
  return { available: true, config: { apiKey, store, sandbox: mode !== 'production', galaxyTest: mode === 'galaxy-test' } };
}
