import { Card, PageHeader } from "@acme/platform/ui";
import { Markdown } from "@/components/markdown";
import { Section } from "@/components/overview";
import { Shell } from "@/components/shell";
import { readDocs } from "@/lib/repo-docs";

export default function PlaybooksPage() {
  const playbooks = readDocs("devin/playbooks");
  const bots = readDocs("devin/bots");
  return (
    <Shell>
      <PageHeader title="Playbooks" description="Step-by-step procedures Devin follows. Source: devin/playbooks/ and devin/bots/." />
      <Section id="on-demand" title="On demand" intro="Start a Devin session with one of these and a short brief.">
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
      <Section id="scheduled" title="Scheduled (maintenance bots)" intro="Playbooks that run on a schedule or on events. Defined in the repo; not yet switched on in a Devin org.">
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
