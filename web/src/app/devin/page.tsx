import { Card, PageHeader } from "@acme/platform/ui";
import { Markdown } from "@/components/markdown";
import { Section } from "@/components/overview";
import { Shell } from "@/components/shell";
import { readDocs } from "@/lib/repo-docs";

export default function DevinPage() {
  const knowledge = readDocs("devin/knowledge");
  const playbooks = readDocs("devin/playbooks");
  const bots = readDocs("devin/bots");
  return (
    <Shell>
      <PageHeader
        breadcrumb={[{ label: "Platform", href: "/" }]}
        title="Devin setup"
        description="What Devin reads when it builds or maintains an app. Rendered from the devin/ folder in the repo."
      />
      <Section id="playbooks" title="Playbooks" intro="Step-by-step procedures. A new app is one session: this playbook plus a short brief.">
        <div className="space-y-2">
          {playbooks.map((p) => (
            <details key={p.file} className="rounded-lg border border-line bg-surface px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium">{p.title.replace(/^Playbook:\s*/, "")}</summary>
              <div className="mt-3">
                <Markdown>{p.body}</Markdown>
              </div>
            </details>
          ))}
        </div>
      </Section>
      <Section id="knowledge" title="Knowledge" intro="Rules Devin applies automatically when working in this repo.">
        <div className="space-y-2">
          {knowledge.map((k) => (
            <details key={k.file} className="rounded-lg border border-line bg-surface px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium capitalize">{k.title}</summary>
              <div className="mt-3">
                <Markdown>{k.body}</Markdown>
              </div>
            </details>
          ))}
        </div>
      </Section>
      <Section id="bots" title="Maintenance bots" intro="Definitions for scheduled or event-driven Devin sessions that keep the platform current.">
        <div className="grid gap-4 md:grid-cols-2">
          {bots.map((b) => (
            <Card key={b.file} title={b.title.replace(/^Bot:\s*/, "")}>
              <Markdown>{b.body}</Markdown>
            </Card>
          ))}
        </div>
      </Section>
    </Shell>
  );
}
