import Link from "next/link";

export default async function Forbidden({ searchParams }: { searchParams: Promise<{ permission?: string }> }) {
  const { permission } = await searchParams;
  return (
    <main className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold">Access denied</h1>
      <p className="mt-2 text-sm text-muted">
        Your Entra groups don&apos;t grant {permission ? <code className="rounded bg-slate-100 px-1">{permission}</code> : "this permission"}. Ask the app owner to add your group, or switch user.
      </p>
      <div className="mt-6 flex justify-center gap-4 text-sm font-medium text-brand-600">
        <Link href="/">Back to home</Link>
        <Link href="/login">Switch user</Link>
      </div>
    </main>
  );
}
