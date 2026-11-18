import { notFound } from "next/navigation";
import { listAuditEvents } from "@acme/platform/audit";
import { can } from "@acme/platform/rbac";
import { Alert, AuditTimeline, Badge, Card, DescriptionList, MaskedValue, PageHeader, SchemaForm, StatusBadge, TabNav, WorkflowActions } from "@acme/platform/ui";
import { db, requirePageAccess } from "@/platform";
import { RiskBadge, SlaBadge } from "../_components/badges";
import { assignCaseAction, revealCaseFieldAction, transitionCaseAction, userNames } from "../_lib/actions";
import { DOCUMENT_TYPES } from "../_lib/schema";
import { getCase, listAssignees, type PiiField } from "../_lib/service";
import { availableCase, checkCase, kycWorkflow, leadReasons } from "../_lib/workflow";
import { kycApp } from "../manifest";

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—");

export default async function KycCaseDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab } = await searchParams;
  const user = await requirePageAccess(kycApp.accessPermission);
  const kase = getCase(db(), user, id);
  if (!kase) notFound();
  const names = await userNames();
  const events = listAuditEvents(db(), { entityType: "kyc_case", entityId: kase.id }).reverse();
  const closed = kycWorkflow.terminal.includes(kase.status);
  const available = availableCase(kase, user);
  const approveBlocked = closed ? null : checkCase("approve", kase, user, "x");
  const needsLeadFor = leadReasons(kase);
  const canReveal = can(user, "kyc.pii.reveal");
  const pii = (field: PiiField) => <MaskedValue masked={kase.masked[field]} canReveal={canReveal} reveal={revealCaseFieldAction.bind(null, kase.id, field)} />;
  const name = (uid: string | null) => (uid ? (names[uid] ?? uid) : "—");
  const baseHref = `${kycApp.href}/${kase.id}`;

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {kase.id} <StatusBadge status={kase.status} /> <RiskBadge risk={kase.riskLevel} />
          </span>
        }
        breadcrumb={[{ label: "KYC review queue", href: kycApp.href }]}
        description={`Identity verification by ${DOCUMENT_TYPES[kase.documentType].toLowerCase()}. Customer details are masked; revealing a field asks for a reason and is recorded in the audit trail.`}
      />
      <TabNav
        active={tab === "history" ? "history" : "review"}
        tabs={[
          { key: "review", label: "Review", href: baseHref },
          { key: "history", label: `History (${events.length})`, href: `${baseHref}?tab=history` },
        ]}
      />
      {tab === "history" ? (
        <Card title="History (from the audit trail)">
          <div className="max-h-[32rem] overflow-auto">
            <AuditTimeline events={events} actorNames={names} />
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card title="Customer">
              <DescriptionList
                items={[
                  { label: "Name", value: pii("customerName") },
                  { label: "Date of birth", value: pii("dateOfBirth") },
                  { label: "National ID / SSN", value: pii("nationalId") },
                  { label: "Email", value: pii("email") },
                  { label: "Address", value: pii("address") },
                  { label: "Document type", value: DOCUMENT_TYPES[kase.documentType] },
                ]}
              />
            </Card>
            <Card title="Sanctions / PEP screening">
              {kase.screeningHits.length ? (
                <ul className="divide-y divide-line text-sm">
                  {kase.screeningHits.map((h) => (
                    <li key={`${h.list}-${h.matchScore}`} className="flex items-center justify-between py-2">
                      <span className="flex items-center gap-2">
                        <Badge tone="danger">{h.kind.toUpperCase()}</Badge> {h.list}
                      </span>
                      <span className="text-xs text-muted">match score {h.matchScore}/100</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-emerald-700">✓ No sanctions or PEP hits</p>
              )}
            </Card>
            <Card title="Case">
              <DescriptionList
                items={[
                  { label: "Assigned to", value: kase.assignedTo ? name(kase.assignedTo) : <Badge tone="warning">Unassigned</Badge> },
                  { label: "SLA", value: <span className="flex items-center gap-2"><SlaBadge sla={kase.sla} /> <span className="text-xs text-muted">due {fmt(kase.slaDueAt)}</span></span> },
                  { label: "Opened", value: `${fmt(kase.createdAt)} by ${name(kase.createdBy)}` },
                  { label: "Escalated", value: kase.escalatedBy ? `${fmt(kase.escalatedAt)} by ${name(kase.escalatedBy)}` : "—" },
                  { label: "Decided", value: kase.decidedBy ? `${fmt(kase.decidedAt)} by ${name(kase.decidedBy)}` : "—" },
                  { label: "Approval needs", value: needsLeadFor.length ? `A lead (${needsLeadFor.join(", ")})` : "Analyst or lead" },
                ]}
              />
            </Card>
          </div>
          <div className="space-y-6">
            <Card title="Decision">
              {closed ? (
                <p className="text-sm text-muted">This case is closed ({kase.status} by {name(kase.decidedBy)}).</p>
              ) : (
                <div className="space-y-3">
                  {approveBlocked && available.length > 0 && <Alert tone="warning">{approveBlocked.startsWith("Requires permission") ? `Approval needs a compliance lead: ${needsLeadFor.join(", ")}.` : approveBlocked}</Alert>}
                  <WorkflowActions
                    reasonLabel="Reason (required to reject or escalate)"
                    transitions={available.map((t) => ({ key: t, label: kycWorkflow.transitions[t].label, variant: t === "reject" ? "danger" : t === "escalate" ? "secondary" : "primary" }))}
                    action={transitionCaseAction.bind(null, kase.id)}
                    blockedReason={kase.status === "escalated" && !can(user, "kyc.decide.elevated") ? "Escalated: waiting for a compliance lead to decide." : approveBlocked}
                  />
                </div>
              )}
            </Card>
            {can(user, "kyc.assign") && !closed && (
              <Card title={kase.assignedTo ? "Reassign" : "Assign"}>
                <SchemaForm
                  action={assignCaseAction.bind(null, kase.id)}
                  submitLabel={kase.assignedTo ? "Reassign" : "Assign"}
                  fields={[
                    {
                      name: "assigneeId",
                      label: "Analyst",
                      type: "select",
                      required: true,
                      options: listAssignees(db())
                        .filter((a) => a.id !== kase.assignedTo)
                        .map((a) => ({ value: a.id, label: a.displayName })),
                    },
                    ...(kase.assignedTo ? [{ name: "reason", label: "Reason", type: "textarea" as const, required: true, help: "Recorded in the audit trail." }] : []),
                  ]}
                />
              </Card>
            )}
          </div>
        </div>
      )}
    </>
  );
}
