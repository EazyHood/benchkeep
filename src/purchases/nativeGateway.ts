import { NativeModules } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
  PACKAGE_TYPE,
  PRODUCT_CATEGORY,
} from 'react-native-purchases';
import { GALAXY_BILLING_MODE } from 'react-native-purchases-store-galaxy';
import { PLUS_OFFERING, PLUS_PACKAGE } from './config';
import type { PurchasesGateway } from './controller';
import { hasConfirmedPlus } from './verifiedAccess';

export function createNativePurchasesGateway(): PurchasesGateway {
  let selectedPackage: PurchasesPackage | null = null;
  return {
    async initialize(config) {
      // Also reject missing native code if Expo's environment detection changes.
      // RevenueCat's preview/browser implementation must never unlock this app.
      if (!NativeModules.RNPurchases) throw new Error('Native purchases module is unavailable.');
      const common = {
        apiKey: config.apiKey,
        entitlementVerificationMode: Purchases.ENTITLEMENT_VERIFICATION_MODE.INFORMATIONAL,
      };
      if (config.store === 'galaxy') {
        Purchases.configure({ ...common, store: 'GALAXY', galaxyBillingMode: config.galaxyTest ? GALAXY_BILLING_MODE.TEST : GALAXY_BILLING_MODE.PRODUCTION });
      } else {
        Purchases.configure(common);
      }
      if (!await Purchases.isConfigured()) throw new Error('Purchases could not be configured.');
    },
    async getIsPlus() {
      return hasConfirmedPlus(await Purchases.getCustomerInfo());
    },
    async getProduct() {
      selectedPackage = null;
      const offerings = await Purchases.getOfferings();
      const offering = offerings.all[PLUS_OFFERING];
      const candidate = offering?.availablePackages.find(item => item.identifier === PLUS_PACKAGE);
      if (!candidate
        || candidate.packageType !== PACKAGE_TYPE.LIFETIME
        || candidate.product.productCategory !== PRODUCT_CATEGORY.NON_SUBSCRIPTION
        || candidate.product.subscriptionPeriod !== null
        || !candidate.product.priceString.trim()) return null;
      selectedPackage = candidate;
      return {
        id: candidate.product.identifier,
        title: candidate.product.title || 'Full bench',
        description: candidate.product.description,
        price: candidate.product.priceString,
      };
    },
    async purchase() {
      if (!selectedPackage) throw new Error('No verified lifetime package is available.');
      const result = await Purchases.purchasePackage(selectedPackage);
      // A resolved SDK call without the expected active entitlement is not success.
      return hasConfirmedPlus(result.customerInfo);
    },
    async restore() {
      return hasConfirmedPlus(await Purchases.restorePurchases());
    },
    onCustomerInfoChanged(listener) {
      const handler = (info: CustomerInfo) => listener(hasConfirmedPlus(info));
      Purchases.addCustomerInfoUpdateListener(handler);
      return () => { Purchases.removeCustomerInfoUpdateListener(handler); };
    },
  };
}
