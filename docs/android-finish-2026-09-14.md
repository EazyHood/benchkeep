# Android completion check — 14 September 2026

The Android `userInterfaceStyle` warning is resolved. Benchkeep now installs `expo-system-ui ~57.0.4` and declares its config plugin in `app.json`. Native generation produces `expo_system_ui_user_interface_style=light`, matching the existing light interface. The unused overlay and vibration permissions were also removed through `android.blockedPermissions`; both the final standalone APK and generated release manifest confirm their absence. No application or purchase logic changed.

The exact [Expo SDK 57 SystemUI documentation](https://docs.expo.dev/versions/v57.0.0/sdk/system-ui/) recommends version `~57.0.4`, documents the plugin, and requires rebuilding the binary for the Android appearance setting. The [Expo color-theme guide](https://docs.expo.dev/develop/user-interface/color-themes/) explains that Android ignores this setting without the module. Sources checked 2026-09-14.

The [SDK 57 app-config reference](https://docs.expo.dev/versions/v57.0.0/config/app/#blockedpermissions) documents `android.blockedPermissions` as the supported way to remove merged permissions using native removal markers. Only `android.permission.SYSTEM_ALERT_WINDOW` and `android.permission.VIBRATE` were added to that array.

## Version and changes

- Git base: `d958f08c50531e97497809110605bff8b05e5c9d`.
- Uncommitted build-input changes: `package.json`, `package-lock.json`, `app.json`.
- Installed Expo `57.0.22`, SystemUI `57.0.4`, React Native `0.86.3`.
- `npx expo install expo-system-ui` selected the SDK-compatible version. No broad dependency upgrade or audit fix was run.
- No commit, push, release credential creation, store upload, or device operation was performed by this check.

## Verification performed

1. Android prebuild, preserving the generated native directory: passed without the previous SystemUI warning.
2. Reapplied `scripts/prepare-android-sandbox.cjs` and the existing local Ninja setup: passed.
3. `npm run typecheck`: passed.
4. `npm test`: 25 passed, 0 failed.
5. `npx expo install --check`: dependencies up to date.
6. `:app:assembleStandaloneDebug` using the documented local JDK/SDK and Ninja init script: first passed in 1m 33s for the SystemUI change. After the concrete permission cleanup, a single final invocation of `:app:assembleStandaloneDebug :app:processReleaseMainManifest` passed in 12s; 470 tasks, 33 executed, 437 up to date. Android lint tasks passed.
7. `aapt dump badging` and `apksigner verify --verbose --print-certs`: passed; package `com.eazyhood.benchkeep`, version 1.0.0/code 1, min SDK 24, target SDK 36, four ABIs, standard Android Debug signer, APK signature scheme v2.
8. Static standalone checks: embedded Hermes bundle matches the generated bundle; JS development mode remains true; native `BuildConfig.DEBUG=false` and `useDevSupport=BuildConfig.DEBUG` remain intact; bundled App source matches current source.
9. Final merged manifests contain the same eight remaining permissions, with overlay, vibration and microphone absent. APK metadata independently confirms the same remaining permissions. `git diff --check` passed.

The initial local proof helper used an overly narrow regex for the Metro `NODE_ENV` fallback expression. Inspecting the generated prelude showed `process.env.NODE_ENV=process.env.NODE_ENV||"development"`; the corrected check passed. This was a check-script mismatch, not an application change or build failure.

## Current sandbox APK

- File: `android/app/build/outputs/apk/standaloneDebug/app-standaloneDebug.apk`.
- Size: **164,445,412 bytes**.
- Written: **2026-09-14T16:11:29.0093353Z** (11:11 Colombia).
- SHA-256: `4d0a4432410d804c8ee13dfa05069d977d56573c6d851a9cc42fb7d123e97361`.
- Embedded bundle: `assets/index.android.bundle`, 4,361,196 bytes.
- Bundle SHA-256: `d23a6e6b0cc8b3975d8b0923ecce705bd9fd1bcf88db5bd9909a30bcc8ad09de`.

This replaces the earlier APK at the same local path whose hash began `596a96ce`, and the intermediate SystemUI-only build whose hash began `4595a168`. Earlier `android-standalone-*` evidence files remain historical records of the previous build. The dated `android-finish-*` artifact/manifest snapshots refer to the final permission-cleaned build. The application JS bundle is unchanged; the module/configuration changes the native APK.

This is a sandbox artifact with the template public development signer. It is configured to load its embedded JS without Metro. No native installation, appearance on a dark-mode device, native RevenueCat purchase, or store publication was tested. Compilation and static inspection do not establish those outcomes.

## Release manifest and permission mapping

At the root reviewer's request, `:app:processReleaseMainManifest` was initially executed with `NODE_ENV=production` and passed in 57s (72 tasks). Gradle generated release JS as a task dependency. After the permission fix, this task was run again in the same final invocation as the standalone build, using `NODE_ENV=development` for the sandbox recipe. No release APK/AAB was assembled, no release signing credential was created, and nothing was uploaded. This release manifest inspection does not establish a release binary or its JavaScript purchase configuration.

The initial check found `SYSTEM_ALERT_WINDOW` and `VIBRATE` in release and standaloneDebug, attributed to the main manifest. They were not debug-only. The inspected App/src code has no direct overlay or vibration call, and the root reviewer explicitly authorized this concrete cleanup. Both permissions are now absent from the final merged manifests and APK. The removal markers in the generated main manifest are instructions to the merger, not permissions in the resulting binary.

| Permission in both manifests | Source/evidence | Relation to the current app |
|---|---|---|
| `android.permission.INTERNET` | Main manifest; filesystem and SDK merges | RevenueCat requests and other network-capable dependencies. A manifest does not show which data was actually transmitted. |
| `android.permission.READ_EXTERNAL_STORAGE` | Main manifest/filesystem; `maxSdkVersion=32` | Legacy media/file access declaration; app selects photos and imports backups. Runtime request behavior on older Android remains untested. |
| `android.permission.WRITE_EXTERNAL_STORAGE` | Main manifest/filesystem; `maxSdkVersion=32` | Legacy file access declaration; app exports/shares backups. Do not claim the permission is necessary for every supported OS flow. |
| `android.permission.CAMERA` | `expo.modules.imagepicker:57.0.17` | App requests camera permission only when the user selects photographing a piece. Device prompt and denial behavior remain untested. |
| `android.permission.ACCESS_NETWORK_STATE` | RevenueCat `purchases:10.20.0`, transport merges | Network availability support within installed SDKs. |
| `com.android.vending.BILLING` | Google Billing Client `8.3.0` | Installed RevenueCat Google billing support; this does not prove a configured production Google product. |
| `com.samsung.android.iap.permission.BILLING` | RevenueCat `purchases-store-galaxy:10.20.0` | Installed Samsung billing support; this does not prove a configured production Samsung product. |
| `com.eazyhood.benchkeep.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` | AndroidX Core `1.17.0` | Signature-protected internal receiver permission generated by AndroidX. |

`RECORD_AUDIO` is absent from both merged manifests. The app config sets `microphonePermission=false`; the main-manifest removal marker is not an audio permission granted in the merged result. The eight permissions listed above were preserved. Only the unnecessary overlay and vibration declarations were newly blocked.

## Evidence files

- `android-finish-prebuild-permissions-2026-09-14.log` and `android-finish-build-permissions-2026-09-14.log`: final native generation/build/manifest output. The earlier `android-finish-prebuild-2026-09-14.log` and `android-finish-build-2026-09-14.log` capture the intermediate SystemUI-only build.
- `android-finish-apk-artifact-2026-09-14.json`: current binary size, hash, base commit and bundle comparison.
- `android-finish-apk-metadata-2026-09-14.txt`, `android-finish-apk-signature-2026-09-14.txt`: Android SDK validation.
- `android-finish-mode-proof-2026-09-14.json`: static sandbox and SystemUI checks.
- `android-finish-release-manifest-2026-09-14.log`: initial release manifest generation output before the permission cleanup; the final generation is in the combined permissions build log above.
- `android-finish-release-manifest-2026-09-14.xml`, `android-finish-standalone-manifest-2026-09-14.xml`, `android-finish-permissions-2026-09-14.json`: exact manifest snapshots and extracted permission declarations.

Build warnings remaining in the captured output concern unused manifest removal/replacement markers and Gradle deprecations. They did not fail the Gradle invocations. They are not evidence of device correctness or store acceptance.
