import { Purchases, PurchasesError, ErrorCode, PackageType, ProductType, type Package } from '@revenuecat/purchases-js';
import { PLUS_OFFERING, PLUS_PACKAGE } from './config';
import type { PurchasesGateway } from './controller';
import { hasConfirmedPlus } from './verifiedAccess';

const SANDBOX_CUSTOMER_KEY = 'benchkeep.revenuecat.sandboxUserId.v1';

/** Real RevenueCat Test Store calls. Never loaded by a production web build. */
export function createWebTestPurchasesGateway(): PurchasesGateway {
  let client: Purchases | null = null;
  let selectedPackage: Package | null = null;
  const getClient = () => {
    if (!client) throw new Error('Test Store is not connected.');
    return client;
  };
  return {
    async initialize(config) {
      if (typeof __DEV__ === 'undefined' || !__DEV__ || !config.sandbox
        || config.store !== 'test' || !config.apiKey.startsWith('test_')) {
        throw new Error('Web purchases are restricted to development Test Store.');
      }
      // This ID identifies a sandbox customer; it never records premium status.
      let appUserId = localStorage.getItem(SANDBOX_CUSTOMER_KEY);
      if (!appUserId) {
        appUserId = Purchases.generateRevenueCatAnonymousAppUserId();
        localStorage.setItem(SANDBOX_CUSTOMER_KEY, appUserId);
      }
      client = Purchases.configure({ apiKey: config.apiKey, appUserId });
    },
    async getIsPlus() {
      return hasConfirmedPlus(await getClient().getCustomerInfo());
    },
    async getProduct() {
      selectedPackage = null;
      const offerings = await getClient().getOfferings();
      const candidate = offerings.all[PLUS_OFFERING]?.availablePackages.find(item => item.identifier === PLUS_PACKAGE);
      const product = candidate?.webBillingProduct;
      if (!candidate || !product || candidate.packageType !== PackageType.Lifetime
        || product.productType !== ProductType.NonConsumable
        || product.normalPeriodDuration !== null || product.defaultSubscriptionOption !== null
        || !product.defaultNonSubscriptionOption || !product.price.formattedPrice.trim()) return null;
      selectedPackage = candidate;
      return { id: product.identifier, title: product.title || 'Full bench', description: product.description || '', price: product.price.formattedPrice };
    },
    async purchase() {
      if (!selectedPackage) throw new Error('No Test Store lifetime package is available.');
      try {
        const result = await getClient().purchase({ rcPackage: selectedPackage });
        return hasConfirmedPlus(result.customerInfo);
      } catch (error) {
        if (error instanceof PurchasesError && error.errorCode === ErrorCode.UserCancelledError) {
          throw { userCancelled: true, code: '1' };
        }
        throw error;
      }
    },
    async restore() {
      // The Web SDK has no native-store restore API. Refresh only this persisted
      // Test Store customer's server record; no claim of cross-store restoration.
      return hasConfirmedPlus(await getClient().getCustomerInfo());
    },
    onCustomerInfoChanged() {
      // Web refresh occurs after purchase/restore and when the app regains focus.
      return () => {};
    },
  };
}
