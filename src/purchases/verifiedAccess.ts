import { PLUS_ENTITLEMENT } from './config';

type CustomerEntitlements = {
  entitlements: {
    verification?: string;
    active: Record<string, { isActive: boolean; verification?: string } | undefined>;
  };
};

/** Called only with RevenueCat CustomerInfo by the native gateway. */
export function hasConfirmedPlus(info: CustomerEntitlements): boolean {
  const entitlement = info.entitlements.active[PLUS_ENTITLEMENT];
  return entitlement?.isActive === true
    && info.entitlements.verification !== 'FAILED'
    && entitlement.verification !== 'FAILED';
}
