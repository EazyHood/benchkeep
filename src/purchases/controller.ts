import type { ConfigurationResult, PurchaseConfiguration, PurchaseStore } from './config';

export type BenchkeepProduct = { id: string; title: string; description: string; price: string };
export type PurchaseState = {
  status: 'unavailable' | 'loading' | 'ready' | 'error';
  isPlus: boolean;
  product: BenchkeepProduct | null;
  message: string | null;
  busy: boolean;
  sandbox: boolean;
  store: PurchaseStore | null;
};
export type PurchaseOutcome = {
  status: 'purchased' | 'restored' | 'cancelled' | 'failed' | 'unavailable' | 'not-found';
  message?: string;
};

/** This boundary is implemented by the native SDK. Test doubles stay in the test file. */
export interface PurchasesGateway {
  initialize(config: PurchaseConfiguration): Promise<void>;
  getIsPlus(): Promise<boolean>;
  getProduct(): Promise<BenchkeepProduct | null>;
  purchase(): Promise<boolean>;
  restore(): Promise<boolean>;
  onCustomerInfoChanged(listener: (isPlus: boolean) => void): () => void;
}

export function wasPurchaseCancelled(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const value = error as { userCancelled?: unknown; code?: unknown };
  return value.userCancelled === true || value.code === '1' || value.code === 1;
}

export function purchaseFailureMessage(error: unknown): string {
  const code = error && typeof error === 'object' ? String((error as { code?: unknown }).code) : '';
  if (code === '20') return 'This purchase is waiting for store approval. Full bench will unlock after the store confirms it.';
  if (code === '10') return 'The store could not connect. Check your connection and try again.';
  if (code === '6') return 'The store already has this purchase. Choose Restore purchase to refresh your access.';
  return 'The store could not confirm your purchase. Please try again or restore an existing purchase.';
}

export function createPurchasesController(
  configuration: ConfigurationResult,
  loadGateway: () => Promise<PurchasesGateway>,
) {
  let state: PurchaseState = {
    status: configuration.available ? 'loading' : 'unavailable',
    isPlus: false, product: null,
    message: configuration.available ? null : configuration.reason,
    busy: false,
    sandbox: configuration.available && configuration.config.sandbox,
    store: configuration.available ? configuration.config.store : null,
  };
  const listeners = new Set<() => void>();
  let gateway: PurchasesGateway | null = null;
  let initialized = false;
  let operation: Promise<unknown> | null = null;
  let unsubscribeGateway: (() => void) | null = null;

  const update = (next: Partial<PurchaseState>) => {
    state = { ...state, ...next };
    listeners.forEach(listener => listener());
  };
  const connect = async () => {
    if (!configuration.available) return null;
    if (gateway) return gateway;
    const next = await loadGateway();
    await next.initialize(configuration.config);
    gateway = next;
    unsubscribeGateway = next.onCustomerInfoChanged(isPlus => update({ isPlus }));
    return next;
  };
  const refresh = async (): Promise<void> => {
    if (!configuration.available || operation) return;
    update({ status: 'loading', busy: true, message: null });
    const task = (async () => {
      try {
        const client = await connect();
        if (!client) return;
        // A failed entitlement request must never preserve unverified premium access.
        const isPlus = await client.getIsPlus();
        const product = await client.getProduct();
        update({ status: 'ready', isPlus, product, message: product || isPlus ? null : 'Full bench is not available from this store yet. You can still restore an existing purchase.' });
      } catch {
        update({ status: 'error', isPlus: false, product: null, message: 'We could not verify Full bench with the store. Check your connection and try again.' });
      } finally {
        update({ busy: false });
      }
    })();
    operation = task;
    try { await task; } finally { operation = null; }
  };
  const transact = async (kind: 'purchase' | 'restore'): Promise<PurchaseOutcome> => {
    if (!configuration.available || !gateway || operation || (kind === 'purchase' && !state.product)) {
      return { status: 'unavailable', message: state.message || 'The store is not ready yet. Please try again.' };
    }
    if (kind === 'purchase' && state.isPlus) return { status: 'purchased', message: 'Full bench is already unlocked.' };
    update({ busy: true, message: null });
    const client = gateway;
    const task = (async (): Promise<PurchaseOutcome> => {
      try {
        const isPlus = await (kind === 'purchase' ? client.purchase() : client.restore());
        const message = isPlus
          ? kind === 'purchase' ? 'Full bench is unlocked.' : configuration.config.store === 'test' ? 'Full bench access confirmed.' : 'Full bench has been restored.'
          : kind === 'purchase'
            ? 'The store has not confirmed Full bench access yet. Restore your purchase after approval.'
            : 'No Full bench purchase was found for this store account.';
        update({ status: 'ready', isPlus, message });
        return { status: isPlus ? kind === 'purchase' ? 'purchased' : 'restored' : 'not-found', message };
      } catch (error) {
        if (wasPurchaseCancelled(error)) {
          update({ message: 'Purchase cancelled. No access was changed.' });
          return { status: 'cancelled', message: 'Purchase cancelled.' };
        }
        const message = purchaseFailureMessage(error);
        update({ message });
        return { status: 'failed', message };
      } finally {
        update({ busy: false });
      }
    })();
    operation = task;
    try { return await task; } finally { operation = null; }
  };
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    async start() { if (initialized) return; initialized = true; await refresh(); },
    refresh,
    purchase: () => transact('purchase'),
    restore: () => transact('restore'),
    dispose() { unsubscribeGateway?.(); unsubscribeGateway = null; listeners.clear(); },
  };
}
