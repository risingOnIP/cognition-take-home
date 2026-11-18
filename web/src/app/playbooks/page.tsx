import { PageHeader } from "@acme/platform/ui";
import { Markdown } from "@/components/markdown";
import { Section } from "@/components/overview";
import { Shell } from "@/components/shell";
import { readDocs } from "@/lib/repo-docs";

export default function PlaybooksPage() {
  const playbooks = readDocs("devin/playbooks");
  return (
    <Shell>
      <PageHeader title="Playbooks" description="Step-by-step procedures Devin follows. Source: devin/playbooks/." />
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
    </Shell>
  );
}
