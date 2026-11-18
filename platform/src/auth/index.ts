import { eq, inArray } from "drizzle-orm";
import { groupMembers, groups, users, type Db } from "../db";

/**
 * Pluggable identity source. Apps never call this directly; they use `getCurrentUser()` /
 * `requirePermission()` from the configured platform, so switching demo -> Entra is config only.
 */
export interface IdentityProvider {
  readonly kind: "demo" | "entra";
  /** Returns the directory user id of the signed-in user, or null. */
  getUserId(): Promise<string | null>;
}

export const DEMO_USER_COOKIE = "acme_demo_user";

/** Local/dev identity: a cookie set by the "Sign in as" picker. Never enable in production. */
export function demoIdentityProvider(): IdentityProvider {
  return {
    kind: "demo",
    async getUserId() {
      const { cookies } = await import("next/headers");
      return (await cookies()).get(DEMO_USER_COOKIE)?.value ?? null;
    },
  };
}

/** Subset of the Entra ID token claims the platform relies on. */
export interface EntraClaims {
  oid: string;
  preferred_username: string;
  name: string;
  /** Security group object ids (requires `groupMembershipClaims` in the app registration). */
  groups: string[];
}

/**
 * Production identity: reads claims from your session layer (e.g. Auth.js with the
 * Microsoft Entra ID provider) and just-in-time syncs the user + group memberships.
 */
export function entraIdentityProvider(opts: {
  db: () => Db;
  getClaims: () => Promise<EntraClaims | null>;
}): IdentityProvider {
  return {
    kind: "entra",
    async getUserId() {
      const claims = await opts.getClaims();
      return claims ? syncEntraClaims(opts.db(), claims) : null;
    },
  };
}

/**
 * Upserts the user from token claims and replaces their memberships with the groups in the token
 * that are known to the directory. Group -> role mapping stays in `group_roles`, so access is still
 * governed by Entra group membership.
 */
export function syncEntraClaims(db: Db, claims: EntraClaims): string {
  return db.transaction((tx) => {
    const existing = tx.select().from(users).where(eq(users.entraObjectId, claims.oid)).get();
    const userId = existing?.id ?? `u_${claims.oid}`;
    if (existing) {
      tx.update(users)
        .set({ email: claims.preferred_username, displayName: claims.name })
        .where(eq(users.id, userId))
        .run();
    } else {
      tx.insert(users)
        .values({ id: userId, entraObjectId: claims.oid, email: claims.preferred_username, displayName: claims.name })
        .run();
    }
    const known = claims.groups.length
      ? tx.select({ id: groups.id }).from(groups).where(inArray(groups.entraObjectId, claims.groups)).all()
      : [];
    tx.delete(groupMembers).where(eq(groupMembers.userId, userId)).run();
    if (known.length) tx.insert(groupMembers).values(known.map((g) => ({ groupId: g.id, userId }))).run();
    return userId;
  });
}
