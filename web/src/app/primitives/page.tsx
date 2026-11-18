import { fintechPrimitives, powerAppsPrimitives } from "@acme/platform/catalog";
import { Card, PageHeader } from "@acme/platform/ui";
import { Markdown } from "@/components/markdown";
import { PrimitiveTable, Section } from "@/components/overview";
import { Shell } from "@/components/shell";
import { readDoc } from "@/lib/repo-docs";

export default function PrimitivesPage() {
  return (
    <Shell>
      <PageHeader
        breadcrumb={[{ label: "Platform", href: "/" }]}
        title="All primitives"
        description="Every module in the Shared Primitives Platform, what it does, and what it replaces in Power Apps."
      />
      <Section id="power-apps" title="Power Apps capabilities" intro="What the team uses Power Apps for today, rebuilt as small typed modules.">
        <PrimitiveTable rows={powerAppsPrimitives} />
      </Section>
      <Section id="fintech" title="Fintech controls" intro="Controls a regulated team needs that Power Apps leaves to each app builder. Here they are defaults.">
        <PrimitiveTable rows={fintechPrimitives} />
      </Section>
      <Section id="strategy" title="Why it's built this way">
        <Card>
          <Markdown>{readDoc("docs/STRATEGY.md")}</Markdown>
        </Card>
      </Section>
    </Shell>
  );
}
