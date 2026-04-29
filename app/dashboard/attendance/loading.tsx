/**
 * Skeleton del shell de /dashboard/attendance. Next lo renderiza al instante
 * durante el navigate, mientras `page.tsx` ejecuta sus 2 queries.
 */
export default function AttendanceLoading() {
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-80 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-9 w-44 animate-pulse rounded-md bg-muted" />
      </header>

      <div className="grid gap-4 md:grid-cols-[1fr,auto] md:items-center">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-7 w-32 animate-pulse rounded bg-muted" />
          <div className="mt-1 h-4 w-56 animate-pulse rounded bg-muted" />
        </div>
        <div className="md:p-4">
          <div className="h-10 w-44 animate-pulse rounded-md bg-muted" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border bg-card p-5 shadow-sm"
          >
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-7 w-20 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        <div className="rounded-lg border bg-card">
          <div className="border-b bg-muted/50 px-4 py-3">
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-4 gap-4 border-b px-4 py-3 last:border-b-0"
            >
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-4 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
