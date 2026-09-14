/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { resolvePurchaseConfiguration, type PurchaseEnvironment } from './config';
import { createPurchasesController, type PurchasesGateway } from './controller';
import { hasConfirmedPlus } from './verifiedAccess';

const native: PurchaseEnvironment = { platform: 'android', isExpoGo: false, isDevelopment: true, googleKey: 'goog_test_fixture_only' };
const configuration = resolvePurchaseConfiguration(native);
const fixtureProduct = { id: 'test-fixture-only', title: 'Full bench', description: 'A lifetime unlock', price: '$7.25' };
function makeFixture(overrides: Partial<PurchasesGateway> = {}): PurchasesGateway {
  return {
    async initialize() {}, async getIsPlus() { return false; }, async getProduct() { return fixtureProduct; },
    async purchase() { return true; }, async restore() { return false; }, onCustomerInfoChanged() { return () => {}; },
    ...overrides,
  };
}

test('unsupported runtime and absent keys never load the purchases gateway', async () => {
  for (const env of [
    { ...native, platform: 'web' }, { ...native, isExpoGo: true },
    { ...native, googleKey: undefined }, { ...native, googleKey: 'sk_secret_fixture' },
    { ...native, googleKey: 'test_wrong_platform' },
  ]) {
    let loaded = false;
    const controller = createPurchasesController(resolvePurchaseConfiguration(env), async () => { loaded = true; return makeFixture(); });
    await controller.start();
    assert.equal((await controller.purchase()).status, 'unavailable');
    assert.equal((await controller.restore()).status, 'unavailable');
    assert.equal(loaded, false);
    assert.equal(controller.getSnapshot().isPlus, false);
  }
});

test('test store requires an explicit development mode and never works in release', () => {
  const setup = { ...native, mode: 'test-store', testKey: 'test_fixture_only' };
  const result = resolvePurchaseConfiguration(setup);
  assert.equal(result.available, true);
  if (result.available) assert.deepEqual([result.config.store, result.config.sandbox], ['test', true]);
  assert.equal(resolvePurchaseConfiguration({ ...setup, isDevelopment: false }).available, false);
  assert.equal(resolvePurchaseConfiguration({ ...setup, mode: 'production', googleKey: 'test_fixture_only' }).available, false);
  assert.equal(resolvePurchaseConfiguration({ ...native, mode: 'galaxy-test' }).available, false);
  assert.equal(resolvePurchaseConfiguration({ ...setup, platform: 'web' }).available, true);
  assert.equal(resolvePurchaseConfiguration({ ...setup, platform: 'web', isDevelopment: false }).available, false);
  assert.equal(resolvePurchaseConfiguration({ ...setup, platform: 'web', testKey: undefined }).available, false);
});

test('the expected active entitlement and a non-failed verification are both required', () => {
  assert.equal(hasConfirmedPlus({ entitlements: { active: {} } }), false);
  assert.equal(hasConfirmedPlus({ entitlements: { active: { another_plus: { isActive: true } } } }), false);
  assert.equal(hasConfirmedPlus({ entitlements: { active: { benchkeep_plus: { isActive: false } } } }), false);
  assert.equal(hasConfirmedPlus({ entitlements: { verification: 'FAILED', active: { benchkeep_plus: { isActive: true } } } }), false);
  assert.equal(hasConfirmedPlus({ entitlements: { active: { benchkeep_plus: { isActive: true, verification: 'FAILED' } } } }), false);
  assert.equal(hasConfirmedPlus({ entitlements: { verification: 'VERIFIED', active: { benchkeep_plus: { isActive: true } } } }), true);
});

test('store localized price is passed through and cancellation cannot unlock access', async () => {
  const controller = createPurchasesController(configuration, async () => makeFixture({ async purchase() { throw { userCancelled: true, code: '1' }; } }));
  await controller.start();
  assert.equal(controller.getSnapshot().product?.price, '$7.25');
  assert.equal((await controller.purchase()).status, 'cancelled');
  assert.equal(controller.getSnapshot().isPlus, false);
  assert.equal(controller.getSnapshot().busy, false);
});

test('a pending or resolved purchase without entitlement does not unlock access', async () => {
  for (const purchase of [async () => false, async () => { throw { code: '20' }; }]) {
    const controller = createPurchasesController(configuration, async () => makeFixture({ purchase }));
    await controller.start();
    const result = await controller.purchase();
    assert.notEqual(result.status, 'purchased');
    assert.equal(controller.getSnapshot().isPlus, false);
  }
});

test('restore uses the store outcome; verification errors revoke stale access', async () => {
  let offline = false;
  const controller = createPurchasesController(configuration, async () => makeFixture({
    async getIsPlus() { if (offline) throw new Error('offline'); return false; },
    async restore() { return true; },
  }));
  await controller.start();
  assert.equal((await controller.restore()).status, 'restored');
  assert.equal(controller.getSnapshot().isPlus, true);
  offline = true;
  await controller.refresh();
  assert.equal(controller.getSnapshot().status, 'error');
  assert.equal(controller.getSnapshot().isPlus, false);
});

test('unavailable products block purchase but permit restoring a prior store purchase', async () => {
  let purchaseCalls = 0;
  const controller = createPurchasesController(configuration, async () => makeFixture({
    async getProduct() { return null; }, async purchase() { purchaseCalls++; return true; }, async restore() { return true; },
  }));
  await controller.start();
  assert.equal((await controller.purchase()).status, 'unavailable');
  assert.equal(purchaseCalls, 0);
  assert.equal((await controller.restore()).status, 'restored');
});

test('double taps do not initiate concurrent transactions', async () => {
  let complete!: (value: boolean) => void;
  let calls = 0;
  const controller = createPurchasesController(configuration, async () => makeFixture({
    purchase() { calls++; return new Promise(resolve => { complete = resolve; }); },
  }));
  await controller.start();
  const first = controller.purchase();
  assert.equal((await controller.purchase()).status, 'unavailable');
  assert.equal(calls, 1);
  complete(true);
  assert.equal((await first).status, 'purchased');
  assert.equal(controller.getSnapshot().isPlus, true);
});
