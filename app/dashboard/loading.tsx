import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatsSkeleton, UpcomingSkeleton } from "./components/dashboard-sections";

/**
 * Skeleton del shell del dashboard. Next renderiza esto al instante durante
 * el navigate, mientras `page.tsx` ejecuta sus queries. Sin este archivo,
 * la navegación queda bloqueada hasta que el Server Component termina.
 *
 * Como no tenemos el OrgContext acá (corre antes que el page), asumimos
 * canManage=true para mostrar 4 stat cards. Cuando el page real toma el
 * relevo, ajusta a 3 si el rol no califica.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div>
        <div className="h-9 w-72 animate-pulse rounded bg-muted md:h-10" />
        <div className="mt-2 h-4 w-96 animate-pulse rounded bg-muted" />
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsSkeleton canManage={true} />
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <UpcomingSkeleton />
        <Card>
          <CardHeader>
            <CardTitle>Atajos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md px-3 py-2"
                >
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
