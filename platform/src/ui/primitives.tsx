import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]): string {
  return c.filter(Boolean).join(" ");
}

export type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "brand";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  info: "bg-sky-50 text-sky-700 ring-sky-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-800 ring-amber-200",
  danger: "bg-rose-50 text-rose-700 ring-rose-200",
  brand: "bg-brand-50 text-brand-700 ring-brand-100",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", toneClasses[tone], className)}>
      {children}
    </span>
  );
}

/** Consistent status colours across apps. Unknown statuses render neutral. */
const statusTones: Record<string, Tone> = {
  pending: "warning",
  pending_approval: "warning",
  in_review: "info",
  open: "info",
  escalated: "danger",
  approved: "success",
  paid: "success",
  completed: "success",
  rejected: "danger",
  failed: "danger",
  cancelled: "neutral",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTones[status] ?? "neutral"}>{status.replace(/_/g, " ")}</Badge>;
}

const buttonVariants = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm",
  secondary: "bg-white text-ink ring-1 ring-inset ring-line hover:bg-slate-50",
  danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-sm",
  ghost: "text-muted hover:bg-slate-100 hover:text-ink",
};

export type ButtonVariant = keyof typeof buttonVariants;

export function buttonClass(variant: ButtonVariant = "primary", size: "sm" | "md" = "md") {
  return cx(
    "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
    size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-2 text-sm",
    buttonVariants[variant],
  );
}

export function Button({ variant, size, className, ...props }: ComponentProps<"button"> & { variant?: ButtonVariant; size?: "sm" | "md" }) {
  return <button className={cx(buttonClass(variant, size), className)} {...props} />;
}

export function LinkButton({ variant, size, className, ...props }: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: "sm" | "md" }) {
  return <Link className={cx(buttonClass(variant, size), className)} {...props} />;
}

export function Card({ title, actions, children, className }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-lg border border-line bg-surface shadow-sm", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-4 border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          {actions}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function PageHeader({ title, description, actions, breadcrumb }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; breadcrumb?: { label: string; href: string }[] }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {breadcrumb && (
          <nav className="mb-1 flex gap-1 text-xs text-muted">
            {breadcrumb.map((b, i) => (
              <span key={b.href} className="flex gap-1">
                {i > 0 && <span>/</span>}
                <Link href={b.href} className="hover:text-ink hover:underline">
                  {b.label}
                </Link>
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: Tone }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className={cx("mt-1 text-2xl font-semibold", tone === "danger" && "text-rose-600", tone === "warning" && "text-amber-600", tone === "success" && "text-emerald-600")}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function Alert({ tone = "info", title, children }: { tone?: Tone; title?: ReactNode; children?: ReactNode }) {
  return (
    <div className={cx("rounded-md px-4 py-3 text-sm ring-1 ring-inset", toneClasses[tone])}>
      {title && <div className="font-medium">{title}</div>}
      {children && <div className={title ? "mt-0.5" : undefined}>{children}</div>}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line p-10 text-center">
      <div className="text-sm font-medium">{title}</div>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function DescriptionList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((i) => (
        <div key={i.label}>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">{i.label}</dt>
          <dd className="mt-0.5 text-sm">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}
