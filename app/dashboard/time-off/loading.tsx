/**
 * Skeleton del shell de /dashboard/time-off. Next lo renderiza al instante
 * durante el navigate, mientras `page.tsx` ejecuta sus 4 queries.
 */
export default function TimeOffLoading() {
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-80 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-32 animate-pulse rounded-md bg-muted" />
          <div className="h-9 w-36 animate-pulse rounded-md bg-muted" />
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border bg-card p-5 shadow-sm"
          >
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-7 w-16 animate-pulse rounded bg-muted" />
            <div className="mt-1 h-3 w-32 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        <div className="rounded-lg border bg-card">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b px-4 py-3 last:border-b-0"
            >
              <div className="space-y-1.5">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-48 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
