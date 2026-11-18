import { createPlatform } from "@acme/platform";
import { demoIdentityProvider } from "@acme/platform/auth";
import { createMockDocumentStore, createMockPaymentProcessor, createSharePointDocumentStore, type DocumentStore } from "@acme/platform/connectors";
import { apps } from "./apps";

/**
 * The single place the platform is configured. Production swaps `demoIdentityProvider()` for
 * `entraIdentityProvider(...)` and the mock processor for a real connector — apps don't change.
 */
export const platform = createPlatform({ apps, identity: demoIdentityProvider() });

export const { db, catalog, getCurrentUser, requireUser, requirePermission, requirePageAccess } = platform;

export const paymentProcessor = createMockPaymentProcessor({ latencyMs: 250 });

/** SharePoint when an Entra app registration is configured; otherwise a seeded in-memory library. */
export const documentStore: DocumentStore =
  process.env.SHAREPOINT_TENANT_ID && process.env.SHAREPOINT_CLIENT_ID && process.env.SHAREPOINT_CLIENT_SECRET && process.env.SHAREPOINT_SITE_ID
    ? createSharePointDocumentStore({
        tenantId: process.env.SHAREPOINT_TENANT_ID,
        clientId: process.env.SHAREPOINT_CLIENT_ID,
        clientSecret: process.env.SHAREPOINT_CLIENT_SECRET,
        siteId: process.env.SHAREPOINT_SITE_ID,
        driveId: process.env.SHAREPOINT_DRIVE_ID,
      })
    : createMockDocumentStore({
        seed: (folder) =>
          folder.startsWith("refunds/")
            ? [
                { name: "customer-request.eml", sizeBytes: 18_432, modifiedAt: "2026-11-02T14:05:00Z" },
                { name: "original-payment-receipt.pdf", sizeBytes: 96_311, modifiedAt: "2026-11-02T14:06:00Z" },
              ]
            : [],
      });
