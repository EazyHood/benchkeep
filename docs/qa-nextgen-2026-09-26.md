# Benchkeep — Next Gen QA (2026-09-26)

## Current status

The corrected source passes **27 automated tests** and **TypeScript checking**. The independent Android reviewer exercised the final standalone APK on an **Android 16 emulator**: cold start without Metro, photo/checkpoint creation, focus and resume, offline state after force-stop/restart, RevenueCat Test Store cancellation, a valid sandbox purchase, restore and premium access after restart. These are actual emulator observations, separate from the mocked gateway tests.

The original 23 September APK failed on-device startup and is superseded. The corrected artifact below includes an Expo bootstrap adapter and an explicitly debuggable Test Store variant. No production store release, real-money purchase, student eligibility determination or completed competition submission is claimed by this report.

## Source and artifact checked

Published source commit: [`227b2d75db31613107042ace40729b4b4ec4372c`](https://github.com/EazyHood/benchkeep/commit/227b2d75db31613107042ace40729b4b4ec4372c). The submission owner published the source and the [Android sandbox release](https://github.com/EazyHood/benchkeep/releases/tag/shipaton-nextgen-2026-09-26); this reviewer performed no commits or publication.

- APK: `android/app/build/outputs/apk/standaloneDebug/app-standaloneDebug.apk`
- Published asset: `benchkeep-nextgen-sandbox-2026-09-26.apk`
- APK size: 168,055,427 bytes
- Build time: 2026-09-26T15:44:52Z
- APK SHA-256: `9F16E220BAC060F7235774B49C6F84F0462E96EB3B2B44BFFC897C33D8985A5B`
- Embedded bundle size: 4,372,284 bytes
- Embedded bundle SHA-256: `8BBCFB204648D5E5E57794AB8668D1B77E638293555A3D377102F6B9DFFA89C1`
- The source map contains the new bootstrap adapter and its source matches the checked file.

| Check actually executed | Result |
|---|---|
| `npm test` | 27 passed; 0 failures; 0 skipped. |
| `npm run typecheck` | Exit code 0. |
| Standalone build with bootstrap correction | Successful; 439 tasks, 22 executed. |
| Final standalone build with explicit Android debug flag | Successful in 1m 1s; 281 tasks, 38 executed. |
| APK/bundle hashes and source-map adapter | Recorded above; adapter source matches. |
| Independent Android cold start of the final APK | Passed without Metro/ADB reverse; UI rendered, existing finished piece retained, no new crash. |
| Independent photo/checkpoint workflow | Android picker import, point placement, title/next move/detail, save, focus/whole view and resume passed. The demonstration used a generated sample image, not customer data. |
| Independent offline restart | Airplane mode/Wi-Fi off, force-stop/relaunch: photo, point and next move remained readable despite the expected RevenueCat network error. |
| Native RevenueCat offering/cancellation | $4.99 sandbox product loaded; cancelling the SDK modal kept access locked. |
| Native valid Test Store purchase | SDK's valid purchase outcome unlocked Full bench. No payment was made. |
| Native restore/restart | Restore action retained unlocked access; force-stop/relaunch retained Full bench in the same sandbox installation. |
| APK identity checks by submission owner | Published hash matched; APK v2 signature verified with the template debug signer; min SDK 24, target 36, debuggable. |

The published source commit also has a successful [GitHub Actions run](https://github.com/EazyHood/benchkeep/actions/runs/36253439246). CI checks and the separately observed Android run establish different parts of this evidence.

No dependency install, SDK purchase-guard override, publication or store transaction was performed by this reviewer. The independent Android reviewer performed the no-charge Test Store interactions above; the submission owner verified and published the artifact.

## Runtime finding and correction

The original APK SHA-256 `A7257902888328BA802DBD23393801D541BA428663AAA5873A2BC53696902F6B` matched its source and passed 25 unit tests, yet its first actual Android cold start failed with `Cannot create devtools websocket connections in embedded environments.` Expo 57's development bootstrap assumed a Metro server while the sandbox variant embedded its development JavaScript.

The Metro resolver now routes only Expo's exact Android message-socket module through a small adapter. It skips that development-tools socket only when JavaScript is in development mode, RevenueCat mode is explicitly `test-store`, and the bundle was not loaded from a server. Actual Metro sessions retain the upstream socket. Other modules, iOS, web and release behavior are unaffected. Two new boundary tests exercise the conditions, exact resolution path and non-recursive fallback. See the [Expo Metro resolver documentation](https://docs.expo.dev/guides/customizing-metro/#aliases).

A second build condition was corrected before the final artifact was handed over: [RevenueCat deliberately rejects Test Store keys when Android is not debuggable](https://www.revenuecat.com/docs/test-and-launch/sandbox/test-store#test-store-api-keys-in-release-builds). `standaloneDebug` is now `debuggable=true`; the native host independently sets `useDevSupport=false` for that build type so it loads its embedded bundle. Normal debug builds keep Metro support. Release configuration is unchanged, and no dangerous setting is used. This remains a development sandbox signed with the template debug key, not a store-ready binary.

## Monetization review

The native gateway uses RevenueCat's SDK, requires the native `RNPurchases` module and obtains `default` / `$rc_lifetime` from SDK offerings. It checks for a lifetime, non-subscription product without a subscription period and a nonempty localized price. The UI displays that SDK price.

Full bench depends on active `benchkeep_plus` in CustomerInfo. An explicitly failed entitlement verification denies access. No local premium flag is written, and backups do not transport purchase state. Cancellation, a pending response or a resolved purchase without the entitlement cannot grant access. Native restore calls the native SDK. Web development restore only refreshes its retained Test Store customer; it does not claim cross-store restoration.

Test Store requires explicit configuration and development JavaScript. The visible `Test purchase · no real charge` label is preserved. Production web purchasing and Test Store keys in the application's production mode fail closed. None of these purchase guards changed during the bootstrap correction.

Eight purchase tests use test-only gateway responses and establish controller behavior. The native integration outcomes in the table came from the independent emulator run, not those test doubles. Historical web Test Store evidence remains documented separately in `qa-session-2026-09-14.md`; this reviewer did not replay it or perform a purchase.

## Product checks and remaining limits

Other automated cases cover image-relative point geometry, rejected letterbox taps, edge focus, checkpoint history, two-active-piece limits, serialized persistence, write errors, recovery from a corrupt primary record and portable backup validation/rollback. Existing pieces and exports remain accessible when premium access is unavailable. Samples are labeled and excluded from customer evidence. The MIT license file is present, retaining the Expo template copyright.

RevenueCat's expected Test Store warning was preserved and could be dismissed in the development UI; it was not suppressed by code. No native camera capture, camera permission walkthrough, backup export/import or final-APK failed-purchase simulation was performed. Failure/pending behavior and third-piece capacity have automated evidence, with additional separately recorded browser checks; do not relabel these as final-APK native outcomes. There was no physical-device run, Google Play/Galaxy purchase, production store restoration, measured user benefit or real revenue. The demo and submission copy must preserve these boundaries.

## Automated reproduction

From the repository root with dependencies installed:

```sh
npm test
npm run typecheck
```

No credentials are needed for these automated tests. RevenueCat integration requires the public SDK configuration and product mapping documented in `revenuecat-setup.md`; administrative secret keys must never go in `EXPO_PUBLIC_` variables.
