/**
 * Skeleton del shell de /dashboard/employees. Next lo renderiza al instante
 * durante el navigate, mientras `page.tsx` ejecuta findMany + count.
 */
export default function EmployeesLoading() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-32 animate-pulse rounded-md bg-muted" />
          <div className="h-9 w-36 animate-pulse rounded-md bg-muted" />
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="h-9 flex-1 min-w-[200px] max-w-md animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-40 animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
      </div>

      <div className="rounded-lg border bg-card">
        <div className="border-b bg-muted/50 px-4 py-3">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-6 gap-4 border-b px-4 py-3 last:border-b-0"
          >
            {Array.from({ length: 6 }).map((_, j) => (
              <div key={j} className="h-4 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
