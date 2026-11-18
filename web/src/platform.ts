import { createPlatform } from "@acme/platform";
import { demoIdentityProvider } from "@acme/platform/auth";
import { createMockPaymentProcessor } from "@acme/platform/connectors";
import { apps } from "./apps";

/**
 * The single place the platform is configured. Production swaps `demoIdentityProvider()` for
 * `entraIdentityProvider(...)` and the mock processor for a real connector — apps don't change.
 */
export const platform = createPlatform({ apps, identity: demoIdentityProvider() });

export const { db, catalog, getCurrentUser, requireUser, requirePermission, requirePageAccess } = platform;

export const paymentProcessor = createMockPaymentProcessor({ latencyMs: 250 });
