import { PageHeader } from "@acme/platform/ui";
import { Markdown } from "@/components/markdown";
import { Shell } from "@/components/shell";
import { readDocs } from "@/lib/repo-docs";

export default function KnowledgePage() {
  const docs = readDocs("devin/knowledge");
  return (
    <Shell>
      <PageHeader title="Knowledge" description="Rules Devin applies automatically when it works in this repo. Source: devin/knowledge/." />
      <div className="space-y-2">
        {docs.map((k) => (
          <details key={k.file} className="rounded-lg border border-line bg-surface px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium capitalize">
              {k.title}
              {k.meta.trigger && <span className="ml-2 font-normal normal-case text-muted">· used when {k.meta.trigger.charAt(0).toLowerCase() + k.meta.trigger.slice(1)}</span>}
            </summary>
            <div className="mt-3">
              <Markdown>{k.body}</Markdown>
            </div>
          </details>
        ))}
      </div>
    </Shell>
  );
}
