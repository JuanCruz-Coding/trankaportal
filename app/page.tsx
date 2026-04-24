import Link from "next/link";
import { Show, UserButton, OrganizationSwitcher } from "@clerk/nextjs";

export default function Home() {
  return (
    <main className="container py-5">
      <header className="d-flex justify-content-between align-items-center mb-5">
        <h1 className="h3 m-0">TrankaPortal</h1>
        <div className="d-flex align-items-center gap-3">
          <Show when="signed-in">
            <OrganizationSwitcher
              hidePersonal
              afterCreateOrganizationUrl="/"
              afterSelectOrganizationUrl="/"
            />
            <UserButton />
          </Show>
          <Show when="signed-out">
            <Link href="/sign-in" className="btn btn-outline-primary btn-sm">
              Iniciar sesión
            </Link>
            <Link href="/sign-up" className="btn btn-primary btn-sm">
              Registrarse
            </Link>
          </Show>
        </div>
      </header>

      <Show when="signed-out">
        <div className="py-5">
          <h2 className="display-6">Gestión de RRHH para PyMEs.</h2>
          <p className="lead text-muted">
            Empleados, ausencias, asistencia y más — todo en un solo lugar.
          </p>
        </div>
      </Show>

      <Show when="signed-in">
        <div className="alert alert-info">
          Estás logueado. Usá el selector de arriba para crear o elegir una
          organización — el dashboard lo habilitamos en Fase 2.
        </div>
      </Show>
    </main>
  );
}
