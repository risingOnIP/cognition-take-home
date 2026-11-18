import { notFound } from "next/navigation";
import { listAuditEvents } from "@acme/platform/audit";
import { can } from "@acme/platform/rbac";
import { Alert, AuditTimeline, Badge, Card, DescriptionList, MaskedValue, PageHeader, SchemaForm, StatusBadge, WorkflowActions } from "@acme/platform/ui";
import { db, requirePageAccess } from "@/platform";
import { reassignCaseAction, revealCaseFieldAction, transitionCaseAction, userNames } from "../_lib/actions";
import { DOCUMENT_TYPES, NATIONAL_ID_TYPES } from "../_lib/schema";
import { assignableAnalysts, getCase, maskCase, slaState, type PiiField } from "../_lib/service";
import { availableKyc, blockedReason, kycWorkflow, requiresSignoff, transitionLabel } from "../_lib/workflow";
import { RiskBadge, ScreeningBadges } from "../_lib/ui";
import { kycApp } from "../manifest";

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—");

export default async function KycCaseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageAccess(kycApp.accessPermission);
  const kase = getCase(db(), user, id);
  if (!kase) notFound();
  const names = await userNames();
  const masked = maskCase(kase);
  const canReveal = can(user, "kyc.pii.reveal");
  const sla = slaState(kase);
  const available = availableKyc(kase, user);
  const closed = kycWorkflow.terminal.includes(kase.status);
  const name = (uid: string | null) => (uid ? (names[uid] ?? uid) : "—");
  const pii = (field: PiiField) => <MaskedValue masked={masked[field]} canReveal={canReveal} reveal={revealCaseFieldAction.bind(null, kase.id, field)} />;

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {kase.id} <StatusBadge status={kase.status} />
          </span>
        }
        breadcrumb={[{ label: "KYC review", href: kycApp.href }]}
        description={`${kase.customerName} — ${DOCUMENT_TYPES[kase.documentType]} verification`}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {sla.breached && !closed && <Alert tone="danger" title="SLA breached">This case was due {fmt(kase.slaDueAt)}.</Alert>}
          <Card title="Customer">
            <DescriptionList
              items={[
                { label: "Name", value: kase.customerName },
                { label: "Date of birth", value: pii("dateOfBirth") },
                { label: NATIONAL_ID_TYPES[kase.nationalIdType], value: pii("nationalId") },
                { label: "Email", value: pii("email") },
                { label: "Address", value: pii("address") },
                { label: "Document type", value: DOCUMENT_TYPES[kase.documentType] },
              ]}
            />
          </Card>
          <Card title="Risk & screening">
            <DescriptionList
              items={[
                { label: "Risk", value: <RiskBadge level={kase.riskLevel} score={kase.riskScore} /> },
                { label: "Screening", value: <ScreeningBadges sanctions={kase.sanctionsHit} pep={kase.pepHit} /> },
                { label: "Approval path", value: requiresSignoff(kase) ? "Analyst review + compliance lead sign-off" : "Analyst review" },
              ]}
            />
            {kase.screeningSummary && <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm">{kase.screeningSummary}</p>}
          </Card>
          <Card title="History (from audit trail)">
            <AuditTimeline events={listAuditEvents(db(), { entityType: "kyc_case", entityId: kase.id }).reverse()} actorNames={names} />
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Case">
            <DescriptionList
              items={[
                { label: "Assigned to", value: kase.assignedTo ? name(kase.assignedTo) : <Badge tone="warning">Unassigned</Badge> },
                { label: "SLA", value: <Badge tone={sla.tone}>{sla.label}</Badge> },
                { label: "Due", value: fmt(kase.slaDueAt) },
                { label: "Opened", value: fmt(kase.createdAt) },
                ...(kase.submittedBy ? [{ label: "Submitted for sign-off by", value: name(kase.submittedBy) }] : []),
                ...(kase.escalatedBy ? [{ label: "Escalated by", value: name(kase.escalatedBy) }] : []),
                ...(kase.decidedBy ? [{ label: "Decided by", value: `${name(kase.decidedBy)} · ${fmt(kase.decidedAt)}` }] : []),
              ]}
            />
            {kase.decisionReason && <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm">“{kase.decisionReason}”</p>}
          </Card>
          <Card title="Actions">
            <WorkflowActions
              transitions={available.map((t) => ({ key: t, label: transitionLabel(t, kase), variant: t === "reject" ? "danger" : t === "approve" ? "primary" : "secondary" }))}
              action={transitionCaseAction.bind(null, kase.id)}
              reasonLabel="Reason (required to reject, escalate or send back)"
              blockedReason={blockedReason(kase, user)}
            />
          </Card>
          {can(user, "kyc.assign") && !closed && (
            <Card title="Reassign">
              <SchemaForm
                action={reassignCaseAction.bind(null, kase.id)}
                submitLabel="Reassign"
                fields={[
                  {
                    name: "assignedTo",
                    label: "Analyst",
                    type: "select",
                    required: true,
                    options: assignableAnalysts(db())
                      .filter((a) => a.id !== kase.assignedTo)
                      .map((a) => ({ value: a.id, label: a.displayName })),
                  },
                  { name: "reason", label: "Note", type: "textarea" },
                ]}
              />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
