/**
 * Skeleton del shell de /dashboard/profile. Next lo renderiza al instante
 * durante el navigate.
 */
export default function ProfileLoading() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-48 animate-pulse rounded bg-muted" />
            <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
          </div>
          <div className="h-4 w-72 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-9 w-36 animate-pulse rounded-md bg-muted" />
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border bg-card p-5 shadow-sm"
          >
            <div className="mb-4 h-5 w-48 animate-pulse rounded bg-muted" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="grid grid-cols-[140px,1fr] gap-3">
                  <div className="h-4 animate-pulse rounded bg-muted" />
                  <div className="h-4 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
