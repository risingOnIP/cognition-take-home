# Devin assets

Everything Devin needs to build and maintain apps on this platform, versioned with the code.

| Folder | What it is | How it is used |
|---|---|---|
| `knowledge/` | Short, always-true facts and rules | Paste each file into **Devin → Knowledge** (the frontmatter `trigger` is the trigger description). Devin retrieves them automatically when relevant. |
| `playbooks/` | Repeatable step-by-step procedures | Create a **Devin Playbook** from each file, then start sessions with e.g. `!new-internal-app Build a chargebacks queue…`. The same procedure is exposed to Devin as a repo skill in `.agents/skills/`. |
| `bots/` | Maintenance automations | Each file defines a **Devin Automation** (schedule or trigger + prompt). Create them in Devin → Automations. |

The repo is the source of truth: change a rule here in a PR, then sync it to the Devin org.
