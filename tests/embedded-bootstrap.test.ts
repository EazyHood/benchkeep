/// <reference types="node" />
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
const adapter = path.join(root, 'scripts/runtime/expo-message-socket.cjs');

test('only embedded development Test Store skips the Metro message socket', () => {
  const source = fs.readFileSync(adapter, 'utf8');
  for (const [development, mode, server, expectedLoads] of [
    [true, 'test-store', false, 0],
    [true, 'test-store', true, 1],
    [true, 'production', false, 1],
    [false, 'test-store', false, 1],
    [false, 'production', true, 1],
  ] as const) {
    let originalLoads = 0;
    vm.runInNewContext(source, {
      __DEV__: development,
      process: { env: { EXPO_PUBLIC_REVENUECAT_MODE: mode } },
      require(id: string) {
        if (id === 'expo/src/async-require/getDevServer') {
          return { default: () => ({ bundleLoadedFromServer: server }) };
        }
        assert.equal(id, 'expo/src/async-require/messageSocket.native');
        originalLoads++;
      },
    });
    assert.equal(originalLoads, expectedLoads, `${development}/${mode}/${server}`);
  }
});

test('Metro socket adapter is Android-only, exact-path and does not alias itself recursively', () => {
  const config = require('../metro.config.js');
  const original = path.join(path.dirname(require.resolve('expo/package.json')), 'src/async-require/messageSocket.native.ts');
  const caller = path.join(root, 'node_modules/expo/src/Expo.fx.tsx');
  const resolution = (filePath: string) => ({ type: 'sourceFile', filePath });
  const run = (platform: string, origin: string, file: string) => config.resolver.resolveRequest({
    originModulePath: origin,
    resolveRequest: () => resolution(file),
  }, './messageSocket', platform);

  assert.deepEqual(run('android', caller, original), resolution(adapter));
  assert.deepEqual(run('web', caller, original), resolution(original));
  assert.deepEqual(run('ios', caller, original), resolution(original));
  assert.deepEqual(run('android', adapter, original), resolution(original));
  const other = path.join(root, 'src/messageSocket.native.ts');
  assert.deepEqual(run('android', caller, other), resolution(other));
});
