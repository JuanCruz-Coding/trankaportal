/**
 * Skeleton del shell de /dashboard/settings. Next lo renderiza al instante
 * durante el navigate, mientras `page.tsx` ejecuta sus 4 queries con joins.
 */
export default function SettingsLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="h-7 w-40 animate-pulse rounded bg-muted" />
        <div className="h-4 w-80 animate-pulse rounded bg-muted" />
      </div>

      <section className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-72 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-9 w-24 animate-pulse rounded-md bg-muted" />
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4">
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="mt-1 h-3 w-32 animate-pulse rounded bg-muted" />
              <div className="mt-3 space-y-1.5">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-3 w-full animate-pulse rounded bg-muted" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
          </div>
          <div className="space-y-1.5">
            <div className="h-3 w-40 animate-pulse rounded bg-muted" />
            <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
          </div>
        </div>
      </section>
    </div>
  );
}
