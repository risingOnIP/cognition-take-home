import { defineApp } from "@acme/platform/registry";

export const __camel__App = defineApp({
  key: "__key__",
  name: "__name__",
  description: "TODO: one sentence describing what this app is for.",
  href: "/apps/__key__",
  owner: "TODO: owning team",
  accessPermission: "__key__.view",
  permissions: {
    "__key__.view": "Open __name__",
    "__key__.create": "Create items",
    "__key__.approve": "Approve or reject items",
  },
  roles: [
    { key: "__key__.member", name: "Member", description: "Creates items.", permissions: ["__key__.view", "__key__.create"] },
    { key: "__key__.approver", name: "Approver", description: "Approves items.", permissions: ["__key__.view", "__key__.approve"] },
  ],
  sodConflicts: [],
});
