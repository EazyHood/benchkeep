// Reapply the local sandbox build customizations after Expo 57 prebuild.
// Creates no release-signing credentials and leaves application purchase guards intact.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const android = path.join(root, 'android');
const expo = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
const installedExpo = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/expo/package.json'), 'utf8')).version;
if (!installedExpo.startsWith('57.')) throw new Error('This recipe is verified for Expo 57; review it before using another SDK.');
if (!fs.existsSync(path.join(android, 'app/build.gradle'))) throw new Error('Run Expo Android prebuild before this script.');

function update(relative, change) {
  const target = path.resolve(android, relative);
  if (!target.startsWith(android + path.sep)) throw new Error('Target outside generated Android project.');
  const before = fs.readFileSync(target, 'utf8');
  const after = change(before);
  if (after !== before) fs.writeFileSync(target, after);
}

update('app/build.gradle', text => {
  if (!text.includes('standaloneDebug {')) {
    const anchor = '        release {';
    if (!text.includes(anchor)) throw new Error('Expo buildTypes template changed. Review the sandbox variant manually.');
    text = text.replace(anchor, `        // Local Test Store sandbox, signed with the template debug key.
        standaloneDebug {
            initWith debug
            matchingFallbacks = ['debug']
            debuggable true
            signingConfig signingConfigs.debug
        }
${anchor}`);
  }
  // RevenueCat deliberately rejects Test Store keys in non-debuggable APKs.
  // Keep this a genuine development variant; disable Metro on the host instead.
  const sandboxDebugFlag = /(standaloneDebug\s*\{[\s\S]*?\bdebuggable\s+)(?:true|false)/;
  if (!sandboxDebugFlag.test(text)) throw new Error('Standalone debug flag not found. Review the Android template.');
  text = text.replace(sandboxDebugFlag, '$1true');
  if (!text.includes("tasks.named('createBundleStandaloneDebugJsAndAssets')")) {
    text += `
// Preserve the existing development-only Test Store guard in the embedded JS.
gradle.projectsEvaluated {
    tasks.named('createBundleStandaloneDebugJsAndAssets').configure { nativeTask ->
        nativeTask.devEnabled.set(true)
        nativeTask.doFirst {
            logger.lifecycle('Benchkeep standalone sandbox: JS devEnabled=' + nativeTask.devEnabled.get())
        }
    }
}
`;
  }
  return text;
});

const application = 'app/src/main/java/' + expo.android.package.replaceAll('.', '/') + '/MainApplication.kt';
update(application, text => {
  const hostSetting = 'useDevSupport = BuildConfig.DEBUG && BuildConfig.BUILD_TYPE != "standaloneDebug",';
  if (text.includes(hostSetting)) return text;
  if (text.includes('useDevSupport = BuildConfig.DEBUG,')) {
    return text.replace('useDevSupport = BuildConfig.DEBUG,', hostSetting);
  }
  if (text.includes('useDevSupport =')) throw new Error('Unexpected host DevSupport configuration; review manually.');
  const anchor = '      context = applicationContext,';
  if (!text.includes(anchor)) throw new Error('Expo React host template changed. Review native DevSupport manually.');
  return text.replace(anchor, anchor + '\n      ' + hostSetting);
});

update('gradle.properties', text => {
  if (!/^org\.gradle\.jvmargs=.*$/m.test(text)) throw new Error('Expected Gradle JVM setting not found.');
  return text.replace(/^org\.gradle\.jvmargs=.*$/m, 'org.gradle.jvmargs=-Xmx3072m -XX:MaxMetaspaceSize=1024m');
});

fs.writeFileSync(path.join(android, 'windows-longpaths.init.gradle'), String.raw`// Local build workaround; does not modify the installed Android SDK.
def benchkeepNinjaPath = System.getenv('BENCHKEEP_NINJA')
if (!benchkeepNinjaPath) {
    throw new GradleException('Set BENCHKEEP_NINJA to the local Ninja executable.')
}
def benchkeepNinja = new File(benchkeepNinjaPath)
if (!benchkeepNinja.isFile()) {
    throw new GradleException('Benchkeep local Ninja executable is missing.')
}
gradle.allprojects { nativeProject ->
    ['com.android.application', 'com.android.library'].each { androidPlugin ->
        nativeProject.plugins.withId(androidPlugin) {
            nativeProject.extensions.getByName('android').defaultConfig.externalNativeBuild.cmake.arguments(
                '-DCMAKE_MAKE_PROGRAM=' + benchkeepNinja.absolutePath.replace('\\', '/')
            )
        }
    }
}
`);

console.log('Prepared standaloneDebug: debuggable development APK, embedded development JS, Metro host off, template debug signer.');
console.log('This sandbox variant is for local device testing and is not a store release.');
