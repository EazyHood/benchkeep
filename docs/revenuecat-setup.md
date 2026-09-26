# Benchkeep purchases

The native app unlocks **Full bench** from RevenueCat entitlement `benchkeep_plus`. The product is a one-time purchase. The app reads its localized price from the store; it contains no invented price or local premium toggle. A production web preview stays on the free plan; an explicitly configured development web build can exercise the real RevenueCat Test Store.

## Current status

- Project `743c3f39` (Benchkeep) was configured through the authenticated RevenueCat dashboard.
- Offering `default`, predefined package `$rc_lifetime`, product `benchkeep_full_lifetime` (internal `prod3b73959b40`) and entitlement `benchkeep_plus` are mapped and verified. The product title is “Full bench — lifetime unlock” and its **sandbox-only test price is USD 4.99**. The app retrieves the price from the SDK.
- The Test Store public key is in ignored `.env.local`, with explicit development mode. No secret RevenueCat key or store-service credentials are used in client code.
- The full suite passed **27 tests** and TypeScript checking on 26 September. Eight purchase tests use a test-only gateway and make **no RevenueCat calls or purchases**. They establish application behavior; actual integration outcomes are listed separately below.
- The final Android APK was exercised on an **Android 16 emulator** without Metro: SDK offering/price loading, cancellation remaining locked, a valid Test Store purchase unlocking Full bench, the native restore action retaining access, and access after an app restart. The native restore result concerns the same sandbox installation; it does not establish a Google Play/Galaxy store purchase or cross-device restoration. See [QA](qa-nextgen-2026-09-26.md).
- The historical [browser QA session](qa-session-2026-09-14.md) separately completed official Web SDK Test Store cancellation, failure, valid purchase, access refresh and reload. Its successful purchase enabled a third project and was corroborated in the RevenueCat sandbox dashboard. These browser outcomes are not described as native tests.
- No physical-device test, real-money transaction or public app-store release has been performed. The final native run did not exercise the SDK's failed-purchase option; pending/failure handling remains covered by the automated cases and the separate browser record.

## Dependencies

Verified against npm and the installed package declarations on 2026-09-14:

```sh
npm install --save-exact react-native-purchases@10.9.1 react-native-purchases-store-galaxy@10.9.1
npm install --save-exact @revenuecat/purchases-js@1.60.1
npx expo install expo-constants
```

