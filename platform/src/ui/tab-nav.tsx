import Link from "next/link";
import { cx } from "./primitives";

/** Underlined tab bar. Each tab is a link, so tabs are shareable URLs and work without client JS. */
export function TabNav({ tabs, active }: { tabs: { key: string; label: string; href: string }[]; active: string }) {
  return (
    <nav className="mb-6 flex gap-6 border-b border-line">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={cx("-mb-px border-b-2 pb-2 text-sm font-medium", t.key === active ? "border-brand-600 text-ink" : "border-transparent text-muted hover:text-ink")}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
