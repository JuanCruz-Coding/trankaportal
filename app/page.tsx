import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Show, UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import {
  Check,
  Users,
  UserCircle,
  CalendarOff,
  Clock,
  ArrowRight,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/reveal";
import { getPlansCatalog } from "@/lib/cached-queries";

// =========================================================================
// Datos hardcodeados de la landing — precios y descripciones por plan key.
// El listado de features de cada plan se obtiene de la DB para mantener
// una sola fuente de verdad con el seed.
// =========================================================================

const PLAN_PRICES: Record<string, { price: string; period: string; cta: string }> = {
  starter: { price: "Gratis", period: "para siempre", cta: "Empezar gratis" },
  pro: { price: "$ 49.000", period: "/ mes", cta: "Empezar con Pro" },
  business: { price: "$ 99.000", period: "/ mes", cta: "Hablar con ventas" },
};

const PLAN_TAGLINE: Record<string, string> = {
  starter: "Para arrancar y digitalizar lo básico.",
  pro: "Para PyMEs en crecimiento que necesitan procesos.",
  business: "Para empresas que quieren todo, sin límites.",
};

const FEATURE_DETAIL: Record<string, { icon: React.ComponentType<{ className?: string }>; bullets: string[] }> = {
  employees: {
    icon: Users,
    bullets: [
      "Datos personales y laborales en un solo lugar",
      "Documentos adjuntos (contratos, DNI, recibos)",
      "Organigrama jerárquico automático",
    ],
  },
  "self-service": {
    icon: UserCircle,
    bullets: [
      "Cada empleado edita sus propios datos",
      "Descarga sus documentos cuando los necesita",
      "Menos consultas a RRHH",
    ],
  },
  "time-off": {
    icon: CalendarOff,
    bullets: [
      "Solicitudes con flujo de aprobación",
      "Saldo anual automático por empleado",
      "Calendario del equipo en una vista",
    ],
  },
  attendance: {
    icon: Clock,
    bullets: [
      "Check-in y check-out desde la web",
      "Reporte mensual por empleado",
      "Totales y promedios automáticos",
    ],
  },
};

const FEATURE_NAME: Record<string, string> = {
  employees: "Gestión de empleados",
  "self-service": "Portal del empleado",
  "time-off": "Ausencias y vacaciones",
  attendance: "Control de asistencia",
};

// =========================================================================
// Página
// =========================================================================

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ need?: string; error?: string }>;
}) {
  const { userId, orgId } = await auth();
  const params = await searchParams;

  // Logueado con org → directo al dashboard. Excepto si venimos de un error de
  // sync (loop break defensivo).
  if (userId && orgId && !params.error) redirect("/dashboard");

  const needsOrg = params.need === "org";
  const syncError = params.error === "sync";

  const plans = await getPlansCatalog();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {needsOrg ? (
        <div className="mx-auto max-w-5xl px-4 pt-6">
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
            Estás logueado pero todavía no elegiste una organización. Usá el
            selector arriba para crear una nueva o elegir una existente.
          </div>
        </div>
      ) : null}
      {syncError ? (
        <div className="mx-auto max-w-5xl px-4 pt-6">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
            Hubo un problema sincronizando tu organización. Recargá la página
            (Ctrl+Shift+R). Si persiste, contactanos a hola@trankasoft.com.
          </div>
        </div>
      ) : null}

      <Hero />
      <FeaturesSection plans={plans} />
      <PricingSection plans={plans} />
      <FinalCta />
      <SiteFooter />
    </div>
  );
}

// =========================================================================
// Header
// =========================================================================

function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-primary" />
          <span className="font-semibold tracking-tight">TrankaPortal</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <a href="#features" className="text-muted-foreground hover:text-foreground">
            Funciones
          </a>
          <a href="#pricing" className="text-muted-foreground hover:text-foreground">
            Precios
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Show when="signed-in">
            <OrganizationSwitcher
              hidePersonal
              afterCreateOrganizationUrl="/dashboard"
              afterSelectOrganizationUrl="/dashboard"
            />
            <UserButton />
          </Show>
          <Show when="signed-out">
            <Link
              href="/sign-in"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Iniciar sesión
            </Link>
            <Link
              href="/sign-up"
              className={buttonVariants({ size: "sm" })}
            >
              Registrarse
            </Link>
          </Show>
        </div>
      </div>
    </header>
  );
}

// =========================================================================
// Hero
// =========================================================================

function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 text-center md:py-28">
      <Reveal>
        <Badge variant="secondary" className="mb-6">
          Para PyMEs argentinas
        </Badge>
      </Reveal>
      <Reveal delay={100}>
        <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
          RRHH ordenado para tu empresa.
        </h1>
      </Reveal>
      <Reveal delay={200}>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
          Empleados, ausencias y asistencia en un solo lugar. Sin Excel
          descontrolado, sin papeles. Empezá gratis, escalá cuando lo necesites.
        </p>
      </Reveal>
      <Reveal delay={300}>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/sign-up"
            className={buttonVariants({ size: "lg" })}
          >
            Empezar gratis
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#pricing"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Ver planes
          </a>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Sin tarjeta de crédito. Cancelás cuando quieras.
        </p>
      </Reveal>
    </section>
  );
}

