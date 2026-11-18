import { TabNav } from "@acme/platform/ui";

export function SecurityTabs({ active }: { active: "roles" | "people" | "audit" }) {
  return (
    <TabNav
      active={active}
      tabs={[
        { key: "roles", label: "Role assignments", href: "/security" },
        { key: "people", label: "People", href: "/security/people" },
        { key: "audit", label: "Audit log", href: "/security/audit" },
      ]}
    />
  );
}
