import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Show, UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import { buttonVariants } from "@/components/ui/button";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ need?: string; error?: string }>;
}) {
  const { userId, orgId } = await auth();

  // Logueado + org elegida → dashboard
  if (userId && orgId) redirect("/dashboard");

  const params = await searchParams;
  const needsOrg = params.need === "org";

  return (
    <main className="container mx-auto max-w-5xl px-4 py-10">
      <header className="mb-12 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">TrankaPortal</h1>
        <div className="flex items-center gap-3">
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
          <h3 className="font-semibold">
            {needsOrg ? "Elegí o creá una organización" : "Bienvenido"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Usá el selector de arriba para crear una nueva empresa o elegir una
            de las que ya sos parte. Una vez seleccionada, te llevamos al
            dashboard.
          </p>
        </div>
      </Show>
    </main>
  );
}
