# Playbook: Add a maintenance bot

1. Write `devin/bots/<name>.md` in the same shape as the existing bots: `# Bot: <title>`, then **Type** (Devin Automation + schedule or event), **Repo**, and a **Prompt** block.
2. Scope the prompt narrowly: what it reads, what it may change, and its output (a PR, or a report posted to a channel). Bots never merge, never write to production data, and use read-only credentials from secrets.
3. Open a PR with the file. A human approves it like any other change.
4. After merge, create a Devin Automation in the org with the prompt and trigger from the file, scoped to this repo.
5. The `/bots` page lists it automatically.