// =========================================================================
// Features
// =========================================================================

function FeaturesSection({
  plans,
}: {
  plans: { features: { feature: { key: string } }[] }[];
}) {
  // Listado de feature keys únicos, en orden fijo.
  const orderedKeys = ["employees", "self-service", "time-off", "attendance"];

  return (
    <section id="features" className="border-t bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <Reveal>
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Todo lo que tu empresa necesita.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Cuatro módulos que cubren el día a día de RRHH en una PyME, sin
              herramientas separadas.
            </p>
          </div>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-2">
          {orderedKeys.map((key, i) => {
            const detail = FEATURE_DETAIL[key];
            const name = FEATURE_NAME[key];
            if (!detail) return null;
            const Icon = detail.icon;
            return (
              <Reveal key={key} delay={i * 100}>
                <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm transition-shadow hover:shadow-md">
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">{name}</h3>
                  <ul className="mt-4 space-y-2">
                    {detail.bullets.map((b) => (
                      <li
                        key={b}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// =========================================================================
// Pricing
// =========================================================================

function PricingSection({
  plans,
}: {
  plans: {
    id: string;
    key: string;
    name: string;
    maxEmployees: number | null;
    features: { feature: { key: string; name: string } }[];
  }[];
}) {
  return (
    <section id="pricing" className="border-t">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <Reveal>
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Planes para cualquier tamaño.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Empezás gratis con Starter. Cuando crezcas, subís a Pro o Business
              desde la app.
            </p>
          </div>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((p, i) => {
            const price = PLAN_PRICES[p.key];
            const tagline = PLAN_TAGLINE[p.key];
            const isHighlighted = p.key === "pro";

            return (
              <Reveal key={p.id} delay={i * 120}>
                <div
                  className={`relative flex h-full flex-col rounded-xl border p-6 shadow-sm transition-all hover:shadow-lg ${
                    isHighlighted
                      ? "border-primary bg-card ring-2 ring-primary/30 md:scale-105"
                      : "bg-card"
                  }`}
                >
                  {isHighlighted ? (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                      Más popular
                    </Badge>
                  ) : null}
                  <div>
                    <h3 className="text-xl font-semibold">{p.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {tagline ?? ""}
                    </p>
                  </div>
                  <div className="mt-6">
                    <span className="text-4xl font-bold">{price?.price ?? "—"}</span>
                    {price?.period ? (
                      <span className="ml-1 text-sm text-muted-foreground">
                        {price.period}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {p.maxEmployees
                      ? `Hasta ${p.maxEmployees} empleados`
                      : "Empleados ilimitados"}
                  </p>

                  <ul className="mt-6 space-y-2 text-sm">
                    {p.features.map((pf) => (
                      <li
                        key={pf.feature.key}
                        className="flex items-center gap-2"
                      >
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                        {FEATURE_NAME[pf.feature.key] ?? pf.feature.name}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-8">
                    <Link
                      href="/sign-up"
                      className={buttonVariants({
                        size: "lg",
                        variant: isHighlighted ? "default" : "outline",
                        className: "w-full justify-center",
                      })}
                    >
                      {price?.cta ?? "Empezar"}
                    </Link>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal>
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Todos los precios están en pesos argentinos, IVA incluido. Pagás
            mensualmente y podés cambiar de plan o cancelar cuando quieras.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// =========================================================================
// Final CTA
// =========================================================================

function FinalCta() {
  return (
    <section className="border-t bg-primary/5">
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <Reveal>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            ¿Listo para ordenar tu RRHH?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Crea tu cuenta en menos de 2 minutos. Sin tarjeta, sin compromiso.
          </p>
          <div className="mt-8">
            <Link href="/sign-up" className={buttonVariants({ size: "lg" })}>
              Empezar gratis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// =========================================================================
// Footer
// =========================================================================

function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm text-muted-foreground">
        <div>© {new Date().getFullYear()} TrankaPortal. Todos los derechos reservados.</div>
        <div className="flex flex-wrap gap-4">
          <a href="#features" className="hover:text-foreground">Funciones</a>
          <a href="#pricing" className="hover:text-foreground">Precios</a>
          <Link href="/legal/terminos" className="hover:text-foreground">Términos</Link>
          <Link href="/legal/privacidad" className="hover:text-foreground">Privacidad</Link>
          <Link href="/sign-in" className="hover:text-foreground">Iniciar sesión</Link>
        </div>
      </div>
    </footer>
  );
}
