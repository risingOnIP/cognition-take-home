import { Card, PageHeader } from "@acme/platform/ui";
import { Markdown } from "@/components/markdown";
import { Shell } from "@/components/shell";
import { readDocs } from "@/lib/repo-docs";

export default function BotsPage() {
  const bots = readDocs("devin/bots");
  return (
    <Shell>
      <PageHeader
        title="Bots"
        description="Devin sessions that run on a schedule or an event to keep the platform and apps maintained. Source: devin/bots/. Defined in the repo; switched on as Devin Automations."
      />
      <div className="mb-6 rounded-xl border border-line bg-slate-50 p-4 text-sm text-slate-700">
        <strong>Onboard a bot:</strong> add <code>devin/bots/&lt;name&gt;.md</code> with its type/trigger, repo and prompt (see the &quot;Add a maintenance bot&quot; playbook), open a PR, then create a Devin Automation with that prompt and trigger. Bots open PRs or post reports; they never merge or change production data.
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {bots.map((b) => (
          <Card key={b.file} title={b.title.replace(/^Bot:\s*/, "")}>
            <Markdown>{b.body}</Markdown>
          </Card>
        ))}
      </div>
    </Shell>
  );
}
