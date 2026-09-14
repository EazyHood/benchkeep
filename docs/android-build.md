# Benchkeep — local Android build

## Scope

Compile a local Android debug APK for RevenueCat Test Store development. This is not a store release. Compilation does not establish that the app works on a physical device or that purchases complete in RevenueCat. No device UI automation, store upload, release-signing credential creation, or production purchase is included.

## Environment inspected

- Windows, PowerShell.
- Expo `57.0.22`, React Native `0.86.3`, React `19.2.3`.
- Node `24.16.0`, npm `11.13.0`.
- Java: Microsoft OpenJDK `21.0.11`, supplied through `JAVA_HOME`.
- Android SDK: supplied through `ANDROID_HOME` / `ANDROID_SDK_ROOT`.
- Android platform 36 and Build Tools 36.0.0 installed.
- Installed NDK versions observed before build: `28.2.13676358`, `29.0.13846066`.
- CMake `3.22.1` installed.

Read the repository's `AGENTS.md` and the exact [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/) before native preparation. The current SDK reference maps Expo 57 to Android compile/target SDK 36. See also [local compilation](https://docs.expo.dev/guides/local-app-development/) and [native generation](https://docs.expo.dev/workflow/continuous-native-generation/).

## Commands executed

The application builder confirmed app config and dependencies were stable before native generation.

```powershell
# From the Benchkeep project root:
# Set JAVA_HOME to the installed JDK 21 and ANDROID_HOME to the Android SDK.
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:CI = '1'
npx expo prebuild --platform android --no-clean --no-install --skip-dependency-update react,react-native

# From android/ with the same environment:
.\gradlew.bat :app:assembleDebug --console=plain --max-workers=2
```

Prebuild succeeded and generated `android/` for application ID `com.eazyhood.benchkeep`. Expo 57 exposes `--no-clean` to preserve an existing native directory; no clean or recursive deletion was performed. Prebuild changed the package scripts to `expo run:android` and `expo run:ios`, with dependency versions preserved. The generated template includes its standard public debug keystore; no release-signing credential was created.

The Gradle wrapper downloaded Gradle `9.3.1` from `services.gradle.org`. Gradle installed the required NDK `27.1.12297006` after checking an already-present SDK license; no new license acceptance was entered. The first build compiled Java/Kotlin, including both RevenueCat native modules, and failed in Ninja 1.10.2 on a generated C++ path longer than 260 characters.

A temporary `B:` drive alias was investigated. Expo's package scanner fails if the project is directly at a drive root, and its native realpath normalization returns dependency paths to their full physical location even when the parent directory is aliased. This did not produce an APK and is not the recommended workaround.

The successful workaround under verification uses an isolated copy of upstream Ninja `1.13.1` in `android/tools/ninja-1.13.1`. The SDK's installed CMake/Ninja files remain unchanged. `LongPathsEnabled` was already `1` in Windows and was not changed. Source: [Ninja official releases](https://github.com/ninja-build/ninja/releases/tag/v1.13.1). Archive: `https://github.com/ninja-build/ninja/releases/download/v1.13.1/ninja-win.zip`. The downloaded archive matched the SHA-256 digest published by GitHub's release API:

```text
26a40fa8595694dec2fad4911e62d29e10525d2133c9a4230b66397774ae25bf
```

The local init script `android/windows-longpaths.init.gradle` supplies `CMAKE_MAKE_PROGRAM` to Android application/library modules. Invocation from `android/` with the environment above:

```powershell
$env:NODE_ENV = 'development'
$env:BENCHKEEP_NINJA = (Resolve-Path -LiteralPath 'tools/ninja-1.13.1/ninja.exe').Path
.\gradlew.bat :app:assembleDebug --console=plain --max-workers=2 --init-script windows-longpaths.init.gradle
```

The CMake cache confirmed selection of the isolated Ninja executable. **Debug compilation succeeded** in 2m 38s: 279 tasks, 56 executed and 223 up-to-date. The APK contains native code for `arm64-v8a`, `armeabi-v7a`, `x86`, and `x86_64`.

Artifact: `android/app/build/outputs/apk/debug/app-debug.apk`, 160,504,925 bytes, created 2026-09-14 03:41 UTC. SHA-256:

```text
62f4c4f79582da2438ee9ec11b64a272ba0d1abb8553239fcce6c161de1223ef
```

Android SDK `aapt` confirmed `com.eazyhood.benchkeep` version 1.0.0 / code 1, min SDK 24, target SDK 36, and the Benchkeep label. `apksigner verify --verbose --print-certs` passed using APK Signature Scheme v2 with the standard `CN=Android Debug` signer. ZIP inspection confirmed this normal debug APK has **no embedded JavaScript bundle and requires Metro**. It was not installed or tested on a device.

