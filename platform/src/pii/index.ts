import { audit } from "../audit";
import type { Db } from "../db";
import { assertCan, type CurrentUser } from "../rbac";
import type { Permission } from "../registry";

export type PiiKind = "ssn" | "email" | "phone" | "account" | "dob" | "name" | "address";

/** Server-side masking. Raw values should never be sent to the browser unless revealed. */
export function maskPii(value: string | null | undefined, kind: PiiKind): string {
  if (!value) return "";
  const last = (n: number) => value.replace(/\D/g, "").slice(-n);
  switch (kind) {
    case "ssn":
      return `***-**-${last(4)}`;
    case "account":
      return `•••• ${last(4)}`;
    case "phone":
      return `(***) ***-${last(4)}`;
    case "email": {
      const [user, domain] = value.split("@");
      return `${user?.[0] ?? ""}***@${domain ?? ""}`;
    }
    case "dob":
      return `****-**-** (${value.slice(0, 4).replace(/\d/g, "*")})`;
    case "name":
      return value
        .split(/\s+/)
        .map((p) => `${p[0] ?? ""}${"*".repeat(Math.max(p.length - 1, 0))}`)
        .join(" ");
    case "address":
      return value.replace(/^[^,]*/, "•••");
  }
}

/** Returns a masked value unless the user holds `permission` AND asked to reveal (with audit). */
export function revealPii(
  db: Db,
  args: {
    user: CurrentUser;
    permission: Permission;
    app: string;
    entity: { type: string; id: string };
    field: string;
    value: string;
    reason: string;
  },
): string {
  assertCan(args.user, args.permission);
  if (!args.reason.trim()) throw new Error("A reason is required to reveal PII");
  db.transaction((tx) =>
    audit(tx, {
      actorId: args.user.id,
      app: args.app,
      action: "pii.reveal",
      entity: args.entity,
      after: { field: args.field },
      reason: args.reason,
    }),
  );
  return args.value;
}