The Galaxy add-on has an exact `react-native-purchases` peer dependency; keep the versions aligned. `react-native-purchases-ui` is unnecessary for this custom purchase panel. Expo SDK 57 uses React Native 0.86; native purchases require a rebuilt development or store app. [SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/), [RevenueCat React Native integration](https://www.revenuecat.com/docs/getting-started/installation/reactnative).

## App contract

```ts
import { useBenchkeepPurchases } from './src/purchases/useBenchkeepPurchases';

const {
  status,     // unavailable | loading | ready | error
  isPlus,     // only an active benchkeep_plus entitlement from CustomerInfo
  product,    // { id, title, description, price }, or null
  message,
  busy,
  sandbox,    // explicit development test mode; display it clearly
  store,
  refresh,
  purchase,
  restore,
} = useBenchkeepPurchases();
```

Disable purchase when `busy`, `product === null`, or already `isPlus`. Offer restore even when no product is available, provided the native store is connected. Show `product.price` unchanged as the one-time price. Keep access to existing projects if the store is offline; do not delete user data when premium status cannot be verified.

Actions return a status and optional message. Cancellation is separate from failure. Pending approval and a resolved SDK call without the expected entitlement never grant access. Duplicate taps cannot initiate concurrent transactions. The app refreshes after returning to the foreground and listens for native CustomerInfo updates. Existing RevenueCat SDK caching may apply; this is not a claim that every read reaches the server.

## Public configuration

Expo statically inlines these `EXPO_PUBLIC_*` values. They are public client configuration, not secrets. SDK public keys are appropriate; `sk_` keys are rejected. Never place store private keys or RevenueCat admin credentials in these variables. [RevenueCat API keys](https://www.revenuecat.com/docs/projects/authentication).

| Variable | Accepted values / use |
|---|---|
| `EXPO_PUBLIC_REVENUECAT_MODE` | `production` (default), `test-store`, `galaxy-test` |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_STORE` | `google` (default) or `galaxy` |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | Public SDK key of the actual Apple app |
| `EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY` | Public SDK key of the actual Google Play app |
| `EXPO_PUBLIC_REVENUECAT_GALAXY_KEY` | Public SDK key of the actual Galaxy Store app |
| `EXPO_PUBLIC_REVENUECAT_TEST_STORE_KEY` | Test Store public SDK key; requires `test-store` mode |

Example development configuration, without a real key:

```dotenv
EXPO_PUBLIC_REVENUECAT_MODE=test-store
EXPO_PUBLIC_REVENUECAT_TEST_STORE_KEY=
```

Restart Metro after environment changes. Test modes also require `__DEV__ === true`; they fail closed in release builds. A Test Store key is rejected in production mode, including if accidentally assigned to a platform variable. Each release must use its own public platform key.

For the Android judging APK, use the documented `standaloneDebug` recipe: Android remains `debuggable=true` and JavaScript remains in development mode, while the native host disables Metro specifically for that variant. RevenueCat rejects Test Store keys in non-debuggable APKs. No dangerous SDK setting is used. The Expo bootstrap adapter skips only the development-tools socket for an embedded Test Store bundle; it does not alter purchase logic. See [Android build](android-build.md).

For a Galaxy development purchase, choose `galaxy-test`, the `galaxy` Android store, and the real Galaxy public SDK key. Switch to `production` for Galaxy beta or store distribution. Test purchase authorization should still use a licensed tester; ordinary beta users can incur charges. [Samsung beta testing](https://developer.samsung.com/galaxy-store/launch.html).

## Dashboard configuration

1. Keep entitlement identifier exactly `benchkeep_plus`.
2. Configure a **non-consumable / one-time** product for each target store and attach it to this entitlement. Do not substitute a subscription.
3. In offering `default`, place that product in the Lifetime package, whose predefined identifier is `$rc_lifetime`.
4. Confirm product availability, active status and country coverage. No package returned means purchase remains disabled.
5. Verify each public SDK key belongs to the matching store app and native bundle/package ID.

The native gateway checks the predefined lifetime package, non-subscription category, absent subscription period and nonempty localized price before offering purchase. After purchase or restore, only active `benchkeep_plus` access can unlock the plan. Informational entitlement verification is enabled, and a reported verification failure denies access.

Galaxy additionally needs Seller Portal commercial approval, service credentials configured securely in RevenueCat, and Samsung products activated. These credentials stay in the provider dashboard, not this project. [Galaxy–RevenueCat connection](https://www.revenuecat.com/docs/platform-resources/galaxy-platform-resources/galaxy-setup-guide).

## Development web Test Store

With `EXPO_PUBLIC_REVENUECAT_MODE=test-store`, a Test Store key, and `__DEV__ === true`, the hook loads `webTestGateway.ts` instead of the native SDK. This calls the official Web SDK's `getOfferings`, `purchase` and `getCustomerInfo` APIs against RevenueCat. The SDK supplies the Test Store confirmation modal; Benchkeep never manufactures an entitlement. [Web SDK](https://www.revenuecat.com/docs/web/web-billing/web-sdk), [Test Store support, including Web SDK](https://www.revenuecat.com/docs/test-and-launch/sandbox/test-store).

Show **Test purchase · no real charge** whenever `sandbox` is true. This path tests app gating against RevenueCat sandbox records; it does not exercise Samsung billing or qualify as store publication. Web production billing remains disabled.

Web sandbox uses a randomly generated RevenueCat anonymous customer ID retained in `localStorage` under `benchkeep.revenuecat.sandboxUserId.v1`. It contains no premium flag. The web Restore action refreshes that customer's server record; it does **not** restore native store purchases or transfer identity between devices. Clearing browser storage loses this sandbox identity. Native restore uses the actual store SDK API.

## Native evidence and remaining checks

The 26 September final APK used source commit `227b2d75db31613107042ace40729b4b4ec4372c` and APK SHA-256 `9F16E220BAC060F7235774B49C6F84F0462E96EB3B2B44BFFC897C33D8985A5B`.

| Check | Observed scope |
|---|---|
| Cold start without Metro | Passed on Android 16 emulator. |
| Product/price loading | Native SDK supplied the $4.99 sandbox Full bench product. |
| Cancellation | SDK modal cancelled; the unlock action remained available and access stayed locked. |
| Valid sandbox purchase | SDK's valid Test Store outcome produced Full bench unlocked. |
| Restore action and restart | Full bench remained unlocked in the same sandbox installation. |
| Reading saved work offline | Photo, point and next move survived force-stop/restart with network disabled; the expected RevenueCat network failure did not block reading. |
| Third-piece capacity, pending/failed response handling | Automated controller/model cases; browser evidence is described separately. Not replayed as part of the final native purchase run. |
| Production store and physical device | Not tested; no live billing or store-signed restoration claimed. |

**Test Store is a simulated purchase environment backed by real RevenueCat sandbox records. It is not a real-money sale or public store release.** RevenueCat requires replacing Test Store keys before submitting to a store. [Test Store documentation](https://www.revenuecat.com/docs/test-and-launch/sandbox/test-store).

Expo Go automatically substitutes preview APIs in the RevenueCat SDK; Benchkeep blocks that runtime before loading the native gateway, and checks that `RNPurchases` actually exists. Therefore preview results cannot create premium evidence. A native rebuild is required. [Expo integration and preview behavior](https://www.revenuecat.com/docs/getting-started/installation/expo).

For Galaxy, Samsung explicitly supports Remote Test Lab to exercise IAP on a real remote Galaxy. Use it after the seller/product setup is complete. [Samsung integration tutorial](https://developer.samsung.com/galaxy-store/blog/en/2026/08/13/integrating-revenuecat-with-samsung-in-app-purchase-for-galaxy-store-applications).

## Local checks

```sh
npx tsx --test src/purchases/purchases.test.ts
npx tsc --noEmit
```

The test fixture price and entitlement responses exist only in `purchases.test.ts`; production never imports this file. The tests cover unsupported runtime, missing/secret/misplaced keys, release isolation, entitlement name/activity/signature failure, cancellation, pending approval, restore, offline refresh, missing product and concurrent clicks. The native SDK observations above are separate from those test doubles and remain sandbox-only.