Logs: `docs/android-prebuild.log`, `docs/android-build-first-attempt.log`, `docs/android-build-short-path.log`, `docs/android-prebuild-icons.log`, `docs/android-build-ninja113.log`.

The second prebuild applied original Benchkeep icons and `allowBackup=false`. The merged development manifest contains camera permission and both store-billing permissions, without microphone permission. This static manifest check does not verify permission prompts on a device.

Prebuild warning: `expo-system-ui` is not installed, so the `userInterfaceStyle` app-config property may not apply on native Android. This warning did not fail native generation.

## Standalone sandbox variant

An additional local `standaloneDebug` variant compiled successfully with embedded JavaScript while retaining the Test Store guard. The standard debug APK above remains available separately.

The variant inherits `debug`, uses `matchingFallbacks=['debug']` and the template debug signer, and sets native `debuggable=false`. The React host is explicitly configured with `useDevSupport = BuildConfig.DEBUG`, so this variant loads its bundled asset rather than requesting Metro. JavaScript is separately compiled with **`devEnabled=true`**, preserving `__DEV__` and the application’s existing Test Store restrictions. The application’s purchase guard was not removed or weakened.

The first attempt demonstrated why those flags must be distinguished: React Native's lazy task registration overwrote an early JS setting and produced a prelude with `__DEV__=false`. That attempt subsequently failed in Android lint due to insufficient Gradle Metaspace and produced no accepted standalone APK. The override now runs after all projects are evaluated; Gradle explicitly logged `JS devEnabled=true`. Project-local JVM limits were raised to a 3 GiB heap and 1 GiB Metaspace after that failure. No global SDK files or Windows settings were changed.

**Standalone build succeeded** in 2m 18s: 439 tasks, 62 executed and 377 up-to-date; the required Android lint tasks passed. Artifact: `android/app/build/outputs/apk/standaloneDebug/app-standaloneDebug.apk`, 164,444,808 bytes, created 2026-09-14 03:49 UTC. SHA-256:

```text
596a96ced8c6db1c338a05aa10c11bcc016fb2f7d1c86d01a5ac15cde6f224c3
```

The APK signature verified with the same standard Android Debug signer. `aapt` confirmed the expected package, SDK range and four architectures. ZIP inspection found `assets/index.android.bundle` (4,361,196 bytes); its SHA-256 matches the generated Hermes bundle. The generated Metro prelude was checked for `__DEV__=true` and `NODE_ENV development`, and the source-map copy of `App.tsx` matches the current source after line-ending normalization. See `android-standalone-mode-proof.json` for the static evidence.

The standalone APK is configured to load its embedded bundle without Metro. Native device behavior and native Test Store purchases remain untested. It is a **sandbox artifact signed with a public development key**, never an app-store release or evidence of real revenue.

## Reproduce the local sandbox build

The native directory is generated and ignored by Git. The scripts below preserve the custom recipe outside it, without storing binaries or signing credentials in the repository.

```powershell
# From the repository root, after npm ci and configuring the documented Test Store environment:
# Supply JAVA_HOME for JDK 21 and ANDROID_HOME for the Android SDK.
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:CI = '1'
$env:NODE_ENV = 'development'
npx expo prebuild --platform android --no-clean --no-install --skip-dependency-update react,react-native
node scripts/prepare-android-sandbox.cjs
& ./scripts/setup-local-ninja.ps1
Push-Location android
.\gradlew.bat :app:assembleStandaloneDebug --console=plain --max-workers=2 --init-script windows-longpaths.init.gradle
Pop-Location
```

`prepare-android-sandbox.cjs` targets Expo 57, applies the standalone variant, host setting and project-local Gradle memory limits, and recreates the local Ninja init script. `setup-local-ninja.ps1` downloads the pinned upstream Windows Ninja archive only when absent, verifies its published SHA-256, and sets `BENCHKEEP_NINJA` for the current PowerShell process. The recipe leaves the installed SDK's binaries unchanged. Both scripts were executed successfully against the generated project. The investigated temporary drive alias was removed.

## Evidence boundaries

- A generated native project is not a compiled binary.
- A compiled debug APK is not a successful on-device test.
- Debug builds normally load JavaScript from Metro; an APK file alone does not establish an offline, standalone distributable.
- RevenueCat Test Store transactions are sandbox evidence, not store publication or real customer revenue.
