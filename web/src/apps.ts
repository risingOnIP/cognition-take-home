import type { AppManifest } from "@acme/platform/registry";
import { refundsApp } from "./app/apps/refunds/manifest";
import { kycApp } from "./app/apps/kyc/manifest";
// new-app:manifest-imports

/** Every internal app registered on the platform. Order = launcher order. */
export const apps: AppManifest[] = [
  refundsApp,
  kycApp,
  // new-app:manifest-entries
];
