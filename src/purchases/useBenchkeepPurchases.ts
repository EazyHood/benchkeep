import { useEffect, useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { resolvePurchaseConfiguration } from './config';
import { createPurchasesController } from './controller';

// Expo inlines only direct EXPO_PUBLIC property references. These must contain
// public SDK keys, never RevenueCat secret keys or store service-account keys.
const configuration = resolvePurchaseConfiguration({
  platform: Platform.OS,
  isExpoGo: Constants.executionEnvironment === ExecutionEnvironment.StoreClient,
  isDevelopment: typeof __DEV__ !== 'undefined' && __DEV__,
  mode: process.env.EXPO_PUBLIC_REVENUECAT_MODE,
  androidStore: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_STORE,
  iosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  googleKey: process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY,
  galaxyKey: process.env.EXPO_PUBLIC_REVENUECAT_GALAXY_KEY,
  testKey: process.env.EXPO_PUBLIC_REVENUECAT_TEST_STORE_KEY,
});

const controller = createPurchasesController(configuration, async () => {
  if (Platform.OS === 'web') {
    const { createWebTestPurchasesGateway } = await import('./webTestGateway');
    return createWebTestPurchasesGateway();
  }
  const { createNativePurchasesGateway } = await import('./nativeGateway');
  return createNativePurchasesGateway();
});

/** Full bench is read only from RevenueCat; there is no stored/local premium flag. */
export function useBenchkeepPurchases() {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useEffect(() => {
    void controller.start();
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active') void controller.refresh();
    });
    return () => subscription.remove();
  }, []);
  return { ...state, refresh: controller.refresh, purchase: controller.purchase, restore: controller.restore };
}
