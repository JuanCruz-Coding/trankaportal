import Link from "next/link";
import { Show, UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="container mx-auto max-w-5xl px-4 py-10">
      <header className="mb-12 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">TrankaPortal</h1>
        <div className="flex items-center gap-3">
          <Show when="signed-in">
            <OrganizationSwitcher
              hidePersonal
              afterCreateOrganizationUrl="/"
              afterSelectOrganizationUrl="/"
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
      </header>

      <Show when="signed-out">
        <section className="py-10">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Gestión de RRHH para PyMEs.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Empleados, ausencias, asistencia y más — todo en un solo lugar.
          </p>
        </section>
      </Show>

      <Show when="signed-in">
        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <p className="text-sm text-muted-foreground">
            Estás logueado. Usá el selector de arriba para crear o elegir una
            organización — el dashboard lo habilitamos en Fase 2.
          </p>
        </div>
      </Show>
    </main>
  );
}
